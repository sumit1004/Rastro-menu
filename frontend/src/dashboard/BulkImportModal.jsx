import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Upload, Download, AlertCircle, CheckCircle, FileText, X, Info, Loader, Search, HelpCircle } from 'lucide-react';
import './BulkImportModal.css';

const TEMPLATE_COLUMNS = [
  'Dish Name*',
  'Category*',
  'Has Full Plate',
  'Full Plate Price (₹)',
  'Has Half Plate',
  'Half Plate Price (₹)',
  'Description',
  'Ingredients',
  'Prep Time (mins)',
  'Enable AR Preview',
  'Available',
  'Featured',
  'Veg/Non-Veg',
  'Spicy Level'
];

const BulkImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  
  // State for search and manual linking
  const [libraryModels, setLibraryModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSelectDishIndex, setActiveSelectDishIndex] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchLibraryModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fetchLibraryModels = async () => {
    try {
      const { data } = await api.get('/admin/ar-models');
      setLibraryModels(data);
    } catch (err) {
      console.error('Failed to load AR library models for bulk selection', err);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ['Classic Butter Chicken', 'Main Course', 'Yes', '380', 'Yes', '220', 'Rich creamy tomato butter gravy with chicken', 'Chicken, Butter, Tomato, Cream', '20', 'Yes', 'Yes', 'Yes', 'Non-Veg', '1'],
      ['Paneer Tikka', 'Appetizer', 'Yes', '280', 'No', '', 'Grilled cottage cheese with spices', 'Paneer, Capsicum, Onion, Curd', '15', 'Yes', 'Yes', 'No', 'Veg', '2']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu Template');
    XLSX.writeFile(wb, 'Rastro_Menu_Import_Template.xlsx');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseExcel(selectedFile);
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          setValidationResult({ error: 'File is empty or missing data rows.' });
          return;
        }

        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const rows = data.slice(1).filter(row => row.length > 0 && row.some(cell => cell !== undefined && cell !== ''));

        if (rows.length > 150) {
          setValidationResult({ error: 'Excel import is limited to a maximum of 150 rows to ensure stable performance.' });
          return;
        }

        validateAndMapData(headers, rows);
      } catch (err) {
        setValidationResult({ error: 'Failed to parse Excel file. Ensure it is a valid .xlsx or .csv' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAndMapData = async (headers, rows) => {
    const mappedDishes = [];
    const errors = [];
    let invalidCount = 0;

    const getColIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    
    const nameIdx = getColIndex('Dish Name');
    const catIdx = getColIndex('Category');
    
    if (nameIdx === -1 || catIdx === -1) {
      setValidationResult({ error: 'Missing mandatory columns (Dish Name*, Category*)' });
      return;
    }

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      const name = row[nameIdx];
      const category = row[catIdx];

      if (!name || !name.toString().trim()) {
        errors.push({ row: rowNum, error: 'Dish Name is missing' });
        invalidCount++;
        return;
      }
      if (!category || !category.toString().trim()) {
        errors.push({ row: rowNum, error: 'Category is missing' });
        invalidCount++;
        return;
      }

      // Base Price fallback to Full Plate Price
      const fullPlatePriceCol = getColIndex('Full Plate Price');
      const halfPlatePriceCol = getColIndex('Half Plate Price');
      
      const full_plate_price = parseFloat(row[fullPlatePriceCol]) || 0;
      const half_plate_price = parseFloat(row[halfPlatePriceCol]) || 0;
      const price = full_plate_price || half_plate_price || 0;

      let isAvailableRaw = row[getColIndex('Available')];
      let is_available = true;
      if (isAvailableRaw !== undefined && isAvailableRaw !== null && isAvailableRaw !== '') {
        const str = String(isAvailableRaw).toLowerCase().trim();
        if (str === 'false' || str === 'no' || str === '0') {
          is_available = false;
        }
      }

      const dish = {
        name: name.toString().trim(),
        category: category.toString().trim(),
        price: price,
        has_full_plate: row[getColIndex('Has Full Plate')]?.toString().trim() === 'Yes' || row[getColIndex('Has Full Plate')] === true,
        full_plate_price: full_plate_price,
        has_half_plate: row[getColIndex('Has Half Plate')]?.toString().trim() === 'Yes' || row[getColIndex('Has Half Plate')] === true,
        half_plate_price: half_plate_price,
        description: row[getColIndex('Description')]?.toString().trim() || '',
        ingredients: row[getColIndex('Ingredients')]?.toString().trim() || '',
        preparation_time: parseInt(row[getColIndex('Prep Time')]) || 0,
        ar_enabled: row[getColIndex('Enable AR Preview')]?.toString().trim() === 'Yes' || row[getColIndex('Enable AR Preview')] === true,
        is_available: is_available,
        is_featured: row[getColIndex('Featured')]?.toString().trim() === 'Yes' || row[getColIndex('Featured')] === true,
        spice_level: parseInt(row[getColIndex('Spicy Level')]) || 0,
        veg_non_veg: row[getColIndex('Veg/Non-Veg')]?.toString().trim() || 'Veg'
      };

      mappedDishes.push(dish);
    });

    // Post mapped data to backend validate endpoint
    setIsValidating(true);
    try {
      const { data } = await api.post('/dishes/bulk-validate', { dishes: mappedDishes });
      setPreviewData(data.dishes);
      setValidationResult({
        total: data.dishes.length + invalidCount,
        valid: data.dishes.length,
        invalid: invalidCount,
        errors: [...errors, ...(data.errors || [])]
      });
    } catch (err) {
      console.error(err);
      setValidationResult({ error: 'Backend validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleLinkModel = (dishIndex, model) => {
    setPreviewData(prev => {
      const copy = [...prev];
      copy[dishIndex] = {
        ...copy[dishIndex],
        ar_status: 'linked',
        ar_model_id: model ? model.id : null,
        matched_model: model,
        match_confidence: model ? 100 : 0
      };
      return copy;
    });
    setActiveSelectDishIndex(null);
  };

  const handleImport = async () => {
    if (!previewData || previewData.length === 0) return;
    
    setIsImporting(true);
    try {
      const res = await api.post('/dishes/bulk', {
        dishes: previewData,
        duplicate_action: duplicateAction
      });
      
      setImportSummary({
        imported: res.data.imported,
        failed: res.data.failed,
        errors: res.data.errors
      });
      
      if (res.data.imported > 0) {
        onImportSuccess && onImportSuccess();
      }
    } catch (err) {
      console.error('Import failed', err);
      setImportSummary({
        imported: 0,
        failed: previewData.length,
        errors: ['Server failed to process the import request.']
      });
    }
    setIsImporting(false);
  };

  const downloadErrorReport = () => {
    if (!validationResult || !validationResult.errors || validationResult.errors.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,Row,Error/Warning\n";
    validationResult.errors.forEach(err => {
      csvContent += `${err.row || 'N/A'},"${(err.error || err).replace(/"/g, '""')}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetState = () => {
    setFile(null);
    setPreviewData(null);
    setValidationResult(null);
    setImportSummary(null);
    setActiveSelectDishIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="bim-overlay fade-in">
      <div className="bim-modal slide-up" style={{ maxWidth: '850px', width: '90%' }}>
        <div className="bim-header">
          <h2>Bulk Import Menu</h2>
          <button className="bim-close" onClick={handleClose}><X size={24} /></button>
        </div>

        <div className="bim-content scroll-hide">
          {importSummary ? (
            <div className="bim-summary fade-in">
              <div className="bim-summary-icon">
                {importSummary.imported > 0 ? <CheckCircle size={64} color="#10b981" /> : <AlertCircle size={64} color="#ef4444" />}
              </div>
              <h3>Import Complete!</h3>
              <div className="bim-summary-stats">
                <div className="bim-stat-box success">
                  <span className="bim-stat-val">{importSummary.imported}</span>
                  <span className="bim-stat-label">Imported</span>
                </div>
                <div className="bim-stat-box failed">
                  <span className="bim-stat-val">{importSummary.failed}</span>
                  <span className="bim-stat-label">Failed/Skipped</span>
                </div>
              </div>
              
              {importSummary.errors && importSummary.errors.length > 0 && (
                <div className="bim-error-list">
                  <h4>Issues Encountered:</h4>
                  <ul>
                    {importSummary.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              
              <button className="bim-btn primary full-width" onClick={handleClose}>
                Return to Manage Dishes
              </button>
            </div>
          ) : !previewData ? (
            <div className="bim-upload-step fade-in">
              {isValidating ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loader className="spin" size={48} style={{ margin: '0 auto 1.5rem', color: '#4f46e5' }} />
                  <h4>Validating menu and auto-matching AR models...</h4>
                </div>
              ) : (
                <>
                  <div className="bim-instruction-card">
                    <div className="bim-step-number">1</div>
                    <div className="bim-step-text">
                      <h4>Download Template</h4>
                      <p>Start with our structured Excel template containing all required fields.</p>
                    </div>
                    <button className="bim-btn outline" onClick={downloadTemplate}>
                      <Download size={18} /> Template
                    </button>
                  </div>

                  <div className="bim-instruction-card">
                    <div className="bim-step-number">2</div>
                    <div className="bim-step-text">
                      <h4>Upload Filled Data</h4>
                      <p>Upload your completed .xlsx or .csv file. Max 150 rows. System auto-matches AR assets.</p>
                    </div>
                    <div className="bim-upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={32} color="#64748b" />
                      <span>Click to browse or drag file here</span>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                      />
                    </div>
                  </div>
                  
                  {validationResult?.error && (
                    <div className="bim-alert error">
                      <AlertCircle size={18} />
                      {validationResult.error}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bim-preview-step fade-in">
              <div className="bim-preview-header">
                <h3>Data Validation & AR Linking</h3>
                <button className="bim-btn text" onClick={resetState}>Change File</button>
              </div>
              
              <div className="bim-validation-cards">
                <div className="bim-val-card valid">
                  <span className="bim-val-num">{validationResult.valid}</span>
                  <span className="bim-val-label">Valid Rows</span>
                </div>
                <div className="bim-val-card invalid">
                  <span className="bim-val-num">{validationResult.invalid}</span>
                  <span className="bim-val-label">Invalid Rows</span>
                </div>
                <div className="bim-val-card total">
                  <span className="bim-val-num">{validationResult.total}</span>
                  <span className="bim-val-label">Total Rows</span>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="bim-alert warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <AlertCircle size={18} />
                    <div>
                      <strong>{validationResult.invalid} rows have validation issues:</strong>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Download error report to check row details.</span>
                    </div>
                  </div>
                  <button className="bim-btn outline small" onClick={downloadErrorReport} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                    Download Error Report
                  </button>
                </div>
              )}

              <div className="bim-duplicate-handling">
                <label>If dish name already exists:</label>
                <select value={duplicateAction} onChange={e => setDuplicateAction(e.target.value)}>
                  <option value="skip">Skip (Do not import)</option>
                  <option value="replace">Replace Existing Data</option>
                </select>
              </div>

              <div className="bim-table-container scroll-hide" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="bim-table">
                  <thead>
                    <tr>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>AR Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((dish, i) => (
                      <tr key={i} style={{ opacity: dish.is_duplicate && duplicateAction === 'skip' ? 0.6 : 1 }}>
                        <td className="fw-bold">
                          {dish.name}
                          {dish.is_duplicate && (
                            <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: '#fef3c7', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: '0.5rem' }}>
                              Exists
                            </span>
                          )}
                        </td>
                        <td><span className="bim-cat-badge">{dish.category}</span></td>
                        <td>₹{dish.price}</td>
                        <td>
                          {dish.ar_status === 'linked' ? (
                            <span style={{ color: '#10b981', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              Auto Linked ({dish.match_confidence}%)
                            </span>
                          ) : dish.ar_status === 'needs_selection' ? (
                            <span style={{ color: '#3b82f6', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              Needs Selection
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>
                              No Model Found
                            </span>
                          )}
                          {dish.matched_model && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                              Model: {dish.matched_model.dish_name}
                            </div>
                          )}
                        </td>
                        <td>
                          <button 
                            className="bim-btn text small" 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}
                            onClick={() => setActiveSelectDishIndex(i)}
                          >
                            {dish.ar_model_id ? 'Change AR' : 'Link AR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!importSummary && previewData && (
          <div className="bim-footer">
            <button className="bim-btn text" onClick={handleClose} disabled={isImporting}>Cancel</button>
            <button 
              className="bim-btn primary" 
              onClick={handleImport} 
              disabled={isImporting}
            >
              {isImporting ? <Loader className="spin" size={18} /> : <FileText size={18} />}
              {isImporting ? 'Importing...' : `Import ${previewData.length} Dishes`}
            </button>
          </div>
        )}
      </div>

      {/* Manual AR Selector Modal */}
      {activeSelectDishIndex !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', maxHeight: '80%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Link AR: {previewData[activeSelectDishIndex].name}</h3>
              <button onClick={() => setActiveSelectDishIndex(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Search AR Model Library..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            {/* Candidates */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Potential matches suggested by backend first */}
              {previewData[activeSelectDishIndex].potential_matches && previewData[activeSelectDishIndex].potential_matches.length > 0 && searchQuery === '' && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Suggested Matches:</span>
                  {previewData[activeSelectDishIndex].potential_matches.map(match => (
                    <div key={match.id} onClick={() => handleLinkModel(activeSelectDishIndex, match)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', background: '#f8fafc' }}>
                      <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '0.25rem', overflow: 'hidden' }}>
                        {match.thumbnail_url ? <img src={match.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.7rem' }}>3D</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{match.dish_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{match.category} • {match.confidence}% match</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderBottom: '1px solid #e2e8f0', margin: '0.75rem 0' }}></div>
                </div>
              )}

              {/* General Library Search */}
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>All Models:</span>
              {libraryModels
                .filter(m => m.dish_name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase())))
                .map(model => (
                  <div key={model.id} onClick={() => handleLinkModel(activeSelectDishIndex, model)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer' }}>
                    <div style={{ width: '40px', height: '40px', background: '#e2e8f0', borderRadius: '0.25rem', overflow: 'hidden' }}>
                      {model.thumbnail_url ? <img src={model.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.7rem' }}>3D</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{model.dish_name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{model.category}</div>
                    </div>
                  </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => handleLinkModel(activeSelectDishIndex, null)} style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Unlink AR
              </button>
              <button onClick={() => setActiveSelectDishIndex(null)} style={{ flex: 1, padding: '0.5rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportModal;

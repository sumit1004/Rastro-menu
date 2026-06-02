import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Upload, Download, AlertCircle, CheckCircle, FileText, X, Info, Loader } from 'lucide-react';
import './BulkImportModal.css';

const TEMPLATE_COLUMNS = [
  'Dish Name*',
  'Category*',
  'Base Price (₹)*',
  'Has Full Plate',
  'Full Plate Price (₹)',
  'Has Half Plate',
  'Half Plate Price (₹)',
  'Description',
  'Ingredients',
  'Prep Time (mins)',
  'Dish Image URL',
  'AR Asset URL',
  'Available',
  'Featured',
  'Veg/Non-Veg',
  'Spicy Level',
  'Dish Role',
  'Cuisine Type',
  'Meal Type'
];

const BulkImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ['Classic Burger', 'Fast Food', '150', 'No', '', 'No', '', 'Delicious beef burger', 'Beef, Lettuce, Tomato', '15', 'https://example.com/burger.jpg', '', 'No', 'Yes', 'Yes', 'Non-Veg', '2', 'main', 'Fast Food', 'Lunch'],
      ['Margherita Pizza', 'Italian', '350', 'Yes', '350', 'Yes', '200', 'Classic cheese pizza', 'Cheese, Tomato', '20', 'https://example.com/pizza.jpg', '', 'Yes', 'Yes', 'No', 'Veg', '1', 'main', 'Italian', 'Dinner']
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
    reader.onload = (evt) => {
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

        validateAndMapData(headers, rows);
      } catch (err) {
        setValidationResult({ error: 'Failed to parse Excel file. Ensure it is a valid .xlsx or .csv' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAndMapData = (headers, rows) => {
    const mappedDishes = [];
    const errors = [];
    let validCount = 0;
    let invalidCount = 0;

    const getColIndex = (name) => headers.findIndex(h => h.includes(name));
    
    const nameIdx = getColIndex('Dish Name');
    const catIdx = getColIndex('Category');
    const priceIdx = getColIndex('Base Price');
    
    if (nameIdx === -1 || catIdx === -1 || priceIdx === -1) {
      setValidationResult({ error: 'Missing mandatory columns (Dish Name*, Category*, Base Price (₹)*)' });
      return;
    }

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      const name = row[nameIdx];
      const category = row[catIdx];
      const price = parseFloat(row[priceIdx]);

      if (!name || !name.toString().trim()) {
        errors.push(`Row ${rowNum}: Dish Name is missing`);
        invalidCount++;
        return;
      }
      if (!category || !category.toString().trim()) {
        errors.push(`Row ${rowNum}: Category is missing`);
        invalidCount++;
        return;
      }
      if (isNaN(price)) {
        errors.push(`Row ${rowNum}: Invalid Base Price`);
        invalidCount++;
        return;
      }

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
        has_full_plate: row[getColIndex('Has Full Plate')]?.toString().trim() || 'No',
        full_plate_price: parseFloat(row[getColIndex('Full Plate Price')]) || 0,
        has_half_plate: row[getColIndex('Has Half Plate')]?.toString().trim() || 'No',
        half_plate_price: parseFloat(row[getColIndex('Half Plate Price')]) || 0,
        description: row[getColIndex('Description')]?.toString().trim() || '',
        ingredients: row[getColIndex('Ingredients')]?.toString().trim() || '',
        preparation_time: parseInt(row[getColIndex('Prep Time')]) || 0,
        image_url: row[getColIndex('Dish Image URL')]?.toString().trim() || '',
        ar_asset_url: row[getColIndex('AR Asset URL')]?.toString().trim() || '',
        ar_enabled: row[getColIndex('Enable AR Preview')]?.toString().trim() || 'No',
        is_available: is_available,
        is_featured: row[getColIndex('Featured')]?.toString().trim() || 'No',
        spice_level: parseInt(row[getColIndex('Spicy Level')]) || 0,
        dish_role: row[getColIndex('Dish Role')]?.toString().trim() || '',
        cuisine_type: row[getColIndex('Cuisine Type')]?.toString().trim() || '',
        meal_type: row[getColIndex('Meal Type')]?.toString().trim() || '',
      };

      // Basic URL validation
      if (dish.image_url && !dish.image_url.startsWith('http')) {
        errors.push(`Row ${rowNum}: Image URL is invalid`);
        invalidCount++;
        return;
      }


      mappedDishes.push(dish);
      validCount++;
    });

    // Check duplicates within the file itself
    const names = new Set();
    const uniqueDishes = [];
    mappedDishes.forEach(d => {
      if (!names.has(d.name.toLowerCase())) {
        names.add(d.name.toLowerCase());
        uniqueDishes.push(d);
      } else {
        errors.push(`File contains duplicate dish name: '${d.name}'`);
        invalidCount++;
        validCount--;
      }
    });

    setPreviewData(uniqueDishes);
    setValidationResult({
      total: uniqueDishes.length + invalidCount,
      valid: uniqueDishes.length,
      invalid: invalidCount,
      errors: errors.slice(0, 50) // Cap displayed errors
    });
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

  const resetState = () => {
    setFile(null);
    setPreviewData(null);
    setValidationResult(null);
    setImportSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="bim-overlay fade-in">
      <div className="bim-modal slide-up">
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
                  <span className="bim-stat-label">Failed</span>
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
                  <p>Upload your completed .xlsx or .csv file. Images and AR assets via URL are supported.</p>
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
            </div>
          ) : (
            <div className="bim-preview-step fade-in">
              <div className="bim-preview-header">
                <h3>Data Validation</h3>
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
                <div className="bim-alert warning">
                  <AlertCircle size={18} />
                  <div>
                    <strong>{validationResult.invalid} rows will be skipped:</strong>
                    <ul className="bim-warning-list">
                      {validationResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div className="bim-duplicate-handling">
                <label>If dish already exists:</label>
                <select value={duplicateAction} onChange={e => setDuplicateAction(e.target.value)}>
                  <option value="skip">Skip (Do not import)</option>
                  <option value="replace">Replace Existing Data</option>
                </select>
              </div>

              <div className="bim-table-container scroll-hide">
                <table className="bim-table">
                  <thead>
                    <tr>
                      <th>Dish Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Available</th>
                      <th>Assets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((dish, i) => (
                      <tr key={i}>
                        <td className="fw-bold">{dish.name}</td>
                        <td><span className="bim-cat-badge">{dish.category}</span></td>
                        <td>₹{dish.price}</td>
                        <td>
                          {dish.is_available ? (
                            <span style={{ color: '#10b981', fontWeight: '500' }}>Yes</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: '500' }}>No</span>
                          )}
                        </td>
                        <td>
                          <div className="bim-assets-icons">
                            {dish.image_url ? <span title="Image URL present">🖼️</span> : <span className="opacity-30">🖼️</span>}
                            {dish.ar_asset_url ? <span title="AR URL present">📱</span> : <span className="opacity-30">📱</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="bim-table-footer">
                    Showing 10 of {previewData.length} valid rows
                  </div>
                )}
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
              disabled={isImporting || validationResult?.valid === 0}
            >
              {isImporting ? <Loader className="spin" size={18} /> : <FileText size={18} />}
              {isImporting ? 'Importing...' : `Import ${validationResult?.valid} Dishes`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportModal;

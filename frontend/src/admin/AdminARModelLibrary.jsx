import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Loader from '../components/Loader';
import { Trash2, Search, UploadCloud, FileText, Settings, RefreshCw, CheckCircle2, AlertCircle, Layers, X } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const AdminARModelLibrary = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingModel, setEditingModel] = useState(null);

  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, processed: 0, uploading: false });

  const [formData, setFormData] = useState({
    dish_name: '',
    category: '',
    tags: '',
    normalized_rotation_x: 0,
    normalized_rotation_y: 0,
    normalized_rotation_z: 0,
    normalized_scale: 1.0,
    normalized_height_offset: 0
  });

  const [glbFile, setGlbFile] = useState(null);
  const [usdzFile, setUsdzFile] = useState(null);
  const [previewGlbUrl, setPreviewGlbUrl] = useState(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ar-models');
      setModels(data);
    } catch (err) {
      console.error('Failed to fetch AR models', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    return () => {
      if (previewGlbUrl) URL.revokeObjectURL(previewGlbUrl);
    };
  }, []);

  const handleGlbChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setGlbFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewGlbUrl(objectUrl);

    // Three.js automatic orientation, grounding, and scale detection
    const loader = new GLTFLoader();
    loader.load(
      objectUrl,
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Grounding offset (box.min.y represents lowest mesh point)
        const lowestPoint = box.min.y;

        // Auto-scale normalization to ~30cm tabletop size
        const maxDim = Math.max(size.x, size.y, size.z);
        const autoScale = maxDim > 0 ? (0.3 / maxDim) : 1.0;

        // Rotation checking (auto-detect sideways and inverted models)
        let rotX = 0;
        let rotY = 0; // 0 degrees default
        let rotZ = 0;

        // Auto-lay flat if plate/dish is sideways
        if (size.y > size.x && size.z > size.x && size.y > size.z) {
          rotZ = 1.5708; // 90 deg Z
        } else if (size.y > size.z && size.x > size.z && size.y > size.x) {
          rotX = 1.5708; // 90 deg X
        }

        setFormData(prev => ({
          ...prev,
          dish_name: prev.dish_name || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
          normalized_rotation_x: rotX,
          normalized_rotation_y: rotY,
          normalized_rotation_z: rotZ,
          normalized_scale: parseFloat(autoScale.toFixed(4)),
          normalized_height_offset: parseFloat((-lowestPoint).toFixed(4))
        }));
      },
      undefined,
      (err) => {
        console.error('Failed to parse 3D model for auto-orientation', err);
      }
    );
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!glbFile) return alert('GLB model is required!');
    if (!formData.dish_name) return alert('Dish name is required!');

    setUploading(true);
    const data = new FormData();
    data.append('dish_name', formData.dish_name);
    data.append('category', formData.category);
    data.append('tags', formData.tags);
    data.append('glb_model', glbFile);
    if (usdzFile) data.append('usdz_model', usdzFile);
    data.append('normalized_rotation_x', formData.normalized_rotation_x);
    data.append('normalized_rotation_y', formData.normalized_rotation_y);
    data.append('normalized_rotation_z', formData.normalized_rotation_z);
    data.append('normalized_scale', formData.normalized_scale);
    data.append('normalized_height_offset', formData.normalized_height_offset);

    try {
      await api.post('/admin/ar-models', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Model uploaded and optimized successfully!');
      resetForm();
      fetchModels();
    } catch (err) {
      console.error(err);
      alert('Failed to upload model');
    } finally {
      setUploading(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      await api.put(`/admin/ar-models/${editingModel.id}`, {
        dish_name: editingModel.dish_name,
        category: editingModel.category,
        tags: editingModel.tags,
        normalized_rotation_x: editingModel.normalized_rotation_x,
        normalized_rotation_y: editingModel.normalized_rotation_y,
        normalized_rotation_z: editingModel.normalized_rotation_z,
        normalized_scale: editingModel.normalized_scale,
        normalized_height_offset: editingModel.normalized_height_offset
      });
      alert('Model orientation and metadata updated successfully!');
      setEditingModel(null);
      fetchModels();
    } catch (err) {
      console.error(err);
      alert('Failed to update model');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this global AR model?')) return;
    try {
      await api.delete(`/admin/ar-models/${id}`);
      fetchModels();
    } catch (err) {
      alert('Failed to delete model');
    }
  };

  const resetForm = () => {
    setFormData({
      dish_name: '',
      category: '',
      tags: '',
      normalized_rotation_x: 0,
      normalized_rotation_y: 0,
      normalized_rotation_z: 0,
      normalized_scale: 1.0,
      normalized_height_offset: 0
    });
    setGlbFile(null);
    setUsdzFile(null);
    if (previewGlbUrl) {
      URL.revokeObjectURL(previewGlbUrl);
      setPreviewGlbUrl(null);
    }
  };

  const handleBulkChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setBulkProgress({ total: files.length, processed: 0, uploading: false });
    const loader = new GLTFLoader();
    const newBulkFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      const dish_name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

      try {
        const gltf = await new Promise((resolve, reject) => loader.load(objectUrl, resolve, undefined, reject));
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        const lowestPoint = box.min.y;
        const maxDim = Math.max(size.x, size.y, size.z);
        const autoScale = maxDim > 0 ? (0.3 / maxDim) : 1.0;

        let rotX = 0, rotY = 0, rotZ = 0;
        if (size.y > size.x && size.z > size.x && size.y > size.z) rotZ = 1.5708;
        else if (size.y > size.z && size.x > size.z && size.y > size.x) rotX = 1.5708;

        newBulkFiles.push({
          id: Date.now() + i, file, objectUrl, dish_name, category: '', tags: '',
          normalized_rotation_x: rotX, normalized_rotation_y: rotY, normalized_rotation_z: rotZ,
          normalized_scale: parseFloat(autoScale.toFixed(4)), normalized_height_offset: parseFloat((-lowestPoint).toFixed(4)),
        });
      } catch (err) {
        newBulkFiles.push({
          id: Date.now() + i, file, objectUrl, dish_name, category: '', tags: '',
          normalized_rotation_x: 0, normalized_rotation_y: 0, normalized_rotation_z: 0,
          normalized_scale: 1.0, normalized_height_offset: 0,
        });
      }
      setBulkProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
    }
    setBulkFiles(prev => [...prev, ...newBulkFiles]);
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setBulkProgress({ total: bulkFiles.length, processed: 0, uploading: true });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < bulkFiles.length; i++) {
      const bf = bulkFiles[i];
      if (bf.status === 'success') continue;

      setBulkFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'uploading' } : f));

      const data = new FormData();
      data.append('dish_name', bf.dish_name);
      data.append('category', bf.category);
      data.append('tags', bf.tags);
      data.append('glb_model', bf.file);
      data.append('normalized_rotation_x', bf.normalized_rotation_x);
      data.append('normalized_rotation_y', bf.normalized_rotation_y);
      data.append('normalized_rotation_z', bf.normalized_rotation_z);
      data.append('normalized_scale', bf.normalized_scale);
      data.append('normalized_height_offset', bf.normalized_height_offset);

      try {
        await api.post('/admin/ar-models', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        successCount++;
        setBulkFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'success' } : f));
      } catch (err) {
        console.error(`Failed to upload ${bf.dish_name}:`, err);
        failCount++;
        setBulkFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'error' } : f));
      }
      
      // Update progress
      setBulkProgress(prev => ({ ...prev, processed: i + 1 }));
    }

    alert(`Bulk upload completed! ${successCount} succeeded, ${failCount} failed.`);
    
    // Cleanup successful files
    setBulkFiles(prev => {
      const remaining = [];
      prev.forEach(p => {
        if (p.status === 'success') {
          URL.revokeObjectURL(p.objectUrl);
        } else {
          remaining.push(p);
        }
      });
      return remaining;
    });
    
    fetchModels();
    setBulkProgress({ total: 0, processed: 0, uploading: false });
  };

  const removeBulkFile = (id) => {
    setBulkFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.objectUrl);
      return filtered;
    });
  };

  const filteredModels = models.filter(m => 
    m.dish_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '1rem', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* Upload & Orientation Preview Panel */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', flex: '1 1 450px' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button onClick={() => setUploadMode('single')} style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 600, color: uploadMode === 'single' ? '#4f46e5' : '#64748b', borderBottom: uploadMode === 'single' ? '2px solid #4f46e5' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UploadCloud size={18} /> Single
            </button>
            <button onClick={() => setUploadMode('bulk')} style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 600, color: uploadMode === 'bulk' ? '#4f46e5' : '#64748b', borderBottom: uploadMode === 'bulk' ? '2px solid #4f46e5' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} /> Bulk Upload
            </button>
          </div>

          {uploadMode === 'single' ? (
            <>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#1e293b' }}>
                <UploadCloud size={24} color="#4f46e5" /> Upload Central AR Model
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Choose a GLB model. The system will automatically compute size, ground position, and lay flat when loaded.
              </p>

              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Dish Name *</label>
                <input type="text" value={formData.dish_name} onChange={e => setFormData({...formData, dish_name: e.target.value})} required style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} placeholder="e.g. Butter Chicken" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Category</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} placeholder="e.g. Indian, Main Course" />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Tags (comma separated)</label>
              <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }} placeholder="e.g. spicy, chicken, curry" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ border: '2px dashed #cbd5e1', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#4f46e5' }}>
                  Select GLB *
                  <input type="file" accept=".glb" onChange={handleGlbChange} style={{ display: 'none' }} required />
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {glbFile ? glbFile.name : 'No file chosen'}
                </span>
              </div>

              <div style={{ border: '2px dashed #cbd5e1', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#4f46e5' }}>
                  Select USDZ (Opt)
                  <input type="file" accept=".usdz" onChange={e => setUsdzFile(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {usdzFile ? usdzFile.name : 'No file chosen'}
                </span>
              </div>
            </div>

            {/* LIVE PREVIEW & OVERRIDE PANEL */}
            {previewGlbUrl && (
              <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.75rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={18} /> Orientation Preview Panel
                </h4>
                
                <div style={{ height: '180px', background: '#e2e8f0', borderRadius: '0.5rem', marginBottom: '1rem', overflow: 'hidden', position: 'relative' }}>
                  <model-viewer
                    src={previewGlbUrl}
                    camera-controls
                    interaction-prompt="none"
                    orientation={`${formData.normalized_rotation_x}rad ${formData.normalized_rotation_y}rad ${formData.normalized_rotation_z}rad`}
                    scale={`${formData.normalized_scale} ${formData.normalized_scale} ${formData.normalized_scale}`}
                    style={{ width: '100%', height: '100%' }}
                  ></model-viewer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span>Rotate X (Tilt Forward/Back)</span>
                      <strong>{(formData.normalized_rotation_x * 180 / Math.PI).toFixed(0)}°</strong>
                    </div>
                    <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={formData.normalized_rotation_x} onChange={e => setFormData({...formData, normalized_rotation_x: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span>Rotate Y (Turn Left/Right)</span>
                      <strong>{(formData.normalized_rotation_y * 180 / Math.PI).toFixed(0)}°</strong>
                    </div>
                    <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={formData.normalized_rotation_y} onChange={e => setFormData({...formData, normalized_rotation_y: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span>Rotate Z (Roll Side-to-Side)</span>
                      <strong>{(formData.normalized_rotation_z * 180 / Math.PI).toFixed(0)}°</strong>
                    </div>
                    <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={formData.normalized_rotation_z} onChange={e => setFormData({...formData, normalized_rotation_z: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '0.2rem' }}>Scale Multiplier</span>
                      <input type="number" step={0.05} min={0.1} value={formData.normalized_scale} onChange={e => setFormData({...formData, normalized_scale: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <span style={{ display: 'block', marginBottom: '0.2rem' }}>Height Offset (m)</span>
                      <input type="number" step={0.01} value={formData.normalized_height_offset} onChange={e => setFormData({...formData, normalized_height_offset: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={uploading} style={{ background: '#4f46e5', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? 'Uploading & Optimizing...' : 'Upload & Compress Model'}
            </button>
          </form>
          </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#1e293b' }}>
                <Layers size={24} color="#4f46e5" /> Bulk Upload AR Models
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Select multiple GLB files. The system will auto-orient and extract names.
              </p>

              <div style={{ border: '2px dashed #cbd5e1', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', background: '#f8fafc' }}>
                <label style={{ display: 'inline-block', fontWeight: 600, cursor: 'pointer', color: 'white', background: '#4f46e5', padding: '0.5rem 1rem', borderRadius: '0.375rem' }}>
                  Choose Multiple GLB Files
                  <input type="file" accept=".glb" multiple onChange={handleBulkChange} style={{ display: 'none' }} disabled={bulkProgress.processed > 0 && bulkProgress.processed < bulkProgress.total} />
                </label>
                {bulkProgress.total > 0 && bulkProgress.processed < bulkProgress.total && (
                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                    {bulkProgress.uploading ? 'Uploading' : 'Analyzing'} {bulkProgress.processed} / {bulkProgress.total} files...
                  </div>
                )}
              </div>

              {bulkFiles.length > 0 && (
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                  {bulkFiles.map((bf, idx) => (
                    <div key={bf.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderBottom: idx < bulkFiles.length - 1 ? '1px solid #e2e8f0' : 'none', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input type="text" value={bf.dish_name} onChange={e => { const val = e.target.value; setBulkFiles(prev => prev.map(f => f.id === bf.id ? {...f, dish_name: val} : f)); }} style={{ width: '100%', padding: '0.3rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} />
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bf.file.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {bf.normalized_rotation_x === 0 && bf.normalized_rotation_z === 0 ? '✓ Flat' : '↺ Rotated'}
                      </div>
                      <button onClick={() => removeBulkFile(bf.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleBulkUpload} disabled={bulkFiles.length === 0 || bulkProgress.uploading} style={{ background: '#4f46e5', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', fontWeight: 600, cursor: (bulkFiles.length === 0 || bulkProgress.uploading) ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
                {bulkProgress.uploading ? 'Uploading Bulk...' : `Upload ${bulkFiles.length} Models`}
              </button>
            </div>
          )}
        </div>

        {/* Library Inventory */}
        <div style={{ flex: '1 1 500px' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={20} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search central models..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </div>

          {loading ? <Loader /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {filteredModels.map(model => (
                <div key={model.id} style={{ background: 'white', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 2px 4px rgb(0 0 0 / 0.05)', border: '1px solid #e2e8f0' }}>
                  <div style={{ height: '180px', background: '#f8fafc', position: 'relative' }}>
                    <model-viewer
                      src={model.glb_url}
                      camera-controls
                      interaction-prompt="none"
                      orientation={`${model.normalized_rotation_x || 0}rad ${model.normalized_rotation_y || 0}rad ${model.normalized_rotation_z || 0}rad`}
                      scale={`${model.normalized_scale || 1} ${model.normalized_scale || 1} ${model.normalized_scale || 1}`}
                      style={{ width: '100%', height: '100%' }}
                    ></model-viewer>
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600 }}>{model.dish_name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      <span>{model.category || 'Uncategorized'}</span>
                      <span>{model.file_size_mb} MB</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingModel(model)} style={{ flex: 1, padding: '0.4rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        <Settings size={14} /> Adjust
                      </button>
                      <button onClick={() => handleDelete(model.id)} style={{ padding: '0.4rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredModels.length === 0 && (
                <p style={{ color: '#64748b', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>No models found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Orientation Modal */}
      {editingModel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Adjust Orientation: {editingModel.dish_name}</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Override default transforms. Changes will automatically apply to all restaurants using this model.
            </p>

            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ height: '180px', background: '#e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <model-viewer
                  src={editingModel.glb_url}
                  camera-controls
                  interaction-prompt="none"
                  orientation={`${editingModel.normalized_rotation_x}rad ${editingModel.normalized_rotation_y}rad ${editingModel.normalized_rotation_z}rad`}
                  scale={`${editingModel.normalized_scale} ${editingModel.normalized_scale} ${editingModel.normalized_scale}`}
                  style={{ width: '100%', height: '100%' }}
                ></model-viewer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span>Rotate X (Tilt Forward/Back)</span>
                    <strong>{(editingModel.normalized_rotation_x * 180 / Math.PI).toFixed(0)}°</strong>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={editingModel.normalized_rotation_x} onChange={e => setEditingModel({...editingModel, normalized_rotation_x: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span>Rotate Y (Turn Left/Right)</span>
                    <strong>{(editingModel.normalized_rotation_y * 180 / Math.PI).toFixed(0)}°</strong>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={editingModel.normalized_rotation_y} onChange={e => setEditingModel({...editingModel, normalized_rotation_y: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.1rem' }}>
                    <span>Rotate Z (Roll Side-to-Side)</span>
                    <strong>{(editingModel.normalized_rotation_z * 180 / Math.PI).toFixed(0)}°</strong>
                  </div>
                  <input type="range" min={-Math.PI} max={Math.PI} step={0.05} value={editingModel.normalized_rotation_z} onChange={e => setEditingModel({...editingModel, normalized_rotation_z: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ display: 'block', marginBottom: '0.2rem' }}>Scale Multiplier</span>
                    <input type="number" step={0.05} min={0.1} value={editingModel.normalized_scale} onChange={e => setEditingModel({...editingModel, normalized_scale: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <span style={{ display: 'block', marginBottom: '0.2rem' }}>Height Offset (m)</span>
                    <input type="number" step={0.01} value={editingModel.normalized_height_offset} onChange={e => setEditingModel({...editingModel, normalized_height_offset: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditingModel(null)} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '0.75rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}>Save Transforms</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminARModelLibrary;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Loader from '../components/Loader';
import { Trash2, Search, UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';

const AdminARModelLibrary = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({ dish_name: '', category: '', tags: '' });
  const [glbFile, setGlbFile] = useState(null);
  const [usdzFile, setUsdzFile] = useState(null);

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
  }, []);

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

    try {
      await api.post('/admin/ar-models', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Model uploaded and optimized successfully!');
      setFormData({ dish_name: '', category: '', tags: '' });
      setGlbFile(null);
      setUsdzFile(null);
      fetchModels();
    } catch (err) {
      console.error(err);
      alert('Failed to upload model');
    } finally {
      setUploading(false);
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

  const filteredModels = models.filter(m => 
    m.dish_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '1rem', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* Upload Form */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', flex: '1 1 300px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
            <UploadCloud size={24} color="#4f46e5" /> Upload New AR Model
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Models will be automatically compressed with Draco and resized for mobile performance.
          </p>

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Dish Name *</label>
              <input type="text" value={formData.dish_name} onChange={e => setFormData({...formData, dish_name: e.target.value})} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} placeholder="e.g. Butter Chicken" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Category</label>
              <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} placeholder="e.g. Indian, Main Course" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Tags (comma separated)</label>
              <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} placeholder="e.g. spicy, chicken, curry" />
            </div>
            
            <div style={{ border: '2px dashed #cbd5e1', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
              <FileText size={24} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', cursor: 'pointer', color: '#4f46e5' }}>
                Select .GLB File *
                <input type="file" accept=".glb" onChange={e => setGlbFile(e.target.files[0])} style={{ display: 'none' }} required />
              </label>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{glbFile ? glbFile.name : 'No file chosen'}</span>
            </div>

            <div style={{ border: '2px dashed #cbd5e1', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
              <FileText size={24} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', cursor: 'pointer', color: '#4f46e5' }}>
                Select .USDZ File (Optional)
                <input type="file" accept=".usdz" onChange={e => setUsdzFile(e.target.files[0])} style={{ display: 'none' }} />
              </label>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{usdzFile ? usdzFile.name : 'No file chosen'}</span>
            </div>

            <button type="submit" disabled={uploading} style={{ background: '#4f46e5', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? 'Uploading & Optimizing...' : 'Upload Model'}
            </button>
          </form>
        </div>

        {/* Model Grid */}
        <div style={{ flex: '1 1 500px' }}>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search size={20} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search library models..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
          </div>

          {loading ? <Loader /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {filteredModels.map(model => (
                <div key={model.id} style={{ background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <div style={{ height: '200px', background: '#f1f5f9', position: 'relative' }}>
                    <model-viewer
                      src={model.glb_url}
                      auto-rotate="true"
                      camera-controls
                      style={{ width: '100%', height: '100%' }}
                    ></model-viewer>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{model.dish_name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                      <span>{model.category || 'Uncategorized'}</span>
                      <span>{model.file_size_mb} MB</span>
                    </div>
                    <button onClick={() => handleDelete(model.id)} style={{ width: '100%', padding: '0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Trash2 size={16} /> Delete
                    </button>
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
    </div>
  );
};

export default AdminARModelLibrary;

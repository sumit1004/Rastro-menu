import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Loader from '../components/Loader';

const RestaurantProfile = () => {
  const [formData, setFormData] = useState({
    restaurant_name: '',
    slug: '',
    description: '',
    address: '',
    phone: '',
    cuisine_type: '',
    instagram_link: '',
    website_link: '',
    opening_hours: ''
  });
  
  const [files, setFiles] = useState({ logo: null, banner: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/restaurants/my-profile');
        if (data) {
          setFormData({
            restaurant_name: data.restaurant_name || '',
            slug: data.slug || '',
            description: data.description || '',
            address: data.address || '',
            phone: data.phone || '',
            cuisine_type: data.cuisine_type || '',
            instagram_link: data.instagram_link || '',
            website_link: data.website_link || '',
            opening_hours: data.opening_hours || ''
          });
        }
      } catch (error) {
        console.log("No profile yet or error fetching profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.id]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
    if (files.logo) submitData.append('logo', files.logo);
    if (files.banner) submitData.append('banner', files.banner);

    try {
      await api.post('/restaurants', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="dashboard-page-header">
        <div>
          <h2>Restaurant Profile</h2>
          <p className="text-muted">Manage your public information and branding.</p>
        </div>
      </div>

      <Card>
        {message.text && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            borderRadius: '0.5rem',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Restaurant Name" id="restaurant_name" value={formData.restaurant_name} onChange={handleChange} required />
            <Input label="URL Slug (e.g. my-restaurant)" id="slug" value={formData.slug} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              id="description" 
              className="form-control" 
              rows="4" 
              value={formData.description} 
              onChange={handleChange}
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Address" id="address" value={formData.address} onChange={handleChange} />
            <Input label="Phone" id="phone" value={formData.phone} onChange={handleChange} />
            <Input label="Cuisine Type" id="cuisine_type" value={formData.cuisine_type} onChange={handleChange} />
            <Input label="Opening Hours" id="opening_hours" value={formData.opening_hours} onChange={handleChange} />
            <Input label="Instagram Link" id="instagram_link" value={formData.instagram_link} onChange={handleChange} />
            <Input label="Website Link" id="website_link" value={formData.website_link} onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="logo">Upload Logo (Image)</label>
              <input type="file" id="logo" accept="image/*" onChange={handleFileChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="banner">Upload Banner (Image)</label>
              <input type="file" id="banner" accept="image/*" onChange={handleFileChange} className="form-control" />
            </div>
          </div>

          <Button type="submit" loading={saving} style={{ justifySelf: 'start' }}>
            Save Profile
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default RestaurantProfile;

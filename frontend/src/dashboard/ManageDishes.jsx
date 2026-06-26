import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Utensils, Sparkles, Lock, X, Search } from 'lucide-react';
import ImageCropper from '../components/ImageCropper';
import api, { getImageUrl } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import UpgradeModal from '../components/UpgradeModal';
import BulkImportModal from './BulkImportModal';
import { FileText } from 'lucide-react';

const ManageDishes = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  
  const [subscription, setSubscription] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ isOpen: false, featureName: '', message: '', limitReached: false });

  const [formData, setFormData] = useState({
    name: '', description: '', ingredients: '',
    category: '', price: '', spice_level: '0', calories: '', 
    preparation_time: '', is_available: true, is_featured: false,
    ar_enabled: false,
    enable_3d_ar: false,
    taste_tags: [],
    has_full_plate: true,
    has_half_plate: false,
    full_plate_price: '',
    half_plate_price: '',
    dish_role: '',
    cuisine_type: '',
    meal_type: '',
    ar_model_id: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [arImageFile, setArImageFile] = useState(null);
  const [glbModelFile, setGlbModelFile] = useState(null);
  const [usdzModelFile, setUsdzModelFile] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [existingAssets, setExistingAssets] = useState({ image: null, arImage: null, glbModel: null, usdzModel: null });
  const [removeAssets, setRemoveAssets] = useState({ image: false, arImage: false, glbModel: false, usdzModel: false });

  const [suggestionsModalState, setSuggestionsModalState] = useState({
    isOpen: false,
    dish: null,
    selectedSuggestions: [],
    searchQuery: '',
    saving: false
  });

  const [arModels, setArModels] = useState([]);
  const [searchingAr, setSearchingAr] = useState(false);
  const [showCustomAr, setShowCustomAr] = useState(false);

  useEffect(() => {
    if (formData.enable_3d_ar && formData.name) {
      const searchAr = async () => {
        setSearchingAr(true);
        try {
          const { data } = await api.get(`/dishes/ar-models/search?query=${encodeURIComponent(formData.name)}`);
          setArModels(data);
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingAr(false);
        }
      };
      const timeoutId = setTimeout(searchAr, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.name, formData.enable_3d_ar]);

  const toggleAvailability = async (dish) => {
    try {
      const newStatus = !dish.is_available;
      setDishes(dishes.map(d => d.id === dish.id ? { ...d, is_available: newStatus } : d));
      await api.patch(`/dishes/${dish.id}/availability`, { is_available: newStatus });
    } catch (error) {
      alert('Failed to update availability');
      setDishes(dishes.map(d => d.id === dish.id ? { ...d, is_available: dish.is_available } : d));
    }
  };

  const fetchDishes = async (restId) => {
    try {
      const { data } = await api.get(`/dishes/restaurant/${restId}`);
      setDishes(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data } = await api.get('/subscription/details');
      setSubscription(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/restaurants/my-profile');
        setRestaurantId(data.id);
        await Promise.all([fetchDishes(data.id), fetchSubscription()]);
      } catch (error) {
        console.error("Error fetching profile or dishes", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.id === 'price' && formData.has_full_plate) {
      setFormData({ ...formData, price: value, full_plate_price: value });
      return;
    }
    setFormData({ ...formData, [e.target.id]: value });
  };

  const handleOpenAddModal = () => {
    const dishLimit = subscription?.limits?.maxDishes;
    const currentDishes = subscription?.usage?.dishes || dishes.length;
    
    if (dishLimit !== undefined && dishLimit !== null && dishLimit !== Infinity && currentDishes >= dishLimit) {
      setUpgradeModal({
        isOpen: true,
        featureName: 'Unlimited Dishes',
        message: 'You have reached the maximum number of dishes for the Free plan.',
        limitReached: true
      });
      return;
    }
    
    handleOpenModal();
  };

  const handleOpenModal = async (dish = null) => {
    if (dish) {
      setEditingId(dish.id);
      setFormData({
        name: dish.name || '', description: dish.description || '', ingredients: dish.ingredients || '',
        category: dish.category || '', price: dish.price || '', spice_level: dish.spice_level || '0', 
        calories: dish.calories || '', preparation_time: dish.preparation_time || '', 
        is_available: dish.is_available, is_featured: dish.is_featured,
        ar_enabled: dish.ar_enabled || false,
        enable_3d_ar: dish.enable_3d_ar || false,
        taste_tags: typeof dish.taste_tags === 'string' ? JSON.parse(dish.taste_tags) : (dish.taste_tags || []),
        has_full_plate: dish.has_full_plate,
        has_half_plate: dish.has_half_plate,
        full_plate_price: dish.full_plate_price || '',
        half_plate_price: dish.half_plate_price || '',
        dish_role: dish.dish_role || '',
        cuisine_type: dish.cuisine_type || '',
        meal_type: dish.meal_type || '',
        ar_model_id: dish.ar_model_id || ''
      });
      setExistingAssets({ image: dish.image_url, arImage: dish.ar_image_url, glbModel: dish.glb_model_url, usdzModel: dish.usdz_model_url });
    } else {
      setEditingId(null);
      setFormData({
        name: '', description: '', ingredients: '',
        category: '', price: '', spice_level: '0', calories: '', 
        preparation_time: '', is_available: true, is_featured: false,
        ar_enabled: false,
        enable_3d_ar: false,
        taste_tags: [],
        has_full_plate: true,
        has_half_plate: false,
        full_plate_price: '',
        half_plate_price: '',
        dish_role: '',
        cuisine_type: '',
        meal_type: '',
        ar_model_id: ''
      });
      setExistingAssets({ image: null, arImage: null, glbModel: null, usdzModel: null });
    }
    setRemoveAssets({ image: false, arImage: false, glbModel: false, usdzModel: false });
    setImageFile(null);
    setArImageFile(null);
    setGlbModelFile(null);
    setUsdzModelFile(null);
    setCropImageSrc(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'taste_tags') {
        submitData.append(key, JSON.stringify(formData[key]));
      } else {
        submitData.append(key, formData[key]);
      }
    });
    if (imageFile) submitData.append('image', imageFile);
    if (arImageFile) submitData.append('ar_image', arImageFile);
    if (glbModelFile) submitData.append('glb_model', glbModelFile);
    if (usdzModelFile) submitData.append('usdz_model', usdzModelFile);
    if (removeAssets.image) submitData.append('remove_image', 'true');
    if (removeAssets.arImage) submitData.append('remove_ar_image', 'true');
    if (removeAssets.glbModel) submitData.append('remove_glb_model', 'true');
    if (removeAssets.usdzModel) submitData.append('remove_usdz_model', 'true');

    try {
      let dishId = editingId;
      if (editingId) {
        await api.put(`/dishes/${editingId}`, submitData);
        setIsModalOpen(false);
        // Refetch on edit to get updated data
        await fetchDishes(restaurantId);
      } else {
        const res = await api.post('/dishes', submitData);
        dishId = res.data.id;
        setIsModalOpen(false);
        // Optimistic insert: if backend returned the new dish, inject it instantly
        if (res.data.dish) {
          setDishes(prev => [res.data.dish, ...prev]);
        } else {
          // Fallback: refetch if the backend didn't return the full dish
          await fetchDishes(restaurantId);
        }
      }
      await fetchSubscription(); // update usage count
    } catch (error) {
      if (error.response?.data?.code === 'LIMIT_REACHED') {
        setIsModalOpen(false);
        setUpgradeModal({
          isOpen: true,
          featureName: 'Unlimited Dishes',
          message: error.response.data.message,
          limitReached: true
        });
      } else {
        alert(error.response?.data?.message || 'Error saving dish');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this dish?")) {
      // Optimistic delete: immediately remove from UI
      const previousDishes = dishes;
      setDishes(prev => prev.filter(d => d.id !== id));
      try {
        await api.delete(`/dishes/${id}`);
        await fetchSubscription(); // update usage count
      } catch (error) {
        // Revert on failure
        setDishes(previousDishes);
        alert('Error deleting dish. Please try again.');
      }
    }
  };



  const handleOpenSuggestionsModal = async (dish) => {
    setSuggestionsModalState({
      isOpen: true,
      dish,
      selectedSuggestions: [],
      searchQuery: '',
      saving: false
    });
    
    try {
      const { data } = await api.get(`/suggestions/dish/${dish.id}`);
      setSuggestionsModalState(prev => ({
        ...prev,
        selectedSuggestions: data.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          thumbnail_url: s.thumbnail_url
        }))
      }));
    } catch (err) {
      console.error("Failed to load existing suggestions", err);
    }
  };

  const handleSaveSuggestions = async (e) => {
    e.preventDefault();
    setSuggestionsModalState(prev => ({ ...prev, saving: true }));
    try {
      await api.put(`/suggestions/sync/${suggestionsModalState.dish.id}`, {
        suggested_dish_ids: suggestionsModalState.selectedSuggestions.map(s => s.id)
      });
      setSuggestionsModalState(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert("Failed to save suggestions");
    } finally {
      setSuggestionsModalState(prev => ({ ...prev, saving: false }));
    }
  };

  if (loading) return <Loader />;

  if (!restaurantId) {
    return (
      <div>
        <h2>Manage Dishes</h2>
        <Card className="mt-4">
          <p className="text-center">Please complete your Restaurant Profile first before adding dishes.</p>
        </Card>
      </div>
    );
  }



  return (
    <div>
      <div className="dashboard-page-header">
        <div>
          <h2>Manage Dishes</h2>
          <p className="text-muted">Add, edit, or remove dishes from your menu.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} icon={<FileText size={18} />}>
            Bulk Import Menu
          </Button>
          <Button onClick={handleOpenAddModal} icon={<Plus size={18} />}>Add New Dish</Button>
        </div>
      </div>

      <BulkImportModal 
        isOpen={isBulkImportOpen} 
        onClose={() => setIsBulkImportOpen(false)} 
        onImportSuccess={() => {
          fetchDishes(restaurantId);
          fetchSubscription();
        }} 
      />

      <div className="dishes-list" style={{ display: 'grid', gap: '1rem' }}>
        {dishes.length === 0 ? (
          <Card className="text-center p-8">
            <Utensils size={48} className="text-muted mx-auto mb-4" />
            <h3>No dishes yet</h3>
            <p className="text-muted mb-4">Start building your menu by adding your first dish.</p>
            <Button onClick={handleOpenAddModal}>Add Dish</Button>
          </Card>
        ) : (
          dishes.map(dish => (
            <Card key={dish.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '0.5rem', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {dish.thumbnail_url ? (
                  <img src={getImageUrl(dish.thumbnail_url)} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon className="text-muted" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.125rem' }}>{dish.name}</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>{dish.category} • ₹{dish.price}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {!dish.is_available && <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '1rem' }}>Unavailable</span>}
                  {dish.is_featured && <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '1rem' }}>Featured</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button 
                  variant={dish.is_available ? "outline" : "solid"} 
                  style={{ padding: '0.5rem', backgroundColor: dish.is_available ? 'transparent' : '#f3f4f6', color: dish.is_available ? '#16a34a' : '#4b5563', borderColor: dish.is_available ? '#16a34a' : '#d1d5db' }} 
                  onClick={() => toggleAvailability(dish)}
                >
                  {dish.is_available ? 'Available' : 'Not Available'}
                </Button>
                <Button variant="outline" style={{ padding: '0.5rem' }} onClick={() => handleOpenSuggestionsModal(dish)} title="Add Suggestions"><Sparkles size={16} /></Button>
                <Button variant="outline" style={{ padding: '0.5rem' }} onClick={() => handleOpenModal(dish)}><Edit2 size={16} /></Button>
                <Button variant="outline" style={{ padding: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDelete(dish.id)}><Trash2 size={16} /></Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Dish" : "Add New Dish"}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', marginBottom: '1rem' }}>
              <Input label="Dish Name*" id="name" value={formData.name} onChange={handleChange} required />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
            <Input label="Category*" id="category" value={formData.category} onChange={handleChange} required />
            <Input label="Base Price (₹)*" type="number" step="0.01" id="price" value={formData.price} onChange={handleChange} required />
          </div>

          <div className="form-group" style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Smart Pairing Configuration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">Dish Role</label>
                <select id="dish_role" value={formData.dish_role} onChange={handleChange} className="form-control">
                  <option value="">Select Role...</option>
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                  <option value="starter">Starter</option>
                  <option value="dessert">Dessert</option>
                  <option value="beverage">Beverage</option>
                  <option value="bread">Bread</option>
                  <option value="dip">Dip</option>
                  <option value="accompaniment">Accompaniment</option>
                </select>
              </div>
              <div>
                <label className="form-label">Cuisine Type</label>
                <select id="cuisine_type" value={formData.cuisine_type} onChange={handleChange} className="form-control">
                  <option value="">Select Cuisine...</option>
                  <option value="North Indian">North Indian</option>
                  <option value="South Indian">South Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Italian">Italian</option>
                  <option value="Fast Food">Fast Food</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Street Food">Street Food</option>
                </select>
              </div>
              <div>
                <label className="form-label">Meal Type</label>
                <select id="meal_type" value={formData.meal_type} onChange={handleChange} className="form-control">
                  <option value="">Select Meal...</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Drink">Drink</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="form-group" style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Portion & Pricing Configuration</h4>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: '120px' }}>
                <input type="checkbox" id="has_full_plate" checked={formData.has_full_plate} onChange={handleChange} />
                Full Plate
              </label>
              {formData.has_full_plate && (
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <Input label="Full Plate Price (₹)" type="number" step="0.01" id="full_plate_price" value={formData.full_plate_price} onChange={handleChange} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: '120px' }}>
                <input type="checkbox" id="has_half_plate" checked={formData.has_half_plate} onChange={handleChange} />
                Half Plate
              </label>
              {formData.has_half_plate && (
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <Input label="Half Plate Price (₹)" type="number" step="0.01" id="half_plate_price" value={formData.half_plate_price} onChange={handleChange} />
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea id="description" className="form-control" rows="3" value={formData.description} onChange={handleChange} placeholder="Premium dish description..."></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Ingredients (comma separated)</label>
            <textarea id="ingredients" className="form-control" rows="2" value={formData.ingredients} onChange={handleChange}></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '1rem' }}>
            <Input label="Prep Time (mins)" type="number" id="preparation_time" value={formData.preparation_time} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Dish Image</label>
            {existingAssets.image && !removeAssets.image && !imageFile && (
              <div style={{ marginBottom: '1rem', position: 'relative', width: 'fit-content' }}>
                <img src={getImageUrl(existingAssets.image)} alt="Current" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                <button type="button" onClick={() => window.confirm("Remove existing image?") && setRemoveAssets({...removeAssets, image: true})} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', paddingBottom: '2px' }}>×</button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="form-control" />
          </div>

          <div className="form-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Sparkles size={18} /> 3D AR Configuration (Real AR)</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: subscription?.features?.arAccess ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: subscription?.features?.arAccess ? 1 : 0.6 }}>
                <input 
                  type="checkbox" 
                  id="enable_3d_ar" 
                  checked={formData.enable_3d_ar} 
                  onChange={(e) => {
                    if (!subscription?.features?.arAccess) {
                      e.preventDefault();
                      setUpgradeModal({
                        isOpen: true,
                        featureName: '3D AR Experience',
                        message: 'REAL 3D AR Experience is only available on Pro and Premium plans.',
                        limitReached: false
                      });
                      return;
                    }
                    handleChange(e);
                  }} 
                  disabled={!subscription?.features?.arAccess}
                />
                Enable REAL 3D AR Experience
                {!subscription?.features?.arAccess && <Lock size={14} className="text-muted" />}
              </label>
            </div>
            
            {formData.enable_3d_ar && (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Central Library Integration */}
                <div style={{ marginBottom: '1rem' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={16} /> Central AR Library Search
                  </h5>
                  {searchingAr ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>Searching library...</div>
                  ) : arModels.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
                      {arModels.map(model => (
                        <div 
                          key={model.id} 
                          onClick={() => { setFormData({...formData, ar_model_id: model.id}); setShowCustomAr(false); }}
                          style={{ border: formData.ar_model_id === model.id ? '2px solid #4f46e5' : '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer', background: 'white' }}
                        >
                          <div style={{ height: '100px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {model.thumbnail_url || model.preview_image ? (
                              <img src={getImageUrl(model.thumbnail_url || model.preview_image)} alt={model.dish_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>No Preview</span>
                            )}
                          </div>
                          <div style={{ padding: '0.5rem', fontSize: '0.875rem', textAlign: 'center', fontWeight: formData.ar_model_id === model.id ? 600 : 400 }}>
                            {model.dish_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>No matching models found in the library for "{formData.name}".</p>
                  )}
                  
                  {formData.ar_model_id && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>✓ Using Library Model (ID: {formData.ar_model_id})</span>
                      <button type="button" onClick={() => setFormData({...formData, ar_model_id: ''})} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
                    </div>
                  )}
                </div>

                {!formData.ar_model_id && (
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h5 style={{ margin: 0 }}>Custom Model Upload (Fallback)</h5>
                      <button type="button" onClick={() => setShowCustomAr(!showCustomAr)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                        {showCustomAr ? 'Hide Custom Upload' : 'Show Custom Upload'}
                      </button>
                    </div>

                    {showCustomAr && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label className="form-label">.GLB Model (Android/WebXR)</label>
                          {existingAssets.glbModel && !removeAssets.glbModel && !glbModelFile && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{ color: '#16a34a', fontSize: '0.875rem' }}>✓ Existing Model Uploaded</span>
                              <button type="button" onClick={() => setRemoveAssets({...removeAssets, glbModel: true})} style={{ marginLeft: '1rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                            </div>
                          )}
                          <input type="file" accept=".glb,.gltf" onChange={(e) => {
                            if (e.target.files[0] && e.target.files[0].size > 15 * 1024 * 1024) {
                              alert("File exceeds 15MB limit!");
                              e.target.value = null;
                              return;
                            }
                            setGlbModelFile(e.target.files[0]);
                          }} className="form-control" />
                        </div>
                        <div>
                          <label className="form-label">.USDZ Model (iOS Quick Look)</label>
                          {existingAssets.usdzModel && !removeAssets.usdzModel && !usdzModelFile && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <span style={{ color: '#16a34a', fontSize: '0.875rem' }}>✓ Existing USDZ Uploaded</span>
                              <button type="button" onClick={() => setRemoveAssets({...removeAssets, usdzModel: true})} style={{ marginLeft: '1rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Remove</button>
                            </div>
                          )}
                          <input type="file" accept=".usdz" onChange={(e) => {
                            if (e.target.files[0] && e.target.files[0].size > 15 * 1024 * 1024) {
                              alert("File exceeds 15MB limit!");
                              e.target.value = null;
                              return;
                            }
                            setUsdzModelFile(e.target.files[0]);
                          }} className="form-control" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '0.5rem', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '0.875rem', borderRadius: '0.25rem' }}>
                  <strong>Auto-Optimization:</strong> Models will be automatically scaled to real-world plate size (~25cm) and grounded properly. No manual adjustments needed.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" id="is_available" checked={formData.is_available} onChange={handleChange} />
              Available
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" id="is_featured" checked={formData.is_featured} onChange={handleChange} />
              Featured
            </label>
          </div>

          <Button type="submit" loading={saving} className="mt-4">
            {editingId ? "Update Dish" : "Add Dish"}
          </Button>
        </form>
      </Modal>

      <UpgradeModal 
        isOpen={upgradeModal.isOpen} 
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })} 
        featureName={upgradeModal.featureName}
        message={upgradeModal.message}
        limitReached={upgradeModal.limitReached}
      />

      <ImageCropper 
        isOpen={isCropperOpen} 
        imageSrc={cropImageSrc} 
        onClose={() => setIsCropperOpen(false)} 
        onCropComplete={(file) => {
          setArImageFile(file);
          setIsCropperOpen(false);
        }} 
      />

      {/* Suggestions Modal */}
      <Modal isOpen={suggestionsModalState.isOpen} onClose={() => setSuggestionsModalState(prev => ({ ...prev, isOpen: false }))} title="Add Suggestions">
        {suggestionsModalState.dish && (
          <form onSubmit={handleSaveSuggestions} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '0.25rem', overflow: 'hidden', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                {suggestionsModalState.dish.thumbnail_url ? (
                  <img src={getImageUrl(suggestionsModalState.dish.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                ) : (
                  <ImageIcon className="text-muted" style={{ margin: 'auto' }} />
                )}
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions for:</p>
                <h4 style={{ margin: 0 }}>{suggestionsModalState.dish.name}</h4>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <Input 
                placeholder="Search real dishes by name..." 
                value={suggestionsModalState.searchQuery}
                onChange={(e) => setSuggestionsModalState(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
              {suggestionsModalState.searchQuery && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.25rem', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  {dishes.filter(d => 
                    d.id !== suggestionsModalState.dish.id && 
                    !suggestionsModalState.selectedSuggestions.find(s => s.id === d.id) &&
                    d.name.toLowerCase().includes(suggestionsModalState.searchQuery.toLowerCase())
                  ).map(d => (
                    <div key={d.id} 
                         onClick={() => {
                           setSuggestionsModalState(prev => ({
                             ...prev,
                             selectedSuggestions: [...prev.selectedSuggestions, d],
                             searchQuery: ''
                           }));
                         }}
                         style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #f1f5f9' }}
                         onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                         onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '0.25rem', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 }}>
                        {d.thumbnail_url ? <img src={getImageUrl(d.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{d.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{d.price} • {d.category}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: '#16a34a' }}><Plus size={16} /></div>
                    </div>
                  ))}
                  {dishes.filter(d => d.id !== suggestionsModalState.dish.id && !suggestionsModalState.selectedSuggestions.find(s => s.id === d.id) && d.name.toLowerCase().includes(suggestionsModalState.searchQuery.toLowerCase())).length === 0 && (
                    <div style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>No available dishes found.</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#475569' }}>Selected Suggestions</h5>
              {suggestionsModalState.selectedSuggestions.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No suggestions added yet. Search above to add some.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {suggestionsModalState.selectedSuggestions.map((s, idx) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '0.25rem', overflow: 'hidden', backgroundColor: '#e2e8f0', flexShrink: 0 }}>
                        {s.thumbnail_url ? <img src={getImageUrl(s.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.category}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button type="button" onClick={() => {
                          if (idx > 0) {
                            setSuggestionsModalState(prev => {
                              const arr = [...prev.selectedSuggestions];
                              [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                              return { ...prev, selectedSuggestions: arr };
                            });
                          }
                        }} style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#94a3b8' }}>↑</button>
                        <button type="button" onClick={() => {
                          if (idx < suggestionsModalState.selectedSuggestions.length - 1) {
                            setSuggestionsModalState(prev => {
                              const arr = [...prev.selectedSuggestions];
                              [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                              return { ...prev, selectedSuggestions: arr };
                            });
                          }
                        }} style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#94a3b8' }}>↓</button>
                        <button type="button" onClick={() => {
                          setSuggestionsModalState(prev => ({
                            ...prev,
                            selectedSuggestions: prev.selectedSuggestions.filter(item => item.id !== s.id)
                          }));
                        }} style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#ef4444' }}><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <Button type="button" variant="outline" onClick={() => setSuggestionsModalState(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
              <Button type="submit" loading={suggestionsModalState.saving}>Save Suggestions</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ManageDishes;

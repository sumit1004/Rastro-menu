import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Utensils, Sparkles, Lock } from 'lucide-react';
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
    ar_asset_type: 'static',
    taste_tags: [],
    has_full_plate: true,
    has_half_plate: false,
    full_plate_price: '',
    half_plate_price: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [arImageFile, setArImageFile] = useState(null);
  const [arVideoFile, setArVideoFile] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [videoPreviewSrc, setVideoPreviewSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [existingAssets, setExistingAssets] = useState({ image: null, arImage: null, arVideo: null });
  const [removeAssets, setRemoveAssets] = useState({ image: false, arImage: false, arVideo: false });

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

  const handleOpenModal = (dish = null) => {
    if (dish) {
      setEditingId(dish.id);
      setFormData({
        name: dish.name, 
        description: dish.ai_description || dish.description || dish.short_description || '', 
        ingredients: dish.ingredients || '',
        category: dish.ai_category || dish.category || '', price: dish.price, spice_level: dish.spice_level, 
        calories: dish.calories || '', preparation_time: dish.preparation_time || '', 
        is_available: dish.is_available, is_featured: dish.is_featured,
        ar_enabled: !!dish.ar_enabled,
        ar_asset_type: dish.ar_asset_type || 'static',
        taste_tags: typeof dish.taste_tags === 'string' ? JSON.parse(dish.taste_tags) : (dish.taste_tags || []),
        has_full_plate: dish.has_full_plate !== undefined ? dish.has_full_plate : true,
        has_half_plate: !!dish.has_half_plate,
        full_plate_price: dish.full_plate_price || dish.price,
        half_plate_price: dish.half_plate_price || ''
      });
      setExistingAssets({ image: dish.image_url, arImage: dish.ar_image_url, arVideo: dish.ar_video_url });
    } else {
      setEditingId(null);
      setFormData({
        name: '', description: '', ingredients: '',
        category: '', price: '', spice_level: '0', calories: '', 
        preparation_time: '', is_available: true, is_featured: false,
        ar_enabled: false,
        ar_asset_type: 'static',
        taste_tags: [],
        has_full_plate: true,
        has_half_plate: false,
        full_plate_price: '',
        half_plate_price: ''
      });
      setExistingAssets({ image: null, arImage: null, arVideo: null });
    }
    setRemoveAssets({ image: false, arImage: false, arVideo: false });
    setImageFile(null);
    setArImageFile(null);
    setArVideoFile(null);
    setCropImageSrc(null);
    setVideoPreviewSrc(null);
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
    if (arVideoFile) submitData.append('ar_video', arVideoFile);
    if (removeAssets.image) submitData.append('remove_image', 'true');
    if (removeAssets.arImage) submitData.append('remove_ar_image', 'true');
    if (removeAssets.arVideo) submitData.append('remove_ar_video', 'true');

    try {
      if (editingId) {
        await api.put(`/dishes/${editingId}`, submitData);
      } else {
        await api.post('/dishes', submitData);
      }
      setIsModalOpen(false);
      await fetchDishes(restaurantId);
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
      try {
        await api.delete(`/dishes/${id}`);
        await fetchDishes(restaurantId);
        await fetchSubscription(); // update usage count
      } catch (error) {
        alert('Error deleting dish');
      }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: subscription?.features?.arAccess ? 'pointer' : 'not-allowed', fontWeight: 'bold', opacity: subscription?.features?.arAccess ? 1 : 0.6 }}>
                <input 
                  type="checkbox" 
                  id="ar_enabled" 
                  checked={formData.ar_enabled} 
                  onChange={(e) => {
                    if (!subscription?.features?.arAccess) {
                      e.preventDefault();
                      setUpgradeModal({
                        isOpen: true,
                        featureName: 'AR Previews',
                        message: 'AR Previews are only available on the Pro and Premium plans.',
                        limitReached: false
                      });
                      return;
                    }
                    handleChange(e);
                  }} 
                  disabled={!subscription?.features?.arAccess}
                />
                Enable AR Preview
                {!subscription?.features?.arAccess && <Lock size={14} className="text-muted" />}
              </label>
            </div>
            
            {formData.ar_enabled && (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="form-label">AR Asset Manager</label>
                    <select id="ar_asset_type" value={formData.ar_asset_type} onChange={handleChange} className="form-control">
                      <option value="static">Static AR Image (PNG/WEBP)</option>
                      <option value="cinematic">Cinematic AR Video (MP4/WEBM)</option>
                    </select>
                  </div>
                </div>

                <div>
                  {formData.ar_asset_type === 'static' ? (
                    <>
                      <label className="form-label">Static AR Image File</label>
                      {existingAssets.arImage && !removeAssets.arImage && !arImageFile && (
                        <div style={{ marginBottom: '1rem', position: 'relative', width: 'fit-content' }}>
                          <img src={getImageUrl(existingAssets.arImage)} alt="Current AR" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }} />
                          <button type="button" onClick={() => window.confirm("Remove existing AR image?") && setRemoveAssets({...removeAssets, arImage: true})} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', paddingBottom: '2px' }}>×</button>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/png,image/webp" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setCropImageSrc(reader.result);
                              setIsCropperOpen(true);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="form-control" 
                      />
                      {arImageFile && <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '0.5rem' }}>✓ Image asset ready</p>}
                    </>
                  ) : (
                    <>
                      <label className="form-label">Cinematic AR Video File</label>
                      {existingAssets.arVideo && !removeAssets.arVideo && !arVideoFile && (
                        <div style={{ marginBottom: '1rem', position: 'relative', width: 'fit-content' }}>
                          <video src={getImageUrl(existingAssets.arVideo)} style={{ width: '200px', height: '150px', objectFit: 'contain', borderRadius: '0.5rem', backgroundColor: '#000' }} controls />
                          <button type="button" onClick={() => window.confirm("Remove existing AR video?") && setRemoveAssets({...removeAssets, arVideo: true})} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', paddingBottom: '2px', zIndex: 10 }}>×</button>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="video/mp4,video/webm" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setArVideoFile(file);
                            setVideoPreviewSrc(URL.createObjectURL(file));
                          }
                        }} 
                        className="form-control" 
                      />
                      {arVideoFile && videoPreviewSrc && (
                        <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#000', width: '100%', height: '150px' }}>
                           <video src={videoPreviewSrc} loop muted autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      {arVideoFile && <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: '0.5rem' }}>✓ Video asset ready</p>}
                    </>
                  )}
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
    </div>
  );
};

export default ManageDishes;

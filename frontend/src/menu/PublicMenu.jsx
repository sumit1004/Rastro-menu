import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Clock, Flame, Info } from 'lucide-react';
import api from '../services/api';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Button from '../components/Button';
import './PublicMenu.css';

const PublicMenu = () => {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedDish, setSelectedDish] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewInput, setReviewInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const restRes = await api.get(`/restaurants/slug/${slug}`);
        setRestaurant(restRes.data);
        
        const dishesRes = await api.get(`/dishes/restaurant/${restRes.data.id}`);
        const availableDishes = dishesRes.data.filter(d => d.is_available);
        setDishes(availableDishes);
        
        const uniqueCategories = ['All', ...new Set(availableDishes.map(d => d.category))];
        setCategories(uniqueCategories);
      } catch (err) {
        setError('Restaurant not found or menu is unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [slug]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        dish_id: selectedDish.id,
        rating: ratingInput,
        review: reviewInput
      });
      // Update local state to reflect new review counts simply
      const updatedDishes = dishes.map(d => {
        if(d.id === selectedDish.id) {
          return {
            ...d, 
            total_reviews: d.total_reviews + 1,
            average_rating: d.total_reviews === 0 ? ratingInput : ((parseFloat(d.average_rating) * d.total_reviews) + ratingInput) / (d.total_reviews + 1)
          };
        }
        return d;
      });
      setDishes(updatedDishes);
      setSelectedDish(updatedDishes.find(d => d.id === selectedDish.id));
      alert('Review submitted successfully!');
      setReviewInput('');
      setRatingInput(5);
    } catch (err) {
      alert('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center' }}><Loader /></div>;
  if (error) return <div className="menu-error"><h2>{error}</h2></div>;

  const filteredDishes = activeCategory === 'All' 
    ? dishes 
    : dishes.filter(d => d.category === activeCategory);

  const featuredDishes = dishes.filter(d => d.is_featured);

  return (
    <div className="public-menu-container">
      {/* Header / Banner */}
      <div className="menu-banner" style={{ backgroundImage: `url(${restaurant.banner ? `http://localhost:5000${restaurant.banner}` : 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop'})` }}>
        <div className="menu-banner-overlay"></div>
      </div>
      
      <div className="menu-header container">
        <div className="menu-logo">
          {restaurant.logo ? (
            <img src={`http://localhost:5000${restaurant.logo}`} alt={restaurant.restaurant_name} />
          ) : (
            <div className="menu-logo-placeholder">{restaurant.restaurant_name.charAt(0)}</div>
          )}
        </div>
        <div className="menu-info">
          <h1>{restaurant.restaurant_name}</h1>
          <p className="menu-cuisine">{restaurant.cuisine_type || 'Restaurant'}</p>
          <div className="menu-meta">
            {restaurant.address && <span>{restaurant.address}</span>}
            {restaurant.phone && <span> • {restaurant.phone}</span>}
          </div>
          {restaurant.description && <p className="menu-desc">{restaurant.description}</p>}
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="menu-categories-wrapper">
        <div className="container menu-categories">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dish Grid */}
      <div className="container menu-grid-section">
        {featuredDishes.length > 0 && activeCategory === 'All' && (
          <div className="featured-section">
            <h2 className="section-title">Chef's Specials</h2>
            <div className="dish-grid">
              {featuredDishes.map(dish => (
                <div key={dish.id} className="dish-card featured" onClick={() => setSelectedDish(dish)}>
                  <div className="dish-card-img">
                    {dish.thumbnail_url && <img src={`http://localhost:5000${dish.thumbnail_url}`} alt={dish.name} />}
                    <div className="featured-badge">Special</div>
                  </div>
                  <div className="dish-card-content">
                    <div className="dish-card-header">
                      <h3>{dish.name}</h3>
                      <span className="dish-price">${dish.price}</span>
                    </div>
                    <p className="dish-short-desc">{dish.short_description}</p>
                    <div className="dish-card-footer">
                      {dish.average_rating > 0 && (
                        <div className="dish-rating">
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span>{parseFloat(dish.average_rating).toFixed(1)}</span>
                        </div>
                      )}
                      {dish.spice_level > 0 && (
                        <div className="dish-spice">
                          {Array.from({ length: dish.spice_level }).map((_, i) => <Flame key={i} size={14} color="#ef4444" />)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="all-dishes-section">
          {activeCategory !== 'All' && <h2 className="section-title">{activeCategory}</h2>}
          <div className="dish-grid">
            {filteredDishes.map(dish => (
              <div key={dish.id} className="dish-card" onClick={() => setSelectedDish(dish)}>
                <div className="dish-card-content">
                  <div className="dish-card-header">
                    <h3>{dish.name}</h3>
                    <span className="dish-price">${dish.price}</span>
                  </div>
                  <p className="dish-short-desc">{dish.short_description}</p>
                  <div className="dish-card-footer mt-2">
                    {dish.average_rating > 0 && (
                      <div className="dish-rating">
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <span>{parseFloat(dish.average_rating).toFixed(1)} ({dish.total_reviews})</span>
                      </div>
                    )}
                    {dish.calories > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{dish.calories} cal</span>
                    )}
                  </div>
                </div>
                {dish.thumbnail_url && (
                  <div className="dish-card-img-small">
                    <img src={`http://localhost:5000${dish.thumbnail_url}`} alt={dish.name} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dish Details Modal */}
      <Modal isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} title={selectedDish?.name}>
        {selectedDish && (
          <div className="dish-modal-content">
            {selectedDish.image_url && (
              <div className="dish-modal-img">
                <img src={`http://localhost:5000${selectedDish.image_url}`} alt={selectedDish.name} />
              </div>
            )}
            
            <div className="dish-modal-header mt-4">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDish.name}</h2>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>${selectedDish.price}</span>
            </div>
            
            {selectedDish.average_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Star size={18} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontWeight: '600' }}>{parseFloat(selectedDish.average_rating).toFixed(1)}</span>
                <span style={{ color: 'var(--text-muted)' }}>({selectedDish.total_reviews} reviews)</span>
              </div>
            )}

            <p style={{ marginTop: '1rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {selectedDish.description || selectedDish.short_description}
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              {selectedDish.preparation_time > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Clock size={18} />
                  <span>{selectedDish.preparation_time} mins</span>
                </div>
              )}
              {selectedDish.calories > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Info size={18} />
                  <span>{selectedDish.calories} kcal</span>
                </div>
              )}
              {selectedDish.spice_level > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {Array.from({ length: selectedDish.spice_level }).map((_, i) => <Flame key={i} size={18} color="#ef4444" />)}
                </div>
              )}
            </div>

            {selectedDish.ingredients && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Ingredients</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedDish.ingredients}</p>
              </div>
            )}

            {/* Review Section */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Leave a Review</h4>
              <form onSubmit={handleReviewSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rating</label>
                  <select 
                    value={ratingInput} 
                    onChange={(e) => setRatingInput(Number(e.target.value))}
                    style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', width: '100px' }}
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <textarea 
                    placeholder="Tell us what you thought..."
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '80px' }}
                  ></textarea>
                </div>
                <Button type="submit" loading={submittingReview}>Submit Review</Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicMenu;

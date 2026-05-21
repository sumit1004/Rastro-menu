import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Clock, Flame, Info, Search, Sparkles, Camera } from 'lucide-react';
import api, { getImageUrl } from '../services/api';
import analyticsService from '../services/analyticsService';
import ARViewer from '../ar/ARViewer';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Button from '../components/Button';
import './PublicMenu.css';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const PublicMenu = () => {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendingDishes, setTrendingDishes] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [selectedDish, setSelectedDish] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewInput, setReviewInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const [dishReviews, setDishReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [isARViewerOpen, setIsARViewerOpen] = useState(false);

  // Analytics: Track modal duration
  const currentDishRef = useRef(null);
  const modalOpenTimeRef = useRef(null);

  useEffect(() => {
    if (selectedDish !== currentDishRef.current) {
      // If a modal was open, calculate duration
      if (currentDishRef.current && modalOpenTimeRef.current) {
        const durationSecs = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000);
        // Track only if engagement > 2s
        if (durationSecs >= 2 && restaurant) {
          analyticsService.trackDishView(currentDishRef.current.id, restaurant.id, durationSecs);
        }
      }
      currentDishRef.current = selectedDish;
      modalOpenTimeRef.current = selectedDish ? Date.now() : null;
    }

    // Preload AR asset if available
    if (selectedDish && selectedDish.ar_enabled && selectedDish.ar_image_url) {
      const img = new Image();
      img.src = getImageUrl(selectedDish.ar_image_url);
    }
  }, [selectedDish, restaurant]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const restRes = await api.get(`/restaurants/slug/${slug}`);
        setRestaurant(restRes.data);
        
        const dishesRes = await api.get(`/dishes/restaurant/${restRes.data.id}`);
        const availableDishes = dishesRes.data.filter(d => d.is_available);
        setDishes(availableDishes);
        
        const uniqueCategories = ['All', ...new Set(availableDishes.map(d => d.ai_category || d.category))];
        setCategories(uniqueCategories);

        // Analytics: Track Session
        analyticsService.trackSession(restRes.data.id);
        
        // Analytics: Fetch Trending Dishes
        try {
          const trending = await analyticsService.getTrendingDishes(restRes.data.id);
          setTrendingDishes(trending);
        } catch (e) {
          console.warn("Could not load trending dishes");
        }
      } catch (err) {
        setError('Restaurant not found or menu is unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [slug]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (selectedDish) {
        setLoadingReviews(true);

        
        try {
          const res = await api.get(`/reviews/dish/${selectedDish.id}`);
          setDishReviews(res.data);
        } catch (err) {
          console.error("Failed to load reviews");
        } finally {
          setLoadingReviews(false);
        }
      } else {
        setDishReviews([]);
      }
    };
    fetchReviews();
  }, [selectedDish]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        dish_id: selectedDish.id,
        rating: ratingInput,
        review: reviewInput
      });
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
      
      const newReviewObj = {
        id: Date.now(),
        dish_id: selectedDish.id,
        rating: ratingInput,
        review: reviewInput,
        created_at: new Date().toISOString()
      };
      setDishReviews([newReviewObj, ...dishReviews]);
      
      alert('Review submitted successfully!');
      setReviewInput('');
      setRatingInput(5);
    } catch (err) {
      alert('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesCategory = activeCategory === 'All' || (dish.ai_category || dish.category) === activeCategory;
      if (!matchesCategory) return false;

      if (!debouncedSearch) return true;

      const query = debouncedSearch.toLowerCase();
      const searchableText = [
        dish.name,
        dish.short_description,
        dish.description,
        dish.ai_description,
        dish.ingredients,
        dish.ai_category,
        dish.category
      ].join(' ').toLowerCase();

      let tagsStr = '';
      if (dish.taste_tags) {
        try {
          const parsed = typeof dish.taste_tags === 'string' ? JSON.parse(dish.taste_tags) : dish.taste_tags;
          tagsStr = Array.isArray(parsed) ? parsed.join(' ').toLowerCase() : '';
        } catch (e) { }
      }

      return searchableText.includes(query) || tagsStr.includes(query);
    });
  }, [dishes, activeCategory, debouncedSearch]);

  // Analytics: Track Search
  useEffect(() => {
    if (debouncedSearch && restaurant) {
      analyticsService.trackSearch(restaurant.id, debouncedSearch, filteredDishes.length);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommendedDishes = useMemo(() => {
    if (debouncedSearch) return [];
    // Rule-based Recommendation: High rating + many reviews, or featured
    return [...dishes]
      .filter(d => (parseFloat(d.average_rating) >= 4.5 && d.total_reviews >= 2) || d.is_featured)
      .sort((a, b) => b.total_reviews - a.total_reviews)
      .slice(0, 6);
  }, [dishes, debouncedSearch]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center' }}><Loader /></div>;
  if (error) return <div className="menu-error"><h2>{error}</h2></div>;

  const renderTasteTags = (dish) => {
    if (!dish.taste_tags) return null;
    let tags = [];
    try {
      tags = typeof dish.taste_tags === 'string' ? JSON.parse(dish.taste_tags) : dish.taste_tags;
    } catch (e) { return null; }
    if (!Array.isArray(tags) || tags.length === 0) return null;
    
    return (
      <div className="dish-taste-tags scroll-hide">
        {tags.map((tag, i) => <span key={i} className="taste-tag">{tag}</span>)}
      </div>
    );
  };

  const getBestImage = (dish) => {
    if (dish.ai_enhanced_image) return getImageUrl(dish.ai_enhanced_image);
    if (dish.image_url) return getImageUrl(dish.image_url);
    return null;
  };

  const getBestThumbnail = (dish) => {
    if (dish.ai_enhanced_image) return getImageUrl(dish.ai_enhanced_image);
    if (dish.thumbnail_url) return getImageUrl(dish.thumbnail_url);
    return null;
  };

  return (
    <div className="public-menu-container">
      {/* Banner */}
      <div className="menu-banner" style={{ backgroundImage: `url(${restaurant.banner ? getImageUrl(restaurant.banner) : 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop'})` }}>
        <div className="menu-banner-overlay"></div>
      </div>
      
      <div className="menu-header container">
        <div className="menu-logo">
          {restaurant.logo ? (
            <img src={getImageUrl(restaurant.logo)} alt={restaurant.restaurant_name} />
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

      {/* Sticky Top Bar (Search + Categories) */}
      <div className="menu-sticky-wrapper">
        <div className="container">
          <div className="search-bar-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search dishes, ingredients, tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="menu-categories scroll-hide container">
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

      <div className="container menu-content-section">
        
        {/* Trending Section (Analytics Based) */}
        {trendingDishes.length > 0 && activeCategory === 'All' && !searchQuery && (
          <div className="recommendation-section">
            <div className="section-header-ai">
              <h2 className="section-title mb-0" style={{ borderBottom: 'none', paddingBottom: 0 }}>Trending Now</h2>
              <span className="ai-badge" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}><Flame size={14} /> Hot Choices</span>
            </div>
            
            <div className="recommendation-row scroll-hide">
              {trendingDishes.map(dish => (
                <div key={dish.id} className="rec-card" onClick={() => setSelectedDish(dish)}>
                  <div className="rec-img">
                    {getBestThumbnail(dish) && <img src={getBestThumbnail(dish)} alt={dish.name} />}
                    {dish.is_featured && <div className="featured-badge">Featured</div>}
                  </div>
                  <div className="rec-content">
                    <h3 className="rec-title">{dish.name}</h3>
                    <div className="rec-meta">
                      <span className="dish-price">₹{dish.price}</span>
                      {dish.average_rating > 0 && (
                        <div className="dish-rating">
                          <Star size={12} fill="#f59e0b" color="#f59e0b" />
                          <span>{parseFloat(dish.average_rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations Section */}
        {recommendedDishes.length > 0 && activeCategory === 'All' && !searchQuery && (
          <div className="recommendation-section">
            <div className="section-header-ai">
              <h2 className="section-title mb-0" style={{ borderBottom: 'none', paddingBottom: 0 }}>Most Loved</h2>
              <span className="ai-badge"><Sparkles size={14} /> Popular Picks</span>
            </div>
            
            <div className="recommendation-row scroll-hide">
              {recommendedDishes.map(dish => (
                <div key={dish.id} className="rec-card" onClick={() => setSelectedDish(dish)}>
                  <div className="rec-img">
                    {getBestThumbnail(dish) && <img src={getBestThumbnail(dish)} alt={dish.name} />}
                    {dish.is_featured && <div className="featured-badge">Featured</div>}
                  </div>
                  <div className="rec-content">
                    <h3 className="rec-title">{dish.name}</h3>
                    <div className="rec-meta">
                      <span className="dish-price">₹{dish.price}</span>
                      {dish.average_rating > 0 && (
                        <div className="dish-rating">
                          <Star size={12} fill="#f59e0b" color="#f59e0b" />
                          <span>{parseFloat(dish.average_rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Dishes Grid */}
        <div className="all-dishes-section">
          <h2 className="section-title">
            {searchQuery ? 'Search Results' : activeCategory}
          </h2>
          
          {filteredDishes.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '3rem 0' }}>
              <p>No dishes found matching your criteria.</p>
            </div>
          ) : (
            <div className="dish-list-grid">
              {filteredDishes.map(dish => (
                <div key={dish.id} className="dish-list-item" onClick={() => setSelectedDish(dish)}>
                  <div className="dish-list-content">
                    <div className="dish-list-header">
                      <h3>{dish.name}</h3>
                      <span className="dish-price">₹{dish.price}</span>
                    </div>
                    {/* Prefer AI Description if it exists */}
                    <p className="dish-list-desc">{dish.ai_description || dish.description || dish.short_description}</p>
                    
                    {renderTasteTags(dish)}

                    <div className="dish-list-footer mt-2">
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
                  {getBestThumbnail(dish) && (
                    <div className="dish-list-img">
                      <img src={getBestThumbnail(dish)} alt={dish.name} loading="lazy" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dish Details Modal */}
      <Modal isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} title={selectedDish?.name}>
        {selectedDish && (
          <div className="dish-modal-content fade-in">
            {getBestImage(selectedDish) && (
              <div className="dish-modal-img">
                <img src={getBestImage(selectedDish)} alt={selectedDish.name} />
              </div>
            )}
            
            <div className="dish-modal-header mt-4">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDish.name}</h2>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{selectedDish.price}</span>
            </div>
            
            {selectedDish.average_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Star size={18} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontWeight: '600' }}>{parseFloat(selectedDish.average_rating).toFixed(1)}</span>
                <span style={{ color: 'var(--text-muted)' }}>({selectedDish.total_reviews} reviews)</span>
              </div>
            )}

            <div style={{ margin: '1rem 0' }}>
               {renderTasteTags(selectedDish)}
            </div>

            <p style={{ marginTop: '1rem', color: 'var(--text-main)', lineHeight: '1.6', fontSize: '1.05rem' }}>
              {selectedDish.ai_description || selectedDish.description || selectedDish.short_description}
            </p>

            {selectedDish.ar_enabled && selectedDish.ar_image_url ? (
              <Button 
                onClick={() => {
                  setIsARViewerOpen(true);
                  // Basic analytics for AR
                  if (restaurant) {
                    analyticsService.trackEvent?.('ar_open', { dishId: selectedDish.id, restaurantId: restaurant.id });
                  }
                }}
                style={{ width: '100%', marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#0f172a' }}
              >
                <Camera size={18} />
                View in AR
              </Button>
            ) : (
              <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                <Camera size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                AR Preview Coming Soon
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.5rem', padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
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

            {/* Display Customer Reviews */}
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Customer Reviews</h4>
              {loadingReviews ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading reviews...</p>
              ) : dishReviews.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.875rem' }}>No reviews yet. Be the first to review!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dishReviews.map(r => (
                    <div key={r.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < r.rating ? "#f59e0b" : "#e2e8f0"} color={i < r.rating ? "#f59e0b" : "#e2e8f0"} />
                        ))}
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {r.review && <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5' }}>"{r.review}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Review Section */}
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

      {isARViewerOpen && selectedDish && (
        <ARViewer 
          dish={selectedDish} 
          restaurantId={restaurant.id} 
          onClose={() => setIsARViewerOpen(false)} 
        />
      )}
    </div>
  );
};

export default PublicMenu;

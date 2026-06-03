import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Star, Clock, Flame, Info, Search, Sparkles, Camera, ShoppingBag, Plus, Minus, X,
  UtensilsCrossed, MapPin, Phone, ScanLine, Layers, Menu, Home, User, Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import api, { getImageUrl } from '../services/api';
import analyticsService from '../services/analyticsService';

import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { toMoneyNumber, formatRupee, lineTotal, sumOrderItems } from '../utils/money';
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
  const [searchParams] = useSearchParams();
  const isDebugMode = searchParams.get('debug') === '1';
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDropReviewOpen, setIsDropReviewOpen] = useState(false);
  const [isARViewerOpen, setIsARViewerOpen] = useState(false);
  const [arProgress, setArProgress] = useState(0);
  const [arLoading, setArLoading] = useState(false);
  const [arError, setArError] = useState(false);
  const isLowEndDevice = navigator.deviceMemory <= 4;
  const [hoveredStar, setHoveredStar] = useState(0);
  const modelViewerRef = useRef(null);
  const [isArSessionActive, setIsArSessionActive] = useState(false);

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;
    const onArStatus = (event) => {
      if (event.detail.status === 'session-started') {
        setIsArSessionActive(true);
      } else if (event.detail.status === 'not-presenting') {
        setIsArSessionActive(false);
      }
    };
    viewer.addEventListener('ar-status', onArStatus);
    return () => viewer.removeEventListener('ar-status', onArStatus);
  }, [isARViewerOpen, selectedDish]);

  
  const [dishSuggestions, setDishSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addingSuggestionId, setAddingSuggestionId] = useState(null);

  // --- ORDERING STATE ---
  const [tableBasket, setTableBasket] = useState([]);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Quick Order State (when clicking 'Order Now' on a single dish)
  const [quickOrderItems, setQuickOrderItems] = useState(null);

  // Dish Modal Ordering Options
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderPlateType, setOrderPlateType] = useState('full');
  const [orderSpecialInstructions, setOrderSpecialInstructions] = useState('');

  // Checkout State
  const [checkoutTableNumber, setCheckoutTableNumber] = useState('');
  const [checkoutMobileNumber, setCheckoutMobileNumber] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addedDishId, setAddedDishId] = useState(null);
  const [mobileNav, setMobileNav] = useState('home');
  const searchSectionRef = useRef(null);
  const heroRef = useRef(null);

  // AR Timeout Logic
  useEffect(() => {
    let timeoutId;
    if (isARViewerOpen && arLoading) {
      timeoutId = setTimeout(() => {
        setArError(true);
        setArLoading(false);
      }, 15000);
    }
    return () => clearTimeout(timeoutId);
  }, [isARViewerOpen, arLoading]);

  // Reset ordering options when modal opens
  useEffect(() => {
    if (selectedDish) {
      setOrderQuantity(1);
      setOrderPlateType(selectedDish.has_full_plate ? 'full' : 'half');
      setOrderSpecialInstructions('');
    }
  }, [selectedDish]);

  // Analytics: Track modal duration
  const currentDishRef = useRef(null);
  const modalOpenTimeRef = useRef(null);

  useEffect(() => {
    if (selectedDish !== currentDishRef.current) {
      if (currentDishRef.current && modalOpenTimeRef.current) {
        const durationSecs = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000);
        if (durationSecs >= 2 && restaurant) {
          analyticsService.trackDishView(currentDishRef.current.id, restaurant.id, durationSecs);
        }
      }
      currentDishRef.current = selectedDish;
      modalOpenTimeRef.current = selectedDish ? Date.now() : null;
    }

    if (selectedDish && selectedDish.ar_enabled && selectedDish.ar_image_url) {
      const img = new Image();
      img.src = getImageUrl(selectedDish.ar_image_url);
    }
  }, [selectedDish, restaurant]);

  useEffect(() => {
    const onScroll = () => {
      const header = document.getElementById('pm-m-header');
      if (header) {
        header.classList.toggle('is-scrolled', window.scrollY > 50);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const restRes = await api.get(`/restaurants/slug/${slug}?t=${Date.now()}`);
        setRestaurant(restRes.data);
        
        const dishesRes = await api.get(`/dishes/restaurant/${restRes.data.id}?t=${Date.now()}`);
        
        // Failsafe: Ensure ar_model exists even if backend is running old code or query failed
        const safeDishes = dishesRes.data.map(dish => {
          // Case 1: ar_model already set correctly by backend
          if (dish.ar_model && dish.ar_model.glb_url) {
            dish.enable_3d_ar = true;
          }
          // Case 2 (legacy): no ar_model but has glb_model_url directly on dish
          else if (!dish.ar_model && dish.glb_model_url) {
            dish.ar_model = { glb_url: dish.glb_model_url, usdz_url: dish.usdz_model_url };
            dish.enable_3d_ar = true;
          }
          // Case 3: nothing — no AR available
          else {
            dish.ar_model = null;
            if (!dish.ar_model_id) dish.enable_3d_ar = false;
          }
          // Always log AR state for debugging
          console.log(`[AR Debug] dish="${dish.name}" id=${dish.id} ar_model_id=${dish.ar_model_id ?? 'null'} enable_3d_ar=${dish.enable_3d_ar} glb_url=${dish.ar_model?.glb_url || 'NULL'}`);
          return dish;
        });


        setDishes(safeDishes);
        
        const uniqueCategories = ['All', ...new Set(safeDishes.map(d => d.ai_category || d.category))];
        setCategories(uniqueCategories);

        analyticsService.trackSession(restRes.data.id);
        
        try {
          const trendingRaw = await analyticsService.getTrendingDishes(restRes.data.id);
          
          // Enrich trending dishes with full ar_model data from the already-loaded safeDishes
          // (trending API may not include the ar_model JOIN — this is the client-side safety net)
          const dishMap = new Map(safeDishes.map(d => [d.id, d]));
          const enrichedTrending = trendingRaw.map(t => {
            const full = dishMap.get(t.id);
            if (full) {
              // Use the fully-joined dish data (has ar_model, enable_3d_ar etc.)
              return { ...full, recent_views: t.recent_views };
            }
            // If not found in map, apply same failsafe as safeDishes
            if (t.ar_model && t.ar_model.glb_url) {
              t.enable_3d_ar = true;
            } else if (!t.ar_model && t.glb_model_url) {
              t.ar_model = { glb_url: t.glb_model_url, usdz_url: t.usdz_model_url };
              t.enable_3d_ar = true;
            }
            return t;
          });
          setTrendingDishes(enrichedTrending);
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

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!selectedDish) {
        setDishSuggestions([]);
        return;
      }
      setLoadingSuggestions(true);
      try {
        const res = await api.get(`/suggestions/dish/${selectedDish.id}`);
        setDishSuggestions(res.data);
      } catch (err) {
        console.error("Failed to load suggestions", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
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
      
      setIsDropReviewOpen(false); // Close drop review modal
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
        dish.name, dish.short_description, dish.description, dish.ai_description,
        dish.ingredients, dish.ai_category, dish.category
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

  useEffect(() => {
    if (debouncedSearch && restaurant) {
      analyticsService.trackSearch(restaurant.id, debouncedSearch, filteredDishes.length);
    }
  }, [debouncedSearch]); 

  const recommendedDishes = useMemo(() => {
    if (debouncedSearch) return [];
    return [...dishes]
      .filter(d => (parseFloat(d.average_rating) >= 4.5 && d.total_reviews >= 2) || d.is_featured)
      .sort((a, b) => b.total_reviews - a.total_reviews)
      .slice(0, 6);
  }, [dishes, debouncedSearch]);

  const trendingForDesktop = useMemo(() => {
    if (debouncedSearch) return [];
    if (trendingDishes.length > 0) return trendingDishes.slice(0, 6);
    return recommendedDishes.slice(0, 6);
  }, [trendingDishes, recommendedDishes, debouncedSearch]);

  const trendingForMobile = useMemo(() => {
    if (debouncedSearch) return [];
    if (trendingDishes.length > 0) return trendingDishes.slice(0, 8);
    return recommendedDishes.slice(0, 8);
  }, [trendingDishes, recommendedDishes, debouncedSearch]);

  const preloadModels = useMemo(() => {
    const urls = new Set();
    trendingDishes.slice(0, 4).forEach(d => {
      if ((d.enable_3d_ar || d.ar_model_id) && d.ar_model?.glb_url) urls.add(d.ar_model.glb_url);
    });
    dishes.slice(0, 6).forEach(d => {
      if ((d.enable_3d_ar || d.ar_model_id) && d.ar_model?.glb_url) urls.add(d.ar_model.glb_url);
    });
    return Array.from(urls).slice(0, 5); // Max 5 models to avoid network congestion
  }, [trendingDishes, dishes]);

  const scrollToMobileSearch = () => {
    setMobileNav('search');
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      const input = document.getElementById('pm-m-search-input');
      input?.focus();
    }, 400);
  };

  // --- ORDERING LOGIC ---
  const handleAddToTable = () => {
    const itemPrice = getDishPrice(selectedDish, orderPlateType);
    const newItem = {
      dish_id: selectedDish.id,
      dish_name: selectedDish.name,
      quantity: orderQuantity,
      plate_type: orderPlateType,
      item_price: itemPrice,
      item_note: orderSpecialInstructions,
      temp_id: Date.now() // for unique key in basket
    };
    setTableBasket([...tableBasket, newItem]);
    setSelectedDish(null);
    alert('Added to Table Order');
  };

  const handleOrderNow = () => {
    const itemPrice = getDishPrice(selectedDish, orderPlateType);
    const newItem = {
      dish_id: selectedDish.id,
      dish_name: selectedDish.name,
      quantity: orderQuantity,
      plate_type: orderPlateType,
      item_price: itemPrice,
      item_note: orderSpecialInstructions
    };
    setQuickOrderItems([newItem]);
    setSelectedDish(null);
    setIsCheckoutOpen(true);
  };

  const handleRemoveFromBasket = (tempId) => {
    setTableBasket(tableBasket.filter(item => item.temp_id !== tempId));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsPlacingOrder(true);
    
    const itemsToOrder = quickOrderItems || tableBasket;

    try {
      await api.post('/orders', {
        restaurant_id: restaurant.id,
        table_number: checkoutTableNumber,
        customer_mobile: checkoutMobileNumber,
        items: itemsToOrder
      });
      
      alert('Order Placed Successfully!');
      setIsCheckoutOpen(false);
      setCheckoutTableNumber('');
      setCheckoutMobileNumber('');
      
      if (!quickOrderItems) {
        setTableBasket([]);
        setIsBasketOpen(false);
      }
      setQuickOrderItems(null);
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };


  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center' }}><Loader /></div>;
  if (error) return <div className="menu-error"><h2>{error}</h2></div>;

  const renderTasteTags = (dish) => {
    if (!dish.taste_tags) return null;
    let tags = [];
    try { tags = typeof dish.taste_tags === 'string' ? JSON.parse(dish.taste_tags) : dish.taste_tags; } catch (e) { return null; }
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
    if (dish.image_url) return getImageUrl(dish.image_url);
    return null;
  };

  const getDefaultPlateType = (dish) => {
    if (dish.has_half_plate && !dish.has_full_plate) return 'half';
    return 'full';
  };

  const getDishPrice = (dish, plateType = 'full') => {
    const base = toMoneyNumber(dish.price);
    if (plateType === 'half') {
      const half = toMoneyNumber(dish.half_plate_price);
      return half > 0 ? half : toMoneyNumber(base / 2);
    }
    const full = toMoneyNumber(dish.full_plate_price);
    if (full <= 0) return base;
    if (base > 0 && Math.abs(full - base) <= 0.05) return base;
    return full;
  };

  const getDisplayPrice = (dish, plateType) =>
    formatRupee(getDishPrice(dish, plateType ?? getDefaultPlateType(dish)));

  const handleQuickAdd = (dish, e) => {
    e?.stopPropagation();
    const plateType = getDefaultPlateType(dish);
    setTableBasket((prev) => [
      ...prev,
      {
        dish_id: dish.id,
        dish_name: dish.name,
        quantity: 1,
        plate_type: plateType,
        item_price: getDishPrice(dish, plateType),
        item_note: '',
        temp_id: Date.now(),
      },
    ]);
    setAddedDishId(dish.id);
    setTimeout(() => setAddedDishId(null), 1500);
  };

  const handleQuickAR = (dish, e) => {
    e?.stopPropagation();
    if ((dish.enable_3d_ar || dish.ar_model_id) && dish.ar_model?.glb_url) {
      setSelectedDish(dish);
      setArProgress(0);
      setArError(false);
      setArLoading(true);
      setIsARViewerOpen(true);
      if (restaurant) {
        analyticsService.trackEvent?.('ar_open', { dishId: dish.id, restaurantId: restaurant.id });
      }
    } else {
      alert('No 3D Model Available for this dish.');
    }
  };

  const getTrendingBadge = (dish, index) => {
    if (dish.is_featured) return "Chef's Special";
    if (index === 0) return 'Hot Choice';
    return 'Trending';
  };

  const renderMobileTrendCard = (dish, index) => (
    <article
      key={`m-trend-${dish.id}`}
      className="pm-m-trend-card"
      onClick={() => setSelectedDish(dish)}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedDish(dish)}
      role="button"
      tabIndex={0}
    >
      <div className="pm-m-trend-img">
        {getBestThumbnail(dish) ? (
          <img src={getBestThumbnail(dish)} alt={dish.name} loading="lazy" />
        ) : (
          <div className="pm-m-img-ph">No image</div>
        )}
        <span className="pm-m-trend-badge">{getTrendingBadge(dish, index)}</span>
      </div>
      <div className="pm-m-trend-body">
        <div className="pm-m-trend-head">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {dish.name}
            {!dish.is_available && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.25rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem' }}>Unavailable</span>}
          </h4>
          <span className="pm-m-price">₹{getDisplayPrice(dish)}</span>
        </div>
        <p>{dish.ai_description || dish.short_description || dish.description || ''}</p>
        <div className="pm-m-dish-actions" style={{ marginTop: '0.5rem' }}>
          {(dish.enable_3d_ar || dish.ar_model_id) && dish.ar_model?.glb_url && (
            <button type="button" className="pm-m-ar-btn" onClick={(e) => handleQuickAR(dish, e)}>
              <ScanLine size={16} />
              3D Dish Experience
            </button>
          )}
        </div>
      </div>
    </article>
  );

  const renderMobileDishRow = (dish) => (
    <article key={`m-dish-${dish.id}`} className="pm-m-dish-row" style={{ opacity: dish.is_available ? 1 : 0.6 }}>
      <button type="button" className="pm-m-dish-thumb" onClick={() => setSelectedDish(dish)}>
        {getBestThumbnail(dish) ? (
          <img src={getBestThumbnail(dish)} alt={dish.name} loading="lazy" />
        ) : (
          <div className="pm-m-img-ph">No image</div>
        )}
      </button>
      <div className="pm-m-dish-info">
        <div className="pm-m-dish-head">
          <button type="button" className="pm-m-dish-name" onClick={() => setSelectedDish(dish)}>
            {dish.name}
          </button>
          <span className="pm-m-price">₹{getDisplayPrice(dish)}</span>
        </div>
        <p className="pm-m-dish-desc">
          {dish.ai_description || dish.short_description || dish.description || 'Delicious dish from our kitchen.'}
        </p>
        <div className="pm-m-dish-actions">
          {(dish.enable_3d_ar || dish.ar_model_id) && dish.ar_model?.glb_url && (
            <button type="button" className="pm-m-ar-btn" onClick={(e) => handleQuickAR(dish, e)}>
              <ScanLine size={16} />
              3D Dish Experience
            </button>
          )}
          {isDebugMode && (
            <div style={{
              fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '0.25rem',
              backgroundColor: dish.ar_model?.glb_url ? '#dcfce7' : '#fee2e2',
              color: dish.ar_model?.glb_url ? '#166534' : '#991b1b',
              fontWeight: 700, fontFamily: 'monospace'
            }}
              onClick={() => { console.log('[AR Debug Full]', dish); alert(JSON.stringify({id: dish.id, name: dish.name, ar_model_id: dish.ar_model_id, enable_3d_ar: dish.enable_3d_ar, ar_model_glb: dish.ar_model?.glb_url || null}, null, 2)); }}
            >
              {dish.ar_model?.glb_url ? `✅ AR id=${dish.ar_model_id}` : `❌ NO AR (id=${dish.ar_model_id || 'null'})`}
            </div>
          )}

          {dish.is_available ? (
            <button
              type="button"
              className={`pm-m-add-btn ${addedDishId === dish.id ? 'is-added' : ''}`}
              onClick={(e) => handleQuickAdd(dish, e)}
            >
              {addedDishId === dish.id ? 'Added!' : 'Add to Order'}
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444' }}>Currently Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );

  const basketTotal = sumOrderItems(tableBasket);

  const heroBannerUrl = restaurant.banner
    ? getImageUrl(restaurant.banner)
    : 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1934&auto=format&fit=crop';

  const heroSubtitle = [
    restaurant.cuisine_type || 'Fine Dining',
    restaurant.address ? restaurant.address.split(',')[0] : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const renderDesktopTrendLight = (dish, index) => (
    <article
      key={`dt-light-${dish.id}`}
      className="pm-d-trend-light"
      onClick={() => setSelectedDish(dish)}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedDish(dish)}
      role="button"
      tabIndex={0}
    >
      <div className="pm-d-trend-light-img">
        {getBestThumbnail(dish) ? (
          <img src={getBestThumbnail(dish)} alt={dish.name} loading="lazy" />
        ) : (
          <div className="pm-d-img-ph">No image</div>
        )}
        {index === 0 && <span className="pm-d-hot-badge">Hot Choices</span>}
      </div>
      <div className="pm-d-trend-light-body">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {dish.name}
          {!dish.is_available && <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.25rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.25rem' }}>Unavailable</span>}
        </h4>
        <p className="pm-d-trend-price">₹{getDisplayPrice(dish)}</p>
        <p className="pm-d-trend-desc">
          {dish.ai_description || dish.short_description || dish.description || ''}
        </p>
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
          {(dish.enable_3d_ar || dish.ar_model_id) && dish.ar_model?.glb_url && (
            <button type="button" className="pm-d-ar-btn" onClick={(e) => handleQuickAR(dish, e)} style={{ padding: '0.4rem 0.5rem', width: '100%', fontSize: '0.75rem', justifyContent: 'center' }}>
              <ScanLine size={14} />
              3D Dish Experience
            </button>
          )}
        </div>
      </div>
    </article>
  );

  const renderDesktopDishCard = (dish) => (
    <article key={`d-dish-${dish.id}`} className="pm-d-dish-card" style={{ opacity: dish.is_available ? 1 : 0.6 }}>
      <button type="button" className="pm-d-dish-img" onClick={() => setSelectedDish(dish)}>
        {getBestThumbnail(dish) ? (
          <img src={getBestThumbnail(dish)} alt={dish.name} loading="lazy" />
        ) : (
          <div className="pm-d-img-ph">No image</div>
        )}
      </button>
      <div className="pm-d-dish-body">
        <button type="button" className="pm-d-dish-title" onClick={() => setSelectedDish(dish)}>
          {dish.name}
        </button>
        <p className="pm-d-dish-desc">
          {dish.ai_description || dish.short_description || dish.description || 'Delicious dish from our kitchen.'}
        </p>
        <div className="pm-d-dish-meta">
          <span className="pm-d-dish-price">₹{getDisplayPrice(dish)}</span>
          {(dish.enable_3d_ar || dish.ar_model_id) && dish.ar_model?.glb_url && (
            <button type="button" className="pm-d-ar-btn" onClick={(e) => handleQuickAR(dish, e)}>
              <ScanLine size={14} />
              3D Dish Experience
            </button>
          )}
        </div>
        <div className="pm-d-dish-actions">
          <button type="button" className="pm-d-stack-btn" onClick={() => setSelectedDish(dish)} aria-label="Details">
            <Layers size={18} />
          </button>
          {dish.is_available ? (
            <button
              type="button"
              className={`pm-d-add-btn ${addedDishId === dish.id ? 'is-added' : ''}`}
              onClick={(e) => handleQuickAdd(dish, e)}
            >
              {addedDishId === dish.id ? 'Added!' : 'Add to Order'}
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444' }}>Currently Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="public-menu-container">
      {/* Background Preload for AR Models */}
      {preloadModels.map(url => (
        <link key={`preload-${url}`} rel="preload" href={url} as="fetch" crossOrigin="anonymous" />
      ))}
      {/* ========== DEBUG PANEL (only when ?debug=1) ========== */}
      {isDebugMode && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999, backgroundColor: '#0f172a', color: '#fff', padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: '40vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#fbbf24' }}>
            🔍 AR DEBUG MODE | Restaurant: {restaurant?.id} | Dishes: {dishes.length} | With AR: {dishes.filter(d => d.ar_model?.glb_url).length}
          </div>
          {dishes.map(d => (
            <div key={d.id} style={{ marginBottom: '0.25rem', color: d.ar_model?.glb_url ? '#4ade80' : '#f87171' }}>
              {d.ar_model?.glb_url ? '✅' : '❌'} [{d.id}] "{d.name}" | ar_model_id={d.ar_model_id ?? 'null'} | enable_3d_ar={String(d.enable_3d_ar)} | glb_url={d.ar_model?.glb_url ? d.ar_model.glb_url.slice(0,50)+'...' : 'NULL'}
            </div>
          ))}
        </div>
      )}
      {/* ========== MOBILE — premium reference layout ========== */}
      <div className="pm-view-mobile">

        <header className="pm-m-header" id="pm-m-header">
          <button
            type="button"
            className="pm-m-icon-btn"
            aria-label="Restaurant info"
            onClick={() => heroRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Menu size={22} />
          </button>
          <h1 className="pm-m-logo">Rastro</h1>
          <button type="button" className="pm-m-icon-btn" aria-label="Search" onClick={scrollToMobileSearch}>
            <Search size={22} />
          </button>
        </header>

        <main className="pm-m-main">
          <section className="pm-m-hero" ref={heroRef}>
            <div
              className="pm-m-hero-bg"
              style={{ backgroundImage: `url(${heroBannerUrl})` }}
            />
            <div className="pm-m-hero-overlay" />
            <div className="pm-m-hero-content">
              <span className="pm-m-open-badge">Open Now</span>
              <h2>{restaurant.restaurant_name}</h2>
              <p>{heroSubtitle || 'Authentic flavors • Premium dining'}</p>
            </div>
          </section>

          <section className="pm-m-details">
            <div className="pm-m-details-scroll scroll-hide">
              <div className="pm-m-detail-item">
                <UtensilsCrossed size={20} />
                <span>{restaurant.cuisine_type || 'Restaurant'}</span>
              </div>
              {restaurant.address && (
                <div className="pm-m-detail-item">
                  <MapPin size={20} />
                  <span>{restaurant.address}</span>
                </div>
              )}
              {restaurant.phone && (
                <a className="pm-m-detail-item" href={`tel:${restaurant.phone}`}>
                  <Phone size={20} />
                  <span>Contact Us</span>
                </a>
              )}
            </div>
          </section>

          <section className="pm-m-sticky-tools" ref={searchSectionRef} id="pm-m-search">
            <div className="pm-m-search-wrap">
              <Search size={20} className="pm-m-search-icon" aria-hidden />
              <input
                id="pm-m-search-input"
                type="search"
                className="pm-m-search-input"
                placeholder="Search for dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setMobileNav('search')}
              />
            </div>
            <div className="pm-m-cats scroll-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pm-m-cat ${activeCategory === cat ? 'is-active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {trendingForMobile.length > 0 && activeCategory === 'All' && !debouncedSearch && (
            <section className="pm-m-section">
              <div className="pm-m-section-head">
                <h3>Trending Now</h3>
                <button type="button" className="pm-m-link" onClick={() => setActiveCategory('All')}>
                  View All
                </button>
              </div>
              <div className="pm-m-trend-row scroll-hide">
                {trendingForMobile.map((dish, i) => renderMobileTrendCard(dish, i))}
              </div>
            </section>
          )}

          <section className="pm-m-section pm-m-all">
            <h3 className="pm-m-section-title">
              {debouncedSearch ? 'Search Results' : 'All Dishes'}
            </h3>
            {filteredDishes.length === 0 ? (
              <p className="pm-m-empty">No dishes found matching your criteria.</p>
            ) : (
              <div className="pm-m-dish-list">
                {filteredDishes.map((dish) => renderMobileDishRow(dish))}
              </div>
            )}
          </section>
        </main>

        <nav className="pm-m-bottom-nav" aria-label="Menu navigation">
          <button
            type="button"
            className={`pm-m-nav-item ${mobileNav === 'home' ? 'is-active' : ''}`}
            onClick={() => {
              setMobileNav('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Home size={22} strokeWidth={mobileNav === 'home' ? 2.5 : 2} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`pm-m-nav-item ${mobileNav === 'search' ? 'is-active' : ''}`}
            onClick={scrollToMobileSearch}
          >
            <Search size={22} strokeWidth={mobileNav === 'search' ? 2.5 : 2} />
            <span>Search</span>
          </button>
          <button
            type="button"
            className={`pm-m-nav-item ${mobileNav === 'orders' ? 'is-active' : ''}`}
            onClick={() => {
              setMobileNav('orders');
              setIsBasketOpen(true);
            }}
          >
            <span className="pm-m-nav-icon-wrap">
              <ShoppingBag size={22} strokeWidth={mobileNav === 'orders' ? 2.5 : 2} />
              {tableBasket.length > 0 && (
                <span className="pm-m-nav-badge">{tableBasket.length}</span>
              )}
            </span>
            <span>Orders</span>
          </button>
         
        </nav>
      </div>

      {/* ========== DESKTOP (reference layout, no navbar) ========== */}
      <div className="pm-view-desktop">
        <div className="pm-d-page">
          <header className="pm-d-brand-header">
            <h1 className="pm-d-brand">Rastro</h1>
            <div className="pm-d-meta">
              <span className="pm-d-meta-item">
                <UtensilsCrossed size={16} />
                {restaurant.cuisine_type || 'Restaurant'}
              </span>
              {restaurant.address && (
                <span className="pm-d-meta-item">
                  <MapPin size={16} />
                  {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <span className="pm-d-meta-item">
                  <Phone size={16} />
                  <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>
                </span>
              )}
            </div>
          </header>

          <div className="pm-d-toolbar">
            <div className="pm-d-search">
              <input
                type="text"
                className="pm-d-search-input"
                placeholder="Search dishes, ingredients, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={20} className="pm-d-search-icon" aria-hidden />
            </div>
            <div className="pm-d-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pm-d-cat ${activeCategory === cat ? 'is-active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {trendingForDesktop.length > 0 && activeCategory === 'All' && !searchQuery && (
            <section className="pm-d-section">
              <h2 className="pm-d-section-title">Trending Now</h2>
              <div className="pm-d-trend-light-row">
                {trendingForDesktop.slice(0, 3).map((dish, i) => renderDesktopTrendLight(dish, i))}
              </div>
              <div className="pm-d-dots" aria-hidden>
                <span className="is-active" />
                <span />
                <span />
              </div>
            </section>
          )}

          <section className="pm-d-section pm-d-dishes-block">
            <h2 className="pm-d-section-title">
              {searchQuery ? 'Search Results' : 'All Dishes'}
            </h2>
            {filteredDishes.length === 0 ? (
              <p className="pm-d-empty">No dishes found matching your criteria.</p>
            ) : (
              <div className="pm-d-dish-grid">
                {filteredDishes.map((dish) => renderDesktopDishCard(dish))}
              </div>
            )}
          </section>
        </div>

        {tableBasket.length > 0 && (
          <button
            type="button"
            className="pm-d-floating-cart"
            onClick={() => setIsBasketOpen(true)}
          >
            <ShoppingBag size={20} />
            View Table Order ({tableBasket.length})
          </button>
        )}
      </div>

      {/* Table Basket Drawer/Modal */}
      <Modal isOpen={isBasketOpen} onClose={() => setIsBasketOpen(false)} title="Your Table Order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tableBasket.length === 0 ? (
            <p className="text-center text-muted py-4">Your table order is empty.</p>
          ) : (
            <>
              {tableBasket.map(item => (
                <div key={item.temp_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0' }}>{item.quantity}x {item.dish_name}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {item.plate_type === 'half' ? 'Half Plate' : 'Full Plate'} • ₹{formatRupee(item.item_price)}
                    </p>
                    {item.item_note && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', fontStyle: 'italic', color: '#64748b' }}>Note: {item.item_note}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 'bold' }}>₹{formatRupee(lineTotal(item.item_price, item.quantity))}</span>
                    <button onClick={() => handleRemoveFromBasket(item.temp_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Total</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{formatRupee(basketTotal)}</span>
              </div>
              
              <Button onClick={() => { setIsBasketOpen(false); setQuickOrderItems(null); setIsCheckoutOpen(true); }} style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                Place Full Order
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Checkout Flow Modal */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Complete Your Order">
        <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Please enter your table details to confirm the order.</p>
          
          <div className="form-group">
            <label className="form-label">Table Number*</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. 5" 
              value={checkoutTableNumber} 
              onChange={e => setCheckoutTableNumber(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Mobile Number*</label>
            <input 
              type="tel" 
              className="form-control" 
              placeholder="Enter mobile number" 
              value={checkoutMobileNumber} 
              onChange={e => setCheckoutMobileNumber(e.target.value)} 
              required 
            />
          </div>
          
          <Button type="submit" loading={isPlacingOrder} style={{ width: '100%', marginTop: '1rem' }}>
            Confirm & Place Order
          </Button>
        </form>
      </Modal>

      {/* Dish Details Modal */}
      <Modal isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} title={selectedDish?.name}>
        {selectedDish && (() => {
          console.log("PUBLIC MENU DISH", selectedDish);
          console.log("AR MODEL", selectedDish.ar_model);
          return (
          <div className="dish-modal-content fade-in">
            {getBestImage(selectedDish) && (
              <div className="dish-modal-img">
                <img src={getBestImage(selectedDish)} alt={selectedDish.name} />
              </div>
            )}
            
            <div className="dish-modal-header mt-4">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDish.name}</h2>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                 ₹{getDisplayPrice(selectedDish, orderPlateType)}
              </span>
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
            
            {/* --- ORDERING CONFIGURATION --- */}
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
               
               {/* Plate Type Selector */}
               {(selectedDish.has_full_plate && selectedDish.has_half_plate) && (
                 <div style={{ marginBottom: '1.5rem' }}>
                   <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Plate Type</label>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                     <button 
                       type="button"
                       onClick={() => setOrderPlateType('half')}
                       style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: `2px solid ${orderPlateType === 'half' ? 'var(--primary-color)' : '#cbd5e1'}`, backgroundColor: orderPlateType === 'half' ? '#eff6ff' : 'white', fontWeight: orderPlateType === 'half' ? 'bold' : 'normal' }}
                     >
                       Half (₹{getDisplayPrice(selectedDish, 'half')})
                     </button>
                     <button 
                       type="button"
                       onClick={() => setOrderPlateType('full')}
                       style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: `2px solid ${orderPlateType === 'full' ? 'var(--primary-color)' : '#cbd5e1'}`, backgroundColor: orderPlateType === 'full' ? '#eff6ff' : 'white', fontWeight: orderPlateType === 'full' ? 'bold' : 'normal' }}
                     >
                       Full (₹{getDisplayPrice(selectedDish, 'full')})
                     </button>
                   </div>
                 </div>
               )}

               {/* Quantity Selector */}
               <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Quantity</label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <button 
                     type="button"
                     onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                     style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', cursor: 'pointer' }}
                   >
                     <Minus size={16} />
                   </button>
                   <span style={{ fontSize: '1.25rem', fontWeight: 'bold', width: '30px', textAlign: 'center' }}>{orderQuantity}</span>
                   <button 
                     type="button"
                     onClick={() => setOrderQuantity(orderQuantity + 1)}
                     style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', cursor: 'pointer' }}
                   >
                     <Plus size={16} />
                   </button>
                 </div>
               </div>

               {/* Special Instructions */}
               <div>
                 <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Special Instructions</label>
                 <textarea 
                   placeholder="e.g. Less spicy, no onion, extra butter"
                   value={orderSpecialInstructions}
                   onChange={(e) => setOrderSpecialInstructions(e.target.value)}
                   style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', resize: 'vertical', minHeight: '60px' }}
                 ></textarea>
               </div>
               
               {/* Order Action Buttons */}
               <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                 {selectedDish.is_available ? (
                   <>
                     <Button onClick={handleAddToTable} variant="outline" style={{ flex: 1 }}>
                       Add To Table
                     </Button>
                     <Button onClick={handleOrderNow} style={{ flex: 1 }}>
                       Order Now
                     </Button>
                   </>
                 ) : (
                   <div style={{ width: '100%', padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', textAlign: 'center', borderRadius: '0.5rem', fontWeight: 'bold' }}>
                     Currently Unavailable
                   </div>
                 )}
               </div>
            </div>
            
            {(selectedDish.enable_3d_ar || selectedDish.ar_model_id) && selectedDish.ar_model?.glb_url ? (
              <Button 
                onClick={() => {
                  setIsARViewerOpen(true);
                  if (restaurant) {
                    analyticsService.trackEvent?.('ar_open', { dishId: selectedDish.id, restaurantId: restaurant.id });
                  }
                }}
                style={{ width: '100%', marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', backgroundColor: '#0f172a' }}
              >
                <Camera size={18} />
                View in 3D AR
              </Button>
            ) : (
              <div style={{ marginTop: '1.5rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                <Camera size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                No 3D Model Available
              </div>
            )}

            {/* Model Preloading */}
            {(selectedDish.enable_3d_ar || selectedDish.ar_model_id) && selectedDish.ar_model?.glb_url && (
              <link rel="preload" href={selectedDish.ar_model.glb_url} as="fetch" crossOrigin="anonymous" />
            )}

            {/* Complete Your Meal Section */}
            {(dishSuggestions.length > 0 || loadingSuggestions) && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} className="text-primary" /> Complete Your Meal
                </h3>
                
                {loadingSuggestions ? (
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }} className="scroll-hide">
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ minWidth: '160px', height: '220px', backgroundColor: '#f1f5f9', borderRadius: '0.75rem', animation: 'pulse 2s infinite' }}></div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', margin: '0 -1.5rem', padding: '0 1.5rem 1rem 1.5rem' }} className="scroll-hide pm-pairings-scroll">
                    {dishSuggestions.map(suggestion => (
                      <div key={suggestion.id || suggestion.suggestion_id} style={{ minWidth: '160px', maxWidth: '160px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'transform 0.2s' }} className="pm-pairing-card">
                        <div style={{ height: '120px', backgroundColor: '#f8fafc', position: 'relative' }}>
                          {getBestThumbnail(suggestion) ? (
                            <img src={getBestThumbnail(suggestion)} alt={suggestion.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={32} /></div>
                          )}
                        </div>
                        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.name}</h4>
                          <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: 'auto' }}>₹{getDisplayPrice(suggestion)}</span>
                          
                          <Button 
                            variant="outline" 
                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.875rem', height: 'auto', backgroundColor: addingSuggestionId === (suggestion.id || suggestion.suggestion_id) ? '#16a34a' : 'transparent', color: addingSuggestionId === (suggestion.id || suggestion.suggestion_id) ? 'white' : 'var(--primary-color)', borderColor: addingSuggestionId === (suggestion.id || suggestion.suggestion_id) ? '#16a34a' : 'var(--primary-color)' }}
                            onClick={(e) => {
                               e.stopPropagation();
                               handleQuickAdd(suggestion, null);
                               setAddingSuggestionId(suggestion.id || suggestion.suggestion_id);
                               setTimeout(() => setAddingSuggestionId(null), 1500);
                            }}
                          >
                            {addingSuggestionId === (suggestion.id || suggestion.suggestion_id) ? 'Added!' : 'Quick Add'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

            <div style={{ marginTop: '2rem' }}>
              <Button 
                variant="outline" 
                style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setIsReviewModalOpen(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={18} fill="#f59e0b" color="#f59e0b" />
                  <span style={{ fontWeight: 'bold' }}>See Dish Reviews</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <span>{selectedDish.total_reviews} reviews</span>
                  <span>→</span>
                </div>
              </Button>
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* 3D AR Viewer Modal */}
      {isARViewerOpen && selectedDish && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', backgroundColor: 'black', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>{selectedDish.name} - 3D AR</h3>
            <button onClick={() => setIsARViewerOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
            {arError ? (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#f87171' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Failed to load 3D model.<br/>Please try again.</p>
                <Button onClick={() => { setArError(false); setArLoading(true); }}>Retry</Button>
              </div>
            ) : (
              <model-viewer
                ref={modelViewerRef}
                src={selectedDish.ar_model?.glb_url || undefined}
                ios-src={selectedDish.ar_model?.usdz_url || undefined}
                alt={`A 3D model of ${selectedDish.name}`}
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                ar-placement="floor"
                disable-pan
                disable-zoom
                bounds="tight"
                environment-image="neutral"
                shadow-intensity={isLowEndDevice ? "0.2" : "0.4"}
                shadow-softness={isLowEndDevice ? "0.3" : "1"}
                exposure="0.9"
                loading="eager"
                reveal="auto"
                camera-controls
                auto-rotate="false"
                min-camera-orbit="auto 0deg auto"
                max-camera-orbit="auto 90deg auto"
                interpolation-decay="200"
                orientation={
                  selectedDish.ar_model_id && selectedDish.ar_model 
                    ? `${selectedDish.ar_model.normalized_rotation_x || 0}rad ${selectedDish.ar_model.normalized_rotation_y || 0}rad ${selectedDish.ar_model.normalized_rotation_z || 0}rad`
                    : "0 180deg 0"
                }
                style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#f0f0f0' }}
                onProgress={(e) => {
                  if (e.detail && typeof e.detail.totalProgress === 'number') {
                    setArProgress(Math.round(e.detail.totalProgress * 100));
                  }
                }}
                onError={(e) => {
                  console.error("Model viewer error:", e);
                  setArError(true);
                  setArLoading(false);
                }}
                onLoad={(e) => {
                  setArLoading(false);
                  const viewer = e.target;
                  
                  if (selectedDish.ar_model_id && selectedDish.ar_model) {
                    // Apply persistent library transforms
                    const scaleVal = selectedDish.ar_model.normalized_scale || 1.0;
                    viewer.scale = `${scaleVal} ${scaleVal} ${scaleVal}`;
                    viewer.modelPosition = `0 ${selectedDish.ar_model.normalized_height_offset || 0} 0`;
                  } else {
                    // Automatic Size Normalization
                    const size = viewer.getDimensions();
                    const maxDimension = Math.max(size.x, size.y, size.z);
                    
                    let targetSize = 0.25; // default 25cm
                    const cat = (selectedDish.category || '').toLowerCase();
                    if (cat.includes('burger') || cat.includes('sandwich')) targetSize = 0.15;
                    else if (cat.includes('pizza')) targetSize = 0.35;
                    else if (cat.includes('drink') || cat.includes('beverage')) targetSize = 0.20; // Will scale max dim (usually height) to 20cm

                    const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
                    viewer.scale = `${scale} ${scale} ${scale}`;

                    // Automatic Grounding Correction
                    const center = viewer.getBoundingBoxCenter();
                    const bottomY = center.y - (size.y / 2);
                    viewer.modelPosition = `0 ${-bottomY} 0`;
                  }
                }}
                data-device-memory={navigator.deviceMemory}
              >
                {arLoading && (
                  <div slot="progress-bar" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#16a34a' }}>
                    <Loader />
                    <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Loading 3D Model... {arProgress}%</p>
                  </div>
                )}
                <button slot="ar-button" style={{ position: 'fixed', bottom: 'env(safe-area-inset-bottom, 20px)', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '2rem', fontSize: '1.125rem', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', zIndex: 10 }}>
                  <Sparkles size={20} /> Launch Real AR
                </button>
                {isArSessionActive && (
                  <button 
                    onClick={() => {
                      if (modelViewerRef.current) {
                        modelViewerRef.current.resetCamera();
                      }
                    }}
                    style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(255, 255, 255, 0.8)', color: '#0f172a', border: '1px solid #cbd5e1', padding: '0.5rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 11 }}
                    className="ar-recenter-btn"
                  >
                    Recenter Dish
                  </button>
                )}
              </model-viewer>
            )}
          </div>
        </div>
      )}

      {/* Modern Review Experience Modal */}
      {isReviewModalOpen && selectedDish && (
        <div className="pm-review-modal-overlay fade-in" onClick={() => setIsReviewModalOpen(false)}>
          <div className="pm-review-modal-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="pm-review-header">
              <button className="pm-review-close" onClick={() => setIsReviewModalOpen(false)}><X size={24} /></button>
              <div className="pm-review-dish-info">
                {getBestThumbnail(selectedDish) && (
                  <img src={getBestThumbnail(selectedDish)} alt={selectedDish.name} className="pm-review-dish-img" />
                )}
                <div>
                  <h3 className="pm-review-dish-name">{selectedDish.name}</h3>
                  <div className="pm-review-dish-stats">
                    <span className="pm-review-avg-rating">
                      <Star size={16} fill="#f59e0b" color="#f59e0b" />
                      {parseFloat(selectedDish.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="pm-review-total-count">({selectedDish.total_reviews} reviews)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pm-review-list scroll-hide">
              {loadingReviews ? (
                <div className="pm-review-loading"><Loader /></div>
              ) : dishReviews.length === 0 ? (
                <div className="pm-review-empty fade-in">
                  <div className="pm-review-empty-icon"><Star size={48} color="#cbd5e1" /></div>
                  <h4>No reviews yet</h4>
                  <p>Be the first to share your thoughts on this dish!</p>
                  <button className="pm-review-empty-btn" onClick={() => setIsDropReviewOpen(true)}>Drop a Review</button>
                </div>
              ) : (
                dishReviews.map(r => (
                  <div key={r.id} className="pm-review-card fade-in">
                    <div className="pm-review-card-header">
                      <div className="pm-review-avatar">
                        <User size={20} color="#64748b" />
                      </div>
                      <div className="pm-review-meta">
                        <span className="pm-review-author">Customer</span>
                        <span className="pm-review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="pm-review-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < r.rating ? "#f59e0b" : "#e2e8f0"} color={i < r.rating ? "#f59e0b" : "#e2e8f0"} />
                        ))}
                      </div>
                    </div>
                    {r.review && <p className="pm-review-text">"{r.review}"</p>}
                  </div>
                ))
              )}
            </div>

            <div className="pm-review-footer">
              <button className="pm-review-drop-btn" onClick={() => setIsDropReviewOpen(true)}>
                <Sparkles size={18} />
                Drop A Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop Review Modal / Bottom Sheet */}
      {isDropReviewOpen && selectedDish && (
        <div className="pm-drop-review-overlay fade-in" onClick={() => setIsDropReviewOpen(false)}>
          <div className="pm-drop-review-content slide-up" onClick={e => e.stopPropagation()}>
            <div className="pm-drop-review-header">
              <h3>How was the {selectedDish.name}?</h3>
              <button className="pm-close-btn" onClick={() => setIsDropReviewOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="pm-drop-review-form">
              <div className="pm-star-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="pm-interactive-star"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRatingInput(star)}
                  >
                    <Star 
                      size={40} 
                      fill={(hoveredStar || ratingInput) >= star ? "#f59e0b" : "transparent"} 
                      color={(hoveredStar || ratingInput) >= star ? "#f59e0b" : "#cbd5e1"} 
                      style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', transform: (hoveredStar || ratingInput) >= star ? 'scale(1.15)' : 'scale(1)' }}
                    />
                  </button>
                ))}
              </div>
              <p className="pm-star-label">
                {['', 'Terrible', 'Bad', 'Okay', 'Good', 'Amazing!'][hoveredStar || ratingInput]}
              </p>
              
              <div className="pm-review-input-group">
                <textarea 
                  className="pm-review-textarea"
                  placeholder="Share your experience (optional)..."
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                  rows="4"
                ></textarea>
              </div>
              
              <button type="submit" className="pm-review-submit-btn" disabled={submittingReview || ratingInput === 0}>
                {submittingReview ? <Loader /> : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;

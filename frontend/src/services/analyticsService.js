import api from './api';

// Utility to generate a lightweight anonymous session ID
export const getSessionId = () => {
  let sessionId = sessionStorage.getItem('rastro_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem('rastro_session_id', sessionId);
  }
  return sessionId;
};

class AnalyticsService {
  constructor() {
    this.sessionId = getSessionId();
    this.trackedSessions = new Set();
    this.lastDishViewTime = new Map();
    this.trackedSearches = new Set();
  }

  // Track when a user opens a restaurant's menu
  trackSession(restaurantId, visitSource = 'direct') {
    if (this.trackedSessions.has(restaurantId)) return;
    this.trackedSessions.add(restaurantId);

    // Fire and forget (non-blocking)
    api.post('/analytics/track-session', {
      restaurantId,
      sessionId: this.sessionId,
      deviceType: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
               navigator.userAgent.includes('Firefox') ? 'Firefox' : 
               navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
      visitSource
    }).catch(error => {
      console.warn('Analytics: Failed to track session', error);
      this.trackedSessions.delete(restaurantId); // Allow retry on failure
    });
  }

  // Track when a user clicks/views a dish modal
  trackDishView(dishId, restaurantId, viewDuration = 0, clicked = true) {
    const now = Date.now();
    const lastView = this.lastDishViewTime.get(dishId);
    
    // 60-second cooldown for the same dish to prevent spam
    if (lastView && (now - lastView < 60000)) return;
    this.lastDishViewTime.set(dishId, now);

    api.post('/analytics/track-view', {
      dishId,
      restaurantId,
      sessionId: this.sessionId,
      viewDuration,
      clicked
    }).catch(error => console.warn('Analytics: Failed to track dish view', error));
  }

  // Track searches to understand what users want
  trackSearch(restaurantId, searchQuery, resultsCount) {
    if (!searchQuery || searchQuery.length < 3) return; // Min length 3
    const queryLower = searchQuery.toLowerCase();
    
    // Prevent tracking the exact same search query twice in one session
    if (this.trackedSearches.has(queryLower)) return;
    this.trackedSearches.add(queryLower);

    api.post('/analytics/track-search', {
      restaurantId,
      sessionId: this.sessionId,
      searchQuery: queryLower,
      resultsCount
    }).catch(error => console.warn('Analytics: Failed to track search', error));
  }

  // Get aggregated data for the dashboard
  async getDashboardMetrics(restaurantId, timeFilter = 'all') {
    try {
      const response = await api.get(`/analytics/dashboard/${restaurantId}?timeFilter=${timeFilter}`);
      return response.data;
    } catch (error) {
      console.error('Analytics: Failed to get dashboard metrics', error);
      throw error;
    }
  }

  // Get trending dishes for a restaurant
  async getTrendingDishes(restaurantId) {
    try {
      const response = await api.get(`/analytics/trending/${restaurantId}`);
      return response.data;
    } catch (error) {
      console.error('Analytics: Failed to get trending dishes', error);
      throw error;
    }
  }

  // Track generic events (e.g., AR interactions)
  trackEvent(eventName, data) {
    if (eventName === 'ar_open') {
      api.post('/analytics/track-ar-event', {
        restaurantId: data.restaurantId,
        dishId: data.dishId,
        eventType: 'open'
      }).catch(err => console.warn('Analytics: Failed to track AR event', err));
    }
  }
}

export default new AnalyticsService();

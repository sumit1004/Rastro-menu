import api from '../services/api';

class ARAnalytics {
  trackAREvent(restaurantId, dishId, eventType, durationSeconds = 0) {
    if (!restaurantId || !dishId) return;

    api.post('/analytics/track-ar-event', {
      restaurantId,
      dishId,
      eventType,
      durationSeconds
    }).catch(err => {
      console.warn('AR Analytics: Failed to track event', err);
    });
  }

  trackOpen(restaurantId, dishId) {
    this.trackAREvent(restaurantId, dishId, 'open');
  }

  trackClose(restaurantId, dishId, durationSeconds) {
    this.trackAREvent(restaurantId, dishId, 'close', durationSeconds);
  }
}

export default new ARAnalytics();

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    if (!user || user.role !== 'restaurant') {
      setSubscription(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/subscription/current');
      setSubscription(data);
    } catch (err) {
      console.error('SubscriptionContext fetch error:', err);
      setError('Failed to load subscription.');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch once when user logs in
  useEffect(() => {
    if (user?.role === 'restaurant') {
      fetchSubscription();
    } else {
      setSubscription(null);
    }
  }, [user]);

  // Helper: check if a feature is accessible on current plan
  const canAccess = useCallback((featureKey) => {
    if (!subscription?.features) return false;
    return !!subscription.features[featureKey];
  }, [subscription]);

  // Helper: get usage percentage for a resource
  const usagePercent = useCallback((resource) => {
    if (!subscription) return 0;
    const used = subscription.usage?.[resource] ?? 0;
    const limit = subscription.limits?.[resource === 'dishes' ? 'maxDishes' : 'aiGenerationsPerMonth'];
    if (limit === null || limit === undefined) return 0; // unlimited
    return Math.min(100, Math.round((used / limit) * 100));
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      error,
      refresh: fetchSubscription,
      canAccess,
      usagePercent,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

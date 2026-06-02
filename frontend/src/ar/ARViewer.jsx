import React, { useEffect } from 'react';
import SpatialDishViewer from './SpatialDishViewer';
import arAnalytics from './arAnalytics';
import { getDevicePerformanceClass } from './arUtils';
import './arStyles.css';

const ARViewer = ({ dish, restaurantId, onClose }) => {
  const performanceClass = getDevicePerformanceClass();

  useEffect(() => {
    // Analytics on mount
    arAnalytics.trackOpen(restaurantId, dish.id);
    const startTime = Date.now();

    // Prevent scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      // Analytics on unmount
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      arAnalytics.trackClose(restaurantId, dish.id, durationSeconds);
      document.body.style.overflow = '';
    };
  }, [restaurantId, dish.id]);

  return (
    <div className={`ar-container ${performanceClass === 'low' ? 'ar-low-perf' : ''}`}>
      <SpatialDishViewer 
        dish={dish} 
        onClose={onClose} 
      />
    </div>
  );
};

export default ARViewer;

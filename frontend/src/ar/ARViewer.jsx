import React, { useState, useEffect } from 'react';
import CameraARMode from './CameraARMode';
import WebXRMode from './WebXRMode';
import ARFallbackViewer from './ARFallbackViewer';
import arAnalytics from './arAnalytics';
import { getDevicePerformanceClass } from './arUtils';
import './arStyles.css';

const ARViewer = ({ dish, restaurantId, onClose }) => {
  const [mode, setMode] = useState('camera'); // 'camera', 'webxr', 'fallback'
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

  const handleCameraError = (err) => {
    console.warn("Camera failed, falling back to 3D Viewer", err);
    setMode('fallback');
  };

  const handleWebXRFallback = () => {
    // If WebXR fails or falls through, go to Camera Mode (or Fallback if no camera)
    setMode('camera');
  };

  return (
    <div className={`ar-container ${performanceClass === 'low' ? 'ar-low-perf' : ''}`}>
      {mode === 'camera' && (
        <CameraARMode 
          dish={dish} 
          onClose={onClose} 
          onCameraError={handleCameraError} 
        />
      )}
      
      {mode === 'webxr' && (
        <WebXRMode 
          dish={dish} 
          onClose={onClose} 
          onFallback={handleWebXRFallback} 
        />
      )}
      
      {mode === 'fallback' && (
        <ARFallbackViewer 
          dish={dish} 
          onClose={onClose} 
        />
      )}
    </div>
  );
};

export default ARViewer;

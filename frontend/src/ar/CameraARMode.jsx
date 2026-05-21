import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { getDevicePerformanceClass } from './arUtils';
import { getImageUrl } from '../services/api';

const CameraARMode = ({ dish, onClose, onCameraError }) => {
  const videoRef = useRef(null);
  const dishRef = useRef(null);
  const performanceClass = getDevicePerformanceClass();

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  const gestureState = useRef({
    initialDistance: null,
    initialScale: 1,
    initialAngle: null,
    initialRotation: 0,
    lastTouch: null
  });

  useEffect(() => {
    let stream = null;
    let isMounted = true;
    
    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
        if (isMounted && onCameraError) onCameraError(err);
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onCameraError]);

  const getDistance = (touch1, touch2) => Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
  const getAngle = (touch1, touch2) => Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      gestureState.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      gestureState.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      gestureState.current.initialScale = scale;
      gestureState.current.initialAngle = getAngle(e.touches[0], e.touches[1]);
      gestureState.current.initialRotation = rotation;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && gestureState.current.lastTouch) {
      const deltaX = e.touches[0].clientX - gestureState.current.lastTouch.x;
      const deltaY = e.touches[0].clientY - gestureState.current.lastTouch.y;
      setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      gestureState.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && gestureState.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const newScale = gestureState.current.initialScale * (currentDistance / gestureState.current.initialDistance);
      setScale(Math.max(0.3, Math.min(newScale, 3)));
      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      const angleDiff = currentAngle - gestureState.current.initialAngle;
      setRotation(gestureState.current.initialRotation + angleDiff);
    }
  };

  const handleTouchEnd = () => {
    gestureState.current.initialDistance = null;
    gestureState.current.lastTouch = null;
  };

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted className="ar-camera-feed" />
      <div className="ar-scene" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="ar-dish-wrapper" ref={dishRef} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }}>
          <img src={getImageUrl(dish.ar_image_url)} alt={dish.name} className="ar-dish-image" crossOrigin="anonymous" />
        </div>
      </div>
      <div className="ar-ui-overlay">
        <button className="ar-close-btn" onClick={onClose}><X size={24} /></button>
        <div className="ar-instructions">Pinch to scale • Drag to move • Twist to rotate</div>
        <div className="ar-watermark">Powered by Rastro-menu</div>
      </div>
    </>
  );
};

export default CameraARMode;

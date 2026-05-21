import React, { useEffect } from 'react';
import { X, Box } from 'lucide-react';

const WebXRMode = ({ dish, onClose, onFallback }) => {
  useEffect(() => {
    // WebXR true mode check
    // Since we only have PNGs (not GLTF/GLB models), 
    // True surface-anchored WebXR requires a 3D model format.
    // For MVP phase 5, if a user forces WebXR mode, we degrade to Fallback instantly
    // or display a message that WebXR needs true 3D assets.
    
    // Auto-fallback for now since we use transparent PNGs
    const timer = setTimeout(() => {
      onFallback();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFallback]);

  return (
    <div className="ar-scene" style={{ backgroundColor: '#000', flexDirection: 'column' }}>
      <Box size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
      <h3 style={{ color: 'white' }}>Checking WebXR Capability...</h3>
      <p style={{ color: '#94a3b8' }}>Redirecting to immersive viewer</p>
      <div className="ar-ui-overlay">
        <button className="ar-close-btn" onClick={onClose}><X size={24} /></button>
      </div>
    </div>
  );
};

export default WebXRMode;

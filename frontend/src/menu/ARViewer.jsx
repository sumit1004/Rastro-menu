import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import Loader from '../components/Loader';
import Button from '../components/Button';
import './ARViewer.css';

/**
 * ARViewer — Stable fullscreen 3D / AR viewer.
 *
 * This version rolls back unstable custom transforms and
 * restores native model-viewer WebXR behavior while safely
 * applying initial scale and ground normalization.
 */
const ARViewer = ({ dish, isOpen, onClose, isLowEndDevice, restaurant, analyticsService }) => {
  // UI state
  const [arLoading, setArLoading] = useState(true);
  const [arError, setArError] = useState(false);
  const [isArSessionActive, setIsArSessionActive] = useState(false);

  // Refs
  const viewerRef = useRef(null);

  // ── AR session detection ───────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const onArStatus = (event) => {
      if (event.detail.status === 'session-started') {
        setIsArSessionActive(true);
        setArLoading(false);
        setArError(false);
      } else if (event.detail.status === 'not-presenting') {
        setIsArSessionActive(false);
      }
    };
    viewer.addEventListener('ar-status', onArStatus);
    return () => viewer.removeEventListener('ar-status', onArStatus);
  }, [isOpen, dish]);



  // ── Reset state when dish changes ──────────────────────────
  useEffect(() => {
    if (isOpen && dish) {
      setArLoading(true);
      setArError(false);
    }
  }, [isOpen, dish?.id]);

  // ── Model load handler (SAFE auto-normalization ONLY) ──────
  const handleModelLoad = useCallback((e) => {
    setArLoading(false);
    const viewer = e.target;

    if (dish?.ar_model_id && dish?.ar_model) {
      // Use backend-provided normalization safely
      const scaleVal = dish.ar_model.normalized_scale || 1.0;
      viewer.scale = `${scaleVal} ${scaleVal} ${scaleVal}`;
      viewer.modelPosition = `0 ${dish.ar_model.normalized_height_offset || 0} 0`;
    } else {
      // SAFE Auto-normalize: fit to targetSize, ground the model ONCE
      try {
        const size = viewer.getDimensions();
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Safe target size for tabletop
        let targetSize = 0.25;
        const cat = (dish?.category || '').toLowerCase();
        if (cat.includes('burger') || cat.includes('sandwich')) targetSize = 0.15;
        else if (cat.includes('pizza')) targetSize = 0.35;
        else if (cat.includes('drink') || cat.includes('beverage')) targetSize = 0.20;

        const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
        viewer.scale = `${scale} ${scale} ${scale}`;

        // Ground the model: shift so bottom sits exactly at y=0
        const center = viewer.getBoundingBoxCenter();
        const bottomY = center.y - (size.y / 2);
        const offset = -bottomY * scale;
        viewer.modelPosition = `0 ${offset} 0`;
      } catch (err) {
        console.warn("Failed to auto-normalize model dimensions:", err);
      }
    }

    // Dynamic camera framing (safe one-time setup)
    try {
      const dims = viewer.getDimensions();
      const maxDim = Math.max(dims.x, dims.y, dims.z);
      const radius = maxDim * 0.75;
      const fovRad = (30 * Math.PI) / 180;
      const distance = radius / Math.sin(fovRad / 2);
      const clampedDist = Math.max(0.3, Math.min(distance, 5.0));
      viewer.cameraOrbit = `0deg 55deg ${clampedDist}m`;
      viewer.cameraTarget = 'auto auto auto';
    } catch (err) {
      console.warn('Camera framing fallback:', err);
    }

  }, [dish]);

  // ── Prevent body scroll when open ──────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // ── Don't render if closed ─────────────────────────────────
  if (!isOpen || !dish) return null;

  const glbUrl = dish.ar_model?.glb_url;
  const usdzUrl = dish.ar_model?.usdz_url;

  if (!glbUrl) return null;

  const orientationAttr = dish.ar_model_id && dish.ar_model
    ? `${dish.ar_model.normalized_rotation_x || 0}rad ${dish.ar_model.normalized_rotation_y || 0}rad ${dish.ar_model.normalized_rotation_z || 0}rad`
    : '0 180deg 0';

  return (
    <div className="arv-overlay">
      {/* ── Header ── */}
      <div className="arv-header">
        <h3 className="arv-title">{dish.name} — 3D View</h3>
        <button className="arv-close-btn" onClick={onClose} aria-label="Close AR viewer">
          <X size={22} />
        </button>
      </div>

      {/* ── Viewer Body ── */}
      <div className="arv-body">
        <model-viewer
          ref={viewerRef}
          src={glbUrl}
          ios-src={usdzUrl || undefined}
          alt={`A 3D model of ${dish.name}`}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-scale="auto"
          ar-placement="floor"
          environment-image="neutral"
          shadow-intensity={isLowEndDevice ? '0.3' : '0.6'}
          shadow-softness={isLowEndDevice ? '0.5' : '1'}
          exposure="1.0"
          loading="eager"
          reveal="auto"
          camera-controls
          touch-action="pan-y"
          auto-rotate
          auto-rotate-delay="1500"
          rotation-per-second="24deg"
          interaction-prompt="auto"
          interpolation-decay="100"
          min-camera-orbit="auto 10deg auto"
          max-camera-orbit="auto 90deg auto"
          min-field-of-view="18deg"
          max-field-of-view="45deg"
          field-of-view="30deg"
          camera-orbit="0deg 55deg auto"
          orientation={orientationAttr}
          className="arv-model-viewer"
          onError={(e) => {
            console.error('Model viewer error:', e);
            if (!isArSessionActive) {
              setArError(true);
              setArLoading(false);
            }
          }}
          onLoad={handleModelLoad}
          data-device-memory={navigator.deviceMemory}
        >
          {/* AR Button (inside model-viewer slot) */}
          <button slot="ar-button" className="arv-ar-button">
            <Sparkles size={20} />
            Launch Real AR
          </button>

          {/* Recenter button during AR session */}
          {isArSessionActive && (
            <button
              className="arv-recenter-btn"
              onClick={() => viewerRef.current?.resetCamera()}
            >
              Recenter Dish
            </button>
          )}
        </model-viewer>



        {/* Error overlay - positioned over model-viewer, but doesn't unmount it */}
        {arError && !isArSessionActive && (
          <div className="arv-error" style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' }}>
            <p style={{ color: '#f87171', marginBottom: '1.5rem', fontWeight: 'bold' }}>
              Failed to load 3D model.<br />Please check your network.
            </p>
            <Button onClick={() => { setArError(false); setArLoading(true); }}>Retry</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ARViewer;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Move, RotateCcw, Maximize2, Hand } from 'lucide-react';
import Loader from '../components/Loader';
import Button from '../components/Button';
import './ARViewer.css';

/**
 * ARViewer — Premium fullscreen 3D / AR viewer with interactive gestures.
 *
 * Props:
 *   dish            — dish object (must have ar_model.glb_url)
 *   isOpen          — boolean controlling visibility
 *   onClose         — callback to close the viewer
 *   isLowEndDevice  — boolean hint for quality tuning
 *   restaurant      — restaurant object (for analytics)
 *   analyticsService — analytics module (optional)
 */

// ── Gesture constants ──────────────────────────────────────────
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const DRAG_THRESHOLD = 8;          // px before drag activates
const LONG_PRESS_MS = 350;         // ms to activate drag mode
const LERP_FACTOR = 0.15;          // interpolation smoothness
const INERTIA_DECAY = 0.92;        // velocity decay per frame
const ROTATION_SENSITIVITY = 0.6;  // degrees per px of finger movement

// ── Helpers ────────────────────────────────────────────────────
function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchAngle(t1, t2) {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ── Component ──────────────────────────────────────────────────
const ARViewer = ({ dish, isOpen, onClose, isLowEndDevice, restaurant, analyticsService }) => {
  // UI state
  const [arLoading, setArLoading] = useState(true);
  const [arProgress, setArProgress] = useState(0);
  const [arError, setArError] = useState(false);
  const [isArSessionActive, setIsArSessionActive] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(true);
  const [scaleBadge, setScaleBadge] = useState(null);    // e.g. "1.2x"
  const [isDragMode, setIsDragMode] = useState(false);

  // Refs
  const viewerRef = useRef(null);
  const touchOverlayRef = useRef(null);
  const rafRef = useRef(null);
  const scaleBadgeTimerRef = useRef(null);

  // Gesture state (refs to avoid re-renders during gestures)
  const gestureRef = useRef({
    state: 'IDLE',              // IDLE | ORBITING | DRAGGING | PINCHING | ROTATING
    // Pinch
    initialPinchDist: 0,
    initialScale: 1,
    currentScale: 1,
    targetScale: 1,
    // Rotation
    initialAngle: 0,
    initialRotation: 0,
    currentRotation: 0,
    targetRotation: 0,
    rotationVelocity: 0,
    // Drag
    longPressTimer: null,
    dragStartX: 0,
    dragStartY: 0,
    modelStartX: 0,
    modelStartZ: 0,
    currentModelX: 0,
    currentModelZ: 0,
    targetModelX: 0,
    targetModelZ: 0,
    // Model baseline
    baseScale: 1,
    baseRotationY: 0,
    groundOffsetY: 0,
    modelReady: false,
  });

  // ── AR session detection ───────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
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
  }, [isOpen, dish]);

  // ── Loading timeout ────────────────────────────────────────
  useEffect(() => {
    let timeoutId;
    if (isOpen && arLoading) {
      timeoutId = setTimeout(() => {
        setArError(true);
        setArLoading(false);
      }, 15000);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen, arLoading]);

  // ── Reset state when dish changes ──────────────────────────
  useEffect(() => {
    if (isOpen && dish) {
      setArLoading(true);
      setArProgress(0);
      setArError(false);
      setShowGestureHint(true);
      setScaleBadge(null);
      setIsDragMode(false);
      const g = gestureRef.current;
      g.state = 'IDLE';
      g.currentScale = 1;
      g.targetScale = 1;
      g.currentRotation = 0;
      g.targetRotation = 0;
      g.rotationVelocity = 0;
      g.currentModelX = 0;
      g.currentModelZ = 0;
      g.targetModelX = 0;
      g.targetModelZ = 0;
      g.modelReady = false;
    }
  }, [isOpen, dish?.id]);

  // ── Dismiss gesture hint after first interaction ───────────
  const dismissHint = useCallback(() => {
    setShowGestureHint(false);
  }, []);

  // ── Scale badge helper ─────────────────────────────────────
  const flashScaleBadge = useCallback((scale) => {
    setScaleBadge(`${scale.toFixed(1)}x`);
    clearTimeout(scaleBadgeTimerRef.current);
    scaleBadgeTimerRef.current = setTimeout(() => setScaleBadge(null), 1200);
  }, []);

  // ── Model load handler (auto-normalization) ────────────────
  const handleModelLoad = useCallback((e) => {
    setArLoading(false);
    const viewer = e.target;
    const g = gestureRef.current;

    if (dish?.ar_model_id && dish?.ar_model) {
      // Use backend-provided normalization
      const scaleVal = dish.ar_model.normalized_scale || 1.0;
      viewer.scale = `${scaleVal} ${scaleVal} ${scaleVal}`;
      viewer.modelPosition = `0 ${dish.ar_model.normalized_height_offset || 0} 0`;
      g.baseScale = scaleVal;
      g.groundOffsetY = dish.ar_model.normalized_height_offset || 0;
    } else {
      // Auto-normalize: fit to targetSize, ground the model
      const size = viewer.getDimensions();
      const maxDimension = Math.max(size.x, size.y, size.z);

      let targetSize = 0.25;
      const cat = (dish?.category || '').toLowerCase();
      if (cat.includes('burger') || cat.includes('sandwich')) targetSize = 0.15;
      else if (cat.includes('pizza')) targetSize = 0.35;
      else if (cat.includes('drink') || cat.includes('beverage')) targetSize = 0.20;

      const scale = maxDimension > 0 ? targetSize / maxDimension : 1;
      viewer.scale = `${scale} ${scale} ${scale}`;

      // Ground the model: shift so bottom sits at y=0
      const center = viewer.getBoundingBoxCenter();
      const bottomY = center.y - (size.y / 2);
      const offset = -bottomY * scale;
      viewer.modelPosition = `0 ${offset} 0`;

      g.baseScale = scale;
      g.groundOffsetY = offset;
    }

    // Extract initial rotation
    g.baseRotationY = 0;
    g.currentRotation = 0;
    g.targetRotation = 0;

    // Dynamic camera framing
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

    g.modelReady = true;

    // Haptic feedback on successful load
    try { navigator.vibrate?.(30); } catch (_) { /* noop */ }
  }, [dish]);

  // ── Animation loop (smooth interpolation) ──────────────────
  useEffect(() => {
    if (!isOpen) return;

    const animate = () => {
      const g = gestureRef.current;
      const viewer = viewerRef.current;

      if (viewer && g.modelReady) {
        // ── Interpolate scale ──
        g.currentScale = lerp(g.currentScale, g.targetScale, LERP_FACTOR);
        const appliedScale = g.baseScale * g.currentScale;
        viewer.scale = `${appliedScale} ${appliedScale} ${appliedScale}`;

        // ── Interpolate rotation (with inertia) ──
        if (g.state !== 'ROTATING' && Math.abs(g.rotationVelocity) > 0.1) {
          g.targetRotation += g.rotationVelocity;
          g.rotationVelocity *= INERTIA_DECAY;
        } else if (g.state !== 'ROTATING') {
          g.rotationVelocity = 0;
        }
        g.currentRotation = lerp(g.currentRotation, g.targetRotation, LERP_FACTOR);

        // Apply orientation (Y-axis rotation only)
        let baseOrientationStr = '0rad 0rad 0rad';
        if (dish?.ar_model_id && dish?.ar_model) {
          const rx = dish.ar_model.normalized_rotation_x || 0;
          const ry = dish.ar_model.normalized_rotation_y || 0;
          const rz = dish.ar_model.normalized_rotation_z || 0;
          baseOrientationStr = `${rx}rad ${ry}rad ${rz}rad`;
        } else {
          baseOrientationStr = '0 180deg 0';
        }

        // Compose: add user rotation on top of base Y rotation
        const userRotDeg = g.currentRotation;
        if (dish?.ar_model_id && dish?.ar_model) {
          const baseY = (dish.ar_model.normalized_rotation_y || 0) * (180 / Math.PI);
          const totalY = baseY + userRotDeg;
          viewer.orientation = `${dish.ar_model.normalized_rotation_x || 0}rad ${(totalY * Math.PI) / 180}rad ${dish.ar_model.normalized_rotation_z || 0}rad`;
        } else {
          viewer.orientation = `0 ${180 + userRotDeg}deg 0`;
        }

        // ── Interpolate position (drag) ──
        g.currentModelX = lerp(g.currentModelX, g.targetModelX, LERP_FACTOR);
        g.currentModelZ = lerp(g.currentModelZ, g.targetModelZ, LERP_FACTOR);

        // Maintain ground contact: recalculate Y offset based on current scale
        const groundY = g.groundOffsetY;
        viewer.modelPosition = `${g.currentModelX} ${groundY} ${g.currentModelZ}`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, dish]);

  // ── Touch handlers ─────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    dismissHint();
    const g = gestureRef.current;
    const touches = e.touches;

    if (touches.length === 2) {
      // Two-finger: pinch + rotate
      clearTimeout(g.longPressTimer);
      g.state = 'PINCHING'; // Will also handle rotation
      g.initialPinchDist = getTouchDistance(touches[0], touches[1]);
      g.initialScale = g.targetScale;
      g.initialAngle = getTouchAngle(touches[0], touches[1]);
      g.initialRotation = g.targetRotation;
      g.rotationVelocity = 0;
    } else if (touches.length === 1) {
      if (isDragMode) {
        // In drag mode: immediately start drag
        g.state = 'DRAGGING';
        g.dragStartX = touches[0].clientX;
        g.dragStartY = touches[0].clientY;
        g.modelStartX = g.targetModelX;
        g.modelStartZ = g.targetModelZ;
      } else {
        // Single finger: let model-viewer handle orbit
        // But set up long-press for drag activation
        g.dragStartX = touches[0].clientX;
        g.dragStartY = touches[0].clientY;
        g.state = 'IDLE';

        g.longPressTimer = setTimeout(() => {
          // Activate drag mode via long press
          g.state = 'DRAGGING';
          g.modelStartX = g.targetModelX;
          g.modelStartZ = g.targetModelZ;
          setIsDragMode(true);
          try { navigator.vibrate?.(25); } catch (_) { /* noop */ }
        }, LONG_PRESS_MS);
      }
    }
  }, [dismissHint, isDragMode]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const g = gestureRef.current;
    const touches = e.touches;

    if (touches.length === 2 && (g.state === 'PINCHING' || g.state === 'ROTATING')) {
      // ── Pinch to scale ──
      const currentDist = getTouchDistance(touches[0], touches[1]);
      const scaleFactor = currentDist / g.initialPinchDist;
      g.targetScale = clamp(g.initialScale * scaleFactor, MIN_SCALE, MAX_SCALE);
      flashScaleBadge(g.targetScale);

      // ── Two-finger rotation ──
      const currentAngle = getTouchAngle(touches[0], touches[1]);
      let angleDelta = currentAngle - g.initialAngle;

      // Normalize to [-180, 180]
      while (angleDelta > 180) angleDelta -= 360;
      while (angleDelta < -180) angleDelta += 360;

      const prevTarget = g.targetRotation;
      g.targetRotation = g.initialRotation + angleDelta * ROTATION_SENSITIVITY;
      g.rotationVelocity = g.targetRotation - prevTarget;

      g.state = 'PINCHING';
    } else if (touches.length === 1) {
      const dx = touches[0].clientX - g.dragStartX;
      const dy = touches[0].clientY - g.dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Cancel long-press if finger moved
      if (dist > DRAG_THRESHOLD && g.state !== 'DRAGGING') {
        clearTimeout(g.longPressTimer);
        g.state = 'ORBITING'; // Let model-viewer handle it
      }

      if (g.state === 'DRAGGING') {
        // Convert screen-space movement to model-space
        // Rough scale: 1px ≈ 0.001m, adjusted by viewport
        const moveScale = 0.002;
        g.targetModelX = g.modelStartX + dx * moveScale;
        g.targetModelZ = g.modelStartZ + dy * moveScale;

        // Clamp movement bounds
        g.targetModelX = clamp(g.targetModelX, -0.5, 0.5);
        g.targetModelZ = clamp(g.targetModelZ, -0.5, 0.5);
      }
    }
  }, [flashScaleBadge]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    const g = gestureRef.current;

    clearTimeout(g.longPressTimer);

    if (e.touches.length === 0) {
      // All fingers lifted
      if (g.state === 'DRAGGING') {
        // Keep drag mode active for a bit, auto-disable after idle
        setTimeout(() => {
          setIsDragMode(false);
        }, 3000);
      }
      g.state = 'IDLE';
    } else if (e.touches.length === 1 && g.state === 'PINCHING') {
      // Went from 2 fingers to 1 — reset to orbit
      g.state = 'ORBITING';
    }
  }, []);

  // ── Attach touch listeners to overlay ──────────────────────
  useEffect(() => {
    const overlay = touchOverlayRef.current;
    if (!overlay || !isOpen) return;

    // Use non-passive listeners to allow preventDefault
    overlay.addEventListener('touchstart', handleTouchStart, { passive: false });
    overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
    overlay.addEventListener('touchend', handleTouchEnd, { passive: false });
    overlay.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      overlay.removeEventListener('touchstart', handleTouchStart);
      overlay.removeEventListener('touchmove', handleTouchMove);
      overlay.removeEventListener('touchend', handleTouchEnd);
      overlay.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

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
        {arError ? (
          <div className="arv-error">
            <p>Failed to load 3D model.<br />Please try again.</p>
            <Button onClick={() => { setArError(false); setArLoading(true); }}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Model Viewer */}
            <model-viewer
              ref={viewerRef}
              src={glbUrl}
              ios-src={usdzUrl || undefined}
              alt={`A 3D model of ${dish.name}`}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="fixed"
              ar-placement="floor"
              bounds="tight"
              environment-image="neutral"
              shadow-intensity={isLowEndDevice ? '0.3' : '0.6'}
              shadow-softness={isLowEndDevice ? '0.5' : '1'}
              exposure="1.0"
              loading="eager"
              reveal="auto"
              camera-controls
              touch-action="none"
              auto-rotate
              auto-rotate-delay="1500"
              rotation-per-second="24deg"
              interaction-prompt="none"
              interpolation-decay="100"
              min-camera-orbit="auto 10deg auto"
              max-camera-orbit="auto 90deg auto"
              min-field-of-view="18deg"
              max-field-of-view="45deg"
              field-of-view="30deg"
              camera-orbit="0deg 55deg auto"
              orientation={orientationAttr}
              className="arv-model-viewer"
              onProgress={(e) => {
                if (e.detail && typeof e.detail.totalProgress === 'number') {
                  setArProgress(Math.round(e.detail.totalProgress * 100));
                }
              }}
              onError={(e) => {
                console.error('Model viewer error:', e);
                setArError(true);
                setArLoading(false);
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

            {/* Touch capture overlay for gesture handling */}
            {!isArSessionActive && !arLoading && (
              <div
                ref={touchOverlayRef}
                className="arv-touch-overlay"
                style={{ pointerEvents: isDragMode ? 'auto' : 'none' }}
              />
            )}

            {/* Loading indicator */}
            {arLoading && (
              <div className="arv-loading">
                <Loader />
                <p className="arv-loading-text">Loading 3D Model...</p>
                <div className="arv-loading-bar">
                  <div
                    className="arv-loading-bar-fill"
                    style={{ width: `${arProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scale badge */}
            {scaleBadge && (
              <div className="arv-scale-badge" key={scaleBadge}>
                {scaleBadge}
              </div>
            )}

            {/* Gesture hint */}
            {showGestureHint && !arLoading && !arError && (
              <div className="arv-gesture-hint">
                <div className="arv-gesture-hint-icon">
                  <Hand size={22} color="rgba(255,255,255,0.6)" />
                </div>
                <span className="arv-gesture-hint-text">
                  Pinch to resize · Two fingers to rotate
                  <br />
                  Long press to drag
                </span>
              </div>
            )}

            {/* Drag mode indicator */}
            {isDragMode && (
              <div className="arv-scale-badge" style={{ background: 'rgba(34, 211, 238, 0.2)', borderColor: 'rgba(34, 211, 238, 0.5)' }}>
                <Move size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Drag Mode
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ARViewer;

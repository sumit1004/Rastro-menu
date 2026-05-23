import React, { useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { getDevicePerformanceClass } from './arUtils';
import { getImageUrl } from '../services/api';

const CameraARMode = ({ dish, onClose, onCameraError }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const performanceClass = getDevicePerformanceClass();
  const deviceMemory = navigator.deviceMemory || 4; // Fallback to 4GB if undefined

  const isLowEnd = deviceMemory <= 4;

  const ANCHOR_POS = new THREE.Vector3(0, -1.2, -4);
  const isVideo = dish.ar_video_url ? true : false;
  
  // Base scale from dish type (proportions)
  const baseScale = useMemo(() => {
    const name = dish.name.toLowerCase();
    const cat = (dish.category || '').toLowerCase();
    const target = name + ' ' + cat;
    if (target.includes('pizza')) return 1.5;
    if (target.includes('burger') || target.includes('sandwich')) return 0.8;
    if (target.includes('bowl') || target.includes('salad')) return 1.0;
    if (target.includes('drink') || target.includes('coffee')) return 0.6;
    return 1.0;
  }, [dish.name, dish.category]);

  // Interaction State
  const interaction = useRef({
    scale: baseScale,
    targetScale: baseScale,
    positionOffset: new THREE.Vector3(0, 0, 0),
    targetPositionOffset: new THREE.Vector3(0, 0, 0),
    isDragging: false,
    initialDistance: null,
    lastTouch: null
  });

  // Virtual Camera State for Spatial Anchoring
  const virtualCamera = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0
  });

  // Gyro Smoothing Buffer (Addition 1)
  const gyroBuffer = useRef({
    x: [], y: []
  });
  const BUFFER_SIZE = 10;

  useEffect(() => {
    let stream = null;
    let isMounted = true;
    
    // 1. Camera Stream
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

    // 2. Three.js Scene Setup (World-Space Anchored)
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 0); 

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: !isLowEnd, // Disable anti-aliasing on low-end
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isLowEnd ? 1 : Math.min(window.devicePixelRatio, 2)); // Capped resolution
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Cinematic Lighting (Simulate thickness and volume)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Base fill
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); // Key light
    keyLight.position.set(2, 5, 3);
    scene.add(keyLight);
    
    const rimLight = new THREE.SpotLight(0xccddff, 1.2); // Subtle rim light
    rimLight.position.set(-3, 2, -6);
    rimLight.lookAt(ANCHOR_POS);
    scene.add(rimLight);

    // Group for the dish and shadow
    const worldGroup = new THREE.Group();
    worldGroup.position.copy(ANCHOR_POS);
    scene.add(worldGroup);
    
    const dishGroup = new THREE.Group();
    worldGroup.add(dishGroup);

    let shadowMeshRef = null;
    let materialRef = null;
    let videoElRef = null;
    
    const setupGeometry = (texture, isVideoType = false) => {
      // Dynamic aspect-ratio preserving scaling
      let aspect = 1;
      if (isVideoType) {
        aspect = texture.image.videoWidth / texture.image.videoHeight || 1;
      } else {
        aspect = texture.image.width / texture.image.height || 1;
      }
      
      const planeHeight = 2.5;
      const planeWidth = planeHeight * aspect;
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      
      // Use StandardMaterial to react to cinematic lighting
      const material = new THREE.MeshStandardMaterial({ 
        map: texture, 
        transparent: true,
        alphaTest: 0.05, // Prevent alpha glitches
        side: THREE.DoubleSide,
        roughness: 0.3,
        metalness: 0.1,
        premultipliedAlpha: true // Alpha-safe rendering
      });
      materialRef = material;
      
      const mesh = new THREE.Mesh(geometry, material);
      dishGroup.add(mesh);

      // Advanced Shadow System (Independent Shadow Plane)
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 512;
      shadowCanvas.height = 512;
      const ctx = shadowCanvas.getContext('2d');
      // Soft radial gradient for dynamic blur
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(0,0,0,0.9)'); // Deep center for contact realism
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(planeWidth * 1.5, planeWidth * 1.5);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.85
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2; // Flat on table
      shadowMesh.position.y = -0.05; // Slightly below dish pivot
      
      shadowMeshRef = shadowMesh;
      worldGroup.add(shadowMesh);
    };

    if (isVideo) {
      const videoEl = document.createElement('video');
      videoEl.crossOrigin = 'anonymous';
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.src = getImageUrl(dish.ar_video_url);
      videoElRef = videoEl;
      
      videoEl.addEventListener('loadedmetadata', () => {
        videoEl.play();
        const videoTexture = new THREE.VideoTexture(videoEl);
        // Premium texture sampling
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.wrapS = THREE.ClampToEdgeWrapping;
        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
        setupGeometry(videoTexture, true);
      });
    } else if (dish.ar_image_url) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin('anonymous');
      textureLoader.load(getImageUrl(dish.ar_image_url), (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        setupGeometry(texture, false);
      });
    }

    // 3. Render & Physics Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Interaction Damping
      interaction.current.scale += (interaction.current.targetScale - interaction.current.scale) * 0.1;
      interaction.current.positionOffset.lerp(interaction.current.targetPositionOffset, 0.08);

      worldGroup.scale.setScalar(interaction.current.scale);
      
      // Calculate micro floating motion (Subtle breathing)
      const hoverOffset = Math.sin(time * 1.5) * 0.04;
      
      // Apply offset and hover to dish group. Y is locked to plane + hover to preserve table contact
      dishGroup.position.copy(interaction.current.positionOffset);
      dishGroup.position.y += hoverOffset;
      
      // Dynamic Shadow morphing & Fake Occlusion Darkening (Addition 4)
      if (shadowMeshRef && materialRef) {
        // Normalized height from 0.0 (table contact) to 0.08 (max hover)
        const normalizedHeight = Math.max(0, hoverOffset + 0.04); 
        
        shadowMeshRef.scale.setScalar(1 + normalizedHeight * 4.0);
        shadowMeshRef.material.opacity = Math.max(0.2, 0.85 - normalizedHeight * 8.0);
        
        // Fake Occlusion Darkening: object darkens slightly when closer to the shadow
        const darkening = 1.0 - (0.15 - normalizedHeight * 1.5); 
        const finalDarkening = Math.min(1.0, Math.max(0.6, darkening));
        materialRef.color.setRGB(finalDarkening, finalDarkening, finalDarkening);
      }

      // ---------------------------------------------------------
      // CORE FIX: Cinematic Damped Camera Parallax
      // ---------------------------------------------------------
      // The camera slowly catches up to target position (lag & inertia)
      virtualCamera.current.currentX += (virtualCamera.current.targetX - virtualCamera.current.currentX) * 0.02;
      virtualCamera.current.currentY += (virtualCamera.current.targetY - virtualCamera.current.currentY) * 0.02;

      camera.position.x = virtualCamera.current.currentX;
      camera.position.y = virtualCamera.current.currentY;
      
      // The camera always looks straight ahead from its shifted position.
      // This causes the world coordinates to shift in the viewport exactly opposite to camera motion,
      // perfectly simulating environmental parallax and completely preventing auto-recentering.
      // The background moves instantly, but the object lags (resisting motion), creating massive depth.
      camera.lookAt(camera.position.x, camera.position.y, -4);
      
      // Addition 3: Depth Falloff Blur (via CSS filter)
      if (containerRef.current) {
        // As scale decreases (moves further), increase blur slightly
        const blurAmount = Math.max(0, (baseScale - interaction.current.scale) * 3.0);
        if (!isLowEnd) {
           containerRef.current.style.filter = `blur(${blurAmount}px)`;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 4. Device Orientation (True Spatial Gyro)
    const handleOrientation = (e) => {
      if (e.gamma === null || e.beta === null) return;
      
      // We map device tilt directly to camera translation
      let moveX = e.gamma / 15; // Increased sensitivity to allow full viewport traversal
      let moveY = (e.beta - 60) / 15; // Assume default holding angle is 60 deg
      
      // Add to rolling buffer (Addition 1)
      gyroBuffer.current.x.push(moveX);
      gyroBuffer.current.y.push(-moveY); // invert Y so tilting down makes object move up 
      
      if (gyroBuffer.current.x.length > BUFFER_SIZE) {
        gyroBuffer.current.x.shift();
        gyroBuffer.current.y.shift();
      }

      // Calculate rolling average for absolute stability
      const avgX = gyroBuffer.current.x.reduce((a,b)=>a+b, 0) / gyroBuffer.current.x.length;
      const avgY = gyroBuffer.current.y.reduce((a,b)=>a+b, 0) / gyroBuffer.current.y.length;
      
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      
      // Addition 2: Horizon Stabilization (Aggressive vertical clamp)
      virtualCamera.current.targetX = clamp(avgX, -1.5, 1.5);
      virtualCamera.current.targetY = clamp(avgY, -0.3, 0.5); // Clamp Y aggressively to prevent drift
    };
    window.addEventListener('deviceorientation', handleOrientation);

    // 5. Window Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (videoElRef) {
        videoElRef.pause();
        videoElRef.src = "";
      }
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      scene.clear();
      renderer.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [dish.ar_image_url, dish.ar_video_url, performanceClass, onCameraError, baseScale, isLowEnd, isVideo]);

  // Touch handlers (Scale and Pan only)
  const getDistance = (touch1, touch2) => Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

  const handleTouchStart = (e) => {
    interaction.current.isDragging = true;
    if (e.touches.length === 1) {
      interaction.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      interaction.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      interaction.current.initialScale = interaction.current.targetScale;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && interaction.current.lastTouch) {
      const deltaX = e.touches[0].clientX - interaction.current.lastTouch.x;
      const deltaY = e.touches[0].clientY - interaction.current.lastTouch.y;
      
      // Very subtle panning
      interaction.current.targetPositionOffset.x += deltaX * 0.005;
      interaction.current.targetPositionOffset.z += deltaY * 0.005; // Move in Z plane instead of Y for tabletop feel
      
      // Bounding box for pan to keep it anchored
      interaction.current.targetPositionOffset.x = Math.max(-1.5, Math.min(1.5, interaction.current.targetPositionOffset.x));
      interaction.current.targetPositionOffset.z = Math.max(-1.5, Math.min(1.5, interaction.current.targetPositionOffset.z));
      
      interaction.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && interaction.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const zoom = currentDistance / interaction.current.initialDistance;
      // Allow scale from 0.4x to 2.5x of base scale
      interaction.current.targetScale = Math.max(baseScale * 0.4, Math.min(interaction.current.initialScale * zoom, baseScale * 2.5));
    }
  };

  const handleTouchEnd = () => {
    interaction.current.isDragging = false;
    interaction.current.initialDistance = null;
    interaction.current.lastTouch = null;
    
    // Auto-center drift back on release removed to preserve environmental offset
    // interaction.current.targetPositionOffset.x = 0;
    // interaction.current.targetPositionOffset.z = 0;
  };

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted className="ar-camera-feed" />
      <div 
        ref={containerRef} 
        className="ar-scene" 
        style={{ zIndex: 2, pointerEvents: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div className="ar-ui-overlay">
        <button className="ar-close-btn" onClick={onClose}><X size={24} /></button>
        <div className="ar-instructions">Pinch to scale • Drag to adjust placement</div>
        <div className="ar-watermark">Rastro True Spatial AR Engine</div>
      </div>
    </>
  );
};

export default CameraARMode;

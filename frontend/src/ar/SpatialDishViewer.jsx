import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, CameraOff } from 'lucide-react';
import * as THREE from 'three';
import { getDevicePerformanceClass } from './arUtils';
import { getImageUrl } from '../services/api';

const SpatialDishViewer = ({ dish, onClose }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  
  const [placementState, setPlacementState] = useState('waiting'); // waiting, placed
  const [cameraError, setCameraError] = useState(false);
  
  const performanceClass = getDevicePerformanceClass();
  const deviceMemory = navigator.deviceMemory || 4;
  const isLowEnd = deviceMemory <= 4;

  const ANCHOR_POS = new THREE.Vector3(0, -1.5, -4);
  const isVideo = dish.ar_video_url ? true : false;
  
  // Base scale from dish type
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

  const stateRef = useRef({
    scale: 0.01, // Starts tiny for spawn animation
    targetScale: baseScale,
    positionOffset: new THREE.Vector3(0, 0, 0),
    targetPositionOffset: new THREE.Vector3(0, 0, 0),
    isDragging: false,
    initialDistance: null,
    lastTouch: null,
    time: 0,
    spawnTime: 0,
    hasPlaced: false
  });

  // Advanced Gyro Stabilization Buffer
  const virtualCamera = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0
  });

  const gyroBuffer = useRef({
    x: [], y: []
  });
  const BUFFER_SIZE = 15; // Larger buffer for smoother rolling average

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
        console.warn("Camera access denied or unavailable", err);
        if (isMounted) {
          setCameraError(true);
          // Dark fallback happens via CSS/React state
        }
      }
    };
    initCamera();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 0); 

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: !isLowEnd,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isLowEnd ? 1 : Math.min(window.devicePixelRatio, 2));
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(2, 5, 3);
    scene.add(keyLight);
    
    const rimLight = new THREE.SpotLight(0xccddff, 1.5);
    rimLight.position.set(-3, 2, -6);
    rimLight.lookAt(ANCHOR_POS);
    scene.add(rimLight);

    const worldGroup = new THREE.Group();
    worldGroup.position.copy(ANCHOR_POS);
    scene.add(worldGroup);
    
    // Multi-Layer Depth System Group (Architecture support)
    const dishGroup = new THREE.Group();
    worldGroup.add(dishGroup);

    let shadowMeshRef = null;
    let materialRef = null;
    let videoElRef = null;
    
    const createCurvedGeometry = (width, height, isLowEnd) => {
      // Curved Geometry System: Slight vertex bending to simulate volume
      const segments = isLowEnd ? 8 : 16;
      const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
      
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        // Subtle curve: bend backwards at the edges
        const curveAmount = 0.05; // extremely small curvature
        const z = -Math.pow(x / (width / 2), 2) * curveAmount; 
        positions.setZ(i, z);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    const setupGeometry = (texture, isVideoType = false) => {
      let aspect = 1;
      if (isVideoType) {
        aspect = texture.image.videoWidth / texture.image.videoHeight || 1;
      } else {
        aspect = texture.image.width / texture.image.height || 1;
      }
      
      const planeHeight = 2.5;
      const planeWidth = planeHeight * aspect;
      
      // Main Dish Layer
      const geometry = createCurvedGeometry(planeWidth, planeHeight, isLowEnd);
      
      const material = new THREE.MeshStandardMaterial({ 
        map: texture, 
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        roughness: 0.4,
        metalness: 0.1,
        premultipliedAlpha: true
      });
      materialRef = material;
      
      const mesh = new THREE.Mesh(geometry, material);
      // Z-depth layering setup: main dish at 0 (relative to dishGroup)
      mesh.position.z = 0; 
      dishGroup.add(mesh);

      // Advanced Shadow System
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 512;
      shadowCanvas.height = 512;
      const ctx = shadowCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(0,0,0,0.95)'); 
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(planeWidth * 1.5, planeWidth * 1.5);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.0 // Starts invisible
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.05;
      
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

    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      stateRef.current.time += delta;
      const time = stateRef.current.time;

      // Cinematic Autofocus & Object Placement Lock Animation
      if (stateRef.current.hasPlaced) {
        stateRef.current.spawnTime += delta;
        const spawnProgress = Math.min(stateRef.current.spawnTime * 2, 1.0); // 0.5s animation
        
        // Slight scale settle animation (bounce damping)
        const easeOutBack = (x) => {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        };
        
        // Only bounce on initial spawn
        if (stateRef.current.spawnTime < 1.0) {
            stateRef.current.scale = stateRef.current.targetScale * easeOutBack(spawnProgress);
        } else {
            // Normal interaction damping
            stateRef.current.scale += (stateRef.current.targetScale - stateRef.current.scale) * 0.1;
        }

        // Cinematic Autofocus Effect (Fake Blur transition using opacity and scale)
        if (containerRef.current && spawnProgress < 1.0) {
          const blurVal = (1.0 - spawnProgress) * 10;
          containerRef.current.style.filter = `blur(${blurVal}px) saturate(${100 + (1.0 - spawnProgress)*50}%)`;
        } else if (containerRef.current) {
          containerRef.current.style.filter = 'none';
        }
        
        // Shadow expansion
        if (shadowMeshRef) {
           shadowMeshRef.material.opacity = Math.min(0.85, shadowMeshRef.material.opacity + 0.05);
        }
      } else {
        // Pre-placement: Invisible
        worldGroup.scale.setScalar(0.001);
      }

      if (stateRef.current.hasPlaced) {
        stateRef.current.positionOffset.lerp(stateRef.current.targetPositionOffset, 0.08);
        worldGroup.scale.setScalar(stateRef.current.scale);
        
        // Subtle ambient drifting motion (Removes continuous 360 rotation)
        const driftX = Math.sin(time * 0.5) * 0.02;
        const driftY = Math.cos(time * 0.4) * 0.015;
        const driftZ = Math.sin(time * 0.3) * 0.01;
        
        // Tiny breathing movement
        const hoverOffset = Math.sin(time * 1.5) * 0.01; 
        
        dishGroup.position.copy(stateRef.current.positionOffset);
        dishGroup.position.x += driftX;
        dishGroup.position.y += hoverOffset + driftY;
        dishGroup.position.z += driftZ;
        
        // Micro parallax shift (slight rotation on axes based on ambient motion)
        dishGroup.rotation.y = Math.sin(time * 0.2) * 0.03;
        dishGroup.rotation.x = Math.cos(time * 0.3) * 0.02;
        
        // Shadow update based on hover
        if (shadowMeshRef && materialRef) {
          const normalizedHeight = Math.max(0, hoverOffset + 0.02); 
          shadowMeshRef.scale.setScalar(1 + normalizedHeight * 2.0);
          shadowMeshRef.material.opacity = Math.max(0.4, 0.85 - normalizedHeight * 5.0);
        }
      }

      // Advanced Gyro Stabilization (Screen-Space Stabilization)
      // Damping heavily so camera moves but object feels stable and anchored
      virtualCamera.current.currentX += (virtualCamera.current.targetX - virtualCamera.current.currentX) * 0.02;
      virtualCamera.current.currentY += (virtualCamera.current.targetY - virtualCamera.current.currentY) * 0.02;

      camera.position.x = virtualCamera.current.currentX;
      camera.position.y = virtualCamera.current.currentY;
      
      // LookAt ensures the object stays anchored while camera orbits
      camera.lookAt(camera.position.x * 0.1, camera.position.y * 0.1, -4);
      
      renderer.render(scene, camera);
    };
    animate();

    const handleOrientation = (e) => {
      if (e.gamma === null || e.beta === null) return;
      
      let moveX = e.gamma / 20; 
      let moveY = (e.beta - 60) / 20; 
      
      // Deadzone filtering
      if (Math.abs(moveX) < 0.05) moveX = 0;
      if (Math.abs(moveY) < 0.05) moveY = 0;

      gyroBuffer.current.x.push(moveX);
      gyroBuffer.current.y.push(-moveY); 
      
      if (gyroBuffer.current.x.length > BUFFER_SIZE) {
        gyroBuffer.current.x.shift();
        gyroBuffer.current.y.shift();
      }

      // Rolling average for absolute stability
      const avgX = gyroBuffer.current.x.reduce((a,b)=>a+b, 0) / gyroBuffer.current.x.length;
      const avgY = gyroBuffer.current.y.reduce((a,b)=>a+b, 0) / gyroBuffer.current.y.length;
      
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      
      virtualCamera.current.targetX = clamp(avgX, -1.0, 1.0);
      virtualCamera.current.targetY = clamp(avgY, -0.5, 0.5); 
    };
    window.addEventListener('deviceorientation', handleOrientation);

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
      
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => {
              if (mat.map) mat.map.dispose();
              mat.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      });
      scene.clear();
      renderer.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [dish.ar_image_url, dish.ar_video_url, performanceClass, isLowEnd, isVideo]);

  const getDistance = (touch1, touch2) => Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

  const handleTouchStart = (e) => {
    if (!stateRef.current.hasPlaced) return;
    stateRef.current.isDragging = true;
    if (e.touches.length === 1) {
      stateRef.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      stateRef.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      stateRef.current.initialScale = stateRef.current.targetScale;
    }
  };

  const handleTouchMove = (e) => {
    if (!stateRef.current.hasPlaced) return;
    e.preventDefault();
    if (e.touches.length === 1 && stateRef.current.lastTouch) {
      const deltaX = e.touches[0].clientX - stateRef.current.lastTouch.x;
      const deltaY = e.touches[0].clientY - stateRef.current.lastTouch.y;
      
      // Constrained panning
      stateRef.current.targetPositionOffset.x += deltaX * 0.005;
      stateRef.current.targetPositionOffset.z += deltaY * 0.005; 
      
      stateRef.current.targetPositionOffset.x = Math.max(-1.5, Math.min(1.5, stateRef.current.targetPositionOffset.x));
      stateRef.current.targetPositionOffset.z = Math.max(-1.5, Math.min(1.5, stateRef.current.targetPositionOffset.z));
      
      stateRef.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && stateRef.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const zoom = currentDistance / stateRef.current.initialDistance;
      stateRef.current.targetScale = Math.max(baseScale * 0.4, Math.min(stateRef.current.initialScale * zoom, baseScale * 2.5));
    }
  };

  const handleTouchEnd = () => {
    stateRef.current.isDragging = false;
    stateRef.current.initialDistance = null;
    stateRef.current.lastTouch = null;
  };

  const handlePlaceDish = () => {
    stateRef.current.hasPlaced = true;
    stateRef.current.spawnTime = 0;
    setPlacementState('placed');
  };

  return (
    <>
      {cameraError ? (
        <div className="ar-camera-fallback-bg" />
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="ar-camera-feed" />
      )}
      
      <div 
        ref={containerRef} 
        className="ar-scene" 
        style={{ zIndex: 2, pointerEvents: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <div className="ar-vignette" />

      <div className="ar-ui-overlay">
        <button className="ar-close-btn" onClick={onClose}><X size={24} /></button>
        
        {placementState === 'waiting' && (
          <div className="ar-onboarding-container">
            <button className="ar-place-button" onClick={handlePlaceDish}>
              Tap to place dish
            </button>
            <div className="ar-watermark">Spatial Dish Experience</div>
          </div>
        )}
        
        {placementState === 'placed' && (
          <div className="ar-instructions">Pinch to scale • Drag to adjust</div>
        )}
      </div>

      {cameraError && placementState === 'waiting' && (
        <div className="ar-camera-error-badge">
          <CameraOff size={16} />
          <span>Camera denied. Showing Immersive View.</span>
        </div>
      )}
    </>
  );
};

export default SpatialDishViewer;

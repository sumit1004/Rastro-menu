import React, { useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { getDevicePerformanceClass } from './arUtils';
import { getImageUrl } from '../services/api';

const CameraARMode = ({ dish, onClose, onCameraError }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const performanceClass = getDevicePerformanceClass();

  // Scale multiplier
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

  // Touch tracking state (refs for Three.js animation loop)
  const interaction = useRef({
    scale: baseScale,
    targetScale: baseScale,
    position: new THREE.Vector3(0, -1, -5),
    targetPosition: new THREE.Vector3(0, -1, -5),
    rotation: 0,
    targetRotation: 0,
    isDragging: false,
    initialDistance: null,
    initialAngle: null,
    lastTouch: null
  });

  const gyro = useRef({
    x: 0, y: 0,
    targetX: 0, targetY: 0
  });

  useEffect(() => {
    let stream = null;
    let isMounted = true;
    
    // 1. Setup Camera Stream
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

    // 2. Setup Three.js
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    // Move camera back slightly to see origin
    camera.position.set(0, 0, 0); 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: performanceClass !== 'low' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    // Geometry Group for Dish
    const dishGroup = new THREE.Group();
    scene.add(dishGroup);

    // Initial settle animation
    dishGroup.position.set(0, 2, -5);
    interaction.current.targetPosition.set(0, -1, -5); // Target settle
    
    // Load Texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    
    textureLoader.load(getImageUrl(dish.ar_image_url), (texture) => {
      // Create Dish Plane
      const geometry = new THREE.PlaneGeometry(3, 3); // Base size
      // Use aspect ratio
      const aspect = texture.image.width / texture.image.height;
      geometry.scale(1, 1/aspect, 1);

      const material = new THREE.MeshLambertMaterial({ 
        map: texture, 
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide
      });
      const dishMesh = new THREE.Mesh(geometry, material);
      // Tabletop tilt (rotate back so it lays flat)
      dishMesh.rotation.x = -Math.PI / 2.5; // ~ -70 degrees
      dishGroup.add(dishMesh);

      // Create Shadow Plane
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);

      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.8
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -0.5; // slightly below dish
      shadowMesh.position.z = -0.2;
      dishGroup.add(shadowMesh);
    });

    // 3. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Lerp positions (inertia)
      interaction.current.scale += (interaction.current.targetScale - interaction.current.scale) * 0.15;
      interaction.current.rotation += (interaction.current.targetRotation - interaction.current.rotation) * 0.15;
      
      interaction.current.position.lerp(interaction.current.targetPosition, 0.1);

      dishGroup.scale.setScalar(interaction.current.scale);
      dishGroup.position.copy(interaction.current.position);
      
      // Floating animation
      const time = clock.getElapsedTime();
      if (!interaction.current.isDragging) {
        dishGroup.position.y += Math.sin(time * 2) * 0.002;
      }

      // Dish local rotation (twisting)
      dishGroup.rotation.y = interaction.current.rotation;

      // Gyroscope Camera Parallax (move camera opposite to gyro target)
      gyro.current.x += (gyro.current.targetX - gyro.current.x) * 0.1;
      gyro.current.y += (gyro.current.targetY - gyro.current.y) * 0.1;

      camera.position.x = gyro.current.x;
      camera.position.y = gyro.current.y;
      camera.lookAt(0, -1, -5);

      renderer.render(scene, camera);
    };
    animate();

    // 4. Device Orientation
    const handleOrientation = (e) => {
      if (performanceClass === 'low') return;
      if (e.gamma === null || e.beta === null) return;
      
      // Limit to max offset
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      
      // Gamma is left/right (-90 to 90)
      const moveX = clamp(e.gamma / 45, -1.5, 1.5);
      // Beta is front/back (normal hold is around 45)
      const moveY = clamp((e.beta - 45) / 45, -1.5, 1.5);

      gyro.current.targetX = moveX;
      gyro.current.targetY = -moveY; // inverse
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
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Cleanup WebGL
      scene.clear();
      renderer.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [dish.ar_image_url, performanceClass, onCameraError]);

  // Touch handlers
  const getDistance = (touch1, touch2) => Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
  const getAngle = (touch1, touch2) => Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);

  const handleTouchStart = (e) => {
    interaction.current.isDragging = true;
    if (e.touches.length === 1) {
      interaction.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      interaction.current.initialDistance = getDistance(e.touches[0], e.touches[1]);
      interaction.current.initialScale = interaction.current.targetScale;
      interaction.current.initialAngle = getAngle(e.touches[0], e.touches[1]);
      interaction.current.initialRotation = interaction.current.targetRotation;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && interaction.current.lastTouch) {
      const deltaX = e.touches[0].clientX - interaction.current.lastTouch.x;
      const deltaY = e.touches[0].clientY - interaction.current.lastTouch.y;
      
      // Map screen delta to world coordinates loosely
      interaction.current.targetPosition.x += deltaX * 0.01;
      interaction.current.targetPosition.y -= deltaY * 0.01;
      
      interaction.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && interaction.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const zoom = currentDistance / interaction.current.initialDistance;
      // bounded scale
      interaction.current.targetScale = Math.max(0.3, Math.min(interaction.current.initialScale * zoom, 3));

      const currentAngle = getAngle(e.touches[0], e.touches[1]);
      const angleDiff = currentAngle - interaction.current.initialAngle;
      // Convert deg to radians for rotation
      interaction.current.targetRotation = interaction.current.initialRotation - (angleDiff * Math.PI / 180);
    }
  };

  const handleTouchEnd = () => {
    interaction.current.isDragging = false;
    interaction.current.initialDistance = null;
    interaction.current.lastTouch = null;
  };

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted className="ar-camera-feed" />
      {/* Three.js Canvas Container */}
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
        <div className="ar-instructions">Pinch to scale • Drag to move • Twist to rotate</div>
        <div className="ar-watermark">Powered by Rastro-menu 3D Engine</div>
      </div>
    </>
  );
};

export default CameraARMode;

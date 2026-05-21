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

  const spriteConfig = useMemo(() => {
    if (dish.ar_asset_type === 'sprite-sheet' && dish.ar_sprite_config) {
      try {
        return typeof dish.ar_sprite_config === 'string' ? JSON.parse(dish.ar_sprite_config) : dish.ar_sprite_config;
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [dish]);

  // Interaction State
  const interaction = useRef({
    scale: baseScale,
    targetScale: baseScale,
    position: new THREE.Vector3(0, -1, -5),
    targetPosition: new THREE.Vector3(0, -1, -5),
    rotationX: -Math.PI / 2.5, // Base tabletop tilt
    targetRotationX: -Math.PI / 2.5,
    rotationY: 0,
    targetRotationY: 0,
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

    // 2. Three.js Scene Setup
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 0); 

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: performanceClass !== 'low' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(2, 6, 4);
    scene.add(dirLight);

    // Group for the entire volumetric object
    const dishGroup = new THREE.Group();
    scene.add(dishGroup);

    // Entry Animation Initial State
    dishGroup.position.set(0, 2, -5);
    interaction.current.targetPosition.set(0, -1, -5);

    // Dynamic Shadow Mesh Ref
    let shadowMeshRef = null;
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    
    textureLoader.load(getImageUrl(dish.ar_image_url), (texture) => {
      let geometry;
      
      if (spriteConfig) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.NearestFilter; // Fix 1: Stop texture bleeding
        texture.magFilter = THREE.NearestFilter;
        texture.repeat.set(1 / spriteConfig.columns, 1 / spriteConfig.rows);
        
        // Fix 2: Correct dynamic aspect ratio
        const frameWidth = texture.image.width / spriteConfig.columns;
        const frameHeight = texture.image.height / spriteConfig.rows;
        const frameAspect = frameWidth / frameHeight;
        geometry = new THREE.PlaneGeometry(3 * frameAspect, 3);
        
        // Fix 6: Frame interpolation setup (2 overlapping planes)
        const materialA = new THREE.MeshLambertMaterial({ 
          map: texture, 
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide
        });
        const materialB = new THREE.MeshLambertMaterial({ 
          map: texture.clone(), 
          transparent: true,
          alphaTest: 0.1,
          side: THREE.DoubleSide
        });
        materialB.map.needsUpdate = true;
        
        const meshA = new THREE.Mesh(geometry, materialA);
        const meshB = new THREE.Mesh(geometry, materialB);
        meshB.position.z = 0.001; // Avoid z-fighting
        
        dishGroup.add(meshA);
        dishGroup.add(meshB);
      } else {
        const aspect = texture.image.width / texture.image.height;
        geometry = new THREE.PlaneGeometry(3, 3);
        geometry.scale(1, 1/aspect, 1);

        // STEP 7: PSEUDO-THICKNESS (Layered Extrusion Illusion)
        const layers = performanceClass === 'low' ? 1 : 5;
        const layerSpacing = 0.015;

        for (let i = 0; i < layers; i++) {
          const isEdge = i > 0 && i < layers - 1;
          const color = isEdge ? 0x888888 : 0xffffff;

          const material = new THREE.MeshLambertMaterial({ 
            map: texture, 
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            color: color
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.z = (i - Math.floor(layers / 2)) * layerSpacing;
          dishGroup.add(mesh);
        }
      }

      dishGroup.rotation.x = interaction.current.rotationX;

      // STEP 9: DYNAMIC SHADOW SYSTEM
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 256;
      shadowCanvas.height = 256;
      const ctx = shadowCanvas.getContext('2d');
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(4.0, 4.0);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.8
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2; // Flat on floor
      shadowMesh.position.y = -0.6; // Below dish
      shadowMesh.position.z = -0.2;
      
      shadowMeshRef = shadowMesh;
      dishGroup.add(shadowMesh);
    });

    // 3. Render & Physics Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Inertia / Damping Interpolation
      interaction.current.scale += (interaction.current.targetScale - interaction.current.scale) * 0.1;
      interaction.current.rotationX += (interaction.current.targetRotationX - interaction.current.rotationX) * 0.1;
      interaction.current.rotationY += (interaction.current.targetRotationY - interaction.current.rotationY) * 0.1;
      interaction.current.position.lerp(interaction.current.targetPosition, 0.08);

      dishGroup.scale.setScalar(interaction.current.scale);
      dishGroup.position.copy(interaction.current.position);
      
      // Floating Idle
      if (!interaction.current.isDragging) {
        dishGroup.position.y += Math.sin(time * 2) * 0.0015;
        // Step 8: Tabletop Anchor (Slowly drift back to center if pushed too far)
        interaction.current.targetPosition.x += (0 - interaction.current.targetPosition.x) * 0.01;
        interaction.current.targetPosition.y += (-1 - interaction.current.targetPosition.y) * 0.01;
      }

      // Apply Rotations
      dishGroup.rotation.x = interaction.current.rotationX;
      
      if (spriteConfig && dishGroup.children.length >= 2) {
        const meshA = dishGroup.children[0];
        const meshB = dishGroup.children[1];
        
        if (meshA.material.map && meshB.material.map) {
          const maxRot = Math.PI / 9; // 20 degrees bounds
          const normalizedRot = Math.max(0, Math.min(1, (interaction.current.rotationY + maxRot) / (maxRot * 2)));
          
          const maxFrameIndex = spriteConfig.columns * spriteConfig.rows - 1;
          const floatFrame = normalizedRot * maxFrameIndex;
          
          const frameIndexA = Math.floor(floatFrame);
          const frameIndexB = Math.min(maxFrameIndex, frameIndexA + 1);
          const blendFactor = floatFrame - frameIndexA;
          
          // Fix 6: Blend opacities
          meshA.material.opacity = 1 - blendFactor;
          meshB.material.opacity = blendFactor;
          
          // Offset A
          const colA = frameIndexA % spriteConfig.columns;
          const rowA = Math.floor(frameIndexA / spriteConfig.columns);
          meshA.material.map.offset.x = colA / spriteConfig.columns;
          meshA.material.map.offset.y = 1 - ((rowA + 1) / spriteConfig.rows);
          
          // Offset B
          const colB = frameIndexB % spriteConfig.columns;
          const rowB = Math.floor(frameIndexB / spriteConfig.columns);
          meshB.material.map.offset.x = colB / spriteConfig.columns;
          meshB.material.map.offset.y = 1 - ((rowB + 1) / spriteConfig.rows);
        }
        
        dishGroup.rotation.y = 0;
      } else {
        dishGroup.rotation.y = interaction.current.rotationY;
      }

      // Dynamic Shadow Morphing (Step 9)
      if (shadowMeshRef) {
        // Counter-rotate shadow to keep it flat on the floor regardless of object rotation
        shadowMeshRef.rotation.x = -Math.PI / 2 - interaction.current.rotationX;
        // Scale shadow slightly as object floats up/down or rotates
        const hoverOffset = Math.max(0, dishGroup.position.y + 1);
        shadowMeshRef.scale.setScalar(1 + hoverOffset * 0.2);
        shadowMeshRef.material.opacity = 0.8 - hoverOffset * 0.3;
      }

      // Step 5 & Fix 3/4: Hybrid Gyro Parallax with extreme damping
      gyro.current.x += (gyro.current.targetX - gyro.current.x) * 0.02;
      gyro.current.y += (gyro.current.targetY - gyro.current.y) * 0.02;

      camera.position.x = gyro.current.x;
      camera.position.y = gyro.current.y;
      camera.lookAt(0, -1, -5); // Keep looking at table anchor

      renderer.render(scene, camera);
    };
    animate();

    // 4. Device Orientation
    const handleOrientation = (e) => {
      if (performanceClass === 'low') return;
      if (e.gamma === null || e.beta === null) return;
      
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
      let moveX = e.gamma / 30;
      let moveY = (e.beta - 45) / 30;
      
      // Fix 3: Deadzones to stabilize anchor
      if (Math.abs(moveX) < 0.05) moveX = 0;
      if (Math.abs(moveY) < 0.05) moveY = 0;
      
      gyro.current.targetX = clamp(moveX, -1.0, 1.0);
      gyro.current.targetY = clamp(-moveY, -1.0, 1.0);
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
      
      scene.clear();
      renderer.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [dish.ar_image_url, performanceClass, onCameraError]);

  // Touch handlers
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
      
      // Step 6: Bounded Rotation
      // Map drag to rotation instead of position for true volumetric feel
      // Limit X to +/- 15 deg from base tabletop angle
      const baseX = -Math.PI / 2.5;
      const rotLimitX = Math.PI / 12; // 15 degrees
      const rotLimitY = Math.PI / 9;  // 20 degrees
      
      let newRotX = interaction.current.targetRotationX + deltaY * 0.005;
      let newRotY = interaction.current.targetRotationY + deltaX * 0.005;

      interaction.current.targetRotationX = Math.max(baseX - rotLimitX, Math.min(baseX + rotLimitX, newRotX));
      interaction.current.targetRotationY = Math.max(-rotLimitY, Math.min(rotLimitY, newRotY));
      
      interaction.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && interaction.current.initialDistance) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const zoom = currentDistance / interaction.current.initialDistance;
      interaction.current.targetScale = Math.max(0.4, Math.min(interaction.current.initialScale * zoom, 2.5));
    }
  };

  const handleTouchEnd = () => {
    interaction.current.isDragging = false;
    interaction.current.initialDistance = null;
    interaction.current.lastTouch = null;
    
    // Auto-return rotation to standard tabletop view slowly
    interaction.current.targetRotationX = -Math.PI / 2.5;
    interaction.current.targetRotationY = 0;
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
        <div className="ar-instructions">Drag to inspect • Pinch to scale</div>
        <div className="ar-watermark">Powered by Rastro-menu 3D Engine</div>
      </div>
    </>
  );
};

export default CameraARMode;

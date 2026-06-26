/**
 * @module Types
 * @description Centralized TypeScript types and interfaces for the AR Engine.
 * Avoids circular dependencies and ensures strict typing (No "any").
 */

export interface ModelMetadata {
  id: string;
  name: string;
  category: string;
  cloudinaryURL: string;
  thumbnailURL: string;
  width: number;
  height: number;
  depth: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  };
  recommendedScale: number;
  recommendedRotation: { x: number; y: number; z: number };
  groundOffset: number;
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  textureCount: number;
  optimized: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngineConfig {
  debugMode: boolean;
  defaultScale: number;
}

export interface DeviceInfo {
  isSupported: boolean;
  os: string;
}

export interface PlacementResult {
  success: boolean;
  position?: { x: number; y: number; z: number };
}

export interface XRSupport {
  isSupported: boolean;
  hitTestSupported: boolean;
  domOverlaySupported: boolean;
}

export interface SessionState {
  isActive: boolean;
  mode: 'ar' | 'inline';
}

export interface GestureState {
  type: 'pinch' | 'pan' | 'rotate';
  active: boolean;
}

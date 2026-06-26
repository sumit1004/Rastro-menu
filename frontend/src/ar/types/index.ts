/**
 * @module Types
 * @description Centralized TypeScript types and interfaces for the AR Engine.
 * Avoids circular dependencies and ensures strict typing (No "any").
 */

export interface ModelMetadata {
  id: string;
  name: string;
  url: string;
  dimensions?: { x: number; y: number; z: number };
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

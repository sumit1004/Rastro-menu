/**
 * @module ARConfig
 * @description Single source of truth for configurable engine parameters.
 * 
 * @dependencies None
 * @notes Architecture scaffolding only.
 */
export const ARConfig = {
  defaultScale: 1.0,
  cacheLimits: {
    maxModels: 10,
    maxMemoryMB: 200
  },
  supportedFormats: ['glb', 'gltf'],
  timeouts: {
    modelLoad: 30000,
    sessionStart: 10000
  },
  renderingQuality: 'high', // low, medium, high
  featureFlags: {
    enableShadows: true,
    enableHitTest: true
  }
};

/**
 * @module SupportMatrix
 * @description Central registry tracking known browser/device quirks.
 * 
 * @dependencies None
 * @notes Architecture scaffolding only. No implementation.
 */
export const SupportMatrix = {
  browsers: {
    chromeAndroid: { supported: true, quirks: [] },
    samsungInternet: { supported: true, quirks: [] },
    edgeAndroid: { supported: true, quirks: [] },
    firefox: { supported: false, quirks: ['No WebXR flag by default'] },
    safari: { supported: true, mode: 'QuickLook' }
  },
  devices: {
    pixel: { profile: 'high' },
    samsung: { profile: 'high' },
    apple: { profile: 'high' }
  }
};

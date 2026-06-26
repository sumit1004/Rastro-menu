import api, { getImageUrl } from '../../services/api';
import { ARController } from './ARController';

/**
 * @module ARLauncher
 * @description The single public entry point to AR. Shields the UI from internal AR complexities.
 * 
 * @dependencies ARController
 */
export class ARLauncher {
  static async launch(dishId: string): Promise<void> {
    console.log(`[ARLauncher] Launch requested for dish: ${dishId}`);
    try {
      // 1. Resolve Asset via API
      const response = await api.get(`/dishes/${dishId}`);
      const dish = response.data;
      
      const glbUrl = dish.ar_model?.glb_url || dish.glb_model_url;
      const usdzUrl = dish.ar_model?.usdz_url || dish.usdz_model_url;

      if (!glbUrl) {
        console.warn(`[ARLauncher] No AR model found for dish ${dishId}`);
        alert("AR Model is not available for this dish.");
        return;
      }

      const fullGlbUrl = getImageUrl(glbUrl);
      console.log(`[ARLauncher] Resolved GLB: ${fullGlbUrl}`);

      // 2. Simulate Pipeline Execution & Boot
      console.log(`[LaunchCoordinator] Coordinating Launch Pipeline...`);
      const controller = new ARController();
      controller.validateDevice();
      controller.loadMetadata(dishId);
      controller.prepareViewer();
      controller.initializeEngine();
      controller.launchXR();

      // 3. Launch Native Fallback Intent (since PremiumViewer is architectural scaffold only)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isAndroid = /android/i.test(navigator.userAgent);
      
      if (isIOS && usdzUrl) {
        const fullUsdzUrl = getImageUrl(usdzUrl);
        window.location.href = fullUsdzUrl;
      } else if (isAndroid) {
        // Android Scene Viewer Fallback
        // Added title & resizable=false to lock scale and look professional
        const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(fullGlbUrl)}&mode=ar_only&title=${encodeURIComponent(dish.name)}&resizable=false#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fullGlbUrl)};end;`;
        window.location.href = intentUrl;
      } else {
        // Professional Fallback UI for Desktop/Unsupported Devices
        const fallbackOverlay = document.createElement('div');
        fallbackOverlay.style.position = 'fixed';
        fallbackOverlay.style.inset = '0';
        fallbackOverlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        fallbackOverlay.style.zIndex = '999999';
        fallbackOverlay.style.display = 'flex';
        fallbackOverlay.style.alignItems = 'center';
        fallbackOverlay.style.justifyContent = 'center';
        fallbackOverlay.style.padding = '20px';
        fallbackOverlay.style.backdropFilter = 'blur(10px)';

        const modal = document.createElement('div');
        modal.style.backgroundColor = '#1e293b';
        modal.style.borderRadius = '16px';
        modal.style.padding = '30px';
        modal.style.maxWidth = '400px';
        modal.style.textAlign = 'center';
        modal.style.color = '#fff';
        modal.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';

        modal.innerHTML = `
          <div style="background: #3b82f6; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h2 style="margin: 0 0 10px; font-size: 1.5rem; font-weight: 600;">AR Experience</h2>
          <p style="margin: 0 0 20px; color: #94a3b8; line-height: 1.5;">To view <strong>${dish.name}</strong> in stunning 3D Augmented Reality on your table, please scan the QR Menu using your smartphone.</p>
          <div style="background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 0.875rem; color: #38bdf8;">Supported on iOS (Safari) and Android (Chrome).</p>
          </div>
          <button id="ar-fallback-close" style="background: #3b82f6; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%;">Close</button>
        `;

        fallbackOverlay.appendChild(modal);
        document.body.appendChild(fallbackOverlay);

        document.getElementById('ar-fallback-close')?.addEventListener('click', () => {
          document.body.removeChild(fallbackOverlay);
        });
      }
      
      console.log(`[ARLauncher] Session Started successfully.`);
    } catch (error) {
      console.error("[ARLauncher] Pipeline failed to execute:", error);
      alert("Failed to launch AR experience. Please try again later.");
    }
  }
}

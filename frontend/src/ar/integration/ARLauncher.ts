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
        const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(fullGlbUrl)}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fullGlbUrl)};end;`;
        window.location.href = intentUrl;
      } else {
        alert("The AR Experience is only available on mobile devices (iOS or Android). Please open this menu on your smartphone.");
      }
      
      console.log(`[ARLauncher] Session Started successfully.`);
    } catch (error) {
      console.error("[ARLauncher] Pipeline failed to execute:", error);
      alert("Failed to launch AR experience. Please try again later.");
    }
  }
}

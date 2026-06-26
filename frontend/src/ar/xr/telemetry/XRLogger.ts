/**
 * @module XRLogger
 * @description Dedicated XR logging wrapping ARLogger for session telemetry.
 * 
 * @dependencies ARLogger
 * @notes Architecture scaffolding only. No implementation.
 */
import { ARLogger } from '../../utils/ARLogger';

export class XRLogger {
  static logSessionStarted(): void {
    ARLogger.info('XR_SESSION_STARTED');
  }

  static logError(error: any): void {
    ARLogger.error('XR_ERROR', error);
  }
}

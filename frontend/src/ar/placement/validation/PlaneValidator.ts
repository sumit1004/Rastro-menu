/**
 * @module PlaneValidator
 * @description Hard rejection system filtering out low-quality surfaces.
 * 
 * @dependencies PlacementCandidate
 * @notes Architecture scaffolding only. No implementation.
 */
import { PlacementCandidate } from '../core/PlacementCandidate';

export class PlaneValidator {
  isValid(candidate: PlacementCandidate): boolean {
    // Scaffold: reject if too small, moving, tilted, low confidence
    return false;
  }
}

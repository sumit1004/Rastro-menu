/**
 * @module AssetManifest
 * @description Structure defining the complete manifest runtime needs without inspecting GLB.
 * 
 * @dependencies ModelMetadata
 * @notes Architecture scaffolding only. No implementation.
 */
import { ModelMetadata } from '../types';

export interface AssetManifest {
  modelUrl: string;
  metadata: ModelMetadata;
  configuration: any;
}

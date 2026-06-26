/**
 * @module ARError
 * @description Centralized custom error classes for robust error handling.
 * 
 * @dependencies None
 * @notes Architecture scaffolding only.
 */
export class ARError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ARError';
  }
}

export class ModelLoadError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'ModelLoadError';
  }
}

export class XRNotSupportedError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'XRNotSupportedError';
  }
}

export class PermissionDeniedError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class PlacementError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'PlacementError';
  }
}

export class CacheError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export class RendererError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'RendererError';
  }
}

export class SceneError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'SceneError';
  }
}

export class TextureError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'TextureError';
  }
}

export class EnvironmentError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

export class SessionCreationError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'SessionCreationError';
  }
}

export class SecureContextError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'SecureContextError';
  }
}

export class UnsupportedBrowserError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedBrowserError';
  }
}

export class RecoveryError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'RecoveryError';
  }
}

export class SurfaceNotFoundError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'SurfaceNotFoundError';
  }
}

export class TrackingLostError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingLostError';
  }
}

export class LowConfidenceError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'LowConfidenceError';
  }
}

export class InvalidSurfaceError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSurfaceError';
  }
}

export class LightingError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'LightingError';
  }
}

export class MaterialError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'MaterialError';
  }
}




export class ToneMappingError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'ToneMappingError';
  }
}

export class OutOfMemoryError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfMemoryError';
  }
}

export class TextureStreamingError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'TextureStreamingError';
  }
}

export class GPUTimeoutError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'GPUTimeoutError';
  }
}

export class CacheFailureError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheFailureError';
  }
}

export class NetworkTimeoutError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkTimeoutError';
  }
}

export class RecoveryFailedError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'RecoveryFailedError';
  }
}

export class PlacementBlockedError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'PlacementBlockedError';
  }
}

export class PlacementFailedError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'PlacementFailedError';
  }
}

export class AnchorLostError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'AnchorLostError';
  }
}

export class GroundAlignmentError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'GroundAlignmentError';
  }
}

export class OrientationError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'OrientationError';
  }
}

export class ScaleCalibrationError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'ScaleCalibrationError';
  }
}

export class TrackingRecoveryError extends ARError {
  constructor(message: string) {
    super(message);
    this.name = 'TrackingRecoveryError';
  }
}

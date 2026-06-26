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

export const isMobileBrowser = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getDevicePerformanceClass = () => {
  // Simple heuristic based on hardware concurrency and memory
  const memory = navigator.deviceMemory || 4; // defaults to 4 if API unavailable
  const cores = navigator.hardwareConcurrency || 4;

  if (memory < 4 || cores < 4) {
    return 'low';
  }
  return 'high';
};

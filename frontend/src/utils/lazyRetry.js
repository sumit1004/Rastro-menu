import React from 'react';

export function lazyRetry(importFn) {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error("Lazy import failed:", error);

      const hasReloaded = sessionStorage.getItem("lazy-retry");

      if (!hasReloaded) {
        sessionStorage.setItem("lazy-retry", "true");
        window.location.reload();
      }

      throw error;
    }
  });
}

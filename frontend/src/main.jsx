import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import * as Sentry from "@sentry/react";

// --- GLOBAL CHUNK FAILURE RECOVERY ---
window.addEventListener("error", (event) => {
  const msg = event?.message || "";

  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed")
  ) {
    console.warn("Chunk load failed. Reloading latest version...");

    // Prevent infinite reload loop
    const hasReloaded = sessionStorage.getItem("chunk-reload");

    if (!hasReloaded) {
      sessionStorage.setItem("chunk-reload", "true");
      window.location.reload();
    }
  }
});

// Clear reload flags on successful load
window.addEventListener("load", () => {
  sessionStorage.removeItem("chunk-reload");
  sessionStorage.removeItem("lazy-retry");
});


Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "", // Replace with actual DSN in .env
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{padding: '2rem', textAlign: 'center'}}><h2>Something went wrong.</h2><p>Our team has been notified.</p></div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

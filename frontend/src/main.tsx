import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';

// Unregister any stale service workers for clean cache state
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

// Clear old caches that might be stale
if ('caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => caches.delete(name));
  });
}

// Load runtime configuration before rendering the app
async function initializeApp() {
  // Prerendered blog pages are served as pure static HTML for SEO.
  // Intentionally skip React mounting so the crawler-facing markup stays
  // lightweight and self-contained — no client-side hydration needed.
  if (
    document
      .querySelector('meta[name="prerender-static-page"]')
      ?.getAttribute('content') === 'blog'
  ) {
    return;
  }

  try {
    await loadRuntimeConfig();
    console.log('Runtime configuration loaded successfully');
  } catch (error) {
    console.warn(
      'Failed to load runtime configuration, using defaults:',
      error
    );
  }

  // Render the app
  createRoot(document.getElementById('root')!).render(<App />);

  // Signal that JS has loaded for CSS transitions
  document.documentElement.classList.add('js-loaded');
}

// Initialize the app
initializeApp();
/**
 * Service Worker Manager
 * Handles service worker registration and cache management for employee dashboard
 */

(function() {
  'use strict';

  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return;
  }

  const CACHE_VERSION = window.CACHE_VERSION || '20251125-1645';
  const REQUIRED_VERSION = 'cls-employee-v19';
  const SESSION_FLAG = 'cache_cleared_v19';

  // Clear old caches immediately on page load
  caches.keys().then(cacheNames => {
    const oldCaches = cacheNames.filter(name =>
      name.startsWith('cls-employee-') && name !== REQUIRED_VERSION
    );

    if (oldCaches.length > 0) {
      Promise.all(oldCaches.map(name => caches.delete(name)))
        .then(() => {
          // Set flag to prevent reload loop
          if (!sessionStorage.getItem(SESSION_FLAG)) {
            sessionStorage.setItem(SESSION_FLAG, 'true');
            window.location.reload();
          }
        });
    }
  });

  // Register the service worker
  navigator.serviceWorker.register('service-worker-employee.js?v=' + CACHE_VERSION)
    .then(registration => {


      // Force immediate update check on page load
      registration.update();

      // Auto-reload when new service worker takes control
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        }
      });
    })
    .catch(err => console.error('❌ SW registration failed:', err));

  // Listen for controller change (new SW took over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

})();

const CACHE_NAME = "cls-admin-v2";
const ASSETS = [
  "./adminDashboard.html",
  "./style.css",
  "./admin.js",
  "./manifest.json",
  "./assets/CLS-favicon.png"
];

// Install event
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Activate event: remove old caches automatically
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch event
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

const CACHE_NAME = "cls-admin-v2";
const ASSETS = [
  "./adminDashboard.html",
  "./style.css",
  "./admin.js",
  "./manifest.json",
  "./assets/CLS-favicon.png"
];

// Install: cache assets
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Fetch: serve cached or fetch new
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

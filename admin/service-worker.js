const CACHE_NAME = "cls-admin-v1";
const ASSETS = [
  "./adminDashboard.html",
  "./style.css",
  "./admin.js",
  "./manifest.json",
  "../assets/CLS-favicon.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

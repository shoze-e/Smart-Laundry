const CACHE_NAME = 'laundry-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/planner.html',
  '/forecast.html',
  '/calendar.html',
  '/compare.html',
  '/simulator.html',
  '/history.html',
  '/how-it-works.html',
  '/about.html',
  '/css/style.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/planner.js',
  '/js/forecast-view.js',
  '/js/calendar-view.js',
  '/js/comparison.js',
  '/js/simulator.js',
  '/js/history-view.js',
  '/js/ui.js',
  '/js/theme.js',
  '/js/weather.js',
  '/js/storage.js',
  '/js/laundry.js',
  '/js/drying-score.js',
  '/js/drying-time.js',
  '/js/forecast.js',
  '/js/notifications.js',
  '/js/utils.js',
  '/data/locations.js',
  '/data/fabrics.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  // Try network first, fallback to cache for offline capabilities
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache local static assets dynamically, not the weather API
        if (event.request.url.includes(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), return from cache
        return caches.match(event.request);
      })
  );
});

const CACHE_NAME = 'driving-game-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/mobile.css',
  '/css/virtual-joystick.css',
  '/js/audio.js',
  '/js/game.js',
  '/js/mobile-controls.js',
  '/js/mobile-hud-optimized.js',
  '/js/mobile-config.js',
  '/js/mobile-touch-enhanced.js',
  '/js/joystick-demo.js',
  '/js/environment.js',
  '/js/vehicle.js',
  '/js/terrain.js',
  '/js/objects.js',
  '/js/particles.js',
  '/js/physics.js',
  '/js/multiplayer.js',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
}); 
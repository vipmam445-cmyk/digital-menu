const CACHE_NAME = 'elshaday-static-v2';
const IMAGE_CACHE = 'elshaday-images-v1';
const ASSET_CACHE = 'elshaday-assets-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  const isImage = path.match(/\.(png|jpg|jpeg|svg|webp|avif|ico)$/i);
  const isStaticAsset = path.match(/\/_next\/static\/.+\.(js|css)$/);
  const isFont = path.match(/\.(woff2?|ttf|otf|eot)$/i);

  if (isStaticAsset || isFont) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE));
    return;
  }

  if (isImage) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.open(cacheName).then(c => c.match(request));
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

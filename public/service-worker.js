// Service Worker for Boardie PWA
const CACHE_NAME = 'boardie-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching Files');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  
  // Claim clients to ensure the service worker controls all clients
  event.waitUntil(self.clients.claim());
  
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle share target requests
  if (url.pathname === '/share-target/') {
    event.respondWith(handleShareTarget(event));
    return;
  }
  
  // Regular fetch handling - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to cache it and return it
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});

// Handle share target requests
async function handleShareTarget(event) {
  const url = new URL(event.request.url);
  const sharedUrl = url.searchParams.get('url');
  const sharedTitle = url.searchParams.get('title');
  const sharedText = url.searchParams.get('text');
  
  // Extract URL from text if no URL was provided
  let finalUrl = sharedUrl;
  if (!finalUrl && sharedText) {
    // Simple URL extraction regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = sharedText.match(urlRegex);
    if (matches && matches.length > 0) {
      finalUrl = matches[0];
    }
  }
  
  // Open the app if it's not already open
  const allClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  let client;
  
  if (allClients.length > 0) {
    client = allClients[0];
    await client.focus();
  } else {
    client = await self.clients.openWindow('/');
  }
  
  // Wait for the client to be ready
  setTimeout(() => {
    // Send the shared data to the client
    if (client && finalUrl) {
      client.postMessage({
        type: 'share-target',
        url: finalUrl,
        title: sharedTitle || '',
        text: sharedText || ''
      });
    }
  }, 1000);
  
  // Redirect to the app
  return Response.redirect('/', 303);
}

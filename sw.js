const CACHE_NAME = 'reportapp-v1';
const APP_SHELL = [
    './',
    './index.html',
    './app.js',
    './InventarioDB.js',
    './css/inventario.css',
    './offline.html',
    './images/icon-192.png',
    './images/icon-512.png'
];

self.addEventListener('install', event => {
    console.log('SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching App Shell');
                return cache.addAll(APP_SHELL);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('SW: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (APP_SHELL.includes(url.pathname) || 
        event.request.destination === 'style' || 
        event.request.destination === 'script' ||
        event.request.destination === 'image') {
        
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log('SW: Serving from cache:', event.request.url);
                        return response;
                    }
                    return fetch(event.request)
                        .then(response => {
                            return caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, response.clone());
                                    return response;
                                });
                        });
                })
                .catch(() => {
                    if (event.request.destination === 'document') {
                        return caches.match('/offline.html');
                    }
                })
        );
    } 
    else if (event.request.url.includes('/reports') || event.request.url.includes('/api')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    }
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});
// Caches the app shell so the web version keeps working offline once it has
// been opened over HTTPS or localhost. The iOS app never registers this: a
// custom-scheme page is not a secure context, so navigator.serviceWorker is
// absent and my-clock.js skips registration.
//
// Bump the version whenever a cached file changes, or people keep the old one.
const cacheName = 'go-clock-v2.0.18';

const appShell = [
    './',
    './index.html',
    './my-clock.css',
    './my-clock.js',
    './go-clock.js',
    './board.js',
    './faces.js',
    './planner.js',
    './physics.js',
    './stone-dom.js',
    './placement.js',
    './moves.js',
    './sweep.js',
    './hand.js',
    './flight.js',
    './sounds.js',
    './manifest.webmanifest',
    './images/goban_1200.jpg',
    './images/black_stone1_160.png',
    './images/white_stone0_160.png',
    './images/white_stone1_160.png',
    './images/white_stone2_160.png',
    './images/white_stone3_160.png',
    './images/wood1.jpg',
    './images/wood2.jpg',
    './images/stone1.jpg',
    './images/mosaic1.jpg',
    './images/grass.jpg',
    './images/droplets.jpg',
    './images/space.jpg',
    './images/paper_texture.jpg',
    './images/touch-icon.png',
    './images/icon-192.png',
    './images/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheName)
            .then((cache) => cache.addAll(appShell))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// Code and markup: network first, so a deploy is picked up on the next load,
// falling back to the cache when offline. Images: cache first, since they
// never change without a rename and are the bulk of the download.
self.addEventListener('fetch', (event) => {
    const {request} = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
        return;
    }

    const isImage = request.destination === 'image';
    event.respondWith(isImage ? cacheFirst(request) : networkFirst(request));
});

async function networkFirst(request) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request, {ignoreSearch: true});
        if (cached) {
            return cached;
        }
        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
        cache.put(request, response.clone());
    }
    return response;
}

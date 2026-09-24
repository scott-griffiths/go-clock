// Caches the app shell so the web version keeps working offline once it has
// been opened over HTTPS or localhost. The iOS app never registers this: a
// custom-scheme page is not a secure context, so navigator.serviceWorker is
// absent and my-clock.js skips registration.
//
// Bump the version whenever a cached file changes, or people keep the old one.
const cacheName = 'go-clock-v2.0.54';

const appShell = [
    './',
    './index.html',
    './my-clock.css',
    './my-clock.js',
    './go-clock.js',
    './board.js',
    './faces.js',
    './icons.js',
    './planner.js',
    './physics.js',
    './stone-dom.js',
    './placement.js',
    './moves.js',
    './magic.js',
    './sweep.js',
    './hand.js',
    './flight.js',
    './sounds.js',
    './replay.js',
    './sgf.js',
    './water.js',
    './games/dosaku-tengen.sgf',
    './games/dosaku-santetsu-1683.sgf',
    './games/genjo-chitoku-jigo.sgf',
    './games/chitoku-genjo-1815.sgf',
    './games/jowa-genjo-1815.sgf',
    './games/blood-vomiting.sgf',
    './games/shuwa-gennan-1840.sgf',
    './games/shuwa-gennan-1842.sgf',
    './games/ear-reddening.sgf',
    './games/shusaku-castle-1.sgf',
    './games/shusaku-castle-4.sgf',
    './games/shusaku-castle-6.sgf',
    './games/shusaku-castle-8.sgf',
    './games/shusaku-castle-10.sgf',
    './games/shusaku-castle-13.sgf',
    './games/shusaku-castle-16.sgf',
    './games/shusaku-castle-19.sgf',
    './games/shusai-karigane-1926.sgf',
    './games/go-seigen-shusai.sgf',
    './games/shusai-retirement.sgf',
    './games/go-seigen-kitani-7-dan.sgf',
    './games/go-seigen-kitani-fever.sgf',
    './games/go-seigen-kitani-kamakura-8.sgf',
    './games/honinbo-1941.sgf',
    './games/go-seigen-fujisawa-1944.sgf',
    './games/atomic-bomb.sgf',
    './games/go-seigen-fujisawa-1952.sgf',
    './games/go-seigen-sakata-1954.sgf',
    './games/go-seigen-takagawa-1956.sgf',
    './games/honinbo-1961.sgf',
    './games/meijin-1965.sgf',
    './games/honinbo-1971.sgf',
    './games/meijin-1975.sgf',
    './games/meijin-1976.sgf',
    './games/kisei-1977.sgf',
    './games/meijin-1980.sgf',
    './games/kisei-1982.sgf',
    './games/kisei-1983.sgf',
    './games/judan-1984.sgf',
    './games/honinbo-1985.sgf',
    './games/kisei-1987.sgf',
    './games/meijin-1988.sgf',
    './games/ing-cup-1989.sgf',
    './games/honinbo-1990.sgf',
    './games/kisei-1996.sgf',
    './games/fujitsu-cup-1996.sgf',
    './games/chunlan-cup-1999.sgf',
    './games/lg-cup-2009.sgf',
    './games/meijin-2009.sgf',
    './games/alphago-fan-hui-1.sgf',
    './games/alphago-lee-sedol-1.sgf',
    './games/alphago-lee-sedol-2.sgf',
    './games/alphago-lee-sedol-3.sgf',
    './games/alphago-lee-sedol-4.sgf',
    './games/alphago-lee-sedol-5.sgf',
    './games/master-ke-jie.sgf',
    './games/alphago-ke-jie-2.sgf',
    './games/samsung-cup-2020.sgf',
    './games/honinbo-2023.sgf',
    './manifest.webmanifest',
    './images/goban_1200.jpg',
    './images/black_stone1_160.png',
    './images/white_stone0_160.png',
    './images/white_stone1_160.png',
    './images/white_stone2_160.png',
    './images/white_stone3_160.png',
    './images/mahogany.jpg',
    './images/walnut.jpg',
    './images/turf.jpg',
    './images/ice.jpg',
    './images/water.jpg',
    './images/space.jpg',
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

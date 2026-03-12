const CACHE_NAME = 'localshare-v1'

const CACHE_FILES = [
    '/',
    '/index.html',
    '/manifest.json'
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  )
})

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request)
        })
    )
})
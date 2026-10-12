// Service worker: keeps the field tools usable with poor or no signal.
//
// - Pages the technician visits (the toolkit, emergency mode) are saved after a successful load and
//   shown from the saved copy only when the network fails. A normal load always asks the server first,
//   so a saved page can never be older than the last time the person was online.
// - Hashed build files and the OCR engine never change under the same address, so they are served from the
//   saved copy once fetched.
// - Nothing from /api is ever saved or intercepted: data always comes from the server.
//
// Saved pages are removed when the person signs out (see logout() in lib/auth.tsx).
const VERSION = 'v2';
const STATIC_CACHE = `coolpro-static-${VERSION}`;
const PAGE_CACHE = `coolpro-pages-${VERSION}`;
const PRECACHE = ['/manifest.webmanifest', '/emergency-safety/en.json', '/emergency-safety/fr.json'];
const SAVED_PAGES = ['/field-toolkit', '/emergency-mode'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isSavedPage(url) {
  return SAVED_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`));
}

async function networkThenSaved(request, url) {
  try {
    const response = await fetch(request);
    // Save only a real page, not a redirect to the sign-in page or an error.
    if (response.ok && !response.redirected && isSavedPage(url)) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(new Request(url.pathname), response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(PAGE_CACHE);
    const saved = await cache.match(new Request(url.pathname)) ?? (await cache.match(new Request('/field-toolkit')));
    if (saved) return saved;
    throw error;
  }
}

async function savedThenNetwork(request) {
  const cache = await caches.open(STATIC_CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkThenSaved(request, url));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/ocr/') || url.pathname.startsWith('/emergency-safety/')) {
    event.respondWith(savedThenNetwork(request));
  }
});

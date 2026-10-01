/* Intercom service worker — keeps the app itself on the phone so it opens instantly,
   even with weak or no signal. Audio, pairing and relay requests always go to the network.
   The pages are fetched fresh when online (so updates arrive on their own), with the saved
   copy as a fallback after 3 s or when offline. Talkback (talk.html) is saved too, so it opens
   with no internet at all. */
const CACHE = 'intercom-v2';            // bump only if you change this file's caching rules
const SHELL = ['./', 'index.html', 'talk.html', 'peerjs.min.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;     // relay, pairing server, CDNs: network only
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(pageFirstFromNetwork(req));
  } else {
    e.respondWith(savedThenRefresh(req, e));
  }
});

// A page: newest from the network, saved copy if the network is slow (3 s) or offline.
async function pageFirstFromNetwork(req){
  const cache = await caches.open(CACHE);
  const name = /talk\.html$/.test(new URL(req.url).pathname) ? 'talk.html' : 'index.html';   // each page saved under its own name
  const fresh = fetch(req, { cache: 'no-store' }).then(r => {
    if (r.ok) cache.put(name, r.clone());
    return r;
  });
  try {
    return await Promise.race([fresh, new Promise((_, no) => setTimeout(() => no('slow'), 3000))]);
  } catch {
    return (await cache.match(name)) || fresh.catch(() => Response.error());
  }
}

// Icons, library, manifest: saved copy right away, refreshed in the background.
async function savedThenRefresh(req, e){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const fresh = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
  if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
  return fresh;
}

/* BERMO TRACKER service worker — offline support + notifications */
const CACHE = "bermo-tracker-v12";
const ASSETS = [
  "/tracker/",
  "/tracker/index.html",
  "/tracker/styles.css",
  "/tracker/app.js",
  "/tracker/data.js",
  "/tracker/vendor/chart.umd.js",
  "/tracker/manifest.json",
  "/favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/tracker/";
  e.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(list => {
      for(const c of list){
        if(c.url.includes("/tracker/") && "focus" in c) return c.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // Same-origin: NETWORK-FIRST for HTML / CSS / JS so updates ship instantly.
  // Cache-first for images and the manifest (rarely change).
  if(url.origin === self.location.origin){
    const isAsset = /\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/i.test(url.pathname);
    if(isAsset){
      e.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
          if(res && res.ok && res.type === "basic"){
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => caches.match("/tracker/")))
      );
      return;
    }
    // HTML / CSS / JS: try network, fall back to cache only if offline.
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.ok && res.type === "basic"){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match("/tracker/")))
    );
    return;
  }
  // Cross-origin (fonts, Chart.js CDN): network with cache fallback
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});

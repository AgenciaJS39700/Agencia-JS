/* sw.js — modo app (PWA) de las demos de Agencia JS.
   Páginas y código: primero la red (siempre lo último) y, sin conexión, la copia guardada.
   Imágenes: primero la copia (carga instantánea). Vídeos y /api/ no pasan por aquí.
   Al publicar cambios grandes, sube VERSION para limpiar las copias antiguas. */
var VERSION = "v1";
var CACHE = "ajs-" + new URL(self.registration.scope).pathname.replace(/[^a-z0-9]+/gi, "-") + VERSION;
var CORE = ["./", "index.html", "manifest.webmanifest", "appkit.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  var pre = CACHE.slice(0, -VERSION.length);
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf(pre) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || r.headers.has("range") || /\/api\//.test(u.pathname) || /\.(mp4|webm)$/.test(u.pathname)) return;
  if (r.mode === "navigate" || /\.(js|css|json|webmanifest|html)$/.test(u.pathname)) {
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
      return res;
    }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match("./"); }); }));
    return;
  }
  if (/\.(webp|png|jpe?g|svg|avif|gif|woff2?)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(function (m) {
      return m || fetch(r).then(function (res) { if (res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); } return res; });
    }));
  }
});

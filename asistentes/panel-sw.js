// /asistentes/panel-sw.js — Service worker del panel de citas (se sirve en /panel/sw.js, alcance /panel/).
// Solo recibe los avisos push de citas nuevas y abre el panel al tocarlos. No guarda nada en caché.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { title: "Citas", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Nueva cita", {
    body: d.body || "", tag: d.tag || "cita", renotify: true, icon: "/apple-touch-icon.png", badge: "/favicon.png",
    data: { url: d.url || "/panel/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/panel/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
    for (const w of ws) if (w.url.startsWith(url) && "focus" in w) { w.postMessage("recargar"); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});

// Service worker: la app instalada siempre carga la última versión cuando hay internet
// y sigue abriendo (con lo último que vio) cuando no hay conexión.
const CACHE = "gosaryc-v117";
const PRECARGA = ["/", "/icono-app.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(PRECARGA.map((u) => c.add(u).catch(() => undefined)))),
  );
  self.skipWaiting();
  void avisarVersionNueva();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith("gosaryc-lecturas")).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data === "saltar-espera" || e.data === "buscar-version") self.skipWaiting();
});

// Avisa a las páginas abiertas cuando ya hay archivos nuevos descargados.
async function avisarVersionNueva() {
  try {
    const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clientes) c.postMessage("version-nueva");
  } catch {
    /* sin ventanas */
  }
}

const esRecurso = (p) => /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(p) || p.startsWith("/assets/");

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // la base de datos nunca se cachea aquí
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/lovable/")) return;

  // Páginas: primero internet (siempre la versión más nueva), y si falla, la guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }

  // Archivos de la app: rápido desde la copia y se actualiza en segundo plano.
  if (esRecurso(url.pathname)) {
    e.respondWith(
      caches.match(req).then((guardado) => {
        const red = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
          .catch(() => guardado);
        return guardado || red;
      }),
    );
  }
});

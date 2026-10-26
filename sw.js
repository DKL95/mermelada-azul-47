/* ============================================================
   Service worker: permite jugar sin internet.
   Estrategia "red primero": si hay internet se baja lo más nuevo
   (cómodo mientras desarrollamos); si no, se usa la copia guardada.
   Cambia VERSION_CACHE cuando publiques una versión nueva.
   ============================================================ */
const VERSION_CACHE = 'creperia-v43';

// Archivos mínimos para que el juego arranque sin conexión
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/ui.css',
  './css/escenas.css',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/ui.js',
  './js/audio.js',
  './js/cocina.js',
  './js/venta.js',
  './js/clientes.js',
  './js/plancha.js',
  './js/turno.js',
  './js/calificacion.js',
  './js/dibujos.js',
  './js/tienda.js',
  './js/romance.js',
  './js/tutorial.js',
  './js/ranking.js',
  './js/cartera.js',
  './js/genero.js',
  './js/personaje.js',
  './js/boutique.js',
  './js/escenario.js',
  './js/local.js',
  './js/sinfin.js',
  './js/plataforma.js',
  './js/teclado.js',
  './js/idioma.js',
  './js/idiomas/en.js',
  './js/idiomas/fr.js',
  './js/idiomas/pt.js',
  './js/idiomas/de.js',
  './js/idiomas/ja.js',
  './js/idiomas/ko.js',
  './js/data/local.js',
  './js/data/personaje.js',
  './js/data/eventos.js',
  './js/data/logros.js',
  './js/data/ingredientes.js',
  './js/data/clientes.js',
  './js/data/mensajes.js',
  './js/data/mejoras.js',
  './assets/icono.svg',
  './assets/icono-maskable.svg',
  './assets/apple-touch-icon.png',
  './assets/icono-192.png',
  './assets/icono-512.png',
  './assets/icono-maskable-512.png',
  // Fuentes (Fredoka y Caveat)
  './assets/fuentes/fredoka-latin.woff2',
  './assets/fuentes/fredoka-latin-ext.woff2',
  './assets/fuentes/caveat-latin.woff2',
  './assets/fuentes/caveat-latin-ext.woff2',
];

self.addEventListener('install', (e) => {
  // Se guardan uno por uno: si alguno falla (ej. sin internet), los demás sí quedan
  e.waitUntil(caches.open(VERSION_CACHE).then((c) => Promise.all(ARCHIVOS.map((a) => c.add(a).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Borra cachés de versiones anteriores
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== VERSION_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // La tabla en línea siempre va directo a internet (nada de copias viejas)
  if (new URL(e.request.url).hostname.endsWith('.supabase.co')) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        // Guarda una copia (incluye la fuente de Google para usarla offline)
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const copia = resp.clone();
          caches.open(VERSION_CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

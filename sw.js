// DayFlow Service Worker — offline + atualização automática
const CACHE = 'dayflow-v7';
const ASSETS = [
  'dayflow.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {})   // não falha a instalação se algum asset faltar
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // só gerencia arquivos do próprio app (mesma origem); APIs Gemini/OCR passam direto
  if (url.origin !== location.origin) return;

  const isShell = req.mode === 'navigate' || url.pathname.endsWith('dayflow.html');

  if (isShell) {
    // network-first: pega a versão mais nova; offline cai no cache
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('dayflow.html', cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('dayflow.html')))
    );
    return;
  }

  // demais assets do app: cache-first
  e.respondWith(caches.match(req).then(m => m || fetch(req)));
});

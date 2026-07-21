/* 復習マネージャー用 Service Worker
   index.html と同じフォルダに置いてホスティングしてください（HTTPS または localhost）。
   起動時にアプリ本体をキャッシュし、以後はオフラインでも開けるようにします。 */
const CACHE_NAME = 'review-app-v1';
const APP_SHELL_URL = self.registration.scope; // index.html を指す（例: https://example.com/app/）

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL_URL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNavigation = event.request.mode === 'navigate';

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          // opaque = クロスオリジン(Googleフォント等)のレスポンス。中身は見えないがキャッシュ自体は可能
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached || (isNavigation ? cache.match(APP_SHELL_URL) : undefined));

      // キャッシュがあれば即座に返し、裏側で最新版に更新（stale-while-revalidate）
      return cached || networkFetch;
    })
  );
});

const CACHE_NAME = "procrastination-detector-precache-v1";
const RUNTIME_CACHE_NAME = "procrastination-detector-runtime-v1";

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/maskable-icon-192x192.png",
  "/maskable-icon-512x512.png",
    "/_next/static/chunks/00fczrxtygvpx.js",
  "/_next/static/chunks/0298m-n-9346d.js",
  "/_next/static/chunks/06u37ocscqzx8.js",
  "/_next/static/chunks/09mq2juwfo7rt.css",
  "/_next/static/chunks/0cz1d0mv5g_q7.js",
  "/_next/static/chunks/0h5lviho1s509.js",
  "/_next/static/chunks/0ha4m18glnjqn.js",
  "/_next/static/chunks/0i1vj9smc0h7t.js",
  "/_next/static/chunks/0pc3t95n1b68_.js",
  "/_next/static/chunks/0pg2rat1hnpyf.js",
  "/_next/static/chunks/19o4ky7w5ag2j.js",
  "/_next/static/chunks/1jb_uyis72uu9.js",
  "/_next/static/chunks/1skl5irqnyyfl.js",
  "/_next/static/chunks/2gw6e81owfzjs.js",
  "/_next/static/chunks/2u2m3en8rdrsd.js",
  "/_next/static/chunks/2zjueh7t2vecu.js",
  "/_next/static/chunks/35w9yeb174ngm.js",
  "/_next/static/chunks/38wmnkrujnmbn.js",
  "/_next/static/chunks/3bumi90uxn865.js",
  "/_next/static/chunks/3hgqwupewclvy.js",
  "/_next/static/chunks/3jqxp69s3rq9c.js",
  "/_next/static/chunks/3ohkq0k0jul_t.js",
  "/_next/static/chunks/3tte7lhlvfih6.js",
  "/_next/static/chunks/turbopack-1h43lcwuxbk0s.js",
  "/_next/static/media/0acc7fdf55eb3220-s.p.3oprs0vbfre0x.woff2",
  "/_next/static/media/13bf9871fe164e7f-s.2f7nqdagzwx2-.woff2",
  "/_next/static/media/1bffadaabf893a1e-s.3-6t-g6q0vh0a.woff2",
  "/_next/static/media/2bbe8d2671613f1f-s.0k62hbripvv8p.woff2",
  "/_next/static/media/2c55a0e60120577a-s.0-dom-5bn10r2.woff2",
  "/_next/static/media/3fe682a82f50d426-s.0vfdmo25voy_0.woff2",
  "/_next/static/media/5476f68d60460930-s.2uwcyprjm3xu3.woff2",
  "/_next/static/media/70bc3e132a0a741e-s.p.3t6q91iet4nsy.woff2",
  "/_next/static/media/71b036adf157cdcf-s.0bp8oijd_gu96.woff2",
  "/_next/static/media/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2",
  "/_next/static/media/89b21bb081cb7469-s.1fby2rem9ngyr.woff2",
  "/_next/static/media/9c72aa0f40e4eef8-s.1y4-pdgsjb-pw.woff2",
  "/_next/static/media/ad66f9afd8947f86-s.3lvt2whj97whp.woff2",
  "/_next/static/media/apple-icon.3voww315n6cs5.png",
  "/_next/static/media/cc545e633e20c56d-s.176arc174-8zp.woff2",
  "/_next/static/media/favicon.1q9a16tiwwm9y.ico",
  "/_next/static/media/icon.1cse111nqpmnf.png",
  "/_next/static/sF7_dFeNKRghstW1BwAYV/_buildManifest.js",
  "/_next/static/sF7_dFeNKRghstW1BwAYV/_clientMiddlewareManifest.js",
  "/_next/static/sF7_dFeNKRghstW1BwAYV/_ssgManifest.js",
  "/battle.jpg",
  "/ego.jpg",
  "/enemy.jpg",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/fear.jpg",
  "/file.svg",
  "/flow.jpg",
  "/globe.svg",
  "/next.svg",
  "/potential.jpg",
  "/reflection-new.jpg",
  "/reflection.jpg",
  "/sanctuary.jpg",
  "/sisyphus.jpg",
  "/sword-horizontal.png",
  "/sword.jpg",
  "/the-enemy-demon.jpg",
  "/the-enemy-suit.jpg",
  "/vercel.svg",
  "/window.svg",
];

// Check if request url matches Clerk or private API endpoints to bypass cache
const EXCLUDE_FROM_CACHE = [
  /clerk/i,
  /\/__clerk/i,
  /\/api\/dashboard/i,
  /\/api\/tasks/i,
  /\/api\/habits/i,
  /\/api\/flow-history/i,
  /\/api\/focus-sessions/i,
  /\/api\/lock-in/i,
  /\/api\/analytics/i,
  /\/api\/anti-procrastination/i
];

function shouldBypassCache(url) {
  return EXCLUDE_FROM_CACHE.some((pattern) => pattern.test(url));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Pre-caching core assets");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME && cache !== RUNTIME_CACHE_NAME) {
              console.log("Service Worker: Clearing old cache:", cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = request.url;

  // Only handle HTTP/HTTPS protocols (avoid chrome-extension issues)
  if (!url.startsWith("http")) return;

  // Bypass cache completely for Clerk authentication & private dashboard APIs
  if (shouldBypassCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML page navigations (navigate mode or accepts text/html)
  if (request.mode === "navigate" || (request.headers.get("accept") && request.headers.get("accept").includes("text/html"))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, clone and store in runtime cache (only if not a dynamic/dashboard route)
          const isDashboardOrAuth = url.includes("/dashboard") || url.includes("/auth");
          if (response.status === 200 && !isDashboardOrAuth) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fetch fails, check cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, serve the offline page fallback
            return caches.match("/offline");
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, Fonts, Images)
  const isStaticAsset = 
    url.includes("/_next/static/") ||
    url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|otf|json)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((err) => {
          console.error("Fetch failed for static asset:", url, err);
          return new Response("Asset offline", { status: 408 });
        });
      })
    );
    return;
  }

  // Fallback default strategy: Network-First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

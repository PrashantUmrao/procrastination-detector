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
  "/maskable-icon-192.png",
  "/maskable-icon-512.png",
  /* GENERATED_PRECACHE_ASSETS */
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

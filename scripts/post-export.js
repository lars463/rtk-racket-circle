/**
 * Post-export script:
 * 1. Injects a service worker registration + update checker
 * 2. Injects PWA + iOS home-screen meta tags (apple-touch-icon, theme-color)
 * 3. Copies apple-touch-icon.png and manifest.json to dist/
 * 4. Creates the service worker file
 * 5. Copies index.html to 404.html (GitHub Pages SPA routing)
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const assetsDir = path.join(__dirname, '..', 'assets', 'images');
const BUILD_ID = Date.now().toString();

let html = fs.readFileSync(indexPath, 'utf-8');

// 1. Register service worker and poll for updates every 60 seconds
const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        var refreshing = false;
        navigator.serviceWorker.register('/sw.js').then(function(reg) {
          // Check for updates every 60 seconds
          setInterval(function() { reg.update(); }, 60000);
        });
        // When a NEW SW takes over (not first install), reload once
        navigator.serviceWorker.addEventListener('controllerchange', function() {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      }
    </script>`;

html = html.replace('</head>', `${swScript}\n  </head>`);

// 2. Inject PWA + iOS home-screen meta tags
const pwaTags = `
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="RTK Racket Circle">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#2E7D32">`;

html = html.replace('</head>', `${pwaTags}\n  </head>`);

// 2b. Add viewport-fit=cover so iOS PWA respects the home-indicator safe area
// (without this, env(safe-area-inset-bottom) returns 0 and the tab bar
//  overlaps the home indicator)
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover">'
);

fs.writeFileSync(indexPath, html);

// 3. Copy apple-touch-icon to dist root
const appleIconSrc = path.join(assetsDir, 'apple-touch-icon.png');
if (fs.existsSync(appleIconSrc)) {
  fs.copyFileSync(appleIconSrc, path.join(distDir, 'apple-touch-icon.png'));
  console.log('  - apple-touch-icon.png copied');
}

// 3b. Copy club-hero.jpg with stable name so we can reference it from CSS
const clubHeroSrc = path.join(assetsDir, 'club-hero.jpg');
if (fs.existsSync(clubHeroSrc)) {
  fs.copyFileSync(clubHeroSrc, path.join(distDir, 'club-hero.jpg'));
  console.log('  - club-hero.jpg copied');
}

// 3c. Inject CSS that fills the iOS home-indicator safe area with the
// trees image. RN-Web does not always read env(safe-area-inset-bottom)
// reliably, so we add a fixed positioned strip via CSS that always uses
// the real env() value at runtime.
//
// IMPORTANT: high z-index so it sits ON TOP of the tab bar's own white
// background that may extend into the safe area on iOS PWA. Pointer-events
// none so it doesn't block taps on tab buttons (which sit ABOVE the safe
// area zone, so they aren't covered by this strip anyway).
const safeAreaCSS = `
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background-color: #2E7D32;
      }
      /* Fill the iOS PWA bottom safe-area (home indicator strip) with the
         trees image. Anchored to the absolute viewport bottom and given
         a high z-index so it covers any white tab-bar background that
         extends into the safe area. */
      body::after {
        content: '';
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        /* env() returns the actual safe area on iOS PWA. We add 8px and
           use a 40px minimum to ensure the strip fully covers the gap
           between the tab bar and the absolute screen bottom — RN's tab
           bar background sometimes extends slightly past the safe area
           but the strip needs to cover any leftover white. */
        height: max(40px, calc(env(safe-area-inset-bottom, 0px) + 8px));
        background-image: url(/club-hero.jpg);
        background-position: center bottom;
        background-size: cover;
        background-repeat: no-repeat;
        z-index: 9999;
        pointer-events: none;
      }
    </style>`;

html = html.replace('</head>', `${safeAreaCSS}\n  </head>`);

// 4. Generate manifest.json for PWA install prompt
const manifest = {
  name: 'RTK Racket Circle',
  short_name: 'RTK',
  description: 'Roskilde Tennis Klubs erhvervsnetværk',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#2E7D32',
  theme_color: '#2E7D32',
  icons: [
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    { src: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('  - manifest.json generated');

// 2. Create service worker that caches with network-first strategy
const sw = `
var CACHE_NAME = 'rtk-v${BUILD_ID}';

self.addEventListener('install', function(event) {
  // Activate immediately, don't wait
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Delete old caches
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // For HTML requests: always go to network first
  var accept = event.request.headers.get('accept') || '';
  if (event.request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // For JS/CSS with hash in filename: cache forever (they are immutable)
  if (url.pathname.match(/\\.[a-f0-9]{8,}\\./)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network first, cache fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
`;

fs.writeFileSync(path.join(distDir, 'sw.js'), sw.trim());

// 3. Copy index.html to 404.html for SPA routing
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

// 4. Copy CNAME for custom domain
const cnameSrc = path.join(__dirname, '..', 'public', 'CNAME');
if (fs.existsSync(cnameSrc)) {
  fs.copyFileSync(cnameSrc, path.join(distDir, 'CNAME'));
  console.log('  - CNAME copied for custom domain');
}

console.log('✅ Post-export complete (build: ' + BUILD_ID + ')');
console.log('  - Service worker with auto-update polling (60s)');
console.log('  - Network-first for HTML, immutable cache for hashed assets');
console.log('  - 404.html for SPA routing');

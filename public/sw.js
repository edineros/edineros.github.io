// Service Worker for PWA auto-updates

// Install: activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim all clients (triggers controllerchange on clients)
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

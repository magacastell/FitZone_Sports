import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
// Sólo recursos estáticos del build. Nunca se cachean API, JWT, fotos ni POST.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener('fetch',event=>{
  if(event.request.mode==='navigate' && new URL(event.request.url).origin===self.location.origin && !new URL(event.request.url).pathname.startsWith('/api/'))
    event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html',{ignoreSearch:true})));
});
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

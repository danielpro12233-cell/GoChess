/* Gochess service worker: the app opens offline (play Fisher, review games). Bump VERSION to force an update. */
var VERSION='gochess-v3',SHELL=['/','/index.html','/css/app.css','/favicon.svg','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png',
 '/js/engine.js','/js/coach-tl.js','/js/coach.js','/js/engines.js','/js/openings.js','/js/insight.js','/js/analysis-tl.js','/js/analysis.js','/js/netdb.js','/js/app.js','/js/engine-worker.js'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){});}));}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==VERSION;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  /* only our own files: never the API (live games), ads, fonts or sign-in */
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.indexOf('/api/')===0)return;
  if(r.mode==='navigate'){ /* pages: network first, so updates arrive; cached copy when offline */
    e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(VERSION).then(function(c){c.put('/index.html',cp);});return res;}).catch(function(){return caches.match('/index.html');}));
    return;
  }
  /* files: cached copy at once, refreshed in the background */
  e.respondWith(caches.match(r).then(function(hit){
    var net=fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(VERSION).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return hit;});
    return hit||net;
  }));
});

/*
 * Gochess server. Created by Daniel M Reyes.
 * Zero dependencies (Node 18+). Serves the web app and keeps rooms, players and the leaderboard.
 *   node server/server.js            -> http://localhost:3000
 *   PORT=8080 node server/server.js
 * Live updates use Server-Sent Events, so it works behind ordinary HTTP hosting and proxies.
 */
'use strict';
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = +process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 64 * 1024, MAX_DOC = 32 * 1024, MAX_DOCS = 20000;
const PATH_RE = /^[A-Za-z0-9_\-.~:@+]{1,200}(\/[A-Za-z0-9_\-.~:@+]{1,200}){0,15}$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/* ---------- store ---------- */
const docs = new Map();      // path -> object
const leases = new Map();    // path -> {holder, exp}
const subs = new Set();      // {res, kind, path, q}
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    Object.keys(raw).forEach(k => docs.set(k, raw[k]));
    console.log('Loaded ' + docs.size + ' documents');
  }
} catch (e) { console.error('Could not read data file:', e.message); }

let saveT = null;
function scheduleSave() {
  if (saveT) return;
  saveT = setTimeout(() => {
    saveT = null;
    const obj = {}; docs.forEach((v, k) => { obj[k] = v; });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(obj), err => { if (!err) fs.rename(tmp, DATA_FILE, () => {}); });
  }, 800);
}
function clean(v, depth) {
  depth = depth || 0;
  if (depth > 12) throw err('invalid_argument', 'too deep');
  if (Array.isArray(v)) return v.map(x => clean(x, depth + 1));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) { if (BAD_KEYS.has(k)) continue; o[k] = clean(v[k], depth + 1); }
    return o;
  }
  if (typeof v === 'function' || typeof v === 'undefined') return null;
  return v;
}
function merge(base, patch) {
  const out = Object.assign({}, base);
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = merge(out[k], pv);
    else out[k] = pv;
  }
  return out;
}
function err(code, message) { const e = new Error(message || code); e.code = code; return e; }
function checkPath(p, kind) {
  if (typeof p !== 'string' || !PATH_RE.test(p) || p.split('/').some(x => x === '.' || x === '..')) throw err('invalid_argument', 'bad path');
  const segs = p.split('/').length;
  if (kind === 'doc' && segs % 2 !== 0) throw err('invalid_argument', 'document paths have an even number of segments');
  if (kind === 'col' && segs % 2 !== 1) throw err('invalid_argument', 'collection paths have an odd number of segments');
}
function colOf(p) { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i); }

/* ---------- queries ---------- */
function cmp(a, op, b) {
  switch (op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
    case 'in': return Array.isArray(b) && b.includes(a);
    case 'not-in': return Array.isArray(b) && !b.includes(a);
    case 'array-contains': return Array.isArray(a) && a.includes(b);
  }
  return false;
}
function runQuery(col, q) {
  q = q || {};
  let rows = [];
  const prefix = col + '/';
  docs.forEach((data, p) => {
    if (p.startsWith(prefix) && p.indexOf('/', prefix.length) < 0) rows.push({ id: p.slice(prefix.length), data });
  });
  (q.where || []).slice(0, 10).forEach(w => {
    rows = rows.filter(r => cmp(r.data[w[0]], w[1], w[2]));
  });
  if (q.orderBy) {
    const f = q.orderBy[0], dir = q.orderBy[1] === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const x = a.data[f], y = b.data[f];
      if (x === undefined && y === undefined) return 0;
      if (x === undefined) return 1;
      if (y === undefined) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  } else rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const lim = Math.max(1, Math.min(1000, +q.limit || 1000));
  return rows.slice(0, lim);
}

/* ---------- live subscriptions ---------- */
function send(sub) {
  let payload;
  if (sub.kind === 'doc') payload = { data: docs.has(sub.path) ? docs.get(sub.path) : null };
  else payload = { rows: runQuery(sub.path, sub.q) };
  try { sub.res.write('event: snap\ndata: ' + JSON.stringify(payload) + '\n\n'); } catch (e) { subs.delete(sub); }
}
function notify(p) {
  const col = colOf(p);
  subs.forEach(s => { if ((s.kind === 'doc' && s.path === p) || (s.kind === 'col' && s.path === col)) send(s); });
}

/* ---------- housekeeping ---------- */
setInterval(() => {
  const now = Date.now(), changed = [];
  docs.forEach((d, p) => {
    if (!p.startsWith('games/') || p.split('/').length !== 2) return;
    const age = now - (d.updated || d.created || 0);
    if ((d.status === 'finished' && age > 10 * 60 * 1000) || (d.status === 'waiting' && age > 60 * 60 * 1000) || age > 24 * 3600 * 1000) changed.push(p);
  });
  changed.forEach(p => { docs.delete(p); notify(p); });
  if (changed.length) scheduleSave();
  leases.forEach((l, p) => { if (l.exp < now) leases.delete(p); });
}, 60 * 1000).unref();

/* ---------- rate limit ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 10000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 200;
}
setInterval(() => { const now = Date.now(); hits.forEach((a, k) => { if (!a.length || now - a[a.length - 1] > 20000) hits.delete(k); }); }, 30000).unref();

/* ---------- operations ---------- */
function op(b) {
  switch (b.op) {
    case 'get': checkPath(b.path, 'doc'); return { data: docs.has(b.path) ? docs.get(b.path) : null };
    case 'set': {
      checkPath(b.path, 'doc');
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw err('invalid_argument', 'body must be an object');
      const d = clean(b.data);
      if (JSON.stringify(d).length > MAX_DOC) throw err('invalid_argument', 'document too large');
      if (!docs.has(b.path) && docs.size >= MAX_DOCS) throw err('quota_exceeded', 'database is full');
      docs.set(b.path, d); notify(b.path); scheduleSave(); return {};
    }
    case 'update': {
      checkPath(b.path, 'doc');
      if (!docs.has(b.path)) throw err('invalid_argument', 'document does not exist');
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw err('invalid_argument', 'body must be an object');
      const d = merge(docs.get(b.path), clean(b.data));
      if (JSON.stringify(d).length > MAX_DOC) throw err('invalid_argument', 'document too large');
      docs.set(b.path, d); notify(b.path); scheduleSave(); return {};
    }
    case 'delete': checkPath(b.path, 'doc'); if (docs.delete(b.path)) { notify(b.path); scheduleSave(); } return {};
    case 'query': checkPath(b.path, 'col'); return { rows: runQuery(b.path, b.query) };
    case 'acquire': {
      checkPath(b.path, 'doc');
      const now = Date.now(), ttl = Math.min(600000, Math.max(1000, +b.ttlMs || 30000)), l = leases.get(b.path);
      if (l && l.exp > now && l.holder !== String(b.holder)) return { acquired: false, expiresAt: new Date(l.exp).toISOString() };
      leases.set(b.path, { holder: String(b.holder), exp: now + ttl });
      return { acquired: true, holder: String(b.holder), expiresAt: new Date(now + ttl).toISOString() };
    }
  }
  throw err('invalid_argument', 'unknown op');
}

/* ---------- http ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };
/* Cross-origin isolation lets the multi-thread Stockfish use SharedArrayBuffer. Set GC_ISOLATE=0 to turn it off. */
const ISOLATE = process.env.GC_ISOLATE !== '0';
const ZIPPABLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.wasm', '.txt']);
function json(res, status, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : (ext === '.wasm' ? 'public, max-age=86400' : 'public, max-age=3600'), 'X-Content-Type-Options': 'nosniff', 'Vary': 'Accept-Encoding' };
    if (ISOLATE) { h['Cross-Origin-Opener-Policy'] = 'same-origin'; h['Cross-Origin-Embedder-Policy'] = 'require-corp'; h['Cross-Origin-Resource-Policy'] = 'same-origin'; }
    const gz = ZIPPABLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && st.size > 1024;
    if (gz) h['Content-Encoding'] = 'gzip'; else h['Content-Length'] = st.size;
    res.writeHead(200, h);
    if (req.method === 'HEAD') return res.end();
    const rs = fs.createReadStream(file);
    rs.on('error', () => res.destroy());
    if (gz) rs.pipe(zlib.createGzip({ level: 1 })).pipe(res); else rs.pipe(res);
  });
}
const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true), ip = req.socket.remoteAddress || '?';
  try {
    if (u.pathname === '/api/health') return json(res, 200, { ok: true, name: 'Gochess', author: 'Daniel M Reyes' });
    if (u.pathname === '/api/db' && req.method === 'POST') {
      if (limited(ip)) return json(res, 429, { code: 'resource_exhausted', message: 'slow down' });
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) { req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        try { json(res, 200, op(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))); }
        catch (e) { json(res, e.code ? 400 : 400, { code: e.code || 'invalid_argument', message: e.message }); }
      });
      return;
    }
    if (u.pathname === '/api/stream' && req.method === 'GET') {
      const kind = u.query.kind === 'col' ? 'col' : 'doc';
      checkPath(u.query.path, kind);
      let q = {}; if (u.query.q) { try { q = JSON.parse(u.query.q); } catch (e) { q = {}; } }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 2000\n\n');
      const sub = { res, kind, path: u.query.path, q };
      subs.add(sub); send(sub);
      const ka = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 25000);
      req.on('close', () => { clearInterval(ka); subs.delete(sub); });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(req, res, u.pathname);
  } catch (e) {
    json(res, 400, { code: e.code || 'invalid_argument', message: e.message });
  }
});
server.listen(PORT, () => console.log('Gochess is running at http://localhost:' + PORT + '  (created by Daniel M Reyes)'));
function bye() { const obj = {}; docs.forEach((v, k) => { obj[k] = v; }); try { fs.writeFileSync(DATA_FILE, JSON.stringify(obj)); } catch (e) {} process.exit(0); }
process.on('SIGINT', bye); process.on('SIGTERM', bye);

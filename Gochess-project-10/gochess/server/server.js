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
const https = require('https');
const crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..', 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const MAX_BODY = 64 * 1024, MAX_DOC = 32 * 1024, MAX_DOCS = 20000;
const PATH_RE = /^[A-Za-z0-9_\-.~:@+]{1,200}(\/[A-Za-z0-9_\-.~:@+]{1,200}){0,15}$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/* ---------- config ---------- */
/* Google sign-in needs an OAuth "Web client ID" (see README). Set GOOGLE_CLIENT_ID, or put {"googleClientId":"..."} in config.json. */
let GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
if (!GOOGLE_CLIENT_ID) {
  for (const f of [path.join(__dirname, '..', 'config.json'), path.join(DATA_DIR, 'config.json')]) {
    try { if (fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.googleClientId) { GOOGLE_CLIENT_ID = String(c.googleClientId).trim(); break; } } } catch (e) { console.error('Bad config file ' + f + ': ' + e.message); }
  }
}
const TOKENINFO_URL = process.env.GC_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
const SESSION_DAYS = 90;

/* ---------- store ---------- */
const docs = new Map();      // path -> object
const leases = new Map();    // path -> {holder, exp}
const subs = new Set();      // {res, kind, path, q}
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  /* Load the main file; if it is missing or damaged, fall back to the last good copy, then to the daily snapshots. */
  let restored = false;
  const candidates = [DATA_FILE, DATA_FILE + '.bak'];
  try { fs.readdirSync(BACKUP_DIR).filter(f => /^db-.*\.json$/.test(f)).sort().reverse().forEach(f => candidates.push(path.join(BACKUP_DIR, f))); } catch (e) {}
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
      Object.keys(raw).forEach(k => docs.set(k, raw[k]));
      console.log('Loaded ' + docs.size + ' documents from ' + path.basename(f));
      if (f !== DATA_FILE) { console.log('The main data file was missing or damaged, so the data was restored from ' + path.basename(f)); restored = true; }
      break;
    } catch (e) {
      console.error('Could not read ' + f + ': ' + e.message);
      try { fs.renameSync(f, f + '.corrupt-' + Date.now()); } catch (e2) {}   /* keep the damaged file for inspection, never overwrite it */
    }
  }
  if (restored) setTimeout(() => writeAll(true), 0);   /* put the main file back right away */
} catch (e) { console.error('Could not prepare the data folder:', e.message); }

function snapshotName() { return 'db-' + new Date().toISOString().slice(0, 10) + '.json'; }
function dailySnapshot() {
  try {
    const target = path.join(BACKUP_DIR, snapshotName());
    if (!fs.existsSync(target) && fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, target);
    const all = fs.readdirSync(BACKUP_DIR).filter(f => /^db-.*\.json$/.test(f)).sort();
    all.slice(0, Math.max(0, all.length - 14)).forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (e) {} });   /* keep two weeks */
  } catch (e) {}
}
function writeAll(sync) {
  const obj = {}; docs.forEach((v, k) => { obj[k] = v; });
  const data = JSON.stringify(obj), tmp = DATA_FILE + '.tmp';
  if (sync) {
    try { fs.writeFileSync(tmp, data); try { fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak'); } catch (e) {} fs.renameSync(tmp, DATA_FILE); } catch (e) { console.error('Save failed:', e.message); }
    return;
  }
  fs.writeFile(tmp, data, err => {
    if (err) { console.error('Save failed:', err.message); return; }
    fs.copyFile(DATA_FILE, DATA_FILE + '.bak', () => { fs.rename(tmp, DATA_FILE, e => { if (e) console.error('Save failed:', e.message); else dailySnapshot(); }); });
  });
}
let saveT = null;
function scheduleSave() {
  if (saveT) return;
  saveT = setTimeout(() => { saveT = null; writeAll(false); }, 800);
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
/* Accounts and sessions are private; the public leaderboard (lb) can be read by anyone but only the server writes it. */
const NO_READ = new Set(['accounts', 'sessions']), NO_WRITE = new Set(['accounts', 'sessions', 'lb']);
function guard(p, write) {
  const top = String(p).split('/')[0];
  if (NO_READ.has(top) || (write && NO_WRITE.has(top))) throw err('permission_denied', 'not allowed');
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
  let expired = 0;
  docs.forEach((d, p) => { if (p.startsWith('sessions/') && now - d.created > SESSION_DAYS * 86400000) { docs.delete(p); expired++; } });
  if (expired) scheduleSave();
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
    case 'get': checkPath(b.path, 'doc'); guard(b.path, false); return { data: docs.has(b.path) ? docs.get(b.path) : null };
    case 'set': {
      checkPath(b.path, 'doc'); guard(b.path, true);
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw err('invalid_argument', 'body must be an object');
      const d = clean(b.data);
      if (JSON.stringify(d).length > MAX_DOC) throw err('invalid_argument', 'document too large');
      if (!docs.has(b.path) && docs.size >= MAX_DOCS) throw err('quota_exceeded', 'database is full');
      docs.set(b.path, d); notify(b.path); scheduleSave(); return {};
    }
    case 'update': {
      checkPath(b.path, 'doc'); guard(b.path, true);
      if (!docs.has(b.path)) throw err('invalid_argument', 'document does not exist');
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data)) throw err('invalid_argument', 'body must be an object');
      const d = merge(docs.get(b.path), clean(b.data));
      if (JSON.stringify(d).length > MAX_DOC) throw err('invalid_argument', 'document too large');
      docs.set(b.path, d); notify(b.path); scheduleSave(); return {};
    }
    case 'delete': checkPath(b.path, 'doc'); guard(b.path, true); if (docs.delete(b.path)) { notify(b.path); scheduleSave(); } return {};
    case 'query': checkPath(b.path, 'col'); guard(b.path, false); return { rows: runQuery(b.path, b.query) };
    case 'acquire': {
      checkPath(b.path, 'doc'); guard(b.path, true);
      const now = Date.now(), ttl = Math.min(600000, Math.max(1000, +b.ttlMs || 30000)), l = leases.get(b.path);
      if (l && l.exp > now && l.holder !== String(b.holder)) return { acquired: false, expiresAt: new Date(l.exp).toISOString() };
      leases.set(b.path, { holder: String(b.holder), exp: now + ttl });
      return { acquired: true, holder: String(b.holder), expiresAt: new Date(now + ttl).toISOString() };
    }
  }
  throw err('invalid_argument', 'unknown op');
}


/* ---------- accounts (Sign in with Google) ---------- */
function cleanName(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18); }
function int(v, lo, hi, d) { v = Math.round(+v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
function verifyGoogle(idToken) {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) return reject(err('failed_precondition', 'Google sign-in is not set up on this server'));
    if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 4096) return reject(err('invalid_argument', 'bad credential'));
    const lib = TOKENINFO_URL.startsWith('https') ? https : http;
    const req = lib.get(TOKENINFO_URL + '?id_token=' + encodeURIComponent(idToken), r => {
      let d = '';
      r.on('data', c => { d += c; if (d.length > 20000) req.destroy(); });
      r.on('end', () => {
        let j; try { j = JSON.parse(d); } catch (e) { return reject(err('unauthenticated', 'Google sign-in failed')); }
        if (r.statusCode !== 200 || !j) return reject(err('unauthenticated', 'Google did not accept the sign-in'));
        const okIss = j.iss === 'accounts.google.com' || j.iss === 'https://accounts.google.com';
        if (j.aud !== GOOGLE_CLIENT_ID || !okIss || !j.sub || !(+j.exp * 1000 > Date.now()) || !(j.email_verified === true || j.email_verified === 'true')) return reject(err('unauthenticated', 'This Google sign-in is not valid for Gochess'));
        resolve({ sub: String(j.sub), email: String(j.email || ''), name: String(j.given_name || j.name || ''), picture: String(j.picture || '') });
      });
    });
    req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    req.on('error', () => reject(err('unavailable', 'Could not reach Google')));
  });
}
function profileOf(sub, withEmail) {
  const a = docs.get('accounts/' + sub) || {}, l = docs.get('lb/' + sub) || {};
  const p = { sub, name: l.name || a.name || 'Player', picture: a.picture || '', elo: l.elo || 1000, games: l.games || 0, w: l.w || 0, l: l.l || 0, d: l.d || 0 };
  if (withEmail) p.email = a.email || '';
  return p;
}
function publishLb(sub, st, name) {
  const a = docs.get('accounts/' + sub) || {};
  const old = docs.get('lb/' + sub) || {};
  const doc = { name: cleanName(name) || old.name || cleanName(a.name) || 'Player', picture: a.picture || '', elo: st.elo, games: st.games, w: st.w, l: st.l, d: st.d, t: Date.now() };
  docs.set('lb/' + sub, doc); notify('lb/' + sub); scheduleSave();
}
function newSession(sub) {
  const tok = crypto.randomBytes(24).toString('hex');
  docs.set('sessions/' + tok, { sub, created: Date.now() }); scheduleSave();
  return tok;
}
function sessionOf(req) {
  const m = /^Bearer ([a-f0-9]{48})$/.exec(req.headers['authorization'] || '');
  if (!m) throw err('unauthenticated', 'sign in again');
  const s = docs.get('sessions/' + m[1]);
  if (!s || Date.now() - s.created > SESSION_DAYS * 86400000) throw err('unauthenticated', 'sign in again');
  return { token: m[1], sub: s.sub };
}
function readJson(req, cb) {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
  req.on('end', () => { let b; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return cb(err('invalid_argument', 'bad json')); } cb(null, b); });
}
const STATUS = { unauthenticated: 401, permission_denied: 403, failed_precondition: 412, unavailable: 503 };
function handleAuth(req, res, pathname) {
  const done = (e, obj) => e ? json(res, STATUS[e.code] || 400, { code: e.code || 'invalid_argument', message: e.message }) : json(res, 200, obj);
  if (pathname === '/api/auth/me') {
    try { const s = sessionOf(req); return done(null, { profile: profileOf(s.sub, true) }); } catch (e) { return done(e); }
  }
  readJson(req, (e0, b) => {
    if (e0) return done(e0);
    if (pathname === '/api/auth/google') {
      verifyGoogle(b.credential).then(g => {
        const key = 'accounts/' + g.sub, first = !docs.has(key), loc = b.local || {};
        const prev = docs.get(key) || {};
        docs.set(key, { sub: g.sub, email: g.email, name: prev.name || cleanName(g.name) || 'Player', picture: g.picture, created: prev.created || Date.now(), last: Date.now() });
        if (first && !docs.has('lb/' + g.sub)) {
          /* a brand-new account keeps the progress the player already made as a guest */
          const games = int(loc.games, 0, 100000, 0), w = int(loc.w, 0, games, 0), l = int(loc.l, 0, games - w, 0), d = int(loc.d, 0, games - w - l, 0);
          publishLb(g.sub, { elo: int(loc.elo, 100, 3200, 1000), games, w, l, d }, cleanName(loc.name) || cleanName(g.name));
        } else publishLb(g.sub, docs.get('lb/' + g.sub) || { elo: 1000, games: 0, w: 0, l: 0, d: 0 }, null);
        scheduleSave();
        done(null, { token: newSession(g.sub), profile: profileOf(g.sub, true), created: first });
      }).catch(done);
      return;
    }
    if (pathname === '/api/account/save') {
      try {
        const s = sessionOf(req), cur = profileOf(s.sub, false);
        const games = int(b.games, cur.games, 100000, cur.games), w = int(b.w, 0, games, cur.w), l = int(b.l, 0, games - w, cur.l), d = int(b.d, 0, games - w - l, cur.d);
        let elo = int(b.elo, 100, 3200, cur.elo);
        if (games === cur.games) elo = cur.elo;                        /* the rating only moves when a game was played */
        else elo = Math.max(cur.elo - 120, Math.min(cur.elo + 120, elo)); /* and only by a believable amount per save */
        publishLb(s.sub, { elo, games, w, l, d }, b.name);
        return done(null, { profile: profileOf(s.sub, true) });
      } catch (e) { return done(e); }
    }
    if (pathname === '/api/auth/logout') {
      try { const s = sessionOf(req); docs.delete('sessions/' + s.token); scheduleSave(); } catch (e) {}
      return done(null, {});
    }
    done(err('invalid_argument', 'unknown endpoint'));
  });
}

/* ---------- http ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };
/* Cross-origin isolation (needed only by a multi-thread Stockfish build) blocks third-party scripts such as Google sign-in and ads,
   so it is OFF by default. Set GC_ISOLATE=1 only if you install the multi-thread engine and use neither of those. */
const ISOLATE = process.env.GC_ISOLATE === '1';
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
    const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': (ext === '.html' || path.basename(file) === 'sw.js' || ext === '.webmanifest') ? 'no-cache' : (ext === '.wasm' ? 'public, max-age=86400' : 'public, max-age=3600'), 'X-Content-Type-Options': 'nosniff', 'Vary': 'Accept-Encoding' };
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
    if (u.pathname === '/api/config') return json(res, 200, { googleClientId: GOOGLE_CLIENT_ID || null });
    if (u.pathname.startsWith('/api/auth/') || u.pathname === '/api/account/save') {
      if (limited(ip)) return json(res, 429, { code: 'resource_exhausted', message: 'slow down' });
      if (u.pathname === '/api/auth/me' ? req.method !== 'GET' : req.method !== 'POST') { res.writeHead(405); return res.end(); }
      return handleAuth(req, res, u.pathname);
    }
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
      checkPath(u.query.path, kind); guard(u.query.path, false);
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
function bye() { writeAll(true); process.exit(0); }
process.on('SIGINT', bye); process.on('SIGTERM', bye);

// AmazonList API — family wishlists stored in Cloudflare KV.
// Kids use the family code; parent actions require the parent PIN.
// Nothing here can buy, add to cart, or touch anyone's Amazon account.

const ALLOWED_ORIGINS = [
  'https://keubanks16.github.io',
  'http://localhost:8787',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATUSES = ['Requested', 'Approved', 'Purchased', 'Declined'];
const MAX_ITEMS = 500;
const MAX_CHILDREN = 12;
const LOCK_AFTER = 5; // wrong PINs
const LOCK_MS = 15 * 60 * 1000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Parent-Pin',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      const status = e.status || 500;
      return json({ error: status === 500 ? 'Server error' : e.message }, status, cors);
    }
  },
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
async function body(req) {
  try {
    return await req.json();
  } catch {
    fail('Invalid JSON');
  }
}
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

async function route(req, env) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean); // api, f, CODE, ...
  if (parts[0] !== 'api') return json({ ok: true, app: 'AmazonList API' });

  if (parts[1] === 'family' && req.method === 'POST') return createFamily(req, env);
  if (parts[1] === 'resolve' && req.method === 'POST') {
    const b = await body(req);
    return json({ url: await resolveAmazon(clean(b.url, 2000)) });
  }
  if (parts[1] !== 'f' || !parts[2]) fail('Not found', 404);

  const code = parts[2].toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) fail('Family not found', 404);
  const key = 'fam:' + code;
  const fam = await env.KV.get(key, 'json');
  if (!fam) fail('Family not found', 404);
  const save = () => env.KV.put(key, JSON.stringify(fam));
  const pub = () => ({ children: fam.children, items: fam.items, updated: fam.updated });
  const [, , , res, id] = parts;

  // ---------- Kid (family code only) ----------
  if (!res && req.method === 'GET') return json(pub());

  if (res === 'items' && !id && req.method === 'POST') {
    const b = await body(req);
    const child = clean(b.child, 50);
    if (!fam.children.includes(child)) fail('Pick who is shopping');
    const name = clean(b.name, 140);
    if (!name) fail('Give the item a name');
    const link = await resolveAmazon(clean(b.url, 2000));
    if (fam.items.length >= MAX_ITEMS) fail('List is full — ask a parent to clear old items');
    if (fam.items.some(x => x.child === child && x.url === link && x.status !== 'Declined'))
      fail('That item is already on your list');
    const item = {
      id: crypto.randomUUID(),
      child,
      name,
      url: link,
      note: clean(b.note, 200),
      priority: [1, 2, 3].includes(b.priority) ? b.priority : 2,
      status: 'Requested',
      added: Date.now(),
    };
    fam.items.unshift(item);
    fam.updated = Date.now();
    await save();
    return json({ item, ...pub() });
  }

  if (res === 'items' && id && req.method === 'DELETE' && !req.headers.get('X-Parent-Pin')) {
    const item = fam.items.find(x => x.id === id);
    if (!item) fail('Not found', 404);
    if (item.status !== 'Requested') fail('Only a parent can remove that one now', 403);
    fam.items = fam.items.filter(x => x.id !== id);
    fam.updated = Date.now();
    await save();
    return json(pub());
  }

  // ---------- Parent (PIN required) ----------
  await checkPin(req, fam, save);

  if (res === 'auth' && req.method === 'POST') return json({ ok: true, ...pub() });

  if (res === 'items' && id && req.method === 'PATCH') {
    const b = await body(req);
    const item = fam.items.find(x => x.id === id);
    if (!item) fail('Not found', 404);
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) fail('Bad status');
      item.status = b.status;
    }
    if (b.parentNote !== undefined) item.parentNote = clean(b.parentNote, 200);
    fam.updated = Date.now();
    await save();
    return json(pub());
  }

  if (res === 'items' && id && req.method === 'DELETE') {
    fam.items = fam.items.filter(x => x.id !== id);
    fam.updated = Date.now();
    await save();
    return json(pub());
  }

  if (res === 'children' && req.method === 'PUT') {
    const b = await body(req);
    if (!Array.isArray(b.children)) fail('Bad list');
    const kids = [...new Set(b.children.map(c => clean(c, 50)).filter(Boolean))].slice(0, MAX_CHILDREN);
    if (!kids.length) fail('Add at least one kid');
    // Rename support: { renames: { old: new } }
    if (b.renames && typeof b.renames === 'object') {
      for (const it of fam.items) {
        const to = b.renames[it.child];
        if (typeof to === 'string' && kids.includes(clean(to, 50))) it.child = clean(to, 50);
      }
    }
    fam.children = kids;
    fam.updated = Date.now();
    await save();
    return json(pub());
  }

  if (res === 'pin' && req.method === 'PUT') {
    const b = await body(req);
    const pin = String(b.pin ?? '');
    if (!/^\d{4,8}$/.test(pin)) fail('PIN must be 4–8 digits');
    Object.assign(fam, await hashPin(pin));
    await save();
    return json({ ok: true });
  }

  fail('Not found', 404);
}

async function createFamily(req, env) {
  const b = await body(req);
  const pin = String(b.pin ?? '');
  if (!/^\d{4,8}$/.test(pin)) fail('PIN must be 4–8 digits');
  const kids = Array.isArray(b.children)
    ? [...new Set(b.children.map(c => clean(c, 50)).filter(Boolean))].slice(0, MAX_CHILDREN)
    : [];
  if (!kids.length) fail('Add at least one kid');
  let code;
  for (let i = 0; i < 5; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    code = [...bytes].map(x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
    if (!(await env.KV.get('fam:' + code))) break;
  }
  const fam = { children: kids, items: [], created: Date.now(), updated: Date.now(), ...(await hashPin(pin)) };
  await env.KV.put('fam:' + code, JSON.stringify(fam));
  return json({ code, children: fam.children, items: [], updated: fam.updated });
}

// ---------- PIN hashing + lockout ----------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function derive(pin, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 60000 }, keyMat, 256));
}
async function hashPin(pin) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, pinHash: await derive(pin, salt), fails: 0, lockUntil: 0 };
}
async function checkPin(req, fam, save) {
  const pin = req.headers.get('X-Parent-Pin') || '';
  if (fam.lockUntil && fam.lockUntil > Date.now()) fail('Too many wrong PINs. Try again in 15 minutes.', 429);
  if (!/^\d{4,8}$/.test(pin) || (await derive(pin, fam.salt)) !== fam.pinHash) {
    fam.fails = (fam.fails || 0) + 1;
    if (fam.fails >= LOCK_AFTER) {
      fam.fails = 0;
      fam.lockUntil = Date.now() + LOCK_MS;
    }
    await save();
    fail('Wrong PIN', 401);
  }
  if (fam.fails) {
    fam.fails = 0;
    await save();
  }
}

// ---------- Amazon link handling ----------
const isAmazonHost = h => /(^|\.)amazon\.com$/i.test(h) || /^(a\.co|amzn\.to|amzn\.com|www\.amzn\.com)$/i.test(h);
function asinFrom(u) {
  const m = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}
async function resolveAmazon(raw) {
  const found = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (!found) fail('Paste an Amazon link');
  let u;
  try {
    u = new URL(found[0]);
  } catch {
    fail('That link doesn’t look right');
  }
  for (let hop = 0; hop < 6; hop++) {
    if (!isAmazonHost(u.hostname)) fail('Only Amazon.com links work here');
    const asin = asinFrom(u);
    if (asin && /amazon\.com$/i.test(u.hostname)) return 'https://www.amazon.com/dp/' + asin;
    // Short links (a.co / amzn.to) — follow the redirect without loading the page.
    const r = await fetch(u.toString(), { method: 'GET', redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 AmazonList' } });
    const loc = r.headers.get('Location');
    if (!loc) break;
    u = new URL(loc, u);
  }
  fail('Couldn’t find the product in that link. Open the item on Amazon and copy its link.');
}

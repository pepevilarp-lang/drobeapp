// Supabase: auth (login) + sincronización del armario entre dispositivos.
// Offline-first: si no rellenas las credenciales, la app sigue funcionando con
// localStorage y este módulo no descarga nada. El SDK se importa solo cuando
// hay credenciales configuradas (import dinámico).

const SUPABASE_URL = 'https://tgdffxvuqsgotlkvfoxh.supabase.co';       // p.ej. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZGZmeHZ1cXNnb3Rsa3Zmb3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NjQyMzQsImV4cCI6MjA5ODE0MDIzNH0.Y6KvJKOCf7vn0cerLw5q5YgiIeyEuIv5Sm6rIYGUV7E ';  // anon public key (es pública por diseño; la seguridad la da RLS)

let _client; // undefined = sin resolver, null = no configurado
async function client() {
  if (_client !== undefined) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { _client = null; return null; }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

export function cloudEnabled() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY); }

/* ---- auth ---- */
export async function getSession() {
  const c = await client(); if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}
export async function onAuth(cb) {
  const c = await client(); if (!c) return;
  c.auth.onAuthStateChange((_e, s) => cb(s));
}
// Intenta iniciar sesión; si no existe la cuenta, la crea.
export async function signInOrUp(email, password) {
  const c = await client(); if (!c) throw new Error('Supabase no configurado');
  const inRes = await c.auth.signInWithPassword({ email, password });
  if (!inRes.error) return inRes.data.session;
  const upRes = await c.auth.signUp({ email, password });
  if (upRes.error) throw upRes.error;
  return upRes.data.session; // null si requiere confirmar email
}
export async function signOut() { const c = await client(); if (c) await c.auth.signOut(); }

/* ---- mapping JS <-> columnas ---- */
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function toRow(g) {
  return {
    brand: g.brand || null, name: g.name, category: g.category || null,
    color: g.color || null, size: g.size || null, condition: g.condition || null,
    purchase_price: Number(g.price) || 0, status: g.status || 'uso',
    image_url: g.img || null, worn: g.worn || 0
  };
}
export function fromRow(r) {
  return {
    id: r.id, brand: r.brand, name: r.name, category: r.category, color: r.color,
    size: r.size, condition: r.condition, price: Number(r.purchase_price) || 0,
    status: r.status, img: r.image_url, worn: r.worn || 0
  };
}

/* ---- sync ---- */
export async function pullGarments() {
  const c = await client(); if (!c) return null;
  const { data, error } = await c.from('garments').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('pull', error); return null; }
  return data;
}
export async function pushGarment(g, forceInsert = false) {
  const c = await client(); if (!c) return;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return;
  const row = { ...toRow(g), user_id: user.id };
  if (!forceInsert && isUuid(g.id)) row.id = g.id; // upsert por id si ya es uuid
  const { error } = await c.from('garments').upsert(row);
  if (error) console.warn('push', error);
}
export async function deleteGarmentCloud(id) {
  const c = await client(); if (!c || !isUuid(id)) return;
  await c.from('garments').delete().eq('id', id);
}
export async function fetchMarketplace() {
  const c = await client(); if (!c) return [];
  const { data } = await c.from('garments').select('*').eq('status', 'venta');
  return data || [];
}

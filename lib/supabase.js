// Supabase: auth (login) + sincronización del armario entre dispositivos.
// Offline-first: si no rellenas las credenciales, la app sigue funcionando con
// localStorage y este módulo no descarga nada. El SDK se importa solo cuando
// hay credenciales configuradas (import dinámico).

const SUPABASE_URL = 'https://tgdffxvuqsgotlkvfoxh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZGZmeHZ1cXNnb3Rsa3Zmb3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NjQyMzQsImV4cCI6MjA5ODE0MDIzNH0.Y6KvJKOCf7vn0cerLw5q5YgiIeyEuIv5Sm6rIYGUV7E';

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
  // 1) Intentar iniciar sesión
  const inRes = await c.auth.signInWithPassword({ email, password });
  if (!inRes.error) return inRes.data.session;

  const msg = (inRes.error.message || '').toLowerCase();
  // Credenciales inválidas puede significar: cuenta no existe, contraseña mal, o email sin confirmar
  // 2) Intentar registrar
  const upRes = await c.auth.signUp({ email, password });
  if (upRes.error) {
    const um = (upRes.error.message || '').toLowerCase();
    if (um.includes('already') || um.includes('registered')) {
      // La cuenta ya existe → el login falló por contraseña incorrecta o email sin confirmar
      throw new Error('Esa cuenta ya existe. Revisa la contraseña, o confirma tu email si acabas de registrarte.');
    }
    throw upRes.error;
  }
  // Registro OK. Si hay sesión, dentro; si no, requiere confirmar email.
  return upRes.data.session; // null = revisar email
}
export async function signOut() { const c = await client(); if (c) await c.auth.signOut(); }

/* ---- mapping JS <-> columnas ---- */
const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function toRow(g) {
  let daysSince=null;
  if(g.lastWornAt){
    const ms=Date.now()-new Date(g.lastWornAt).getTime();
    if(!isNaN(ms)) daysSince=Math.max(0,Math.round(ms/86400000));
  }
  return {
    id: g.id,
    brand: g.brand || null, name: g.name || 'Prenda',
    cat: g.cat || null, cat_group: g.catGroup || null,
    fit: g.fit || null, color: g.color || null,
    colors: Array.isArray(g.colors) ? g.colors : (g.color ? [g.color] : null),
    material: g.material || null, size: g.size || null,
    season: g.season || null, formality: g.formality || null,
    price: Number(g.price) || 0, store: g.store || null,
    bought_at: g.bought || null, cond: g.cond || null,
    worn: g.worn || 0, last_worn: g.lastWorn || null,
    days_since_last_use: daysSince,
    status: g.status || 'uso', img: g.img || null, sku: g.sku || null
  };
}
export function fromRow(r) {
  let lastWornAt=null;
  if(typeof r.days_since_last_use==='number'){
    lastWornAt=new Date(Date.now()-r.days_since_last_use*86400000).toISOString();
  }
  return {
    id: r.id, brand: r.brand, name: r.name, cat: r.cat, catGroup: r.cat_group,
    fit: r.fit, color: r.color, colors: r.colors || (r.color ? [r.color] : []),
    material: r.material, size: r.size, season: r.season, formality: r.formality,
    price: Number(r.price) || 0, store: r.store, bought: r.bought_at, cond: r.cond,
    worn: r.worn || 0, lastWorn: r.last_worn, lastWornAt,
    status: r.status, img: r.img, sku: r.sku,
    photos: [], docs: [], tags: []
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
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok:false, reason:'no_session' };
  const row = { ...toRow(g), user_id: user.id };
  // la columna id es text sin default: SIEMPRE hay que enviar el id
  const { error } = await c.from('garments').upsert(row, { onConflict: 'id' });
  if (error) {
    console.warn('push', error);
    const reason = [error.message, error.code, error.details, error.hint].filter(Boolean).join(' | ') || JSON.stringify(error);
    return { ok:false, reason };
  }
  return { ok:true };
}
export async function deleteGarmentCloud(id) {
  const c = await client(); if (!c || !id) return;
  await c.from('garments').delete().eq('id', id);
}
export async function fetchMarketplace() {
  const c = await client(); if (!c) return [];
  const { data } = await c.from('garments').select('*').eq('status', 'venta');
  return data || [];
}

// B2B enrichment methods

export async function diagnose() {
  const out = { steps: [] };
  const c = await client();
  if (!c) { out.steps.push('Sin cliente Supabase (no configurado)'); return out; }
  out.steps.push('Cliente Supabase OK');
  const { data: { user }, error: uErr } = await c.auth.getUser();
  if (uErr) { out.steps.push('Error getUser: ' + uErr.message); return out; }
  if (!user) { out.steps.push('NO hay sesión activa (user=null)'); return out; }
  out.steps.push('Sesión activa: ' + user.email);
  out.userId = user.id;
  // probar lectura
  const { data: rd, error: rErr } = await c.from('garments').select('id').limit(1);
  if (rErr) {
    const full = [rErr.message, rErr.code, rErr.details, rErr.hint].filter(Boolean).join(' | ') || JSON.stringify(rErr);
    out.steps.push('LECTURA falla: ' + full);
    return out;
  }
  out.steps.push('Lectura OK (' + (rd?rd.length:0) + ' filas visibles)');
  // probar escritura de una prenda de prueba
  const testId = 'diag-' + Date.now();
  const { error: wErr } = await c.from('garments').upsert({
    id: testId, user_id: user.id, brand: 'TEST', name: 'Diagnóstico',
    cat: 'Camiseta manga corta', price: 0, status: 'uso'
  }, { onConflict: 'id' });
  if (wErr) {
    const full = [wErr.message, wErr.code, wErr.details, wErr.hint].filter(Boolean).join(' | ') || JSON.stringify(wErr);
    out.steps.push('ESCRITURA falla: ' + full);
    return out;
  }
  out.steps.push('Escritura OK');
  // confirmar que se puede leer lo escrito
  const { data: back, error: bErr } = await c.from('garments').select('*').eq('id', testId).maybeSingle();
  if (bErr) { out.steps.push('Relectura falla: ' + bErr.message); }
  else if (back) { out.steps.push('Confirmado: la prenda de prueba se guardó y se recuperó'); out.ok = true; }
  else out.steps.push('La prenda se escribió pero NO se recupera (posible RLS de SELECT)');
  // limpiar
  await c.from('garments').delete().eq('id', testId);
  return out;
}

export async function pullProfile() {
  const c = await client(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const { data, error } = await c.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) { console.warn('pullProfile', error); return null; }
  return data;
}

export async function updateProfile(data) {
  const c = await client(); if (!c) return;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return;
  await c.from('profiles').upsert({ id: user.id, email: user.email, ...data, updated_at: new Date().toISOString() });
}

export async function saveMaletaCloud(mal) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok:false, reason:'no_session' };
  const { error } = await c.from('maletas').upsert({
    id: mal.id, user_id: user.id, name: mal.name, dest: mal.dest || null,
    days: mal.days || null, plan: mal.plan || null, items: mal.items || [],
    looks: mal.looks || null, weight: mal.weight || null, created_at: mal.createdAt
  }, { onConflict: 'id' });
  if (error) { console.warn('saveMaleta', error); return { ok:false, reason:error.message }; }
  return { ok:true };
}
export async function deleteMaletaCloud(id) {
  const c = await client(); if (!c || !id) return;
  await c.from('maletas').delete().eq('id', id);
}
export async function pullMaletas() {
  const c = await client(); if (!c) return null;
  const { data, error } = await c.from('maletas').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('pullMaletas', error); return null; }
  return data;
}

export async function trackEvent(type, data) {
  const c = await client(); if (!c) return;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return;
  const table = type === 'scan' ? 'scan_events' : 'purchase_events';
  await c.from(table).insert({ user_id: user.id, ...data });
}

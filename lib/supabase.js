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
export async function signOut() { _profileEnsured=false; const c = await client(); if (c) await c.auth.signOut(); }

/* ---- mapping JS <-> columnas ---- */
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
    status: g.status || 'uso', img: g.img || null, sku: g.sku || null,
    fit_feedback: g.fitFeedback || null,
    context: g.context || 'calle', sport: g.sport || null, km: (g.km!=null?Number(g.km):null),
    photos: (g.photos&&g.photos.length)?g.photos:null
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
    worn: r.worn || 0, lastWorn: r.last_worn, lastWornAt, fitFeedback: r.fit_feedback || null,
    context: r.context || 'calle', sport: r.sport || null, km: r.km!=null?Number(r.km):null,
    photos: r.photos || [], fitFeedback: r.fit_feedback || null,
    status: r.status, img: r.img, sku: r.sku,
    photos: [], docs: [], tags: []
  };
}

/* ---- sync ---- */
export async function pullGarments() {
  const c = await client(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser(); if (!user) return null;
  // AISLAMIENTO ESTRICTO: solo MIS prendas, explícito por user_id.
  // Las políticas de lectura pública/amigos se suman en RLS; sin este filtro,
  // el pull traería prendas ajenas al armario propio. Jamás.
  const { data, error } = await c.from('garments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.warn('pull', error); return null; }
  return data;
}
export async function pushGarment(g, forceInsert = false) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok:false, reason:'no_session' };
  await ensureProfile(); // garantizar que la FK profiles.id existe
  const row = { ...toRow(g), user_id: user.id };
  // la columna id es text sin default: SIEMPRE hay que enviar el id
  let { error } = await c.from('garments').upsert(row, { onConflict: 'id' });
  // tolerancia a migraciones: si falta una columna nueva (SQL de upgrade sin ejecutar),
  // reintentar sin ellas para que el guardado base NUNCA se rompa
  if (error && /column|schema/i.test(error.message || '')) {
    const base = { ...row }; delete base.fit_feedback; delete base.context; delete base.sport; delete base.km; delete base.photos;
    const retry = await c.from('garments').upsert(base, { onConflict: 'id' });
    if (!retry.error) { console.warn('push: guardado sin columnas nuevas (ejecuta los SQL de upgrade)'); return { ok:true }; }
    error = retry.error;
  }
  if (error) {
    console.warn('push', error);
    const reason = [error.message, error.code, error.details, error.hint].filter(Boolean).join(' | ') || JSON.stringify(error);
    return { ok:false, reason };
  }
  return { ok:true };
}
export async function deleteGarmentCloud(id) {
  // BORRADO SUAVE y VERIFICADO. Un delete bloqueado por RLS no da error:
  // borra 0 filas en silencio. Por eso marcamos deleted_at y comprobamos.
  const c = await client(); if (!c || !id) return { ok:false };
  try {
    const { data, error } = await c.from('garments')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id');
    if (!error) {
      if (data && data.length) return { ok:true };            // marcada
      const { data: still } = await c.from('garments').select('id').eq('id', id).maybeSingle();
      return { ok: !still };                                   // no existe = ya borrada
    }
    if (/column|schema/i.test(error.message || '')) {          // SQL de upgrade sin ejecutar: borrado duro verificado
      await c.from('garments').delete().eq('id', id);
      const { data: still } = await c.from('garments').select('id').eq('id', id).maybeSingle();
      return { ok: !still };
    }
    return { ok:false };
  } catch(e) { return { ok:false }; }
}
export async function fetchMarketplace() {
  const c = await client(); if (!c) return [];
  const { data } = await c.from('garments').select('*').eq('status', 'venta');
  return data || [];
}

// B2B enrichment methods

// CLAVE: asegura que existe una fila en `profiles` para el usuario actual.
// Sin esta fila, TODOS los inserts en garments/tickets/maletas fallan por FK.
let _profileEnsured = false;
export async function ensureProfile() {
  if (_profileEnsured) return true;
  const c = await client(); if (!c) return false;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return false;
  // upsert: si ya existe no hace nada; si no, la crea
  const { error } = await c.from('profiles').upsert(
    { id: user.id, email: user.email, updated_at: new Date().toISOString() },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) { console.warn('ensureProfile', error); return false; }
  _profileEnsured = true;
  return true;
}

export async function uploadTicketImage(ticketId, dataUrl) {
  const c = await client(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  try {
    // dataURL -> blob
    const res = await fetch(dataUrl); const blob = await res.blob();
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg','jpg');
    const path = `${user.id}/${ticketId}.${ext}`;
    const { error } = await c.storage.from('tickets').upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) { console.warn('uploadTicket', error); return null; }
    const { data } = c.storage.from('tickets').getPublicUrl(path);
    return { url: data.publicUrl, path };
  } catch(e) { console.warn('uploadTicket', e); return null; }
}
export async function saveTicketCloud(t) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { ok:false, reason:'no_session' };
  await ensureProfile();
  const { error } = await c.from('tickets').upsert({
    id: t.id, user_id: user.id, store: t.store || null, date: t.dateISO || null,
    total: t.total || 0, return_days: t.returnDays || null, warranty_months: t.warrantyMonths || null,
    img: t.img || null, garment_ids: t.garmentIds || [], items: t.items || [], created_at: t.createdAt
  }, { onConflict: 'id' });
  if (error) { console.warn('saveTicket', error); return { ok:false, reason:[error.message,error.code,error.details].filter(Boolean).join(' | ') }; }
  return { ok:true };
}
export async function deleteTicketCloud(id) {
  const c = await client(); if (!c || !id) return;
  await c.from('tickets').delete().eq('id', id);
}
export async function pullTickets() {
  const c = await client(); if (!c) return null;
  const { data, error } = await c.from('tickets').select('*').order('created_at', { ascending: false });
  if (error) { console.warn('pullTickets', error); return null; }
  return data;
}

/* ═══════════ RED SOCIAL ═══════════ */
export async function getMySocial() {
  const c = await client(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser(); if (!user) return null;
  const { data } = await c.from('social_profiles').select('*').eq('id', user.id).maybeSingle();
  return data;
}
export async function setUsername(username, displayName, avatar) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser(); if (!user) return { ok:false, reason:'no_session' };
  const clean = String(username||'').toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20);
  if (clean.length < 3) return { ok:false, reason:'El usuario debe tener al menos 3 caracteres (letras, números, _ o .)' };
  const { error } = await c.from('social_profiles').upsert({ id:user.id, username:clean, display_name:displayName||clean, avatar:avatar||(displayName||clean)[0].toUpperCase(), updated_at:new Date().toISOString() }, { onConflict:'id' });
  if (error) {
    if ((error.message||'').includes('duplicate') || error.code==='23505') return { ok:false, reason:'Ese nombre de usuario ya está cogido.' };
    return { ok:false, reason:error.message };
  }
  return { ok:true, username:clean };
}
export async function searchUsers(q) {
  const c = await client(); if (!c) return [];
  const { data: { user } } = await c.auth.getUser();
  const term = String(q||'').toLowerCase().trim().replace(/[%,()]/g,'');
  if (term.length < 2) return [];
  const { data } = await c.from('social_profiles').select('id,username,display_name,avatar').or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(12);
  return (data||[]).filter(u => !user || u.id !== user.id);
}
export async function getFriendships() {
  const c = await client(); if (!c) return { friends:[], incoming:[], outgoing:[] };
  const { data: { user } } = await c.auth.getUser(); if (!user) return { friends:[], incoming:[], outgoing:[] };
  const { data: rows } = await c.from('friendships').select('*').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  const list = rows||[];
  const otherIds = list.map(f => f.requester_id===user.id ? f.addressee_id : f.requester_id);
  let profs = {};
  if (otherIds.length) {
    const { data: sp } = await c.from('social_profiles').select('id,username,display_name,avatar').in('id', otherIds);
    (sp||[]).forEach(p => profs[p.id]=p);
  }
  const friends=[], incoming=[], outgoing=[];
  for (const f of list) {
    const otherId = f.requester_id===user.id ? f.addressee_id : f.requester_id;
    const entry = { id:f.id, status:f.status, otherId, profile:profs[otherId]||{id:otherId,username:'usuario',display_name:'Usuario',avatar:'U'} };
    if (f.status==='accepted') friends.push(entry);
    else if (f.addressee_id===user.id) incoming.push(entry);
    else outgoing.push(entry);
  }
  return { friends, incoming, outgoing };
}
export async function sendFriendRequest(addresseeId) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser(); if (!user) return { ok:false, reason:'no_session' };
  if (addresseeId===user.id) return { ok:false, reason:'No puedes agregarte a ti mismo.' };
  const id = 'f'+Date.now()+Math.random().toString(36).slice(2,5);
  const { error } = await c.from('friendships').upsert({ id, requester_id:user.id, addressee_id:addresseeId, status:'pending' }, { onConflict:'requester_id,addressee_id' });
  if (error) return { ok:false, reason:error.message };
  return { ok:true };
}
export async function respondFriend(friendshipId, accept) {
  const c = await client(); if (!c) return { ok:false };
  if (accept) { const { error } = await c.from('friendships').update({ status:'accepted' }).eq('id', friendshipId); return { ok:!error }; }
  const { error } = await c.from('friendships').delete().eq('id', friendshipId); return { ok:!error };
}
export async function removeFriend(friendshipId) {
  const c = await client(); if (!c) return;
  await c.from('friendships').delete().eq('id', friendshipId);
}
export async function getFriendWardrobe(friendId) {
  const c = await client(); if (!c) return null;
  const { data, error } = await c.from('garments').select('*').eq('user_id', friendId);
  if (error) { console.warn('friendWardrobe', error); return null; }
  return (data||[]).map(fromRow);
}
export async function sendMessage(recipientId, msg) {
  const c = await client(); if (!c) return { ok:false, reason:'no_client' };
  const { data: { user } } = await c.auth.getUser(); if (!user) return { ok:false, reason:'no_session' };
  const id = 'm'+Date.now()+Math.random().toString(36).slice(2,5);
  const { error } = await c.from('messages').insert({ id, sender_id:user.id, recipient_id:recipientId, type:msg.type||'text', body:msg.body||null, payload:msg.payload||null });
  if (error) return { ok:false, reason:error.message };
  return { ok:true, id };
}
export async function getMessages(otherId) {
  const c = await client(); if (!c) return [];
  const { data: { user } } = await c.auth.getUser(); if (!user) return [];
  const { data } = await c.from('messages').select('*')
    .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
    .order('created_at', { ascending:true }).limit(200);
  return (data||[]).map(m => ({ ...m, mine: m.sender_id===user.id }));
}
export async function markMessagesRead(otherId) {
  const c = await client(); if (!c) return;
  const { data: { user } } = await c.auth.getUser(); if (!user) return;
  await c.from('messages').update({ read:true }).eq('sender_id', otherId).eq('recipient_id', user.id).eq('read', false);
}
export async function unreadCount() {
  const c = await client(); if (!c) return 0;
  const { data: { user } } = await c.auth.getUser(); if (!user) return 0;
  const { count } = await c.from('messages').select('id', { count:'exact', head:true }).eq('recipient_id', user.id).eq('read', false);
  return count||0;
}

export async function uploadAvatar(dataUrl) {
  const c = await client(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser(); if (!user) return null;
  try {
    const res = await fetch(dataUrl); const blob = await res.blob();
    const path = `${user.id}/avatar.jpg`;
    const { error } = await c.storage.from('tickets').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (error) { console.warn('uploadAvatar', error); return null; }
    const { data } = c.storage.from('tickets').getPublicUrl(path);
    const url = data.publicUrl + '?v=' + Date.now(); // cache-bust
    // actualizar social_profiles si existe
    await c.from('social_profiles').update({ avatar: url }).eq('id', user.id).then(() => {}).catch(() => {});
    return url;
  } catch(e) { console.warn('uploadAvatar', e); return null; }
}

/* ═══════════ CACHÉ DE BÚSQUEDAS (compartida, 24h) ═══════════ */
// Multiplica la cuota efectiva de SerpApi: la misma búsqueda de cualquier
// usuario en 24h se sirve de Supabase al instante, sin gastar cuota.
function cacheKey(obj){
  const s=JSON.stringify(obj,Object.keys(obj).sort());
  let h=5381; for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))|0;}
  return 'q'+(h>>>0).toString(36);
}
export async function searchCacheGet(key){
  const c=await client(); if(!c) return null;
  try{
    const cutoff=new Date(Date.now()-24*3600*1000).toISOString();
    const { data }=await c.from('search_cache').select('payload').eq('key',key).gte('created_at',cutoff).maybeSingle();
    return data?data.payload:null;
  }catch(e){ return null; }
}
export async function searchCachePut(key,payload){
  const c=await client(); if(!c) return;
  try{ await c.from('search_cache').upsert({key,payload,created_at:new Date().toISOString()},{onConflict:'key'}); }catch(e){}
}
export { cacheKey };

export async function saveWishlistCloud(w){
  const c=await client(); if(!c) return {ok:false,reason:'no_client'};
  const { data:{user} }=await c.auth.getUser(); if(!user) return {ok:false,reason:'no_session'};
  await ensureProfile();
  const { error }=await c.from('wishlist').upsert({
    id:w.id,user_id:user.id,description:w.desc||null,brand:w.brand||null,tipo:w.tipo||null,
    query:w.query||null,target_price:w.targetPrice||null,last_price:w.lastPrice||null,
    last_link:w.lastLink||null,last_source:w.lastSource||null,thumbnail:w.thumbnail||null,
    created_at:w.createdAt||new Date().toISOString()
  },{onConflict:'id'});
  if(error){ console.warn('wishlist',error); return {ok:false,reason:error.message}; }
  return {ok:true};
}
export async function deleteWishlistCloud(id){
  const c=await client(); if(!c||!id) return;
  await c.from('wishlist').delete().eq('id',id);
}
export async function pullWishlist(){
  const c=await client(); if(!c) return null;
  const { data,error }=await c.from('wishlist').select('*').order('created_at',{ascending:false});
  if(error){ console.warn('pullWishlist',error); return null; }
  return data;
}

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
  await ensureProfile();
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


/* ═══════════ AUTO-PROVISIÓN DE PERFIL SOCIAL ═══════════
   Todo el que inicia sesión se vuelve encontrable en Comunidad,
   con el prefijo de su email como @usuario provisional (editable). */
let _socialEnsured = false;
export async function ensureSocialProfile() {
  if (_socialEnsured) return;
  const c = await client(); if (!c) return;
  const { data: { user } } = await c.auth.getUser(); if (!user) return;
  const { data: existing } = await c.from('social_profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) { _socialEnsured = true; return; }
  let base = (user.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 18) || 'user';
  for (let i = 0; i < 3; i++) {
    const uname = i === 0 ? base : base + Math.floor(Math.random() * 90 + 10);
    const { error } = await c.from('social_profiles').insert({
      id: user.id, username: uname, display_name: base, avatar: base[0].toUpperCase()
    });
    if (!error) { _socialEnsured = true; return; }
    if (!(error.code === '23505' || /duplicate/i.test(error.message || ''))) return;
  }
}

/* ═══════════ ARMARIO PÚBLICO ═══════════ */
export async function setPublicWardrobe(on) {
  const c = await client(); if (!c) return { ok:false };
  const { data: { user } } = await c.auth.getUser(); if (!user) return { ok:false };
  const { error } = await c.from('social_profiles').update({ public: !!on }).eq('id', user.id);
  return { ok: !error };
}
export async function getPublicWardrobe(username) {
  const c = await client(); if (!c) return null;
  const uname = String(username||'').toLowerCase().replace(/[^a-z0-9_.]/g,'');
  const { data: sp } = await c.from('social_profiles').select('id,username,display_name,avatar,public').eq('username', uname).maybeSingle();
  if (!sp || !sp.public) return null;
  const { data: gs } = await c.from('garments').select('*').eq('user_id', sp.id).order('created_at', { ascending:false });
  return { profile: sp, garments: (gs||[]).map(fromRow) };
}

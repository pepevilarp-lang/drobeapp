/* El 3D (Three.js) se carga DINÁMICAMENTE y de forma opcional.
   Si Safari iOS no resuelve el importmap, la app arranca igual sin 3D. */
let _ward3d = null;
async function load3D(){
  if(_ward3d) return _ward3d;
  try{ _ward3d = await import('./wardrobe3d.js'); return _ward3d; }
  catch(e){ return null; }
}
function unmountWardrobe3D(){ try{ _ward3d?.unmountWardrobe3D?.(); }catch(e){} }
function resetView(){ try{ _ward3d?.resetView?.(); }catch(e){} }

/* Manejo de errores visible en móvil (si la app no llega a renderizar) */
window.addEventListener('error',e=>{
  const app=document.getElementById('app');
  if(app&&!app.querySelector('.shell')){
    app.innerHTML='<div style="padding:40px 24px;font-family:system-ui">'+
      '<div style="font-size:24px;font-weight:800;margin-bottom:12px">Dro<span style="color:#3B6CF6">be</span></div>'+
      '<div style="font-size:15px;color:#555;line-height:1.5">Algo no cargó bien. Detalle:</div>'+
      '<pre style="font-size:12px;background:#f4f4f4;padding:12px;border-radius:8px;margin-top:10px;white-space:pre-wrap;word-break:break-word">'+((e.message||'error')+'\n'+(e.filename||'')+':'+(e.lineno||''))+'</pre>'+
      '<button onclick="location.reload()" style="margin-top:16px;background:#15161B;color:#fff;border:none;border-radius:12px;padding:14px 20px;font-size:15px;font-weight:600;width:100%">Reintentar</button>'+
      '</div>';
  }
});
import * as cloud from './lib/supabase.js';

let session = null;

/* ═══════════════════════════════════════════
   ICONOS
═══════════════════════════════════════════ */
const IC = {
  shirt:'M16 3.5l4 2.2v4.2l-2.8 1V20.5H6.8V10.9L4 9.9V5.7l4-2.2 4 2.6 4-2.6z',
  add:'M12 5v14M5 12h14',spark:'M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z',
  chart:'M5 19V11M12 19V5M19 19v-5',user:'M12 12.5a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8zM5 19.5a7 7 0 0114 0',
  cam:'M4 8.5h3l1.8-2h6.4L17 8.5h3v10H4v-10zM12 13.5a3 3 0 100 .01',
  scan:'M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M4 16v2a2 2 0 002 2h2M20 16v2a2 2 0 01-2 2h-2M4 12h16',
  chev:'M9 6l6 6-6 6',back:'M15 6l-6 6 6 6',x:'M6 6l12 12M18 6L6 18',check:'M5 12.5l4.5 4.5L19 7',
  tag:'M4 4h7l9 9-7 7-9-9V4zM8 8h.01',load:'M12 3a9 9 0 109 9',
  sun:'M12 4v2M12 18v2M4 12H2M22 12h-2M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  bell:'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0',
  file:'M6 3h8l4 4v14H6zM14 3v4h4',shield:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  receipt:'M5 3h14v18l-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8',
  pen:'M4 20l4-1 11-11-3-3L5 16zM14 5l3 3',
  plane:'M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z',
  cal:'M3 5h18v16H3zM3 9h18M8 5V3M16 5V3',
  drop:'M12 3C8 9 5 13 5 17a7 7 0 0014 0c0-4-3-8-7-14z',
  wind:'M4 8h12a4 4 0 000-8M4 13h16M4 18h12a4 4 0 010 8',
  star:'M12 2l3 6.3 6.9 1-5 4.8 1.2 6.9-6.1-3.2-6.1 3.2 1.2-6.9-5-4.8 6.9-1z',
  pack:'M3 3h18l-2 14H5zM3 3L1 1M8 21h8M12 12V6M9 9l3-3 3 3',
  store:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  dna:'M12 3c-4 6-4 12 0 18M12 3c4 6 4 12 0 18M6 6h12M6 18h12M5 10h14M5 14h14',
  score:'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
  target:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  lock:'M5 11V7a7 7 0 0114 0v4M3 11h18v10H3z',
  gift:'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7a5 2.5 0 010-5 5 2.5 0 010 5zM12 7a5 2.5 0 000-5 5 2.5 0 000 5',
  sync:'M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4',
  trash:'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13',
  people:'M9 12.5a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM2.5 20a6.5 6.5 0 0113 0M16 6.2a3.2 3.2 0 010 6.2M18 20a6.5 6.5 0 00-3-5.3',
  chat:'M4 5h16v11H9l-4 4V5z',
  send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  heart:'M12 21C6 16.5 3 13 3 9a4.5 4.5 0 019-1 4.5 4.5 0 019 1c0 4-3 7.5-9 12z',
  search:'M11 4a7 7 0 105.2 11.7L21 20M11 4a7 7 0 015.2 11.7',
  hanger:'M12 5a2 2 0 112 2c-1 0-1.5.6-1.5 1.3 0 .5.3.9.8 1.2L21 14H3l7.7-4.2',
  eye:'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zM12 14.8a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z',
  camera:'M3 8h3l2-3h8l2 3h3v12H3V8zM12 17a4 4 0 100-8 4 4 0 000 8z',
};
const svg = (n,s,w) => {
  s=s||22; w=w||1.7;
  const d=IC[n]||'';
  const paths=d.split('M').filter(Boolean).map(p=>`<path d="M${p}"/>`).join('');
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
};

/* ═══════════════════════════════════════════
   CATÁLOGOS
═══════════════════════════════════════════ */
const CATS_DETAIL = [
  'Camiseta manga corta','Camiseta manga larga','Polo','Top','Jersey','Sudadera','Hoodie',
  'Sobrecamisa','Camisa Oxford','Camisa lino','Camisa vestir','Blazer','Americana','Bomber',
  'Chaqueta denim','Chaqueta cuero','Abrigo','Gabardina','Parka','Plumífero','Cortavientos',
  'Vaquero','Chino','Cargo','Jogger','Pantalón vestir','Wide Leg','Straight','Slim','Shorts',
  'Bermudas','Falda','Vestido','Sneakers','Bambas','Running','Botas','Botines','Sandalias',
  'Chanclas','Tacones','Zapatos Oxford','Mocasines','Zapatillas deportivas',
  'Mochila','Bolso','Gorra','Gorro','Bufanda','Cinturón','Corbata','Reloj','Otro'
];
const FITS = ['Slim Fit','Regular Fit','Oversized','Boxy','Cargo','Wide Leg','Straight','Bomber','Overshirt','Otro'];
const SEASONS = ['Primavera/Verano','Otoño/Invierno','Todo el año'];
const FORMS = ['Casual','Smart casual','Formal','Deporte'];
const SPORTS = ['Run','Ciclismo','Natación','Gym','Pádel/Tenis','Fútbol','Outdoor'];
const CONDS = ['Nuevo con etiqueta','Como nuevo','Buen estado','Usado'];
const TRIP_PLANS = ['Ciudad','Trabajo','Playa','Montaña','Festival','Boda','Deporte','Esquí'];
const TRIP_ACTS = ['Caminar','Salir de noche','Senderismo','Restaurantes','Eventos','Playa','Piscina','Deporte','Compras'];
const NEUTRAL_COLORS = ['Blanco','Negro','Gris','Crudo','Marino','Azul marino','Beige','Marrón'];
const WEIGHT_KG = {'Camiseta manga corta':.18,'Camiseta manga larga':.22,'Polo':.25,'Jersey':.55,'Sudadera':.5,'Hoodie':.55,'Camisa Oxford':.3,'Camisa lino':.26,'Camisa vestir':.32,'Blazer':.65,'Americana':.65,'Bomber':.72,'Chaqueta denim':.75,'Chaqueta cuero':.95,'Abrigo':1.2,'Gabardina':1.0,'Parka':1.1,'Plumífero':.85,'Vaquero':.68,'Chino':.55,'Cargo':.65,'Pantalón vestir':.52,'Shorts':.3,'Bermudas':.32,'Calzado':.8,'default':.35};
const gWeight = cat => WEIGHT_KG[cat]||WEIGHT_KG.default;

/* ═══════════════════════════════════════════
   DATOS SEED
═══════════════════════════════════════════ */
const SEED = [
  {id:'s1',brand:'Silbon',name:'Logo Raquetas',cat:'Camiseta manga corta',catGroup:'Camisetas',fit:'Regular Fit',color:'Blanco',colors:['Blanco','Marino'],material:'Algodón pima',size:'M',season:'Primavera/Verano',formality:'Casual',bought:'Abr 2024',store:'Silbon Diagonal',price:39.95,cond:'Buen estado',worn:9,lastWorn:'Hace 4 días',status:'uso',img:'./assets/silbon-raquetas-white.png',photos:[],docs:[],tags:['Básico']},
  {id:'s2',brand:'Stone Island',name:'Jersey Punto Compass',cat:'Jersey',catGroup:'Jerséis/Sudaderas',fit:'Regular Fit',color:'Negro',colors:['Negro'],material:'Lana/algodón',size:'L',season:'Otoño/Invierno',formality:'Smart casual',bought:'Nov 2023',store:'El Corte Inglés',price:295,cond:'Como nuevo',worn:6,lastWorn:'Hace 2 semanas',status:'uso',img:'./assets/stoneisland-compass-black.png',photos:[],docs:[{type:'Ticket',icon:'receipt',name:'Ticket ECI nov-23.jpg',dt:'06 Nov 2023'},{type:'Garantía',icon:'shield',name:'Garantía 2 años.pdf',dt:'06 Nov 2023'}],tags:['Premium']},
  {id:'s3',brand:'Scalpers',name:'Snake Skull',cat:'Camiseta manga corta',catGroup:'Camisetas',fit:'Regular Fit',color:'Gris',colors:['Gris','Mostaza'],material:'Algodón',size:'L',season:'Primavera/Verano',formality:'Casual',bought:'May 2024',store:'Scalpers.com',price:35.99,cond:'Buen estado',worn:12,lastWorn:'Hace 1 mes',status:'venta',img:'./assets/scalpers-snake-grey.png',photos:[],docs:[],tags:[]},
  {id:'s4',brand:'Pepe Jeans',name:'Eggo Logo',cat:'Camiseta manga corta',catGroup:'Camisetas',fit:'Slim Fit',color:'Gris',colors:['Gris'],material:'Algodón',size:'M',season:'Todo el año',formality:'Casual',bought:'Ene 2024',store:'Zalando',price:29.99,cond:'Como nuevo',worn:14,lastWorn:'Ayer',status:'uso',img:'./assets/pepe-eggo-grey.png',photos:[],docs:[],tags:['Diario']},
  {id:'s5',brand:'Stone Island',name:'Jersey Lana Crudo',cat:'Jersey',catGroup:'Jerséis/Sudaderas',fit:'Regular Fit',color:'Crudo',colors:['Crudo'],material:'Lana virgen',size:'L',season:'Otoño/Invierno',formality:'Smart casual',bought:'Dic 2022',store:'El Corte Inglés',price:320,cond:'Buen estado',worn:18,lastWorn:'Hace 3 días',status:'uso',img:'./assets/stoneisland-knit-cream.png',photos:[],docs:[],tags:['Premium']},
  {id:'s6',brand:'Pepe Jeans',name:'Eggo Logo',cat:'Camiseta manga corta',catGroup:'Camisetas',fit:'Slim Fit',color:'Blanco',colors:['Blanco'],material:'Algodón',size:'M',season:'Todo el año',formality:'Casual',bought:'Sep 2023',store:'Zalando',price:29.99,cond:'Usado',worn:31,lastWorn:'Hoy',status:'uso',img:'./assets/pepe-eggo-white.png',photos:[],docs:[],tags:['Diario']},
  {id:'s7',brand:'Scalpers',name:'Skull Animal Print',cat:'Camiseta manga corta',catGroup:'Camisetas',fit:'Regular Fit',color:'Blanco',colors:['Blanco','Mostaza'],material:'Algodón',size:'S',season:'Primavera/Verano',formality:'Casual',bought:'Jun 2024',store:'Scalpers.com',price:29.99,cond:'Como nuevo',worn:4,lastWorn:'Hace 2 meses',status:'uso',img:'./assets/scalpers-skull-white.png',photos:[],docs:[],tags:[]}
];

/* ═══════════════════════════════════════════
   ESTADO
═══════════════════════════════════════════ */
const KEY = 'drobe.v3';
let store = load();
function load(){
  try{ const r=localStorage.getItem(KEY); if(r){const s=JSON.parse(r);if(s.garments){s.profile=s.profile||{};s.maletas=s.maletas||[];s.tickets=s.tickets||[];s.wishlist=s.wishlist||[];s.scanLog=s.scanLog||[];s.deletedIds=s.deletedIds||[];return s;}} }catch(e){}
  return {garments:JSON.parse(JSON.stringify(SEED)),profile:{},maletas:[],tickets:[],wishlist:[],scanLog:[],deletedIds:[]};
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){} }
function showSyncWarning(reason){
  const old=document.getElementById('syncwarn'); if(old)old.remove();
  const el=document.createElement('div'); el.id='syncwarn'; el.className='syncwarn';
  const txt = reason==='no_session' ? 'Guardado solo en este dispositivo. Confirma tu email o vuelve a entrar.'
    : reason==='no_client' ? 'Guardado solo en local (sin conexión a la nube).'
    : 'No se pudo guardar en la nube. Motivo: '+(reason||'desconocido');
  el.innerHTML=`${svg('spark',16)} ${esc(txt)}`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),7000);
}
const findG = id => store.garments.find(g=>g.id==id);
function addGarment(g){
  haptic(12);
  g.id=g.id||('g'+Date.now()+Math.random().toString(36).slice(2,6));
  store.garments.unshift(g); save();
  if(session){
    cloud.pushGarment(g)
      .then(r=>{ if(!r||!r.ok) showSyncWarning(r&&r.reason); })
      .catch(e=>showSyncWarning(e&&e.message));
  } else showSyncWarning('no_session');
}
/* ═══ HOJAS DE AJUSTES: contenido real, acciones reales, nada de teatro ═══ */
function openSettingsSheet(kind){
  const old=document.getElementById('setsheet'); if(old)old.remove();
  const wrap=document.createElement('div'); wrap.id='setsheet'; wrap.className='sheet-ov';
  let title='',body='';
  if(kind==='cuenta'){
    title='Cuenta y sincronización';
    body=`
      <div class="sh-row"><span>Estado</span><b>${session?'☁ Sincronizado':'Solo en este dispositivo'}</b></div>
      ${session?`<div class="sh-row"><span>Cuenta</span><b>${esc(session.user?.email||'')}</b></div>`:''}
      <div class="sh-row"><span>Prendas</span><b>${store.garments.length}</b></div>
      <div class="sh-row"><span>Tickets · Maletas</span><b>${(store.tickets||[]).length} · ${(store.maletas||[]).length}</b></div>
      ${session?`<button class="btn dark" id="sh_sync" style="margin-top:16px">${svg('sync',17)} Sincronizar ahora</button>`
      :`<div class="sub" style="margin-top:14px">Inicia sesión desde Perfil para guardar tu armario en la nube.</div>`}`;
  } else if(kind==='notifs'){
    title='Notificaciones';
    body=`
      <div class="sub" style="line-height:1.6">Los avisos de Drobe viven dentro de la app, donde no molestan:</div>
      <div class="sh-row" style="margin-top:12px"><span>Plazos de cambio y garantías</span><b>En Tickets</b></div>
      <div class="sh-row"><span>Zapatillas por renovar</span><b>En el armario</b></div>
      <div class="sh-row"><span>Bajadas de precio vigiladas</span><b>En Wishlist</b></div>
      <div class="sh-row"><span>Mensajes de amigos</span><b>Punto en Comunidad</b></div>
      <div class="sub" style="margin-top:14px;color:var(--ink3)">Notificaciones push al móvil: en el roadmap. No prometemos lo que aún no está.</div>`;
  } else if(kind==='privacidad'){
    title='Privacidad y datos';
    body=`
      <div class="sub" style="line-height:1.6">Tus datos viven en tu dispositivo y, si tienes cuenta, en tu espacio privado de la nube. Nadie ve tu armario salvo que tú lo compartas (amigos aceptados o enlace público).</div>
      <div class="sub" style="line-height:1.6;margin-top:10px">Los tres consentimientos de Perfil controlan de verdad qué se comparte — revocar el de marcas borra tus agregados de la nube al instante.</div>
      <button class="btn ghost" id="sh_export" style="margin-top:16px">${svg('pack',17)} Exportar mis datos (JSON)</button>`;
  } else {
    title='Acerca de Drobe';
    body=`
      <div style="font-family:var(--serif);font-size:22px;font-style:italic;line-height:1.3">El sistema operativo<br>de tu armario.</div>
      <div class="sub" style="margin-top:12px;line-height:1.6">Drobe digitaliza tu ropa para que la conozcas de verdad: qué usas, qué te cuesta cada puesta, qué te falta y qué te sobra. Un principio innegociable: <b>nunca inventamos datos</b>.</div>
      <div class="sh-row" style="margin-top:16px"><span>Versión</span><b>v58</b></div>
      <div class="sh-row"><span>Hecho en</span><b>Barcelona</b></div>`;
  }
  wrap.innerHTML=`<div class="sheet">
    <div class="sheet-bar"></div>
    <div class="sheet-t">${title}</div>
    ${body}
    <button class="btn ghost" id="sh_close" style="margin-top:14px">Cerrar</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(()=>wrap.classList.add('show'));
  const close=()=>{ wrap.classList.remove('show'); setTimeout(()=>wrap.remove(),300); };
  wrap.onclick=e=>{ if(e.target===wrap)close(); };
  wrap.querySelector('#sh_close').onclick=close;
  wrap.querySelector('#sh_sync')?.addEventListener('click',async function(){
    this.disabled=true; this.innerHTML=`${svg('load',17)} Sincronizando…`; this.querySelector('svg').classList.add('spin');
    await syncFromCloud();
    this.innerHTML=`${svg('check',17)} Todo al día`; haptic();
    setTimeout(close,900);
  });
  wrap.querySelector('#sh_export')?.addEventListener('click',()=>{
    const data=JSON.stringify(store,null,2);
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='drobe-datos-'+new Date().toISOString().slice(0,10)+'.json';
    a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast('Datos exportados');
  });
}

/* ═══ FOTO DE ESTUDIO ═══
   Recorta la prenda del fondo (modelo de segmentación en el navegador,
   sin servidores ni coste) y la presenta sobre blanco roto uniforme,
   vertical 3:4. La prenda es SIEMPRE la real: no se retoca ni "desarruga". */
let _bgLib=null;
const BG_VER='1.5.5';
// los modelos viven en el paquete de DATOS, no en el principal
const BG_CDN=`https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@${BG_VER}/dist/`;
async function loadBgLib(){
  if(_bgLib)return _bgLib;
  _bgLib=await import(`https://cdn.jsdelivr.net/npm/@imgly/background-removal@${BG_VER}/+esm`).catch(()=>null);
  return _bgLib;
}
function bgConfig(){
  return {
    publicPath: BG_CDN,          // dónde viven los recursos del modelo (clave: sin esto no arranca)
    device: 'cpu',               // máxima compatibilidad iOS Safari
    model: 'isnet_quint8',       // modelo compacto: mucho más rápido en móvil
    output: { format: 'image/png', quality: 0.9 }
  };
}
async function studioPhoto(dataUrl){
  const lib=await loadBgLib();
  if(!lib||!lib.removeBackground) throw new Error('No se pudo cargar el motor de recorte (¿sin conexión?).');
  const srcBlob=await (await fetch(dataUrl)).blob();
  // timeout de seguridad: nunca dejar el botón colgado
  const cutBlob=await Promise.race([
    lib.removeBackground(srcBlob, bgConfig()),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error('El recorte tardó demasiado. Prueba de nuevo — la segunda vez es mucho más rápida.')),60000))
  ]);
  const cutUrl=URL.createObjectURL(cutBlob);
  try{
    const im=new Image();
    await new Promise((res,rej)=>{ im.onload=res; im.onerror=()=>rej(new Error('recorte ilegible')); im.src=cutUrl; });
    // localizar el bounding box real de la prenda (píxeles no transparentes)
    const probe=document.createElement('canvas'); probe.width=im.width; probe.height=im.height;
    const pctx=probe.getContext('2d'); pctx.drawImage(im,0,0);
    const d=pctx.getImageData(0,0,probe.width,probe.height).data;
    let minX=probe.width,minY=probe.height,maxX=0,maxY=0,found=false;
    for(let y=0;y<probe.height;y+=2)for(let x=0;x<probe.width;x+=2){
      if(d[(y*probe.width+x)*4+3]>24){found=true;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    if(!found||maxX-minX<40||maxY-minY<40) throw new Error('No se distinguió bien la prenda.');
    const bw=maxX-minX, bh=maxY-minY;
    // lienzo de estudio: blanco roto, vertical 3:4, prenda centrada al 80%
    const W=900,H=1200;
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#F7F4EE'; ctx.fillRect(0,0,W,H);
    const scale=Math.min((W*0.8)/bw,(H*0.8)/bh);
    const dw=bw*scale, dh=bh*scale, dx=(W-dw)/2, dy=(H-dh)/2;
    // sombra ambiental muy sutil (presentación, no retoque)
    ctx.save(); ctx.shadowColor='rgba(30,25,20,.14)'; ctx.shadowBlur=30; ctx.shadowOffsetY=14;
    ctx.drawImage(im,minX,minY,bw,bh,dx,dy,dw,dh); ctx.restore();
    return c.toDataURL('image/jpeg',0.88);
  } finally { URL.revokeObjectURL(cutUrl); }
}

/* celebración visual tras añadir una prenda (solo flujo individual, no ráfaga/ticket) */
function celebrateAdd(imgSrc,label){
  return new Promise(res=>{
    const ov=document.createElement('div'); ov.className='celebrate-ov';
    ov.innerHTML=`<div class="cel-card">
      <div class="cel-ph">${imgSrc?`<img src="${esc(imgSrc)}"/>`:`<div class="cel-ph-empty">${svg('check',32)}</div>`}</div>
      <div class="cel-check">${svg('check',28)}</div>
      <div class="cel-label">${esc(label||'Añadida al armario')}</div>
    </div>`;
    document.body.appendChild(ov);
    setTimeout(()=>ov.classList.add('show'),30);
    setTimeout(()=>{ ov.classList.add('out'); setTimeout(()=>{ ov.remove(); res(); },400); },1100);
  });
}
const cpw = g => g.price/Math.max(g.worn,1);

/* ═══════════════════════════════════════════
   ADN DE ESTILO (motor B2B)
   Calcula el perfil completo del usuario a partir de su armario real.
   Este objeto es el activo que las marcas pagan por conocer.
═══════════════════════════════════════════ */
function computeStyleDNA(ctx='calle'){
  const gs = store.garments.filter(g=>g.status!=='venta'&&(g.context||'calle')===ctx);
  if(!gs.length) return {};
  const count = gs.length;
  // marcas
  const brands={}, brandSpend={};
  gs.forEach(g=>{
    if(!g.brand)return;
    brands[g.brand]=(brands[g.brand]||0)+1;
    brandSpend[g.brand]=(brandSpend[g.brand]||0)+(g.price||0);
  });
  const topBrands=Object.entries(brands).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([b,n])=>({brand:b,count:n,share:Math.round(n/count*100)}));
  // colores
  const colors={};
  gs.forEach(g=>{ if(g.color)colors[g.color]=(colors[g.color]||0)+1; });
  const topColors=Object.entries(colors).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([c,n])=>({color:c,share:Math.round(n/count*100)}));
  const neutralPct=Math.round(gs.filter(g=>NEUTRAL_COLORS.includes(g.color)).length/count*100);
  // fits
  const fits={};
  gs.forEach(g=>{ if(g.fit)fits[g.fit]=(fits[g.fit]||0)+1; });
  const topFit=Object.entries(fits).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  // formality
  const forms={};
  gs.forEach(g=>{ if(g.formality)forms[g.formality]=(forms[g.formality]||0)+1; });
  const topFormality=Object.entries(forms).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  // materiales
  const mats={};
  gs.forEach(g=>{ if(g.material)mats[g.material]=(mats[g.material]||0)+1; });
  const topMaterials=Object.entries(mats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([m])=>m);
  // precios
  const prices=gs.map(g=>g.price).filter(Boolean);
  const avgPrice=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):0;
  const maxPrice=prices.length?Math.max(...prices):0;
  const totalValue=Math.round(prices.reduce((a,b)=>a+b,0));
  // segmento de precio
  const segment=avgPrice>150?'premium':avgPrice>60?'mid':'budget';
  // categorías
  const cats={};
  gs.forEach(g=>{ const k=g.catGroup||catToGroup(g.cat||''); cats[k]=(cats[k]||0)+1; });
  // comportamiento
  const avgWorn=Math.round(gs.reduce((s,g)=>s+(g.worn||0),0)/count);
  const deadPct=Math.round(gs.filter(g=>(g.worn||0)<=3).length/count*100);
  const avgCpw=parseFloat((gs.reduce((s,g)=>s+cpw(g),0)/count).toFixed(2));
  // tallas por marca
  const brandSizes={};
  gs.forEach(g=>{ if(!g.brand||!g.size)return; brandSizes[g.brand]=brandSizes[g.brand]||{}; brandSizes[g.brand][g.size]=(brandSizes[g.brand][g.size]||0)+1; });
  const sizeByBrand={};
  Object.keys(brandSizes).forEach(b=>{ const sz=brandSizes[b]; sizeByBrand[b]=Object.keys(sz).sort((a,b2)=>sz[b2]-sz[a])[0]; });
  return {
    topBrands, topColors, neutralPct, topFit, topFormality,
    topMaterials, avgPrice, maxPrice, totalValue, segment,
    categories:cats, avgWorn, deadPct, avgCpw, sizeByBrand,
    garmentCount:count, computedAt: new Date().toISOString()
  };
}

// Contexto del usuario: lo que Drobe sabe de él para personalizar TODO.
// Cuantas más prendas tenga, más rico es este perfil → mejores recomendaciones.
function userContext(){
  const dna=computeStyleDNA();
  const p=store.profile||{};
  const brands=(dna.topBrands||[]).map(b=>b.brand);
  const colors=(dna.topColors||[]).map(c=>c.color);
  return {
    sex: p.sex && p.sex!=='Prefiero no decir' ? p.sex : '',
    age: p.age || '',
    segment: dna.segment || '',          // premium / mid / budget
    avgPrice: dna.avgPrice || 0,          // ticket medio
    topBrands: brands,                    // marcas que ya usa
    topColors: colors,                    // colores que lleva
    topFit: dna.topFit || '',             // corte preferido
    topFormality: dna.topFormality || '', // registro
    materials: dna.topMaterials || [],
    garmentCount: dna.garmentCount || 0
  };
}
// Frase de contexto lista para inyectar en prompts de IA
function userContextPrompt(){
  const u=userContext();
  if(!u.garmentCount) return 'El usuario aún no tiene prendas registradas; no asumas gustos.';
  const parts=[];
  if(u.sex) parts.push(`Sexo: ${u.sex}`);
  if(u.age) parts.push(`Edad: ${u.age}`);
  if(u.segment) parts.push(`Segmento de precio: ${u.segment} (gasta de media ${u.avgPrice}€ por prenda)`);
  if(u.topBrands.length) parts.push(`Marcas que ya usa: ${u.topBrands.join(', ')}`);
  if(u.topColors.length) parts.push(`Colores habituales: ${u.topColors.join(', ')}`);
  if(u.topFit) parts.push(`Corte preferido: ${u.topFit}`);
  if(u.topFormality) parts.push(`Registro: ${u.topFormality}`);
  if(u.materials.length) parts.push(`Materiales frecuentes: ${u.materials.join(', ')}`);
  return 'PERFIL DEL USUARIO (úsalo para personalizar y acertar):\n'+parts.map(x=>'- '+x).join('\n');
}

// Drobe Score (0-100): salud del armario
function computeDrobeScore(){
  const gs=store.garments.filter(g=>g.status!=='venta');
  if(!gs.length) return 0;
  const dna=computeStyleDNA();
  let s=50;
  s += Math.min(20, gs.length*2);          // más prendas = más datos
  s -= Math.min(20, dna.deadPct*0.4);      // prendas muertas penalizan
  s += Math.min(10, Math.round(10-dna.avgCpw*0.5)); // bajo cpw = buena amortización
  if(dna.sizeByBrand && Object.keys(dna.sizeByBrand).length>2) s+=5; // tallas conocidas
  if(store.profile?.consent_data_b2b) s+=5;  // datos completos = score más alto
  return Math.max(0,Math.min(100,Math.round(s)));
}

/* ═══════════════════════════════════════════
   TRACKING B2B (eventos que informan a marcas)
═══════════════════════════════════════════ */
/* Eventos de uso: mejoran las recomendaciones de Drobe.
   Se envían solo con el consentimiento «Mejorar Drobe con mis datos». */
function trackScanEvent(data){
  if(!store.profile?.consent_analytics) return;
  const events=JSON.parse(localStorage.getItem('drobe.scan_events')||'[]');
  events.push({...data, ts: new Date().toISOString()});
  localStorage.setItem('drobe.scan_events', JSON.stringify(events.slice(-100)));
  if(session) cloud.trackEvent('scan', data).catch(()=>{});
}
function trackPurchaseEvent(data){
  if(!store.profile?.consent_analytics) return;
  if(session) cloud.trackEvent('purchase', data).catch(()=>{});
}

/* ═══════════════════════════════════════════
   HELPERS UI
═══════════════════════════════════════════ */
const esc = s => (s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
// Haptics sutil (Android; no-op silencioso en iOS Safari)
const haptic = (ms=10) => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(e){} };
function stars(c,total=5){ const n=Math.round((c||0)*total); return `<span class="stars">${Array.from({length:total},(_,i)=>`<span class="${i<n?'on':'off'}">★</span>`).join('')}</span>`; }
function confBadge(c){ const p=Math.round((c||0)*100); return `<span class="cbadge ${p<60?'low':p<85?'med':'hi'}">${p}%</span>`; }
function optSel(opts,val){ return (val&&!opts.includes(val)?`<option selected>${val}</option>`:'')+opts.map(o=>`<option${o===val?' selected':''}>${o}</option>`).join(''); }

/* ═══════════════════════════════════════════
   FORMULARIO PRENDA
═══════════════════════════════════════════ */
function garmentFormHTML(p={},c={},pre='f_'){
  const isTicket=pre!=='f_';
  return `
  <div class="field"><label>Marca ${c.brand!=null?confBadge(c.brand):''}</label><input id="${pre}brand" value="${esc(p.brand)}" placeholder="Nike, Zara, Stone Island…"/></div>
  <div class="row2">
    <div class="field"><label>Contexto</label><select id="${pre}ctx"><option value="calle" ${p.context!=='deporte'?'selected':''}>Calle</option><option value="deporte" ${p.context==='deporte'?'selected':''}>Deporte</option></select></div>
    <div class="field"><label>Disciplina</label><select id="${pre}sport"><option value="">—</option>${SPORTS.map(x=>`<option ${p.sport===x?'selected':''}>${x}</option>`).join('')}</select></div>
  </div>
  <div class="field"><label>Nombre / modelo ${c.name!=null?confBadge(c.name):''}</label><input id="${pre}name" value="${esc(p.name)}" placeholder="Parka técnica negra"/></div>
  <div class="row2">
    <div class="field"><label>Tipo ${c.cat!=null?confBadge(c.cat):''}</label><select id="${pre}cat">${optSel(CATS_DETAIL,p.cat||p.category)}</select></div>
    <div class="field"><label>Corte ${c.fit!=null?confBadge(c.fit):''}</label><select id="${pre}fit">${optSel(FITS,p.fit)}</select></div>
  </div>
  <div class="row2">
    <div class="field"><label>Color ${c.color!=null?confBadge(c.color):''}</label><input id="${pre}color" value="${esc((p.colors&&p.colors[0])||p.color)}" placeholder="Verde oliva"/></div>
    <div class="field"><label>Material ${c.material!=null?confBadge(c.material):''}</label><input id="${pre}mat" value="${esc(p.material)}" placeholder="Poliéster reciclado"/></div>
  </div>
  <div class="row2">
    <div class="field"><label>Talla</label><input id="${pre}size" value="${esc(p.size)}" placeholder="M"/></div>
    <div class="field"><label>Precio €</label><input id="${pre}price" inputmode="decimal" value="${esc(p.price)}" placeholder="0"/></div>
  </div>
  <div class="row2">
    <div class="field"><label>Temporada</label><select id="${pre}season">${optSel(SEASONS,p.season)}</select></div>
    <div class="field"><label>Formalidad</label><select id="${pre}form">${optSel(FORMS,p.formality)}</select></div>
  </div>
  ${isTicket?`<div class="field"><label>Estado</label><select id="${pre}cond">${optSel(CONDS,p.cond||'Nuevo con etiqueta')}</select></div>`
  :`<div class="row2">
    <div class="field"><label>Estado</label><select id="${pre}cond">${optSel(CONDS,p.cond||'Como nuevo')}</select></div>
    <div class="field"><label>Tienda</label><input id="${pre}store" value="${esc(p.store)}" placeholder="Ecoalf.com"/></div>
  </div>`}`;
}
function readForm(scope){
  const q=id=>{ const e=scope.querySelector('#'+id); return e?e.value.trim():''; };
  const color=q('f_color');
  return {brand:q('f_brand'),name:q('f_name')||'Prenda',cat:q('f_cat'),fit:q('f_fit'),color,colors:[color],material:q('f_mat'),size:q('f_size'),price:parseFloat(q('f_price'))||0,season:q('f_season'),formality:q('f_form'),cond:q('f_cond'),store:q('f_store'),context:q('f_ctx')||'calle',sport:q('f_ctx')==='deporte'?q('f_sport'):''};
}

/* ═══════════════════════════════════════════
   IA — RECONOCIMIENTO
═══════════════════════════════════════════ */
async function imageToBase64(file,maxDim=1152,quality=0.85,forceImg=false){
  if(!file) throw new Error('No hay archivo.');
  if(!/^image\//.test(file.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name||'')){
    throw new Error('El archivo no es una imagen ('+(file.type||'desconocido')+').');
  }
  // 1) createImageBitmap: la vía que maneja HEIC y EXIF en iOS
  if(window.createImageBitmap&&!forceImg){
    try{
      let bitmap;
      try{ bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}); }
      catch(_){ bitmap=await createImageBitmap(file); }
      const out=bitmapToData(bitmap,maxDim,quality);
      bitmap.close&&bitmap.close();
      if(out) return out;
    }catch(e){ /* sigue al fallback */ }
  }
  // 2) Fallback con <img> + FileReader (más compatible que objectURL en algunos iOS)
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    const to=setTimeout(()=>rej(new Error('La imagen tardó demasiado (¿muy pesada?). Prueba con otra.')),20000);
    fr.onerror=()=>{ clearTimeout(to); rej(new Error('No se pudo leer el archivo.')); };
    fr.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        clearTimeout(to);
        try{ const out=bitmapToData(im,maxDim,quality); out?res(out):rej(new Error('No se pudo convertir la imagen.')); }
        catch(err){ rej(err); }
      };
      im.onerror=()=>{ clearTimeout(to); rej(new Error('Formato de imagen no compatible. Prueba con JPG o PNG.')); };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function bitmapToData(src,maxDim,quality=0.85){
  const sw=src.width||src.naturalWidth, sh=src.height||src.naturalHeight;
  if(!sw||!sh) return null;
  const sc=Math.min(1,maxDim/Math.max(sw,sh));
  const w=Math.max(1,Math.round(sw*sc)), h=Math.max(1,Math.round(sh*sc));
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d'); if(!ctx) return null;
  ctx.drawImage(src,0,0,w,h);
  let dataUrl;
  try{ dataUrl=c.toDataURL('image/jpeg',quality); }catch(e){ return null; }
  if(!dataUrl||dataUrl.length<100) return null;
  return {media_type:'image/jpeg',data:dataUrl.split(',')[1],dataUrl,w,h};
}
async function callAI(system,user,image=null){
  try{
    const body={system,user};
    if(image)body.image={media_type:image.media_type,data:image.data};
    const ctrl=new AbortController(); const tm=setTimeout(()=>ctrl.abort(),25000);
    const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal});
    clearTimeout(tm);
    if(!r.ok)return null;
    const d=await r.json();
    const text=(d.text||'').replace(/```json\s*/gi,'').replace(/```/g,'').trim();
    return JSON.parse(text);
  }catch(e){ return null; }
}
const VISION_SYSTEM=`Eres un experto en moda y catalogador profesional de prendas de una casa de lujo.
REGLAS CRÍTICAS:
1. Nunca inventes. Si no puedes determinarlo con seguridad, baja la confianza.
2. Para 'cat' usa EXACTAMENTE uno de: ${CATS_DETAIL.join(', ')}.
3. Distingue con rigor: camisa (botones) ≠ camiseta (sin botones); pantalón (largo) ≠ short; jersey (punto) ≠ sudadera (felpa); bomber ≠ blazer ≠ abrigo. Un zapato NUNCA es un pantalón.
4. 'name': nombre corto y editorial EN ESPAÑOL que un catálogo usaría (ej. "Camisa de lino crudo", "Vaquero recto lavado medio"). Sin marca dentro del nombre.
5. 'brand': solo si ves logotipo, bordado o etiqueta legible. Si no, "" con confianza 0.
6. 'color' y 'colors' EN ESPAÑOL (Blanco, Crudo, Negro, Gris, Marino, Azul, Verde, Beige, Marrón, Mostaza, Rojo…). 'material' en español si es identificable por textura (Algodón, Lino, Lana, Denim, Piel, Poliéster…), si no "".
7. Confianza 0.0–1.0 por campo. Menos de 0.75 = campo incierto.
8. 'context': "deporte" si es prenda técnica/deportiva (maillot, culotte, mallas running, camiseta técnica, zapatillas de correr, bañador de nadar, neopreno…), si no "calle". Si es deporte, 'sport' es una de: Run, Ciclismo, Natación, Gym, Pádel/Tenis, Fútbol, Outdoor. Marcas como MAAP, Pas Normal Studios, Saysky, Rapha, Castelli, Ciele, Satisfy, Soar, Hoka, On son señal fuerte de deporte.
9. Responde SOLO JSON válido.
{"detected":true,"garment_count":1,"cat":"","brand":"","name":"","fit":"","color":"","colors":[],"material":"","season":"","formality":"","context":"calle","sport":"","confidence":{"cat":0,"brand":0,"name":0,"fit":0,"color":0,"material":0}}`;

const EMAIL_SYSTEM=`Eres un extractor de precisión de emails de confirmación de compra de moda (Zara, Mango, ASOS, Zalando, El Corte Inglés, Nike…).
REGLAS:
- No inventes. Si un dato no aparece, déjalo vacío y baja la confianza (0-1).
- SOLO prendas y calzado: ignora envío, impuestos, descuentos globales y tarjetas regalo.
- "store": la tienda/marca que envía el email. "dateISO": fecha del pedido en AAAA-MM-DD.
- Por prenda: "name" (descripción limpia en español), "brand" (si difiere de la tienda), "size" (talla si aparece), "color" (en español si aparece), "price" (precio final de línea), "cat" en español, uno de: ${CATS_DETAIL.join(', ')}.
Responde SOLO JSON: {"store":"","dateISO":"","total":0,"items":[{"name":"","brand":"","size":"","color":"","price":0,"cat":"","confidence":0}]}`;

const TICKET_SYSTEM=`Eres un sistema OCR de precisión especializado en tickets de tiendas de moda.
REGLAS:
- No inventes. Si un dato no se lee con claridad, baja la confianza (0-1) y deja el campo vacío.
- SOLO prendas y calzado: ignora líneas de bolsas, arreglos, envío, impuestos, redondeos o tarjetas regalo.
- "cat" DEBE estar en español y ser uno de: ${CATS_DETAIL.join(', ')}. Traduce del inglés si hace falta: T-SHIRT→Camiseta manga corta, PANTS/TROUSERS→Pantalón vestir, LINEN TROUSERS→Pantalón lino, JEANS→Vaquero, CHINO→Chino, SHIRT→Camisa Oxford, SWEATER/KNIT→Jersey, HOODIE→Hoodie, JACKET→Bomber, COAT→Abrigo, SHOES/SNEAKERS→Sneakers, SHORTS→Shorts. Fíjate en la descripción completa para no confundir camiseta con camisa, ni pantalón con short.
- "name": descripción de la línea del ticket limpia y legible en español.
- "dateISO" en formato AAAA-MM-DD si puedes deducirla (los tickets españoles suelen usar DD/MM/AAAA).
- "sku" es el número de referencia/artículo si aparece.
- "price": precio final de la línea (con descuento aplicado si lo hay).
Responde SOLO JSON: {"store":"","date":"","dateISO":"","total":0,"items":[{"name":"","brand":"","sku":"","price":0,"cat":"","confidence":0}]}`;

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let route='armario', wardMode=IS_IOS?'grid':'3d', gridFilter='Todo', wardQuery='', wardContext='calle', fichaId=null, addMode='choose';
const app=document.getElementById('app');
const TABS=[
  {k:'armario',i:'shirt',l:'Armario'},
  {k:'estilista',i:'spark',l:'Estilista'},
  {k:'add',i:'add',l:''},
  {k:'insights',i:'chart',l:'Insights'},
  {k:'perfil',i:'user',l:'Perfil'}
];
function go(r){ if(r!==route)unmountWardrobe3D(); if(r==='add')addMode='choose'; route=r; render(); window.scrollTo(0,0); }
function render(){
  app.innerHTML=`<div class="shell">
    <div class="top"><div class="word">Dro<b>be</b></div>
      <div style="display:flex;gap:8px">
        <button class="ico" id="top_social" aria-label="Comunidad" style="position:relative">${svg('people',19)}<span class="unread-dot" id="unread_dot" style="display:none"></span></button>
        <button class="ico" aria-label="Notificaciones">${svg('bell',19)}</button>
      </div>
    </div>
    <main id="main" class="fade"></main>
    <div class="nav"><div class="nav-in">
      ${TABS.map(t=>{ const on=route===t.k,add=t.k==='add';
        return `<button data-t="${t.k}" class="${on?'on':''}">${add?`<span class="add">${svg('add',22,2)}</span>`:svg(t.i,21)+`<span class="lbl">${t.l}</span>`}</button>`;}).join('')}
    </div></div></div>`;
  const m=document.getElementById('main');
  ({armario:vArmario,estilista:vEstilista,add:vAdd,insights:vInsights,perfil:vPerfil}[route]||vArmario)(m);
  app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>go(b.dataset.t));
  const social=document.getElementById('top_social'); if(social)social.onclick=()=>openSocial();
  if(session)refreshUnread();
  if(fichaId)renderFicha();
}

/* ═══════════════════════════════════════════
   ARMARIO
═══════════════════════════════════════════ */
function vArmario(m){
  const look=pickOutfit();
  m.innerHTML=`<div class="reveal">
    <div class="eyebrow">${WEATHER.city}${WEATHER.temp!=null?` · ${WEATHER.temp}°`:''}</div>
    <div class="title">Hoy te queda<br>bien lo sencillo</div></div>
    ${look.length?`<div class="hero-look reveal" style="animation-delay:.05s" id="herolook">
      <div class="hl-ph">${look[0].img?`<img src="${look[0].img}"/>`:''}</div>
      <div class="hl-text"><div class="hl-b">${look.map(g=>g.brand).join(' · ')}</div><div class="hl-n">${look.map(g=>g.name).join(' + ')}</div></div>
    </div>`:''}
    <div style="margin-top:18px" class="reveal">
      <div class="viewseg">
        ${['3d','grid'].map(x=>`<button data-mode="${x}" class="${wardMode===x?'on':''}">${x==='3d'?'Vestidor 3D':'Cuadrícula'}</button>`).join('')}
      </div></div>
    <div id="ward"></div>`;
  m.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ if(wardMode!==b.dataset.mode){unmountWardrobe3D();wardMode=b.dataset.mode;vArmario(m);} });
  const hl=m.querySelector('#herolook'); if(hl)hl.onclick=()=>openFicha(look[0].id);
  const ward=m.querySelector('#ward');
  if(wardMode==='3d'){
    ward.innerHTML=`<div class="stage3d" id="stage"><div class="hint">Cargando vestidor 3D…</div></div><div class="wardcap" id="wardcap"></div>`;
    load3D().then(mod=>{
      if(!mod||!mod.mountWardrobe3D){ wardMode='grid'; vArmario(m); return; }
      try{
        mod.mountWardrobe3D(ward.querySelector('#stage'),store.garments,{
          onSelect:it=>openFicha(it.id),
          onFocus:it=>{ const c=document.getElementById('wardcap'); if(c)c.innerHTML=`<div class="wc-b">${it.brand}</div><div class="wc-n">${it.name}</div>`; }
        });
        const h=ward.querySelector('.hint'); if(h)h.textContent='Desliza para pasar · toca el centro para abrir';
      }catch(e){ wardMode='grid'; vArmario(m); }
    });
  } else {
    const inCtx=g=>(g.context||'calle')===wardContext;
    const ctxGarments=store.garments.filter(inCtx);
    const cats=wardContext==='deporte'
      ?['Todo',...new Set(ctxGarments.map(g=>g.sport).filter(Boolean))]
      :['Todo','En venta',...new Set(ctxGarments.map(g=>g.catGroup||g.cat))];
    if(!cats.includes(gridFilter))gridFilter='Todo';
    const norm=s=>(s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const matchQ=g=>{
      if(!wardQuery)return true;
      const q=norm(wardQuery);
      return [g.brand,g.name,g.cat,g.catGroup,g.color,(g.colors||[]).join(' '),g.material,g.size,g.store,g.sport].some(v=>norm(v).includes(q));
    };
    const filterList=()=>ctxGarments
      .filter(g=>gridFilter==='Todo'?true:gridFilter==='En venta'?g.status==='venta':wardContext==='deporte'?g.sport===gridFilter:(g.catGroup||g.cat)===gridFilter)
      .filter(matchQ);
    const kmBadge=g=>{
      if(wardContext!=='deporte'||g.km==null)return '';
      const warn=g.km>=600;
      return `<span class="tag ${warn?'sale':''}" style="top:auto;bottom:10px">${Math.round(g.km)} km${warn?' · renovar':''}</span>`;
    };
    const gridHTML=list=>list.length
      ?list.map((g,i)=>`<div class="gcard reveal" data-g="${g.id}" style="animation-delay:${Math.min(i,10)*0.04}s">
        <div class="ph"><img loading="lazy" decoding="async" src="${g.img||''}"/>${g.status==='venta'?'<span class="tag sale">En venta</span>':''}${kmBadge(g)}</div>
        <div class="cap"><div class="b">${g.brand}</div><div class="n">${g.name}</div><div class="m">${wardContext==='deporte'&&g.sport?g.sport+' · ':''}${g.cat} · ${g.color}</div></div></div>`).join('')
      :`<div class="ward-empty">${svg('search',22)}<div>${wardQuery?`Nada que encaje con «${esc(wardQuery)}»`:wardContext==='deporte'?'Aún no tienes prendas deportivas.<br>Al escanear un maillot o unas zapatillas, Drobe las clasifica solo.':'Nada por aquí.'}</div></div>`;
    ward.innerHTML=`
      <div class="viewseg ctxseg" style="margin-top:16px">
        <button class="vseg ${wardContext==='calle'?'on':''}" data-ctx="calle">${svg('hanger',15)} Calle</button>
        <button class="vseg ${wardContext==='deporte'?'on':''}" data-ctx="deporte">${svg('spark',15)} Deporte</button>
      </div>
      <div class="ward-search"><span class="ws-ico">${svg('search',17)}</span><input id="wq" placeholder="Marca, color, tipo, talla…" value="${esc(wardQuery)}" autocapitalize="off" autocorrect="off"/>${wardQuery?`<button class="ws-clear" id="wqc" aria-label="Limpiar">✕</button>`:''}</div>
      <div class="chips" style="margin-top:12px">${cats.map(c=>`<button class="chip ${gridFilter===c?'on':''}" data-f="${c}">${c}</button>`).join('')}</div>
      <div class="grid" id="wgrid">${gridHTML(filterList())}</div>`;
    ward.querySelectorAll('[data-ctx]').forEach(b=>b.onclick=()=>{ if(wardContext!==b.dataset.ctx){wardContext=b.dataset.ctx;gridFilter='Todo';vArmario(m);} });
    const grid=ward.querySelector('#wgrid');
    const bindCards=()=>grid.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>openFicha(b.dataset.g));
    bindCards();
    ward.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{gridFilter=b.dataset.f;vArmario(m);});
    const wq=ward.querySelector('#wq');
    wq.oninput=()=>{ wardQuery=wq.value.trim(); grid.innerHTML=gridHTML(filterList()); bindCards();
      const c=ward.querySelector('#wqc'); if(wardQuery&&!c){const btn=document.createElement('button');btn.className='ws-clear';btn.id='wqc';btn.setAttribute('aria-label','Limpiar');btn.textContent='✕';btn.onclick=()=>{wardQuery='';vArmario(m);};ward.querySelector('.ward-search').appendChild(btn);} else if(!wardQuery&&c)c.remove(); };
    const wqc=ward.querySelector('#wqc'); if(wqc)wqc.onclick=()=>{wardQuery='';vArmario(m);};
  }
}

/* ═══════════════════════════════════════════
   FICHA
═══════════════════════════════════════════ */
function openFicha(id){ fichaId=id; renderFicha(); }
function closeFicha(){ fichaId=null; const f=document.getElementById('ficha'); if(f){f.style.animation='fade .25s var(--ease) reverse';setTimeout(()=>f.remove(),200);} if(route==='armario'&&wardMode==='3d')resetView(); }
function compatList(g){
  return store.garments.filter(x=>x.id!==g.id).map(x=>{
    let s=62;
    if(NEUTRAL_COLORS.includes(x.color))s+=14;
    if((x.catGroup||x.cat)!==(g.catGroup||g.cat))s+=12;
    if(x.formality===g.formality)s+=8;
    if(x.season===g.season||x.season==='Todo el año'||g.season==='Todo el año')s+=6;
    return {g:x,pct:Math.min(s,98)};
  }).sort((a,b)=>b.pct-a.pct).slice(0,5);
}
function renderFicha(){
  const g=findG(fichaId); if(!g){fichaId=null;return;}
  const old=document.getElementById('ficha'); if(old)old.remove();
  const photos=[g.img,...(g.photos||[])].filter(Boolean);
  const onSale=g.status==='venta';
  const el=document.createElement('div'); el.className='ficha'; el.id='ficha';
  el.innerHTML=`
    <div class="ficha-hero">
      <button class="ficha-close" id="fclose" aria-label="Cerrar">${svg('back',20)}</button>
      <button class="ficha-edit" id="fedit" aria-label="Editar prenda">${svg('pen',18)}</button>
      ${photos.length<4?`<button class="ficha-edit faddph" id="faddph" aria-label="Añadir foto">${svg('camera',18)}</button>`:''}
      <div class="track" id="track">${photos.map(p=>`<img src="${p}"/>`).join('')}</div>
      <div class="ficha-overlay"><div class="ficha-b">${g.brand}</div><div class="ficha-n">${g.name}</div></div>
      ${photos.length>1?`<div class="ficha-dots">${photos.map((_,i)=>`<i class="${i===0?'on':''}"></i>`).join('')}</div>`:''}
    </div>
    <div class="ficha-body">
      <div class="ficha-row">
        ${[g.cat,g.fit,g.season,g.formality].filter(Boolean).map(p=>`<span class="pill">${p}</span>`).join('')}
        <span class="pill eco">${cpw(g).toFixed(2)} €/uso</span>
      </div>
      <div class="shead"><h2>Detalles</h2></div>
      <div class="specs">
        ${spec('Tipo',g.cat)}${spec('Corte',g.fit)}
        ${spec('Color',(g.colors||[g.color]).join(' · '))}${spec('Material',g.material)}
        ${spec('Talla',g.size||'—')}${spec('Estado',g.cond)}
        ${spec('Comprada',g.bought)}${spec('Tienda',g.store||'—')}
        ${spec('Precio',(g.price||0).toFixed(2)+' €')}${spec('Veces usada',String(g.worn))}
        ${spec('Última vez',g.lastWorn||'—')}${spec('Coste/uso',cpw(g).toFixed(2)+' €',true)}
      </div>
      <div class="shead"><h2>Combina con</h2></div>
      <div class="compat">${compatList(g).map(c=>`<div class="it" data-c="${c.g.id}"><div class="ph"><img loading="lazy" decoding="async" src="${c.g.img||''}"/></div><div class="pct">${c.pct}%</div></div>`).join('')}</div>
      <div class="shead"><h2>Documentación</h2></div>
      ${g.docs&&g.docs.length?g.docs.map(d=>`<div class="docrow"><span class="dico">${svg(d.icon||'file',20)}</span><div><div class="dn">${d.type}</div><div class="dt">${d.name} · ${d.dt}</div></div><span class="open">${svg('chev',18)}</span></div>`).join(''):'<div class="sub" style="margin:-2px 0 10px">Sin documentos. Añade el ticket o la garantía.</div>'}
      <label class="docadd" for="docfile">${svg('add',18)} Añadir ticket, factura o garantía</label>
      <input id="docfile" type="file" accept="image/*,application/pdf" hidden/>
      <div style="height:14px"></div>
      <button class="btn ${onSale?'ghost':'dark'}" id="sale" style="margin-bottom:10px">${svg('tag',18)} ${onSale?'Quitar de la venta':'Poner en venta · sugerido '+Math.round((g.price||0)*0.4)+' €'}</button>
      ${onSale?`<div class="sell-box">
        <div class="sell-title">${svg('tag',16)} Publicar anuncio</div>
        <div class="sub" style="margin:4px 0 10px">Drobe prepara el anuncio. Tú das un toque para publicarlo.</div>
        <button class="btn ghost sell-btn" id="sell_wallapop" style="margin-bottom:8px">Preparar para Wallapop</button>
        <button class="btn ghost sell-btn" id="sell_vinted">Preparar para Vinted</button>
      </div>`:''}
      <button class="btn ghost" id="wear" style="margin-top:10px">${svg('check',18)} Marcar como usada hoy</button>
      <button class="btn ghost" id="gdel" style="margin-top:10px;color:var(--danger)">${svg('trash',18)} Eliminar prenda</button>
      <div class="fitfb">
        <div class="fitfb-l">¿Cómo te queda${g.size?` la talla ${esc(g.size)}`:''}?</div>
        <div class="fitfb-chips">${['Pequeña','Perfecta','Grande'].map(o=>`<button class="chip ${g.fitFeedback===o?'on':''}" data-ff="${o}">${o}</button>`).join('')}</div>
      </div>
      ${(g.context==='deporte')?`<div class="km-box">
        <div class="km-head"><span>Kilometraje${g.stravaGear?' · Strava':''}</span>${g.km>=600?`<span class="km-warn">${svg('spark',12)} Zona de renovación</span>`:''}</div>
        <div class="km-row">
          <input id="km_in" inputmode="numeric" value="${g.km!=null?Math.round(g.km):''}" placeholder="0"/>
          <span class="km-unit">km</span>
          ${[5,10,21].map(k=>`<button class="chip" data-km="${k}">+${k}</button>`).join('')}
        </div>
      </div>`:''}
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#fclose').onclick=closeFicha;
  el.querySelector('#fedit').onclick=()=>editGarment(g);
  const addPh=el.querySelector('#faddph');
  if(addPh){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.multiple=true; inp.style.display='none';
    el.appendChild(inp);
    addPh.onclick=()=>inp.click();
    inp.onchange=async(e)=>{
      const files=[...(e.target.files||[])]; if(!files.length)return;
      addPh.innerHTML=svg('load',18); addPh.querySelector('svg')?.classList.add('spin');
      g.photos=g.photos||[];
      for(const file of files){
        if(1+g.photos.length>=4)break;
        try{ const im=await imageToBase64(file,900,0.82); g.photos.push(im.dataUrl); }catch(err){}
      }
      save(); if(session)cloud.pushGarment(g);
      haptic(); renderFicha();
    };
  }
  const track=el.querySelector('#track'),dots=el.querySelectorAll('.ficha-dots i');
  if(track&&dots.length)track.onscroll=()=>{ const i=Math.round(track.scrollLeft/track.clientWidth); dots.forEach((d,j)=>d.className=j===i?'on':''); };
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openFicha(b.dataset.c));
  el.querySelector('#sale').onclick=()=>{ g.status=onSale?'uso':'venta'; save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
  el.querySelector('#gdel').onclick=function(){
    if(!this.dataset.arm){ this.dataset.arm='1'; this.innerHTML=`${svg('trash',18)} ¿Seguro? Toca otra vez para eliminar`; return; }
    store.garments=store.garments.filter(x=>x.id!==g.id);
    store.deletedIds=store.deletedIds||[]; store.deletedIds.push(g.id);
    save(); haptic(14);
    if(session)cloud.deleteGarmentCloud(g.id).then(()=>{ store.deletedIds=store.deletedIds.filter(i=>i!==g.id); save(); }).catch(()=>{});
    el.remove(); fichaId=null; render(); toast('Prenda eliminada');
  };
  el.querySelector('#wear').onclick=()=>{ haptic(); g.worn++; g.lastWorn='Hoy'; g.lastWornAt=new Date().toISOString(); save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
  el.querySelectorAll('[data-ff]').forEach(b=>b.onclick=()=>{ haptic(); g.fitFeedback=g.fitFeedback===b.dataset.ff?null:b.dataset.ff; save(); if(session)cloud.pushGarment(g); renderFicha(); });
  const kmIn=el.querySelector('#km_in');
  if(kmIn){
    kmIn.onchange=()=>{ const v=parseFloat(kmIn.value); g.km=isNaN(v)?null:v; save(); if(session)cloud.pushGarment(g); renderFicha(); };
    el.querySelectorAll('[data-km]').forEach(b=>b.onclick=()=>{ haptic(); g.km=(Number(g.km)||0)+Number(b.dataset.km); save(); if(session)cloud.pushGarment(g); renderFicha(); });
  }
  if(el.querySelector('#sell_wallapop'))el.querySelector('#sell_wallapop').onclick=()=>prepararVenta(g,'wallapop');
  if(el.querySelector('#sell_vinted'))el.querySelector('#sell_vinted').onclick=()=>prepararVenta(g,'vinted');
  el.querySelector('#docfile').addEventListener('change',ev=>{
    const f=ev.target.files&&ev.target.files[0]; if(!f)return;
    const pdf=/pdf/i.test(f.type);
    g.docs=g.docs||[];
    g.docs.push({type:pdf?'Factura/PDF':'Ticket',icon:pdf?'file':'receipt',name:f.name,dt:'Hoy',url:URL.createObjectURL(f)});
    save(); renderFicha();
  });
}
const spec=(l,v,eco)=>`<div class="spec"><div class="l">${l}</div><div class="v${eco?' eco':''}">${v}</div></div>`;

function editGarment(g){
  const el=document.createElement('div'); el.className='ficha'; el.id='edit';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="eb" style="color:var(--ink)">${svg('back',20)}</button><span class="t">Editar prenda</span></div>
    ${garmentFormHTML(g,{})}
    <button class="btn dark" id="esave" style="margin-top:6px">${svg('check',18)} Guardar cambios</button></div>`;
  document.body.appendChild(el);
  el.querySelector('#eb').onclick=()=>el.remove();
  el.querySelector('#esave').onclick=()=>{ Object.assign(g,readForm(el)); save(); if(session)cloud.pushGarment(g); el.remove(); renderFicha(); render(); };
}

async function prepararVenta(g,plataforma){
  const el=document.createElement('div'); el.className='ficha'; el.id='sellprep';
  const precioSugerido=Math.round(g.price*0.4);
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="sb">${svg('back',20)}</button><span class="t">Anuncio para ${plataforma==='wallapop'?'Wallapop':'Vinted'}</span></div>
    <div class="scanimg" style="margin-bottom:14px"><img src="${g.img||''}"/></div>
    <div id="sell_out"><div class="empty">${svg('load',24)}<div style="margin-top:10px">Generando anuncio…</div></div></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('.empty svg')?.classList.add('spin');
  el.querySelector('#sb').onclick=()=>el.remove();
  const sys=`Eres un experto en vender ropa de segunda mano en ${plataforma}. Genera un anuncio atractivo y honesto.
Devuelve SOLO JSON: {"titulo":"título corto y atractivo, max 50 chars","descripcion":"3-4 frases: estado, detalles, por qué venderla","precio_sugerido":número,"hashtags":["tag1","tag2","tag3"]}.`;
  const usr=`Prenda: ${g.brand} ${g.name}, tipo ${g.cat}, color ${g.color}, talla ${g.size||'?'}, material ${g.material||'?'}, estado ${g.cond}. Precio original ${g.price}€, usada ${g.worn} veces. Precio orientativo: ${precioSugerido}€.`;
  const r=await callAI(sys,usr);
  const out=el.querySelector('#sell_out');
  const titulo=r?.titulo||`${g.brand} ${g.name} talla ${g.size||''}`.trim();
  const precio=r?.precio_sugerido||precioSugerido;
  const desc=r?.descripcion||`${g.brand} ${g.name} en ${(g.cond||'buen estado').toLowerCase()}. Talla ${g.size||'—'}, color ${g.color||'—'}.`;
  const tags=(r?.hashtags||[g.brand,g.cat,g.color]).filter(Boolean);
  out.innerHTML=`
    <div class="field"><label>Título</label><input id="s_titulo" value="${esc(titulo)}"/></div>
    <div class="field"><label>Precio €</label><input id="s_precio" inputmode="decimal" value="${precio}"/></div>
    <div class="field"><label>Descripción</label><textarea id="s_desc" rows="5" style="width:100%;font:inherit;padding:12px;border:1px solid var(--hair);border-radius:12px;background:var(--surface);resize:vertical">${esc(desc)}</textarea></div>
    <div class="chips" style="flex-wrap:wrap;margin-bottom:14px">${tags.map(t=>`<span class="chip on">#${t.replace(/\s+/g,'')}</span>`).join('')}</div>
    <button class="btn dark" id="s_copy" style="margin-bottom:10px">${svg('file',18)} Copiar anuncio</button>
    <button class="btn dark" id="s_open">${svg('chev',18)} Abrir ${plataforma==='wallapop'?'Wallapop':'Vinted'}</button>`;
  out.querySelector('#s_copy').onclick=function(){
    const t=`${out.querySelector('#s_titulo').value}\n\n${out.querySelector('#s_desc').value}\n\nPrecio: ${out.querySelector('#s_precio').value}€\n${tags.map(x=>'#'+x.replace(/\s+/g,'')).join(' ')}`;
    navigator.clipboard?.writeText(t).then(()=>{ this.innerHTML=`${svg('check',18)} ¡Copiado!`; setTimeout(()=>{this.innerHTML=`${svg('file',18)} Copiar anuncio`;},1500); });
  };
  out.querySelector('#s_open').onclick=()=>window.open(plataforma==='wallapop'?'https://es.wallapop.com/app/catalog/upload':'https://www.vinted.es/items/new','_blank','noopener');
}

/* ═══════════════════════════════════════════
   AÑADIR
═══════════════════════════════════════════ */
function vAdd(m){
  if(addMode!=='choose'){ if(m.childElementCount===0){addMode='choose';} else return; }
  m.innerHTML=`
    <div class="reveal"><div class="eyebrow">Añadir</div>
    <div class="title">Tu armario,<br>sin escribir nada</div>
    <div class="sub">Una foto, el ticket o el email de compra. Nunca invento.</div></div>
    <div style="margin-top:24px">
      <button class="opt reveal" id="opt_prenda" style="animation-delay:.05s">
        <span class="ring">${svg('cam',24)}</span>
        <div><div class="t1">Fotografiar prenda</div><div class="t2">Reconocimiento especializado en moda</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
      <input id="pf" type="file" accept="image/*" style="position:absolute;left:-9999px;top:0;opacity:0"/>
      <button class="opt reveal" id="opt_burst" style="animation-delay:.08s">
        <span class="ring" style="background:var(--accent)">${svg('spark',24)}</span>
        <div><div class="t1">Modo ráfaga</div><div class="t2">Sube muchas fotos de golpe · catalogación en cadena</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
      <input id="bf" type="file" accept="image/*" multiple style="position:absolute;left:-9999px;top:0;opacity:0"/>
      <button class="opt alt reveal" id="opt_ticket" style="animation-delay:.11s">
        <span class="ring">${svg('scan',24)}</span>
        <div><div class="t1">Escanear ticket</div><div class="t2">OCR · varias prendas · garantías y plazos</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
      <input id="tf" type="file" accept="image/*" style="position:absolute;left:-9999px;top:0;opacity:0"/>
      <button class="opt alt reveal" id="opt_mail" style="animation-delay:.14s">
        <span class="ring">${svg('send',24)}</span>
        <div><div class="t1">Email de compra</div><div class="t2">Pega el email de confirmación y extraigo las prendas</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
      <button class="opt alt reveal" id="manual" style="animation-delay:.17s">
        <span class="ring" style="background:var(--accent-soft);color:var(--accent)">${svg('pen',24)}</span>
        <div><div class="t1">Añadir manualmente</div><div class="t2">Rellena los datos tú mismo</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
    </div>`;
  const pf=m.querySelector('#pf'), tf=m.querySelector('#tf'), bf=m.querySelector('#bf');
  m.querySelector('#opt_prenda').onclick=()=>pf.click();
  m.querySelector('#opt_burst').onclick=()=>bf.click();
  m.querySelector('#opt_ticket').onclick=()=>tf.click();
  m.querySelector('#opt_mail').onclick=()=>openEmailImport(m);
  pf.onchange=e=>handleScan(m,e,'prenda');
  tf.onchange=e=>handleScan(m,e,'ticket');
  bf.onchange=e=>handleBurst(m,e);
  m.querySelector('#manual').onclick=()=>showPrenda(m,null,null);
}

/* ═══ EMAIL DE COMPRA: pegar texto o captura ═══ */
function openEmailImport(m){
  addMode='email';
  m.innerHTML=`
    <div class="backbar"><button id="eb0" style="color:var(--ink)">${svg('back',20)}</button><span class="t">Email de compra</span></div>
    <div class="reveal">
      <div class="sub" style="margin:4px 0 16px">Pega el email de confirmación (Zara, ASOS, Zalando…) o sube una captura. Extraigo las prendas con talla, color y precio reales.</div>
      <textarea id="em_txt" class="mailbox" placeholder="Pega aquí el texto del email…"></textarea>
      <button class="btn dark" id="em_go" disabled style="margin-top:12px;opacity:.55">${svg('spark',18)} Extraer prendas</button>
      <div class="mail-or"><span>o</span></div>
      <button class="btn ghost" id="em_shot">${svg('cam',18)} Subir captura del email</button>
      <input id="em_file" type="file" accept="image/*" style="position:absolute;left:-9999px;opacity:0"/>
    </div>`;
  m.querySelector('#eb0').onclick=()=>{ addMode='choose'; vAdd(m); };
  const txt=m.querySelector('#em_txt'), go=m.querySelector('#em_go');
  txt.oninput=()=>{ const ok=txt.value.trim().length>40; go.disabled=!ok; go.style.opacity=ok?'1':'.55'; };
  go.onclick=async function(){
    this.disabled=true; this.innerHTML=`${svg('load',18)} Leyendo email…`; this.querySelector('svg').classList.add('spin');
    let r=await callAI(EMAIL_SYSTEM,'Extrae las prendas de este email de compra:\n\n'+txt.value.trim().slice(0,6000));
    if(!r) r=await callAI(EMAIL_SYSTEM,'Extrae las prendas de este email de compra:\n\n'+txt.value.trim().slice(0,6000));
    if(addMode!=='email')return;
    if(r&&r.items&&r.items.length){
      haptic(14);
      // normalizar al formato del ticket y reutilizar su formulario editable
      r.items.forEach(it=>{ it.cat=normalizeCat(it.cat||''); });
      m.innerHTML=`<div class="backbar"><button id="eb1" style="color:var(--ink)">${svg('back',20)}</button><span class="t">Email leído</span></div><div id="stage"></div>`;
      m.querySelector('#eb1').onclick=()=>{ addMode='choose'; vAdd(m); };
      showTicket(m,{...r,date:r.dateISO||''},null);
    } else {
      this.disabled=false; this.innerHTML=`${svg('spark',18)} Extraer prendas`;
      toast('No pude extraer prendas de ese texto. Prueba con la captura.');
    }
  };
  const ef=m.querySelector('#em_file');
  m.querySelector('#em_shot').onclick=()=>ef.click();
  ef.onchange=e=>handleScan(m,e,'ticket'); // la captura del email va por visión, mismo pipeline que el ticket
}

/* ═══ MODO RÁFAGA: catalogación en cadena ═══ */
async function handleBurst(m,e){
  const files=[...(e.target.files||[])].slice(0,20);
  e.target.value='';
  if(!files.length)return;
  addMode='burst';
  let cancelled=false;
  const results=[]; // {ok, id, name, brand, low, error}
  m.innerHTML=`
    <div class="backbar"><button id="bb0" style="color:var(--ink)">${svg('back',20)}</button><span class="t">Modo ráfaga</span></div>
    <div class="burst-head">
      <div class="burst-count" id="bcount">0<span>/${files.length}</span></div>
      <div class="sub" id="bstatus">Catalogando tu armario…</div>
      <div class="burst-bar"><div id="bbar" style="width:0%"></div></div>
    </div>
    <div class="burst-list" id="blist"></div>
    <button class="btn dark" id="bdone" style="margin-top:16px;display:none">${svg('check',18)} Ver mi armario</button>`;
  const list=m.querySelector('#blist');
  m.querySelector('#bb0').onclick=()=>{ cancelled=true; addMode='choose'; vAdd(m); };

  for(let i=0;i<files.length;i++){
    if(cancelled)return;
    const row=document.createElement('div'); row.className='burst-row';
    row.innerHTML=`<div class="br-ph skel"></div><div class="br-info"><div class="br-n">Prenda ${i+1}</div><div class="br-s">Analizando…</div></div><span class="br-state">${svg('load',16)}</span>`;
    row.querySelector('svg')?.classList.add('spin');
    list.prepend(row);
    try{
      const img=await imageToBase64(files[i],1152,0.85);
      row.querySelector('.br-ph').outerHTML=`<div class="br-ph"><img src="${img.dataUrl}"/></div>`;
      let r=await callAI(VISION_SYSTEM,'Analiza esta prenda con máxima precisión.',img);
      if(!r) r=await callAI(VISION_SYSTEM,'Analiza esta prenda con máxima precisión.',img);
      if(cancelled)return;
      if(r&&r.detected){
        if(r.cat)r.cat=normalizeCat(r.cat);
        const c=r.confidence||{};
        const low=Object.values(c).some(v=>v<0.75);
        const gid='g'+Date.now()+Math.random().toString(36).slice(2,6);
        addGarment({id:gid,brand:r.brand||'—',name:r.name||r.cat||'Prenda',cat:r.cat||'Otro',catGroup:catToGroup(r.cat||''),
          fit:r.fit||'Regular Fit',color:r.color||'—',colors:(r.colors&&r.colors.length?r.colors:[r.color||'—']),
          material:r.material||'',size:'',season:r.season||'Todo el año',formality:r.formality||'Casual',
          context:r.context==='deporte'?'deporte':'calle',sport:r.context==='deporte'?(r.sport||''):'',
          bought:'—',store:'',price:0,cond:'Como nuevo',worn:0,lastWorn:'—',status:'uso',
          img:img.dataUrl,photos:[],docs:[],tags:[]});
        results.push({ok:true,id:gid,name:r.name||r.cat,brand:r.brand||'',low});
        row.querySelector('.br-n').textContent=(r.brand?r.brand+' · ':'')+(r.name||r.cat||'Prenda');
        row.querySelector('.br-s').textContent=low?'Guardada · revisa los detalles':'Catalogada';
        row.querySelector('.br-state').innerHTML=low?svg('spark',16):svg('check',16);
        row.classList.add(low?'low':'ok');
        row.onclick=()=>openFicha(gid);
      } else {
        results.push({ok:false});
        row.querySelector('.br-n').textContent='Prenda '+(i+1);
        row.querySelector('.br-s').textContent='No identificada · añádela manualmente';
        row.querySelector('.br-state').innerHTML='✕';
        row.classList.add('err');
      }
    }catch(err){
      results.push({ok:false});
      row.querySelector('.br-s').textContent='Error con esta imagen';
      row.querySelector('.br-state').innerHTML='✕';
      row.classList.add('err');
    }
    const done=i+1, oks=results.filter(x=>x.ok).length;
    const bc=m.querySelector('#bcount'), bb=m.querySelector('#bbar');
    if(bc)bc.innerHTML=`${done}<span>/${files.length}</span>`;
    if(bb)bb.style.width=Math.round(done/files.length*100)+'%';
  }
  if(cancelled)return;
  haptic(16);
  const oks=results.filter(x=>x.ok).length, lows=results.filter(x=>x.low).length, errs=results.length-oks;
  const st=m.querySelector('#bstatus');
  if(st)st.innerHTML=`<b>${oks} catalogada${oks!==1?'s':''}</b>${lows?` · ${lows} para revisar`:''}${errs?` · ${errs} fallida${errs!==1?'s':''}`:''}`;
  const doneBtn=m.querySelector('#bdone');
  if(doneBtn){ doneBtn.style.display='flex'; doneBtn.onclick=()=>{ addMode='choose'; go('armario'); }; }
}

function handleScan(m,e,kind){
  addMode='scan'; // protege el escaneo de re-renders de fondo (refresh de sesión al volver de la cámara)
  const f=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!f){
    m.innerHTML=`<div class="backbar"><button id="b9" style="color:var(--ink)">${svg('back',20)}</button><span class="t">Sin imagen</span></div>
      <div class="note warn" style="margin-top:14px">${svg('spark',18)}<span>No se recibió ninguna imagen. Si la cámara no se abrió, prueba a elegir una foto de la galería.</span></div>`;
    m.querySelector('#b9').onclick=()=>{addMode='choose';vAdd(m);};
    return;
  }
  const sizeMB=(f.size/1048576).toFixed(1);
  m.innerHTML=`
    <div class="backbar"><button id="b0" style="color:var(--ink)">${svg('back',20)}</button><span class="t">${kind==='ticket'?'Leyendo ticket':'Reconociendo prenda'}</span></div>
    <div class="empty" style="padding-top:80px">${svg('load',30)}<div style="margin-top:14px">Preparando imagen…</div>
    <div style="margin-top:6px;font-size:11px;color:var(--ink3)">${f.type||'tipo?'} · ${sizeMB} MB</div></div>`;
  m.querySelector('#b0').onclick=()=>{addMode='choose';vAdd(m);};
  imageToBase64(f, kind==='ticket'?1800:1152, kind==='ticket'?0.92:0.85)
    .then(img=>runPipeline(m,img,kind))
    .catch(err=>{
      m.innerHTML=`
        <div class="backbar"><button id="b1" style="color:var(--ink)">${svg('back',20)}</button><span class="t">${kind==='ticket'?'Ticket':'Prenda'}</span></div>
        <div class="note warn" style="margin-top:14px">${svg('spark',18)}<span>No pude procesar la foto.<br><b>Motivo:</b> ${esc(err.message||'error')}<br><b>Archivo:</b> ${esc(f.type||'?')} · ${sizeMB} MB</span></div>
        <button class="btn dark" id="man" style="margin-top:14px">${svg('pen',18)} Añadir manualmente</button>
        <button class="btn ghost" id="retry" style="margin-top:10px">Volver a intentar</button>`;
      m.querySelector('#b1').onclick=()=>{addMode='choose';vAdd(m);};
      m.querySelector('#man').onclick=()=>showPrenda(m,null,null);
      m.querySelector('#retry').onclick=()=>{addMode='choose';vAdd(m);};
    });
}

async function runPipeline(m,img,kind){
  const steps=kind==='ticket'
    ?['Procesando imagen','Corrigiendo perspectiva','Leyendo línea a línea','Extrayendo prendas y precios']
    :['Analizando la prenda','Identificando tipo y corte','Buscando marca y tejido','Afinando el resultado'];
  m.innerHTML=`
    <div class="backbar"><button id="b" style="color:var(--ink)">${svg('back',20)}</button><span class="t">${kind==='ticket'?'Leyendo ticket':'Reconociendo prenda'}</span></div>
    <div id="stage">
      <div class="scanwrap">
        <img src="${img.dataUrl}" alt=""/>
        <div class="scan-veil"></div>
        <div class="scan-line"></div>
        <div class="scan-reveal" id="scanreveal"></div>
      </div>
      <div class="pipe-steps" id="psteps">${steps.map((s,i)=>`<div class="pstep" id="ps${i}"><span class="pdot"></span>${s}</div>`).join('')}</div>
    </div>`;
  m.querySelector('#b').onclick=()=>{addMode='choose';vAdd(m);};

  // pasos con ritmo orgánico (rápido al inicio, se detiene en el último hasta que la IA responde)
  const stepDelays=[500,900,1500];
  stepDelays.forEach((d,i)=>setTimeout(()=>{ const el=m.querySelector(`#ps${i}`); if(el)el.classList.add('done'); },d));

  // llamada a la IA con un reintento automático si falla
  const usr=kind==='ticket'?'Extrae todas las prendas de este ticket de compra.':'Analiza esta prenda con máxima precisión.';
  const sys=kind==='ticket'?TICKET_SYSTEM:VISION_SYSTEM;
  let result=await callAI(sys,usr,img);
  if(!result) result=await callAI(sys,usr,img);

  steps.forEach((_,i)=>{ const el=m.querySelector(`#ps${i}`); if(el)el.classList.add('done'); });

  // si el usuario pulsó atrás durante el análisis, no sobrescribir su pantalla
  if(!m.querySelector('#stage')) return;

  // momento de revelación editorial sobre la foto
  const rev=m.querySelector('#scanreveal');
  const wrap=m.querySelector('.scanwrap');
  if(rev&&result){
    haptic(14);
    if(kind==='ticket'&&result.items?.length){
      rev.innerHTML=`<div class="sr-k">${esc(result.store||'Ticket leído')}</div><div class="sr-n">${result.items.length} prenda${result.items.length>1?'s':''} encontrada${result.items.length>1?'s':''}</div>`;
    } else if(kind!=='ticket'&&result.detected){
      rev.innerHTML=`<div class="sr-k">${esc(result.brand||'Identificada')}</div><div class="sr-n">${esc(result.name||result.cat||'Prenda')}</div>`;
    }
    if(rev.innerHTML){ wrap.classList.add('found'); await new Promise(r=>setTimeout(r,1300)); }
  }
  if(!m.querySelector('#stage')) return; // salió durante la revelación
  if(kind==='ticket') showTicket(m,result,img);
  else showPrenda(m,result,img);
}

function showPrenda(m,r,img){
  const failed=!r||!r.detected;
  if(r&&r.cat)r.cat=normalizeCat(r.cat);
  const c=r?.confidence||{};
  const hasLow=Object.values(c).some(v=>v<0.75);
  const askCtx=!r||!r.context; // la IA no lo tuvo claro: preguntamos, nunca asumimos
  const stage=m?.querySelector?.('#stage')||m;
  stage.innerHTML=`
    ${failed?`<div class="note warn reveal" style="margin-bottom:14px">${svg('spark',18)}<span>No pude analizarla automáticamente esta vez. Rellena los datos — nunca invento.</span></div>`
    :hasLow?`<div class="note warn reveal" style="margin-bottom:14px">${svg('spark',18)}<span>Los campos en naranja tienen confianza baja. Revísalos antes de guardar.</span></div>`
    :`<div class="note reveal" style="margin-bottom:14px">${svg('check',18)}<span>Catalogada con alta confianza. Edita lo que necesites.</span></div>`}
    ${img?`<div class="scanimg reveal" style="animation-delay:.05s" id="scanprev"><img src="${img.dataUrl}"/></div>
    <button class="studio-btn reveal" id="studiobtn" style="animation-delay:.07s">${svg('spark',15)} Fondo de estudio</button>`:''}
    ${askCtx?`<div class="ctx-ask reveal" style="animation-delay:.08s">
      <div class="ctx-ask-t">¿Dónde vive esta prenda?</div>
      <div class="ctx-ask-btns">
        <button class="ctx-btn" data-ctxpick="calle">${svg('hanger',17)} Calle</button>
        <button class="ctx-btn" data-ctxpick="deporte">${svg('spark',17)} Deporte</button>
      </div>
    </div>`:''}
    <div class="reveal" style="animation-delay:.1s">${garmentFormHTML(r||{},c)}</div>
    <button class="btn dark reveal" id="conf" style="margin-top:6px;animation-delay:.18s">${svg('add',18,2)} Añadir al armario</button>`;
  // Fondo de estudio: recorte real + blanco roto uniforme
  const stBtn=stage.querySelector('#studiobtn');
  if(stBtn&&img){
    const runStudio=async()=>{
      stBtn.disabled=true; stBtn.innerHTML=`${svg('load',15)} Preparando estudio… (la primera vez tarda un poco)`; stBtn.querySelector('svg').classList.add('spin');
      try{
        const out=await studioPhoto(img.dataUrl);
        img.dataUrl=out; img.data=out.split(',')[1];
        const pv=stage.querySelector('#scanprev img');
        if(pv){ pv.style.transition='opacity .35s var(--ease)'; pv.style.opacity='0';
          setTimeout(()=>{ pv.src=out; pv.onload=()=>pv.style.opacity='1'; },360); }
        store.profile=store.profile||{}; store.profile.studioPhoto=true; save();
        stBtn.innerHTML=`${svg('check',15)} Foto de estudio aplicada`; haptic();
      }catch(e){
        stBtn.disabled=false; stBtn.innerHTML=`${svg('spark',15)} Fondo de estudio`;
        toast('No pude recortar bien esta foto: '+(e.message||''));
      }
    };
    stBtn.onclick=runStudio;
    if(store.profile?.studioPhoto) runStudio(); // preferencia recordada
  }

  // la pregunta y el select del formulario van sincronizados
  stage.querySelectorAll('[data-ctxpick]').forEach(b=>b.onclick=()=>{
    stage.querySelectorAll('[data-ctxpick]').forEach(x=>x.classList.toggle('on',x===b));
    const sel=stage.querySelector('#f_ctx'); if(sel)sel.value=b.dataset.ctxpick;
    haptic();
    if(b.dataset.ctxpick==='deporte'){ const sp=stage.querySelector('#f_sport'); if(sp)sp.focus(); }
  });
  stage.querySelector('#conf').onclick=()=>{
    const d=readForm(stage);
    addGarment({...d,catGroup:catToGroup(d.cat),bought:'Hoy',worn:0,lastWorn:'—',status:'uso',img:img?.dataUrl||'./assets/silbon-raquetas-white.png',photos:[],docs:[],tags:[]});
    trackPurchaseEvent({brand:d.brand,cat:d.cat,price:d.price,store:d.store,channel:'manual'});
    celebrateAdd(img?.dataUrl, `${d.brand||''} ${d.name||d.cat}`).then(()=>{ addMode='choose'; go('armario'); });
  };
}

function normalizeCat(cat=''){
  const c=cat.toLowerCase().trim();
  const map={'t-shirt':'Camiseta manga corta','tshirt':'Camiseta manga corta','tee':'Camiseta manga corta','long sleeve':'Camiseta manga larga','polo':'Polo','top':'Top','pants':'Pantalón vestir','trousers':'Pantalón vestir','jeans':'Vaquero','denim':'Vaquero','chino':'Chino','chinos':'Chino','cargo':'Cargo','jogger':'Jogger','joggers':'Jogger','shorts':'Shorts','short':'Shorts','shirt':'Camisa Oxford','sweater':'Jersey','jumper':'Jersey','knit':'Jersey','knitwear':'Jersey','sweatshirt':'Sudadera','hoodie':'Hoodie','blazer':'Blazer','jacket':'Bomber','coat':'Abrigo','parka':'Parka','puffer':'Plumífero','overcoat':'Abrigo','shoes':'Sneakers','sneakers':'Sneakers','trainers':'Sneakers','boots':'Botas','dress':'Vestido','skirt':'Falda','bag':'Bolso','backpack':'Mochila','cap':'Gorra','belt':'Cinturón'};
  if(map[c])return map[c];
  const exact=CATS_DETAIL.find(x=>x.toLowerCase()===c); if(exact)return exact;
  const partial=CATS_DETAIL.find(x=>x.toLowerCase().includes(c)||c.includes(x.toLowerCase()));
  return partial||cat||'Otro';
}

function showTicket(m,r,img){
  if(!r||!r.items?.length)r={store:'',date:'',items:[{name:'',brand:'',price:0,cat:'',confidence:.5}]};
  r.items.forEach(it=>{ it.cat=normalizeCat(it.cat||''); });
  const stage=m.querySelector('#stage');
  const today=new Date().toISOString().slice(0,10);
  stage.innerHTML=`
    <div class="note" style="margin-bottom:14px">${svg('receipt',18)}<span>He leído el ticket. <b>Revisa y corrige</b> lo que no haya detectado bien antes de guardar — no invento nada.</span></div>
    ${img?`<div class="scanimg"><img src="${img.dataUrl}"/></div>`:''}

    <div class="shead"><h2>Datos del ticket</h2></div>
    <div class="row2">
      <div class="field"><label>Tienda / Marca</label><input id="t_store" value="${esc(r.store||'')}" placeholder="Ecoalf"/></div>
      <div class="field"><label>Fecha de compra</label><input id="t_date" type="date" value="${r.dateISO||today}"/></div>
    </div>
    <div class="row2">
      <div class="field"><label>Total (€)</label><input id="t_total" inputmode="decimal" value="${r.total||''}" placeholder="—"/></div>
      <div class="field"><label>Días para devolver</label><input id="t_return" inputmode="numeric" value="${r.returnDays||30}" placeholder="30"/></div>
    </div>
    <div class="field"><label>Garantía (meses, opcional)</label><input id="t_warranty" inputmode="numeric" value="${r.warrantyMonths||''}" placeholder="Ej. 24 para calzado/electrónica"/></div>

    <div class="shead"><h2>Prendas del ticket · ${r.items.length}</h2></div>
    <div id="t_items">
      ${r.items.map((it,i)=>`<div class="titem" data-i="${i}">
        <div class="titem-head">Prenda ${i+1}<button class="titem-del" data-del="${i}">${svg('trash',15)}</button></div>
        ${garmentFormHTML({brand:it.brand||'',name:it.name||'',cat:it.cat||'',price:it.price||0,color:it.color||'',material:'',size:it.size||'',fit:'Regular Fit',season:'Todo el año',formality:'Casual',cond:'Nuevo con etiqueta'}, it.confidence?{}:{},'ti'+i+'_')}
      </div>`).join('')}
    </div>
    <button class="btn ghost" id="t_add" style="margin-bottom:14px">${svg('add',16)} Añadir otra prenda del ticket</button>
    <button class="btn dark" id="conf">${svg('add',18,2)} Guardar ticket y prendas</button>`;

  const rebuildDel=()=>stage.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    const items=stage.querySelectorAll('.titem'); if(items.length<=1)return;
    b.closest('.titem').remove();
  });
  rebuildDel();
  stage.querySelector('#t_add').onclick=()=>{
    const wrap=stage.querySelector('#t_items'); const i=wrap.querySelectorAll('.titem').length;
    const div=document.createElement('div'); div.className='titem'; div.dataset.i=i;
    div.innerHTML=`<div class="titem-head">Prenda ${i+1}<button class="titem-del" data-del="${i}">${svg('trash',15)}</button></div>`+
      garmentFormHTML({fit:'Regular Fit',season:'Todo el año',formality:'Casual',cond:'Nuevo con etiqueta'},{},'ti'+i+'_');
    wrap.appendChild(div); rebuildDel();
  };

  stage.querySelector('#conf').onclick=async ()=>{
    const store_=stage.querySelector('#t_store').value.trim();
    const dateISO=stage.querySelector('#t_date').value||today;
    const total=parseFloat(stage.querySelector('#t_total').value)||0;
    const returnDays=parseInt(stage.querySelector('#t_return').value)||0;
    const warrantyMonths=parseInt(stage.querySelector('#t_warranty').value)||0;
    const ticketId='t'+Date.now()+Math.random().toString(36).slice(2,5);

    // guardar imagen del ticket en Storage (si hay sesión); si no, queda en local
    let ticketImgUrl=img?.dataUrl||null;
    if(session && img?.dataUrl){
      const up=await cloud.uploadTicketImage(ticketId,img.dataUrl).catch(()=>null);
      if(up&&up.url)ticketImgUrl=up.url;
    }

    // leer cada prenda del formulario
    const items=[]; const garmentIds=[];
    stage.querySelectorAll('.titem').forEach(node=>{
      const pre='ti'+node.dataset.i+'_';
      const d=readFormPrefixed(node,pre);
      if(!d.cat && !d.brand && !d.name) return; // vacía, ignorar
      const gid='g'+Date.now()+Math.random().toString(36).slice(2,6);
      garmentIds.push(gid);
      const g={id:gid,context:d.context||'calle',sport:d.sport||'',brand:d.brand||'—',name:d.name||d.cat||'Prenda',cat:d.cat||'Otro',catGroup:catToGroup(d.cat||''),
        fit:d.fit||'Regular Fit',color:d.color||'—',colors:[d.color||'—'],material:d.material||'',size:d.size||'',
        season:d.season||'Todo el año',formality:d.formality||'Casual',bought:dateISO,store:store_,price:parseFloat(d.price)||0,
        cond:d.cond||'Nuevo con etiqueta',worn:0,lastWorn:'—',status:'uso',img:ticketImgUrl||'./assets/silbon-raquetas-white.png',
        photos:[],docs:[],tags:[],sku:'',ticketId};
      store.garments.unshift(g); save();
      if(session) cloud.pushGarment(g).then(res=>{ if(res&&!res.ok) showSyncWarning(res.reason); });
      items.push({brand:g.brand,cat:g.cat,price:g.price});
      trackPurchaseEvent({brand:g.brand,cat:g.cat,price:g.price,store:store_,channel:'physical'});
    });

    // guardar el ticket
    const ticket={id:ticketId,store:store_,dateISO,total:total||items.reduce((s,x)=>s+(x.price||0),0),
      returnDays,warrantyMonths,img:ticketImgUrl,garmentIds,items,createdAt:new Date().toISOString()};
    saveTicket(ticket);

    addMode='choose'; go('armario');
  };
}

// lee un formulario de prenda con prefijo en los ids (para varios en la misma pantalla)
function readFormPrefixed(scope,pre){
  const q=id=>{ const e=scope.querySelector('#'+pre+id); return e?e.value.trim():''; };
  return {brand:q('brand'),name:q('name'),cat:q('cat'),fit:q('fit'),color:q('color'),material:q('mat'),
    size:q('size'),price:q('price'),season:q('season'),formality:q('form'),cond:q('cond'),context:q('ctx')||'calle',sport:q('ctx')==='deporte'?q('sport'):''};
}

function saveWishlistItem(w){
  store.wishlist=store.wishlist||[];
  w.createdAt=new Date().toISOString();
  store.wishlist.unshift(w);
  save();
  if(session) cloud.saveWishlistCloud(w).then(r=>{ if(r&&!r.ok) showSyncWarning(r.reason); });
}
function deleteWishlistItem(id){
  store.wishlist=(store.wishlist||[]).filter(w=>w.id!==id);
  save();
  if(session) cloud.deleteWishlistCloud(id);
}
function openWishlist(){
  const el=document.createElement('div'); el.className='ficha'; el.id='wishlist';
  const paint=()=>{
    const items=store.wishlist||[];
    el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
      <div class="backbar"><button id="wlb">${svg('back',20)}</button><span class="t">Wishlist</span></div>
      ${items.length?`<div class="sub" style="margin-bottom:14px">Prendas que vigilas. Toca «Revisar precio» para ver el mejor precio de hoy.</div>`:''}
      ${items.length?'':`<div class="empty" style="padding-top:60px">${svg('heart',28)}<div style="margin-top:12px">Aún no vigilas ninguna prenda.<br>Guárdalas desde «¿Me lo compro?».</div></div>`}
      ${items.map(w=>`<div class="wl-card" data-id="${w.id}">
        <div class="wl-ph">${w.thumbnail?`<img loading="lazy" src="${esc(w.thumbnail)}"/>`:svg('heart',20)}</div>
        <div class="wl-info">
          <div class="wl-n">${esc(w.desc||((w.brand||'')+' '+(w.tipo||'')))}</div>
          <div class="wl-meta">${w.lastPrice?`Visto a <b>${Number(w.lastPrice).toFixed(0)}€</b>`:'Sin precio aún'}${w.targetPrice?` · objetivo ${Number(w.targetPrice).toFixed(0)}€`:''}</div>
          <div class="wl-check" id="chk_${w.id}"></div>
          <div class="wl-actions">
            <button class="wl-btn" data-check="${w.id}">${svg('tag',14)} Revisar precio</button>
            ${w.lastLink?`<a class="wl-btn ghost" href="${esc(w.lastLink)}" target="_blank" rel="noopener">Ver ${esc(w.lastSource||'tienda')}</a>`:''}
            <button class="wl-del" data-del="${w.id}" aria-label="Quitar">${svg('trash',15)}</button>
          </div>
        </div>
      </div>`).join('')}
    </div>`;
    el.querySelector('#wlb').onclick=()=>el.remove();
    el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ deleteWishlistItem(b.dataset.del); paint(); });
    el.querySelectorAll('[data-check]').forEach(b=>b.onclick=async function(){
      const w=(store.wishlist||[]).find(x=>x.id===this.dataset.check); if(!w)return;
      this.disabled=true; this.innerHTML=`${svg('load',14)} …`; this.querySelector('svg').classList.add('spin');
      const u=userContext();
      const res=await searchOffersExtensive({query:w.query||((w.brand||'')+' '+(w.tipo||'')),brand:w.brand,productType:w.tipo,ownedBrands:u.topBrands,sex:u.sex,avgPrice:u.avgPrice});
      const box=el.querySelector('#chk_'+w.id);
      const best=res&&res.exact&&res.exact[0];
      if(best){
        const price=best.price_value||null;
        const dropped=price&&w.lastPrice&&price<w.lastPrice-0.01;
        if(box)box.innerHTML=`<div class="wl-now ${dropped?'drop':''}">${dropped?svg('spark',13)+' ¡Ha bajado! ':''}Hoy: <b>${best.price||''}</b> en ${esc(best.source||'')} · <a href="${esc(best.link)}" target="_blank" rel="noopener">ver</a></div>`;
        if(price){ w.lastPrice=price; w.lastLink=best.link; w.lastSource=best.source; if(best.thumbnail)w.thumbnail=best.thumbnail; save(); if(session)cloud.saveWishlistCloud(w); }
        if(dropped)haptic(20);
      } else if(box){
        box.innerHTML=`<div class="wl-now">Sin resultados ahora mismo para esta búsqueda.</div>`;
      }
      this.disabled=false; this.innerHTML=`${svg('tag',14)} Revisar precio`;
    });
  };
  paint();
  document.body.appendChild(el);
}

function saveTicket(t){
  store.tickets=store.tickets||[];
  store.tickets.unshift(t);
  save();
  if(session) cloud.saveTicketCloud(t).then(r=>{ if(r&&!r.ok) showSyncWarning(r.reason); });
}
function deleteTicket(id){
  store.tickets=(store.tickets||[]).filter(t=>t.id!==id);
  save();
  if(session) cloud.deleteTicketCloud(id);
}

let ticketSort='date';
function openTickets(){
  const el=document.createElement('div'); el.className='ficha'; el.id='tickets-view';
  renderTicketsView(el);
  document.body.appendChild(el);
}
function fmtDate(iso){ if(!iso)return '—'; const d=new Date(iso); if(isNaN(d))return iso; return d.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}); }
function returnStatus(t){
  if(!t.returnDays||!t.dateISO)return null;
  const limit=new Date(t.dateISO); limit.setDate(limit.getDate()+t.returnDays);
  const days=Math.ceil((limit-Date.now())/86400000);
  if(days<0)return {txt:'Plazo de cambio vencido',cls:'off',limit};
  if(days<=7)return {txt:`Últimos ${days} día(s) para cambiar`,cls:'urgent',limit};
  return {txt:`Cambio hasta ${fmtDate(limit.toISOString())}`,cls:'ok',limit};
}
function renderTicketsView(el){
  const tickets=(store.tickets||[]).slice();
  let groups;
  if(ticketSort==='store'){
    const by={}; tickets.forEach(t=>{const k=t.store||'Sin tienda';(by[k]=by[k]||[]).push(t);});
    groups=Object.keys(by).sort().map(k=>({title:k,items:by[k]}));
  } else {
    tickets.sort((a,b)=>(b.dateISO||'').localeCompare(a.dateISO||''));
    groups=[{title:null,items:tickets}];
  }
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="tvb">${svg('back',20)}</button><span class="t">Tickets y garantías</span></div>
    <div class="viewseg" style="margin-bottom:16px">
      <button class="vseg ${ticketSort==='date'?'on':''}" data-sort="date">Cronológico</button>
      <button class="vseg ${ticketSort==='store'?'on':''}" data-sort="store">Por tienda</button>
    </div>
    ${tickets.length?'':`<div class="empty" style="padding-top:50px">${svg('receipt',28)}<div style="margin-top:12px">Aún no has escaneado tickets.<br>Escanea uno desde el botón + · Escanear ticket.</div></div>`}
    ${groups.map(g=>`${g.title?`<div class="tk-group">${esc(g.title)}</div>`:''}${g.items.map(t=>{
      const rs=returnStatus(t);
      const warranty=t.warrantyMonths?(()=>{const w=new Date(t.dateISO);w.setMonth(w.getMonth()+t.warrantyMonths);return `Garantía hasta ${fmtDate(w.toISOString())}`;})():null;
      return `<div class="tk-card" data-id="${t.id}">
        ${t.img?`<div class="tk-thumb"><img loading="lazy" decoding="async" src="${esc(t.img)}"/></div>`:`<div class="tk-thumb ph">${svg('receipt',22)}</div>`}
        <div class="tk-body">
          <div class="tk-store">${esc(t.store||'Ticket')}</div>
          <div class="tk-meta">${fmtDate(t.dateISO)} · ${(t.items||[]).length} prenda(s) · ${Math.round(t.total||0)}€</div>
          ${rs?`<div class="tk-badge ${rs.cls}">${svg('spark',12)} ${rs.txt}</div>`:''}
          ${warranty?`<div class="tk-badge ok" style="margin-top:4px">${svg('check',12)} ${warranty}</div>`:''}
        </div>
        <button class="tk-del" data-del="${t.id}">${svg('trash',16)}</button>
      </div>`;}).join('')}`).join('')}
  </div>`;
  el.querySelector('#tvb').onclick=()=>el.remove();
  el.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{ ticketSort=b.dataset.sort; renderTicketsView(el); });
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); deleteTicket(b.dataset.del); renderTicketsView(el); });
  el.querySelectorAll('.tk-card').forEach(c=>c.onclick=()=>{ const t=(store.tickets||[]).find(x=>x.id===c.dataset.id); if(t&&t.img)openTicketImage(t.img); });
}
function openTicketImage(url){
  const ov=document.createElement('div'); ov.className='tk-lightbox'; ov.innerHTML=`<img src="${esc(url)}"/>`;
  ov.onclick=()=>ov.remove(); document.body.appendChild(ov);
}

function catToGroup(cat=''){
  if(/camiseta|polo|top/i.test(cat))return 'Camisetas';
  if(/camisa/i.test(cat))return 'Camisas';
  if(/jersey|sudadera|hoodie/i.test(cat))return 'Jerséis/Sudaderas';
  if(/blazer|americana|bomber|chaqueta|abrigo|parka|gabardina|plum|cort/i.test(cat))return 'Chaquetas/Abrigos';
  if(/pantalón|chino|cargo|jogger|vaquero|wide|straight|slim/i.test(cat))return 'Pantalones';
  if(/short|bermuda/i.test(cat))return 'Shorts/Bermudas';
  if(/falda|vestido/i.test(cat))return 'Faldas/Vestidos';
  if(/sneak|bamba|running|bota|botín|sandal|chanc|tacón|oxford|mocasín|zapatill/i.test(cat))return 'Calzado';
  return 'Accesorios';
}

/* ═══════════════════════════════════════════
   ESCÁNER EN TIENDA (Feature 32)
   Dato B2B de máximo valor: intención de compra real
═══════════════════════════════════════════ */
function openScannerTienda(){
  const el=document.createElement('div'); el.className='ficha'; el.id='scanner'; el.style.zIndex='200';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="scb">${svg('back',20)}</button><span class="t">Estás en tienda</span></div>
    <div class="note" style="margin-bottom:16px">${svg('store',18)}<span>Haz una foto de la prenda o descríbela. Drobe busca el mejor precio de esa marca <b>y alternativas más baratas que se le parezcan</b>.</span></div>
    <button class="opt" id="sc_photo_btn" style="margin-bottom:14px">
      <span class="ring">${svg('cam',24)}</span>
      <div><div class="t1">Foto de la prenda o etiqueta</div><div class="t2">Drobe la identifica automáticamente</div></div>
      <span class="arr">${svg('chev',20)}</span></button>
    <input id="sc_photo" type="file" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"/>
    <div class="field"><label>O descríbela</label><input id="sc_q" placeholder="Pantalón lino azul marino Ecoalf…"/></div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="sc_brand" placeholder="Ecoalf"/></div>
      <div class="field"><label>Precio que ves</label><input id="sc_price" inputmode="decimal" placeholder="120"/></div>
    </div>
    <div class="field"><label>Tienda</label><input id="sc_store" placeholder="Ecoalf, El Corte Inglés…"/></div>
    <button class="btn dark" id="sc_go">${svg('target',18)} Buscar mejor precio</button>
    <div id="sc_out" style="margin-top:16px"></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#scb').onclick=()=>el.remove();
  el.querySelector('#sc_photo_btn').onclick=()=>el.querySelector('#sc_photo').click();

  // Foto → Groq vision rellena los campos
  el.querySelector('#sc_photo').addEventListener('change',async ev=>{
    const f=ev.target.files&&ev.target.files[0]; ev.target.value=''; if(!f)return;
    const out=el.querySelector('#sc_out');
    out.innerHTML=`<div class="empty" style="padding-top:20px">${svg('load',26)}<div style="margin-top:10px">Identificando la prenda…</div></div>`;
    out.querySelector('svg')?.classList.add('spin');
    try{
      const img=await imageToBase64(f);
      const r=await callAI(VISION_SYSTEM,'Identifica esta prenda con máxima precisión para buscarla en tiendas.',img);
      if(r){
        if(r.brand)el.querySelector('#sc_brand').value=r.brand;
        const desc=[r.cat,r.color,r.material].filter(Boolean).join(' ');
        el.querySelector('#sc_q').value=[r.brand,desc].filter(Boolean).join(' ');
        out.innerHTML=`<div class="note"${''}>${svg('check',18)}<span>Detecté: <b>${[r.brand,r.cat,r.color].filter(Boolean).join(' ')||'prenda'}</b>. Revisa y pulsa "Buscar mejor precio".</span></div>`;
      } else {
        out.innerHTML=`<div class="note warn">${svg('spark',18)}<span>No pude identificarla. Descríbela a mano.</span></div>`;
      }
    }catch(e){
      out.innerHTML=`<div class="note warn">${svg('spark',18)}<span>No pude procesar la foto. Descríbela a mano.</span></div>`;
    }
  });

  el.querySelector('#sc_go').onclick=async function(){
    const q=el.querySelector('#sc_q').value.trim();
    const brand=el.querySelector('#sc_brand').value.trim();
    if(!q&&!brand)return;
    const price=parseFloat(el.querySelector('#sc_price').value)||null;
    const storeName=el.querySelector('#sc_store').value.trim();
    const out=el.querySelector('#sc_out');
    this.disabled=true; this.innerHTML=`${svg('load',18)} Buscando ofertas…`; this.querySelector('svg').classList.add('spin');

    const dna=computeStyleDNA();
    const mySize=brand&&dna.sizeByBrand?.[brand]?`Tu talla en ${brand} suele ser ${dna.sizeByBrand[brand]}.`:'';
    const similar=store.garments.filter(g=>g.status!=='venta'&&(q.toLowerCase().includes((g.cat||'').toLowerCase().split(' ')[0])||(brand&&(g.brand||'').toLowerCase()===brand.toLowerCase())));
    const dupAlert=similar.length?`Ya tienes: ${similar.map(g=>g.brand+' '+g.name).join(', ')}.`:'';

    // tipo de prenda sin marca para buscar alternativas
    const productType=brand
      ? q.replace(new RegExp('\\b'+brand+'\\b','gi'),'').replace(/\s+/g,' ').trim()||q
      : q;

    const sys=`Eres el asesor de compra de Drobe. El usuario está en una tienda. Conoces su perfil real (sexo, presupuesto, marcas que usa, estilo) y lo usas para acertar. Sé directo. REGLA DURA: nunca sugieras marcas de segmento inferior al suyo (Shein/Temu/AliExpress prohibidas siempre; Primark/Lefties/Kiabi prohibidas si gasta +35€/prenda). Todo para su sexo y edad, nunca de mujer si es hombre ni de niños. Devuelve SOLO JSON:
{"veredicto":"comprar"|"dudoso"|"evitar","encaje":0-100,"razon":"1-2 frases directas que tengan en cuenta su estilo y presupuesto","precio_ok":true,"precio_comentario":"","looks_nuevos":0}`;
    const usr=`${userContextPrompt()}\n\nArmario actual: ${store.garments.map(g=>g.brand+' '+g.cat+' '+g.color).join(', ')}.
${dupAlert} ${mySize}
Mira en tienda: "${q}"${price?` por ${price}€`:''} en ${storeName||'tienda'}.`;

    const u=userContext();
    const [r, offers]=await Promise.all([
      callAI(sys,usr),
      searchOffersExtensive({query:q||brand,brand,productType,maxPrice:price,ownedBrands:u.topBrands,sex:u.sex,avgPrice:u.avgPrice})
    ]);

    trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'analyzed',session_id:Date.now().toString(36)});

    let html='';
    if(similar.length) html+=`<div class="note warn" style="margin-bottom:12px">${svg('spark',18)}<span><b>¡Ojo!</b> ${dupAlert}</span></div>`;
    if(mySize) html+=`<div class="note" style="margin-bottom:12px">${svg('check',18)}<span>${mySize}</span></div>`;
    if(r){
      const vc={comprar:'var(--eco)',dudoso:'var(--amber)',evitar:'var(--danger)'}[r.veredicto]||'var(--ink)';
      const vt={comprar:'✓ Cómpralo',dudoso:'⚠ Piénsalo',evitar:'✗ Déjalo'}[r.veredicto]||'';
      html+=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Veredicto en tienda<span>${storeName||'tienda'}</span></div>
        <span class="pill" style="margin-left:auto;color:${vc};border-color:${vc};font-size:11px">${vt} · ${r.encaje||0}%</span></div>
        <div class="say" style="margin-top:8px">${r.razon||''}</div>
        ${price&&r.precio_comentario?`<div class="sub" style="margin-top:6px">${r.precio_comentario}</div>`:''}</div>`;
    }

    // Construir bloques de ofertas. Si SerpApi no da resultados, la IA genera alternativas.
    const gSearch=t=>`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(t)}`;
    let hasRealOffers=false;
    if(offers&&offers.exact&&offers.exact.length){
      hasRealOffers=true;
      const cheapest=offers.exact[0];
      const saving=price&&cheapest.price_value?Math.round(price-cheapest.price_value):null;
      html+=`<div class="shead"><h2>${brand||'Misma prenda'} · mejor precio</h2></div>`;
      if(saving&&saving>0)html+=`<div class="save-banner">${svg('tag',18)} La encuentras <b>${saving}€ más barata</b> que en ${storeName||'la tienda'}</div>`;
      html+=offers.exact.slice(0,4).map((o,i)=>`<a class="offer${i===0?' best':''}" href="${o.link}" target="_blank" rel="noopener">
        <div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div>
        <div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}${i===0?' · más barato':''}</div></div>
        <div class="offer-p">${o.price||''}</div></a>`).join('');
    }
    if(offers&&offers.alternatives&&offers.alternatives.length){
      hasRealOffers=true;
      html+=`<div class="shead"><h2>Alternativas parecidas más baratas</h2></div>
        <div class="sub" style="margin:-4px 0 10px">Otras marcas con prendas similares a mejor precio.</div>`;
      html+=offers.alternatives.slice(0,4).map(o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener">
        <div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div>
        <div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div>
        <div class="offer-p">${o.price||''}</div></a>`).join('');
    }
    // SIEMPRE: si no hubo ofertas reales, la IA propone alternativas concretas
    if(!hasRealOffers){
      html+=`<div id="ai_alts"><div class="empty" style="padding:14px 0">${svg('load',22)}<div style="margin-top:8px;font-size:13px">Buscando alternativas…</div></div></div>`;
    }

    html+=`<div style="display:flex;gap:10px;margin-top:16px">
      <button class="btn dark" id="sc_buy" style="flex:1">${svg('add',16)} Lo compro</button>
      <button class="btn ghost" id="sc_no" style="flex:1">Lo dejo</button>
    </div>`;
    out.innerHTML=html;
    appendUsedSection(out,{query:q||brand,brand,productType,maxPrice:price,ownedBrands:u.topBrands,sex:u.sex,avgPrice:u.avgPrice});
    // Si no hubo ofertas reales, pedir a la IA alternativas concretas
    if(!hasRealOffers){
      const altBox=out.querySelector('#ai_alts');
      const gSearch2=t=>`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(t)}`;
      const altSys=`Eres un experto en moda que conoce el mercado español. Ofreces alternativas reales más baratas.
Devuelve SOLO JSON: {"misma_marca":[{"nombre":"modelo concreto","precio_aprox":"XX€","donde":"tienda"}],"alternativas":[{"marca":"otra marca real","nombre":"prenda similar","precio_aprox":"XX€","por_que":"por qué se parece"}]}.
En "alternativas" propón 3 prendas de OTRAS marcas reales (Mango, Zara, Massimo Dutti, Uniqlo, COS, H&M, Springfield...) parecidas y MÁS BARATAS que ${price||100}€. Precios realistas del mercado español.`;
      const altUsr=`Prenda que mira: ${q} (marca ${brand||'?'})${price?`, precio ${price}€`:''}.`;
      const alt=await callAI(altSys,altUsr);
      if(altBox&&alt&&(alt.alternativas?.length||alt.misma_marca?.length)){
        let h='';
        if(alt.misma_marca?.length){
          h+=`<div class="shead"><h2>${brand||'Misma marca'} · dónde comprarla</h2></div>`;
          h+=alt.misma_marca.map(a=>`<a class="offer" href="${gSearch2((brand?brand+' ':'')+a.nombre)}" target="_blank" rel="noopener"><div class="offer-img">${svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${a.nombre}</div><div class="offer-s">${a.donde||'Buscar'}</div></div><div class="offer-p">${a.precio_aprox||''}</div></a>`).join('');
        }
        if(alt.alternativas?.length){
          h+=`<div class="shead"><h2>Alternativas más baratas</h2></div><div class="sub" style="margin:-4px 0 10px">Prendas parecidas de otras marcas, a mejor precio.</div>`;
          h+=alt.alternativas.map(a=>`<a class="offer" href="${gSearch2(a.marca+' '+a.nombre)}" target="_blank" rel="noopener"><div class="offer-img">${svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${a.marca} · ${a.nombre}</div><div class="offer-s">${a.por_que||''}</div></div><div class="offer-p">${a.precio_aprox||''}</div></a>`).join('');
        }
        h+=`<div class="sub" style="margin-top:8px;font-size:11px">Sugerencias de IA. Toca para comparar en Google Shopping.</div>`;
        altBox.innerHTML=h;
      } else if(altBox){
        altBox.innerHTML=`<a class="offer" href="${gSearch2(q+(brand?' '+brand:''))}" target="_blank" rel="noopener"><div class="offer-img">${svg('tag',20)}</div><div class="offer-info"><div class="offer-t">Buscar "${q}" en Google Shopping</div><div class="offer-s">Comparar precios</div></div><div class="offer-p">${svg('chev',18)}</div></a>`;
      }
    }
    const logScan=(bought)=>{
      store.scanLog=store.scanLog||[];
      store.scanLog.unshift({brand:brand||'',verdict:r?.veredicto||'',bought,at:new Date().toISOString()});
      if(store.scanLog.length>200)store.scanLog.length=200;
      save();
    };
    out.querySelector('#sc_buy').onclick=()=>{
      logScan(true); haptic();
      trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'bought'});
      el.remove(); go('add');
      setTimeout(()=>showPrenda(document.getElementById('main'),{brand,name:q,price},null),100);
    };
    out.querySelector('#sc_no').onclick=()=>{
      logScan(false);
      trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'rejected',rejection_reason:similar.length?'already_have':'user_choice'});
      el.remove();
    };
    this.disabled=false; this.innerHTML=`${svg('target',18)} Buscar otra`;
  };
}

/* ═══════════════════════════════════════════
   MALETA
═══════════════════════════════════════════ */
let trip={dest:'',lat:null,lon:null,dateFrom:null,dateTo:null,days:3,plan:'Ciudad',acts:[],weatherData:null,calY:null,calM:null};

function openMaleta(){
  const el=document.createElement('div'); el.className='ficha'; el.id='trip';
  document.body.appendChild(el); maletaStep1(el);
}

function maletaStep1(el){
  el.innerHTML=`
    <div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
      <div class="backbar"><button id="mb">${svg('back',20)}</button><span class="t">Preparar viaje</span></div>
      <div class="trip-hero">${svg('plane',32)}</div>
      <div class="title" style="font-size:28px;margin-bottom:6px">¿A dónde vas?</div>
      <div class="sub" style="margin-bottom:20px">Drobe consultará el tiempo real y preparará tu maleta.</div>
      <div class="field"><label>Destino</label>
        <input id="dest" value="${esc(trip.dest)}" placeholder="París, Lisboa, Tokio…" autocomplete="off"/>
        <div id="sugg" class="dest-sugg"></div></div>
      <div class="shead" style="margin-top:8px"><h2>Duración</h2></div>
      <div class="row2">
        <div class="stat"><div class="l">Salida</div><div class="n" style="font-size:18px" id="t_from">${trip.dateFrom||'—'}</div></div>
        <div class="stat"><div class="l">Regreso</div><div class="n" style="font-size:18px" id="t_to">${trip.dateTo||'—'}</div></div>
      </div>
      <div id="cal" class="trip-cal"></div>
      <button class="btn dark" id="next1" style="margin-top:20px">${svg('chev',18)} Siguiente</button>
      ${(store.maletas||[]).length?`<button class="btn ghost" id="seemaletas" style="margin-top:10px">${svg('pack',18)} Mis maletas (${store.maletas.length})</button>`:''}
    </div>`;
  el.querySelector('#mb').onclick=()=>el.remove();
  el.querySelector('#seemaletas')?.addEventListener('click',()=>openMaletasGuardadas());
  buildCalendar(el);
  el.querySelector('#dest').addEventListener('input',e=>suggestDest(e.target.value,el.querySelector('#sugg'),el));
  el.querySelector('#next1').onclick=()=>{ trip.dest=el.querySelector('#dest').value; if(trip.dest&&trip.days>0)maletaStep2(el); };
}

let _destTimer=null;
function suggestDest(q,sugg,el){
  clearTimeout(_destTimer);
  if(!q||q.length<2){sugg.innerHTML='';return;}
  _destTimer=setTimeout(async()=>{
    try{
      const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=es`;
      const r=await fetch(url);
      if(!r.ok)throw 0;
      const data=await r.json();
      if(!data||!data.length){sugg.innerHTML='';return;}
      sugg.innerHTML=data.slice(0,5).map(p=>{
        const name=p.display_name.split(',').slice(0,2).join(', ');
        return `<div class="sugg-item" data-lat="${p.lat}" data-lon="${p.lon}" data-name="${esc(name)}">${svg('plane',15)} ${name}</div>`;
      }).join('');
      sugg.querySelectorAll('.sugg-item').forEach(item=>item.onclick=()=>{
        trip.lat=parseFloat(item.dataset.lat); trip.lon=parseFloat(item.dataset.lon);
        trip.dest=item.dataset.name;
        el.querySelector('#dest').value=item.dataset.name; sugg.innerHTML='';
      });
    }catch(e){sugg.innerHTML='';}
  },350);
}

function buildCalendar(el){
  const cal=el.querySelector('#cal'); if(!cal)return;
  const today=new Date(); const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if(trip.calY==null){trip.calY=today.getFullYear();trip.calM=today.getMonth();}
  const year=trip.calY, month=trip.calM;
  const first=new Date(year,month,1).getDay()||7;
  const days=new Date(year,month+1,0).getDate();
  const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const atCurrentMonth=year===today.getFullYear()&&month===today.getMonth();
  cal.innerHTML=`
    <div class="cal-head">
      <button class="cal-nav" id="cal_prev" ${atCurrentMonth?'disabled':''} aria-label="Mes anterior">‹</button>
      <span>${months[month]} ${year}</span>
      <button class="cal-nav" id="cal_next" aria-label="Mes siguiente">›</button>
    </div>
    <div class="cal-grid">
      ${['L','M','X','J','V','S','D'].map(d=>`<div class="cal-day-name">${d}</div>`).join('')}
      ${Array(first-1).fill('<div></div>').join('')}
      ${Array.from({length:days},(_,i)=>{
        const d=i+1,full=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isFrom=trip.dateFrom===full,isTo=trip.dateTo===full;
        const inRange=trip.dateFrom&&trip.dateTo&&full>trip.dateFrom&&full<trip.dateTo;
        const past=full<todayKey;
        return `<button class="cal-day${isFrom?' from':''}${isTo?' to':''}${inRange?' in':''}" data-date="${full}" ${past?'disabled':''}>${d}</button>`;
      }).join('')}
    </div>`;
  const prev=cal.querySelector('#cal_prev'),next=cal.querySelector('#cal_next');
  if(prev)prev.onclick=()=>{ if(month===0){trip.calY--;trip.calM=11;}else trip.calM--; buildCalendar(el); };
  if(next)next.onclick=()=>{ if(month===11){trip.calY++;trip.calM=0;}else trip.calM++; buildCalendar(el); };
  cal.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{
    const d=b.dataset.date;
    if(!trip.dateFrom||trip.dateTo){trip.dateFrom=d;trip.dateTo=null;}
    else if(d>trip.dateFrom){trip.dateTo=d;}
    else if(d<trip.dateFrom){trip.dateFrom=d;}
    else{trip.dateTo=d;}
    if(trip.dateFrom&&trip.dateTo){ const ms=new Date(trip.dateTo)-new Date(trip.dateFrom); trip.days=Math.max(1,Math.round(ms/86400000)+1); }
    else{ trip.days=1; }
    const tf=el.querySelector('#t_from'),tt=el.querySelector('#t_to');
    if(tf)tf.textContent=trip.dateFrom||'—';
    if(tt)tt.textContent=trip.dateTo||'—';
    buildCalendar(el);
  });
}

async function maletaStep2(el){
  el.querySelector('#next1').disabled=true; el.querySelector('#next1').innerHTML=svg('load',18)+' Consultando el tiempo…'; el.querySelector('#next1').querySelector('svg').classList.add('spin');
  let wx=null;
  if(trip.lat&&trip.lon){
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${trip.lat}&longitude=${trip.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=14`;
      const r=await fetch(url); wx=await r.json(); trip.weatherData=wx;
    }catch(e){wx=null;}
  }
  const tMax=wx?.daily?.temperature_2m_max?.[0]??null;
  const tMin=wx?.daily?.temperature_2m_min?.[0]??null;
  const rainDays=wx?.daily?.precipitation_probability_max?.filter(p=>p>50).length??0;
  const tAvg=tMax!=null&&tMin!=null?Math.round((tMax+tMin)/2):null;
  trip.tAvg=tAvg; trip.rainDays=rainDays;
  el.innerHTML=`
    <div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
      <div class="backbar"><button id="mb2">${svg('back',20)}</button><span class="t">El tiempo</span></div>
      ${tAvg!=null?`<div class="wx-card">
        <div class="wx-top">${svg('sun',28)}<div><div class="wx-t">${trip.dest}</div><div class="wx-s">${tMin}°–${tMax}°C · ${rainDays} día(s) de lluvia</div></div></div>
        <div class="wx-desc">${buildWxSummary(trip.dest,tMin,tMax,rainDays)}</div></div>`
      :`<div class="note warn">${svg('sun',18)}<span>No pude obtener el tiempo para este destino.</span></div>`}
      <div class="shead"><h2>Motivo del viaje</h2></div>
      <div class="chips">${TRIP_PLANS.map(p=>`<button class="chip${trip.plan===p?' on':''}" data-plan="${p}">${p}</button>`).join('')}</div>
      <div class="shead"><h2>Actividades</h2></div>
      <div class="chips" style="flex-wrap:wrap">${TRIP_ACTS.map(a=>`<button class="chip${trip.acts.includes(a)?' on':''}" data-act="${a}">${a}</button>`).join('')}</div>
      <button class="btn dark" id="next2" style="margin-top:20px">${svg('pack',18)} Preparar maleta</button>
    </div>`;
  el.querySelector('#mb2').onclick=()=>maletaStep1(el);
  el.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{trip.plan=b.dataset.plan;el.querySelectorAll('[data-plan]').forEach(x=>x.className='chip'+(x.dataset.plan===trip.plan?' on':''));});
  el.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;const i=trip.acts.indexOf(a);if(i>=0)trip.acts.splice(i,1);else trip.acts.push(a);b.className='chip'+(trip.acts.includes(a)?' on':'');});
  el.querySelector('#next2').onclick=()=>maletaPackPremium(el);
}

function buildWxSummary(dest,tMin,tMax,rainDays){
  if(tMin==null)return 'Tiempo desconocido.';
  const avg=Math.round((tMin+tMax)/2);
  let s=`Durante tu viaje a ${dest} las temperaturas estarán entre ${tMin}° y ${tMax}°C.`;
  if(rainDays>2)s+=` Se esperan lluvias ${rainDays} días — incluye impermeable.`;
  else if(rainDays>0)s+=` Alguna lluvia puntual.`;
  if(avg>26)s+=` Hará bastante calor: prioriza tejidos ligeros.`;
  else if(avg<10)s+=` Frío considerable: necesitarás capas y abrigo.`;
  return s;
}

async function maletaPackPremium(el){
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="mb3">${svg('back',20)}</button><span class="t">${trip.dest||'Tu viaje'} · ${trip.days} días</span></div>
    <div id="packwrap"></div></div>`;
  el.querySelector('#mb3').onclick=()=>maletaStep2(el);
  const plan=buildMaletaPlan();
  const wrap=el.querySelector('#packwrap');
  wrap.innerHTML=`
    <div class="suitcase">
      <div class="handle"></div>
      <div class="case-body" id="casebody">
        <div class="sub" style="grid-column:1/4;color:#cdd2da;text-align:center;padding:28px 0 14px">${svg('pack',24)} Preparando maleta…</div>
      </div>
    </div>
    <div id="tripsum" style="opacity:0;transition:opacity .6s var(--ease)"></div>`;
  const body=wrap.querySelector('#casebody');
  await new Promise(r=>setTimeout(r,300));
  body.innerHTML='';
  for(let i=0;i<plan.sel.length;i++){
    const g=plan.sel[i];
    await new Promise(r=>setTimeout(r,90));
    const tile=document.createElement('div'); tile.className='packtile'; tile.style.animationDelay=`${i*0.08}s`;
    tile.innerHTML=`<img src="${g.img||'./assets/silbon-raquetas-white.png'}"/>`;
    body.appendChild(tile);
  }
  await new Promise(r=>setTimeout(r,plan.sel.length*90+500));
  const looks=Math.max(plan.tops.length,1)*Math.max(plan.bottoms.length,1);
  const weight=plan.sel.reduce((s,g)=>s+gWeight(g.cat),0);
  const must=plan.sel.slice().sort((a,b)=>(b.worn||0)-(a.worn||0)).slice(0,3);
  const missing=[];
  if(!plan.bottoms.length)missing.push('Sin pantalones en el armario.');
  if(!plan.shoes.length)missing.push('Sin calzado registrado.');
  if(trip.rainDays>1&&!plan.layers.length)missing.push('Sin impermeable o chaqueta de abrigo.');
  const sum=wrap.querySelector('#tripsum');
  sum.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:18px">
      <div class="stat"><div class="n">${looks}</div><div class="l">Looks</div></div>
      <div class="stat"><div class="n">${plan.sel.length}</div><div class="l">Prendas</div></div>
      <div class="stat"><div class="n">${weight.toFixed(1)} kg</div><div class="l">Peso est.</div></div>
    </div>
    ${must.length?`<div class="shead"><h2>Imprescindibles</h2></div>${must.map(g=>`<div class="chk"><span class="ic">${svg('check',16)}</span><span><b>${g.brand}</b> ${g.name}</span></div>`).join('')}`:''}
    ${missing.length?`<div class="shead"><h2>Ten en cuenta</h2></div>${missing.map(x=>`<div class="chk warn"><span class="ic">${svg('spark',16)}</span><span>${x}</span></div>`).join('')}`:''}
    <div class="savebox">
      <input id="mname" placeholder="${trip.dest||'Mi viaje'}" value="${esc(trip.dest||'')}" />
      <button class="btn dark" id="savemaleta">${svg('pack',18)} Guardar maleta</button>
    </div>
    <button class="btn ghost" id="redo" style="margin-top:10px">Nueva maleta</button>`;
  sum.style.opacity='1';
  sum.querySelector('#redo').onclick=()=>maletaStep1(el);
  sum.querySelector('#savemaleta').onclick=function(){
    const nm=(sum.querySelector('#mname').value||trip.dest||'Mi viaje').trim();
    saveMaleta({name:nm,dest:trip.dest,days:trip.days,plan:trip.plan,items:plan.sel.map(g=>g.id),looks,weight:Number(weight.toFixed(1))});
    this.disabled=true; this.innerHTML=`${svg('check',18)} Guardada`;
  };
}

function saveMaleta(mal){
  store.maletas=store.maletas||[];
  mal.id='m'+Date.now()+Math.random().toString(36).slice(2,5);
  mal.createdAt=new Date().toISOString();
  store.maletas.unshift(mal);
  save();
  if(session) cloud.saveMaletaCloud(mal).then(r=>{ if(r&&!r.ok) showSyncWarning(r.reason); });
}
function deleteMaleta(id){
  store.maletas=(store.maletas||[]).filter(m=>m.id!==id);
  save();
  if(session) cloud.deleteMaletaCloud(id);
}
function openMaletasGuardadas(){
  const mals=store.maletas||[];
  const el=document.createElement('div'); el.className='ficha'; el.id='maletas';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="mgb">${svg('back',20)}</button><span class="t">Mis maletas</span></div>
    ${mals.length?'':`<div class="empty" style="padding-top:60px">${svg('pack',28)}<div style="margin-top:12px">Aún no has guardado ninguna maleta.</div></div>`}
    ${mals.map(m=>{
      const its=(m.items||[]).map(id=>findG(id)).filter(Boolean);
      return `<div class="maleta-card" data-id="${m.id}">
        <div class="maleta-head"><div><div class="maleta-n">${esc(m.name)}</div><div class="maleta-s">${m.dest||''}${m.days?' · '+m.days+' días':''} · ${its.length} prendas</div></div>
          <button class="maleta-del" data-del="${m.id}">${svg('trash',16)}</button></div>
        <div class="maleta-thumbs">${its.slice(0,6).map(g=>`<div class="mt"><img loading="lazy" decoding="async" src="${g.img||''}"/></div>`).join('')}</div>
      </div>`;
    }).join('')}
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#mgb').onclick=()=>el.remove();
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); deleteMaleta(b.dataset.del); el.remove(); openMaletasGuardadas(); });
}

function buildMaletaPlan(){
  const days=trip.days,tAvg=trip.tAvg??18,rainDays=trip.rainDays??0;
  const cold=tAvg<14||rainDays>2;
  const pool=store.garments.filter(g=>g.status!=='venta');
  const grp=g=>g.catGroup||catToGroup(g.cat||'');
  const isTop=g=>['Camisetas','Polos','Camisas'].includes(grp(g));
  const isLayer=g=>['Jerséis/Sudaderas','Chaquetas/Abrigos'].includes(grp(g));
  const isBottom=g=>['Pantalones','Shorts/Bermudas','Faldas/Vestidos'].includes(grp(g));
  const isShoe=g=>grp(g)==='Calzado';
  const score=g=>{ let s=(g.worn||0)*0.5; if(NEUTRAL_COLORS.includes(g.color))s+=8; const seasonOk=g.season==='Todo el año'||(cold?g.season==='Otoño/Invierno':g.season==='Primavera/Verano'); if(seasonOk)s+=10; else s-=4; if(trip.acts.includes('Deporte')&&g.formality==='Deporte')s+=6; if(trip.plan==='Boda'&&g.formality==='Formal')s+=12; return s; };
  const take=(arr,n)=>arr.slice().sort((a,b)=>score(b)-score(a)).slice(0,Math.max(0,n));
  const nTops=Math.max(2,Math.ceil(days*0.9)),nBottoms=Math.max(1,Math.ceil(days/3)+1),nLayers=cold?2:1,nShoes=days>5?2:1;
  const tops=take(pool.filter(isTop),nTops),layers=take(pool.filter(isLayer),nLayers),bottoms=take(pool.filter(isBottom),nBottoms),shoes=take(pool.filter(isShoe),nShoes);
  const seen={},sel=[];
  [...tops,...layers,...bottoms,...shoes].forEach(g=>{ if(!seen[g.id]){seen[g.id]=1;sel.push(g);} });
  if(!sel.length&&pool.length) take(pool,Math.min(pool.length,Math.max(3,Math.ceil(days*0.9)))).forEach(g=>sel.push(g));
  return {sel,tops,layers,bottoms,shoes};
}

/* ═══════════════════════════════════════════
   ESTILISTA
═══════════════════════════════════════════ */
let stylistMsg=null;
// Tiempo REAL de Barcelona (Open-Meteo, sin API key). Nunca inventamos:
// hasta que llega el dato, temp/label son null y no se muestran.
const WEATHER={temp:null,label:null,city:'Barcelona',lat:41.3874,lon:2.1686,loaded:false};
const WMO={0:'Despejado',1:'Casi despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla',51:'Llovizna',53:'Llovizna',55:'Llovizna',61:'Lluvia',63:'Lluvia',65:'Lluvia fuerte',71:'Nieve',73:'Nieve',75:'Nieve',80:'Chubascos',81:'Chubascos',82:'Chubascos fuertes',95:'Tormenta',96:'Tormenta',99:'Tormenta'};
async function loadWeather(){
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.lat}&longitude=${WEATHER.lon}&current=temperature_2m,weathercode&timezone=auto`;
    const r=await fetch(url); const d=await r.json();
    const t=d?.current?.temperature_2m, code=d?.current?.weathercode;
    if(typeof t==='number'){
      WEATHER.temp=Math.round(t);
      WEATHER.label=WMO[code]||'';
      WEATHER.loaded=true;
      // repintar solo el armario si está visible (sin recrear toda la app)
      if(route==='armario'){ const eb=document.querySelector('#main .eyebrow'); if(eb)eb.textContent=`${WEATHER.city} · ${WEATHER.temp}°`; }
    }
  }catch(e){ /* sin conexión: no mostramos temperatura inventada */ }
}
function pickOutfit(){
  const t=WEATHER.temp;
  // si no hay dato de tiempo aún, elegimos algo neutro sin asumir frío/calor
  const cold=t!=null&&t<15;
  const top=cold?store.garments.find(g=>g.catGroup==='Jerséis/Sudaderas'&&g.status==='uso'):store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso');
  const s=store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso'&&g!==top);
  return [top,s].filter(Boolean);
}
function vEstilista(m){
  const intents=[['hoy','¿Qué me pongo hoy?'],['salir','Salir a entrenar'],['viaje','Preparar viaje'],['tienda','Estoy en tienda'],['comprar','¿Me lo compro?'],['hueco','¿Qué me falta?'],['muerta','¿Qué no uso?'],['vender','¿Qué vendo?']];
  if(store.profile?.consent_marketing) intents.splice(1,0,['parati','Seleccionado para ti']);
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Estilista</div>
    <div class="title">Tu asesor<br>de imagen</div>
    <div class="sub">Decisiones reales sobre tu ropa. Nunca sobre la que no tienes.</div></div>
    <div class="intent reveal" style="animation-delay:.05s">${intents.map(x=>`<button data-i="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div id="adv">${advisorCard(stylistMsg||defaultAdvice())}</div>`;
  m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{
    if(b.dataset.i==='salir'){openSalida();return;}
    if(b.dataset.i==='viaje'){openMaleta();return;}
    if(b.dataset.i==='tienda'){openScannerTienda();return;}
    if(b.dataset.i==='comprar'){openAsesorCompra();return;}
    if(b.dataset.i==='hueco'){openHuecos();return;}
    if(b.dataset.i==='parati'){openParaTi();return;}
    const a=document.getElementById('adv'); a.style.opacity='0';
    setTimeout(()=>{stylistMsg=advice(b.dataset.i);a.innerHTML=advisorCard(stylistMsg);a.style.transition='opacity .4s var(--ease)';a.style.opacity='1';bindOutfit(a);},170);
  });
  bindOutfit(document.getElementById('adv'));
}
const bindOutfit=scope=>scope.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>openFicha(b.dataset.o));
const defaultAdvice=()=>{
  const hasWx = WEATHER.temp!=null;
  const say = hasWx
    ? `Con ${WEATHER.temp}° y ${(WEATHER.label||'').toLowerCase()} en ${WEATHER.city}, algodón limpio en neutros. Va contigo y con el día.`
    : `Hoy, algo sencillo en neutros: algodón limpio que combina con casi todo. Va contigo y con el día.`;
  return {say, items:pickOutfit()};
};
function advice(k){
  if(k==='muerta'){const d=store.garments.slice().sort((a,b)=>a.worn-b.worn).slice(0,3);return {say:'Estas apenas las tocas. O las rescatas esta semana, o ponlas en venta antes de que pierdan valor.',items:d};}
  if(k==='vender'){const s=store.garments.filter(g=>g.worn<8).sort((a,b)=>cpw(b)-cpw(a)).slice(0,3);return {say:'Por coste por uso y poco uso, estas son las candidatas a vender. Recuperas valor sin tocar lo que usas a diario.',items:s};}
  return defaultAdvice();
}
const advisorCard=a=>`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Estilista Drobe<span>Solo con tu armario</span></div></div><div class="say">${a.say}</div><div class="outfit">${(a.items||[]).map(g=>`<div class="it" data-o="${g.id}"><div class="ph"><img loading="lazy" decoding="async" src="${g.img||''}"/></div><div class="l">${g.brand}</div></div>`).join('')}</div></div>`;

/* ═══════════════════════════════════════════
   ASESOR DE COMPRA
═══════════════════════════════════════════ */
function wardrobeSummary(){ return store.garments.filter(g=>g.status!=='venta').map(g=>`${g.cat} ${g.color} (${g.brand})`).join(', '); }
const offerRowHTML=o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div><div class="offer-p">${o.price||''}</div></a>`;
/* añadido de segunda mano: SIEMPRE después de lo nuevo, nunca mezclado */
async function appendUsedSection(container,params){
  const used=await searchOffersExtensive({...params,channel:'used'});
  if(!container.isConnected)return;
  const items=used?[...(used.exact||[]),...(used.alternatives||[])]:[];
  if(!items.length)return;
  const div=document.createElement('div');
  div.innerHTML=`<div class="shead" style="margin-top:18px"><h2>${svg('sync',15)} Y en segunda mano</h2></div><div class="sub" style="margin:-4px 0 10px">Mismo estilo, mejor precio. Vinted, Wallapop y similares.</div>`+items.slice(0,3).map(offerRowHTML).join('');
  container.appendChild(div);
}
async function searchOffersExtensive({query,brand,productType,maxPrice,ownedBrands,sex,channel,avgPrice}){
  const params={query,brand,productType,maxPrice,ownedBrands,sex,channel,avgPrice};
  const key=cloud.cacheKey(params);
  // 1) caché compartida (24h): instantánea y no gasta cuota
  if(session){
    const hit=await cloud.searchCacheGet(key);
    if(hit) return hit;
  }
  try{
    const r=await fetch('/api/shopping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(params)});
    const d=await r.json();
    if(!d||!d.available)return null;
    const out={exact:d.exact||[],alternatives:d.alternatives||[]};
    if(session&&(out.exact.length||out.alternatives.length)) cloud.searchCachePut(key,out);
    return out;
  }catch(e){ return null; }
}
function openAsesorCompra(){ const el=document.createElement('div'); el.className='ficha'; el.id='asesor'; renderAsesorForm(el); document.body.appendChild(el); }

function renderAsesorForm(el,prefill={}){
  const TIPOS=['Camiseta manga corta','Camiseta manga larga','Polo','Camisa','Jersey','Sudadera','Hoodie','Blazer','Bomber','Chaqueta denim','Chaqueta cuero','Abrigo','Parka','Plumífero','Vaquero','Chino','Cargo','Jogger','Pantalón vestir','Shorts','Sneakers','Botas','Botines','Zapatillas deportivas','Zapatos Oxford','Mochila','Gorra','Bufanda','Otro'];
  const COLORES=['Blanco','Negro','Gris','Marino','Azul','Verde','Kaki/Oliva','Marrón','Beige','Crudo','Rojo','Amarillo','Naranja','Rosa','Morado','Multicolor'];
  const TALLAS_ROPA=['XS','S','M','L','XL','XXL'];
  const TALLAS_PANTALON=['28','29','30','31','32','33','34','36','38'];
  const TALLAS_ZAPATO=['38','39','40','41','42','43','44','45'];
  const FITS=['Slim Fit','Regular Fit','Oversized','Relaxed','Boxy','Straight','Wide Leg'];
  const MATERIALES=['Algodón','Algodón orgánico','Lana','Lana merino','Denim','Lino','Poliéster','Nylon','Gore-Tex','Cuero','Ante','Punto','Mezcla'];
  const tipo=prefill.tipo||'';
  const isBottom=/vaquero|chino|cargo|jogger|pantalón|shorts/i.test(tipo);
  const isShoe=/sneak|bota|botín|zapato|zapatilla/i.test(tipo);
  const isOuter=/abrigo|parka|plum|bomber|blazer|chaqueta/i.test(tipo);
  const isKnit=/jersey|sudadera|hoodie/i.test(tipo);
  const isTop=/camiseta manga corta|camiseta manga larga|polo/i.test(tipo);
  const isShirt=/camisa/i.test(tipo);
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="ab">${svg('back',20)}</button><span class="t">¿Me lo compro?</span></div>
    <div class="sub" style="margin:-6px 0 18px">Cuantos más datos, más preciso el análisis y la búsqueda de ofertas.</div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="ac_brand" value="${esc(prefill.brand||'')}" placeholder="Stone Island…"/></div>
      <div class="field"><label>Precio €</label><input id="ac_price" inputmode="decimal" value="${esc(prefill.price||'')}" placeholder="160"/></div>
    </div>
    <div class="field"><label>Tipo de prenda</label><select id="ac_tipo">${optSel(TIPOS,tipo)}</select></div>
    <div class="row2">
      <div class="field"><label>Color principal</label><select id="ac_color">${optSel(COLORES,prefill.color||'')}</select></div>
      <div class="field"><label>Talla</label><select id="ac_talla">${optSel(isShoe?TALLAS_ZAPATO:isBottom?TALLAS_PANTALON:TALLAS_ROPA,prefill.talla||'')}</select></div>
    </div>
    ${!isShoe&&!isBottom?`<div class="field"><label>Corte / fit</label><select id="ac_fit">${optSel(FITS,prefill.fit||'')}</select></div>`:''}
    ${(isTop||isShirt)?`<div class="field"><label>Manga</label><div class="chips" id="manga_chips">${['Manga corta','Manga larga','Sin mangas'].map(mv=>`<button class="chip${(prefill.manga||'Manga corta')===mv?' on':''}" data-manga="${mv}">${mv}</button>`).join('')}</div></div>`:''}
    ${isKnit?`<div class="field"><label>Tipo de punto</label><div class="chips" id="knit_chips">${['Punto fino','Punto grueso','Trenzado','Liso','Cuello alto','Cuello redondo'].map(k=>`<button class="chip${(prefill.knit||'')===k?' on':''}" data-knit="${k}">${k}</button>`).join('')}</div></div>`:''}
    ${isOuter?`<div class="field"><label>Características</label><div class="chips" id="outer_chips" style="flex-wrap:wrap">${['Capucha','Impermeable','Acolchado','Con forro','Sin forro','Cortavientos'].map(k=>`<button class="chip${(prefill.outer||[]).includes(k)?' on':''}" data-outer="${k}">${k}</button>`).join('')}</div></div>`:''}
    <div class="field"><label>Material (opcional)</label><select id="ac_mat">${optSel(['','...'].concat(MATERIALES),prefill.material||'')}</select></div>
    <div class="field"><label>Notas adicionales (opcional)</label><input id="ac_notes" value="${esc(prefill.notes||'')}" placeholder="Edición limitada, colaboración…"/></div>
    <button class="btn dark" id="ac_go" style="margin-top:4px">${svg('spark',18)} Analizar y buscar ofertas</button>
    <div id="ac_out" style="margin-top:16px"></div>
  </div>`;
  el.querySelector('#ab').onclick=()=>el.remove();
  const chipsToggle=(attr,single=true)=>{
    const chips=el.querySelectorAll(`[data-${attr}]`);
    chips.forEach(b=>b.onclick=()=>{ if(single){chips.forEach(x=>x.classList.remove('on'));b.classList.add('on');}else{b.classList.toggle('on');} });
  };
  if(el.querySelector('[data-manga]'))chipsToggle('manga',true);
  if(el.querySelector('[data-knit]'))chipsToggle('knit',true);
  if(el.querySelector('[data-outer]'))chipsToggle('outer',false);
  el.querySelector('#ac_tipo').onchange=()=>{ const data=readAsesorForm(el); renderAsesorForm(el,data); };
  el.querySelector('#ac_go').onclick=async function(){
    const data=readAsesorForm(el); if(!data.tipo&&!data.brand)return;
    const out=el.querySelector('#ac_out');
    this.disabled=true; this.innerHTML=`${svg('load',18)} Analizando…`; this.querySelector('svg').classList.add('spin');
    const desc=buildDesc(data); const searchQ=buildSearchQuery(data);
    const u=userContext();
    const sys=`Eres un asesor de compra honesto especializado en moda. Tienes en cuenta el perfil real del usuario para acertar (sexo, presupuesto, marcas que ya usa, colores y corte que prefiere). REGLA DURA: nunca sugieras marcas de segmento inferior al suyo (Shein/Temu/AliExpress prohibidas siempre; Primark/Lefties/Kiabi prohibidas si gasta +35€/prenda). Todo para su sexo y edad, nunca de mujer si es hombre ni de niños. Devuelve SOLO JSON: {"veredicto":"comprar"|"dudoso"|"evitar","encaje":0-100,"razon":"2-3 frases específicas mencionando prendas concretas de su armario y su estilo","ya_tienes":"descripción de prenda parecida o vacío","looks_nuevos":número,"coste_por_uso_estimado":número}.`;
    const usr=`${userContextPrompt()}\n\nArmario actual: ${wardrobeSummary()}.\nQuiere comprar: ${desc}${data.price?` por ${data.price}€`:''}.`;
    const [r,offers]=await Promise.all([
      callAI(sys,usr),
      searchOffersExtensive({query:searchQ,brand:data.brand,productType:[data.tipo,data.color,data.material].filter(Boolean).join(' '),maxPrice:data.price,ownedBrands:u.topBrands,sex:u.sex,avgPrice:u.avgPrice})
    ]);
    let html='';
    if(r){
      const vc={comprar:'var(--eco)',dudoso:'var(--amber)',evitar:'var(--danger)'}[r.veredicto]||'var(--ink)';
      const vt={comprar:'✓ Te conviene',dudoso:'⚠ Piénsalo',evitar:'✗ No lo compres'}[r.veredicto]||'';
      html+=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Veredicto<span>Basado en tu armario real</span></div><span class="pill" style="margin-left:auto;color:${vc};border-color:${vc};font-size:11px">${vt} · ${r.encaje||0}%</span></div><div class="say" style="margin-top:10px">${r.razon||''}</div>${r.ya_tienes?`<div class="sub" style="margin-top:8px;color:var(--amber)">⚠ Ya tienes algo parecido: ${r.ya_tienes}</div>`:''}<div style="display:flex;gap:16px;margin-top:10px">${r.looks_nuevos!=null?`<div><div style="font-size:18px;font-weight:800">${r.looks_nuevos}</div><div style="font-size:11px;color:var(--ink3)">looks nuevos</div></div>`:''}${r.coste_por_uso_estimado?`<div><div style="font-size:18px;font-weight:800">${r.coste_por_uso_estimado}€</div><div style="font-size:11px;color:var(--ink3)">coste/uso est.</div></div>`:''}</div></div>`;
    }
    if(offers===null){
      html+=`<div class="note" style="margin-top:12px">${svg('tag',18)}<span>Añade <b>SERPAPI_KEY</b> en Vercel para ver precios reales de tiendas.</span></div>`;
    } else {
      if(offers.exact&&offers.exact.length){
        html+=`<div class="shead"><h2>${data.brand||'Esta prenda'} · mejor precio</h2></div>`+
          offers.exact.slice(0,4).map((o,i)=>`<a class="offer${i===0?' best':''}" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}${i===0?' · más barato':''}</div></div><div class="offer-p">${o.price||''}</div></a>`).join('');
      }
      if(offers.alternatives&&offers.alternatives.length){
        html+=`<div class="shead"><h2>Alternativas para ti</h2></div><div class="sub" style="margin:-4px 0 10px">Parecidas y más baratas, priorizando marcas que ya usas.</div>`+
          offers.alternatives.slice(0,4).map(o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div><div class="offer-p">${o.price||''}</div></a>`).join('');
      }
    }
    out.innerHTML=html;
    if(offers!==null)appendUsedSection(out,{query:searchQ,brand:data.brand,productType:[data.tipo,data.color,data.material].filter(Boolean).join(' '),maxPrice:data.price,ownedBrands:u.topBrands,sex:u.sex,avgPrice:u.avgPrice});
    // Wishlist: guardar como "vigilada" (intención de compra con precio objetivo)
    const wid='w'+Date.now();
    const wbar=document.createElement('button');
    wbar.className='btn ghost'; wbar.style.marginTop='12px';
    wbar.innerHTML=`${svg('heart',17)} Vigilar precio de esta prenda`;
    wbar.onclick=function(){
      const bestNow=(offers&&offers.exact&&offers.exact[0])||null;
      saveWishlistItem({id:wid,desc,brand:data.brand||'',tipo:data.tipo||'',query:searchQ,
        targetPrice:parseFloat(data.price)||null,
        lastPrice:bestNow&&bestNow.price_value?bestNow.price_value:(parseFloat(data.price)||null),
        lastLink:bestNow?bestNow.link:null,lastSource:bestNow?bestNow.source:null,
        thumbnail:bestNow?bestNow.thumbnail:null});
      this.disabled=true; this.innerHTML=`${svg('check',17)} En tu wishlist`;
      haptic();
    };
    out.appendChild(wbar);
    this.disabled=false; this.innerHTML=`${svg('spark',18)} Analizar otra`;
  };
}
function readAsesorForm(el){
  const q=id=>{ const e=el.querySelector('#'+id); return e?e.value.trim():''; };
  const chip=attr=>{ const e=el.querySelector(`[data-${attr}].on`); return e?e.dataset[attr]:''; };
  const chips=attr=>[...el.querySelectorAll(`[data-${attr}].on`)].map(e=>e.dataset[attr]);
  return {brand:q('ac_brand'),price:parseFloat(q('ac_price'))||null,tipo:q('ac_tipo'),color:q('ac_color'),talla:q('ac_talla'),fit:q('ac_fit')||'',material:q('ac_mat')||'',manga:chip('manga'),knit:chip('knit'),outer:chips('outer'),notes:q('ac_notes')};
}
function buildDesc(d){ return [d.brand,d.tipo,d.manga,d.knit,d.outer?.join(', '),d.fit,d.color,d.material,d.talla?'talla '+d.talla:'',d.notes].filter(Boolean).join(' ')||'prenda sin especificar'; }
function buildSearchQuery(d){ return [d.brand,d.tipo?.toLowerCase(),d.color&&d.color!=='Multicolor'?d.color.toLowerCase():'',d.material&&d.material!=='...'?d.material.toLowerCase():'',d.talla].filter(Boolean).join(' ')||d.tipo||'ropa'; }

/* ═══ PARA TI: recomendaciones personalizadas REALES ═══
   Productos de verdad (Google Shopping) según las marcas del usuario,
   su categoría más usada, su sexo y su rango de gasto. Sin patrocinios. */
/* ═══ SALIR A ENTRENAR: kit según el tiempo REAL y TU armario deportivo ═══ */
async function openSalida(){
  const sportGs=store.garments.filter(g=>g.context==='deporte'&&g.status!=='venta');
  if(!sportGs.length){ toast('Añade prendas deportivas para usar el asesor de salida'); return; }
  const sports=[...new Set(sportGs.map(g=>g.sport).filter(Boolean))];
  const el=document.createElement('div'); el.className='ficha'; el.id='salida';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="slb">${svg('back',20)}</button><span class="t">Salir a entrenar</span></div>
    <div class="eyebrow">${WEATHER.city}${WEATHER.temp!=null?` · ${WEATHER.temp}° · ${WEATHER.label||''}`:''}</div>
    <div class="title" style="font-size:30px">¿Qué toca hoy?</div>
    <div class="chips" style="margin:16px 0">${(sports.length?sports:SPORTS).map(x=>`<button class="chip" data-sp="${x}">${x}</button>`).join('')}</div>
    <div id="sl_out"></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#slb').onclick=()=>el.remove();
  el.querySelectorAll('[data-sp]').forEach(b=>b.onclick=async()=>{
    el.querySelectorAll('[data-sp]').forEach(x=>x.classList.toggle('on',x===b));
    const sp=b.dataset.sp;
    const out=el.querySelector('#sl_out');
    out.innerHTML=`<div class="skel" style="height:110px;border-radius:16px"></div>`;
    const pool=sportGs.filter(g=>!g.sport||g.sport===sp);
    const listado=pool.map(g=>`${g.id}: ${g.brand} ${g.name} (${g.cat}${g.km!=null?`, ${Math.round(g.km)}km`:''})`).join('\n');
    const wx=WEATHER.temp!=null?`${WEATHER.temp}°C, ${WEATHER.label||''}`:'tiempo desconocido';
    const sys=`Eres el asesor deportivo de Drobe. Eliges el kit para entrenar SOLO de las prendas listadas (por id). Devuelve SOLO JSON: {"consejo":"1-2 frases sobre cómo vestirse hoy para ${sp} con este tiempo","ids":["id1","id2"],"aviso":"si alguna zapatilla supera 600km, menciónalo, si no vacío"}. Máximo 4 ids. Si falta algo esencial para este tiempo, dilo en el consejo sin inventar prendas.`;
    let r=await callAI(sys,`Tiempo en ${WEATHER.city}: ${wx}.\nDeporte: ${sp}.\nPrendas disponibles:\n${listado}`);
    if(!r) r=await callAI(sys,`Tiempo: ${wx}. Deporte: ${sp}. Prendas:\n${listado}`);
    if(!el.isConnected)return;
    if(!r){ out.innerHTML=`<div class="note warn">${svg('spark',16)}<span>No pude generar el kit ahora mismo. Prueba de nuevo.</span></div>`; return; }
    const picks=(r.ids||[]).map(id=>pool.find(g=>g.id===id)).filter(Boolean);
    out.innerHTML=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Kit de hoy<span>${sp} · ${wx}</span></div></div>
      <div class="say">${esc(r.consejo||'')}</div>
      ${r.aviso?`<div class="sub" style="margin-top:8px;color:#E8A87C">${esc(r.aviso)}</div>`:''}
      ${picks.length?`<div class="outfit">${picks.map(g=>`<div class="it" data-o="${g.id}"><div class="ph"><img loading="lazy" src="${g.img||''}"/></div><div class="l">${esc(g.brand)} ${esc(g.name)}</div></div>`).join('')}</div>`:''}
    </div>`;
    bindOutfit(out);
  });
}

async function openParaTi(){
  if(!store.profile?.consent_marketing){ toast('Activa las recomendaciones en Perfil'); return; }
  const u=userContext();
  if(!u.topBrands.length){ toast('Añade prendas con marca para poder recomendarte'); return; }
  const el=document.createElement('div'); el.className='ficha'; el.id='parati';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="ptb">${svg('back',20)}</button><span class="t">Seleccionado para ti</span></div>
    <div class="sub" style="margin-bottom:14px">Según tus marcas (${u.topBrands.slice(0,3).map(esc).join(', ')}), tu estilo y lo que sueles gastar.</div>
    <div class="pt-grid" id="ptgrid">${Array(6).fill('<div><div class="skel" style="aspect-ratio:3/4"></div><div class="skel" style="height:11px;margin-top:8px"></div></div>').join('')}</div>
    <div class="b2b-foot" style="color:var(--ink3)">${svg('lock',13)} Productos reales de Google Shopping. Nadie paga por aparecer aquí.</div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#ptb').onclick=()=>el.remove();

  // categoría más usada del armario → palabra de búsqueda
  const catCount={}; store.garments.forEach(g=>{const k=g.catGroup||g.cat||'';if(k)catCount[k]=(catCount[k]||0)+1;});
  const topGroups=Object.entries(catCount).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
  const W={'Camisas':'camisa','Camisetas':'camiseta','Pantalones':'pantalón','Jerséis/Sudaderas':'jersey','Abrigos/Chaquetas':'chaqueta','Abrigos':'abrigo','Calzado':'zapatillas','Vestidos':'vestido','Faldas':'falda'};
  const words=topGroups.map(g=>W[g]||String(g).split('/')[0].toLowerCase()).filter(Boolean);
  const w1=words[0]||'camisa', w2=words[1]||w1;
  const maxP=u.avgPrice?Math.round(u.avgPrice*1.8):null;
  const queries=[
    {query:`${u.topBrands[0]} ${w1}`,brand:u.topBrands[0],productType:w1},
    u.topBrands[1]?{query:`${u.topBrands[1]} ${w2}`,brand:u.topBrands[1],productType:w2}:null,
    u.topBrands[2]?{query:`${u.topBrands[2]} ${w1}`,brand:u.topBrands[2],productType:w1}:null,
  ].filter(Boolean);

  const results=await Promise.all(queries.map(q=>searchOffersExtensive({...q,ownedBrands:u.topBrands,sex:u.sex,maxPrice:maxP,avgPrice:u.avgPrice,channel:'new'})));
  const seen=new Set(); const items=[];
  results.forEach(r=>{ if(r)[...(r.exact||[]),...(r.alternatives||[])].forEach(o=>{ const k=(o.title||'')+(o.price||''); if(o.title&&!seen.has(k)){seen.add(k);items.push(o);} }); });

  const grid=el.querySelector('#ptgrid'); if(!grid)return;
  if(!items.length){
    grid.outerHTML=`<div class="soc-empty" style="padding:30px 0">${results.every(r=>r===null)?'Activa SERPAPI_KEY en Vercel para ver productos reales.':'Sin resultados ahora mismo para tus marcas. Prueba más tarde.'}</div>`;
    return;
  }
  grid.innerHTML=items.slice(0,8).map(o=>`
    <a class="pt-card" href="${esc(o.link)}" target="_blank" rel="noopener">
      <div class="pt-ph">${o.thumbnail?`<img loading="lazy" decoding="async" src="${esc(o.thumbnail)}"/>`:svg('tag',22)}</div>
      <div class="pt-n">${esc(o.title)}</div>
      <div class="pt-m"><b>${esc(o.price||'')}</b> · ${esc(o.source||'')}</div>
    </a>`).join('');
}

async function openHuecos(){
  const el=document.createElement('div'); el.className='ficha'; el.id='huecos';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="hb">${svg('back',20)}</button><span class="t">¿Qué me falta?</span></div>
    <div class="sub" style="margin:-6px 0 16px">La IA analiza tu armario y tu estilo para decirte qué tipo de prenda te cundiría más.</div>
    <div id="h_out"><div class="empty">${svg('load',26)}<div style="margin-top:10px">Analizando tu armario…</div></div></div></div>`;
  document.body.appendChild(el);
  el.querySelector('.empty svg')?.classList.add('spin');
  el.querySelector('#hb').onclick=()=>el.remove();
  const groups={};store.garments.forEach(g=>{const k=g.catGroup||catToGroup(g.cat||'');groups[k]=(groups[k]||0)+1;});
  const u=userContext();
  const brandList=u.topBrands.length?u.topBrands.join(', '):'(aún sin marcas claras)';
  const sys=`Eres el asesor de armario de Drobe. Tu trabajo es decir qué TIPO de prenda le falta al usuario, SIEMPRE coherente con su perfil real.
REGLAS ESTRICTAS:
- Las recomendaciones deben encajar con su sexo (${u.sex||'no indicado'}), su gama de precio (${u.segment||'media'}, ~${u.avgPrice||0}€/prenda) y su estilo (corte ${u.topFit||'?'}, colores ${u.topColors.join('/')||'?'}).
- Para el campo "busqueda": prioriza marcas que el usuario YA usa (${brandList}). Si recomiendas una marca nueva, debe ser del MISMO segmento de precio y estilo, nunca fast-fashion barata si el usuario es premium, ni lujo si es budget.
- Nunca propongas prendas estridentes o fuera de su paleta y registro.
- VETO ABSOLUTO: nunca recomiendes Shein, Temu, AliExpress ni Wish. Si su ticket medio supera 35€, tampoco Primark, Lefties ni Kiabi — quien viste sus marcas no compra ahí.
- El usuario es ${u.sex||'adulto'}${u.age?` de ${u.age} años`:''}: TODO debe ser para su sexo y edad. Jamás ropa de mujer si es hombre (ni viceversa), jamás de niños o bebés.
Devuelve SOLO JSON: {"resumen":"1 frase sobre su armario y su estilo","faltas":[{"prenda":"tipo concreto","motivo":"por qué le cundiría dado SU estilo","busqueda":"marca(preferiblemente suya) + tipo + color + ${u.sex||''}"}]}. Máximo 4 faltas.`;
  const usr=`${userContextPrompt()}\n\nArmario por categorías: ${JSON.stringify(groups)}. Prendas: ${wardrobeSummary()}.`;
  callAI(sys,usr).then(async r=>{
    const out=el.querySelector('#h_out');
    if(!r||!r.faltas){out.innerHTML=`<div class="note warn">${svg('spark',18)}<span>No pude analizar (revisa GROQ_API_KEY).</span></div>`;return;}
    out.innerHTML=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Tu armario<span>Análisis de huecos</span></div></div><div class="say">${r.resumen||''}</div></div>`+
      `<div class="shead"><h2>Lo que te cundiría</h2></div>`+
      r.faltas.map(f=>`<div class="gap" data-q="${esc(f.busqueda||f.prenda)}" data-type="${esc(f.prenda)}">
        <div class="gap-main"><div class="gap-t">${f.prenda}</div><div class="gap-m">${f.motivo}</div></div>
        <button class="gap-btn">${svg('tag',16)} Buscar</button></div>`).join('');
    out.querySelectorAll('.gap').forEach(g=>g.querySelector('.gap-btn').onclick=async function(){
      const q=g.dataset.q, ptype=g.dataset.type;
      this.disabled=true; this.innerHTML=`${svg('load',16)} …`; this.querySelector('svg').classList.add('spin');
      let box=g.querySelector('.gap-offers'); if(!box){box=document.createElement('div');box.className='gap-offers';g.after(box);}
      box.innerHTML=`<div class="sub" style="margin:8px 0 4px">Buscando según tu estilo…</div>`+
        Array(3).fill(`<div class="skel-offer"><div class="skel"></div><div class="skel-lines"><div class="skel"></div><div class="skel"></div></div></div>`).join('');
      const maxP=u.avgPrice?Math.round(u.avgPrice*1.6):null;
      // dos canales en paralelo: tiendas nuevas y segunda mano, ambos con el perfil
      const [nuevo,used]=await Promise.all([
        searchOffersExtensive({query:q,productType:ptype,ownedBrands:u.topBrands,sex:u.sex,maxPrice:maxP,channel:'new',avgPrice:u.avgPrice}),
        searchOffersExtensive({query:q,productType:ptype,ownedBrands:u.topBrands,sex:u.sex,maxPrice:maxP,channel:'used',avgPrice:u.avgPrice})
      ]);
      if(nuevo===null&&used===null){box.innerHTML=`<div class="note" style="margin:8px 0">${svg('tag',16)}<span>Activa SERPAPI_KEY para ver ofertas reales.</span></div>`;this.disabled=false;this.innerHTML=`${svg('tag',16)} Buscar`;return;}
      const offerRow=o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img loading="lazy" decoding="async" src="${o.thumbnail}"/>`:svg('tag',20)}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div><div class="offer-p">${o.price||''}</div></a>`;
      const nItems=nuevo?[...(nuevo.exact||[]),...(nuevo.alternatives||[])]:[];
      const uItems=used?[...(used.exact||[]),...(used.alternatives||[])]:[];
      let html='';
      html+=`<div class="chan-head">${svg('tag',15)} Nuevo en tiendas</div>`;
      html+= nItems.length?nItems.slice(0,4).map(offerRow).join(''):`<div class="chan-empty">Sin resultados nuevos para tu perfil.</div>`;
      html+=`<div class="chan-head" style="margin-top:14px">${svg('sync',15)} Segunda mano</div>`;
      html+= uItems.length?uItems.slice(0,4).map(offerRow).join(''):`<div class="chan-empty">Sin resultados de segunda mano ahora mismo.</div>`;
      box.innerHTML=html;
      this.disabled=false; this.innerHTML=`${svg('tag',16)} Buscar`;
    });
  });
}

/* ═══════════════════════════════════════════
   INSIGHTS (B2B enriched)
═══════════════════════════════════════════ */
function vInsights(m){
  const dna=computeStyleDNA();
  const total=dna.totalValue||0;
  const dead=store.garments.filter(g=>g.worn<=3);
  const cm={'Blanco':'#E7E3DA','Gris':'#AEB4BA','Negro':'#1F2126','Crudo':'#E9DFC9','Marino':'#2B3A5B','Mostaza':'#C99A3E','Azul':'#4A6FA5','Verde':'#4A7C59','—':'#bbb'};
  const rk=store.garments.slice().sort((a,b)=>cpw(b)-cpw(a));
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Insights</div>
    <div class="title">Tu armario,<br>en datos</div></div>

    <!-- Stats principales -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0" class="reveal" style="animation-delay:.02s">
      <div class="stat"><div class="n">${Math.round(total)} €</div><div class="l">Valor total</div></div>
      <div class="stat"><div class="n">${dead.length}</div><div class="l">Dormidas</div></div>
      <div class="stat"><div class="n">${dna.avgPrice||0} €</div><div class="l">Precio medio</div></div>
    </div>

    <!-- ADN de estilo -->
    <div class="shead"><h2>Tu ADN de estilo</h2></div>
    <div class="dna-card reveal" style="animation-delay:.06s">
      <div class="dna-row">
        <span class="dna-k">Segmento</span>
        <span class="dna-v seg-${dna.segment||'mid'}">${{premium:'Premium',mid:'Mid-range',budget:'Budget'}[dna.segment||'mid']||'—'}</span>
      </div>
      <div class="dna-row">
        <span class="dna-k">Corte preferido</span>
        <span class="dna-v">${dna.topFit||'—'}</span>
      </div>
      <div class="dna-row">
        <span class="dna-k">Registro</span>
        <span class="dna-v">${dna.topFormality||'—'}</span>
      </div>
      <div class="dna-row">
        <span class="dna-k">Neutros</span>
        <span class="dna-v">${dna.neutralPct||0}% del armario</span>
      </div>
      <div class="dna-row">
        <span class="dna-k">Materiales</span>
        <span class="dna-v">${(dna.topMaterials||[]).join(', ')||'—'}</span>
      </div>
      <div class="dna-row">
        <span class="dna-k">Coste/uso medio</span>
        <span class="dna-v">${dna.avgCpw||0} €</span>
      </div>
    </div>

    <!-- Marcas top -->
    <div class="shead"><h2>Tus marcas</h2></div>
    <div class="reveal" style="animation-delay:.08s">
      ${(dna.topBrands||[]).map(b=>`<div class="brand-bar">
        <span class="bb-name">${b.brand}</span>
        <div class="bb-track"><div class="bb-fill" style="width:${b.share}%"></div></div>
        <span class="bb-pct">${b.share}%</span>
      </div>`).join('')}
    </div>

    <!-- Paleta de color -->
    <div class="shead"><h2>Paleta de color</h2></div>
    <div class="reveal" style="animation-delay:.1s">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        ${(dna.topColors||[]).map(c=>`<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:40px;height:40px;border-radius:50%;background:${cm[c.color]||'#bbb'};border:1px solid rgba(0,0,0,.07)"></div>
          <div style="font-size:10px;color:var(--ink3)">${c.color}</div>
          <div style="font-size:10px;font-weight:700">${c.share}%</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Tallas por marca -->
    <div class="shead"><h2>Tus tallas</h2></div>
    <div class="reveal" style="animation-delay:.12s">
      ${Object.entries(dna.sizeByBrand||{}).map(([b,s])=>`<div class="sizerow"><span class="bn">${b}</span><span class="sz">${s}</span></div>`).join('')||'<div class="sub">Añade tallas a tus prendas para que Drobe aprenda.</div>'}
    </div>

    <!-- Coste por uso -->
    <div class="shead"><h2>Coste por uso</h2></div>
    <div class="reveal" style="animation-delay:.14s">
      ${rk.map(g=>`<div class="cpw"><div class="ph"><img loading="lazy" decoding="async" src="${g.img||''}"/></div>
        <div><div class="nm">${g.brand} · ${g.name}</div><div class="mt">${g.worn} usos</div></div>
        <div class="val"><div class="v" style="color:${cpw(g)>15?'var(--amber)':'var(--eco)'}">${cpw(g).toFixed(2)} €</div><div class="s">por uso</div></div></div>`).join('')}
    </div>`;

  // actualizar DNA en el perfil (drobe_score se calcula y guarda para uso interno/B2B, sin mostrarse como métrica)
  store.profile=store.profile||{};
  store.profile.style_dna=dna;
  store.profile.drobe_score=computeDrobeScore();
  save();
  if(session){
    if(store.profile.consent_data_b2b){
      cloud.updateProfile({style_dna:dna,drobe_score:store.profile.drobe_score,segment:dna.segment,avg_price_per_item:dna.avgPrice,total_wardrobe_value:total,brand_sizes:dna.sizeByBrand,garment_count:dna.garmentCount}).catch(()=>{});
    }
  }
}

/* ═══════════════════════════════════════════
   PERFIL
═══════════════════════════════════════════ */
function vPerfil(m){
  const p=store.profile||{};
  const name=p.name||(session?.user?.email?.split('@')[0])||'Usuario';
  const dna=p.style_dna||computeStyleDNA();
  m.innerHTML=`<div class="reveal">
    <div style="display:flex;align-items:center;gap:14px;margin:10px 0 22px">
      <div class="pav" id="pav" style="position:relative;cursor:pointer">
        ${p.avatarUrl?`<img src="${esc(p.avatarUrl)}" class="pav-img"/>`:`<span class="pav-ini">${(name[0]||'U').toUpperCase()}</span>`}
        <span class="pav-edit">${svg('pen',11)}</span>
      </div>
      <div>
        <div style="font-family:var(--serif);font-size:21px;font-weight:500;font-style:italic;letter-spacing:-.01em">${name}</div>
        <div class="sub" style="margin-top:2px">${store.garments.length} prendas · ${session?'☁ Sincronizado':'Local'}</div>
      </div>
    </div></div>

    <button class="opt" id="p_tickets" style="margin-bottom:12px">
      <span class="ring">${svg('receipt',22)}</span>
      <div><div class="t1">Tickets y garantías</div><div class="t2">${(store.tickets||[]).length} ticket(s) · plazos de cambio</div></div>
      <span class="arr">${svg('chev',20)}</span></button>
    ${(store.maletas||[]).length?`<button class="opt" id="p_maletas" style="margin-bottom:12px">
      <span class="ring" style="background:var(--accent-soft);color:var(--accent)">${svg('pack',22)}</span>
      <div><div class="t1">Mis maletas</div><div class="t2">${store.maletas.length} guardada(s)</div></div>
      <span class="arr">${svg('chev',20)}</span></button>`:''}

    <button class="opt" id="p_tour" style="margin-bottom:12px">
      <span class="ring" style="background:var(--accent-soft);color:var(--accent)">${svg('spark',22)}</span>
      <div><div class="t1">Ver tutorial</div><div class="t2">Un repaso rápido de cómo funciona Drobe</div></div>
      <span class="arr">${svg('chev',20)}</span></button>

    <button class="opt" id="p_b2b" style="margin-bottom:12px">
      <span class="ring" style="background:var(--noir);color:#E8C9A8">${svg('chart',22)}</span>
      <div><div class="t1">Drobe for Brands</div><div class="t2">Demo de la vista para marcas · datos reales agregados</div></div>
      <span class="arr">${svg('chev',20)}</span></button>
    <div id="strava_slot"></div>

    <button class="opt" id="p_wish" style="margin-bottom:12px">
      <span class="ring" style="background:var(--accent-soft);color:var(--accent)">${svg('heart',22)}</span>
      <div><div class="t1">Wishlist</div><div class="t2">${(store.wishlist||[]).length} prenda(s) vigiladas</div></div>
      <span class="arr">${svg('chev',20)}</span></button>

    <!-- Consentimiento B2B — CRÍTICO para el negocio -->
    <div class="consent-card reveal" style="animation-delay:.04s">
      <div class="cc-head">${svg('dna',18)} Datos y privacidad</div>
      <div class="cc-body">
        <label class="toggle-row">
          <div>
            <div class="tr-title">Mejorar Drobe con mis datos</div>
            <div class="tr-sub">Envía eventos de uso anónimos (escaneos, compras) que afinan las recomendaciones. Si lo apagas, no se envía ninguno.</div>
          </div>
          <input type="checkbox" id="c_analytics" class="toggle" ${p.consent_analytics?'checked':''}/>
        </label>
        <label class="toggle-row">
          <div>
            <div class="tr-title">Compartir datos anónimos con marcas</div>
            <div class="tr-sub">Nunca con tu nombre: solo agregados (segmento, valor, marcas). Si lo apagas, se retiran de la nube al momento.</div>
          </div>
          <input type="checkbox" id="c_b2b" class="toggle" ${p.consent_data_b2b?'checked':''}/>
        </label>
        <label class="toggle-row">
          <div>
            <div class="tr-title">Recibir recomendaciones personalizadas</div>
            <div class="tr-sub">Activa «Seleccionado para ti» en el Estilista: productos reales según tus marcas y tu gasto. Nadie paga por aparecer.</div>
          </div>
          <input type="checkbox" id="c_marketing" class="toggle" ${p.consent_marketing?'checked':''}/>
        </label>
      </div>
    </div>

    <!-- Medidas -->
    <div class="shead"><h2>Mis medidas</h2></div>
    <div class="measure">
      ${[['altura','Altura (cm)'],['peso','Peso (kg)'],['pecho','Pecho (cm)'],['cintura','Cintura (cm)'],['pie','Pie (EU)']].map(f=>`<div class="field" style="margin-bottom:0"><label>${f[1]}</label><input id="ms_${f[0]}" inputmode="numeric" value="${esc((p.measures||{})[f[0]]||'')}"/></div>`).join('')}
    </div>

    <div id="authslot"></div>

    <!-- Ajustes -->
    <div class="shead"><h2>Ajustes</h2></div>
    ${[['cuenta','Cuenta y sincronización','user'],['notifs','Notificaciones','bell'],['privacidad','Privacidad y datos','lock'],['acerca','Acerca de Drobe','spark']].map((t,i)=>`<button class="opt reveal" data-sheet="${t[0]}" style="animation-delay:${0.1+i*0.04}s;padding:15px 18px;width:100%;text-align:left"><span class="ring" style="width:34px;height:34px;background:var(--surface)">${svg(t[2],18)}</span><div class="t1" style="font-size:15px">${t[1]}</div><span class="arr" style="margin-left:auto">${svg('chev',20)}</span></button>`).join('')}`;

  renderAuth(m.querySelector('#authslot'));
  m.querySelector('#p_tickets')?.addEventListener('click',()=>openTickets());
  // avatar photo
  const pavEl=m.querySelector('#pav');
  if(pavEl){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.style.display='none';
    pavEl.appendChild(inp);
    pavEl.onclick=()=>inp.click();
    inp.onchange=async(e)=>{
      const file=e.target.files&&e.target.files[0]; if(!file)return;
      try{
        const img=await imageToBase64(file,400,0.88,true);
        // crop cuadrado desde el centro del canvas
        const c=document.createElement('canvas'); const sz=Math.min(img.w,img.h); c.width=200; c.height=200;
        const src=new Image(); src.src=img.dataUrl;
        await new Promise(r=>{src.onload=r;});
        const ctx=c.getContext('2d');
        ctx.beginPath(); ctx.arc(100,100,100,0,Math.PI*2); ctx.closePath(); ctx.clip();
        const ox=(src.width-sz)/2, oy=(src.height-sz)/2;
        ctx.drawImage(src,ox,oy,sz,sz,0,0,200,200);
        const dataUrl=c.toDataURL('image/jpeg',0.88);
        store.profile=store.profile||{}; store.profile.avatarUrl=dataUrl; save();
        // subir a Storage si hay sesión
        if(session){
          const url=await cloud.uploadAvatar(dataUrl);
          if(url){ store.profile.avatarUrl=url; save(); }
        }
        haptic(); render();
      }catch(err){ toast('No se pudo procesar la imagen'); }
    };
  }
  m.querySelector('#p_maletas')?.addEventListener('click',()=>openMaletasGuardadas());
  m.querySelector('#p_tour')?.addEventListener('click',()=>{ try{localStorage.removeItem('drobe.tour');}catch(e){} startTour(); });
  m.querySelector('#p_b2b')?.addEventListener('click',()=>openB2BDemo());
  m.querySelectorAll('[data-sheet]').forEach(b=>b.onclick=()=>openSettingsSheet(b.dataset.sheet));
  stravaConfig().then(cfg=>{
    const slot=m.querySelector('#strava_slot'); if(!slot||!cfg.configured)return;
    const st=store.profile?.strava;
    slot.innerHTML=`<button class="opt" id="p_strava" style="margin-bottom:12px">
      <span class="ring" style="background:#FC4C02;color:#fff">${svg('sync',22)}</span>
      <div><div class="t1">${st?'Strava conectado':'Conectar Strava'}</div><div class="t2">${st?'Sincroniza los km reales de tus zapatillas':'Km reales de zapatillas y bicis, automáticos'}</div></div>
      <span class="arr">${svg('chev',20)}</span></button>`;
    slot.querySelector('#p_strava').onclick=()=>st?stravaSyncGear():stravaConnect(cfg);
  });
  m.querySelector('#p_wish')?.addEventListener('click',()=>openWishlist());

  // medidas
  ['altura','peso','pecho','cintura','pie'].forEach(k=>{
    const e=m.querySelector(`#ms_${k}`);
    if(e)e.onchange=()=>{ store.profile=store.profile||{}; store.profile.measures=store.profile.measures||{}; store.profile.measures[k]=e.value; save(); if(session)cloud.updateProfile({measures:store.profile.measures}).catch(()=>{}); };
  });

  // consentimientos — el activo B2B
  const saveConsents=()=>{
    store.profile=store.profile||{};
    store.profile.consent_analytics=m.querySelector('#c_analytics')?.checked||false;
    const wasB2b=store.profile.consent_data_b2b;
    store.profile.consent_data_b2b=m.querySelector('#c_b2b')?.checked||false;
    store.profile.consent_marketing=m.querySelector('#c_marketing')?.checked||false;
    // revocación real: al apagar el toggle de marcas, los agregados se BORRAN de la nube
    if(session&&wasB2b&&!store.profile.consent_data_b2b){
      cloud.updateProfile({style_dna:null,drobe_score:null,segment:null,avg_price_per_item:null,total_wardrobe_value:null,brand_sizes:null,garment_count:null}).catch(()=>{});
      toast('Datos agregados retirados de la nube.');
    }
    store.profile.consent_at=new Date().toISOString();
    save();
    if(session) cloud.updateProfile({consent_data_b2b:store.profile.consent_data_b2b,consent_analytics:store.profile.consent_analytics,consent_marketing:store.profile.consent_marketing,consent_at:store.profile.consent_at}).catch(()=>{});
  };
  ['c_analytics','c_b2b','c_marketing'].forEach(id=>{ const e=m.querySelector('#'+id); if(e)e.onchange=saveConsents; });
}

function renderAuth(slot){
  if(!slot)return;
  if(!cloud.cloudEnabled()){
    slot.innerHTML=`<div class="note" style="margin-top:14px">${svg('user',18)}<span>Supabase no configurado. Tus datos se guardan solo en este dispositivo.</span></div>`;
    return;
  }
  if(session){
    slot.innerHTML=`<div class="note" style="margin-top:14px;background:#EAF1EA;color:#2c6e4f">${svg('check',18)}<span>☁ Sincronizado · ${session.user?.email||''} · <button id="logout" style="text-decoration:underline;color:inherit;cursor:pointer">Cerrar sesión</button></span></div>
      <button class="btn ghost" id="diag" style="margin-top:10px">${svg('spark',18)} Diagnóstico de guardado</button>
      <div id="diagout"></div>`;
    slot.querySelector('#logout').onclick=()=>cloud.signOut().then(()=>{session=null;render();});
    slot.querySelector('#diag').onclick=async function(){
      this.disabled=true; this.innerHTML=`${svg('load',18)} Probando…`; this.querySelector('svg')?.classList.add('spin');
      const d=await cloud.diagnose();
      const box=slot.querySelector('#diagout');
      box.innerHTML=`<div class="note ${d.ok?'':'warn'}" style="margin-top:10px;display:block"><b>${d.ok?'✓ El guardado funciona':'✗ Hay un problema'}</b><br>${d.steps.map(s=>'· '+esc(s)).join('<br>')}</div>`;
      this.disabled=false; this.innerHTML=`${svg('spark',18)} Diagnóstico de guardado`;
    };
    return;
  }
  slot.innerHTML=`<div style="margin-top:14px">
    <div class="field"><input id="em" type="email" placeholder="tu@email.com"/></div>
    <div class="field"><input id="pw" type="password" placeholder="Contraseña"/></div>
    <div id="amsg"></div>
    <button class="btn dark" id="lg">Entrar / crear cuenta</button></div>`;
  slot.querySelector('#lg').onclick=async function(){
    const em=slot.querySelector('#em').value.trim(),pw=slot.querySelector('#pw').value;
    if(!em||!pw){slot.querySelector('#amsg').innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">Introduce email y contraseña.</div>`;return;}
    this.disabled=true; this.textContent='Conectando…';
    try{
      const s=await cloud.signInOrUp(em,pw);
      if(s){session=s;await syncFromCloud();safeRender();}
      else{slot.querySelector('#amsg').innerHTML=`<div class="note warn" style="margin:10px 0">${svg('spark',16)}<span><b>Confirma tu email para activar la nube.</b> Hasta entonces, lo que añadas se guarda solo en este dispositivo.</span></div>`;render();}
    }catch(e){slot.querySelector('#amsg').innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">${e?.message||'No se pudo iniciar sesión.'}</div>`;render();}
  };
}

/* ═══════════════════════════════════════════
   ONBOARDING B2B-READY
═══════════════════════════════════════════ */
function needsWelcome(){ try{return !localStorage.getItem('drobe.seen')&&!session;}catch(e){return false;} }
function markSeen(){ try{localStorage.setItem('drobe.seen','1');}catch(e){} }

function renderWelcome(mode='intro'){
  const el=document.createElement('div'); el.className='ficha'; el.id='welcome'; el.style.zIndex='200';
  if(mode==='intro'){
    el.innerHTML=`<div class="welcome">
      <div class="welcome-top">
        <div class="word" style="font-size:42px">Dro<b>be</b></div>
        <div class="welcome-tag">El sistema operativo de tu armario.</div>
      </div>
      <div class="welcome-feats">
        ${[['cam','Digitaliza tu ropa con una foto'],['spark','Asesor de compra honesto — nunca inventa'],['store','Estás en tienda: talla, precio y duplicados al instante'],['tag','Convierte lo que no usas en dinero'],['plane','Maleta perfecta con el tiempo real del destino']].map(f=>`<div class="wfeat">${svg(f[0],20)}<span>${f[1]}</span></div>`).join('')}
      </div>
      <div class="welcome-actions">
        <button class="btn dark" id="w_signup">Crear cuenta</button>
        <button class="btn ghost" id="w_login">Ya tengo cuenta</button>
        <button class="btn text" id="w_skip">Probar sin cuenta</button>
      </div>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('#w_signup').onclick=()=>{el.remove();renderWelcome('signup');};
    el.querySelector('#w_login').onclick=()=>{el.remove();renderWelcome('login');};
    el.querySelector('#w_skip').onclick=()=>{markSeen();el.remove();maybeStartTour();};
    return;
  }
  const isSignup=mode==='signup';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 30px)">
    <div class="backbar"><button id="wb">${svg('back',20)}</button><span class="t">${isSignup?'Crear cuenta':'Iniciar sesión'}</span></div>
    <div class="word" style="font-size:30px;margin:10px 0 6px">Dro<b>be</b></div>
    <div class="sub" style="margin-bottom:20px">${isSignup?'Tu armario, sincronizado en todos tus dispositivos.':'Entra para recuperar tu armario.'}</div>
    ${!cloud.cloudEnabled()?`<div class="note warn">${svg('spark',18)}<span>Sincronización no disponible. Puedes usar la app en local.</span></div>`:''}
    <div class="field" id="f_em"><label>Email</label><input id="w_em" type="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="tu@email.com"/></div>
    <div class="field" id="f_pw"><label>Contraseña</label><div class="pw-wrap"><input id="w_pw" type="password" autocomplete="${isSignup?'new-password':'current-password'}" placeholder="Mínimo 6 caracteres"/><button type="button" class="pw-eye" id="w_eye" aria-label="Mostrar contraseña">${svg('eye',18)}</button></div></div>
    ${isSignup?`<div class="row2">
      <div class="field"><label>Nombre (opcional)</label><input id="w_name" placeholder="Pepe"/></div>
      <div class="field"><label>Edad (opcional)</label><input id="w_age" inputmode="numeric" placeholder="25"/></div>
    </div>
    <div class="field"><label>Sexo (opcional)</label>
      <div class="chips" id="w_sex">${['Hombre','Mujer','Otro','Prefiero no decir'].map(s=>`<button class="chip" data-sex="${s}">${s}</button>`).join('')}</div></div>
    <div class="consent-card" style="margin-top:14px">
      <div class="cc-head">${svg('lock',16)} Privacidad</div>
      <div class="cc-body">
        <label class="toggle-row">
          <div><div class="tr-title">Compartir datos anónimos con marcas</div><div class="tr-sub">Nunca con tu nombre. Ayuda a mejorar la moda y sube tu Drobe Score.</div></div>
          <input type="checkbox" id="w_b2b" class="toggle" checked/>
        </label>
      </div>
    </div>`:''}
    <div id="w_msg"></div>
    <button class="btn dark" id="w_go" style="margin-top:14px">${isSignup?'Crear cuenta':'Entrar'}</button>
    <button class="btn text" id="w_skip2">Continuar sin cuenta</button>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#wb').onclick=()=>{el.remove();renderWelcome('intro');};
  el.querySelector('#w_skip2').onclick=()=>{markSeen();el.remove();maybeStartTour();};
  let sex='';
  el.querySelectorAll('[data-sex]').forEach(b=>b.onclick=()=>{sex=b.dataset.sex;el.querySelectorAll('[data-sex]').forEach(x=>x.classList.toggle('on',x===b));});

  // Validación en tiempo real + toggle de contraseña
  const emEl=el.querySelector('#w_em'), pwEl=el.querySelector('#w_pw'), goBtn=el.querySelector('#w_go');
  const emOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const setFieldErr=(fid,txt)=>{
    const f=el.querySelector('#'+fid); if(!f)return;
    f.classList.toggle('invalid',!!txt);
    let e=f.querySelector('.ferr');
    if(txt){ if(!e){e=document.createElement('div');e.className='ferr';f.appendChild(e);} e.textContent=txt; }
    else if(e)e.remove();
  };
  const validate=()=>{
    const okE=emOk(emEl.value.trim()), okP=pwEl.value.length>=6;
    goBtn.disabled=!(okE&&okP);
    goBtn.style.opacity=goBtn.disabled?'.55':'1';
    return okE&&okP;
  };
  emEl.addEventListener('blur',()=>setFieldErr('f_em',emEl.value.trim()&&!emOk(emEl.value.trim())?'Este email no parece válido.':''));
  emEl.addEventListener('input',()=>{ if(emOk(emEl.value.trim()))setFieldErr('f_em',''); validate(); });
  pwEl.addEventListener('blur',()=>setFieldErr('f_pw',pwEl.value&&pwEl.value.length<6?'Mínimo 6 caracteres.':''));
  pwEl.addEventListener('input',()=>{ if(pwEl.value.length>=6)setFieldErr('f_pw',''); validate(); });
  pwEl.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!goBtn.disabled)goBtn.click(); });
  const eye=el.querySelector('#w_eye');
  if(eye)eye.onclick=()=>{ const show=pwEl.type==='password'; pwEl.type=show?'text':'password'; eye.style.color=show?'var(--accent)':'var(--ink3)'; };
  validate();

  el.querySelector('#w_go').onclick=async function(){
    if(!validate())return;
    const em=el.querySelector('#w_em').value.trim(),pw=el.querySelector('#w_pw').value;
    const msg=el.querySelector('#w_msg');
    if(!em||!pw){msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">Introduce email y contraseña.</div>`;return;}
    if(pw.length<6){msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">La contraseña debe tener al menos 6 caracteres.</div>`;return;}
    if(!cloud.cloudEnabled()){markSeen();el.remove();maybeStartTour();return;}
    this.disabled=true; this.textContent='Conectando…';
    try{
      const s=await cloud.signInOrUp(em,pw);
      if(s){
        session=s;
        if(isSignup){
          store.profile=store.profile||{};
          store.profile.name=el.querySelector('#w_name')?.value||'';
          store.profile.age=el.querySelector('#w_age')?.value||'';
          store.profile.sex=sex;
          store.profile.consent_data_b2b=el.querySelector('#w_b2b')?.checked||false;
          store.profile.consent_analytics=true;
          store.profile.consent_at=new Date().toISOString();
          save();
          cloud.updateProfile({name:store.profile.name,age:store.profile.age,sex:store.profile.sex,consent_data_b2b:store.profile.consent_data_b2b,consent_analytics:true,consent_at:store.profile.consent_at}).catch(()=>{});
        }
        await syncFromCloud(); markSeen(); el.remove(); render(); maybeStartTour();
      } else {
        msg.innerHTML=`<div class="note warn" style="margin:10px 0">${svg('spark',16)}<span><b>Tu cuenta se creó pero aún no tienes sesión activa.</b> Confirma el email que te ha llegado y vuelve a entrar con tu contraseña. Mientras tanto, si sigues usando la app, tus prendas se guardarán <b>solo en este dispositivo</b> y se perderían si borras los datos del navegador.</span></div>`;
        this.disabled=false; this.textContent=isSignup?'Crear cuenta':'Entrar';
      }
    }catch(e){
      msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">${e?.message||'No se pudo conectar.'}</div>`;
      this.disabled=false; this.textContent=isSignup?'Crear cuenta':'Entrar';
    }
  };
}

/* ═══════════════════════════════════════════
   TOUR GUIADO — capa visual independiente.
   No toca datos ni render(); solo lee el DOM ya pintado
   y resalta elementos con explicaciones. Si un paso no
   encuentra su elemento, lo salta sin romper nada.
═══════════════════════════════════════════ */
function tourSeen(){ try{return localStorage.getItem('drobe.tour')==='1';}catch(e){return true;} }
function markTourSeen(){ try{localStorage.setItem('drobe.tour','1');}catch(e){} }

const TOUR_STEPS=[
  {sel:'.hero-look, .title', title:'Tu armario', body:'Aquí vive tu ropa. Cada mañana verás arriba una propuesta de look pensada para el tiempo de hoy y tu estilo.', navTo:'armario'},
  {sel:'[data-t="add"]', title:'Añade prendas', body:'Este es el botón más importante. Haz una foto a una prenda o escanea el ticket de compra: Drobe la reconoce y la cataloga sola. Cuantas más subas, mejor te conocerá.', navTo:'armario'},
  {sel:'#main', title:'Tu estilista', body:'Pregúntale qué ponerte, si comprar algo que has visto, o prepara la maleta de un viaje. Todo se adapta a lo que ya tienes y a tus gustos.', navTo:'estilista'},
  {sel:'#main', title:'Tu ADN de estilo', body:'Aquí ves tu armario en datos: tus marcas, tus colores, el valor de tu ropa y qué prendas tienes dormidas. Se afina con cada prenda que añades.', navTo:'insights'},
  {sel:'#main', title:'Perfil, tickets y ajustes', body:'Tus tickets con plazos de cambio y garantías, tus maletas guardadas, y tus datos. Cuanto más completo esté tu perfil, más acierta Drobe.', navTo:'perfil'},
  {sel:null, title:'Listo', body:'Eso es todo. Empieza añadiendo 3 o 4 prendas y verás cómo Drobe empieza a conocerte.', navTo:'armario', final:true}
];

let tourIdx=0, tourActive=false;
function maybeStartTour(){
  if(tourSeen())return;
  // asegurar que estamos en armario y que ha pintado
  if(route!=='armario')go('armario');
  setTimeout(()=>{ if(!tourSeen()) startTour(); }, 450);
}
function startTour(){
  if(tourActive)return;
  tourActive=true; tourIdx=0;
  showTourStep();
}
function endTour(){
  tourActive=false;
  markTourSeen();
  document.getElementById('tour-ov')?.remove();
}
function showTourStep(){
  document.getElementById('tour-ov')?.remove();
  if(tourIdx>=TOUR_STEPS.length){ endTour(); return; }
  const step=TOUR_STEPS[tourIdx];

  const proceed=()=>{
    if(!tourActive) return; // por si se cerró mientras esperábamos
    let target=null;
    if(step.sel){ try{ target=document.querySelector(step.sel); }catch(e){ target=null; } }

    const ov=document.createElement('div'); ov.id='tour-ov'; ov.className='tour-ov';
    const card=document.createElement('div'); card.className='tour-card';

    let focusTop=null, focusBottom=null;
    if(target){
      const r=target.getBoundingClientRect();
      // si el elemento ocupa casi toda la pantalla (ej. #main entero), no dibujamos
      // recuadro: quedaría gigante. Mostramos la explicación centrada.
      const tooBig = r.height > window.innerHeight*0.6;
      if(!tooBig && r.width>0 && r.height>0){
        const pad=8;
        const hole=document.createElement('div'); hole.className='tour-hole';
        hole.style.left=Math.max(6,r.left-pad)+'px';
        hole.style.top=Math.max(6,r.top-pad)+'px';
        hole.style.width=Math.min(window.innerWidth-12,r.width+pad*2)+'px';
        hole.style.height=(r.height+pad*2)+'px';
        ov.appendChild(hole);
        focusTop=r.top; focusBottom=r.bottom;
      }
    }

    ov.appendChild(card);
    const dots=TOUR_STEPS.map((_,i)=>`<i class="${i===tourIdx?'on':''}"></i>`).join('');
    card.innerHTML=`
      <div class="tour-step">Paso ${tourIdx+1} de ${TOUR_STEPS.length}</div>
      <div class="tour-title">${step.title}</div>
      <div class="tour-body">${step.body}</div>
      <div class="tour-actions">
        <div class="tour-dots">${dots}</div>
        <div class="tour-btns">
          ${step.final?'':`<button class="tour-skip" id="tour-skip">Saltar</button>`}
          <button class="tour-next" id="tour-next">${step.final?'Empezar':'Siguiente'}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    // colocar la tarjeta sin tapar el elemento resaltado
    if(focusTop!=null){
      const cardH=card.offsetHeight;
      if(focusTop < window.innerHeight*0.5){
        card.style.top=Math.min(window.innerHeight-cardH-16, focusBottom+18)+'px';
      } else {
        card.style.top=Math.max(16, focusTop-cardH-18)+'px';
      }
    } else {
      card.style.top=Math.max(16,(window.innerHeight/2-card.offsetHeight/2))+'px';
    }

    card.querySelector('#tour-next').onclick=()=>{ tourIdx++; showTourStep(); };
    card.querySelector('#tour-skip')?.addEventListener('click',endTour);
  };

  if(step.navTo && route!==step.navTo){
    go(step.navTo);
    setTimeout(proceed,360);
  } else {
    setTimeout(proceed,80);
  }
}

/* ═══════════════════════════════════════════
   B2B DEMO — la vista que verían las marcas.
   Datos agregados REALES del armario del usuario; nunca inventados.
═══════════════════════════════════════════ */
function brandStats(brand){
  const gs=store.garments.filter(g=>(g.brand||'').toLowerCase()===brand.toLowerCase());
  if(!gs.length)return null;
  const n=gs.length;
  const avgPrice=gs.reduce((s,g)=>s+(+g.price||0),0)/n;
  const avgCpw=gs.reduce((s,g)=>s+cpw(g),0)/n;
  const dead=gs.filter(g=>(g.worn||0)<=3).length;
  const colors={}; gs.forEach(g=>(g.colors||[g.color]).filter(Boolean).forEach(c=>colors[c]=(colors[c]||0)+1));
  const cats={}; gs.forEach(g=>{const k=g.catGroup||g.cat||'—';cats[k]=(cats[k]||0)+1;});
  const sizes={}; gs.forEach(g=>{if(g.size)sizes[g.size]=(sizes[g.size]||0)+1;});
  const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,3);
  // inteligencia de tallaje: feedback real "cómo te queda"
  const fb={Pequeña:0,Perfecta:0,Grande:0}; let fbN=0;
  gs.forEach(g=>{ if(g.fitFeedback&&fb[g.fitFeedback]!=null){fb[g.fitFeedback]++;fbN++;} });
  // contexto cross-marca: qué otras marcas conviven en el mismo armario
  const others={};
  store.garments.forEach(g=>{ const b=g.brand; if(b&&b!=='—'&&b.toLowerCase()!==brand.toLowerCase()) others[b]=(others[b]||0)+1; });
  // intención de compra: prendas de la marca en wishlist
  const intent=(store.wishlist||[]).filter(w=>(w.brand||'').toLowerCase()===brand.toLowerCase()).length;
  return {n,avgPrice,avgCpw,deadPct:Math.round(dead/n*100),
    topColors:top(colors),topCats:top(cats),topSizes:top(sizes),
    fitFb:fb,fitFbN:fbN,coBrands:top(others),wishIntent:intent};
}
function openB2BDemo(){
  const brands=[...new Set(store.garments.map(g=>g.brand).filter(b=>b&&b!=='—'))];
  if(!brands.length){ toast('Añade prendas con marca para ver la demo B2B'); return; }
  let sel=brands[0];
  const el=document.createElement('div'); el.className='ficha b2b'; el.id='b2bdemo';
  const paint=()=>{
    const s=brandStats(sel);
    el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
      <div class="backbar b2b-bar"><button id="bb">${svg('back',20)}</button><span class="t">Drobe for Brands</span></div>
      <div class="b2b-head">
        <div class="b2b-eyebrow">Vista de marca · demo</div>
        <div class="b2b-title">Lo que ${esc(sel)}<br>vería de sus clientes</div>
      </div>
      <div class="chips b2b-chips">${brands.map(b=>`<button class="chip ${b===sel?'on':''}" data-b="${esc(b)}">${esc(b)}</button>`).join('')}</div>
      ${s?`
      <div class="b2b-grid">
        <div class="b2b-card"><div class="bn">${s.n}</div><div class="bl">Prendas en armarios</div></div>
        <div class="b2b-card"><div class="bn">${s.avgPrice.toFixed(0)}€</div><div class="bl">Ticket medio</div></div>
        <div class="b2b-card"><div class="bn">${s.avgCpw.toFixed(2)}€</div><div class="bl">Coste por uso</div></div>
        <div class="b2b-card ${s.deadPct>=40?'warn':''}"><div class="bn">${s.deadPct}%</div><div class="bl">Prendas dormidas</div></div>
      </div>
      ${s.fitFbN?`<div class="b2b-sec">Inteligencia de tallaje · feedback real</div>
      <div class="b2b-signal">${(()=>{const p=Math.round(s.fitFb['Pequeña']/s.fitFbN*100),g=Math.round(s.fitFb['Grande']/s.fitFbN*100);
        return p>=34?`El <b>${p}%</b> de los compradores dice que ${esc(sel)} <b>talla pequeño</b>. Señal directa de devoluciones evitables.`
        :g>=34?`El <b>${g}%</b> dice que ${esc(sel)} <b>talla grande</b>. Señal directa de devoluciones evitables.`
        :`El <b>${Math.round(s.fitFb['Perfecta']/s.fitFbN*100)}%</b> confirma que el tallaje de ${esc(sel)} es fiel. Argumento de venta verificado.`;})()}</div>
      <div class="b2b-rows" style="margin-top:12px">${['Pequeña','Perfecta','Grande'].map(k=>`<div class="b2b-row"><span>${k}</span><div class="b2b-bar-t"><div style="width:${s.fitFbN?Math.round(s.fitFb[k]/s.fitFbN*100):0}%"></div></div><span class="b2b-pct">${s.fitFbN?Math.round(s.fitFb[k]/s.fitFbN*100):0}%</span></div>`).join('')}</div>`:''}
      ${s.wishIntent?`<div class="b2b-sec">Intención de compra activa</div>
      <div class="b2b-signal"><b>${s.wishIntent}</b> prenda${s.wishIntent>1?'s':''} de ${esc(sel)} en wishlists, con precio objetivo declarado. Demanda medible antes de la venta.</div>`:''}
      ${s.coBrands.length?`<div class="b2b-sec">Convive en armario con</div>
      <div class="b2b-rows">${s.coBrands.map(([k,v])=>`<div class="b2b-row"><span>${esc(k)}</span><div class="b2b-bar-t"><div style="width:${Math.round(v/store.garments.length*100)}%"></div></div><span class="b2b-pct">${v}</span></div>`).join('')}</div>`:''}
      <div class="b2b-sec">Señal de comportamiento</div>
      <div class="b2b-signal">${s.deadPct>0
        ?`El <b>${s.deadPct}%</b> de las prendas ${esc(sel)} en armarios tienen 3 usos o menos. ${s.deadPct>=40?'Riesgo de percepción de bajo valor por uso.':'Uso saludable del producto.'}`
        :`Todas las prendas ${esc(sel)} registradas están en uso activo.`}</div>
      ${s.topSizes.length?`<div class="b2b-sec">Tallas reales compradas</div>
      <div class="b2b-rows">${s.topSizes.map(([k,v])=>`<div class="b2b-row"><span>${esc(k)}</span><div class="b2b-bar-t"><div style="width:${Math.round(v/s.n*100)}%"></div></div><span class="b2b-pct">${Math.round(v/s.n*100)}%</span></div>`).join('')}</div>`:''}
      ${s.topColors.length?`<div class="b2b-sec">Colores en armario</div>
      <div class="b2b-rows">${s.topColors.map(([k,v])=>`<div class="b2b-row"><span>${esc(k)}</span><div class="b2b-bar-t"><div style="width:${Math.round(v/s.n*100)}%"></div></div><span class="b2b-pct">${Math.round(v/s.n*100)}%</span></div>`).join('')}</div>`:''}
      ${s.topCats.length?`<div class="b2b-sec">Categorías</div>
      <div class="b2b-rows">${s.topCats.map(([k,v])=>`<div class="b2b-row"><span>${esc(k)}</span><div class="b2b-bar-t"><div style="width:${Math.round(v/s.n*100)}%"></div></div><span class="b2b-pct">${Math.round(v/s.n*100)}%</span></div>`).join('')}</div>`:''}
      `:''}
      ${(()=>{ // contexto cross-marca: qué más hay en los armarios de sus clientes
        const others={}; store.garments.forEach(g=>{const b=g.brand; if(b&&b!=='—'&&b.toLowerCase()!==sel.toLowerCase())others[b]=(others[b]||0)+1;});
        const top=Object.entries(others).sort((a,b)=>b[1]-a[1]).slice(0,3);
        const allAvg=store.garments.length?store.garments.reduce((x,g)=>x+(+g.price||0),0)/store.garments.length:0;
        return top.length?`<div class="b2b-sec">Contexto competitivo</div>
        <div class="b2b-signal">Sus clientes también tienen <b>${top.map(([b])=>esc(b)).join('</b>, <b>')}</b> en el armario, con un ticket medio global de <b>${allAvg.toFixed(0)}€</b>.</div>`:'';
      })()}
      ${(()=>{ // funnel de conversión en tienda (registro real de escaneos)
        const scans=(store.scanLog||[]).filter(x=>(x.brand||'').toLowerCase()===sel.toLowerCase());
        if(!scans.length)return '';
        const bought=scans.filter(x=>x.bought).length;
        const pos=scans.filter(x=>x.verdict==='comprar').length;
        return `<div class="b2b-sec">Funnel en tienda física</div>
        <div class="b2b-grid" style="margin-top:10px">
          <div class="b2b-card"><div class="bn">${scans.length}</div><div class="bl">Escaneos del producto</div></div>
          <div class="b2b-card"><div class="bn">${Math.round(pos/scans.length*100)}%</div><div class="bl">Veredicto «cómpralo»</div></div>
          <div class="b2b-card"><div class="bn">${bought}</div><div class="bl">Compras confirmadas</div></div>
          <div class="b2b-card"><div class="bn">${Math.round(bought/scans.length*100)}%</div><div class="bl">Conversión</div></div>
        </div>`;
      })()}
      ${(()=>{ // demanda latente: wishlist de la marca
        const wl=(store.wishlist||[]).filter(w=>(w.brand||'').toLowerCase()===sel.toLowerCase());
        if(!wl.length)return '';
        const avgT=wl.filter(w=>w.targetPrice).reduce((x,w)=>x+ +w.targetPrice,0)/(wl.filter(w=>w.targetPrice).length||1);
        return `<div class="b2b-sec">Demanda latente</div>
        <div class="b2b-signal"><b>${wl.length}</b> producto${wl.length>1?'s':''} de ${esc(sel)} en wishlist vigilando precio${avgT?`, con precio objetivo medio de <b>${avgT.toFixed(0)}€</b>`:''}. Intención de compra declarada, no inferida.</div>`;
      })()}
      <div class="b2b-foot">${svg('lock',14)} Demo con los datos agregados de tu propio armario. En producción: agregados anónimos de miles de usuarios, solo con consentimiento explícito.</div>
    </div>`;
    el.querySelector('#bb').onclick=()=>el.remove();
    el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{sel=b.dataset.b;paint();});
  };
  paint();
  document.body.appendChild(el);
}

/* ═══════════════════════════════════════════
   RED SOCIAL — módulo autocontenido.
   No toca el guardado ni render() del armario propio.
═══════════════════════════════════════════ */
let _mySocial=null;
function avHTML(src,cls=''){
  const isUrl=src&&(src.startsWith('http')||src.startsWith('data:'));
  return isUrl?`<div class="soc-av ${cls}"><img src="${esc(src)}"/></div>`:`<div class="soc-av ${cls}">${esc(src||(cls?'U':'?'))}</div>`;
}
async function refreshUnread(){
  try{
    const n=await cloud.unreadCount();
    const dot=document.getElementById('unread_dot');
    if(dot)dot.style.display=n>0?'block':'none';
  }catch(e){}
}

async function openSocial(){
  if(!session){ toast('Inicia sesión para usar la comunidad'); go('perfil'); return; }
  const el=document.createElement('div'); el.className='ficha'; el.id='social';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="soc_b">${svg('back',20)}</button><span class="t">Comunidad</span></div>
    <div id="soc_body"><div class="empty" style="padding-top:40px">${svg('load',26)}<div style="margin-top:10px">Cargando…</div></div></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#soc_b').onclick=()=>{stopChatPoll();el.remove();};
  await renderSocialHome(el.querySelector('#soc_body'));
}

async function renderSocialHome(body){
  _mySocial=await cloud.getMySocial();
  if(!_mySocial||!_mySocial.username){ renderUsernameSetup(body); return; }
  const { friends, incoming, outgoing }=await cloud.getFriendships();
  body.innerHTML=`
    <div class="soc-me">
      ${avHTML(_mySocial.avatar||_mySocial.username[0].toUpperCase())}
      <div style="flex:1"><div class="soc-name">${esc(_mySocial.display_name||_mySocial.username)}</div><div class="soc-handle">@${esc(_mySocial.username)} · <button id="soc_edit" style="color:var(--ink3);text-decoration:underline">editar</button></div></div>\n      <button class="fr-btn ghost" id="soc_share">${svg('send',14)}</button>
    </div>

    <div class="pubrow">
      <div><div class="pub-t">Armario público</div><div class="pub-s">Cualquiera con tu enlace puede ver tu armario (sin precios).</div></div>
      <label class="switch"><input type="checkbox" id="soc_pub" ${_mySocial.public?'checked':''}/><span></span></label>
    </div>

    <div class="soc-search">
      ${svg('search',18)}<input id="soc_q" placeholder="Buscar por @usuario…" autocapitalize="off" autocorrect="off"/>
    </div>
    <div id="soc_results"></div>

    ${incoming.length?`<div class="shead"><h2>Solicitudes</h2></div>
      ${incoming.map(f=>friendRow(f,'incoming')).join('')}`:''}

    <div class="shead"><h2>Amigos ${friends.length?`· ${friends.length}`:''}</h2></div>
    ${friends.length?friends.map(f=>friendRow(f,'friend')).join(''):`<div class="soc-empty">Aún no tienes amigos. Búscalos por su @usuario y verás sus armarios cuando acepten.</div>`}
    ${outgoing.length?`<div class="shead"><h2>Pendientes de aceptar</h2></div>${outgoing.map(f=>friendRow(f,'outgoing')).join('')}`:''}
  `;

  body.querySelector('#soc_edit')?.addEventListener('click',()=>renderUsernameSetup(body,true));
  const shareBtn=body.querySelector('#soc_share');
  if(shareBtn)shareBtn.onclick=async()=>{
    if(!_mySocial.public){ toast('Activa primero el armario público'); return; }
    const url=location.origin+location.pathname+'?u='+_mySocial.username;
    if(navigator.share){ try{ await navigator.share({title:'Mi armario en Drobe',url}); }catch(e){} }
    else { try{ await navigator.clipboard.writeText(url); toast('Enlace copiado'); }catch(e){ toast(url); } }
  };
  const pub=body.querySelector('#soc_pub');
  if(pub)pub.onchange=async()=>{
    const r=await cloud.setPublicWardrobe(pub.checked);
    if(r.ok){ _mySocial.public=pub.checked; haptic(); toast(pub.checked?'Armario público activado':'Armario ahora privado'); }
    else { pub.checked=!pub.checked; toast('No se pudo cambiar (¿ejecutaste el SQL?)'); }
  };

  // buscador
  const q=body.querySelector('#soc_q'); const results=body.querySelector('#soc_results');
  let t;
  q.oninput=()=>{ clearTimeout(t); t=setTimeout(async()=>{
    const term=q.value.trim();
    if(term.length<2){ results.innerHTML=''; return; }
    results.innerHTML=`<div class="soc-empty">${svg('load',16)} Buscando…</div>`;
    const users=await cloud.searchUsers(term);
    const known=new Set([...friends,...incoming,...outgoing].map(f=>f.otherId));
    results.innerHTML=users.length?users.map(u=>`
      <div class="friend-row">
        ${avHTML(u.avatar||u.username[0].toUpperCase(),"sm")}
        <div class="fr-info"><div class="fr-name">${esc(u.display_name||u.username)}</div><div class="fr-handle">@${esc(u.username)}</div></div>
        ${known.has(u.id)?`<span class="fr-tag">Ya conectado</span>`:`<button class="fr-btn" data-add="${u.id}">Agregar</button>`}
      </div>`).join(''):`<div class="soc-empty">Sin resultados para "${esc(term)}".</div>`;
    results.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{
      b.disabled=true; b.textContent='…';
      const r=await cloud.sendFriendRequest(b.dataset.add);
      if(r.ok){ b.textContent='Enviada'; b.classList.add('done'); }
      else { b.textContent='Reintentar'; b.disabled=false; toast(r.reason||'No se pudo'); }
    });
  },320); };

  // acciones en filas (aceptar/rechazar/abrir)
  bindFriendRows(body);
}

function friendRow(f,kind){
  const p=f.profile;
  return `<div class="friend-row" data-fid="${f.id}" data-oid="${f.otherId}">
    <div ${kind==='friend'?`data-open="${f.otherId}"`:''} style="cursor:pointer">${avHTML(p.avatar||(p.username||'U')[0].toUpperCase(),'sm')}</div>
    <div class="fr-info" ${kind==='friend'?`data-open="${f.otherId}"`:''}>
      <div class="fr-name">${esc(p.display_name||p.username)}</div><div class="fr-handle">@${esc(p.username)}</div></div>
    ${kind==='incoming'?`<div class="fr-actions"><button class="fr-btn" data-accept="${f.id}">Aceptar</button><button class="fr-btn ghost" data-reject="${f.id}">✕</button></div>`
      :kind==='outgoing'?`<span class="fr-tag">Pendiente</span>`
      :`<button class="fr-btn ghost" data-open="${f.otherId}">Ver</button>`}
  </div>`;
}

function bindFriendRows(body){
  body.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async(e)=>{ e.stopPropagation(); b.disabled=true; await cloud.respondFriend(b.dataset.accept,true); renderSocialHome(body); });
  body.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async(e)=>{ e.stopPropagation(); b.disabled=true; await cloud.respondFriend(b.dataset.reject,false); renderSocialHome(body); });
  body.querySelectorAll('[data-open]').forEach(b=>b.onclick=(e)=>{ e.stopPropagation(); openFriend(b.dataset.open); });
}

function renderUsernameSetup(body,edit){
  body.innerHTML=`
    <div class="title" style="font-size:30px;margin-bottom:6px">Elige tu<br>nombre de usuario</div>
    <div class="sub" style="margin-bottom:20px">Así te encontrarán tus amigos para ver armarios y pedirte looks.</div>
    <div class="field"><label>Nombre visible</label><input id="su_name" placeholder="${esc((store.profile?.name)||'Pepe')}" value="${esc(store.profile?.name||'')}"/></div>
    <div class="field"><label>Usuario</label><input id="su_user" placeholder="pepe" autocapitalize="off" autocorrect="off" value="${edit&&_mySocial?esc(_mySocial.username):''}"/></div>
    <div id="su_msg"></div>
    <button class="btn dark" id="su_go" style="margin-top:8px">${edit?'Guardar cambios':'Crear mi perfil social'}</button>\n    ${edit?`<button class="btn ghost" id="su_back" style="margin-top:10px">Volver</button>`:''}`;
  body.querySelector('#su_back')?.addEventListener('click',()=>renderSocialHome(body));
  body.querySelector('#su_go').onclick=async function(){
    const name=body.querySelector('#su_name').value.trim();
    const user=body.querySelector('#su_user').value.trim();
    const msg=body.querySelector('#su_msg');
    this.disabled=true; this.textContent='Creando…';
    const r=await cloud.setUsername(user,name);
    if(r.ok){ renderSocialHome(body); }
    else { msg.innerHTML=`<div class="sub" style="color:var(--danger);margin:8px 0">${esc(r.reason||'No se pudo')}</div>`; this.disabled=false; this.textContent='Crear mi perfil social'; }
  };
}

/* ---- armario de un amigo (navegable, solo lectura) + chat ---- */
async function openFriend(friendId, tab='wardrobe'){
  const el=document.createElement('div'); el.className='ficha'; el.id='friend';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="fr_b">${svg('back',20)}</button><span class="t" id="fr_title">Amigo</span></div>
    <div class="viewseg" style="margin-bottom:16px">
      <button class="vseg ${tab==='wardrobe'?'on':''}" data-tab="wardrobe">${svg('hanger',16)} Armario</button>
      <button class="vseg ${tab==='chat'?'on':''}" data-tab="chat">${svg('chat',16)} Chat</button>
    </div>
    <div id="fr_body"><div class="empty" style="padding-top:30px">${svg('load',24)}</div></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#fr_b').onclick=()=>{ stopChatPoll(); el.remove(); };
  el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ stopChatPoll(); openFriendTab(el,friendId,b.dataset.tab); });
  // nombre del amigo en la cabecera
  cloud.getFriendships().then(({friends})=>{
    const f=friends.find(x=>x.otherId===friendId);
    const tt=el.querySelector('#fr_title');
    if(f&&tt)tt.textContent=f.profile.display_name||('@'+f.profile.username);
  }).catch(()=>{});
  openFriendTab(el,friendId,tab);
}

async function openFriendTab(el,friendId,tab){
  el.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  const body=el.querySelector('#fr_body');
  if(tab==='wardrobe'){
    body.innerHTML=`<div class="empty" style="padding-top:30px">${svg('load',24)}<div style="margin-top:8px">Abriendo su armario…</div></div>`;
    const garments=await cloud.getFriendWardrobe(friendId);
    if(garments===null){ body.innerHTML=`<div class="soc-empty">No puedes ver este armario. Puede que la amistad ya no exista.</div>`; return; }
    if(!garments.length){ body.innerHTML=`<div class="soc-empty">Su armario está vacío por ahora.</div>`; return; }
    body.innerHTML=`<div class="note" style="margin-bottom:14px">${svg('spark',16)}<span>Estás viendo su armario. Elige prendas y mándale un look con el botón de abajo.</span></div>
      <div class="grid" id="fr_grid">${garments.map(g=>`
        <div class="gcard" data-pick="${g.id}">
          <div class="ph">${g.img?`<img loading="lazy" decoding="async" src="${esc(g.img)}"/>`:''}<span class="pick-check">${svg('check',16)}</span></div>
          <div class="cap"><div class="b">${esc(g.brand||'')}</div><div class="n">${esc(g.name||'')}</div></div>
        </div>`).join('')}</div>
      <button class="btn dark" id="fr_sendlook" style="position:sticky;bottom:16px;margin-top:16px;opacity:.5" disabled>${svg('send',18)} Envíale este look (0)</button>`;
    const picked=new Set();
    const btn=body.querySelector('#fr_sendlook');
    body.querySelectorAll('[data-pick]').forEach(c=>c.onclick=()=>{
      const id=c.dataset.pick;
      if(picked.has(id)){picked.delete(id);c.classList.remove('picked');}else{picked.add(id);c.classList.add('picked');}
      btn.disabled=picked.size===0; btn.style.opacity=picked.size?'1':'.5';
      btn.innerHTML=`${svg('send',18)} Envíale este look (${picked.size})`;
    });
    btn.onclick=async()=>{
      btn.disabled=true; btn.innerHTML=`${svg('load',18)} Enviando…`;
      const r=await cloud.sendMessage(friendId,{type:'look',body:'Te propongo este look 👗',payload:{ownerId:friendId,garmentIds:[...picked]}});
      if(r.ok){ openFriendTab(el,friendId,'chat'); }
      else { btn.disabled=false; btn.innerHTML=`${svg('send',18)} Reintentar`; toast(r.reason||'No se pudo enviar'); }
    };
  } else {
    body.innerHTML=`<div class="chat-scroll" id="chat_scroll"></div>
      <div class="chat-input"><input id="chat_text" placeholder="Escribe un mensaje…"/><button id="chat_send">${svg('send',18)}</button></div>`;
    const scroll=body.querySelector('#chat_scroll');
    const loadMsgs=async()=>{
      const msgs=await cloud.getMessages(friendId);
      await cloud.markMessagesRead(friendId); refreshUnread();
      scroll.innerHTML=msgs.length?msgs.map(renderMsg).join(''):`<div class="soc-empty">Aún no hay mensajes. ¡Salúdale!</div>`;
      scroll.scrollTop=scroll.scrollHeight;
      scroll.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>showLookMessage(b.dataset.look));
    };
    await loadMsgs();
    startChatPoll(loadMsgs);
    const send=async()=>{
      const t=body.querySelector('#chat_text'); const v=t.value.trim(); if(!v)return;
      t.value='';
      haptic();
      const r=await cloud.sendMessage(friendId,{type:'text',body:v});
      if(r.ok)loadMsgs(); else toast(r.reason||'No se pudo enviar');
    };
    body.querySelector('#chat_send').onclick=send;
    body.querySelector('#chat_text').onkeydown=(e)=>{ if(e.key==='Enter')send(); };
  }
}

function msgTime(iso){ if(!iso)return ''; const d=new Date(iso); if(isNaN(d))return '';
  const today=new Date().toDateString()===d.toDateString();
  return (today?'':d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' · ')+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
}
function renderMsg(m){
  if(m.type==='look'){
    const ids=(m.payload&&m.payload.garmentIds)||[];
    return `<div class="msg ${m.mine?'mine':''}">
      <div class="msg-look" data-look='${esc(JSON.stringify(m.payload||{}))}'>
        ${svg('hanger',16)} ${m.mine?'Le propusiste':'Te propone'} un look · ${ids.length} prenda(s)
        <span class="msg-look-cta">Ver look</span>
      </div>
      ${m.body?`<div class="msg-b">${esc(m.body)}</div>`:''}
    </div>`;
  }
  return `<div class="msg ${m.mine?'mine':''}"><div class="msg-b">${esc(m.body||'')}</div><div class="msg-t">${msgTime(m.created_at)}</div></div>`;
}

async function showLookMessage(payloadStr){
  let payload; try{payload=JSON.parse(payloadStr);}catch(e){return;}
  const ids=payload.garmentIds||[]; const ownerId=payload.ownerId;
  const ov=document.createElement('div'); ov.className='ficha'; ov.id='lookview'; ov.style.zIndex='300';
  ov.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="lv_b">${svg('back',20)}</button><span class="t">El look propuesto</span></div>
    <div id="lv_body"><div class="empty" style="padding-top:30px">${svg('load',24)}</div></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#lv_b').onclick=()=>ov.remove();
  // las prendas pueden ser mías (yo soy el owner) o de un amigo
  let garments=null;
  const mine=store.garments.filter(g=>ids.includes(g.id));
  if(mine.length===ids.length) garments=mine;
  else { const fw=await cloud.getFriendWardrobe(ownerId); garments=(fw||[]).filter(g=>ids.includes(g.id)); }
  const body=ov.querySelector('#lv_body');
  body.innerHTML=garments&&garments.length?`<div class="grid">${garments.map(g=>`
    <div class="gcard"><div class="ph">${g.img?`<img loading="lazy" decoding="async" src="${esc(g.img)}"/>`:''}</div>
    <div class="cap"><div class="b">${esc(g.brand||'')}</div><div class="n">${esc(g.name||'')}</div></div></div>`).join('')}</div>`
    :`<div class="soc-empty">No se pudieron cargar las prendas de este look.</div>`;
}

// polling del chat (robusto y simple; se detiene al salir)
let _chatPoll=null;
function startChatPoll(fn){ stopChatPoll(); _chatPoll=setInterval(fn,4000); }
function stopChatPoll(){ if(_chatPoll){clearInterval(_chatPoll);_chatPoll=null;} }

// toast genérico ligero (reutiliza estilo de syncwarn)
function toast(txt){
  const old=document.getElementById('gtoast'); if(old)old.remove();
  const el=document.createElement('div'); el.id='gtoast'; el.className='syncwarn'; el.style.background='var(--noir)'; el.style.color='#F6F1E9';
  el.innerHTML=`${svg('spark',16)} ${esc(txt)}`;
  document.body.appendChild(el); setTimeout(()=>el.remove(),3500);
}

/* ═══ STRAVA: km reales de zapatillas y bicis ═══ */
async function stravaConfig(){
  if(window._stravaCfg!==undefined)return window._stravaCfg;
  try{ const r=await fetch('/api/strava'); window._stravaCfg=await r.json(); }
  catch(e){ window._stravaCfg={configured:false}; }
  return window._stravaCfg;
}
function stravaConnect(cfg){
  try{localStorage.setItem('drobe.strava_pending','1');}catch(e){}
  const redirect=encodeURIComponent(location.origin+location.pathname);
  location.href=`https://www.strava.com/oauth/authorize?client_id=${cfg.client_id}&redirect_uri=${redirect}&response_type=code&scope=read&approval_prompt=auto`;
}
async function stravaHandleReturn(){
  const code=new URLSearchParams(location.search).get('code');
  let pending=false; try{pending=localStorage.getItem('drobe.strava_pending')==='1';}catch(e){}
  if(!code||!pending)return;
  try{localStorage.removeItem('drobe.strava_pending');}catch(e){}
  history.replaceState(null,'',location.pathname);
  const r=await fetch('/api/strava',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'token',code})}).then(x=>x.json()).catch(()=>null);
  if(r&&r.ok){
    store.profile=store.profile||{};
    store.profile.strava={access_token:r.access_token,refresh_token:r.refresh_token,expires_at:r.expires_at,name:r.athlete?.firstname||''};
    save(); toast('Strava conectado'+(r.athlete?.firstname?', '+r.athlete.firstname:'')); render();
  } else toast('No se pudo conectar Strava: '+((r&&r.reason)||'error'));
}
async function stravaToken(){
  const st=store.profile?.strava; if(!st)return null;
  if(st.expires_at&&st.expires_at*1000>Date.now()+60000)return st.access_token;
  const r=await fetch('/api/strava',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'refresh',refresh_token:st.refresh_token})}).then(x=>x.json()).catch(()=>null);
  if(r&&r.ok){ Object.assign(st,{access_token:r.access_token,refresh_token:r.refresh_token,expires_at:r.expires_at}); save(); return r.access_token; }
  return null;
}
async function stravaSyncGear(){
  const tok=await stravaToken();
  if(!tok){ toast('Reconecta Strava'); delete store.profile.strava; save(); render(); return; }
  const r=await fetch('/api/strava',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'gear',access_token:tok})}).then(x=>x.json()).catch(()=>null);
  if(!r||!r.ok){ toast('No se pudo leer tu material de Strava'); return; }
  // actualizar automáticamente prendas ya vinculadas
  const all=[...(r.shoes||[]),...(r.bikes||[])];
  let updated=0;
  store.garments.forEach(g=>{ const m=all.find(x=>x.id===g.stravaGear); if(m&&g.km!==m.km){ g.km=m.km; updated++; if(session)cloud.pushGarment(g); } });
  if(updated)save();
  openStravaGear(r,updated);
}
function openStravaGear(r,updated){
  const el=document.createElement('div'); el.className='ficha'; el.id='stravagear';
  const shoes=r.shoes||[];
  const cands=store.garments.filter(g=>g.context==='deporte'||/(zapatilla|sneaker|running)/i.test(g.cat+' '+g.name));
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="sgb">${svg('back',20)}</button><span class="t">Material de Strava</span></div>
    ${updated?`<div class="note" style="margin-bottom:12px">${svg('check',16)}<span>${updated} prenda(s) actualizadas con km reales.</span></div>`:''}
    ${shoes.length?'':`<div class="soc-empty">No hay zapatillas registradas en tu Strava.</div>`}
    ${shoes.map(sh=>{
      const linked=store.garments.find(g=>g.stravaGear===sh.id);
      return `<div class="tk-card"><div class="tk-body">
        <div class="tk-store">${esc(sh.name)}</div>
        <div class="tk-meta">${sh.km} km reales${sh.km>=600?' · <b style="color:var(--accent)">zona de renovación</b>':''}</div>
        ${linked?`<div class="tk-badge ok">${svg('check',12)} Vinculada a ${esc(linked.brand)} ${esc(linked.name)}</div>`
        :cands.length?`<select class="sg-sel" data-gear="${esc(sh.id)}" data-km="${sh.km}"><option value="">Vincular a una prenda…</option>${cands.map(g=>`<option value="${g.id}">${esc(g.brand)} ${esc(g.name)}</option>`).join('')}</select>`
        :`<div class="tk-badge off">Añade tus zapatillas al armario para vincularlas</div>`}
      </div></div>`;}).join('')}
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#sgb').onclick=()=>el.remove();
  el.querySelectorAll('.sg-sel').forEach(s=>s.onchange=()=>{
    const g=findG(s.value); if(!g)return;
    g.stravaGear=s.dataset.gear; g.km=Number(s.dataset.km); g.context='deporte'; g.sport=g.sport||'Run';
    save(); if(session)cloud.pushGarment(g); haptic(); el.remove(); stravaSyncGear();
  });
}

/* ═══ ARMARIO PÚBLICO (?u=usuario): entrada cinematográfica ═══ */
async function tryPublicView(){
  const uname=new URLSearchParams(location.search).get('u');
  if(!uname)return false;
  const app=document.getElementById('app');
  // puertas cerradas mientras carga: el logo respira en el centro
  app.innerHTML=`
    <div class="doors" id="doors">
      <div class="door l"><span class="knob"></span></div>
      <div class="door r"><span class="knob"></span></div>
      <div class="doors-logo"><div class="dl-name">Drobe</div><div class="dl-sub">Abriendo el armario</div></div>
    </div>
    <main id="main" style="padding-top:0;padding-bottom:40px"></main>`;
  const openDoors=()=>{ const d=document.getElementById('doors'); if(!d)return;
    d.classList.add('open'); setTimeout(()=>d.remove(),1900); };
  const main=document.getElementById('main');
  const data=await cloud.getPublicWardrobe(uname).catch(()=>null);
  if(!data){
    main.innerHTML=`<div class="empty" style="padding-top:120px">${svg('lock',26)}<div style="margin-top:12px">Este armario no existe o no es público.</div>
      <a href="${location.pathname}" class="btn dark" style="margin-top:20px;max-width:240px;text-decoration:none">Abrir Drobe</a></div>`;
    setTimeout(openDoors,400);
    return true;
  }
  const {profile:sp,garments:gs}=data;
  const visible=gs.filter(g=>g.status!=='venta');
  main.innerHTML=`
    <div class="pub-hero">
      <div class="pub-eyebrow">Drobe · Armario</div>
      ${avHTML(sp.avatar||(sp.username[0]||'U').toUpperCase(),'xl')}
      <div class="pub-title">El armario de<br><em>${esc(sp.display_name||sp.username)}</em></div>
      <div class="pub-meta">@${esc(sp.username)} · ${visible.length} prendas</div>
    </div>
    <div style="padding:0 22px">
      <div class="grid" style="margin-top:22px">${visible.map((g,i)=>`
        <div class="gcard reveal" style="animation-delay:${0.9+Math.min(i,12)*0.06}s">
          <div class="ph"><img loading="lazy" decoding="async" src="${esc(g.img||'')}"/></div>
          <div class="cap"><div class="b">${esc(g.brand||'')}</div><div class="n">${esc(g.name||'')}</div><div class="m">${esc(g.cat||'')} · ${esc(g.color||'')}</div></div>
        </div>`).join('')}</div>
      <a href="${location.pathname}" class="btn dark" style="margin-top:28px;text-decoration:none">${svg('spark',18)} Crea tu armario con Drobe</a>
    </div>`;
  setTimeout(openDoors,650); // un respiro con las puertas cerradas y… se abren
  return true;
}

/* ═══════════════════════════════════════════
   CLOUD + ARRANQUE
═══════════════════════════════════════════ */
tryPublicView().then(isPublic=>{
  if(isPublic)return;
  render();
  initCloud();
  loadWeather();
  stravaHandleReturn();
  // precargar el motor de foto de estudio en segundo plano: cuando el usuario
  // lo toque por primera vez, el modelo ya está descargado (ahí está el wow)
  const idle=window.requestIdleCallback||(fn=>setTimeout(fn,4000));
  idle(()=>{ loadBgLib().then(lib=>{ try{ lib&&lib.preload&&lib.preload(bgConfig()); }catch(e){} }).catch(()=>{}); });
  if(needsWelcome())setTimeout(()=>renderWelcome('intro'),300);
});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

async function initCloud(){
  if(!cloud.cloudEnabled())return;
  try{
    session=await cloud.getSession();
    cloud.onAuth(async ns=>{session=ns;await syncFromCloud();safeRender();});
    if(session)await syncFromCloud();
    safeRender();
  }catch(e){}
}
function safeRender(){ if(route==='add'&&addMode!=='choose')return; render(); }
async function syncFromCloud(){
  if(!session)return;
  await cloud.ensureProfile(); // garantizar FK antes de cualquier escritura
  cloud.ensureSocialProfile().catch(()=>{}); // encontrable en Comunidad desde el primer login
  let rows=await cloud.pullGarments();
  if(rows===null) return; // error de red: conservar lo local, no tocar nada
  // tombstones: prendas borradas en local (quizá offline) no deben resucitar
  const dead=new Set(store.deletedIds||[]);
  if(dead.size){ rows=rows.filter(r=>!dead.has(r.id)); (store.deletedIds||[]).forEach(id=>cloud.deleteGarmentCloud(id).catch(()=>{})); store.deletedIds=[]; }
  // merge: subir cualquier prenda local que no esté ya en la nube
  const cloudIds=new Set(rows.map(r=>r.id));
  const localOnly=store.garments.filter(g=>!cloudIds.has(g.id));
  if(localOnly.length){
    for(const g of localOnly) await cloud.pushGarment(g);
    rows=await cloud.pullGarments();
    if(rows===null) return;
  }
  store.garments=rows.map(r=>{ const g=cloud.fromRow(r); g.catGroup=g.catGroup||catToGroup(g.cat||''); g.fit=g.fit||'Regular Fit'; g.colors=g.colors&&g.colors.length?g.colors:[g.color]; g.docs=g.docs||[]; g.photos=g.photos||[]; return g; });
  // traer el perfil (sexo, edad, consentimientos, ADN guardado) — sin esto la
  // personalización arranca a ciegas en cada sesión nueva.
  const profileRow=await cloud.pullProfile();
  if(profileRow){
    store.profile={
      ...store.profile,
      name: profileRow.name ?? store.profile?.name,
      age: profileRow.age ?? store.profile?.age,
      sex: profileRow.sex ?? store.profile?.sex,
      consent_data_b2b: profileRow.consent_data_b2b ?? store.profile?.consent_data_b2b,
      consent_analytics: profileRow.consent_analytics ?? store.profile?.consent_analytics,
      consent_marketing: profileRow.consent_marketing ?? store.profile?.consent_marketing,
      measures: profileRow.measures ?? store.profile?.measures,
      style_dna: profileRow.style_dna ?? store.profile?.style_dna,
      drobe_score: profileRow.drobe_score ?? store.profile?.drobe_score
    };
  }
  // traer maletas guardadas
  const mals=await cloud.pullMaletas();
  if(mals){
    store.maletas=mals.map(m=>({id:m.id,name:m.name,dest:m.dest,days:m.days,plan:m.plan,items:m.items||[],looks:m.looks,weight:m.weight,createdAt:m.created_at}));
  }
  // traer tickets guardados
  const tks=await cloud.pullTickets();
  if(tks){
    store.tickets=tks.map(t=>({id:t.id,store:t.store,dateISO:t.date,total:t.total,returnDays:t.return_days,warrantyMonths:t.warranty_months,img:t.img,garmentIds:t.garment_ids||[],items:t.items||[],createdAt:t.created_at}));
  }
  // traer wishlist
  const wls=await cloud.pullWishlist();
  if(wls){
    store.wishlist=wls.map(w=>({id:w.id,desc:w.description,brand:w.brand,tipo:w.tipo,query:w.query,targetPrice:w.target_price,lastPrice:w.last_price,lastLink:w.last_link,lastSource:w.last_source,thumbnail:w.thumbnail,createdAt:w.created_at}));
  }
  save();
  safeRender();
}

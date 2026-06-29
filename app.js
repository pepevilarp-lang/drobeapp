import { mountWardrobe3D, unmountWardrobe3D, resetView } from './wardrobe3d.js';
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
  pack:'M3 3h18l-2 14H5zM3 3L1 1M8 21h8M12 12V6M9 9l3-3 3 3'
};
const svg = (n,s,w) => {
  s=s||22; w=w||1.7;
  const d = IC[n]||'';
  const paths = d.split('M').filter(Boolean).map(p=>`<path d="M${p}"/>`).join('');
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
const CATS_GROUP = ['Camisetas','Polos','Jerséis/Sudaderas','Camisas','Chaquetas/Abrigos','Pantalones','Shorts/Bermudas','Faldas/Vestidos','Calzado','Accesorios'];
const FITS = ['Slim Fit','Regular Fit','Oversized','Boxy','Cargo','Wide Leg','Straight','Bomber','Overshirt','Otro'];
const SEASONS = ['Primavera/Verano','Otoño/Invierno','Todo el año'];
const FORMS = ['Casual','Smart casual','Formal','Deporte'];
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
  try{ const r=localStorage.getItem(KEY); if(r){const s=JSON.parse(r);if(s.garments){s.profile=s.profile||{};return s}} }catch(e){}
  return {garments:JSON.parse(JSON.stringify(SEED)),profile:{}};
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){} }
const findG = id => store.garments.find(g=>g.id==id);
function addGarment(g){ g.id=g.id||('g'+Date.now()+Math.random().toString(36).slice(2,6)); store.garments.unshift(g); save(); if(session)cloud.pushGarment(g); }
const cpw = g => g.price/Math.max(g.worn,1);

/* ═══════════════════════════════════════════
   HELPERS UI
═══════════════════════════════════════════ */
const esc = s => (s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
function stars(c,total=5){
  const n=Math.round((c||0)*total);
  return `<span class="stars">${Array.from({length:total},(_,i)=>`<span class="${i<n?'on':'off'}">★</span>`).join('')}</span>`;
}
function confBadge(c){ const p=Math.round((c||0)*100); return `<span class="cbadge ${p<60?'low':p<85?'med':'hi'}">${p}%</span>`; }
function optSel(opts,val){ return (val&&!opts.includes(val)?`<option selected>${val}</option>`:'')+opts.map(o=>`<option${o===val?' selected':''}>${o}</option>`).join(''); }

/* ═══════════════════════════════════════════
   FORMULARIO PRENDA
═══════════════════════════════════════════ */
function garmentFormHTML(p={},c={}){
  return `
  <div class="field"><label>Marca ${c.brand!=null?confBadge(c.brand):''}</label>
    <input id="f_brand" value="${esc(p.brand)}" placeholder="Nike, Zara, Stone Island…"/></div>
  <div class="field"><label>Nombre / modelo ${c.name!=null?confBadge(c.name):''}</label>
    <input id="f_name" value="${esc(p.name)}" placeholder="Parka técnica negra"/></div>
  <div class="row2">
    <div class="field"><label>Tipo ${c.cat!=null?confBadge(c.cat):''}</label>
      <select id="f_cat">${optSel(CATS_DETAIL,p.cat||p.category)}</select></div>
    <div class="field"><label>Corte ${c.fit!=null?confBadge(c.fit):''}</label>
      <select id="f_fit">${optSel(FITS,p.fit)}</select></div>
  </div>
  <div class="row2">
    <div class="field"><label>Color ${c.color!=null?confBadge(c.color):''}</label>
      <input id="f_color" value="${esc((p.colors&&p.colors[0])||p.color)}" placeholder="Verde oliva"/></div>
    <div class="field"><label>Material ${c.material!=null?confBadge(c.material):''}</label>
      <input id="f_mat" value="${esc(p.material)}" placeholder="Poliéster reciclado"/></div>
  </div>
  <div class="row2">
    <div class="field"><label>Talla</label><input id="f_size" value="${esc(p.size)}" placeholder="M"/></div>
    <div class="field"><label>Precio €</label><input id="f_price" inputmode="decimal" value="${esc(p.price)}" placeholder="0"/></div>
  </div>
  <div class="row2">
    <div class="field"><label>Temporada</label><select id="f_season">${optSel(SEASONS,p.season)}</select></div>
    <div class="field"><label>Formalidad</label><select id="f_form">${optSel(FORMS,p.formality)}</select></div>
  </div>
  <div class="row2">
    <div class="field"><label>Estado</label><select id="f_cond">${optSel(CONDS,p.cond||'Como nuevo')}</select></div>
    <div class="field"><label>Tienda</label><input id="f_store" value="${esc(p.store)}" placeholder="Ecoalf.com"/></div>
  </div>`;
}
function readForm(scope){
  const q = id => { const e=scope.querySelector('#'+id); return e?e.value.trim():''; };
  const color=q('f_color');
  return {brand:q('f_brand'),name:q('f_name')||'Prenda',cat:q('f_cat'),fit:q('f_fit'),color,colors:[color],material:q('f_mat'),size:q('f_size'),price:parseFloat(q('f_price'))||0,season:q('f_season'),formality:q('f_form'),cond:q('f_cond'),store:q('f_store')};
}

/* ═══════════════════════════════════════════
   RECONOCIMIENTO IA (pipeline mejorado)
═══════════════════════════════════════════ */
async function imageToBase64(file,maxDim=1400){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{
      URL.revokeObjectURL(url);
      const sc=Math.min(1,maxDim/Math.max(im.width,im.height));
      const w=Math.round(im.width*sc),h=Math.round(im.height*sc);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(im,0,0,w,h);
      const dataUrl=c.toDataURL('image/jpeg',0.88);
      res({media_type:'image/jpeg',data:dataUrl.split(',')[1],dataUrl,w,h});
    };
    im.onerror=rej; im.src=url;
  });
}

async function callAI(system,user,image=null){
  try{
    const body={system,user};
    if(image)body.image={media_type:image.media_type,data:image.data};
    const r=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)return null;
    const d=await r.json();
    const text=(d.text||'').replace(/```json\s*/gi,'').replace(/```/g,'').trim();
    return JSON.parse(text);
  }catch(e){ return null; }
}

// Sistema de prompt especializado en moda con pipeline de validación
const VISION_SYSTEM = `Eres un experto en moda y catalogador profesional de prendas.
Tu tarea es analizar la imagen y extraer información con máxima precisión.

REGLAS CRÍTICAS:
1. Nunca inventes información. Si no puedes determinarlo con seguridad, baja la confianza.
2. Para 'cat' usa EXACTAMENTE uno de estos valores: ${CATS_DETAIL.join(', ')}.
3. Una chaqueta NUNCA es una camiseta. Un zapato NUNCA es un pantalón. Sé preciso.
4. Para 'brand': detecta logotipos, bordados, etiquetas visibles. Si no ves marca, devuelve "" con confianza 0.
5. Para 'fit': ${FITS.join(', ')}.
6. Confianza es 0.0–1.0. Menos de 0.75 = campo incierto, el usuario lo revisará.
7. Responde SOLO con JSON válido, sin markdown ni comentarios.

Formato de respuesta:
{
  "detected": true,
  "garment_count": 1,
  "cat": "string",
  "brand": "string",
  "name": "string",
  "fit": "string",
  "color": "string",
  "colors": ["string"],
  "material": "string",
  "season": "string",
  "formality": "string",
  "style_notes": "string",
  "confidence": {
    "cat": 0.0,
    "brand": 0.0,
    "name": 0.0,
    "fit": 0.0,
    "color": 0.0,
    "material": 0.0
  }
}`;

const TICKET_SYSTEM = `Eres un sistema OCR especializado en tickets de tiendas de moda.
Extrae toda la información visible con máxima precisión.
REGLAS: No inventes. Si un dato no se ve claramente, baja la confianza.
Responde SOLO con JSON válido:
{
  "store": "string",
  "date": "string",
  "time": "string",
  "total": 0.0,
  "tax": 0.0,
  "payment": "string",
  "ticket_num": "string",
  "items": [
    {
      "name": "string",
      "brand": "string",
      "sku": "string",
      "price": 0.0,
      "discount": 0.0,
      "cat": "string",
      "confidence": 0.0
    }
  ]
}`;

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */
let route='armario', wardMode='3d', gridFilter='Todo', fichaId=null;
const app = document.getElementById('app');
const TABS = [
  {k:'armario',i:'shirt',l:'Armario'},
  {k:'estilista',i:'spark',l:'Estilista'},
  {k:'add',i:'add',l:''},
  {k:'insights',i:'chart',l:'Insights'},
  {k:'perfil',i:'user',l:'Perfil'}
];

function go(r){ if(r!==route)unmountWardrobe3D(); route=r; render(); window.scrollTo(0,0); }
function render(){
  app.innerHTML = `<div class="shell">
    <div class="top"><div class="word">Dro<b>be</b></div><button class="ico">${svg('bell',19)}</button></div>
    <main id="main" class="fade"></main>
    <div class="nav"><div class="nav-in">
      ${TABS.map(t=>{const on=route===t.k,add=t.k==='add';
        return `<button data-t="${t.k}" class="${on?'on':''}">${add?`<span class="add">${svg('add',22,2)}</span>`:svg(t.i,21)+`<span class="lbl">${t.l}</span>`}</button>`;}).join('')}
    </div></div></div>`;
  const m=document.getElementById('main');
  ({armario:vArmario,estilista:vEstilista,add:vAdd,insights:vInsights,perfil:vPerfil}[route]||vArmario)(m);
  app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>go(b.dataset.t));
  if(fichaId)renderFicha();
}

/* ═══════════════════════════════════════════
   ARMARIO
═══════════════════════════════════════════ */
function vArmario(m){
  m.innerHTML = `<div class="reveal">
    <div class="eyebrow">Tu vestidor</div>
    <div class="title">Armario <span class="muted">· ${store.garments.length}</span></div></div>
    <div style="margin-top:14px" class="reveal">
      <div class="viewseg">
        ${['3d','grid'].map(x=>`<button data-mode="${x}" class="${wardMode===x?'on':''}">${x==='3d'?'Vestidor 3D':'Cuadrícula'}</button>`).join('')}
      </div></div>
    <div id="ward"></div>`;
  m.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ if(wardMode!==b.dataset.mode){unmountWardrobe3D();wardMode=b.dataset.mode;vArmario(m);} });
  const ward=m.querySelector('#ward');
  if(wardMode==='3d'){
    ward.innerHTML=`<div class="stage3d" id="stage"><div class="hint">Desliza para pasar · toca el centro para abrir</div></div><div class="wardcap" id="wardcap"></div>`;
    try{
      mountWardrobe3D(ward.querySelector('#stage'), store.garments, {
        onSelect: it=>openFicha(it.id),
        onFocus: it=>{ const c=document.getElementById('wardcap'); if(c)c.innerHTML=`<div class="wc-b">${it.brand}</div><div class="wc-n">${it.name}</div>`; }
      });
    }catch(e){ ward.innerHTML=`<div class="empty" style="padding-top:120px">Tu dispositivo no soporta 3D.</div>`; }
  } else {
    const cats=['Todo','En venta',...new Set(store.garments.map(g=>g.catGroup||g.cat))];
    const list=store.garments.filter(g=>gridFilter==='Todo'?true:gridFilter==='En venta'?g.status==='venta':(g.catGroup||g.cat)===gridFilter);
    ward.innerHTML=`<div class="chips" style="margin-top:14px">${cats.map(c=>`<button class="chip ${gridFilter===c?'on':''}" data-f="${c}">${c}</button>`).join('')}</div>
      <div class="grid">${list.map((g,i)=>`<div class="gcard reveal" data-g="${g.id}" style="animation-delay:${i*0.04}s">
        <div class="ph"><img src="${g.img||''}"/>${g.status==='venta'?'<span class="tag sale">En venta</span>':''}</div>
        <div class="cap"><div class="b">${g.brand}</div><div class="n">${g.name}</div><div class="m">${g.cat} · ${g.color}</div></div></div>`).join('')}</div>`;
    ward.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{gridFilter=b.dataset.f;vArmario(m);});
    ward.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>openFicha(b.dataset.g));
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
      <button class="ficha-close" id="fclose">${svg('back',20)}</button>
      <button class="ficha-edit" id="fedit">${svg('pen',18)}</button>
      <div class="track" id="track">${photos.map(p=>`<img src="${p}"/>`).join('')}</div>
      ${photos.length>1?`<div class="ficha-dots">${photos.map((_,i)=>`<i class="${i===0?'on':''}"></i>`).join('')}</div>`:''}
    </div>
    <div class="ficha-body">
      <div class="ficha-b">${g.brand}</div>
      <div class="ficha-n">${g.name}</div>
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
      <div class="compat">${compatList(g).map(c=>`<div class="it" data-c="${c.g.id}"><div class="ph"><img src="${c.g.img||''}"/></div><div class="pct">${c.pct}%</div></div>`).join('')}</div>
      <div class="shead"><h2>Documentación</h2></div>
      ${g.docs&&g.docs.length?g.docs.map(d=>`<div class="docrow"><span class="dico">${svg(d.icon||'file',20)}</span><div><div class="dn">${d.type}</div><div class="dt">${d.name} · ${d.dt}</div></div><span class="open">${svg('chev',18)}</span></div>`).join(''):'<div class="sub" style="margin:-2px 0 10px">Sin documentos. Añade el ticket o la garantía.</div>'}
      <label class="docadd" for="docfile">${svg('add',18)} Añadir ticket, factura o garantía</label>
      <input id="docfile" type="file" accept="image/*,application/pdf" hidden/>
      <div style="height:14px"></div>
      <button class="btn ${onSale?'ghost':'dark'}" id="sale" style="margin-bottom:10px">${svg('tag',18)} ${onSale?'Quitar de la venta':'Poner en venta · sugerido '+Math.round(g.price*0.4)+' €'}</button>
      <button class="btn ghost" id="wear">${svg('check',18)} Marcar como usada hoy</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#fclose').onclick=closeFicha;
  el.querySelector('#fedit').onclick=()=>editGarment(g);
  const track=el.querySelector('#track'), dots=el.querySelectorAll('.ficha-dots i');
  if(track&&dots.length)track.onscroll=()=>{ const i=Math.round(track.scrollLeft/track.clientWidth); dots.forEach((d,j)=>d.className=j===i?'on':''); };
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openFicha(b.dataset.c));
  el.querySelector('#sale').onclick=()=>{ g.status=onSale?'uso':'venta'; save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
  el.querySelector('#wear').onclick=()=>{ g.worn++; g.lastWorn='Hoy'; save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
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

/* ═══════════════════════════════════════════
   AÑADIR / RECONOCIMIENTO IA
═══════════════════════════════════════════ */
let addMode='choose';
function vAdd(m){
  if(addMode!=='choose'){return;}
  m.innerHTML=`
    <div class="reveal"><div class="eyebrow">Añadir</div>
    <div class="title">Tu armario,<br>sin escribir nada</div>
    <div class="sub">Una foto o el ticket. Pipeline de IA especializado en moda: detecta tipo, marca, corte, tejido y confianza por campo. Nunca inventa.</div></div>
    <div style="margin-top:24px">
      <label class="opt reveal" for="pf" style="animation-delay:.05s">
        <span class="ring">${svg('cam',24)}</span>
        <div><div class="t1">Fotografiar prenda</div><div class="t2">Reconocimiento especializado en moda</div></div>
        <span class="arr">${svg('chev',20)}</span></label>
      <input id="pf" type="file" accept="image/*" capture="environment" hidden/>
      <label class="opt alt reveal" for="tf" style="animation-delay:.1s">
        <span class="ring">${svg('scan',24)}</span>
        <div><div class="t1">Escanear ticket</div><div class="t2">OCR · varias prendas · ticket vinculado</div></div>
        <span class="arr">${svg('chev',20)}</span></label>
      <input id="tf" type="file" accept="image/*" capture="environment" hidden/>
      <button class="opt alt reveal" id="manual" style="animation-delay:.15s">
        <span class="ring" style="background:var(--accent-soft);color:var(--accent)">${svg('pen',24)}</span>
        <div><div class="t1">Añadir manualmente</div><div class="t2">Rellena los datos tú mismo</div></div>
        <span class="arr">${svg('chev',20)}</span></button>
    </div>
    <div class="note reveal" style="margin-top:18px;animation-delay:.2s">${svg('spark',18)}<span>La IA nunca inventa: si la confianza es baja, te lo dice y tú corriges. Cada corrección mejora el sistema.</span></div>`;
  m.querySelector('#pf').addEventListener('change',e=>handleScan(m,e,'prenda'));
  m.querySelector('#tf').addEventListener('change',e=>handleScan(m,e,'ticket'));
  m.querySelector('#manual').onclick=()=>showPrenda(m,null,null);
}

function handleScan(m,e,kind){
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  imageToBase64(f).then(img=>runPipeline(m,img,kind));
}

async function runPipeline(m,img,kind){
  const steps = kind==='ticket'
    ? ['Procesando imagen…','Corrigiendo perspectiva…','Leyendo ticket…','Extrayendo prendas…']
    : ['Detectando prenda…','Clasificando tipo exacto…','Identificando marca y corte…','Calculando confianza…'];

  m.innerHTML=`
    <div class="backbar"><button id="b" style="color:var(--ink)">${svg('back',20)}</button><span class="t">${kind==='ticket'?'Leyendo ticket':'Reconociendo prenda'}</span></div>
    <div id="stage">
      <div class="skel preview"><img src="${img.dataUrl}"/><div class="shimmer"></div></div>
      <div class="pipe-steps" id="psteps">${steps.map((s,i)=>`<div class="pstep" id="ps${i}">${svg('load',14)} ${s}</div>`).join('')}</div>
    </div>`;
  m.querySelector('#b').onclick=()=>{addMode='choose';vAdd(m);};

  // Animar pasos
  let si=0;
  const iv=setInterval(()=>{ const el=m.querySelector(`#ps${si}`); if(el)el.classList.add('done'); si++; },600);

  const result = await callAI(
    kind==='ticket'?TICKET_SYSTEM:VISION_SYSTEM,
    kind==='ticket'?'Extrae todas las prendas de este ticket de compra.':'Analiza esta prenda con máxima precisión.',
    img
  );
  clearInterval(iv);
  steps.forEach((_,i)=>{ const el=m.querySelector(`#ps${i}`); if(el)el.classList.add('done'); });

  await new Promise(r=>setTimeout(r,300));
  if(kind==='ticket') showTicket(m,result,img);
  else showPrenda(m,result,img);
}

function showPrenda(m,r,img){
  const failed=!r||!r.detected;
  const c=r?.confidence||{};
  const hasLow=Object.values(c).some(v=>v<0.75);
  const stage=m?.querySelector?.('#stage')||m;

  stage.innerHTML=`
    ${failed
      ?`<div class="note warn" style="margin-bottom:14px">${svg('spark',18)}<span>No pude analizar la foto automáticamente — revisa que ANTHROPIC_API_KEY está configurada en Vercel. Rellena a mano, nunca invento.</span></div>`
      : hasLow
        ?`<div class="note warn" style="margin-bottom:14px">${svg('spark',18)}<span>Datos con confianza baja marcados en naranja. Revisa y corrige antes de guardar.</span></div>`
        :`<div class="note" style="margin-bottom:14px">${svg('check',18)}<span>Prenda catalogada. Todos los datos con alta confianza. Edita lo que necesites.</span></div>`}
    ${img?`<div class="scanimg"><img src="${img.dataUrl}"/></div>`:''}
    ${garmentFormHTML(r||{},c)}
    <button class="btn dark" id="conf" style="margin-top:6px">${svg('add',18,2)} Añadir al armario</button>`;

  stage.querySelector('#conf').onclick=()=>{
    const d=readForm(stage);
    addGarment({...d,catGroup:catToGroup(d.cat),bought:'Hoy',worn:0,lastWorn:'—',status:'uso',img:img?.dataUrl||'./assets/silbon-raquetas-white.png',photos:[],docs:[],tags:[]});
    addMode='choose'; go('armario');
  };
}

function showTicket(m,r,img){
  if(!r||!r.items?.length)r={store:'Tienda',date:'Hoy',items:[{name:'Prenda detectada',brand:'',price:0,cat:'Camiseta manga corta',confidence:.5}]};
  const doc={type:'Ticket',icon:'receipt',name:`Ticket ${r.store||''}.jpg`,dt:r.date||'Hoy',url:img.dataUrl};
  const stage=m.querySelector('#stage');
  stage.innerHTML=`
    <div class="note" style="margin-bottom:14px">${svg('receipt',18)}<span><b>${r.store||'Ticket'}</b>${r.date?' · '+r.date:''} · ${r.items.length} prenda(s) · ${r.total?r.total+'€':''}. Todas quedan enlazadas al ticket original.</span></div>
    ${r.items.map((it,i)=>{const low=(it.confidence||1)<0.75;return `<div class="conf${low?' low':''}" style="animation-delay:${i*0.07}s">
      <span class="k">${it.brand||'Prenda'}</span>
      <span class="vv">${it.name} · ${it.price||0} €</span>
      ${stars(it.confidence||0.5)} ${confBadge(it.confidence||0.5)}</div>`;}).join('')}
    <button class="btn dark" id="conf" style="margin-top:14px">${svg('add',18,2)} Añadir ${r.items.length} al armario</button>`;
  stage.querySelector('#conf').onclick=()=>{
    r.items.forEach(it=>addGarment({brand:it.brand||'—',name:it.name,cat:it.cat||'Camiseta manga corta',catGroup:catToGroup(it.cat),fit:'Regular Fit',color:'—',colors:['—'],material:'',size:'',season:'Todo el año',formality:'Casual',bought:r.date||'Hoy',store:r.store||'',price:it.price||0,cond:'Nuevo con etiqueta',worn:0,lastWorn:'—',status:'uso',img:'./assets/silbon-raquetas-white.png',photos:[],docs:[{...doc}],tags:[]}));
    addMode='choose'; go('armario');
  };
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
   MALETA PREMIUM (clima real + IA)
═══════════════════════════════════════════ */
let trip={dest:'',lat:null,lon:null,dateFrom:null,dateTo:null,days:3,plan:'Ciudad',acts:[],weatherData:null};

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
      <div class="sub" style="margin-bottom:20px">Drobe consultará el tiempo real y preparará tu maleta solo con lo que tienes.</div>
      <div class="field"><label>Destino</label>
        <input id="dest" value="${esc(trip.dest)}" placeholder="París, Lisboa, Tokio…" autocomplete="off"/>
        <div id="sugg" class="dest-sugg"></div></div>
      <div class="shead" style="margin-top:8px"><h2>Duración</h2></div>
      <div class="row2">
        <div class="stat" style="cursor:pointer" id="d_from"><div class="l">Salida</div><div class="n" style="font-size:20px" id="t_from">${trip.dateFrom||'—'}</div></div>
        <div class="stat" style="cursor:pointer" id="d_to"><div class="l">Regreso</div><div class="n" style="font-size:20px" id="t_to">${trip.dateTo||'—'}</div></div>
      </div>
      <div id="cal" class="trip-cal"></div>
      <button class="btn dark" id="next1" style="margin-top:20px">${svg('chev',18)} Siguiente</button>
    </div>`;
  el.querySelector('#mb').onclick=()=>el.remove();
  buildCalendar(el);
  el.querySelector('#dest').addEventListener('input',e=>suggestDest(e.target.value,el.querySelector('#sugg'),el));
  el.querySelector('#next1').onclick=()=>{ trip.dest=el.querySelector('#dest').value; if(trip.dest&&trip.days>0)maletaStep2(el); };
}

function buildCalendar(el){
  const cal=el.querySelector('#cal'); if(!cal)return;
  const now=new Date(); const year=now.getFullYear(); const month=now.getMonth();
  const first=new Date(year,month,1).getDay()||7;
  const days=new Date(year,month+1,0).getDate();
  const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  cal.innerHTML=`<div class="cal-head">${months[month]} ${year}</div>
    <div class="cal-grid">
      ${['L','M','X','J','V','S','D'].map(d=>`<div class="cal-day-name">${d}</div>`).join('')}
      ${Array(first-1).fill('<div></div>').join('')}
      ${Array.from({length:days},(_,i)=>{const d=i+1,full=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isFrom=trip.dateFrom===full,isTo=trip.dateTo===full;
        const inRange=trip.dateFrom&&trip.dateTo&&full>trip.dateFrom&&full<trip.dateTo;
        const past=new Date(year,month,d)<now;
        return `<button class="cal-day${isFrom?' from':''}${isTo?' to':''}${inRange?' in':''}" data-date="${full}" ${past?'disabled':''}>${d}</button>`;}).join('')}
    </div>`;
  cal.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{
    const d=b.dataset.date;
    if(!trip.dateFrom||trip.dateTo){trip.dateFrom=d;trip.dateTo=null;}
    else if(d>trip.dateFrom){trip.dateTo=d;}
    else{trip.dateFrom=d;trip.dateTo=null;}
    if(trip.dateFrom&&trip.dateTo){
      const ms=new Date(trip.dateTo)-new Date(trip.dateFrom);
      trip.days=Math.max(1,Math.round(ms/86400000))+1;
    }
    const tf=el.querySelector('#t_from'),tt=el.querySelector('#t_to');
    if(tf)tf.textContent=trip.dateFrom?trip.dateFrom.slice(5):'—';
    if(tt)tt.textContent=trip.dateTo?trip.dateTo.slice(5):'—';
    buildCalendar(el);
  });
}

async function suggestDest(q,sugg,el){
  if(!q||q.length<2){sugg.innerHTML='';return;}
  try{
    const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&accept-language=es`;
    const r=await fetch(url,{headers:{'User-Agent':'Drobe/1.0'}});
    const data=await r.json();
    sugg.innerHTML=data.slice(0,4).map(p=>`<div class="sugg-item" data-lat="${p.lat}" data-lon="${p.lon}" data-name="${esc(p.display_name.split(',').slice(0,2).join(', '))}">${p.display_name.split(',').slice(0,2).join(', ')}</div>`).join('');
    sugg.querySelectorAll('.sugg-item').forEach(item=>item.onclick=()=>{
      trip.lat=parseFloat(item.dataset.lat);trip.lon=parseFloat(item.dataset.lon);
      const dest=item.dataset.name; trip.dest=dest;
      el.querySelector('#dest').value=dest; sugg.innerHTML='';
    });
  }catch(e){sugg.innerHTML='';}
}

async function maletaStep2(el){
  el.querySelector('#next1').disabled=true; el.querySelector('#next1').innerHTML=svg('load',18)+' Consultando el tiempo…'; el.querySelector('#next1').querySelector('svg').classList.add('spin');
  let wx=null;
  if(trip.lat&&trip.lon){
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${trip.lat}&longitude=${trip.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&forecast_days=14`;
      const r=await fetch(url); wx=await r.json();
      trip.weatherData=wx;
    }catch(e){wx=null;}
  }

  const tMax=wx?.daily?.temperature_2m_max?.[0]??null;
  const tMin=wx?.daily?.temperature_2m_min?.[0]??null;
  const rainDays=wx?.daily?.precipitation_probability_max?.filter(p=>p>50).length??0;
  const tAvg=tMax!=null&&tMin!=null?Math.round((tMax+tMin)/2):null;
  const wxSummary=buildWxSummary(trip.dest,tMin,tMax,rainDays);
  trip.tAvg=tAvg; trip.rainDays=rainDays;

  el.innerHTML=`
    <div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
      <div class="backbar"><button id="mb2">${svg('back',20)}</button><span class="t">El tiempo</span></div>
      ${tAvg!=null?`<div class="wx-card">
        <div class="wx-top">${svg('sun',28)} <div><div class="wx-t">${trip.dest}</div><div class="wx-s">${tMin}°–${tMax}°C · ${rainDays} día(s) de lluvia</div></div></div>
        <div class="wx-desc">${wxSummary}</div></div>`
      :`<div class="note warn">${svg('sun',18)}<span>No pude obtener el tiempo para este destino. Selecciona manualmente.</span></div>`}
      ${tAvg==null?`<div class="row2" style="margin:12px 0">${['Calor','Templado','Frío','Lluvia'].map(w=>`<button class="chip${trip.wxManual===w?' on':''}" data-wx="${w}" style="justify-content:center">${w}</button>`).join('')}</div>`:' '}
      <div class="shead"><h2>Motivo del viaje</h2></div>
      <div class="chips">${TRIP_PLANS.map(p=>`<button class="chip${trip.plan===p?' on':''}" data-plan="${p}">${p}</button>`).join('')}</div>
      <div class="shead"><h2>Actividades</h2></div>
      <div class="chips" style="flex-wrap:wrap">${TRIP_ACTS.map(a=>`<button class="chip${trip.acts.includes(a)?' on':''}" data-act="${a}">${a}</button>`).join('')}</div>
      <button class="btn dark" id="next2" style="margin-top:20px">${svg('pack',18)} Preparar maleta</button>
    </div>`;
  el.querySelector('#mb2').onclick=()=>maletaStep1(el);
  el.querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>{trip.wxManual=b.dataset.wx;el.querySelectorAll('[data-wx]').forEach(x=>x.className='chip'+(x.dataset.wx===trip.wxManual?' on':''));});
  el.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{trip.plan=b.dataset.plan;el.querySelectorAll('[data-plan]').forEach(x=>x.className='chip'+(x.dataset.plan===trip.plan?' on':''));});
  el.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{const a=b.dataset.act;const i=trip.acts.indexOf(a);if(i>=0)trip.acts.splice(i,1);else trip.acts.push(a);b.className='chip'+(trip.acts.includes(a)?' on':'');});
  el.querySelector('#next2').onclick=()=>maletaPackPremium(el);
}

function buildWxSummary(dest,tMin,tMax,rainDays){
  if(tMin==null)return 'Tiempo desconocido.';
  const avg=Math.round((tMin+tMax)/2);
  let s=`Durante tu viaje a ${dest} las temperaturas estarán entre ${tMin}° y ${tMax}°C.`;
  if(rainDays>2)s+=` Se esperan lluvias ${rainDays} días — incluye impermeable o chaqueta técnica.`;
  else if(rainDays>0)s+=` Alguna lluvia puntual, mejor llevar algo de abrigo ligero.`;
  if(avg>26)s+=` Hará bastante calor: prioriza tejidos ligeros y transpirables.`;
  else if(avg<10)s+=` Frío considerable: necesitarás capas y ropa de abrigo.`;
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

  // Animar entrada de prendas
  const body=wrap.querySelector('#casebody');
  await new Promise(r=>setTimeout(r,300));
  body.innerHTML='';
  for(let i=0;i<plan.sel.length;i++){
    const g=plan.sel[i];
    await new Promise(r=>setTimeout(r,90));
    const tile=document.createElement('div'); tile.className='packtile';
    tile.style.animationDelay=`${i*0.08}s`;
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
  if(trip.acts.includes('Boda')&&!store.garments.some(g=>/formal|blazer|americana/i.test(g.cat+g.formality)))missing.push('No tienes ropa formal para la boda.');

  const sum=wrap.querySelector('#tripsum');
  sum.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:18px">
      <div class="stat"><div class="n">${looks}</div><div class="l">Looks</div></div>
      <div class="stat"><div class="n">${plan.sel.length}</div><div class="l">Prendas</div></div>
      <div class="stat"><div class="n">${weight.toFixed(1)} kg</div><div class="l">Peso est.</div></div>
    </div>
    ${trip.weatherData?`<div class="wx-card" style="margin-top:14px"><div class="wx-top">${svg('sun',20)}<div><div class="wx-t">${trip.dest}</div><div class="wx-s">${trip.tAvg!=null?trip.tAvg+'°C avg':''} · ${trip.rainDays} día(s) lluvia</div></div></div></div>`:''}
    ${must.length?`<div class="shead"><h2>Imprescindibles</h2></div>${must.map(g=>`<div class="chk"><span class="ic">${svg('check',16)}</span><span><b>${g.brand}</b> ${g.name}</span></div>`).join('')}`:''}
    ${missing.length?`<div class="shead"><h2>Ten en cuenta</h2></div>${missing.map(x=>`<div class="chk warn"><span class="ic">${svg('spark',16)}</span><span>${x}</span></div>`).join('')}`:''}
    <button class="btn ghost" id="redo" style="margin-top:14px">Nueva maleta</button>`;
  sum.style.opacity='1';
  sum.querySelector('#redo').onclick=()=>maletaStep1(el);
}

function buildMaletaPlan(){
  const days=trip.days, tAvg=trip.tAvg??18, rainDays=trip.rainDays??0;
  const cold=tAvg<14||rainDays>2;
  const pool=store.garments.filter(g=>g.status!=='venta');
  const isTop=g=>/camiseta|polo|top|camisa/i.test(g.cat);
  const isLayer=g=>/jersey|sudadera|hoodie|blazer|bomber|chaqueta|abrigo|parka|gabardina|plum|cort/i.test(g.cat);
  const isBottom=g=>/pantalón|vaquero|chino|cargo|jogger|wide|straight|slim|short|bermuda|falda/i.test(g.cat);
  const isShoe=g=>/sneak|bamba|running|bota|botín|sandal|chanc|tacón|oxford|mocasín|zapatill/i.test(g.cat);
  const score=g=>{ let s=g.worn||0; if(NEUTRAL_COLORS.includes(g.color))s+=8; const seasonOk=g.season==='Todo el año'||(cold?g.season==='Otoño/Invierno':g.season==='Primavera/Verano'); if(seasonOk)s+=10; if(trip.acts.includes('Deporte')&&g.formality==='Deporte')s+=6; if(trip.plan==='Boda'&&g.formality==='Formal')s+=12; return s; };
  const take=(arr,n)=>arr.slice().sort((a,b)=>score(b)-score(a)).slice(0,Math.max(0,n));
  const nTops=Math.max(2,Math.ceil(days*0.9)), nBottoms=Math.max(1,Math.ceil(days/3)+1), nLayers=cold?2:1, nShoes=days>5?2:1;
  const tops=take(pool.filter(isTop),nTops), layers=take(pool.filter(isLayer),nLayers), bottoms=take(pool.filter(isBottom),nBottoms), shoes=take(pool.filter(isShoe),nShoes);
  const seen={}, sel=[];
  [...tops,...layers,...bottoms,...shoes].forEach(g=>{ if(!seen[g.id]){seen[g.id]=1;sel.push(g);} });
  return {sel,tops,layers,bottoms,shoes};
}

/* ═══════════════════════════════════════════
   ESTILISTA
═══════════════════════════════════════════ */
let stylistMsg=null;
const WEATHER={temp:17,label:'Nublado',city:'Barcelona'};
function pickOutfit(){
  const t=WEATHER.temp;
  const top=t<15?store.garments.find(g=>g.catGroup==='Jerséis/Sudaderas'&&g.status==='uso'):store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso');
  const s=store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso'&&g!==top);
  return [top,s].filter(Boolean);
}
function vEstilista(m){
  const intents=[['hoy','¿Qué me pongo hoy?'],['viaje','Preparar viaje'],['muerta','¿Qué no uso?'],['vender','¿Qué vendo?'],['combina','¿Qué combina?']];
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Estilista</div>
    <div class="title">Tu asesor<br>de imagen</div>
    <div class="sub">Decisiones sobre la ropa que ya tienes. Nunca sobre la que no.</div></div>
    <div class="intent reveal" style="animation-delay:.05s">${intents.map(x=>`<button data-i="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div id="adv">${advisorCard(stylistMsg||defaultAdvice())}</div>`;
  m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{
    if(b.dataset.i==='viaje'){openMaleta();return;}
    const a=document.getElementById('adv'); a.style.opacity='0';
    setTimeout(()=>{stylistMsg=advice(b.dataset.i);a.innerHTML=advisorCard(stylistMsg);a.style.transition='opacity .4s var(--ease)';a.style.opacity='1';bindOutfit(a);},170);
  });
  bindOutfit(document.getElementById('adv'));
}
const bindOutfit=scope=>scope.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>openFicha(b.dataset.o));
const defaultAdvice=()=>({say:`Con ${WEATHER.temp}° y ${WEATHER.label.toLowerCase()} en ${WEATHER.city}, algodón limpio en neutros. Va contigo y con el día.`,items:pickOutfit()});
function advice(k){
  const uso=store.garments.filter(g=>g.status==='uso');
  if(k==='muerta'){const d=store.garments.slice().sort((a,b)=>a.worn-b.worn).slice(0,3);return {say:'Estas apenas las tocas. O las rescatas esta semana, o las pones en venta antes de que pierdan valor.',items:d};}
  if(k==='vender'){const s=store.garments.filter(g=>g.worn<8).sort((a,b)=>cpw(b)-cpw(a)).slice(0,3);return {say:'Por coste por uso y poco uso, estas son las candidatas a vender. Recuperas valor sin tocar lo que usas a diario.',items:s};}
  if(k==='combina'){const si=store.garments.find(g=>g.brand==='Stone Island');return {say:'El Compass negro pide algo claro y liso debajo: tu camiseta blanca juega perfecto. Contraste limpio, sin logos peleándose.',items:[si,store.garments.find(g=>g.color==='Blanco')].filter(Boolean)};}
  return defaultAdvice();
}
const advisorCard=a=>`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Estilista Drobe<span>Solo con tu armario</span></div></div><div class="say">${a.say}</div><div class="outfit">${a.items.map(g=>`<div class="it" data-o="${g.id}"><div class="ph"><img src="${g.img||''}"/></div><div class="l">${g.brand}</div></div>`).join('')}</div></div>`;

/* ═══════════════════════════════════════════
   INSIGHTS
═══════════════════════════════════════════ */
function vInsights(m){
  const total=store.garments.reduce((s,g)=>s+g.price,0);
  const dead=store.garments.filter(g=>g.worn<=6);
  const byC={}; store.garments.forEach(g=>{if(g.color)byC[g.color]=(byC[g.color]||0)+1;});
  const ce=Object.entries(byC).sort((a,b)=>b[1]-a[1]);
  const cm={'Blanco':'#E7E3DA','Gris':'#AEB4BA','Negro':'#1F2126','Crudo':'#E9DFC9','Marino':'#2B3A5B','Mostaza':'#C99A3E','—':'#bbb'};
  const rk=store.garments.slice().sort((a,b)=>cpw(b)-cpw(a));
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Insights</div>
    <div class="title">Tu armario,<br>en datos</div>
    <div class="sub">Lo que amortizas, lo que duerme y de qué color abusas.</div></div>
    <div class="row2 reveal" style="margin-top:18px;animation-delay:.05s">
      <div class="stat"><div class="n">${Math.round(total)} €</div><div class="l">Valor total</div></div>
      <div class="stat"><div class="n">${dead.length}</div><div class="l">Prendas dormidas</div></div>
    </div>
    <div class="shead"><h2>Balance de color</h2></div>
    <div class="reveal" style="animation-delay:.1s">
      <div class="bar">${ce.map(([c,n])=>`<i style="width:${n/store.garments.length*100}%;background:${cm[c]||'#bbb'}"></i>`).join('')}</div>
      <div class="sub" style="margin-top:8px">Dominan ${ce[0]?.[0]?.toLowerCase()||'—'}${ce[1]?' y '+ce[1][0].toLowerCase():''}. Un punto de color daría más combinaciones sin comprar de más.</div>
    </div>
    <div class="shead"><h2>Coste por uso</h2></div>
    <div class="reveal" style="animation-delay:.15s">
      ${rk.map(g=>`<div class="cpw"><div class="ph"><img src="${g.img||''}"/></div>
        <div><div class="nm">${g.brand} · ${g.name}</div><div class="mt">${g.worn} usos</div></div>
        <div class="val"><div class="v" style="color:${cpw(g)>15?'var(--amber)':'var(--eco)'}">${cpw(g).toFixed(2)} €</div><div class="s">por uso</div></div></div>`).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════
   PERFIL
═══════════════════════════════════════════ */
const SWATCH_C={'Blanco':'#E7E3DA','Gris':'#AEB4BA','Negro':'#1F2126','Crudo':'#E9DFC9','Marino':'#2B3A5B','Mostaza':'#C99A3E'};
function modeOf(arr){const m={};let b=null,bc=0;arr.filter(Boolean).forEach(v=>{m[v]=(m[v]||0)+1;if(m[v]>bc){bc=m[v];b=v;}});return b;}
function styleCardHTML(){
  const gs=store.garments; if(!gs.length)return '';
  const byC={}; gs.forEach(g=>{if(g.color)byC[g.color]=(byC[g.color]||0)+1;});
  const tc=Object.keys(byC).sort((a,b)=>byC[b]-byC[a]).slice(0,2);
  const brand=modeOf(gs.map(g=>g.brand));
  const fit=modeOf(gs.map(g=>g.fit));
  const formal=modeOf(gs.map(g=>g.formality));
  const pr=gs.map(g=>g.price).filter(Boolean);
  const avg=pr.length?Math.round(pr.reduce((a,b)=>a+b,0)/pr.length):0;
  const sw=tc.map(c=>`<span class="swatch" style="background:${SWATCH_C[c]||'#bbb'}"></span>${c}`).join('  ');
  return `<div class="advisor reveal" style="animation-delay:.05s;margin-top:0"><div class="eyebrow">Tu estilo, aprendido del armario</div>
    <div class="say" style="margin-top:10px">Colores predominantes: ${sw}. Marca recurrente: <b>${brand||'—'}</b>. Corte preferido: <b>${fit||'—'}</b>, registro <b>${(formal||'').toLowerCase()||'—'}</b>. Gasto medio por prenda: <b>${avg} €</b>.</div></div>`;
}
function sizesCardHTML(){
  const bs=[]; const m={};
  store.garments.forEach(g=>{if(!g.brand||!g.size)return;m[g.brand]=m[g.brand]||{};m[g.brand][g.size]=(m[g.brand][g.size]||0)+1;});
  Object.keys(m).forEach(b=>{const sz=m[b];const best=Object.keys(sz).sort((a,b2)=>sz[b2]-sz[a])[0];bs.push({brand:b,size:best});});
  const p=(store.profile&&store.profile.measures)||{};
  return `<div class="shead"><h2>Tu talla por marca</h2></div>
    ${bs.length?bs.map(x=>`<div class="sizerow"><span class="bn">${x.brand}</span><span class="sz">${x.size}</span></div>`).join(''):'<div class="sub">Añade prendas con talla para que Drobe aprenda.</div>'}
    <div class="shead"><h2>Medidas</h2></div>
    <div class="measure">${[['altura','Altura (cm)'],['peso','Peso (kg)'],['pecho','Pecho (cm)'],['cintura','Cintura (cm)'],['pie','Pie (EU)']].map(f=>`<div class="field" style="margin-bottom:0"><label>${f[1]}</label><input id="ms_${f[0]}" inputmode="numeric" value="${esc(p[f[0]]||'')}"/></div>`).join('')}</div>`;
}
function vPerfil(m){
  m.innerHTML=`<div class="reveal"><div style="display:flex;align-items:center;gap:14px;margin:10px 0 22px">
    <div style="width:60px;height:60px;border-radius:999px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800">P</div>
    <div><div style="font-size:19px;font-weight:700;letter-spacing:-.02em">Pepe Vilar</div>
    <div class="sub" style="margin-top:2px">Barcelona · ${store.garments.length} prendas · ${session?'☁ Sincronizado':'Local'}</div></div></div></div>
    ${styleCardHTML()}
    ${sizesCardHTML()}
    <div id="authslot"></div>
    <div class="shead"><h2>Ajustes</h2></div>
    ${['Cuenta y sincronización','Notificaciones','Privacidad y datos','Acerca de Drobe'].map((t,i)=>`<div class="opt reveal" style="animation-delay:${0.1+i*0.04}s;padding:15px 18px"><div class="t1" style="font-size:15px">${t}</div><span class="arr" style="margin-left:auto">${svg('chev',20)}</span></div>`).join('')}`;
  renderAuth(m.querySelector('#authslot'));
  ['altura','peso','pecho','cintura','pie'].forEach(k=>{const e=m.querySelector(`#ms_${k}`);if(e)e.onchange=()=>{store.profile=store.profile||{};store.profile.measures=store.profile.measures||{};store.profile.measures[k]=e.value;save();};});
}
function renderAuth(slot){
  if(!slot)return;
  if(!cloud.cloudEnabled()){
    slot.innerHTML=`<div class="note" style="margin-top:14px">${svg('user',18)}<span>Rellena <b>SUPABASE_URL</b> y <b>SUPABASE_ANON_KEY</b> en <code>lib/supabase.js</code> para sincronizar entre dispositivos.</span></div>`;
    return;
  }
  if(session){
    slot.innerHTML=`<div class="note" style="margin-top:14px;background:#EAF4EE;color:#2c6e4f">${svg('check',18)}<span>☁ Sincronizado · ${session.user?.email||''} · <button id="logout" style="text-decoration:underline;color:inherit;cursor:pointer">Cerrar sesión</button></span></div>`;
    slot.querySelector('#logout').onclick=()=>cloud.signOut().then(()=>{session=null;render();});
    return;
  }
  slot.innerHTML=`<div style="margin-top:14px">
    <div class="field"><input id="em" type="email" placeholder="tu@email.com"/></div>
    <div class="field"><input id="pw" type="password" placeholder="Contraseña"/></div>
    <div id="amsg"></div>
    <button class="btn dark" id="lg">Entrar / crear cuenta</button></div>`;
  slot.querySelector('#lg').onclick=async function(){
    const em=slot.querySelector('#em').value.trim(), pw=slot.querySelector('#pw').value;
    if(!em||!pw){slot.querySelector('#amsg').innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">Introduce email y contraseña.</div>`;return;}
    this.disabled=true; this.textContent='Conectando…';
    try{
      const s=await cloud.signInOrUp(em,pw);
      if(s){session=s; await syncFromCloud(); render();}
      else{slot.querySelector('#amsg').innerHTML=`<div class="sub" style="margin-bottom:8px">Revisa tu email para confirmar la cuenta.</div>`;render();}
    }catch(e){slot.querySelector('#amsg').innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">${e?.message||'No se pudo iniciar sesión.'}</div>`;render();}
  };
}

/* ═══════════════════════════════════════════
   CLOUD + ARRANQUE
═══════════════════════════════════════════ */
render();
initCloud();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

async function initCloud(){
  if(!cloud.cloudEnabled())return;
  try{
    session=await cloud.getSession();
    cloud.onAuth(async ns=>{session=ns; await syncFromCloud(); render();});
    if(session)await syncFromCloud();
    render();
  }catch(e){}
}
async function syncFromCloud(){
  if(!session)return;
  let rows=await cloud.pullGarments();
  if(rows&&rows.length===0&&store.garments.length){
    for(const g of store.garments)await cloud.pushGarment(g,true);
    rows=await cloud.pullGarments();
  }
  if(rows){
    store.garments=rows.map(r=>{
      const g=cloud.fromRow(r);
      g.catGroup=g.catGroup||catToGroup(g.cat||'');
      g.fit=g.fit||'Regular Fit';
      g.colors=g.colors||[g.color];
      g.docs=g.docs||[];g.photos=g.photos||[];
      return g;
    });
    save();
  }
}

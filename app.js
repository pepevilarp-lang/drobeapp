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
  pack:'M3 3h18l-2 14H5zM3 3L1 1M8 21h8M12 12V6M9 9l3-3 3 3',
  store:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  dna:'M12 3c-4 6-4 12 0 18M12 3c4 6 4 12 0 18M6 6h12M6 18h12M5 10h14M5 14h14',
  score:'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z',
  target:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  lock:'M5 11V7a7 7 0 0114 0v4M3 11h18v10H3z',
  gift:'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7a5 2.5 0 010-5 5 2.5 0 010 5zM12 7a5 2.5 0 000-5 5 2.5 0 000 5',
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
  try{ const r=localStorage.getItem(KEY); if(r){const s=JSON.parse(r);if(s.garments){s.profile=s.profile||{};return s;}} }catch(e){}
  return {garments:JSON.parse(JSON.stringify(SEED)),profile:{}};
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){} }
const findG = id => store.garments.find(g=>g.id==id);
function addGarment(g){ g.id=g.id||('g'+Date.now()+Math.random().toString(36).slice(2,6)); store.garments.unshift(g); save(); if(session)cloud.pushGarment(g); }
const cpw = g => g.price/Math.max(g.worn,1);

/* ═══════════════════════════════════════════
   ADN DE ESTILO (motor B2B)
   Calcula el perfil completo del usuario a partir de su armario real.
   Este objeto es el activo que las marcas pagan por conocer.
═══════════════════════════════════════════ */
function computeStyleDNA(){
  const gs = store.garments.filter(g=>g.status!=='venta');
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
function trackScanEvent(data){
  if(!store.profile?.consent_data_b2b) return;
  const events=JSON.parse(localStorage.getItem('drobe.scan_events')||'[]');
  events.push({...data, ts: new Date().toISOString()});
  localStorage.setItem('drobe.scan_events', JSON.stringify(events.slice(-100)));
  if(session) cloud.trackEvent('scan', data).catch(()=>{});
}
function trackPurchaseEvent(data){
  if(!store.profile?.consent_data_b2b) return;
  if(session) cloud.trackEvent('purchase', data).catch(()=>{});
}

/* ═══════════════════════════════════════════
   HELPERS UI
═══════════════════════════════════════════ */
const esc = s => (s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
function stars(c,total=5){ const n=Math.round((c||0)*total); return `<span class="stars">${Array.from({length:total},(_,i)=>`<span class="${i<n?'on':'off'}">★</span>`).join('')}</span>`; }
function confBadge(c){ const p=Math.round((c||0)*100); return `<span class="cbadge ${p<60?'low':p<85?'med':'hi'}">${p}%</span>`; }
function optSel(opts,val){ return (val&&!opts.includes(val)?`<option selected>${val}</option>`:'')+opts.map(o=>`<option${o===val?' selected':''}>${o}</option>`).join(''); }

/* ═══════════════════════════════════════════
   FORMULARIO PRENDA
═══════════════════════════════════════════ */
function garmentFormHTML(p={},c={}){
  return `
  <div class="field"><label>Marca ${c.brand!=null?confBadge(c.brand):''}</label><input id="f_brand" value="${esc(p.brand)}" placeholder="Nike, Zara, Stone Island…"/></div>
  <div class="field"><label>Nombre / modelo ${c.name!=null?confBadge(c.name):''}</label><input id="f_name" value="${esc(p.name)}" placeholder="Parka técnica negra"/></div>
  <div class="row2">
    <div class="field"><label>Tipo ${c.cat!=null?confBadge(c.cat):''}</label><select id="f_cat">${optSel(CATS_DETAIL,p.cat||p.category)}</select></div>
    <div class="field"><label>Corte ${c.fit!=null?confBadge(c.fit):''}</label><select id="f_fit">${optSel(FITS,p.fit)}</select></div>
  </div>
  <div class="row2">
    <div class="field"><label>Color ${c.color!=null?confBadge(c.color):''}</label><input id="f_color" value="${esc((p.colors&&p.colors[0])||p.color)}" placeholder="Verde oliva"/></div>
    <div class="field"><label>Material ${c.material!=null?confBadge(c.material):''}</label><input id="f_mat" value="${esc(p.material)}" placeholder="Poliéster reciclado"/></div>
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
  const q=id=>{ const e=scope.querySelector('#'+id); return e?e.value.trim():''; };
  const color=q('f_color');
  return {brand:q('f_brand'),name:q('f_name')||'Prenda',cat:q('f_cat'),fit:q('f_fit'),color,colors:[color],material:q('f_mat'),size:q('f_size'),price:parseFloat(q('f_price'))||0,season:q('f_season'),formality:q('f_form'),cond:q('f_cond'),store:q('f_store')};
}

/* ═══════════════════════════════════════════
   IA — RECONOCIMIENTO
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
const VISION_SYSTEM=`Eres un experto en moda y catalogador profesional de prendas.
REGLAS CRÍTICAS:
1. Nunca inventes. Si no puedes determinarlo con seguridad, baja la confianza.
2. Para 'cat' usa EXACTAMENTE uno de: ${CATS_DETAIL.join(', ')}.
3. Una chaqueta NUNCA es una camiseta. Un zapato NUNCA es un pantalón.
4. Para 'brand': detecta logotipos, bordados, etiquetas visibles. Si no ves marca, devuelve "" con confianza 0.
5. Confianza 0.0–1.0. Menos de 0.75 = campo incierto.
6. Responde SOLO JSON válido.
{"detected":true,"garment_count":1,"cat":"","brand":"","name":"","fit":"","color":"","colors":[],"material":"","season":"","formality":"","confidence":{"cat":0,"brand":0,"name":0,"fit":0,"color":0,"material":0}}`;

const TICKET_SYSTEM=`Eres un sistema OCR especializado en tickets de tiendas de moda.
REGLAS:
- No inventes. Si un dato no se ve claramente, baja la confianza.
- "cat" DEBE estar en español y ser uno de: ${CATS_DETAIL.join(', ')}. Traduce: T-SHIRT→Camiseta manga corta, PANTS→Pantalón vestir, JEANS→Vaquero, SHIRT→Camisa Oxford, SWEATER→Jersey, HOODIE→Hoodie, JACKET→Bomber, COAT→Abrigo, SHOES→Sneakers.
- "sku" es el número de referencia/artículo si aparece.
Responde SOLO JSON: {"store":"","date":"","total":0,"items":[{"name":"","brand":"","sku":"","price":0,"cat":"","confidence":0}]}`;

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */
let route='armario', wardMode='3d', gridFilter='Todo', fichaId=null;
const app=document.getElementById('app');
const TABS=[
  {k:'armario',i:'shirt',l:'Armario'},
  {k:'estilista',i:'spark',l:'Estilista'},
  {k:'add',i:'add',l:''},
  {k:'insights',i:'chart',l:'Insights'},
  {k:'perfil',i:'user',l:'Perfil'}
];
function go(r){ if(r!==route)unmountWardrobe3D(); route=r; render(); window.scrollTo(0,0); }
function render(){
  app.innerHTML=`<div class="shell">
    <div class="top"><div class="word">Dro<b>be</b></div><button class="ico">${svg('bell',19)}</button></div>
    <main id="main" class="fade"></main>
    <div class="nav"><div class="nav-in">
      ${TABS.map(t=>{ const on=route===t.k,add=t.k==='add';
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
  const score=computeDrobeScore();
  m.innerHTML=`<div class="reveal">
    <div class="eyebrow">Tu vestidor</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div class="title" style="margin-bottom:0">Armario <span class="muted">· ${store.garments.length}</span></div>
      <div class="score-pill" title="Drobe Score: salud de tu armario">${svg('score',14)} ${score}</div>
    </div></div>
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
      mountWardrobe3D(ward.querySelector('#stage'),store.garments,{
        onSelect:it=>openFicha(it.id),
        onFocus:it=>{ const c=document.getElementById('wardcap'); if(c)c.innerHTML=`<div class="wc-b">${it.brand}</div><div class="wc-n">${it.name}</div>`; }
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
      ${onSale?`<div class="sell-box">
        <div class="sell-title">${svg('tag',16)} Publicar anuncio</div>
        <div class="sub" style="margin:4px 0 10px">Drobe prepara el anuncio. Tú das un toque para publicarlo.</div>
        <button class="btn ghost sell-btn" id="sell_wallapop" style="margin-bottom:8px">Preparar para Wallapop</button>
        <button class="btn ghost sell-btn" id="sell_vinted">Preparar para Vinted</button>
      </div>`:''}
      <button class="btn ghost" id="wear" style="margin-top:10px">${svg('check',18)} Marcar como usada hoy</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#fclose').onclick=closeFicha;
  el.querySelector('#fedit').onclick=()=>editGarment(g);
  const track=el.querySelector('#track'),dots=el.querySelectorAll('.ficha-dots i');
  if(track&&dots.length)track.onscroll=()=>{ const i=Math.round(track.scrollLeft/track.clientWidth); dots.forEach((d,j)=>d.className=j===i?'on':''); };
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>openFicha(b.dataset.c));
  el.querySelector('#sale').onclick=()=>{ g.status=onSale?'uso':'venta'; save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
  el.querySelector('#wear').onclick=()=>{ g.worn++; g.lastWorn='Hoy'; save(); if(session)cloud.pushGarment(g); renderFicha(); render(); };
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
  const desc=r?.descripcion||`${g.brand} ${g.name} en ${g.cond.toLowerCase()}. Talla ${g.size||'—'}, color ${g.color}.`;
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
let addMode='choose';
function vAdd(m){
  if(addMode!=='choose'){return;}
  m.innerHTML=`
    <div class="reveal"><div class="eyebrow">Añadir</div>
    <div class="title">Tu armario,<br>sin escribir nada</div>
    <div class="sub">Una foto o el ticket. Pipeline de IA especializado en moda. Nunca inventa.</div></div>
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
    </div>`;
  m.querySelector('#pf').addEventListener('change',e=>handleScan(m,e,'prenda'));
  m.querySelector('#tf').addEventListener('change',e=>handleScan(m,e,'ticket'));
  m.querySelector('#manual').onclick=()=>showPrenda(m,null,null);
}

function handleScan(m,e,kind){
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  imageToBase64(f).then(img=>runPipeline(m,img,kind));
}

async function runPipeline(m,img,kind){
  const steps=kind==='ticket'
    ?['Procesando imagen…','Corrigiendo perspectiva…','Leyendo ticket…','Extrayendo prendas…']
    :['Detectando prenda…','Clasificando tipo exacto…','Identificando marca y corte…','Calculando confianza…'];
  m.innerHTML=`
    <div class="backbar"><button id="b" style="color:var(--ink)">${svg('back',20)}</button><span class="t">${kind==='ticket'?'Leyendo ticket':'Reconociendo prenda'}</span></div>
    <div id="stage">
      <div class="skel preview"><img src="${img.dataUrl}"/><div class="shimmer"></div></div>
      <div class="pipe-steps" id="psteps">${steps.map((s,i)=>`<div class="pstep" id="ps${i}">${svg('load',14)} ${s}</div>`).join('')}</div>
    </div>`;
  m.querySelector('#b').onclick=()=>{addMode='choose';vAdd(m);};
  let si=0; const iv=setInterval(()=>{ const el=m.querySelector(`#ps${si}`); if(el)el.classList.add('done'); si++; },600);
  const result=await callAI(kind==='ticket'?TICKET_SYSTEM:VISION_SYSTEM,kind==='ticket'?'Extrae todas las prendas de este ticket de compra.':'Analiza esta prenda con máxima precisión.',img);
  clearInterval(iv); steps.forEach((_,i)=>{ const el=m.querySelector(`#ps${i}`); if(el)el.classList.add('done'); });
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
    ${failed?`<div class="note warn" style="margin-bottom:14px">${svg('spark',18)}<span>No pude analizar automáticamente. Revisa GROQ_API_KEY en Vercel. Rellena manualmente — nunca invento.</span></div>`
    :hasLow?`<div class="note warn" style="margin-bottom:14px">${svg('spark',18)}<span>Datos con confianza baja marcados en naranja. Revisa antes de guardar.</span></div>`
    :`<div class="note" style="margin-bottom:14px">${svg('check',18)}<span>Prenda catalogada con alta confianza. Edita lo que necesites.</span></div>`}
    ${img?`<div class="scanimg"><img src="${img.dataUrl}"/></div>`:''}
    ${garmentFormHTML(r||{},c)}
    <button class="btn dark" id="conf" style="margin-top:6px">${svg('add',18,2)} Añadir al armario</button>`;
  stage.querySelector('#conf').onclick=()=>{
    const d=readForm(stage);
    addGarment({...d,catGroup:catToGroup(d.cat),bought:'Hoy',worn:0,lastWorn:'—',status:'uso',img:img?.dataUrl||'./assets/silbon-raquetas-white.png',photos:[],docs:[],tags:[]});
    trackPurchaseEvent({brand:d.brand,cat:d.cat,price:d.price,store:d.store,channel:'manual'});
    addMode='choose'; go('armario');
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
  if(!r||!r.items?.length)r={store:'Tienda',date:'Hoy',items:[{name:'Prenda detectada',brand:'',price:0,cat:'Camiseta manga corta',confidence:.5}]};
  r.items.forEach(it=>{ it.cat=normalizeCat(it.cat); });
  const doc={type:'Ticket',icon:'receipt',name:`Ticket ${r.store||''}.jpg`,dt:r.date||'Hoy',url:img.dataUrl};
  const stage=m.querySelector('#stage');
  stage.innerHTML=`
    <div class="note" style="margin-bottom:14px">${svg('receipt',18)}<span><b>${r.store||'Ticket'}</b>${r.date?' · '+r.date:''} · ${r.items.length} prenda(s) · ${r.total?r.total+'€':''}. Todas quedan enlazadas al ticket original.</span></div>
    ${r.items.map((it,i)=>{const low=(it.confidence||1)<0.75;return `<div class="conf${low?' low':''}" style="animation-delay:${i*0.07}s">
      <span class="k">${it.brand||'Prenda'}</span>
      <span class="vv">${it.cat} · ${it.price||0} €</span>
      ${stars(it.confidence||0.5)} ${confBadge(it.confidence||0.5)}</div>`;}).join('')}
    <button class="btn dark" id="conf" style="margin-top:14px">${svg('add',18,2)} Añadir ${r.items.length} al armario</button>`;
  stage.querySelector('#conf').onclick=()=>{
    r.items.forEach(it=>{
      addGarment({brand:it.brand||'—',name:it.name||it.cat,cat:it.cat,catGroup:catToGroup(it.cat),fit:'Regular Fit',color:'—',colors:['—'],material:'',size:'',season:'Todo el año',formality:'Casual',bought:r.date||'Hoy',store:r.store||'',price:it.price||0,cond:'Nuevo con etiqueta',worn:0,lastWorn:'—',status:'uso',img:'./assets/silbon-raquetas-white.png',photos:[],docs:[{...doc}],tags:[],sku:it.sku||''});
      trackPurchaseEvent({brand:it.brand,cat:it.cat,price:it.price,store:r.store,channel:'physical',sku:it.sku});
    });
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
   ESCÁNER EN TIENDA (Feature 32)
   Dato B2B de máximo valor: intención de compra real
═══════════════════════════════════════════ */
function openScannerTienda(){
  const el=document.createElement('div'); el.className='ficha'; el.id='scanner';
  el.style.zIndex='200';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 18px)">
    <div class="backbar"><button id="scb">${svg('back',20)}</button><span class="t">Estás en tienda</span></div>
    <div class="note" style="margin-bottom:16px">${svg('store',18)}<span>Estás mirando algo. Dime qué es y Drobe te dice si ya lo tienes, cuál es tu talla y si el precio es bueno.</span></div>
    <div class="field"><label>¿Qué estás mirando?</label><input id="sc_q" placeholder="Parka Stone Island verde, vaquero Levi's 501…" autofocus/></div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="sc_brand" placeholder="Stone Island"/></div>
      <div class="field"><label>Precio que ves</label><input id="sc_price" inputmode="decimal" placeholder="120"/></div>
    </div>
    <div class="field"><label>Tienda</label><input id="sc_store" placeholder="Zara, El Corte Inglés…"/></div>
    <button class="btn dark" id="sc_go">${svg('target',18)} Analizar ahora</button>
    <div id="sc_out" style="margin-top:16px"></div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('#scb').onclick=()=>el.remove();
  el.querySelector('#sc_go').onclick=async function(){
    const q=el.querySelector('#sc_q').value.trim(); if(!q)return;
    const brand=el.querySelector('#sc_brand').value.trim();
    const price=parseFloat(el.querySelector('#sc_price').value)||null;
    const storeName=el.querySelector('#sc_store').value.trim();
    const out=el.querySelector('#sc_out');
    this.disabled=true; this.innerHTML=`${svg('load',18)} Analizando…`; this.querySelector('svg').classList.add('spin');

    const dna=computeStyleDNA();
    const mySize=brand&&dna.sizeByBrand?.[brand]?`Tu talla en ${brand} es normalmente ${dna.sizeByBrand[brand]}.`:'';
    // buscar duplicados en el armario
    const similar=store.garments.filter(g=>g.status!=='venta'&&(q.toLowerCase().includes((g.cat||'').toLowerCase().split(' ')[0])||q.toLowerCase().includes((g.brand||'').toLowerCase())));
    const dupAlert=similar.length?`Ya tienes ${similar.length} prenda(s) parecida(s): ${similar.map(g=>g.brand+' '+g.name).join(', ')}.`:'';

    // análisis IA
    const sys=`Eres el asesor de compra de Drobe. El usuario está físicamente en una tienda mirando una prenda. Sé directo y rápido. Devuelve SOLO JSON:
{"veredicto":"comprar"|"dudoso"|"evitar","encaje":0-100,"razon":"1-2 frases muy directas","talla_recomendada":"","precio_ok":true|false,"precio_comentario":"","looks_nuevos":0}`;
    const usr=`Armario del usuario: ${store.garments.map(g=>g.brand+' '+g.cat+' '+g.color).join(', ')}.
${dupAlert}
${mySize}
Está en tienda mirando: "${q}"${price?` por ${price}€`:''} en ${storeName||'tienda'}.
ADN de estilo: ${dna.topFit||''}, colores ${dna.topColors?.map(c=>c.color).join('/')||''}, presupuesto medio ${dna.avgPrice||0}€.`;

    const [r, offers]=await Promise.all([callAI(sys,usr), searchOffers(q+(brand?' '+brand:''))]);

    // TRACKEAR el evento B2B
    trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'analyzed',session_id:Date.now().toString(36)});

    let html='';
    // duplicados alerta
    if(similar.length){
      html+=`<div class="note warn" style="margin-bottom:12px">${svg('spark',18)}<span><b>¡Ya tienes algo parecido!</b> ${dupAlert}</span></div>`;
    }
    // talla
    if(mySize){
      html+=`<div class="note" style="margin-bottom:12px">${svg('check',18)}<span>${mySize}</span></div>`;
    }
    // veredicto IA
    if(r){
      const vc={comprar:'var(--eco)',dudoso:'var(--amber)',evitar:'var(--danger)'}[r.veredicto]||'var(--ink)';
      const vt={comprar:'✓ Cómpralo',dudoso:'⚠ Piénsalo',evitar:'✗ Déjalo'}[r.veredicto]||'';
      html+=`<div class="advisor">
        <div class="who"><div class="av">D</div><div class="nm">Veredicto en tienda<span>En ${storeName||'tienda'}</span></div>
          <span class="pill" style="margin-left:auto;color:${vc};border-color:${vc};font-size:11px">${vt} · ${r.encaje||0}%</span></div>
        <div class="say" style="margin-top:8px">${r.razon||''}</div>
        ${price&&r.precio_comentario?`<div class="sub" style="margin-top:6px">${r.precio_ok?'✓':'⚠'} ${r.precio_comentario}</div>`:''}
        ${r.looks_nuevos?`<div class="sub" style="margin-top:4px">Crearía ~${r.looks_nuevos} looks nuevos con tu armario.</div>`:''}</div>`;
    }
    // ofertas (precio en otras tiendas)
    if(offers&&offers.length){
      html+=`<div class="shead"><h2>Precio en otras tiendas</h2></div>`+
        offers.slice(0,3).map(o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener">
          <div class="offer-img">${o.thumbnail?`<img src="${o.thumbnail}"/>`:''}</div>
          <div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div>
          <div class="offer-p">${o.price||''}</div></a>`).join('');
    }
    // acciones
    html+=`<div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn dark" id="sc_buy" style="flex:1">${svg('add',16)} Lo compro</button>
      <button class="btn ghost" id="sc_no" style="flex:1">Lo dejo</button>
    </div>`;
    out.innerHTML=html;
    out.querySelector('#sc_buy').onclick=()=>{
      trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'bought'});
      el.remove();
      // abrir formulario de añadir con datos prellenados
      go('add');
      setTimeout(()=>showPrenda(document.getElementById('main'),{brand,name:q,price},null),100);
    };
    out.querySelector('#sc_no').onclick=()=>{
      const reason=r?.veredicto==='evitar'?'ai_advised_against':similar.length?'already_have':'user_choice';
      trackScanEvent({query:q,brand,price_seen:price,store_name:storeName,action:'rejected',rejection_reason:reason});
      el.remove();
    };
    this.disabled=false; this.innerHTML=`${svg('target',18)} Analizar otra`;
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
    </div>`;
  el.querySelector('#mb').onclick=()=>el.remove();
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
    <button class="btn ghost" id="redo" style="margin-top:14px">Nueva maleta</button>`;
  sum.style.opacity='1';
  sum.querySelector('#redo').onclick=()=>maletaStep1(el);
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
const WEATHER={temp:17,label:'Nublado',city:'Barcelona'};
function pickOutfit(){
  const t=WEATHER.temp;
  const top=t<15?store.garments.find(g=>g.catGroup==='Jerséis/Sudaderas'&&g.status==='uso'):store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso');
  const s=store.garments.find(g=>g.catGroup==='Camisetas'&&g.status==='uso'&&g!==top);
  return [top,s].filter(Boolean);
}
function vEstilista(m){
  const intents=[['hoy','¿Qué me pongo hoy?'],['viaje','Preparar viaje'],['tienda','Estoy en tienda'],['comprar','¿Me lo compro?'],['hueco','¿Qué me falta?'],['muerta','¿Qué no uso?'],['vender','¿Qué vendo?']];
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Estilista</div>
    <div class="title">Tu asesor<br>de imagen</div>
    <div class="sub">Decisiones reales sobre tu ropa. Nunca sobre la que no tienes.</div></div>
    <div class="intent reveal" style="animation-delay:.05s">${intents.map(x=>`<button data-i="${x[0]}">${x[1]}</button>`).join('')}</div>
    <div id="adv">${advisorCard(stylistMsg||defaultAdvice())}</div>`;
  m.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{
    if(b.dataset.i==='viaje'){openMaleta();return;}
    if(b.dataset.i==='tienda'){openScannerTienda();return;}
    if(b.dataset.i==='comprar'){openAsesorCompra();return;}
    if(b.dataset.i==='hueco'){openHuecos();return;}
    const a=document.getElementById('adv'); a.style.opacity='0';
    setTimeout(()=>{stylistMsg=advice(b.dataset.i);a.innerHTML=advisorCard(stylistMsg);a.style.transition='opacity .4s var(--ease)';a.style.opacity='1';bindOutfit(a);},170);
  });
  bindOutfit(document.getElementById('adv'));
}
const bindOutfit=scope=>scope.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>openFicha(b.dataset.o));
const defaultAdvice=()=>({say:`Con ${WEATHER.temp}° y ${WEATHER.label.toLowerCase()} en ${WEATHER.city}, algodón limpio en neutros. Va contigo y con el día.`,items:pickOutfit()});
function advice(k){
  if(k==='muerta'){const d=store.garments.slice().sort((a,b)=>a.worn-b.worn).slice(0,3);return {say:'Estas apenas las tocas. O las rescatas esta semana, o ponlas en venta antes de que pierdan valor.',items:d};}
  if(k==='vender'){const s=store.garments.filter(g=>g.worn<8).sort((a,b)=>cpw(b)-cpw(a)).slice(0,3);return {say:'Por coste por uso y poco uso, estas son las candidatas a vender. Recuperas valor sin tocar lo que usas a diario.',items:s};}
  return defaultAdvice();
}
const advisorCard=a=>`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Estilista Drobe<span>Solo con tu armario</span></div></div><div class="say">${a.say}</div><div class="outfit">${(a.items||[]).map(g=>`<div class="it" data-o="${g.id}"><div class="ph"><img src="${g.img||''}"/></div><div class="l">${g.brand}</div></div>`).join('')}</div></div>`;

/* ═══════════════════════════════════════════
   ASESOR DE COMPRA
═══════════════════════════════════════════ */
function wardrobeSummary(){ return store.garments.filter(g=>g.status!=='venta').map(g=>`${g.cat} ${g.color} (${g.brand})`).join(', '); }
async function searchOffers(query){
  try{
    const r=await fetch('/api/shopping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query})});
    const d=await r.json(); return d&&d.available?d.results||[]:null;
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
    const sys=`Eres un asesor de compra honesto especializado en moda. Devuelve SOLO JSON: {"veredicto":"comprar"|"dudoso"|"evitar","encaje":0-100,"razon":"2-3 frases específicas mencionando prendas concretas de su armario","ya_tienes":"descripción de prenda parecida o vacío","looks_nuevos":número,"coste_por_uso_estimado":número}.`;
    const usr=`Armario: ${wardrobeSummary()}.\nQuiere comprar: ${desc}${data.price?` por ${data.price}€`:''}.`;
    const [r,offers]=await Promise.all([callAI(sys,usr),searchOffers(searchQ)]);
    let html='';
    if(r){
      const vc={comprar:'var(--eco)',dudoso:'var(--amber)',evitar:'var(--danger)'}[r.veredicto]||'var(--ink)';
      const vt={comprar:'✓ Te conviene',dudoso:'⚠ Piénsalo',evitar:'✗ No lo compres'}[r.veredicto]||'';
      html+=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Veredicto<span>Basado en tu armario real</span></div><span class="pill" style="margin-left:auto;color:${vc};border-color:${vc};font-size:11px">${vt} · ${r.encaje||0}%</span></div><div class="say" style="margin-top:10px">${r.razon||''}</div>${r.ya_tienes?`<div class="sub" style="margin-top:8px;color:var(--amber)">⚠ Ya tienes algo parecido: ${r.ya_tienes}</div>`:''}<div style="display:flex;gap:16px;margin-top:10px">${r.looks_nuevos!=null?`<div><div style="font-size:18px;font-weight:800">${r.looks_nuevos}</div><div style="font-size:11px;color:var(--ink3)">looks nuevos</div></div>`:''}${r.coste_por_uso_estimado?`<div><div style="font-size:18px;font-weight:800">${r.coste_por_uso_estimado}€</div><div style="font-size:11px;color:var(--ink3)">coste/uso est.</div></div>`:''}</div></div>`;
    }
    if(offers===null){
      html+=`<div class="note" style="margin-top:12px">${svg('tag',18)}<span>Añade <b>SERPAPI_KEY</b> en Vercel para ver precios reales de tiendas.</span></div>`;
    } else if(offers.length){
      html+=`<div class="shead"><h2>Mejores ofertas</h2></div>`+offers.map(o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img src="${o.thumbnail}"/>`:''}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div><div class="offer-p">${o.price||''}</div></a>`).join('');
    }
    out.innerHTML=html;
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
  const sys=`Eres un asesor de armario. Analiza qué le falta al usuario para tener un armario versátil.
Recomienda TIPOS de prenda (no marcas). Devuelve SOLO JSON:
{"resumen":"1 frase sobre el estado de su armario","faltas":[{"prenda":"tipo concreto","motivo":"por qué le cundiría","busqueda":"términos para buscar"}]}.
Máximo 4 faltas.`;
  const usr=`Armario por categorías: ${JSON.stringify(groups)}. Prendas: ${wardrobeSummary()}.`;
  callAI(sys,usr).then(async r=>{
    const out=el.querySelector('#h_out');
    if(!r||!r.faltas){out.innerHTML=`<div class="note warn">${svg('spark',18)}<span>No pude analizar (revisa GROQ_API_KEY).</span></div>`;return;}
    out.innerHTML=`<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Tu armario<span>Análisis de huecos</span></div></div><div class="say">${r.resumen||''}</div></div>`+
      `<div class="shead"><h2>Lo que te cundiría</h2></div>`+
      r.faltas.map(f=>`<div class="gap" data-q="${esc(f.busqueda||f.prenda)}">
        <div class="gap-main"><div class="gap-t">${f.prenda}</div><div class="gap-m">${f.motivo}</div></div>
        <button class="gap-btn">${svg('tag',16)} Buscar</button></div>`).join('');
    out.querySelectorAll('.gap').forEach(g=>g.querySelector('.gap-btn').onclick=async function(){
      const q=g.dataset.q; this.disabled=true; this.innerHTML=`${svg('load',16)} …`; this.querySelector('svg').classList.add('spin');
      const offers=await searchOffers(q);
      let box=g.querySelector('.gap-offers'); if(!box){box=document.createElement('div');box.className='gap-offers';g.after(box);}
      if(offers===null)box.innerHTML=`<div class="note" style="margin:8px 0">${svg('tag',16)}<span>Activa SERPAPI_KEY para ver ofertas reales.</span></div>`;
      else if(offers.length)box.innerHTML=offers.slice(0,3).map(o=>`<a class="offer" href="${o.link}" target="_blank" rel="noopener"><div class="offer-img">${o.thumbnail?`<img src="${o.thumbnail}"/>`:''}</div><div class="offer-info"><div class="offer-t">${o.title}</div><div class="offer-s">${o.source}</div></div><div class="offer-p">${o.price||''}</div></a>`).join('');
      else box.innerHTML=`<div class="note" style="margin:8px 0">${svg('tag',16)}<span>Sin resultados.</span></div>`;
      this.disabled=false; this.innerHTML=`${svg('tag',16)} Buscar`;
    });
  });
}

/* ═══════════════════════════════════════════
   INSIGHTS (B2B enriched)
═══════════════════════════════════════════ */
function vInsights(m){
  const dna=computeStyleDNA();
  const score=computeDrobeScore();
  const total=dna.totalValue||0;
  const dead=store.garments.filter(g=>g.worn<=3);
  const cm={'Blanco':'#E7E3DA','Gris':'#AEB4BA','Negro':'#1F2126','Crudo':'#E9DFC9','Marino':'#2B3A5B','Mostaza':'#C99A3E','Azul':'#4A6FA5','Verde':'#4A7C59','—':'#bbb'};
  const rk=store.garments.slice().sort((a,b)=>cpw(b)-cpw(a));
  m.innerHTML=`<div class="reveal"><div class="eyebrow">Insights</div>
    <div class="title">Tu armario,<br>en datos</div></div>

    <!-- Drobe Score -->
    <div class="score-card reveal" style="animation-delay:.02s">
      <div class="sc-left">
        <div class="sc-num">${score}</div>
        <div class="sc-label">Drobe Score</div>
      </div>
      <div class="sc-right">
        <div class="sc-bar"><div class="sc-fill" style="width:${score}%"></div></div>
        <div class="sc-desc">${score>=80?'Armario excelente. Bien amortizado y versátil.':score>=60?'Buen armario. Hay algunas prendas dormidas.':score>=40?'Armario con potencial. Vende lo que no usas.':'Armario con mucho capital dormido.'}</div>
      </div>
    </div>

    <!-- Stats principales -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0" class="reveal" style="animation-delay:.04s">
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
      ${rk.map(g=>`<div class="cpw"><div class="ph"><img src="${g.img||''}"/></div>
        <div><div class="nm">${g.brand} · ${g.name}</div><div class="mt">${g.worn} usos</div></div>
        <div class="val"><div class="v" style="color:${cpw(g)>15?'var(--amber)':'var(--eco)'}">${cpw(g).toFixed(2)} €</div><div class="s">por uso</div></div></div>`).join('')}
    </div>`;

  // actualizar DNA en el perfil
  store.profile=store.profile||{};
  store.profile.style_dna=dna;
  store.profile.drobe_score=score;
  save();
  if(session) cloud.updateProfile({style_dna:dna,drobe_score:score,segment:dna.segment,avg_price_per_item:dna.avgPrice,total_wardrobe_value:total,brand_sizes:dna.sizeByBrand,garment_count:dna.garmentCount}).catch(()=>{});
}

/* ═══════════════════════════════════════════
   PERFIL
═══════════════════════════════════════════ */
function vPerfil(m){
  const p=store.profile||{};
  const name=p.name||(session?.user?.email?.split('@')[0])||'Usuario';
  const dna=p.style_dna||computeStyleDNA();
  const score=p.drobe_score||computeDrobeScore();
  m.innerHTML=`<div class="reveal">
    <div style="display:flex;align-items:center;gap:14px;margin:10px 0 22px">
      <div style="width:60px;height:60px;border-radius:999px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800">${(name[0]||'U').toUpperCase()}</div>
      <div>
        <div style="font-size:19px;font-weight:700;letter-spacing:-.02em">${name}</div>
        <div class="sub" style="margin-top:2px">${store.garments.length} prendas · Score ${score} · ${session?'☁ Sincronizado':'Local'}</div>
      </div>
    </div></div>

    <!-- Consentimiento B2B — CRÍTICO para el negocio -->
    <div class="consent-card reveal" style="animation-delay:.04s">
      <div class="cc-head">${svg('dna',18)} Datos y privacidad</div>
      <div class="cc-body">
        <label class="toggle-row">
          <div>
            <div class="tr-title">Mejorar Drobe con mis datos</div>
            <div class="tr-sub">Tus datos anónimos ayudan a mejorar las recomendaciones para todos los usuarios.</div>
          </div>
          <input type="checkbox" id="c_analytics" class="toggle" ${p.consent_analytics?'checked':''}/>
        </label>
        <label class="toggle-row">
          <div>
            <div class="tr-title">Compartir datos anónimos con marcas</div>
            <div class="tr-sub">Nunca con tu nombre. Solo señales de comportamiento agregadas que ayudan a las marcas a entender cómo se usa su ropa. Sube tu Drobe Score.</div>
          </div>
          <input type="checkbox" id="c_b2b" class="toggle" ${p.consent_data_b2b?'checked':''}/>
        </label>
        <label class="toggle-row">
          <div>
            <div class="tr-title">Recibir recomendaciones personalizadas</div>
            <div class="tr-sub">Ofertas y novedades de marcas que encajan con tu estilo real.</div>
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
    ${[['Cuenta y sincronización','user'],['Notificaciones','bell'],['Privacidad y datos','lock'],['Acerca de Drobe','spark']].map((t,i)=>`<div class="opt reveal" style="animation-delay:${0.1+i*0.04}s;padding:15px 18px"><span class="ring" style="width:34px;height:34px;background:var(--surface)">${svg(t[1],18)}</span><div class="t1" style="font-size:15px">${t[0]}</div><span class="arr" style="margin-left:auto">${svg('chev',20)}</span></div>`).join('')}`;

  renderAuth(m.querySelector('#authslot'));

  // medidas
  ['altura','peso','pecho','cintura','pie'].forEach(k=>{
    const e=m.querySelector(`#ms_${k}`);
    if(e)e.onchange=()=>{ store.profile=store.profile||{}; store.profile.measures=store.profile.measures||{}; store.profile.measures[k]=e.value; save(); if(session)cloud.updateProfile({measures:store.profile.measures}).catch(()=>{}); };
  });

  // consentimientos — el activo B2B
  const saveConsents=()=>{
    store.profile=store.profile||{};
    store.profile.consent_analytics=m.querySelector('#c_analytics')?.checked||false;
    store.profile.consent_data_b2b=m.querySelector('#c_b2b')?.checked||false;
    store.profile.consent_marketing=m.querySelector('#c_marketing')?.checked||false;
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
    const em=slot.querySelector('#em').value.trim(),pw=slot.querySelector('#pw').value;
    if(!em||!pw){slot.querySelector('#amsg').innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">Introduce email y contraseña.</div>`;return;}
    this.disabled=true; this.textContent='Conectando…';
    try{
      const s=await cloud.signInOrUp(em,pw);
      if(s){session=s;await syncFromCloud();render();}
      else{slot.querySelector('#amsg').innerHTML=`<div class="sub" style="margin-bottom:8px">Revisa tu email para confirmar la cuenta.</div>`;render();}
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
    el.querySelector('#w_skip').onclick=()=>{markSeen();el.remove();};
    return;
  }
  const isSignup=mode==='signup';
  el.innerHTML=`<div class="ficha-body" style="padding-top:calc(env(safe-area-inset-top) + 30px)">
    <div class="backbar"><button id="wb">${svg('back',20)}</button><span class="t">${isSignup?'Crear cuenta':'Iniciar sesión'}</span></div>
    <div class="word" style="font-size:30px;margin:10px 0 6px">Dro<b>be</b></div>
    <div class="sub" style="margin-bottom:20px">${isSignup?'Tu armario, sincronizado en todos tus dispositivos.':'Entra para recuperar tu armario.'}</div>
    ${!cloud.cloudEnabled()?`<div class="note warn">${svg('spark',18)}<span>Sincronización no disponible. Puedes usar la app en local.</span></div>`:''}
    <div class="field"><label>Email</label><input id="w_em" type="email" placeholder="tu@email.com"/></div>
    <div class="field"><label>Contraseña</label><input id="w_pw" type="password" placeholder="Mínimo 6 caracteres"/></div>
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
  el.querySelector('#w_skip2').onclick=()=>{markSeen();el.remove();};
  let sex='';
  el.querySelectorAll('[data-sex]').forEach(b=>b.onclick=()=>{sex=b.dataset.sex;el.querySelectorAll('[data-sex]').forEach(x=>x.classList.toggle('on',x===b));});
  el.querySelector('#w_go').onclick=async function(){
    const em=el.querySelector('#w_em').value.trim(),pw=el.querySelector('#w_pw').value;
    const msg=el.querySelector('#w_msg');
    if(!em||!pw){msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">Introduce email y contraseña.</div>`;return;}
    if(pw.length<6){msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">La contraseña debe tener al menos 6 caracteres.</div>`;return;}
    if(!cloud.cloudEnabled()){markSeen();el.remove();return;}
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
        await syncFromCloud(); markSeen(); el.remove(); render();
      } else {
        msg.innerHTML=`<div class="sub" style="margin-bottom:8px">Revisa tu email para confirmar la cuenta.</div>`;
        this.disabled=false; this.textContent=isSignup?'Crear cuenta':'Entrar';
      }
    }catch(e){
      msg.innerHTML=`<div class="sub" style="color:var(--danger);margin-bottom:8px">${e?.message||'No se pudo conectar.'}</div>`;
      this.disabled=false; this.textContent=isSignup?'Crear cuenta':'Entrar';
    }
  };
}

/* ═══════════════════════════════════════════
   CLOUD + ARRANQUE
═══════════════════════════════════════════ */
render();
initCloud();
if(needsWelcome())setTimeout(()=>renderWelcome('intro'),300);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

async function initCloud(){
  if(!cloud.cloudEnabled())return;
  try{
    session=await cloud.getSession();
    cloud.onAuth(async ns=>{session=ns;await syncFromCloud();render();});
    if(session)await syncFromCloud();
    render();
  }catch(e){}
}
async function syncFromCloud(){
  if(!session)return;
  let rows=await cloud.pullGarments();
  if(rows&&rows.length===0&&store.garments.length){ for(const g of store.garments)await cloud.pushGarment(g,true); rows=await cloud.pullGarments(); }
  if(rows){
    store.garments=rows.map(r=>{ const g=cloud.fromRow(r); g.catGroup=g.catGroup||catToGroup(g.cat||''); g.fit=g.fit||'Regular Fit'; g.colors=g.colors||[g.color]; g.docs=g.docs||[]; g.photos=g.photos||[]; return g; });
    save();
  }
}

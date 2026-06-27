import { mountWardrobe3D, unmountWardrobe3D } from './wardrobe3d.js';
import * as cloud from './lib/supabase.js';

let session = null; // sesión de Supabase si hay login

/* ---------------- constantes ---------------- */
const CATEGORIES = ["Camisetas","Camisas","Pantalones","Jerséis","Abrigos","Vestidos","Calzado","Accesorios"];
const CONDITIONS = ["Nuevo con etiqueta","Como nuevo","Buen estado","Usado"];
const EMOJI = {Camisetas:"👕",Camisas:"👔",Pantalones:"👖",Jerséis:"🧶",Abrigos:"🧥",Vestidos:"👗",Calzado:"👟",Accesorios:"🧢"};
const RESALE_PCT = {"Nuevo con etiqueta":.6,"Como nuevo":.45,"Buen estado":.35,"Usado":.25};
const resale = (p,c)=> Math.max(Math.round((Number(p)||0)*(RESALE_PCT[c]??.35)), (p>0?3:0));

const guessCat = (name="")=>{const n=name.toLowerCase();
  if(/camiset|polo|top/.test(n))return"Camisetas";
  if(/camis|blusa/.test(n))return"Camisas";
  if(/pantal|vaquer|jean|chino|short|falda|legg/.test(n))return"Pantalones";
  if(/jersey|jersei|punto|sudad|hood|cardig/.test(n))return"Jerséis";
  if(/abrig|chaquet|cazadora|parka|gabard|plumas/.test(n))return"Abrigos";
  if(/vestid/.test(n))return"Vestidos";
  if(/zapat|deportiv|botas|sneak|bamba|sandal/.test(n))return"Calzado";
  return"Accesorios";};

/* ---------------- catálogo real (productos subidos) ---------------- */
const SHOP = [
  {id:"p1",brand:"Scalpers",name:"Camiseta Snake Skull",category:"Camisetas",color:"Gris",price:35.99,img:"./assets/scalpers-snake-grey.png"},
  {id:"p2",brand:"Scalpers",name:"Camiseta Skull Animal Print",category:"Camisetas",color:"Blanco",price:29.99,img:"./assets/scalpers-skull-white.png"},
  {id:"p3",brand:"Silbon",name:"Camiseta Logo Raquetas",category:"Camisetas",color:"Blanco",price:39.95,img:"./assets/silbon-raquetas-white.png"},
  {id:"p4",brand:"Pepe Jeans",name:"Camiseta Eggo Logo",category:"Camisetas",color:"Blanco",price:29.99,img:"./assets/pepe-eggo-white.png"},
  {id:"p5",brand:"Pepe Jeans",name:"Camiseta Eggo Logo",category:"Camisetas",color:"Gris",price:29.99,img:"./assets/pepe-eggo-grey.png"},
  {id:"p6",brand:"Stone Island",name:"Jersey Punto Compass",category:"Jerséis",color:"Negro",price:295.00,img:"./assets/stoneisland-compass-black.png"},
  {id:"p7",brand:"Stone Island",name:"Jersey Lana Crudo",category:"Jerséis",color:"Crudo",price:320.00,img:"./assets/stoneisland-knit-cream.png"},
];

/* armario inicial (con foto real para que el 3D luzca) */
const SEED = [
  {id:1,brand:"Silbon",name:"Camiseta Logo Raquetas",category:"Camisetas",color:"Blanco",size:"M",condition:"Buen estado",price:39.95,status:"uso",worn:9,img:"./assets/silbon-raquetas-white.png"},
  {id:2,brand:"Pepe Jeans",name:"Camiseta Eggo",category:"Camisetas",color:"Gris",size:"M",condition:"Como nuevo",price:29.99,status:"uso",worn:14,img:"./assets/pepe-eggo-grey.png"},
  {id:3,brand:"Scalpers",name:"Camiseta Snake Skull",category:"Camisetas",color:"Gris",size:"L",condition:"Buen estado",price:35.99,status:"venta",worn:3,img:"./assets/scalpers-snake-grey.png"},
  {id:4,brand:"Stone Island",name:"Jersey Compass",category:"Jerséis",color:"Negro",size:"L",condition:"Como nuevo",price:295,status:"uso",worn:6,img:"./assets/stoneisland-compass-black.png"},
  {id:5,brand:"Levi's",name:"Vaqueros 501",category:"Pantalones",color:"Azul oscuro",size:"32",condition:"Como nuevo",price:80,status:"uso",worn:22,img:null},
  {id:6,brand:"Nike",name:"Air Force 1",category:"Calzado",color:"Blanco",size:"43",condition:"Buen estado",price:110,status:"uso",worn:18,img:null},
];

/* ---------------- estado + persistencia ---------------- */
const KEY="drobe.v1";
let store = load();

function load(){
  try{const raw=localStorage.getItem(KEY); if(raw){const s=JSON.parse(raw); if(s.garments)return s;}}catch(e){}
  return {garments:structuredClone(SEED)};
}
function save(){ try{localStorage.setItem(KEY,JSON.stringify(store));}catch(e){} }

function addGarments(items){
  const withIds = items.map(g=>({id:crypto.randomUUID(),worn:0,status:"uso",img:null,...g}));
  store.garments = [...withIds,...store.garments]; save();
  if(session) withIds.forEach(g=>cloud.pushGarment(g));
}
function updateGarment(id,patch){
  store.garments=store.garments.map(g=>g.id===id?{...g,...patch}:g); save();
  if(session){ const g=store.garments.find(x=>x.id===id); if(g) cloud.pushGarment(g); }
}
function removeGarment(id){
  store.garments=store.garments.filter(g=>g.id!==id); save();
  if(session) cloud.deleteGarmentCloud(id);
}

/* ---------------- IA (serverless /api/ai con fallback) ---------------- */
async function callAI(system,user){
  try{
    const r = await fetch("/api/ai",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({system,user})});
    if(!r.ok) throw new Error("api");
    const d = await r.json();
    const text=(d.text||"").replace(/```json|```/g,"").trim();
    return JSON.parse(text);
  }catch(e){ return null; } // el caller decide fallback
}

/* ---------------- iconos (SVG inline) ---------------- */
const ic = {
  shirt:'<path d="M16 4l4 2v4l-3 1v9H7v-9L4 10V6l4-2 4 3 4-3z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  spark:'<path d="M12 3l1.8 4.7L18 9l-4.2 1.3L12 15l-1.8-4.7L6 9l4.2-1.3z"/>',
  bag:'<path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0"/>',
  user:'<circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0114 0"/>',
  scan:'<path d="M4 7V5a1 1 0 011-1h2M20 7V5a1 1 0 00-1-1h-2M4 17v2a1 1 0 001 1h2M20 17v2a1 1 0 01-1 1h-2M4 12h16"/>',
  pen:'<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  check:'<path d="M5 12l5 5L20 6"/>',
  tag:'<path d="M4 4h7l9 9-7 7-9-9V4z"/><circle cx="8" cy="8" r="1.3"/>',
  trash:'<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>',
  cam:'<path d="M4 8h3l2-2h6l2 2h3v11H4V8z"/><circle cx="12" cy="13" r="3"/>',
  recycle:'<path d="M7 7l3-3 3 3M17 9l3 3-3 3M4 14l-1 4 4 1M12 21l3-3-3-3"/>',
  cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  load:'<path d="M12 3a9 9 0 109 9"/>',
};
const svg=(n,sz=22,sw=2)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ic[n]}</svg>`;

/* ---------------- router / render ---------------- */
let route = "armario";
const app = document.getElementById("app");
const go = (r)=>{ if(r!==route){ unmountWardrobe3D(); } route=r; render(); };

const TABS=[
  {k:"armario",label:"Armario",icon:"shirt"},
  {k:"tienda",label:"Tienda",icon:"bag"},
  {k:"add",label:"Añadir",icon:"plus"},
  {k:"estilista",label:"Estilista",icon:"spark"},
  {k:"perfil",label:"Perfil",icon:"user"},
];

function render(){
  const head = route==="armario"
    ? `<span class="hd-count">${store.garments.length} prendas</span>` : "";
  app.innerHTML = `<div class="app-shell">
    <header class="hd"><div class="logo">Drobe<small>your wardrobe everywhere</small></div>${head}</header>
    <main id="main"></main>
    <nav class="nav"><div class="nav-inner">
      ${TABS.map(t=>{
        const on=route===t.k; const add=t.k==="add";
        return `<button data-tab="${t.k}" class="${on?'active':''}">
          ${add?`<span class="add">${svg('plus',22)}</span>`:`${svg(t.icon,20)}<span class="lbl">${t.label}</span>`}
        </button>`;
      }).join("")}
    </div></nav>
  </div>`;
  const main = document.getElementById("main");
  ({armario:viewArmario, tienda:viewTienda, add:viewAdd, estilista:viewEstilista, vender:viewVender, perfil:viewPerfil}[route]||viewArmario)(main);
  app.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>go(b.dataset.tab));
}

/* ---------------- ARMARIO ---------------- */
let armarioFilter="Todo", show3D=false;
function viewArmario(el){
  if(show3D){ return view3D(el); }
  const cats = CATEGORIES.filter(c=>store.garments.some(g=>g.category===c));
  const filters=["Todo","En venta",...cats];
  const list = store.garments.filter(g=>
    armarioFilter==="Todo"?true:armarioFilter==="En venta"?g.status==="venta":g.category===armarioFilter);
  el.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
      <button id="to3d" class="btn ghost" style="padding:8px 12px;width:auto;font-size:12px">${svg('cube',16)} Ver en 3D</button>
    </div>
    <div class="chips">${filters.map(f=>`<button class="chip ${armarioFilter===f?'on':''}" data-f="${f}">${f}</button>`).join("")}</div>
    <div class="grid">${list.map(cardG).join("")}</div>
    ${list.length===0?`<div class="empty">Vacío. Escanea un ticket y se llena solo.</div>`:""}`;
  el.querySelector("#to3d").onclick=()=>{show3D=true;render();};
  el.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{armarioFilter=b.dataset.f;render();});
  el.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>openSheet(store.garments.find(g=>g.id==b.dataset.g)));
}
function cardG(g){
  const ph = g.img?`<img src="${g.img}" alt="${g.name}"/>`:(EMOJI[g.category]||"👕");
  return `<button class="gcard" data-g="${g.id}">
    <div class="ph">${ph}</div>
    <div class="body">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="brand">${g.brand||""}</span>
        ${g.status==="venta"?`<span class="badge sale">EN VENTA</span>`:""}
      </div>
      <div class="gname">${g.name}</div>
      <div class="meta">${g.size||"-"} · ${g.color||"-"}</div>
    </div></button>`;
}

/* ---------------- ARMARIO 3D ---------------- */
function view3D(el){
  el.innerHTML=`
    <div class="backbar"><button id="b">${svg('back',20)}</button><span class="ttl">Armario 3D</span></div>
    <div id="cw" class="canvas-wrap"><div class="canvas-hint">Arrastra para girar · pellizca para zoom · toca una prenda</div></div>
    <div id="d3" style="margin-top:12px"></div>`;
  el.querySelector("#b").onclick=()=>{show3D=false;unmountWardrobe3D();render();};
  const cw=el.querySelector("#cw");
  const items = store.garments.map(g=>({...g, img:g.img||null, color:0xcad6e2}));
  try{
    mountWardrobe3D(cw, items, (it)=>{
      const d=el.querySelector("#d3");
      d.innerHTML=`<div class="box blue" style="align-items:center;justify-content:space-between">
        <div><b>${it.brand}</b> · ${it.name}<br><span class="meta">${it.condition} · reventa ${resale(it.price,it.condition)}€</span></div>
        <button id="op" class="btn dark" style="width:auto;padding:8px 12px;font-size:12px">Abrir</button></div>`;
      d.querySelector("#op").onclick=()=>openSheet(store.garments.find(g=>g.id===it.id));
    });
  }catch(e){
    cw.innerHTML=`<div class="empty" style="padding-top:160px">Tu dispositivo no soporta 3D.<br>Usa la vista normal del armario.</div>`;
  }
}

/* ---------------- TIENDA (productos reales) ---------------- */
function viewTienda(el){
  el.innerHTML=`
    <p class="h1">Tienda</p><p class="sub">Primera mano de marcas asociadas. Compra y entra directa a tu armario.</p>
    <div class="grid">${SHOP.map(p=>`
      <div class="gcard">
        <div class="ph"><img src="${p.img}" alt="${p.name}"/></div>
        <div class="body">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="brand">${p.brand}</span><span class="badge new">NUEVO</span>
          </div>
          <div class="gname">${p.name}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <span class="price">${p.price.toFixed(2)}€</span>
            <button class="btn blue" style="width:auto;padding:7px 12px;font-size:12px" data-buy="${p.id}">Comprar</button>
          </div>
        </div></div>`).join("")}</div>`;
  el.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>{
    const p=SHOP.find(x=>x.id===b.dataset.buy);
    addGarments([{brand:p.brand,name:p.name,category:p.category,color:p.color,size:"M",condition:"Nuevo con etiqueta",price:p.price,img:p.img}]);
    b.textContent="✓ En tu armario"; b.disabled=true;
  });
}

/* ---------------- AÑADIR ---------------- */
let addMode="choose";
const SAMPLE=`ZARA ESPAÑA, S.A.
C/ Pelai 11, 08001 Barcelona
Ticket simplificado 2419
--------------------------------
CAMISA LINO MANGA LARGA    29,95
PANTALON CHINO BEIGE       35,95
JERSEY PUNTO FINO          25,95
--------------------------------
TOTAL                91,85 EUR
IVA incluido (21%)`;
function viewAdd(el){
  if(addMode==="choose"){
    el.innerHTML=`<p class="h1">Añadir prendas</p><p class="sub">La forma rápida: escanea el ticket y Drobe crea las prendas por ti.</p>
      <button class="tile dark" id="t-ticket">${svg('scan',26)}<div><div class="t1">Escanear ticket</div><div class="t2">Se añaden automáticamente</div></div><span class="arrow">${svg('chev',20)}</span></button>
      <button class="tile ghost" id="t-manual"><span style="color:var(--blue)">${svg('pen',24)}</span><div><div class="t1" style="color:var(--ink)">Añadir manual</div><div class="t2" style="color:var(--mute)">Una prenda, paso a paso</div></div><span class="arrow" style="color:var(--mute)">${svg('chev',20)}</span></button>`;
    el.querySelector("#t-ticket").onclick=()=>{addMode="ticket";render();};
    el.querySelector("#t-manual").onclick=()=>{addMode="manual";render();};
  } else if(addMode==="ticket"){ viewTicket(el); }
  else { viewManual(el); }
}
function viewTicket(el){
  el.innerHTML=`
    <div class="backbar"><button id="b">${svg('back',20)}</button><span class="ttl">Escanear ticket</span></div>
    <label class="btn dark" for="file" style="margin-bottom:10px">${svg('cam',18)} Hacer foto del ticket</label>
    <input id="file" type="file" accept="image/*" capture="environment" hidden/>
    <div id="ocrbar"></div>
    <div class="box blue" style="font-size:12px">${svg('scan',18)}<span>Haz foto del ticket y la IA lo lee sola. También puedes editar el texto a mano.</span></div>
    <textarea class="code" id="tx" rows="9">${SAMPLE}</textarea>
    <div id="err"></div>
    <button class="btn dark" id="go" style="margin-top:12px">${svg('scan',18)} Procesar con IA</button>
    <div id="out" style="margin-top:14px"></div>`;
  el.querySelector("#b").onclick=()=>{addMode="choose";render();};
  const file=el.querySelector("#file"), bar=el.querySelector("#ocrbar");
  file.addEventListener("change", async ()=>{
    const f=file.files && file.files[0]; if(!f) return;
    bar.innerHTML=`<div class="box blue">${svg('load',18)} Leyendo el ticket… <b id="pct" style="margin-left:auto">0%</b></div>`;
    bar.querySelector("svg")?.classList.add("spin");
    try{
      const { extractTextFromImage } = await import('./lib/ocr.js');
      const text = await extractTextFromImage(f,(p)=>{ const e=bar.querySelector("#pct"); if(e)e.textContent=Math.round(p*100)+"%"; });
      const tx=el.querySelector("#tx"); tx.value=(text.trim()||tx.value);
      bar.innerHTML=`<div class="box eco">${svg('check',18)} Ticket leído. Revisa el texto y pulsa “Procesar con IA”.</div>`;
    }catch(e){
      bar.innerHTML=`<p class="err">No se pudo leer la imagen. Escribe el ticket a mano o prueba otra foto.</p>`;
    }
  });
  el.querySelector("#go").onclick=async(ev)=>{
    const btn=ev.currentTarget; btn.disabled=true; btn.innerHTML=`${svg('load',18)} Leyendo ticket…`;
    btn.querySelector("svg")?.classList.add("spin");
    const sys="Eres un parser de tickets de tiendas de moda españolas. Extrae SOLO las prendas de ropa o calzado. Devuelve SOLO un array JSON sin markdown. Cada objeto: {\"name\":string (nombre corto en español),\"brand\":string (deduce del encabezado),\"price\":number,\"color\":string}. Ignora totales e impuestos.";
    let items = await callAI(sys, "Ticket:\n"+el.querySelector("#tx").value);
    if(!Array.isArray(items)){ items=fallbackTicket(el.querySelector("#tx").value); }
    if(!items.length){ el.querySelector("#err").innerHTML=`<p class="err">No se detectaron prendas. Revisa el texto.</p>`; btn.disabled=false; btn.innerHTML=`${svg('scan',18)} Procesar con IA`; return; }
    items=items.map(p=>({...p,category:guessCat(p.name),size:"",condition:"Nuevo con etiqueta",color:p.color||""}));
    renderConfirm(el.querySelector("#out"), items);
    btn.style.display="none";
  };
}
function fallbackTicket(text){ // sin IA: heurística sencilla
  const brand = (text.split("\n")[0]||"").replace(/,.*/,"").trim().split(" ").slice(0,2).join(" ")||"Tienda";
  const out=[];
  text.split("\n").forEach(l=>{
    const m=l.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ ]{4,})\s+(\d+[.,]\d{2})\s*$/);
    if(m && !/total|iva|subtotal/i.test(m[1])){ out.push({name:m[1].trim().toLowerCase().replace(/(^| )\w/g,c=>c.toUpperCase()),brand,price:parseFloat(m[2].replace(",",".")),color:""}); }
  });
  return out;
}
function renderConfirm(out,items){
  out.innerHTML=`<p class="sub">${items.length} prendas detectadas. Reventa ya sugerida.</p>
    ${items.map(g=>`<div style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px;margin-bottom:10px;display:flex;gap:12px;align-items:center">
      <div style="width:48px;height:48px;border-radius:10px;background:var(--blue-soft);display:flex;align-items:center;justify-content:center;font-size:24px">${EMOJI[g.category]}</div>
      <div style="flex:1;min-width:0"><div class="gname">${g.name}</div><div class="meta">${g.brand} · ${g.category} · ${g.price}€</div>
      <div style="font-size:11px;color:var(--eco);font-weight:600">Reventa sugerida: ${resale(g.price,g.condition)}€</div></div></div>`).join("")}
    <button class="btn blue" id="conf">${svg('check',18)} Añadir ${items.length} al armario</button>`;
  out.querySelector("#conf").onclick=()=>{ addGarments(items); addMode="choose"; go("armario"); };
}
function viewManual(el){
  const f={name:"",brand:"",category:"Camisetas",color:"",size:"",condition:"Buen estado",price:""};
  el.innerHTML=`
    <div class="backbar"><button id="b">${svg('back',20)}</button><span class="ttl">Añadir manual</span></div>
    <div class="field"><label>Nombre</label><input id="name" placeholder="Camiseta rayas"/></div>
    <div class="field"><label>Marca</label><input id="brand" placeholder="Zara"/></div>
    <div class="row2">
      <div class="field"><label>Categoría</label><select id="category">${CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select></div>
      <div class="field"><label>Estado</label><select id="condition">${CONDITIONS.map(c=>`<option ${c==="Buen estado"?"selected":""}>${c}</option>`).join("")}</select></div>
    </div>
    <div class="row3">
      <div class="field"><label>Color</label><input id="color" placeholder="Negro"/></div>
      <div class="field"><label>Talla</label><input id="size" placeholder="M"/></div>
      <div class="field"><label>Precio €</label><input id="price" inputmode="numeric" placeholder="25"/></div>
    </div>
    <div id="hint"></div>
    <button class="btn blue" id="save" disabled>${svg('check',18)} Guardar en el armario</button>`;
  el.querySelector("#b").onclick=()=>{addMode="choose";render();};
  const get=id=>el.querySelector("#"+id);
  const refresh=()=>{
    const ok=get("name").value.trim().length>0; get("save").disabled=!ok;
    const pr=get("price").value, cond=get("condition").value;
    get("hint").innerHTML = pr?`<div class="box eco" style="padding:10px 12px"><b style="color:var(--eco)">Reventa sugerida: ${resale(pr,cond)}€</b></div>`:"";
  };
  ["name","price","condition"].forEach(id=>get(id).addEventListener("input",refresh));
  get("save").onclick=()=>{
    addGarments([{name:get("name").value,brand:get("brand").value,category:get("category").value,color:get("color").value,size:get("size").value,condition:get("condition").value,price:Number(get("price").value)||0}]);
    addMode="choose"; go("armario");
  };
}

/* ---------------- ESTILISTA IA ---------------- */
let temp=18, sky="Soleado";
function viewEstilista(el){
  const skies=[["Soleado","☀️"],["Nublado","☁️"],["Lluvia","🌧️"],["Frío","❄️"]];
  el.innerHTML=`
    <p class="h1">Estilista IA</p><p class="sub">Dime el tiempo y te visto con lo que ya tienes.</p>
    <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><b style="color:var(--ink)">Temperatura</b><b style="color:var(--blue);font-size:20px">${temp}°C</b></div>
      <input type="range" min="-5" max="38" value="${temp}" id="t"/>
      <div class="weather-grid">${skies.map(([k,e])=>`<button data-sky="${k}" class="${sky===k?'on':''}"><span style="font-size:18px">${e}</span>${k}</button>`).join("")}</div>
    </div>
    <button class="btn dark" id="ask">${svg('spark',18)} Proponme un look</button>
    <div id="err"></div><div id="res" style="margin-top:14px"></div>`;
  el.querySelector("#t").addEventListener("input",e=>{temp=+e.target.value;render();});
  el.querySelectorAll("[data-sky]").forEach(b=>b.onclick=()=>{sky=b.dataset.sky;render();});
  el.querySelector("#ask").onclick=async(ev)=>{
    const btn=ev.currentTarget; btn.disabled=true; btn.innerHTML=`${svg('load',18)} Pensando tu look…`; btn.querySelector("svg")?.classList.add("spin");
    const usable=store.garments.filter(g=>g.status!=="venta");
    const list=usable.map(g=>`#${g.id} ${g.name} (${g.category}, ${g.color})`).join("\n");
    const sys="Eres el estilista de Drobe. Recibes el armario y el tiempo de hoy. Elige un conjunto coherente. Devuelve SOLO JSON: {\"ids\":number[],\"razon\":string (1-2 frases en español, cercano y práctico)}.";
    let r=await callAI(sys,`Tiempo: ${temp}°C, ${sky}.\nArmario:\n${list}`);
    if(!r||!Array.isArray(r.ids)){ r=fallbackOutfit(usable); }
    const picked=usable.filter(g=>r.ids.includes(g.id));
    el.querySelector("#res").innerHTML=`
      <div class="box blue">${r.razon}</div>
      <div class="pick">${picked.map(g=>`<button class="gcard" data-g="${g.id}"><div class="ph">${g.img?`<img src="${g.img}"/>`:EMOJI[g.category]}</div><div class="body"><div class="gname">${g.name}</div></div></button>`).join("")}</div>`;
    el.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>openSheet(store.garments.find(g=>g.id==b.dataset.g)));
    btn.disabled=false; btn.innerHTML=`${svg('spark',18)} Otro look`;
  };
}
function fallbackOutfit(usable){
  const pick=cat=>usable.find(g=>g.category===cat);
  const top = temp<14 ? (pick("Jerséis")||pick("Abrigos")||pick("Camisetas")) : (pick("Camisetas")||pick("Camisas"));
  const bottom=pick("Pantalones"), shoes=pick("Calzado");
  const ids=[top,bottom,shoes].filter(Boolean).map(g=>g.id);
  const razon = temp<14?`Con ${temp}°C y ${sky.toLowerCase()}, abriga con punto y unos vaqueros.`:`${temp}°C y ${sky.toLowerCase()}: camiseta cómoda con vaqueros y zapatillas.`;
  return {ids,razon};
}

/* ---------------- DETALLE / VENDER ---------------- */
function openSheet(g){
  if(!g)return;
  const wrap=document.createElement("div"); wrap.className="scrim";
  const onSale=g.status==="venta";
  wrap.innerHTML=`<div class="sheet">
    <div class="hero">${g.img?`<img src="${g.img}"/>`:(EMOJI[g.category]||"👕")}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div class="brand">${g.brand||""}</div><div style="font-size:20px;font-weight:800;color:var(--ink)">${g.name}</div></div>
      <button id="x" style="color:var(--mute)">${svg('x',22)}</button></div>
    <div class="minis">
      <div class="mini"><div class="l">Categoría</div><div class="v">${g.category}</div></div>
      <div class="mini"><div class="l">Estado</div><div class="v">${g.condition}</div></div>
      <div class="mini"><div class="l">Talla / Color</div><div class="v">${g.size||"-"} · ${g.color||"-"}</div></div>
      <div class="mini"><div class="l">Usada</div><div class="v">${g.worn||0} veces</div></div>
      <div class="mini"><div class="l">Precio compra</div><div class="v">${(g.price||0)}€</div></div>
      <div class="mini"><div class="l">Reventa sugerida</div><div class="v eco">${resale(g.price,g.condition)}€</div></div>
    </div>
    <button class="btn ${onSale?'ghost':'amber'}" id="sale">${svg('tag',18)} ${onSale?'Quitar de la venta':'Poner en venta en un clic'}</button>
    <button class="btn ghost" id="del" style="border:none;color:var(--mute);font-size:13px;margin-top:4px">${svg('trash',15)} Eliminar del armario</button>
  </div>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.onclick=e=>{if(e.target===wrap)close();};
  wrap.querySelector("#x").onclick=close;
  wrap.querySelector("#sale").onclick=()=>{updateGarment(g.id,{status:onSale?"uso":"venta"});close();render();};
  wrap.querySelector("#del").onclick=()=>{removeGarment(g.id);close();render();};
}

/* ---------------- PERFIL ---------------- */
function authCard(){
  if(!cloud.cloudEnabled()){
    return `<div class="box blue" style="font-size:12px">${svg('user',18)}<span>Conecta Supabase en <b>lib/supabase.js</b> para guardar tu armario en la nube y usarlo en cualquier dispositivo.</span></div>`;
  }
  if(session){
    const email=session.user?.email||"tu cuenta";
    return `<div class="box eco" style="align-items:center;justify-content:space-between">
      <div>${svg('check',18)} <b>Sincronizado</b><br><span class="meta">${email}</span></div>
      <button id="logout" class="btn ghost" style="width:auto;padding:8px 12px;font-size:12px">Salir</button></div>`;
  }
  return `<div style="background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;color:var(--ink);margin-bottom:8px">Guarda tu armario en la nube</div>
    <div class="field"><input id="email" type="email" placeholder="tu@email.com"/></div>
    <div class="field"><input id="pwd" type="password" placeholder="Contraseña"/></div>
    <div id="authmsg"></div>
    <button class="btn blue" id="login">Entrar / crear cuenta</button></div>`;
}
function bindAuth(el){
  const lo=el.querySelector("#logout");
  if(lo) lo.onclick=async()=>{ await cloud.signOut(); session=null; render(); };
  const lg=el.querySelector("#login");
  if(lg) lg.onclick=async()=>{
    const email=el.querySelector("#email").value.trim(), pwd=el.querySelector("#pwd").value;
    const msg=el.querySelector("#authmsg");
    if(!email||!pwd){ msg.innerHTML=`<p class="err">Introduce email y contraseña.</p>`; return; }
    lg.disabled=true; lg.textContent="Conectando…";
    try{
      const s=await cloud.signInOrUp(email,pwd);
      if(s){ session=s; await syncFromCloud(); render(); }
      else { msg.innerHTML=`<div class="box eco" style="margin:8px 0 0">Cuenta creada. Revisa tu email para confirmarla y vuelve a entrar.</div>`; lg.disabled=false; lg.textContent="Entrar / crear cuenta"; }
    }catch(e){
      msg.innerHTML=`<p class="err">${(e&&e.message)||"No se pudo iniciar sesión."}</p>`; lg.disabled=false; lg.textContent="Entrar / crear cuenta";
    }
  };
}

function viewPerfil(el){
  const enVenta=store.garments.filter(g=>g.status==="venta");
  const valor=enVenta.reduce((s,g)=>s+resale(g.price,g.condition),0);
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;margin:10px 0 18px">
      <div style="width:56px;height:56px;border-radius:999px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800">P</div>
      <div><div style="font-weight:800;color:var(--ink);font-size:17px">Pepe Vilar</div><div class="meta">Barcelona</div></div>
    </div>
    <div class="stats">
      <div class="stat"><div class="n">${store.garments.length}</div><div class="l">Prendas</div></div>
      <div class="stat"><div class="n">${enVenta.length}</div><div class="l">En venta</div></div>
      <div class="stat"><div class="n">${valor}€</div><div class="l">Valor reventa</div></div>
    </div>
    ${authCard()}
    <div class="box eco">${svg('recycle',20)}<span>Dar segunda vida a tu ropa reduce residuo textil. Cada venta cuenta.</span></div>
    <div class="section-label">PRÓXIMAMENTE (v2)</div>
    ${["Red social: armarios de amigos y looks","Hazte la maleta para un viaje","Envío intraciudad con Glovo / Stuart"].map(t=>`<div class="soon">${svg('spark',16)}<span>${t}</span></div>`).join("")}`;
  bindAuth(el);
}
function viewVender(el){ go("armario"); }

/* ---------------- arranque + service worker ---------------- */
render();
initCloud();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

async function initCloud(){
  if(!cloud.cloudEnabled()) return;
  try{ session = await cloud.getSession(); }catch(e){ session=null; }
  cloud.onAuth(async (s)=>{ session=s; await syncFromCloud(); render(); });
  if(session) await syncFromCloud();
  render();
}
async function syncFromCloud(){
  if(!session) return;
  let rows = await cloud.pullGarments();
  if(rows && rows.length===0 && store.garments.length){
    // primera sincronización: subimos el armario local a la nube
    for(const g of store.garments){ await cloud.pushGarment(g, true); }
    rows = await cloud.pullGarments();
  }
  if(rows){ store.garments = rows.map(cloud.fromRow); save(); }
}

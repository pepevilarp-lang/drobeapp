import { mountWardrobe3D, unmountWardrobe3D, resetView } from './wardrobe3d.js';
import * as cloud from './lib/supabase.js';

let session = null;

/* ---------------- iconos ---------------- */
var I = {
  shirt:'M16 3.5l4 2.2v4.2l-2.8 1V20.5H6.8V10.9L4 9.9V5.7l4-2.2 4 2.6 4-2.6z',
  add:'M12 5v14M5 12h14', spark:'M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4z',
  chart:'M5 19V11M12 19V5M19 19v-5', user:'M12 12.5a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8zM5 19.5a7 7 0 0114 0',
  cam:'M4 8.5h3l1.8-2h6.4L17 8.5h3v10H4v-10zM12 13.5a3 3 0 100 .01',
  scan:'M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M4 16v2a2 2 0 002 2h2M20 16v2a2 2 0 01-2 2h-2M4 12h16',
  chev:'M9 6l6 6-6 6', back:'M15 6l-6 6 6 6', x:'M6 6l12 12M18 6L6 18', check:'M5 12.5l4.5 4.5L19 7',
  tag:'M4 4h7l9 9-7 7-9-9V4zM8 8h.01', load:'M12 3a9 9 0 109 9',
  sun:'M12 4v2M12 18v2M4 12H2M22 12h-2M6 6l-1.5-1.5M19.5 19.5L18 18M6 18l-1.5 1.5M19.5 4.5L18 6M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  bell:'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0',
  file:'M6 3h8l4 4v14H6zM14 3v4h4', shield:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  receipt:'M5 3h14v18l-2-1-2 1-2-1-2 1-2-1-2 1zM8 8h8M8 12h8', image:'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  qr:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 15h2v2h-2z', cube:'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9'
};
function svg(n,s,w){s=s||22;w=w||1.7;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round">'+(I[n].split('M').filter(Boolean).map(function(d){return '<path d="M'+d+'"/>'}).join(''))+'</svg>'}

/* ---------------- datos ---------------- */
var SEED = [
  {id:'s1',brand:'Silbon',name:'Camiseta Logo Raquetas',cat:'Camisetas',fit:'Regular Fit',color:'Blanco',colors:['Blanco','Marino'],material:'Algodón pima',size:'M',season:'Primavera/Verano',formality:'Casual',bought:'Abr 2024',store:'Silbon Diagonal',price:39.95,cond:'Buen estado',worn:9,lastWorn:'Hace 4 días',status:'uso',img:'./assets/silbon-raquetas-white.png',photos:[],docs:[],tags:['Básico','Tenis']},
  {id:'s2',brand:'Stone Island',name:'Jersey Punto Compass',cat:'Jerséis',fit:'Regular Fit',color:'Negro',colors:['Negro'],material:'Lana / algodón',size:'L',season:'Otoño/Invierno',formality:'Smart casual',bought:'Nov 2023',store:'El Corte Inglés',price:295,cond:'Como nuevo',worn:6,lastWorn:'Hace 2 semanas',status:'uso',img:'./assets/stoneisland-compass-black.png',photos:[],docs:[{type:'Ticket',icon:'receipt',name:'Ticket ECI nov-23.jpg',dt:'06 Nov 2023'},{type:'Garantía',icon:'shield',name:'Garantía 2 años.pdf',dt:'06 Nov 2023'}],tags:['Premium','Abrigo']},
  {id:'s3',brand:'Scalpers',name:'Camiseta Snake Skull',cat:'Camisetas',fit:'Regular Fit',color:'Gris',colors:['Gris','Mostaza'],material:'Algodón',size:'L',season:'Primavera/Verano',formality:'Casual',bought:'May 2024',store:'Scalpers.com',price:35.99,cond:'Buen estado',worn:12,lastWorn:'Hace 1 mes',status:'venta',img:'./assets/scalpers-snake-grey.png',photos:[],docs:[],tags:['Estampado']},
  {id:'s4',brand:'Pepe Jeans',name:'Camiseta Eggo',cat:'Camisetas',fit:'Slim Fit',color:'Gris',colors:['Gris'],material:'Algodón',size:'M',season:'Todo el año',formality:'Casual',bought:'Ene 2024',store:'Zalando',price:29.99,cond:'Como nuevo',worn:14,lastWorn:'Ayer',status:'uso',img:'./assets/pepe-eggo-grey.png',photos:[],docs:[],tags:['Diario']},
  {id:'s5',brand:'Stone Island',name:'Jersey Lana Crudo',cat:'Jerséis',fit:'Regular Fit',color:'Crudo',colors:['Crudo'],material:'Lana virgen',size:'L',season:'Otoño/Invierno',formality:'Smart casual',bought:'Dic 2022',store:'El Corte Inglés',price:320,cond:'Buen estado',worn:18,lastWorn:'Hace 3 días',status:'uso',img:'./assets/stoneisland-knit-cream.png',photos:[],docs:[],tags:['Premium','Invierno']},
  {id:'s6',brand:'Pepe Jeans',name:'Camiseta Eggo',cat:'Camisetas',fit:'Slim Fit',color:'Blanco',colors:['Blanco'],material:'Algodón',size:'M',season:'Todo el año',formality:'Casual',bought:'Sep 2023',store:'Zalando',price:29.99,cond:'Usado',worn:31,lastWorn:'Hoy',status:'uso',img:'./assets/pepe-eggo-white.png',photos:[],docs:[],tags:['Diario','Básico']},
  {id:'s7',brand:'Scalpers',name:'Camiseta Skull Animal Print',cat:'Camisetas',fit:'Regular Fit',color:'Blanco',colors:['Blanco','Mostaza'],material:'Algodón',size:'S',season:'Primavera/Verano',formality:'Casual',bought:'Jun 2024',store:'Scalpers.com',price:29.99,cond:'Como nuevo',worn:4,lastWorn:'Hace 2 meses',status:'uso',img:'./assets/scalpers-skull-white.png',photos:[],docs:[],tags:['Estampado']}
];
var WEATHER = {temp:17,label:'Nublado',city:'Barcelona'};
var cpw = function(g){return g.price/Math.max(g.worn,1)};

var KEY='drobe.v2';
var store = load();
function load(){try{var r=localStorage.getItem(KEY);if(r){var s=JSON.parse(r);if(s.garments)return s}}catch(e){}return {garments:JSON.parse(JSON.stringify(SEED))}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store))}catch(e){}}
function findG(id){return store.garments.find(function(g){return g.id==id})}
function addGarment(g){g.id=g.id||('g'+Date.now()+Math.floor(Math.random()*999));store.garments.unshift(g);save();if(session)cloud.pushGarment(g)}

/* ---------------- IA visión ---------------- */
function imageToBase64(file,maxDim){maxDim=maxDim||1280;return new Promise(function(res,rej){
  var url=URL.createObjectURL(file),im=new Image();
  im.onload=function(){URL.revokeObjectURL(url);
    var sc=Math.min(1,maxDim/Math.max(im.width,im.height));
    var w=Math.round(im.width*sc),h=Math.round(im.height*sc);
    var c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(im,0,0,w,h);
    var dataUrl=c.toDataURL('image/jpeg',0.85);
    res({media_type:'image/jpeg',data:dataUrl.split(',')[1],dataUrl:dataUrl});
  };im.onerror=rej;im.src=url;
})}
function callVision(system,user,image){
  return fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({system:system,user:user,image:image})})
    .then(function(r){if(!r.ok)throw 0;return r.json()})
    .then(function(d){return JSON.parse((d.text||'').replace(/```json|```/g,'').trim())})
    .catch(function(){return null});
}
function stars(c){var n=Math.round((c||0)*5),h='';for(var i=0;i<5;i++)h+='<span class="'+(i<n?'on':'off')+'">\u2605</span>';return '<span class="stars">'+h+'</span>'}

/* ---------------- router ---------------- */
var route='armario', mode='3d', filter='Todo', fichaId=null;
var app=document.getElementById('app');
function go(r){if(r!==route)unmountWardrobe3D();route=r;render();window.scrollTo(0,0)}
var TABS=[{k:'armario',i:'shirt',l:'Armario'},{k:'estilista',i:'spark',l:'Estilista'},{k:'add',i:'add',l:''},{k:'insights',i:'chart',l:'Insights'},{k:'perfil',i:'user',l:'Perfil'}];

function render(){
  app.innerHTML='<div class="shell"><div class="top"><div class="word">Dro<b>be</b></div><button class="ico">'+svg('bell',19)+'</button></div>'+
    '<main id="main" class="fade"></main>'+
    '<div class="nav"><div class="nav-in">'+TABS.map(function(t){var on=route===t.k,add=t.k==='add';
      return '<button data-t="'+t.k+'" class="'+(on?'on':'')+'">'+(add?'<span class="add">'+svg('add',22,2)+'</span>':svg(t.i,21)+'<span class="lbl">'+t.l+'</span>')+'</button>'}).join('')+'</div></div></div>';
  var m=document.getElementById('main');
  ({armario:vArmario,estilista:vEstilista,add:vAdd,insights:vInsights,perfil:vPerfil}[route]||vArmario)(m);
  Array.prototype.forEach.call(app.querySelectorAll('[data-t]'),function(b){b.onclick=function(){go(b.dataset.t)}});
  if(fichaId)renderFicha();
}

/* ---------------- ARMARIO ---------------- */
function vArmario(m){
  m.innerHTML='<div class="reveal"><div class="eyebrow">Tu vestidor</div>'+
    '<div class="title">Armario <span class="muted">\u00b7 '+store.garments.length+'</span></div></div>'+
    '<div style="margin-top:14px" class="reveal"><div class="viewseg">'+
      ['3d','grid'].map(function(x){return '<button data-mode="'+x+'" class="'+(mode===x?'on':'')+'">'+(x==='3d'?'Vestidor 3D':'Cuadr\u00edcula')+'</button>'}).join('')+'</div></div>'+
    '<div id="ward"></div>';
  Array.prototype.forEach.call(m.querySelectorAll('[data-mode]'),function(b){b.onclick=function(){if(mode!==b.dataset.mode){unmountWardrobe3D();mode=b.dataset.mode;vArmario(m);}}});
  var ward=m.querySelector('#ward');
  if(mode==='3d'){
    ward.innerHTML='<div class="stage3d" id="stage"><div class="hint">Arrastra para girar \u00b7 toca una prenda para acercarte</div></div>';
    var stage=ward.querySelector('#stage');
    try{ mountWardrobe3D(stage, store.garments, {onSelect:function(it){openFicha(it.id)}}); }
    catch(e){ ward.innerHTML='<div class="empty" style="padding-top:120px">Tu dispositivo no soporta 3D.<br>Usa la vista en cuadr\u00edcula.</div>'; }
  } else {
    var cats=['Todo','En venta'].concat(store.garments.reduce(function(a,g){if(a.indexOf(g.cat)<0)a.push(g.cat);return a},[]));
    var list=store.garments.filter(function(g){return filter==='Todo'?true:filter==='En venta'?g.status==='venta':g.cat===filter});
    ward.innerHTML='<div class="chips" style="margin-top:14px">'+cats.map(function(c){return '<button class="chip '+(filter===c?'on':'')+'" data-f="'+c+'">'+c+'</button>'}).join('')+'</div>'+
      '<div class="grid">'+list.map(function(g,i){return '<div class="gcard reveal" data-g="'+g.id+'" style="animation-delay:'+(i*0.04)+'s"><div class="ph"><img src="'+g.img+'"/>'+(g.status==='venta'?'<span class="tag sale">En venta</span>':'')+'</div><div class="cap"><div class="b">'+g.brand+'</div><div class="n">'+g.name+'</div><div class="m">'+g.fit+' \u00b7 '+g.color+'</div></div></div>'}).join('')+'</div>';
    Array.prototype.forEach.call(ward.querySelectorAll('[data-f]'),function(b){b.onclick=function(){filter=b.dataset.f;vArmario(m)}});
    Array.prototype.forEach.call(ward.querySelectorAll('[data-g]'),function(b){b.onclick=function(){openFicha(b.dataset.g)}});
  }
}

/* ---------------- FICHA full screen ---------------- */
function openFicha(id){fichaId=id;renderFicha()}
function closeFicha(){fichaId=null;var f=document.getElementById('ficha');if(f){f.style.animation='fade .25s var(--ease) reverse';setTimeout(function(){f.remove()},200)}if(route==='armario'&&mode==='3d')resetView()}
function compatList(g){
  return store.garments.filter(function(x){return x.id!==g.id}).map(function(x){
    var s=66;if(['Blanco','Negro','Gris','Crudo'].indexOf(x.color)>=0)s+=14;if(x.cat!==g.cat)s+=12;if(x.formality===g.formality)s+=6;
    return {g:x,pct:Math.min(s,98)};
  }).sort(function(a,b){return b.pct-a.pct}).slice(0,5);
}
function renderFicha(){
  var g=findG(fichaId);if(!g){fichaId=null;return}
  var old=document.getElementById('ficha');if(old)old.remove();
  var photos=[g.img].concat(g.photos||[]);
  var onSale=g.status==='venta';
  var el=document.createElement('div');el.className='ficha';el.id='ficha';
  el.innerHTML='<div class="ficha-hero"><button class="ficha-close" id="fclose">'+svg('back',20)+'</button>'+
      '<div class="track" id="track">'+photos.map(function(p){return '<img src="'+p+'"/>'}).join('')+'</div>'+
      (photos.length>1?'<div class="ficha-dots">'+photos.map(function(_,i){return '<i class="'+(i===0?'on':'')+'"></i>'}).join('')+'</div>':'')+'</div>'+
    '<div class="ficha-body">'+
      '<div class="ficha-b">'+g.brand+'</div><div class="ficha-n">'+g.name+'</div>'+
      '<div class="ficha-row">'+[g.fit,g.season,g.formality].filter(Boolean).map(function(p){return '<span class="pill">'+p+'</span>'}).join('')+
        '<span class="pill eco">'+cpw(g).toFixed(2)+' \u20ac/uso</span></div>'+
      '<div class="shead"><h2>Detalles</h2></div>'+
      '<div class="specs">'+
        spec('Tipo',g.cat)+spec('Corte',g.fit)+spec('Color',(g.colors||[g.color]).join(' \u00b7 '))+spec('Material',g.material)+
        spec('Talla',g.size||'\u2014')+spec('Estado',g.cond)+spec('Comprada',g.bought)+spec('Tienda',g.store||'\u2014')+
        spec('Precio',(g.price||0).toFixed(2)+' \u20ac')+spec('Veces usada',g.worn+'')+spec('\u00daltima vez',g.lastWorn||'\u2014')+spec('Coste por uso',cpw(g).toFixed(2)+' \u20ac',true)+
      '</div>'+
      '<div class="shead"><h2>Combina con</h2><span class="link">Ver looks</span></div>'+
      '<div class="compat">'+compatList(g).map(function(c){return '<div class="it" data-c="'+c.g.id+'"><div class="ph"><img src="'+c.g.img+'"/></div><div class="pct">'+c.pct+'%</div></div>'}).join('')+'</div>'+
      '<div class="shead"><h2>Documentaci\u00f3n</h2></div>'+
      (g.docs&&g.docs.length?g.docs.map(function(d){return '<div class="docrow"><span class="dico">'+svg(d.icon||'file',20)+'</span><div><div class="dn">'+d.type+'</div><div class="dt">'+d.name+' \u00b7 '+d.dt+'</div></div><span class="open">'+svg('chev',18)+'</span></div>'}).join(''):'<div class="sub" style="margin:-2px 0 10px">Sin documentos. Vincula el ticket o la garant\u00eda a esta prenda.</div>')+
      '<label class="docadd" for="docfile">'+svg('add',18)+' A\u00f1adir ticket, factura o garant\u00eda</label>'+
      '<input id="docfile" type="file" accept="image/*,application/pdf" hidden/>'+
      '<div style="height:14px"></div>'+
      '<button class="btn '+(onSale?'ghost':'dark')+'" id="sale" style="margin-bottom:10px">'+svg('tag',18)+(onSale?'Quitar de la venta':'Poner en venta \u00b7 sugerido '+Math.round(g.price*0.4)+' \u20ac')+'</button>'+
      '<button class="btn ghost" id="wear">'+svg('check',18)+'Marcar como usada hoy</button>'+
    '</div>';
  document.body.appendChild(el);
  el.querySelector('#fclose').onclick=closeFicha;
  var track=el.querySelector('#track'),dots=el.querySelectorAll('.ficha-dots i');
  if(track&&dots.length)track.onscroll=function(){var i=Math.round(track.scrollLeft/track.clientWidth);Array.prototype.forEach.call(dots,function(d,j){d.className=j===i?'on':''})};
  Array.prototype.forEach.call(el.querySelectorAll('[data-c]'),function(b){b.onclick=function(){openFicha(b.dataset.c)}});
  el.querySelector('#sale').onclick=function(){g.status=onSale?'uso':'venta';save();if(session)cloud.pushGarment(g);renderFicha();render()};
  el.querySelector('#wear').onclick=function(){g.worn++;g.lastWorn='Hoy';save();if(session)cloud.pushGarment(g);renderFicha();render()};
  el.querySelector('#docfile').addEventListener('change',function(ev){
    var f=ev.target.files&&ev.target.files[0];if(!f)return;
    var pdf=/pdf/.test(f.type);
    g.docs=g.docs||[];g.docs.push({type:pdf?'Factura / PDF':'Ticket',icon:pdf?'file':'receipt',name:f.name,dt:'Hoy',url:URL.createObjectURL(f)});
    save();renderFicha();
  });
}
function spec(l,v,eco){return '<div class="spec"><div class="l">'+l+'</div><div class="v'+(eco?' eco':'')+'">'+v+'</div></div>'}

/* ---------------- AÑADIR (visión) ---------------- */
var addMode='choose';
function vAdd(m){
  if(addMode==='choose'){
    m.innerHTML='<div class="reveal"><div class="eyebrow">A\u00f1adir</div><div class="title">Tu armario,<br>sin escribir nada</div>'+
      '<div class="sub">Una foto o el ticket. La IA detecta marca, corte, tejido, temporada y precio \u2014 y te dice cu\u00e1nto se f\u00eda de cada dato.</div></div>'+
      '<div style="margin-top:24px">'+
      '<label class="opt reveal" for="pf" style="animation-delay:.05s"><span class="ring">'+svg('cam',24)+'</span><div><div class="t1">Fotografiar prenda</div><div class="t2">Reconoce tipo, marca, corte y tejido</div></div><span class="arr">'+svg('chev',20)+'</span></label>'+
      '<input id="pf" type="file" accept="image/*" capture="environment" hidden/>'+
      '<label class="opt alt reveal" for="tf" style="animation-delay:.1s"><span class="ring">'+svg('scan',24)+'</span><div><div class="t1">Escanear ticket</div><div class="t2">Varias prendas, todas con su justificante</div></div><span class="arr">'+svg('chev',20)+'</span></label>'+
      '<input id="tf" type="file" accept="image/*" capture="environment" hidden/></div>'+
      '<div class="note reveal" style="margin-top:18px;animation-delay:.15s">'+svg('spark',18)+'<span>La IA solo cataloga lo que posees. Si no est\u00e1 segura de algo, te pregunta. Nunca inventa.</span></div>';
    m.querySelector('#pf').addEventListener('change',function(e){handleScan(m,e,'prenda')});
    m.querySelector('#tf').addEventListener('change',function(e){handleScan(m,e,'ticket')});
  }
}
function handleScan(m,e,kind){
  var f=e.target.files&&e.target.files[0];if(!f)return;
  addMode='scan';
  imageToBase64(f).then(function(img){
    m.innerHTML='<div class="backbar"><button id="b" style="color:var(--ink)">'+svg('back',20)+'</button><span class="t">'+(kind==='ticket'?'Leyendo ticket':'Reconociendo prenda')+'</span></div>'+
      '<div id="stage"><div class="skel preview"><img src="'+img.dataUrl+'"/><div class="shimmer"></div></div>'+
      '<div style="display:flex;align-items:center;gap:8px;justify-content:center;color:var(--ink2);font-size:14px;margin-top:18px">'+svg('load',18)+'<span id="st">Limpiando imagen\u2026</span></div></div>';
    m.querySelector('#b').onclick=function(){addMode='choose';vAdd(m)};
    m.querySelector('#st').previousElementSibling.classList.add('spin');
    var steps=kind==='ticket'?['Corrigiendo perspectiva\u2026','Leyendo tienda y fecha\u2026','Detectando prendas\u2026','Calculando confianza\u2026']:['Detectando prenda\u2026','Identificando marca y corte\u2026','Analizando tejido\u2026','Calculando confianza\u2026'];
    var si=0,iv=setInterval(function(){si++;var s=m.querySelector('#st');if(s&&steps[si])s.textContent=steps[si]},520);
    var sys,usr;
    if(kind==='ticket'){sys='Eres OCR documental + catalogador de moda. Lee el ticket de la imagen. Devuelve SOLO JSON sin markdown: {"store":string,"date":string,"total":number,"items":[{"name":string,"brand":string,"price":number,"category":string,"confidence":number}]}. confidence 0..1. No inventes; si un dato no se ve, baja confidence.';usr='Extrae las prendas del ticket.';}
    else{sys='Eres un catalogador de moda profesional. Analiza la prenda de la foto. Devuelve SOLO JSON sin markdown: {"brand":string,"name":string,"category":string,"fit":string,"color":string,"colors":string[],"material":string,"season":string,"formality":string,"confidence":{"brand":number,"name":number,"fit":number,"material":number}}. fit como Slim Fit/Regular Fit/Oversized/Boxy/etc. Todo en espanol. Nunca inventes: si dudas, baja la confianza de ese campo.';usr='Cataloga esta prenda con precision.';}
    callVision(sys,usr,img).then(function(r){clearInterval(iv);
      if(kind==='ticket')showTicket(m,r,img); else showPrenda(m,r,img);
    });
  });
}
function showPrenda(m,r,img){
  if(!r)r={brand:'Marca no detectada',name:'Camiseta',category:'Camisetas',fit:'Regular Fit',color:'\u2014',colors:['\u2014'],material:'Algod\u00f3n',season:'Todo el a\u00f1o',formality:'Casual',confidence:{brand:0.4,name:0.6,fit:0.55,material:0.5}};
  var c=r.confidence||{};
  var rows=[['Marca',r.brand,c.brand],['Prenda',r.name,c.name],['Tipo',r.category,0.9],['Corte',r.fit,c.fit],['Color',(r.colors||[r.color]).join(' \u00b7 '),0.85],['Material',r.material,c.material],['Temporada',r.season,0.8],['Formalidad',r.formality,0.8]];
  m.querySelector('#stage').innerHTML='<div class="note" style="margin-bottom:16px">'+svg('check',18)+'<span>Catalogado. Los datos con baja confianza est\u00e1n en naranja para que los revises.</span></div>'+
    rows.map(function(x,i){var cf=(x[2]==null?1:x[2]);var low=cf<0.6;return '<div class="conf'+(low?' low':'')+'" style="animation-delay:'+(i*0.05)+'s"><span class="k">'+x[0]+'</span>'+
      (low?'<span class="vv"><input value="'+(x[1]||'')+'" data-edit="'+i+'"/></span>':'<span class="vv">'+(x[1]||'\u2014')+'</span>')+
      stars(cf)+'<span class="confpct">'+Math.round(cf*100)+'%</span></div>'}).join('')+
    '<button class="btn dark" id="conf" style="margin-top:14px">'+svg('add',18,2)+'A\u00f1adir al armario</button>';
  m.querySelector('#conf').onclick=function(){
    var get=function(i,def){var inp=m.querySelector('[data-edit="'+i+'"]');return inp?inp.value:def};
    addGarment({brand:get(0,r.brand),name:get(1,r.name),cat:r.category,fit:get(3,r.fit),color:(r.colors&&r.colors[0])||r.color||'\u2014',colors:r.colors||[r.color||'\u2014'],material:get(5,r.material),size:'',season:r.season,formality:r.formality,bought:'Hoy',store:'',price:0,cond:'Como nuevo',worn:0,lastWorn:'\u2014',status:'uso',img:img.dataUrl,photos:[],docs:[],tags:[]});
    addMode='choose';go('armario');
  };
}
function showTicket(m,r,img){
  if(!r||!r.items)r={store:'Tienda',items:[{name:'Prenda',brand:'',price:0,category:'Camisetas',confidence:0.5}]};
  var doc={type:'Ticket',icon:'receipt',name:'Ticket '+(r.store||'')+'.jpg',dt:'Hoy',url:img.dataUrl};
  m.querySelector('#stage').innerHTML='<div class="note" style="margin-bottom:16px">'+svg('check',18)+'<span>'+(r.store||'Ticket')+(r.date?' \u00b7 '+r.date:'')+' \u00b7 '+r.items.length+' prenda(s). Todas quedar\u00e1n enlazadas a este ticket.</span></div>'+
    r.items.map(function(it,i){var low=(it.confidence||1)<0.6;return '<div class="conf'+(low?' low':'')+'" style="animation-delay:'+(i*0.06)+'s"><span class="k">'+(it.brand||'Prenda')+'</span><span class="vv">'+it.name+' \u00b7 '+(it.price||0)+' \u20ac</span>'+stars(it.confidence)+'</div>'}).join('')+
    '<button class="btn dark" id="conf" style="margin-top:14px">'+svg('add',18,2)+'A\u00f1adir '+r.items.length+' al armario</button>';
  m.querySelector('#conf').onclick=function(){
    r.items.forEach(function(it){addGarment({brand:it.brand||'\u2014',name:it.name,cat:it.category||'Camisetas',fit:'Regular Fit',color:'\u2014',colors:['\u2014'],material:'Algod\u00f3n',size:'',season:'Todo el a\u00f1o',formality:'Casual',bought:r.date||'Hoy',store:r.store||'',price:it.price||0,cond:'Nuevo con etiqueta',worn:0,lastWorn:'\u2014',status:'uso',img:'./assets/silbon-raquetas-white.png',photos:[],docs:[Object.assign({},doc)],tags:[]})});
    addMode='choose';go('armario');
  };
}

/* ---------------- ESTILISTA ---------------- */
var stylistMsg=null;
function pickOutfit(){var t=WEATHER.temp;var top=t<15?store.garments.find(function(g){return g.cat==='Jers\u00e9is'&&g.status==='uso'}):store.garments.find(function(g){return g.cat==='Camisetas'&&g.status==='uso'});var s=store.garments.find(function(g){return g.cat==='Camisetas'&&g.status==='uso'&&g!==top});return [top,s].filter(Boolean)}
function vEstilista(m){
  var intents=[['hoy','\u00bfQu\u00e9 me pongo hoy?'],['viaje','Hazme la maleta'],['muerta','\u00bfQu\u00e9 no uso?'],['vender','\u00bfQu\u00e9 vendo?'],['combina','\u00bfQu\u00e9 combina?']];
  m.innerHTML='<div class="reveal"><div class="eyebrow">Estilista</div><div class="title">Tu asesor<br>de imagen</div><div class="sub">Decisiones sobre la ropa que ya tienes. Nunca sobre la que no.</div></div>'+
    '<div class="intent reveal" style="animation-delay:.05s">'+intents.map(function(x){return '<button data-i="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
    '<div id="adv">'+advisorCard(stylistMsg||defaultAdvice())+'</div>';
  Array.prototype.forEach.call(m.querySelectorAll('[data-i]'),function(b){b.onclick=function(){var a=document.getElementById('adv');a.style.opacity=0;setTimeout(function(){stylistMsg=advice(b.dataset.i);a.innerHTML=advisorCard(stylistMsg);a.style.transition='opacity .4s var(--ease)';a.style.opacity=1;bindOutfit(a)},170)}});
  bindOutfit(document.getElementById('adv'));
}
function bindOutfit(s){Array.prototype.forEach.call(s.querySelectorAll('[data-o]'),function(b){b.onclick=function(){openFicha(b.dataset.o)}})}
function defaultAdvice(){return {say:'Con '+WEATHER.temp+'\u00b0 y cielo '+WEATHER.label.toLowerCase()+' en '+WEATHER.city+', algod\u00f3n limpio en neutros. Va contigo y con el d\u00eda.',items:pickOutfit()}}
function advice(k){var uso=store.garments.filter(function(g){return g.status==='uso'});
  if(k==='viaje')return {say:'Para 3 d\u00edas con este clima: dos camisetas neutras que combinan entre s\u00ed y una capa de punto por si refresca. Ligero y suficiente.',items:[uso.filter(function(g){return g.cat==='Camisetas'})[0],uso.filter(function(g){return g.cat==='Camisetas'})[1],uso.find(function(g){return g.cat==='Jers\u00e9is'})].filter(Boolean)};
  if(k==='muerta'){var d=store.garments.slice().sort(function(a,b){return a.worn-b.worn}).slice(0,3);return {say:'Estas apenas las tocas. O las rescatas en un look esta semana, o las pones en venta antes de que pierdan valor.',items:d}}
  if(k==='vender'){var s=store.garments.filter(function(g){return g.worn<8}).sort(function(a,b){return cpw(b)-cpw(a)}).slice(0,3);return {say:'Por coste por uso y poco uso, estas son las candidatas a vender. Recuperas valor sin tocar lo que usas a diario.',items:s}}
  if(k==='combina'){var si=store.garments.find(function(g){return g.brand==='Stone Island'});return {say:'El Compass negro pide debajo algo claro y liso: tu camiseta blanca juega perfecto. Contraste limpio, sin logos pele\u00e1ndose.',items:[si,store.garments.find(function(g){return g.color==='Blanco'})].filter(Boolean)}}
  return defaultAdvice();
}
function advisorCard(a){return '<div class="advisor"><div class="who"><div class="av">D</div><div class="nm">Estilista Drobe<span>Solo con tu armario</span></div></div><div class="say">'+a.say+'</div><div class="outfit">'+a.items.map(function(g){return '<div class="it" data-o="'+g.id+'"><div class="ph"><img src="'+g.img+'"/></div><div class="l">'+g.brand+'</div></div>'}).join('')+'</div></div>'}

/* ---------------- INSIGHTS ---------------- */
function vInsights(m){
  var total=store.garments.reduce(function(s,g){return s+g.price},0);
  var dead=store.garments.filter(function(g){return g.worn<=6});
  var byC={};store.garments.forEach(function(g){byC[g.color]=(byC[g.color]||0)+1});
  var ce=Object.keys(byC).map(function(k){return [k,byC[k]]}).sort(function(a,b){return b[1]-a[1]});
  var cm={'Blanco':'#E7E3DA','Gris':'#AEB4BA','Negro':'#1F2126','Crudo':'#E9DFC9'};
  var rk=store.garments.slice().sort(function(a,b){return cpw(b)-cpw(a)});
  m.innerHTML='<div class="reveal"><div class="eyebrow">Insights</div><div class="title">Tu armario,<br>en datos</div><div class="sub">Lo que amortizas, lo que duerme y de qu\u00e9 color abusas.</div></div>'+
    '<div class="row2 reveal" style="margin-top:18px;animation-delay:.05s"><div class="stat"><div class="n">'+Math.round(total)+' \u20ac</div><div class="l">Valor del armario</div></div><div class="stat"><div class="n">'+dead.length+'</div><div class="l">Prendas dormidas</div></div></div>'+
    '<div class="shead"><h2>Balance de color</h2></div><div class="reveal" style="animation-delay:.1s"><div class="bar">'+ce.map(function(c){return '<i style="width:'+(c[1]/store.garments.length*100)+'%;background:'+(cm[c[0]]||'#bbb')+'"></i>'}).join('')+'</div><div class="sub" style="margin-top:10px">Dominan '+ce[0][0].toLowerCase()+(ce[1]?' y '+ce[1][0].toLowerCase():'')+'. Un punto de color te dar\u00eda m\u00e1s combinaciones sin comprar de m\u00e1s.</div></div>'+
    '<div class="shead"><h2>Coste por uso</h2></div><div class="reveal" style="animation-delay:.15s">'+rk.map(function(g){return '<div class="cpw"><div class="ph"><img src="'+g.img+'"/></div><div><div class="nm">'+g.brand+' \u00b7 '+g.name+'</div><div class="mt">'+g.worn+' usos</div></div><div class="val"><div class="v" style="color:'+(cpw(g)>15?'var(--amber)':'var(--eco)')+'">'+cpw(g).toFixed(2)+' \u20ac</div><div class="s">por uso</div></div></div>'}).join('')+'</div>';
}

/* ---------------- PERFIL ---------------- */
function vPerfil(m){
  m.innerHTML='<div class="reveal"><div style="display:flex;align-items:center;gap:14px;margin:10px 0 22px"><div style="width:60px;height:60px;border-radius:999px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800">P</div><div><div style="font-size:19px;font-weight:700;letter-spacing:-.02em">Pepe Vilar</div><div class="sub" style="margin-top:2px">Barcelona \u00b7 '+store.garments.length+' prendas</div></div></div></div>'+
    '<div class="advisor reveal" style="animation-delay:.05s;margin-top:0"><div class="eyebrow">Tu estilo, aprendido</div><div class="say" style="margin-top:10px">Minimalista y de neutros. Algod\u00f3n limpio para el d\u00eda, punto premium cuando refresca. Cuidas la marca pero huyes del logo ruidoso.</div></div>'+
    '<div id="authslot"></div>'+
    '<div class="shead"><h2>Ajustes</h2></div>'+['Cuenta y sincronizaci\u00f3n','Notificaciones','Privacidad y datos','Acerca de Drobe'].map(function(t,i){return '<div class="opt reveal" style="animation-delay:'+(0.1+i*0.04)+'s;padding:15px 18px"><div class="t1" style="font-size:15px">'+t+'</div><span class="arr" style="margin-left:auto">'+svg('chev',20)+'</span></div>'}).join('');
  renderAuth(m.querySelector('#authslot'));
}
function renderAuth(slot){
  if(!slot)return;
  if(!cloud.cloudEnabled()){slot.innerHTML='<div class="note" style="margin-top:14px">'+svg('user',18)+'<span>Conecta Supabase en lib/supabase.js para guardar tu armario en la nube y entre dispositivos.</span></div>';return}
  if(session){slot.innerHTML='<div class="note" style="margin-top:14px;background:#EAF4EE;color:#2c6e4f">'+svg('check',18)+'<span>Sincronizado \u00b7 '+(session.user&&session.user.email||'')+'</span></div>';return}
  slot.innerHTML='<div style="margin-top:14px"><div class="field"><input id="em" type="email" placeholder="tu@email.com"/></div><div class="field"><input id="pw" type="password" placeholder="Contrase\u00f1a"/></div><div id="amsg"></div><button class="btn dark" id="lg">Entrar / crear cuenta</button></div>';
  slot.querySelector('#lg').onclick=function(){var em=slot.querySelector('#em').value.trim(),pw=slot.querySelector('#pw').value;if(!em||!pw){slot.querySelector('#amsg').innerHTML='<div class="sub" style="color:var(--danger);margin-bottom:8px">Email y contrase\u00f1a.</div>';return}
    this.disabled=true;this.textContent='Conectando\u2026';cloud.signInOrUp(em,pw).then(function(s){if(s){session=s;syncFromCloud().then(render)}else{slot.querySelector('#amsg').innerHTML='<div class="sub" style="margin-bottom:8px">Revisa tu email para confirmar la cuenta.</div>';render()}}).catch(function(e){slot.querySelector('#amsg').innerHTML='<div class="sub" style="color:var(--danger);margin-bottom:8px">'+((e&&e.message)||'No se pudo iniciar sesi\u00f3n.')+'</div>';render()})};
}

/* ---------------- cloud + arranque ---------------- */
render();
initCloud();
if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){})});
function initCloud(){if(!cloud.cloudEnabled())return;cloud.getSession().then(function(s){session=s;cloud.onAuth(function(ns){session=ns;syncFromCloud().then(render)});if(session)return syncFromCloud()}).then(render).catch(function(){})}
function syncFromCloud(){if(!session)return Promise.resolve();return cloud.pullGarments().then(function(rows){
  if(rows&&rows.length===0&&store.garments.length){return Promise.all(store.garments.map(function(g){return cloud.pushGarment(g,true)})).then(function(){return cloud.pullGarments()})}
  return rows;
}).then(function(rows){if(rows){store.garments=rows.map(function(r){var g=cloud.fromRow(r);g.cat=g.category||g.cat||'Camisetas';g.fit=g.fit||'Regular Fit';g.colors=g.colors||[g.color];g.docs=g.docs||[];g.photos=g.photos||[];return g});save()}})}

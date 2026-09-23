// Vercel Serverless Function - Búsqueda extensiva de ofertas
// Requiere SERPAPI_KEY en Vercel (100 búsquedas/mes gratis en serpapi.com)
// Hace búsqueda de la MISMA marca + ALTERNATIVAS más baratas similares.

module.exports = async function handler(req, res) {
  const key = process.env.SERPAPI_KEY;

  // MODO DIAGNÓSTICO: GET /api/shopping?debug=1&q=ecoalf pantalon
  if (req.method === 'GET') {
    if (!key) { res.status(200).json({ ok:false, reason:'SERPAPI_KEY no configurada' }); return; }
    const q = (req.query && req.query.q) || 'ecoalf pantalon lino azul';
    try {
      const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(q) + '&gl=es&hl=es&api_key=' + key;
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tm);
      const data = await r.json();
      res.status(200).json({
        ok: true, query: q, http_status: r.status,
        serpapi_error: data.error || null,
        results_count: (data.shopping_results || []).length,
        first_3: (data.shopping_results || []).slice(0,3).map(p => ({ title:p.title, price:p.price, source:p.source, link: p.product_link||p.link||null, thumb: !!p.thumbnail }))
      });
    } catch(e) { res.status(200).json({ ok:false, reason:e.message }); }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!key) { res.status(200).json({ available: false, reason: 'no_key' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  if (body && body.mode === 'tienda') { await tienda(body, key, res); return; }
  const query = (body && body.query) || '';
  const brand = (body && body.brand) || '';
  const productType = (body && body.productType) || ''; // "pantalón lino azul marino"
  const maxPrice = (body && body.maxPrice) || null;     // para filtrar alternativas más baratas
  const ownedBrands = (body && body.ownedBrands) || [];  // marcas que el usuario ya tiene, para priorizar
  const sex = (body && body.sex) || '';                  // para afinar (hombre/mujer)
  const channel = (body && body.channel) || 'new';       // 'new' tiendas | 'used' segunda mano
  const country = (body && body.country) || 'es';
  if (!query && !productType) { res.status(400).json({ error: 'Falta query' }); return; }

  // sufijo para segunda mano: Google Shopping indexa Vinted/Wallapop/Micolet
  const usedSuffix = channel === 'used' ? ' segunda mano (vinted OR wallapop OR micolet)' : '';

  async function serpSearch(q) {
    try {
      const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(q) + '&gl=' + country + '&hl=es&num=20&api_key=' + key;
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tm);
      const data = await r.json();
      if (data && data.error) { console.error('[shopping] SerpApi error:', data.error); lastError = data.error; }
      const n = (data && data.shopping_results) ? data.shopping_results.length : 0;
      console.log('[shopping] query:', q, '| results:', n, '| status:', r.status);
      return (data && data.shopping_results) || [];
    } catch(e) { console.error('[shopping] fetch fail:', e.message); lastError = e.message; return []; }
  }
  let lastError = null;

  function parsePrice(str){
    if(!str) return null;
    const m=String(str).replace(/\./g,'').replace(',','.').match(/(\d+(\.\d+)?)/);
    return m?parseFloat(m[1]):null;
  }
  // link directo a la TIENDA (no Google), si SerpApi ya lo trae
  function storeDirect(p){
    const cand = p.link || (p.merchant && p.merchant.link) || '';
    if(!cand) return null;
    return /google\.[^/]+\//i.test(cand) ? null : cand;
  }
  // mejor enlace disponible: tienda directa > ficha del producto en Google > búsqueda
  function bestLink(p){
    return storeDirect(p)
      || p.product_link
      || ('https://www.google.com/search?tbm=shop&q=' + encodeURIComponent([p.source,p.title].filter(Boolean).join(' ') || p.title || ''));
  }
  // 2ª llamada: resuelve el enlace directo del vendedor (va a la web de la tienda, sin 404)
  async function directSellerLink(productId){
    if(!productId) return null;
    try{
      const url = 'https://serpapi.com/search.json?engine=google_product&product_id=' + encodeURIComponent(productId) + '&gl=' + country + '&hl=es&api_key=' + key;
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tm);
      const d = await r.json();
      const sellers = (d.sellers_results && d.sellers_results.online_sellers) || [];
      if(!sellers.length) return null;
      sellers.sort((a,b)=>(parsePrice(a.total_price||a.base_price)||1e9)-(parsePrice(b.total_price||b.base_price)||1e9));
      const s = sellers.find(x=>x.link);
      return s ? s.link : null;
    }catch(e){ return null; }
  }
  // enriquece con enlace directo a tienda. Limita nº de 2ª llamadas para no quemar cuota.
  async function enrichDirect(items, maxCalls){
    let used = 0;
    for(const it of items){
      if(it._needsDirect && it._pid && used < maxCalls){
        used++;
        const dl = await directSellerLink(it._pid);
        if(dl) it.link = dl;
      }
      delete it._needsDirect; delete it._pid;
    }
  }
  function mapItem(p) {
    const pv = typeof p.extracted_price === 'number' ? p.extracted_price : parsePrice(p.price);
    const direct = storeDirect(p);
    return {
      title: p.title,
      price: p.price || (pv?pv+' €':null),
      price_value: pv,
      source: p.source || '',
      link: bestLink(p),
      thumbnail: p.thumbnail || '',
      rating: p.rating || null,
      reviews: p.reviews || null,
      _pid: p.product_id || null,
      _needsDirect: !direct  // si no hay link directo a tienda, intentaremos resolverlo
    };
  }

  try {
    // Construir queries progresivamente más simples
    const exactQuery = query || ((brand ? brand + ' ' : '') + productType);
    // Para marcas pequeñas, simplificar: quitar colores/adjetivos extra
    const simpleQuery = brand && productType ? brand + ' ' + productType : exactQuery;
    const altQuery = productType || query;
    const brandLC = (brand||'').toLowerCase();
    const qLC = (query||'').toLowerCase();

    // Detectar el TIPO de prenda principal de la búsqueda para no confundir
    // categorías parecidas (camisa vs camiseta, pantalón vs short, etc.)
    const TYPE_RULES = [
      {key:'camiseta', has:/camiseta|t-shirt|tee/, not:/camisa\b/},
      {key:'camisa',   has:/\bcamisa\b/,           not:/camiseta/},
      {key:'sudadera', has:/sudadera|hoodie/,      not:/camiseta/},
      {key:'jersey',   has:/jersey|punto|knit/,    not:/camiseta/},
      {key:'pantalon', has:/pantal[oó]n|vaquero|jean|chino/, not:/short|bermuda/},
      {key:'short',    has:/short|bermuda/,        not:/pantal[oó]n largo/},
      {key:'abrigo',   has:/abrigo|parka|plumífero|gabardina/, not:/camiseta/},
      {key:'chaqueta', has:/chaqueta|bomber|blazer|americana/, not:/camiseta/},
      {key:'zapato',   has:/zapato|sneaker|bota|zapatilla|deportiv/, not:/camiseta/},
      {key:'vestido',  has:/vestido/,              not:/camiseta/},
      {key:'falda',    has:/falda/,                not:/camiseta/}
    ];
    // ¿qué tipo buscó el usuario?
    const wantedType = TYPE_RULES.find(t => t.has.test(qLC) || t.has.test((altQuery||'').toLowerCase()));
    // ¿el producto coincide con el tipo buscado y NO es el tipo confundible?
    const matchesType = p => {
      if(!wantedType) return true; // sin tipo claro, no filtramos
      const t=(p.title||'').toLowerCase();
      return wantedType.has.test(t) && !wantedType.not.test(t);
    };

    // descartar precios irrisorios (ruido de marketplaces)
    const validPrice = p => !p.price_value || p.price_value >= 8;
    // pertenece a la marca buscada (en título o en source/tienda)
    const matchesBrand = p => brandLC && (
      (p.title||'').toLowerCase().includes(brandLC) ||
      (p.source||'').toLowerCase().includes(brandLC)
    );

    /* ═══ FILTROS DE INTELIGENCIA DE USUARIO ═══
       El corazón de Drobe es conocer al usuario: un hombre de 23 que viste
       Stone Island NUNCA debe ver ropa de mujer, de bebé, ni Shein. */
    const sexWord = /^h/i.test(sex) ? 'hombre' : /^m/i.test(sex) ? 'mujer' : '';
    const KIDS_RX = /\b(beb[eé]s?|infantil(es)?|ni[ñn][oa]s?|kids?|junior|boys?|girls?|newborn|toddler)\b/i;
    const WOMEN_RX = /\b(mujer(es)?|women|woman|femenin[ao]|se[ñn]ora|lad(y|ies)|chica)\b/i;
    const MEN_RX = /\b(hombres?|men|man\b|masculin[oa]|caballeros?|chico)\b/i;
    // tipos de prenda que delatan el sexo aunque el título no diga "mujer"/"hombre"
    const WOMEN_GARMENT_RX = /\b(vestidos?|faldas?|blusas?|bikinis?|sujetador(es)?|bralette|tangas?|camis[oó]n|tac[oó]n(es)?|bolsos? de mujer|pareos?|leotardos?|medias)\b/i;
    const MEN_GARMENT_RX = /\b(calzoncillos?|b[oó]xers?|corbatas?|pajaritas?)\b/i;
    const sexOk = p => {
      const t = (p.title||'');
      if (KIDS_RX.test(t)) return false;                       // adultos siempre
      if (sexWord === 'hombre' && (WOMEN_GARMENT_RX.test(t) || (WOMEN_RX.test(t) && !MEN_RX.test(t)))) return false;
      if (sexWord === 'mujer' && (MEN_GARMENT_RX.test(t) || (MEN_RX.test(t) && !WOMEN_RX.test(t)))) return false;
      return true;
    };
    // basura gráfica que este perfil de usuario jamás llevaría
    const UGLY_RX = /metralleta|ak-?47|pistol[as]|rifle|uzi|kalashnikov|marihuana|cannabis|weed\b|calaveras? gigante|gore|zombi/i;
    const tasteOk = p => !UGLY_RX.test(p.title||'');
    // suelo de precio relativo: quien gasta 60€/prenda no quiere camisetas de 6€
    const priceFloorOk = p => !avgPrice || !p.price_value || p.price_value >= Math.max(9, avgPrice*0.22);
    // tiendas de calidad conocidas: suben en el orden
    const GOOD_SRC = /zalando|corte ingl[eé]s|asos|about you|scalpers|massimo dutti|zara|mango|nike|adidas|spartoo|footdistrict|farfetch|end\.|mr ?porter|sn(ea)?kers|deporvillage|barrabes|wiggle|bikeinn|tradeinn|decathlon|oteros|sprinter/i;
    const qualityScore = p => (GOOD_SRC.test(p.source||'')?2:0) + (p.price_value?1:0);
    // segunda mano NUNCA se cuela en el canal "nuevo"
    const USED_RX = /vinted|wallapop|micolet|depop|milanuncios|vestiaire|segunda mano|seminuevo|usado|percentil|cash converters|vibbo|reciclad/i;
    const channelOk = p => channel === 'used' ? true : !(USED_RX.test(p.source||'') || USED_RX.test(p.title||''));
    // veto de segmento: quien compra Scalpers/Stone Island no compra Shein
    const avgPrice = Number((body && body.avgPrice) || 0);
    const JUNK_RX = /shein|temu|aliexpress|wish\b|banggood/i;                 // vetadas SIEMPRE
    const LOW_RX = /primark|lefties|kiabi|pepco/i;                            // vetadas si el usuario gasta
    const segmentOk = p => {
      const s = (p.source||'') + ' ' + (p.title||'');
      if (JUNK_RX.test(s)) return false;
      if (avgPrice >= 35 && LOW_RX.test(s)) return false;
      return true;
    };
    const smartOk = p => sexOk(p) && channelOk(p) && segmentOk(p) && tasteOk(p) && priceFloorOk(p);
    // el sexo va en TODAS las queries, no solo en la genérica
    const withSex = q => (sexWord && !/hombre|mujer|man|woman|men|women/i.test(q)) ? q + ' ' + sexWord : q;

    // BÚSQUEDA EXACTA: solo productos de LA MISMA marca
    let exact = [];
    if (brand) {
      let raw = await serpSearch(withSex(exactQuery));
      exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p) && smartOk(p));
      // si la query con color no da, reintentar con marca + tipo
      if (!exact.length && simpleQuery !== exactQuery) {
        raw = await serpSearch(withSex(simpleQuery));
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p) && smartOk(p));
      }
      // último intento: buscar solo la marca + primera palabra del tipo
      if (!exact.length && altQuery) {
        raw = await serpSearch(withSex(brand + ' ' + altQuery.split(' ')[0]));
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p) && smartOk(p));
      }
    } else {
      // sin marca: la query tal cual
      const raw = await serpSearch(withSex(exactQuery));
      exact = raw.map(mapItem).filter(p => p.title && validPrice(p) && matchesType(p) && smartOk(p));
    }
    exact.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));

    // Búsqueda 2: alternativas similares de otras marcas — SIEMPRE se ejecuta
    let alternatives = [];
    if (altQuery) {
      let genericQuery = altQuery.replace(new RegExp(brand || '', 'gi'), '').trim() || altQuery;
      // añadir sexo si no está ya en la query, para afinar (hombre/mujer)
      genericQuery = withSex(genericQuery).trim();

      const isOwned = p => ownedBrands.some(b => (p.title||'').toLowerCase().includes(String(b).toLowerCase()) || (p.source||'').toLowerCase().includes(String(b).toLowerCase()));
      const seen = new Set();
      const collected = [];

      // 1) PRIORIDAD: buscar explícitamente dentro de las marcas que el usuario YA usa.
      //    Esto es lo que evita recomendar marcas ajenas a su estilo.
      const brandsToTry = ownedBrands.slice(0, channel === 'used' ? 2 : 3);
      for (const b of brandsToTry) {
        const bq = `${b} ${genericQuery}${usedSuffix}`.trim();
        const raw = await serpSearch(bq);
        raw.map(mapItem)
          .filter(p => p.title && validPrice(p) && matchesType(p) && smartOk(p))
          .filter(p => (p.title||'').toLowerCase().includes(String(b).toLowerCase()) || (p.source||'').toLowerCase().includes(String(b).toLowerCase()))
          .forEach(p => { const k=(p.title||'')+p.price; if(!seen.has(k)){seen.add(k);collected.push(p);} });
      }

      // 2) Completar con búsqueda general SOLO si faltan resultados de sus marcas,
      //    y aun así excluir la marca de referencia y respetar tipo/precio.
      if (collected.length < 4) {
        const altRaw = await serpSearch((genericQuery + usedSuffix).trim());
        altRaw.map(mapItem)
          .filter(p => p.title && validPrice(p) && matchesType(p) && smartOk(p))
          .filter(p => !brandLC || !((p.title||'').toLowerCase().includes(brandLC) || (p.source||'').toLowerCase().includes(brandLC)))
          .filter(p => !maxPrice || !p.price_value || p.price_value < maxPrice)
          .forEach(p => { const k=(p.title||'')+p.price; if(!seen.has(k)){seen.add(k);collected.push(p);} });
      }

      alternatives = collected;
      alternatives.sort((a, b) => {
        const oa = isOwned(a) ? 0 : 1, ob = isOwned(b) ? 0 : 1;
        if (oa !== ob) return oa - ob;            // primero, marcas del usuario
        return (a.price_value || 1e9) - (b.price_value || 1e9);
      });
    }

    const exactOut = exact.slice(0, 5);
    const altOut = alternatives.slice(0, 5);
    // presupuesto de llamadas. En segunda mano los enlaces de marketplace ya son
    // directos, así que no gastamos llamadas extra resolviéndolos.
    if (channel === 'used') {
      // sin enrichDirect
    } else {
      const brandSearches = Math.min(ownedBrands.length, 3);
      await enrichDirect(exactOut, brandSearches >= 2 ? 2 : 3);
      await enrichDirect(altOut, brandSearches >= 2 ? 1 : 2);
    }

    res.status(200).json({
      available: true,
      exact: exactOut,
      alternatives: altOut,
      results: exactOut,
      debug: { serpapi_error: lastError, exact_found: exact.length, alt_found: alternatives.length }
    });
  } catch(e) {
    res.status(200).json({ available: false, reason: e.message });
  }
};


/* ═══════════════════════════════════════════════════════════════
   MODO TIENDA — «estoy en la tienda mirando unas Gazelle azules»

   El modo de arriba hacía hasta doce llamadas a SerpApi EN FILA (cada una con
   12 s de margen) y luego otras cinco para resolver enlaces: entre 8 y 40
   segundos con el usuario de pie en la tienda, y la cuota de 100 búsquedas al
   mes se iba en ocho escaneos. Además buscaba «Veja adidas gazelle azules»,
   mezclando marcas en la misma consulta.

   Aquí la app ya sabe qué es cada cosa (lib/modelos.js) y manda consultas
   hechas: la exacta y una por alternativa. Van TODAS a la vez, sin segunda
   ronda de enlaces, con 7 s de tope. Una búsqueda cuesta 1 + nº alternativas
   (máximo 4) llamadas, y la app no pide alternativas en vivo si ya las tiene
   en caché.
   ═══════════════════════════════════════════════════════════════ */
const sinAcentos = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const KIDS_RX = /\b(bebes?|infantil(es)?|ninos?|ninas?|kids?|junior|boys?|girls?|newborn|toddler|td|ps|gs)\b/;
const WOMEN_RX = /\b(mujer(es)?|women|womens|woman|femenin[ao]|senora|lad(y|ies)|chica)\b/;
const MEN_RX = /\b(hombres?|men|mens|man|masculin[oa]|caballeros?|chico)\b/;
const JUNK_RX = /shein|temu|aliexpress|wish\b|banggood/i;
const LOW_RX = /primark|lefties|kiabi|pepco/i;
const USED_RX = /vinted|wallapop|micolet|depop|milanuncios|vestiaire|segunda mano|seminuevo|usado|percentil|cash converters|vibbo|reciclad/i;
// Lo que sale al buscar unas zapatillas y no son unas zapatillas.
const NO_PRODUCTO_RX = /\b(cordones?|plantillas?|calcetines?|funda|llavero|spray|limpiador|kit de limpieza|caja|bolsa|pegatinas?|poster|miniatura|peluche|colgante|charms?|protector)\b/;

function parsePrecio(str) {
  if (!str) return null;
  const m = String(str).replace(/\./g, '').replace(',', '.').match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function serp(q, key, country) {
  const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(q) + '&gl=' + country + '&hl=es&num=20&api_key=' + key;
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const d = await r.json();
    if (d && d.error) return { error: d.error, items: [] };
    return { items: (d && d.shopping_results) || [] };
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : e.message, items: [] };
  } finally { clearTimeout(tm); }
}

function mapear(p) {
  const pv = typeof p.extracted_price === 'number' ? p.extracted_price : parsePrecio(p.price);
  const directo = p.link && !/google\.[^/]+\//i.test(p.link) ? p.link : '';
  return {
    title: p.title || '', price: p.price || (pv ? pv + ' €' : ''), price_value: pv,
    source: p.source || '', thumbnail: p.thumbnail || '',
    link: directo || p.product_link || ('https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(p.title || ''))
  };
}

function filtro({ requiere = [], colores = [], sexo = '', avgPrice = 0, usado = false }) {
  const req = requiere.map(sinAcentos).filter(Boolean);
  const cols = colores.map(sinAcentos).filter(Boolean);
  return it => {
    const t = sinAcentos(it.title), src = it.source || '';
    if (!it.title) return false;
    if (req.some(r => !(' ' + t + ' ').includes(' ' + r + ' '))) return false;   // tiene que ser ESE producto
    if (NO_PRODUCTO_RX.test(t)) return false;
    if (KIDS_RX.test(t)) return false;
    if (sexo === 'hombre' && WOMEN_RX.test(t) && !MEN_RX.test(t)) return false;
    if (sexo === 'mujer' && MEN_RX.test(t) && !WOMEN_RX.test(t)) return false;
    if (JUNK_RX.test(src + ' ' + it.title)) return false;
    if (avgPrice >= 35 && LOW_RX.test(src + ' ' + it.title)) return false;
    if (!usado && (USED_RX.test(src) || USED_RX.test(it.title))) return false;
    if (usado && !(USED_RX.test(src) || USED_RX.test(it.title))) return false;
    if (it.price_value != null && it.price_value < 8) return false;
    it.color_ok = !cols.length || cols.some(c => (' ' + t + ' ').includes(' ' + c + ' '));
    return true;
  };
}
const ordenar = (a, b) => (b.color_ok - a.color_ok) || ((a.price_value || 1e9) - (b.price_value || 1e9));
function dedup(list) {
  const vistos = new Set();
  return list.filter(it => { const k = sinAcentos(it.title) + '|' + it.price_value + '|' + sinAcentos(it.source); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

async function tienda(body, key, res) {
  const t0 = Date.now();
  const country = body.country || 'es';
  const sexo = /^h/i.test(body.sex || '') ? 'hombre' : /^m/i.test(body.sex || '') ? 'mujer' : '';
  const avgPrice = Number(body.avgPrice || 0);
  const exacta = body.exacta && String(body.exacta.q || '').slice(0, 120);
  const alts = (Array.isArray(body.alternativas) ? body.alternativas : []).slice(0, 3)
    .filter(a => a && a.q).map(a => ({ ...a, q: String(a.q).slice(0, 120) }));
  if (!exacta && !alts.length) { res.status(400).json({ error: 'Falta la consulta' }); return; }
  const conSexo = q => (sexo && !/hombre|mujer|\bmen\b|women/i.test(q)) ? q + ' ' + sexo : q;

  const trabajos = [];
  if (exacta) trabajos.push(serp(conSexo(exacta), key, country));
  alts.forEach(a => trabajos.push(serp(conSexo(a.q), key, country)));
  if (exacta && body.usados) trabajos.push(serp(exacta + ' segunda mano', key, country));
  const r = await Promise.all(trabajos);

  let i = 0;
  const errores = [];
  const out = { available: true, exacta: [], alternativas: {}, usados: [] };
  if (exacta) {
    const x = r[i++]; if (x.error) errores.push(x.error);
    out.exacta = dedup(x.items.map(mapear).filter(filtro({ ...body.exacta, sexo, avgPrice }))).sort(ordenar).slice(0, 6);
  }
  alts.forEach(a => {
    const x = r[i++]; if (x.error) errores.push(x.error);
    out.alternativas[a.id] = dedup(x.items.map(mapear).filter(filtro({ ...a, sexo, avgPrice }))).sort(ordenar).slice(0, 2);
  });
  if (exacta && body.usados) {
    const x = r[i++]; if (x.error) errores.push(x.error);
    out.usados = dedup(x.items.map(mapear).filter(filtro({ ...body.exacta, sexo, avgPrice, usado: true }))).sort(ordenar).slice(0, 3);
  }
  out.ms = Date.now() - t0;
  if (errores.length) out.errores = [...new Set(errores)];
  res.status(200).json(out);
}
module.exports._tienda = { filtro, sinAcentos, mapear };

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

    // BÚSQUEDA EXACTA: solo productos de LA MISMA marca
    let exact = [];
    if (brand) {
      let raw = await serpSearch(exactQuery);
      exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p));
      // si la query con color no da, reintentar con marca + tipo
      if (!exact.length && simpleQuery !== exactQuery) {
        raw = await serpSearch(simpleQuery);
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p));
      }
      // último intento: buscar solo la marca + primera palabra del tipo
      if (!exact.length && altQuery) {
        raw = await serpSearch(brand + ' ' + altQuery.split(' ')[0]);
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p) && matchesType(p));
      }
    } else {
      // sin marca: la query tal cual
      const raw = await serpSearch(exactQuery);
      exact = raw.map(mapItem).filter(p => p.title && validPrice(p) && matchesType(p));
    }
    exact.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));

    // Búsqueda 2: alternativas similares de otras marcas — SIEMPRE se ejecuta
    let alternatives = [];
    if (altQuery) {
      let genericQuery = altQuery.replace(new RegExp(brand || '', 'gi'), '').trim() || altQuery;
      // añadir sexo si no está ya en la query, para afinar (hombre/mujer)
      const sexWord = /^h/i.test(sex)?'hombre':/^m/i.test(sex)?'mujer':'';
      if(sexWord && !/hombre|mujer|man|woman|men|women/i.test(genericQuery)) genericQuery += ' ' + sexWord;
      genericQuery = genericQuery.trim();

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
          .filter(p => p.title && validPrice(p) && matchesType(p))
          .filter(p => (p.title||'').toLowerCase().includes(String(b).toLowerCase()) || (p.source||'').toLowerCase().includes(String(b).toLowerCase()))
          .forEach(p => { const k=(p.title||'')+p.price; if(!seen.has(k)){seen.add(k);collected.push(p);} });
      }

      // 2) Completar con búsqueda general SOLO si faltan resultados de sus marcas,
      //    y aun así excluir la marca de referencia y respetar tipo/precio.
      if (collected.length < 4) {
        const altRaw = await serpSearch((genericQuery + usedSuffix).trim());
        altRaw.map(mapItem)
          .filter(p => p.title && validPrice(p) && matchesType(p))
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

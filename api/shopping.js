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
      const r = await fetch(url);
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
  const country = (body && body.country) || 'es';
  if (!query && !productType) { res.status(400).json({ error: 'Falta query' }); return; }

  async function serpSearch(q) {
    try {
      const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(q) + '&gl=' + country + '&hl=es&num=20&api_key=' + key;
      const r = await fetch(url);
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
  function bestLink(p){
    // 1) link directo a la tienda (no la URL interna de Google que caduca)
    const direct = p.link || (p.merchant && p.merchant.link) || '';
    const isGoogleInternal = /google\.[^/]+\/(shopping|search|aclk|url)/i.test(direct) || /google\.[^/]+\/.*prds=/i.test(direct);
    if(direct && !isGoogleInternal) return direct;
    // 2) fallback: búsqueda de Google Shopping por título (siempre resuelve)
    const q = [p.source, p.title].filter(Boolean).join(' ');
    return 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(q || p.title || '');
  }
  function mapItem(p) {
    const pv = typeof p.extracted_price === 'number' ? p.extracted_price : parsePrice(p.price);
    return {
      title: p.title,
      price: p.price || (pv?pv+' €':null),
      price_value: pv,
      source: p.source || '',
      link: bestLink(p),
      thumbnail: p.thumbnail || '',
      rating: p.rating || null,
      reviews: p.reviews || null
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
      const genericQuery = altQuery.replace(new RegExp(brand || '', 'gi'), '').trim() || altQuery;
      const altRaw = await serpSearch(genericQuery);
      const isOwned = p => ownedBrands.some(b => (p.title||'').toLowerCase().includes(String(b).toLowerCase()) || (p.source||'').toLowerCase().includes(String(b).toLowerCase()));
      const baseAlt = altRaw.map(mapItem)
        .filter(p => p.title && validPrice(p) && matchesType(p))
        .filter(p => !brandLC || !( (p.title||'').toLowerCase().includes(brandLC) || (p.source||'').toLowerCase().includes(brandLC) ));
      // preferir más baratas que la de referencia
      alternatives = baseAlt.filter(p => !maxPrice || !p.price_value || p.price_value < maxPrice * 0.95);
      if (!alternatives.length) alternatives = baseAlt;
      alternatives.sort((a, b) => {
        const oa = isOwned(a) ? 0 : 1, ob = isOwned(b) ? 0 : 1;
        if (oa !== ob) return oa - ob;
        return (a.price_value || 1e9) - (b.price_value || 1e9);
      });
    }

    res.status(200).json({
      available: true,
      exact: exact.slice(0, 5),
      alternatives: alternatives.slice(0, 5),
      results: exact.slice(0, 5),
      debug: { serpapi_error: lastError, exact_found: exact.length, alt_found: alternatives.length }
    });
  } catch(e) {
    res.status(200).json({ available: false, reason: e.message });
  }
};

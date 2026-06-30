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
  function mapItem(p) {
    const pv = typeof p.extracted_price === 'number' ? p.extracted_price : parsePrice(p.price);
    return {
      title: p.title,
      price: p.price || (pv?pv+' €':null),
      price_value: pv,
      source: p.source || '',
      link: p.product_link || p.link || '',
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

    // descartar precios irrisorios (ruido de marketplaces) — menos de 8€ en ropa = sospechoso
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
      exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p));
      // si la query con color no da, reintentar con marca + tipo
      if (!exact.length && simpleQuery !== exactQuery) {
        raw = await serpSearch(simpleQuery);
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p));
      }
      // último intento: buscar solo la marca + primera palabra del tipo
      if (!exact.length && altQuery) {
        raw = await serpSearch(brand + ' ' + altQuery.split(' ')[0]);
        exact = raw.map(mapItem).filter(p => p.title && matchesBrand(p) && validPrice(p));
      }
    } else {
      // sin marca: la query tal cual
      const raw = await serpSearch(exactQuery);
      exact = raw.map(mapItem).filter(p => p.title && validPrice(p));
    }
    exact.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));

    // Búsqueda 2: alternativas similares de otras marcas — SIEMPRE se ejecuta
    let alternatives = [];
    if (altQuery) {
      const genericQuery = altQuery.replace(new RegExp(brand || '', 'gi'), '').trim() || altQuery;
      const altRaw = await serpSearch(genericQuery);
      const isOwned = p => ownedBrands.some(b => (p.title||'').toLowerCase().includes(String(b).toLowerCase()) || (p.source||'').toLowerCase().includes(String(b).toLowerCase()));
      const baseAlt = altRaw.map(mapItem)
        .filter(p => p.title && validPrice(p))
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

// Vercel Serverless Function - Búsqueda extensiva de ofertas
// Requiere SERPAPI_KEY en Vercel (100 búsquedas/mes gratis en serpapi.com)
// Hace búsqueda de la MISMA marca + ALTERNATIVAS más baratas similares.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.SERPAPI_KEY;
  if (!key) { res.status(200).json({ available: false, reason: 'no_key' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  const query = (body && body.query) || '';
  const brand = (body && body.brand) || '';
  const productType = (body && body.productType) || ''; // "pantalón lino azul marino"
  const maxPrice = (body && body.maxPrice) || null;     // para filtrar alternativas más baratas
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

  function mapItem(p) {
    return {
      title: p.title,
      price: p.price || null,
      price_value: typeof p.extracted_price === 'number' ? p.extracted_price : null,
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

    // Búsqueda 1: query exacta
    let exactRaw = await serpSearch(exactQuery);
    let exact = exactRaw.map(mapItem).filter(p => p.title && p.price_value);

    // Fallback 1: query simplificada (marca + tipo)
    if (!exact.length && simpleQuery !== exactQuery) {
      exactRaw = await serpSearch(simpleQuery);
      exact = exactRaw.map(mapItem).filter(p => p.title && p.price_value);
    }
    // Fallback 2: solo el tipo de prenda con marca
    if (!exact.length && brand && altQuery) {
      exactRaw = await serpSearch(brand + ' ' + altQuery.split(' ').slice(0,2).join(' '));
      exact = exactRaw.map(mapItem).filter(p => p.title && p.price_value);
    }
    exact.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));

    // Búsqueda 2: alternativas similares de otras marcas — SIEMPRE se ejecuta
    let alternatives = [];
    if (altQuery) {
      // Buscar versión genérica del producto (sin marca)
      const genericQuery = altQuery.replace(new RegExp(brand || '', 'gi'), '').trim() || altQuery;
      const altRaw = await serpSearch(genericQuery);
      alternatives = altRaw.map(mapItem)
        .filter(p => p.title && p.price_value)
        .filter(p => !brand || !((p.title||'').toLowerCase().includes((brand||'').toLowerCase())))
        .filter(p => !maxPrice || p.price_value < maxPrice * 0.95); // al menos 5% más barato
      alternatives.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));
      // Si no hay alternativas más baratas, mostrar las más baratas sin filtro de precio
      if (!alternatives.length) {
        alternatives = altRaw.map(mapItem)
          .filter(p => p.title && p.price_value)
          .filter(p => !brand || !((p.title||'').toLowerCase().includes((brand||'').toLowerCase())));
        alternatives.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));
      }
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

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
      return (data && data.shopping_results) || [];
    } catch(e) { return []; }
  }

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
    // 1) Búsqueda de la MISMA marca/producto exacto
    const exactQuery = query || ((brand ? brand + ' ' : '') + productType);
    let exactRaw = await serpSearch(exactQuery);
    let exact = exactRaw.map(mapItem).filter(p => p.title && p.price_value);
    // Fallback: si con marca no hay nada, buscar solo por tipo de producto
    if (!exact.length && productType && exactQuery !== productType) {
      exactRaw = await serpSearch(productType);
      exact = exactRaw.map(mapItem).filter(p => p.title && p.price_value);
    }
    exact.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));

    // 2) Búsqueda de ALTERNATIVAS similares (por tipo, otras marcas, más baratas)
    let alternatives = [];
    const altQuery = productType || query;
    if (altQuery) {
      const altRaw = await serpSearch(altQuery);
      alternatives = altRaw.map(mapItem)
        .filter(p => p.title && p.price_value)
        .filter(p => !brand || !((p.title || '').toLowerCase().includes(brand.toLowerCase())))
        .filter(p => !maxPrice || p.price_value < maxPrice);
      alternatives.sort((a, b) => (a.price_value || 1e9) - (b.price_value || 1e9));
    }

    res.status(200).json({
      available: true,
      exact: exact.slice(0, 6),
      alternatives: alternatives.slice(0, 6),
      results: exact.slice(0, 6)
    });
  } catch(e) {
    res.status(200).json({ available: false, reason: e.message });
  }
};

// Vercel Serverless Function · POST /api/shopping
// Busca ofertas reales de una prenda vía SerpApi (Google Shopping).
// Es OPCIONAL: si no hay SERPAPI_KEY, devuelve {available:false} y la app
// sigue funcionando sin precios (nunca inventa ofertas).
//
// Para activarlo:
//   1. Crea cuenta gratis en serpapi.com (100 búsquedas/mes gratis)
//   2. Vercel → Settings → Environment Variables → SERPAPI_KEY = tu_key
//
// Body: { query: "Ecoalf parka verde", country?: "es" }
// Respuesta: { available:true, results:[{title,price,source,link,thumbnail}] }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = process.env.SERPAPI_KEY;
  if (!key) { res.status(200).json({ available: false, reason: 'no_key' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { query, country = 'es' } = body || {};
  if (!query) { res.status(400).json({ error: 'Falta query' }); return; }

  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=${country}&hl=es&api_key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    const list = (data.shopping_results || []).slice(0, 6).map(p => ({
      title: p.title,
      price: p.price || null,
      price_value: p.extracted_price ?? null,
      source: p.source || '',
      link: p.product_link || p.link || '',
      thumbnail: p.thumbnail || ''
    })).filter(p => p.title);
    // ordenar por precio asc cuando exista
    list.sort((a, b) => (a.price_value ?? 1e9) - (b.price_value ?? 1e9));
    res.status(200).json({ available: true, results: list });
  } catch (e) {
    res.status(200).json({ available: false, reason: String(e) });
  }
}

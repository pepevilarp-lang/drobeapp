// Vercel Serverless Function - CommonJS
// Requiere: SERPAPI_KEY en Vercel (opcional - 100 búsquedas/mes gratis en serpapi.com)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = process.env.SERPAPI_KEY;
  if (!key) { res.status(200).json({ available: false, reason: 'no_key' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  const query = (body && body.query) || '';
  const country = (body && body.country) || 'es';
  if (!query) { res.status(400).json({ error: 'Falta query' }); return; }

  try {
    const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(query) + '&gl=' + country + '&hl=es&api_key=' + key;
    const r = await fetch(url);
    const data = await r.json();
    const list = ((data && data.shopping_results) || []).slice(0, 6).map(function(p) {
      return { title: p.title, price: p.price || null, price_value: p.extracted_price || null, source: p.source || '', link: p.product_link || p.link || '', thumbnail: p.thumbnail || '' };
    }).filter(function(p) { return p.title; });
    list.sort(function(a, b) { return ((a.price_value || 1e9) - (b.price_value || 1e9)); });
    res.status(200).json({ available: true, results: list });
  } catch(e) {
    res.status(200).json({ available: false, reason: e.message });
  }
};

// Diagnóstico de SerpApi · GET /api/shoptest
// Abre en el navegador: /api/shoptest?q=ecoalf pantalon lino
module.exports = async function handler(req, res) {
  const key = process.env.SERPAPI_KEY;
  if (!key) { res.status(200).json({ ok:false, reason:'SERPAPI_KEY no configurada en Vercel' }); return; }
  const q = (req.query && req.query.q) || 'ecoalf pantalon lino';
  try {
    const url = 'https://serpapi.com/search.json?engine=google_shopping&q=' + encodeURIComponent(q) + '&gl=es&hl=es&api_key=' + key;
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json({
      ok: true,
      query: q,
      http_status: r.status,
      serpapi_error: data.error || null,
      results_count: (data.shopping_results || []).length,
      plan: data.search_metadata ? data.search_metadata.status : null,
      first_3: (data.shopping_results || []).slice(0,3).map(p => ({ title:p.title, price:p.price, source:p.source, has_link: !!(p.product_link||p.link), has_thumb: !!p.thumbnail }))
    });
  } catch(e) {
    res.status(200).json({ ok:false, reason: e.message });
  }
};

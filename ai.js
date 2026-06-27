// Vercel Serverless Function · POST /api/ai
// Soporta texto y VISIÓN (reconocimiento de prenda / ticket por foto).
// Body: { system, user, image? }  image = { media_type, data(base64 sin prefijo) }
// La API key vive solo en el servidor (env ANTHROPIC_API_KEY).

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { system, user, image } = body || {};
  if (!user && !image) { res.status(400).json({ error: 'Falta contenido' }); return; }

  // Con imagen usamos un modelo con buena visión; solo texto, uno más barato.
  const model = image ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  const content = [];
  if (image && image.data) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.media_type || 'image/jpeg', data: image.data } });
  }
  content.push({ type: 'text', text: user || '' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 1500, system: system || '', messages: [{ role: 'user', content }] })
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.error?.message || 'Error IA' }); return; }
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

// Vercel Serverless Function · POST /api/ai
// Usa GROQ (gratis) para texto y visión. La key vive solo en el servidor.
// Body: { system, user, image? }  image = { media_type, data(base64 sin prefijo) }
//
// Activar: console.groq.com → API Keys → crear → en Vercel añade GROQ_API_KEY.

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.GROQ_API_KEY;
  if (!key) { res.status(500).json({ error: 'Falta GROQ_API_KEY' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { system, user, image } = body || {};
  if (!user && !image) { res.status(400).json({ error: 'Falta contenido' }); return; }

  // Modelos Groq (gratis). Visión: Llama 4 Scout. Texto: Llama 3.3 70B.
  const model = image ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

  // Groq usa el formato OpenAI-compatible.
  const content = [];
  if (image && image.data) {
    content.push({ type: 'image_url', image_url: { url: `data:${image.media_type || 'image/jpeg'};base64,${image.data}` } });
  }
  content.push({ type: 'text', text: user || '' });

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: image ? content : (user || '') });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.2, messages })
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.error?.message || 'Error IA' }); return; }
    const text = data?.choices?.[0]?.message?.content || '';
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

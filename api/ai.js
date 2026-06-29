// Vercel Serverless Function · POST /api/ai
// Usa GROQ (gratis). Key: GROQ_API_KEY en Vercel Environment Variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error('[ai] GROQ_API_KEY no encontrada en env');
    res.status(500).json({ error: 'GROQ_API_KEY no configurada en Vercel' }); return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { system, user, image } = body || {};
  if (!user && !image) { res.status(400).json({ error: 'Falta contenido' }); return; }

  const hasImage = !!(image && image.data);
  // Modelos Groq vigentes (jun 2026)
  const model = hasImage
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'llama-3.3-70b-versatile';

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${image.media_type||'image/jpeg'};base64,${image.data}` } },
        { type: 'text', text: user || '' }
      ]
    : (user || '');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  console.log('[ai] model:', model, '| image:', hasImage, '| user length:', (user||'').length);

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.2, messages })
    });

    const data = await r.json();
    console.log('[ai] groq status:', r.status, '| error:', data?.error?.message || 'none');

    if (!r.ok) {
      res.status(r.status).json({ error: data?.error?.message || 'Error de Groq' }); return;
    }

    const text = data?.choices?.[0]?.message?.content || '';
    res.status(200).json({ text });
  } catch (e) {
    console.error('[ai] fetch error:', e.message);
    res.status(500).json({ error: String(e) });
  }
}

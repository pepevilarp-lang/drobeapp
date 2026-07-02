// Vercel Serverless Function - CommonJS para máxima compatibilidad
// Requiere: GROQ_API_KEY en Vercel Environment Variables

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error('[ai] GROQ_API_KEY no encontrada');
    res.status(500).json({ error: 'GROQ_API_KEY no configurada' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  }

  const { system, user, image } = body || {};
  if (!user && !image) {
    res.status(400).json({ error: 'Falta contenido' });
    return;
  }

  const hasImage = !!(image && image.data);
  const model = hasImage
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'llama-3.3-70b-versatile';

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: 'data:' + (image.media_type || 'image/jpeg') + ';base64,' + image.data } },
        { type: 'text', text: user || '' }
      ]
    : (user || '');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  console.log('[ai] model:', model, 'hasImage:', hasImage);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      signal: ctrl.signal,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500,
        temperature: 0.2,
        messages: messages
      })
    });

    clearTimeout(timer);
    const data = await response.json();
    console.log('[ai] status:', response.status, 'error:', data && data.error ? data.error.message : 'none');

    if (!response.ok) {
      res.status(response.status).json({ error: (data && data.error && data.error.message) || 'Error de Groq' });
      return;
    }

    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    res.status(200).json({ text: text });

  } catch(e) {
    console.error('[ai] error:', e.message);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
};

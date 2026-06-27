// Vercel Serverless Function · POST /api/ai
// La API key vive SOLO en el servidor (variable de entorno ANTHROPIC_API_KEY).
// El cliente envía { system, user } y recibe { text }.
//
// Para usar Groq en lugar de Anthropic: cambia URL, headers y el body al formato
// OpenAI-compatible de Groq, y usa la env GROQ_API_KEY.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en las variables de entorno' });
    return;
  }

  // Vercel ya parsea el body JSON; por si acaso, soportamos string.
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { system, user } = body || {};
  if (!user) { res.status(400).json({ error: 'Falta "user"' }); return; }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // rápido y barato para parsing/estilismo
        max_tokens: 1000,
        system: system || '',
        messages: [{ role: 'user', content: user }]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: data?.error?.message || 'Error del proveedor de IA' });
      return;
    }
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

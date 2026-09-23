// Vercel Serverless Function - CommonJS para máxima compatibilidad
// Requiere: GROQ_API_KEY en Vercel Environment Variables
// Opcional: GROQ_VISION_MODEL y GROQ_TEXT_MODEL para cambiar de modelo sin tocar código.

/* LOS MODELOS SE MUEREN. Groq apagó `meta-llama/llama-4-scout-17b-16e-instruct`
   el 17 de julio de 2026 y este fichero lo tenía escrito a fuego: desde ese día
   toda foto de prenda, de ticket y de tienda volvía con error, y la app decía
   «no pude analizarla» sin que nadie supiera por qué.

   Ahora hay una lista por orden de preferencia. Si Groq responde que un modelo
   no existe o está retirado, se prueba el siguiente en la misma petición, y el
   motivo queda en el log de Vercel. Para cambiar de modelo basta con la
   variable de entorno; no hace falta desplegar. Lista vigente de Groq:
   https://console.groq.com/docs/vision y /docs/deprecations */
const VISION = [process.env.GROQ_VISION_MODEL, 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'].filter(Boolean);
const TEXTO = [process.env.GROQ_TEXT_MODEL, 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b'].filter(Boolean);

// El error que significa «este modelo ya no está», no «tu petición está mal».
const MODELO_MUERTO = /decommission|deprecat|not found|does not exist|no such model|model_not_found|unknown model|not supported/i;

// Opciones que dependen del modelo. Los Qwen piensan en voz alta por defecto
// (<think>…</think> delante del JSON) y tardan más: aquí se les pide que no.
function opciones(model, quiereJSON, minimo) {
  const o = {};
  if (minimo) return o;
  if (/qwen/i.test(model)) { o.reasoning_effort = 'none'; o.reasoning_format = 'hidden'; }
  if (/gpt-oss/i.test(model)) o.reasoning_effort = 'low';
  if (quiereJSON) o.response_format = { type: 'json_object' };
  return o;
}

async function llamar(key, model, messages, quiereJSON, minimo) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      signal: ctrl.signal,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.2, messages, ...opciones(model, quiereJSON, minimo) })
    });
    const data = await r.json().catch(() => ({}));
    const msg = (data && data.error && data.error.message) || '';
    return { ok: r.ok, status: r.status, data, msg };
  } finally { clearTimeout(timer); }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error('[ai] GROQ_API_KEY no encontrada');
    res.status(500).json({ error: 'GROQ_API_KEY no configurada' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const { system, user, image } = body || {};
  if (!user && !image) { res.status(400).json({ error: 'Falta contenido' }); return; }

  const hasImage = !!(image && image.data);
  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: 'data:' + (image.media_type || 'image/jpeg') + ';base64,' + image.data } },
        { type: 'text', text: user || '' }
      ]
    : (user || '');
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  // Todos los prompts de la app piden JSON. El modo JSON de Groq lo garantiza,
  // y exige que la palabra «JSON» aparezca en el mensaje: si no está, no se pide.
  const quiereJSON = /json/i.test((system || '') + ' ' + (typeof user === 'string' ? user : ''));

  const candidatos = hasImage ? VISION : TEXTO;
  const fallos = [];
  try {
    for (const model of candidatos) {
      let r = await llamar(key, model, messages, quiereJSON);
      // Si el modelo rechaza alguna opción (modo JSON, razonamiento), se
      // reintenta una vez con la petición mínima. La app limpia el <think> y
      // extrae el JSON ella misma, así que funciona igual, solo algo peor.
      if (!r.ok && r.status === 400 && /response_format|json|reasoning|property|parameter|unsupported|not supported/i.test(r.msg) && !MODELO_MUERTO.test(r.msg.replace(/not supported/i, ''))) {
        fallos.push(model + ' (opciones): ' + r.msg);
        r = await llamar(key, model, messages, false, true);
      }
      if (r.ok) {
        const text = (r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content) || '';
        console.log('[ai] ok', model, hasImage ? '(visión)' : '(texto)', fallos.length ? 'tras fallar: ' + fallos.join(' | ') : '');
        res.status(200).json({ text, model });
        return;
      }
      fallos.push(model + ': ' + r.status + ' ' + r.msg);
      if (!MODELO_MUERTO.test(r.msg) && r.status !== 404) {
        // Un error que no es del modelo (clave, cuota, imagen mal formada) no
        // se arregla probando otro: se devuelve tal cual.
        console.error('[ai] error', fallos.join(' | '));
        res.status(r.status || 500).json({ error: r.msg || 'Error de Groq' });
        return;
      }
    }
    console.error('[ai] ningún modelo disponible:', fallos.join(' | '));
    res.status(503).json({ error: 'Ningún modelo de IA disponible', detalle: fallos });
  } catch (e) {
    console.error('[ai] error:', e.message, fallos.join(' | '));
    res.status(500).json({ error: e.name === 'AbortError' ? 'La IA tardó demasiado' : (e.message || 'Error interno') });
  }
};

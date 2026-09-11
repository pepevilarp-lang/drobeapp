// Drobe · Strava OAuth + gear · /api/strava
// Env necesarias en Vercel: STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET
// (crear app en https://www.strava.com/settings/api con el dominio de Drobe)
module.exports = async function handler(req, res) {
  const id = process.env.STRAVA_CLIENT_ID;
  const secret = process.env.STRAVA_CLIENT_SECRET;

  if (req.method === 'GET') {
    res.status(200).json({ configured: !!(id && secret), client_id: id || null });
    return;
  }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }
  if (!id || !secret) { res.status(200).json({ ok:false, reason:'Strava no configurado en Vercel' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }
  const action = body && body.action;

  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 12000);
  try {
    if (action === 'token' || action === 'refresh') {
      const params = action === 'token'
        ? { client_id:id, client_secret:secret, code:body.code, grant_type:'authorization_code' }
        : { client_id:id, client_secret:secret, refresh_token:body.refresh_token, grant_type:'refresh_token' };
      const r = await fetch('https://www.strava.com/oauth/token', {
        method:'POST', signal:ctrl.signal,
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify(params)
      });
      clearTimeout(tm);
      const d = await r.json();
      if (!r.ok) { res.status(200).json({ ok:false, reason:(d && d.message) || 'Error de Strava' }); return; }
      res.status(200).json({ ok:true, access_token:d.access_token, refresh_token:d.refresh_token, expires_at:d.expires_at, athlete:d.athlete ? { id:d.athlete.id, firstname:d.athlete.firstname } : null });
      return;
    }
    if (action === 'gear') {
      const r = await fetch('https://www.strava.com/api/v3/athlete', {
        signal:ctrl.signal, headers:{ authorization:'Bearer ' + body.access_token }
      });
      clearTimeout(tm);
      const d = await r.json();
      if (!r.ok) { res.status(200).json({ ok:false, reason:(d && d.message) || 'Token inválido' }); return; }
      const map = x => ({ id:x.id, name:x.name, km: Math.round((x.distance || 0) / 1000) });
      res.status(200).json({ ok:true, shoes:(d.shoes || []).map(map), bikes:(d.bikes || []).map(map) });
      return;
    }
    clearTimeout(tm);
    res.status(400).json({ error: 'Acción desconocida' });
  } catch(e) {
    clearTimeout(tm);
    res.status(200).json({ ok:false, reason:e.message });
  }
};

/* ═══════════════════════════════════════════
   DROBE · REGISTRO DE ERRORES
   ───────────────────────────────────────────
   Antes de esto, 31 de los 46 try/catch de app.js se tragaban el error en
   silencio y no había ni una llamada a console en todo el fichero. Cuando algo
   fallaba, simplemente no pasaba nada: ni aviso al usuario, ni rastro para
   depurar. Este módulo existe para que eso no vuelva a ocurrir.

   Reglas:
   - Ningún fallo es invisible. Todo pasa por logError().
   - El usuario solo ve lo que le afecta (severity 'user'); el ruido se registra.
   - Todo queda en un buffer local consultable desde Perfil → Diagnóstico.
═══════════════════════════════════════════ */

const BUF_KEY = 'drobe.errors';
const MAX_ENTRIES = 60;
const DEDUPE_MS = 4000;

let _recent = new Map();   // firma -> timestamp, para no repetir el mismo toast
let _onEntry = null;       // callback que la app registra para pintar el toast

/** La app llama a esto una vez para decidir cómo se muestran los errores. */
export function onError(cb) { _onEntry = cb; }

function readBuffer() {
  try { return JSON.parse(localStorage.getItem(BUF_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeBuffer(list) {
  try { localStorage.setItem(BUF_KEY, JSON.stringify(list.slice(-MAX_ENTRIES))); }
  catch (e) { /* cuota llena: el buffer es prescindible, el log en consola no */ }
}

/** Todo lo registrado en esta sesión y en las anteriores. */
export function errorLog() { return readBuffer(); }

export function clearErrorLog() {
  try { localStorage.removeItem(BUF_KEY); } catch (e) {}
  _recent.clear();
}

function describe(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  try { return JSON.stringify(err).slice(0, 300); } catch (e) { return String(err); }
}

/**
 * Registra un fallo.
 * @param {string} scope  dónde ocurrió, ej. 'cloud.pushGarment' o 'vArmario'
 * @param {any}    err    el error capturado
 * @param {object} opts
 *   - user: texto que SÍ debe ver el usuario (si se omite, solo se registra)
 *   - fatal: true si ha roto la pantalla
 *   - extra: datos adicionales para depurar
 */
export function logError(scope, err, opts = {}) {
  const msg = describe(err);
  const entry = {
    scope,
    message: msg,
    user: opts.user || null,
    fatal: !!opts.fatal,
    extra: opts.extra || null,
    stack: (err && err.stack) ? String(err.stack).split('\n').slice(0, 4).join('\n') : null,
    at: new Date().toISOString()
  };

  // consola: siempre, para que Vercel y las devtools del móvil lo vean
  if (entry.fatal) console.error('[drobe:' + scope + ']', msg, opts.extra || '');
  else console.warn('[drobe:' + scope + ']', msg, opts.extra || '');

  const list = readBuffer();
  list.push(entry);
  writeBuffer(list);

  // antirrebote: el mismo fallo repetido no machaca al usuario con 10 toasts
  const sig = scope + '|' + msg;
  const now = Date.now();
  if (_recent.get(sig) && now - _recent.get(sig) < DEDUPE_MS) return entry;
  _recent.set(sig, now);

  if (opts.user && typeof _onEntry === 'function') {
    try { _onEntry(entry); } catch (e) { console.error('[drobe:log] el manejador falló', e); }
  }
  return entry;
}

/**
 * Envuelve una función para que un fallo suyo nunca tumbe a quien la llama.
 * Devuelve `fallback` si revienta. Vale para síncronas y asíncronas.
 */
export function guard(scope, fn, fallback = undefined, userMsg = null) {
  return function (...args) {
    try {
      const out = fn.apply(this, args);
      if (out && typeof out.then === 'function') {
        return out.catch(e => {
          logError(scope, e, { user: userMsg });
          return fallback;
        });
      }
      return out;
    } catch (e) {
      logError(scope, e, { user: userMsg });
      return fallback;
    }
  };
}

/** Captura lo que se escapa de todos los try/catch. Se llama una vez al arrancar. */
export function installGlobalHandlers() {
  window.addEventListener('error', ev => {
    // los errores de carga de recursos (img, script) llegan sin ev.error
    if (!ev.error && ev.target && ev.target.tagName) {
      logError('recurso', (ev.target.src || ev.target.href || ev.target.tagName) + ' no se pudo cargar');
      return;
    }
    logError('window.onerror', ev.error || ev.message, {
      fatal: true,
      extra: { file: ev.filename, line: ev.lineno, col: ev.colno }
    });
  }, true);

  window.addEventListener('unhandledrejection', ev => {
    logError('promesa sin capturar', ev.reason, { fatal: true });
  });
}

/** Informe en texto plano, para pegarlo en un issue o pasárselo a Claude. */
export function errorReport() {
  const list = readBuffer();
  if (!list.length) return 'Sin errores registrados.';
  const head = [
    'DROBE · informe de errores',
    'Generado: ' + new Date().toISOString(),
    'Navegador: ' + navigator.userAgent,
    'Entradas: ' + list.length,
    ''
  ].join('\n');
  return head + list.map(e =>
    `[${e.at}] ${e.fatal ? 'FATAL' : 'aviso'} · ${e.scope}\n  ${e.message}` +
    (e.extra ? '\n  datos: ' + JSON.stringify(e.extra) : '') +
    (e.stack ? '\n  ' + e.stack.replace(/\n/g, '\n  ') : '')
  ).join('\n\n');
}

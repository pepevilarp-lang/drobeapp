/* ═══════════════════════════════════════════
   DROBE · MOTOR DE GUSTOS
   ───────────────────────────────────────────
   Todo lo que Drobe sabe sobre cómo viste el usuario, en un solo sitio.

   Principio: NUNCA inventar. Cada señal sale de algo que el usuario ha hecho
   de verdad — comprar, ponerse, vender, guardar, rechazar en una tienda. Si no
   hay datos suficientes, el motor lo dice (confidence) en vez de fingir.

   Módulo puro: recibe `store` y devuelve objetos. No toca el DOM ni la red,
   así que se puede razonar sobre él y probarlo aislado.
═══════════════════════════════════════════ */

import { slug, canonMarca, canonColor, canonMaterial, canonTalla, canonTienda,
         grupoDe, GRUPOS, esNeutro, COLORES } from './normalize.js';

/* ─────────── vocabularios ─────────── */

// los neutros también salen de normalize.js (esNeutro)

/* Los vocabularios de color y de categoría vivían aquí duplicados y NO
   coincidían con los de app.js: "Chaquetas/Abrigos" contra "Abrigos/Chaquetas".
   Como la búsqueda era por clave exacta, los abrigos se quedaban sin banda de
   precio y salían siempre como "hueco del armario". Ahora hay una sola lista,
   en lib/normalize.js, que usan los dos lados. */

// prendas claramente estacionales: recomendar un plumífero en julio es ruido
const SEASON_HINTS = {
  invierno: ['abrigo', 'plumífero', 'plumifero', 'parka', 'bufanda', 'guantes', 'lana', 'polar', 'gorro', 'jersey grueso', 'térmico'],
  verano: ['bañador', 'bikini', 'short', 'bermuda', 'sandalia', 'lino', 'chancla', 'tirantes', 'manga corta']
};

const PRINT_RX = /estampad|print\b|gr[aá]fic|graphic|flores|floral|dibujo|anime|calavera|patches|tie ?dye|leopardo|camuflaje|logo grande|big logo|allover/i;

// ruido que Google Shopping devuelve y nunca es lo que el usuario busca
const JUNK_RX = /\b(lote|pack de \d{2,}|outlet mayorista|al por mayor|wholesale|replica|réplica|imitaci[oó]n|dropship|aliexpress|temu|shein|wish\.com)\b/i;

const NOISE_TOKENS = new Set(['de', 'la', 'el', 'para', 'con', 'con', 'y', 'the', 'and', 'of', 'hombre', 'mujer', 'talla', 'color', 'nuevo', 'nueva']);

/* ─────────── utilidades ─────────── */

const norm = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ').trim();

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Meses desde una fecha tipo "Nov 2023", "Ene 2024", "Hoy" o ISO. */
const MONTHS_ES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
function monthsAgo(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (/^hoy$/i.test(s)) return 0;
  // El mes en español va PRIMERO. Antes se probaba Date.parse() antes que esto,
  // y V8 acepta "Abr 2024", "Ago 2024" y "Dic 2024" devolviendo ENERO: una
  // compra de diciembre se envejecía once meses de más. Los otros nueve meses
  // coincidían con el inglés por casualidad, así que el fallo pasaba inadvertido.
  const m = norm(s).match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);
  if (m && MONTHS_ES[m[1]] !== undefined) {
    const d = new Date(+m[2], MONTHS_ES[m[1]], 15);
    return Math.max(0, (Date.now() - d.getTime()) / 2629800000);
  }
  const iso = Date.parse(s);
  if (!isNaN(iso)) return Math.max(0, (Date.now() - iso) / 2629800000);
  return null;
}

/** Estación actual en el hemisferio norte. */
function currentSeason(date = new Date()) {
  const m = date.getMonth();
  if (m >= 10 || m <= 2) return 'invierno';
  if (m >= 5 && m <= 8) return 'verano';
  return 'entretiempo';
}

/** Coincidencia de marca como palabra completa, no como subcadena.
    Evita que "Boss" case con "bossa" o "Coach" con "coachella". */
function brandInText(brand, text) {
  const b = norm(brand);
  if (!b || b === '-' || b === '—' || b.length < 2) return false;
  const rx = new RegExp('(^|[^a-z0-9])' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])');
  return rx.test(norm(text));
}

/* ═══════════════════════════════════════════
   1. PERFIL DE GUSTO
   Se calcula del armario real + lo que el usuario ha hecho con él.
═══════════════════════════════════════════ */

export function buildTasteProfile(store, { context = 'calle', now = new Date() } = {}) {
  const all = (store.garments || []).filter(g => (g.context || 'calle') === context);
  const active = all.filter(g => g.status !== 'venta');
  const forSale = all.filter(g => g.status === 'venta');
  const profile = store.profile || {};
  const n = active.length;

  /* ── confianza: con 3 prendas no se puede afirmar nada ── */
  const confidence = clamp(
    (Math.min(n, 25) / 25) * 0.7 +
    (profile.sex ? 0.1 : 0) +
    (Math.min((store.scanLog || []).length, 10) / 10) * 0.1 +
    (active.some(g => g.worn > 0) ? 0.1 : 0),
    0, 1
  );

  /* ── afinidad de marca ──
     Tener una prenda dice poco. Ponérsela dice mucho. Haberla comprado hace un
     mes dice más que hace tres años. Y venderla o no usarla nunca resta. */
  // La clave es la marca CANÓNICA. Antes era el texto tal cual, así que
  // "Stone Island", "stone island" y "STONE ISLAND" eran tres marcas y se
  // repartían la afinidad: la marca más usada caía por debajo del umbral.
  const brandRaw = {};
  const bump = (b, v) => { const c = canonMarca(b); if (c) brandRaw[c] = (brandRaw[c] || 0) + v; };

  active.forEach(g => {
    const worn = g.worn || 0;
    const age = monthsAgo(g.bought);
    // decae a la mitad cada ~18 meses; sin fecha, valor neutro
    const recency = age === null ? 0.75 : Math.pow(0.5, age / 18);
    const usage = Math.log1p(worn);                 // 0 usos = 0; comprime los extremos
    const spend = Math.log1p((g.price || 0) / 25);  // gastar más señala preferencia
    bump(g.brand, (0.8 + usage * 1.6 + spend * 0.6) * (0.45 + recency));
    if (worn === 0 && age !== null && age > 6) bump(g.brand, -1.2); // comprada y nunca puesta
  });
  forSale.forEach(g => bump(g.brand, -2.2));        // la pone a la venta: señal negativa fuerte

  // lo que el usuario ha declarado o mirado, con menos peso que lo que usa
  (profile.likedBrands || []).forEach(b => bump(b, 3.0));
  (store.wishlist || []).forEach(w => bump(w.brand, 1.6));
  (profile.adjBrands?.list || []).forEach(b => bump(b, 1.0)); // marcas equivalentes sugeridas por IA

  // escaneos en tienda: comprar tras escanear es la señal más pura de intención
  (store.scanLog || []).forEach(s => {
    if (!s.brand) return;
    if (s.bought) bump(s.brand, 2.4);
    else if (s.rejection === 'already_have') bump(s.brand, 0.2);   // le gusta, ya la tiene
    else if (s.rejection === 'too_expensive') bump(s.brand, 0.6);  // la quiere, no al precio
    else bump(s.brand, -0.5);
  });

  const maxRaw = Math.max(1, ...Object.values(brandRaw).filter(v => v > 0));
  const brandAffinity = {};
  Object.entries(brandRaw).forEach(([b, v]) => { brandAffinity[b] = clamp(v / maxRaw, -1, 1); });
  const topBrands = Object.entries(brandAffinity)
    .filter(([, v]) => v > 0.15).sort((a, b) => b[1] - a[1]).map(([b]) => b);
  const rejectedBrands = Object.entries(brandAffinity)
    .filter(([, v]) => v < -0.1).map(([b]) => b);

  /* ── bandas de precio POR CATEGORÍA ──
     El fallo del motor anterior: comparaba un abrigo de 300€ contra el ticket
     medio global de 60€ y lo descartaba por caro. Un abrigo se compara con
     abrigos. */
  const byCat = {};
  active.forEach(g => {
    const p = +g.price || 0; if (!p) return;
    const k = g.catGroup || 'Otros';
    (byCat[k] = byCat[k] || []).push(p);
  });
  const priceBands = {};
  Object.entries(byCat).forEach(([k, arr]) => {
    const s = arr.slice().sort((a, b) => a - b);
    priceBands[k] = {
      n: s.length, min: s[0], max: s[s.length - 1],
      p25: quantile(s, 0.25), median: quantile(s, 0.5), p75: quantile(s, 0.75),
      avg: s.reduce((a, b) => a + b, 0) / s.length
    };
  });
  const allPrices = active.map(g => +g.price || 0).filter(Boolean).sort((a, b) => a - b);
  const globalBand = allPrices.length ? {
    n: allPrices.length, min: allPrices[0], max: allPrices[allPrices.length - 1],
    p25: quantile(allPrices, 0.25), median: quantile(allPrices, 0.5), p75: quantile(allPrices, 0.75),
    avg: allPrices.reduce((a, b) => a + b, 0) / allPrices.length
  } : null;
  const avgPrice = globalBand ? globalBand.avg : 0;
  const segment = avgPrice > 150 ? 'premium' : avgPrice > 60 ? 'mid' : avgPrice > 0 ? 'budget' : 'unknown';

  /* ── techo de precio aprendido ──
     Si rechaza cosas por caras, el techo baja hacia lo que sí paga. */
  const tooExpensive = (store.scanLog || []).filter(s => s.rejection === 'too_expensive');
  const priceCeilingFactor = tooExpensive.length >= 3 ? 1.6 : tooExpensive.length >= 1 ? 2.0 : 2.6;

  /* ── color, corte, material, registro ── */
  const share = (arr, key) => {
    const o = {}; let t = 0;
    arr.forEach(x => { const k = typeof key === 'function' ? key(x) : x[key]; if (k && k !== '—') { o[k] = (o[k] || 0) + 1; t++; } });
    const out = {}; Object.entries(o).forEach(([k, v]) => { out[k] = v / (t || 1); });
    return out;
  };
  // el color se pondera por uso: el negro que te pones a diario pesa más
  const colorWeighted = {};
  let colorTotal = 0;
  active.forEach(g => {
    const w = 1 + Math.log1p(g.worn || 0);
    // canónico: "Azul marino", "Marino" y "navy" son el mismo color
    const cols = [...new Set((g.colors && g.colors.length ? g.colors : [g.color]).map(canonColor).filter(Boolean))];
    cols.forEach(c => { colorWeighted[c] = (colorWeighted[c] || 0) + w; colorTotal += w; });
  });
  Object.keys(colorWeighted).forEach(c => { colorWeighted[c] /= (colorTotal || 1); });

  const neutralRatio = n ? active.filter(g => esNeutro(g.color)).length / n : 0.5;
  const printed = active.filter(g => PRINT_RX.test((g.name || '') + ' ' + (g.tags || []).join(' '))).length;
  const plainRatio = n ? 1 - printed / n : 0.7;

  /* ── saturación: qué tiene ya de sobra ──
     Es lo que convierte "otra camiseta blanca" en una mala recomendación. */
  const saturation = {}, satColor = {};
  active.forEach(g => {
    const k = g.catGroup || 'Otros';
    saturation[k] = (saturation[k] || 0) + 1;
    // canónico en las dos puntas: la regla de "ya tienes tres camisetas
    // blancas" solo saltaba si el usuario había tecleado el token exacto
    const c = canonColor(g.color); if (c) satColor[k + '|' + c] = (satColor[k + '|' + c] || 0) + 1;
  });

  /* ── huecos: lo contrario de la saturación ── */
  /* ── sexo: declarado, o deducido del armario ──
     Va antes que los huecos porque estos dependen de él. */
  const FEM_RX = /vestido|falda|blusa|bikini|tac[oó]n|body\b/i;
  const femCount = all.filter(g => FEM_RX.test(g.cat || '')).length;
  const sex = profile.sex && profile.sex !== 'Prefiero no decir'
    ? profile.sex
    : (femCount > all.length * 0.15 ? 'Mujer' : all.length >= 5 ? 'Hombre' : '');

  /* Un hombre no tiene un "hueco" en faldas y vestidos. Antes esto no se
     notaba porque el vocabulario del motor ni siquiera contemplaba esa
     categoría; ahora que sí, hay que excluirla o el sistema recomienda
     vestidos a quien nunca los ha llevado, y encima lo justifica. */
  const sinFaldas = sex === 'Hombre' || (femCount === 0 && all.length >= 8);
  const gaps = GRUPOS.filter(k =>
    k !== 'Accesorios' &&
    !(sinFaldas && k === 'Faldas/Vestidos') &&
    (saturation[k] || 0) === 0);

  /* ── tallas: por marca y por categoría ── */
  const sizeVotes = {}, sizeByBrandVotes = {};
  active.forEach(g => {
    if (!g.size) return;
    const k = g.catGroup || 'Otros';
    const talla = canonTalla(g.size); if (!talla) return;
    (sizeVotes[k] = sizeVotes[k] || {})[talla] = (sizeVotes[k][talla] || 0) + 1;
    const marca = canonMarca(g.brand);
    if (marca) (sizeByBrandVotes[marca] = sizeByBrandVotes[marca] || {})[talla] = (sizeByBrandVotes[marca][talla] || 0) + 1;
  });
  const pickTop = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const sizeByCat = {}; Object.entries(sizeVotes).forEach(([k, v]) => { sizeByCat[k] = pickTop(v); });
  const sizeByBrand = {}; Object.entries(sizeByBrandVotes).forEach(([k, v]) => { sizeByBrand[k] = pickTop(v); });

  /* ── dónde compra de verdad ──
     Mejor que una lista fija de tiendas: sus propias tiendas. */
  const storeShare = share(active, g => canonTienda(g.store));
  const trustedStores = Object.entries(storeShare).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);

  /* ── qué rechaza y por qué ── */
  const rejections = {};
  (store.scanLog || []).forEach(s => { if (s.rejection) rejections[s.rejection] = (rejections[s.rejection] || 0) + 1; });


  /* ── salud del armario ── */
  const dead = active.filter(g => (g.worn || 0) <= 3);
  const cpw = g => (+g.price || 0) / Math.max(g.worn || 0, 1);

  return {
    confidence, context, season: currentSeason(now),
    sex, age: profile.age || null,
    garmentCount: n,
    brandAffinity, topBrands, rejectedBrands,
    priceBands, globalBand, avgPrice, segment, priceCeilingFactor,
    colors: colorWeighted,
    topColors: Object.entries(colorWeighted).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c),
    neutralRatio, plainRatio,
    fits: share(active, 'fit'), topFit: pickTop(share(active, 'fit')) || '',
    materials: share(active, g => canonMaterial(g.material)),
    topMaterials: Object.entries(share(active, g => canonMaterial(g.material))).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => m),
    formality: share(active, 'formality'), topFormality: pickTop(share(active, 'formality')) || '',
    saturation, satColor, gaps,
    sizeByCat, sizeByBrand, trustedStores, rejections,
    deadCount: dead.length,
    deadRate: n ? dead.length / n : 0,
    avgCpw: n ? active.reduce((s, g) => s + cpw(g), 0) / n : 0,
    totalValue: Math.round(active.reduce((s, g) => s + (+g.price || 0), 0)),
    computedAt: new Date().toISOString()
  };
}

/* ═══════════════════════════════════════════
   2. LECTURA DE UNA OFERTA
   De un título de Google Shopping sacamos marca, categoría y color.
═══════════════════════════════════════════ */

export function readOffer(offer, P) {
  const title = offer.title || '';
  const t = norm(title + ' ' + (offer.source || ''));

  // marca: la coincidencia más larga gana, para que "Massimo Dutti" no se
  // quede en "Massimo" ni "Polo Ralph Lauren" en "Polo"
  const candidates = [
    ...Object.keys(P.brandAffinity || {}),
    ...(P.hintBrands || [])
  ];
  let brand = '', brandLen = 0;
  candidates.forEach(b => {
    const c = canonMarca(b); if (!c) return;
    if (brandInText(c, t) && norm(c).length > brandLen) { brand = c; brandLen = norm(c).length; }
  });

  // el MISMO diccionario que clasifica las prendas del armario, así que las
  // claves de saturación y de banda de precio coinciden por construcción
  const cat = grupoDe(title);
  const color = canonColor(title);

  return { title, t, brand, cat, color, price: offer.price_value || null, source: offer.source || '' };
}

/* ═══════════════════════════════════════════
   3. PUNTUACIÓN EXPLICABLE
   Devuelve nota 0-100 Y las razones, para que la app pueda enseñar el porqué
   y para que un fallo de puntería sea depurable en vez de mágico.
═══════════════════════════════════════════ */

export function scoreOffer(offer, P, hints = {}) {
  const o = readOffer(offer, { ...P, hintBrands: hints.brandHints || [] });
  const reasons = [], warnings = [];
  let score = 50;

  const add = (pts, why) => { score += pts; if (why && pts > 0) reasons.push(why); };
  const cut = (pts, why) => { score -= pts; if (why) warnings.push(why); };

  /* basura evidente: fuera sin contemplaciones */
  if (JUNK_RX.test(o.title)) return { score: 0, reasons: [], warnings: ['Vendedor o formato no fiable'], read: o, rejected: 'junk' };
  if (!o.title || o.title.length < 8) return { score: 0, reasons: [], warnings: ['Sin datos suficientes'], read: o, rejected: 'empty' };

  /* ── marca (la señal más fuerte) ── */
  const aff = o.brand ? (P.brandAffinity[canonMarca(o.brand)] || 0) : 0;
  if (o.brand && aff > 0.55) add(24, `${o.brand} es de las que más usas`);
  else if (o.brand && aff > 0.2) add(14, `Ya tienes ${o.brand}`);
  else if (o.brand && aff > 0) add(7, `${o.brand} encaja con tu estilo`);
  else if (o.brand && aff < 0) cut(22, `Has vendido o no usas ${o.brand}`);
  if ((hints.brandHints || []).some(b => brandInText(b, o.t))) add(10, 'Es la marca que buscabas');

  /* ── precio, contra la banda de SU categoría ── */
  const band = (o.cat && P.priceBands[o.cat] && P.priceBands[o.cat].n >= 2) ? P.priceBands[o.cat] : P.globalBand;
  if (o.price && band) {
    const ref = band.median || band.avg;
    const r = o.price / (ref || 1);
    const label = o.cat ? `tus ${o.cat.toLowerCase()}` : 'lo que sueles gastar';
    if (r >= 0.55 && r <= 1.35) add(16, `Precio en tu rango para ${label}`);
    else if (r > 1.35 && r <= P.priceCeilingFactor) add(4, 'Un poco por encima de tu rango');
    else if (r > P.priceCeilingFactor) cut(26, `Muy caro para ${label} (${Math.round(ref)}€ de media)`);
    else if (r < 0.3) cut(18, 'Muy por debajo de tu nivel habitual');
    else add(6, 'Por debajo de tu precio habitual');
  } else if (o.price && o.price >= 15 && o.price <= 250) {
    add(4, null); // sin histórico: rango razonable, sin presumir
  }

  /* ── saturación: ¿ya tienes esto? ── */
  if (o.cat) {
    const have = P.saturation[o.cat] || 0;
    const haveColor = o.color ? (P.satColor[o.cat + '|' + o.color] || 0) : 0;
    if (haveColor >= 3) cut(28, `Ya tienes ${haveColor} en ${o.color.toLowerCase()}`);
    else if (haveColor === 2) cut(10, `Ya tienes 2 parecidas en ${o.color.toLowerCase()}`);
    if (have >= 10) cut(12, `Tu armario va sobrado de ${o.cat.toLowerCase()}`);
    if (have === 0 && P.gaps.includes(o.cat)) add(12, `Te falta ${o.cat.toLowerCase()} en el armario`);
  }

  /* ── color ── */
  if (o.color) {
    const cs = P.colors[o.color] || 0;
    if (cs > 0.15) add(10, `${o.color} es un color que llevas`);
    else if (cs > 0.04) add(5, null);
    else if (P.neutralRatio > 0.7 && !esNeutro(o.color)) cut(12, 'Color fuera de tu paleta');
  }

  /* ── estampado vs liso ── */
  if (P.plainRatio > 0.75 && PRINT_RX.test(o.title)) cut(22, 'Tú vistes liso, esto va estampado');

  /* ── corte y material ── */
  if (P.topFit && o.t.includes(norm(P.topFit).replace(' fit', ''))) add(7, `Corte ${P.topFit}, el tuyo`);
  const matHit = (P.topMaterials || []).find(m => m && o.t.includes(norm(m)));
  if (matHit) add(6, `${matHit}, material que buscas`);
  if (P.rejections.wrong_fit >= 2 && /oversize|boxy|wide/.test(o.t) && !/oversize|boxy|wide/.test(norm(P.topFit))) {
    cut(10, 'Has rechazado cortes así antes');
  }

  /* ── temporada ── */
  if (P.season === 'verano' && SEASON_HINTS.invierno.some(w => o.t.includes(w))) cut(16, 'Prenda de invierno, estamos en verano');
  if (P.season === 'invierno' && SEASON_HINTS.verano.some(w => o.t.includes(w))) cut(16, 'Prenda de verano, estamos en invierno');

  /* ── tienda: las suyas, no una lista fija ── */
  if (P.trustedStores.some(s => s && brandInText(s, o.source))) add(8, 'Compras aquí habitualmente');

  /* ── sexo: no colar ropa que no es para él/ella ── */
  if (P.sex === 'Hombre' && /\b(mujer|woman|women|femenin|vestido|falda)\b/.test(o.t)) cut(35, 'No es de tu sección');
  if (P.sex === 'Mujer' && /\b(hombre|man|men's|masculin)\b/.test(o.t)) cut(35, 'No es de tu sección');
  if (/\b(ni[ñn]o|ni[ñn]a|kids|junior|beb[eé]|infantil)\b/.test(o.t)) cut(40, 'Es ropa infantil');

  /* ── talla conocida: informativo, no penaliza ── */
  const wantSize = o.brand ? P.sizeByBrand[o.brand] : (o.cat ? P.sizeByCat[o.cat] : '');
  if (wantSize) reasons.push(`Tu talla en esto suele ser ${wantSize}`);

  /* ── con poco armario, no presumimos: acercamos la nota al centro ── */
  if (P.confidence < 0.45) score = 50 + (score - 50) * (0.5 + P.confidence);

  return {
    score: Math.round(clamp(score, 0, 100)),
    reasons: reasons.filter(Boolean).slice(0, 4),
    warnings: warnings.slice(0, 3),
    read: o,
    rejected: null
  };
}

/* ═══════════════════════════════════════════
   4. CURACIÓN
   Puntúa, corta por umbral, quita duplicados y diversifica.
   "Antes cero que mediocre" — pero el umbral se adapta a cuánto sabemos.
═══════════════════════════════════════════ */

export function curate(items, P, { threshold = 80, maxPerBrand = 3, max = 12, brandHints = [] } = {}) {
  if (!Array.isArray(items) || !items.length) return [];

  // con un armario pequeño, un umbral de 80 lo descarta casi todo y el usuario
  // ve una pantalla vacía sin entender por qué. Se relaja de forma explícita.
  // Con el armario casi vacío no hay gusto que aplicar: solo se filtra la
  // basura y lo que no es de su sección, y se muestra por relevancia.
  const effective = P.confidence < 0.2 ? Math.min(threshold, 45)
    : P.confidence < 0.35 ? Math.min(threshold, 58)
      : P.confidence < 0.6 ? Math.min(threshold, 70)
        : threshold;

  const seen = new Set();
  const scored = [];
  for (const it of items) {
    // deduplicado: mismo producto en cinco tiendas es una sola recomendación
    const sig = norm(it.title).replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2 && !NOISE_TOKENS.has(w)).slice(0, 6).join(' ');
    if (sig && seen.has(sig)) continue;
    if (sig) seen.add(sig);

    const r = scoreOffer(it, P, { brandHints });
    if (r.rejected || r.score < effective) continue;
    scored.push({ ...it, _score: r.score, _reasons: r.reasons, _warnings: r.warnings, _brand: r.read.brand, _cat: r.read.cat });
  }
  scored.sort((a, b) => b._score - a._score);

  // diversificar: que no salgan ocho cosas de la misma marca seguidas
  const out = [], count = {}, last = [];
  const keyOf = x => x._brand || x.source || '?';
  const pool = scored.slice();
  while (pool.length && out.length < max) {
    let idx = pool.findIndex(x => {
      const k = keyOf(x);
      return (count[k] || 0) < maxPerBrand && !(last[0] === k && last[1] === k);
    });
    if (idx < 0) idx = 0;
    const x = pool.splice(idx, 1)[0];
    const k = keyOf(x);
    count[k] = (count[k] || 0) + 1;
    last.unshift(k); last.length = 2;
    out.push(x);
  }
  return out;
}

/** Por qué no salió nada. Mejor que una pantalla vacía sin explicación. */
export function explainEmpty(items, P, opts = {}) {
  if (!items || !items.length) return 'No he encontrado productos para esa búsqueda.';
  const scores = items.map(i => scoreOffer(i, P, opts).score);
  const best = Math.max(...scores);
  if (P.confidence < 0.35) {
    return `He revisado ${items.length} productos y ninguno encaja del todo. Todavía sé poco de tu estilo — añade unas cuantas prendas más y afinaré mucho mejor.`;
  }
  return `He revisado ${items.length} productos y el mejor se queda en ${best}/100. Antes cero que mediocre.`;
}

/* ═══════════════════════════════════════════
   5. CONTEXTO PARA LA IA
   Lo que se le inyecta al modelo para que no recomiende a ciegas.
═══════════════════════════════════════════ */

export function profilePrompt(P) {
  if (!P.garmentCount) return 'El usuario aún no tiene prendas registradas. No asumas gustos ni inventes marcas.';

  const L = [];
  if (P.sex) L.push(`Sexo: ${P.sex}`);
  if (P.age) L.push(`Edad: ${P.age}`);
  L.push(`Armario: ${P.garmentCount} prendas, valor ${P.totalValue}€`);
  L.push(`Segmento: ${P.segment} · gasta ${Math.round(P.avgPrice)}€ de media por prenda`);

  const bands = Object.entries(P.priceBands).filter(([, b]) => b.n >= 2)
    .map(([k, b]) => `${k.toLowerCase()} ${Math.round(b.p25)}-${Math.round(b.p75)}€`);
  if (bands.length) L.push(`Lo que paga por categoría: ${bands.join(' · ')}`);

  if (P.topBrands.length) L.push(`Marcas que usa (por orden): ${P.topBrands.slice(0, 6).join(', ')}`);
  if (P.rejectedBrands.length) L.push(`Marcas que ha vendido o no usa — NO las sugieras: ${P.rejectedBrands.slice(0, 5).join(', ')}`);
  if (P.topColors.length) L.push(`Paleta: ${P.topColors.slice(0, 5).join(', ')}${P.neutralRatio > 0.7 ? ' (viste casi todo en neutros)' : ''}`);
  if (P.plainRatio > 0.75) L.push('Viste liso: evita estampados, gráficos y logos grandes');
  if (P.topFit) L.push(`Corte habitual: ${P.topFit}`);
  if (P.topMaterials.length) L.push(`Materiales: ${P.topMaterials.join(', ')}`);
  if (P.topFormality) L.push(`Registro: ${P.topFormality}`);

  const sizes = Object.entries(P.sizeByCat).map(([k, v]) => `${k.toLowerCase()} ${v}`);
  if (sizes.length) L.push(`Tallas: ${sizes.join(' · ')}`);

  const full = Object.entries(P.saturation).filter(([, v]) => v >= 6).map(([k]) => k.toLowerCase());
  if (full.length) L.push(`Va sobrado de: ${full.join(', ')} — no insistas ahí`);
  if (P.gaps.length) L.push(`Huecos reales del armario: ${P.gaps.join(', ')}`);

  if (P.trustedStores.length) L.push(`Suele comprar en: ${P.trustedStores.slice(0, 5).join(', ')}`);
  if (P.rejections.too_expensive >= 2) L.push('Ha rechazado varias prendas por precio: ajústate a su rango');
  L.push(`Estación actual: ${P.season}`);

  const head = P.confidence < 0.4
    ? 'PERFIL DEL USUARIO (datos aún escasos — no afirmes con rotundidad):'
    : 'PERFIL DEL USUARIO (basado en su armario real, úsalo para acertar):';
  return head + '\n' + L.map(x => '- ' + x).join('\n');
}

/** Resumen corto para pintar en pantalla. */
export function profileSummary(P) {
  if (!P.garmentCount) return 'Añade prendas y Drobe aprenderá tu estilo.';
  const bits = [];
  if (P.topBrands.length) bits.push(P.topBrands.slice(0, 3).join(', '));
  if (P.topColors.length) bits.push(P.topColors.slice(0, 2).join(' y ').toLowerCase());
  if (P.avgPrice) bits.push(`~${Math.round(P.avgPrice)}€ por prenda`);
  return bits.join(' · ');
}

export const _internals = { norm, monthsAgo, currentSeason, brandInText, quantile, grupoDe, canonColor };

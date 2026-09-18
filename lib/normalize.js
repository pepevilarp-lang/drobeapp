/* ═══════════════════════════════════════════
   DROBE · NORMALIZACIÓN
   ───────────────────────────────────────────
   Una sola fuente de verdad para marcas, categorías, colores, materiales y
   tallas. Existe porque no existía, y eso costaba caro:

   - "Stone Island", "stone island" y "STONE ISLAND" eran TRES marcas distintas.
     El motor de gustos repartía la afinidad entre las tres, y la marca más
     usada del usuario caía por debajo del umbral de recomendación. Medido: 71
     puntos con una sola grafía, 55 con seis. El corte está en 70.
   - app.js decía "Chaquetas/Abrigos" y lib/taste.js decía "Abrigos/Chaquetas".
     Como el motor buscaba por clave exacta, los abrigos NUNCA tenían banda de
     precio propia, la penalización por exceso no saltaba jamás, y el prompt le
     decía a la IA que al usuario le sobraban abrigos y le faltaban abrigos en
     dos líneas seguidas.
   - "Azul marino" en el armario nunca casaba con "Marino" en las ofertas, así
     que la regla de "ya tienes tres camisetas blancas" casi no llegaba a saltar.

   Regla general: se guarda SIEMPRE la forma canónica. La clave de comparación
   es `slug()`; la forma que se enseña es la canónica, no la que tecleó nadie.
═══════════════════════════════════════════ */

/** Clave de comparación: minúsculas, sin acentos, sin puntuación, sin dobles espacios. */
export const slug = s => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const vacio = v => { const t = String(v ?? '').trim(); return !t || t === '—' || t === '-' || t === '?' ? '' : t; };

/* ═══════════════════════════════════════════
   1. CATEGORÍAS · una sola lista, compartida
   Estos nueve grupos son EL vocabulario. app.js y lib/taste.js leen de aquí.
═══════════════════════════════════════════ */

export const GRUPOS = [
  'Camisetas', 'Camisas', 'Jerséis/Sudaderas', 'Chaquetas/Abrigos',
  'Pantalones', 'Shorts/Bermudas', 'Faldas/Vestidos', 'Calzado', 'Accesorios'
];

/* Palabras que identifican cada grupo, tanto en el `cat` de una prenda como en
   el título de un producto de una tienda. Un solo diccionario para los dos usos:
   antes había dos y no coincidían. El orden importa — se comprueba de arriba
   abajo y gana el primero. */
export const PALABRAS_GRUPO = [
  // Camisetas antes que Camisas: "camiseta" contiene "camisa" como subcadena,
  // pero el cotejo es por palabra completa, así que no hay conflicto — y así
  // "Camisa Oxford" no acaba en Calzado por culpa de la palabra "oxford".
  ['Camisetas',         ['camiseta','camisetas','tshirt','t shirt','tee','polo','polos','top','tirantes','manga corta','manga larga']],
  ['Camisas',           ['camisa','camisas','camisera','sobrecamisa','overshirt']],
  ['Jerséis/Sudaderas', ['jersey','jerseis','jerséis','sudadera','sudaderas','hoodie','sweatshirt','sweater','jumper','cardigan','punto','knit','crewneck','forro polar','polar']],
  ['Chaquetas/Abrigos', ['abrigo','abrigos','chaqueta','chaquetas','cazadora','parka','plumifero','plumas','bomber','blazer','americana','trench','gabardina','anorak','chaleco','cortavientos','jacket','coat','puffer']],
  ['Faldas/Vestidos',   ['falda','faldas','vestido','vestidos','jumpsuit','dress','skirt']],
  ['Shorts/Bermudas',   ['short','shorts','bermuda','bermudas','banador','bikini','swim']],
  ['Pantalones',        ['pantalon','pantalones','vaquero','vaqueros','jean','jeans','denim','chino','chinos','cargo','jogger','joggers','trouser','pants','leggin','leggings','malla','mallas']],
  ['Calzado',           ['calzado','sneaker','sneakers','zapatilla','zapatillas','zapato','zapatos','bota','botas','botin','botines','bamba','bambas','deportiva','deportivas','mocasin','mocasines','sandalia','sandalias','chancla','chanclas','tacon','tacones','oxford','derby','running','shoe','boot','loafer','alpargata']],
  ['Accesorios',        ['accesorio','accesorios','gorra','gorro','bufanda','cinturon','mochila','bolso','cartera','gafas','guantes','calcetin','calcetines','corbata','pajarita','sombrero','rinonera','panuelo','reloj','joya','collar','pulsera']]
];

/**
 * Grupo canónico de una prenda o de un título de producto.
 * Devuelve '' cuando no hay señal suficiente — NUNCA inventa un grupo.
 * (El `catToGroup` anterior devolvía 'Accesorios' por defecto, así que los
 * botines, los tacones y los mocasines acababan en accesorios y la maleta
 * nunca los metía.)
 */
export function grupoDe(texto) {
  const t = ' ' + slug(texto) + ' ';
  if (!t.trim()) return '';
  for (const [grupo, palabras] of PALABRAS_GRUPO) {
    for (const p of palabras) {
      const ps = slug(p);
      if (!ps) continue;
      if (t.includes(' ' + ps) || t.includes(ps + ' ')) return grupo;
    }
  }
  return '';
}

/** Compatibilidad con el nombre antiguo. Cae en Accesorios solo si HAY texto. */
export function catToGroup(cat) {
  const g = grupoDe(cat);
  if (g) return g;
  return vacio(cat) ? 'Accesorios' : '';
}

/* ═══════════════════════════════════════════
   2. MARCAS
═══════════════════════════════════════════ */

/* Grafías correctas de marcas frecuentes en España. La clave es el slug; el
   valor, cómo se escribe de verdad. Sirve para dos cosas: unificar variantes y
   dejar de enseñar "ZARA" o "massimo dutti" tal y como los tecleó el usuario. */
const MARCAS = {};
[
  'Zara','Massimo Dutti','Pull&Bear','Bershka','Stradivarius','Oysho','Lefties',
  'Mango','H&M','COS','Arket','Uniqlo','Springfield','Cortefiel','Scalpers',
  'Silbon','Pepe Jeans','Levi’s','Tommy Hilfiger','Calvin Klein','Ralph Lauren',
  'Polo Ralph Lauren','Lacoste','Fred Perry','Stone Island','C.P. Company',
  'Ecoalf','Bimba y Lola','Adolfo Dominguez','Purificación García','Loewe',
  'Nike','Adidas','New Balance','Puma','Reebok','Asics','Salomon','On Running',
  'Vans','Converse','Dr. Martens','Timberland','Birkenstock','Camper',
  'Carhartt','Carhartt WIP','Dickies','The North Face','Patagonia','Columbia',
  'Napapijri','Barbour','Belstaff','Woolrich','Canada Goose',
  'El Ganso','Hackett','Brownie','Sfera','Parfois','Decathlon','Quechua',
  'Nude Project','Norse Projects','Sandro','Maje','Sézane','Filippa K',
  'Acne Studios','Our Legacy','A.P.C.','Carhartt Work In Progress',
  'Jack & Jones','Only','Vero Moda','Desigual','Bershka','Guess','Diesel',
  'Boss','Hugo Boss','Armani','Emporio Armani','Lois','Salsa','Tiffosi'
].forEach(m => { MARCAS[slug(m)] = m; });

/* Variantes que la gente (o la IA) escribe y que apuntan a la misma marca. */
const ALIAS_MARCA = {
  'polo ralph lauren': 'Ralph Lauren',
  'ralph lauren polo': 'Ralph Lauren',
  'rl': 'Ralph Lauren',
  'si': 'Stone Island',
  's island': 'Stone Island',
  'stoneisland': 'Stone Island',
  'cp company': 'C.P. Company',
  'cpcompany': 'C.P. Company',
  'hugo': 'Hugo Boss',
  'boss': 'Hugo Boss',
  'ck': 'Calvin Klein',
  'th': 'Tommy Hilfiger',
  'tommy': 'Tommy Hilfiger',
  'tommy jeans': 'Tommy Hilfiger',
  'levis': 'Levi’s',
  'levi s': 'Levi’s',
  'nb': 'New Balance',
  'tnf': 'The North Face',
  'north face': 'The North Face',
  'the northface': 'The North Face',
  'dr martens': 'Dr. Martens',
  'doc martens': 'Dr. Martens',
  'martens': 'Dr. Martens',
  'apc': 'A.P.C.',
  'pull and bear': 'Pull&Bear',
  'pull bear': 'Pull&Bear',
  'h m': 'H&M',
  'hym': 'H&M',
  'massimo': 'Massimo Dutti',
  'carhartt wip': 'Carhartt WIP',
  'carhartt work in progress': 'Carhartt WIP',
  'jack jones': 'Jack & Jones',
  'nude': 'Nude Project',
  'norse': 'Norse Projects',
  'emporio': 'Emporio Armani'
};

/* Palabras que no son una marca aunque lleguen en ese campo. */
const NO_ES_MARCA = new Set(['', 'sin marca', 'desconocida', 'desconocido', 'na', 'n a', 'ninguna', 'generico', 'generica', 'varios', 'otros', 'otro', 'unknown', 'none', 'marca']);

/** Capitaliza una marca desconocida de forma razonable ("nude project" → "Nude Project"). */
function titular(s) {
  const menores = new Set(['de', 'del', 'la', 'el', 'y', 'the', 'of', 'and']);
  return String(s).split(' ').filter(Boolean).map((w, i) => {
    if (i > 0 && menores.has(w)) return w;
    if (w.length <= 3 && w === w.toUpperCase()) return w;   // siglas ya en mayúsculas
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
}

/**
 * Forma canónica de una marca. '' si no es una marca de verdad.
 * canonMarca('STONE ISLAND') === canonMarca(' stone island ') === 'Stone Island'
 */
export function canonMarca(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (!k || NO_ES_MARCA.has(k)) return '';
  if (ALIAS_MARCA[k]) return ALIAS_MARCA[k];
  if (MARCAS[k]) return MARCAS[k];
  return titular(k);
}

/** ¿Son la misma marca, se escriban como se escriban? */
export const mismaMarca = (a, b) => {
  const ca = canonMarca(a), cb = canonMarca(b);
  return !!ca && slug(ca) === slug(cb);
};

/* ═══════════════════════════════════════════
   3. COLORES
   La lista canónica ya existía en app.js (el formulario del asesor de compra),
   pero no se usaba para las prendas. Ahora manda.
═══════════════════════════════════════════ */

export const COLORES = ['Blanco','Negro','Gris','Marino','Azul','Verde','Kaki/Oliva','Marrón','Beige','Crudo','Rojo','Amarillo','Naranja','Rosa','Morado','Multicolor'];

const COLOR_ALIAS = {};
const mapaColor = {
  'Blanco':    ['blanco','white','optico','blanco roto'],
  'Negro':     ['negro','black','azabache'],
  'Gris':      ['gris','grey','gray','antracita','marengo','plomo','perla'],
  'Marino':    ['marino','azul marino','navy','azul noche','azulon'],
  'Azul':      ['azul','blue','celeste','cielo','denim','vaquero','indigo','turquesa','petroleo'],
  'Verde':     ['verde','green','esmeralda','botella','menta','pistacho'],
  'Kaki/Oliva':['kaki','caqui','khaki','oliva','olive','militar','verde militar','verde oliva'],
  'Marrón':    ['marron','brown','chocolate','cafe','coñac','conac','cuero','tabaco','castano'],
  'Beige':     ['beige','arena','piedra','taupe','topo','camel','tostado','duna','visón','vison'],
  'Crudo':     ['crudo','ecru','hueso','off white','offwhite','natural','marfil','vainilla'],
  'Rojo':      ['rojo','red','burdeos','granate','vino','teja','coral','cereza'],
  'Amarillo':  ['amarillo','yellow','mostaza','ocre','dorado','oro'],
  'Naranja':   ['naranja','orange','salmon','terracota','calabaza'],
  'Rosa':      ['rosa','pink','fucsia','palo rosa','nude'],
  'Morado':    ['morado','purple','lila','violeta','malva','berenjena'],
  'Multicolor':['multicolor','estampado','varios','print','multi']
};
Object.entries(mapaColor).forEach(([canon, lista]) => lista.forEach(a => { COLOR_ALIAS[slug(a)] = canon; }));

/**
 * Color canónico. Entiende modificadores ("azul marino oscuro" → Marino)
 * probando primero la frase entera y luego palabra a palabra, de la más
 * específica a la más general.
 */
export function canonColor(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (COLOR_ALIAS[k]) return COLOR_ALIAS[k];
  // frases de dos palabras primero ("azul marino" antes que "azul")
  const pal = k.split(' ').filter(Boolean);
  for (let n = Math.min(3, pal.length); n >= 1; n--) {
    for (let i = 0; i + n <= pal.length; i++) {
      const trozo = pal.slice(i, i + n).join(' ');
      if (COLOR_ALIAS[trozo]) return COLOR_ALIAS[trozo];
    }
  }
  return '';
}

export const NEUTROS = new Set(['Blanco', 'Negro', 'Gris', 'Marino', 'Beige', 'Crudo', 'Marrón']);
export const esNeutro = c => NEUTROS.has(canonColor(c));

/* ═══════════════════════════════════════════
   4. MATERIALES
   "Algodón pima", "Algodón" y "algodón orgánico" eran tres materiales, así que
   el bonus por material no saltaba casi nunca: los títulos de producto dicen
   "algodón", no "algodón pima".
═══════════════════════════════════════════ */

export const MATERIALES = ['Algodón','Lino','Lana','Cachemira','Seda','Denim','Punto','Cuero','Ante','Poliéster','Nylon','Gore-Tex','Viscosa','Mezcla'];
const MATERIAL_ALIAS = {};
const mapaMaterial = {
  'Algodón':   ['algodon','cotton','algodon pima','pima','algodon organico','organic cotton','popelin','oxford','jersey de algodon','felpa','french terry'],
  'Lino':      ['lino','linen','ramie'],
  'Lana':      ['lana','wool','merino','lana merino','lana virgen','shetland','tweed','franela'],
  'Cachemira': ['cachemira','cashmere','cachemir'],
  'Seda':      ['seda','silk'],
  'Denim':     ['denim','vaquero','tejano'],
  'Punto':     ['punto','knit','tricot','canale'],
  'Cuero':     ['cuero','piel','leather','napa','box calf'],
  'Ante':      ['ante','serraje','suede','nobuk','nubuck'],
  'Poliéster': ['poliester','polyester','poly'],
  'Nylon':     ['nylon','nailon','poliamida','ripstop'],
  'Gore-Tex':  ['gore tex','goretex','gtx'],
  'Viscosa':   ['viscosa','rayon','modal','lyocell','tencel','cupro'],
  'Mezcla':    ['mezcla','blend','mixto']
};
Object.entries(mapaMaterial).forEach(([canon, lista]) => lista.forEach(a => { MATERIAL_ALIAS[slug(a)] = canon; }));

export function canonMaterial(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (MATERIAL_ALIAS[k]) return MATERIAL_ALIAS[k];
  const pal = k.split(' ').filter(Boolean);
  for (let n = Math.min(2, pal.length); n >= 1; n--) {
    for (let i = 0; i + n <= pal.length; i++) {
      const trozo = pal.slice(i, i + n).join(' ');
      if (MATERIAL_ALIAS[trozo]) return MATERIAL_ALIAS[trozo];
    }
  }
  // "60% algodón 40% poliéster" → el primero que aparezca
  for (const [alias, canon] of Object.entries(MATERIAL_ALIAS)) {
    if (k.includes(alias)) return canon;
  }
  return titular(k);
}

/* ═══════════════════════════════════════════
   5. TALLAS
   'M', 'm', ' M ' y 'Talla M' eran cuatro tallas distintas en sizeByBrand.
═══════════════════════════════════════════ */

const TALLA_LETRA = { 'xxs':'XXS','xs':'XS','s':'S','m':'M','l':'L','xl':'XL','xxl':'XXL','xxxl':'XXXL',
  'p':'S','peq':'S','pequena':'S','mediana':'M','med':'M','g':'L','grande':'L','muy grande':'XL' };

export function canonTalla(raw) {
  const v = vacio(raw); if (!v) return '';
  let k = slug(v).replace(/^talla /, '').replace(/^size /, '').trim();
  if (!k) return '';
  if (TALLA_LETRA[k]) return TALLA_LETRA[k];
  if (/^\d{1,3}([.,]\d)?$/.test(k)) return k.replace(',', '.');   // 42, 32, 40.5
  if (/^\d{2}\s?x\s?\d{2}$/.test(k)) return k.replace(/\s/g, '').toUpperCase(); // 32x32
  if (/^(xxs|xs|s|m|l|xl|xxl|xxxl)$/i.test(k)) return k.toUpperCase();
  return v.trim().toUpperCase().length <= 5 ? v.trim().toUpperCase() : v.trim();
}

/* ═══════════════════════════════════════════
   6. TIENDAS
═══════════════════════════════════════════ */

export function canonTienda(raw) {
  const v = vacio(raw); if (!v) return '';
  let k = slug(v)
    .replace(/\b(com|es|net|shop|online|store|tienda|oficial)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!k) return v.trim();
  const marca = MARCAS[k] || ALIAS_MARCA[k];
  return marca || titular(k);
}

/* ═══════════════════════════════════════════
   7. LA PRENDA ENTERA
═══════════════════════════════════════════ */

/**
 * Deja una prenda en forma canónica. Idempotente: pasarla dos veces da lo mismo.
 * Se aplica en TODAS las vías de alta (foto, ticket, ráfaga, email, manual,
 * edición y al traer de la nube), que antes rellenaban campos de seis maneras
 * distintas — unas con '', otras con '—', otras sin el campo.
 */
export function canonPrenda(g) {
  if (!g || typeof g !== 'object') return g;
  const out = { ...g };

  out.brand = canonMarca(out.brand);
  out.name = vacio(out.name) || '';
  out.cat = vacio(out.cat) || '';
  out.catGroup = grupoDe(out.catGroup) || grupoDe(out.cat) || grupoDe(out.name) || '';
  out.color = canonColor(out.color) || canonColor(out.name) || '';
  out.material = canonMaterial(out.material);
  out.size = canonTalla(out.size);
  out.store = canonTienda(out.store);
  out.sku = vacio(out.sku) || '';

  const cols = Array.isArray(out.colors) && out.colors.length ? out.colors : [out.color];
  out.colors = [...new Set(cols.map(canonColor).filter(Boolean))];
  if (!out.colors.length && out.color) out.colors = [out.color];

  out.price = Number(out.price) || 0;
  out.worn = Number.isFinite(+out.worn) ? Math.max(0, Math.round(+out.worn)) : 0;
  out.status = out.status === 'venta' ? 'venta' : 'uso';
  out.context = out.context === 'deporte' ? 'deporte' : 'calle';
  if (!Array.isArray(out.photos)) out.photos = [];
  if (!Array.isArray(out.docs)) out.docs = [];
  if (!Array.isArray(out.tags)) out.tags = [];
  return out;
}

/**
 * Huella de una prenda, para detectar duplicados.
 * Dos prendas con la misma huella son, a efectos prácticos, la misma.
 * Deliberadamente NO incluye la foto ni el precio: la misma camiseta
 * fotografiada dos veces da imágenes distintas, y el mismo modelo puede
 * haberse comprado rebajado.
 */
export function huella(g) {
  const c = canonPrenda(g);
  return [slug(c.brand), slug(c.catGroup || c.cat), slug(c.color), slug(c.size), slug(c.name)]
    .join('|');
}

/**
 * Busca prendas del armario que probablemente sean la misma que `g`.
 * Devuelve [{garment, score, motivo}] ordenado de más a menos parecido.
 * score 1 = huella idéntica; 0.75+ = muy probable; por debajo de 0.6 no se avisa.
 */
export function buscarDuplicados(g, armario, { umbral = 0.72 } = {}) {
  const c = canonPrenda(g);
  const hc = huella(c);
  const out = [];
  for (const o of armario || []) {
    if (!o || o.id === c.id) continue;
    if (o.status === 'venta') continue;
    const co = canonPrenda(o);
    if (huella(co) === hc) { out.push({ garment: o, score: 1, motivo: 'idéntica' }); continue; }

    let s = 0, partes = [];
    const mismaCat = co.catGroup && co.catGroup === c.catGroup;
    if (!mismaCat) continue;                       // distinta categoría: no es duplicado
    s += 0.34;
    if (c.brand && co.brand && slug(c.brand) === slug(co.brand)) { s += 0.3; partes.push('misma marca'); }
    if (c.color && co.color && c.color === co.color) { s += 0.2; partes.push('mismo color'); }
    if (c.size && co.size && c.size === co.size) { s += 0.1; partes.push('misma talla'); }
    if (c.name && co.name && slug(c.name) === slug(co.name)) { s += 0.25; partes.push('mismo nombre'); }
    if (c.sku && co.sku && slug(c.sku) === slug(co.sku)) { s = 1; partes = ['misma referencia']; }
    if (s >= umbral) out.push({ garment: o, score: Math.min(1, s), motivo: partes.join(' · ') || 'muy parecida' });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Huella de un ticket, para no importar dos veces el mismo. */
export function huellaTicket(t) {
  return [slug(canonTienda(t?.store)), String(t?.dateISO || t?.date || ''), Number(t?.total) || 0].join('|');
}

export const _internos = { titular, MARCAS, ALIAS_MARCA, COLOR_ALIAS, MATERIAL_ALIAS };

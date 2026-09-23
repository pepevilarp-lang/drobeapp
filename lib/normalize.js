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
  ['Camisetas',         ['camiseta','camisetas','tshirt','t shirt','tee','polo','polos','top','tirantes','manga corta','manga larga','maillot','singlet']],
  ['Camisas',           ['camisa','camisas','camisera','sobrecamisa','overshirt','guayabera']],
  ['Jerséis/Sudaderas', ['jersey','jerseis','jerséis','sudadera','sudaderas','hoodie','sweatshirt','sweater','jumper','cardigan','cardigan','punto','knit','crewneck','forro polar','polar','fleece','rebeca','poncho']],
  ['Chaquetas/Abrigos', ['abrigo','abrigos','chaqueta','chaquetas','cazadora','parka','plumifero','plumas','bomber','blazer','americana','trench','gabardina','anorak','chaleco','cortavientos','chubasquero','impermeable','jacket','coat','puffer','harrington','varsity','teddy','softshell','windbreaker','gilet']],
  ['Faldas/Vestidos',   ['falda','faldas','vestido','vestidos','jumpsuit','mono','peto','dress','skirt']],
  ['Shorts/Bermudas',   ['short','shorts','bermuda','bermudas','banador','bikini','swim','pantalon corto','culotte']],
  ['Pantalones',        ['pantalon','pantalones','vaquero','vaqueros','jean','jeans','denim','chino','chinos','cargo','jogger','joggers','trouser','pants','leggin','leggings','malla','mallas','pitillo','tejano','tejanos','pantalones de chandal','chandal']],
  ['Calzado',           ['calzado','sneaker','sneakers','zapatilla','zapatillas','zapato','zapatos','bota','botas','botin','botines','bamba','bambas','deportiva','deportivas','mocasin','mocasines','sandalia','sandalias','chancla','chanclas','tacon','tacones','oxford','derby','blucher','running','trail','shoe','shoes','boot','boots','loafer','loafers','alpargata','alpargatas','nautico','nauticos','bailarina','bailarinas','merceditas','mule','mules','chelsea','wallabee','zueco','zuecos','crocs','slider','sliders','trainer','trainers','tenis','futbol','botas de futbol','esparto']],
  ['Accesorios',        ['accesorio','accesorios','gorra','gorro','bufanda','cinturon','mochila','bolso','cartera','monedero','gafas','gafas de sol','sunglasses','guantes','calcetin','calcetines','corbata','pajarita','sombrero','rinonera','panuelo','fular','reloj','joya','collar','pulsera','anillo','pendientes','bandolera','tote','neceser','maleta','cap','beanie','scarf','belt','backpack','wallet','watch']]
];

/* ═══════════════════════════════════════════
   1b. EL CATÁLOGO DE TIPOS · una sola lista, con su grupo pegado
   ───────────────────────────────────────────
   Antes esta lista vivía en app.js (`CATS_DETAIL`) y el grupo se deducía a
   posteriori buscando palabras en la etiqueta. Eso ponía "Camisa Oxford" en
   Calzado hasta que se reordenó el diccionario, y dejaba fuera del grupo a
   cualquier tipo cuya etiqueta no contuviera una palabra del diccionario.
   Ahora el grupo va escrito al lado del tipo: es un dato, no una deducción.
   El diccionario de palabras sigue existiendo, pero solo para texto libre
   (títulos de tienda, nombres de prenda), que es lo que no se puede tabular.
═══════════════════════════════════════════ */

export const CATALOGO = [
  ['Camisetas',         ['Camiseta manga corta','Camiseta manga larga','Camiseta técnica','Polo','Top','Tirantes']],
  ['Camisas',           ['Camisa Oxford','Camisa lino','Camisa vestir','Camisa denim','Sobrecamisa']],
  ['Jerséis/Sudaderas', ['Jersey','Jersey cuello alto','Cárdigan','Chaleco de punto','Sudadera','Hoodie','Forro polar']],
  ['Chaquetas/Abrigos', ['Bomber','Blazer','Americana','Chaqueta denim','Chaqueta cuero','Cazadora','Abrigo','Gabardina','Parka','Plumífero','Cortavientos','Chubasquero','Chaleco']],
  ['Pantalones',        ['Vaquero','Chino','Cargo','Jogger','Pantalón vestir','Pantalón lino','Pantalón técnico','Mallas']],
  ['Shorts/Bermudas',   ['Shorts','Bermudas','Short técnico','Bañador']],
  ['Faldas/Vestidos',   ['Falda','Vestido','Mono']],
  ['Calzado',           ['Sneakers','Zapatillas running','Zapatillas trail','Botas','Botines','Zapatos Oxford','Mocasines','Náuticos','Sandalias','Chanclas','Tacones','Bailarinas','Botas de fútbol']],
  ['Accesorios',        ['Mochila','Bolso','Cartera','Gorra','Gorro','Bufanda','Cinturón','Corbata','Reloj','Gafas de sol','Guantes','Calcetines','Pañuelo','Joya']]
];

/** Todos los tipos, en orden de catálogo. 'Otro' al final, siempre disponible. */
export const CATS = [...CATALOGO.flatMap(([, l]) => l), 'Otro'];

/* tipo → grupo, por construcción. */
const GRUPO_DE_CAT = {};
CATALOGO.forEach(([g, lista]) => lista.forEach(c => { GRUPO_DE_CAT[slug(c)] = g; }));

/* Sinónimos y traducciones que llegan de la IA, de los tickets y de las tiendas.
   'bambas' es lo que dice media España y 'trainers' lo que dice media etiqueta:
   las dos son Sneakers, y tener las tres en el desplegable era el motivo de que
   la misma zapatilla acabara archivada de tres maneras. */
const CAT_ALIAS = {};

export const CAT_SINONIMOS = {
  'Camiseta manga corta': ['camiseta','camisetas','t shirt','tshirt','t-shirt','tee','tees','camiseta basica','camiseta algodon','manga corta','crew neck tee'],
  'Camiseta manga larga': ['manga larga','long sleeve','longsleeve','camiseta ml','camiseta manga larga'],
  'Camiseta técnica':     ['camiseta tecnica','maillot','jersey ciclismo','camiseta running','camiseta deportiva','singlet','dry fit'],
  'Polo':                 ['polo','polos','polo shirt','pique'],
  'Top':                  ['top','crop top','body'],
  'Tirantes':             ['tirantes','tank top','camiseta tirantes','sin mangas'],
  'Camisa Oxford':        ['camisa','camisas','shirt','camisa oxford','oxford shirt','camisa popelin','button down','camisa sport'],
  'Camisa lino':          ['camisa lino','camisa de lino','linen shirt'],
  'Camisa vestir':        ['camisa vestir','camisa de vestir','dress shirt','camisa formal','camisa traje'],
  'Camisa denim':         ['camisa denim','camisa vaquera','denim shirt'],
  'Sobrecamisa':          ['sobrecamisa','overshirt','shacket','camisa gruesa'],
  'Jersey':               ['jersey','jerseys','sweater','jumper','knit','knitwear','punto','pullover','sueter'],
  'Jersey cuello alto':   ['cuello alto','turtleneck','jersey cuello cisne'],
  'Cárdigan':             ['cardigan','cardigans','rebeca','chaqueta de punto'],
  'Chaleco de punto':     ['chaleco de punto','chaleco punto','knit vest','sweater vest'],
  'Sudadera':             ['sudadera','sweatshirt','crewneck','felpa'],
  'Hoodie':               ['hoodie','sudadera capucha','sudadera con capucha','hooded'],
  'Forro polar':          ['forro polar','polar','fleece','fleece jacket'],
  'Bomber':               ['bomber','jacket','chaqueta','cazadora bomber','ma 1','varsity','harrington','teddy'],
  'Blazer':               ['blazer','blazers'],
  'Americana':            ['americana','chaqueta traje','suit jacket','sport coat'],
  'Chaqueta denim':       ['chaqueta denim','chaqueta vaquera','denim jacket','trucker jacket','cazadora vaquera'],
  'Chaqueta cuero':       ['chaqueta cuero','chaqueta de cuero','leather jacket','biker','perfecto','cazadora de piel'],
  'Cazadora':             ['cazadora','cazadoras'],
  'Abrigo':               ['abrigo','coat','overcoat','abrigo lana','carcoat','chesterfield'],
  'Gabardina':            ['gabardina','trench','trench coat','mackintosh'],
  'Parka':                ['parka','parkas','anorak'],
  'Plumífero':            ['plumifero','plumas','puffer','down jacket','acolchada','chaqueta acolchada','doudoune'],
  'Cortavientos':         ['cortavientos','windbreaker','windrunner','softshell'],
  'Chubasquero':          ['chubasquero','impermeable','rain jacket','raincoat','hardshell'],
  'Chaleco':              ['chaleco','gilet','vest','chaleco acolchado'],
  'Vaquero':              ['vaquero','vaqueros','jeans','jean','denim','tejanos','pantalon vaquero','pitillo'],
  'Chino':                ['chino','chinos','pantalon chino','chino pants'],
  'Cargo':                ['cargo','pantalon cargo','cargo pants','cargos'],
  'Jogger':               ['jogger','joggers','pantalon chandal','chandal','sweatpants','jogging'],
  'Pantalón vestir':      ['pantalon','pantalones','pantalon vestir','trousers','pants','pantalon traje','dress pants','slacks'],
  'Pantalón lino':        ['pantalon lino','pantalon de lino','linen trousers','linen pants'],
  'Pantalón técnico':     ['pantalon tecnico','culotte largo','mallas running','pantalon deportivo','track pants'],
  'Mallas':               ['mallas','leggings','leggin','tights','licras'],
  'Shorts':               ['short','shorts','pantalon corto'],
  'Bermudas':             ['bermuda','bermudas'],
  'Short técnico':        ['short tecnico','culotte','short running','short deportivo'],
  'Bañador':              ['banador','swim shorts','swimwear','bikini','boardshort','trunks'],
  'Falda':                ['falda','faldas','skirt'],
  'Vestido':              ['vestido','vestidos','dress'],
  'Mono':                 ['mono','jumpsuit','peto','dungarees','overall'],
  'Sneakers':             ['sneakers','sneaker','bambas','bamba','zapatillas','zapatilla','zapatillas deportivas','deportivas','trainers','trainer','tenis','shoes','zapatilla casual'],
  'Zapatillas running':   ['running','zapatillas running','running shoes','zapatillas de correr','runners'],
  'Zapatillas trail':     ['trail','zapatillas trail','trail running','zapatillas de monte'],
  'Botas':                ['bota','botas','boot','boots','chelsea boots','botas de montana','botas trekking'],
  'Botines':              ['botin','botines','ankle boots','chelsea'],
  'Zapatos Oxford':       ['zapatos','zapato','zapatos oxford','oxford','derby','blucher','zapatos vestir','dress shoes','richelieu'],
  'Mocasines':            ['mocasin','mocasines','loafer','loafers','penny loafer'],
  'Náuticos':             ['nautico','nauticos','boat shoes','top sider'],
  'Sandalias':            ['sandalia','sandalias','sandals','alpargata','alpargatas','esparto'],
  'Chanclas':             ['chancla','chanclas','flip flop','flip flops','slider','sliders'],
  'Tacones':              ['tacon','tacones','heels','stiletto','salon'],
  'Bailarinas':           ['bailarina','bailarinas','ballet flats','merceditas','manoletinas'],
  'Botas de fútbol':      ['botas de futbol','botas futbol','football boots','tacos'],
  'Mochila':              ['mochila','mochilas','backpack','rucksack'],
  'Bolso':                ['bolso','bolsos','bag','tote','bandolera','shoulder bag','crossbody','rinonera'],
  'Cartera':              ['cartera','carteras','wallet','monedero','tarjetero'],
  'Gorra':                ['gorra','gorras','cap','snapback','trucker','five panel'],
  'Gorro':                ['gorro','gorros','beanie','sombrero','bucket hat'],
  'Bufanda':              ['bufanda','bufandas','scarf','fular','chal'],
  'Cinturón':             ['cinturon','cinturones','belt'],
  'Corbata':              ['corbata','corbatas','tie','pajarita','bow tie'],
  'Reloj':                ['reloj','relojes','watch','smartwatch'],
  'Gafas de sol':         ['gafas','gafas de sol','sunglasses','lentes de sol'],
  'Guantes':              ['guante','guantes','gloves','manoplas'],
  'Calcetines':           ['calcetin','calcetines','socks','medias'],
  'Pañuelo':              ['panuelo','panuelos','pocket square','bandana'],
  'Joya':                 ['joya','joyas','collar','pulsera','anillo','pendientes','cadena','jewelry']
};
Object.entries(CAT_SINONIMOS).forEach(([canon, lista]) => {
  CAT_ALIAS[slug(canon)] = canon;
  lista.forEach(a => { const k = slug(a); if (!CAT_ALIAS[k]) CAT_ALIAS[k] = canon; });
});

/**
 * Tipo canónico del catálogo a partir de cualquier texto: lo que dice la IA,
 * la línea de un ticket, el título de una tienda o lo que teclee el usuario.
 * Devuelve '' si no hay señal — nunca elige el primero de la lista por salir del paso.
 *
 * El `normalizeCat` anterior vivía en app.js con un mapa de 30 traducciones y
 * una regla de "coincidencia parcial única" que convertía la respuesta
 * genérica y correcta de la IA en una específica y errónea: 'camisa' se volvía
 * 'Sobrecamisa' y 'chaqueta' se volvía 'Chaqueta denim'. Aquí el alias manda,
 * y la frase más larga que encaje gana sobre la más corta.
 */
export function canonCat(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (!k) return '';
  if (CAT_ALIAS[k]) return CAT_ALIAS[k];

  // Frases de dentro del texto, de la más larga a la más corta: así
  // "chaqueta vaquera oversize" da Chaqueta denim y no Bomber.
  const pal = k.split(' ').filter(Boolean);
  for (let n = Math.min(4, pal.length); n >= 1; n--) {
    for (let i = 0; i + n <= pal.length; i++) {
      const trozo = pal.slice(i, i + n).join(' ');
      if (CAT_ALIAS[trozo]) return CAT_ALIAS[trozo];
    }
  }
  return '';
}

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
  // 1. ¿es un tipo del catálogo? Entonces el grupo está escrito, no se deduce.
  const directo = GRUPO_DE_CAT[t.trim()];
  if (directo) return directo;
  const porAlias = CAT_ALIAS[t.trim()];
  if (porAlias && GRUPO_DE_CAT[slug(porAlias)]) return GRUPO_DE_CAT[slug(porAlias)];
  // 2. texto libre: diccionario de palabras.
  for (const [grupo, palabras] of PALABRAS_GRUPO) {
    for (const p of palabras) {
      const ps = slug(p);
      if (!ps) continue;
      if (t.includes(' ' + ps) || t.includes(ps + ' ')) return grupo;
    }
  }
  return '';
}

/** Grupo de un tipo del catálogo, sin adivinar nada. '' si no es del catálogo. */
export const grupoDeCat = cat => GRUPO_DE_CAT[slug(cat)] || GRUPO_DE_CAT[slug(canonCat(cat))] || '';

/** Compatibilidad con el nombre antiguo. Cae en Accesorios solo si HAY texto. */
export function catToGroup(cat) {
  const g = grupoDe(cat);
  if (g) return g;
  return vacio(cat) ? 'Accesorios' : '';
}

/* ═══════════════════════════════════════════
   1c. QUÉ SE LE PREGUNTA A CADA TIPO DE PRENDA
   ───────────────────────────────────────────
   El formulario preguntaba los quince campos a todo, así que al dar de alta
   unas zapatillas pedía «Corte: Slim Fit / Oversized / Wide Leg», que no
   significa nada en calzado, y «Estampado», que en una zapatilla es casi
   siempre ruido. Un campo que no aplica no es neutro: invita a rellenarlo mal,
   y un dato mal rellenado contamina el motor de gustos para siempre.
═══════════════════════════════════════════ */

/* Cortes que tienen sentido en cada grupo. El corte de un pantalón y el de una
   camiseta no comparten vocabulario: mezclarlos era ofrecer "Wide Leg" para un
   jersey y "Boxy" para un vaquero. */
export const CORTES = {
  'Camisetas':         ['Regular', 'Slim', 'Oversized', 'Boxy', 'Cropped'],
  'Camisas':           ['Regular', 'Slim', 'Relaxed', 'Oversized'],
  'Jerséis/Sudaderas': ['Regular', 'Slim', 'Oversized', 'Boxy'],
  'Chaquetas/Abrigos': ['Regular', 'Slim', 'Oversized', 'Cropped', 'Largo'],
  'Pantalones':        ['Slim', 'Straight', 'Regular', 'Tapered', 'Wide Leg', 'Cargo', 'Skinny', 'Flare'],
  'Shorts/Bermudas':   ['Regular', 'Slim', 'Wide'],
  'Faldas/Vestidos':   ['Ajustado', 'Recto', 'Evasé', 'Mini', 'Midi', 'Largo']
};

const CORTE_ALIAS = {
  'slim fit': 'Slim', 'regular fit': 'Regular', 'straight fit': 'Straight',
  'wide leg fit': 'Wide Leg', 'relaxed fit': 'Relaxed', 'oversize': 'Oversized',
  'loose': 'Relaxed', 'crop': 'Cropped', 'bomber': 'Regular', 'overshirt': 'Relaxed',
  'otro': '', 'carrot': 'Tapered', 'pitillo': 'Skinny'
};

/** Corte canónico dentro de los que tienen sentido para esa prenda. */
export function canonCorte(raw, cat) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  const lista = CORTES[grupoDeCat(cat) || grupoDe(cat)] || [];
  const directo = lista.find(x => slug(x) === k);
  if (directo) return directo;
  const al = CORTE_ALIAS[k];
  if (al !== undefined) return lista.includes(al) ? al : '';
  // "slim fit" → "slim": quitar la coletilla y reintentar
  const sinFit = k.replace(/\s*fit$/, '');
  const porFit = lista.find(x => slug(x) === sinFit);
  if (porFit) return porFit;
  return lista.includes(titular(k)) ? titular(k) : '';
}

/* Tipos a los que no se les pregunta la talla: no tienen. */
const SIN_TALLA = new Set(['Reloj', 'Gafas de sol', 'Bolso', 'Mochila', 'Cartera', 'Bufanda', 'Corbata', 'Pañuelo', 'Joya'].map(slug));
/* Tipos sin estampado que valga la pena registrar. */
const SIN_PATRON = new Set(['Reloj', 'Gafas de sol', 'Cinturón', 'Cartera', 'Joya'].map(slug));
/* Tipos que no cambian con la estación. */
const SIN_TEMPORADA = new Set(['Reloj', 'Gafas de sol', 'Cartera', 'Joya', 'Cinturón', 'Mochila', 'Bolso'].map(slug));

/**
 * Qué campos tienen sentido para este tipo de prenda.
 * Devuelve un objeto de booleanos; el formulario pinta solo los `true`.
 * Sin tipo todavía (`''`) se enseña todo menos el corte: es lo que se puede
 * afirmar sin saber qué es.
 */
export function camposPrenda(cat) {
  const c = canonCat(cat) || vacio(cat);
  const k = slug(c);
  const g = grupoDeCat(c) || grupoDe(c);
  const esCalzado = g === 'Calzado';
  const esAcc = g === 'Accesorios';
  return {
    brand: true,
    name: true,
    cat: true,
    // Corte: solo donde el vocabulario existe. En calzado y accesorios, no.
    fit: !!(CORTES[g] && CORTES[g].length),
    color: true,
    material: true,
    // El estampado de una zapatilla o de un reloj no aporta nada al motor.
    pattern: !esCalzado && !SIN_PATRON.has(k),
    size: !SIN_TALLA.has(k),
    price: true,
    season: !SIN_TEMPORADA.has(k),
    formality: true,
    cond: true,
    store: true,
    esCalzado, esAcc, grupo: g
  };
}

/** Cómo se mide la talla de esta prenda, para el marcador y el teclado. */
export function tallaDe(cat) {
  const g = grupoDeCat(cat) || grupoDe(cat);
  const k = slug(canonCat(cat) || cat);
  if (SIN_TALLA.has(k)) return null;
  if (g === 'Calzado') return { tipo: 'calzado', hint: '42', teclado: 'numeric', ayuda: 'Número europeo' };
  if (g === 'Pantalones' || g === 'Shorts/Bermudas') return { tipo: 'cintura', hint: '32', teclado: 'text', ayuda: 'Cintura o talla' };
  if (k === slug('Cinturón')) return { tipo: 'cintura', hint: '95', teclado: 'numeric', ayuda: 'Centímetros' };
  if (k === slug('Gorra') || k === slug('Gorro') || k === slug('Guantes') || k === slug('Calcetines')) return { tipo: 'letra', hint: 'Única', teclado: 'text', ayuda: '' };
  return { tipo: 'letra', hint: 'M', teclado: 'text', ayuda: '' };
}

/** Un ejemplo de nombre que encaje con lo que se está dando de alta. */
export function ejemploNombre(cat) {
  const k = slug(canonCat(cat) || cat);
  const porTipo = {
    [slug('Sneakers')]: 'Medalist blancas',
    [slug('Zapatillas running')]: 'Clifton 9',
    [slug('Botas')]: 'Chelsea de ante marrón',
    [slug('Vaquero')]: 'Recto lavado medio',
    [slug('Camisa Oxford')]: 'Oxford azul celeste',
    [slug('Jersey')]: 'Punto de lana marino',
    [slug('Abrigo')]: 'Abrigo de lana gris',
    [slug('Bomber')]: 'Bomber técnica negra',
    [slug('Camiseta manga corta')]: 'Camiseta básica blanca',
    [slug('Reloj')]: 'Automático de acero'
  };
  if (porTipo[k]) return porTipo[k];
  const g = grupoDeCat(cat) || grupoDe(cat);
  return { 'Calzado': 'Modelo y color', 'Accesorios': 'Modelo y color',
    'Pantalones': 'Recto lavado medio', 'Camisetas': 'Básica blanca',
    'Camisas': 'Oxford azul celeste', 'Jerséis/Sudaderas': 'Punto de lana marino',
    'Chaquetas/Abrigos': 'Parka técnica negra', 'Faldas/Vestidos': 'Midi plisada negra',
    'Shorts/Bermudas': 'Bermuda de lino beige' }[g] || 'Nombre o modelo';
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
  'Hugo Boss','Armani','Emporio Armani','Lois','Salsa','Tiffosi',

  /* Zapatillas y calzado. El agujero más caro que tenía esta lista: entraban
     unas Autry y salían como «Autry» por casualidad (el capitalizador acertó),
     pero unas «AUTRY MEDALIST» salían como marca «Autry Medalist», que para el
     motor de gustos es una marca distinta de Autry y no suma en la misma cuenta. */
  'Autry','Veja','Golden Goose','Common Projects','Axel Arigato','Hoka','Saucony',
  'Brooks','Mizuno','Diadora','Superga','Palladium','Clarks','Geox','Ecco',
  'Pikolinos','Castañer','Munich','Victoria','Gioseppo','Hoff','Wonders','Callaghan',
  'Merrell','Keen','La Sportiva','Scarpa','Hogan','Tod’s','Santoni','Magnanni',
  'Meermin','Crockett & Jones','Church’s','Sebago','Panama Jack','Mustang','Skechers',
  'Under Armour','Jordan','Yeezy','Asics Tiger','Onitsuka Tiger','Lotto','Kappa','Umbro',
  'Havaianas','Crocs','UGG','Hunter','Fluchos','Martinelli','Angel Infantes',
  'Karhu','Red Wing','Superga','Axel Arigato','Common Projects','Diadora','Saucony','Brooks',

  /* Premium y lujo: se reconocen en la etiqueta y marcan el techo de precio. */
  'Moncler','Off-White','Balenciaga','Gucci','Prada','Miu Miu','Saint Laurent',
  'Bottega Veneta','Celine','Dior','Fendi','Versace','Valentino','Burberry',
  'Alexander McQueen','Maison Margiela','Comme des Garçons','Jacquemus','Lemaire',
  'Ami Paris','Isabel Marant','Ganni','Totême','The Row','Brunello Cucinelli',
  'Loro Piana','Zegna','Canali','Corneliani','Boglioli','Lardini','Barena','Aspesi',
  'Herno','Save The Duck','K-Way','Schott','Alpha Industries','Baracuta','Sunspel',

  /* Streetwear y contemporáneo. */
  'Stüssy','Palace','Supreme','Kith','Aimé Leon Dore','Represent','Corteiz',
  'Trapstar','Fear of God','Essentials','Amiri','Rhude','Obey','HUF','Santa Cruz',
  'Thrasher','Element','Volcom','Quiksilver','Billabong','Rip Curl','Vans Vault',
  'Arte Antwerp','Wax London','Universal Works','Folk','YMC','Percival','Albam',
  'Kestin','Studio Nicholson','Auralee','Beams','Todd Snyder','J.Crew','Everlane',
  'Buck Mason','Rowing Blazers','Drake’s','Oliver Spencer','Sunnei','Marine Serre',

  /* Vaqueros. */
  'Nudie Jeans','Edwin','Orslow','Wrangler','Lee','Lee Cooper','Replay','G-Star','Scotch & Soda',
  'Jeanerica','Agolde','Frame','Mother','Closed','Mud Jeans',

  /* Outdoor y montaña. */
  'Arc’teryx','Rab','Mammut','Haglöfs','Fjällräven','Snow Peak','Norrøna','Houdini',
  'Berghaus','Montane','Ternua','Trangoworld','Boreal','Millet','Lafuma','Jack Wolfskin',

  /* Deporte y técnico: señal fuerte de `context: deporte`. */
  'Rapha','MAAP','Pas Normal Studios','Castelli','Gobik','Assos','Le Col','Santini',
  'Ciele','Satisfy','Soar','Tracksmith','Saysky','District Vision','Gymshark',
  'Lululemon','Oakley','Craft','2XU','Compressport','Arena','Speedo','Zoot','Orca',
  'Wilson','Head','Babolat','Bullpadel','Joma','Kelme','Mizuno Running','Sportful',

  /* Cadena y gran consumo en España. */
  'Primark','Shein','Kiabi','Celio','Jules','C&A','Esprit','Benetton','Sisley',
  'Tezenis','Intimissimi','Calzedonia','Women’secret','Etam','Skims','Uniqlo U',
  'Punto Roma','Roberto Verino','Pedro del Hierro','Emidio Tucci','Mirto','Sepiia',
  'Blue Banana','Hoss Intropia','Poète','Laagam','Bimba','Coolway','Singularu',
  'El Corte Inglés','Easy Wear','Green Coast','Dustin','Tommy Jeans','Superdry',
  'Jott','Ellesse','Fila','Champion','Russell Athletic','New Era','Lyle & Scott',
  'Ben Sherman','Gant','Nautica','Timberland Boot','Helly Hansen','Musto','Sperry'
].forEach(m => { MARCAS[slug(m)] = m; });

/* Mismas marcas pero sin espacios, para cuando la IA lee "NEWBALANCE" del talón
   o el usuario teclea "stoneisland" del tirón. */
const MARCAS_JUNTAS = {};
Object.entries(MARCAS).forEach(([k, v]) => { const j = k.replace(/ /g, ''); if (j !== k && !MARCAS_JUNTAS[j]) MARCAS_JUNTAS[j] = v; });

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
const NO_ES_MARCA = new Set(['', 'sin marca', 'desconocida', 'desconocido', 'na', 'n a', 'ninguna', 'generico', 'generica', 'varios', 'otros', 'otro', 'unknown', 'none', 'marca',
  // Texto de etiqueta que NO es marca y que llegaba a guardarse como tal.
  'premium', 'unisex', 'basic', 'basics', 'basico', 'basica', 'essential', 'classic', 'clasico',
  'cotton', 'organic cotton', 'algodon', 'lino', 'linen', 'wool', 'lana', 'polyester', 'poliester',
  'slim', 'slim fit', 'regular', 'regular fit', 'relaxed fit', 'oversize', 'oversized',
  'dry clean only', 'hand wash', 'lavar a mano', 'made', 'hecho a mano', 'handmade',
  'new', 'nuevo', 'nueva', 'sale', 'rebajas', 'outlet', 'size', 'talla', 'one size', 'talla unica']);

/* Además de las palabras sueltas, hay FORMAS de texto que nunca son una marca:
   la composición ("100% Cotton"), el origen ("Made in Portugal"), la talla
   ("XL", "Talla M", "42"), las instrucciones de lavado. La IA las copia de la
   etiqueta al campo marca y antes se guardaban tal cual. */
const RUIDO_ETIQUETA = [
  /\d+ ?%/,                                   // 100% cotton, 80 % lana
  /^(made|hecho|fabricado|manufactured|designed|disenado) (in|en)\b/,
  /^(talla|size|sz|t)( |$)/,
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,3}(\/\d{1,3})?)$/,
  /\b(fit|wash|lavar|lavado|planchar|iron|bleach|lejia|dry clean|tumble)\b/,
  /^(ref|art|sku|cod|codigo|model|modelo)\b/
];
const esRuidoEtiqueta = k => RUIDO_ETIQUETA.some(rx => rx.test(k));

/* Palabras corrientes que se parecen por una letra a una marca del catálogo y
   que la búsqueda de erratas convertía en marca: «Manga» → Mango, «Basics» →
   Asics, «Closet» → Closed, «Salmon» → Salomon. Una errata de verdad es de
   una marca; estas son palabras. Nunca se corrigen hacia nada. */
const PALABRAS_COMUNES = new Set(['manga', 'mangas', 'basics', 'basic', 'closet', 'salmon', 'giant', 'essential',
  'original', 'classic', 'classics', 'active', 'urban', 'street', 'vintage', 'casual', 'style', 'fashion',
  'sports', 'denim', 'linen', 'cotton', 'pocket', 'summer', 'winter', 'nature', 'natural', 'studio', 'modern',
  'home', 'house', 'world', 'island', 'club', 'team', 'united', 'company', 'factory', 'supply', 'goods',
  'camisa', 'camiseta', 'pantalon', 'zapato', 'zapatos', 'botas', 'jersey', 'sudadera', 'chaqueta', 'abrigo']);
/* Palabras que describen la prenda y que la IA copia de la etiqueta («MANGA
   CORTA», «CUELLO REDONDO»). Un texto hecho SOLO de estas no es una marca. */
const DESCRIPTORES = new Set(['manga', 'corta', 'larga', 'cuello', 'redondo', 'pico', 'alto', 'boton', 'botones', 'cremallera',
  'bolsillo', 'capucha', 'forro', 'hombre', 'mujer', 'nino', 'nina', 'unisex', 'talla', 'color', 'nuevo', 'nueva', 'de', 'con', 'sin', 'y']);
const soloDescriptores = k => { const w = k.split(' ').filter(Boolean); return w.length > 0 && w.every(x => DESCRIPTORES.has(x) || PALABRAS_COMUNES.has(x)); };

/** Capitaliza una marca desconocida de forma razonable ("nude project" → "Nude Project"). */
function titular(s) {
  const menores = new Set(['de', 'del', 'la', 'el', 'y', 'the', 'of', 'and']);
  return String(s).split(' ').filter(Boolean).map((w, i) => {
    if (i > 0 && menores.has(w)) return w;
    if (w.length <= 3 && w === w.toUpperCase()) return w;   // siglas ya en mayúsculas
    // «PURIFICACIÓN» → «Purificación»: una etiqueta en mayúsculas no es el nombre.
    const base = (w.length > 3 && w === w.toUpperCase()) ? w.toLowerCase() : w;
    return base[0].toUpperCase() + base.slice(1);
  }).join(' ');
}

/* Palabras que la IA y los tickets pegan a la marca y que no son parte de ella.
   "AUTRY MEDALIST" es Autry; "Nike Sportswear" es Nike; "Zara Man" es Zara. */
const COLETILLAS = new Set(['man','men','mens','woman','women','womens','hombre','mujer','kids','junior','sportswear','sport','performance','collection','coleccion','original','originals','edition','studio','label','brand','official','oficial','store','shop','online','es','com','sl','sa','inc','ltd','co','by','the']);

/** Distancia de edición con corte: si se pasa de `max`, devuelve max+1 y para. */
function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let mejor = i;
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + coste);
      if (fila[j] < mejor) mejor = fila[j];
    }
    if (mejor > max) return max + 1;   // toda la fila ya se pasó: no hay salvación
    prev = fila;
  }
  return prev[b.length];
}

/**
 * Marca del catálogo más parecida, si no hay empate.
 * La tolerancia sube con la longitud: con cuatro letras cualquier cambio es
 * otra marca ("Vans" y "Vera"), con diez una letra suelta es una errata de OCR.
 * Un empate entre dos marcas devuelve '' — es mejor no resolver que resolver mal.
 */
function marcaParecida(k) {
  /* Una errata se corrige hacia una marca solo si hay texto de sobra para
     estar seguros: con cinco letras, una de diferencia es otra palabra (Manga
     no es Mango). Y la primera letra tiene que coincidir: el OCR se come
     letras del medio, pero no se inventa la inicial (Basics no es Asics). */
  const max = k.length < 6 ? 0 : k.length < 9 ? 1 : 2;
  if (!max || PALABRAS_COMUNES.has(k)) return '';
  let mejor = '', mejorD = max + 1, empate = false;
  for (const [clave, nombre] of Object.entries(MARCAS)) {
    if (clave[0] !== k[0]) continue;
    const d = distancia(k, clave, max);
    if (d > max) continue;
    if (d < mejorD) { mejorD = d; mejor = nombre; empate = false; }
    else if (d === mejorD && nombre !== mejor) empate = true;
  }
  return empate ? '' : mejor;
}

/**
 * Forma canónica de una marca. '' si no es una marca de verdad.
 * canonMarca('STONE ISLAND') === canonMarca(' stone island ') === 'Stone Island'
 *
 * Cuatro intentos, de más seguro a menos: alias exacto, catálogo exacto,
 * catálogo sin espacios, y catálogo con una o dos erratas. Si ninguno acierta,
 * se capitaliza lo que llegó — no se descarta: una marca que no está en la
 * lista sigue siendo una marca, y el motor de gustos la cuenta igual.
 */
export function canonMarca(raw) { return resolverMarca(raw).marca; }

/**
 * Como canonMarca, pero diciendo CÓMO se ha llegado a la marca. Eso es lo que
 * permite a la app decir «leída en la etiqueta» frente a «probable»:
 *   'catalogo'    — coincide con una marca del catálogo (o un alias conocido)
 *   'errata'      — se ha corregido una errata hacia una del catálogo: probable
 *   'desconocida' — no está en el catálogo; se conserva tal cual, capitalizada
 *   ''            — no es una marca (vacío, ruido de etiqueta)
 */
export function resolverMarca(raw) {
  const nada = { marca: '', via: '' };
  const v = vacio(raw); if (!v) return nada;
  let k = slug(v);
  if (!k || NO_ES_MARCA.has(k) || esRuidoEtiqueta(k) || /\d+ ?%/.test(v)) return nada;
  const cat = m => ({ marca: m, via: 'catalogo' });
  if (ALIAS_MARCA[k]) return cat(ALIAS_MARCA[k]);
  if (MARCAS[k]) return cat(MARCAS[k]);

  // Quitar coletillas por la derecha: "autry medalist" → "autry". Por la
  // izquierda solo artículos: «Original Craft» no es la marca Craft.
  const pal = k.split(' ').filter(Boolean);
  while (pal.length > 1 && COLETILLAS.has(pal[pal.length - 1])) pal.pop();
  while (pal.length > 1 && (pal[0] === 'the' || pal[0] === 'by')) pal.shift();
  const limpio = pal.join(' ');
  if (limpio !== k) {
    if (ALIAS_MARCA[limpio]) return cat(ALIAS_MARCA[limpio]);
    if (MARCAS[limpio]) return cat(MARCAS[limpio]);
  }
  // El prefijo más largo que sea una marca conocida: "autry medalist low" → Autry.
  // El alias va primero: «Boss Orange» es Hugo Boss, no una marca «Boss» aparte.
  for (let n = pal.length; n >= 1; n--) {
    const pre = pal.slice(0, n).join(' ');
    if (ALIAS_MARCA[pre]) return cat(ALIAS_MARCA[pre]);
    if (MARCAS[pre]) return cat(MARCAS[pre]);
  }

  const juntas = limpio.replace(/ /g, '');
  if (MARCAS_JUNTAS[juntas]) return cat(MARCAS_JUNTAS[juntas]);

  const cerca = marcaParecida(limpio);
  if (cerca) return { marca: cerca, via: 'errata' };
  const conservada = () => {

  // Desconocida: se conserva tal cual la escribieron, solo bien capitalizada y
  // sin las coletillas. Se capitaliza sobre el texto ORIGINAL, no sobre el
  // slug: el slug no tiene acentos, y «Purificación» no puede acabar en
  // «Purificacion» solo por no estar en el catálogo.
  const original = v.replace(/[®™©]/g, ' ').split(/\s+/).filter(Boolean)
    .filter(w => !COLETILLAS.has(slug(w)) || pal.includes(slug(w)));
  return titular(original.length ? original.join(' ') : (limpio || k));
  };
  // Una palabra corriente («Manga», «Closet») se conserva si la escribe el
  // usuario —puede ser de verdad una marca—, pero no cuenta como marca leída.
  if (PALABRAS_COMUNES.has(limpio) || soloDescriptores(limpio)) return { marca: conservada(), via: 'palabra' };
  return { marca: conservada(), via: 'desconocida' };
}

/** ¿Está esta marca en el catálogo, o la estamos capitalizando a ojo? */
export const marcaConocida = m => { const k = slug(canonMarca(m)); return !!(MARCAS[k] || ALIAS_MARCA[k]); };

/** Nombres canónicos del catálogo, para alimentar el prompt de visión. */
export const MARCAS_CATALOGO = [...new Set(Object.values(MARCAS))];

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
  'Gris':      ['gris','grey','gray','antracita','marengo','plomo','perla','plata','plateado','silver','metalizado'],
  'Marino':    ['marino','azul marino','navy','azul noche','azulon'],
  'Azul':      ['azul','blue','celeste','cielo','denim','vaquero','indigo','turquesa','petroleo'],
  'Verde':     ['verde','green','esmeralda','botella','menta','pistacho'],
  'Kaki/Oliva':['kaki','caqui','khaki','oliva','olive','militar','verde militar','verde oliva'],
  'Marrón':    ['marron','brown','chocolate','cafe','coñac','conac','cuero','tabaco','castano'],
  'Beige':     ['beige','arena','piedra','taupe','topo','camel','tostado','duna','visón','vison'],
  'Crudo':     ['crudo','ecru','hueso','off white','offwhite','natural','marfil','vainilla','crema','cream'],
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
/* Palabras que son color solo a falta de otra cosa: «vaquero negro» es negro,
   no azul, y «bota de cuero blanca» es blanca, no marrón. */
const COLOR_DEBIL = new Set(['vaquero', 'denim', 'cuero', 'natural', 'estampado', 'militar', 'print', 'varios', 'multi', 'cafe', 'oro', 'vino', 'cielo', 'arena', 'piedra']);
/* «azules», «blancas», «grises»: en una búsqueda la gente escribe el color
   concordando con la prenda. Se prueba la palabra tal cual y luego en
   singular y en masculino. */
function formasColor(w) {
  const f = [w];
  if (w.endsWith('es') && w.length > 4) f.push(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 3) f.push(w.slice(0, -1));
  f.slice().forEach(x => { if (x.endsWith('a') && x.length > 3) f.push(x.slice(0, -1) + 'o'); });
  return f;
}
export function canonColor(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (COLOR_ALIAS[k]) return COLOR_ALIAS[k];
  // frases de dos palabras primero ("azul marino" antes que "azul")
  const pal = k.split(' ').filter(Boolean);
  let debil = '';
  for (let n = Math.min(3, pal.length); n >= 1; n--) {
    for (let i = 0; i + n <= pal.length; i++) {
      const trozo = pal.slice(i, i + n).join(' ');
      const formas = n === 1 ? formasColor(trozo) : [trozo];
      for (const f of formas) {
        if (!COLOR_ALIAS[f]) continue;
        if (n === 1 && COLOR_DEBIL.has(f)) { debil = debil || COLOR_ALIAS[f]; continue; }
        return COLOR_ALIAS[f];
      }
    }
  }
  return debil;
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
   4b. PATRÓN
   Antes esto se deducía con un regex sobre el NOMBRE de la prenda, y las
   etiquetas (`tags`) que también se miraban no se podían poner desde ningún
   sitio de la app. Ahora la IA lo dice explícitamente y el usuario lo corrige.
═══════════════════════════════════════════ */

export const PATRONES = ['Liso', 'Estampado', 'Rayas', 'Cuadros', 'Logo'];
const PATRON_ALIAS = {};
({
  'Liso':      ['liso','lisa','plain','solid','unicolor','basico'],
  'Estampado': ['estampado','estampada','print','printed','flores','floral','camuflaje','camo','animal','leopardo','grafico','graphic','dibujo','allover','tie dye'],
  'Rayas':     ['rayas','rayado','stripe','striped','marinera','breton'],
  'Cuadros':   ['cuadros','cuadro','check','checked','tartan','vichy','pata de gallo','principe de gales'],
  'Logo':      ['logo','logotipo','monograma','big logo','logo grande','branding']
}) && Object.entries({
  'Liso':      ['liso','lisa','plain','solid','unicolor','basico'],
  'Estampado': ['estampado','estampada','print','printed','flores','floral','camuflaje','camo','animal','leopardo','grafico','graphic','dibujo','allover','tie dye'],
  'Rayas':     ['rayas','rayado','stripe','striped','marinera','breton'],
  'Cuadros':   ['cuadros','cuadro','check','checked','tartan','vichy','pata de gallo','principe de gales'],
  'Logo':      ['logo','logotipo','monograma','big logo','logo grande','branding']
}).forEach(([canon, lista]) => lista.forEach(a => { PATRON_ALIAS[slug(a)] = canon; }));

export function canonPatron(raw) {
  const v = vacio(raw); if (!v) return '';
  const k = slug(v);
  if (PATRON_ALIAS[k]) return PATRON_ALIAS[k];
  for (const [alias, canon] of Object.entries(PATRON_ALIAS)) if (k.includes(alias)) return canon;
  return '';
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
  // El tipo pasa por el catálogo: 'bambas', 'trainers' y 'zapatillas' son
  // Sneakers, no tres archivadores distintos. Si no encaja con nada, se
  // respeta lo que hubiera — mejor un tipo raro que perder el dato.
  out.cat = canonCat(out.cat) || vacio(out.cat) || '';
  // Sin nombre, el tipo hace de nombre: una tarjeta en blanco no dice nada, y
  // «Prenda» (lo que ponía antes el formulario manual) tampoco.
  out.name = vacio(out.name) || out.cat || '';
  out.catGroup = grupoDeCat(out.cat) || grupoDe(out.catGroup) || grupoDe(out.cat) || grupoDe(out.name) || '';
  // El corte se valida contra los que existen para ese grupo: un vaquero no
  // puede ser "Boxy" y unas zapatillas no pueden ser nada.
  if ('fit' in out) out.fit = canonCorte(out.fit, out.cat);
  if (!camposPrenda(out.cat).fit) out.fit = '';
  out.color = canonColor(out.color) || canonColor(out.name) || '';
  out.material = canonMaterial(out.material);
  out.size = canonTalla(out.size);
  out.store = canonTienda(out.store);
  out.sku = vacio(out.sku) || '';
  out.pattern = canonPatron(out.pattern) || canonPatron(out.name) || '';
  // La confianza por campo que devuelve la IA se tiraba nada más pintar el
  // formulario. Guardarla permite volver a preguntar después por lo que quedó
  // dudoso, en vez de dar por bueno un dato inventado para siempre.
  if (out.conf && typeof out.conf === 'object') {
    const c = {};
    for (const [k, v] of Object.entries(out.conf)) { const n = Number(v); if (Number.isFinite(n)) c[k] = Math.max(0, Math.min(1, n)); }
    out.conf = c;
  } else delete out.conf;

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

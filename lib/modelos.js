/* ═══════════════════════════════════════════════════════════════
   MODELOS — qué es exactamente lo que el usuario está mirando

   «adidas gazelle azules» no es «unas zapatillas azules de adidas». Es un
   modelo concreto, de una familia concreta: zapatilla baja de ante, de las
   de grada de fútbol de los 70. Las alternativas que tienen sentido son las
   de esa familia (Spezial, Palermo, Mexico 66), no «zapatillas azules».

   Este módulo sabe tres cosas:
     1. Qué modelos icónicos existen, de qué marca son y a qué familia
        pertenecen. Es una lista a mano, corta y revisable, no una base de
        datos: cubre lo que la gente más mira en tienda.
     2. Leer una búsqueda libre y separar marca, modelo, color y tipo.
     3. Ordenar alternativas por parecido, subiendo las marcas que el
        usuario ya ha comprado.

   Es puro, como lib/taste.js: no toca DOM ni red. Pruebas en
   lib/modelos.test.mjs.
   ═══════════════════════════════════════════════════════════════ */
import { slug, resolverMarca, canonColor, canonCat, grupoDeCat, mismaMarca } from './normalize.js';

/* Familias. `context` es dónde vive el calzado de esa familia: una Gazelle es
   de calle aunque adidas sea una marca deportiva, y una Pegasus es de correr
   aunque la lleve alguien al súper. */
export const FAMILIAS = {
  terrace:  { nombre: 'Retro de ante',        desc: 'baja, de ante y suela de goma, estilo grada de los 70', cat: 'Sneakers',          context: 'calle' },
  court:    { nombre: 'Tenis de piel',        desc: 'minimalista de piel, suela plana',                      cat: 'Sneakers',          context: 'calle' },
  basket:   { nombre: 'Baloncesto retro',     desc: 'de piel, suela gruesa, caña baja o media',              cat: 'Sneakers',          context: 'calle' },
  runner:   { nombre: 'Runner retro',         desc: 'de ante y malla, suela de EVA, años 80-90',             cat: 'Sneakers',          context: 'calle' },
  tech:     { nombre: 'Runner de los 2000',   desc: 'malla técnica y mucha capa, estilo 2000',               cat: 'Sneakers',          context: 'calle' },
  lona:     { nombre: 'De lona',              desc: 'de lona y suela vulcanizada',                           cat: 'Sneakers',          context: 'calle' },
  running:  { nombre: 'Running',              desc: 'de correr, con amortiguación',                          cat: 'Zapatillas running', context: 'deporte' },
  trail:    { nombre: 'Trail',                desc: 'de montaña, con tacos',                                 cat: 'Zapatillas trail',   context: 'deporte' },
  botas:    { nombre: 'Botas clásicas',       desc: 'botas de trabajo o de cordones',                        cat: 'Botas',              context: 'calle' },
  vaquero:  { nombre: 'Vaquero clásico',      desc: 'vaquero de cinco bolsillos',                            cat: 'Vaquero',            context: 'calle' }
};

/* [marca, modelo, familia, precio orientativo en €, rasgos, alias extra]
   El precio es el de tienda habitual en España, para ordenar por «más barato
   que lo que miras» cuando no hay precios en vivo. Nunca se enseña como el
   precio real: se enseña como «suele costar». Los rasgos afinan el parecido
   dentro de la familia (una Spezial se parece más a una Gazelle que una
   Samba, porque las dos son de ante). */
const L = [
  // ── Retro de ante (terrace)
  ['Adidas', 'Gazelle', 'terrace', 120, ['ante', 'bajo', 'goma'], ['gazelle indoor', 'gazelle bold']],
  ['Adidas', 'Samba', 'terrace', 120, ['piel', 'bajo', 'goma'], ['samba og', 'samba xlg']],
  ['Adidas', 'Spezial', 'terrace', 110, ['ante', 'bajo', 'goma'], ['handball spezial']],
  ['Adidas', 'Campus', 'terrace', 120, ['ante', 'goma', 'grueso'], ['campus 00s', 'campus 80s']],
  ['Adidas', 'Taekwondo', 'terrace', 100, ['piel', 'muy bajo'], []],
  ['Adidas', 'Tokyo', 'terrace', 100, ['ante', 'muy bajo'], []],
  ['Puma', 'Palermo', 'terrace', 90, ['ante', 'bajo', 'goma'], []],
  ['Puma', 'Suede', 'terrace', 85, ['ante', 'goma'], ['suede classic', 'puma suede']],
  ['Puma', 'Speedcat', 'terrace', 100, ['ante', 'muy bajo'], ['speedcat og']],
  ['Puma', 'Delphin', 'terrace', 90, ['ante', 'bajo'], []],
  ['Onitsuka Tiger', 'Mexico 66', 'terrace', 120, ['ante', 'bajo'], ['mexico66', 'mexico 66 sd']],
  ['Reebok', 'Club C Grounds', 'terrace', 90, ['ante', 'bajo', 'goma'], []],
  ['Diadora', 'B.Elite', 'terrace', 100, ['ante', 'bajo'], ['b elite']],
  ['New Balance', 'CT302', 'terrace', 110, ['ante', 'bajo'], []],

  // ── Tenis de piel (court)
  ['Adidas', 'Stan Smith', 'court', 110, ['piel', 'blanca', 'plano'], ['stansmith']],
  ['Adidas', 'Advantage', 'court', 70, ['piel', 'blanca', 'plano'], []],
  ['Reebok', 'Club C 85', 'court', 90, ['piel', 'plano'], ['club c', 'clubc']],
  ['Veja', 'V-10', 'court', 150, ['piel', 'plano'], ['v10', 'v 10']],
  ['Veja', 'Campo', 'court', 140, ['piel', 'plano'], []],
  ['Veja', 'Esplar', 'court', 130, ['piel', 'plano'], []],
  ['Autry', 'Medalist', 'court', 150, ['piel', 'plano'], []],
  ['Common Projects', 'Achilles', 'court', 400, ['piel', 'blanca', 'plano'], ['achilles low']],
  ['Nike', 'Killshot', 'court', 100, ['piel', 'plano', 'goma'], ['killshot 2']],
  ['Lacoste', 'Carnaby', 'court', 100, ['piel', 'plano'], []],
  ['Axel Arigato', 'Clean 90', 'court', 220, ['piel', 'plano'], []],
  ['Puma', 'Smash', 'court', 60, ['piel', 'plano'], []],
  ['Asics', 'Japan S', 'court', 70, ['piel', 'plano'], []],
  ['New Balance', '480', 'court', 100, ['piel', 'plano'], ['bb480'], true],

  // ── Baloncesto retro (basket)
  ['Nike', 'Air Force 1', 'basket', 120, ['piel', 'grueso'], ['af1', 'air force', 'force 1']],
  ['Nike', 'Dunk', 'basket', 120, ['piel', 'grueso'], ['dunk low', 'sb dunk']],
  ['Nike', 'Air Jordan 1', 'basket', 180, ['piel', 'caña'], ['jordan 1', 'aj1']],
  ['Nike', 'Blazer', 'basket', 100, ['piel', 'caña'], ['blazer mid', 'blazer low']],
  ['Adidas', 'Forum', 'basket', 110, ['piel', 'grueso'], ['forum low', 'forum 84']],
  ['Adidas', 'Superstar', 'basket', 110, ['piel', 'grueso'], []],
  ['New Balance', '550', 'basket', 130, ['piel', 'grueso'], ['bb550'], true],
  ['Puma', 'Slipstream', 'basket', 100, ['piel', 'grueso'], []],
  ['Reebok', 'BB 4000', 'basket', 100, ['piel', 'grueso'], ['bb4000']],

  // ── Runner retro
  ['New Balance', '574', 'runner', 100, ['ante', 'malla'], ['ml574'], true],
  ['New Balance', '327', 'runner', 100, ['ante', 'malla'], ['ms327'], true],
  ['New Balance', '990', 'runner', 220, ['ante', 'malla'], ['990v6', '990v5'], true],
  ['Nike', 'Air Max 90', 'runner', 150, ['malla', 'aire'], ['am90', 'air max90']],
  ['Nike', 'Air Max 1', 'runner', 150, ['malla', 'aire'], ['am1']],
  ['Nike', 'Cortez', 'runner', 90, ['piel', 'bajo'], []],
  ['Adidas', 'SL 72', 'runner', 100, ['ante', 'malla', 'bajo'], ['sl72']],
  ['Saucony', 'Jazz', 'runner', 90, ['ante', 'malla'], ['jazz original']],
  ['Saucony', 'Shadow 6000', 'runner', 120, ['ante', 'malla'], ['shadow']],
  ['Asics', 'Gel-Lyte III', 'runner', 130, ['ante', 'malla'], ['gel lyte', 'gel lyte iii', 'gel lyte 3']],
  ['Karhu', 'Fusion 2.0', 'runner', 140, ['ante', 'malla'], ['fusion']],
  ['Diadora', 'N9000', 'runner', 110, ['ante', 'malla'], []],
  ['Reebok', 'Classic Leather', 'runner', 90, ['piel'], []],

  // ── Runner de los 2000 (tech)
  ['New Balance', '530', 'tech', 110, ['malla', 'capas'], ['mr530'], true],
  ['New Balance', '2002R', 'tech', 150, ['ante', 'malla', 'capas'], ['2002 r'], true],
  ['New Balance', '9060', 'tech', 160, ['ante', 'malla', 'grueso'], [], true],
  ['New Balance', '1906R', 'tech', 160, ['malla', 'capas'], ['1906'], true],
  ['Asics', 'Gel-1130', 'tech', 120, ['malla', 'capas'], ['gel 1130', '1130']],
  ['Asics', 'Gel-Kayano 14', 'tech', 150, ['malla', 'capas'], ['kayano 14', 'gel kayano 14']],
  ['Asics', 'GT-2160', 'tech', 130, ['malla', 'capas'], ['gt 2160', '2160']],
  ['Nike', 'Vomero 5', 'tech', 160, ['malla', 'capas'], ['zoom vomero 5']],
  ['Nike', 'P-6000', 'tech', 110, ['malla', 'capas'], ['p6000']],
  ['Salomon', 'XT-6', 'tech', 180, ['malla', 'capas'], ['xt 6', 'xt6']],
  ['Mizuno', 'Wave Rider 10', 'tech', 120, ['malla', 'capas'], []],

  // ── De lona
  ['Converse', 'Chuck Taylor', 'lona', 70, ['lona', 'vulcanizada'], ['all star', 'chuck taylor all star']],
  ['Converse', 'Chuck 70', 'lona', 95, ['lona', 'vulcanizada'], ['chuck 70s']],
  ['Vans', 'Old Skool', 'lona', 80, ['lona', 'ante', 'vulcanizada'], ['oldskool']],
  ['Vans', 'Authentic', 'lona', 70, ['lona', 'vulcanizada'], []],
  ['Vans', 'Sk8-Hi', 'lona', 90, ['lona', 'caña'], ['sk8 hi', 'sk8hi']],
  ['Vans', 'Slip-On', 'lona', 70, ['lona', 'vulcanizada'], ['slip on']],
  ['Superga', '2750', 'lona', 70, ['lona', 'vulcanizada'], [], true],

  // ── Running
  ['Nike', 'Pegasus', 'running', 140, ['malla'], ['air zoom pegasus', 'pegasus 41']],
  ['Nike', 'Vaporfly', 'running', 270, ['malla', 'carbono'], []],
  ['Nike', 'Invincible', 'running', 190, ['malla'], []],
  ['Asics', 'Gel-Nimbus', 'running', 190, ['malla'], ['nimbus', 'gel nimbus']],
  ['Asics', 'Novablast', 'running', 150, ['malla'], []],
  ['Asics', 'Gel-Kayano', 'running', 190, ['malla'], ['kayano', 'gel kayano']],
  ['Hoka', 'Clifton', 'running', 150, ['malla'], []],
  ['Hoka', 'Bondi', 'running', 180, ['malla'], []],
  ['Adidas', 'Adizero', 'running', 160, ['malla'], ['adizero boston', 'adios pro']],
  ['Adidas', 'Ultraboost', 'running', 180, ['malla'], ['ultra boost']],
  ['Saucony', 'Endorphin', 'running', 170, ['malla'], []],
  ['Saucony', 'Ride', 'running', 140, ['malla'], []],
  ['New Balance', 'Fresh Foam 1080', 'running', 180, ['malla'], ['1080']],
  ['On Running', 'Cloudmonster', 'running', 180, ['malla'], []],
  ['Brooks', 'Ghost', 'running', 140, ['malla'], []],
  ['Mizuno', 'Wave Rider', 'running', 140, ['malla'], []],
  ['Puma', 'Deviate Nitro', 'running', 160, ['malla'], ['deviate']],

  // ── Trail
  ['Salomon', 'Speedcross', 'trail', 140, ['tacos'], []],
  ['Hoka', 'Speedgoat', 'trail', 160, ['tacos'], []],
  ['Nike', 'Pegasus Trail', 'trail', 150, ['tacos'], []],
  ['Asics', 'Trabuco', 'trail', 140, ['tacos'], []],
  ['La Sportiva', 'Bushido', 'trail', 150, ['tacos'], []],

  // ── Botas
  ['Dr. Martens', '1460', 'botas', 190, ['piel', 'caña'], [], true],
  ['Timberland', '6-Inch', 'botas', 200, ['nobuk', 'caña'], ['6 inch', 'premium 6', 'yellow boot']],
  ['Red Wing', 'Iron Ranger', 'botas', 350, ['piel', 'caña'], []],
  ['Clarks', 'Desert Boot', 'botas', 140, ['ante', 'caña'], ['desert']],

  // ── Vaqueros
  ["Levi’s", '501', 'vaquero', 110, ['recto'], [], true],
  ["Levi’s", '511', 'vaquero', 100, ['slim'], [], true],
  ["Levi’s", '505', 'vaquero', 100, ['recto'], [], true]
];

/* Modelos con índice. `soloConMarca`: alias que son solo un número («550»,
   «501») y que sin la marca delante no significan nada — «talla 42» no es
   un modelo, ni «550 €». */
export const MODELOS = L.map(([marca, modelo, familia, precio, rasgos, alias, soloConMarca]) => ({
  id: slug(marca + ' ' + modelo), marca, modelo, familia, precio, rasgos,
  alias: [...new Set([slug(modelo), ...alias.map(slug)])],
  soloConMarca: !!soloConMarca
}));

/* Índice alias → modelos (varios pueden compartir alias: «ride», «shadow»). */
const POR_ALIAS = new Map();
MODELOS.forEach(m => m.alias.forEach(a => {
  if (!POR_ALIAS.has(a)) POR_ALIAS.set(a, []);
  POR_ALIAS.get(a).push(m);
}));
const ALIAS_ORDENADOS = [...POR_ALIAS.keys()].sort((a, b) => b.length - a.length);

/* Encuentra un alias como palabra entera dentro de un texto ya en slug. */
const contieneFrase = (texto, frase) => (' ' + texto + ' ').includes(' ' + frase + ' ');

/**
 * El modelo que aparece en un texto, si hay alguno. Gana el alias más largo
 * («gel kayano 14» antes que «kayano»; «pegasus trail» antes que «pegasus»).
 * Con marca conocida se descartan los modelos de otras marcas.
 */
export function buscarModelo(texto, marca = '') {
  const t = slug(texto);
  if (!t) return null;
  for (const a of ALIAS_ORDENADOS) {
    if (!contieneFrase(t, a)) continue;
    let cands = POR_ALIAS.get(a);
    if (marca) cands = cands.filter(m => mismaMarca(m.marca, marca));
    else cands = cands.filter(m => !m.soloConMarca);
    if (cands.length === 1) return cands[0];
    if (cands.length > 1 && marca) return cands[0];
    // Alias ambiguo sin marca («ride», «shadow»): no se adivina.
  }
  return null;
}

/* Palabras que describen y no identifican: se quitan para quedarse con lo
   que de verdad distingue al producto. */
const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'unas', 'unos', 'una', 'un', 'y', 'con', 'en', 'para',
  'zapatillas', 'zapatilla', 'bambas', 'deportivas', 'sneakers', 'sneaker', 'tenis', 'hombre', 'mujer', 'talla', 'color']);

/**
 * Lee lo que el usuario ha escrito en tienda y lo separa en piezas.
 *   parseBusqueda('adidas gazelle azules')
 *   → { marca:'Adidas', modelo:{Gazelle…}, familia:'terrace', color:'Azul',
 *       cat:'Sneakers', grupo:'Calzado', consulta:'Adidas Gazelle azul' }
 * `marcaExtra` es lo que haya en el campo marca, si lo hay: manda sobre lo leído.
 */
export function parseBusqueda(texto, marcaExtra = '') {
  const t = slug(texto);
  const pal = t.split(' ').filter(Boolean);

  // Marca: la del campo, o el n-grama más largo que sea marca del catálogo.
  let marca = '';
  const extra = resolverMarca(marcaExtra);
  if (extra.marca) marca = extra.marca;
  const usadas = new Set();
  if (!marca) {
    buscar: for (let n = Math.min(3, pal.length); n >= 1; n--) {
      for (let i = 0; i + n <= pal.length; i++) {
        const trozo = pal.slice(i, i + n).join(' ');
        const r = resolverMarca(trozo);
        if (r.via === 'catalogo' || (r.via === 'errata' && trozo.length >= 6)) {
          marca = r.marca;
          for (let j = i; j < i + n; j++) usadas.add(j);
          break buscar;
        }
      }
    }
  }

  const modelo = buscarModelo(t, marca);
  if (modelo && !marca) marca = modelo.marca;   // «gazelle azules» ya dice adidas
  const familia = modelo ? modelo.familia : '';

  // Color: solo sobre las palabras que no son marca ni modelo, para que
  // «Air Force 1» no sea un color ni «Samba» un tono.
  const sinModelo = modelo ? modelo.alias.reduce((acc, a) => (' ' + acc + ' ').replace(' ' + a + ' ', ' ').trim(), t) : t;
  const resto = sinModelo.split(' ').filter((w, i) => w && !(marca && slug(marca).split(' ').includes(w)));
  const color = canonColor(resto.join(' '));

  const cat = (familia && FAMILIAS[familia].cat) || canonCat(resto.filter(w => !RELLENO.has(w) || /zapatill|bamba|sneaker/.test(w)).join(' ')) || canonCat(t) || '';
  const grupo = grupoDeCat(cat) || '';

  const colorPalabra = color ? color.toLowerCase().replace('kaki/oliva', 'kaki') : '';
  // Sin modelo, la consulta es lo que escribió menos el relleno y el color
  // (que va al final, normalizado): «camisa lino blanca massimo dutti» →
  // «Massimo Dutti camisa lino blanco».
  const descriptivo = modelo ? modelo.modelo : resto.filter(w => !RELLENO.has(w) && canonColor(w) === '').join(' ');
  const consulta = [marca, descriptivo || (cat ? cat.toLowerCase() : ''), colorPalabra]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

  return { marca, modelo, familia, color, cat, grupo, consulta: consulta || texto.trim() };
}

/** El modelo de una prenda del armario, si se reconoce por su marca y nombre. */
export const modeloDePrenda = g => buscarModelo([g.brand, g.name].filter(Boolean).join(' '), g.brand || '');

/**
 * Alternativas a lo que el usuario mira, ordenadas por parecido.
 *
 * Sube lo que conoce: una marca de la que ya tiene calzado vale más que una
 * de la que tiene camisetas, y esta más que una que no ha comprado nunca.
 * Baja lo que no ayuda: la misma marca (es un hermano, no una alternativa),
 * y lo que cuesta bastante más que lo que tiene delante.
 *
 * Cada alternativa lleva sus motivos, para que la app pueda decir POR QUÉ la
 * propone. Si el motivo no se puede decir, la alternativa no debería estar.
 */
export function alternativas(p, { armario = [], likedBrands = [], precioVisto = null, max = 4 } = {}) {
  if (!p || !p.familia) return [];
  const ref = p.modelo;
  const precioRef = precioVisto || (ref && ref.precio) || null;
  const vivas = armario.filter(g => g && g.status !== 'venta');
  const cuenta = (pred) => vivas.filter(pred).length;
  const deGrupo = marca => cuenta(g => mismaMarca(g.brand, marca) && (g.catGroup || grupoDeCat(g.cat)) === 'Calzado');
  const deMarca = marca => cuenta(g => mismaMarca(g.brand, marca));
  const leGusta = marca => likedBrands.some(b => mismaMarca(b, marca));
  const tieneEste = m => vivas.some(g => { const x = modeloDePrenda(g); return x && x.id === m.id; });

  const rasgosRef = new Set((ref && ref.rasgos) || []);
  const parecido = m => {
    if (!rasgosRef.size) return 0;
    const comunes = m.rasgos.filter(r => rasgosRef.has(r)).length;
    return comunes / Math.max(rasgosRef.size, m.rasgos.length);
  };

  return MODELOS
    .filter(m => m.familia === p.familia && (!ref || m.id !== ref.id))
    // Una alternativa al doble de precio no es una alternativa: es otra compra.
    .filter(m => !precioRef || m.precio <= precioRef * 2)
    .map(m => {
      const motivos = [];
      let s = 50 + Math.round(parecido(m) * 25);
      const enCalzado = deGrupo(m.marca), total = deMarca(m.marca);
      if (enCalzado) { s += 30; motivos.push(`Ya tienes calzado ${m.marca}`); }
      else if (total) { s += 15; motivos.push(`Ya compras ${m.marca}`); }
      if (leGusta(m.marca)) { s += 10; if (!total) motivos.push(`Te gusta ${m.marca}`); }
      if (p.marca && mismaMarca(m.marca, p.marca)) { s -= 12; motivos.push(`Otro modelo de ${m.marca}`); }
      if (tieneEste(m)) { s -= 25; motivos.push('Ya lo tienes'); }
      if (precioRef) {
        if (m.precio < precioRef * 0.9) { s += 10; motivos.push('Suele ser más barata'); }
        else if (m.precio > precioRef * 1.3) s -= 20;
      }
      if (!motivos.length || (motivos.length === 1 && /Otro modelo/.test(motivos[0]))) motivos.unshift(`Mismo estilo: ${FAMILIAS[m.familia].nombre.toLowerCase()}`);
      return { ...m, score: s, motivos };
    })
    .sort((a, b) => b.score - a.score || a.precio - b.precio)
    // Como mucho dos de la misma marca: cuatro Puma no son cuatro alternativas.
    .filter(function (m) { this[m.marca] = (this[m.marca] || 0) + 1; return this[m.marca] <= 2; }, {})
    .slice(0, max);
}

/**
 * Lo que el usuario ya tiene que se parece a lo que mira: mismo modelo, misma
 * familia, o mismo tipo y color. Es lo que responde a «¿no tengo ya algo así?».
 */
export function yaTieneParecido(p, armario = []) {
  const vivas = armario.filter(g => g && g.status !== 'venta');
  const out = [];
  vivas.forEach(g => {
    const m = modeloDePrenda(g);
    const mismoColor = p.color && canonColor(g.color) === p.color;
    if (p.modelo && m && m.id === p.modelo.id) out.push({ g, motivo: mismoColor ? 'El mismo modelo y color' : 'El mismo modelo', peso: mismoColor ? 3 : 2.5 });
    else if (p.familia && m && m.familia === p.familia) out.push({ g, motivo: `Mismo estilo: ${FAMILIAS[m.familia].nombre.toLowerCase()}${mismoColor ? ', y del mismo color' : ''}`, peso: mismoColor ? 2 : 1.5 });
    else if (p.cat && canonCat(g.cat) === p.cat && mismoColor) out.push({ g, motivo: 'Mismo tipo y color', peso: 1 });
  });
  return out.sort((a, b) => b.peso - a.peso).slice(0, 3);
}

/* ═══ CALLE O DEPORTE ═══
   Antes: la prenda era de calle salvo que la IA dijera lo contrario, y si la
   IA no decía nada —o la prenda entró por ticket, por email o a mano— se
   quedaba en calle para siempre. Por eso el armario de calle salía lleno de
   mallas y camisetas técnicas. Esto da una respuesta y dice si está segura:
   cuando no lo está, la app pregunta. */
const TIPO_DEPORTE = new Set(['Camiseta técnica', 'Pantalón técnico', 'Mallas', 'Short técnico', 'Zapatillas running', 'Zapatillas trail', 'Botas de fútbol'].map(slug));
const TIPO_CALLE = new Set(['Camisa Oxford', 'Camisa lino', 'Camisa vestir', 'Camisa denim', 'Sobrecamisa', 'Jersey', 'Jersey cuello alto', 'Cárdigan', 'Chaleco de punto',
  'Blazer', 'Americana', 'Chaqueta denim', 'Chaqueta cuero', 'Abrigo', 'Gabardina', 'Vaquero', 'Chino', 'Pantalón vestir', 'Pantalón lino', 'Bermudas',
  'Falda', 'Vestido', 'Mono', 'Botas', 'Botines', 'Zapatos Oxford', 'Mocasines', 'Náuticos', 'Tacones', 'Bailarinas', 'Bolso', 'Cartera', 'Corbata', 'Joya', 'Cinturón', 'Pañuelo'].map(slug));
const MARCAS_DEPORTE = ['Rapha', 'MAAP', 'Pas Normal Studios', 'Castelli', 'Gobik', 'Assos', 'Le Col', 'Santini', 'Ciele', 'Satisfy', 'Soar', 'Tracksmith',
  'Saysky', 'District Vision', 'Gymshark', '2XU', 'Compressport', 'Arena', 'Speedo', 'Zoot', 'Orca', 'Bullpadel', 'Sportful', 'Brooks', 'Hoka', 'Mizuno Running'];
const PALABRAS_DEPORTE = /\b(maillot|culotte|bib|ciclismo|cycling|running|runner tecnic|trail|correr|entrenamiento|training|gym|fitness|yoga|crossfit|padel|tenis de|futbol|baloncesto|natacion|compresion|dri ?fit|dry ?fit|climalite|techfit|aeroready|heat ?rdy|cortavientos de running|mallas|leggings|top deportivo|sujetador deportivo|camiseta tecnica|neopreno|triatlon|spinning|montana tecnic)\b/;

export function contextoDe(g) {
  const cat = slug(g.cat || '');
  const texto = slug([g.name, g.cat, g.brand, (g.tags || []).join(' ')].filter(Boolean).join(' '));
  const modelo = modeloDePrenda(g);
  if (modelo) {
    const f = FAMILIAS[modelo.familia];
    return { context: f.context, seguro: true, motivo: `${modelo.marca} ${modelo.modelo} es ${f.context === 'deporte' ? 'de ' + f.nombre.toLowerCase() : 'de calle'}` };
  }
  if (TIPO_DEPORTE.has(cat)) return { context: 'deporte', seguro: true, motivo: `${g.cat} es ropa de deporte` };
  if (MARCAS_DEPORTE.some(m => mismaMarca(m, g.brand))) return { context: 'deporte', seguro: true, motivo: `${g.brand} es una marca técnica de deporte` };
  if (PALABRAS_DEPORTE.test(texto)) return { context: 'deporte', seguro: false, motivo: 'Por el nombre parece de deporte' };
  if (TIPO_CALLE.has(cat)) return { context: 'calle', seguro: true, motivo: `${g.cat} es de calle` };
  return { context: 'calle', seguro: false, motivo: '' };
}

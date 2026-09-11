/* Pruebas del motor de gustos. Ejecutar: node lib/taste.test.mjs
   No hay framework a propósito: cero dependencias, arranca en medio segundo. */
import { buildTasteProfile, scoreOffer, curate, profilePrompt, readOffer } from './taste.js';

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
};
const section = t => console.log('\n' + t);

/* Armario de prueba: perfil premium-mid, neutros, liso, Stone Island + Silbon. */
const store = {
  profile: { sex: 'Hombre', age: 34, likedBrands: ['Ecoalf'] },
  wishlist: [{ brand: 'Norse Projects' }],
  scanLog: [
    { brand: 'Scalpers', bought: false, rejection: 'too_expensive', at: '2026-09-01T10:00:00Z' },
    { brand: 'Silbon', bought: true, at: '2026-08-20T10:00:00Z' }
  ],
  garments: [
    { id: 's1', brand: 'Silbon', name: 'Logo Raquetas', cat: 'Camiseta manga corta', catGroup: 'Camisetas', fit: 'Regular Fit', color: 'Blanco', colors: ['Blanco'], material: 'Algodón pima', size: 'M', formality: 'Casual', bought: 'Abr 2024', store: 'Silbon Diagonal', price: 39.95, worn: 9, status: 'uso' },
    { id: 's2', brand: 'Stone Island', name: 'Jersey Punto Compass', cat: 'Jersey', catGroup: 'Jerséis/Sudaderas', fit: 'Regular Fit', color: 'Negro', colors: ['Negro'], material: 'Lana', size: 'L', formality: 'Smart casual', bought: 'Nov 2023', store: 'El Corte Inglés', price: 295, worn: 6, status: 'uso' },
    { id: 's3', brand: 'Scalpers', name: 'Snake Skull', cat: 'Camiseta manga corta', catGroup: 'Camisetas', fit: 'Regular Fit', color: 'Gris', colors: ['Gris'], material: 'Algodón', size: 'L', formality: 'Casual', bought: 'May 2024', store: 'Scalpers.com', price: 35.99, worn: 12, status: 'venta' },
    { id: 's4', brand: 'Pepe Jeans', name: 'Eggo Logo', cat: 'Camiseta manga corta', catGroup: 'Camisetas', fit: 'Slim Fit', color: 'Blanco', colors: ['Blanco'], material: 'Algodón', size: 'M', formality: 'Casual', bought: 'Ene 2024', store: 'Zalando', price: 29.99, worn: 14, status: 'uso' },
    { id: 's5', brand: 'Stone Island', name: 'Jersey Lana Crudo', cat: 'Jersey', catGroup: 'Jerséis/Sudaderas', fit: 'Regular Fit', color: 'Crudo', colors: ['Crudo'], material: 'Lana virgen', size: 'L', formality: 'Smart casual', bought: 'Dic 2022', store: 'El Corte Inglés', price: 320, worn: 18, status: 'uso' },
    { id: 's6', brand: 'Silbon', name: 'Camisa Oxford', cat: 'Camisa', catGroup: 'Camisas', fit: 'Regular Fit', color: 'Blanco', colors: ['Blanco'], material: 'Algodón', size: 'M', formality: 'Smart casual', bought: 'Feb 2026', store: 'Silbon Diagonal', price: 69.95, worn: 11, status: 'uso' },
    { id: 's7', brand: 'Levi\'s', name: '501 Original', cat: 'Vaquero', catGroup: 'Pantalones', fit: 'Straight', color: 'Azul', colors: ['Azul'], material: 'Denim', size: '32', formality: 'Casual', bought: 'Mar 2025', store: 'Zalando', price: 110, worn: 40, status: 'uso' },
    { id: 's8', brand: 'Pepe Jeans', name: 'Eggo Blanca', cat: 'Camiseta manga corta', catGroup: 'Camisetas', fit: 'Slim Fit', color: 'Blanco', colors: ['Blanco'], material: 'Algodón', size: 'M', formality: 'Casual', bought: 'Sep 2023', store: 'Zalando', price: 29.99, worn: 31, status: 'uso' }
  ]
};

const P = buildTasteProfile(store, { now: new Date('2026-09-11') });

section('Perfil');
ok(P.garmentCount === 7, 'cuenta solo prendas activas (excluye las de venta)', 'fue ' + P.garmentCount);
ok(P.sex === 'Hombre', 'respeta el sexo declarado');
ok(P.confidence > 0 && P.confidence <= 1, 'confianza normalizada', String(P.confidence));
ok(P.topBrands.includes('Stone Island'), 'Stone Island entre las marcas afines', P.topBrands.join(','));
ok(P.brandAffinity['Scalpers'] < 0, 'Scalpers penalizada por estar a la venta', String(P.brandAffinity['Scalpers']));
ok(P.segment === 'mid' || P.segment === 'premium', 'segmento coherente con el gasto', P.segment);

section('Bandas de precio por categoría');
ok(P.priceBands['Camisetas'] && P.priceBands['Camisetas'].median < 40, 'camisetas ~30-40€', JSON.stringify(P.priceBands['Camisetas']));
ok(P.priceBands['Jerséis/Sudaderas'] && P.priceBands['Jerséis/Sudaderas'].median > 250, 'jerséis ~300€', JSON.stringify(P.priceBands['Jerséis/Sudaderas']));

section('El fallo que arreglamos: un jersey caro ya no se descarta');
const jerseyCaro = { title: 'Stone Island Jersey Lana Merino Negro', price_value: 290, source: 'El Corte Inglés' };
const rJersey = scoreOffer(jerseyCaro, P);
ok(rJersey.score >= 80, 'jersey de 290€ puntúa alto porque sus jerséis cuestan eso', rJersey.score + ' ' + JSON.stringify(rJersey.warnings));

const camisetaCara = { title: 'Camiseta algodón blanca premium', price_value: 290, source: 'Farfetch' };
const rCamCara = scoreOffer(camisetaCara, P);
ok(rCamCara.score < 60, 'camiseta de 290€ SÍ se descarta: sus camisetas son de 30€', String(rCamCara.score));

section('Saturación: no más camisetas blancas');
const otraBlanca = { title: 'Camiseta básica algodón blanco manga corta', price_value: 32, source: 'Zalando' };
const rBlanca = scoreOffer(otraBlanca, P);
ok(rBlanca.warnings.some(w => /ya tienes/i.test(w)), 'avisa de que ya tiene camisetas blancas', JSON.stringify(rBlanca.warnings));

const huecoAbrigo = { title: 'Abrigo lana negro hombre', price_value: 180, source: 'El Corte Inglés' };
const rAbrigo = scoreOffer(huecoAbrigo, P);
ok(rAbrigo.reasons.some(r => /falta/i.test(r)), 'detecta que no tiene abrigos', JSON.stringify(rAbrigo.reasons));

section('Estampados y paleta');
const estampada = { title: 'Camiseta estampado calavera oversize', price_value: 35, source: 'Scalpers.com' };
ok(scoreOffer(estampada, P).score < 50, 'penaliza estampado en un usuario de prenda lisa', String(scoreOffer(estampada, P).score));

section('Sección equivocada');
const deMujer = { title: 'Vestido midi mujer verde', price_value: 60, source: 'Zara' };
ok(scoreOffer(deMujer, P).score < 30, 'descarta ropa de mujer para un hombre', String(scoreOffer(deMujer, P).score));
const deNino = { title: 'Camiseta niño algodón blanco', price_value: 15, source: 'Zara' };
ok(scoreOffer(deNino, P).score < 30, 'descarta ropa infantil', String(scoreOffer(deNino, P).score));

section('Temporada (11 de septiembre = entretiempo)');
ok(P.season === 'verano' || P.season === 'entretiempo', 'estación detectada', P.season);

section('Marca como palabra completa, no subcadena');
const falsoPositivo = readOffer({ title: 'Mochila para portatil marca Bossa Nova' }, { brandAffinity: { 'Boss': 1 } });
ok(falsoPositivo.brand !== 'Boss', 'no confunde "Boss" con "Bossa"', falsoPositivo.brand);
const multiPalabra = readOffer({ title: 'Camisa Massimo Dutti lino blanco' }, { brandAffinity: { 'Massimo Dutti': 1, 'Massimo': 1 } });
ok(multiPalabra.brand === 'Massimo Dutti', 'prefiere la coincidencia más larga', multiPalabra.brand);

section('Basura fuera');
ok(scoreOffer({ title: 'Lote 20 camisetas al por mayor wholesale', price_value: 40 }, P).score === 0, 'descarta lotes de mayorista');

section('Curación');
const lote = [
  { title: 'Stone Island Jersey Compass Negro', price_value: 280, source: 'El Corte Inglés' },
  { title: 'Stone Island Jersey Compass Negro', price_value: 285, source: 'Otra tienda' }, // duplicado
  { title: 'Silbon Camisa Oxford Blanca', price_value: 69, source: 'Silbon' },
  { title: 'Camiseta estampado anime oversize', price_value: 19, source: 'Temu' },
  { title: 'Abrigo lana hombre negro', price_value: 195, source: 'Zalando' },
  { title: 'Vestido mujer flores', price_value: 45, source: 'Shein' }
];
const cur = curate(lote, P, { threshold: 75 });
ok(cur.length >= 2, 'devuelve resultados', String(cur.length));
ok(!cur.some(x => /vestido|anime/i.test(x.title)), 'filtra lo que no encaja');
ok(cur.filter(x => /Stone Island Jersey Compass/i.test(x.title)).length === 1, 'deduplica el mismo producto en dos tiendas');
ok(cur.every(x => Array.isArray(x._reasons)), 'cada resultado explica por qué');
ok(cur[0]._score >= (cur[cur.length - 1]._score), 'ordenado por puntuación');

section('Armario vacío: no inventa');
const vacio = buildTasteProfile({ garments: [], profile: {} });
ok(vacio.confidence < 0.2, 'confianza baja sin datos', String(vacio.confidence));
ok(profilePrompt(vacio).includes('No asumas'), 'el prompt le dice a la IA que no invente');
const curVacio = curate(lote, vacio, { threshold: 80 });
ok(curVacio.length > 0, 'con umbral adaptativo sigue mostrando algo en vez de pantalla vacía', String(curVacio.length));

section('Prompt para la IA');
const prompt = profilePrompt(P);
ok(prompt.includes('Stone Island'), 'incluye sus marcas');
ok(/categor|camisetas/i.test(prompt), 'incluye precios por categoría');
ok(prompt.includes('Tallas'), 'incluye tallas');
ok(/NO las sugieras/.test(prompt), 'avisa de las marcas rechazadas');

console.log('\n' + (fail === 0 ? '✓' : '✗') + ` ${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);

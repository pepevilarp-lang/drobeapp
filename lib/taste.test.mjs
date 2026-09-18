/* Pruebas del motor de gustos. Ejecutar: node lib/taste.test.mjs
   No hay framework a propósito: cero dependencias, arranca en medio segundo. */
import { buildTasteProfile, scoreOffer, curate, profilePrompt, readOffer, _internals } from './taste.js';

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


/* ═══ REGRESIONES: los fallos que encontró la auditoría ═══ */

section('Regresión · la marca escrita de seis maneras es UNA marca');
/* La prueba que importa: la nota de una oferta NO debe depender de cómo haya
   tecleado el usuario la marca. Mismo armario, mismas prendas, misma ropa —
   solo cambia la grafía. Antes esto hundía la nota 16 puntos. */
const armarioVariado = (grafias) => ({ profile:{sex:'Hombre'}, wishlist:[], scanLog:[], garments: [
  { id:'v1', brand:grafias[0], name:'Jersey Compass', cat:'Jersey', catGroup:'Jerséis/Sudaderas', color:'Negro', size:'L', material:'Lana', price:300, worn:12, bought:'Ene 2026', status:'uso' },
  { id:'v2', brand:grafias[1], name:'Sudadera', cat:'Sudadera', catGroup:'Jerséis/Sudaderas', color:'Gris', size:'L', material:'Algodón', price:180, worn:9, bought:'Mar 2026', status:'uso' },
  { id:'v3', brand:grafias[2], name:'Camisa', cat:'Camisa', catGroup:'Camisas', color:'Blanco', size:'M', material:'Algodón', price:120, worn:7, bought:'Feb 2026', status:'uso' },
  { id:'v4', brand:'Zara', name:'Camiseta', cat:'Camiseta manga corta', catGroup:'Camisetas', color:'Blanco', size:'M', material:'Algodón', price:20, worn:5, bought:'Ene 2026', status:'uso' },
  { id:'v5', brand:'Levi\u2019s', name:'501', cat:'Vaquero', catGroup:'Pantalones', color:'Azul', size:'32', material:'Denim', price:110, worn:30, bought:'Ene 2025', status:'uso' },
  { id:'v6', brand:'Zara', name:'Chino', cat:'Chino', catGroup:'Pantalones', color:'Beige', size:'32', material:'Algodón', price:40, worn:8, bought:'Abr 2026', status:'uso' }
]});
const unaGrafia   = buildTasteProfile(armarioVariado(['Stone Island','Stone Island','Stone Island']));
const seisGrafias = buildTasteProfile(armarioVariado(['Stone Island','stone island','STONE ISLAND']));
const oferta      = { title:'Stone Island Camisa algodon blanca', price_value:130, source:'El Corte Inglés' };
const notaUna  = scoreOffer(oferta, unaGrafia).score;
const notaSeis = scoreOffer(oferta, seisGrafias).score;
ok(seisGrafias.topBrands.length === unaGrafia.topBrands.length, 'el mismo número de marcas se escriban como se escriban', `${unaGrafia.topBrands.length} vs ${seisGrafias.topBrands.length}`);
ok(seisGrafias.topBrands.includes('Stone Island'), 'y la forma canónica es la que se guarda', seisGrafias.topBrands.join(','));
ok(notaUna === notaSeis, 'la nota NO cambia según cómo se teclee la marca', `una=${notaUna} tres=${notaSeis}`);
ok(notaSeis >= 80, 'y su marca de cabecera puntúa alto', String(notaSeis));

section('Regresión · abrigos: el vocabulario que no coincidía');
const soloAbrigos = { profile:{sex:'Hombre'}, wishlist:[], scanLog:[], garments:
  Array.from({length:12},(_,i)=>({id:'a'+i, brand:'Zara', name:'Abrigo lana', cat:'Abrigo',
    catGroup:'Chaquetas/Abrigos', color:'Negro', size:'L', price:350, worn:5, bought:'Ene 2026', status:'uso'})) };
const PA = buildTasteProfile(soloAbrigos);
ok(!PA.gaps.includes('Chaquetas/Abrigos'), 'con doce abrigos, los abrigos NO son un hueco', PA.gaps.join(','));
ok(PA.priceBands['Chaquetas/Abrigos'] && PA.priceBands['Chaquetas/Abrigos'].n === 12, 'los abrigos tienen su propia banda de precio');
const abrigoCaro = { title:'Abrigo largo de lana hombre', price_value:900, source:'Zalando' };
const rAbrigoCaro = scoreOffer(abrigoCaro, PA);
ok(!rAbrigoCaro.reasons.some(r=>/falta/i.test(r)), 'y no se le dice que le faltan abrigos', JSON.stringify(rAbrigoCaro.reasons));
ok(rAbrigoCaro.warnings.some(w=>/sobrado/i.test(w)), 'sino que su armario va sobrado de abrigos', JSON.stringify(rAbrigoCaro.warnings));
const promptA = profilePrompt(PA);
ok(!(/Va sobrado de:[^\n]*chaquetas/i.test(promptA) && /Huecos[^\n]*Chaquetas/i.test(promptA)),
   'el prompt ya no dice que le sobran Y le faltan abrigos a la vez');

section('Regresión · los meses de diciembre no envejecen once meses de más');
const { monthsAgo } = _internals;
const dic = monthsAgo('Dic 2025'), ene = monthsAgo('Ene 2026');
ok(dic !== null && ene !== null && dic > ene, 'Dic 2025 es más antiguo que Ene 2026', `dic=${dic?.toFixed(1)} ene=${ene?.toFixed(1)}`);
ok(Math.abs(dic - ene - 1) < 0.2, 'y exactamente un mes más antiguo', String((dic-ene).toFixed(2)));
ok(Math.abs(monthsAgo('Abr 2026') - monthsAgo('May 2026') - 1) < 0.2, 'Abr y May se separan un mes');
ok(Math.abs(monthsAgo('Ago 2025') - monthsAgo('Sep 2025') - 1) < 0.2, 'Ago y Sep también');

section('Regresión · la saturación de color salta con cualquier grafía');
const seisBlancas = { profile:{sex:'Hombre'}, wishlist:[], scanLog:[], garments:
  ['Blanco','blanco','BLANCO','Off-white','hueso','Crudo'].map((c,i)=>
    ({id:'b'+i, brand:'Zara', name:'Camiseta', cat:'Camiseta manga corta', catGroup:'Camisetas',
      color:c, size:'M', price:20, worn:6, bought:'Ene 2026', status:'uso'})) };
const PB = buildTasteProfile(seisBlancas);
const otraBlancaMas = { title:'Camiseta básica algodón blanco', price_value:22, source:'Zara' };
const rB = scoreOffer(otraBlancaMas, PB);
ok(rB.warnings.some(w=>/ya tienes/i.test(w)), 'avisa de que ya tiene blancas aunque estén escritas de 6 formas', JSON.stringify(rB.warnings));

section('Regresión · no se recomiendan vestidos a un hombre');
const hombre = buildTasteProfile({ profile:{sex:'Hombre'}, wishlist:[], scanLog:[], garments:
  Array.from({length:10},(_,i)=>({id:'h'+i, brand:'Zara', cat:'Camiseta manga corta', catGroup:'Camisetas',
    color:'Negro', size:'M', price:20, worn:4, bought:'Ene 2026', status:'uso'})) });
ok(!hombre.gaps.includes('Faldas/Vestidos'), 'faldas y vestidos no figuran como hueco', hombre.gaps.join(','));
ok(scoreOffer({ title:'Vestido midi mujer verde', price_value:60, source:'Zara' }, hombre).score < 30, 'y un vestido puntúa bajísimo');

console.log('\n' + (fail === 0 ? '✓' : '✗') + ` ${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);

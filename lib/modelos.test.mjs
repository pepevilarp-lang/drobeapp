/* Pruebas de modelos, búsqueda en tienda y calle/deporte. node lib/modelos.test.mjs */
import { MODELOS, FAMILIAS, parseBusqueda, buscarModelo, alternativas, yaTieneParecido, contextoDe } from './modelos.js';
import { resolverMarca, CATS } from './normalize.js';

let pass = 0, fail = 0;
const ok = (c, n, extra) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? '  → ' + extra : '')); } };
const eq = (a, b, n) => ok(a === b, n, `esperaba ${JSON.stringify(b)}, dio ${JSON.stringify(a)}`);
const sec = t => console.log('\n' + t);

sec('El catálogo de modelos es coherente con el resto de la app');
ok(MODELOS.every(m => resolverMarca(m.marca).via === 'catalogo' && resolverMarca(m.marca).marca === m.marca), 'todas las marcas de los modelos están, bien escritas, en el catálogo de marcas');
ok(MODELOS.every(m => FAMILIAS[m.familia]), 'todo modelo tiene una familia que existe');
ok(Object.values(FAMILIAS).every(f => CATS.includes(f.cat)), 'y toda familia apunta a un tipo del catálogo');
eq(new Set(MODELOS.map(m => m.id)).size, MODELOS.length, 'no hay modelos repetidos');

sec('Leer lo que el usuario escribe en tienda');
let p = parseBusqueda('adidas gazelle azules');
eq(p.marca, 'Adidas', 'marca'); eq(p.modelo && p.modelo.modelo, 'Gazelle', 'modelo'); eq(p.color, 'Azul', 'color en plural');
eq(p.familia, 'terrace', 'familia'); eq(p.cat, 'Sneakers', 'tipo, sin haberlo escrito'); eq(p.consulta, 'Adidas Gazelle azul', 'consulta limpia para buscar');
p = parseBusqueda('gazelle azules');
eq(p.marca, 'Adidas', 'el modelo solo ya dice la marca');
p = parseBusqueda('adiddas samba negras');
eq(p.marca, 'Adidas', 'con errata en la marca'); eq(p.modelo && p.modelo.modelo, 'Samba', 'y el modelo');
p = parseBusqueda('Nike air force 1 blancas');
eq(p.modelo && p.modelo.modelo, 'Air Force 1', 'modelos de varias palabras'); eq(p.color, 'Blanco', 'y el «1» no estorba');
p = parseBusqueda('550');
eq(p.modelo, null, 'un número suelto no es un modelo: podría ser un precio');
p = parseBusqueda('new balance 550 blancas');
eq(p.modelo && p.modelo.modelo, '550', 'pero con la marca delante, sí');
eq(parseBusqueda('nb 9060 grises').marca, 'New Balance', 'siglas de marca');
eq(buscarModelo('asics gel kayano 14').modelo, 'Gel-Kayano 14', 'gana el alias más largo');
eq(buscarModelo('asics kayano 30').familia, 'running', 'la Kayano de correr no es la retro');
eq(buscarModelo('nike pegasus trail 5').familia, 'trail', 'Pegasus Trail no es Pegasus');
p = parseBusqueda('camisa lino blanca massimo dutti');
eq(p.marca, 'Massimo Dutti', 'sin modelo, la marca'); eq(p.cat, 'Camisa lino', 'el tipo'); eq(p.color, 'Blanco', 'el color');
eq(p.consulta, 'Massimo Dutti camisa lino blanco', 'y la consulta sin palabras repetidas');

sec('Alternativas: mismo estilo, y primero las marcas que ya compra');
const armario = [
  { id: 'a', brand: 'Puma', name: 'Suede negras', cat: 'Sneakers', catGroup: 'Calzado', color: 'Negro' },
  { id: 'b', brand: 'Reebok', name: 'Camiseta logo', cat: 'Camiseta manga corta', catGroup: 'Camisetas' },
  { id: 'c', brand: 'Onitsuka Tiger', name: 'Mexico 66', cat: 'Sneakers', catGroup: 'Calzado', color: 'Azul' }
];
p = parseBusqueda('adidas gazelle azules');
const alt = alternativas(p, { armario, precioVisto: 120 });
ok(alt.length >= 3, 'hay alternativas');
ok(alt.every(a => a.familia === 'terrace'), 'todas del mismo estilo que la Gazelle', alt.map(a => a.familia).join());
eq(alt[0].marca, 'Puma', 'la primera es de una marca de la que ya tiene zapatillas');
ok(alt[0].motivos.some(m => /Ya tienes calzado Puma/.test(m)), 'y lo dice');
ok(!alt.some(a => a.modelo === 'Mexico 66'), 'no propone lo que ya tiene');
ok(!alt.some(a => a.modelo === 'Gazelle'), 'ni lo mismo que está mirando');
ok(alt.every(a => a.motivos.length), 'cada alternativa dice por qué está');
const porMarca = {}; alt.forEach(a => { porMarca[a.marca] = (porMarca[a.marca] || 0) + 1; });
ok(Object.values(porMarca).every(n => n <= 2), 'como mucho dos de la misma marca');
const caras = alternativas(parseBusqueda('adidas advantage'), { precioVisto: 70 });
ok(!caras.some(a => a.modelo === 'Achilles'), 'si mira algo de 70 €, no le propone unas de 400 €');
eq(alternativas(parseBusqueda('camisa lino blanca'), {}).length, 0, 'sin familia conocida no se inventan alternativas');

sec('¿Ya tiene algo así?');
const ya = yaTieneParecido(parseBusqueda('adidas gazelle azules'), armario);
ok(ya.some(x => x.g.id === 'c'), 'la Mexico 66 azul es del mismo estilo');
eq(ya[0].g.id, 'c', 'y va primero porque además es del mismo color');
ok(!ya.some(x => x.g.id === 'b'), 'una camiseta no se parece a unas zapatillas');

sec('Calle o deporte');
const ctx = g => contextoDe(g);
eq(ctx({ brand: 'Adidas', name: 'Gazelle azules', cat: 'Sneakers' }).context, 'calle', 'una Gazelle es de calle aunque adidas sea deportiva');
eq(ctx({ brand: 'Nike', name: 'Pegasus 41', cat: 'Sneakers' }).context, 'deporte', 'una Pegasus es de correr aunque esté archivada como Sneakers');
eq(ctx({ brand: 'Nike', name: 'Mallas', cat: 'Mallas' }).seguro, true, 'unas mallas son deporte, seguro');
eq(ctx({ brand: 'Gobik', name: 'Maillot verano', cat: 'Camiseta manga corta' }).context, 'deporte', 'marca técnica: deporte');
eq(ctx({ brand: 'Zara', name: 'Camisa', cat: 'Camisa Oxford' }).context, 'calle', 'una camisa: calle');
const suda = ctx({ brand: 'Nike', name: 'Sudadera logo', cat: 'Sudadera' });
eq(suda.seguro, false, 'una sudadera Nike puede ser de las dos cosas: no se decide, se pregunta');
const run = ctx({ brand: 'Decathlon', name: 'Camiseta running', cat: 'Camiseta manga corta' });
eq(run.context, 'deporte', 'por el nombre, deporte'); eq(run.seguro, false, 'pero sin estar segura');

console.log('\n' + (fail === 0 ? '✓' : '✗') + ` ${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);

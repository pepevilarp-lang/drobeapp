/* Pruebas de la normalización. node lib/normalize.test.mjs */
import { slug, canonMarca, mismaMarca, canonColor, canonMaterial, canonTalla, canonTienda,
         grupoDe, catToGroup, canonPrenda, huella, buscarDuplicados, huellaTicket, GRUPOS, esNeutro } from './normalize.js';

let pass = 0, fail = 0;
const ok = (c, n, extra) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (extra ? '  → ' + extra : '')); } };
const eq = (a, b, n) => ok(a === b, n, `esperaba ${JSON.stringify(b)}, dio ${JSON.stringify(a)}`);
const sec = t => console.log('\n' + t);

sec('Marcas: el fallo que hundía las recomendaciones');
const variantes = ['Stone Island', 'stone island', 'STONE ISLAND', 'Stone island ', '  stone   island  ', 'StOnE iSlAnD'];
const canon = variantes.map(canonMarca);
ok(new Set(canon).size === 1, 'las 6 grafías colapsan en una', JSON.stringify([...new Set(canon)]));
eq(canon[0], 'Stone Island', 'y la forma canónica es la correcta');
eq(canonMarca('stoneisland'), 'Stone Island', 'sin espacio también');
eq(canonMarca('S.Island'), 'Stone Island', 'la abreviatura con punto se resuelve por alias');
eq(canonMarca('Xyzzy Corp'), 'Xyzzy Corp', 'una marca desconocida no se inventa, solo se capitaliza');
eq(canonMarca('levis'), 'Levi’s', 'alias con apóstrofo');
eq(canonMarca('LEVI’S'), 'Levi’s', 'mayúsculas con apóstrofo');
eq(canonMarca('north face'), 'The North Face', 'alias de marca larga');
eq(canonMarca('tnf'), 'The North Face', 'siglas conocidas');
eq(canonMarca('massimo dutti'), 'Massimo Dutti', 'dos palabras');
eq(canonMarca('zara'), 'Zara', 'minúsculas → canónica');
eq(canonMarca('nude project'), 'Nude Project', 'marca del catálogo');
eq(canonMarca('marca inventada sl'), 'Marca Inventada Sl', 'desconocida se capitaliza');
eq(canonMarca('—'), '', 'el guion no es una marca');
eq(canonMarca(''), '', 'vacío');
eq(canonMarca('sin marca'), '', '"sin marca" no es una marca');
eq(canonMarca(null), '', 'null');
ok(mismaMarca('ZARA', ' zara '), 'mismaMarca compara bien');
ok(!mismaMarca('Zara', 'Mango'), 'y distingue marcas distintas');

sec('Categorías: las dos listas que no coincidían');
eq(grupoDe('Abrigo de lana'), 'Chaquetas/Abrigos', 'abrigo');
eq(grupoDe('Chaqueta denim'), 'Chaquetas/Abrigos', 'chaqueta');
eq(grupoDe('Plumífero'), 'Chaquetas/Abrigos', 'plumífero');
eq(grupoDe('Camiseta manga corta'), 'Camisetas', 'camiseta');
eq(grupoDe('Polo'), 'Camisetas', 'polo');
eq(grupoDe('Camisa Oxford'), 'Camisas', 'camisa');
eq(grupoDe('Jersey de punto'), 'Jerséis/Sudaderas', 'jersey');
eq(grupoDe('Sudadera con capucha'), 'Jerséis/Sudaderas', 'sudadera');
eq(grupoDe('Vaquero recto'), 'Pantalones', 'vaquero');
eq(grupoDe('Chino'), 'Pantalones', 'chino');
eq(grupoDe('Bermudas'), 'Shorts/Bermudas', 'bermudas');
eq(grupoDe('Vestido midi'), 'Faldas/Vestidos', 'vestido');
eq(grupoDe('Botines'), 'Calzado', 'BOTINES — antes caían en Accesorios');
eq(grupoDe('Tacones'), 'Calzado', 'TACONES — antes en Accesorios');
eq(grupoDe('Mocasines'), 'Calzado', 'MOCASINES — antes en Accesorios');
eq(grupoDe('Zapatillas deportivas'), 'Calzado', 'zapatillas');
eq(grupoDe('Gorra'), 'Accesorios', 'gorra');
eq(grupoDe(''), '', 'sin texto no inventa grupo');
eq(grupoDe('ectoplasma'), '', 'algo irreconocible no inventa grupo');
eq(catToGroup(''), '', 'catToGroup tampoco inventa con vacío');
ok(GRUPOS.every(g => g === grupoDe(g) || g === 'Accesorios' || grupoDe(g) === g), 'cada grupo se reconoce a sí mismo');

sec('Colores: la paleta que se fragmentaba');
eq(canonColor('Azul marino'), 'Marino', '"Azul marino" → Marino');
eq(canonColor('Marino'), 'Marino', '"Marino" → Marino');
eq(canonColor('navy'), 'Marino', '"navy" → Marino');
ok(canonColor('Azul marino') === canonColor('navy'), 'las tres son el mismo color');
eq(canonColor('Off-white'), 'Crudo', 'off-white');
eq(canonColor('hueso'), 'Crudo', 'hueso');
eq(canonColor('Verde oliva'), 'Kaki/Oliva', 'verde oliva');
eq(canonColor('gris marengo'), 'Gris', 'gris marengo');
eq(canonColor('BLANCO'), 'Blanco', 'mayúsculas');
eq(canonColor('camel'), 'Beige', 'camel');
eq(canonColor('burdeos'), 'Rojo', 'burdeos');
eq(canonColor('—'), '', 'guion no es color');
eq(canonColor('chartreuse'), '', 'un color que no está no se inventa');
ok(esNeutro('Azul marino') && esNeutro('off white') && esNeutro('Negro'), 'los neutros se detectan escritos como sea');
ok(!esNeutro('Rojo'), 'el rojo no es neutro');

sec('Materiales');
eq(canonMaterial('Algodón pima'), 'Algodón', 'algodón pima → Algodón');
eq(canonMaterial('algodón orgánico'), 'Algodón', 'algodón orgánico');
eq(canonMaterial('Lana virgen'), 'Lana', 'lana virgen');
eq(canonMaterial('Lana/algodón'), 'Lana', 'mezcla: gana el primero');
eq(canonMaterial('60% algodón 40% poliéster'), 'Algodón', 'porcentajes');
ok(canonMaterial('Algodón pima') === canonMaterial('algodon'), 'las variantes de algodón son una');

sec('Tallas');
eq(canonTalla('m'), 'M', 'minúscula');
eq(canonTalla(' M '), 'M', 'con espacios');
eq(canonTalla('Talla M'), 'M', 'con la palabra talla');
eq(canonTalla('42'), '42', 'numérica');
eq(canonTalla('32x32'), '32X32', 'vaquero');
ok(['m', ' M ', 'Talla M', 'M'].map(canonTalla).every(x => x === 'M'), 'las cuatro son la misma talla');

sec('Tiendas');
eq(canonTienda('zara.com'), 'Zara', 'dominio → marca');
eq(canonTienda('ZARA'), 'Zara', 'mayúsculas');
ok(canonTienda('Scalpers.com') === canonTienda('scalpers'), 'la misma tienda');

sec('canonPrenda: todas las vías de alta acaban igual');
const cruda = { brand: '  STONE ISLAND ', name: 'Jersey Compass', cat: 'Jersey', color: 'Azul marino',
                material: 'Lana virgen', size: ' l ', store: 'El Corte Inglés', price: '295', worn: '6' };
const c = canonPrenda(cruda);
eq(c.brand, 'Stone Island', 'marca');
eq(c.catGroup, 'Jerséis/Sudaderas', 'grupo deducido del cat');
eq(c.color, 'Marino', 'color');
eq(c.material, 'Lana', 'material');
eq(c.size, 'L', 'talla');
eq(c.price, 295, 'precio numérico');
eq(c.worn, 6, 'usos numérico');
ok(Array.isArray(c.colors) && c.colors[0] === 'Marino', 'colors coherente con color');
ok(JSON.stringify(canonPrenda(c)) === JSON.stringify(c), 'idempotente: pasarla dos veces no cambia nada');

const conGuiones = canonPrenda({ brand: '—', color: '—', cat: 'Camiseta manga corta' });
eq(conGuiones.brand, '', 'el "—" de la ráfaga se limpia');
eq(conGuiones.color, '', 'y el color también');

sec('Duplicados');
const armario = [
  { id: 'a', brand: 'Stone Island', name: 'Jersey Compass', cat: 'Jersey', catGroup: 'Jerséis/Sudaderas', color: 'Negro', size: 'L', status: 'uso' },
  { id: 'b', brand: 'Zara', name: 'Camiseta básica', cat: 'Camiseta manga corta', catGroup: 'Camisetas', color: 'Blanco', size: 'M', status: 'uso' },
  { id: 'c', brand: 'Levi’s', name: '501', cat: 'Vaquero', catGroup: 'Pantalones', color: 'Azul', size: '32', status: 'uso' }
];
const otraVezElMismo = { id: 'z', brand: 'STONE ISLAND', name: 'Jersey Compass', cat: 'Jersey', color: 'negro', size: 'l' };
const d1 = buscarDuplicados(otraVezElMismo, armario);
ok(d1.length === 1 && d1[0].garment.id === 'a' && d1[0].score === 1, 'la misma prenda con otra grafía se detecta', JSON.stringify(d1.map(x => [x.garment.id, x.score])));

const parecida = { id: 'z2', brand: 'Stone Island', name: 'Jersey Compass Lana', cat: 'Jersey', color: 'Negro', size: 'L' };
ok(buscarDuplicados(parecida, armario).length === 1, 'una muy parecida también avisa');

const distinta = { id: 'z3', brand: 'Mango', name: 'Jersey trenzado', cat: 'Jersey', color: 'Crudo', size: 'M' };
ok(buscarDuplicados(distinta, armario).length === 0, 'otra marca, otro color: no es duplicado');

const otraCategoria = { id: 'z4', brand: 'Stone Island', name: 'Jersey Compass', cat: 'Pantalón chino', color: 'Negro', size: 'L' };
ok(buscarDuplicados(otraCategoria, armario).length === 0, 'distinta categoría nunca es duplicado');

const porSku = buscarDuplicados({ id: 'z5', brand: 'Otra', cat: 'Jersey', color: 'Rojo', size: 'S', sku: 'REF-123' },
  [{ ...armario[0], sku: 'REF-123' }]);
ok(porSku.length === 1 && porSku[0].score === 1, 'la referencia manda sobre todo lo demás');

sec('Tickets duplicados');
const t1 = { store: 'Zara', dateISO: '2026-09-01', total: 59.9 };
const t2 = { store: 'zara.com', dateISO: '2026-09-01', total: 59.9 };
ok(huellaTicket(t1) === huellaTicket(t2), 'el mismo ticket escrito distinto tiene la misma huella');
ok(huellaTicket(t1) !== huellaTicket({ ...t1, total: 60 }), 'otro total, otro ticket');

console.log('\n' + (fail === 0 ? '✓' : '✗') + ` ${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);

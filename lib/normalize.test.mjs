/* Pruebas de la normalización. node lib/normalize.test.mjs */
import { slug, canonMarca, mismaMarca, canonColor, canonMaterial, canonTalla, canonTienda,
         grupoDe, catToGroup, canonPrenda, huella, buscarDuplicados, huellaTicket, GRUPOS, esNeutro,
         canonCat, grupoDeCat, camposPrenda, tallaDe, canonCorte, marcaConocida, ejemploNombre,
         CATS, CATALOGO, CORTES, MARCAS_CATALOGO, resolverMarca } from './normalize.js';

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
eq(canonMarca('marca inventada'), 'Marca Inventada', 'desconocida se capitaliza');
eq(canonMarca('marca inventada sl'), 'Marca Inventada', 'la forma societaria no es parte de la marca');
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

sec('Marcas · reconocer de verdad, no solo capitalizar');
eq(canonMarca('Autry'), 'Autry', 'Autry está en el catálogo');
eq(canonMarca('AUTRY MEDALIST'), 'Autry', 'el modelo no forma parte de la marca');
eq(canonMarca('autry medalist low white'), 'Autry', 'ni aunque venga con media ficha detrás');
ok(marcaConocida('autry'), 'y se sabe que es del catálogo, no una capitalización a ojo');
eq(canonMarca('Nike Sportswear'), 'Nike', 'las líneas de producto se recortan');
eq(canonMarca('Zara Man'), 'Zara', 'y las secciones de tienda también');
eq(canonMarca('newbalance'), 'New Balance', 'sin espacios se resuelve igual');
eq(canonMarca('stoneisland'), 'Stone Island', 'y con la marca pegada también');
eq(canonMarca('Adiddas'), 'Adidas', 'una errata de OCR no crea una marca nueva');
eq(canonMarca('Stone Isand'), 'Stone Island', 'ni una letra que se come el modelo de visión');
eq(canonMarca('Vans'), 'Vans', 'las marcas cortas se dejan como están');
ok(canonMarca('Vera') !== 'Vans', 'y NO se parecen entre sí por tener cuatro letras');
eq(canonMarca('Marca Rarísima'), 'Marca Rarísima', 'una marca de verdad que no está en la lista se conserva');
ok(!marcaConocida('Marca Rarísima'), 'pero se sabe que no está en el catálogo');
ok(MARCAS_CATALOGO.length > 200, `el catálogo tiene fondo (${MARCAS_CATALOGO.length} marcas)`);
ok(MARCAS_CATALOGO.includes('Veja') && MARCAS_CATALOGO.includes('Hoka') && MARCAS_CATALOGO.includes('Rapha'),
   'con zapatillas y deporte, que era el agujero');

sec('Tipos · un solo catálogo, con el grupo pegado');
eq(canonCat('Bambas'), 'Sneakers', 'bambas y sneakers son la misma cosa');
eq(canonCat('trainers'), 'Sneakers', 'y trainers también');
eq(canonCat('zapatillas deportivas'), 'Sneakers', 'y zapatillas deportivas');
eq(canonCat('zapatillas de correr'), 'Zapatillas running', 'pero correr no es lo mismo que andar');
eq(canonCat('camisa'), 'Camisa Oxford', 'lo genérico cae en lo más común, no en lo más raro');
eq(canonCat('chaqueta vaquera oversize'), 'Chaqueta denim', 'gana la frase más larga que encaje');
eq(canonCat('T-SHIRT'), 'Camiseta manga corta', 'el inglés se traduce');
eq(canonCat('puffer'), 'Plumífero', 'y la jerga de tienda también');
eq(canonCat('esto no es ropa'), '', 'sin señal no se inventa un tipo');
eq(canonCat(''), '', 'ni con el campo vacío');
CATS.forEach(c => { if (c !== 'Otro') ok(!!grupoDeCat(c), `«${c}» tiene grupo`); });
ok(CATALOGO.every(([g]) => GRUPOS.includes(g)), 'todos los grupos del catálogo son de la lista canónica');
eq(canonCat(canonCat('bambas')), 'Sneakers', 'canonCat es idempotente');

sec('El formulario no pregunta lo que no aplica');
const zap = camposPrenda('Bambas');
ok(!zap.fit, 'a unas zapatillas no se les pregunta el corte');
ok(!zap.pattern, 'ni el estampado');
ok(zap.size && zap.material, 'pero sí la talla y el material');
eq(zap.grupo, 'Calzado', 'y se sabe que son calzado');
const rel = camposPrenda('Reloj');
ok(!rel.size && !rel.season && !rel.pattern, 'a un reloj no se le pregunta talla, temporada ni estampado');
const vaq = camposPrenda('Vaquero');
ok(vaq.fit && vaq.pattern && vaq.size, 'a un vaquero se le pregunta todo');
ok(!camposPrenda('').fit, 'sin tipo todavía no se ofrece un corte que no se sabe si aplica');

sec('El corte se valida contra el tipo');
eq(canonCorte('Slim Fit', 'Vaquero'), 'Slim', 'la coletilla «Fit» sobra');
eq(canonCorte('Wide Leg', 'Vaquero'), 'Wide Leg', 'un corte de pantalón vale en un pantalón');
eq(canonCorte('Wide Leg', 'Jersey'), '', 'pero no en un jersey');
eq(canonCorte('Regular Fit', 'Sneakers'), '', 'y en calzado no vale ninguno');
ok(Object.keys(CORTES).every(g => GRUPOS.includes(g)), 'los cortes están indexados por grupo canónico');

sec('La talla se mide como toca en cada prenda');
eq(tallaDe('Sneakers').tipo, 'calzado', 'el calzado va por número');
eq(tallaDe('Sneakers').hint, '42', 'y el ejemplo es un número europeo');
eq(tallaDe('Vaquero').tipo, 'cintura', 'los pantalones por cintura');
eq(tallaDe('Jersey').tipo, 'letra', 'y el resto por letra');
eq(tallaDe('Reloj'), null, 'un reloj no tiene talla');
ok(ejemploNombre('Sneakers') !== ejemploNombre('Abrigo'), 'el ejemplo de nombre cambia con el tipo');

sec('Regresión · el alta de unas Autry queda impecable de punta a punta');
const autry = canonPrenda({ brand: 'AUTRY MEDALIST', cat: 'Bambas', fit: 'Otro', color: 'blanco', material: 'Cuero', size: '42', price: '199' });
eq(autry.brand, 'Autry', 'la marca se reconoce');
eq(autry.cat, 'Sneakers', 'el tipo se canoniza');
eq(autry.catGroup, 'Calzado', 'el grupo sale del catálogo, no de adivinar');
eq(autry.fit, '', 'y el corte que no aplicaba se queda vacío, no en «Otro»');
eq(autry.size, '42', 'la talla es el número');

sec('Marcas leídas de una etiqueta: ni palabras corrientes ni texto de lavado');
// Auditoría C16: la corrección de erratas convertía palabras en marcas.
[['Manga','Mango'],['BASICS','Asics'],['Closet','Closed'],['Salmon','Salomon'],['Giant','Gant'],['ESSENTIAL','Essentials']]
  .forEach(([leido, falsa]) => ok(canonMarca(leido) !== falsa, `«${leido}» no se convierte en ${falsa}`, canonMarca(leido)));
eq(resolverMarca('Manga').via, 'palabra', 'y «Manga» se marca como palabra, no como marca leída');
eq(resolverMarca('MANGA CORTA').via, 'palabra', '«MANGA CORTA» describe la prenda, no es una marca');
eq(resolverMarca('Cuello redondo').via, 'palabra', 'ni «cuello redondo»');
eq(resolverMarca('Nude Project').via, 'catalogo', 'una marca de dos palabras sigue siéndolo');
eq(canonMarca('Giant'), 'Giant', 'pero si el usuario escribe «Giant» a mano, se respeta');
eq(canonMarca('Lee Cooper'), 'Lee Cooper', 'Lee Cooper es una marca, no «Lee» con apellido');
eq(canonMarca('ORIGINAL CRAFT'), 'Original Craft', '«Original» delante no se recorta: no es la marca Craft');
eq(canonMarca('BOSS ORANGE'), 'Hugo Boss', 'Boss es Hugo Boss, con o sin línea detrás');
eq(canonMarca('Boss'), 'Hugo Boss', 'un solo nombre para la misma marca');
// Auditoría C17: texto de etiqueta guardado como marca.
['100% Cotton','Made In Portugal','Slim Fit','XL','Talla M','Premium','Unisex','Dry Clean Only','42','80 % lana','Hecho en España']
  .forEach(t => eq(canonMarca(t), '', `«${t}» no es una marca`));
eq(resolverMarca('Adiddas').via, 'errata', 'una errata corregida se marca como probable, no como leída');
eq(resolverMarca('Adidas').via, 'catalogo', 'la marca escrita bien es del catálogo');
eq(canonMarca('Mangp'), 'Mangp', 'cinco letras son muy pocas para corregir una errata sin inventar');
eq(canonMarca('PURIFICACIÓN GARCÍA'), 'Purificación García', 'una etiqueta en mayúsculas se capitaliza como nombre');

sec('Colores escritos como se escriben en una búsqueda');
[['azules','Azul'],['blancas','Blanco'],['negras','Negro'],['grises','Gris'],['rojas','Rojo'],['verdes','Verde'],['marrones','Marrón'],['crema','Crudo'],['plata','Gris']]
  .forEach(([t, c]) => eq(canonColor(t), c, `«${t}» → ${c}`));
eq(canonColor('vaquero negro'), 'Negro', '«vaquero negro» es negro, no azul por ser vaquero');
eq(canonColor('bota de cuero blanca'), 'Blanco', 'el cuero no gana al color');
eq(canonColor('vaquero'), 'Azul', 'pero un vaquero a secas sigue siendo azul');

console.log('\n' + (fail === 0 ? '✓' : '✗') + ` ${pass} pasan, ${fail} fallan\n`);
process.exit(fail ? 1 : 0);

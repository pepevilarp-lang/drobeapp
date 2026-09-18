# Drobe — contexto del proyecto

Léeme antes de tocar nada. Recoge lo que no se deduce leyendo el código.

## Qué es

PWA en español: armario digital. Escanear ticket o foto → la IA crea las prendas
→ organizar, vestirse con el estilista, evitar comprar lo que ya se tiene, vender
lo que no se usa. Móvil primero (ancho máximo 480px).

Producción: https://drobeapp-theta.vercel.app

## Cómo está montado

Vanilla JS con módulos ES nativos. **No hay build, no hay `package.json`, no hay
bundler.** Lo que se escribe es lo que se sirve. Eso condiciona todo:

- Nada de JSX, TypeScript, imports de npm ni sintaxis que necesite transpilación.
- Las dependencias externas entran por CDN (`import` dinámico desde `esm.sh` o
  `jsdelivr`), y siempre bajo demanda, nunca en el arranque.
- Las funciones de `/api` son **CommonJS** (`module.exports`), no ESM. Vercel las
  ejecuta en Node; el resto del proyecto es ESM de navegador. No los mezcles.

## Reglas del proyecto

1. **La normalización es obligatoria.** Marca, categoría, color, material,
   talla y tienda SIEMPRE pasan por `lib/normalize.js` antes de guardarse.
   `canonPrenda()` se aplica en `addGarment()` y al editar, así que las seis
   vías de alta acaban en la misma forma. No añadas una séptima que se la
   salte. Motivo: "Stone Island", "stone island" y "STONE ISLAND" eran tres
   marcas distintas y el motor repartía la afinidad entre ellas, hundiendo la
   marca favorita del usuario por debajo del umbral de recomendación.
2. **Un solo vocabulario de categorías.** Los nueve grupos viven en
   `GRUPOS` de `lib/normalize.js` y los usan app.js y lib/taste.js. Antes había
   dos listas con los nombres transpuestos ("Chaquetas/Abrigos" contra
   "Abrigos/Chaquetas") y los abrigos nunca tuvieron banda de precio.
   Los **tipos** concretos viven en `CATALOGO`, con su grupo escrito al lado:
   el grupo es un dato, no una deducción. Si añades un tipo, va ahí, y sus
   sinónimos y traducciones en `CAT_SINONIMOS`. No hagas una lista nueva:
   el formulario de alta, el de edición, el asesor de compra y los prompts de
   la IA leen todos de esta. Llegó a haber cuatro entradas para la misma
   zapatilla ("Sneakers", "Bambas", "Zapatillas deportivas", "Running") y la
   misma prenda acababa archivada de tres maneras.
3. **El formulario solo pregunta lo que aplica.** `camposPrenda(cat)` decide
   qué campos se pintan y `canonPrenda()` lo hace cumplir al guardar. A unas
   zapatillas no se les pregunta el corte ni el estampado; a un reloj tampoco
   la talla ni la temporada. Un campo que no aplica no es inofensivo: se
   rellena igual, y un dato mal rellenado envenena el motor de gustos. Si
   añades un campo, decide en `camposPrenda` dónde tiene sentido.
4. **Nada de `catch` vacíos.** Todo fallo va por `logError()` de `lib/log.js`.
   Si algo es realmente ignorable, se ignora con un comentario que lo justifique.
   El motivo: antes 31 de 46 `catch` se tragaban el error en silencio y `app.js`
   no tenía ni un `console`. Era imposible saber por qué fallaba nada.
5. **El motor de gustos no inventa.** Cada señal de `lib/taste.js` viene de algo
   que el usuario ha hecho: comprar, ponerse, vender, guardar, rechazar. Si no
   hay datos, baja `confidence` y se dice; no se rellena con supuestos.
6. **`lib/taste.js` es puro.** No toca DOM ni red. Recibe `store`, devuelve
   objetos. Si lo cambias, ejecuta `node lib/taste.test.mjs` (47 pruebas) y
   `node lib/normalize.test.mjs` (213). Cero dependencias, menos de un segundo.
7. **El esquema real vive en `supabase/schema.sql`.** Si cambias tablas desde el
   panel de Supabase, actualiza el fichero en el mismo commit. Cuando dejaron de
   coincidir, las escrituras fallaban en silencio (Supabase no devuelve error
   cuando RLS bloquea un update: borra cero filas y calla).
8. **`schema.sql` nunca borra.** Todo es `if not exists` / `add column if not
   exists`, y se puede ejecutar sobre producción. No vuelvas a meter `DROP TABLE`.
9. **Sube `CACHE` en `sw.js`** en cada despliegue que toque `app.js`,
   `styles.css` o `lib/`. Si no, iOS sirve la versión anterior.
10. **Escapa siempre con `esc()`** lo que entre en `innerHTML` desde datos del
   usuario o de la red.

## Arquitectura de datos

`localStorage` (clave `drobe.v3`) es la **fuente primaria**. Supabase sincroniza
por encima. La app funciona entera sin sesión.

- `save()` escribe en local e invalida el perfil de gusto memoizado.
- `syncFromCloud()` fusiona nube y local, con *tombstones* (`store.deletedIds`)
  para que una prenda borrada no resucite desde otro dispositivo.
- El borrado es **suave**: se marca `deleted_at`, no se borra la fila.
- `alignStoreToAccount()` decide entre adoptar y borrar según el `ownerId`; ver
  «Identidad y aislamiento» más abajo.

## Mapa de `app.js`

Es un monolito de ~3.600 líneas, dividido por comentarios `═══`. De arriba
abajo: iconos → catálogos → SEED → estado → motor de gustos (pegamento a
`lib/taste.js`) → ADN de estilo B2B → helpers → router → Armario → Ficha →
Añadir → Escáner en tienda → Maleta → Estilista y Asesor de compra → Insights →
Perfil → Onboarding y tour → Demo B2B → Red social → Strava → arranque y nube.

Trocearlo es la deuda técnica número uno, pero hazlo por partes y con la app
funcionando entre paso y paso.

## Identidad y aislamiento

Requisito duro: **los datos de una persona no se mezclan JAMÁS con los de otra.**
Lo que lo garantiza:

- `alignStoreToAccount()` corre de forma SÍNCRONA antes de cualquier llamada de
  red, así que la demo nunca se sube a una cuenta nueva.
- Distingue dos casos: si nadie había reclamado el almacenamiento local
  (`ownerId` ausente), las prendas las **adopta** quien entra — es alguien que
  estuvo probando sin cuenta. Si el `ownerId` es de OTRA persona, se borra todo,
  incluidas las seis claves sueltas de `localStorage` (`CLAVES_POR_USUARIO`).
- `lib/supabase.js` mantiene `_uid` y toda escritura captura ese uid de forma
  síncrona al entrar y lo verifica con `authFor()` antes de tocar la base. Sin
  esto, una escritura encolada con la cuenta A que resolvía después de un cambio
  de cuenta se grababa con el `user_id` de B.
- `_profileEnsured` y `_socialEnsured` se resetean en `setUid()`.

## Cosas que ya pasaron (no las repitas)

- `strava.js` estaba en la raíz en vez de en `api/`, así que `/api/strava` daba
  404 y toda la integración estaba muerta en producción. **Solo lo que está
  dentro de `api/` se convierte en función.**
- Había copias viejas de `supabase.js`, `ai.js` y `shopping.js` en la raíz,
  subidas sin querer por la web de GitHub. Confundían a todo el que leía el repo.
- `api/health.js` publicaba el prefijo de la clave de Groq. Borrado.
- Las políticas RLS de `garments` eran solo-dueño, así que «ver el armario de un
  amigo» y el armario público por `?u=usuario` devolvían siempre vacío, sin error.
- **Agujero de autorización**: `friendship create` comprobaba quién era el
  solicitante pero no el ESTADO, así que cualquiera podía insertar una amistad
  ya aceptada contra sí mismo y leer el armario entero de cualquier usuario. Y
  `social readable using (true)` dejaba enumerar los uuid de todo el mundo sin
  sesión. Si tocas políticas, piensa siempre en qué puede escribir un cliente
  malicioso con la anon key, que es pública.
- `fromRow` declaraba la clave `photos` dos veces en el mismo objeto literal y
  ganaba la segunda (`[]`): las fotos se subían y se borraban en cada sync.
- `readForm` no devuelve `catGroup`, así que `Object.assign(g, readForm(el))`
  dejaba el grupo desincronizado. Por eso la edición pasa por `canonPrenda`.
- El contenedor del formulario se llamaba `${pre}form`, que con `pre='f_'` es
  exactamente el id del select de Formalidad (`f_form`). `querySelector`
  devolvía el div y leer `.value` reventaba el guardado entero. Ahora es
  `${pre}gform`. Cuidado al inventar ids con prefijo.
- El alta por ticket y la bajada de la nube construían la prenda a mano en vez
  de pasar por `canonPrenda`: metían el literal "—" como marca y como color, y
  forzaban `fit: 'Regular Fit'` a TODO, también al calzado. Eran la séptima y
  la octava vía de alta saltándose la puerta. Ya no.
- La marca llegaba de la IA como la leía: "AUTRY MEDALIST" es el modelo, no la
  marca, y para el motor de gustos era una marca distinta de "Autry". Todo lo
  que devuelve visión pasa ahora por `depurarVision()`.

## Flujo de trabajo

El historial antiguo (212 commits tipo `Add files via upload`, `Rename app
(11).js to app.js`) viene de subir ficheros por la web de GitHub. No sirve para
nada y ya provocó que se colaran versiones obsoletas. Clona, commitea con
mensajes de verdad y empuja.

## Estado de las integraciones

| Servicio | Estado |
|---|---|
| Groq (`/api/ai`) | funcionando |
| SerpApi (`/api/shopping`) | funcionando, 100 búsquedas/mes |
| Strava (`/api/strava`) | arreglado; requiere `STRAVA_CLIENT_ID` y `_SECRET` |
| Supabase | requiere ejecutar `supabase/schema.sql` actualizado |

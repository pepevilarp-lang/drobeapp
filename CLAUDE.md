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

1. **Nada de `catch` vacíos.** Todo fallo va por `logError()` de `lib/log.js`.
   Si algo es realmente ignorable, se ignora con un comentario que lo justifique.
   El motivo: antes 31 de 46 `catch` se tragaban el error en silencio y `app.js`
   no tenía ni un `console`. Era imposible saber por qué fallaba nada.
2. **El motor de gustos no inventa.** Cada señal de `lib/taste.js` viene de algo
   que el usuario ha hecho: comprar, ponerse, vender, guardar, rechazar. Si no
   hay datos, baja `confidence` y se dice; no se rellena con supuestos.
3. **`lib/taste.js` es puro.** No toca DOM ni red. Recibe `store`, devuelve
   objetos. Si lo cambias, ejecuta `node lib/taste.test.mjs` — 31 pruebas, cero
   dependencias.
4. **El esquema real vive en `supabase/schema.sql`.** Si cambias tablas desde el
   panel de Supabase, actualiza el fichero en el mismo commit. Cuando dejaron de
   coincidir, las escrituras fallaban en silencio (Supabase no devuelve error
   cuando RLS bloquea un update: borra cero filas y calla).
5. **`schema.sql` nunca borra.** Todo es `if not exists` / `add column if not
   exists`, y se puede ejecutar sobre producción. No vuelvas a meter `DROP TABLE`.
6. **Sube `CACHE` en `sw.js`** en cada despliegue que toque `app.js`,
   `styles.css` o `lib/`. Si no, iOS sirve la versión anterior.
7. **Escapa siempre con `esc()`** lo que entre en `innerHTML` desde datos del
   usuario o de la red.

## Arquitectura de datos

`localStorage` (clave `drobe.v3`) es la **fuente primaria**. Supabase sincroniza
por encima. La app funciona entera sin sesión.

- `save()` escribe en local e invalida el perfil de gusto memoizado.
- `syncFromCloud()` fusiona nube y local, con *tombstones* (`store.deletedIds`)
  para que una prenda borrada no resucite desde otro dispositivo.
- El borrado es **suave**: se marca `deleted_at`, no se borra la fila.
- `alignStoreToAccount()` vacía el local si entra otra cuenta. Los datos de un
  usuario no se mezclan jamás con los de otro.

## Mapa de `app.js`

Es un monolito de ~3.600 líneas, dividido por comentarios `═══`. De arriba
abajo: iconos → catálogos → SEED → estado → motor de gustos (pegamento a
`lib/taste.js`) → ADN de estilo B2B → helpers → router → Armario → Ficha →
Añadir → Escáner en tienda → Maleta → Estilista y Asesor de compra → Insights →
Perfil → Onboarding y tour → Demo B2B → Red social → Strava → arranque y nube.

Trocearlo es la deuda técnica número uno, pero hazlo por partes y con la app
funcionando entre paso y paso.

## Cosas que ya pasaron (no las repitas)

- `strava.js` estaba en la raíz en vez de en `api/`, así que `/api/strava` daba
  404 y toda la integración estaba muerta en producción. **Solo lo que está
  dentro de `api/` se convierte en función.**
- Había copias viejas de `supabase.js`, `ai.js` y `shopping.js` en la raíz,
  subidas sin querer por la web de GitHub. Confundían a todo el que leía el repo.
- `api/health.js` publicaba el prefijo de la clave de Groq. Borrado.
- Las políticas RLS de `garments` eran solo-dueño, así que «ver el armario de un
  amigo» y el armario público por `?u=usuario` devolvían siempre vacío, sin error.

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

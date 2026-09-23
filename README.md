# Drobe · el sistema operativo de tu armario

PWA en español. Escaneas el ticket o haces una foto → la IA crea las prendas →
organizas el armario, te viste con el estilista, evitas comprar lo que ya tienes
y vendes lo que no usas.

**Producción:** https://drobeapp-theta.vercel.app

**Diseño:** blanco, gris neutro y terracota. El lienzo no tiene color — lo pone
la ropa. Todo el texto pasa AA sobre los tres fondos del sistema.

**Stack:** HTML/CSS/JS vanilla sin build · Three.js por CDN · Vercel (estático +
funciones en `/api`) · Supabase (auth + Postgres + Storage) · Groq (IA) ·
SerpApi (Google Shopping).

---

## Estructura

```
index.html              shell de la app (importmap de Three)
styles.css              sistema de diseño
app.js                  estado, vistas, IA, social  (monolito, ver «Pendiente»)
wardrobe3d.js           armario en 3D
sw.js                   service worker (offline)
manifest.webmanifest    PWA

lib/log.js              registro de errores  ← todo fallo pasa por aquí
lib/normalize.js        normalización        ← marcas, catálogo de tipos, colores, duplicados
lib/normalize.test.mjs  255 pruebas
lib/modelos.js          modelos icónicos     ← «Gazelle azules»: marca, modelo, estilo y alternativas; calle o deporte
lib/modelos.test.mjs    46 pruebas
lib/taste.js            motor de gustos      ← puntuación de recomendaciones
lib/taste.test.mjs      47 pruebas
lib/supabase.js         cliente de la nube: auth, sync, social, storage

api/ai.js               proxy a Groq (texto y visión)
api/shopping.js         búsqueda de productos con SerpApi
api/strava.js           OAuth de Strava + km de zapatillas y bicis
api/shoptest.js         diagnóstico de SerpApi

supabase/schema.sql     esquema completo, idempotente y NO destructivo
assets/                 iconos e imágenes de producto
```

---

## Probar en local

Los módulos ES y el service worker no funcionan por `file://`, hace falta un
servidor:

```bash
npx serve .          # o: python3 -m http.server 8000
```

Sin backend también funciona: las prendas se guardan en `localStorage` y la IA
cae a un parser heurístico si `/api/ai` no responde.

Pruebas del motor de recomendación (sin dependencias, tarda menos de un segundo):

```bash
node lib/normalize.test.mjs   # 255 pruebas
node lib/modelos.test.mjs     # 46 pruebas
node lib/taste.test.mjs       # 47 pruebas
```

---

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué | Obligatoria |
|---|---|---|
| `GROQ_API_KEY` | `/api/ai` — reconocimiento de prendas y tickets, estilista | sí |
| `SERPAPI_KEY` | `/api/shopping` — productos reales de Google Shopping | no |
| `STRAVA_CLIENT_ID` | `/api/strava` | no |
| `STRAVA_CLIENT_SECRET` | `/api/strava` | no |

Las credenciales de Supabase **no** van aquí: están dentro de `lib/supabase.js`
porque tienen que llegar al navegador. La `anon key` es pública por diseño; quien
protege los datos es RLS, no el secreto de la clave.

---

## Base de datos

1. Supabase → **SQL Editor** → pega `supabase/schema.sql` → Run.
2. Es idempotente y **no borra nada**: se puede ejecutar tantas veces como haga
   falta, también sobre una base con datos.
3. Crea también el bucket de Storage `tickets` (guarda tickets y avatares) con
   sus políticas.
4. Para probar rápido: Authentication → Providers → Email → desactiva *Confirm
   email*.

Tablas: `profiles`, `garments`, `tickets`, `maletas`, `wishlist`,
`social_profiles`, `friendships`, `messages`, `search_cache`, `scan_events`,
`purchase_events`.

> Si cambias el esquema desde el panel, **actualiza también este fichero**. Que
> dejaran de coincidir fue la causa de una tanda entera de fallos silenciosos:
> Supabase rechaza una escritura por RLS o por columna inexistente sin devolver
> error, y la app se quedaba tan tranquila.

---

## Despliegue

Vercel, sin build (proyecto estático + funciones en `/api`). Importa el repo y
listo.

**En cada despliegue que toque `app.js`, `styles.css` o `lib/`: sube el número de
`CACHE` en `sw.js`.** Si no, iOS puede seguir sirviendo la versión anterior.

---

## Cómo funciona el motor de gustos

Vive en `lib/taste.js`. No inventa nada: cada señal viene de algo que el usuario
ha hecho de verdad.

- **Marcas** ponderadas por uso real, gasto y recencia. Ponerse algo pesa más que
  tenerlo; ponerlo a la venta o no estrenarlo en seis meses resta.
- **Precio por categoría, no global.** Un abrigo se compara con sus abrigos. El
  motor anterior comparaba todo contra un único ticket medio y descartaba prendas
  perfectamente razonables por «caras».
- **Saturación.** Si ya tiene seis camisetas blancas, la séptima no es una buena
  recomendación por muy bien que encaje en todo lo demás.
- **Huecos.** Lo contrario: lo que no tiene y le hace falta.
- **Paleta** ponderada por uso, y detección de estampados.
- **Tallas** por marca y por categoría.
- **Rechazos.** Lo que descarta en el escáner de tienda, y por qué: si rechaza
  cosas por caras, el techo de precio baja.
- **Confianza.** Con cuatro prendas no se puede afirmar nada, así que el motor
  baja el umbral y lo dice, en vez de enseñar una pantalla vacía.
- **Normalización.** Todo pasa por `lib/normalize.js`: marca, categoría, color,
  material, talla y tienda tienen una sola forma canónica. Sin esto, la misma
  marca escrita de dos maneras se repartía la afinidad y la marca favorita del
  usuario desaparecía de sus propias recomendaciones.
- **La vista del armario.** Tres densidades (mosaico, medio y editorial) y cinco
  órdenes, entre ellos **«Sin usar»** — lo que llevas más tiempo sin ponerte,
  con el dato encima de cada prenda. Es la petición que más se repite en las
  reseñas de la categoría y que no tiene ninguna competidora.
- **Duplicados.** Al añadir una prenda se busca si ya hay algo igual y se avisa
  antes de guardar, con la prenda parecida delante.
- **Detección.** La marca que lee la IA se resuelve contra un catálogo de más
  de 300: "AUTRY MEDALIST" es Autry, "newbalance" es New Balance y una errata
  de OCR ("Adiddas") no crea una marca nueva. El tipo se resuelve contra el
  catálogo de prendas, con sus sinónimos y traducciones: "bambas", "trainers"
  y "zapatillas deportivas" son todos Sneakers. Si no hay señal, se deja vacío:
  no se inventa.

Cada recomendación sale con su puntuación y sus motivos, visibles en la propia
tarjeta. No es decoración: si Drobe falla la puntería, se ve por qué.

---

## Errores

Todo fallo pasa por `logError()` de `lib/log.js`, que lo escribe en consola, lo
guarda en un buffer local y —si afecta al usuario— lo enseña. Se consulta en
**Perfil → Diagnóstico**, con un botón que copia un informe completo listo para
pegar en un issue.

Regla del proyecto: **no se escriben `catch` vacíos.** Si algo se puede ignorar,
se ignora con un comentario que explique por qué.

---

## Pendiente

- `app.js` sigue siendo un monolito de ~3.600 líneas. Trocearlo en `views/`,
  `core/` y `features/` es la mejora que más acelera todo lo demás.
- 348 pruebas automáticas cubren normalización, modelos y motor de gustos, pero las
  vistas de `app.js` no tienen pruebas propias.
- La versión de caché del service worker se sube a mano.
- SerpApi: 100 búsquedas/mes en el plan gratuito. `search_cache` (24 h,
  compartida entre usuarios) estira la cuota pero no elimina el techo. El modo
  tienda gasta 1 + nº de alternativas (máximo 4) por búsqueda: unas 25 al mes.
- La lista de modelos de `lib/modelos.js` es a mano. Lo que no está ahí se
  resuelve con la IA, sin precio en vivo.
- Groq retira modelos sin avisar a la app. `api/ai.js` prueba una lista por
  orden y se puede cambiar con `GROQ_VISION_MODEL` / `GROQ_TEXT_MODEL` en Vercel.

## El siguiente paso de verdad

Ponerlo en manos de 30–50 personas desconocidas y medir si vuelven a los 30 días.
Es lo único que dirá si Drobe tiene tracción. Todo lo demás es preparación.

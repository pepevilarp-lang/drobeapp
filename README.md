# Drobe · MVP (PWA)

Armario digital: escanea el ticket → la IA crea las prendas → organiza, vístete con el estilista IA, vende en un clic. Incluye **armario en 3D** (Three.js), tienda con **productos reales** y es **instalable y offline** (PWA).

Stack: HTML/JS vanilla (sin build) · Three.js (CDN) · Vercel (hosting + función serverless de IA) · Supabase (opcional, nube + auth).

## Estructura
```
drobe/
├─ index.html              # shell de la app (importmap de three)
├─ styles.css              # sistema de diseño
├─ app.js                  # estado, vistas, IA, persistencia local
├─ wardrobe3d.js           # armario 3D (Three.js)
├─ sw.js                   # service worker (offline)
├─ manifest.webmanifest    # PWA
├─ api/ai.js               # serverless: proxy IA (key en servidor)
├─ lib/supabase.js         # cliente Supabase opcional
├─ supabase/schema.sql     # tablas + RLS
└─ assets/                 # imágenes de producto reales + iconos
```

## 1) Probar en local
Necesita un servidor (los módulos ES y el service worker no van por `file://`):
```bash
cd drobe
npx serve .        # o: python3 -m http.server 8000
```
Abre la URL que indique. Funciona sin backend: las prendas se guardan en `localStorage` y la IA usa un fallback heurístico si `/api/ai` no está disponible.

> El **armario 3D** carga Three.js desde CDN: necesita conexión la primera vez.

## 2) Subir a GitHub
```bash
cd drobe
git init && git add . && git commit -m "Drobe MVP"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/drobe.git
git push -u origin main
```

## 3) Desplegar en Vercel
1. vercel.com → **New Project** → importa el repo. No hace falta build (proyecto estático + funciones en `/api`).
2. **Settings → Environment Variables** → añade `ANTHROPIC_API_KEY`.
3. Deploy. Tu `/api/ai` ya funciona y el ticket/estilista usan IA real.

## 4) Activar Supabase (nube + login entre dispositivos)
1. supabase.com → nuevo proyecto.
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`.
3. **Storage** → crea un bucket público `garments` para las fotos (opcional).
4. En `lib/supabase.js` rellena `SUPABASE_URL` y `SUPABASE_ANON_KEY`. **Con eso ya funciona**: aparece el login en Perfil, el armario se sincroniza solo y se comparte entre dispositivos.
5. Para pruebas rápidas, en Supabase → Authentication → Providers → Email, desactiva "Confirm email" (si no, hay que confirmar por correo antes de entrar).

## Notas
- La key de IA **nunca** está en el cliente: el navegador llama a `/api/ai` y la función serverless añade la key.
- Para abaratar, `api/ai.js` usa un modelo Haiku; cámbialo si quieres más calidad. También puedes apuntar a Groq (comentario en el archivo).
- **OCR real**: al hacer foto del ticket, `lib/ocr.js` lo lee con Tesseract.js (español) en el navegador y pasa el texto a la IA. La primera vez descarga el motor (~unos MB) desde CDN, así que necesita conexión.
- **Offline-first**: si no configuras Supabase ni IA, la app sigue funcionando con `localStorage` y un parser de tickets heurístico. Nada se descarga de más.

## Siguiente paso de verdad
Esto sirve para ponerlo en manos de 30–50 personas que no conozcas y medir si vuelven (retención D30). Es lo único que dirá si Drobe tiene tracción antes de invertir más en features.

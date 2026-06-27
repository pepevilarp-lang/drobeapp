// OCR de tickets con Tesseract.js. Se carga bajo demanda desde app.js
// (import dinámico), así Tesseract solo se descarga cuando el usuario hace foto.
import Tesseract from 'https://esm.sh/tesseract.js@5';

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    im.src = url;
  });
}

// Redimensiona + pasa a gris con un poco de contraste: mejora bastante la lectura
// de tickets térmicos típicos de tienda.
async function preprocess(file) {
  const img = await fileToImage(file);
  const maxW = 1600;
  const scale = img.width > maxW ? maxW / img.width : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g > 150 ? Math.min(255, g * 1.12) : g * 0.88; // realza claros/oscuros
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export async function extractTextFromImage(file, onProgress) {
  const canvas = await preprocess(file);
  const worker = await Tesseract.createWorker('spa', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof onProgress === 'function') onProgress(m.progress);
    }
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

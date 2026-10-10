// Prepara la superficie de Walkurio a partir del mapa plano de referencia (equirectangular).
//   node .dev/walkurio-mapa.mjs <imagen> [x y ancho alto]
// Con x y ancho alto, recorta el mapa de una imagen más grande (por ejemplo, la lámina de referencia de Nico).
// Si llega el mapa real (4096×2048 o similar), se pasa solo la imagen y listo.
//
// Salida en img/walkurio/ (2048×1024, la longitud 0 queda en el centro, como en el mapa):
// · tierra.webp: el color de la tierra. Donde hay agua se rellena con el color de la tierra más cercana, así el
//   planeta puede dibujar costas nítidas de cerca sin que se le cuele el azul del mar.
// · campos.webp: R = tierra o agua (0 agua, 1 tierra, suave en la costa) · G = relieve (montañas) · B = hielo.
// Las nubes pintadas en el mapa se quitan (se rellenan con lo que las rodea): el planeta tiene su propia capa de nubes.
// Los bordes izquierdo y derecho se empalman para que no se vea la costura al girar.
// Usa sharp de la plataforma (C:\dev\plataforma).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const [archivo, ...recorte] = process.argv.slice(2);
if (!archivo) { console.log('Uso: node .dev/walkurio-mapa.mjs <imagen> [x y ancho alto]'); process.exit(1); }
const W = 2048, H = 1024, N = W * H;
const salida = fileURLToPath(new URL('../img/walkurio/', import.meta.url));
mkdirSync(salida, { recursive: true });

let img = sharp(readFileSync(archivo)).removeAlpha();
if (recorte.length === 4) { const [left, top, width, height] = recorte.map(Number); img = img.extract({ left, top, width, height }); }
const { data } = await img.resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });

// --- Clasificar cada pixel: agua, tierra, hielo o desconocido (nube) ---
const AGUA = 0, TIERRA = 1, HIELO = 2, NUBE = 3;
const clase = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), lum = (r + g + b) / 3, lat = 90 - (Math.floor(i / W) + 0.5) / H * 180;
  if (lum > 165 && max - min < 55) clase[i] = Math.abs(lat) > 64 ? HIELO : NUBE;
  // Agua: azul, o turquesa de la costa (poco rojo, verde y azul altos)
  else if ((b > r + 12 && b >= g - 18) || (b > r + 30 && b > g * 0.68) || (g > 150 && b > r + 8)) clase[i] = AGUA;
  else clase[i] = TIERRA;
}

// Vecinos con la longitud dando la vuelta (el mapa se envuelve en la esfera)
const vecinos = (i) => { const x = i % W, y = (i - x) / W; const v = [y * W + (x + 1) % W, y * W + (x + W - 1) % W]; if (y > 0) v.push(i - W); if (y < H - 1) v.push(i + W); return v; };
/** Relleno por cercanía: cada pixel sin dato toma el valor del pixel con dato más cercano. */
function rellenar(tiene, copiar) {
  const cola = new Int32Array(N); let a = 0, z = 0;
  const visto = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (tiene(i)) { visto[i] = 1; cola[z++] = i; }
  while (a < z) { const i = cola[a++]; for (const j of vecinos(i)) if (!visto[j]) { visto[j] = 1; copiar(j, i); cola[z++] = j; } }
}
// Las nubes toman la clase de lo que tienen alrededor
rellenar((i) => clase[i] !== NUBE, (j, i) => { clase[j] = clase[i]; });

// El color de la tierra sale solo de lo que era tierra en el mapa (no de nubes ni charcos rellenados)
const tierraDeVerdad = Uint8Array.from(clase, (c) => (c === TIERRA ? 1 : 0));

// Charcos chicos rodeados de tierra (huecos de nubes, manchas): pasan a tierra. Los lagos grandes quedan.
{
  const visto = new Uint8Array(N), cola = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (visto[s] || clase[s] !== AGUA) continue;
    let a = 0, z = 0; cola[z++] = s; visto[s] = 1;
    while (a < z) { const i = cola[a++]; for (const j of vecinos(i)) if (!visto[j] && clase[j] === AGUA) { visto[j] = 1; cola[z++] = j; } }
    if (z < 900) for (let k = 0; k < z; k++) clase[cola[k]] = TIERRA;
  }
}

// --- Campos ---
const tierra = new Float32Array(N), relieve = new Float32Array(N), hielo = new Float32Array(N), lum = new Float32Array(N);
for (let i = 0; i < N; i++) {
  tierra[i] = clase[i] === AGUA ? 0 : 1;
  hielo[i] = clase[i] === HIELO ? 1 : 0;
  lum[i] = (data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]) / 765;
}
/** Desenfoque (cajas repetidas ≈ gaussiano), dando la vuelta en la longitud. */
function desenfocar(c, radio, pasadas = 3) {
  const t = new Float32Array(N);
  for (let p = 0; p < pasadas; p++) {
    for (let y = 0; y < H; y++) {
      let s = 0; for (let k = -radio; k <= radio; k++) s += c[y * W + ((k + W) % W)];
      for (let x = 0; x < W; x++) { t[y * W + x] = s / (2 * radio + 1); s += c[y * W + (x + radio + 1) % W] - c[y * W + (x - radio + W) % W]; }
    }
    for (let x = 0; x < W; x++) {
      let s = 0; for (let k = -radio; k <= radio; k++) s += t[Math.min(H - 1, Math.max(0, k)) * W + x];
      for (let y = 0; y < H; y++) { c[y * W + x] = s / (2 * radio + 1); s += t[Math.min(H - 1, y + radio + 1) * W + x] - t[Math.max(0, y - radio) * W + x]; }
    }
  }
  return c;
}
// Relieve: donde el mapa tiene más contraste de luz y sombra sobre tierra (las cordilleras están dibujadas así)
const suave = desenfocar(Float32Array.from(lum), 4, 2);
for (let i = 0; i < N; i++) relieve[i] = clase[i] === AGUA ? 0 : Math.abs(lum[i] - suave[i]);
desenfocar(relieve, 5, 3);
let maxR = 0; for (let i = 0; i < N; i++) maxR = Math.max(maxR, relieve[i]);
for (let i = 0; i < N; i++) relieve[i] = Math.min(1, relieve[i] / (maxR * 0.55));
desenfocar(tierra, 2, 3);
desenfocar(hielo, 3, 2);

// Color de la tierra: el del mapa donde hay tierra; en el agua, el de la tierra más cercana
const color = new Float32Array(N * 3);
const esTierra = (i) => tierraDeVerdad[i] === 1;
for (let i = 0; i < N; i++) if (esTierra(i)) for (let k = 0; k < 3; k++) color[i * 3 + k] = data[i * 3 + k];
rellenar(esTierra, (j, i) => { for (let k = 0; k < 3; k++) color[j * 3 + k] = color[i * 3 + k]; });
for (let k = 0; k < 3; k++) {
  const canal = new Float32Array(N); for (let i = 0; i < N; i++) canal[i] = color[i * 3 + k];
  desenfocar(canal, 1, 2);
  for (let i = 0; i < N; i++) color[i * 3 + k] = canal[i];
}

// --- Costura: los bordes izquierdo y derecho se encuentran a mitad de camino ---
const BANDA = 40;
const empalmar = (c, canales = 1) => {
  for (let y = 0; y < H; y++) for (let k = 0; k < canales; k++) {
    const iz = c[(y * W) * canales + k], de = c[(y * W + W - 1) * canales + k], d = (de - iz) / 2;
    for (let x = 0; x < BANDA; x++) { const f = 1 - x / BANDA; c[(y * W + x) * canales + k] += d * f; c[(y * W + W - 1 - x) * canales + k] -= d * f; }
  }
};
empalmar(tierra); empalmar(relieve); empalmar(hielo); empalmar(color, 3);

// --- Guardar ---
const rgb = Buffer.alloc(N * 3), campos = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.max(0, Math.min(255, Math.round(color[i * 3 + k])));
  campos[i * 4] = Math.round(tierra[i] * 255); campos[i * 4 + 1] = Math.round(relieve[i] * 255);
  campos[i * 4 + 2] = Math.round(hielo[i] * 255); campos[i * 4 + 3] = 255;
}
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 88 }).toFile(`${salida}tierra.webp`);
await sharp(campos, { raw: { width: W, height: H, channels: 4 } }).removeAlpha().webp({ quality: 92 }).toFile(`${salida}campos.webp`);
const cuenta = [0, 0, 0]; for (let i = 0; i < N; i++) cuenta[clase[i]]++;
console.log(`Listo: img/walkurio/tierra.webp y campos.webp · agua ${Math.round(cuenta[0] / N * 100)}% · tierra ${Math.round(cuenta[1] / N * 100)}% · hielo ${Math.round(cuenta[2] / N * 100)}%`);

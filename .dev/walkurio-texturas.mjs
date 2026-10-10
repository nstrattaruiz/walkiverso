// Prepara las texturas del paisaje de cerca de Walkurio (Poly Haven y ambientCG, CC0) a partir de las imágenes ya
// extraídas de los paquetes de la carpeta Texturas (solo el color "diff" y la altura "disp"; los .blend y .exr no se usan).
//   node .dev/walkurio-texturas.mjs <carpeta con las imágenes extraídas>
// Salida en img/walkurio/texturas/:
// · <suelo>.webp (1024 px): el color en RGB y la altura en el canal alfa (el planeta saca el relieve fino de ahí).
// Usa sharp de la plataforma (C:\dev\plataforma).
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const origen = process.argv[2];
if (!origen) { console.log('Uso: node .dev/walkurio-texturas.mjs <carpeta>'); process.exit(1); }
const salida = fileURLToPath(new URL('../img/walkurio/texturas/', import.meta.url));
mkdirSync(salida, { recursive: true });
const archivos = readdirSync(origen);
const buscar = (patron) => { const f = archivos.find((a) => patron.test(a)); if (!f) throw new Error(`No encontré ${patron}`); return join(origen, f); };

// nombre → [color, altura, desenfoque] (la nieve se suaviza para que no se noten las pisadas de la foto)
const SUELOS = {
  pasto: [/^rocky_terrain_02_diff/, /^rocky_terrain_02_disp/, 0],
  roca: [/^aerial_rocks_04_diff/, /^aerial_rocks_04_disp/, 0],
  gris: [/^rocks_ground_04_diff/, /^rocks_ground_04_disp/, 0],
  nieve: [/^snow_01_diff/, /^snow_01_disp/, 2.2],
  arena: [/^dense_sand_diff/, /^dense_sand_disp/, 0],
  arenisca: [/^sandstone_cracks_diff/, /^sandstone_cracks_disp/, 0],
  grava: [/^rocky_trail_diff/, /^rocky_trail_disp/, 0],
  playa: [/^coast_sand_05_diff/, /^coast_sand_05_disp/, 0],
  hojas: [/^forest_leaves_03_diff/, /^forest_leaves_03_disp/, 0],
};
const L = 1024;
for (const [nombre, [pc, pa, blur]] of Object.entries(SUELOS)) {
  let color = sharp(readFileSync(buscar(pc))).resize(L, L, { kernel: 'lanczos3' }).removeAlpha();
  let alto = sharp(readFileSync(buscar(pa))).resize(L, L, { kernel: 'lanczos3' }).grayscale();
  if (blur) { color = color.blur(blur); alto = alto.blur(blur * 1.5); }
  const rgb = await color.raw().toBuffer();
  const a = await alto.normalise().raw().toBuffer();
  const rgba = Buffer.alloc(L * L * 4);
  for (let i = 0; i < L * L; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = a[i]; }
  await sharp(rgba, { raw: { width: L, height: L, channels: 4 } }).webp({ quality: 74, alphaQuality: 60, effort: 6 }).toFile(join(salida, `${nombre}.webp`));
  console.log('suelo', nombre);
}

// Cielos: se guardan como vienen (panorámicas) y se busca dónde está el sol en el de día, para alinearlo con el del planeta
for (const [nombre, patron] of [['cielo-dia', /^DaySkyHDRI054A.*TONEMAPPED/], ['cielo-noche', /^NightSkyHDRI003.*TONEMAPPED/]]) {
  const img = sharp(readFileSync(buscar(patron)));
  const { width, height } = await img.metadata();
  await img.clone().webp({ quality: 86 }).toFile(join(salida, `${nombre}.webp`));
  const { data } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let mejor = 0, donde = 0;
  for (let i = 0; i < width * height; i++) { const v = data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2]; if (v > mejor) { mejor = v; donde = i; } }
  const x = donde % width, y = Math.floor(donde / width);
  console.log(nombre, `${width}x${height}`, 'lo más brillante en', x, y, '→ u', (x / width).toFixed(3), 'altura', (90 - (y / height) * 180).toFixed(1), '°');
}

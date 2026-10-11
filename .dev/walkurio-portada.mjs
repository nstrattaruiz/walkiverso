// Arma las imágenes del Walkurio chico de la portada (img/walkurio/portada) a partir del planeta ya calculado.
// 1. Con `node .dev/servir.mjs` levantado, abrir http://localhost:4173/walkurio, esperar que cargue y en la consola:
//      const [c, ca] = wkPlaneta.exportar().color, [, na] = wkPlaneta.exportar().nubes
//    y guardar esas tres imágenes (son direcciones data:) como export-color.png, export-color-a.png y export-nubes-a.png.
// 2. node .dev/walkurio-portada.mjs <carpeta con esas tres imágenes>
// planeta.webp lleva el color y, en el alfa, el agua invertida (tierra opaca: el WEBP no pierde su color);
// nubes.webp es la capa de nubes en gris; luna-1/2.webp, las lunas en chico.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const origen = process.argv[2];
if (!origen) { console.log('Uso: node .dev/walkurio-portada.mjs <carpeta>'); process.exit(1); }
const destino = (n) => fileURLToPath(new URL(`../img/walkurio/${n}`, import.meta.url));
const W = 2048, H = 1024;
const rgb = await sharp(readFileSync(join(origen, 'export-color.png'))).resize(W, H).removeAlpha().raw().toBuffer();
const agua = await sharp(readFileSync(join(origen, 'export-color-a.png'))).resize(W, H).extractChannel(0).raw().toBuffer();
const o = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { o[i * 4] = rgb[i * 3]; o[i * 4 + 1] = rgb[i * 3 + 1]; o[i * 4 + 2] = rgb[i * 3 + 2]; o[i * 4 + 3] = 255 - Math.round(agua[i] * 0.8); }
await sharp(o, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 82, alphaQuality: 70, effort: 6, exact: true }).toFile(destino('portada/planeta.webp'));
await sharp(readFileSync(join(origen, 'export-nubes-a.png'))).resize(1024, 512).extractChannel(0).webp({ quality: 75 }).toFile(destino('portada/nubes.webp'));
for (const n of ['luna-1', 'luna-2']) await sharp(readFileSync(destino(`lunas/${n}.webp`))).resize(512, 256).webp({ quality: 80 }).toFile(destino(`portada/${n}.webp`));
console.log('listo: img/walkurio/portada');

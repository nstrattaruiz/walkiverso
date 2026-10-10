// Achica las fotos pesadas de img/ para que la web cargue liviana. Correr después de sumar fotos:
//   node .dev/optimizar-imagenes.mjs
// · Fondos (img/*.webp: hero y puertas): como mucho 2000 px de ancho.
// · Productos (img/productos/…): como mucho 1200 px de ancho; las que pesan más de 140 KB se recomprimen.
//   Las que no son WEBP (JPG, PNG) pasan a WEBP y se corrige su dirección en js/datos/catalogo.js.
// Solo reemplaza un archivo si el nuevo pesa menos. No cambia el encuadre ni el color: solo tamaño y compresión.
// Usa sharp, que ya está instalado en la plataforma (C:\dev\plataforma).
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const raiz = fileURLToPath(new URL('..', import.meta.url));
const kb = (b) => Math.round(b / 1024);
const archivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(join(dir, e.name)) : [join(dir, e.name)]));

let antes = 0, despues = 0;
const cambios = [];
const catalogo = join(raiz, 'js/datos/catalogo.js');
let textoCatalogo = readFileSync(catalogo, 'utf8');

for (const archivo of archivos(join(raiz, 'img')).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))) {
  const producto = archivo.includes(`${join('img', 'productos')}`);
  const maximo = producto ? 1200 : 2000;
  const peso = statSync(archivo).size;
  const original = readFileSync(archivo);
  const { width, format } = await sharp(original).metadata();
  const aWebp = producto && format !== 'webp';
  if (width <= maximo && peso <= 140 * 1024 && !aWebp) continue;
  const datos = await sharp(original).resize({ width: Math.min(width, maximo), withoutEnlargement: true }).webp({ quality: producto ? 80 : 78, effort: 6 }).toBuffer();
  const destino = aWebp ? archivo.replace(/\.(jpe?g|png)$/i, '.webp') : archivo;
  if (!aWebp && datos.length >= peso) continue;
  writeFileSync(destino, datos);
  if (aWebp) {
    unlinkSync(archivo);
    const viejo = relative(raiz, archivo).replaceAll('\\', '/'), nuevo = relative(raiz, destino).replaceAll('\\', '/');
    textoCatalogo = textoCatalogo.replaceAll(viejo, nuevo);
  }
  antes += peso; despues += datos.length;
  cambios.push(`${kb(peso)} → ${kb(datos.length)} KB  ${relative(raiz, destino)}`);
}
writeFileSync(catalogo, textoCatalogo);
console.log(cambios.join('\n') || 'Nada para achicar.');
if (cambios.length) console.log(`\n${cambios.length} fotos: ${kb(antes)} KB → ${kb(despues)} KB`);

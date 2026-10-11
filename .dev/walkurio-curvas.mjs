// Saca las curvas de nivel de Walkurio (costa y relieve) del mapa del planeta, para el globo dibujado de la portada.
//   node .dev/walkurio-curvas.mjs
// Lee img/walkurio/campos.webp (R tierra/agua, G montañas) y escribe img/walkurio/curvas.json:
// { niveles: [[[lat, lon, lat, lon, …], …], …] } — una lista de líneas por nivel (0 = costa).
// Usa sharp de la plataforma (C:\dev\plataforma).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const W = 360, H = 180;
const { data } = await sharp(readFileSync(fileURLToPath(new URL('../img/walkurio/campos.webp', import.meta.url))))
  .resize(W, H).blur(1.2).raw().toBuffer({ resolveWithObject: true });
// Altura: el mar por debajo de 0.5; la tierra sube con las montañas
const alt = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) { const t = data[i * 3] / 255, m = data[i * 3 + 1] / 255; alt[i] = t < 0.5 ? t : 0.5 + m * 0.5 * t; }
const a = (x, y) => alt[Math.min(H - 1, Math.max(0, y)) * W + ((x + W) % W)];

/** Marching squares: segmentos de la curva de nivel `v`, unidos en líneas. */
function curvas(v) {
  const seg = [];
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const c = [a(x, y), a(x + 1, y), a(x + 1, y + 1), a(x, y + 1)];
    const p = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const cruces = [];
    for (let k = 0; k < 4; k++) {
      const c1 = c[k], c2 = c[(k + 1) % 4];
      if ((c1 < v) !== (c2 < v)) { const t = (v - c1) / (c2 - c1), [x1, y1] = p[k], [x2, y2] = p[(k + 1) % 4]; cruces.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]); }
    }
    if (cruces.length === 2) seg.push(cruces);
    else if (cruces.length === 4) seg.push([cruces[0], cruces[1]], [cruces[2], cruces[3]]);
  }
  // Unir segmentos por sus puntas
  const llave = ([x, y]) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
  const porPunta = new Map();
  seg.forEach((s, i) => s.forEach((pt) => { const k = llave(pt); if (!porPunta.has(k)) porPunta.set(k, []); porPunta.get(k).push(i); }));
  const usado = new Uint8Array(seg.length), lineas = [];
  for (let i = 0; i < seg.length; i++) {
    if (usado[i]) continue;
    usado[i] = 1;
    const linea = [...seg[i]];
    for (const lado of [1, 0]) {
      for (;;) {
        const punta = lado ? linea.at(-1) : linea[0];
        const sig = (porPunta.get(llave(punta)) ?? []).find((j) => !usado[j]);
        if (sig === undefined) break;
        usado[sig] = 1;
        const [p0, p1] = seg[sig], otro = llave(p0) === llave(punta) ? p1 : p0;
        if (lado) linea.push(otro); else linea.unshift(otro);
      }
    }
    if (linea.length > 6) lineas.push(linea);
  }
  // Simplificar (un punto cada ~1,5°) y pasar a latitud/longitud
  return lineas.map((l) => l.filter((_, k) => k % 2 === 0 || k === l.length - 1).flatMap(([x, y]) => [
    Math.round((90 - (y + 0.5) / H * 180) * 10) / 10, Math.round(((x + 0.5) / W * 360 - 180) * 10) / 10,
  ]));
}
// Cerca de los polos el mapa se estira y daría un amontonamiento de curvitas: se cortan ahí
const niveles = [0.5, 0.6, 0.7, 0.8].map(curvas).map((n) => n.map((l) => l.map((x, k, a) => (k % 2 === 0 && Math.abs(x) > 76 ? null : x))).flatMap((l) => {
  const partes = [[]];
  for (let k = 0; k < l.length; k += 2) { if (l[k] === null) { if (partes.at(-1).length) partes.push([]); } else partes.at(-1).push(l[k], l[k + 1]); }
  return partes.filter((p) => p.length > 8);
}));
writeFileSync(fileURLToPath(new URL('../img/walkurio/curvas.json', import.meta.url)), JSON.stringify({ niveles }));
console.log('líneas por nivel:', niveles.map((n) => n.length).join(', '), '· puntos:', niveles.flat().reduce((s, l) => s + l.length / 2, 0));

// Prepara los modelos y las texturas del paisaje de cerca de Walkurio a partir de los paquetes de "Nuevas Texturas"
// (Poly Haven y Quaternius, CC0), ya extraídos en dos carpetas:
//   node .dev/walkurio-modelos.mjs <carpeta Quaternius (OBJ + texturas)> <carpeta Poly Haven (una subcarpeta por paquete)> <carpeta Nuevas Texturas>
// Salida en img/walkurio/:
// · modelos/<nombre>.bin + modelos/modelos.json: árboles, arbustos y rocas en un formato chico propio (posiciones,
//   normales y coordenadas de textura en Float32, índices en Uint16), de 1 de alto, apoyados en y = 0.
//   Las rocas de Poly Haven traen cien mil triángulos: se simplifican agrupando vértices cercanos.
// · modelos/<textura>.webp: hojas (con transparencia), cortezas y rocas, a 512 px.
// · texturas/<suelo>.webp (color + altura en alfa) y texturas/<suelo>-n.webp (relieve, "normal map"), a 1024 px.
// · lunas/<luna>.webp: el mapa de cada luna (2048 × 1024).
// Usa sharp de la plataforma (C:\dev\plataforma).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire('C:/dev/plataforma/package.json')('sharp');
sharp.cache(false);
const [Q, P, N] = process.argv.slice(2);
if (!N) { console.log('Uso: node .dev/walkurio-modelos.mjs <Quaternius> <Poly Haven> <Nuevas Texturas>'); process.exit(1); }
const salida = (d) => { const r = fileURLToPath(new URL(`../img/walkurio/${d}/`, import.meta.url)); mkdirSync(r, { recursive: true }); return r; };
const M = salida('modelos'), T = salida('texturas'), L = salida('lunas');

// ---------------------------------------------------------------- geometría
/** Lee un OBJ: triángulos agrupados por material, con vértices únicos por (posición, uv, normal). */
function leerObj(texto) {
  const v = [], vt = [], vn = [], grupos = new Map();
  let actual = 'x';
  for (const linea of texto.split('\n')) {
    const p = linea.trim().split(/\s+/);
    if (p[0] === 'v') v.push(p.slice(1, 4).map(Number));
    else if (p[0] === 'vt') vt.push(p.slice(1, 3).map(Number));
    else if (p[0] === 'vn') vn.push(p.slice(1, 4).map(Number));
    else if (p[0] === 'usemtl') actual = p[1];
    else if (p[0] === 'f') {
      const esq = p.slice(1).map((c) => c.split('/').map((x) => (x ? Number(x) - 1 : -1)));
      if (!grupos.has(actual)) grupos.set(actual, []);
      for (let i = 1; i < esq.length - 1; i++) grupos.get(actual).push(esq[0], esq[i], esq[i + 1]);
    }
  }
  const pos = [], nor = [], uv = [], indices = [], llaves = new Map(), partes = [];
  for (const [material, esquinas] of grupos) {
    const inicio = indices.length;
    for (const [a, b, c] of esquinas) {
      const k = `${a}/${b}/${c}`;
      if (!llaves.has(k)) {
        llaves.set(k, pos.length / 3);
        pos.push(...v[a]); nor.push(...(vn[c] ?? [0, 1, 0])); uv.push(...(vt[b] ?? [0, 0]));
      }
      indices.push(llaves.get(k));
    }
    partes.push({ material, inicio, cuantos: indices.length - inicio });
  }
  return { pos, nor, uv, indices, partes };
}
/** Lee la primera malla de un glTF de Poly Haven. */
function leerGltf(carpeta, nombre) {
  const g = JSON.parse(readFileSync(join(carpeta, `${nombre}_2k.gltf`), 'utf8'));
  const bin = readFileSync(join(carpeta, g.buffers[0].uri));
  const leer = (i, Tipo) => { const a = g.accessors[i], bv = g.bufferViews[a.bufferView]; const n = a.count * ({ VEC3: 3, VEC2: 2, SCALAR: 1 })[a.type]; return Array.from(new Tipo(bin.buffer.slice(bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0) + n * Tipo.BYTES_PER_ELEMENT))); };
  const pr = g.meshes[0].primitives[0];
  const tipoIdx = { 5123: Uint16Array, 5125: Uint32Array }[g.accessors[pr.indices].componentType];
  const indices = leer(pr.indices, tipoIdx);
  return { pos: leer(pr.attributes.POSITION, Float32Array), nor: leer(pr.attributes.NORMAL, Float32Array), uv: leer(pr.attributes.TEXCOORD_0, Float32Array), indices, partes: [{ material: 'roca', inicio: 0, cuantos: indices.length }] };
}
/** Simplifica agrupando los vértices que caen en la misma celda de una grilla (promedia posición, normal y uv). */
function simplificar(m, celdas) {
  const n = m.pos.length / 3, min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], m.pos[i * 3 + k]); max[k] = Math.max(max[k], m.pos[i * 3 + k]); }
  const lado = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / celdas;
  const celda = new Map(), nuevo = [], suma = [];
  for (let i = 0; i < n; i++) {
    const k = [0, 1, 2].map((j) => Math.floor((m.pos[i * 3 + j] - min[j]) / lado)).join();
    if (!celda.has(k)) { celda.set(k, suma.length); suma.push({ p: [0, 0, 0], n: [0, 0, 0], u: [0, 0], c: 0 }); }
    const s = suma[celda.get(k)];
    for (let j = 0; j < 3; j++) { s.p[j] += m.pos[i * 3 + j]; s.n[j] += m.nor[i * 3 + j]; }
    s.u[0] += m.uv[i * 2]; s.u[1] += m.uv[i * 2 + 1]; s.c++;
    nuevo[i] = celda.get(k);
  }
  const pos = [], nor = [], uv = [];
  for (const s of suma) { pos.push(...s.p.map((x) => x / s.c)); const l = Math.hypot(...s.n) || 1; nor.push(...s.n.map((x) => x / l)); uv.push(s.u[0] / s.c, s.u[1] / s.c); }
  const indices = [], vistos = new Set();
  for (let t = 0; t < m.indices.length; t += 3) {
    const [a, b, c] = [nuevo[m.indices[t]], nuevo[m.indices[t + 1]], nuevo[m.indices[t + 2]]];
    if (a === b || b === c || a === c) continue;
    const k = [a, b, c].sort((x, y) => x - y).join();
    if (vistos.has(k)) continue;
    vistos.add(k); indices.push(a, b, c);
  }
  return { pos, nor, uv, indices, partes: [{ material: m.partes[0].material, inicio: 0, cuantos: indices.length }] };
}
/** 1 de alto, apoyado en y = 0 y centrado; rocas: su base un poco hundida (así no quedan "pegadas" encima del suelo). */
function normalizar(m, hundir = 0) {
  const n = m.pos.length / 3; let minY = Infinity, maxY = -Infinity, cx = 0, cz = 0;
  for (let i = 0; i < n; i++) { minY = Math.min(minY, m.pos[i * 3 + 1]); maxY = Math.max(maxY, m.pos[i * 3 + 1]); cx += m.pos[i * 3]; cz += m.pos[i * 3 + 2]; }
  cx /= n; cz /= n;
  const alto = maxY - minY;
  for (let i = 0; i < n; i++) { m.pos[i * 3] = (m.pos[i * 3] - cx) / alto; m.pos[i * 3 + 1] = (m.pos[i * 3 + 1] - minY) / alto - hundir; m.pos[i * 3 + 2] = (m.pos[i * 3 + 2] - cz) / alto; }
  return m;
}
const indice = {};
function guardar(nombre, m) {
  const f = Float32Array, verts = m.pos.length / 3;
  const I = verts > 65535 ? Uint32Array : Uint16Array;
  const partes = [new f(m.pos), new f(m.nor), new f(m.uv), new I(m.indices)];
  writeFileSync(join(M, `${nombre}.bin`), Buffer.concat(partes.map((a) => Buffer.from(a.buffer))));
  indice[nombre] = { vertices: verts, indices: m.indices.length, indices32: I === Uint32Array, partes: m.partes };
  console.log('modelo', nombre, verts, 'vértices,', m.indices.length / 3, 'triángulos', m.partes.map((p) => p.material).join('+'));
}

// Árboles y arbustos de Quaternius (OBJ)
const QUATERNIUS = { pino1: 'PineTree_5', pino2: 'PineTree_3', pino3: 'PineTree_1', hoja1: 'NormalTree_5', hoja2: 'NormalTree_3', arbusto1: 'Bush', arbusto2: 'Bush_Large' };
for (const [nombre, archivo] of Object.entries(QUATERNIUS)) guardar(nombre, normalizar(leerObj(readFileSync(join(Q, `${archivo}.obj`), 'utf8'))));
// Rocas de Poly Haven, simplificadas y hundidas un 25 %
for (const [nombre, carpeta, celdas] of [['roca1', 'moon_rock_04', 22], ['roca2', 'namaqualand_boulder_02', 30]]) {
  guardar(nombre, normalizar(simplificar(leerGltf(join(P, carpeta), carpeta), celdas), 0.25));
}
writeFileSync(join(M, 'modelos.json'), JSON.stringify(indice));

// ---------------------------------------------------------------- texturas de los modelos
const webp = (entrada, archivo, lado, opciones = {}) => sharp(readFileSync(entrada)).resize(lado, lado, { fit: 'fill' }).webp({ quality: 82, alphaQuality: 90, ...opciones }).toFile(archivo);
for (const [nombre, archivo] of [['pino-hojas', 'PineTree_Leaves.png'], ['pino-corteza', 'PineTree_Bark.png'], ['hoja-hojas', 'NormalTree_Leaves.png'], ['hoja-corteza', 'NormalTree_Bark.png'], ['arbusto-hojas', 'Bush_Leaves.png']]) {
  await webp(join(Q, archivo), join(M, `${nombre}.webp`), 512);
}
for (const [nombre, carpeta] of [['roca1', 'moon_rock_04'], ['roca2', 'namaqualand_boulder_02']]) {
  await webp(join(P, carpeta, 'textures', `${carpeta}_diff_2k.jpg`), join(M, `${nombre}.webp`), 512, { quality: 80 });
  await webp(join(P, carpeta, 'textures', `${carpeta}_nor_gl_2k.jpg`), join(M, `${nombre}-n.webp`), 512, { quality: 80 });
}
console.log('texturas de modelos listas');

// ---------------------------------------------------------------- suelos de Poly Haven: color (+ altura sacada del brillo) y relieve
const LADO = 1024;
for (const [nombre, carpeta] of [['bosque', 'mud_forest'], ['arena', 'park_sand'], ['grava', 'sandy_gravel_02'], ['playa', 'coast_sand_rocks_02'], ['roca', 'aerial_rocks_02'], ['sendero', 'rocky_trail_02']]) {
  const tx = join(P, carpeta, 'textures');
  const rgb = await sharp(readFileSync(join(tx, `${carpeta}_diff_2k.jpg`))).resize(LADO, LADO).removeAlpha().raw().toBuffer();
  const alto = await sharp(readFileSync(join(tx, `${carpeta}_diff_2k.jpg`))).resize(LADO, LADO).grayscale().blur(1.2).normalise().raw().toBuffer();
  const rgba = Buffer.alloc(LADO * LADO * 4);
  for (let i = 0; i < LADO * LADO; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alto[i]; }
  await sharp(rgba, { raw: { width: LADO, height: LADO, channels: 4 } }).webp({ quality: 76, alphaQuality: 60, effort: 6 }).toFile(join(T, `${nombre}.webp`));
  await sharp(readFileSync(join(tx, `${carpeta}_nor_gl_2k.jpg`))).resize(LADO, LADO).webp({ quality: 80, effort: 6 }).toFile(join(T, `${nombre}-n.webp`));
  console.log('suelo', nombre);
}
// A los suelos de antes (con altura en el alfa) se les arma el relieve a partir de esa altura
for (const nombre of ['pasto', 'nieve', 'arenisca', 'gris']) {
  const archivo = join(T, `${nombre}.webp`);
  if (!existsSync(archivo)) continue;
  const { data } = await sharp(readFileSync(archivo)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const h = (x, y) => data[(((y + LADO) % LADO) * LADO + ((x + LADO) % LADO)) * 4 + 3] / 255;
  const n = Buffer.alloc(LADO * LADO * 3);
  for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1);
    n.set([(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255], (y * LADO + x) * 3);
  }
  await sharp(n, { raw: { width: LADO, height: LADO, channels: 3 } }).webp({ quality: 80, effort: 6 }).toFile(join(T, `${nombre}-n.webp`));
  console.log('relieve de', nombre);
}

// ---------------------------------------------------------------- lunas: mapas reales (luna mayor = la Luna; menor = la helada)
await sharp(readFileSync(join(N, 'moon 2.jpg'))).resize(2048, 1024).webp({ quality: 84 }).toFile(join(L, 'luna-1.webp'));
await sharp(readFileSync(join(N, 'moon zoom.jpg'))).resize(2048, 1024).webp({ quality: 84 }).toFile(join(L, 'luna-2.webp'));
console.log('lunas listas');

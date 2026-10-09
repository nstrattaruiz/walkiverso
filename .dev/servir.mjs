// Servidor de demostración: muestra la web sin la plataforma, con datos de ejemplo (js/datos/demo.js).
// Uso:  node .dev/servir.mjs   →   http://localhost:4173
// Esta carpeta (.dev) es oculta: no se publica en la plataforma.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const puerto = Number(process.env.PORT) || 4173;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.json': 'application/json' };

createServer(async (req, res) => {
  const camino = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
  const ext = extname(camino);
  // Sin la plataforma no hay SDK: la web lo detecta y usa la tienda de demostración
  if (camino.startsWith('api')) { res.writeHead(404).end(); return; }
  try {
    // Las rutas sin extensión (/tienda, /producto/bjorn) devuelven index.html, igual que en la plataforma
    // Carpeta con su propio index.html (walkiver/): se sirve esa página; si no, la de la web
    let archivo = ext ? camino : 'index.html';
    if (!ext && camino) { try { await readFile(join(raiz, camino, 'index.html')); archivo = join(camino, 'index.html'); } catch { /* ruta de la web */ } }
    if (!ext && camino && archivo !== 'index.html' && !req.url.split('?')[0].endsWith('/')) { res.writeHead(301, { Location: `${req.url.split('?')[0]}/` }).end(); return; }
    const cuerpo = await readFile(join(raiz, archivo));
    res.writeHead(200, { 'Content-Type': TIPOS[ext || '.html'] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(cuerpo);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}).listen(puerto, () => console.log(`Walkiverso (demostración) en http://localhost:${puerto}`));

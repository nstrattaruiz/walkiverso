// Genera walkiver/campos.js: los textos e imágenes de la página de Walkiver que se pueden editar desde el panel,
// con dónde está cada uno en walkiver/index.html y su valor original (leído de la página misma, en un navegador).
// Uso (con node .dev/servir.mjs corriendo):  node .dev/walkiver-campos.mjs   y después   node .dev/esquema.mjs
// Hace falta volver a correrlo solo si cambia walkiver/index.html.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// clave · etiqueta · tipo · selector (· n: cuál de los que coinciden · todos: se aplica a todos los que coinciden)
const P = 'WKV.';
const DEF = [
  ['Walkiver · Barra y menú', null, [
    ['barra.anuncio', 'Anuncio que corre arriba', 'texto', '.wkv-news__track span, .wkv-news .wkv-visually-hidden', { todos: true }],
    ['barra.p1_titulo', 'Proyecto 1: título', 'texto', '.wkv-project__title', { n: 0 }],
    ['barra.p1_texto', 'Proyecto 1: texto', 'texto', '.wkv-project__text', { n: 0 }],
    ['barra.p1_boton', 'Proyecto 1: botón', 'texto', '.wkv-project .wkv-btn', { n: 0 }],
    ['barra.p1_imagen', 'Proyecto 1: imagen', 'ruta', '.wkv-project__img', { n: 0 }],
    ['barra.p2_titulo', 'Proyecto 2: título', 'texto', '.wkv-project__title', { n: 1 }],
    ['barra.p2_texto', 'Proyecto 2: texto', 'texto', '.wkv-project__text', { n: 1 }],
    ['barra.p2_boton', 'Proyecto 2: botón', 'texto', '.wkv-project .wkv-btn', { n: 1 }],
  ]],
  ['Walkiver · Portada', null, [
    ['portada.chip', 'Etiqueta de la oferta', 'texto', '#inicio .wkv-hero__chip'],
    ['portada.sobre', 'Texto sobre el título', 'texto', '#inicio .wkv-eyebrow'],
    ['portada.linea1', 'Primera línea', 'texto', '#inicio .wkv-hero__lines p', { n: 0 }],
    ['portada.linea2', 'Segunda línea', 'texto', '#inicio .wkv-hero__lines p', { n: 1 }],
    ['portada.linea3', 'Tercera línea', 'texto', '#inicio .wkv-hero__lines p', { n: 2 }],
    ['portada.boton', 'Botón', 'texto', '#inicio .wkv-hero__actions .wkv-btn'],
    ['portada.enlace', 'Enlace', 'texto', '#inicio .wkv-hero__actions .wkv-link'],
    ['portada.imagen', 'Imagen del e-book (tablet)', 'ruta', '#inicio .wkv-tablet__img'],
    ['portada.bajar', 'Texto para bajar', 'texto', '#inicio .wkv-hero__scroll span'],
  ]],
  ['Walkiver · Sobre mí', null, [
    ['sobre.retrato', 'Retrato', 'ruta', '#sobre-mi .wkv-frame__img'],
    ['sobre.placa', 'Placa del retrato', 'texto', '#sobre-mi .wkv-plaque span'],
    ['sobre.sobre', 'Texto sobre el título', 'texto', '#sobre-mi .wkv-eyebrow'],
    ['sobre.titulo', 'Título', 'titulo', '#sobre-mi .wkv-title'],
    ...[1, 2, 3, 4, 5].flatMap((i) => [
      [`sobre.p${i}`, `Pregunta ${i}`, 'texto', '#sobre-mi .wkv-acc__question', { n: i - 1, sub: `Pregunta ${i}` }],
      [`sobre.r${i}`, `Respuesta ${i}`, 'parrafos', '#sobre-mi .wkv-acc__answer', { n: i - 1, sub: `Pregunta ${i}` }],
    ]),
  ]],
  ['Walkiver · Vídeos', null, [
    ['videos.sobre', 'Texto sobre el título', 'texto', '#videos .wkv-eyebrow'],
    ['videos.titulo', 'Título', 'titulo', '#videos .wkv-title'],
    ['videos.texto', 'Texto', 'texto-largo', '#videos .wkv-lead p'],
    ['videos.enlace', 'Enlace al canal', 'texto', '#videos .wkv-series__aside .wkv-link'],
    ['videos.destacada', 'Etiqueta de la serie principal', 'texto', '#videos .wkv-serie__badge'],
    ...[1, 2, 3].flatMap((i) => [
      [`videos.s${i}_titulo`, `Serie ${i}: título`, 'texto', '#videos .wkv-serie__title', { n: i - 1, sub: `Serie ${i}` }],
      [`videos.s${i}_texto`, `Serie ${i}: texto`, 'texto-largo', '#videos .wkv-serie__text', { n: i - 1, sub: `Serie ${i}` }],
      [`videos.s${i}_boton`, `Serie ${i}: botón`, 'texto', '#videos .wkv-serie__cta', { n: i - 1, sub: `Serie ${i}` }],
    ]),
  ]],
  ['Walkiver · Mitología Express', null, [
    ['express.sobre', 'Texto sobre el título', 'texto', '#mitologia-express .wkv-eyebrow'],
    ['express.titulo', 'Título', 'titulo', '#mitologia-express .wkv-title'],
    ['express.texto', 'Texto', 'texto-largo', '#mitologia-express .wkv-lead p'],
    ['express.enlace', 'Enlace a los shorts', 'texto', '#mitologia-express .wkv-reels__aside .wkv-link'],
    ...[1, 2, 3, 4, 5, 6].flatMap((i) => [
      [`express.v${i}_etiqueta`, `Video ${i}: etiqueta`, 'texto', '#mitologia-express .wkv-reel__tag', { n: i - 1, sub: `Video ${i}` }],
      [`express.v${i}_titulo`, `Video ${i}: título`, 'texto', '#mitologia-express .wkv-reel__title', { n: i - 1, sub: `Video ${i}` }],
    ]),
  ]],
  ['Walkiver · Mi Walkiverso', null, [
    ['verso.sobre', 'Texto sobre el título', 'texto', '#walkiverso .wkv-eyebrow'],
    ['verso.titulo', 'Título', 'titulo', '#walkiverso .wkv-title'],
    ['verso.texto', 'Texto', 'texto-largo', '#walkiverso .wkv-lead p'],
    ['verso.boton', 'Botón', 'texto', '#walkiverso .wkv-verse__actions .wkv-btn'],
    ['verso.enlace', 'Enlace', 'texto', '#walkiverso .wkv-verse__actions .wkv-link'],
    ...[1, 2, 3].flatMap((i) => [
      [`verso.c${i}_imagen`, `Tarjeta ${i}: imagen`, 'ruta', '#walkiverso .wkv-panel__media img', { n: i - 1, sub: `Tarjeta ${i}` }],
      [`verso.c${i}_titulo`, `Tarjeta ${i}: título`, 'texto', '#walkiverso .wkv-panel__title', { n: i - 1, sub: `Tarjeta ${i}` }],
      [`verso.c${i}_texto`, `Tarjeta ${i}: texto`, 'texto', '#walkiverso .wkv-panel__text', { n: i - 1, sub: `Tarjeta ${i}` }],
      [`verso.c${i}_boton`, `Tarjeta ${i}: botón`, 'texto', '#walkiverso .wkv-panel__cta', { n: i - 1, sub: `Tarjeta ${i}` }],
    ]),
  ]],
  ['Walkiver · Contacto', null, [
    ['contacto.sobre', 'Texto sobre el título', 'texto', '#contacto .wkv-eyebrow'],
    ['contacto.titulo', 'Título', 'titulo', '#contacto .wkv-title'],
    ['contacto.texto', 'Texto', 'texto-largo', '#contacto .wkv-lead p'],
    ['contacto.c_nombre', 'Campo: nombre', 'texto', '#wkv-contact-contacto .wkv-field > span', { n: 0 }],
    ['contacto.c_email', 'Campo: email', 'texto', '#wkv-contact-contacto .wkv-field > span', { n: 1 }],
    ['contacto.c_asunto', 'Campo: asunto', 'texto', '#wkv-contact-contacto .wkv-field > span', { n: 2 }],
    ['contacto.c_mensaje', 'Campo: mensaje', 'texto', '#wkv-contact-contacto .wkv-field > span', { n: 3 }],
    ['contacto.boton', 'Botón', 'texto', '#wkv-contact-contacto .wkv-btn'],
  ]],
  ['Walkiver · Pie', null, [
    ['pie.frase', 'Frase grande', 'titulo', '.wkv-footer__statement'],
    ['pie.avatar', 'Foto chica', 'ruta', '.wkv-footer__avatar img'],
    ['pie.bio', 'Texto junto a la foto', 'texto-largo', '.wkv-footer__bio'],
    ['pie.t_explorar', 'Título de columna 1', 'texto', '.wkv-footer__title', { n: 0 }],
    ['pie.t_legal', 'Título de columna 2', 'texto', '.wkv-footer__title', { n: 1 }],
    ['pie.t_redes', 'Título de columna 3', 'texto', '.wkv-footer__title', { n: 2 }],
    ['pie.volver', 'Enlace de vuelta', 'texto', '.wkv-footer__back', { opcional: true }],
  ]],
];

// Lectura dentro de la página: el valor actual de cada campo, convertido a texto con marcas (*cursiva*, **negrita**)
const LEER = `(() => {
  const marcas = (el) => { const c = el.cloneNode(true); c.querySelectorAll('svg, .wkv-hero__chip-dot, .wkv-menu__num').forEach((x) => x.remove());
    let h = c.innerHTML.replace(/<(em|i)>|<\\/(em|i)>/g, '*').replace(/<(strong|b)>|<\\/(strong|b)>/g, '**').replace(/<\\/p>\\s*<p[^>]*>/g, '\\n\\n').replace(/<[^>]+>/g, '');
    const t = document.createElement('textarea'); t.innerHTML = h; return t.value.replace(/[ \\t]+/g, ' ').replace(/ *\\n */g, '\\n').trim(); };
  return (window.__DEF).map(([grupo, , campos]) => ({ nombre: grupo, campos: campos.map(([clave, etiqueta, tipo, sel, o = {}]) => {
    const els = [...document.querySelectorAll(sel)];
    const el = els[o.n ?? 0];
    if (!el) return o.opcional ? null : { error: clave + ': no encontré ' + sel };
    const valor = tipo === 'ruta' ? el.getAttribute('src') : marcas(el);
    return { clave: '${P}' + clave, etiqueta, tipo, sel, n: o.n ?? 0, todos: !!o.todos, sub: o.sub ?? null, cuantos: els.length, valor };
  }).filter(Boolean) }));
})()`;

// Chrome sin ventana, por el protocolo de depuración
const perfil = mkdtempSync(join(tmpdir(), 'wkv-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let destino;
for (let i = 0; i < 40 && !destino; i++) { await dormir(250); try { destino = (await (await fetch('http://127.0.0.1:9334/json')).json()).find((t) => t.type === 'page'); } catch { /* todavía no */ } }
const ws = new WebSocket(destino.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const espera = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && espera.has(d.id)) { espera.get(d.id)(d.result); espera.delete(d.id); } });
const cdp = (method, params = {}) => new Promise((r) => { espera.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await cdp('Page.enable');
await cdp('Page.navigate', { url: 'http://localhost:4173/walkiver/' });
await dormir(3500);
const r = await cdp('Runtime.evaluate', { expression: `window.__DEF = ${JSON.stringify(DEF)}; ${LEER}`, returnByValue: true });
ws.close(); chrome.kill();
const grupos = r.result.value;
const errores = grupos.flatMap((g) => g.campos.filter((c) => c.error).map((c) => c.error));
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

writeFileSync(new URL('../walkiver/campos.js', import.meta.url), `// Textos e imágenes de la página de Walkiver editables desde el panel ("Textos de la web", grupos "Walkiver · …").
// Archivo generado por .dev/walkiver-campos.mjs a partir de walkiver/index.html: no editar a mano.
// sel/n/todos: dónde está cada uno en la página. valor: el original, con marcas (*cursiva*, **negrita**).
export const GRUPOS_WALKIVER = ${JSON.stringify(grupos, null, 1)};
`);
const total = grupos.reduce((n, g) => n + g.campos.length, 0);
console.log(`${total} campos en ${grupos.length} grupos`);
for (const g of grupos) for (const c of g.campos) if (c.cuantos !== (c.todos ? c.cuantos : c.cuantos) || (!c.todos && c.n >= c.cuantos)) console.log('revisar', c.clave);
console.log(grupos.map((g) => `  ${g.nombre}: ${g.campos.map((c) => `${c.clave.slice(4)}${c.todos ? `(x${c.cuantos})` : ''}`).join(', ')}`).join('\n'));
process.exit(0);

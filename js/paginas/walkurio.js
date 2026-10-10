// Walkurio: el planeta y sus dos lunas para explorar. Se llega desde el espacio, se lo gira y se entra por zonas
// (y dentro de cada zona, a otras). Las zonas se editan desde el panel (js/contenido.js → WALKURIO.zonas); cada una
// puede mostrar productos, una imagen y un enlace. La superficie y las lunas están en js/datos/walkurio.js.
// La dirección guarda dónde estás: /walkurio#continente-central/cordillera-central.
// /walkurio?ubicar: al tocar el planeta (o una luna) muestra y copia sus coordenadas, para ubicar zonas nuevas.
import { $, app, esc, esExterno, flecha, reducido, titular } from '../ui/util.js';
import { WALKURIO } from '../contenido.js';
import { LUNAS, MAPA, arbolDeZonas } from '../datos/walkurio.js';
import { catalogo, precio } from '../datos/modelo.js';
import { arte } from '../ui/tarjeta.js';

const texto = (html) => String(html ?? '').replace(/<[^>]+>/g, '');

export async function walkurio() {
  const RAIZ = { id: '', nombre: texto(WALKURIO.titulo) || 'Walkurio', cuerpo: 'planeta', lat: null, lon: null, zonas: arbolDeZonas(WALKURIO.zonas) };
  const ubicando = new URLSearchParams(location.search).has('ubicar');
  titular(RAIZ.nombre);
  app.innerHTML = `
    <section class="wk-mundo is-llegando is-cargando" aria-labelledby="mundo-titulo">
      <canvas class="wk-mundo__lienzo" aria-hidden="true"></canvas>
      <div class="wk-mundo__marcas" id="mundo-marcas"></div>
      <p class="wk-mundo__carga" role="status"><span aria-hidden="true"></span>Preparando ${esc(RAIZ.nombre)}…</p>
      <p class="wk-mundo__llegada" aria-hidden="true"><span>${esc(RAIZ.nombre)}</span></p>
      <aside class="wk-mundo__panel" id="mundo-panel">
        <nav class="wk-mundo__migas" aria-label="Dónde estás"><ol id="mundo-migas"></ol></nav>
        <div class="wk-mundo__ficha" id="mundo-ficha"></div>
      </aside>
      <div class="wk-mundo__zoom" role="group" aria-label="Acercar y alejar">
        <button type="button" data-zoom="0.72" aria-label="Acercar">+</button>
        <button type="button" data-zoom="1.38" aria-label="Alejar">−</button>
      </div>
      <p class="wk-mundo__ayuda">${esc(WALKURIO.ayuda)}</p>
      ${ubicando ? '<p class="wk-mundo__ubicar" id="mundo-ubicar" role="status" aria-live="polite">Modo ubicar: tocá el planeta o una luna para ver sus coordenadas.</p>' : ''}
      <button type="button" class="wk-mundo__saltar" id="mundo-saltar">Saltar llegada</button>
    </section>`;
  const seccion = $('.wk-mundo'), marcas = $('#mundo-marcas'), panel = $('#mundo-panel');
  const control = new AbortController();
  const { signal } = control;

  // Dónde estás: la cadena de zonas desde el planeta
  let camino = [];
  const actual = () => camino.at(-1) ?? RAIZ;
  const hijos = () => actual().zonas ?? [];
  const lugar = (z) => ({ cuerpo: z.cuerpo, lat: z.lat, lon: z.lon });
  // Nivel de zoom: cuántas zonas con ubicación hay en el camino dentro del mismo cuerpo (una luna entera es nivel 0)
  const nivelDe = (cadena) => { const z = cadena.at(-1); return z ? cadena.filter((x) => x.cuerpo === z.cuerpo && x.lat !== null).length : 0; };

  let planeta = null;
  try {
    const { crearPlaneta } = await import('../anim/planeta3d.js');
    if (!seccion.isConnected) return undefined;
    planeta = await crearPlaneta($('.wk-mundo__lienzo'), { mapa: MAPA, lunas: LUNAS });
    if (!seccion.isConnected) { planeta.destruir(); return undefined; }
  } catch (e) {
    console.warn('Walkurio sin 3D:', e);
    seccion.classList.add('sin-3d');
  }
  seccion.classList.remove('is-cargando');

  // Productos de una zona (handles del panel): se buscan en el catálogo una sola vez
  let piezas = null;
  const productosDe = async (z) => {
    if (!z.productos?.length) return [];
    piezas ??= catalogo().catch(() => []);
    const lista = await piezas;
    return z.productos.map((h) => lista.find((p) => p.handle === h)).filter(Boolean);
  };

  // --- El panel: migas, ficha de la zona y lo que hay adentro ---
  const pintar = () => {
    const z = actual();
    $('#mundo-migas').innerHTML = [RAIZ, ...camino].map((n, i, l) => (i === l.length - 1
      ? `<li aria-current="location">${esc(n.nombre)}</li>`
      : `<li><button type="button" data-nivel="${i}">${esc(n.nombre)}</button></li>`)).join('');
    const lista = hijos();
    const enlace = z.enlace && `<a class="wk-mundo__enlace" href="${esc(z.enlace.url)}"${esExterno(z.enlace.url) ? ' target="_blank" rel="noopener"' : ' data-link'}>${esc(z.enlace.texto)} ${flecha}</a>`;
    $('#mundo-ficha').innerHTML = `
      ${z.imagen ? `<img class="wk-mundo__imagen" src="${esc(z.imagen)}" alt="" loading="lazy" decoding="async">` : ''}
      <h1 class="wk-mundo__titulo" id="mundo-titulo" tabindex="-1">${z === RAIZ ? WALKURIO.titulo : esc(z.nombre)}</h1>
      ${z === RAIZ
        ? `<p class="wk-mundo__texto">${esc(WALKURIO.texto)}</p>`
        : `<p class="wk-mundo__datos">${z.clima ? `<span>${esc(z.clima)}</span>` : ''}${z.provisorio ? '<span class="is-provisorio">Por definir</span>' : ''}</p>
           ${z.texto ? `<p class="wk-mundo__texto">${esc(z.texto)}</p>` : ''}`}
      ${enlace || ''}
      <div id="mundo-piezas"></div>
      ${lista.length
        ? `<h2 class="wk-mundo__sub">${z === RAIZ ? 'Zonas' : 'Para explorar'}</h2>
           <ul class="wk-mundo__lista">${lista.map((h) => `<li><button type="button" data-zona="${esc(h.id)}"><span>${esc(h.nombre)}</span>${h.clima ? `<small>${esc(h.clima)}</small>` : ''}</button></li>`).join('')}</ul>`
        : '<p class="wk-mundo__pronto">Muy pronto vas a poder entrar más adentro.</p>'}
      ${camino.length ? `<button type="button" class="wk-mundo__volver" data-volver>← Volver a ${esc((camino.at(-2) ?? RAIZ).nombre)}</button>` : ''}`;
    productosDe(z).then((ps) => {
      const caja = $('#mundo-piezas');
      if (!ps.length || !caja || actual() !== z) return;
      caja.innerHTML = `<h2 class="wk-mundo__sub">Piezas de esta zona</h2>
        <ul class="wk-mundo__piezas">${ps.map((p) => `<li><a href="/producto/${encodeURIComponent(p.handle)}" data-link>
          <span class="wk-mundo__pieza-foto">${arte(p, { ancho: 160, sizes: '64px' })}</span>
          <span><b>${esc(p.name)}</b><small>${p.available ? precio(p) : 'Ya tiene hogar'}</small></span></a></li>`).join('')}</ul>`;
    });
    marcas.innerHTML = lista.map((h) => `
      <button type="button" class="wk-mundo__marca${h.lat === null ? ' wk-mundo__marca--cuerpo' : ''}" data-zona="${esc(h.id)}" aria-label="Entrar a ${esc(h.nombre)}" tabindex="-1">
        <span class="wk-mundo__punto" aria-hidden="true"></span><span class="wk-mundo__nombre">${esc(h.nombre)}</span>
      </button>`).join('');
    history.replaceState(history.state, '', `${location.pathname}${location.search}${camino.length ? `#${camino.map((n) => n.id).join('/')}` : ''}`);
    titular(camino.length ? `${z.nombre} · ${RAIZ.nombre}` : RAIZ.nombre);
  };

  const viajar = async (nuevo) => {
    camino = nuevo;
    pintar();
    $('#mundo-titulo').focus({ preventScroll: true });
    marcas.classList.add('is-viajando');
    if (planeta) await planeta.ir(lugar(actual()), nivelDe(camino));
    marcas.classList.remove('is-viajando');
  };
  const entrar = (id) => { const z = hijos().find((h) => h.id === id); if (z) viajar([...camino, z]); };
  const subir = (hasta = camino.length - 1) => { if (camino.length) viajar(camino.slice(0, Math.max(0, hasta))); };

  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.zona) entrar(b.dataset.zona);
    else if (b.dataset.volver !== undefined) subir();
    else if (b.dataset.nivel) subir(Number(b.dataset.nivel));
    else if (b.dataset.zoom) planeta?.zoom(Number(b.dataset.zoom));
  }, { signal });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || !planeta) return;
    const paso = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (paso && !e.target.closest?.('button, a')) { e.preventDefault(); planeta.girar(paso[0], paso[1]); }
    else if (e.key === '+' || e.key === '=') planeta.zoom(0.8);
    else if (e.key === '-') planeta.zoom(1.25);
    else if (e.key === 'Escape' && camino.length) subir();
  }, { signal });

  const todas = (l) => l.flatMap((z) => [z, ...todas(z.zonas)]);
  // En la compu de desarrollo: avisa si una zona del planeta quedó en el agua
  if (planeta && /^(localhost|127\.)/.test(location.hostname)) {
    window.wkPlaneta = planeta;
    for (const z of todas(RAIZ.zonas)) if (z.cuerpo === 'planeta' && z.lat !== null && planeta.esAgua(z.lat, z.lon)) console.warn(`Walkurio: «${z.nombre}» cae en el agua (${z.lat}, ${z.lon})`);
  }

  if (planeta) {
    // Las marcas siguen a sus zonas (y a las lunas, que se mueven); las que quedan del otro lado se apagan
    planeta.alCuadro = () => {
      for (const m of marcas.children) {
        const z = hijos().find((h) => h.id === m.dataset.zona);
        if (!z) continue;
        const p = planeta.proyectar(lugar(z));
        const k = Math.max(0, Math.min(1, (p.frente - 0.12) / 0.25));
        m.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        m.style.opacity = k.toFixed(2);
        m.classList.toggle('is-oculta', k < 0.3 || !p.cerca);
      }
    };
    // Alejarse mucho con la rueda o el pellizco es salir de la zona
    planeta.alAlejar = () => { if (!planeta.volando) subir(); };
    if (ubicando) {
      planeta.alTocar = ({ cuerpo, lat, lon }) => {
        const txt = `${lat}, ${lon}`;
        navigator.clipboard?.writeText(txt).catch(() => {});
        const nombre = cuerpo === 'planeta' ? 'Planeta' : RAIZ.zonas.find((z) => z.cuerpo === cuerpo && z.lat === null)?.nombre ?? cuerpo;
        $('#mundo-ubicar').innerHTML = `<b>${esc(nombre)} (${cuerpo})</b> · latitud <b>${lat}</b> · longitud <b>${lon}</b> <small>(copiado)</small>`;
      };
    }
    // Lo que se mira queda centrado en lo que el panel deja libre
    const encuadrar = () => {
      const s = seccion.getBoundingClientRect(), p = panel.getBoundingClientRect();
      const arriba = 84;
      planeta.encuadre(innerWidth >= 900
        ? { x: p.right - s.left, y: arriba, w: s.right - p.right, h: s.height - arriba }
        : { x: 0, y: arriba - 10, w: s.width, h: p.top - s.top - arriba + 10 });
    };
    encuadrar();
    addEventListener('resize', encuadrar, { signal });
  }

  // Si la dirección trae una zona (#continente-central/…), se llega directo ahí
  const pedido = [];
  for (const id of decodeURIComponent(location.hash.slice(1)).split('/').filter(Boolean)) {
    const z = (pedido.at(-1) ?? RAIZ).zonas?.find((h) => h.id === id);
    if (!z) break;
    pedido.push(z);
  }

  pintar();
  let llegado = false;
  const llegar = () => {
    if (llegado || signal.aborted) return;
    llegado = true;
    seccion.classList.remove('is-llegando');
    $('#mundo-saltar')?.remove();
    if (pedido.length) viajar(pedido);
  };
  if (planeta && !reducido()) {
    $('#mundo-saltar').addEventListener('click', () => { planeta.ir({ cuerpo: 'planeta', lat: 8, lon: -10 }, 0, 0); llegar(); }, { signal });
    planeta.llegar().then(llegar);
  } else llegar();

  return () => { control.abort(); planeta?.destruir(); };
}

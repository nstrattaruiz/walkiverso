// Walkurio: el planeta y sus dos lunas para explorar. Se llega desde el espacio, se lo gira y se entra por zonas
// (y dentro de cada zona, a otras). Las zonas se editan desde el panel (js/contenido.js → WALKURIO.zonas); cada una
// puede mostrar productos, una imagen y un enlace. La superficie y las lunas están en js/datos/walkurio.js.
// La dirección guarda dónde estás: /walkurio#continente-central/cordillera-central.
// /walkurio?ubicar: al tocar el planeta (o una luna) muestra y copia sus coordenadas, para ubicar zonas nuevas.
import { $, app, esc, esExterno, flecha, reducido, titular } from '../ui/util.js';
import { WALKURIO } from '../contenido.js';
import { LUNAS, MAPA, PAISAJES, arbolDeZonas } from '../datos/walkurio.js';
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
      <div class="wk-mundo__carga" aria-hidden="true">
        <span class="wk-mundo__semilla"></span>
        ${Array.from({ length: 34 }, (_, i) => `<i style="--a:${(i * 137.5) % 360}deg;--r:${70 + ((i * 53) % 150)}px;--t:${2.4 + (i % 5) * 0.45}s;--d:${-((i * 0.37) % 3)}s;--s:${2 + (i % 3)}px"><b></b></i>`).join('')}
      </div>
      <p class="wk-sr" role="status" id="mundo-estado">Cargando ${esc(RAIZ.nombre)}…</p>
      <p class="wk-mundo__llegada" aria-hidden="true"><span>${esc(RAIZ.nombre)}</span></p>
      <aside class="wk-mundo__panel" id="mundo-panel">
        <nav class="wk-mundo__migas" aria-label="Dónde estás"><ol id="mundo-migas"></ol></nav>
        <div class="wk-mundo__ficha" id="mundo-ficha"></div>
      </aside>
      <div class="wk-mundo__cielo">
        <button type="button" class="wk-mundo__cielo-boton" id="mundo-cielo" aria-pressed="false">
          <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <circle class="cielo-orbita" cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
            <circle class="cielo-planeta" cx="24" cy="24" r="6"/>
            <g class="cielo-rueda">
              <g class="cielo-sol"><circle cx="24" cy="9" r="3.6"/><path d="M24 2.5v2M24 13.5v2M17.5 9h2M28.5 9h2M19.4 4.4l1.4 1.4M27.2 12.2l1.4 1.4M19.4 13.6l1.4-1.4M27.2 5.8l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></g>
              <mask id="cielo-medialuna"><rect width="48" height="48" fill="#fff"/><circle cx="26.6" cy="37.4" r="3.9" fill="#000"/></mask>
              <circle class="cielo-luna" cx="24" cy="39" r="4.6" mask="url(#cielo-medialuna)"/>
            </g>
          </svg>
        </button>
        <p class="wk-mundo__cielo-nota" id="mundo-cielo-nota" aria-live="polite"></p>
      </div>
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
  {
    const s = seccion.getBoundingClientRect(), p = panel.getBoundingClientRect(), carga = $('.wk-mundo__carga');
    const compu = innerWidth >= 900;
    carga.style.setProperty('--cx', `${compu ? p.right - s.left + (s.right - p.right) / 2 : s.width / 2}px`);
    carga.style.setProperty('--cy', `${compu ? 84 + (s.height - 84) / 2 : (84 + p.top - s.top) / 2}px`);
  }

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
  $('#mundo-estado').textContent = '';

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
    // Una zona del planeta sin zonas adentro es el último nivel: ahí se baja al paisaje de cerca (0 = según el mapa)
    const z = actual(), hoja = z !== RAIZ && z.cuerpo === 'planeta' && z.lat !== null && !z.zonas.length;
    if (planeta) await planeta.ir(lugar(z), nivelDe(camino), undefined, hoja ? PAISAJES[z.paisaje] ?? 0 : null);
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

  // --- Día y noche ---
  // Sigue la hora de quien mira: amanece y anochece según la época del año (del lado sur si la zona horaria es de
  // Sudamérica). El botón del cielo lo cambia a mano; si elegís lo mismo que marca tu hora, vuelve a seguirla.
  const delSur = /Montevideo|Argentina|Buenos_Aires|Santiago|Sao_Paulo|Asuncion|Punta_Arenas|Porto_Alegre|Campo_Grande|Cuiaba|La_Paz|Lima/
    .test(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
  const esDeDia = (f = new Date()) => {
    const dia = (f - new Date(f.getFullYear(), 0, 0)) / 864e5;
    const verano = Math.cos((2 * Math.PI * (dia - 172)) / 365) * (delSur ? -1 : 1);
    const h = f.getHours() + f.getMinutes() / 60;
    return h >= 6.6 - 0.8 * verano && h < 19.1 + 0.9 * verano;
  };
  let noche = !esDeDia(), aMano = false, notaHasta = 0;
  const boton = $('#mundo-cielo'), nota = $('#mundo-cielo-nota');
  const pintarCielo = (anunciar) => {
    seccion.dataset.cielo = noche ? 'noche' : 'dia';
    boton.setAttribute('aria-pressed', String(noche));
    boton.setAttribute('aria-label', noche ? 'Es de noche en Walkurio. Pasar a día' : 'Es de día en Walkurio. Pasar a noche');
    if (!anunciar) return;
    nota.textContent = `${noche ? 'De noche' : 'De día'} · ${aMano ? 'elegido por vos' : 'como en tu hora'}`;
    nota.classList.add('is-visible');
    notaHasta = Date.now() + 3200;
    setTimeout(() => { if (Date.now() >= notaHasta) nota.classList.remove('is-visible'); }, 3300);
  };
  planeta?.noche(noche, true);
  pintarCielo(false);
  boton.addEventListener('click', () => {
    noche = !noche;
    aMano = noche !== !esDeDia();
    planeta?.noche(noche);
    pintarCielo(true);
  }, { signal });
  const vigia = setInterval(() => {
    if (aMano || noche === !esDeDia()) return;
    noche = !noche;
    planeta?.noche(noche);
    pintarCielo(true);
  }, 60000);
  signal.addEventListener('abort', () => clearInterval(vigia));

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
    setTimeout(() => { if (!signal.aborted) pintarCielo(true); }, 900);
    $('#mundo-saltar')?.remove();
    if (pedido.length) viajar(pedido);
  };
  if (planeta && !reducido()) {
    $('#mundo-saltar').addEventListener('click', () => { planeta.ir({ cuerpo: 'planeta', lat: 8, lon: -10 }, 0, 0); llegar(); }, { signal });
    planeta.llegar().then(llegar);
  } else llegar();

  return () => { control.abort(); planeta?.destruir(); };
}

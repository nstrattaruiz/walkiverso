// Walkurio: el planeta para explorar. Se llega desde el espacio, se lo gira y se entra por zonas
// (y dentro de cada zona, a otras). La geografía y las zonas están en js/datos/walkurio.js.
// La dirección guarda dónde estás: /walkurio#continente-central/cordillera-central.
import { $, app, esc, reducido, titular } from '../ui/util.js';
import { GEOGRAFIA, ZONAS } from '../datos/walkurio.js';

const RAIZ = { id: '', nombre: 'Walkurio', zonas: ZONAS };

export async function walkurio() {
  titular('Walkurio');
  app.innerHTML = `
    <section class="wk-mundo is-llegando" aria-labelledby="mundo-titulo">
      <canvas class="wk-mundo__lienzo" aria-hidden="true"></canvas>
      <div class="wk-mundo__marcas" id="mundo-marcas"></div>
      <p class="wk-mundo__llegada" aria-hidden="true"><span>Walkurio</span></p>
      <aside class="wk-mundo__panel" id="mundo-panel">
        <nav class="wk-mundo__migas" aria-label="Dónde estás"><ol id="mundo-migas"></ol></nav>
        <div class="wk-mundo__ficha" id="mundo-ficha"></div>
      </aside>
      <div class="wk-mundo__zoom" role="group" aria-label="Acercar y alejar">
        <button type="button" data-zoom="0.72" aria-label="Acercar">+</button>
        <button type="button" data-zoom="1.38" aria-label="Alejar">−</button>
      </div>
      <p class="wk-mundo__ayuda">Arrastrá para girar · Rueda o pellizco para acercarte · Tocá una zona para entrar</p>
      <button type="button" class="wk-mundo__saltar" id="mundo-saltar">Saltar llegada</button>
    </section>`;
  const seccion = $('.wk-mundo'), marcas = $('#mundo-marcas'), panel = $('#mundo-panel');
  const control = new AbortController();
  const { signal } = control;

  // Dónde estás: la cadena de zonas desde el planeta
  let camino = [];
  const actual = () => camino.at(-1) ?? RAIZ;
  const hijos = () => actual().zonas ?? [];

  let planeta = null;
  try {
    const { crearPlaneta } = await import('../anim/planeta3d.js');
    if (!seccion.isConnected) return undefined;
    planeta = crearPlaneta($('.wk-mundo__lienzo'), GEOGRAFIA);
  } catch (e) {
    console.warn('Walkurio sin 3D:', e);
    seccion.classList.add('sin-3d');
  }

  // --- El panel: migas, ficha de la zona y lo que hay adentro ---
  const pintar = () => {
    const z = actual();
    $('#mundo-migas').innerHTML = [RAIZ, ...camino].map((n, i, l) => (i === l.length - 1
      ? `<li aria-current="location">${esc(n.nombre)}</li>`
      : `<li><button type="button" data-nivel="${i}">${esc(n.nombre)}</button></li>`)).join('');
    const lista = hijos();
    $('#mundo-ficha').innerHTML = `
      <h1 class="wk-mundo__titulo" id="mundo-titulo" tabindex="-1">${esc(z.nombre)}</h1>
      ${z === RAIZ
        ? '<p class="wk-mundo__texto">Un planeta para explorar. Giralo, acercate y elegí una zona para entrar.</p>'
        : `<p class="wk-mundo__datos">${z.clima ? `<span>${esc(z.clima)}</span>` : ''}${z.provisorio ? '<span class="is-provisorio">Por definir</span>' : ''}</p>
           <p class="wk-mundo__texto">${esc(z.texto ?? '')}</p>`}
      ${lista.length
        ? `<h2 class="wk-mundo__sub">${z === RAIZ ? 'Zonas' : 'Para explorar'}</h2>
           <ul class="wk-mundo__lista">${lista.map((h) => `<li><button type="button" data-zona="${esc(h.id)}"><span>${esc(h.nombre)}</span>${h.clima ? `<small>${esc(h.clima)}</small>` : ''}</button></li>`).join('')}</ul>`
        : '<p class="wk-mundo__pronto">Muy pronto vas a poder entrar más adentro.</p>'}
      ${camino.length ? `<button type="button" class="wk-mundo__volver" data-volver>← Volver a ${esc((camino.at(-2) ?? RAIZ).nombre)}</button>` : ''}`;
    marcas.innerHTML = lista.map((h) => `
      <button type="button" class="wk-mundo__marca" data-zona="${esc(h.id)}" aria-label="Entrar a ${esc(h.nombre)}" tabindex="-1">
        <span class="wk-mundo__punto" aria-hidden="true"></span><span class="wk-mundo__nombre">${esc(h.nombre)}</span>
      </button>`).join('');
    history.replaceState(history.state, '', `${location.pathname}${location.search}${camino.length ? `#${camino.map((n) => n.id).join('/')}` : ''}`);
    titular(camino.length ? `${z.nombre} · Walkurio` : 'Walkurio');
  };

  const viajar = async (nuevo) => {
    camino = nuevo;
    pintar();
    $('#mundo-titulo').focus({ preventScroll: true });
    marcas.classList.add('is-viajando');
    const z = actual();
    if (planeta) await planeta.ir(z.lat ?? 8, z === RAIZ ? null : z.lon, camino.length);
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

  // En la compu de desarrollo: avisa si una zona quedó en el agua (al cambiar coordenadas en js/datos/walkurio.js)
  if (planeta && /^(localhost|127\.)/.test(location.hostname)) {
    window.wkPlaneta = planeta;
    const todas = (l) => l.flatMap((z) => [z, ...todas(z.zonas ?? [])]);
    for (const z of todas(ZONAS)) if (planeta.esAgua(z.lat, z.lon)) console.warn(`Walkurio: «${z.nombre}» cae en el agua (${z.lat}, ${z.lon})`);
  }

  if (planeta) {
    // Las marcas siguen a sus zonas sobre el planeta; las que quedan del otro lado se apagan
    planeta.alCuadro = () => {
      for (const m of marcas.children) {
        const z = hijos().find((h) => h.id === m.dataset.zona);
        if (!z) continue;
        const p = planeta.proyectar(z.lat, z.lon);
        const k = Math.max(0, Math.min(1, (p.frente - 0.12) / 0.25));
        m.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        m.style.opacity = k.toFixed(2);
        m.classList.toggle('is-oculta', k < 0.3 || !p.cerca);
      }
    };
    // Alejarse mucho con la rueda o el pellizco es salir de la zona
    planeta.alAlejar = () => { if (!planeta.volando) subir(); };
    // El planeta se centra en lo que el panel deja libre
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
    $('#mundo-saltar').addEventListener('click', () => { planeta.ir(8, 0, 0, 0); llegar(); }, { signal });
    planeta.llegar().then(llegar);
  } else llegar();

  return () => { control.abort(); planeta?.destruir(); };
}

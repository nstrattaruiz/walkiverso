// Portada. Recorrido: Arte, Magia y Folklore → Las creaciones → Criaturas / Artefactos → duendes → destacadas → cómo nacen
// → más buscados → reels → el universo → voces → Walkiver → pedile un deseo → Academia. (Las dudas viven en el pie.)
// Las secciones más grandes tienen su archivo en js/secciones/.
// Ritmo: misteriosa → comercial → narrativa → comercial → humana → comercial.
import { $, $$, app, esc, estado, flecha, icono, plano, reducido, titular } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { catalogo, porDisponibilidad } from '../datos/modelo.js';
import { arte, insignia, tarjeta, fila } from '../ui/tarjeta.js';
import { abrirModal, cerrarModal, raices } from '../ui/piezas.js';
import { NOMBRE, precio } from '../datos/modelo.js';
import { puertas, activarPuertas } from '../secciones/puertas.js';
import { deseo, activarDeseo } from '../secciones/deseo.js';
import { reels, activarReels } from '../secciones/reels.js';
import { particulas } from '../anim/particulas.js';
import { escena, aparecer } from '../anim/efectos.js';
import { tarjetaCurso } from './academia.js';
import * as T from '../contenido.js';

/**
 * Lo escondido del hero: criaturas dibujadas a línea que solo se ven cuando la luz del cursor pasa por encima.
 * Tono adulto y oscuro: cráneo astado, ojo de pupila rasgada, mandrágora que grita, garra, polilla, fauces y miradas.
 */
const oculto = () => `
  <svg class="wk-hero__oculto" data-oculto viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- cráneo astado -->
      <g transform="translate(1185 205)">
        <path d="M-48 2c-2-42 20-66 48-66s50 24 48 66c-1 22-10 34-22 42l2 24c-8 6-18 8-28 8s-20-2-28-8l2-24c-12-8-21-20-22-42z"/>
        <path d="M-30-2c8-12 22-10 26 4-4 12-22 12-26-4zM30-2c-8-12-22-10-26 4 4 12 22 12 26-4z"/>
        <path d="M0 12l-7 16c4 3 10 3 14 0z"/>
        <path d="M-20 46l2 18M-8 48v20M8 48v20M20 46l-2 18M-24 56c16 6 32 6 48 0"/>
        <path d="M-40-38c-34-8-62-40-58-86 10 34 34 54 70 62M40-38c34-8 62-40 58-86-10 34-34 54-70 62"/>
        <path d="M-78-84c8 4 14 4 20 0M78-84c-8 4-14 4-20 0M-10-58c4 6 16 6 20 0"/>
      </g>
      <!-- ojo de pupila rasgada -->
      <g transform="translate(255 160)">
        <path d="M-92 0c34-52 150-52 184 0-34 52-150 52-184 0z"/>
        <circle r="34"/><path d="M0-30c11 18 11 42 0 60-11-18-11-42 0-60z"/>
        <path d="M-84 4c18 8 26 2 40 10M84 4c-18 8-26 2-40 10M-60-22c10 2 16 8 22 6M60-22c-10 2-16 8-22 6"/>
        <path d="M-70-34l-12-18M-36-48l-6-20M0-52v-22M36-48l6-20M70-34l12-18"/>
        <path d="M-40 44c-6 18-2 30 4 44M10 50c-2 14 4 24 0 38"/>
      </g>
      <!-- mandrágora que grita -->
      <g transform="translate(225 600)">
        <path d="M-28-42c-34 12-48 44-38 80 8 28-2 46-18 62M28-42c34 12 48 44 38 80-8 28 2 46 18 62"/>
        <path d="M-66 96c-20 12-44 6-56-12M-52 98c-4 26-20 42-42 46M-22 100c-8 22-4 40 6 56M20 100c2 24 14 40 34 46M56 98c18 14 40 12 54-2M82 104c6 14 4 26-6 36"/>
        <path d="M-30-8l22 10-18 14c-6-6-8-16-4-24zM30-8l-22 10 18 14c6-6 8-16 4-24z"/>
        <path d="M-14 34c0-18 28-18 28 0 0 28-6 44-14 44s-14-16-14-44z"/><path d="M-10 32l4 10 4-10M2 32l4 10 4-10M-6 74l3-8 3 8"/>
        <path d="M-40 20c6 4 10 10 10 18M40 20c-6 4-10 10-10 18M-34 60c8 2 12 8 14 16M34 60c-8 2-12 8-14 16"/>
        <path d="M0-42c-12-34-44-56-78-52 16 32 42 50 78 52zM0-42c10-38 38-64 74-66-10 36-36 60-74 66zM0-42c-6-44 10-76 0-116M-4-96c-10-4-18-12-22-24M4-80c10-6 16-16 18-28"/>
      </g>
      <!-- garra que sube -->
      <g transform="translate(1160 640)">
        <path d="M-44 150c-12-48-8-86 4-118M46 150c14-48 10-90-2-122M-44 150c30 8 60 8 90 0"/>
        <path d="M-40 32c-12-36-24-76-20-118l6-22 6 26c0 30 8 62 20 96"/>
        <path d="M-12 18c-6-46-8-96 2-142l8-24 4 28c-6 40-4 86 4 132"/>
        <path d="M14 16c4-46 14-92 30-130l10-20v28c-12 34-20 76-22 120"/>
        <path d="M40 26c10-32 28-64 50-88l14-12-6 24c-18 22-32 50-40 80"/>
        <path d="M-44 80c-26-10-46-32-52-60l-2-22 16 16c6 20 20 34 38 42"/>
        <path d="M-44-50l14-4M-8-74l14-2M26-70l14 2M66-30l12 6M-30 60c20 6 44 6 62-2"/>
      </g>
      <!-- polilla -->
      <g transform="translate(650 128)">
        <path d="M0-12c-34-46-104-58-126-22 12 46 68 58 126 34zM0-12c34-46 104-58 126-22-12 46-68 58-126 34z"/>
        <path d="M0 14c-28 8-68 34-62 68 34 4 56-24 62-58zM0 14c28 8 68 34 62 68-34 4-56-24-62-58z"/>
        <path d="M-6-22c0-8 12-8 12 0v60c0 10-12 10-12 0zM0-28c-10-16-22-22-36-24M0-28c10-16 22-22 36-24"/>
        <circle cx="-74" cy="-18" r="12"/><circle cx="74" cy="-18" r="12"/><circle cx="-74" cy="-18" r="4"/><circle cx="74" cy="-18" r="4"/>
        <path d="M-4-8h8M-4 2h8M-4 12h8M-30 44c6 4 10 10 10 18M30 44c-6 4-10 10-10 18"/>
      </g>
      <!-- fauces -->
      <g transform="translate(770 690)">
        <path d="M-130 0c46-60 214-60 260 0M-130 0c46 70 214 70 260 0"/>
        <path d="M-98-24l12 34 12-40M-56-38l12 40 12-44M-10-44l10 44 10-44M32-42l12 42 12-40M74-34l12 36 10-30"/>
        <path d="M-84 30l12-28 12 34M-40 42l12-34 12 36M6 46l10-36 12 34M52 40l10-32 12 26"/>
        <path d="M-130 0c-10-4-18-2-24 6M130 0c10-4 18-2 24 6"/>
      </g>
      <!-- miradas en lo oscuro -->
      <path d="M936 318l22-10-6 16zM986 318l-22-10 6 16zM92 430l18-8-5 13zM132 430l-18-8 5 13zM1340 420l16-7-4 12zM1376 420l-16-7 4 12zM470 640l14-6-4 10zM500 640l-14-6 4 10z"/>
    </g>
  </svg>`;

/** Fondo de fotos del hero (opcional): una imagen fija o varias que se van cruzando. Se cargan en contenido.js → HERO.imagenes. */
const fotosHero = () => (T.HERO.imagenes.length ? `<div class="wk-hero__fotos">${T.HERO.imagenes.map((src, i) => `<img src="${esc(src)}" alt=""${i === 0 ? ' class="is-activa" fetchpriority="high"' : ' loading="lazy"'}>`).join('')}</div>` : '');

const hero = () => `
  <section class="wk-hero wk-noche${T.HERO.imagenes.length ? ' wk-hero--foto' : ''}" aria-labelledby="hero-titulo">
    <div class="wk-hero__fondo" aria-hidden="true">
      ${fotosHero()}
      <span class="wk-hero__niebla wk-hero__niebla--a" data-prof="18"></span>
      <span class="wk-hero__niebla wk-hero__niebla--b" data-prof="34"></span>
      <span class="wk-hero__halo" data-prof="12"></span>
      ${oculto()}
      <span class="wk-ramas wk-hero__rama wk-hero__rama--izq" data-prof="26" data-crece></span>
      <span class="wk-ramas wk-ramas--der wk-hero__rama wk-hero__rama--der" data-prof="40" data-crece></span>
      <canvas class="wk-hero__particulas"></canvas>
      <span class="wk-hero__luz" data-luz></span>
    </div>
    <div class="wk-cont wk-hero__texto">
      <h1 class="wk-hero__titulo" id="hero-titulo">${T.HERO.titulo}</h1>
      <p class="wk-hero__bajada">${esc(T.HERO.texto)}</p>
      <a class="wk-btn wk-btn--luz" href="/tienda" data-link>${esc(T.HERO.cta)} ${flecha}</a>
    </div>
    <p class="wk-hero__pista" aria-hidden="true">${esc(T.HERO.pista)}</p>
  </section>`;

/** Si el hero tiene varias fotos, se van cruzando despacio. @returns función para detenerlo. */
function activarFotosHero() {
  const fotos = $$('.wk-hero__fotos img');
  if (fotos.length < 2 || reducido()) return () => {};
  let i = 0;
  const reloj = setInterval(() => {
    if (document.hidden) return;
    fotos[i].classList.remove('is-activa');
    i = (i + 1) % fotos.length;
    fotos[i].classList.add('is-activa');
  }, 7000);
  return () => clearInterval(reloj);
}

/** Cabecera de sección: etiqueta, título y bajada, siempre centrados. */
const cabecera = ({ sobre, titulo, texto }) => `
  <header class="wk-cab wk-cab--centro" data-ver>
    ${sobre ? `<span class="wk-sobre">${esc(sobre)}</span>` : ''}
    <h2 class="wk-titulo">${titulo}</h2>
    ${texto ? `<p class="wk-bajada">${esc(texto)}</p>` : ''}
  </header>`;
const verMas = (enlace) => (enlace ? `<p class="wk-seccion__mas" data-ver><a class="wk-btn wk-btn--linea" href="${enlace.href}" data-link>${esc(enlace.texto)} ${flecha}</a></p>` : '');

/** Cinta en movimiento entre el hero y la tienda: separa los bloques y repite las ideas de la marca. */
const cinta = () => {
  const tira = T.CINTA.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="wk-cinta" aria-hidden="true"><div class="wk-cinta__tira">${tira}${tira}${tira}${tira}</div></div>`;
};

/** Sección con una fila de piezas. En celular la fila se desliza con el dedo para no alargar la página. */
const vitrina = ({ id, tema, piezas, clase = '', enlace, raiz, ...cab }) => (piezas.length ? `
  <section class="wk-seccion ${tema} ${clase}${raiz ? ' wk-con-raices' : ''}" id="${id}">
    ${raiz ? raices() : ''}
    <div class="wk-cont">
      ${cabecera(cab)}
      ${fila(piezas)}
      ${verMas(enlace)}
    </div>
  </section>` : '');

// ---------------------------------------------------------------- así nacen las criaturas + el orbe
const proceso = () => `
  <section class="wk-seccion wk-papel wk-proceso wk-con-raices" id="proceso">
    ${raices()}
    <div class="wk-cont">
      ${cabecera({ sobre: 'El taller', titulo: esc(T.PROCESO.titulo), texto: T.PROCESO.texto })}
      <div class="wk-proceso__cuerpo">
        <div class="wk-orbe" data-ver style="--luz:0">
          <div class="wk-orbe__esfera" aria-hidden="true">
            <span class="wk-orbe__luz"></span>
            <span class="wk-orbe__ojo">${icono('i-ojo')}</span>
            <span class="wk-orbe__aro"></span>
          </div>
          <p class="wk-orbe__texto" id="orbe-texto" aria-live="polite">${esc(T.PROCESO.orbe)}</p>
          <p class="wk-orbe__cuenta"><b id="orbe-n">0</b> de ${T.PROCESO.pasos.length}</p>
        </div>
        <div class="wk-pasos" data-ver style="--d:1">
          <ol class="wk-pasos__lista" role="tablist" aria-label="Pasos del proceso">
            ${T.PROCESO.pasos.map((p, i) => `<li role="presentation"><button type="button" role="tab" id="paso-${i}" aria-selected="${i === 0}" aria-controls="paso-panel" data-paso="${i}" tabindex="${i === 0 ? 0 : -1}">
              <span>${String(i + 1).padStart(2, '0')}</span>${esc(p.nombre)}</button></li>`).join('')}
          </ol>
          <div class="wk-pasos__panel" id="paso-panel" role="tabpanel" aria-labelledby="paso-0"></div>
        </div>
      </div>
    </div>
  </section>`;

function activarProceso() {
  const pasos = T.PROCESO.pasos;
  const orbe = $('.wk-orbe');
  const panel = $('#paso-panel');
  const botones = $$('[data-paso]');
  if (!orbe) return;
  const vistos = new Set();
  const ver = (i, { foco = false } = {}) => {
    const p = pasos[i];
    vistos.add(i);
    botones.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
      b.classList.toggle('is-visto', vistos.has(k));
    });
    if (foco) botones[i].focus();
    panel.setAttribute('aria-labelledby', `paso-${i}`);
    panel.innerHTML = `
      <div class="wk-pasos__imagen">${p.imagen
        ? `<img src="${esc(p.imagen)}" alt="${esc(`${p.nombre}: paso ${i + 1} del proceso`)}" loading="lazy">`
        : `<span class="wk-arte wk-arte--espera" style="--t:${(i / pasos.length).toFixed(2)}" role="img" aria-label="${esc(p.nombre)}: imagen pendiente"><span class="wk-arte__glifo"></span></span>`}</div>
      <div><span class="wk-pasos__n">${String(i + 1).padStart(2, '0')}</span><h3 class="wk-titulo wk-titulo--s">${esc(p.nombre)}</h3><p>${esc(p.texto)}</p></div>`;
    // El orbe se llena con cada paso recorrido: al completarlos, la criatura abre los ojos
    orbe.style.setProperty('--luz', (vistos.size / pasos.length).toFixed(3));
    $('#orbe-n').textContent = vistos.size;
    if (vistos.size === pasos.length && !orbe.classList.contains('is-despierta')) {
      orbe.classList.add('is-despierta');
      $('#orbe-texto').textContent = T.PROCESO.despierta;
    }
  };
  botones.forEach((b, i) => {
    b.addEventListener('click', () => ver(i));
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') ver(i); });
    b.addEventListener('keydown', (e) => {
      const paso = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!paso) return;
      e.preventDefault();
      ver((i + paso + pasos.length) % pasos.length, { foco: true });
    });
  });
  ver(0);
}

// ---------------------------------------------------------------- dónde las criaturas cobran vida
/** Un territorio abstracto: curvas de nivel y luces sin nombre. No representa regiones reales de Walkurio. */
function territorio() {
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  const isla = (cx, cy, R, niveles) => {
    const f1 = azar() * 6.28, f2 = azar() * 6.28, f3 = azar() * 6.28;
    return Array.from({ length: niveles }, (_, n) => {
      const k = 1 - n / (niveles + 0.6);
      const pts = Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const r = R * k * (1 + 0.2 * Math.sin(3 * a + f1 + n * 0.25) + 0.11 * Math.sin(5 * a + f2) + 0.06 * Math.sin(9 * a + f3 - n * 0.4));
        return `${(cx + Math.cos(a) * r * 1.25).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
      });
      return `<path d="M${pts.join('L')}Z" style="--n:${n}"/>`;
    }).join('');
  };
  const luces = [[212, 168], [318, 262], [470, 150], [540, 318], [132, 318]];
  return `
  <svg class="wk-mapa" viewBox="0 0 680 460" role="img" aria-label="Representación abstracta de un territorio, con curvas de nivel y puntos de luz">
    <g class="wk-mapa__curvas">${isla(250, 215, 150, 6)}${isla(505, 245, 105, 5)}${isla(120, 340, 60, 3)}</g>
    <path class="wk-mapa__senda" d="M132 318 C 170 250, 190 200, 212 168 S 280 230, 318 262 S 420 190, 470 150 S 520 260, 540 318"/>
    <g class="wk-mapa__luces">${luces.map(([x, y], i) => `<g style="--i:${i}"><circle class="wk-mapa__halo" cx="${x}" cy="${y}" r="14"/><circle cx="${x}" cy="${y}" r="3"/></g>`).join('')}</g>
  </svg>`;
}

const universo = () => `
  <section class="wk-seccion wk-cielo wk-universo wk-con-raices" id="universo">
    ${raices()}
    <div class="wk-cont wk-universo__grilla">
      <div class="wk-cab" data-ver>
        <span class="wk-sobre">El universo</span>
        <h2 class="wk-titulo">${T.SECCIONES.universo.titulo}</h2>
        <p class="wk-bajada">${esc(T.SECCIONES.universo.texto)}</p>
        <p class="wk-universo__pronto">Un territorio en desarrollo</p>
      </div>
      <div class="wk-universo__mapa" data-ver style="--d:1">${territorio()}</div>
    </div>
  </section>`;

// ---------------------------------------------------------------- voces
/** Carrusel que pasa solo y se frena al pasar el mouse o al enfocar una tarjeta. La tira va duplicada para que no tenga corte. */
const voz = (v, oculta) => `
  <figure class="wk-voz"${oculta ? ' aria-hidden="true"' : ''}>
    ${v.ejemplo ? '<span class="wk-voz__ejemplo">Ejemplo</span>' : ''}
    <blockquote>${esc(v.comentario)}</blockquote>
    <figcaption>
      ${v.imagen ? `<img src="${esc(v.imagen)}" alt="" width="52" height="52" loading="lazy">` : `<span class="wk-voz__inicial" aria-hidden="true">${esc(v.nombre[0])}</span>`}
      <span><strong>${esc(v.nombre)}</strong><small>${esc(v.pais)} · ${esc(v.pieza)}</small></span>
    </figcaption>
  </figure>`;
const voces = () => {
  // Con pocas voces se repiten hasta llenar la tira, para que el carrusel no quede corto
  const base = Array.from({ length: Math.max(1, Math.ceil(6 / T.VOCES.items.length)) }, () => T.VOCES.items).flat();
  return `
  <section class="wk-seccion wk-papel wk-con-raices" id="voces">
    ${raices()}
    <div class="wk-cont">${cabecera({ sobre: 'Quienes ya adoptaron', titulo: esc(T.VOCES.titulo), texto: T.VOCES.texto })}</div>
    <div class="wk-voces" data-ver tabindex="0" role="group" aria-label="Comentarios de quienes ya adoptaron">
      <div class="wk-voces__tira" style="--n:${base.length}">${base.map((v, i) => voz(v, i >= T.VOCES.items.length)).join('')}${base.map((v) => voz(v, true)).join('')}</div>
    </div>
    <p class="wk-voces__cta" data-ver><button type="button" class="wk-btn wk-btn--linea" id="dejar-voz">Dejar mi comentario ${flecha}</button></p>
  </section>`;
};

function formularioVoz() {
  abrirModal(`
    <form class="wk-form" id="f-voz">
      <span class="wk-sobre">Voces del Walkiverso</span>
      <h2 class="wk-titulo wk-titulo--s">Contanos qué te pareció</h2>
      <div class="wk-fila">
        <label class="wk-campo">Nombre<input name="name" required autocomplete="name"></label>
        <label class="wk-campo">País<input name="pais" required autocomplete="country-name"></label>
      </div>
      <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email"></label>
      <label class="wk-campo">¿Qué pieza adquiriste?<input name="pieza" required></label>
      <label class="wk-campo">Comentario<textarea name="message" required maxlength="1200"></textarea></label>
      <p class="wk-error" role="alert"></p>
      <button class="wk-btn wk-btn--tinta">Enviar ${flecha}</button>
    </form>`, { titulo: 'Contanos qué te pareció' });
  $('#f-voz').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    f.querySelector('button.wk-btn').disabled = true;
    try {
      // Llega al panel (Mensajes) con sus campos extra: de ahí se elige cuáles publicar
      await tienda.contacto({ ...Object.fromEntries(new FormData(f)), asunto: 'Voces del Walkiverso' });
      f.innerHTML = `<h2 class="wk-titulo wk-titulo--s">¡Gracias por tu voz!</h2><p>La leemos y la sumamos al Walkiverso.</p><button type="button" class="wk-btn wk-btn--tinta" id="voz-listo">Cerrar</button>`;
      $('#voz-listo').addEventListener('click', cerrarModal);
    } catch (err) {
      f.querySelector('[role=alert]').textContent = err.message;
      f.querySelector('button.wk-btn').disabled = false;
    }
  });
}

// ---------------------------------------------------------------- duendes: cuántos quedan y "que uno te elija"
/** Unidades disponibles de una lista de piezas (una pieza única cuenta 1). */
const unidades = (piezas) => piezas.filter((x) => x.available).reduce((n, x) => n + (x.isUnique ? 1 : x.stock ?? 1), 0);

const duendes = (lista) => {
  const D = T.DUENDES;
  const libres = lista.filter((x) => x.available);
  if (!lista.length) return '';
  const quedan = unidades(lista);
  return `
  <section class="wk-seccion wk-papel wk-duendes wk-con-raices" id="duendes">
    ${raices()}
    <div class="wk-cont wk-duendes__grilla">
      <div class="wk-duendes__texto" data-ver>
        <span class="wk-sobre">${esc(D.sobre)}</span>
        <h2 class="wk-titulo">${esc(D.titulo)}</h2>
        <p class="wk-duendes__quedan"><b>${quedan}</b><span>${esc(quedan === 1 ? D.queda : D.quedan)}</span></p>
        <p class="wk-bajada">${esc(D.texto)}</p>
        <div class="wk-botones">
          ${libres.length > 1 ? `<button type="button" class="wk-btn wk-btn--tinta wk-duendes__azar" id="duende-azar"><span class="wk-duendes__chispa" aria-hidden="true">✦</span><span>${esc(D.azar)}</span></button>` : ''}
          <a class="wk-btn wk-btn--linea" href="/tienda?especie=${encodeURIComponent(D.especie)}" data-link>${esc(D.verTodos)} ${flecha}</a>
        </div>
        <p class="wk-duendes__elegido" id="duende-elegido" aria-live="polite"></p>
      </div>
      <div class="wk-grilla wk-grilla--carril wk-duendes__lista" id="duendes-lista">${lista.slice(0, 6).map(tarjeta).join('')}</div>
    </div>
  </section>`;
};

/** El sorteo: la luz salta de duende en duende, cada vez más lento, hasta quedarse con uno. */
function activarDuendes(lista) {
  const boton = $('#duende-azar');
  if (!boton) return;
  const salida = $('#duende-elegido');
  const carril = $('#duendes-lista');
  const tarjetas = $$('.wk-card', carril).filter((c) => lista.some((x) => x.available && x.handle === c.dataset.handle));
  boton.addEventListener('click', async () => {
    if (boton.disabled || tarjetas.length < 2) return;
    boton.disabled = true;
    salida.textContent = '';
    carril.classList.add('is-sorteando');
    tarjetas.forEach((c) => c.classList.remove('is-elegido', 'is-candidato'));
    const destino = Math.floor(Math.random() * tarjetas.length);
    // Dos vueltas completas y después hasta el elegido; sin animaciones, va directo
    const saltos = reducido() ? 0 : tarjetas.length * 2 + destino;
    for (let i = 0; i <= saltos; i++) {
      const actual = tarjetas[i % tarjetas.length];
      tarjetas.forEach((c) => c.classList.toggle('is-candidato', c === actual));
      await new Promise((r) => setTimeout(r, 70 + (i / Math.max(saltos, 1)) ** 2.4 * 360));
    }
    const elegida = tarjetas[destino];
    const pz = lista.find((x) => x.handle === elegida.dataset.handle);
    tarjetas.forEach((c) => c.classList.remove('is-candidato'));
    elegida.classList.add('is-elegido');
    carril.classList.remove('is-sorteando');
    // En celular la fila se desliza: se lleva al elegido al centro sin mover la página
    carril.scrollTo({ left: elegida.offsetLeft - (carril.clientWidth - elegida.offsetWidth) / 2, behavior: reducido() ? 'auto' : 'smooth' });
    salida.innerHTML = `${esc(T.DUENDES.eligio)} <a href="/producto/${encodeURIComponent(pz.handle)}" data-link>${esc(pz.name)} ${flecha}</a>`;
    boton.disabled = false;
    boton.lastElementChild.textContent = T.DUENDES.otraVez;
    await new Promise((r) => setTimeout(r, reducido() ? 0 : 650));
    if (!document.body.contains(boton)) return;   // el visitante ya se fue de la portada
    abrirModal(`
      <div class="wk-elegido">
        <span class="wk-sobre">${esc(T.DUENDES.eligio)}</span>
        <div class="wk-elegido__arte">${arte(pz, { ancho: 640, sizes: '320px' })}<div class="wk-card__insignias">${insignia(pz)}</div></div>
        <h2 class="wk-titulo wk-titulo--m">${esc(pz.name)}</h2>
        <p class="wk-card__meta">${[pz.especieTexto, pz.technique].filter(Boolean).map(esc).join(' · ')}</p>
        <p class="wk-elegido__precio">${precio(pz)}</p>
        <div class="wk-botones">
          <a class="wk-btn wk-btn--tinta" href="/producto/${encodeURIComponent(pz.handle)}" data-link data-cerrar>${esc(NOMBRE.criatura.ver)} ${flecha}</a>
          <button type="button" class="wk-btn wk-btn--linea" id="duende-otra">${esc(T.DUENDES.otraVez)}</button>
        </div>
      </div>`, { titulo: `${T.DUENDES.eligio}: ${pz.name}` });
    $('#duende-otra').addEventListener('click', () => { cerrarModal(); boton.click(); });
  });
}

// ---------------------------------------------------------------- portada
export async function inicio() {
  titular('');
  app.innerHTML = `${hero()}<div id="resto"><div class="wk-cargando" style="min-height:40svh"></div></div>`;
  const detener = [particulas($('.wk-hero__particulas')), escena($('.wk-hero')), activarFotosHero()];

  const [todo, cursos] = await Promise.all([
    catalogo().catch(() => []),
    estado.info.modules?.courses ? tienda.cursos.listar().catch(() => []) : [],
  ]);
  if (!$('#resto')) return () => detener.forEach((f) => f());   // el visitante ya se fue a otra página

  const criaturas = todo.filter((x) => x.tipo === 'criatura').sort(porDisponibilidad);
  const losDuendes = criaturas.filter((x) => plano(x.species) === plano(T.DUENDES.especie));
  const artefactos = todo.filter((x) => x.tipo === 'artefacto').sort(porDisponibilidad);
  const obras = [...criaturas, ...artefactos];
  const disponibles = obras.filter((x) => x.available);
  // Destacadas y más buscadas: las elige el panel con etiquetas. Si todavía no hay ninguna, se muestran piezas disponibles.
  const elegir = (marca, respaldo) => { const m = disponibles.filter((x) => x[marca]); return (m.length ? m : respaldo).slice(0, 4); };
  const destacadas = elegir('destacada', disponibles.filter((x) => x.isUnique).concat(disponibles));
  const buscadas = elegir('buscada', disponibles.slice().reverse());
  const ebook = todo.find((x) => x.handle === T.WALKIVER.ebookHandle) ?? todo.find((x) => x.tipo === 'ebook');
  const S = T.SECCIONES;

  $('#resto').innerHTML = `
    ${cinta()}
    <section class="wk-seccion wk-blanco wk-creaciones" id="creaciones">
      <div class="wk-cont">
        ${cabecera({ sobre: 'Walkiverso', titulo: esc(T.CREACIONES.titulo), texto: T.CREACIONES.texto })}
      </div>
      <div class="wk-cont wk-cont--ancho">${puertas(criaturas, artefactos)}</div>
    </section>

    ${vitrina({ id: 'criaturas', tema: 'wk-cielo', raiz: true, piezas: criaturas.slice(0, 4), sobre: 'Tienda', titulo: esc(S.criaturas.titulo), texto: S.criaturas.texto, enlace: { href: '/tienda?tipo=criatura', texto: 'Ver todas las criaturas' } })}
    ${vitrina({ id: 'artefactos', tema: 'wk-blanco', raiz: true, piezas: artefactos.slice(0, 4), sobre: 'Tienda', titulo: esc(S.artefactos.titulo), texto: S.artefactos.texto, enlace: { href: '/tienda?tipo=artefacto', texto: 'Ver todos los artefactos' } })}
    ${duendes(losDuendes)}
    ${vitrina({ id: 'destacadas', tema: 'wk-noche wk-isla', clase: 'wk-destacadas', raiz: true, piezas: destacadas, sobre: 'Disponibles hoy', titulo: S.destacadas.titulo, texto: S.destacadas.texto })}

    <section class="wk-seccion wk-papel wk-con-raices" id="diferencia" aria-label="Qué es una criatura y qué es un artefacto">
      ${raices()}
      <div class="wk-cont wk-diferencia">
        ${S.diferencia.map((d, i) => `<a class="wk-diferencia__item" href="${d.href}" data-link data-ver style="--d:${i}">
          <span class="wk-diferencia__icono">${icono(d.icono)}</span>
          <span class="wk-diferencia__texto"><strong class="wk-titulo wk-titulo--m">${esc(d.titulo)}</strong><span>${esc(d.texto)}</span></span>
          <span class="wk-diferencia__cta">${esc(d.cta)} ${flecha}</span>
        </a>`).join('')}
      </div>
    </section>

    ${proceso()}
    ${vitrina({ id: 'buscados', tema: 'wk-blanco', raiz: true, clase: 'wk-buscados', piezas: buscadas, sobre: 'Los que más piden', titulo: esc(S.buscadas.titulo), enlace: { href: '/tienda', texto: 'Ver toda la tienda' } })}
    ${reels()}
    ${universo()}
    ${voces()}

    <section class="wk-seccion wk-blanco wk-artista wk-con-raices" id="walkiver">
      ${raices()}
      <div class="wk-cont wk-artista__grilla">
        <div class="wk-artista__retrato" data-ver>${T.WALKIVER.imagen
          ? `<img src="${esc(T.WALKIVER.imagen)}" alt="Walkiver en su taller" loading="lazy">`
          : '<span class="wk-arte wk-arte--espera" style="--t:0.62" role="img" aria-label="Retrato de Walkiver: imagen pendiente"><span class="wk-arte__glifo"></span></span>'}</div>
        <div class="wk-cab" data-ver style="--d:1">
          <span class="wk-sobre">Walkiver</span>
          <h2 class="wk-titulo wk-titulo--m">${T.WALKIVER.titulo}</h2>
          <p class="wk-bajada">${esc(T.WALKIVER.texto)}</p>
          <div class="wk-botones">
            <a class="wk-btn wk-btn--tinta" href="/walkiver" data-link>Conocer a Walkiver</a>
            ${ebook ? `<a class="wk-btn wk-btn--linea" href="/producto/${esc(ebook.handle)}" data-link>Leer ebook</a>` : ''}
          </div>
        </div>
      </div>
    </section>

    ${deseo(raices)}

    <section class="wk-seccion wk-papel wk-academia-franja wk-con-raices" id="academia">
      ${raices()}
      <div class="wk-cont">
        ${cabecera({ sobre: 'Cursos', titulo: esc(T.ACADEMIA.titulo), texto: `${T.ACADEMIA.subtitulo} ${T.ACADEMIA.texto}` })}
        ${cursos.length ? `<div class="wk-cursos">${cursos.slice(0, 3).map((c, i) => tarjetaCurso(c, todo, i)).join('')}</div>` : ''}
        ${verMas({ href: '/cursos', texto: 'Ir a la Academia' })}
      </div>
    </section>
`;

  activarProceso();
  activarDuendes(losDuendes);
  detener.push(activarPuertas(), activarDeseo());
  activarReels();
  $('#dejar-voz')?.addEventListener('click', formularioVoz);
  aparecer(app);
  // Llegó con un ancla (/#dudas): se baja hasta ahí una vez dibujado
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  return () => detener.forEach((f) => f());
}

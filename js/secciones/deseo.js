// Sección "Pedile un deseo al Walkiverso": la bola de cristal con humo vivo, las preguntas y la solicitud
// guiada, que va pidiendo una cosa por vez dentro de la misma sección (sin formulario emergente).
import { $, esc, flecha, icono } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { acordeon } from '../ui/piezas.js';
import { humo } from '../anim/humo.js';
import { DESEO } from '../contenido.js';

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const deseo = (raices) => `
  <section class="wk-seccion wk-noche wk-isla wk-deseo wk-con-raices" id="deseo">
    ${raices()}
    <div class="wk-cont wk-deseo__grilla">
      <div class="wk-deseo__lado" data-ver>
        <div class="wk-bola" aria-hidden="true"><canvas class="wk-bola__lienzo"></canvas></div>
        <span class="wk-sobre">${esc(DESEO.sobre)}</span>
        <h2 class="wk-titulo">${esc(DESEO.titulo)}</h2>
        <p class="wk-bajada">${esc(DESEO.texto)}</p>
      </div>
      <div class="wk-deseo__panel" id="deseo-panel" data-ver style="--d:1"></div>
    </div>
  </section>`;

const preguntas = () => `
  <div class="wk-deseo__vista">
    ${acordeon(DESEO.items, { grupo: 'deseo', abierto: 0, marca: (i) => ROMANOS[i] })}
    <button type="button" class="wk-deseo__cta" data-deseo="empezar"><span class="wk-deseo__estrella" aria-hidden="true">✦</span><span>${esc(DESEO.cta)}</span>${flecha}</button>
  </div>`;

/**
 * La bola de cristal: en 3D (js/anim/orbe3d.js, con three.js). Como pesa, recién se descarga cuando la sección
 * se acerca a la pantalla. Si el navegador no puede con el 3D, queda el humo en 2D (js/anim/humo.js).
 */
function crearBola(lienzo) {
  let real = null, energia = 0.2, vivo = true;
  const plana = (l) => { l.parentElement.classList.add('is-plana'); const h = humo(l); return { energia: h.energia, destruir: h.detener }; };
  const io = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    try { const { crearOrbe3D } = await import('../anim/orbe3d.js'); if (vivo) real = crearOrbe3D(lienzo, plana); } catch { if (vivo) real = plana(lienzo); }
    real?.energia(energia);
  }, { rootMargin: '700px 0px' });
  io.observe(lienzo);
  return {
    energia(v) { energia = v; real?.energia(v); },
    pulso(v) { real?.pulso?.(v); },
    async soltar(el) { await real?.soltar?.(el); },
    detener() { vivo = false; io.disconnect(); real?.destruir?.(); },
  };
}

/** Los pasos de la solicitud: cada uno pide una sola cosa. */
const PASOS = ['tipo', 'idea', 'imagen', 'datos'];
const TIPOS = ['Una criatura', 'Un artefacto', 'Otra cosa'];

function paso(nombre, d) {
  const n = PASOS.indexOf(nombre);
  const cab = (pregunta, ayuda = '') => `
    <div class="wk-deseo__progreso" aria-hidden="true">${PASOS.map((_, i) => `<i class="${i < n ? 'is-hecho' : i === n ? 'is-actual' : ''}"></i>`).join('')}</div>
    <p class="wk-deseo__cuenta">Paso ${n + 1} de ${PASOS.length}</p>
    <h3 class="wk-titulo wk-titulo--m" tabindex="-1">${pregunta}</h3>
    ${ayuda ? `<p class="wk-nota">${ayuda}</p>` : ''}`;
  const pie = (siguiente, extra = '') => `
    <p class="wk-error" role="alert"></p>
    <div class="wk-deseo__acciones">
      <button type="button" class="wk-btn wk-btn--linea" data-deseo="${n ? 'atras' : 'salir'}">← ${n ? 'Volver' : 'Cancelar'}</button>
      ${extra}
      ${siguiente ? `<button type="submit" class="wk-btn wk-btn--luz">${siguiente} ${flecha}</button>` : ''}
    </div>`;
  const cuerpo = {
    tipo: () => `${cab('¿Qué te gustaría que exista?', 'No es un encargo ni una compra: es una idea para futuras creaciones.')}
      <div class="wk-deseo__opciones">${TIPOS.map((t, i) => `<button type="button" class="wk-deseo__opcion${d.tipo === t ? ' is-elegida' : ''}" data-tipo="${esc(t)}"><span>${ROMANOS[i]}</span>${esc(t)}</button>`).join('')}</div>
      ${pie('')}`,
    idea: () => `${cab('Contanos cómo la imaginás', 'Cómo se ve, qué carácter tiene, de dónde viene.')}
      <textarea name="idea" class="wk-input" rows="5" maxlength="1500" required placeholder="Escribí tu deseo…">${esc(d.idea ?? '')}</textarea>
      ${pie('Continuar')}`,
    imagen: () => `${cab('¿Tenés una imagen que ayude?', 'Un dibujo, una foto o una referencia. Es opcional.')}
      <label class="wk-deseo__archivo${d.imagen ? ' is-cargada' : ''}">
        <input type="file" name="imagen" accept="image/jpeg,image/png,image/webp" class="wk-sr">
        <span class="wk-deseo__vista-previa">${d.vista ? `<img src="${d.vista}" alt="Vista previa de tu imagen">` : icono('i-sello')}</span>
        <span><strong>${d.imagen ? esc(d.imagen.name) : 'Elegir una imagen de tu compu'}</strong><small>${d.imagen ? 'Tocá para cambiarla' : 'JPG, PNG o WEBP, hasta 6 MB'}</small></span>
      </label>
      ${pie(d.imagen ? 'Continuar' : 'Seguir sin imagen')}`,
    datos: () => `${cab('¿A nombre de quién va el deseo?')}
      <div class="wk-form wk-fila">
        <label class="wk-campo">Nombre<input name="nombre" required autocomplete="name" value="${esc(d.nombre ?? '')}"></label>
        <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email" value="${esc(d.email ?? '')}"></label>
      </div>
      ${pie('Enviar mi deseo')}`,
  }[nombre]();
  return `<form class="wk-deseo__vista wk-deseo__paso" data-paso="${nombre}" novalidate>${cuerpo}</form>`;
}

const gracias = (d) => `
  <div class="wk-deseo__vista wk-deseo__gracias">
    <span class="wk-deseo__estrella wk-deseo__estrella--grande" aria-hidden="true">✦</span>
    <h3 class="wk-titulo wk-titulo--m" tabindex="-1">Tu deseo ya viaja al Walkiverso</h3>
    <p class="wk-bajada">Gracias, ${esc(d.nombre.split(' ')[0])}. Las ideas que más resuenan inspiran las próximas creaciones.</p>
    <button type="button" class="wk-btn wk-btn--linea" data-deseo="salir">Volver a las preguntas</button>
  </div>`;

/** Enciende la sección: humo de la bola y solicitud guiada. @returns función para detenerla. */
export function activarDeseo() {
  const panel = $('#deseo-panel');
  if (!panel) return () => {};
  const bola = crearBola($('.wk-bola__lienzo'));
  let d = {};
  let actual = '';

  const mostrar = (html, energia, { foco = true } = {}) => {
    panel.innerHTML = html;
    bola.energia(energia);
    if (foco) panel.querySelector('h3[tabindex], textarea, input:not([type=file])')?.focus({ preventScroll: true });
  };
  const ir = (nombre) => { actual = nombre; mostrar(paso(nombre, d), 0.3 + (PASOS.indexOf(nombre) / PASOS.length) * 0.6); bola.pulso(0.4); };
  const salir = () => { actual = ''; d = {}; mostrar(preguntas(), 0.2, { foco: false }); };
  const aviso = (texto) => { const e = panel.querySelector('[role=alert]'); if (e) e.textContent = texto; };

  async function enviar(boton) {
    boton.disabled = true;
    try {
      // La imagen se sube primero (tienda.archivos.subir devuelve su dirección) y viaja como un campo más del mensaje:
      // el comerciante la ve en el mail. En una plataforma sin subida de archivos, se avisa que la persona tiene una.
      let imagen = '';
      if (d.imagen) imagen = tienda.archivos?.subir ? (await tienda.archivos.subir(d.imagen)).url : `${d.imagen.name} (no adjunta: pedirla por mail)`;
      await tienda.contacto({ name: d.nombre, email: d.email, message: d.idea, tipo: d.tipo, imagen, asunto: 'Deseo al Walkiverso' });
      await bola.soltar($('.wk-bola'));   // el deseo sale de la bola como una luz
      mostrar(gracias(d), 0.2);
    } catch (err) { aviso(err.message); boton.disabled = false; }
  }

  panel.addEventListener('click', (e) => {
    const accion = e.target.closest('[data-deseo]')?.dataset.deseo;
    if (accion === 'empezar') ir('tipo');
    else if (accion === 'salir') salir();
    else if (accion === 'atras') ir(PASOS[PASOS.indexOf(actual) - 1]);
    const tipo = e.target.closest('[data-tipo]');
    if (tipo) { d.tipo = tipo.dataset.tipo; bola.pulso(0.8); ir('idea'); }
  });
  // La bola se carga de luz mientras se escribe el deseo
  panel.addEventListener('input', (e) => { if (e.target.name === 'idea') { bola.energia(Math.min(1, 0.3 + e.target.value.length / 220)); bola.pulso(0.12); } });
  panel.addEventListener('change', (e) => {
    if (e.target.name !== 'imagen') return;
    const archivo = e.target.files[0];
    if (!archivo) return;
    // Mismos límites que la plataforma (tienda.archivos.subir): así el aviso llega antes de subir nada
    if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || archivo.size > 6 * 1024 * 1024) { aviso('Elegí una imagen JPG, PNG o WEBP de hasta 6 MB.'); return; }
    if (d.vista) URL.revokeObjectURL(d.vista);
    d.imagen = archivo;
    d.vista = URL.createObjectURL(archivo);
    ir('imagen');
  });
  panel.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const falta = [...f.elements].find((c) => c.willValidate && !c.checkValidity());
    if (falta) { falta.focus(); aviso(falta.type === 'email' ? 'Revisá el email.' : 'Completá este paso para seguir.'); return; }
    if (actual === 'idea') { d.idea = f.idea.value.trim(); ir('imagen'); }
    else if (actual === 'imagen') ir('datos');
    else if (actual === 'datos') { d.nombre = f.nombre.value.trim(); d.email = f.email.value.trim(); enviar(f.querySelector('[type=submit]')); }
  });

  salir();
  return () => { bola.detener(); if (d.vista) URL.revokeObjectURL(d.vista); };
}

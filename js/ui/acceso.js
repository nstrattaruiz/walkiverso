// Ingresar o crear cuenta en una ventana emergente (módulo Cuentas de clientes del panel).
// Se abre desde "Ingresar" en cualquier página, sin salir de donde está el visitante.
import { $, $$, estado, flecha, rutaWeb } from './util.js';
import { tienda } from '../datos/tienda.js';
import { abrirModal, cerrarModal } from './piezas.js';

// Páginas que cambian al ingresar (cuenta, cursos comprados, datos del checkout): se vuelven a dibujar
const SE_ACTUALIZAN = /^\/(cuenta|curso|cursos|checkout)(\/|$)/;

export function abrirAcceso(pestana = 'ingresar') {
  abrirModal(`
    <div class="wk-acceso">
      <span class="wk-sobre">Tu cuenta</span>
      <div class="wk-acceso__pestanas" role="tablist" aria-label="Ingresar o crear cuenta">
        <button type="button" role="tab" id="acceso-t-ingresar" aria-controls="f-ingresar" data-pestana="ingresar">Ingresar</button>
        <button type="button" role="tab" id="acceso-t-registrar" aria-controls="f-registrar" data-pestana="registrar">Crear cuenta</button>
      </div>
      <form class="wk-form" id="f-ingresar" role="tabpanel" aria-labelledby="acceso-t-ingresar">
        <h2 class="wk-titulo wk-titulo--s">Qué bueno verte de nuevo</h2>
        <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email"></label>
        <label class="wk-campo">Contraseña<input name="clave" type="password" required autocomplete="current-password"></label>
        <p class="wk-error" role="alert"></p>
        <button class="wk-btn wk-btn--tinta wk-btn--ancho">Ingresar ${flecha}</button>
        <p class="wk-acceso__pie"><button type="button" class="wk-acceso__enlace" id="olvide">Olvidé mi contraseña</button></p>
      </form>
      <form class="wk-form" id="f-registrar" role="tabpanel" aria-labelledby="acceso-t-registrar" hidden>
        <h2 class="wk-titulo wk-titulo--s">Sumate al Walkiverso</h2>
        <label class="wk-campo">Nombre y apellido<input name="nombre" required autocomplete="name"></label>
        <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email"></label>
        <label class="wk-campo">Teléfono <small>(opcional)</small><input name="telefono" type="tel" autocomplete="tel"></label>
        <label class="wk-campo">Contraseña <small>(8 caracteres o más)</small><input name="clave" type="password" required minlength="8" autocomplete="new-password"></label>
        <p class="wk-error" role="alert"></p>
        <button class="wk-btn wk-btn--tinta wk-btn--ancho">Crear mi cuenta ${flecha}</button>
      </form>
    </div>`, { titulo: 'Ingresar o crear cuenta' });

  const ver = (cual, foco = true) => {
    $$('.wk-acceso [data-pestana]').forEach((b) => {
      const activa = b.dataset.pestana === cual;
      b.setAttribute('aria-selected', String(activa));
      b.tabIndex = activa ? 0 : -1;
    });
    $('#f-ingresar').hidden = cual !== 'ingresar';
    $('#f-registrar').hidden = cual !== 'registrar';
    if (foco) $(`#f-${cual} input`).focus({ preventScroll: true });
  };
  $$('.wk-acceso [data-pestana]').forEach((b) => b.addEventListener('click', () => ver(b.dataset.pestana)));
  $('.wk-acceso__pestanas').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const otra = $('#f-ingresar').hidden ? 'ingresar' : 'registrar';
    ver(otra, false);
    $(`#acceso-t-${otra}`).focus();
  });

  /** Ya entró: se cierra la ventana y, si la página depende de la cuenta, se vuelve a dibujar. */
  const entro = () => {
    cerrarModal();
    if (SE_ACTUALIZAN.test(rutaWeb())) window.dispatchEvent(new Event('wk:ruta'));
  };
  const enviar = (form, fn) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const aviso = form.querySelector('[role=alert]');
    const boton = form.querySelector('button.wk-btn');
    aviso.textContent = '';
    boton.disabled = true;
    try { await fn(Object.fromEntries(new FormData(form)), aviso); } catch (err) { aviso.textContent = err.message; }
    if (document.body.contains(boton)) boton.disabled = false;
  });

  enviar($('#f-ingresar'), async (d) => {
    const r = await tienda.cuenta.ingresar(d.email, d.clave);
    if (r?.customer) estado.cliente = r.customer;
    entro();
  });
  enviar($('#f-registrar'), async (d, aviso) => {
    const r = await tienda.cuenta.registrar({ nombre: d.nombre, email: d.email, telefono: d.telefono, clave: d.clave, volver: '/cuenta' });
    if (r.pending) aviso.textContent = 'Ya compraste con ese email: te mandamos un mail para activar tu cuenta.';
    else if (r.approval) aviso.textContent = 'Creamos tu cuenta. Está esperando la aprobación de la tienda: te avisamos por mail cuando puedas ingresar.';
    else { if (r?.customer) estado.cliente = r.customer; entro(); }
  });
  $('#olvide').addEventListener('click', async () => {
    const email = $('#f-ingresar').email.value.trim();
    const aviso = $('#f-ingresar [role=alert]');
    if (!email) { aviso.textContent = 'Escribí tu email arriba y volvé a tocar acá.'; $('#f-ingresar').email.focus(); return; }
    try { await tienda.cuenta.olvide(email, '/cuenta'); aviso.textContent = 'Si hay una cuenta con ese email, te llega un mail para elegir una contraseña nueva.'; } catch (err) { aviso.textContent = err.message; }
  });
  ver(pestana);
}

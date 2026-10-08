// Contacto (el mensaje llega al panel → Mensajes) y páginas legales del panel.
import { $, app, esc, estado, flecha, titular } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { contactoHtml } from '../ui/marco.js';
import { aparecer } from '../anim/efectos.js';
import { raices } from '../ui/piezas.js';

export function contacto() {
  titular('Contacto');
  const datos = contactoHtml();
  app.innerHTML = `
    <section class="wk-cielo wk-pagina wk-seccion wk-contacto wk-con-raices">
      ${raices()}
      <div class="wk-cont wk-contacto__grilla">
        <div class="wk-cab" data-ver>
          <span class="wk-sobre">Contacto</span>
          <h1 class="wk-titulo">Escribile al <em>Walkiverso</em></h1>
          <p class="wk-bajada">¿Una duda sobre una pieza, un envío o un curso? ¿Un deseo para una futura criatura? Te leemos.</p>
          ${datos ? `<div class="wk-contacto__datos">${datos}</div>` : ''}
        </div>
        <form class="wk-form wk-contacto__form" id="f-contacto" data-ver style="--d:1">
          <div class="wk-fila">
            <label class="wk-campo">Nombre<input name="name" autocomplete="name" required value="${esc(estado.cliente?.name ?? '')}"></label>
            <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email" value="${esc(estado.cliente?.email ?? '')}"></label>
          </div>
          <label class="wk-campo">Mensaje<textarea name="message" required rows="6"></textarea></label>
          <button class="wk-btn wk-btn--tinta">Enviar mensaje ${flecha}</button>
          <p id="contacto-estado" role="status" class="wk-ok"></p>
        </form>
      </div>
    </section>`;
  $('#f-contacto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button');
    const estadoEl = $('#contacto-estado');
    boton.disabled = true;
    try {
      await tienda.contacto(Object.fromEntries(new FormData(e.target)));
      // El formulario se convierte en un sobre que se cierra y sale volando
      e.target.innerHTML = `
        <div class="wk-vuelo" role="status">
          <div class="wk-vuelo__cielo" aria-hidden="true">
            <span class="wk-vuelo__estela"></span>
            <svg class="wk-vuelo__sobre" viewBox="0 0 120 84" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
              <rect x="4" y="6" width="112" height="72" rx="8" fill="#fff"/>
              <path d="M6 74 46 44M114 74 74 44"/>
              <path class="wk-vuelo__solapa" d="M5 10 60 52 115 10" fill="#fff"/>
              <circle class="wk-vuelo__lacre" cx="60" cy="46" r="9" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <h2 class="wk-titulo wk-titulo--s">Tu mensaje ya va en camino</h2>
          <p>¡Gracias! Te respondemos pronto.</p>
        </div>`;
      return;
    } catch (err) { estadoEl.textContent = err.message; }
    boton.disabled = false;
  });
  aparecer(app);
}

export async function legal(tipo) {
  const l = await tienda.legal(tipo);
  titular(l.title);
  app.innerHTML = `<section class="wk-papel wk-pagina wk-seccion"><article class="wk-cont wk-cont--angosto wk-prosa"><h1 class="wk-titulo wk-titulo--m">${esc(l.title)}</h1>${l.html}</article></section>`;
}

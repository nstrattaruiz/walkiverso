// Checkout en pasos: 1 · Tus datos → 2 · Entrega → 3 · Pago. Si el pedido es solo digital (cursos, e-books)
// o la tienda no tiene envíos cargados, el paso de entrega no aparece y quedan dos.
// Medios de pago y envíos: los que se habilitan en el panel. Los totales los calcula siempre la plataforma.
import { $, $$, app, esc, estado, flecha, icono, ir, plano, titular } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { catalogo, olvidarCatalogo } from '../datos/modelo.js';
import { PAIS_ENVIOS } from '../config.js';

const dinero = (c, moneda) => tienda.formatear(c, moneda);
const DETALLE_PAGO = { mercadopago: 'Tarjetas de crédito y débito, Abitab y Redpagos. Con cuotas.', paypal: 'Para cursos y e-books, desde cualquier país.' };
const NOMBRES = { datos: 'Tus datos', entrega: 'Entrega', pago: 'Pago' };

const pantalla = (titulo, texto, boton) => { app.innerHTML = `<section class="wk-papel wk-pagina wk-seccion"><div class="wk-cont wk-vacio"><h1 class="wk-titulo wk-titulo--m">${titulo}</h1>${texto ? `<p class="wk-bajada">${texto}</p>` : ''}${boton}</div></section>`; };

export async function checkout() {
  titular('Finalizar compra');
  const { info, cliente } = estado;
  const [carro, op, piezas] = await Promise.all([tienda.carrito.ver(), tienda.checkout.opciones(), catalogo().catch(() => [])]);
  if (!carro.lines.length) return pantalla('Tu colección está vacía', '', `<a class="wk-btn wk-btn--tinta" href="/tienda" data-link>Explorar tienda ${flecha}</a>`);
  if (!op.payments.length) return pantalla('Todavía no se puede comprar online', 'Escribinos y coordinamos tu pedido.', `<a class="wk-btn wk-btn--tinta" href="/contacto" data-link>Contacto ${flecha}</a>`);

  // ¿Hay piezas físicas? Cursos y e-books no llevan envío y se pueden comprar desde cualquier país.
  const tipoDe = (handle) => piezas.find((x) => x.handle === handle)?.tipo ?? 'criatura';
  const hayFisicas = carro.lines.some((l) => ['criatura', 'artefacto'].includes(tipoDe(l.handle)));
  const hayEntrega = hayFisicas && op.shipping.length > 0;
  const pasos = ['datos', ...(hayEntrega ? ['entrega'] : []), 'pago'];
  // PayPal es para cursos y e-books (ver FAQ). Si es el único medio habilitado, se muestra igual.
  const sinPaypal = op.payments.filter((p) => p.method !== 'paypal');
  const pagos = hayFisicas && sinPaypal.length ? sinPaypal : op.payments;

  const radio = (name, value, titulo, detalle, checked, extra = '') => `
    <label class="wk-radio"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''} required>
      <span><strong>${esc(titulo)}</strong>${detalle ? `<small>${esc(detalle)}</small>` : ''}</span>${extra}</label>`;
  const precioEnvio = (e) => (e.priceCents ? dinero(e.priceCents, op.currency) : 'Gratis');
  const acciones = (paso) => {
    const i = pasos.indexOf(paso);
    const sig = pasos[i + 1];
    return `<p class="wk-error" data-error role="alert"></p>
      <div class="wk-compra__acciones">
        ${i > 0 ? `<button type="button" class="wk-btn wk-btn--linea" data-ir="${pasos[i - 1]}">← Volver</button>` : '<a class="wk-enlace" href="/tienda" data-link>← Seguir mirando</a>'}
        ${sig ? `<button type="button" class="wk-btn wk-btn--tinta" data-ir="${sig}">Continuar a ${NOMBRES[sig].toLowerCase()} ${flecha}</button>`
          : `<button class="wk-btn wk-btn--tinta" id="confirmar">Confirmar pedido ${flecha}</button>`}
      </div>`;
  };

  app.innerHTML = `
    <section class="wk-papel wk-pagina wk-compra">
      <div class="wk-cont wk-compra__grilla">
        <div class="wk-compra__principal">
          <h1 class="wk-titulo wk-titulo--m">Finalizar compra</h1>
          <ol class="wk-escalones" aria-label="Pasos de la compra">
            ${pasos.map((p, i) => `<li><button type="button" data-escalon="${p}" disabled><span>${i + 1}</span>${NOMBRES[p]}</button></li>`).join('')}
          </ol>

          <form class="wk-form" id="compra" novalidate>
            <fieldset data-paso="datos">
              <legend tabindex="-1">Tus datos</legend>
              ${info.modules?.accounts && !cliente ? '<p class="wk-nota">¿Ya tenés cuenta? <a href="/cuenta" data-link>Ingresá</a> para ver tus pedidos.</p>' : ''}
              <label class="wk-campo">Nombre y apellido<input name="nombre" required autocomplete="name" value="${esc(cliente?.name ?? '')}"></label>
              <div class="wk-fila">
                <label class="wk-campo">Email<input name="email" type="email" required autocomplete="email" value="${esc(cliente?.email ?? '')}"></label>
                <label class="wk-campo">Teléfono <small>(opcional)</small><input name="telefono" type="tel" autocomplete="tel" value="${esc(cliente?.phone ?? '')}"></label>
              </div>
              <label class="wk-campo">País<input name="pais" required autocomplete="country-name" value="${esc(PAIS_ENVIOS)}">
                ${hayFisicas ? `<small>Por ahora las piezas físicas se envían solo dentro de ${esc(PAIS_ENVIOS)}.</small>` : '<small>Cursos y e-books se pueden comprar desde cualquier país.</small>'}</label>
              ${info.modules?.birthday && !cliente?.birthDate ? `<label class="wk-campo">Tu fecha de nacimiento <small>(opcional: te mandamos un regalo el día de tu cumpleaños)</small>
                <input name="nacimiento" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" autocomplete="bday"></label>` : ''}
              ${acciones('datos')}
            </fieldset>

            ${hayEntrega ? `<fieldset data-paso="entrega" hidden>
              <legend tabindex="-1">Entrega</legend>
              <div class="wk-radios">${op.shipping.map((e, i) => radio('envio', e.id, e.name, [e.description, e.freeOverCents ? `Gratis desde ${dinero(e.freeOverCents, op.currency)}` : ''].filter(Boolean).join(' · '), i === 0, `<b>${precioEnvio(e)}</b>`)).join('')}</div>
              <div id="direccion-caja" class="wk-form">
                <label class="wk-campo">Dirección<input name="direccion" autocomplete="street-address" placeholder="Calle, número y apartamento" value="${esc(cliente?.address ?? '')}"></label>
                <div class="wk-fila">
                  <label class="wk-campo">Ciudad<input name="ciudad" autocomplete="address-level2" value="${esc(cliente?.city ?? '')}"></label>
                  <label class="wk-campo">Departamento<input name="departamento" autocomplete="address-level1"></label>
                </div>
              </div>
              <label class="wk-campo">Nota para el pedido <small>(opcional)</small><textarea name="nota" rows="2"></textarea></label>
              ${acciones('entrega')}
            </fieldset>` : ''}

            <fieldset data-paso="pago" hidden>
              <legend tabindex="-1">Pago</legend>
              <div class="wk-repaso" id="repaso"></div>
              <div class="wk-radios">${pagos.map((p, i) => radio('pago', p.method, p.label, DETALLE_PAGO[p.method] ?? (p.online ? 'Pagás online de forma segura.' : ''), i === 0)).join('')}</div>
              <label class="wk-campo">Código de descuento <small>(opcional)</small>
                <span class="wk-pegado"><input name="cupon" autocomplete="off" autocapitalize="characters"><button type="button" class="wk-btn wk-btn--linea" id="aplicar">Aplicar</button></span></label>
              ${acciones('pago')}
            </fieldset>
          </form>
        </div>

        <details class="wk-resumen" id="resumen-caja">
          <summary><span>Tu pedido <small>(${carro.itemCount})</small></span><b id="resumen-total"></b></summary>
          <div class="wk-resumen__lineas">
            ${carro.lines.map((l) => `<div class="wk-resumen__linea">
              <span class="wk-resumen__arte">${l.image ? `<img src="${esc(l.image.sizes?.['320'] ?? l.image.url)}" alt="" loading="lazy">` : '<span class="wk-arte wk-arte--espera"><span class="wk-arte__glifo"></span></span>'}<i>${l.quantity}</i></span>
              <span><strong>${esc(l.title)}</strong>${l.variantTitle ? `<small>${esc(l.variantTitle)}</small>` : ''}</span>
              <b>${dinero(l.total, carro.currency)}</b></div>`).join('')}
          </div>
          <dl class="wk-totales" id="totales" aria-live="polite"></dl>
          <p class="wk-resumen__cert">${icono('i-sello')}Cada obra viaja con su certificado de autenticidad.</p>
        </details>
      </div>
    </section>`;

  const form = $('#compra');
  const resumenCaja = $('#resumen-caja');
  resumenCaja.open = window.innerWidth >= 900;
  const datos = () => Object.fromEntries(new FormData(form));
  const envioDe = (id) => op.shipping.find((e) => e.id === id);
  const conDireccion = () => hayEntrega && !envioDe(datos().envio)?.pickup;
  let cupon = '';
  let actual = 'datos';
  let alcanzado = 0;

  async function cotizar() {
    const d = datos();
    try {
      const t = await tienda.checkout.cotizar({ metodoPago: d.pago, envio: hayEntrega ? d.envio : null, cupon: cupon || null });
      $('#totales').innerHTML = `
        <div><dt>Subtotal</dt><dd>${dinero(t.subtotalCents, t.currency)}</dd></div>
        ${t.discountCents ? `<div><dt>Cupón ${esc(t.coupon ?? '')}</dt><dd>− ${dinero(t.discountCents, t.currency)}</dd></div>` : ''}
        ${t.shippingMethod ? `<div><dt>${esc(t.shippingMethod)}</dt><dd>${t.shippingCents ? dinero(t.shippingCents, t.currency) : 'Gratis'}</dd></div>` : ''}
        ${t.paymentAdjustCents ? `<div><dt>${esc(t.paymentAdjustLabel || 'Ajuste por medio de pago')}</dt><dd>${t.paymentAdjustCents < 0 ? '− ' : ''}${dinero(Math.abs(t.paymentAdjustCents), t.currency)}</dd></div>` : ''}
        <div class="wk-totales__total"><dt>Total</dt><dd>${dinero(t.totalCents, t.currency)}</dd></div>`;
      $('#resumen-total').textContent = dinero(t.totalCents, t.currency);
      return true;
    } catch (e) {
      if (cupon) { cupon = ''; form.cupon.value = ''; }
      $(`[data-paso="${actual}"] [data-error]`).textContent = e.message;
      return false;
    }
  }

  /** Revisa los campos del paso. Marca el primero que falte y dice qué pasa. */
  function valido(paso) {
    const caja = $(`[data-paso="${paso}"]`);
    const aviso = $('[data-error]', caja);
    aviso.textContent = '';
    if (paso === 'entrega') ['direccion', 'ciudad'].forEach((c) => { form[c].required = conDireccion(); });
    const falta = $$('input, select, textarea', caja).find((i) => !i.checkValidity());
    if (falta) { falta.focus(); falta.reportValidity?.(); aviso.textContent = 'Revisá los datos marcados.'; return false; }
    if (paso === 'datos' && hayFisicas && plano(form.pais.value) !== plano(PAIS_ENVIOS)) {
      aviso.textContent = `Por ahora las piezas físicas solo se envían dentro de ${PAIS_ENVIOS}. Los cursos y e-books sí se pueden comprar desde cualquier país.`;
      form.pais.focus();
      return false;
    }
    return true;
  }

  function repaso() {
    const d = datos();
    const envio = hayEntrega ? envioDe(d.envio) : null;
    $('#repaso').innerHTML = `
      <div><span>Contacto</span><p>${esc(d.nombre)} · ${esc(d.email)}</p><button type="button" data-ir="datos">Cambiar</button></div>
      ${envio ? `<div><span>Entrega</span><p>${esc(envio.name)}${envio.pickup ? '' : ` · ${esc([d.direccion, d.ciudad, d.departamento].filter(Boolean).join(', '))}`}</p><button type="button" data-ir="entrega">Cambiar</button></div>` : ''}`;
  }

  function mostrar(paso, { foco = true } = {}) {
    actual = paso;
    alcanzado = Math.max(alcanzado, pasos.indexOf(paso));
    $$('[data-paso]', form).forEach((f) => { f.hidden = f.dataset.paso !== paso; });
    $$('[data-escalon]').forEach((b, i) => {
      b.disabled = i > alcanzado;
      b.classList.toggle('is-hecho', i < pasos.indexOf(paso));
      if (b.dataset.escalon === paso) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (paso === 'pago') repaso();
    if (foco) {
      $(`[data-paso="${paso}"] legend`).focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }
  /** Para avanzar hay que completar los pasos anteriores; volver atrás siempre se puede. */
  function irA(paso) {
    const destino = pasos.indexOf(paso);
    for (let i = pasos.indexOf(actual); i < destino; i++) {
      if (!valido(pasos[i])) { if (pasos[i] !== actual) mostrar(pasos[i]); return; }
    }
    mostrar(paso);
    cotizar();
  }

  app.querySelector('.wk-compra').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir], [data-escalon]');
    if (b) irA(b.dataset.ir ?? b.dataset.escalon);
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'envio') { $('#direccion-caja').hidden = !conDireccion(); cotizar(); }
    if (e.target.name === 'pago') cotizar();
  });
  // Enter en un campo avanza al paso siguiente en vez de confirmar antes de tiempo
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || actual === 'pago') return;
    e.preventDefault();
    irA(pasos[pasos.indexOf(actual) + 1]);
  });
  $('#aplicar').addEventListener('click', async () => {
    cupon = form.cupon.value.trim();
    $('[data-paso="pago"] [data-error]').textContent = '';
    await cotizar();
  });
  // Carritos abandonados (módulo): al salir del campo de email se avisa a la tienda. Con el módulo apagado no hace nada.
  if (info.modules?.abandonedCarts) {
    form.email.addEventListener('blur', () => {
      if (form.email.value.includes('@')) tienda.checkout.contacto({ email: form.email.value.trim(), nombre: form.nombre.value.trim(), volver: '/checkout' });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (actual !== 'pago') { irA('pago'); return; }
    if (!pasos.every(valido)) return;
    const d = datos();
    const aviso = $('[data-paso="pago"] [data-error]');
    const boton = $('#confirmar');
    boton.disabled = true;
    aviso.textContent = '';
    try {
      const r = await tienda.checkout.confirmar({
        metodoPago: d.pago, envio: hayEntrega ? d.envio : null, cupon: cupon || null,
        direccion: conDireccion() ? [d.direccion, d.ciudad, d.departamento, d.pais].filter(Boolean).join(', ') : d.pais,
        nota: d.nota,
        cliente: { nombre: d.nombre, email: d.email, telefono: d.telefono, nacimiento: d.nacimiento || null }, volver: '/pedido',
      });
      olvidarCatalogo();   // la pieza ya encontró hogar
      // Pago online (Mercado Pago, PayPal): a pagar. Si no, al pedido con las instrucciones.
      if (r.payUrl) { location.href = r.payUrl; return; }
      ir(`/pedido?pedido=${encodeURIComponent(r.token)}`);
    } catch (err) { aviso.textContent = err.message; boton.disabled = false; }
  });

  if (hayEntrega) $('#direccion-caja').hidden = !conDireccion();
  mostrar('datos', { foco: false });
  cotizar();
}

/** Seguimiento del envío (módulo Empresas de envío). */
const ESTADO_ENVIO = { ready: 'Preparando el envío', in_transit: 'En camino', delivered: 'Entregado', returned: 'Devuelto' };

/** El pedido, con el código privado que vuelve en la dirección (?pedido=...). Si se pagó online, la plataforma lo confirma. */
export async function pedido(token) {
  if (!token) throw new Error('404');
  const o = await tienda.checkout.pedido(token);
  olvidarCatalogo();
  titular(`Pedido #${o.number}`);
  const pagado = o.paymentStatus === 'paid';
  const cancelado = o.status === 'cancelled';
  app.innerHTML = `
    <section class="wk-cielo wk-pagina wk-seccion wk-pedido">
      <div class="wk-cont wk-cont--angosto">
        <span class="wk-pedido__ojo ${cancelado ? '' : 'is-despierta'}" aria-hidden="true">${icono('i-ojo')}</span>
        <span class="wk-sobre">Pedido #${o.number}</span>
        <h1 class="wk-titulo">${cancelado ? 'Pedido cancelado' : pagado ? '¡Ya tiene <em>hogar</em>!' : '¡Recibimos tu <em>pedido</em>!'}</h1>
        <p class="wk-bajada">${esc(o.paymentLabel ?? '')} · ${cancelado ? 'cancelado' : pagado ? 'pagado' : 'pendiente de pago'}</p>
        ${o.instructions && !cancelado ? `<div class="wk-pedido__caja"><strong>Cómo pagar</strong><p>${esc(o.instructions).replace(/\n/g, '<br>')}</p></div>` : ''}
        ${o.payUrl ? `<p><a class="wk-btn wk-btn--luz" href="${esc(o.payUrl)}">Pagar ahora ${flecha}</a></p>` : ''}
        ${o.expiresAt && !pagado && !cancelado ? `<p class="wk-nota">Tenés tiempo para pagar hasta el ${new Date(o.expiresAt).toLocaleString('es-UY', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Después el pedido se cancela solo.</p>` : ''}
        <div class="wk-pedido__caja">
          ${o.lines.map((l) => `<div class="wk-pedido__linea"><span>${l.quantity} × ${esc(l.title)}${l.variantTitle ? ` <small>${esc(l.variantTitle)}</small>` : ''}</span><strong>${dinero(l.totalCents, o.currency)}</strong></div>`).join('')}
          <dl class="wk-totales">
            ${o.shippingMethod ? `<div><dt>${esc(o.shippingMethod)}</dt><dd>${o.shippingCents ? dinero(o.shippingCents, o.currency) : 'Gratis'}</dd></div>` : ''}
            ${o.discountCents ? `<div><dt>Descuento</dt><dd>− ${dinero(o.discountCents, o.currency)}</dd></div>` : ''}
            <div class="wk-totales__total"><dt>Total</dt><dd>${dinero(o.totalCents, o.currency)}</dd></div>
          </dl>
        </div>
        ${o.shipments?.length ? `<div class="wk-pedido__caja"><strong>Tu envío</strong>${o.shipments.map((s) => `
          <p>${esc(s.carrier)} · ${ESTADO_ENVIO[s.status] ?? ''}${s.trackingNumber ? ` · Guía <b>${esc(s.trackingNumber)}</b>` : ''}
          ${s.trackingUrl ? ` <a href="${esc(s.trackingUrl)}" target="_blank" rel="noopener">Seguir mi envío</a>` : ''}</p>`).join('')}</div>` : ''}
        ${o.customerEmail ? `<p class="wk-nota">Te escribimos a <strong>${esc(o.customerEmail)}</strong> con las novedades de tu pedido.</p>` : ''}
        <p><a class="wk-btn wk-btn--linea" href="/tienda" data-link>Seguir mirando ${flecha}</a></p>
      </div>
    </section>`;
}

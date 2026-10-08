// Cuenta del cliente (módulo Cuentas de clientes del panel): ingresar, crear cuenta, mis cursos, mis pedidos y mis datos.
// La sesión es una cookie segura de la plataforma: la web no guarda nada.
import { $, app, esc, estado, ir, titular, url } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { abrirAcceso } from '../ui/acceso.js';

const dinero = (c, moneda) => tienda.formatear(c, moneda);
const ESTADO_PEDIDO = (o) => (o.status === 'cancelled' ? 'Cancelado' : o.paymentStatus !== 'paid' ? 'Pendiente de pago'
  : o.fulfillmentStatus === 'delivered' ? 'Entregado' : o.fulfillmentStatus === 'shipped' ? 'Enviado' : 'Pagado, en preparación');

export async function cuenta() {
  titular('Mi cuenta');
  const { info } = estado;
  const codigo = new URLSearchParams(location.search).get('codigo');
  const marco = (html) => { app.innerHTML = `<section class="wk-papel wk-pagina wk-seccion"><div class="wk-cont wk-cont--angosto wk-cuenta">${html}</div></section>`; };
  const enviar = (form, fn) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const aviso = form.querySelector('[role=alert]');
    const boton = form.querySelector('button.wk-btn');
    aviso.textContent = '';
    boton.disabled = true;
    try { await fn(Object.fromEntries(new FormData(form)), aviso); } catch (err) { aviso.textContent = err.message; }
    boton.disabled = false;
  });
  const recargar = () => ir('/cuenta', { reemplazar: true });

  // Llegó desde el mail (recuperar contraseña o activar la cuenta): elegir contraseña
  if (codigo) {
    marco(`<h1 class="wk-titulo wk-titulo--m">Elegí tu contraseña</h1>
      <form class="wk-form" id="f-clave"><label class="wk-campo">Contraseña nueva <small>(8 caracteres o más)</small><input name="clave" type="password" required minlength="8" autocomplete="new-password"></label>
      <button class="wk-btn wk-btn--tinta">Guardar y entrar</button><p class="wk-error" role="alert"></p></form>`);
    enviar($('#f-clave'), async (d, aviso) => {
      const r = await tienda.cuenta.restablecer(codigo, d.clave);
      // La tienda aprueba las cuentas: la contraseña quedó guardada, pero todavía no puede ingresar
      if (r.approval) { history.replaceState(null, '', url('/cuenta')); aviso.textContent = 'Listo, guardamos tu contraseña. Tu cuenta está esperando la aprobación de la tienda: te avisamos por mail.'; return; }
      recargar();
    });
    return;
  }

  // Sin sesión (llegó escribiendo la dirección o desde un botón "Ingresá"): se abre la ventana de acceso
  if (!estado.cliente) {
    marco(`<div class="wk-vacio"><span class="wk-sobre">Tu cuenta</span><h1 class="wk-titulo wk-titulo--m">Ingresá para ver tus pedidos y tus cursos</h1>
      <button type="button" class="wk-btn wk-btn--tinta" id="abrir-acceso">Ingresar o crear cuenta</button></div>`);
    $('#abrir-acceso').addEventListener('click', () => abrirAcceso());
    abrirAcceso();
    return;
  }

  const cliente = estado.cliente;
  const [pedidos, misCursos] = await Promise.all([tienda.cuenta.pedidos(), info.modules?.courses ? tienda.cursos.listar() : []]);
  const conAcceso = misCursos.filter((c) => c.access);
  marco(`<h1 class="wk-titulo wk-titulo--m">Hola, ${esc(cliente.name.split(' ')[0])}</h1>
    ${conAcceso.length ? `<h2 class="wk-titulo wk-titulo--s">Mis cursos</h2><div class="wk-cuenta__lista">${conAcceso.map((c) => `<a class="wk-cuenta__item" href="/curso/${esc(c.slug)}" data-link><strong>${esc(c.title)}</strong><span>${c.progress.done} de ${c.progress.total} lecciones</span></a>`).join('')}</div>` : ''}
    <h2 class="wk-titulo wk-titulo--s">Mis pedidos</h2>
    ${pedidos.length ? `<div class="wk-cuenta__lista">${pedidos.map((o) => `
      <${o.token ? `a href="/pedido?pedido=${encodeURIComponent(o.token)}" data-link` : 'div'} class="wk-cuenta__item">
        <strong>Pedido #${o.number} · ${dinero(o.totalCents, o.currency)}</strong>
        <span>${new Date(o.createdAt).toLocaleDateString('es-UY')} · ${ESTADO_PEDIDO(o)}</span>
        <small>${o.lines.map((l) => `${l.quantity} × ${esc(l.title)}`).join(', ')}</small>
      </${o.token ? 'a' : 'div'}>
      ${(o.shipments ?? []).filter((s) => s.trackingUrl).map((s) => `<a class="wk-enlace" href="${esc(s.trackingUrl)}" target="_blank" rel="noopener">Seguir envío</a>`).join('')}`).join('')}</div>` : '<p class="wk-nota">Todavía no hiciste pedidos.</p>'}
    <h2 class="wk-titulo wk-titulo--s">Mis datos</h2>
    <form class="wk-form" id="f-datos">
      <div class="wk-fila">
        <label class="wk-campo">Nombre y apellido<input name="nombre" required value="${esc(cliente.name)}" autocomplete="name"></label>
        <label class="wk-campo">Teléfono<input name="telefono" value="${esc(cliente.phone ?? '')}" autocomplete="tel"></label>
      </div>
      <label class="wk-campo">Cédula o RUT <small>(para facturar)</small><input name="documento" value="${esc(cliente.document ?? '')}"></label>
      <div class="wk-fila">
        <label class="wk-campo">Dirección<input name="direccion" value="${esc(cliente.address ?? '')}" autocomplete="street-address"></label>
        <label class="wk-campo">Ciudad<input name="ciudad" value="${esc(cliente.city ?? '')}" autocomplete="address-level2"></label>
      </div>
      ${info.modules?.birthday ? `<label class="wk-campo">Fecha de nacimiento<input name="nacimiento" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" value="${esc(cliente.birthDate ?? '')}" autocomplete="bday"></label>` : ''}
      <button class="wk-btn wk-btn--tinta">Guardar</button><p class="wk-error" role="alert"></p>
    </form>
    <p><button type="button" class="wk-btn wk-btn--linea" id="salir">Salir de mi cuenta</button></p>`);
  enviar($('#f-datos'), async (d, aviso) => { estado.cliente = await tienda.cuenta.actualizar(d); aviso.textContent = 'Datos guardados.'; });
  $('#salir').addEventListener('click', async () => { await tienda.cuenta.salir(); estado.cliente = null; ir('/'); });   // al salir vuelve a la portada (no reabre la ventana de acceso)
}

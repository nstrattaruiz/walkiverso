// Tienda de demostración: imita el SDK de la plataforma (`/api/v1/sdk.js`) con datos de relleno.
// Solo se carga cuando la web NO está corriendo en la plataforma (ver tienda.js). No cobra ni guarda nada:
// el carrito y los pedidos de prueba viven en esta pestaña.
import { PRODUCTOS, CURSOS, INFO, CHECKOUT } from './demo-datos.js';

const memoria = {
  leer(k, defecto) { try { return JSON.parse(sessionStorage.getItem(`wk-demo-${k}`)) ?? defecto; } catch { return defecto; } },
  guardar(k, v) { try { sessionStorage.setItem(`wk-demo-${k}`, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
const espera = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const fallo = (mensaje) => Object.assign(new Error(mensaje), { demo: true });
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lo vendido en los pedidos de prueba se descuenta del stock
const vendidos = memoria.leer('vendidos', {});
const conStock = (p) => {
  const v = p.variants[0];
  if (v.stock === null) return p;
  const stock = Math.max(0, v.stock - (vendidos[v.id] ?? 0));
  return { ...p, available: stock > 0, variants: [{ ...v, stock, available: stock > 0 }] };
};
const productos = () => PRODUCTOS.map(conStock);
const porVariante = (id) => productos().find((p) => p.variants[0].id === id);

// ---------------------------------------------------------------- carrito
let lineas = memoria.leer('carrito', []);   // [{ variantId, quantity }]
const oyentes = new Set();
function carritoActual() {
  const lines = lineas.map((l, i) => {
    const p = porVariante(l.variantId);
    const unica = p.tags.includes('pieza-unica');
    return { line: i + 1, variantId: l.variantId, handle: p.handle, title: p.title, variantTitle: '', quantity: l.quantity, price: p.price, total: p.price * l.quantity, image: p.image, maxQuantity: unica ? 1 : p.variants[0].stock };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  return { currency: INFO.currency, itemCount: lines.reduce((s, l) => s + l.quantity, 0), subtotal, total: subtotal, note: '', lines };
}
function cambio() {
  memoria.guardar('carrito', lineas);
  const c = carritoActual();
  oyentes.forEach((fn) => fn(c));
  return c;
}
function tope(p, cantidad) {
  const max = p.tags.includes('pieza-unica') ? 1 : p.variants[0].stock;
  if (max !== null && cantidad > max) throw fallo(max === 0 ? 'Esta pieza ya no está disponible.' : max === 1 ? 'Solo hay 1 disponible.' : `Solo quedan ${max} unidades.`);
}

// ---------------------------------------------------------------- checkout
function totales({ metodoPago, envio, cupon }) {
  const c = carritoActual();
  if (!c.lines.length) throw fallo('Tu colección está vacía.');
  const codigo = (cupon ?? '').trim().toUpperCase();
  if (codigo && !CHECKOUT.cupones[codigo]) throw fallo('Ese código de descuento no existe.');
  const discountCents = codigo ? Math.round((c.subtotal * CHECKOUT.cupones[codigo]) / 100) : 0;
  const m = CHECKOUT.shipping.find((s) => s.id === envio) ?? null;
  const shippingCents = m ? (m.freeOverCents && c.subtotal >= m.freeOverCents ? 0 : m.priceCents) : 0;
  return {
    currency: c.currency,
    lines: c.lines.map((l) => ({ title: l.title, variantTitle: l.variantTitle, quantity: l.quantity, totalCents: l.total })),
    subtotalCents: c.subtotal, coupon: codigo || null, discountCents,
    shippingMethod: m?.name ?? null, shippingCents, paymentAdjustCents: 0, paymentAdjustLabel: null,
    totalCents: c.subtotal - discountCents + shippingCents,
    paymentLabel: CHECKOUT.payments.find((p) => p.method === metodoPago)?.label ?? '',
  };
}

export const tienda = {
  // Para probar textos "del panel" sin plataforma: sessionStorage.setItem('wk-demo-textos', JSON.stringify({ 'HERO.cta': 'Entrar' }))
  async info() { return { ...INFO, content: { texts: memoria.leer('textos', null) } }; },
  async categorias() {
    const cuenta = {};
    productos().forEach((p) => p.categories.forEach((c) => { cuenta[c] = (cuenta[c] ?? 0) + 1; }));
    return Object.entries(cuenta).map(([handle, productCount]) => ({ handle, name: handle[0].toUpperCase() + handle.slice(1), description: null, image: null, productCount, parent: null, children: [] }));
  },
  productos: {
    async listar({ categoria, buscar, etiqueta, soloDisponibles, pagina = 1, porPagina = 24 } = {}) {
      await espera();
      let items = productos();
      if (categoria) items = items.filter((p) => p.categories.includes(categoria));
      if (etiqueta) items = items.filter((p) => p.tags.includes(etiqueta));
      if (soloDisponibles) items = items.filter((p) => p.available);
      if (buscar) items = items.filter((p) => plano([p.title, ...Object.values(p.attributes)].join(' ')).includes(plano(buscar)));
      const total = items.length;
      return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), total, page: pagina, pages: Math.max(1, Math.ceil(total / porPagina)), facets: { vendors: [], attributes: [] }, suggestions: [] };
    },
    async uno(handle) {
      await espera();
      const p = productos().find((x) => x.handle === handle);
      if (!p) throw fallo('No encontramos esa pieza.');
      return p;
    },
    async avisarme() { await espera(); return { ok: true }; },
  },
  carrito: {
    async ver() { return carritoActual(); },
    async agregar(variantId, cantidad = 1) {
      await espera();
      const p = porVariante(variantId);
      if (!p) throw fallo('No encontramos esa pieza.');
      const l = lineas.find((x) => x.variantId === variantId);
      tope(p, (l?.quantity ?? 0) + cantidad);
      if (l) l.quantity += cantidad; else lineas.push({ variantId, quantity: cantidad });
      return cambio();
    },
    async cambiar(linea, cantidad) {
      const l = lineas[linea - 1];
      if (!l) return carritoActual();
      if (cantidad <= 0) lineas.splice(linea - 1, 1);
      else { tope(porVariante(l.variantId), cantidad); l.quantity = cantidad; }
      return cambio();
    },
    async vaciar() { lineas = []; return cambio(); },
    async nota() { return carritoActual(); },
    alCambiar(fn) { oyentes.add(fn); },
  },
  checkout: {
    async opciones() { return { currency: INFO.currency, payments: CHECKOUT.payments, shipping: CHECKOUT.shipping }; },
    async cotizar(datos) { await espera(80); return totales(datos); },
    async contacto() { return { ok: true }; },
    async confirmar(datos) {
      await espera(500);
      const t = totales(datos);
      const pedidos = memoria.leer('pedidos', {});
      const number = 1000 + Object.keys(pedidos).length + 1;
      const token = `demo-${number}-${Math.random().toString(36).slice(2, 8)}`;
      pedidos[token] = {
        number, status: 'open', paymentStatus: 'pending', fulfillmentStatus: null, paymentLabel: t.paymentLabel, payUrl: null, expiresAt: null,
        instructions: 'Este es un pedido de demostración: no se cobró nada. En la tienda real acá se muestran las instrucciones de pago o se abre Mercado Pago / PayPal.',
        lines: t.lines, shippingMethod: t.shippingMethod, shippingCents: t.shippingCents, discountCents: t.discountCents, totalCents: t.totalCents, currency: t.currency,
        customerEmail: datos.cliente?.email ?? '', shipments: [],
      };
      memoria.guardar('pedidos', pedidos);
      lineas.forEach((l) => { vendidos[l.variantId] = (vendidos[l.variantId] ?? 0) + l.quantity; });
      memoria.guardar('vendidos', vendidos);
      lineas = [];
      cambio();
      return { number, token, payUrl: null, instructions: pedidos[token].instructions };
    },
    async pedido(token) {
      const o = memoria.leer('pedidos', {})[token];
      if (!o) throw fallo('No encontramos ese pedido.');
      return o;
    },
  },
  cursos: {
    async listar() { await espera(); return CURSOS.map(({ lessons, ...c }) => c); },
    async uno(slug) {
      const c = CURSOS.find((x) => x.slug === slug);
      if (!c) throw fallo('No encontramos ese curso.');
      return c;
    },
    async avance() { return { ok: true }; },
  },
  // Cuenta de prueba: cualquier email y contraseña sirven. Vive en esta pestaña.
  cuenta: (() => {
    const oyentes = new Set();
    const poner = (c) => { memoria.guardar('cliente', c); oyentes.forEach((fn) => fn(c)); return c; };
    return {
      async yo() { return memoria.leer('cliente', null); },
      async ingresar(email) { await espera(300); return { customer: poner({ name: email.split('@')[0], email, phone: '', address: '', city: '', document: '', birthDate: '' }) }; },
      async registrar(d) { await espera(300); return { customer: poner({ name: d.nombre, email: d.email, phone: d.telefono ?? '', address: '', city: '', document: '', birthDate: '' }) }; },
      async salir() { poner(null); },
      async actualizar(d) { const c = memoria.leer('cliente', {}); return poner({ ...c, name: d.nombre ?? c.name, phone: d.telefono ?? c.phone, address: d.direccion ?? c.address, city: d.ciudad ?? c.city, document: d.documento ?? c.document }); },
      async pedidos() { return []; },
      async olvide() { return { ok: true }; },
      async restablecer() { return {}; },
      alCambiar(fn) { oyentes.add(fn); },
    };
  })(),
  async contacto() { await espera(400); return { ok: true }; },
  // En la demostración la imagen no se sube a ningún lado: devuelve una dirección local, como haría la plataforma
  archivos: { async subir(archivo) { await espera(500); return { url: URL.createObjectURL(archivo) }; } },
  async legal() { throw fallo('Sin páginas legales en la demostración.'); },
  formatear(centesimos, moneda = INFO.currency) {
    const n = (centesimos / 100).toLocaleString('es-UY', { minimumFractionDigits: centesimos % 100 ? 2 : 0, maximumFractionDigits: 2 });
    return `${moneda === 'USD' ? 'US$' : '$'} ${n}`;
  },
};

// Datos de demostración (solo se usan fuera de la plataforma). Tienen la misma forma que entrega la plataforma.
// Las criaturas y artefactos son los reales, migrados de la tienda anterior (catalogo.js). El e-book y los cursos
// siguen siendo de relleno (nombres, precios y lecciones): en la tienda real se cargan en el panel.
import { CATALOGO } from './catalogo.js';

const HISTORIA = 'Acá va la historia de esta pieza: de dónde viene, qué la mueve y qué la hace especial. (Texto de ejemplo, se carga en el panel.)';
const DESCRIPCION = '<p>Descripción de ejemplo. En el panel se escribe cómo es la pieza: medidas, postura, carácter y todo lo que ayude a imaginarla en su nuevo hogar.</p>';

let n = 0;
/** Arma un producto con la forma de la plataforma. Precio en centésimos. */
function producto(title, { tipo, especie, clase, precio, stock = 1, unica = false, etiquetas = [], materiales = 'Cartón, telas, alambre, hilos, acrílicos', extra = {} }) {
  n += 1;
  const handle = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fisica = tipo === 'Criatura' || tipo === 'Artefacto';
  return {
    id: `demo-${n}`, handle, title, description: DESCRIPCION, type: tipo, vendor: null,
    tags: [...(unica ? ['pieza-unica'] : []), ...etiquetas],
    categories: [tipo === 'Criatura' ? 'criaturas' : tipo === 'Artefacto' ? 'artefactos' : tipo === 'E-book' ? 'e-books' : 'cursos', ...(especie ? [`${especie.toLowerCase()}s`] : [])],
    attributes: {
      Tipo: tipo,
      ...(especie ? { Especie: especie } : {}),
      ...(clase ? { Clase: clase } : {}),
      ...(fisica ? { 'Técnica': unica ? 'Técnica tradicional' : 'Técnica mixta', Materiales: materiales, 'Número de obra': String(n).padStart(3, '0'), Historia: HISTORIA } : {}),
      ...extra,
    },
    currency: 'UYU', price: precio, priceMin: precio, priceMax: precio, compareAtPrice: null,
    available: stock > 0, image: null, images: [], video: null, options: [],
    variants: [{ id: `v-${n}`, title: '', options: [], sku: null, price: precio, compareAtPrice: null, available: stock > 0, stock: fisica ? stock : null, image: null, imageIndex: null }],
    metafields: {}, multiple: 1, wholesale: false, priceHidden: false, faq: [], related: [],
    createdAt: new Date(2026, 0, 40 - n).toISOString(),
  };
}

export const PRODUCTOS = [
  ...CATALOGO,
  // ---- E-book y cursos de relleno (digitales: sin stock ni envío). Precios en centésimos de peso uruguayo. ----
  producto('Somos Mitos', { tipo: 'E-book', precio: 59000 }),
  producto('Curso 01', { tipo: 'Curso', precio: 240000, extra: { Nivel: 'Inicial', 'Duración': '6 lecciones' } }),
  producto('Curso 02', { tipo: 'Curso', precio: 360000, extra: { Nivel: 'Intermedio', 'Duración': '10 lecciones' } }),
  producto('Curso 03', { tipo: 'Curso', precio: 480000, extra: { Nivel: 'Avanzado', 'Duración': '14 lecciones' } }),
];

const leccion = (i, total) => ({ id: `l${i}`, title: `Lección ${i} · título a definir`, section: i <= total / 2 ? 'Primera parte' : 'Segunda parte', locked: i > 1, preview: i === 1, done: false, embedUrl: null, videoUrl: null, html: i === 1 ? '<p>Esta es la vista previa de la primera lección. El contenido del curso se carga en el panel.</p>' : '', resources: [] });
export const CURSOS = PRODUCTOS.filter((p) => p.type === 'Curso').map((p, i) => {
  const total = [6, 10, 14][i];
  return {
    slug: p.handle, title: p.title,
    description: '<p>Descripción de ejemplo del curso: qué se aprende, para quién es y qué se necesita para empezar.</p>',
    lessonCount: total, access: false, progress: { done: 0, total },
    product: { handle: p.handle, variantId: p.variants[0].id, price: p.price, currency: p.currency, available: true, image: null },
    lessons: Array.from({ length: total }, (_, k) => leccion(k + 1, total)),
  };
});

export const INFO = {
  name: 'Walkiverso', currency: 'UYU', currencies: ['UYU'], exchangeRate: null, showConverted: false,
  logo: null, favicon: null, shareImage: null, colors: {},
  seo: { title: 'Walkiverso · Arte, Magia y Folklore', description: 'Criaturas y artefactos de fantasía oscura, nacidos del folklore, la mitología y la ficción.', noindex: false },
  analytics: {},
  // Redes de ejemplo: las reales se cargan en el panel → Contacto
  contact: { email: 'hola@ejemplo.com', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/', youtube: 'https://www.youtube.com/' },
  announcement: null, cookies: null, legal: [],
  menus: { main: [], footer: [] },
  modules: { accounts: true, courses: true },
};

export const CHECKOUT = {
  payments: [
    { method: 'mercadopago', label: 'Mercado Pago', online: true },
    { method: 'card', label: 'Tarjeta de crédito o débito', online: true },
    { method: 'abitab', label: 'Abitab', online: false },
    { method: 'redpagos', label: 'Redpagos', online: false },
    { method: 'paypal', label: 'PayPal', online: true },
  ],
  shipping: [
    { id: 'envio', name: 'Envío a todo Uruguay', priceCents: 25000, freeOverCents: 500000, description: 'Embalaje a medida para que llegue entera', pickup: false },
    { id: 'retiro', name: 'Retiro coordinado', priceCents: 0, freeOverCents: null, description: 'Te escribimos para coordinar', pickup: true },
  ],
  cupones: { MAGIA: 10 },   // código de prueba: 10 % de descuento
};

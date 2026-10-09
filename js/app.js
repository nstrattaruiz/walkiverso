// Walkiverso · arranque y rutas. Todos los datos salen de la tienda con el SDK: el cliente los cambia desde su panel.
// Rutas: /  ·  /tienda  ·  /categoria/:handle  ·  /producto/:handle  ·  /cursos  ·  /curso/:slug  ·  /walkiver  ·  /contacto
//        /favoritos  ·  /checkout  ·  /pedido  ·  /legal/:tipo  ·  /cuenta (módulo Cuentas de clientes)  ·  /walkurio (oculta: ver config.js)
import { tienda, esDemo } from './datos/tienda.js';
import { $, app, esc, estado, flecha, titular, rutaWeb, url } from './ui/util.js';
import { WALKURIO_PUBLICADO } from './config.js';
import { pintarMenus, pintarHablemos, pintarPie, pintarAviso, pintarCookies, marcarActivo } from './ui/marco.js';
import { iniciarCarrito } from './ui/carrito.js';
import { iniciarBuscador } from './ui/buscador.js';
import { iniciarFavoritos, favoritos } from './ui/favoritos.js';
import { abrirAcceso } from './ui/acceso.js';
import { iniciarTarjetas } from './anim/efectos.js';
import { polvoDeHadas } from './anim/polvo.js';
import { aplicarTextos } from './datos/textos.js';
import { inicio } from './paginas/inicio.js';
import { catalogoPagina } from './paginas/tienda.js';
import { ficha } from './paginas/ficha.js';
import { checkout, pedido } from './paginas/checkout.js';
import { academia, curso } from './paginas/academia.js';
import { walkiver, walkurio } from './paginas/walkiver.js';
import { contacto, legal } from './paginas/contacto.js';
import { cuenta } from './paginas/cuenta.js';

// ---------------------------------------------------------------- carga inicial
// La entrada se disipa cuando la primera página ya está dibujada (y pasó el tiempo mínimo para que el logo termine de emerger).
const sinCarga = document.documentElement.classList.contains('wk-sin-carga');
function abrirTelon() {
  const carga = $('#carga');
  if (!carga) return;
  try { sessionStorage.setItem('wk-visto', '1'); } catch { /* sin almacenamiento */ }
  carga.classList.add('is-abriendo');
  setTimeout(() => carga.remove(), sinCarga ? 0 : 1900);
}

async function arrancar() {
  const info = estado.info = await tienda.info();
  // Textos cargados en el panel (si la tienda los trae): reemplazan a los de fábrica antes de dibujar nada
  aplicarTextos(info.content?.texts);
  document.documentElement.classList.toggle('wk-demo', esDemo);
  // La demostración (fuera de la plataforma) no se ofrece a los buscadores
  if (esDemo) document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex, nofollow">');

  // Marca del panel: logo y favicon si están cargados (si no, los de la carpeta img/)
  if (info.logo) $('#marca').innerHTML = `<img src="${esc(info.logo)}" alt="${esc(info.name)}" height="40">`;
  if (info.favicon) $('#favicon').href = info.favicon;
  // SEO del panel: descripción, imagen al compartir y "no aparecer en Google"
  const meta = (attr, k, v) => { if (v) document.head.insertAdjacentHTML('beforeend', `<meta ${attr}="${k}" content="${esc(v)}">`); };
  meta('property', 'og:title', info.seo?.title);
  meta('property', 'og:description', info.seo?.description);
  meta('property', 'og:image', info.shareImage);
  if (info.seo?.noindex) meta('name', 'robots', 'noindex, nofollow');
  if (info.seo?.description) $('meta[name=description]').content = info.seo.description;

  if (info.modules?.accounts) {
    estado.cliente = await tienda.cuenta.yo().catch(() => null);
    tienda.cuenta.alCambiar((c) => { estado.cliente = c; pintarMenus(); });
  }
  pintarMenus();
  pintarHablemos();
  pintarPie();
  pintarAviso();
  pintarCookies();
  iniciarBuscador();
  iniciarFavoritos();
  iniciarTarjetas();
  polvoDeHadas();
  await iniciarCarrito();

  // Cambios de # dentro de la misma página (anclas) no vuelven a dibujar
  window.addEventListener('popstate', () => { if (location.pathname + location.search !== rutaActual) ruta(); });
  window.addEventListener('wk:ruta', ruta);
  await Promise.all([ruta(), new Promise((r) => setTimeout(r, sinCarga ? 0 : 2600))]);
  abrirTelon();
}

// ---------------------------------------------------------------- rutas
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const href = a.getAttribute('href');
  // Ingresar: ventana emergente, sin salir de la página en la que está el visitante
  if (href === '/cuenta' && estado.info.modules?.accounts && !estado.cliente) { abrirAcceso(); return; }
  const [camino, ancla] = href.split('#');
  // Mismo lugar con ancla (/#dudas estando en la portada): solo se baja hasta ahí
  if (ancla && camino === rutaWeb() + location.search) {
    history.pushState(null, '', url(href));
    document.getElementById(ancla)?.scrollIntoView();
    return;
  }
  if (href !== rutaWeb() + location.search + location.hash) history.pushState(null, '', url(href));
  ruta();
});

let rutaActual = '';
let turno = 0;
let limpiar = null;

async function ruta() {
  const mio = ++turno;
  rutaActual = location.pathname + location.search;
  const [seccion, valor] = rutaWeb().split('/').filter(Boolean).map(decodeURIComponent);
  const { info } = estado;
  limpiar?.();
  limpiar = null;
  if (!location.hash) window.scrollTo(0, 0);
  marcarActivo();
  document.body.dataset.pagina = seccion ?? 'inicio';
  // La barra es transparente solo sobre páginas que empiezan con un bloque oscuro
  document.body.dataset.tope = !seccion || seccion === 'tienda' || seccion === 'categoria' ? 'oscuro' : 'claro';
  let salida = null;
  try {
    if (!seccion) salida = await inicio();
    else if (seccion === 'tienda') salida = await catalogoPagina();
    else if (seccion === 'categoria' && valor) salida = await catalogoPagina(valor);
    else if (seccion === 'producto' && valor) await ficha(valor);
    else if (seccion === 'cursos') await academia();
    else if (seccion === 'curso' && valor) await curso(valor);
    else if (seccion === 'walkiver') await walkiver();
    else if (seccion === 'walkurio' && WALKURIO_PUBLICADO) walkurio();
    else if (seccion === 'contacto') contacto();
    else if (seccion === 'favoritos') await favoritos();
    else if (seccion === 'legal' && valor) await legal(valor);
    else if (seccion === 'checkout') await checkout();
    else if (seccion === 'pedido') await pedido(new URLSearchParams(location.search).get('pedido'));
    else if (seccion === 'cuenta' && info.modules?.accounts) await cuenta();
    else throw new Error('404');
  } catch (e) {
    if (mio !== turno) return;
    if (e.message !== '404') console.error(e);
    titular('No encontramos esta página');
    document.body.dataset.tope = 'oscuro';
    app.innerHTML = `<section class="wk-noche wk-pagina wk-seccion"><div class="wk-cont wk-vacio">
      <span class="wk-sobre">Camino sin salida</span>
      <h1 class="wk-titulo">Esta página se perdió en la niebla</h1>
      <a class="wk-btn wk-btn--luz" href="/tienda" data-link>Explorar tienda ${flecha}</a></div></section>`;
  }
  // Si el visitante cambió de página mientras esta cargaba, lo que haya quedado andando se detiene
  if (typeof salida === 'function') { if (mio === turno) limpiar = salida; else salida(); }
  if (mio === turno) app.focus({ preventScroll: true });
}

arrancar().catch((e) => {
  console.error(e);
  abrirTelon();
  app.innerHTML = '<section class="wk-noche wk-pagina wk-seccion"><div class="wk-cont wk-vacio"><h1 class="wk-titulo wk-titulo--m">No pudimos abrir la tienda</h1><p class="wk-bajada">Probá recargar la página en unos segundos.</p></div></section>';
});

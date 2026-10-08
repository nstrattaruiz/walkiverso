// Utilidades compartidas por toda la web.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const app = $('#app');

/** Lo que se sabe de la tienda y de quien ingresó. Lo carga js/app.js al arrancar. */
export const estado = { info: null, cliente: null };

/** Sin acentos y en minúsculas: para comparar textos (buscador, filtros, etiquetas). */
export const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Carpeta desde la que se sirve la web: '/' en la plataforma, '/<repositorio>/' en GitHub Pages. La fija index.html con <base>. */
export const BASE = new URL(document.baseURI).pathname;
/** La ruta de la web en la que está el visitante (/tienda, /producto/bjorn…), sin la carpeta base. */
export const rutaWeb = () => `/${location.pathname.slice(BASE.length)}`;
/** Dirección real de una ruta de la web (le suma la carpeta base). */
export const url = (href) => (href.startsWith('/') ? BASE.slice(0, -1) + href : href);

/** Ir a otra página de la web sin recargar. */
export function ir(href, { reemplazar = false } = {}) {
  history[reemplazar ? 'replaceState' : 'pushState'](null, '', url(href));
  window.dispatchEvent(new Event('wk:ruta'));
}

export const flecha = '<span class="wk-flecha" aria-hidden="true">→</span>';
export const icono = (id) => `<svg aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;
export const esExterno = (u) => /^(https?:|mailto:|tel:)/i.test(u);
export const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const punteroFino = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Título de la pestaña. */
export const titular = (t) => { document.title = t ? `${t} · ${estado.info?.name ?? 'Walkiverso'}` : (estado.info?.seo?.title || 'Walkiverso'); };

/** Atrapa el foco dentro de un panel abierto (carrito, buscador, modal). Devuelve la función para soltarlo. */
export function atraparFoco(panel) {
  const alTeclear = (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', panel).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const [primero, ultimo] = [f[0], f[f.length - 1]];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };
  panel.addEventListener('keydown', alTeclear);
  return () => panel.removeEventListener('keydown', alTeclear);
}

/**
 * Walkiverso · Ventas según el país
 * Fuera de Uruguay solo se venden cursos: marca <html data-wk-abroad> y bloquea la compra de
 * productos físicos ([data-wk-physical]). El país sale de:
 *   1. el mercado de Shopify (data-wk-country, lo pone el tema), y
 *   2. la ubicación del visitante, que Shopify estima por su conexión (browsing_context_suggestions).
 * La ubicación se consulta en cada página (así, al prender o apagar una VPN se actualiza enseguida);
 * lo guardado solo se usa para no esperar mientras llega la respuesta.
 * El pago igual está protegido: las zonas de envío son solo de Uruguay.
 */
const HOME = 'UY';
const CACHE_KEY = 'wk:pais';
const html = document.documentElement;

const marketCountry = (html.dataset.wkCountry || '').toUpperCase();
const isAbroad = (country) => Boolean(country) && country.toUpperCase() !== HOME;

/** Afuera si el mercado elegido no es Uruguay, o si la ubicación detectada no es Uruguay */
const apply = (detected) => {
  if (isAbroad(marketCountry) || isAbroad(detected)) {
    html.setAttribute('data-wk-abroad', (isAbroad(detected) ? detected : marketCountry).toUpperCase());
  } else {
    html.removeAttribute('data-wk-abroad');
  }
};

let cached = null;
try {
  cached = sessionStorage.getItem(CACHE_KEY);
} catch {
  /* sin almacenamiento */
}
apply(cached);

fetch('/browsing_context_suggestions.json?country[enabled]=true', { headers: { Accept: 'application/json' }, cache: 'no-store' })
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => {
    const country = data?.detected_values?.country?.handle;
    if (!country) return;
    try {
      sessionStorage.setItem(CACHE_KEY, country);
    } catch {
      /* sin almacenamiento */
    }
    apply(country);
  })
  .catch(() => {});

// Aunque se quite el estilo, no se puede agregar al carrito un producto físico desde afuera
const block = (event) => {
  if (!html.hasAttribute('data-wk-abroad')) return;
  const target = event.target instanceof Element ? event.target : null;
  const physical = target?.closest('[data-wk-physical]');
  if (!physical) return;
  const isBuy = event.type === 'submit' || target.closest('[data-wk-add], button[name="add"], [type="submit"]');
  if (!isBuy) return;
  event.preventDefault();
  event.stopImmediatePropagation();
};

window.addEventListener('click', block, true);
window.addEventListener('submit', block, true);

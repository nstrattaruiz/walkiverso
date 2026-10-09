// Walkiver en la plataforma: conecta la copia estática de Walkiver con los datos de la tienda.
// - Formularios de contacto → tienda.contacto (el mensaje llega al panel).
// - Precio del e-book → sale del producto "somos-mitos-ebook" de la tienda.
// - "Comprar" lleva a /carrito/agregar/<producto>:1 (lo resuelve la web del Walkiverso y abre el carrito).
let tienda;
try { ({ tienda } = await import('/api/v1/sdk.js')); } catch { ({ tienda } = await import(new URL('../js/demo/sdk-demo.js', import.meta.url).href)); }

const EBOOK = 'somos-mitos-ebook';

// Textos e imágenes cambiados en el panel ("Textos de la web", grupos "Walkiver · …"): reemplazan a los de la página.
// Dónde está cada uno, en campos.js. Lo que no se cambió queda como está en la copia.
const { GRUPOS_WALKIVER } = await import('./campos.js');
const { aHtml } = await import('../js/datos/textos.js');
function aplicarTextos(textos) {
  if (!textos) return;
  for (const c of GRUPOS_WALKIVER.flatMap((g) => g.campos)) {
    const v = textos[c.clave];
    if (typeof v !== 'string' || !v.trim()) continue;
    const todos = [...document.querySelectorAll(c.sel)];
    for (const el of c.todos ? todos : [todos[c.n]].filter(Boolean)) {
      if (c.tipo === 'ruta') { el.src = v.trim(); el.removeAttribute('srcset'); }
      else if (c.tipo === 'titulo' || c.tipo === 'parrafos') el.innerHTML = aHtml[c.tipo](v);
      else {
        // Solo el texto: los íconos y los números que acompañan (flechas, puntos) quedan como están
        const nodo = [...el.childNodes].find((x) => x.nodeType === 3 && x.textContent.trim());
        if (nodo) nodo.textContent = nodo.textContent.replace(/\S(?:[\s\S]*\S)?/, v.trim()); else el.prepend(v.trim());
      }
    }
  }
}
tienda.info().then((i) => aplicarTextos(i.content?.texts)).catch(() => {});

// En GitHub Pages la web vive en una subcarpeta (/repo): los enlaces absolutos (/tienda, /walkiver/…) se ajustan
const BASE = /\.github\.io$/.test(location.hostname) ? `/${location.pathname.split('/')[1]}` : '';
if (BASE) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="/"]');
    if (!a || a.getAttribute('href').startsWith(`${BASE}/`) || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    location.href = BASE + a.getAttribute('href');
  });
}

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-wk-form="contact"]');
  if (!form) return;
  e.preventDefault();
  const datos = {};
  for (const [k, v] of new FormData(form)) {
    const campo = /^contact\[(.+)\]$/.exec(k)?.[1] ?? k;
    if (campo === 'email') datos.email = v;
    else if (campo === 'body') datos.message = v;
    else if (/nombre|name/i.test(campo)) datos.name = v;
    else datos[campo] = v;
  }
  datos.origen = 'Walkiver';
  const boton = form.querySelector('[type=submit]');
  boton.disabled = true;
  form.querySelector('.wkv-form__ok, .wkv-form__error')?.remove();
  try {
    await tienda.contacto(datos);
    form.insertAdjacentHTML('afterbegin', `<p class="wkv-form__ok" role="status"><span>${form.dataset.ok}</span></p>`);
    form.reset();
  } catch (err) {
    form.insertAdjacentHTML('afterbegin', `<div class="wkv-form__error" role="alert">${String(err.message).replace(/</g, '&lt;')}</div>`);
  }
  boton.disabled = false;
});

const precios = document.querySelectorAll('[data-wk-precio]');
if (precios.length) {
  tienda.productos.uno(EBOOK).then((p) => {
    precios.forEach((el) => { el.textContent = tienda.formatear(p.price, p.currency); });
    if (p.compareAtPrice > p.price) {
      precios.forEach((el) => el.closest('.wkv-price__row')?.insertAdjacentHTML('afterbegin', `<s>${tienda.formatear(p.compareAtPrice, p.currency)}</s>`));
    }
  }).catch(() => {
    // Sin el producto cargado en la tienda: se esconde el precio en pesos
    precios.forEach((el) => el.closest('.wkv-price__row')?.setAttribute('hidden', ''));
  });
}

// Linterna: una luz grande y difuminada que sigue al mouse por toda la página (sin punto en el centro).
// Usa las coordenadas que ya actualiza wkv.js (--wkv-lx / --wkv-ly).
document.head.insertAdjacentHTML('beforeend', `<style>
  @media (hover: hover) and (pointer: fine) {
    .wkv-lantern {
      background:
        radial-gradient(460px circle at var(--wkv-lx, 50%) var(--wkv-ly, -40%), rgb(146 210 245 / 0.13), rgb(146 210 245 / 0.06) 40%, rgb(146 210 245 / 0.02) 65%, transparent 80%),
        radial-gradient(1300px circle at var(--wkv-lx, 50%) var(--wkv-ly, -40%), transparent 35%, rgb(0 6 30 / 0.22) 100%) !important;
      mix-blend-mode: normal !important;
      filter: blur(12px);
    }
  }
</style>`);

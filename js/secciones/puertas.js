// Sección "Las creaciones": dos puertas vivas a la tienda. Cada una va mostrando sus piezas de fondo,
// se abre al acercarse y deja entrar directo por especie o por pieza.
import { $$, esc, flecha } from '../ui/util.js';
import { precio } from '../datos/modelo.js';
import { arte, hrefPieza } from '../ui/tarjeta.js';
import { CREACIONES } from '../contenido.js';

const plural = (t) => (/[sz]$/i.test(t) ? t : `${t}s`);

function puerta(clave, tipo, piezas, i) {
  const t = CREACIONES[clave];
  const libres = piezas.filter((x) => x.available);
  const muestra = (libres.length ? libres : piezas).slice(0, 3);
  const especies = [...new Set(piezas.map((x) => x.species).filter(Boolean))].slice(0, 5);
  const vacia = { name: t.titulo, tipo, handle: clave };
  return `
  <article class="wk-puerta${t.imagen ? ' wk-puerta--foto' : ''}" data-puerta${t.imagen ? ' data-fija' : ''} data-ver style="--d:${i}">
    <div class="wk-puerta__fondo" aria-hidden="true">
      ${t.imagen
        // Con foto propia: la foto queda fija y, al mirar una pieza de la lista, aparece la foto de esa pieza (si tiene)
        ? `<img class="wk-puerta__foto" src="${esc(encodeURI(t.imagen))}" alt="" loading="lazy" decoding="async">${muestra.map((pz, k) => (pz.image ? `<span class="wk-puerta__capa" data-capa="${k}">${arte(pz, { ancho: 1024, sizes: '(max-width: 750px) 100vw, 60vw' })}</span>` : '')).join('')}`
        : (muestra.length ? muestra : [vacia]).map((pz, k) => `<span class="wk-puerta__capa${k === 0 ? ' is-activa' : ''}" data-capa="${k}">${arte(pz, { ancho: 1024, sizes: '(max-width: 750px) 100vw, 60vw' })}</span>`).join('')}
    </div>
    ${muestra.length && !t.imagen ? `<p class="wk-puerta__ahora" aria-hidden="true"><i></i><span data-ahora>${esc(muestra[0].name)}</span></p>` : ''}
    <div class="wk-puerta__cuerpo">
      ${libres.length ? `<span class="wk-sobre">${libres.length} disponible${libres.length === 1 ? '' : 's'}</span>` : ''}
      <h3 class="wk-puerta__titulo">${esc(t.titulo)}</h3>
      <p class="wk-puerta__bajada">${esc(t.texto)}</p>
      <div class="wk-puerta__mas">
        <div>
          ${especies.length ? `<div class="wk-chips">${especies.map((e) => `<a class="wk-chip" href="/tienda?especie=${encodeURIComponent(e)}" data-link>${esc(tipo === 'criatura' ? plural(e) : e)}</a>`).join('')}</div>` : ''}
          ${muestra.length ? `<ul class="wk-puerta__piezas">${muestra.map((pz, k) => `<li><a href="${hrefPieza(pz)}" data-link data-mira="${k}">
            <span class="wk-puerta__mini">${arte(pz, { ancho: 320, sizes: '56px' })}</span>
            <span><strong>${esc(pz.name)}</strong><small>${esc(pz.especieTexto || pz.type)} · ${precio(pz)}</small></span></a></li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <a class="wk-btn wk-btn--luz" href="/tienda?tipo=${tipo}" data-link>${esc(t.cta)} ${flecha}</a>
    </div>
  </article>`;
}

export const puertas = (criaturas, artefactos) => `<div class="wk-puertas">${puerta('criaturas', 'criatura', criaturas, 0)}${puerta('artefactos', 'artefacto', artefactos, 1)}</div>`;

/** El fondo de cada puerta pasa de pieza en pieza; al mirar una pieza de la lista, se muestra esa. @returns función para detenerlo. */
export function activarPuertas() {
  // Al pasar de una puerta a la otra se cruza el espacio entre las dos: si dependiera solo del hover, las dos
  // volverían a su tamaño por un instante. Se guarda cuál está activa y recién se suelta al salir de la sección.
  const todas = $$('[data-puerta]');
  const marco = todas[0]?.parentElement;
  const activar = (cual) => todas.forEach((p) => p.classList.toggle('is-activa', p === cual));
  todas.forEach((p) => { p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') activar(p); }); p.addEventListener('focusin', () => activar(p)); });
  marco?.addEventListener('pointerleave', () => activar(null));
  marco?.addEventListener('focusout', (e) => { if (!marco.contains(e.relatedTarget)) activar(null); });

  const relojes = todas.map((el, n) => {
    const capas = $$('[data-capa]', el);
    const nombres = $$('[data-mira] strong', el).map((s) => s.textContent);
    const ahora = el.querySelector('[data-ahora]');
    const fija = el.hasAttribute('data-fija');   // tiene foto propia: no rota
    let i = 0, fijo = false;
    const ver = (k) => {
      i = k;
      capas.forEach((c) => c.classList.toggle('is-activa', Number(c.dataset.capa) === k));
      if (ahora && nombres[k]) ahora.textContent = nombres[k];
    };
    $$('[data-mira]', el).forEach((a) => {
      const k = Number(a.dataset.mira);
      a.addEventListener('pointerenter', () => { fijo = true; ver(k); });
      a.addEventListener('focus', () => { fijo = true; ver(k); });
      a.addEventListener('pointerleave', () => { fijo = false; if (fija) ver(-1); });
      a.addEventListener('blur', () => { fijo = false; if (fija) ver(-1); });
    });
    if (fija || capas.length < 2) return 0;
    // Las dos puertas cambian a destiempo para que no parpadeen juntas
    return setInterval(() => { if (!fijo && !document.hidden) ver((i + 1) % capas.length); }, 3400 + n * 700);
  });
  return () => relojes.forEach(clearInterval);
}

// Courses · Academia Walkiverso: una oferta educativa con su propio lugar, separada de la tienda y del universo narrativo.
// Los cursos salen del módulo Cursos del panel; nivel y duración, de las características de su producto.
import { $, $$, app, esc, estado, flecha, ir, titular } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { catalogo } from '../datos/modelo.js';
import { arte, grilla } from '../ui/tarjeta.js';
import { abrirCarrito } from '../ui/carrito.js';
import { aparecer } from '../anim/efectos.js';
import { raices } from '../ui/piezas.js';
import { ACADEMIA } from '../contenido.js';

const textoDe = (html) => { const d = document.createElement('div'); d.innerHTML = html ?? ''; return d.textContent.trim(); };

/** Tarjeta de un curso. `piezas` es el catálogo: de ahí salen la imagen, el nivel y la duración. */
export function tarjetaCurso(c, piezas, i = 0) {
  const pz = piezas.find((x) => x.handle === c.product?.handle);
  const datos = [pz?.nivel, pz?.duracion || `${c.lessonCount} lecciones`].filter(Boolean);
  return `
  <article class="wk-curso" data-ver style="--d:${i % 3}">
    <a href="/curso/${encodeURIComponent(c.slug)}" data-link aria-label="${esc(`Ver curso: ${c.title}`)}">
      <div class="wk-curso__imagen">${arte(pz ?? { name: c.title, tipo: 'curso', handle: c.slug }, { sizes: '(max-width: 750px) 100vw, 33vw' })}</div>
      <div class="wk-curso__info">
        <p class="wk-curso__datos">${datos.map((d) => `<span>${esc(d)}</span>`).join('')}</p>
        <h3 class="wk-titulo wk-titulo--s">${esc(c.title)}</h3>
        <p class="wk-curso__texto">${esc(textoDe(c.description))}</p>
        <div class="wk-card__pie">
          <span class="wk-card__precio">${c.access ? 'Ya es tuyo' : c.product ? tienda.formatear(c.product.price, c.product.currency) : ''}</span>
          <span class="wk-card__cta">Ver curso ${flecha}</span>
        </div>
      </div>
    </a>
  </article>`;
}

export async function academia() {
  titular(ACADEMIA.titulo);
  const [lista, piezas] = await Promise.all([
    estado.info.modules?.courses ? tienda.cursos.listar().catch(() => []) : [],
    catalogo().catch(() => []),
  ]);
  const ebooks = piezas.filter((x) => x.tipo === 'ebook');
  app.innerHTML = `
    <section class="wk-academia wk-cielo wk-pagina">
      <span class="wk-ramas wk-academia__rama" aria-hidden="true"></span>
      <div class="wk-cont wk-academia__cab">
        <span class="wk-sobre" data-ver>${esc(ACADEMIA.titulo)}</span>
        <h1 class="wk-titulo" data-ver style="--d:1">${esc(ACADEMIA.subtitulo)}</h1>
        <p class="wk-bajada" data-ver style="--d:2">${esc(ACADEMIA.texto)}</p>
      </div>
    </section>
    <section class="wk-seccion wk-blanco wk-con-raices" id="cursos">
      ${raices()}
      <div class="wk-cont">
        <header class="wk-cab" data-ver><span class="wk-sobre">Cursos</span><h2 class="wk-titulo wk-titulo--m">Aprendé a tu ritmo</h2></header>
        ${lista.length
          ? `<div class="wk-cursos">${lista.map((c, i) => tarjetaCurso(c, piezas, i)).join('')}</div>`
          : '<p class="wk-bajada">Muy pronto: los primeros cursos del taller están en preparación.</p>'}
      </div>
    </section>
    ${ebooks.length ? `
    <section class="wk-seccion wk-papel" id="ebooks">
      <div class="wk-cont">
        <header class="wk-cab" data-ver><span class="wk-sobre">E-books</span><h2 class="wk-titulo wk-titulo--m">Para leer el universo</h2></header>
        ${grilla(ebooks)}
      </div>
    </section>` : ''}`;
  aparecer(app);
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

/** Un curso: presentación y compra para quien todavía no lo tiene; lecciones y avance para quien sí. */
export async function curso(slug, abierta) {
  const c = await tienda.cursos.uno(slug);
  const { cliente, info } = estado;
  titular(c.title);
  const actual = c.lessons.find((l) => l.id === abierta && !l.locked) ?? c.lessons.find((l) => !l.locked && !l.done) ?? c.lessons.find((l) => !l.locked);
  let seccion = null;
  app.innerHTML = `
    <section class="wk-blanco wk-pagina wk-seccion">
      <div class="wk-cont wk-leccion">
        <div class="wk-leccion__ver">
          <a class="wk-migas" href="/cursos" data-link>← Academia Walkiverso</a>
          <h1 class="wk-titulo wk-titulo--m">${esc(c.title)}</h1>
          ${!c.access ? `<div class="wk-leccion__compra wk-noche">
            <div><strong>${c.product ? `Curso completo · ${tienda.formatear(c.product.price, c.product.currency)}` : 'Este curso no está a la venta por ahora'}</strong>
              <p class="wk-nota">${c.lessonCount} lecciones${!cliente && info.modules?.accounts ? ' · Para comprarlo necesitás ingresar a tu cuenta: ahí lo vas a ver.' : ''}</p></div>
            ${c.product?.variantId && c.product.available ? `<button class="wk-btn" id="comprar">${cliente || !info.modules?.accounts ? 'Sumarme al curso' : 'Ingresar y comprar'} ${flecha}</button>` : ''}
            <p class="wk-error" id="curso-error" role="alert"></p>
          </div>` : ''}
          <div class="wk-prosa">${c.description ?? ''}</div>
          ${actual ? `<h2 class="wk-titulo wk-titulo--s">${esc(actual.title)}</h2>
            ${actual.embedUrl ? `<div class="wk-video"><iframe src="${esc(actual.embedUrl)}" title="${esc(actual.title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`
              : actual.videoUrl ? `<p><a class="wk-btn wk-btn--tinta" href="${esc(actual.videoUrl)}" target="_blank" rel="noopener">Ver el video</a></p>` : ''}
            <div class="wk-prosa">${actual.html || ''}</div>
            ${actual.resources?.length ? `<p class="wk-botones">${actual.resources.map((r) => `<a class="wk-btn wk-btn--linea" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>`).join('')}</p>` : ''}
            ${c.access ? `<p><button class="wk-btn wk-btn--tinta" id="vista">${actual.done ? 'Marcar como no vista' : 'Marcar como vista y seguir'}</button></p>` : ''}` : ''}
        </div>
        <nav class="wk-temario" aria-label="Lecciones">
          ${c.access ? `<p class="wk-nota">${c.progress.done} de ${c.progress.total} lecciones vistas</p>` : ''}
          ${c.lessons.map((l, i) => `${l.section && l.section !== seccion ? `<strong>${esc(seccion = l.section)}</strong>` : ''}
            <button type="button" data-leccion="${esc(l.id)}"${l.locked ? ' disabled' : ''}${l.id === actual?.id ? ' aria-current="true"' : ''}>
              <span>${l.done ? '✓' : i + 1}</span><b>${esc(l.title)}</b>${l.locked ? '<small>Con el curso</small>' : l.preview && !c.access ? '<small>Vista previa</small>' : ''}</button>`).join('')}
        </nav>
      </div>
    </section>`;
  $$('[data-leccion]').forEach((b) => b.addEventListener('click', () => { curso(slug, b.dataset.leccion); window.scrollTo(0, 0); }));
  $('#vista')?.addEventListener('click', async () => {
    await tienda.cursos.avance(slug, actual.id, !actual.done);
    const sig = c.lessons[c.lessons.findIndex((l) => l.id === actual.id) + 1];
    curso(slug, actual.done ? actual.id : sig?.id);
    window.scrollTo(0, 0);
  });
  $('#comprar')?.addEventListener('click', async () => {
    if (!cliente && info.modules?.accounts) { ir('/cuenta'); return; }
    try { await tienda.carrito.agregar(c.product.variantId, 1); abrirCarrito(); } catch (e) { $('#curso-error').textContent = e.message; }
  });
}

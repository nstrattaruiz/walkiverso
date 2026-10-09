// Product Detail · la ficha de una pieza: se entra como a la ficha de una criatura.
import { $, $$, app, esc, estado, flecha, icono, ir, titular } from '../ui/util.js';
import { tienda } from '../datos/tienda.js';
import { pieza, obras, NOMBRE, porDisponibilidad } from '../datos/modelo.js';
import { arte, insignia, fila } from '../ui/tarjeta.js';
import { corazon } from '../ui/favoritos.js';
import { abrirCarrito } from '../ui/carrito.js';
import { abrirModal, faq, raices } from '../ui/piezas.js';
import { aparecer } from '../anim/efectos.js';
import { FICHA } from '../contenido.js';

const certificado = (pz) => abrirModal(`
  <div class="wk-certificado">
    <span class="wk-certificado__sello">${icono('i-sello')}</span>
    <span class="wk-sobre">Walkiverso</span>
    <h2 class="wk-titulo wk-titulo--s">Certificado de autenticidad</h2>
    <p class="wk-nota">Cada obra viaja con su certificado. Esto es lo que lleva el de ${esc(NOMBRE[pz.tipo].esta)}:</p>
    <dl>
      <div><dt>Nombre</dt><dd>${esc(pz.name)}</dd></div>
      <div><dt>Número de obra</dt><dd>${pz.number ? `N.º ${esc(pz.number)}` : 'Se asigna al entregarla'}</dd></div>
      <div><dt>Materiales</dt><dd>${pz.materials.length ? esc(pz.materials.join(', ')) : 'Detallados en el certificado'}</dd></div>
      <div><dt>Firma</dt><dd><span class="wk-certificado__firma">Walkiver</span></dd></div>
      <div><dt>Sello</dt><dd>Sello de Walkiverso</dd></div>
    </dl>
  </div>`, { titulo: 'Certificado de autenticidad' });

export async function ficha(handle) {
  const p = await tienda.productos.uno(handle);
  const pz = pieza(p);
  const n = NOMBRE[pz.tipo];
  const esObra = pz.tipo === 'criatura' || pz.tipo === 'artefacto';
  titular(pz.name);

  const elegido = [...(p.variants.find((v) => v.available)?.options ?? p.variants[0]?.options ?? [])];
  const variante = () => p.variants.find((v) => (v.options ?? []).every((x, i) => x === elegido[i])) ?? null;
  const fotos = pz.images.length ? pz.images : [null];
  const meta = [pz.especieTexto, pz.technique].filter(Boolean);
  const volver = pz.tipo === 'criatura' || pz.tipo === 'artefacto' ? `/tienda?tipo=${pz.tipo}` : '/cursos';

  app.innerHTML = `
    <section class="wk-ficha wk-blanco wk-pagina wk-con-raices">
      ${raices()}
      <div class="wk-cont wk-ficha__grilla">
        <div class="wk-ficha__galeria">
          <div class="wk-ficha__principal" id="principal" data-inclina>${arte(pz, { img: fotos[0], ancho: 1024, sizes: '(max-width: 900px) 100vw, 50vw', perezosa: false })}</div>
          ${fotos.length > 1 || p.video ? `<div class="wk-ficha__miniaturas" role="group" aria-label="Galería de ${esc(pz.name)}">
            ${fotos.map((f, i) => `<button type="button" data-foto="${i}" aria-label="Ver foto ${i + 1} de ${fotos.length}" aria-pressed="${i === 0}">${arte(pz, { img: f, ancho: 320, sizes: '90px' })}</button>`).join('')}
            ${p.video ? `<button type="button" data-video aria-label="Ver el video de ${esc(pz.name)}"><img src="${esc(p.video.thumbnail)}" alt="" loading="lazy"><span aria-hidden="true">▶</span></button>` : ''}
          </div>` : ''}
        </div>

        <div class="wk-ficha__info">
          <nav class="wk-migas" aria-label="Estás en"><a href="/tienda" data-link>Tienda</a><span aria-hidden="true">/</span><a href="${volver}" data-link>${esc(pz.tipo === 'criatura' ? 'Criaturas' : pz.tipo === 'artefacto' ? 'Artefactos' : 'Academia')}</a></nav>
          <div class="wk-ficha__insignias">${insignia(pz, { conWalkiverso: true })}</div>
          <h1 class="wk-titulo">${esc(pz.name)}</h1>
          ${meta.length ? `<p class="wk-ficha__meta">${meta.map((m, i) => `<span${i ? ' class="wk-ficha__tecnica"' : ''}>${esc(m)}</span>`).join('')}</p>` : ''}

          <div class="wk-ficha__compra">
          ${pz.available ? `
            <div class="wk-ficha__cabeza">
              <p class="wk-ficha__precio" id="precio"></p>
              <p class="wk-ficha__estado"><i aria-hidden="true"></i><span id="estado"></span></p>
            </div>
            ${p.options.map((o, i) => `<div class="wk-opcion"><strong>${esc(o.name)}</strong>
              <div data-opcion="${i}">${o.values.map((v) => `<button type="button" class="wk-chip${o.colors?.[v] ? ' wk-chip--color' : ''}" ${o.colors?.[v] ? `style="--color:${esc(o.colors[v])}" title="${esc(v)}" aria-label="${esc(v)}"` : ''} aria-pressed="${v === elegido[i]}" data-valor="${esc(v)}">${o.colors?.[v] ? '' : esc(v)}</button>`).join('')}</div></div>`).join('')}
            <div class="wk-ficha__accion">
              <button type="button" class="wk-btn wk-btn--luz wk-btn--grande wk-btn--ancho" id="agregar">${esc(n.adquirir)}</button>
              ${esObra ? corazon(pz, 'wk-fav--ficha') : ''}
            </div>
            <p class="wk-error" id="error" role="alert"></p>` : `
            <div class="wk-ficha__hogar">
              <p class="wk-display">${esc(n.hogar)}</p>
              <a class="wk-btn wk-btn--luz" href="${volver}" data-link>Ver ${esc(n.otras)} ${flecha}</a>
              ${pz.isWalkiverso && pz.variantId ? `
              <form class="wk-form wk-ficha__avisame" id="avisame">
                <label class="wk-campo">Las piezas Walkiverso vuelven a tomar forma cada cierto tiempo. ¿Te avisamos?
                  <span class="wk-pegado"><input name="email" type="email" placeholder="Tu email" required autocomplete="email" value="${esc(estado.cliente?.email ?? '')}"><button class="wk-btn wk-btn--linea">Avisarme</button></span></label>
                <p role="status" class="wk-ok"></p>
              </form>` : ''}
            </div>`}
            ${esObra ? `<ul class="wk-ficha__garantias">
              <li>${icono('i-pin')}<span>${esc(FICHA.envios)}</span></li>
              <li>${icono('i-bag')}<span>${esc(FICHA.pagos)}</span></li>
              <li>${icono('i-ojo')}<span>${esc(FICHA.taller)}</span></li>
            </ul>` : ''}
          </div>

          ${pz.certificate ? `<button type="button" class="wk-ficha__cert" id="certificado">${icono('i-sello')}<span>${esc(FICHA.certificado)}</span><b>Ver ${flecha}</b></button>` : ''}

          <div class="wk-prosa wk-ficha__descripcion">${pz.description}</div>

          <dl class="wk-datos">
            ${pz.type ? `<div><dt>Tipo</dt><dd>${esc(pz.type)}</dd></div>` : ''}
            ${pz.species ? `<div><dt>${pz.tipo === 'criatura' ? 'Especie' : 'Clase'}</dt><dd>${esc(pz.species)}</dd></div>` : ''}
            ${esObra ? `<div><dt>Tipo de pieza</dt><dd>${pz.isUnique ? 'Pieza única (OOAK)' : 'Pieza Walkiverso'}</dd></div>` : ''}
            ${pz.technique ? `<div><dt>Técnica</dt><dd>${esc(pz.technique)}</dd></div>` : ''}
            ${pz.materials.length ? `<div><dt>Materiales</dt><dd>${esc(pz.materials.join(', '))}</dd></div>` : ''}
            ${pz.nivel ? `<div><dt>Nivel</dt><dd>${esc(pz.nivel)}</dd></div>` : ''}
            ${pz.duracion ? `<div><dt>Duración</dt><dd>${esc(pz.duracion)}</dd></div>` : ''}
          </dl>
        </div>
      </div>
    </section>

    ${pz.story || esObra ? `
    <section class="wk-seccion wk-cielo wk-historia wk-con-raices">
      ${raices()}
      <div class="wk-cont wk-historia__grilla">
        ${pz.story ? `<div data-ver><span class="wk-sobre">Su historia</span><p class="wk-historia__texto wk-display">${esc(pz.story)}</p></div>` : ''}
        ${esObra ? `<aside class="wk-historia__cuidados" data-ver style="--d:1"><h2 class="wk-titulo wk-titulo--s">${esc(FICHA.cuidadosTitulo)}</h2><p>${esc(FICHA.cuidados)}</p><a class="wk-enlace" href="/#dudas" data-link>Más dudas frecuentes ${flecha}</a></aside>` : ''}
      </div>
    </section>` : ''}

    ${p.video ? `<section class="wk-seccion wk-seccion--corta wk-blanco"><div class="wk-cont wk-cont--angosto"><div class="wk-video${p.video.vertical ? ' wk-video--vertical' : ''}" id="video"><iframe src="${esc(p.video.embedUrl)}" title="Video de ${esc(pz.name)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div></section>` : ''}
    ${p.faq?.length ? `<section class="wk-seccion wk-blanco"><div class="wk-cont wk-cont--angosto"><header class="wk-cab"><h2 class="wk-titulo wk-titulo--m">Sobre ${esc(n.esta)}</h2></header>${faq(p.faq.map((x) => ({ q: x.q, a: `<p>${esc(x.a)}</p>` })), 'faq-pieza')}</div></section>` : ''}
    <div id="otras"></div>`;

  // ---- galería
  $$('[data-foto]').forEach((b) => b.addEventListener('click', () => {
    $('#principal').innerHTML = arte(pz, { img: fotos[Number(b.dataset.foto)], ancho: 1024, sizes: '(max-width: 900px) 100vw, 50vw', perezosa: false });
    $$('[data-foto]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('[data-video]')?.addEventListener('click', () => $('#video')?.scrollIntoView({ block: 'center' }));

  // ---- compra
  const actualizar = () => {
    if (!pz.available) return;
    const v = variante();
    const boton = $('#agregar');
    boton.disabled = !v?.available;
    boton.textContent = !v ? 'Elegí una opción' : v.available ? n.adquirir : 'No disponible';
    if (p.priceHidden) { boton.disabled = false; boton.textContent = 'Ingresá para ver el precio'; }
    $('#precio').innerHTML = p.priceHidden || v?.price == null ? '' : `${tienda.formatear(v.price, p.currency)}${v.compareAtPrice > v.price ? `<s>${tienda.formatear(v.compareAtPrice, p.currency)}</s>` : ''}`;
    const stock = v?.stock ?? null;
    $('#estado').textContent = !esObra ? 'Disponible · acceso digital'
      : pz.isUnique ? 'Disponible · existe una sola'
        : stock === 1 ? 'Disponible · queda 1' : stock !== null && stock <= 3 ? `Disponible · quedan ${stock}` : 'Disponible';
    if (v?.imageIndex != null) $(`[data-foto="${v.imageIndex}"]`)?.click();
  };
  $$('[data-opcion]').forEach((grupo) => grupo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-valor]');
    if (!b) return;
    elegido[Number(grupo.dataset.opcion)] = b.dataset.valor;
    $$('button', grupo).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    actualizar();
  }));
  $('#agregar')?.addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    if (p.priceHidden) { ir('/cuenta'); return; }
    $('#error').textContent = '';
    boton.disabled = true;
    try { await tienda.carrito.agregar(variante().id, p.multiple > 1 ? p.multiple : 1); abrirCarrito(); }
    catch (err) { $('#error').textContent = err.message; }
    boton.disabled = false;
  });
  $('#avisame')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const estadoEl = e.target.querySelector('[role=status]');
    try {
      await tienda.productos.avisarme(p.handle, pz.variantId, e.target.email.value, `/producto/${p.handle}`);
      estadoEl.textContent = '¡Listo! Te escribimos apenas vuelva.';
    } catch (err) { estadoEl.textContent = err.message; }
  });
  $('#certificado')?.addEventListener('click', () => certificado(pz));
  actualizar();
  aparecer(app);

  // ---- otras piezas del mismo tipo (o las que el panel marcó como "combina con")
  if (esObra) {
    const relacionadas = p.related?.length ? p.related.map(pieza) : (await obras()).filter((x) => x.tipo === pz.tipo && x.handle !== pz.handle).sort(porDisponibilidad);
    const caja = $('#otras');
    if (caja && relacionadas.length) {
      caja.innerHTML = `<section class="wk-seccion wk-blanco"><div class="wk-cont">
        <header class="wk-cab wk-cab--fila" data-ver><h2 class="wk-titulo wk-titulo--m">${pz.tipo === 'criatura' ? 'Otras criaturas' : 'Otros artefactos'}</h2><a class="wk-enlace" href="${volver}" data-link>Ver ${pz.tipo === 'criatura' ? 'todas' : 'todos'} ${flecha}</a></header>
        ${fila(relacionadas.slice(0, 4))}</div></section>`;
      aparecer(caja);
    }
  }
}

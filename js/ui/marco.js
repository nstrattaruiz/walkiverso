// Header, Navigation y Footer: lo que rodea a todas las páginas. Menús, contacto, aviso y cookies salen del panel.
import { $, $$, esc, estado, icono, esExterno, rutaWeb } from './util.js';
import { MENU_BASE, WALKURIO_PUBLICADO } from '../config.js';
import { PIE, FAQ } from '../contenido.js';
import { acordeon } from './piezas.js';
import { aparecer } from '../anim/efectos.js';

/** Cada enlace del menú dice qué es; acá se decide la ruta de esta web. */
const hrefDe = (l) => ({ category: `/categoria/${l.handle}`, product: `/producto/${l.handle}`, catalog: '/tienda', home: '/' })[l.kind] ?? l.url ?? '/';
const enlace = (l, extra = '') => {
  const href = hrefDe(l);
  return `<a href="${esc(href)}"${esExterno(href) ? ' target="_blank" rel="noopener"' : ' data-link'}${extra}>`;
};
// Walkurio existe en la arquitectura pero no se muestra hasta que config.js lo publique
const publicado = (l) => WALKURIO_PUBLICADO || !/^\/walkurio/i.test(hrefDe(l));

export function pintarMenus() {
  const { info, cliente } = estado;
  const base = (info.menus?.main?.length ? info.menus.main : MENU_BASE).filter(publicado);
  // Cuenta (módulo Cuentas de clientes): a la derecha de la barra, y también en el menú grande
  const cuenta = info.modules?.accounts ? { label: cliente ? 'Mi cuenta' : 'Ingresar', kind: 'url', url: '/cuenta', children: [] } : null;
  const main = [...base.filter((l) => l.url !== '/cuenta'), ...(cuenta ? [cuenta] : [])];
  // Barra del medio: lo que tiene ramificaciones (por ejemplo, las categorías de la tienda) se despliega debajo
  $('#nav').innerHTML = base.filter((l) => l.url !== '/cuenta').map((l, i) => {
    const hijos = l.children?.filter(publicado) ?? [];
    // La Tienda despliega su menú grande (especies agrupadas, con foto y cantidad, y la pieza más nueva)
    if (hrefDe(l) === '/tienda') return `<div class="wk-nav-item wk-nav-item--mega">${enlace(l)}${esc(l.label)}</a>
      <button type="button" class="wk-nav-abrir" aria-expanded="false" aria-controls="nav-mega" aria-label="Ver lo que hay en ${esc(l.label)}">${CHEVRON}</button>
      <div class="wk-mega" id="nav-mega"></div></div>`;
    if (!hijos.length) return `${enlace(l)}${esc(l.label)}</a>`;
    return `<div class="wk-nav-item">${enlace(l)}${esc(l.label)}</a>
      <button type="button" class="wk-nav-abrir" aria-expanded="false" aria-controls="nav-sub-${i}" aria-label="Ver lo que hay en ${esc(l.label)}">${CHEVRON}</button>
      <div class="wk-nav-sub" id="nav-sub-${i}">${hijos.map((c) => `${enlace(c)}${esc(c.label)}</a>`).join('')}</div></div>`;
  }).join('');
  const acceso = $('#cuenta-enlace');
  acceso.hidden = !cuenta;
  if (cuenta) acceso.innerHTML = `${icono('i-user')}<span>${esc(cuenta.label)}</span>`;
  // Menú grande (☰): las ramificaciones van plegadas debajo de su enlace y se abren con la flecha
  $('#panel-nav').innerHTML = main.map((l, i) => {
    const hijos = l.children?.filter(publicado) ?? [];
    const principal = `${enlace(l, ` style="--i:${i}"`)}<small>${String(i + 1).padStart(2, '0')}</small>${esc(l.label)}</a>`;
    if (!hijos.length) return principal;
    return `<div class="wk-panel-item" style="--i:${i}">${principal}
      <button type="button" class="wk-panel-abrir" aria-expanded="false" aria-controls="panel-sub-${i}" aria-label="Ver lo que hay en ${esc(l.label)}">${CHEVRON}</button>
      <div class="ns-panel__sub" id="panel-sub-${i}" inert><div>${hijos.map((c) => `${enlace(c)}${esc(c.label)}</a>`).join('')}</div></div></div>`;
  }).join('');
  marcarActivo();
  pintarMega();
}

const plural = (t) => (/[sz]$/i.test(t) ? t : `${t}s`);
/** El menú grande de la Tienda: sale del catálogo (no hay que cargar nada en el panel). */
async function pintarMega() {
  const caja = $('#nav-mega');
  if (!caja) return;
  const [{ catalogo }, { arte }] = await Promise.all([import('../datos/modelo.js'), import('./tarjeta.js')]);
  const todo = await catalogo().catch(() => []);
  if (!todo.length || !caja.isConnected) return;
  const grupos = [['criatura', 'Criaturas'], ['artefacto', 'Artefactos']].map(([tipo, nombre]) => {
    const piezas = todo.filter((x) => x.tipo === tipo);
    const especies = [...new Set(piezas.map((x) => x.species).filter(Boolean))].map((e) => {
      const de = piezas.filter((x) => x.species === e);
      return { nombre: tipo === 'criatura' ? plural(e) : plural(e), especie: e, cuantas: de.length, muestra: de.find((x) => x.image) ?? de[0] };
    }).sort((a, b) => b.cuantas - a.cuantas);
    return { tipo, nombre, especies };
  }).filter((g) => g.especies.length);
  const nueva = todo.filter((x) => x.available && x.image && (x.tipo === 'criatura' || x.tipo === 'artefacto')).sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
  caja.innerHTML = `
    <div class="wk-mega__tipos" role="tablist" aria-label="Tipo de pieza">
      ${grupos.map((g, i) => `<button type="button" role="tab" data-mega="${i}" aria-selected="${i === 0}">${esc(g.nombre)}</button>`).join('')}
      <a class="wk-mega__todo" href="/tienda" data-link>Ver toda la tienda →</a>
    </div>
    ${grupos.map((g, i) => `<div class="wk-mega__especies" role="tabpanel" data-panel="${i}"${i ? ' hidden' : ''}>
      ${g.especies.map((e) => `<a href="/tienda?especie=${encodeURIComponent(e.especie)}" data-link><span class="wk-mega__foto">${e.muestra ? arte(e.muestra, { ancho: 320, sizes: '44px' }) : ''}</span><span><b>${esc(e.nombre)}</b><small>${e.cuantas} pieza${e.cuantas === 1 ? '' : 's'}</small></span></a>`).join('')}
      <a class="wk-mega__ver" href="/tienda?tipo=${g.tipo}" data-link>${g.tipo === 'criatura' ? 'Ver todas las criaturas' : 'Ver todos los artefactos'} →</a>
    </div>`).join('')}
    ${nueva ? `<a class="wk-mega__nueva" href="/producto/${encodeURIComponent(nueva.handle)}" data-link>
      <span class="wk-mega__nueva-foto">${arte(nueva, { ancho: 640, sizes: '320px' })}</span>
      <span class="wk-mega__nueva-texto"><small>Recién salida del taller</small><b>${esc(nueva.name)}</b><em>Conocela →</em></span></a>` : ''}`;
  // Ocupa el ancho de la barra: se ubica respecto de su enlace cada vez que se va a abrir
  const item = caja.closest('.wk-nav-item');
  const ubicar = () => {
    const barra = document.querySelector('.ns-bar')?.getBoundingClientRect(), ri = item.getBoundingClientRect();
    if (!barra) return;
    caja.style.setProperty('--mega-x', `${barra.left - ri.left}px`);
    caja.style.setProperty('--mega-w', `${barra.width}px`);
    caja.style.setProperty('--mega-y', `${barra.bottom - ri.bottom + 10}px`);
  };
  item.addEventListener('pointerenter', ubicar);
  item.addEventListener('focusin', ubicar);
  item.querySelector('.wk-nav-abrir').addEventListener('click', ubicar);
  ubicar();
  const tabs = [...caja.querySelectorAll('[data-mega]')];
  const elegir = (k) => { tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === k))); caja.querySelectorAll('[data-panel]').forEach((p, i) => { p.hidden = i !== k; }); };
  tabs.forEach((t, k) => { t.addEventListener('mouseenter', () => elegir(k)); t.addEventListener('click', () => elegir(k)); t.addEventListener('focus', () => elegir(k)); });
}

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Las flechas de los menús: abren y cierran las ramificaciones. Se conecta una sola vez. */
export function conectarSubmenus() {
  const cerrarBarra = (salvo) => $$('#nav .wk-nav-item.is-abierto').forEach((it) => {
    if (it === salvo) return;
    it.classList.remove('is-abierto');
    it.querySelector('.wk-nav-abrir').setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.wk-nav-abrir, .wk-panel-abrir');
    if (!b) { if (!e.target.closest('.wk-nav-sub, .wk-mega') || e.target.closest('.wk-mega a')) cerrarBarra(); return; }
    const item = b.parentElement, abierto = !item.classList.contains('is-abierto');
    if (b.classList.contains('wk-nav-abrir')) cerrarBarra(item);
    item.classList.toggle('is-abierto', abierto);
    b.setAttribute('aria-expanded', String(abierto));
    const sub = item.querySelector('.ns-panel__sub');
    if (sub) sub.inert = !abierto;
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarBarra(); });
}

/** Resalta en el menú la sección en la que está el visitante. */
export function marcarActivo() {
  const aca = rutaWeb();
  $$('#nav a').forEach((a) => {
    const h = a.getAttribute('href').split(/[?#]/)[0];
    const activo = h !== '/' && (aca === h || aca.startsWith(`${h}/`) || (h === '/tienda' && /^\/(producto|categoria)\//.test(aca)) || (h === '/cursos' && aca.startsWith('/curso/')));
    a.classList.toggle('is-active', activo);
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

const REDES = [['instagram', 'i-ig', 'Instagram'], ['tiktok', 'i-tt', 'TikTok'], ['youtube', 'i-yt', 'YouTube'], ['facebook', 'i-fb', 'Facebook']];
const redes = (c, clase) => {
  const r = REDES.filter(([k]) => c[k]);
  return r.length ? `<div class="${clase}">${r.map(([k, i, n]) => `<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${n}">${icono(i)}</a>`).join('')}</div>` : '';
};
const whatsapp = (c) => {
  const wa = (c.whatsapp || '').replace(/\D/g, '').replace(/^0/, '598');
  return wa ? `https://wa.me/${wa}${c.whatsappMessage ? `?text=${encodeURIComponent(c.whatsappMessage)}` : ''}` : '';
};

/**
 * Tarjetitas de contacto de la página de Contacto: el taller (país y envíos), email, WhatsApp y redes.
 * Solo aparece lo que está cargado en el panel (Contacto); el país sale de js/config.js.
 */
export function tarjetasContacto(c = estado.info.contact ?? {}, pais = 'Uruguay') {
  const wa = whatsapp(c), red = redes(c, 'wk-contacto__redes');
  const tarjeta = (ic, titulo, cuerpo, href) => `<${href ? `a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}` : 'div'} class="wk-contacto__tarjeta"><span class="wk-contacto__icono">${ic}</span><span><small>${titulo}</small>${cuerpo}</span></${href ? 'a' : 'div'}>`;
  return [
    tarjeta(icono('i-pin'), 'El taller', `${esc(c.location || pais)}<br>Envíos a todo el país`),
    c.email && tarjeta(icono('i-mail'), 'Email', esc(c.email), `mailto:${esc(c.email)}`),
    wa && tarjeta(icono('i-wa'), 'WhatsApp', esc(c.hours || c.phone || 'Escribinos'), wa),
    red && `<div class="wk-contacto__tarjeta"><span class="wk-contacto__icono">✦</span><span><small>Seguinos</small>${red}</span></div>`,
  ].filter(Boolean).join('');
}

/** Datos de contacto del panel, listos para mostrar (los usa también la página de contacto). */
export function contactoHtml(c = estado.info.contact ?? {}) {
  const wa = whatsapp(c);
  return [
    c.phone && `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${icono('i-phone')}${esc(c.phone)}</a>`,
    wa && `<a href="${wa}" target="_blank" rel="noopener">${icono('i-wa')}WhatsApp</a>`,
    c.email && `<a href="mailto:${esc(c.email)}">${icono('i-mail')}${esc(c.email)}</a>`,
    c.location && `<p>${icono('i-pin')}${esc(c.location)}</p>`,
    c.hours && `<p class="horario">${esc(c.hours)}</p>`,
  ].filter(Boolean).join('');
}

export function pintarHablemos() {
  const caja = $('#hablemos');
  caja.insertAdjacentHTML('beforeend', contactoHtml() + redes(estado.info.contact ?? {}, 'ns-panel__social'));
  // Sin datos de contacto cargados en el panel, la columna no se muestra
  if (!caja.querySelector('a, p:not(.ns-panel__label)')) caja.hidden = true;
}

export function pintarPie() {
  const { info } = estado;
  $('#pie').innerHTML = `
    <span class="wk-ramas wk-pie__rama" data-crece aria-hidden="true"></span><span class="wk-ramas wk-ramas--der wk-pie__rama wk-pie__rama--der" data-crece aria-hidden="true"></span>
    <div class="wk-pie__luciernagas" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 61) % 100}%;--y:${20 + ((i * 37) % 70)}%;--d:${(i % 7) * -1.3}s;--t:${7 + (i % 5) * 1.6}s"></i>`).join('')}</div>
    <div class="wk-cont wk-cont--ancho">
      <svg class="wk-pie__adorno" viewBox="0 0 150 22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M2 16c22-2 34-12 52-12 10 0 16 5 16 10s-8 7-10 2M148 16c-22-2-34-12-52-12-10 0-16 5-16 10s8 7 10 2"/></svg>
      <section class="wk-pie__dudas" id="dudas" aria-labelledby="dudas-titulo">
        <span class="wk-pie__chispas" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--x:${(i * 43 + 7) % 96}%;--y:${(i * 29 + 12) % 92}%;--d:${i * -0.6}s;--t:${2.4 + (i % 4) * 0.8}s"></i>`).join('')}</span>
        <div class="wk-pie__dudas-cab">
          <span class="wk-sobre">${esc(FAQ.sobre)}</span>
          <h2 class="wk-titulo wk-titulo--m" id="dudas-titulo">${esc(FAQ.titulo)}</h2>
          <p>${esc(FAQ.texto)}</p>
          <a class="wk-enlace" href="/contacto" data-link>¿No está tu duda? Escribinos →</a>
        </div>
        ${acordeon(FAQ.items, { grupo: 'dudas', marca: () => '✦' })}
      </section>
    </div>
    <div class="wk-cont">
      <div class="wk-pie__firma">
        <span class="wk-pie__halo" aria-hidden="true"></span>
        <a href="/" data-link aria-label="Walkiverso: ir al inicio"><img src="${esc(info.logo || 'img/logo-walkiverso.svg')}" alt="${esc(info.name)}" width="560" height="150" loading="lazy"></a>
        <p class="wk-pie__lema">${esc(PIE.lema)}</p>
        ${redes(info.contact ?? {}, 'wk-redes')}
      </div>
      <div class="wk-pie__base">
        <span>© ${new Date().getFullYear()} ${esc(info.name)}</span>
        <span>${(info.legal ?? []).map((l) => `<a href="/legal/${l.kind}" data-link>${esc(l.title)}</a>`).join('')}</span>
      </div>
    </div>`;
  aparecer($('#pie'));
}

export function pintarAviso() {
  const a = estado.info.announcement;
  if (!a) return;
  const el = $('#aviso');
  el.classList.add(`aviso--${a.style || 'bar'}`);   // "Cómo se ve" en el panel
  el.innerHTML = a.link && !a.buttonText
    ? `<a href="${esc(a.link)}">${esc(a.text)}</a>`
    : `${esc(a.text)}${a.buttonText && a.link ? ` <a href="${esc(a.link)}">${esc(a.buttonText)} →</a>` : ''}`;
  el.hidden = false;
}

// ---------------------------------------------------------------- cookies y medición
export function pintarCookies() {
  const { info } = estado;
  const ck = info.cookies;
  const eleccion = (() => { try { return localStorage.getItem('cookies'); } catch { return null; } })();
  if (!ck || ck.mode === 'notice' || eleccion === 'todas') cargarMedicion();
  if (!ck || eleccion) return;
  const el = $('#cookies');
  const privacidad = (info.legal ?? []).find((l) => l.kind === 'privacy');
  el.innerHTML = `<p>${esc(ck.text || 'Usamos cookies para que la tienda funcione y, si aceptás, para medir las visitas.')}
    ${privacidad ? `<a href="/legal/privacy" data-link>${esc(privacidad.title)}</a>` : ''}</p>
    <div>${ck.mode === 'consent' ? `<button class="wk-btn wk-btn--linea" data-cookies="necesarias">${esc(ck.rejectText || 'Solo necesarias')}</button>` : ''}
    <button class="wk-btn" data-cookies="todas">${esc(ck.acceptText || (ck.mode === 'consent' ? 'Aceptar' : 'Entendido'))}</button></div>`;
  el.hidden = false;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cookies]');
    if (!b) return;
    try { localStorage.setItem('cookies', b.dataset.cookies); } catch { /* sin almacenamiento */ }
    el.hidden = true;
    if (b.dataset.cookies === 'todas' && ck.mode === 'consent') cargarMedicion();
  });
}
function cargarMedicion() {
  const { ga4, metaPixel } = estado.info.analytics ?? {};
  if (ga4 && /^G-[A-Z0-9]+$/.test(ga4)) {
    const s = document.createElement('script');
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
    document.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', ga4);
  }
  if (metaPixel && /^\d+$/.test(metaPixel)) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixel); window.fbq('track', 'PageView');
  }
}

// Tienda · Product Grid + Filters. Una galería que también vende: categorías arriba, filtros al costado.
// Los filtros viven en la dirección (/tienda?tipo=criatura&especie=Troll): se pueden compartir y volver atrás.
import { $, $$, app, esc, flecha, icono, plano, titular, url } from '../ui/util.js';
import { tienda as sdk } from '../datos/tienda.js';
import { obras, buscar, porDisponibilidad } from '../datos/modelo.js';
import { tarjeta } from '../ui/tarjeta.js';
import { aparecer } from '../anim/efectos.js';
import { raices } from '../ui/piezas.js';
import { SECCIONES } from '../contenido.js';

const ORDENES = { '': 'Disponibles primero', nuevas: 'Más nuevas', 'precio-asc': 'Precio: menor a mayor', 'precio-desc': 'Precio: mayor a menor', nombre: 'Nombre' };
const plural = (t) => (/[sz]$/i.test(t) ? t : `${t}s`);

function leer() {
  const q = new URLSearchParams(location.search);
  return {
    tipo: ['criatura', 'artefacto'].includes(q.get('tipo')) ? q.get('tipo') : '',
    especie: (q.get('especie') ?? '').split(',').filter(Boolean),
    pieza: ['unica', 'walkiverso'].includes(q.get('pieza')) ? q.get('pieza') : '',
    disp: q.get('disp') === '1',
    max: Number(q.get('max')) || 0,
    orden: q.get('orden') in ORDENES ? q.get('orden') : '',
    q: q.get('q') ?? '',
  };
}
function escribir(f) {
  const q = new URLSearchParams();
  if (f.tipo) q.set('tipo', f.tipo);
  if (f.especie.length) q.set('especie', f.especie.join(','));
  if (f.pieza) q.set('pieza', f.pieza);
  if (f.disp) q.set('disp', '1');
  if (f.max) q.set('max', String(f.max));
  if (f.orden) q.set('orden', f.orden);
  if (f.q) q.set('q', f.q);
  const s = q.toString();
  history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}`);
}

function filtrar(lista, f, categoria) {
  let r = lista;
  if (categoria) r = r.filter((x) => x.categories.map(plano).includes(plano(categoria)));
  if (f.q) r = buscar(r, f.q);
  if (f.tipo) r = r.filter((x) => x.tipo === f.tipo);
  if (f.especie.length) r = r.filter((x) => f.especie.includes(x.species));
  if (f.pieza === 'unica') r = r.filter((x) => x.isUnique);
  if (f.pieza === 'walkiverso') r = r.filter((x) => x.isWalkiverso);
  if (f.disp) r = r.filter((x) => x.available);
  if (f.max) r = r.filter((x) => x.price != null && x.price <= f.max);
  const orden = {
    '': porDisponibilidad,
    nuevas: (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
    'precio-asc': (a, b) => (a.price ?? 0) - (b.price ?? 0),
    'precio-desc': (a, b) => (b.price ?? 0) - (a.price ?? 0),
    nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
  }[f.orden];
  return r.slice().sort(orden);
}

export async function catalogoPagina(categoria = '') {
  titular('Tienda');
  const todas = await obras();
  const f = leer();
  const especies = [...new Set(todas.filter((x) => x.tipo === 'criatura').map((x) => x.species).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const clases = [...new Set(todas.filter((x) => x.tipo === 'artefacto').map((x) => x.species).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const precios = todas.map((x) => x.price ?? 0);
  const tope = Math.max(0, ...precios);
  const piso = Math.min(...precios, tope);
  const moneda = todas[0]?.currency;
  const cuantas = (fn) => todas.filter(fn).length;

  const casilla = (grupo, valor, texto, n) => `<label class="wk-casilla"><input type="checkbox" data-f="${grupo}" value="${esc(valor)}"><span>${esc(texto)}</span><small>${n}</small></label>`;
  const radio = (valor, texto, n) => `<label class="wk-casilla"><input type="radio" name="tipo" data-f="tipo" value="${valor}"><span>${esc(texto)}</span><small>${n}</small></label>`;

  app.innerHTML = `
    <section class="wk-tienda-cab wk-noche wk-pagina">
      <span class="wk-ramas wk-tienda-cab__rama" aria-hidden="true"></span>
      <div class="wk-cont">
        <span class="wk-sobre">${esc(SECCIONES.tienda.sobre)}</span>
        <h1 class="wk-titulo wk-titulo--m">${esc(SECCIONES.tienda.titulo)}</h1>
        <nav class="wk-chips wk-chips--fila" aria-label="Categorías" id="categorias"></nav>
      </div>
    </section>
    <section class="wk-blanco wk-tienda wk-con-raices">
      ${raices()}
      <div class="wk-cont wk-tienda__cuerpo">
        <aside class="wk-filtros" id="filtros" aria-label="Filtros">
          <div class="wk-filtros__cab"><strong>Filtros</strong><button type="button" class="wk-cerrar" id="cerrar-filtros" aria-label="Cerrar filtros">${icono('i-x')}</button></div>
          <form class="wk-filtros__form" id="f-filtros">
            <fieldset><legend>Tipo</legend>
              ${radio('', 'Todo', todas.length)}
              ${radio('criatura', 'Criaturas', cuantas((x) => x.tipo === 'criatura'))}
              ${radio('artefacto', 'Artefactos', cuantas((x) => x.tipo === 'artefacto'))}
            </fieldset>
            ${especies.length || clases.length ? `<fieldset><legend>Especie</legend>
              ${[...especies, ...clases].map((e) => casilla('especie', e, e, cuantas((x) => x.species === e))).join('')}
            </fieldset>` : ''}
            <fieldset><legend>Tipo de pieza</legend>
              ${casilla('pieza', 'unica', 'Piezas únicas (OOAK)', cuantas((x) => x.isUnique))}
              ${casilla('pieza', 'walkiverso', 'Piezas Walkiverso', cuantas((x) => x.isWalkiverso))}
            </fieldset>
            <fieldset><legend>Disponibilidad</legend>
              ${casilla('disp', '1', 'Solo disponibles', cuantas((x) => x.available))}
            </fieldset>
            ${tope > piso ? `<fieldset><legend>Precio</legend>
              <label class="wk-rango"><span>Hasta <b id="precio-max"></b></span>
                <input type="range" data-f="max" min="${piso}" max="${tope}" step="100" aria-label="Precio máximo"></label>
            </fieldset>` : ''}
          </form>
          <div class="wk-filtros__pie"><button type="button" class="wk-btn wk-btn--tinta wk-btn--ancho" id="ver-resultados"></button></div>
        </aside>
        <div class="wk-tienda__lista">
          <div class="wk-tienda__barra">
            <p id="cuenta" aria-live="polite"></p>
            <button type="button" class="wk-btn wk-btn--linea wk-tienda__abrir" id="abrir-filtros">${icono('i-filtro')}Filtros</button>
            <label class="wk-orden"><span class="wk-sr">Ordenar</span><select id="orden">${Object.entries(ORDENES).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
          </div>
          <div class="wk-activos" id="activos"></div>
          <div id="grilla"></div>
        </div>
      </div>
    </section>`;

  const ruta = (cambios) => { const p = new URLSearchParams(); Object.entries(cambios).forEach(([k, v]) => v && p.set(k, v)); const s = p.toString(); return `/tienda${s ? `?${s}` : ''}`; };
  // Categorías: caminos rápidos. Son especies y tipos de pieza, nunca regiones de Walkurio.
  const categorias = [
    { texto: 'Todo', href: '/tienda', activa: () => !categoria && !f.tipo && !f.especie.length && !f.pieza },
    { texto: 'Criaturas', href: ruta({ tipo: 'criatura' }), activa: () => f.tipo === 'criatura' && !f.especie.length },
    { texto: 'Artefactos', href: ruta({ tipo: 'artefacto' }), activa: () => f.tipo === 'artefacto' },
    ...especies.map((e) => ({ texto: plural(e), href: ruta({ especie: e }), activa: () => f.especie.length === 1 && f.especie[0] === e })),
    { texto: 'Piezas únicas', href: ruta({ pieza: 'unica' }), activa: () => f.pieza === 'unica' && !f.tipo && !f.especie.length },
  ];

  function pintar() {
    const lista = filtrar(todas, f, categoria);
    $('#categorias').innerHTML = categorias.map((c) => `<a class="wk-chip" href="${c.href}" data-categoria${c.activa() ? ' aria-current="page"' : ''}>${esc(c.texto)}</a>`).join('');
    $$('#f-filtros [data-f]').forEach((i) => {
      if (i.type === 'range') { i.value = f.max || tope; $('#precio-max').textContent = sdk.formatear(Number(i.value), moneda); }
      else if (i.dataset.f === 'tipo') i.checked = i.value === f.tipo;
      else if (i.dataset.f === 'especie') i.checked = f.especie.includes(i.value);
      else if (i.dataset.f === 'pieza') i.checked = f.pieza === i.value;
      else if (i.dataset.f === 'disp') i.checked = f.disp;
    });
    $('#orden').value = f.orden;
    const n = lista.length;
    $('#cuenta').innerHTML = `<b>${n}</b> pieza${n === 1 ? '' : 's'}${f.q ? ` para “${esc(f.q)}”` : ''}`;
    $('#ver-resultados').textContent = `Ver ${n} pieza${n === 1 ? '' : 's'}`;
    const activos = [
      f.q && ['q', `“${f.q}”`],
      ...f.especie.map((e) => ['especie', e]),
      f.pieza && ['pieza', f.pieza === 'unica' ? 'Piezas únicas (OOAK)' : 'Piezas Walkiverso'],
      f.disp && ['disp', 'Solo disponibles'],
      f.max && f.max < tope && ['max', `Hasta ${sdk.formatear(f.max, moneda)}`],
    ].filter(Boolean);
    $('#activos').innerHTML = activos.length ? `${activos.map(([k, t]) => `<button type="button" class="wk-chip wk-chip--quitar" data-quitar="${k}" data-valor="${esc(t)}" aria-label="Quitar filtro ${esc(t)}">${esc(t)} ${icono('i-x')}</button>`).join('')}
      <button type="button" class="wk-activos__limpiar" data-quitar="todo">Limpiar filtros</button>` : '';
    $('#grilla').innerHTML = n
      ? `<div class="wk-grilla wk-grilla--tienda">${lista.map(tarjeta).join('')}</div>`
      : `<div class="wk-vacio"><span class="wk-carrito__ojo">${icono('i-ojo')}</span><h2 class="wk-titulo wk-titulo--s">Ninguna pieza coincide con esos filtros</h2><button type="button" class="wk-btn wk-btn--tinta" data-quitar="todo">Ver toda la tienda ${flecha}</button></div>`;
    aparecer($('#grilla'));
  }
  const cambiar = (cambios) => { Object.assign(f, cambios); escribir(f); pintar(); };
  const limpio = { tipo: '', especie: [], pieza: '', disp: false, max: 0, q: '' };

  $('#f-filtros').addEventListener('input', (e) => {
    const i = e.target;
    if (i.dataset.f === 'tipo') cambiar({ tipo: i.value });
    else if (i.dataset.f === 'especie') cambiar({ especie: i.checked ? [...f.especie, i.value] : f.especie.filter((x) => x !== i.value) });
    else if (i.dataset.f === 'pieza') cambiar({ pieza: i.checked ? i.value : '' });
    else if (i.dataset.f === 'disp') cambiar({ disp: i.checked });
    else if (i.dataset.f === 'max') cambiar({ max: Number(i.value) >= tope ? 0 : Number(i.value) });
  });
  $('#orden').addEventListener('change', (e) => cambiar({ orden: e.target.value }));
  // Las categorías cambian los filtros sin recargar la página
  $('#categorias').addEventListener('click', (e) => {
    const a = e.target.closest('[data-categoria]');
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const q = new URLSearchParams(a.getAttribute('href').split('?')[1] ?? '');
    categoria = '';
    history.replaceState(null, '', url('/tienda'));
    cambiar({ ...limpio, tipo: q.get('tipo') ?? '', especie: q.get('especie') ? [q.get('especie')] : [], pieza: q.get('pieza') ?? '' });
  });
  const alQuitar = (e) => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    const k = b.dataset.quitar;
    if (k === 'todo') { categoria = ''; history.replaceState(null, '', url('/tienda')); cambiar({ ...limpio }); }
    else if (k === 'especie') cambiar({ especie: f.especie.filter((x) => x !== b.dataset.valor) });
    else cambiar({ [k]: limpio[k] });
  };
  app.addEventListener('click', alQuitar);

  // En celular y tablet los filtros son una hoja que sube desde abajo
  const hoja = $('#filtros');
  const abrirHoja = (si) => { hoja.classList.toggle('is-abierto', si); document.documentElement.classList.toggle('wk-hoja-abierta', si); if (si) $('#cerrar-filtros').focus(); else $('#abrir-filtros').focus(); };
  $('#abrir-filtros').addEventListener('click', () => abrirHoja(true));
  $('#cerrar-filtros').addEventListener('click', () => abrirHoja(false));
  $('#ver-resultados').addEventListener('click', () => abrirHoja(false));
  const alEscape = (e) => { if (e.key === 'Escape' && hoja.classList.contains('is-abierto')) abrirHoja(false); };
  document.addEventListener('keydown', alEscape);

  pintar();
  aparecer(app);
  return () => { app.removeEventListener('click', alQuitar); document.removeEventListener('keydown', alEscape); document.documentElement.classList.remove('wk-hoja-abierta'); };
}

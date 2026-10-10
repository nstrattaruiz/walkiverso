// About · Walkiver, el artista detrás del universo. Y Walkurio: la página existe pero está oculta (ver config.js).
import { app, esc, flecha, titular } from '../ui/util.js';
import { catalogo } from '../datos/modelo.js';
import { aparecer } from '../anim/efectos.js';
import { WALKIVER } from '../contenido.js';
import { raices } from '../ui/piezas.js';

export async function walkiver() {
  titular('Walkiver');
  const todo = await catalogo().catch(() => []);
  const ebook = todo.find((x) => x.handle === WALKIVER.ebookHandle) ?? todo.find((x) => x.tipo === 'ebook');
  app.innerHTML = `
    <section class="wk-blanco wk-pagina wk-seccion wk-artista wk-artista--pagina wk-con-raices">
      ${raices()}
      <div class="wk-cont wk-artista__grilla">
        <div class="wk-artista__retrato" data-ver>${WALKIVER.imagen
          ? `<img src="${esc(WALKIVER.imagen)}" alt="Walkiver en su taller">`
          : '<span class="wk-arte wk-arte--espera" style="--t:0.62" role="img" aria-label="Retrato de Walkiver: imagen pendiente"><span class="wk-arte__glifo"></span></span>'}</div>
        <div class="wk-cab" data-ver style="--d:1">
          <span class="wk-sobre">El artista</span>
          <h1 class="wk-titulo">Walkiver</h1>
          <div class="wk-prosa">${WALKIVER.bio.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <div class="wk-botones">
            <a class="wk-btn wk-btn--luz" href="/tienda" data-link>Ver sus creaciones ${flecha}</a>
            ${ebook ? `<a class="wk-btn wk-btn--linea" href="/producto/${esc(ebook.handle)}" data-link>Leer ebook “${esc(ebook.name)}”</a>` : ''}
          </div>
        </div>
      </div>
    </section>
    ${WALKIVER.videos.length ? `
    <section class="wk-seccion wk-cielo">
      <div class="wk-cont">
        <header class="wk-cab" data-ver><span class="wk-sobre">Videos</span><h2 class="wk-titulo wk-titulo--m">Mitología contada por Walkiver</h2></header>
        <div class="wk-videos">${WALKIVER.videos.map((v) => `<a class="wk-enlace" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.titulo)} ${flecha}</a>`).join('')}</div>
      </div>
    </section>` : ''}`;
  aparecer(app);
}

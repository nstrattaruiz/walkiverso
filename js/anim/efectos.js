// Animation utilities · apariciones, profundidad con el mouse y tarjetas que reaccionan.
// Todo con transform y opacity, y con inercia: nada sigue al cursor de forma brusca.
import { $$, reducido, punteroFino } from '../ui/util.js';

// ---------------------------------------------------------------- apariciones suaves
const visor = 'IntersectionObserver' in window
  ? new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-visto');
    visor.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
  : null;

const brote = 'IntersectionObserver' in window
  ? new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    [...e.target.children].forEach((h) => { if (h.hasAttribute('data-crece')) h.classList.add('is-visto'); });
    brote.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' })
  : null;

/** Activa la aparición de todo lo marcado con `data-ver` (y las raíces, `data-crece`) dentro de `raiz`. Llamar después de dibujar. */
export function aparecer(raiz = document) {
  $$('[data-ver]:not(.is-visto)', raiz).forEach((el) => (visor ? visor.observe(el) : el.classList.add('is-visto')));
  // Las raíces empiezan recortadas (invisibles), así que se mira su sección: cuando entra en pantalla, crecen
  $$('[data-crece]:not(.is-visto)', raiz).forEach((el) => (brote ? brote.observe(el.parentElement) : el.classList.add('is-visto')));
}

// ---------------------------------------------------------------- profundidad (parallax con inercia)
/**
 * Los hijos con `data-prof="20"` se desplazan hasta esa cantidad de píxeles según el mouse, con interpolación.
 * `data-luz` sigue al cursor (linterna). Solo corre mientras la escena está en pantalla.
 * @returns función para detenerla.
 */
export function escena(el) {
  if (reducido() || !punteroFino()) return () => {};
  const capas = $$('[data-prof]', el).map((c) => ({ c, prof: Number(c.dataset.prof) }));
  const luz = el.querySelector('[data-luz]');
  const oculto = el.querySelector('[data-oculto]');
  const m = { x: 0, y: 0, tx: 0, ty: 0, lx: 0.5, ly: 0.4, tlx: 0.5, tly: 0.4 };
  let raf = 0, visible = false;

  const cuadro = () => {
    m.x += (m.tx - m.x) * 0.06;
    m.y += (m.ty - m.y) * 0.06;
    m.lx += (m.tlx - m.lx) * 0.09;
    m.ly += (m.tly - m.ly) * 0.09;
    for (const { c, prof } of capas) c.style.transform = `translate3d(${(-m.x * prof).toFixed(2)}px, ${(-m.y * prof).toFixed(2)}px, 0)`;
    if (luz) luz.style.transform = `translate3d(${(m.lx * el.clientWidth).toFixed(1)}px, ${(m.ly * el.clientHeight).toFixed(1)}px, 0)`;
    // Lo escondido solo se ve donde cae la luz
    if (oculto) { oculto.style.setProperty('--lx', `${(m.lx * 100).toFixed(2)}%`); oculto.style.setProperty('--ly', `${(m.ly * 100).toFixed(2)}%`); }
    // Cuando ya llegó a destino, deja de pedir cuadros
    const quieto = Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) + Math.abs(m.tlx - m.lx) + Math.abs(m.tly - m.ly) < 0.0008;
    raf = visible && !quieto ? requestAnimationFrame(cuadro) : 0;
  };
  const alMover = (e) => {
    const r = el.getBoundingClientRect();
    m.tx = e.clientX / window.innerWidth - 0.5;
    m.ty = e.clientY / window.innerHeight - 0.5;
    m.tlx = (e.clientX - r.left) / r.width;
    m.tly = (e.clientY - r.top) / r.height;
    if (visible && !raf) raf = requestAnimationFrame(cuadro);
    el.classList.add('is-alumbrado');
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(el);
  window.addEventListener('pointermove', alMover, { passive: true });
  return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', alMover); };
}

// ---------------------------------------------------------------- tarjetas que reaccionan al mouse
// Una sola escucha para todas las tarjetas: inclina apenas el marco y mueve el brillo. La inercia la da la transición CSS.
export function iniciarTarjetas() {
  if (reducido() || !punteroFino()) return;
  let actual = null, pendiente = null, raf = 0;
  const aplicar = () => {
    raf = 0;
    if (!actual || !pendiente) return;
    const r = actual.getBoundingClientRect();
    const x = (pendiente.clientX - r.left) / r.width;
    const y = (pendiente.clientY - r.top) / r.height;
    actual.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
    actual.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
    actual.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    actual.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  };
  const soltar = () => {
    if (!actual) return;
    actual.style.removeProperty('--rx');
    actual.style.removeProperty('--ry');
    actual = null;
  };
  document.addEventListener('pointermove', (e) => {
    const marco = e.target.closest?.('.wk-card__marco, [data-inclina]');
    if (marco !== actual) soltar();
    if (!marco) return;
    actual = marco;
    pendiente = e;
    raf ||= requestAnimationFrame(aplicar);
  }, { passive: true });
  document.addEventListener('pointerleave', soltar);
}

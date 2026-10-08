// Animation utilities · partículas del hero: motas de luz que suben despacio y acompañan al mouse con inercia.
// Un solo canvas, sprites pre-dibujados (sin sombras por cuadro) y pausa cuando no se ve: prioridad a la fluidez.
import { reducido, punteroFino } from '../ui/util.js';

/** @returns función para detener la animación (al salir de la página). */
export function particulas(canvas) {
  const ctx = canvas.getContext('2d');
  const quieto = reducido();
  const celular = window.innerWidth < 750;
  const dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.25 : 1.5);
  let ancho = 0, alto = 0, motas = [], raf = 0, visible = true, antes = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // Sprite de una mota con su halo: se dibuja una vez y después solo se copia
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const s = sprite.getContext('2d');
  const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(190,222,255,0.75)');
  g.addColorStop(0.5, 'rgba(143,197,255,0.16)');
  g.addColorStop(1, 'rgba(143,197,255,0)');
  s.fillStyle = g;
  s.fillRect(0, 0, 64, 64);

  const nueva = (desdeAbajo) => {
    const fondo = Math.random();   // 0 lejos · 1 cerca
    return {
      x: Math.random() * ancho,
      y: desdeAbajo ? alto + 20 : Math.random() * alto,
      r: 3 + fondo * (celular ? 9 : 14),
      vy: 5 + fondo * 16,
      deriva: (Math.random() - 0.5) * 8,
      fase: Math.random() * Math.PI * 2,
      fondo,
      alfa: 0.25 + fondo * 0.55,
    };
  };

  function medir() {
    const r = canvas.getBoundingClientRect();
    ancho = r.width; alto = r.height;
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cantidad = Math.round(Math.min(celular ? 26 : 70, (ancho * alto) / 16000));
    motas = Array.from({ length: cantidad }, () => nueva(false));
  }

  function dibujar(t) {
    const dt = Math.min(0.05, (t - antes) / 1000 || 0);
    antes = t;
    mouse.x += (mouse.tx - mouse.x) * 0.045;
    mouse.y += (mouse.ty - mouse.y) * 0.045;
    ctx.clearRect(0, 0, ancho, alto);
    for (const m of motas) {
      m.y -= m.vy * dt;
      m.x += (m.deriva + Math.sin(t / 2400 + m.fase) * 6) * dt;
      if (m.y < -24) Object.assign(m, nueva(true));
      const x = m.x - mouse.x * 34 * m.fondo;
      const y = m.y - mouse.y * 22 * m.fondo;
      ctx.globalAlpha = m.alfa * (0.6 + 0.4 * Math.sin(t / 900 + m.fase));
      ctx.drawImage(sprite, x - m.r, y - m.r, m.r * 2, m.r * 2);
    }
    ctx.globalAlpha = 1;
  }

  const ciclo = (t) => { dibujar(t); raf = requestAnimationFrame(ciclo); };
  const andar = () => { cancelAnimationFrame(raf); if (visible && !document.hidden && !quieto) raf = requestAnimationFrame(ciclo); };
  const alMover = (e) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; andar(); });
  const ro = new ResizeObserver(() => { medir(); if (quieto) dibujar(0); });

  ro.observe(canvas);
  io.observe(canvas);
  document.addEventListener('visibilitychange', andar);
  if (punteroFino()) window.addEventListener('pointermove', alMover, { passive: true });
  medir();
  if (quieto) dibujar(0); else andar();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', andar);
    window.removeEventListener('pointermove', alMover);
  };
}

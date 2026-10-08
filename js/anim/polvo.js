// Animation utilities · polvo de hadas: una estela de chispas que sigue al mouse y se apaga cayendo.
// Un solo canvas fijo sobre la página; solo dibuja mientras hay chispas vivas. Sin mouse (celular) no se activa.
import { reducido, punteroFino } from '../ui/util.js';

// Blancas y azules mezcladas: se ven tanto sobre los bloques oscuros como sobre los claros
const TONOS = ['#FFFFFF', '#CFE6FF', '#8FC5FF', '#4C8ED9', '#1C5AA6', '#123B78'];

export function polvoDeHadas() {
  if (reducido() || !punteroFino()) return;
  const lienzo = document.createElement('canvas');
  lienzo.className = 'wk-polvo';
  lienzo.setAttribute('aria-hidden', 'true');
  document.body.append(lienzo);
  const ctx = lienzo.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let chispas = [], raf = 0, antes = 0, ultima = null;

  const medir = () => {
    lienzo.width = Math.round(window.innerWidth * dpr);
    lienzo.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  medir();
  window.addEventListener('resize', medir, { passive: true });

  const nueva = (x, y) => ({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 34,
    vy: -8 + Math.random() * 30,
    vida: 0,
    dura: 0.6 + Math.random() * 0.8,
    r: 0.8 + Math.random() * 2,
    tono: TONOS[Math.floor(Math.random() * TONOS.length)],
    fase: Math.random() * 6.28,
  });

  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - antes) / 1000 || 0.016);
    antes = ahora;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    chispas = chispas.filter((c) => (c.vida += dt) < c.dura);
    for (const c of chispas) {
      c.vy += 46 * dt;   // caen despacio
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const k = 1 - c.vida / c.dura;
      const brillo = k * (0.6 + 0.4 * Math.sin(c.vida * 22 + c.fase));
      const r = c.r * (0.5 + k * 0.7);
      ctx.globalAlpha = Math.max(0, brillo);
      ctx.fillStyle = c.tono;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, 6.28);
      ctx.fill();
      // Las más grandes llevan un destello en cruz
      if (c.r > 2) { ctx.fillRect(c.x - r * 3, c.y - 0.4, r * 6, 0.8); ctx.fillRect(c.x - 0.4, c.y - r * 3, 0.8, r * 6); }
    }
    ctx.globalAlpha = 1;
    raf = chispas.length ? requestAnimationFrame(cuadro) : 0;
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    // Una chispa cada pocos píxeles recorridos: mover rápido deja más polvo, quedarse quieto no deja nada
    const d = ultima ? Math.hypot(e.clientX - ultima.x, e.clientY - ultima.y) : 20;
    if (d < 12) return;
    ultima = { x: e.clientX, y: e.clientY };
    const n = Math.min(3, 1 + Math.floor(d / 40));
    for (let i = 0; i < n && chispas.length < 140; i++) chispas.push(nueva(e.clientX, e.clientY));
    if (!raf) { antes = performance.now(); raf = requestAnimationFrame(cuadro); }
  }, { passive: true });
}

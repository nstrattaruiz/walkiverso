// Animation utilities · el humo dentro de la bola de cristal: volutas de luz que giran y se mezclan.
// Canvas chico con manchas pre-dibujadas (sin filtros por cuadro); se pausa cuando no se ve.
import { reducido } from '../ui/util.js';

/** @returns {{ detener: () => void, energia: (v: number) => void }} `energia` (0–1) aviva el humo. */
export function humo(canvas) {
  const ctx = canvas.getContext('2d');
  const quieto = reducido();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let lado = 0, raf = 0, visible = false, energia = 0, meta = 0, reloj = 0, antes = 0;

  // Una mancha suave por color: se dibuja una vez y después solo se copia
  const mancha = (r, g, b) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const d = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    d.addColorStop(0, `rgba(${r},${g},${b},1)`);
    d.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
    d.addColorStop(0.7, `rgba(${r},${g},${b},0.12)`);
    d.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = d;
    x.fillRect(0, 0, 128, 128);
    return c;
  };
  const LUZ = [mancha(255, 255, 255), mancha(255, 255, 255), mancha(205, 230, 255), mancha(143, 197, 255), mancha(76, 142, 217)];
  const SOMBRA = mancha(4, 15, 38);

  const azar = (a, b) => a + Math.random() * (b - a);
  const voluta = (oscura) => ({
    oscura,
    tono: LUZ[Math.floor(azar(0, LUZ.length))],
    orbita: azar(0.12, oscura ? 0.7 : 0.62),    // distancia al centro (en radios)
    angulo: azar(0, Math.PI * 2),
    giro: azar(0.1, 0.3) * (Math.random() < 0.72 ? 1 : -1),   // la mayoría gira para el mismo lado: se ve como un remolino
    tam: azar(oscura ? 0.28 : 0.26, oscura ? 0.5 : 0.58),
    fase: azar(0, Math.PI * 2),
    pulso: azar(0.25, 0.6),
    alfa: oscura ? azar(0.45, 0.75) : azar(0.18, 0.36),
  });
  // Primero las sombras (le dan profundidad al fondo azul) y encima las volutas de luz
  const volutas = [...Array.from({ length: 7 }, () => voluta(true)), ...Array.from({ length: 30 }, () => voluta(false))];

  function medir() {
    lado = canvas.clientWidth;
    canvas.width = canvas.height = Math.round(lado * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function dibujar(ahora) {
    const dt = Math.min(0.05, (ahora - antes) / 1000 || 0);
    antes = ahora;
    energia += (meta - energia) * 0.03;
    reloj += dt * (1 + energia * 1.6);
    const R = lado / 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, lado, lado);
    // Fondo: el resplandor azul de la bola
    const fondo = ctx.createRadialGradient(R, R * 1.05, 0, R, R, R);
    fondo.addColorStop(0, 'rgba(120,180,245,0.9)');
    fondo.addColorStop(0.6, 'rgba(40,104,190,0.85)');
    fondo.addColorStop(1, 'rgba(11,37,84,0.9)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, lado, lado);
    for (const v of volutas) {
      const a = v.angulo + reloj * v.giro + Math.sin(reloj * v.pulso + v.fase) * 0.7;
      const d = R * v.orbita * (0.75 + 0.35 * Math.sin(reloj * v.pulso * 0.7 + v.fase * 2));
      const t = R * v.tam * (0.9 + 0.16 * Math.sin(reloj * v.pulso + v.fase));
      ctx.globalCompositeOperation = v.oscura ? 'source-over' : 'screen';
      ctx.globalAlpha = v.alfa * (v.oscura ? 1 - energia * 0.5 : 0.8 + energia * 0.5);
      ctx.drawImage(v.oscura ? SOMBRA : v.tono, R + Math.cos(a) * d - t, R + Math.sin(a) * d * 0.92 - t, t * 2, t * 2);
    }
    ctx.globalAlpha = 1;
  }

  const ciclo = (t) => { dibujar(t); raf = requestAnimationFrame(ciclo); };
  const andar = () => { cancelAnimationFrame(raf); if (visible && !document.hidden && !quieto) raf = requestAnimationFrame(ciclo); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; andar(); });
  const ro = new ResizeObserver(() => { medir(); if (quieto) { reloj = 3; dibujar(0); } });
  ro.observe(canvas);
  io.observe(canvas);
  document.addEventListener('visibilitychange', andar);
  medir();
  if (quieto) { reloj = 3; dibujar(0); }

  return {
    energia(v) { meta = Math.max(0, Math.min(1, v)); if (quieto) { energia = meta; dibujar(0); } },
    detener() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', andar); },
  };
}

// Walkurio dibujado, para la portada ("Dónde las criaturas cobran vida"): el planeta en líneas, como un mapa de curvas
// de nivel sobre una esfera que gira despacio. Las costas y el relieve son los de verdad (img/walkurio/curvas.json,
// sale de .dev/walkurio-curvas.mjs). Lo de atrás se ve tenue, como a través de un globo de vidrio; las dos lunas orbitan
// y las zonas del panel brillan sobre la superficie. Se puede girar arrastrando. Solo un lienzo 2D: es liviano.
const RAD = Math.PI / 180;

/**
 * @param lienzo un <canvas>
 * @param zonas [{ lat, lon, nombre }] (las zonas de primer nivel del planeta)
 * @returns función para detenerlo
 */
export function globo(lienzo, zonas = []) {
  const ctx = lienzo.getContext('2d');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let curvas = null, vivo = true, visible = false, raf = 0, ultimo = 0;
  let giro = -20, inclina = 16, arrastre = null, vel = 0, ancho = 0, alto = 0, dpr = 1;
  const t0 = performance.now();
  fetch('img/walkurio/curvas.json').then((r) => r.json()).then((d) => { curvas = d.niveles; seguir(); }).catch(() => {});

  const medir = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    ancho = lienzo.clientWidth; alto = lienzo.clientHeight;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    if (!raf) dibujar(performance.now());
  };

  // Proyección ortográfica: [x, y, z] en pantalla (z > 0 = de frente)
  const proyectar = (lat, lon, cx, cy, r) => {
    const la = lat * RAD, lo = (lon + giro) * RAD, ci = Math.cos(inclina * RAD), si = Math.sin(inclina * RAD);
    const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
    const y2 = y * ci - z * si, z2 = y * si + z * ci;
    return [cx + x * r, cy - y2 * r, z2];
  };

  const ESTILO = [ // por nivel: [grosor, opacidad de frente]
    [1.5, 0.9], [1, 0.55], [0.9, 0.42], [0.8, 0.34],
  ];
  function dibujar(ahora) {
    const t = (ahora - t0) / 1000;
    const W = ancho * dpr, H = alto * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = Math.min(ancho, alto) * 0.36, cx = ancho / 2, cy = alto / 2;
    const azul = (a) => `rgba(18, 59, 120, ${a})`, celeste = (a) => `rgba(76, 142, 217, ${a})`;

    // Lunas: posición en su órbita (inclinada); las que pasan por detrás se dibujan antes que el planeta
    const lunas = [
      { r: r * 0.11, orb: r * 1.42, inc: 0.32, vuelta: 46, fase: 0.7 },
      { r: r * 0.07, orb: r * 1.75, inc: -0.42, vuelta: 72, fase: 3.6 },
    ].map((l) => {
      const ang = (reducido ? 0 : t / l.vuelta) * Math.PI * 2 + l.fase;
      const x = Math.cos(ang) * l.orb, zz = Math.sin(ang) * l.orb;
      return { ...l, x: cx + x, y: cy - zz * Math.sin(l.inc) * 0.5 + zz * 0.06, z: zz };
    });
    const orbitas = () => {
      ctx.setLineDash([2, 6]); ctx.lineWidth = 1; ctx.strokeStyle = celeste(0.35);
      for (const l of lunas) { ctx.beginPath(); ctx.ellipse(cx, cy, l.orb, Math.abs(l.orb * Math.sin(l.inc) * 0.5), 0.06 * Math.sign(l.inc), 0, Math.PI * 2); ctx.stroke(); }
      ctx.setLineDash([]);
    };
    const luna = (l) => {
      const g = ctx.createRadialGradient(l.x - l.r * 0.4, l.y - l.r * 0.4, l.r * 0.1, l.x, l.y, l.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bcd3ef');
      ctx.fillStyle = g; ctx.strokeStyle = azul(0.7); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.7; ctx.strokeStyle = azul(0.35);
      ctx.beginPath(); ctx.arc(l.x + l.r * 0.25, l.y - l.r * 0.1, l.r * 0.28, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(l.x - l.r * 0.35, l.y + l.r * 0.35, l.r * 0.16, 0, Math.PI * 2); ctx.stroke();
    };
    orbitas();
    lunas.filter((l) => l.z < 0).forEach(luna);

    // Halo y esfera
    const halo = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.28);
    halo.addColorStop(0, celeste(0.28)); halo.addColorStop(1, celeste(0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.28, 0, Math.PI * 2); ctx.fill();
    const esfera = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    esfera.addColorStop(0, '#ffffff'); esfera.addColorStop(0.6, '#e6eff9'); esfera.addColorStop(1, '#bfd5ef');
    ctx.fillStyle = esfera; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Paralelos y meridianos, muy tenues
    ctx.lineWidth = 0.6; ctx.strokeStyle = celeste(0.22);
    const linea = (puntos) => {
      ctx.beginPath(); let abierta = false;
      for (const [lat, lon] of puntos) {
        const [x, y, z] = proyectar(lat, lon, cx, cy, r);
        if (z < 0) { abierta = false; continue; }
        if (abierta) ctx.lineTo(x, y); else { ctx.moveTo(x, y); abierta = true; }
      }
      ctx.stroke();
    };
    for (let lon = -180; lon < 180; lon += 30) linea(Array.from({ length: 37 }, (_, k) => [-90 + k * 5, lon]));
    for (let lat = -60; lat <= 60; lat += 30) linea(Array.from({ length: 73 }, (_, k) => [lat, -180 + k * 5]));

    if (curvas) {
      // Primero lo de atrás (tenue, como visto a través del vidrio), después lo de adelante
      for (const delante of [false, true]) {
        curvas.forEach((nivel, n) => {
          const [grosor, op] = ESTILO[n];
          ctx.lineWidth = grosor; ctx.strokeStyle = azul(delante ? op : op * 0.12);
          ctx.beginPath();
          for (const l of nivel) {
            let abierta = false;
            for (let k = 0; k < l.length; k += 2) {
              const [x, y, z] = proyectar(l[k], l[k + 1], cx, cy, r);
              if ((z >= 0) !== delante) { abierta = false; continue; }
              if (abierta) ctx.lineTo(x, y); else { ctx.moveTo(x, y); abierta = true; }
            }
          }
          ctx.stroke();
        });
      }
    }
    // Borde de la esfera y su brillo
    ctx.lineWidth = 1.4; ctx.strokeStyle = azul(0.55);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Zonas: una luz que late sobre cada una (solo las de frente)
    zonas.forEach((zona, i) => {
      const [x, y, z] = proyectar(zona.lat, zona.lon, cx, cy, r);
      if (z < 0.15) return;
      const a = Math.min(1, (z - 0.15) / 0.3), pulso = reducido ? 0.5 : (t * 0.45 + i * 0.37) % 1;
      ctx.fillStyle = celeste(0.35 * (1 - pulso) * a);
      ctx.beginPath(); ctx.arc(x, y, 3 + pulso * 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = azul(0.95 * a); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    });
    lunas.filter((l) => l.z >= 0).forEach(luna);
  }

  const cuadro = (ahora) => {
    raf = 0;
    if (!vivo || !visible) return;
    const dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000); ultimo = ahora;
    if (!arrastre) { giro += (reducido ? 0 : 6) * dt + vel * dt; vel *= Math.pow(0.05, dt); }
    dibujar(ahora);
    if (!reducido || arrastre || Math.abs(vel) > 0.5) raf = requestAnimationFrame(cuadro);
  };
  const seguir = () => { if (!raf && vivo && visible) { ultimo = 0; raf = requestAnimationFrame(cuadro); } };

  // Girar arrastrando
  const control = new AbortController(), { signal } = control;
  lienzo.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, y: e.clientY, giro, inclina, t: performance.now(), movio: false }; lienzo.setPointerCapture(e.pointerId); seguir(); }, { signal });
  lienzo.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (Math.hypot(dx, dy) > 4) arrastre.movio = true;
    const nuevo = arrastre.giro + dx * 0.4;
    vel = (nuevo - giro) / 0.016; giro = nuevo;
    inclina = Math.max(-40, Math.min(50, arrastre.inclina - dy * 0.25));
  }, { signal });
  const soltar = (e) => {
    if (!arrastre) return;
    // Un toque sin arrastrar es un clic (el lienzo está dentro del enlace a Walkurio)
    if (arrastre.movio) e.preventDefault?.();
    lienzo.dataset.arrastro = arrastre.movio ? '1' : '';
    arrastre = null; vel = Math.max(-120, Math.min(120, vel));
  };
  lienzo.addEventListener('pointerup', soltar, { signal });
  lienzo.addEventListener('pointercancel', soltar, { signal });
  lienzo.closest('a')?.addEventListener('click', (e) => { if (lienzo.dataset.arrastro) { e.preventDefault(); e.stopPropagation(); lienzo.dataset.arrastro = ''; } }, { signal, capture: true });

  const ojo = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); }, { rootMargin: '100px' });
  ojo.observe(lienzo);
  const ro = new ResizeObserver(medir); ro.observe(lienzo);
  medir();
  return () => { vivo = false; cancelAnimationFrame(raf); ojo.disconnect(); ro.disconnect(); control.abort(); };
}

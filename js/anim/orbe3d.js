// La bola de cristal del deseo, en 3D: una esfera de cristal sin bordes con una nebulosa de luz viva adentro
// (volumen calculado en el shader), un corazón luminoso y chispas que orbitan. Mientras escribís el deseo
// se carga de luz y gira más rápido; responde al mouse inclinándose. Misma interfaz que la bola anterior.
import * as THREE from '../vendor/three.module.min.js';

const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const VERT = /* glsl */`
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;

const FRAG = /* glsl */`
  uniform float uT; uniform float uE; uniform float uFlash; uniform vec2 uGiro;
  varying vec3 vMundo;
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float ruido(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * ruido(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  void main() {
    vec3 ro = cameraPosition, rd = normalize(vMundo - cameraPosition);
    float b = dot(ro, rd), c = dot(ro, ro) - 1.0, h = b * b - c;
    if (h < 0.0) discard;
    h = sqrt(h);
    float t0 = -b - h, t1 = -b + h;
    vec3 col = vec3(0.0); float alfa = 0.0;
    const int PASOS = 22;
    float paso = (t1 - t0) / float(PASOS);
    float vel = 0.12 + uE * 0.35;
    for (int i = 0; i < PASOS; i++) {
      vec3 p = ro + rd * (t0 + paso * (float(i) + 0.5));
      float r = length(p);
      // Remolino: la nebulosa gira más rápido cerca del centro
      p.xz *= rot(uT * vel + (1.0 - r) * 2.2 + uGiro.x);
      p.yz *= rot(uGiro.y);
      float n = fbm(p * 2.1 + vec3(0.0, uT * 0.08, uT * 0.05));
      float hilos = smoothstep(0.3, 0.78, n) * (1.0 - smoothstep(0.72, 1.0, r));
      float nucleo = exp(-r * r * 12.0) * (0.3 + uE * 0.7 + uFlash);
      vec3 tono = mix(vec3(0.09, 0.2, 0.62), vec3(0.54, 0.85, 1.0), smoothstep(0.45, 0.9, n));
      tono = mix(tono, vec3(0.78, 0.7, 1.0), smoothstep(0.75, 0.95, n) * 0.6);
      float d = hilos * (1.3 + uE * 1.7) + nucleo;
      col += tono * d * paso * 1.7 + vec3(0.85, 0.95, 1.0) * nucleo * paso * 1.6;
      alfa += d * paso * 1.5;
    }
    // Cristal: un velo muy suave y un reflejo arriba a la izquierda, sin contorno
    vec3 nrm = normalize(ro + rd * t0);
    float fres = pow(1.0 - max(dot(nrm, -rd), 0.0), 2.5);
    float borde = smoothstep(1.0, 0.8, fres); // se desvanece hacia el borde: sin línea
    vec2 brillo = nrm.xy - vec2(-0.38, 0.42);
    float reflejo = exp(-dot(brillo, brillo) * 22.0) * 0.55 + exp(-dot(brillo, brillo) * 4.0) * 0.08;
    col += vec3(0.05, 0.13, 0.4) * (1.0 - fres) * 1.1 + vec3(0.5, 0.78, 1.0) * pow(fres, 1.5) * 1.1 * borde + vec3(1.0) * reflejo * borde;
    col = 1.0 - exp(-col * 1.25); // la luz no se quema
    alfa = clamp(alfa + 0.45 * (1.0 - fres * 0.5) + pow(fres, 1.5) * 0.55 * borde + reflejo, 0.0, 1.0) * borde;
    gl_FragColor = vec4(col, alfa);
  }`;

function montarOrbe(lienzo) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true, premultipliedAlpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camara.position.set(0, 0, 4.4);
  const uniforms = { uT: { value: 0 }, uE: { value: 0.2 }, uFlash: { value: 0 }, uGiro: { value: new THREE.Vector2() } };
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false }));
  escena.add(esfera);

  // Chispas que orbitan dentro del cristal
  const N = 260, pos = new Float32Array(N * 3), fase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 0.25 + Math.random() * 0.62, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 1.2 * Math.sqrt(1 - r * r);
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); fase[i] = Math.random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const chispas = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uT: uniforms.uT, uE: uniforms.uE, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float fase; uniform float uT; uniform float uE; uniform float uPx; varying float vA;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        vA = (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (1.5 + fase) + fase * 7.0), 3.0)) * (0.5 + uE);
        gl_PointSize = (2.0 + 3.0 * vA) * uPx * (4.0 / -mv.z); }`,
    fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(0.8, 0.93, 1.0) * a * 1.4, a * vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  // Las chispas de adentro quedan apagadas (en Walkiverso la bola va solo con la nebulosa): descomentar para volver a verlas
  // escena.add(chispas);

  let objetivo = 0.2, e = 0.2, pulsoV = 0, flash = 0, visible = true, sobre = 0, vivo = true;
  const mouse = new THREE.Vector2(), giro = new THREE.Vector2();
  const medir = () => { const l = lienzo.clientWidth || 300; renderer.setSize(l, l, false); camara.aspect = 1; camara.updateProjectionMatrix(); };
  medir();
  new ResizeObserver(medir).observe(lienzo);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); }).observe(lienzo);
  const contenedor = lienzo.parentElement;
  contenedor.addEventListener('pointerenter', () => { sobre = 1; });
  contenedor.addEventListener('pointerleave', () => { sobre = 0; mouse.set(0, 0); });
  contenedor.addEventListener('pointermove', (ev) => {
    const r = contenedor.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width - 0.5) * 2, ((ev.clientY - r.top) / r.height - 0.5) * 2);
  });

  let raf = 0, ultimo = performance.now();
  const cuadro = (ahora) => {
    raf = 0;
    if (!vivo || !visible || !lienzo.isConnected) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
    uniforms.uT.value += dt;
    e += (objetivo + sobre * 0.15 + pulsoV - e) * Math.min(1, dt * 2.2);
    pulsoV *= Math.pow(0.04, dt);
    flash *= Math.pow(0.02, dt);
    giro.lerp(mouse, Math.min(1, dt * 2.5));
    uniforms.uE.value = e; uniforms.uFlash.value = flash;
    uniforms.uGiro.value.set(giro.x * 0.6, giro.y * 0.4);
    chispas.rotation.y += dt * (0.15 + e * 0.5);
    chispas.rotation.x = giro.y * 0.25;
    esfera.position.y = chispas.position.y = Math.sin(uniforms.uT.value * 0.9) * 0.035;
    renderer.render(escena, camara);
    if (!reducido) raf = requestAnimationFrame(cuadro);
  };
  const seguir = () => { if (!raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } };
  seguir();

  return {
    energia(v) { objetivo = v; if (reducido) seguir(); },
    pulso(v) { pulsoV = Math.min(0.8, pulsoV + v); },
    /** El deseo sale del orbe como una luz que sube hasta perderse. */
    async soltar(el) {
      flash = 1.4; pulsoV = 0.8;
      if (reducido) return;
      const r = el.getBoundingClientRect();
      const luz = document.createElement('span');
      luz.className = 'wk-deseo-luz';
      luz.style.left = `${r.left + r.width / 2}px`; luz.style.top = `${r.top + r.height / 2}px`;
      document.body.append(luz);
      luz.animate([
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + 60px), calc(-50% - ${r.top + 200}px)) scale(0.3)`, opacity: 0 },
      ], { duration: 1600, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' }).finished.then(() => luz.remove());
      await espera(900);
    },
    destruir() { vivo = false; cancelAnimationFrame(raf); renderer.dispose(); },
  };
}

/**
 * La bola recién se arma cuando su sección se acerca a la pantalla: crear un gráfico 3D cuesta,
 * y así no le roba tiempo a lo primero que se ve. Si el navegador no puede, usa la bola de respaldo.
 */
export function crearOrbe3D(lienzo, respaldo) {
  let real = null, energia = 0.2;
  const montar = () => {
    try { real = montarOrbe(lienzo); } catch { real = respaldo ? respaldo(lienzo) : null; }
    real?.energia(energia);
  };
  const io = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting || real) return;
    io.disconnect();
    setTimeout(montar, 0);
  }, { rootMargin: '500px 0px' });
  io.observe(lienzo);
  return {
    energia(v) { energia = v; real?.energia(v); },
    pulso(v) { real?.pulso(v); },
    async soltar(el) { if (real) await real.soltar(el); },
    destruir() { io.disconnect(); real?.destruir?.(); },
  };
}

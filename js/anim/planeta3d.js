// Walkurio en 3D: un planeta que se dibuja solo a partir de su geografía (js/datos/walkurio.js), sin fotos.
// El relieve, los climas, los mares y las nubes se calculan una vez en la placa de video y quedan "horneados" en
// texturas (primero una chica para empezar ya, después la grande de a franjas, sin trabar la página).
// La cámara apunta siempre a un punto de la superficie: girar es mover ese punto; acercarse, bajar; y viajar a una
// zona es llevar ese punto, la altura y la inclinación hasta ella.
import * as THREE from '../vendor/three.module.min.js';

const RAD = Math.PI / 180;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Latitud y longitud (grados) → dirección en la esfera. La longitud 0 mira a la cámara al llegar. */
export const dirDe = (lat, lon, v = new THREE.Vector3()) =>
  v.set(Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD));

// Altura de la cámara sobre la superficie (radio del planeta = 1) e inclinación (radianes) en cada nivel de zoom.
// El nivel 0 (el planeta entero) se calcula según la pantalla para que entre completo.
const ALTURA = [null, 0.95, 0.34, 0.15, 0.08];
const INCLINA = [0, 0.22, 0.6, 0.92, 1.05];
// Cada zona tiene su propio horneado de detalle (un "parche" nítido): cuántos grados cubre en cada nivel
const PARCHE = [null, 46, 17, 8, 4];

const RUIDO = /* glsl */`
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
  float fbm(vec3 p, int oct) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 8; i++) { if (i >= oct) break; v += a * snoise(p); p = p * 2.03 + 1.7; a *= 0.5; }
    return v;
  }`;

// ---------- Horneado: color (+ agua), normal (+ altura) y nubes, en coordenadas de textura de la esfera ----------
const HORNO_FRAG = /* glsl */`
  uniform int uModo;
  uniform float uPaso;
  uniform vec4 uParche;
  uniform float uFino;
  uniform vec4 uCont[NC];
  uniform vec4 uCordA[NR];
  uniform vec4 uCordB[NR];
  uniform vec4 uSeca[NS];
  uniform vec4 uHum[NH];
  varying vec2 vUv;
  ${RUIDO}
  // Igual que SphereGeometry de three: así cada texel cae justo en su lugar de la esfera
  // En un parche, la textura es un rectángulo de latitud y longitud alrededor de la zona
  vec3 dirParche(vec2 uv) { float la = uParche.x + (uv.y - 0.5) * uParche.z; float lo = uParche.y + (uv.x - 0.5) * uParche.w; return vec3(cos(la) * sin(lo), sin(la), cos(la) * cos(lo)); }
  vec3 dirUV(vec2 uv) { float f = uv.x * 6.28318531; float t = (1.0 - uv.y) * 3.14159265; return vec3(-cos(f) * sin(t), cos(t), sin(f) * sin(t)); }
  float angulo(vec3 a, vec3 b) { return acos(clamp(dot(a, b), -1.0, 1.0)); }
  float distArco(vec3 p, vec3 a, vec3 b) {
    vec3 n = normalize(cross(a, b));
    vec3 q = p - n * dot(p, n);
    float lq = length(q);
    if (lq > 1e-4) { q /= lq; if (dot(cross(a, q), n) > 0.0 && dot(cross(q, b), n) > 0.0) return asin(clamp(abs(dot(p, n)), 0.0, 1.0)); }
    return min(angulo(p, a), angulo(p, b));
  }
  float crestas(vec3 p) {
    float v = 0.0, a = 0.5, w = 1.0;
    for (int i = 0; i < 6; i++) { float n = 1.0 - abs(snoise(p)); n *= n; n *= w; w = clamp(n * 1.6, 0.0, 1.0); v += n * a; p = p * 2.1 + 0.7; a *= 0.5; }
    return v;
  }
  float terreno(vec3 p, out float mt) {
    vec3 w = normalize(p + 0.11 * vec3(snoise(p * 2.1 + 3.1), snoise(p * 2.1 + 8.7), snoise(p * 2.1 + 15.3)));
    w = normalize(w + 0.025 * vec3(snoise(p * 9.0 + 1.0), snoise(p * 9.0 + 4.0), snoise(p * 9.0 + 6.0)));
    float m = -1.0;
    for (int i = 0; i < NC; i++) m = max(m, 1.0 - angulo(w, uCont[i].xyz) / uCont[i].w);
    float e = clamp(m, -1.0, 1.0) * 0.5 + fbm(p * 2.4 + 2.0, 5) * 0.2 + fbm(p * 11.0, 3) * 0.04 - 0.05;
    mt = 0.0;
    for (int i = 0; i < NR; i++) mt = max(mt, (1.0 - smoothstep(0.0, uCordA[i].w, distArco(w, uCordA[i].xyz, uCordB[i].xyz))) * uCordB[i].w);
    float r = crestas(p * 5.0 + 1.3);
    e += mt * (0.08 + r * 0.75) * smoothstep(-0.02, 0.08, e);
    // Relieve suave en las llanuras (colinas)
    e += (crestas(p * 14.0) - 0.35) * 0.05 * smoothstep(0.0, 0.1, e);
    // De cerca (parches): más detalle en el relieve, que de lejos no se ve
    if (uFino > 0.0) e += ((crestas(p * 48.0) - 0.35) * 0.018 + snoise(p * 180.0) * 0.004) * smoothstep(0.0, 0.06, e) * (0.4 + mt);
    else e += snoise(p * 40.0) * 0.003 * smoothstep(0.0, 0.06, e);
    return e;
  }
  void main() {
    vec3 p = uParche.z > 0.0 ? dirParche(vUv) : dirUV(vUv);
    float mt;
    if (uModo == 1) {
      // Normal del relieve (el agua es plana) y altura
      vec3 t1 = normalize(cross(abs(p.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), p));
      vec3 t2 = cross(p, t1);
      float h0 = max(terreno(p, mt), 0.0);
      float h1 = max(terreno(normalize(p + t1 * uPaso), mt), 0.0);
      float h2 = max(terreno(normalize(p + t2 * uPaso), mt), 0.0);
      vec3 n = normalize(p - ((h1 - h0) * t1 + (h2 - h0) * t2) / uPaso * 0.07);
      gl_FragColor = vec4(n * 0.5 + 0.5, clamp(h0, 0.0, 1.0));
      return;
    }
    if (uModo == 2) {
      // Nubes: remolinos grandes y vetas estiradas de este a oeste
      vec3 q = p * 1.7;
      vec3 warp = vec3(fbm(q + 1.0, 4), fbm(q + 5.2, 4), fbm(q + 9.7, 4));
      float c = 0.5 + 0.5 * fbm(p * 2.2 + warp * 1.5, 6);
      float n = smoothstep(0.55, 0.82, c);
      float velo = 0.5 + 0.5 * fbm(p * vec3(3.0, 6.5, 3.0) + warp * 1.1, 4);
      n = max(n, smoothstep(0.6, 0.85, velo) * 0.35);
      n *= 0.7 + 0.3 * smoothstep(-0.4, 0.4, fbm(p * 8.0 + warp, 3));
      n *= 0.75 + 0.25 * smoothstep(0.0, 0.5, abs(p.y));
      gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(n, 0.0, 1.0));
      return;
    }
    float e = terreno(p, mt);
    float lat = asin(clamp(p.y, -1.0, 1.0));
    float seco = 0.0, hum = 0.0;
    for (int i = 0; i < NS; i++) seco = max(seco, 1.0 - smoothstep(0.0, uSeca[i].w, angulo(p, uSeca[i].xyz)));
    for (int i = 0; i < NH; i++) hum = max(hum, 1.0 - smoothstep(0.0, uHum[i].w, angulo(p, uHum[i].xyz)));
    float humedad = 0.46 + fbm(p * 3.3 + 11.0, 4) * 0.5 + hum * 0.4 - seco * 0.55 + mt * 0.08;
    float temp = cos(lat) * 1.25 - 0.36 - max(e, 0.0) * 0.55 + fbm(p * 4.0 + 30.0, 3) * 0.16;
    float detalle = snoise(p * 40.0) * 0.5 + snoise(p * 95.0) * 0.3 + snoise(p * 260.0) * 0.2 * uFino;
    vec3 col; float agua = 0.0;
    if (e < 0.0) {
      float prof = -e;
      col = mix(vec3(0.16, 0.62, 0.62), vec3(0.05, 0.25, 0.46), smoothstep(0.0, 0.075, prof));
      col = mix(col, vec3(0.025, 0.11, 0.27), smoothstep(0.03, 0.28, prof));
      float hielo = smoothstep(0.03, -0.06, temp + snoise(p * 14.0) * 0.05);
      col = mix(col, vec3(0.84, 0.9, 0.96), hielo);
      agua = 1.0 - hielo;
    } else {
      vec3 seca = vec3(0.64, 0.53, 0.37), estepa = vec3(0.52, 0.5, 0.32), pradera = vec3(0.33, 0.42, 0.19);
      vec3 bosque = vec3(0.11, 0.25, 0.09), roca = vec3(0.4, 0.32, 0.24), rocaAlta = vec3(0.56, 0.52, 0.47);
      float hh = humedad + detalle * 0.16;
      col = mix(seca, estepa, smoothstep(0.24, 0.4, hh));
      col = mix(col, pradera, smoothstep(0.4, 0.52, hh));
      col = mix(col, bosque, smoothstep(0.56, 0.66, hh));
      col = mix(col, vec3(0.42, 0.44, 0.38), smoothstep(0.32, 0.08, temp) * 0.7);
      float alto = smoothstep(0.18, 0.42, e) * clamp(0.75 + 0.5 * snoise(p * 60.0), 0.0, 1.0);
      col = mix(col, mix(roca, rocaAlta, smoothstep(0.45, 0.7, e)), alto);
      float nieve = max(smoothstep(0.7, 0.8, e + snoise(p * 50.0) * 0.06 + snoise(p * 160.0) * 0.03), smoothstep(0.06, -0.04, temp + snoise(p * 20.0) * 0.05));
      col = mix(col, vec3(0.93, 0.95, 0.98), nieve);
      col = mix(vec3(0.74, 0.68, 0.5), col, smoothstep(0.0, 0.01, e));
    }
    gl_FragColor = vec4(col, agua);
  }`;

// ---------- El planeta en pantalla ----------
const ESFERA_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vP;
  void main() { vUv = uv; vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const PLANETA_FRAG = /* glsl */`
  uniform sampler2D uColor; uniform sampler2D uNormal; uniform sampler2D uNubes;
  uniform vec3 uSol; uniform float uGiroNubes; uniform float uDetalle;
  uniform sampler2D uPColor; uniform sampler2D uPNormal; uniform vec4 uParche; uniform float uPPeso;
  varying vec2 vUv; varying vec3 vP;
  ${RUIDO}
  void main() {
    vec4 c = texture2D(uColor, vUv);
    vec4 tn = texture2D(uNormal, vUv);
    vec3 P = normalize(vP);
    if (uPPeso > 0.0) {
      float la = asin(clamp(P.y, -1.0, 1.0)), lo = atan(P.x, P.z);
      vec2 q = vec2(mod(lo - uParche.y + 3.14159265, 6.28318531) - 3.14159265, la - uParche.x) / uParche.wz + 0.5;
      float borde = smoothstep(0.0, 0.1, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y))) * uPPeso;
      if (borde > 0.0) { c = mix(c, texture2D(uPColor, q), borde); tn = mix(tn, texture2D(uPNormal, q), borde); }
    }
    vec3 n = normalize(tn.xyz * 2.0 - 1.0);
    float agua = c.a;
    vec3 col = c.rgb;
    if (uDetalle > 0.01) {
      // De cerca, un poco de textura fina para que no se vea borroso
      float d = snoise(P * 190.0) * 0.6 + snoise(P * 460.0) * 0.4;
      col *= 1.0 + d * 0.13 * (1.0 - agua) * uDetalle;
      n = normalize(n + vec3(snoise(P * 320.0 + 3.0), snoise(P * 320.0 + 7.0), snoise(P * 320.0 + 11.0)) * 0.06 * (1.0 - agua) * uDetalle);
    }
    vec3 V = normalize(cameraPosition - P);
    vec3 L = normalize(uSol);
    float dg = dot(P, L);
    float dia = smoothstep(-0.14, 0.28, dg);
    float dif = mix(max(dot(n, L), 0.0), max(dg, 0.0) * 0.7 + 0.3, agua);
    col = col * (vec3(0.03, 0.06, 0.13) + vec3(1.0, 0.97, 0.92) * dif * 1.18 * dia);
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(P, H), 0.0), 80.0) * 0.5 + pow(max(dot(P, H), 0.0), 14.0) * 0.03 * (1.0 - uDetalle);
    col += vec3(0.85, 0.93, 1.0) * sp * agua * dia;
    float sombra = texture2D(uNubes, vUv + vec2(uGiroNubes + 0.0025, 0.0015)).a;
    col *= 1.0 - sombra * 0.32 * dia;
    float fr = pow(1.0 - max(dot(P, V), 0.0), 2.6);
    col = mix(col, vec3(0.32, 0.6, 1.0) * (0.12 + 0.9 * dia), fr * 0.7 * (1.0 - 0.45 * uDetalle));
    // Un poco del azul de Walkiverso en todo, para que no se despegue de la paleta
    col = mix(col, col * vec3(0.9, 0.97, 1.1), 0.5);
    gl_FragColor = vec4(col, 1.0);
  }`;

const NUBES_FRAG = /* glsl */`
  uniform sampler2D uNubes; uniform vec3 uSol; uniform float uGiroNubes; uniform float uCerca;
  varying vec2 vUv; varying vec3 vP;
  void main() {
    float a = texture2D(uNubes, vUv + vec2(uGiroNubes, 0.0)).a;
    float dia = smoothstep(-0.12, 0.3, dot(normalize(vP), normalize(uSol)));
    gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * (0.05 + 0.95 * dia), a * 0.8 * (1.0 - uCerca * 0.85));
  }`;

const ATMOS_FRAG = /* glsl */`
  uniform vec3 uSol; varying vec3 vW;
  void main() {
    vec3 ro = cameraPosition; vec3 rd = normalize(vW - ro);
    vec3 c = ro + rd * max(-dot(ro, rd), 0.0);
    float d = length(c);
    float g = pow(clamp((1.06 - d) / 0.06, 0.0, 1.0), 2.4);
    float dia = smoothstep(-0.4, 0.45, dot(normalize(c), normalize(uSol)));
    vec3 col = vec3(0.3, 0.58, 1.0) * g * (0.12 + 1.15 * dia);
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
  }`;

// Suma luz al color sin tocar la transparencia del lienzo: así el halo y las estrellas no tapan el fondo de la página
// (los shaders que lo usan devuelven el color ya multiplicado por su transparencia)
const SUMAR = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor };

function estrellas(cuantas) {
  const pos = new Float32Array(cuantas * 3), dat = new Float32Array(cuantas * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < cuantas; i++) {
    v.randomDirection();
    // Una franja más poblada, como una vía láctea
    if (i % 3 === 0) { v.y *= 0.18; v.normalize(); }
    v.multiplyScalar(22 + Math.pow(Math.random(), 0.6) * 260);
    pos.set([v.x, v.y, v.z], i * 3);
    dat.set([Math.random(), 0.8 + Math.pow(Math.random(), 3) * 2.4, 0.35 + Math.random() * 0.65], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aDat', new THREE.BufferAttribute(dat, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDpr: { value: 1 } },
    vertexShader: `attribute vec3 aDat; uniform float uT; uniform float uDpr; varying float vA; varying float vTono;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aDat.y * uDpr; vTono = aDat.x; vA = aDat.z * (0.7 + 0.3 * sin(uT * (0.5 + aDat.x * 1.8) + aDat.x * 40.0)); }`,
    fragmentShader: `varying float vA; varying float vTono;
      void main() { float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5)) * vA;
        gl_FragColor = vec4(mix(vec3(0.75, 0.86, 1.0), vec3(1.0, 0.95, 0.88), vTono) * a, a); }`,
    transparent: true, depthWrite: false, ...SUMAR,
  });
  return new THREE.Points(g, m);
}

/**
 * Arma el planeta en `lienzo` (un <canvas>). Devuelve los controles; tira error si el navegador no tiene WebGL.
 * geografia: GEOGRAFIA de js/datos/walkurio.js.
 */
export function crearPlaneta(lienzo, geografia) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const chico = innerWidth < 750;
  const dpr = Math.min(devicePixelRatio || 1, chico ? 1.6 : 1.75);
  renderer.setPixelRatio(dpr);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);

  // --- Horneado ---
  const uDir = (lista, radio) => lista.map(([la, lo, r]) => { const d = dirDe(la, lo); return new THREE.Vector4(d.x, d.y, d.z, (radio ?? r) * RAD); });
  const cord = geografia.cordilleras;
  const horno = new THREE.ShaderMaterial({
    defines: { NC: geografia.continentes.length, NR: cord.length, NS: geografia.secas.length, NH: geografia.humedas.length },
    uniforms: {
      uModo: { value: 0 }, uPaso: { value: 0.002 }, uParche: { value: new THREE.Vector4() }, uFino: { value: 0 },
      uCont: { value: uDir(geografia.continentes) },
      uCordA: { value: cord.map(([a, b, , , ancho]) => { const d = dirDe(a, b); return new THREE.Vector4(d.x, d.y, d.z, ancho * RAD); }) },
      uCordB: { value: cord.map(([, , a, b, , alto]) => { const d = dirDe(a, b); return new THREE.Vector4(d.x, d.y, d.z, alto); }) },
      uSeca: { value: uDir(geografia.secas) }, uHum: { value: uDir(geografia.humedas) },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: HORNO_FRAG,
    depthTest: false, depthWrite: false,
  });
  const cuadro2D = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), horno);
  cuadro2D.frustumCulled = false;
  const escenaHorno = new THREE.Scene().add(cuadro2D);
  const camHorno = new THREE.Camera();
  const destino = (ancho, alto = ancho / 2) => new THREE.WebGLRenderTarget(ancho, alto, {
    depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
  });
  const sinParche = new THREE.Vector4();
  /** Hornea un modo en `rt`, en la franja de filas [desde, hasta). Con `parche`, solo esa porción del planeta, con más detalle. */
  const hornear = (rt, modo, desde = 0, hasta = rt.height, parche = null) => {
    horno.uniforms.uModo.value = modo;
    horno.uniforms.uParche.value.copy(parche ?? sinParche);
    horno.uniforms.uFino.value = parche ? 1 : 0;
    horno.uniforms.uPaso.value = (parche ? parche.z : Math.PI) / rt.height;
    rt.scissor.set(0, desde, rt.width, hasta - desde); rt.scissorTest = true;
    renderer.setRenderTarget(rt);
    renderer.render(escenaHorno, camHorno);
    renderer.setRenderTarget(null);
  };
  const crear = (ancho) => ({ color: destino(ancho), normal: destino(ancho), nubes: destino(Math.min(ancho, 2048)) });
  const bajo = crear(512);
  hornear(bajo.color, 0); hornear(bajo.normal, 1); hornear(bajo.nubes, 2);
  const max = renderer.capabilities.maxTextureSize;
  const alto = crear(chico || max < 8192 ? 2048 : 4096);
  const pendientes = [];
  for (const [clave, modo] of [['color', 0], ['normal', 1], ['nubes', 2]]) {
    const rt = alto[clave], franja = Math.ceil(rt.height / 40);
    for (let y = 0; y < rt.height; y += franja) pendientes.push(() => hornear(rt, modo, y, Math.min(rt.height, y + franja)));
  }

  // Parches de detalle: dos lugares que se turnan; se hornea en el libre y, cuando está listo, pasa a mostrarse
  const ladoParche = chico ? 1024 : 2048;
  const parches = [0, 1].map(() => ({ color: destino(ladoParche, ladoParche), normal: destino(ladoParche, ladoParche), zona: new THREE.Vector4() }));
  let parcheVisible = -1, colaParche = [], pesoParche = 0, pesoObjetivo = 0;
  const pedirParche = (lat, lon, n) => {
    const tam = PARCHE[Math.min(n, PARCHE.length - 1)] * RAD;
    const zona = new THREE.Vector4(lat * RAD, lon * RAD, tam, Math.min(Math.PI, tam / Math.max(0.25, Math.cos(lat * RAD))));
    const libreP = parches[parcheVisible === 0 ? 1 : 0];
    const franja = Math.ceil(ladoParche / 24);
    colaParche = [];
    for (const [rt, modo] of [[libreP.color, 0], [libreP.normal, 1]]) {
      for (let y = 0; y < ladoParche; y += franja) colaParche.push(() => hornear(rt, modo, y, Math.min(ladoParche, y + franja), zona));
    }
    colaParche.push(() => {
      libreP.zona.copy(zona);
      parcheVisible = parches.indexOf(libreP);
      const u = matPlaneta.uniforms;
      u.uPColor.value = libreP.color.texture; u.uPNormal.value = libreP.normal.texture; u.uParche.value.copy(zona);
      pesoObjetivo = 1;
    });
  };

  // --- Escena ---
  const uSol = { value: new THREE.Vector3(-0.5, 0.5, 1).normalize() };
  const uGiroNubes = { value: 0 };
  const geo = new THREE.SphereGeometry(1, chico ? 160 : 220, chico ? 100 : 140);
  const matPlaneta = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: bajo.color.texture }, uNormal: { value: bajo.normal.texture }, uNubes: { value: bajo.nubes.texture }, uSol, uGiroNubes, uDetalle: { value: 0 },
      uPColor: { value: null }, uPNormal: { value: null }, uParche: { value: new THREE.Vector4(0, 0, 1, 1) }, uPPeso: { value: 0 } },
    vertexShader: ESFERA_VERT, fragmentShader: PLANETA_FRAG,
  });
  const planeta = new THREE.Mesh(geo, matPlaneta);
  const matNubes = new THREE.ShaderMaterial({
    uniforms: { uNubes: { value: bajo.nubes.texture }, uSol, uGiroNubes, uCerca: { value: 0 } },
    vertexShader: ESFERA_VERT, fragmentShader: NUBES_FRAG, transparent: true, depthWrite: false,
  });
  const nubes = new THREE.Mesh(geo, matNubes);
  nubes.scale.setScalar(1.009);
  const atmosfera = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uSol },
    vertexShader: 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
    fragmentShader: ATMOS_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, ...SUMAR,
  }));
  const cielo = estrellas(chico ? 1800 : 3200);
  cielo.material.uniforms.uDpr.value = dpr;
  escena.add(cielo, planeta, nubes, atmosfera);

  // --- Cámara: punto de la superficie al que mira (lat, lon), altura e inclinación ---
  const cam = { lat: 8, lon: 0, h: 2.2, t: 0 };
  let nivel = 0, libre = null, ancho = 1, altoPx = 1;
  const alturaPlaneta = () => {
    // Que el planeta entero (con su halo) entre en el espacio libre
    const lw = libre?.w ?? ancho, lh = libre?.h ?? altoPx;
    const quiero = Math.max(120, Math.min(lw, lh) * 0.46);
    const s = (altoPx / 2) / (Math.tan(camara.fov * RAD / 2) * quiero);
    return Math.sqrt(1 + s * s) - 1;
  };
  const alturaDe = (n) => (n === 0 ? alturaPlaneta() : ALTURA[Math.min(n, ALTURA.length - 1)]);
  const S = new THREE.Vector3(), N = new THREE.Vector3(), atras = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const ubicar = () => {
    dirDe(cam.lat, cam.lon, S);
    N.copy(Y).addScaledVector(S, -S.y).normalize();
    atras.copy(S).multiplyScalar(Math.cos(cam.t)).addScaledVector(N, -Math.sin(cam.t));
    camara.position.copy(S).addScaledVector(atras, cam.h);
    camara.up.copy(N).multiplyScalar(Math.cos(cam.t)).addScaledVector(S, Math.sin(cam.t));
    camara.lookAt(S);
    // El sol acompaña a la cámara desde arriba a la izquierda: lo que mirás siempre está de día
    const der = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 0);
    const arr = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 1);
    const haciaCam = camara.position.clone().normalize();
    uSol.value.copy(haciaCam).addScaledVector(der, -0.55).addScaledVector(arr, 0.5).normalize();
    matPlaneta.uniforms.uDetalle.value = THREE.MathUtils.smoothstep(0.7 - cam.h, 0, 0.55);
    matNubes.uniforms.uCerca.value = THREE.MathUtils.smoothstep(0.5 - cam.h, 0, 0.4);
  };

  const medir = () => {
    ancho = lienzo.clientWidth || 1; altoPx = lienzo.clientHeight || 1;
    renderer.setSize(ancho, altoPx, false);
    camara.aspect = ancho / altoPx;
    if (libre) camara.setViewOffset(ancho, altoPx, -(libre.x + libre.w / 2 - ancho / 2), -(libre.y + libre.h / 2 - altoPx / 2), ancho, altoPx);
    else camara.clearViewOffset();
    camara.updateProjectionMatrix();
    if (nivel === 0 && !vuelo) cam.h = Math.min(cam.h, alturaPlaneta() * 1.4);
  };

  // --- Vuelos ---
  let vuelo = null;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const volarA = (destinoCam, ms = 1700, curva = ease) => new Promise((listo) => {
    const desde = { ...cam };
    let dLon = ((destinoCam.lon - desde.lon) % 360 + 540) % 360 - 180;
    const hacia = { ...destinoCam, lon: desde.lon + dLon };
    if (reducido || ms <= 0) { Object.assign(cam, hacia); vuelo = null; listo(); return; }
    // Si el viaje es largo y la cámara está baja, sube un poco en el medio (como un avión)
    const dist = Math.acos(Math.min(1, dirDe(desde.lat, desde.lon).dot(dirDe(hacia.lat, hacia.lon))));
    const arco = Math.max(0, dist * 0.9 - Math.min(desde.h, hacia.h) * 0.5);
    vuelo = { desde, hacia, t: 0, ms, curva, arco, listo };
  });
  const avanzarVuelo = (dt) => {
    if (!vuelo) return;
    vuelo.t = Math.min(1, vuelo.t + (dt * 1000) / vuelo.ms);
    const k = vuelo.curva(vuelo.t), { desde, hacia } = vuelo;
    cam.lat = desde.lat + (hacia.lat - desde.lat) * k;
    cam.lon = desde.lon + (hacia.lon - desde.lon) * k;
    cam.t = desde.t + (hacia.t - desde.t) * k;
    cam.h = Math.exp(Math.log(desde.h) + (Math.log(hacia.h) - Math.log(desde.h)) * k) + Math.sin(Math.PI * k) * vuelo.arco;
    if (vuelo.t >= 1) { const l = vuelo.listo; vuelo = null; l(); }
  };

  // --- Arrastrar, rueda, pellizco y teclado ---
  const control = new AbortController();
  const { signal } = control;
  const vel = { lon: 0, lat: 0 };
  let quieto = 0, alAlejar = null;
  const punteros = new Map();
  let pellizco = 0;
  const gradosPorPx = () => (cam.h * 75) / altoPx;
  const limitarLat = () => { cam.lat = Math.max(-80, Math.min(80, cam.lat)); };
  const acercar = (f) => {
    const n = nivel, min = n === 0 ? 0.09 : ALTURA[Math.min(n, ALTURA.length - 1)] * 0.45;
    cam.h = Math.max(min, Math.min(alturaPlaneta() * 1.5, cam.h * f));
    quieto = 0;
    if (n > 0 && cam.h > alturaDe(n) * 2.3 && alAlejar) alAlejar();
  };
  lienzo.addEventListener('pointerdown', (e) => {
    if (vuelo) return;
    lienzo.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    vel.lon = vel.lat = 0; quieto = 0;
    lienzo.classList.add('is-arrastrando');
  }, { signal });
  lienzo.addEventListener('pointermove', (e) => {
    const p = punteros.get(e.pointerId);
    if (!p) return;
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      p.x = e.clientX; p.y = e.clientY;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pellizco) acercar(pellizco / d);
      pellizco = d;
      return;
    }
    const k = gradosPorPx(), dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    cam.lon -= dx * k / Math.max(0.25, Math.cos(cam.lat * RAD)); cam.lat += dy * k; limitarLat();
    vel.lon = -dx * k * 30; vel.lat = dy * k * 30;
  }, { signal });
  const soltar = (e) => { punteros.delete(e.pointerId); pellizco = 0; if (!punteros.size) lienzo.classList.remove('is-arrastrando'); };
  lienzo.addEventListener('pointerup', soltar, { signal });
  lienzo.addEventListener('pointercancel', soltar, { signal });
  lienzo.addEventListener('wheel', (e) => { e.preventDefault(); if (!vuelo) acercar(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004)); }, { passive: false, signal });

  // --- Animación ---
  let raf = 0, ultimo = performance.now(), vivo = true, visible = true, reloj = 0, alCuadro = null;
  const ojo = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); });
  ojo.observe(lienzo);
  const ro = new ResizeObserver(medir); ro.observe(lienzo);
  const cuadro = (ahora) => {
    raf = 0;
    if (!vivo || !visible || document.hidden || !lienzo.isConnected) return;
    // Los viajes van por reloj (aunque un cuadro tarde, duran lo que tienen que durar); el resto, por cuadro
    const real = Math.min(0.25, (ahora - ultimo) / 1000), dt = Math.min(0.05, real); ultimo = ahora; reloj += dt;
    // Horneado grande: unas franjas por cuadro; al terminar, el planeta pasa a las texturas nítidas
    if (pendientes.length) {
      pendientes.shift()();
      if (!pendientes.length) {
        matPlaneta.uniforms.uColor.value = alto.color.texture; matPlaneta.uniforms.uNormal.value = alto.normal.texture;
        matPlaneta.uniforms.uNubes.value = matNubes.uniforms.uNubes.value = alto.nubes.texture;
      }
    }
    // Y el parche de la zona, unas franjas por cuadro
    for (let i = 0; i < 2 && colaParche.length; i++) colaParche.shift()();
    pesoParche += (pesoObjetivo - pesoParche) * Math.min(1, dt * 4);
    matPlaneta.uniforms.uPPeso.value = pesoParche < 0.01 ? 0 : pesoParche;
    avanzarVuelo(real);
    if (!vuelo && !punteros.size) {
      // Inercia al soltar y, si nadie lo toca, el planeta gira solo despacio
      cam.lon += vel.lon * dt / Math.max(0.25, Math.cos(cam.lat * RAD)); cam.lat += vel.lat * dt; limitarLat();
      const fren = Math.pow(0.03, dt); vel.lon *= fren; vel.lat *= fren;
      quieto += dt;
      if (nivel === 0 && !reducido && quieto > 3) cam.lon += dt * 2.2 * Math.min(1, (quieto - 3) / 2);
    }
    if (!reducido) uGiroNubes.value = (reloj * 0.0009) % 1;
    cielo.material.uniforms.uT.value = reloj;
    ubicar();
    renderer.render(escena, camara);
    alCuadro?.();
    raf = requestAnimationFrame(cuadro);
  };
  const seguir = () => { if (!raf && vivo) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } };
  document.addEventListener('visibilitychange', seguir, { signal });

  medir();
  cam.h = alturaPlaneta();
  ubicar();
  seguir();

  const v = new THREE.Vector3(), aCam = new THREE.Vector3();
  return {
    /** La llegada desde el espacio: arranca lejos, entre estrellas, y baja hasta ver el planeta entero. */
    llegar(ms = 4600) {
      Object.assign(cam, { lat: 22, lon: -70, h: 70, t: 0 });
      return volarA({ lat: 8, lon: 0, h: alturaPlaneta(), t: 0 }, ms, (x) => 1 - Math.pow(1 - x, 3.2));
    },
    /** Viaja hasta un punto en un nivel de zoom (0 = planeta entero). Sin longitud, se queda en la que está. */
    ir(lat, lon, n, ms) {
      nivel = n; quieto = 0; vel.lon = vel.lat = 0;
      if (n > 0) pedirParche(lat, lon ?? cam.lon, n); else { colaParche = []; pesoObjetivo = 0; }
      const dLat = n === 0 ? Math.max(-35, Math.min(35, lat)) : lat;
      // Inclinada, la cámara queda al sur del punto: se corre un poco al norte para que la zona quede al centro
      return volarA({ lat: dLat, lon: lon ?? cam.lon, h: alturaDe(n), t: INCLINA[Math.min(n, INCLINA.length - 1)] }, ms ?? (n === 0 ? 1900 : 2100));
    },
    zoom(f) { if (!vuelo) acercar(f); },
    girar(dLon, dLat) { if (vuelo) return; const k = cam.h * 12; cam.lon += dLon * k; cam.lat += dLat * k; limitarLat(); quieto = 0; },
    /** Espacio de la pantalla (px dentro del lienzo) donde centrar el planeta: el resto lo tapa el panel. */
    encuadre(r) { libre = r; medir(); },
    /** Dónde cae en pantalla un punto del planeta, y si está de frente (0 a 1). */
    proyectar(lat, lon) {
      dirDe(lat, lon, v).multiplyScalar(1.01);
      aCam.copy(camara.position).sub(v).normalize();
      const frente = aCam.dot(v.clone().normalize());
      v.project(camara);
      return { x: (v.x + 1) / 2 * ancho, y: (1 - v.y) / 2 * altoPx, frente, cerca: v.z < 1 };
    },
    /** ¿Ese punto es agua? Lee el planeta horneado (sirve para revisar que las zonas caigan en tierra). */
    esAgua(lat, lon) {
      const p = dirDe(lat, lon), u = ((Math.atan2(p.z, -p.x) / (2 * Math.PI)) % 1 + 1) % 1, vv = 1 - Math.acos(p.y) / Math.PI;
      const px = new Uint8Array(4);
      renderer.readRenderTargetPixels(bajo.color, Math.floor(u * bajo.color.width), Math.floor(vv * bajo.color.height), 1, 1, px);
      return px[3] > 127;
    },
    get volando() { return !!vuelo; },
    set alCuadro(fn) { alCuadro = fn; },
    set alAlejar(fn) { alAlejar = fn; },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); control.abort(); ojo.disconnect(); ro.disconnect();
      for (const g of [bajo, alto]) for (const rt of Object.values(g)) rt.dispose();
      for (const p of parches) { p.color.dispose(); p.normal.dispose(); }
      escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      horno.dispose(); cuadro2D.geometry.dispose(); renderer.dispose();
    },
  };
}

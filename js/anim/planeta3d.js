// Walkurio en 3D: el planeta y sus dos lunas.
// · La superficie sale del mapa de referencia (img/walkurio/, ver .dev/walkurio-mapa.mjs): de ahí la forma de las
//   costas, el color de la tierra, dónde hay montañas y dónde hielo. Encima se calcula relieve y detalle fino, así de
//   cerca se ve nítido aunque el mapa sea chico. Todo se "hornea" una vez en la placa de video: primero una versión
//   chica para empezar ya y después la grande de a franjas, sin trabar la página.
// · Al entrar a una zona se hornea un "parche" de detalle solo para esa porción del planeta.
// · Las lunas son cuerpos aparte, con cráteres, que orbitan despacio. La cámara puede ir del planeta a una luna.
// La cámara apunta siempre a un punto de la superficie de un cuerpo: girar es mover ese punto; acercarse, bajar.
import * as THREE from '../vendor/three.module.min.js';

const RAD = Math.PI / 180;
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Latitud y longitud (grados) → dirección en la esfera. La longitud 0 es el centro del mapa. */
export const dirDe = (lat, lon, v = new THREE.Vector3()) =>
  v.set(Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD));

// Altura de la cámara sobre la superficie (en radios del cuerpo) e inclinación (radianes) en cada nivel de zoom.
// El nivel 0 (el cuerpo entero) se calcula según la pantalla para que entre completo.
const ALTURA = [null, 0.95, 0.34, 0.15, 0.08];
const INCLINA = [0, 0.22, 0.6, 0.92, 1.05];
// Cada zona del planeta tiene su propio horneado de detalle: cuántos grados cubre en cada nivel
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

// ---------- Horneado, en coordenadas de textura de la esfera ----------
// Modos: 0 color del planeta (+ agua en alfa) · 1 normal del planeta (+ altura) · 2 nubes · 3 color de luna · 4 normal de luna
const HORNO_FRAG = /* glsl */`
  uniform int uModo;
  uniform float uPaso;
  uniform vec4 uParche;
  uniform float uFino;
  uniform sampler2D uTierra;
  uniform sampler2D uCampos;
  uniform vec2 uLuna;
  uniform vec3 uClaro;
  uniform vec3 uOscuro;
  varying vec2 vUv;
  ${RUIDO}
  // Igual que SphereGeometry de three: así cada texel cae justo en su lugar de la esfera
  vec3 dirUV(vec2 uv) { float f = uv.x * 6.28318531; float t = (1.0 - uv.y) * 3.14159265; return vec3(-cos(f) * sin(t), cos(t), sin(f) * sin(t)); }
  // En un parche, la textura es un rectángulo de latitud y longitud alrededor de la zona
  vec3 dirParche(vec2 uv) { float la = uParche.x + (uv.y - 0.5) * uParche.z; float lo = uParche.y + (uv.x - 0.5) * uParche.w; return vec3(cos(la) * sin(lo), sin(la), cos(la) * cos(lo)); }
  // Dónde cae un punto de la esfera en el mapa plano (longitud 0 al centro, norte arriba)
  vec2 uvMapa(vec3 p) { return vec2(0.5 + atan(p.x, p.z) / 6.28318531, 0.5 + asin(clamp(p.y, -1.0, 1.0)) / 3.14159265); }
  vec3 campo(vec3 p) { return texture2D(uCampos, uvMapa(p)).rgb; }
  float crestas(vec3 p) {
    float v = 0.0, a = 0.5, w = 1.0;
    for (int i = 0; i < 6; i++) { float n = 1.0 - abs(snoise(p)); n *= n; n *= w; w = clamp(n * 1.6, 0.0, 1.0); v += n * a; p = p * 2.1 + 0.7; a *= 0.5; }
    return v;
  }
  // Altura del planeta: la forma la da el mapa (tierra, montañas); el relieve fino, el ruido
  float terreno(vec3 p, out vec3 w, out vec3 c) {
    w = normalize(p + 0.011 * vec3(snoise(p * 18.0 + 1.0), snoise(p * 18.0 + 4.0), snoise(p * 18.0 + 7.0)));
    c = campo(w);
    float e = (c.r - 0.5) * 0.36 + fbm(p * 16.0, 4) * 0.04;
    float r = crestas(p * 11.0 + 1.3), m = c.g * c.g;
    e += m * (0.05 + r * 0.6) * smoothstep(-0.02, 0.05, e);
    e += (crestas(p * 26.0) - 0.35) * (0.006 + m * 0.03) * smoothstep(0.0, 0.06, e);
    if (uFino > 0.0) e += ((crestas(p * 80.0) - 0.35) * 0.012 + snoise(p * 260.0) * 0.003) * smoothstep(0.0, 0.04, e) * (0.4 + c.g);
    return e;
  }
  // Lunas: cráteres (cuenco y borde) en tres tamaños, sobre llanuras claras y "mares" oscuros
  vec3 azar3(vec3 c) { return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)), dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  float crateres(vec3 p, float escala) {
    vec3 q = p * escala + uLuna.y * 13.0, i = floor(q), f = fract(q);
    float h = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 r = azar3(i + g);
      if (r.z > 0.55 * uLuna.x + 0.2) continue;
      float rad = 0.22 + 0.3 * r.x;
      float d = length(g + r * 0.8 + 0.1 - f) / rad;
      h += (d < 1.0 ? (d * d - 1.0) * 0.6 : 0.0) + smoothstep(1.35, 1.0, d) * smoothstep(0.75, 1.0, d) * 0.3;
    }
    return h;
  }
  float alturaLuna(vec3 p) { return crateres(p, 3.0) * 0.5 + crateres(p, 7.0) * 0.25 + crateres(p, 16.0) * 0.12 + fbm(p * 4.0 + uLuna.y, 4) * 0.12; }
  void main() {
    vec3 p = uParche.z > 0.0 ? dirParche(vUv) : dirUV(vUv);
    if (uModo >= 3) {
      if (uModo == 4) {
        vec3 t1 = normalize(cross(abs(p.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), p)), t2 = cross(p, t1);
        float h0 = alturaLuna(p), h1 = alturaLuna(normalize(p + t1 * uPaso)), h2 = alturaLuna(normalize(p + t2 * uPaso));
        gl_FragColor = vec4(normalize(p - ((h1 - h0) * t1 + (h2 - h0) * t2) / uPaso * 0.012) * 0.5 + 0.5, 1.0);
        return;
      }
      float mar = smoothstep(0.05, 0.35, fbm(p * 1.6 + uLuna.y, 5));
      vec3 col = mix(uClaro, uOscuro, mar * 0.85) * (0.88 + 0.24 * fbm(p * 9.0, 4));
      col *= 1.0 + clamp(crateres(p, 7.0), -0.3, 0.3) * 0.25;
      gl_FragColor = vec4(col, 1.0);
      return;
    }
    vec3 w, c;
    if (uModo == 1) {
      // Normal del relieve (el agua es plana) y altura
      vec3 t1 = normalize(cross(abs(p.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), p));
      vec3 t2 = cross(p, t1);
      float h0 = max(terreno(p, w, c), 0.0);
      float h1 = max(terreno(normalize(p + t1 * uPaso), w, c), 0.0);
      float h2 = max(terreno(normalize(p + t2 * uPaso), w, c), 0.0);
      vec3 n = normalize(p - ((h1 - h0) * t1 + (h2 - h0) * t2) / uPaso * 0.05);
      gl_FragColor = vec4(n * 0.5 + 0.5, clamp(h0, 0.0, 1.0));
      return;
    }
    if (uModo == 2) {
      // Nubes: remolinos grandes y velos estirados de este a oeste; más en las zonas templadas y frías
      vec3 q = p * 1.7;
      vec3 warp = vec3(fbm(q + 1.0, 4), fbm(q + 5.2, 4), fbm(q + 9.7, 4));
      float n = smoothstep(0.56, 0.82, 0.5 + 0.5 * fbm(p * 2.4 + warp * 1.6, 6));
      n = max(n, smoothstep(0.6, 0.86, 0.5 + 0.5 * fbm(p * vec3(3.0, 7.0, 3.0) + warp * 1.2, 5)) * 0.45);
      n *= 0.7 + 0.3 * smoothstep(-0.4, 0.4, fbm(p * 9.0 + warp, 3));
      n *= 0.65 + 0.35 * smoothstep(0.1, 0.6, abs(p.y));
      gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(n, 0.0, 1.0));
      return;
    }
    float e = terreno(p, w, c);
    vec3 col; float agua = 0.0;
    if (e < 0.0) {
      // Agua: azul profundo lejos de la costa y turquesa luminoso cerca (como en el mapa)
      vec3 t1 = normalize(cross(abs(p.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), p)), t2 = cross(p, t1);
      float cerca = 0.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; cerca += campo(normalize(p + (cos(a) * t1 + sin(a) * t2) * 0.03)).r; }
      float t = clamp(max(c.r * 2.1, cerca / 8.0 * 1.7) + snoise(p * 22.0) * 0.06, 0.0, 1.0);
      col = mix(vec3(0.015, 0.075, 0.24), vec3(0.03, 0.2, 0.47), smoothstep(0.0, 0.35, t));
      col = mix(col, vec3(0.08, 0.5, 0.62), smoothstep(0.4, 0.75, t));
      col = mix(col, vec3(0.2, 0.74, 0.72), smoothstep(0.82, 1.0, t));
      col *= 0.94 + 0.12 * fbm(p * 30.0, 3);
      float hielo = smoothstep(0.35, 0.7, c.b + snoise(p * 18.0) * 0.12);
      col = mix(col, vec3(0.86, 0.91, 0.97), hielo);
      agua = 1.0 - hielo;
    } else {
      // Tierra: el color del mapa, con textura fina (bosques en manchas, roca en las montañas) y nieve arriba
      col = texture2D(uTierra, uvMapa(w)).rgb;
      float d = snoise(p * 60.0) * 0.5 + snoise(p * 150.0) * 0.3 + snoise(p * 420.0) * 0.2 * uFino;
      col *= 1.0 + d * 0.16;
      float verde = col.g - max(col.r, col.b);
      col = mix(col, col * vec3(0.72, 0.8, 0.7), smoothstep(0.0, 0.5, snoise(p * 95.0 + 3.0)) * smoothstep(0.0, 0.06, verde));
      col = mix(col, vec3(0.42, 0.35, 0.28), smoothstep(0.3, 0.55, e) * 0.4);
      float nieve = max(smoothstep(0.6, 0.7, e + snoise(p * 55.0) * 0.05 + snoise(p * 170.0) * 0.025), smoothstep(0.35, 0.75, c.b + snoise(p * 25.0) * 0.12));
      col = mix(col, vec3(0.93, 0.95, 0.98), nieve);
      col = mix(vec3(0.78, 0.72, 0.55), col, smoothstep(0.0, 0.006, e));
    }
    gl_FragColor = vec4(col, agua);
  }`;

// ---------- En pantalla ----------
const ESFERA_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vP; varying vec3 vW;
  void main() { vUv = uv; vP = normalize(position); vec4 m = modelMatrix * vec4(position, 1.0); vW = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`;

const PLANETA_FRAG = /* glsl */`
  uniform sampler2D uColor; uniform sampler2D uNormal; uniform sampler2D uNubes;
  uniform vec3 uSol; uniform float uGiroNubes; uniform float uDetalle;
  uniform sampler2D uPColor; uniform sampler2D uPNormal; uniform vec4 uParche; uniform float uPPeso;
  varying vec2 vUv; varying vec3 vP; varying vec3 vW;
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
      col *= 1.0 + d * 0.12 * (1.0 - agua) * uDetalle;
      n = normalize(n + vec3(snoise(P * 320.0 + 3.0), snoise(P * 320.0 + 7.0), snoise(P * 320.0 + 11.0)) * 0.05 * (1.0 - agua) * uDetalle);
    }
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(uSol);
    float dg = dot(P, L);
    float dia = smoothstep(-0.14, 0.28, dg);
    float dif = mix(max(dot(n, L), 0.0), max(dg, 0.0) * 0.7 + 0.3, agua);
    col = col * (vec3(0.03, 0.06, 0.13) + vec3(1.0, 0.97, 0.92) * dif * 1.2 * dia);
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(P, H), 0.0), 80.0) * 0.5 + pow(max(dot(P, H), 0.0), 14.0) * 0.04 * (1.0 - uDetalle);
    col += vec3(0.85, 0.93, 1.0) * sp * agua * dia;
    float sombra = texture2D(uNubes, vUv + vec2(uGiroNubes + 0.0025, 0.0015)).a;
    col *= 1.0 - sombra * 0.3 * dia;
    float fr = pow(1.0 - max(dot(P, V), 0.0), 2.6);
    col = mix(col, vec3(0.32, 0.6, 1.0) * (0.12 + 0.9 * dia), fr * 0.7 * (1.0 - 0.45 * uDetalle));
    col = mix(col, col * vec3(0.94, 0.98, 1.06), 0.5);
    gl_FragColor = vec4(col, 1.0);
  }`;

const NUBES_FRAG = /* glsl */`
  uniform sampler2D uNubes; uniform vec3 uSol; uniform float uGiroNubes; uniform float uCerca;
  varying vec2 vUv; varying vec3 vP;
  void main() {
    float a = texture2D(uNubes, vUv + vec2(uGiroNubes, 0.0)).a;
    float dia = smoothstep(-0.12, 0.3, dot(normalize(vP), normalize(uSol)));
    gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * (0.05 + 0.95 * dia), a * 0.78 * (1.0 - uCerca * 0.85));
  }`;

const LUNA_FRAG = /* glsl */`
  uniform sampler2D uColor; uniform sampler2D uNormal; uniform vec3 uSol; uniform float uAlfa;
  varying vec2 vUv; varying vec3 vP; varying vec3 vW;
  void main() {
    vec3 c = texture2D(uColor, vUv).rgb;
    vec3 n = normalize(texture2D(uNormal, vUv).xyz * 2.0 - 1.0);
    vec3 P = normalize(vP), L = normalize(uSol);
    float dia = smoothstep(-0.08, 0.25, dot(P, L));
    vec3 col = c * (vec3(0.02, 0.035, 0.07) + vec3(1.0, 0.97, 0.94) * max(dot(n, L), 0.0) * 1.15 * dia);
    float fr = pow(1.0 - max(dot(P, normalize(cameraPosition - vW)), 0.0), 3.0);
    col += vec3(0.3, 0.5, 0.9) * fr * 0.12 * dia;
    gl_FragColor = vec4(col, uAlfa);
  }`;

const ATMOS_FRAG = /* glsl */`
  uniform vec3 uSol; varying vec3 vW;
  void main() {
    vec3 ro = cameraPosition; vec3 rd = normalize(vW - ro);
    vec3 c = ro + rd * max(-dot(ro, rd), 0.0);
    float d = length(c);
    float g = pow(clamp((1.06 - d) / 0.06, 0.0, 1.0), 2.4);
    float dia = smoothstep(-0.4, 0.45, dot(normalize(c), normalize(uSol)));
    vec3 col = vec3(0.3, 0.58, 1.0) * g * (0.12 + 1.2 * dia);
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
    dat.set([Math.random(), 0.8 + Math.pow(Math.random(), 3) * 2.2, 0.3 + Math.random() * 0.6], i * 3);
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

/** Posición de una luna en su órbita (grados recorridos `ang`). */
function enOrbita(luna, ang, v = new THREE.Vector3()) {
  const a = ang * RAD, i = luna.inclinacion * RAD;
  return v.set(Math.cos(a) * luna.orbita, -Math.sin(a) * luna.orbita * Math.sin(i), Math.sin(a) * luna.orbita * Math.cos(i));
}

/**
 * Arma Walkurio en `lienzo` (un <canvas>). Carga el mapa, hornea lo necesario para empezar y devuelve los controles.
 * Tira error si el navegador no tiene WebGL o no pudo cargar el mapa.
 * opciones: { mapa: { tierra, campos }, lunas: [...] } (js/datos/walkurio.js).
 */
export async function crearPlaneta(lienzo, { mapa, lunas = [] }) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const chico = innerWidth < 750;
  const dpr = Math.min(devicePixelRatio || 1, chico ? 1.6 : 1.75);
  renderer.setPixelRatio(dpr);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(38, 1, 0.005, 1000);

  // --- El mapa ---
  const cargador = new THREE.TextureLoader();
  const [texTierra, texCampos] = await Promise.all([mapa.tierra, mapa.campos].map((u) => cargador.loadAsync(u)));
  for (const t of [texTierra, texCampos]) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  texTierra.colorSpace = THREE.NoColorSpace;

  // --- Horneado ---
  const horno = new THREE.ShaderMaterial({
    uniforms: {
      uModo: { value: 0 }, uPaso: { value: 0.002 }, uParche: { value: new THREE.Vector4() }, uFino: { value: 0 },
      uTierra: { value: texTierra }, uCampos: { value: texCampos },
      uLuna: { value: new THREE.Vector2() }, uClaro: { value: new THREE.Color() }, uOscuro: { value: new THREE.Color() },
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
  /** Hornea un modo en `rt`, en la franja de filas [desde, hasta). Con `parche`, solo esa porción del planeta. Con `luna`, esa luna. */
  const hornear = (rt, modo, desde = 0, hasta = rt.height, parche = null, luna = null) => {
    const u = horno.uniforms;
    u.uModo.value = modo;
    u.uParche.value.copy(parche ?? sinParche);
    u.uFino.value = parche ? 1 : 0;
    u.uPaso.value = (parche ? parche.z : Math.PI) / rt.height;
    if (luna) { u.uLuna.value.set(luna.crateres, luna.semilla); u.uClaro.value.setRGB(...luna.claro); u.uOscuro.value.setRGB(...luna.oscuro); }
    rt.scissor.set(0, desde, rt.width, hasta - desde); rt.scissorTest = true;
    renderer.setRenderTarget(rt);
    renderer.render(escenaHorno, camHorno);
    renderer.setRenderTarget(null);
  };
  const enFranjas = (cola, rt, modo, partes, parche, luna) => {
    const franja = Math.ceil(rt.height / partes);
    for (let y = 0; y < rt.height; y += franja) cola.push(() => hornear(rt, modo, y, Math.min(rt.height, y + franja), parche, luna));
  };
  const crear = (ancho) => ({ color: destino(ancho), normal: destino(ancho), nubes: destino(Math.min(ancho, 2048)) });
  const bajo = crear(512);
  hornear(bajo.color, 0); hornear(bajo.normal, 1); hornear(bajo.nubes, 2);
  const alto = crear(chico || renderer.capabilities.maxTextureSize < 8192 ? 2048 : 4096);
  const pendientes = [];
  enFranjas(pendientes, alto.color, 0, 40); enFranjas(pendientes, alto.normal, 1, 40); enFranjas(pendientes, alto.nubes, 2, 40);

  // Parches de detalle: dos lugares que se turnan; se hornea en el libre y, cuando está listo, pasa a mostrarse
  const ladoParche = chico ? 1024 : 2048;
  const parches = [0, 1].map(() => ({ color: destino(ladoParche, ladoParche), normal: destino(ladoParche, ladoParche) }));
  let parcheVisible = -1, colaParche = [], pesoParche = 0, pesoObjetivo = 0;
  const pedirParche = (lat, lon, n) => {
    const tam = PARCHE[Math.min(n, PARCHE.length - 1)] * RAD;
    const zona = new THREE.Vector4(lat * RAD, lon * RAD, tam, Math.min(Math.PI, tam / Math.max(0.25, Math.cos(lat * RAD))));
    const libreP = parches[parcheVisible === 0 ? 1 : 0];
    colaParche = [];
    enFranjas(colaParche, libreP.color, 0, 24, zona); enFranjas(colaParche, libreP.normal, 1, 24, zona);
    colaParche.push(() => {
      parcheVisible = parches.indexOf(libreP);
      const u = matPlaneta.uniforms;
      u.uPColor.value = libreP.color.texture; u.uPNormal.value = libreP.normal.texture; u.uParche.value.copy(zona);
      pesoObjetivo = 1;
    });
  };

  // --- Escena: planeta, nubes, atmósfera, lunas, órbitas y estrellas ---
  const uSol = { value: new THREE.Vector3(-0.5, 0.5, 1).normalize() };
  const uGiroNubes = { value: 0 };
  const geo = new THREE.SphereGeometry(1, chico ? 160 : 220, chico ? 100 : 140);
  const matPlaneta = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: bajo.color.texture }, uNormal: { value: bajo.normal.texture }, uNubes: { value: bajo.nubes.texture }, uSol, uGiroNubes, uDetalle: { value: 0 },
      uPColor: { value: null }, uPNormal: { value: null }, uParche: { value: new THREE.Vector4(0, 0, 1, 1) }, uPPeso: { value: 0 },
    },
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

  const cuerpos = new Map([['planeta', { r: 1, centro: new THREE.Vector3() }]]);
  const geoLuna = new THREE.SphereGeometry(1, 96, 64);
  const lunasVivas = lunas.map((l) => {
    const lado = chico ? 512 : 1024;
    const tex = { color: destino(lado), normal: destino(lado) }, previa = { color: destino(256), normal: destino(256) };
    hornear(previa.color, 3, 0, 128, null, l); hornear(previa.normal, 4, 0, 128, null, l);
    enFranjas(pendientes, tex.color, 3, 8, null, l); enFranjas(pendientes, tex.normal, 4, 8, null, l);
    const mat = new THREE.ShaderMaterial({ uniforms: { uColor: { value: previa.color.texture }, uNormal: { value: previa.normal.texture }, uSol, uAlfa: { value: 1 } }, vertexShader: ESFERA_VERT, fragmentShader: LUNA_FRAG, transparent: true });
    const malla = new THREE.Mesh(geoLuna, mat);
    malla.scale.setScalar(l.radio);
    const puntos = Array.from({ length: 257 }, (_, k) => enOrbita(l, k * 360 / 256));
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(puntos), new THREE.LineBasicMaterial({ color: 0x8fc5ff, transparent: true, opacity: 0.12, depthWrite: false }));
    escena.add(malla, linea);
    const viva = { ...l, malla, mat, linea, tex, previa, alfa: 1, centro: malla.position, r: l.radio };
    cuerpos.set(l.id, viva);
    enOrbita(l, l.inicio, malla.position);
    return viva;
  });
  pendientes.push(() => lunasVivas.forEach((l) => { l.mat.uniforms.uColor.value = l.tex.color.texture; l.mat.uniforms.uNormal.value = l.tex.normal.texture; }));

  // --- Cámara: cuerpo, punto de la superficie al que mira (lat, lon), altura (en radios) e inclinación ---
  const cam = { cuerpo: 'planeta', lat: 8, lon: -10, h: 2.2, t: 0 };
  let nivel = 0, libre = null, ancho = 1, altoPx = 1;
  const alturaEntera = (fraccion = 0.46) => {
    // Que el cuerpo entero (con su halo) entre en el espacio libre
    const lw = libre?.w ?? ancho, lh = libre?.h ?? altoPx;
    const quiero = Math.max(100, Math.min(lw, lh) * fraccion);
    const s = (altoPx / 2) / (Math.tan(camara.fov * RAD / 2) * quiero);
    return Math.sqrt(1 + s * s) - 1;
  };
  const alturaDe = (n, cuerpo = cam.cuerpo) => (n === 0 ? alturaEntera(cuerpo === 'planeta' ? 0.46 : 0.3) : ALTURA[Math.min(n, ALTURA.length - 1)]);
  const Y = new THREE.Vector3(0, 1, 0);
  /** Dónde va la cámara para un estado: posición, a qué mira y cuál es "arriba". */
  const pose = (st, out = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), arriba: new THREE.Vector3() }) => {
    const b = cuerpos.get(st.cuerpo) ?? cuerpos.get('planeta');
    const S = dirDe(st.lat, st.lon);
    const N = Y.clone().addScaledVector(S, -S.y).normalize();
    const atras = S.clone().multiplyScalar(Math.cos(st.t)).addScaledVector(N, -Math.sin(st.t));
    out.mira.copy(S).multiplyScalar(b.r).add(b.centro);
    out.pos.copy(out.mira).addScaledVector(atras, st.h * b.r);
    out.arriba.copy(N).multiplyScalar(Math.cos(st.t)).addScaledVector(S, Math.sin(st.t)).normalize();
    return out;
  };
  const poseA = pose(cam), poseB = pose(cam);
  const ubicar = (p) => {
    camara.position.copy(p.pos);
    camara.up.copy(p.arriba);
    camara.lookAt(p.mira);
    camara.updateMatrixWorld();
    // El sol acompaña a la cámara desde arriba a la izquierda: lo que mirás siempre está de día
    const der = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 0);
    const arr = new THREE.Vector3().setFromMatrixColumn(camara.matrixWorld, 1);
    const haciaCam = camara.position.clone().sub(p.mira).normalize();
    uSol.value.copy(haciaCam).addScaledVector(der, -0.55).addScaledVector(arr, 0.5).normalize();
    const hPlaneta = camara.position.length() - 1;
    matPlaneta.uniforms.uDetalle.value = THREE.MathUtils.smoothstep(0.7 - hPlaneta, 0, 0.55);
    matNubes.uniforms.uCerca.value = THREE.MathUtils.smoothstep(0.5 - hPlaneta, 0, 0.4);
  };

  const medir = () => {
    ancho = lienzo.clientWidth || 1; altoPx = lienzo.clientHeight || 1;
    renderer.setSize(ancho, altoPx, false);
    camara.aspect = ancho / altoPx;
    if (libre) camara.setViewOffset(ancho, altoPx, -(libre.x + libre.w / 2 - ancho / 2), -(libre.y + libre.h / 2 - altoPx / 2), ancho, altoPx);
    else camara.clearViewOffset();
    camara.updateProjectionMatrix();
    if (nivel === 0 && !vuelo) cam.h = Math.min(cam.h, alturaDe(0) * 1.4);
  };

  // --- Vuelos (dentro de un cuerpo, o de un cuerpo a otro) ---
  let vuelo = null;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const volarA = (hacia, ms = 1700, curva = ease) => new Promise((listo) => {
    const desde = { ...cam };
    if (hacia.cuerpo === desde.cuerpo) hacia = { ...hacia, lon: desde.lon + ((((hacia.lon - desde.lon) % 360) + 540) % 360 - 180) };
    if (reducido || ms <= 0) { Object.assign(cam, hacia); vuelo = null; listo(); return; }
    const mismo = hacia.cuerpo === desde.cuerpo;
    // Si el viaje es largo y la cámara está baja, sube un poco en el medio (como un avión)
    const dist = mismo ? Math.acos(Math.min(1, dirDe(desde.lat, desde.lon).dot(dirDe(hacia.lat, hacia.lon)))) : 0;
    vuelo = { desde, hacia, t: 0, ms, curva, mismo, arco: Math.max(0, dist * 0.9 - Math.min(desde.h, hacia.h) * 0.5), listo };
  });
  const avanzarVuelo = (dt) => {
    if (!vuelo) return null;
    vuelo.t = Math.min(1, vuelo.t + (dt * 1000) / vuelo.ms);
    const k = vuelo.curva(vuelo.t), { desde, hacia } = vuelo;
    let p = null;
    if (vuelo.mismo) {
      cam.lat = desde.lat + (hacia.lat - desde.lat) * k;
      cam.lon = desde.lon + (hacia.lon - desde.lon) * k;
      cam.t = desde.t + (hacia.t - desde.t) * k;
      cam.h = Math.exp(Math.log(desde.h) + (Math.log(hacia.h) - Math.log(desde.h)) * k) + Math.sin(Math.PI * k) * vuelo.arco;
    } else {
      // De un cuerpo a otro: la cámara viaja por el espacio y gira hacia el destino un poco antes de llegar
      pose(desde, poseA); pose(hacia, poseB);
      const salto = poseA.pos.distanceTo(poseB.pos);
      p = { pos: poseA.pos.clone().lerp(poseB.pos, k), mira: poseA.mira.clone().lerp(poseB.mira, vuelo.curva(Math.min(1, vuelo.t * 1.35))), arriba: poseA.arriba.clone().lerp(poseB.arriba, k).normalize() };
      p.pos.addScaledVector(p.pos.clone().normalize(), Math.sin(Math.PI * k) * salto * 0.25);
    }
    if (vuelo.t >= 1) { Object.assign(cam, hacia); const l = vuelo.listo; vuelo = null; l(); return null; }
    return p;
  };

  // --- Arrastrar, rueda, pellizco, tocar y teclado ---
  const control = new AbortController();
  const { signal } = control;
  const vel = { lon: 0, lat: 0 };
  let quieto = 0, alAlejar = null, alTocar = null;
  const punteros = new Map();
  let pellizco = 0, toque = null;
  const gradosPorPx = () => (cam.h * 75) / altoPx;
  const limitarLat = () => { cam.lat = Math.max(-80, Math.min(80, cam.lat)); };
  const acercar = (f) => {
    const n = nivel, min = n === 0 ? (cam.cuerpo === 'planeta' ? 0.09 : 0.4) : ALTURA[Math.min(n, ALTURA.length - 1)] * 0.45;
    cam.h = Math.max(min, Math.min(alturaDe(0) * 1.5, cam.h * f));
    quieto = 0;
    if (n > 0 && cam.h > alturaDe(n) * 2.3 && alAlejar) alAlejar();
  };
  lienzo.addEventListener('pointerdown', (e) => {
    if (vuelo) return;
    lienzo.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    toque = punteros.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
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
  const soltar = (e) => {
    punteros.delete(e.pointerId); pellizco = 0;
    if (!punteros.size) lienzo.classList.remove('is-arrastrando');
    // Un toque corto sin arrastrar: avisa qué punto se tocó (para ubicar zonas)
    if (toque && e.type === 'pointerup' && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) < 6 && performance.now() - toque.t < 500 && alTocar) {
      const r = lienzo.getBoundingClientRect();
      const punto = puntoEn(e.clientX - r.left, e.clientY - r.top);
      if (punto) { vel.lon = vel.lat = 0; alTocar(punto); }
    }
    toque = null;
  };
  lienzo.addEventListener('pointerup', soltar, { signal });
  lienzo.addEventListener('pointercancel', soltar, { signal });
  lienzo.addEventListener('wheel', (e) => { e.preventDefault(); if (!vuelo) acercar(Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.004)); }, { passive: false, signal });

  const rayo = new THREE.Raycaster(), esfera = new THREE.Sphere(), golpe = new THREE.Vector3();
  /** Qué punto de qué cuerpo hay debajo de (x, y) en el lienzo. */
  const puntoEn = (x, y) => {
    rayo.setFromCamera(new THREE.Vector2((x / ancho) * 2 - 1, -(y / altoPx) * 2 + 1), camara);
    let mejor = null;
    for (const [id, b] of cuerpos) {
      if (id !== 'planeta' && b.alfa < 0.5) continue;
      if (!rayo.ray.intersectSphere(esfera.set(b.centro, b.r), golpe)) continue;
      const d = golpe.distanceTo(camara.position);
      if (mejor && d >= mejor.d) continue;
      const l = golpe.clone().sub(b.centro).normalize();
      mejor = { d, cuerpo: id, lat: Math.asin(l.y) / RAD, lon: Math.atan2(l.x, l.z) / RAD };
    }
    return mejor && { cuerpo: mejor.cuerpo, lat: Math.round(mejor.lat * 10) / 10, lon: Math.round(mejor.lon * 10) / 10 };
  };

  // --- Animación ---
  let raf = 0, ultimo = performance.now(), vivo = true, visible = true, reloj = 0, orbitas = 0, alCuadro = null;
  const ojo = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); });
  ojo.observe(lienzo);
  const ro = new ResizeObserver(medir); ro.observe(lienzo);
  const segmento = new THREE.Line3(), cercano = new THREE.Vector3();
  const cuadro = (ahora) => {
    raf = 0;
    if (!vivo || !visible || document.hidden || !lienzo.isConnected) return;
    // Los viajes van por reloj (aunque un cuadro tarde, duran lo que tienen que durar); el resto, por cuadro
    const real = Math.min(0.25, (ahora - ultimo) / 1000), dt = Math.min(0.05, real); ultimo = ahora; reloj += dt;
    // Horneado grande (y el de las lunas): una franja por cuadro; al terminar, el planeta pasa a las texturas nítidas
    if (pendientes.length) {
      pendientes.shift()();
      if (!pendientes.length || pendientes.length === lunasVivas.length * 16 + 1) {
        matPlaneta.uniforms.uColor.value = alto.color.texture; matPlaneta.uniforms.uNormal.value = alto.normal.texture;
        matPlaneta.uniforms.uNubes.value = matNubes.uniforms.uNubes.value = alto.nubes.texture;
      }
    }
    for (let i = 0; i < 2 && colaParche.length; i++) colaParche.shift()();
    pesoParche += (pesoObjetivo - pesoParche) * Math.min(1, dt * 4);
    matPlaneta.uniforms.uPPeso.value = pesoParche < 0.01 ? 0 : pesoParche;
    // Las lunas avanzan por su órbita (muy despacio)
    if (!reducido) orbitas += real;
    for (const l of lunasVivas) enOrbita(l, l.inicio + (orbitas * 360) / l.vuelta, l.malla.position);
    const enVuelo = avanzarVuelo(real);
    if (!vuelo && !punteros.size) {
      // Inercia al soltar y, si nadie lo toca un rato, gira solo muy despacio
      cam.lon += vel.lon * dt / Math.max(0.25, Math.cos(cam.lat * RAD)); cam.lat += vel.lat * dt; limitarLat();
      const fren = Math.pow(0.03, dt); vel.lon *= fren; vel.lat *= fren;
      quieto += dt;
      if (nivel === 0 && cam.cuerpo === 'planeta' && !reducido && quieto > 6) cam.lon += dt * 1.4 * Math.min(1, (quieto - 6) / 3);
    }
    if (!reducido) uGiroNubes.value = (reloj * 0.0008) % 1;
    cielo.material.uniforms.uT.value = reloj;
    ubicar(enVuelo ?? pose(cam, poseA));
    // Una luna que se cruza delante de la cámara (o la envuelve) se desvanece; las órbitas, solo de lejos
    const cerca = cam.cuerpo !== 'planeta' || nivel > 0;
    for (const l of lunasVivas) {
      segmento.set(camara.position, (enVuelo ?? poseA).mira);
      segmento.closestPointToPoint(l.centro, true, cercano);
      const tapa = cerca && cam.cuerpo !== l.id && (cercano.distanceTo(l.centro) < l.r * 2.4 || camara.position.distanceTo(l.centro) < l.r * 4);
      l.alfa += ((tapa ? 0 : 1) - l.alfa) * Math.min(1, dt * 5);
      l.mat.uniforms.uAlfa.value = l.alfa;
      l.malla.visible = l.alfa > 0.02;
      l.linea.material.opacity = 0.12 * (1 - Math.min(1, matPlaneta.uniforms.uDetalle.value * 3)) * (cam.cuerpo === 'planeta' ? 1 : 0.4);
    }
    renderer.render(escena, camara);
    alCuadro?.();
    raf = requestAnimationFrame(cuadro);
  };
  const seguir = () => { if (!raf && vivo) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } };
  document.addEventListener('visibilitychange', seguir, { signal });

  medir();
  cam.h = alturaDe(0);
  ubicar(pose(cam, poseA));
  // Los shaders se compilan en paralelo y recién ahí arranca la animación
  await renderer.compileAsync(escena, camara).catch(() => {});
  seguir();

  const v = new THREE.Vector3(), aCam = new THREE.Vector3(), normal = new THREE.Vector3();
  /** ¿El planeta tapa el segmento de la cámara a `p`? */
  const tapadoPorPlaneta = (p) => {
    rayo.ray.origin.copy(camara.position); rayo.ray.direction.copy(p).sub(camara.position);
    const d = rayo.ray.direction.length(); rayo.ray.direction.normalize();
    return !!rayo.ray.intersectSphere(esfera.set(cuerpos.get('planeta').centro, 0.995), golpe) && golpe.distanceTo(camara.position) < d - 0.01;
  };
  return {
    /** La llegada desde el espacio: arranca lejos, entre estrellas, y baja hasta ver el planeta entero. */
    llegar(ms = 4600) {
      Object.assign(cam, { cuerpo: 'planeta', lat: 22, lon: -80, h: 70, t: 0 });
      return volarA({ cuerpo: 'planeta', lat: 8, lon: -10, h: alturaDe(0, 'planeta'), t: 0 }, ms, (x) => 1 - Math.pow(1 - x, 3.2));
    },
    /**
     * Viaja a un lugar: { cuerpo, lat, lon } en un nivel de zoom (0 = el cuerpo entero).
     * Sin latitud, se queda en la que está (en una luna, la mira desde el lado opuesto al planeta).
     */
    ir({ cuerpo = 'planeta', lat = null, lon = null }, n, ms) {
      nivel = n; quieto = 0; vel.lon = vel.lat = 0;
      const b = cuerpos.get(cuerpo) ?? cuerpos.get('planeta');
      if (lat === null) {
        if (cuerpo !== 'planeta' && cuerpo !== cam.cuerpo) { const d = b.centro.clone().normalize(); lat = Math.asin(d.y) / RAD; lon = Math.atan2(d.x, d.z) / RAD; }
        else if (cuerpo === cam.cuerpo) { lat = cam.lat; lon = cam.lon; }
        else { const d = camara.position.clone().normalize(); lat = Math.asin(d.y) / RAD; lon = Math.atan2(d.x, d.z) / RAD; }
      }
      if (cuerpo === 'planeta' && n > 0) pedirParche(lat, lon, n); else if (cuerpo === 'planeta') { colaParche = []; pesoObjetivo = 0; }
      const dLat = n === 0 ? Math.max(-35, Math.min(35, lat)) : lat;
      return volarA({ cuerpo, lat: dLat, lon, h: alturaDe(n, cuerpo), t: INCLINA[Math.min(n, INCLINA.length - 1)] }, ms ?? (cuerpo !== cam.cuerpo ? 2600 : n === 0 ? 1900 : 2100));
    },
    zoom(f) { if (!vuelo) acercar(f); },
    girar(dLon, dLat) { if (vuelo) return; const k = cam.h * 12; cam.lon += dLon * k; cam.lat += dLat * k; limitarLat(); quieto = 0; },
    /** Espacio de la pantalla (px dentro del lienzo) donde centrar lo que se mira: el resto lo tapa el panel. */
    encuadre(r) { libre = r; medir(); },
    /**
     * Dónde cae en pantalla un lugar ({ cuerpo, lat, lon }; sin lat, el centro del cuerpo) y si se ve:
     * frente va de 0 (de espaldas o tapado) a 1 (de frente).
     */
    proyectar({ cuerpo = 'planeta', lat = null, lon = null }) {
      const b = cuerpos.get(cuerpo) ?? cuerpos.get('planeta');
      let frente = 1;
      if (lat === null) v.copy(b.centro);
      else {
        dirDe(lat, lon, normal); v.copy(normal).multiplyScalar(b.r * 1.01).add(b.centro);
        frente = aCam.copy(camara.position).sub(v).normalize().dot(normal);
      }
      if (cuerpo !== 'planeta' && (tapadoPorPlaneta(v) || (b.alfa ?? 1) < 0.5)) frente = 0;
      v.project(camara);
      return { x: (v.x + 1) / 2 * ancho, y: (1 - v.y) / 2 * altoPx, frente, cerca: v.z < 1 };
    },
    /** ¿Ese punto del planeta es agua? (lee el planeta horneado; sirve para revisar que las zonas caigan en tierra) */
    esAgua(lat, lon) {
      const p = dirDe(lat, lon), u = ((Math.atan2(p.z, -p.x) / (2 * Math.PI)) % 1 + 1) % 1, vv = 1 - Math.acos(p.y) / Math.PI;
      const px = new Uint8Array(4);
      renderer.readRenderTargetPixels(bajo.color, Math.floor(u * bajo.color.width), Math.floor(vv * bajo.color.height), 1, 1, px);
      return px[3] > 127;
    },
    /** Dónde está la cámara (para depurar). */
    get estado() { return { ...cam, nivel, vuelo: !!vuelo, pos: camara.position.toArray() }; },
    get volando() { return !!vuelo; },
    set alCuadro(fn) { alCuadro = fn; },
    set alAlejar(fn) { alAlejar = fn; },
    /** fn({ cuerpo, lat, lon }) al tocar un punto sin arrastrar. */
    set alTocar(fn) { alTocar = fn; },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); control.abort(); ojo.disconnect(); ro.disconnect();
      for (const g of [bajo, alto, ...parches, ...lunasVivas.flatMap((l) => [l.tex, l.previa])]) for (const rt of Object.values(g)) rt.dispose();
      escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      texTierra.dispose(); texCampos.dispose(); horno.dispose(); cuadro2D.geometry.dispose(); renderer.dispose();
    },
  };
}

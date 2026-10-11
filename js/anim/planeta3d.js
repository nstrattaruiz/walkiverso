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
const ALTURA = [null, 0.95, 0.34, 0.15, 0.08, 0.075];
const INCLINA = [0, 0.22, 0.6, 0.92, 1.05, 1.27];
// Cada zona del planeta tiene su propio horneado de detalle: cuántos grados cubre en cada nivel
const PARCHE = [null, 46, 17, 8, 4, 18];
// Paisaje de cerca (nivel 5): cuánto se levanta el relieve (en radios del planeta) y tamaño de árboles, rocas y témpanos
const NIVEL_PAISAJE = 5;
const ESCALA_RELIEVE = 0.024;
const TAM = 0.0032;

// Ruido: se lee de una textura chica de números al azar (texturaRuido) en vez de calcularse. Así los programas quedan
// chicos y se preparan enseguida: con el ruido calculado, Chrome en Windows tardaba segundos y congelaba la página.
const RUIDO = /* glsl */`
  uniform sampler2D uRuido;
  float ruido01(vec3 x) {
    vec3 p = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    // Las cuatro esquinas se leen exactas y se mezclan acá: la mezcla de la placa de video es poco precisa y de cerca
    // dejaba rayas
    vec2 uv = p.xy + vec2(37.0, 17.0) * p.z;
    vec2 a = texture2D(uRuido, (uv + vec2(0.5, 0.5)) / 256.0).yx, b = texture2D(uRuido, (uv + vec2(1.5, 0.5)) / 256.0).yx;
    vec2 c = texture2D(uRuido, (uv + vec2(0.5, 1.5)) / 256.0).yx, d = texture2D(uRuido, (uv + vec2(1.5, 1.5)) / 256.0).yx;
    vec2 rg = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    return mix(rg.x, rg.y, f.z);
  }
  float snoise(vec3 v) { return ruido01(v) * 2.6 - 1.3; }
  float fbm(vec3 p, int oct) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 8; i++) { if (i >= oct) break; v += a * snoise(p); p = p * 2.03 + 1.7; a *= 0.5; }
    return v;
  }`;

/** La textura de números al azar del ruido: el canal verde repite al rojo corrido (37, 17), para leer dos capas de una vez. */
function texturaRuido() {
  // Siempre los mismos números (semilla fija): así el planeta es igual en cada visita
  const N = 256, sorteo = numerosAl(20261010), azar = Uint8Array.from({ length: N * N }, () => Math.floor(sorteo() * 256)), datos = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    datos.set([azar[i], azar[((y - 17 + N) % N) * N + ((x - 37 + N) % N)], 0, 255], i * 4);
  }
  const tx = new THREE.DataTexture(datos, N, N);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.minFilter = tx.magFilter = THREE.NearestFilter;
  tx.needsUpdate = true;
  return tx;
}

// ---------- Horneado, en coordenadas de textura de la esfera ----------
// Un programa chico por tarea (MODO), que se preparan en paralelo antes de usarse: un programa grande con todo junto
// tardaba en compilar y en algunas compus congelaba el navegador la primera vez.
// Planeta: 0 color (+ agua en alfa) · 1 normal (+ altura) · 2 nubes.
// Lunas: 3 altura (una sola vez: los cráteres son lo que más cuesta) · 4 normal · 5 color, los dos leyendo esa altura.
const HORNO_COMUN = /* glsl */`
  uniform vec4 uParche;
  uniform float uFino;
  varying vec2 vUv;
  ${RUIDO}
  // Igual que SphereGeometry de three: así cada texel cae justo en su lugar de la esfera
  vec3 dirUV(vec2 uv) { float f = uv.x * 6.28318531; float t = (1.0 - uv.y) * 3.14159265; return vec3(-cos(f) * sin(t), cos(t), sin(f) * sin(t)); }
  // En un parche, la textura es un rectángulo de latitud y longitud alrededor de la zona
  vec3 dirParche(vec2 uv) { float la = uParche.x + (uv.y - 0.5) * uParche.z; float lo = uParche.y + (uv.x - 0.5) * uParche.w; return vec3(cos(la) * sin(lo), sin(la), cos(la) * cos(lo)); }
  vec3 dir(vec2 uv) { return uParche.z > 0.0 ? dirParche(uv) : dirUV(uv); }`;

// En tres pasos, para que ningún programa repita el terreno (cuesta prepararlo y hornearlo): 6 altura · 7 normal
// (lee la altura) · 8 color (lee la altura). Con FINO 1, el detalle y el paisaje de cerca (parches). 2: nubes.
const HORNO_PLANETA = /* glsl */`
  uniform float uPaso;
  uniform float uPaisaje;
  uniform sampler2D uTierra;
  uniform sampler2D uCampos;
  uniform sampler2D uAltura;
  uniform vec2 uTexel;
  uniform float uK;
  ${HORNO_COMUN}
  // Dónde cae un punto de la esfera en el mapa plano (longitud 0 al centro, norte arriba)
  vec2 uvMapa(vec3 p) { return vec2(0.5 + atan(p.x, p.z) / 6.28318531, 0.5 + asin(clamp(p.y, -1.0, 1.0)) / 3.14159265); }
  vec3 campo(vec3 p) { return texture2D(uCampos, uvMapa(p)).rgb; }
  vec3 torcer(vec3 p) { return normalize(p + 0.011 * vec3(snoise(p * 18.0 + 1.0), snoise(p * 18.0 + 4.0), snoise(p * 18.0 + 7.0))); }
  // La altura de un parche viaja en dos canales (R alto, G bajo)
  float alturaGuardada(vec2 uv) { vec4 a = texture2D(uAltura, uv); return (a.r * 255.0 + a.g) / 255.0 * 2.0 - 1.0; }
#if MODO == 6
  float crestas(vec3 p) {
    float v = 0.0, a = 0.5, w = 1.0;
    for (int i = 0; i < 6; i++) { float n = 1.0 - abs(snoise(p)); n *= n; n *= w; w = clamp(n * 1.6, 0.0, 1.0); v += n * a; p = p * 2.1 + 0.7; a *= 0.5; }
    return v;
  }
  // Altura del planeta: la forma la da el mapa (tierra, montañas); el relieve fino, el ruido
  float terreno(vec3 p, out vec3 w, out vec3 c) {
    w = torcer(p);
    c = campo(w);
    float e = (c.r - 0.5) * 0.36 + fbm(p * 16.0, 4) * 0.04;
    float r = crestas(p * 11.0 + 1.3), m = c.g * c.g;
    e += m * (0.05 + r * 0.6) * smoothstep(-0.02, 0.05, e);
    e += (crestas(p * 26.0) - 0.35) * (0.006 + m * 0.03) * smoothstep(0.0, 0.06, e);
#if FINO
    e += ((crestas(p * 70.0) - 0.35) * 0.022 + (crestas(p * 190.0) - 0.35) * 0.008 + snoise(p * 520.0) * 0.003) * smoothstep(0.0, 0.04, e) * (0.5 + c.g);
    // Paisaje de la zona: 1 montañas · 2 bosque · 3 selva · 4 hielo · 5 desierto · 6 llanura · 7 costa
    if (uPaisaje > 0.5) {
      float tierra = smoothstep(-0.01, 0.05, e);
      if (uPaisaje < 1.5) e += ((crestas(p * 34.0) - 0.3) * 0.2 + (crestas(p * 95.0) - 0.35) * 0.05) * tierra;
      else if (uPaisaje < 3.5) e += (fbm(p * 70.0, 3) * 0.014 + 0.004) * tierra;
      else if (uPaisaje < 4.5) e = e > 0.0 ? e * 0.7 + fbm(p * 50.0, 3) * 0.012 : e;
      else if (uPaisaje < 5.5) e += pow(abs(sin(dot(p, vec3(260.0, 90.0, 140.0)) + snoise(p * 40.0) * 2.5)), 3.0) * 0.016 * tierra;
      else if (uPaisaje < 6.5) e = e > 0.0 ? e * 0.55 + fbm(p * 60.0, 3) * 0.006 : e;
    }
#endif
    return e;
  }
#endif
  void main() {
    vec3 p = dir(vUv);
#if MODO == 2
    // Nubes: remolinos grandes y velos estirados de este a oeste; más en las zonas templadas y frías
    vec3 q = p * 1.7;
    vec3 warp = vec3(fbm(q + 1.0, 4), fbm(q + 5.2, 4), fbm(q + 9.7, 4));
    float n = smoothstep(0.56, 0.82, 0.5 + 0.5 * fbm(p * 2.4 + warp * 1.6, 6));
    n = max(n, smoothstep(0.6, 0.86, 0.5 + 0.5 * fbm(p * vec3(3.0, 7.0, 3.0) + warp * 1.2, 5)) * 0.45);
    n *= 0.7 + 0.3 * smoothstep(-0.4, 0.4, fbm(p * 9.0 + warp, 3));
    n *= 0.65 + 0.35 * smoothstep(0.1, 0.6, abs(p.y));
    gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(n, 0.0, 1.0));
#elif MODO == 6
    // Altura (en dos canales, para que el relieve no salga escalonado)
    vec3 w, c;
    float h01 = clamp(terreno(p, w, c) * 0.5 + 0.5, 0.0, 0.9999) * 255.0;
    gl_FragColor = vec4(floor(h01) / 255.0, fract(h01), c.b, 1.0);
#elif MODO == 7
    // Normal del parche: la superficie en 3D con la altura de los vecinos (el agua es plana)
    vec3 pe = dir(vUv + vec2(uTexel.x, 0.0)), pw = dir(vUv - vec2(uTexel.x, 0.0)), pn = dir(vUv + vec2(0.0, uTexel.y)), ps = dir(vUv - vec2(0.0, uTexel.y));
    float K = uK;
    pe *= 1.0 + max(alturaGuardada(vUv + vec2(uTexel.x, 0.0)), 0.0) * K; pw *= 1.0 + max(alturaGuardada(vUv - vec2(uTexel.x, 0.0)), 0.0) * K;
    pn *= 1.0 + max(alturaGuardada(vUv + vec2(0.0, uTexel.y)), 0.0) * K; ps *= 1.0 + max(alturaGuardada(vUv - vec2(0.0, uTexel.y)), 0.0) * K;
    vec3 n = normalize(cross(pe - pw, pn - ps));
    if (dot(n, p) < 0.0) n = -n;
    gl_FragColor = vec4(n * 0.5 + 0.5, clamp(alturaGuardada(vUv), 0.0, 1.0));
#else
    // Color: la altura ya está calculada; solo se vuelve a leer el mapa
    vec3 w = torcer(p), c = campo(w);
    float e = alturaGuardada(vUv);
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
#if FINO
      // Hielo de cerca: témpanos chicos flotando entre los grandes
      if (abs(uPaisaje - 4.0) < 0.5) {
        float tem = smoothstep(0.55, 0.6, ruido01(p * 70.0) * 0.7 + ruido01(p * 190.0) * 0.3) * smoothstep(-0.14, -0.01, e);
        col = mix(col, vec3(0.88, 0.93, 0.98), tem);
        agua *= 1.0 - tem;
      }
#endif
    } else {
      // Tierra: el color del mapa, con textura fina (bosques en manchas, roca en las montañas) y nieve arriba
      col = texture2D(uTierra, uvMapa(w)).rgb;
      float d = snoise(p * 60.0) * 0.5 + snoise(p * 150.0) * 0.3;
#if FINO
      d += snoise(p * 420.0) * 0.3 + snoise(p * 1100.0) * 0.2;
#endif
      col *= 1.0 + d * 0.17;
      float verde = col.g - max(col.r, col.b);
      col = mix(col, col * vec3(0.72, 0.8, 0.7), smoothstep(0.0, 0.5, snoise(p * 95.0 + 3.0)) * smoothstep(0.0, 0.06, verde));
      col = mix(col, vec3(0.42, 0.35, 0.28), smoothstep(0.3, 0.55, e) * 0.4);
#if FINO
      if (uPaisaje > 1.5) {
        // El color del paisaje elegido, con manchas para que no sea parejo
        float m = 0.5 + 0.5 * snoise(p * 140.0) * 0.7 + 0.5 * snoise(p * 400.0) * 0.3;
        vec3 tono = uPaisaje < 2.5 ? mix(vec3(0.06, 0.17, 0.07), vec3(0.15, 0.27, 0.1), m)
          : uPaisaje < 3.5 ? mix(vec3(0.08, 0.23, 0.06), vec3(0.2, 0.36, 0.1), m)
          : uPaisaje < 4.5 ? mix(vec3(0.8, 0.87, 0.95), vec3(0.96, 0.98, 1.0), m)
          : uPaisaje < 5.5 ? mix(vec3(0.7, 0.54, 0.34), vec3(0.86, 0.7, 0.47), m)
          : uPaisaje < 6.5 ? mix(vec3(0.3, 0.42, 0.16), vec3(0.47, 0.53, 0.23), m)
          : col;
        col = mix(col, tono, uPaisaje < 4.5 && uPaisaje > 3.5 ? 0.85 : 0.72);
      }
#endif
      float nieve = max(smoothstep(0.6, 0.7, e + snoise(p * 55.0) * 0.05 + snoise(p * 170.0) * 0.025), smoothstep(0.35, 0.75, c.b + snoise(p * 25.0) * 0.12));
      col = mix(col, vec3(0.93, 0.95, 0.98), nieve);
      col = mix(vec3(0.78, 0.72, 0.55), col, smoothstep(0.0, 0.006, e));
    }
    gl_FragColor = vec4(col, agua);
#endif
  }`;

const HORNO_LUNA = /* glsl */`
  uniform vec2 uLuna;
  uniform vec3 uClaro;
  uniform vec3 uOscuro;
  uniform sampler2D uAltura;
  uniform vec2 uTexel;
  ${HORNO_COMUN}
  // La altura viaja en dos canales (R alto, G bajo) para que el relieve no salga escalonado
  float altura(vec2 uv) { vec4 a = texture2D(uAltura, uv); return (a.r * 255.0 + a.g) / 255.0 * 2.0 - 1.0; }
#if MODO == 3
  // Cráteres (cuenco y borde) en varios tamaños, sobre llanuras claras y "mares" oscuros
  vec3 azar3(vec3 c) { return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)), dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  float crateres(vec3 p, float escala) {
    vec3 q = p * escala + uLuna.y * 13.0, i = floor(q - 0.5), f = q - i;
    float h = 0.0;
    for (int k = 0; k < 8; k++) {
      vec3 g = vec3(float(k / 4), float(k / 2 - (k / 4) * 2), float(k - (k / 2) * 2));
      vec3 r = azar3(i + g);
      if (r.z > 0.55 * uLuna.x + 0.2) continue;
      float d = length(g + 0.15 + r * 0.7 - f) / (0.16 + 0.2 * r.x);
      h += (d < 1.0 ? (d * d - 1.0) * 0.6 : 0.0) + smoothstep(1.35, 1.0, d) * smoothstep(0.75, 1.0, d) * 0.3;
    }
    return h;
  }
#endif
  void main() {
    vec3 p = dir(vUv);
#if MODO == 3
    float cr = crateres(p, 7.0);
    float h = crateres(p, 3.0) * 0.5 + cr * 0.25 + crateres(p, 16.0) * 0.12 + fbm(p * 4.0 + uLuna.y, 4) * 0.12;
    if (uFino > 0.0) h += crateres(p, 42.0) * 0.05 + snoise(p * 160.0) * 0.006;
    float h01 = clamp(h * 0.5 + 0.5, 0.0, 0.9999) * 255.0;
    float mar = smoothstep(0.05, 0.35, fbm(p * 1.6 + uLuna.y, 5));
    gl_FragColor = vec4(floor(h01) / 255.0, fract(h01), mar, clamp(cr * 1.5 + 0.5, 0.0, 1.0));
#elif MODO == 4
    // Normal: la superficie en 3D con la altura de los vecinos
    vec3 pe = dir(vUv + vec2(uTexel.x, 0.0)), pw = dir(vUv - vec2(uTexel.x, 0.0)), pn = dir(vUv + vec2(0.0, uTexel.y)), ps = dir(vUv - vec2(0.0, uTexel.y));
    const float K = 0.022;
    pe *= 1.0 + altura(vUv + vec2(uTexel.x, 0.0)) * K; pw *= 1.0 + altura(vUv - vec2(uTexel.x, 0.0)) * K;
    pn *= 1.0 + altura(vUv + vec2(0.0, uTexel.y)) * K; ps *= 1.0 + altura(vUv - vec2(0.0, uTexel.y)) * K;
    vec3 n = normalize(cross(pe - pw, pn - ps));
    if (dot(n, p) < 0.0) n = -n;
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
#else
    vec4 a = texture2D(uAltura, vUv);
    vec3 col = mix(uClaro, uOscuro, a.b * 0.85) * (0.88 + 0.24 * fbm(p * 9.0, 4));
    if (uFino > 0.0) col *= 0.94 + 0.12 * fbm(p * 60.0, 3);
    col *= 1.0 + ((a.a - 0.5) / 1.5) * 0.25;
    gl_FragColor = vec4(col, 1.0);
#endif
  }`;

// ---------- En pantalla ----------
const ESFERA_VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vP; varying vec3 vW;
  void main() { vUv = uv; vP = normalize(position); vec4 m = modelMatrix * vec4(position, 1.0); vW = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`;

const PLANETA_FRAG = /* glsl */`
  uniform sampler2D uColor; uniform sampler2D uNormal; uniform sampler2D uNubes;
  uniform vec3 uSol; uniform float uGiroNubes; uniform float uDetalle; uniform float uNoche; uniform float uT; uniform float uNiebla;
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
    // De noche, el lado oscuro queda con luz de luna: se ve, pero azulado y apagado
    col = col * (mix(vec3(0.03, 0.06, 0.13), vec3(0.08, 0.12, 0.21), uNoche) + vec3(1.0, 0.97, 0.92) * dif * 1.2 * dia);
    vec3 H = normalize(L + V);
    float sp = pow(max(dot(P, H), 0.0), 80.0) * 0.5 + pow(max(dot(P, H), 0.0), 14.0) * 0.04 * (1.0 - uDetalle);
    col += vec3(0.85, 0.93, 1.0) * sp * agua * dia;
    float sombra = texture2D(uNubes, vUv + vec2(uGiroNubes + 0.0025, 0.0015)).a;
    col *= 1.0 - sombra * 0.3 * dia;
    float fr = pow(1.0 - max(dot(P, V), 0.0), 2.6);
    col = mix(col, vec3(0.32, 0.6, 1.0) * (0.12 + 0.9 * dia), fr * 0.7 * (1.0 - 0.45 * uDetalle));
    col = mix(col, col * vec3(0.94, 0.98, 1.06), 0.5);
    // En el paisaje de cerca, lo lejano se pierde en una bruma azul (como al mirar el horizonte)
    if (uNiebla > 0.001) {
      float lejos = length(cameraPosition - vW);
      col = mix(col, mix(vec3(0.05, 0.08, 0.16), vec3(0.5, 0.66, 0.88), dia) * (0.25 + 0.75 * dia), (1.0 - exp(-lejos * lejos * 55.0)) * uNiebla * 0.85);
    }
    // Aurora: cortinas de luz suaves cerca de los polos, solo en el lado de noche
    if (uNoche > 0.01) {
      float la = abs(asin(clamp(P.y, -1.0, 1.0)));
      float banda = smoothstep(1.0, 1.12, la) * smoothstep(1.38, 1.2, la);
      float cortina = pow(0.5 + 0.5 * sin(atan(P.x, P.z) * 9.0 + snoise(P * 5.0 + uT * 0.04) * 4.0 + uT * 0.12), 3.0);
      col += vec3(0.25, 0.85, 0.95) * banda * cortina * (1.0 - dia) * uNoche * 0.45;
    }
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
  uniform sampler2D uColor; uniform sampler2D uNormal; uniform vec3 uSol; uniform float uAlfa; uniform float uDetalle;
  uniform sampler2D uPColor; uniform sampler2D uPNormal; uniform vec4 uParche; uniform float uPPeso;
  uniform sampler2D uMapa; uniform float uConMapa; uniform vec3 uTinte;
  varying vec2 vUv; varying vec3 vP; varying vec3 vW;
  ${RUIDO}
  float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
  void main() {
    vec3 c = texture2D(uColor, vUv).rgb;
    vec3 tn = texture2D(uNormal, vUv).xyz;
    // La foto de la luna (mares, cráteres reales): da el color; los cráteres calculados suman detalle y relieve
    vec3 foto = vec3(0.0); vec2 bump = vec2(0.0);
    if (uConMapa > 0.5) {
      vec2 e = vec2(1.0 / 2048.0, 1.0 / 1024.0) * 1.5;
      foto = texture2D(uMapa, vUv).rgb * uTinte;
      bump = vec2(lum(texture2D(uMapa, vUv + vec2(e.x, 0.0)).rgb) - lum(texture2D(uMapa, vUv - vec2(e.x, 0.0)).rgb), lum(texture2D(uMapa, vUv + vec2(0.0, e.y)).rgb) - lum(texture2D(uMapa, vUv - vec2(0.0, e.y)).rgb));
    }
    vec3 P = normalize(vP), L = normalize(uSol);
    if (uPPeso > 0.0) {
      // De cerca, el parche de detalle de la región
      float la = asin(clamp(P.y, -1.0, 1.0)), lo = atan(P.x, P.z);
      vec2 q = vec2(mod(lo - uParche.y + 3.14159265, 6.28318531) - 3.14159265, la - uParche.x) / uParche.wz + 0.5;
      float borde = smoothstep(0.0, 0.1, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y))) * uPPeso;
      if (borde > 0.0) { c = mix(c, texture2D(uPColor, q).rgb, borde); tn = mix(tn, texture2D(uPNormal, q).xyz, borde); }
    }
    vec3 n = normalize(tn * 2.0 - 1.0);
    if (uConMapa > 0.5) {
      c = foto * (0.75 + 0.5 * lum(c) / 0.6);
      vec3 te = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(vP))), tnn = cross(normalize(vP), te);
      n = normalize(n - (te * bump.x + tnn * bump.y) * 3.0);
    }
    if (uDetalle > 0.01) {
      // Polvo y piedritas finas para que no se vea borrosa de cerca
      c *= 1.0 + (snoise(P * 240.0) * 0.6 + snoise(P * 620.0) * 0.4) * 0.09 * uDetalle;
      n = normalize(n + vec3(snoise(P * 380.0 + 3.0), snoise(P * 380.0 + 7.0), snoise(P * 380.0 + 11.0)) * 0.07 * uDetalle);
    }
    float dia = smoothstep(-0.08, 0.25, dot(P, L));
    vec3 col = c * (vec3(0.02, 0.035, 0.07) + vec3(1.0, 0.97, 0.94) * max(dot(n, L), 0.0) * 1.15 * dia);
    float fr = pow(1.0 - max(dot(P, normalize(cameraPosition - vW)), 0.0), 3.0);
    col += vec3(0.3, 0.5, 0.9) * fr * 0.12 * dia;
    gl_FragColor = vec4(col, uAlfa);
  }`;

const ATMOS_FRAG = /* glsl */`
  uniform vec3 uSol; uniform float uApaga; varying vec3 vW;
  void main() {
    vec3 ro = cameraPosition; vec3 rd = normalize(vW - ro);
    vec3 c = ro + rd * max(-dot(ro, rd), 0.0);
    float d = length(c);
    float g = pow(clamp((1.06 - d) / 0.06, 0.0, 1.0), 2.4);
    float dia = smoothstep(-0.4, 0.45, dot(normalize(c), normalize(uSol)));
    vec3 col = vec3(0.3, 0.58, 1.0) * g * (0.12 + 1.2 * dia);
    col += vec3(0.75, 0.82, 1.0) * g * pow(max(dot(rd, normalize(uSol)), 0.0), 5.0) * 1.4;
    col *= 1.0 - uApaga;
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
  }`;

const SOL_FRAG = /* glsl */`
  varying vec2 vUv;
  void main() {
    vec2 q = vUv * 2.0 - 1.0;
    float r = length(q);
    float nucleo = smoothstep(0.032, 0.024, r);
    float halo = exp(-r * r * 60.0) * 0.75 + exp(-r * 7.0) * 0.26;
    float rayos = pow(0.5 + 0.5 * sin(atan(q.y, q.x) * 14.0), 4.0) * exp(-r * 7.0) * 0.18;
    vec3 col = (vec3(1.0, 0.97, 0.9) * nucleo * 1.6 + vec3(1.0, 0.86, 0.64) * (halo + rayos)) * (1.0 - smoothstep(0.8, 1.0, r));
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
  }`;

// Terreno del paisaje de cerca: una malla que cubre el parche y se levanta con la altura horneada (relieve de verdad,
// con silueta contra el horizonte). En los bordes se hunde bajo la esfera, así empalma sin que se note.
const TERRENO_VERT = /* glsl */`
  uniform sampler2D uAltura; uniform vec4 uParche; uniform float uEscala; uniform float uPaso;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vP; varying float vE;
  vec3 dirParche(vec2 uv) { float la = uParche.x + (uv.y - 0.5) * uParche.z; float lo = uParche.y + (uv.x - 0.5) * uParche.w; return vec3(cos(la) * sin(lo), sin(la), cos(la) * cos(lo)); }
  float alto(vec2 uv) { vec4 a = texture2D(uAltura, clamp(uv, 0.0, 1.0)); return max((a.r * 255.0 + a.g) / 255.0 * 2.0 - 1.0, 0.0); }
  vec3 punto(vec2 uv) {
    float borde = smoothstep(0.0, 0.07, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    return dirParche(uv) * (1.0 + (alto(uv) * uEscala + 0.0003) * borde - 0.001 * (1.0 - borde));
  }
  void main() {
    vUv = uv;
    vE = alto(uv);
    vec3 p = punto(uv);
    vN = normalize(cross(punto(uv + vec2(uPaso, 0.0)) - punto(uv - vec2(uPaso, 0.0)), punto(uv + vec2(0.0, uPaso)) - punto(uv - vec2(0.0, uPaso))));
    if (dot(vN, p) < 0.0) vN = -vN;
    vP = normalize(p);
    vec4 m = modelMatrix * vec4(p, 1.0);
    vW = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;
// De cerca, el suelo mezcla fotos reales (img/walkurio/texturas) según la pendiente, la altura y el paisaje: cuatro
// lugares (llano, pendiente, cumbre y uno propio de cada paisaje), cada uno a dos escalas para que no se note la
// repetición. El color del mapa sigue dando el tono general. El agua tiene olas, reflejo del cielo y destellos.
const TERRENO_FRAG = /* glsl */`
  uniform sampler2D uPColor; uniform sampler2D uPNormal; uniform vec3 uSol; uniform float uNoche; uniform float uNiebla;
  uniform sampler2D uS0; uniform sampler2D uS1; uniform sampler2D uS2; uniform sampler2D uS3;
  uniform sampler2D uN0; uniform sampler2D uN1; uniform sampler2D uN2;
  uniform vec3 uT0; uniform vec3 uT1; uniform vec3 uT2; uniform vec3 uT3;
  uniform float uSuelos; uniform float uRepite; uniform float uTiempo; uniform float uTipo;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vP; varying float vE;
  ${RUIDO}
  vec4 suelo(sampler2D s, vec2 uv) { return texture2D(s, uv); }
  vec4 sueloDoble(sampler2D s, vec2 uv) { return mix(texture2D(s, uv), texture2D(s, uv * 0.23 + vec2(0.37, 0.71)), 0.4); }
  // Relieve de una foto (normal map, en sus coordenadas)
  vec2 relFoto(sampler2D s, vec2 uv) { return texture2D(s, uv).xy * 2.0 - 1.0; }
  // Relieve fino a partir de una altura (las derivadas de pantalla dan la pendiente)
  vec3 relieve(vec3 n, float h, float k) {
    vec3 sx = dFdx(vW), sy = dFdy(vW);
    vec3 r1 = cross(sy, n), r2 = cross(n, sx);
    float det = dot(sx, r1);
    vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * k;
    return normalize(abs(det) * n - grad);
  }
  void main() {
    vec4 c = texture2D(uPColor, vUv);
    vec3 fino = normalize(texture2D(uPNormal, vUv).xyz * 2.0 - 1.0);
    vec3 n = normalize(vN + (fino - vP));
    vec3 L = normalize(uSol), V = normalize(cameraPosition - vW);
    float dg = dot(vP, L), dia = smoothstep(-0.14, 0.28, dg), agua = c.a;
    float lejos = length(cameraPosition - vW);
    float cerca = (1.0 - smoothstep(0.14, 0.4, lejos)) * uSuelos;
    vec3 col = c.rgb;
    if (agua < 0.5 && cerca > 0.001) {
      vec2 uv = vUv * uRepite;
      vec4 s0 = sueloDoble(uS0, uv), s1 = suelo(uS1, uv * 0.7), s2 = suelo(uS2, uv), s3 = suelo(uS3, uv * 0.8);
      // Variación del suelo: la altura de dos fotos a escalas grandes (dos lecturas, en vez de un ruido de ocho)
      float var = texture2D(uS3, vUv * 2.3 + 0.17).a * 0.6 + texture2D(uS0, vUv * 7.1).a * 0.4;
      float pend = 1.0 - dot(normalize(vN), vP);
      float wP = smoothstep(0.012, 0.05, pend + (var - 0.5) * 0.02);
      float blanco = smoothstep(0.72, 0.88, min(c.r, min(c.g, c.b)));
      float wC = max(blanco, smoothstep(0.52, 0.66, vE + (var - 0.5) * 0.08));
      float wX = 0.0;
      if (uTipo < 1.5) wX = smoothstep(0.26, 0.4, vE + (var - 0.5) * 0.06) * (1.0 - wC);
      else if (uTipo < 2.5) wX = smoothstep(0.58, 0.72, var) * (1.0 - wP) * 0.75;
      else if (uTipo < 3.5) wX = smoothstep(0.42, 0.62, var);
      else if (uTipo < 4.5) { wC = max(wC, 1.0 - wP); wX = wP * 0.6; }
      else if (uTipo < 5.5) wX = smoothstep(0.45, 0.7, var) * (1.0 - wP);
      else if (uTipo < 6.5) wX = smoothstep(0.6, 0.76, var) * (1.0 - wP);
      else if (uTipo < 7.5) wX = 1.0 - smoothstep(0.004, 0.02, vE);
      else wX = smoothstep(0.55, 0.72, var) * (1.0 - wP) * 0.85;
      vec4 s = mix(s0 * vec4(uT0, 1.0), s1 * vec4(uT1, 1.0), wP);
      s = mix(s, s3 * vec4(uT3, 1.0), wX);
      s = mix(s, s2 * vec4(uT2, 1.0), wC);
      // El color del mapa da el tono general; la foto, el detalle
      float lumMapa = dot(c.rgb, vec3(0.3, 0.59, 0.11)), lumSuelo = dot(s.rgb, vec3(0.3, 0.59, 0.11));
      vec3 detalle = s.rgb * (0.7 + 0.3 * lumMapa / max(lumSuelo, 0.05));
      col = mix(c.rgb, detalle, cerca * 0.88);
      // Relieve de la foto principal del lugar, solo cerca (lejos se apaga para que no haga ruido)
      vec2 g = vec2(0.0);
      if (lejos < 0.16) g = relFoto(uN0, uv * 1.0) * (1.0 - wP) * (1.0 - wC) + relFoto(uN1, uv * 0.7) * wP * (1.0 - wC) + relFoto(uN2, uv) * wC;
      vec3 te = normalize(cross(vec3(0.0, 1.0, 0.0), vP)), tn = cross(vP, te);
      n = normalize(n + (te * g.x + tn * g.y) * 0.85 * cerca * (1.0 - smoothstep(0.04, 0.16, lejos)));
    }
    if (agua > 0.5) {
      // Agua: olas que se mueven, reflejo del cielo y destellos del sol
      vec2 q = vUv * uRepite * 2.0;
      float o = ruido01(vec3(q * 3.0, uTiempo * 0.35)) * 0.6 + ruido01(vec3(q * 9.0 + 5.0, uTiempo * 0.6)) * 0.4;
      vec3 nw = relieve(vP, o, 0.00035 * (1.0 - smoothstep(0.04, 0.16, lejos)));
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(nw, V), 0.0), 5.0);
      vec3 cieloCol = mix(vec3(0.02, 0.04, 0.09), vec3(0.45, 0.62, 0.86), dia);
      vec3 r = reflect(-L, nw);
      col = mix(c.rgb * (0.12 + 0.75 * max(dg, 0.0) * dia) + c.rgb * 0.08 * uNoche, cieloCol, fres * 0.7);
      col += vec3(1.0, 0.95, 0.85) * pow(max(dot(r, V), 0.0), 260.0) * 2.5 * dia + vec3(0.8, 0.9, 1.0) * pow(max(dot(r, V), 0.0), 30.0) * 0.12 * dia;
    } else {
      float dif = max(dot(n, L), 0.0);
      col *= mix(vec3(0.03, 0.06, 0.13), vec3(0.08, 0.12, 0.21), uNoche) + vec3(1.0, 0.97, 0.92) * dif * 1.2 * dia;
    }
    col = mix(col, col * vec3(0.94, 0.98, 1.06), 0.5);
    col = mix(col, mix(vec3(0.05, 0.08, 0.16), vec3(0.5, 0.66, 0.88), dia) * (0.25 + 0.75 * dia), (1.0 - exp(-lejos * lejos * 55.0)) * 0.85 * uNiebla);
    gl_FragColor = vec4(col, 1.0);
  }`;
// El cielo de la vista de cerca: una panorámica (de día con nubes, de noche con estrellas) alrededor de la cámara,
// con el horizonte en el suelo de la zona y el sol de la foto hacia donde está el sol del planeta
const CIELO_FRAG = /* glsl */`
  uniform float uFase; uniform float uVer; uniform mat3 uRot; uniform float uT;
  varying vec3 vD;
  ${RUIDO}
  vec3 azar3(vec3 c) { return fract(sin(vec3(dot(c, vec3(127.1, 311.7, 74.7)), dot(c, vec3(269.5, 183.3, 246.1)), dot(c, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  // Estrellas nítidas: una por celda (algunas), con tamaño, color y titilar propios
  float estrellas(vec3 d, float escala, float cuantas) {
    vec3 q = d * escala, i = floor(q), f = fract(q), r = azar3(i);
    if (r.x > cuantas) return 0.0;
    float dist = length(f - (0.2 + 0.6 * r));
    float brillo = (0.4 + 0.6 * r.y) * (0.75 + 0.25 * sin(uT * (1.0 + r.z * 3.0) + r.x * 50.0));
    return (smoothstep(0.16 + 0.1 * r.z, 0.0, dist) + smoothstep(0.32, 0.0, dist) * 0.08) * brillo;
  }
  void main() {
    vec3 d = normalize(uRot * vD);
    // El día: azul profundo arriba, claro y brumoso en el horizonte, resplandor hacia el sol (eje x) y nubes suaves
    float h = clamp(d.y + 0.1, 0.0, 1.0);
    vec3 dia = mix(vec3(0.62, 0.74, 0.88), vec3(0.16, 0.38, 0.72), pow(h, 0.55));
    float haciaSol = max(d.x, 0.0);
    dia += vec3(1.0, 0.86, 0.62) * (pow(haciaSol, 8.0) * 0.35 + pow(haciaSol, 60.0) * 0.6) * (1.0 - h * 0.5);
    if (uFase < 0.99 && d.y > -0.06) {
      vec3 q = d / max(d.y + 0.18, 0.06) * 0.9;
      float nube = smoothstep(0.52, 0.8, fbm(vec3(q.x + uT * 0.004, q.z, 3.0), 4) * 0.5 + 0.5) * smoothstep(-0.06, 0.12, d.y);
      dia = mix(dia, vec3(0.97, 0.97, 1.0) * (0.85 + 0.15 * haciaSol), nube * 0.75);
    }
    // La noche: un degradé oscuro (la foto de noche, ampliada, se pixelaba), con brillo tenue en el horizonte
    vec3 noche = mix(vec3(0.05, 0.08, 0.16), vec3(0.008, 0.014, 0.035), smoothstep(-0.12, 0.5, d.y));
    // Vía láctea: una franja de polvo de luz que cruza el cielo
    if (uFase > 0.01) {
      float banda = exp(-pow(dot(d, normalize(vec3(0.3, 0.5, 0.81))) * 4.0, 2.0));
      noche += vec3(0.13, 0.16, 0.27) * banda * (0.45 + 0.55 * smoothstep(0.35, 0.75, ruido01(d * 34.0) * 0.6 + ruido01(d * 90.0) * 0.4));
      float e = estrellas(d, 150.0, 0.32) + estrellas(d, 330.0, 0.16 + banda * 0.4) * 0.6 + estrellas(d, 90.0, 0.08) * 1.4;
      noche += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.92, 0.8), fract(e * 17.0)) * e * smoothstep(-0.16, 0.02, d.y);
    }
    vec3 col = mix(dia, noche, uFase);
    float a = uVer;
    gl_FragColor = vec4(col * a, a);
  }`;

/**
 * Lee los modelos de img/walkurio/modelos (los arma .dev/walkurio-modelos.mjs): devuelve { nombre: BufferGeometry },
 * con un grupo por material (corteza, hojas…), de 1 de alto y apoyados en y = 0.
 */
async function cargarModelos(nombres) {
  const indice = await (await fetch('img/walkurio/modelos/modelos.json')).json();
  const geos = {};
  await Promise.all(nombres.map(async (nombre) => {
    const m = indice[nombre], datos = await (await fetch(`img/walkurio/modelos/${nombre}.bin`)).arrayBuffer();
    const v = m.vertices, g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(datos, 0, v * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(datos, v * 12, v * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(datos, v * 24, v * 2), 2));
    g.setIndex(new THREE.BufferAttribute(new (m.indices32 ? Uint32Array : Uint16Array)(datos, v * 32, m.indices), 1));
    m.partes.forEach((p, i) => g.addGroup(p.inicio, p.cuantos, i));
    g.userData.partes = m.partes.map((p) => p.material);
    geos[nombre] = g;
  }));
  return geos;
}

/** Une geometrías (sin índices) en una sola, con un color por pieza (tronco, copa). */
function unir(piezas) {
  const pos = [], nor = [], col = [], uv = [];
  for (const [g, color] of piezas) {
    let s = g;
    if (g.index) { g.computeVertexNormals(); s = g.toNonIndexed(); }
    pos.push(...s.attributes.position.array); nor.push(...s.attributes.normal.array);
    if (s.attributes.uv) uv.push(...s.attributes.uv.array); else for (let i = 0; i < s.attributes.position.count; i++) uv.push(s.attributes.position.getX(i) + 0.5, s.attributes.position.getY(i) + 0.5);
    for (let i = 0; i < s.attributes.position.count; i++) col.push(...color);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
/** Una piedra o un témpano: un poliedro con los vértices movidos al azar (siempre igual, con la misma semilla). */
function irregular(base, cuanto, semilla) {
  const g = base.toNonIndexed(), p = g.attributes.position, azar = numerosAl(semilla), mov = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map((x) => x.toFixed(3)).join();
    if (!mov.has(k)) mov.set(k, 1 + (azar() - 0.5) * cuanto);
    const m = mov.get(k);
    p.setXYZ(i, p.getX(i) * m, p.getY(i) * m, p.getZ(i) * m);
  }
  g.computeVertexNormals();
  return g;
}
/** Números al azar que se repiten con la misma semilla (el mismo bosque cada vez que volvés a la zona). */
function numerosAl(semilla) {
  let a = Math.floor(semilla) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

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
    uniforms: { uT: { value: 0 }, uDpr: { value: 1 }, uBrillo: { value: 1 } },
    vertexShader: `attribute vec3 aDat; uniform float uT; uniform float uDpr; uniform float uBrillo; varying float vA; varying float vTono;
      void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aDat.y * uDpr; vTono = aDat.x; vA = uBrillo * aDat.z * (0.7 + 0.3 * sin(uT * (0.5 + aDat.x * 1.8) + aDat.x * 40.0)); }`,
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

  // --- Horneado ---
  const ruido = texturaRuido();
  // Un programa por tarea, todos con los mismos valores (uH). Se preparan en paralelo mientras baja el mapa, antes de
  // usarlos: así la primera vez no se congela nada.
  const uH = {
    uPaso: { value: 0.002 }, uParche: { value: new THREE.Vector4() }, uFino: { value: 0 },
    uTierra: { value: null }, uCampos: { value: null },
    uLuna: { value: new THREE.Vector2() }, uClaro: { value: new THREE.Color() }, uOscuro: { value: new THREE.Color() },
    uAltura: { value: null }, uTexel: { value: new THREE.Vector2() }, uRuido: { value: ruido }, uPaisaje: { value: 0 }, uK: { value: 0.05 },
  };
  const VERT_HORNO = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  // Un programa por tarea: '6', '8' (planeta entero) y '6f', '8f' (parches, con detalle y paisaje)
  const hornos = Object.fromEntries(['2', '3', '4', '5', '6', '6f', '7', '8', '8f'].map((k) => [k, new THREE.ShaderMaterial({
    defines: { MODO: parseInt(k, 10), FINO: k.endsWith('f') ? 1 : 0 }, uniforms: uH, vertexShader: VERT_HORNO, fragmentShader: '345'.includes(k) ? HORNO_LUNA : HORNO_PLANETA, depthTest: false, depthWrite: false,
  })]));
  const plano = new THREE.PlaneGeometry(2, 2);
  const cuadro2D = new THREE.Mesh(plano, hornos['6']);
  cuadro2D.frustumCulled = false;
  const escenaHorno = new THREE.Scene().add(cuadro2D);
  const camHorno = new THREE.Camera();
  const destino = (ancho, alto = ancho / 2) => new THREE.WebGLRenderTarget(ancho, alto, {
    depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping,
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
  });
  // La altura de las lunas se lee pixel a pixel (va repartida en dos canales): sin suavizado
  const destinoAltura = (ancho, alto = ancho / 2) => new THREE.WebGLRenderTarget(ancho, alto, {
    depthBuffer: false, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, wrapS: THREE.RepeatWrapping,
  });
  const bajo = { altura: destinoAltura(512), color: destino(512), normal: destino(512), nubes: destino(512) };
  // Los programas se compilan para dibujar en texturas (como se van a usar), en paralelo; el mapa baja mientras tanto
  const aCompilar = new THREE.Scene();
  for (const m of Object.values(hornos)) { const q = new THREE.Mesh(plano, m); q.frustumCulled = false; aCompilar.add(q); }
  renderer.setRenderTarget(bajo.color);
  const compilando = renderer.compileAsync(aCompilar, camHorno).catch(() => {});
  renderer.setRenderTarget(null);
  const cargador = new THREE.TextureLoader();
  const [texTierra, texCampos] = await Promise.all([mapa.tierra, mapa.campos].map((u) => cargador.loadAsync(u)));
  for (const tx of [texTierra, texCampos]) { tx.wrapS = THREE.RepeatWrapping; tx.wrapT = THREE.ClampToEdgeWrapping; tx.colorSpace = THREE.NoColorSpace; tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter; }
  uH.uTierra.value = texTierra; uH.uCampos.value = texCampos;
  await compilando;

  const sinParche = new THREE.Vector4();
  /**
   * Hornea un modo en `rt`, en la franja de filas [desde, hasta). Con `parche`, solo esa porción del cuerpo, con más
   * detalle. Con `luna`, los datos de esa luna; con `altura`, la altura ya horneada de la que salen normal y color.
   */
  const hornear = (rt, modo, desde = 0, hasta = rt.height, parche = null, luna = null, altura = null, paisaje = 0) => {
    uH.uPaisaje.value = paisaje;
    cuadro2D.material = hornos[`${modo}${parche && (modo === 6 || modo === 8) ? 'f' : ''}`];
    uH.uK.value = parche ? 0.07 : 0.05;
    uH.uParche.value.copy(parche ?? sinParche);
    uH.uFino.value = parche ? 1 : 0;
    uH.uPaso.value = (parche ? parche.z : Math.PI) / rt.height;
    if (luna) { uH.uLuna.value.set(luna.crateres, luna.semilla); uH.uClaro.value.setRGB(...luna.claro); uH.uOscuro.value.setRGB(...luna.oscuro); }
    if (altura) { uH.uAltura.value = altura.texture; uH.uTexel.value.set(1 / altura.width, 1 / altura.height); }
    rt.scissor.set(0, desde, rt.width, hasta - desde); rt.scissorTest = true;
    renderer.setRenderTarget(rt);
    renderer.render(escenaHorno, camHorno);
    renderer.setRenderTarget(null);
  };
  const enFranjas = (cola, rt, modo, partes, parche, luna, altura, paisaje = 0) => {
    const franja = Math.ceil(rt.height / partes);
    // Las versiones reducidas de la textura (mipmaps) se calculan una sola vez, con la última franja: hacerlo en cada
    // franja, con texturas de 4096 px, frenaba la animación
    const conMip = rt.texture.minFilter === THREE.LinearMipmapLinearFilter;
    for (let y = 0; y < rt.height; y += franja) {
      const hasta = Math.min(rt.height, y + franja);
      cola.push(() => { if (conMip) rt.texture.generateMipmaps = hasta >= rt.height; hornear(rt, modo, y, hasta, parche, luna, altura, paisaje); });
    }
  };
  /** Una luna (o un parche de luna): primero la altura; después normal y color, que la leen. */
  const hornearLuna = (cola, juego, luna, parche = null, partes = 8) => {
    enFranjas(cola, juego.altura, 3, partes * 4, parche, luna);
    enFranjas(cola, juego.normal, 4, partes, parche, luna, juego.altura);
    enFranjas(cola, juego.color, 5, partes, parche, luna, juego.altura);
  };
  // La primera vez que se usa cada programa cuesta un poco: uno por cuadro, para no juntarlo todo en un tirón
  const unCuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
  /** El planeta entero (o una versión): primero la altura; después normal y color, que la leen; y las nubes. */
  const hornearPlaneta = (cola, juego, partes) => {
    enFranjas(cola, juego.altura, 6, partes); enFranjas(cola, juego.normal, 7, partes / 2, null, null, juego.altura);
    enFranjas(cola, juego.color, 8, partes / 2, null, null, juego.altura); enFranjas(cola, juego.nubes, 2, partes / 2);
  };
  for (const h of (() => { const c = []; hornearPlaneta(c, bajo, 2); return c; })()) { h(); await unCuadro(); }
  const lado = chico || renderer.capabilities.maxTextureSize < 8192 ? 2048 : 4096;
  const alto = { altura: destinoAltura(lado), color: destino(lado), normal: destino(lado), nubes: destino(Math.min(lado, 2048)) };
  const pendientes = [];
  hornearPlaneta(pendientes, alto, 64);
  pendientes.push(() => {
    matPlaneta.uniforms.uColor.value = alto.color.texture; matPlaneta.uniforms.uNormal.value = alto.normal.texture;
    matPlaneta.uniforms.uNubes.value = matNubes.uniforms.uNubes.value = alto.nubes.texture;
    alto.altura.dispose();
  });

  // Parches de detalle (del planeta o de una luna): dos lugares que se turnan; se hornea en el libre y, cuando está
  // listo, pasa a mostrarse en su cuerpo
  const ladoParche = chico ? 1024 : 2048;
  const parches = [0, 1].map(() => ({ color: destino(ladoParche, ladoParche), normal: destino(ladoParche, ladoParche), altura: destinoAltura(ladoParche, ladoParche) }));
  let parcheVisible = -1, colaParche = [], pesoParche = 0, pesoObjetivo = 0, cuerpoParche = null;
  const pedirParche = (cuerpo, lat, lon, n, paisaje = 0) => {
    const tam = PARCHE[Math.min(n, PARCHE.length - 1)] * RAD;
    const zona = new THREE.Vector4(lat * RAD, lon * RAD, tam, Math.min(Math.PI, tam / Math.max(0.25, Math.cos(lat * RAD))));
    const libreP = parches[parcheVisible === 0 ? 1 : 0];
    const luna = cuerpo === 'planeta' ? null : cuerpos.get(cuerpo);
    colaParche = [];
    if (luna) hornearLuna(colaParche, libreP, luna, zona, 12);
    else {
      // Primero la altura; después normal y color, que la leen
      enFranjas(colaParche, libreP.altura, 6, 16, zona, null, null, paisaje);
      enFranjas(colaParche, libreP.normal, 7, 8, zona, null, libreP.altura, paisaje);
      enFranjas(colaParche, libreP.color, 8, 8, zona, null, libreP.altura, paisaje);
    }
    colaParche.push(() => {
      parcheVisible = parches.indexOf(libreP);
      if (cuerpoParche !== cuerpo) pesoParche = 0;
      cuerpoParche = cuerpo;
      const u = (luna ? luna.mat : matPlaneta).uniforms;
      u.uPColor.value = libreP.color.texture; u.uPNormal.value = libreP.normal.texture; u.uParche.value.copy(zona);
      pesoObjetivo = 1;
      if (paisaje) armarPaisaje(zona, paisaje, libreP); else quitarPaisaje();
    });
  };

  // --- Escena: planeta, nubes, atmósfera, lunas, órbitas y estrellas ---
  const uSol = { value: new THREE.Vector3(-0.5, 0.5, 1).normalize() };
  const uGiroNubes = { value: 0 };
  const geo = new THREE.SphereGeometry(1, chico ? 160 : 220, chico ? 100 : 140);
  const matPlaneta = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: bajo.color.texture }, uNormal: { value: bajo.normal.texture }, uNubes: { value: bajo.nubes.texture }, uSol, uGiroNubes, uDetalle: { value: 0 }, uRuido: { value: ruido }, uNoche: { value: 0 }, uT: { value: 0 }, uNiebla: { value: 0 },
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
    uniforms: { uSol, uApaga: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }',
    fragmentShader: ATMOS_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, ...SUMAR,
  }));
  const cielo = estrellas(chico ? 1800 : 3200);
  cielo.material.uniforms.uDpr.value = dpr;
  escena.add(cielo, planeta, nubes, atmosfera);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SOL_FRAG, transparent: true, depthWrite: false, ...SUMAR,
  }));
  sol.frustumCulled = false;
  escena.add(sol);
  // --- Paisaje de cerca ---
  const ladoTerreno = chico ? 192 : 320;
  // Texturas: se bajan recién al entrar al primer paisaje y se suben a la placa de a una por cuadro
  const blanco1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  blanco1.needsUpdate = true;
  // Relieve plano (mientras no llega la foto)
  const plano1 = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  plano1.needsUpdate = true;
  const texturas = new Map();
  const cargarTextura = (nombre) => {
    if (!texturas.has(nombre)) texturas.set(nombre, cargador.loadAsync(`img/walkurio/texturas/${nombre}.webp`).then(async (tx) => {
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.NoColorSpace;
      tx.anisotropy = 2;
      await unCuadro(); renderer.initTexture(tx); return tx;
    }));
    return texturas.get(nombre);
  };
  // Qué foto va en cada lugar del suelo según el paisaje: llano, pendiente, cumbre y el propio (con su tinte).
  // 1 montañas · 2 bosque · 3 selva · 4 hielo · 5 desierto · 6 llanura · 7 costa · 8 bosque frío
  const N = [1, 1, 1], VERDE = [0.8, 1.02, 0.72], SELVA = [0.7, 1.1, 0.62];
  const SUELOS = {
    1: [['pasto', N], ['roca', N], ['nieve', N], ['sendero', N]],
    2: [['bosque', VERDE], ['roca', N], ['nieve', N], ['pasto', N]],
    3: [['bosque', SELVA], ['pasto', N], ['roca', N], ['pasto', [0.9, 1.1, 0.8]]],
    4: [['nieve', N], ['gris', N], ['nieve', N], ['roca', N]],
    5: [['arena', N], ['arenisca', N], ['grava', N], ['grava', [1.05, 0.98, 0.9]]],
    6: [['pasto', N], ['roca', N], ['nieve', N], ['sendero', N]],
    7: [['pasto', N], ['roca', N], ['nieve', N], ['playa', N]],
    8: [['nieve', N], ['roca', N], ['nieve', N], ['bosque', [0.85, 0.9, 0.92]]],
  };
  const matTerreno = new THREE.ShaderMaterial({
    uniforms: {
      uAltura: { value: null }, uParche: { value: new THREE.Vector4(0, 0, 1, 1) }, uEscala: { value: 0 }, uPaso: { value: 1 / ladoTerreno },
      uPColor: { value: null }, uPNormal: { value: null }, uSol, uNoche: matPlaneta.uniforms.uNoche, uNiebla: matPlaneta.uniforms.uNiebla,
      uRuido: { value: ruido }, uSuelos: { value: 0 }, uRepite: { value: 46 }, uTiempo: { value: 0 }, uTipo: { value: 0 },
      uS0: { value: blanco1 }, uS1: { value: blanco1 }, uS2: { value: blanco1 }, uS3: { value: blanco1 },
      uN0: { value: plano1 }, uN1: { value: plano1 }, uN2: { value: plano1 },
      uT0: { value: new THREE.Vector3(1, 1, 1) }, uT1: { value: new THREE.Vector3(1, 1, 1) }, uT2: { value: new THREE.Vector3(1, 1, 1) }, uT3: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: TERRENO_VERT, fragmentShader: TERRENO_FRAG,
  });
  const terreno = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, ladoTerreno, ladoTerreno), matTerreno);
  // El cielo de la vista de cerca (las dos panorámicas pesan poco: se bajan junto con las primeras texturas)
  const matCielo = new THREE.ShaderMaterial({
    uniforms: { uFase: matPlaneta.uniforms.uNoche, uVer: { value: 0 }, uRot: { value: new THREE.Matrix3() }, uT: matPlaneta.uniforms.uT, uRuido: { value: ruido } },
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: CIELO_FRAG, side: THREE.BackSide, depthTest: true, depthWrite: false,
  });
  const cieloCerca = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), matCielo);
  cieloCerca.scale.setScalar(50); cieloCerca.renderOrder = 10; cieloCerca.frustumCulled = false; cieloCerca.visible = false;
  escena.add(cieloCerca);
  let suelosK = 0, suelosObjetivo = 0, turnoPaisaje = 0;
  terreno.frustumCulled = false;
  terreno.visible = false;
  escena.add(terreno);
  // Árboles, rocas y témpanos: muchas copias de una misma forma, con luz común (sol y luz ambiente)
  const luzSol = new THREE.DirectionalLight(0xfff2e0, 2.6), luzAmbiente = new THREE.AmbientLight(0xa9c6ff, 0.55);
  const bruma = new THREE.FogExp2(0x7fa8e0, Math.sqrt(55));
  const brumaDia = new THREE.Color().setRGB(0.5, 0.66, 0.88, THREE.SRGBColorSpace), brumaNoche = new THREE.Color().setRGB(0.012, 0.02, 0.04, THREE.SRGBColorSpace);
  escena.add(luzSol, luzAmbiente);
  // La bruma está siempre (sin densidad cuando no hace falta): así los árboles no cambian de programa al aparecer
  escena.fog = bruma;
  bruma.density = 0;
  const uCrece = { value: 0 }, uNieve = { value: 0 };
  // Árboles, arbustos y rocas: modelos de verdad (Quaternius y Poly Haven). Crecen al llegar (uCrece) y, en el bosque
  // frío y la montaña, se cubren de nieve en lo que mira hacia arriba (uNieve).
  const crearMat = ({ hojas = false, nieve = false } = {}) => {
    const m = new THREE.MeshLambertMaterial({ map: blanco1, vertexColors: false, alphaTest: hojas ? 0.45 : 0, side: hojas ? THREE.DoubleSide : THREE.FrontSide });
    m.onBeforeCompile = (s) => {
      s.uniforms.uCrece = uCrece; s.uniforms.uNieve = uNieve;
      s.vertexShader = 'uniform float uCrece;\nvarying vec3 vArriba;\n' + s.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed *= uCrece;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vArriba = normalize((viewMatrix * vec4(normalize((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz), 0.0)).xyz);');
      s.fragmentShader = 'uniform float uNieve;\nvarying vec3 vArriba;\n' + s.fragmentShader
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (nieve ? '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 1.0), uNieve * smoothstep(0.55, 0.95, dot(normal, vArriba)));' : ''));
    };
    return m;
  };
  const MATS = {
    'pino-corteza': crearMat({ nieve: true }), 'pino-hojas': crearMat({ hojas: true, nieve: true }),
    'hoja-corteza': crearMat(), 'hoja-hojas': crearMat({ hojas: true }), 'arbusto-hojas': crearMat({ hojas: true, nieve: true }),
    roca1: crearMat({ nieve: true }), roca2: crearMat({ nieve: true }), tempano: crearMat({ nieve: true }),
  };
  // Qué textura lleva cada material de cada modelo
  const TEX_DE = { PineTree_Bark: 'pino-corteza', PineTree_Leaves: 'pino-hojas', NormalTree_Bark: 'hoja-corteza', NormalTree_Leaves: 'hoja-hojas', Bush_Leaves: 'arbusto-hojas' };
  const texModelos = new Map();
  const texModelo = (nombre) => {
    if (!texModelos.has(nombre)) texModelos.set(nombre, cargador.loadAsync(`img/walkurio/modelos/${nombre}.webp`).then((tx) => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 2; return tx; }));
    return texModelos.get(nombre);
  };
  let modelos = null;
  const conseguirModelos = () => (modelos ??= cargarModelos(['pino1', 'pino2', 'pino3', 'hoja1', 'hoja2', 'arbusto1', 'arbusto2', 'roca1', 'roca2']).then(async (geos) => {
    for (const [mat, tex] of [['pino-corteza'], ['pino-hojas'], ['hoja-corteza'], ['hoja-hojas'], ['arbusto-hojas'], ['roca1'], ['roca2']].map(([m]) => [m, m])) MATS[mat].map = await texModelo(tex);
    for (const r of ['roca1', 'roca2']) { MATS[r].normalMap = await texModelo(`${r}-n`); MATS[r].normalMap.colorSpace = THREE.NoColorSpace; }
    for (const m of Object.values(MATS)) m.needsUpdate = true;
    // Témpanos: una forma simple con la textura de nieve
    geos.tempano = irregular(new THREE.IcosahedronGeometry(0.5, 2), 0.4, 11).scale(1, 0.55, 1).translate(0, 0.1, 0);
    return geos;
  }));
  const materialesDe = (nombre, geo) => (nombre === 'tempano' ? MATS.tempano : nombre.startsWith('roca') ? MATS[nombre] : geo.userData.partes.map((p) => MATS[TEX_DE[p]] ?? MATS['hoja-corteza']));
  let paisajeVivo = null, subida = 0, subidaObjetivo = 0;
  /** Saca el paisaje de cerca: se hunde y después se borra. */
  const quitarPaisaje = () => { subidaObjetivo = 0; };
  const muestraAltura = destinoAltura(256, 256);
  const muestraColor = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: false });
  const leer = (rt) => { const d = new Uint8Array(256 * 256 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 256, 256, d); return d; };
  /** Arma el paisaje de cerca de una zona: el terreno con relieve y, según el paisaje, árboles, rocas o témpanos. */
  const armarPaisaje = (zona, tipo, juego) => {
    for (const m of paisajeVivo?.cosas ?? []) { escena.remove(m); m.dispose(); }
    hornear(muestraAltura, 6, 0, 256, zona, null, null, tipo);
    hornear(muestraColor, 8, 0, 256, zona, null, muestraAltura, tipo);
    const alt = leer(muestraAltura), col = leer(muestraColor);
    const u = matTerreno.uniforms;
    u.uAltura.value = juego.altura.texture; u.uPColor.value = juego.color.texture; u.uPNormal.value = juego.normal.texture; u.uParche.value.copy(zona);
    const azar = numerosAl(Math.abs(zona.x * 1e4 + zona.y * 1e3));
    const muestra = (s, v) => {
      const i = (Math.min(255, Math.floor(v * 256)) * 256 + Math.min(255, Math.floor(s * 256))) * 4;
      return { e: (alt[i] + alt[i + 1] / 255) / 255 * 2 - 1, r: col[i] / 255, g: col[i + 1] / 255, b: col[i + 2] / 255, agua: col[i + 3] > 127 };
    };
    const lugar = (s, v, e, hundir) => {
      const la = zona.x + (v - 0.5) * zona.z, lo = zona.y + (s - 0.5) * zona.w;
      const borde = THREE.MathUtils.smoothstep(Math.min(s, 1 - s, v, 1 - v), 0, 0.07);
      return new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo))
        .multiplyScalar(1 + (Math.max(e, 0) * ESCALA_RELIEVE + 0.0003) * borde - 0.001 * (1 - borde) - hundir);
    };
    const mucho = chico ? 0.5 : 1;
    // Qué se pone y dónde: [modelo, cuántos, dónde vale, tamaño, tinte (r, g, b)]
    const SECO = (m) => !m.agua, BAJO = (lim) => (m) => !m.agua && m.e < lim;
    const PINO = [0.3, 0.42, 0.3], HOJA = [0.4, 0.52, 0.32], SELVAT = [0.32, 0.48, 0.27], ROCA = [1, 1, 1], ARB = [0.3, 0.4, 0.24];
    const reglas = {
      1: [['pino1', 1100, BAJO(0.24), 1.1, PINO], ['pino2', 260, BAJO(0.18), 1.3, PINO], ['roca2', 90, (m) => !m.agua && m.e > 0.1, 0.9, ROCA]],
      2: [['pino1', 4200, BAJO(0.45), 1.45, PINO], ['pino2', 1100, BAJO(0.4), 1.6, PINO], ['pino3', 350, BAJO(0.35), 1.75, PINO], ['arbusto1', 500, BAJO(0.4), 0.35, ARB]],
      3: [['hoja1', 1700, SECO, 1.65, SELVAT], ['hoja2', 70, SECO, 2, SELVAT], ['arbusto2', 1000, SECO, 0.55, ARB], ['arbusto1', 600, SECO, 0.45, ARB]],
      4: [['tempano', 420, (m) => m.agua, 1, ROCA], ['roca2', 40, SECO, 0.8, ROCA]],
      5: [['roca2', 45, SECO, 1.1, [1, 0.94, 0.86]], ['roca1', 110, SECO, 0.45, [1, 0.86, 0.68]]],
      6: [['hoja1', 420, BAJO(0.3), 1.1, HOJA], ['arbusto1', 600, BAJO(0.3), 0.38, ARB], ['arbusto2', 300, BAJO(0.3), 0.42, ARB], ['pino1', 150, BAJO(0.3), 1.05, PINO], ['roca1', 60, SECO, 0.4, ROCA]],
      7: [['hoja1', 500, BAJO(0.3), 1.2, HOJA], ['arbusto2', 500, BAJO(0.3), 0.45, ARB], ['roca2', 90, BAJO(0.12), 0.7, ROCA], ['roca1', 160, BAJO(0.12), 0.4, ROCA]],
      8: [['pino1', 3800, BAJO(0.45), 1.45, PINO], ['pino2', 1000, BAJO(0.4), 1.6, PINO], ['pino3', 320, BAJO(0.35), 1.75, PINO], ['roca2', 40, SECO, 0.7, ROCA]],
    }[tipo] ?? [];
    uNieve.value = tipo === 8 ? 0.6 : tipo === 4 ? 1 : tipo === 1 ? 0.2 : 0;
    const Y = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), giro = new THREE.Quaternion(), inclina = new THREE.Quaternion(), M = new THREE.Matrix4(), c = new THREE.Color();
    const cosas = [];
    const mio = turnoPaisaje + 1;
    conseguirModelos().then(async (geos) => {
      if (mio !== turnoPaisaje) return;
      for (const [forma, cuantos, vale, tam, tono] of reglas) {
        const n = Math.round(cuantos * mucho), malla = new THREE.InstancedMesh(geos[forma], materialesDe(forma, geos[forma]), n);
        let k = 0;
        for (let intento = 0; intento < n * 6 && k < n; intento++) {
          const s = 0.05 + azar() * 0.9, v = 0.05 + azar() * 0.9, m = muestra(s, v);
          if (!vale(m)) continue;
          const flota = forma === 'tempano', roca = forma.startsWith('roca');
          const pos = lugar(s, v, flota ? 0 : m.e, flota ? 0.0004 : 0.00015);
          const arriba = pos.clone().normalize();
          q.setFromUnitVectors(Y, arriba); giro.setFromAxisAngle(arriba, azar() * Math.PI * 2); q.premultiply(giro);
          // Las rocas, cada una ladeada distinto (así no se repiten); los árboles, apenas
          inclina.setFromAxisAngle(new THREE.Vector3(azar() - 0.5, 0, azar() - 0.5).normalize(), (roca ? 0.5 : 0.06) * azar()); q.multiply(inclina);
          const e = TAM * tam * (0.65 + azar() * 0.7);
          M.compose(pos, q, new THREE.Vector3(e * (0.85 + azar() * 0.3), e * (0.85 + azar() * (roca ? 0.5 : 0.35)), e * (0.85 + azar() * 0.3)));
          malla.setMatrixAt(k, M);
          const luz = 0.82 + azar() * 0.36;
          malla.setColorAt(k, c.setRGB(tono[0] * luz, tono[1] * luz, tono[2] * luz, THREE.SRGBColorSpace));
          k++;
        }
        malla.count = k;
        malla.frustumCulled = false;
        malla.visible = false;
        escena.add(malla);
        cosas.push(malla);
      }
      // Se preparan antes de mostrarse (si no, la primera vez trabarían la animación)
      await renderer.compileAsync(escena, camara).catch(() => {});
      if (mio !== turnoPaisaje) { for (const m of cosas) { escena.remove(m); m.dispose(); } return; }
      for (const m of cosas) m.visible = true;
      if (paisajeVivo) paisajeVivo.cosas = cosas;
    }).catch(() => {});
    paisajeVivo = { cosas: [] };
    terreno.visible = true;
    subidaObjetivo = 1;
    u.uTipo.value = tipo;
    suelosK = 0; suelosObjetivo = 0;
    const lugares = SUELOS[tipo] ?? SUELOS[6];
    turnoPaisaje = mio;
    Promise.all([...lugares.map(([nombre]) => cargarTextura(nombre)), ...lugares.slice(0, 3).map(([nombre]) => cargarTextura(`${nombre}-n`))]).then((tx) => {
      if (mio !== turnoPaisaje) return;
      lugares.forEach(([, tinte], i) => { u[`uS${i}`].value = tx[i]; u[`uT${i}`].value.set(...tinte); });
      for (let i = 0; i < 3; i++) u[`uN${i}`].value = tx[4 + i];
      // Los témpanos, con la nieve del lugar
      const nieve = tx[lugares.findIndex(([nombre]) => nombre === 'nieve')];
      if (nieve && MATS.tempano.map === blanco1) { MATS.tempano.map = nieve.clone(); MATS.tempano.map.colorSpace = THREE.SRGBColorSpace; MATS.tempano.map.needsUpdate = true; MATS.tempano.needsUpdate = true; }
      suelosObjetivo = 1;
    }).catch(() => {});
  };
  /** Si la zona no dice qué paisaje es, se decide mirando el mapa en ese punto. */
  const paisajeSegun = (lat, lon) => {
    const p = dirDe(lat, lon), u = ((Math.atan2(p.z, -p.x) / (2 * Math.PI)) % 1 + 1) % 1, vv = 1 - Math.acos(p.y) / Math.PI;
    const x = Math.floor(u * bajo.color.width), y = Math.floor(vv * bajo.color.height), c = new Uint8Array(4), n = new Uint8Array(4);
    renderer.readRenderTargetPixels(bajo.color, x, y, 1, 1, c); renderer.readRenderTargetPixels(bajo.normal, x, y, 1, 1, n);
    const [r, g, b] = [c[0] / 255, c[1] / 255, c[2] / 255];
    if (c[3] > 127) return 7;
    if (r + g + b > 2.3 || Math.abs(lat) > 64) return 4;
    if (n[3] / 255 > 0.32) return 1;
    if (r > g * 1.04 && r > 0.4) return 5;
    if (g > r && g > b && r + g + b < 1.0) return Math.abs(lat) > 40 ? 8 : 2;
    return 6;
  };

  // Día y noche: 0 = día (el sol arriba a un costado, el planeta iluminado), 1 = noche (el sol detrás del planeta)
  let fase = 0, faseObjetivo = 0;

  const cuerpos = new Map([['planeta', { r: 1, centro: new THREE.Vector3() }]]);
  const geoLuna = new THREE.SphereGeometry(1, 96, 64);
  const lunasVivas = lunas.map((l) => {
    const juego = (w) => ({ altura: destinoAltura(w), color: destino(w), normal: destino(w) });
    const tex = juego(chico ? 1024 : 2048), previa = juego(256);
    hornearLuna(pendientes, tex, l, null, 8);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: previa.color.texture }, uNormal: { value: previa.normal.texture }, uSol, uAlfa: { value: 1 }, uDetalle: { value: 0 }, uRuido: { value: ruido },
        uPColor: { value: null }, uPNormal: { value: null }, uParche: { value: new THREE.Vector4(0, 0, 1, 1) }, uPPeso: { value: 0 },
        uMapa: { value: null }, uConMapa: { value: 0 }, uTinte: { value: new THREE.Vector3(...(l.tinte ?? [1, 1, 1])) },
      },
      vertexShader: ESFERA_VERT, fragmentShader: LUNA_FRAG, transparent: true,
    });
    if (l.mapa) cargador.loadAsync(l.mapa).then((tx) => { tx.colorSpace = THREE.NoColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.anisotropy = 4; mat.uniforms.uMapa.value = tx; mat.uniforms.uConMapa.value = 1; }).catch(() => {});
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
  for (const l of lunasVivas) { const ya = []; hornearLuna(ya, l.previa, l, null, 1); for (const h of ya) { h(); await unCuadro(); } }
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
    const luzDia = haciaCam.clone().addScaledVector(der, -0.55).addScaledVector(arr, 0.5).normalize();
    const luzNoche = haciaCam.clone().multiplyScalar(-0.75).addScaledVector(der, -0.5).addScaledVector(arr, 0.4).normalize();
    const k = fase * fase * (3 - 2 * fase);
    uSol.value.copy(luzDia).applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(luzDia, luzNoche), k));
    // El sol se ve arriba a la izquierda de día; al pasar a la noche viaja hasta quedar escondido detrás del planeta
    const enCam = new THREE.Vector3(-0.3, 0.25, -1).lerp(new THREE.Vector3(-0.08, 0.07, -1), k).normalize().transformDirection(camara.matrixWorld);
    sol.position.copy(camara.position).addScaledVector(enCam, 60);
    sol.quaternion.copy(camara.quaternion);
    sol.scale.setScalar(60 * Math.tan(24 * RAD) * 2);
    cielo.material.uniforms.uBrillo.value = 0.45 + 0.55 * k;
    matPlaneta.uniforms.uNoche.value = k;
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
    const n = nivel, min = n === 0 ? (cam.cuerpo === 'planeta' ? 0.09 : 0.4) : ALTURA[Math.min(n, ALTURA.length - 1)] * (n === NIVEL_PAISAJE ? 0.8 : 0.45);
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
  let cargando = true;
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
      for (let i = 1; i < (cargando ? 4 : 1) && pendientes.length > 1; i++) pendientes.shift()();
      pendientes.shift()();
    }
    for (let i = 0; i < 2 && colaParche.length; i++) colaParche.shift()();
    pesoParche += (pesoObjetivo - pesoParche) * Math.min(1, dt * 4);
    const peso = pesoParche < 0.01 ? 0 : pesoParche;
    matPlaneta.uniforms.uPPeso.value = cuerpoParche === 'planeta' ? peso : 0;
    // Las lunas avanzan por su órbita (muy despacio)
    if (!reducido) orbitas += real;
    for (const l of lunasVivas) enOrbita(l, l.inicio + (orbitas * 360) / l.vuelta, l.malla.position);
    const enVuelo = avanzarVuelo(real);
    if (!vuelo && !punteros.size) {
      // Inercia al soltar y, mientras nadie lo toca, gira solo despacio
      cam.lon += vel.lon * dt / Math.max(0.25, Math.cos(cam.lat * RAD)); cam.lat += vel.lat * dt; limitarLat();
      const fren = Math.pow(0.03, dt); vel.lon *= fren; vel.lat *= fren;
      quieto += dt;
      if (nivel === 0 && cam.cuerpo === 'planeta' && !reducido) cam.lon += dt * 2.4 * Math.min(1, quieto / 1.2);
    }
    if (!reducido) uGiroNubes.value = (reloj * 0.0008) % 1;
    cielo.material.uniforms.uT.value = reloj;
    matPlaneta.uniforms.uT.value = reloj;
    // El paso de día a noche (o al revés) dura unos segundos: se ve al sol cruzar y a la sombra barrer el planeta
    if (fase !== faseObjetivo) fase = reducido ? faseObjetivo : faseObjetivo > fase ? Math.min(faseObjetivo, fase + real / 2.6) : Math.max(faseObjetivo, fase - real / 2.6);
    ubicar(enVuelo ?? pose(cam, poseA));
    // Una luna que se cruza delante de la cámara (o la envuelve) se desvanece; las órbitas, solo de lejos
    const cerca = cam.cuerpo !== 'planeta' || nivel > 0;
    for (const l of lunasVivas) {
      segmento.set(camara.position, (enVuelo ?? poseA).mira);
      segmento.closestPointToPoint(l.centro, true, cercano);
      const tapa = cerca && cam.cuerpo !== l.id && (cercano.distanceTo(l.centro) < l.r * 2.4 || camara.position.distanceTo(l.centro) < l.r * 4);
      l.alfa += ((tapa ? 0 : 1) - l.alfa) * Math.min(1, dt * 5);
      l.mat.uniforms.uAlfa.value = l.alfa;
      l.mat.uniforms.uPPeso.value = cuerpoParche === l.id ? peso : 0;
      l.mat.uniforms.uDetalle.value = THREE.MathUtils.smoothstep(1.4 - (camara.position.distanceTo(l.centro) / l.r - 1), 0, 1.1);
      l.malla.visible = l.alfa > 0.02;
      l.linea.material.opacity = 0.12 * (1 - Math.min(1, matPlaneta.uniforms.uDetalle.value * 3)) * (cam.cuerpo === 'planeta' ? 1 : 0.4);
    }
    // El paisaje de cerca: primero sube el relieve y después crecen árboles y rocas; al irse, se hunde
    if (subida !== subidaObjetivo) {
      subida = reducido ? subidaObjetivo : subidaObjetivo > subida ? Math.min(1, subida + real / 1.4) : Math.max(0, subida - real / 0.6);
      if (subida === 0 && paisajeVivo) { for (const m of paisajeVivo.cosas) { escena.remove(m); m.dispose(); } paisajeVivo = null; terreno.visible = false; }
    }
    const subeK = 1 - Math.pow(1 - Math.min(1, subida * 1.25), 3);
    matTerreno.uniforms.uEscala.value = ESCALA_RELIEVE * subeK;
    uCrece.value = subidaObjetivo ? THREE.MathUtils.smoothstep(subida, 0.75, 1) : subida;
    const abajo = THREE.MathUtils.smoothstep(0.26 - (camara.position.length() - 1), 0, 0.17);
    const niebla = subida * abajo;
    matPlaneta.uniforms.uNiebla.value = niebla;
    bruma.density = Math.sqrt(55 * niebla);
    terreno.visible = !!paisajeVivo && abajo > 0.01;
    suelosK += (suelosObjetivo - suelosK) * Math.min(1, dt * 1.6);
    matTerreno.uniforms.uSuelos.value = suelosK;
    matTerreno.uniforms.uTiempo.value = reloj;
    // El cielo de cerca: alrededor de la cámara, con el horizonte en el suelo y la foto girada hacia el sol del planeta
    cieloCerca.visible = niebla > 0.01;
    if (cieloCerca.visible) {
      cieloCerca.position.copy(camara.position);
      const arriba = camara.position.clone().normalize();
      const haciaSol = uSol.value.clone().addScaledVector(arriba, -uSol.value.dot(arriba));
      if (haciaSol.lengthSq() < 1e-6) haciaSol.set(1, 0, 0).addScaledVector(arriba, -arriba.x);
      haciaSol.normalize();
      const z = new THREE.Vector3().crossVectors(haciaSol, arriba);
      matCielo.uniforms.uRot.value.set(haciaSol.x, haciaSol.y, haciaSol.z, arriba.x, arriba.y, arriba.z, z.x, z.y, z.z);
      matCielo.uniforms.uVer.value = niebla;
    }
    // Abajo se ve el cielo de verdad: el halo de la atmósfera (pensado para verse desde el espacio) se apaga
    atmosfera.material.uniforms.uApaga.value = cieloCerca.visible ? niebla * 0.92 : 0;
    // Abajo, de día manda el sol de la foto del cielo y no se ven estrellas; de noche, sí
    sol.visible = niebla < 0.5;
    cielo.material.uniforms.uBrillo.value *= 1 - niebla * (1 - matPlaneta.uniforms.uNoche.value);
    nubes.visible = subida < 0.2;
    luzSol.position.copy(uSol.value).multiplyScalar(10);
    bruma.color.lerpColors(brumaDia, brumaNoche, matPlaneta.uniforms.uNoche.value);
    luzAmbiente.intensity = 0.55 - 0.35 * matPlaneta.uniforms.uNoche.value;
    const dprQuiero = niebla > 0.4 ? Math.min(dpr, 1.25) : dpr;
    if (renderer.getPixelRatio() !== dprQuiero) { renderer.setPixelRatio(dprQuiero); renderer.setSize(ancho, altoPx, false); }
    renderer.render(escena, camara);
    alCuadro?.();
    raf = requestAnimationFrame(cuadro);
  };
  const seguir = () => { if (!raf && vivo) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); } };
  document.addEventListener('visibilitychange', seguir, { signal });

  medir();
  cam.h = alturaDe(0);
  ubicar(pose(cam, poseA));
  // Los shaders se compilan en paralelo y recién ahí arranca la animación. Lo que se usa recién en el paisaje de
  // cerca (terreno, cielo, árboles) también: si no, se prepararía de golpe al llegar y trabaría la página.
  const deMuestra = [];
  terreno.visible = true; cieloCerca.visible = true;
  await renderer.compileAsync(escena, camara).catch(() => {});
  terreno.visible = false; cieloCerca.visible = false;
  for (const m of deMuestra) { escena.remove(m); m.dispose(); }
  // La cámara espera lejos (donde empieza la llegada) mientras se hornea lo grande; la llegada arranca con todo listo
  Object.assign(cam, { cuerpo: 'planeta', lat: 22, lon: -80, h: 70, t: 0 });
  seguir();
  await new Promise((listo) => { const mirar = () => (!vivo || !pendientes.length ? listo() : setTimeout(mirar, 60)); mirar(); });
  // La placa de video trabaja atrasada: se espera a que termine todo lo pedido antes de la llegada (si no, la llegada
  // arrancaba mientras todavía horneaba y daba tirones)
  // La primera vez que la placa dibuja el planeta de cerca tarda (prepara texturas y programas): se dibuja la vista de
  // llegada un par de veces en una imagen oculta, todavía durante la carga, y la llegada sale fluida desde el primer cuadro
  if (vivo) {
    const ensayo = new THREE.WebGLRenderTarget(Math.max(1, Math.round(ancho * dpr)), Math.max(1, Math.round(altoPx * dpr)), { samples: 4 });
    const antes = { ...cam };
    for (const h of [alturaDe(0), alturaDe(0) * 3, 12]) {
      Object.assign(cam, { lat: 8, lon: -10, h, t: 0 }); ubicar(pose(cam, poseA));
      renderer.setRenderTarget(ensayo); renderer.render(escena, camara); renderer.setRenderTarget(null);
      await unCuadro();
    }
    Object.assign(cam, antes); ubicar(pose(cam, poseA));
    renderer.readRenderTargetPixels(ensayo, 0, 0, 1, 1, new Uint8Array(4));
    ensayo.dispose();
    await unCuadro();
  }
  cargando = false;

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
    ir({ cuerpo = 'planeta', lat = null, lon = null }, n, ms, paisaje = null) {
      if (paisaje !== null && cuerpo === 'planeta' && lat !== null) n = NIVEL_PAISAJE;
      nivel = n; quieto = 0; vel.lon = vel.lat = 0;
      const b = cuerpos.get(cuerpo) ?? cuerpos.get('planeta');
      if (lat === null) {
        if (cuerpo !== 'planeta' && cuerpo !== cam.cuerpo) { const d = b.centro.clone().normalize(); lat = Math.asin(d.y) / RAD; lon = Math.atan2(d.x, d.z) / RAD; }
        else if (cuerpo === cam.cuerpo) { lat = cam.lat; lon = cam.lon; }
        else { const d = camara.position.clone().normalize(); lat = Math.asin(d.y) / RAD; lon = Math.atan2(d.x, d.z) / RAD; }
      }
      if (n === NIVEL_PAISAJE) pedirParche(cuerpo, lat, lon, n, paisaje || paisajeSegun(lat, lon));
      else { quitarPaisaje(); if (n > 0) pedirParche(cuerpo, lat, lon, n); else { colaParche = []; pesoObjetivo = 0; } }
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
    /** De noche (true) o de día (false). Con `ya`, sin la transición. */
    noche(si, ya = false) { faseObjetivo = si ? 1 : 0; if (ya) fase = faseObjetivo; },
    get volando() { return !!vuelo; },
    set alCuadro(fn) { alCuadro = fn; },
    set alAlejar(fn) { alAlejar = fn; },
    /** fn({ cuerpo, lat, lon }) al tocar un punto sin arrastrar. */
    set alTocar(fn) { alTocar = fn; },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); control.abort(); ojo.disconnect(); ro.disconnect();
      for (const m of paisajeVivo?.cosas ?? []) m.dispose();
      modelos?.then((g) => Object.values(g).forEach((x) => x.dispose())).catch(() => {}); Object.values(MATS).forEach((m) => m.dispose());
      texModelos.forEach((p) => p.then((tx) => tx.dispose()).catch(() => {})); plano1.dispose();
      muestraAltura.dispose(); muestraColor.dispose(); blanco1.dispose(); texturas.forEach((p) => p.then((tx) => tx.dispose()).catch(() => {}));
      for (const g of [bajo, alto, ...parches, ...lunasVivas.flatMap((l) => [l.tex, l.previa])]) for (const rt of Object.values(g)) rt.dispose();
      escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      texTierra.dispose(); texCampos.dispose(); Object.values(hornos).forEach((m) => m.dispose()); plano.dispose(); ruido.dispose(); renderer.dispose();
    },
  };
}

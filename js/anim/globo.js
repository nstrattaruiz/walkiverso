// Walkurio en la portada ("Dónde las criaturas cobran vida"): el planeta real, chico y liviano. Usa la superficie ya
// calculada del planeta (img/walkurio/portada, sale de .dev/walkurio-portada.mjs) en vez de calcularla: una esfera
// con su foto, nubes que se mueven, atmósfera y las dos lunas con sus mapas reales. Gira despacio y se puede girar
// arrastrando; tocarlo lleva a Walkurio.
// Para que la portada no se trabe: se arma recién cuando la sección se acerca a la pantalla, las imágenes se
// decodifican fuera del hilo principal, los programas se preparan en paralelo y aparece con un fundido ya listo.
// Las lunas orbitan dentro del lienzo: nunca se cortan contra el texto.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const VERT = /* glsl */`
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 m = modelMatrix * vec4(position, 1.0); vW = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`;
const PLANETA = /* glsl */`
  uniform sampler2D uMapa; uniform sampler2D uNubes; uniform vec3 uSol; uniform float uT;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() {
    vec4 c = texture2D(uMapa, vUv);
    vec3 n = normalize(vN), L = normalize(uSol), V = normalize(cameraPosition - vW);
    float d = dot(n, L), dia = smoothstep(-0.15, 0.3, d);
    float nube = smoothstep(0.08, 0.7, texture2D(uNubes, vUv + vec2(uT * 0.004, 0.0)).r);
    float sombra = texture2D(uNubes, vUv + vec2(uT * 0.004 + 0.003, 0.002)).r;
    vec3 col = c.rgb * (0.05 + 1.15 * max(d, 0.0) * (1.0 - sombra * 0.35));
    float agua = (1.0 - c.a) / 0.8;   // el agua viene invertida en el alfa (ver .dev/walkurio-portada.mjs)
    col += vec3(0.9, 0.95, 1.0) * pow(max(dot(reflect(-L, n), V), 0.0), 40.0) * 0.45 * agua * dia;
    col = mix(col, vec3(0.96, 0.97, 1.0) * (0.06 + 1.05 * max(d, 0.0)), nube * 0.85);
    float rim = pow(1.0 - max(dot(n, V), 0.0), 2.4);
    col = mix(col, vec3(0.35, 0.62, 1.0) * (0.25 + 0.9 * dia), rim * 0.65);
    gl_FragColor = vec4(col, 1.0);
  }`;
const ATMOS = /* glsl */`
  uniform vec3 uSol; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 n = normalize(vN), V = normalize(cameraPosition - vW);
    float borde = pow(max(dot(n, -V), 0.0), 3.0);
    float dia = smoothstep(-0.5, 0.5, dot(n, normalize(uSol)));
    gl_FragColor = vec4(vec3(0.42, 0.68, 1.0), borde * (0.25 + 0.6 * dia));
  }`;
const LUNA = /* glsl */`
  uniform sampler2D uMapa; uniform vec3 uSol; uniform vec3 uTinte;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() {
    vec3 c = texture2D(uMapa, vUv).rgb * uTinte;
    float d = max(dot(normalize(vN), normalize(uSol)), 0.0);
    gl_FragColor = vec4(c * (0.06 + 1.1 * d), 1.0);
  }`;

/**
 * @param lienzo un <canvas> (dentro del enlace a Walkurio)
 * @returns función para detenerlo
 */
export function globo(lienzo) {
  let vivo = true, detenerReal = null;
  const control = new AbortController();
  // Se arma recién cuando la sección está por aparecer
  const ojo = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    ojo.disconnect();
    armar().then((d) => { if (vivo) detenerReal = d; else d(); }).catch((e) => console.warn('Walkurio de la portada:', e));
  }, { rootMargin: '500px 0px' });
  ojo.observe(lienzo);
  return () => { vivo = false; ojo.disconnect(); control.abort(); detenerReal?.(); };

  async function armar() {
    const THREE = await import('../vendor/three.module.min.js');
    if (!vivo) return () => {};
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camara.position.set(0, 0.35, 6.2); camara.lookAt(0, 0, 0);

    // Imágenes: decodificadas fuera del hilo principal
    const cargador = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    const textura = (url) => cargador.loadAsync(url).then((img) => { const t = new THREE.Texture(img); t.needsUpdate = true; t.anisotropy = 4; return t; });
    const [mapa, nubes, luna1, luna2] = await Promise.all(['img/walkurio/portada/planeta.webp', 'img/walkurio/portada/nubes.webp', 'img/walkurio/portada/luna-1.webp', 'img/walkurio/portada/luna-2.webp'].map(textura));
    mapa.colorSpace = THREE.NoColorSpace;
    nubes.wrapS = THREE.RepeatWrapping; mapa.wrapS = THREE.RepeatWrapping;
    if (!vivo) { renderer.dispose(); return () => {}; }

    const uSol = { value: new THREE.Vector3(-0.6, 0.4, 0.75).normalize() }, uT = { value: 0 };
    const planeta = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ uniforms: { uMapa: { value: mapa }, uNubes: { value: nubes }, uSol, uT }, vertexShader: VERT, fragmentShader: PLANETA }));
    const atmosfera = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 32), new THREE.ShaderMaterial({ uniforms: { uSol }, vertexShader: VERT, fragmentShader: ATMOS, side: THREE.BackSide, transparent: true, depthWrite: false }));
    const ejes = new THREE.Group();
    ejes.rotation.z = 0.32;
    ejes.add(planeta);
    escena.add(ejes, atmosfera);
    const lunas = [
      { tex: luna1, r: 0.15, orbita: 1.42, inc: 0.38, vuelta: 40, fase: 0.6, tinte: [1.02, 1, 0.96] },
      { tex: luna2, r: 0.1, orbita: 1.62, inc: -0.5, vuelta: 64, fase: 3.4, tinte: [0.86, 0.95, 1.12] },
    ].map((l) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.ShaderMaterial({ uniforms: { uMapa: { value: l.tex }, uSol, uTinte: { value: new THREE.Vector3(...l.tinte) } }, vertexShader: VERT, fragmentShader: LUNA }));
      m.scale.setScalar(l.r);
      escena.add(m);
      return { ...l, malla: m };
    });

    let ancho = 1, alto = 1;
    const medir = () => {
      ancho = lienzo.clientWidth || 1; alto = lienzo.clientHeight || 1;
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      // Que entren el planeta y las órbitas de las lunas, con aire alrededor
      const radio = 1.5, distancia = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2) * Math.min(1, camara.aspect));
      camara.position.setLength(distancia);
      camara.updateProjectionMatrix();
    };
    medir();

    // Arrastrar para girar; un toque sin arrastrar es un clic (lleva a Walkurio)
    const { signal } = control;
    let arrastre = null, vel = 0, giro = 0, inclina = 0;
    lienzo.addEventListener('pointerdown', (e) => { arrastre = { x: e.clientX, y: e.clientY, giro, inclina, movio: false }; lienzo.setPointerCapture(e.pointerId); seguir(); }, { signal });
    lienzo.addEventListener('pointermove', (e) => {
      if (!arrastre) return;
      const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
      if (Math.hypot(dx, dy) > 4) arrastre.movio = true;
      const nuevo = arrastre.giro + dx * 0.01; vel = (nuevo - giro) * 60; giro = nuevo;
      inclina = Math.max(-0.6, Math.min(0.6, arrastre.inclina + dy * 0.005));
    }, { signal });
    const soltar = () => { if (!arrastre) return; lienzo.dataset.arrastro = arrastre.movio ? '1' : ''; arrastre = null; vel = Math.max(-3, Math.min(3, vel)); };
    lienzo.addEventListener('pointerup', soltar, { signal });
    lienzo.addEventListener('pointercancel', soltar, { signal });
    lienzo.closest('a')?.addEventListener('click', (e) => { if (lienzo.dataset.arrastro) { e.preventDefault(); e.stopPropagation(); lienzo.dataset.arrastro = ''; } }, { signal, capture: true });

    let raf = 0, ultimo = 0, reloj = 0, visible = true;
    const cuadro = (ahora) => {
      raf = 0;
      if (!vivo || !visible) return;
      const dt = Math.min(0.05, ultimo ? (ahora - ultimo) / 1000 : 0); ultimo = ahora;
      if (!reducido) reloj += dt;
      if (!arrastre) { giro += (reducido ? 0 : 0.09) * dt + vel * dt; vel *= Math.pow(0.04, dt); }
      planeta.rotation.y = giro; ejes.rotation.x = inclina;
      uT.value = reloj;
      for (const l of lunas) {
        const a = reloj / l.vuelta * Math.PI * 2 + l.fase;
        l.malla.position.set(Math.cos(a) * l.orbita, Math.sin(a) * l.orbita * Math.sin(l.inc), Math.sin(a) * l.orbita * Math.cos(l.inc));
        l.malla.rotation.y = reloj * 0.05;
      }
      renderer.render(escena, camara);
      if (!reducido || arrastre || Math.abs(vel) > 0.01) raf = requestAnimationFrame(cuadro);
    };
    const seguir = () => { if (!raf && vivo && visible) { ultimo = 0; raf = requestAnimationFrame(cuadro); } };

    // Todo listo antes de mostrarse: programas compilados en paralelo y texturas subidas de a una por cuadro
    await renderer.compileAsync(escena, camara).catch(() => {});
    for (const t of [mapa, nubes, luna1, luna2]) { renderer.initTexture(t); await new Promise((r) => requestAnimationFrame(r)); }
    if (!vivo) { renderer.dispose(); return () => {}; }
    renderer.render(escena, camara);
    await espera(30);
    lienzo.classList.add('is-listo');

    const ojoVisible = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) seguir(); });
    ojoVisible.observe(lienzo);
    const ro = new ResizeObserver(() => { medir(); if (!raf) renderer.render(escena, camara); }); ro.observe(lienzo);
    seguir();
    return () => {
      cancelAnimationFrame(raf); ojoVisible.disconnect(); ro.disconnect();
      escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      [mapa, nubes, luna1, luna2].forEach((t) => { t.image?.close?.(); t.dispose(); });
      renderer.dispose();
    };
  }
}

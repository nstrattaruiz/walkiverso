/**
 * Walkiver · Comportamiento general de la web de Walkiver (layout/walkiver.liquid)
 * - Aparición de elementos al hacer scroll ([data-wkv-reveal]).
 * - Header: se vuelve vidrio al bajar, se esconde al bajar rápido y vuelve al subir; menú de celular.
 * - Linterna que sigue al mouse (y coordenadas locales para [data-wkv-lantern]).
 * - Polvo flotando en toda la página (canvas [data-wkv-dust]).
 * - Paralaje suave ([data-wkv-parallax="0.12"]) e inclinación con el mouse ([data-wkv-tilt]).
 * - Acordeones con animación (details.wkv-acc).
 * - Videos de YouTube que se cargan al tocar ([data-wkv-yt]).
 * - Botón para volver arriba con anillo de progreso ([data-wkv-top]).
 * Todo respeta «reducir movimiento».
 */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Aparición al hacer scroll ---------- */
function initReveal(root = document) {
  const items = root.querySelectorAll('[data-wkv-reveal]:not(.is-in)');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  // Los elementos con telón (clip-path al 100%) miden cero para el observador y nunca "entran":
  // por eso se observa a su contenedor y, cuando aparece, se revelan ellos.
  const targets = new Map();
  for (const el of items) {
    const target = el.dataset.wkvReveal === 'curtain' && el.parentElement ? el.parentElement : el;
    if (!targets.has(target)) targets.set(target, []);
    targets.get(target).push(el);
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (targets.get(entry.target) || []).forEach((el) => el.classList.add('is-in'));
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  targets.forEach((_, target) => io.observe(target));
}

/* ---------- Header ---------- */
function initHeader() {
  const header = document.querySelector('[data-wkv-header]');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const menuOpen = document.documentElement.classList.contains('wkv-menu-open');
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!menuOpen && goingDown && y > 420) header.classList.add('is-hidden');
    if (goingUp || y < 120) header.classList.remove('is-hidden');
    lastY = y;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();

  // Desplegable del Walkiverso: en táctiles se abre con un toque
  header.querySelectorAll('.wkv-drop').forEach((drop) => {
    const toggle = drop.querySelector('.wkv-drop__toggle');
    toggle?.addEventListener('click', (event) => {
      // «Proyectos» es un botón: abre y cierra con clic también en compu
      if (toggle.tagName === 'BUTTON') {
        const open = !drop.classList.contains('is-open');
        drop.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        return;
      }
      if (finePointer) return;
      if (!drop.classList.contains('is-open')) {
        event.preventDefault();
        drop.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    drop.addEventListener('mouseenter', () => toggle?.setAttribute('aria-expanded', 'true'));
    drop.addEventListener('mouseleave', () => {
      drop.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', (event) => {
    header.querySelectorAll('.wkv-drop.is-open').forEach((drop) => {
      if (!drop.contains(event.target)) {
        drop.classList.remove('is-open');
        drop.querySelector('.wkv-drop__toggle')?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Menú de celular
  const burger = header.querySelector('.wkv-header__burger');
  const menu = document.getElementById('wkv-menu');
  if (!burger || !menu) return;
  const setOpen = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.documentElement.classList.toggle('wkv-menu-open', open);
    if (open) header.classList.remove('is-hidden');
  };
  menu.inert = true;
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });
  window.matchMedia('(min-width: 990px)').addEventListener('change', (mq) => {
    if (mq.matches) setOpen(false);
  });
}

/* ---------- Linterna ---------- */
function initLantern() {
  if (!finePointer) return;
  const root = document.documentElement;
  let x = 0;
  let y = 0;
  let queued = false;
  const paint = () => {
    queued = false;
    root.style.setProperty('--wkv-lx', `${x}px`);
    root.style.setProperty('--wkv-ly', `${y}px`);
    document.querySelectorAll('[data-wkv-lantern]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      el.style.setProperty('--lx', `${x - rect.left}px`);
      el.style.setProperty('--ly', `${y - rect.top}px`);
      el.classList.add('is-lit');
    });
  };
  window.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX;
      y = event.clientY;
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    },
    { passive: true }
  );
}

/* ---------- Polvo flotando ---------- */
function initDust() {
  const canvas = document.querySelector('[data-wkv-dust]');
  if (!(canvas instanceof HTMLCanvasElement) || reduceMotion) {
    canvas?.remove();
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const styles = getComputedStyle(document.documentElement);
  const bone = styles.getPropertyValue('--wkv-bone-rgb').trim() || '235 229 214';
  const accent = styles.getPropertyValue('--wkv-violet-rgb').trim() || '159 178 255';
  const toRgb = (value) => value.split(/\s+/).join(',');
  const colors = [toRgb(bone), toRgb(bone), toRgb(accent)];

  let width = 0;
  let height = 0;
  let particles = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  const make = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    r: 0.4 + Math.random() * 1.5,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(0.08 + Math.random() * 0.22),
    a: 0.15 + Math.random() * 0.45,
    t: Math.random() * Math.PI * 2,
    c: colors[Math.floor(Math.random() * colors.length)],
  });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 750 ? 26 : 54;
    particles = Array.from({ length: count }, () => make(true));
  };

  let running = true;
  const frame = () => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.t += 0.012;
      p.x += p.vx + Math.sin(p.t) * 0.08;
      p.y += p.vy;
      if (p.y < -10 || p.x < -10 || p.x > width + 10) Object.assign(p, make(false));
      const alpha = p.a * (0.55 + Math.sin(p.t * 1.7) * 0.45);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.c},${alpha.toFixed(3)})`;
      ctx.shadowColor = `rgba(${p.c},${(alpha * 0.8).toFixed(3)})`;
      ctx.shadowBlur = p.r * 6;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
}

/* ---------- Paralaje e inclinación ---------- */
let parallaxBound = false;
function initParallax() {
  if (reduceMotion) return;
  if (!parallaxBound) {
    parallaxBound = true;
    let queued = false;
    const update = () => {
      queued = false;
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll('[data-wkv-parallax]')) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        const speed = parseFloat(el.dataset.wkvParallax) || 0.1;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.setProperty('--wkv-py', `${offset.toFixed(1)}px`);
      }
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  if (!finePointer) return;
  document.querySelectorAll('[data-wkv-tilt]:not([data-wkv-bound])').forEach((el) => {
    el.dataset.wkvBound = '1';
    const max = parseFloat(el.dataset.wkvTilt) || 5;
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--wkv-rx', `${(-py * max).toFixed(2)}deg`);
      el.style.setProperty('--wkv-ry', `${(px * max).toFixed(2)}deg`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--wkv-rx', '0deg');
      el.style.setProperty('--wkv-ry', '0deg');
    });
  });
}

/* ---------- Volver arriba ---------- */
function initTop() {
  const button = document.querySelector('[data-wkv-top]');
  if (!(button instanceof HTMLElement)) return;
  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    button.style.setProperty('--wkv-progress', progress.toFixed(3));
    button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', update, { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  update();
}

/* ---------- Acordeones ---------- */
function initAccordions() {
  document.querySelectorAll('details.wkv-acc:not([data-wkv-bound])').forEach((details) => {
    details.dataset.wkvBound = '1';
    const summary = details.querySelector('summary');
    const body = details.querySelector('.wkv-acc__body');
    if (!summary || !body) return;
    summary.addEventListener('click', (event) => {
      if (reduceMotion) return;
      event.preventDefault();
      if (details.dataset.animating) return;
      details.dataset.animating = '1';
      if (details.open) {
        const start = body.offsetHeight;
        body.animate([{ height: `${start}px`, opacity: 1 }, { height: '0px', opacity: 0 }], {
          duration: 420,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }).onfinish = () => {
          details.open = false;
          delete details.dataset.animating;
        };
      } else {
        details.open = true;
        const end = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: `${end}px`, opacity: 1 }], {
          duration: 560,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }).onfinish = () => {
          delete details.dataset.animating;
        };
      }
    });
  });
}

/* ---------- Videos de YouTube que cargan al tocar ---------- */
function initYouTube() {
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-wkv-yt]') : null;
    if (!(trigger instanceof HTMLElement)) return;
    const id = trigger.dataset.wkvYt;
    const holder = trigger.closest('.wkv-video__frame') || trigger.parentElement;
    if (!id || !holder) return;
    event.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    iframe.title = trigger.getAttribute('aria-label') || 'Video de YouTube';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.className = 'wkv-video__iframe';
    holder.appendChild(iframe);
    holder.classList.add('is-playing');
  });
}

function init() {
  initReveal();
  initHeader();
  initLantern();
  initDust();
  initParallax();
  initAccordions();
  initYouTube();
  initTop();

  // En el editor de Shopify: al recargar una sección, se vuelve a preparar
  document.addEventListener('shopify:section:load', (event) => {
    initReveal(event.target);
    initAccordions();
    initParallax();
    if (event.target instanceof Element && event.target.querySelector('[data-wkv-header]')) initHeader();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

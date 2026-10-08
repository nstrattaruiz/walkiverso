/**
 * Firma NS (Nico Stratta) · versión HTML.
 * Header píldora (estado al bajar), menú grande (☰), volver arriba con anillo de progreso
 * y resaltado del enlace de la sección visible. Sin dependencias.
 *
 * Espera este marcado (ver ejemplo.html): #ns-header con .ns-menu-btn, .ns-bar y #ns-panel;
 * .ns-scrim y #ns-top. Todo es opcional: si falta una pieza, esa parte no se activa.
 */
(() => {
  const root = document.documentElement;
  const header = document.getElementById('ns-header');
  const menuBtn = header?.querySelector('.ns-menu-btn');
  const panel = document.getElementById('ns-panel');
  const scrim = document.querySelector('.ns-scrim');
  const topBtn = document.getElementById('ns-top');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.add('js');

  /* ---------- Scroll: estado del header y anillo de progreso ---------- */
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const top = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
      header?.classList.toggle('is-scrolled', top > 40);
      if (topBtn) {
        topBtn.style.setProperty('--ns-progress', progress.toFixed(4));
        topBtn.classList.toggle('is-visible', top > 480);
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  topBtn?.querySelector('button')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
  });

  /* ---------- Menú grande ---------- */
  if (header && menuBtn && panel) {
    // Número de orden de cada enlace, para la entrada escalonada
    panel.querySelectorAll('.ns-panel__nav a').forEach((a, i) => a.style.setProperty('--i', i));

    const setMenu = (open) => {
      header.classList.toggle('is-open', open);
      root.classList.toggle('ns-menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      panel.setAttribute('aria-hidden', String(!open));
      panel.inert = !open;
      if (open) panel.querySelector('a')?.focus({ preventScroll: true });
    };
    panel.inert = true;

    menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
    scrim?.addEventListener('click', () => setMenu(false));
    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- Enlace activo según la sección visible (menú en línea) ---------- */
  const navLinks = [...(header?.querySelectorAll('.ns-nav a[href^="#"]') ?? [])];
  if (navLinks.length && 'IntersectionObserver' in window) {
    const porId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.remove('is-active'));
        porId.get(entry.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    // Todas las secciones con id: las que no están en el menú apagan el resaltado
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
  }
})();

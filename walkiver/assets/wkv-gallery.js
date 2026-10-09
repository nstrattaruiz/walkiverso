/**
 * Walkiver · Galería
 * - Hilera que se arrastra con el mouse (en celular, con el dedo), con flechas y progreso.
 * - Al tocar una imagen se abre en grande, con anterior y siguiente (también con las flechas del teclado).
 */
class WkvGallery extends HTMLElement {
  #abort = null;
  #cards = [];
  #current = -1;

  connectedCallback() {
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    this.track = this.querySelector('.wkv-gal__track');
    this.dialog = this.querySelector('.wkv-gal__dialog');
    this.full = this.querySelector('.wkv-gal__full');
    this.arrows = Array.from(this.querySelectorAll('.wkv-reels__arrow'));
    this.bar = this.querySelector('.wkv-reels__progress');
    this.#cards = Array.from(this.querySelectorAll('.wkv-gal__card')).filter((card) => card.dataset.full);

    this.addEventListener('click', this.#onClick, { signal });
    this.track?.addEventListener('scroll', () => this.#update(), { signal, passive: true });
    window.addEventListener('resize', () => this.#update(), { signal, passive: true });
    this.dialog?.addEventListener(
      'click',
      (event) => {
        if (event.target === this.dialog) this.dialog.close();
      },
      { signal }
    );
    this.dialog?.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'ArrowRight') this.#show(this.#current + 1);
        if (event.key === 'ArrowLeft') this.#show(this.#current - 1);
      },
      { signal }
    );

    this.#initDrag(signal);
    this.#update();
  }

  disconnectedCallback() {
    this.#abort?.abort();
  }

  #onClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const arrow = target.closest('.wkv-reels__arrow');
    if (arrow instanceof HTMLElement) {
      const item = this.track?.querySelector('.wkv-gal__item');
      const gap = this.track ? parseFloat(getComputedStyle(this.track).columnGap) || 0 : 0;
      const step = item ? item.getBoundingClientRect().width + gap : 400;
      this.track?.scrollBy({ left: Number(arrow.dataset.dir) * step, behavior: 'smooth' });
      return;
    }
    if (target.closest('.wkv-reels__close')) {
      this.dialog?.close();
      return;
    }
    const step = target.closest('.wkv-reels__step');
    if (step instanceof HTMLElement) {
      this.#show(this.#current + Number(step.dataset.step));
      return;
    }
    const card = target.closest('.wkv-gal__card');
    if (card instanceof HTMLElement) this.#show(this.#cards.indexOf(card));
  };

  #initDrag(signal) {
    const track = this.track;
    if (!track) return;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    let down = false;
    track.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        down = true;
        moved = false;
        startX = event.clientX;
        startScroll = track.scrollLeft;
      },
      { signal }
    );
    window.addEventListener(
      'pointermove',
      (event) => {
        if (!down) return;
        const dx = event.clientX - startX;
        if (!moved && Math.abs(dx) > 6) {
          moved = true;
          track.classList.add('is-dragging');
        }
        if (moved) track.scrollLeft = startScroll - dx;
      },
      { signal }
    );
    window.addEventListener(
      'pointerup',
      () => {
        if (!down) return;
        down = false;
        if (moved) requestAnimationFrame(() => track.classList.remove('is-dragging'));
      },
      { signal }
    );
  }

  #update() {
    if (!this.track) return;
    const max = this.track.scrollWidth - this.track.clientWidth;
    const scrollable = max > 4;
    for (const arrow of this.arrows) {
      const dir = Number(arrow.dataset.dir);
      arrow.disabled = !scrollable || (dir < 0 ? this.track.scrollLeft <= 2 : this.track.scrollLeft >= max - 2);
    }
    if (this.bar instanceof HTMLElement) {
      const visible = this.track.clientWidth / this.track.scrollWidth;
      const progress = scrollable ? visible + (1 - visible) * (this.track.scrollLeft / max) : 1;
      this.bar.style.setProperty('--p', progress.toFixed(3));
    }
  }

  #show(index) {
    if (!this.dialog || !this.full || this.#cards.length === 0 || index < 0 && this.#current < 0) return;
    const total = this.#cards.length;
    this.#current = ((index % total) + total) % total;
    const card = this.#cards[this.#current];
    this.full.src = card.dataset.full || '';
    this.full.alt = card.querySelector('img')?.alt || '';
    this.dialog.querySelectorAll('.wkv-reels__step').forEach((button) => {
      button.hidden = total < 2;
    });
    if (!this.dialog.open) this.dialog.showModal();
  }
}

if (!customElements.get('wkv-gallery')) {
  customElements.define('wkv-gallery', WkvGallery);
}

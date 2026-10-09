/**
 * Walkiver · Reels colgando
 * - La hilera se arrastra con el mouse (en celular, con el dedo, de forma nativa).
 * - Flechas y barra de progreso.
 * - Al tocar un reel se abre un reproductor vertical en un <dialog>, con anterior y siguiente.
 *   El iframe se crea al abrir y se elimina al cerrar.
 */
class WkvReels extends HTMLElement {
  #abort = null;
  #ids = [];
  #current = -1;

  connectedCallback() {
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    this.track = this.querySelector('.wkv-reels__track');
    this.dialog = this.querySelector('.wkv-reels__dialog');
    this.player = this.querySelector('.wkv-reels__player');
    this.arrows = Array.from(this.querySelectorAll('.wkv-reels__arrow'));
    this.bar = this.querySelector('.wkv-reels__progress');
    this.#ids = Array.from(this.querySelectorAll('[data-video-id]')).map((el) => el.dataset.videoId);

    this.addEventListener('click', this.#onClick, { signal });
    this.track?.addEventListener('scroll', () => this.#update(), { signal, passive: true });
    window.addEventListener('resize', () => this.#update(), { signal, passive: true });
    this.dialog?.addEventListener('close', () => this.player?.replaceChildren(), { signal });
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
        if (event.key === 'ArrowRight') this.#step(1);
        if (event.key === 'ArrowLeft') this.#step(-1);
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
      this.#scroll(Number(arrow.dataset.dir));
      return;
    }
    if (target.closest('.wkv-reels__close')) {
      this.dialog?.close();
      return;
    }
    const step = target.closest('.wkv-reels__step');
    if (step instanceof HTMLElement) {
      this.#step(Number(step.dataset.step));
      return;
    }
    const card = target.closest('[data-video-id]');
    if (card instanceof HTMLElement) this.#open(this.#ids.indexOf(card.dataset.videoId));
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
        if (moved) {
          // Evita que el clic al soltar abra un video
          requestAnimationFrame(() => track.classList.remove('is-dragging'));
        }
      },
      { signal }
    );
  }

  #scroll(direction) {
    if (!this.track) return;
    const reel = this.track.querySelector('.wkv-reel');
    const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
    const step = reel ? reel.getBoundingClientRect().width + gap : this.track.clientWidth;
    this.track.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
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

  #step(direction) {
    if (this.#current < 0 || this.#ids.length < 2) return;
    const next = (this.#current + direction + this.#ids.length) % this.#ids.length;
    this.#open(next);
  }

  #open(index) {
    const videoId = this.#ids[index];
    if (!this.dialog || !this.player || !videoId) return;
    this.#current = index;
    const params = new URLSearchParams({
      autoplay: '1',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
      loop: '1',
      playlist: videoId,
    });
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
    iframe.title = 'Video de Walkiver';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    this.player.replaceChildren(iframe);
    this.dialog.querySelectorAll('.wkv-reels__step').forEach((button) => {
      button.hidden = this.#ids.length < 2;
    });
    if (!this.dialog.open) this.dialog.showModal();
  }
}

if (!customElements.get('wkv-reels')) {
  customElements.define('wkv-reels', WkvReels);
}

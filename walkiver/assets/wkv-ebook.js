/**
 * Walkiver · E-book
 * - Barra de compra flotante: aparece cuando la zona de compra quedó arriba y se esconde al llegar al pie.
 * - Al volver de PayPal (?pago=paypal) muestra el aviso de gracias.
 */
class WkvEbook extends HTMLElement {
  #observers = [];

  connectedCallback() {
    if (new URLSearchParams(window.location.search).get('pago') === 'paypal') {
      const thanks = this.querySelector('[data-wkv-thanks]');
      if (thanks) thanks.hidden = false;
    }

    const bar = this.querySelector('[data-wkv-buybar]');
    const buy = this.querySelector('[data-wkv-buy]');
    if (!bar || !buy || !('IntersectionObserver' in window)) return;

    // Dentro de la sección, la barra queda debajo de las secciones siguientes y no recibe clics:
    // se muda al <body> para que siempre quede arriba.
    document.body.appendChild(bar);
    this.bar = bar;

    let buyAbove = false;
    let footerVisible = false;
    const update = () => bar.classList.toggle('is-visible', buyAbove && !footerVisible);

    const buyObserver = new IntersectionObserver(([entry]) => {
      buyAbove = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    buyObserver.observe(buy);
    this.#observers.push(buyObserver);

    const footer = document.querySelector('.wkv-footer');
    if (footer) {
      const footerObserver = new IntersectionObserver(([entry]) => {
        footerVisible = entry.isIntersecting;
        update();
      });
      footerObserver.observe(footer);
      this.#observers.push(footerObserver);
    }
  }

  disconnectedCallback() {
    this.bar?.remove();
    this.#observers.forEach((observer) => observer.disconnect());
    this.#observers = [];
  }
}

if (!customElements.get('wkv-ebook')) {
  customElements.define('wkv-ebook', WkvEbook);
}

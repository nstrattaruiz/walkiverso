// De producto de la plataforma a "pieza" de Walkiverso.
// Todo lo que la web muestra de una pieza (única o Walkiverso, especie, técnica, disponibilidad, historia…)
// sale de acá, y acá sale de los datos del producto: ningún componente lo tiene fijo.
import { tienda } from './tienda.js';
import { CAMPOS, MARCAS, TIPOS } from '../config.js';
import { plano } from '../ui/util.js';

const attr = (p, nombre) => {
  const buscado = plano(nombre);
  const k = Object.keys(p.attributes ?? {}).find((x) => plano(x) === buscado);
  return k ? String(p.attributes[k]).trim() : '';
};
const guiones = (t) => plano(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** ¿El producto lleva esta marca? Vale por categoría, por característica ("Sí") o por etiqueta. */
const conMarca = (p, { nombres, caracteristica }) => [...(p.categories ?? []), ...(p.tags ?? [])].some((t) => nombres.includes(guiones(t)))
  || /^(si|x|1|true|verdadero)$/.test(plano(attr(p, caracteristica)));

function tipoDe(p) {
  const dicho = plano(attr(p, CAMPOS.tipo) || p.type);
  const cats = (p.categories ?? []).map(plano);
  for (const [clave, nombre] of Object.entries(TIPOS)) {
    const n = plano(nombre).replace('-', '');
    if (dicho.replace('-', '').startsWith(n) || cats.some((c) => c.replace('-', '').startsWith(n))) return clave;
  }
  return 'criatura';
}

/** @returns la pieza lista para mostrar. `p` es el producto tal como lo entrega la plataforma. */
export function pieza(p) {
  const tipo = tipoDe(p);
  const esObra = tipo === 'criatura' || tipo === 'artefacto';
  // Pieza única (OOAK): la marca del panel. Una criatura o artefacto sin esa marca es pieza Walkiverso.
  const isUnique = esObra && conMarca(p, MARCAS.unica);
  const isWalkiverso = esObra && !isUnique;
  const variante = p.variants?.find((v) => v.available) ?? p.variants?.[0] ?? null;
  const stock = variante?.stock ?? null;
  return {
    id: p.id,
    handle: p.handle,
    name: p.title,
    tipo,                                   // criatura · artefacto · ebook · curso
    type: TIPOS[tipo],
    species: attr(p, CAMPOS.especie) || attr(p, CAMPOS.clase),   // especie de la criatura o clase del artefacto (agrupa y filtra)
    // Cómo se nombra en la tarjeta: la variedad si la tiene ("Duende del Dinero"); si no, la especie
    especieTexto: attr(p, CAMPOS.variedad) || attr(p, CAMPOS.especie) || attr(p, CAMPOS.clase),
    technique: attr(p, CAMPOS.tecnica) || (esObra ? (isUnique ? 'Técnica tradicional' : 'Técnica mixta') : ''),
    isUnique,
    isWalkiverso,
    available: !!p.available,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    priceHidden: !!p.priceHidden,
    description: p.description || '',      // HTML del panel
    story: attr(p, CAMPOS.historia) || p.metafields?.historia || '',
    materials: attr(p, CAMPOS.materiales).split(/[,;]\s*/).filter(Boolean),
    number: attr(p, CAMPOS.numero),
    certificate: esObra,
    nivel: attr(p, CAMPOS.nivel),
    duracion: attr(p, CAMPOS.duracion),
    image: p.image ?? null,
    images: p.images ?? [],
    variantId: variante?.id ?? null,
    stock,
    maxCantidad: isUnique ? 1 : stock,
    destacada: conMarca(p, MARCAS.destacada),
    buscada: conMarca(p, MARCAS.buscada),
    categories: p.categories ?? [],
    createdAt: p.createdAt ?? null,
    crudo: p,
  };
}

/** Palabras con las que el visitante nombra cada cosa (para llegar a la ficha o a la tienda). */
export const NOMBRE = {
  criatura: { una: 'criatura', esta: 'esta criatura', otras: 'otras criaturas', ver: 'Ver criatura', adquirir: 'Adoptar esta criatura', hogar: 'Esta criatura ya encontró hogar.' },
  artefacto: { una: 'artefacto', esta: 'este artefacto', otras: 'otros artefactos', ver: 'Ver artefacto', adquirir: 'Adquirir artefacto', hogar: 'Este artefacto ya encontró hogar.' },
  ebook: { una: 'e-book', esta: 'este e-book', otras: 'otros e-books', ver: 'Ver e-book', adquirir: 'Adquirir e-book', hogar: 'Este e-book no está disponible por ahora.' },
  curso: { una: 'curso', esta: 'este curso', otras: 'otros cursos', ver: 'Ver curso', adquirir: 'Sumarme al curso', hogar: 'Este curso no está disponible por ahora.' },
};

export const precio = (pz) => (pz.priceHidden || pz.price == null ? 'Ingresá para ver el precio' : tienda.formatear(pz.price, pz.currency));

// ---------------------------------------------------------------- catálogo
// La tienda de Walkiverso es una galería chica: se trae entera una vez y se filtra y busca en el momento.
let cache = null;
export function catalogo() {
  cache ??= (async () => {
    const todo = [];
    for (let pagina = 1; pagina <= 10; pagina++) {
      const r = await tienda.productos.listar({ pagina, porPagina: 100 });
      todo.push(...r.items);
      if (pagina >= (r.pages ?? 1) || !r.items.length) break;
    }
    return todo.map(pieza);
  })().catch((e) => { cache = null; throw e; });
  return cache;
}
/** Después de una compra cambia la disponibilidad: se vuelve a pedir. */
export const olvidarCatalogo = () => { cache = null; };

/** Solo criaturas y artefactos (lo que se muestra en la tienda). */
export const obras = async () => (await catalogo()).filter((x) => x.tipo === 'criatura' || x.tipo === 'artefacto');

/** Disponibles primero; dentro de cada grupo, las más nuevas primero. */
export const porDisponibilidad = (a, b) => (b.available - a.available) || String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));

/** Busca por nombre, especie, tipo, técnica o categoría. "mandrágora", "troll", "artefacto"… */
export function buscar(lista, texto) {
  const palabras = plano(texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return lista.filter((x) => {
    const donde = plano([x.name, x.species, x.especieTexto, x.type, x.technique, x.isUnique ? 'pieza unica ooak' : '', x.isWalkiverso ? 'pieza walkiverso' : '', ...x.categories].join(' '));
    // "criaturas", "trolls", "mandrágoras": el plural también encuentra
    return palabras.every((w) => donde.includes(w) || (w.length > 3 && donde.includes(w.replace(/e?s$/, ''))));
  });
}

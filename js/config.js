// Walkiverso · configuración de la web.
// Acá se prende y apaga lo que la web muestra, y se indica cómo están cargados los productos en el panel.

/** Walkurio: la página existe (/walkurio) pero está oculta. Pasar a true cuando el universo esté listo para publicarse. */
export const WALKURIO_PUBLICADO = false;

/**
 * Cómo lee la web cada pieza desde el panel de la plataforma.
 * - Características del producto (Producto → Características): Tipo, Especie, Clase, Técnica, Materiales, Número de obra, Historia.
 * - Marcas (ver MARCAS, más abajo): pieza única, destacado y más buscado.
 * Si en el panel se cargan con otro nombre, alcanza con cambiarlo acá.
 */
export const CAMPOS = {
  tipo: 'Tipo',               // Criatura · Artefacto · E-book · Curso
  especie: 'Especie',         // Duende · Mandrágora · Minidrágora · Troll…
  variedad: 'Variedad',       // opcional: Duende del Dinero · Duende de Protección… (se muestra en vez de la especie)
  clase: 'Clase',             // para artefactos: Bitácora · Decorativo · Funcional…
  tecnica: 'Técnica',         // Técnica mixta · Técnica tradicional
  materiales: 'Materiales',   // separados por coma
  numero: 'Número de obra',
  historia: 'Historia',
  nivel: 'Nivel',             // cursos
  duracion: 'Duración',       // cursos
};
/**
 * Marcas de un producto. Cada una se puede poner en el panel de tres formas (alcanza con una):
 *   1. Categoría: el producto se suma a una categoría con ese nombre ("Piezas únicas", "No las dejes escapar"…).
 *   2. Característica: "Pieza única: Sí", "Destacado: Sí", "Más buscado: Sí".
 *   3. Etiqueta, si el panel las ofrece.
 * Acá va cada nombre aceptado, en minúsculas, sin acentos y con guiones.
 */
export const MARCAS = {
  unica: { nombres: ['pieza-unica', 'piezas-unicas', 'ooak', 'pieza-unica-ooak', 'piezas-unicas-ooak'], caracteristica: 'Pieza única' },
  destacada: { nombres: ['destacado', 'destacados', 'no-las-dejes-escapar'], caracteristica: 'Destacado' },         // sección "No las dejes escapar"
  buscada: { nombres: ['mas-buscado', 'mas-buscados', 'los-mas-buscados'], caracteristica: 'Más buscado' },         // sección "Los más buscados"
};

export const TIPOS = { criatura: 'Criatura', artefacto: 'Artefacto', ebook: 'E-book', curso: 'Curso' };

/** Menú por defecto: se usa mientras el panel no tenga un menú principal cargado. */
export const MENU_BASE = [
  { label: 'Tienda', kind: 'url', url: '/tienda', children: [] },
  { label: 'Cursos', kind: 'url', url: '/cursos', children: [] },
  { label: 'Walkurio', kind: 'url', url: '/walkurio', children: [] },
  { label: 'Walkiver', kind: 'url', url: '/walkiver', children: [] },
  { label: 'Contacto', kind: 'url', url: '/contacto', children: [] },
];

/** Los envíos de piezas físicas son solo dentro de este país (ver FAQ). */
export const PAIS_ENVIOS = 'Uruguay';

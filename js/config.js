// Walkiverso · configuración de la web.
// Acá se prende y apaga lo que la web muestra, y se indica cómo están cargados los productos en el panel.

/** Walkurio: la página existe (/walkurio) pero está oculta. Pasar a true cuando el universo esté listo para publicarse. */
export const WALKURIO_PUBLICADO = false;

/**
 * Cómo lee la web cada pieza desde el panel de la plataforma.
 * - Características del producto (Producto → Características): Tipo, Especie, Clase, Técnica, Materiales, Número de obra, Historia.
 * - Etiquetas del producto: marcan pieza única, pieza Walkiverso, destacados y más buscados.
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
export const ETIQUETAS = {
  unica: ['pieza-unica', 'ooak'],   // sin esta etiqueta, una criatura o artefacto es pieza Walkiverso
  destacada: ['destacado'],       // sección "No las dejes escapar"
  buscada: ['mas-buscado'],       // sección "Los más buscados"
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

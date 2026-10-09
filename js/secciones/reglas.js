// Qué piezas van en cada sección de la portada. Un solo lugar con todos los criterios.
// Cada sección tiene su regla y su respaldo: si nadie marcó piezas para ella en el panel, muestra otra cosa con criterio;
// si aun así no hay nada que mostrar, la sección no aparece.
import { plano } from '../ui/util.js';
import { DUENDES } from '../contenido.js';

const POR_FILA = 4;
const masNuevas = (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
/** Disponibles primero; dentro de cada grupo, las más nuevas primero. */
const vigentes = (a, b) => (b.available - a.available) || masNuevas(a, b);

/**
 * @param todo el catálogo completo (piezas de js/datos/modelo.js)
 * @returns las listas de cada sección de la portada
 */
export function secciones(todo) {
  const criaturas = todo.filter((x) => x.tipo === 'criatura').sort(vigentes);
  const artefactos = todo.filter((x) => x.tipo === 'artefacto').sort(vigentes);
  const libres = [...criaturas, ...artefactos].filter((x) => x.available);

  // DUENDES · siempre todos los duendes (disponibles primero). Sin duendes cargados, la sección desaparece.
  const duendes = criaturas.filter((x) => plano(x.species) === plano(DUENDES.especie));

  // NO LAS DEJES ESCAPAR · las piezas marcadas como destacadas en el panel que sigan disponibles.
  // Respaldo: lo que está por irse → piezas únicas primero, después las de menos stock, después las más nuevas.
  let destacadas = libres.filter((x) => x.destacada).sort(masNuevas);
  if (!destacadas.length) destacadas = libres.slice().sort((a, b) => (b.isUnique - a.isUnique) || ((a.stock ?? 99) - (b.stock ?? 99)) || masNuevas(a, b));
  destacadas = destacadas.slice(0, POR_FILA);

  // LOS MÁS BUSCADOS · las piezas marcadas como más buscadas que sigan disponibles.
  // Respaldo: la sección pasa a ser "Las últimas en llegar" (las más nuevas, sin repetir las de arriba si alcanza).
  let buscadas = libres.filter((x) => x.buscada).sort(masNuevas);
  const sonUltimas = !buscadas.length;
  if (sonUltimas) {
    const nuevas = libres.slice().sort(masNuevas);
    const sinRepetir = nuevas.filter((x) => !destacadas.includes(x));
    buscadas = sinRepetir.length >= 2 ? sinRepetir : nuevas;
  }
  buscadas = buscadas.slice(0, POR_FILA);

  return {
    criaturas, artefactos, duendes,
    // CRIATURAS y ARTEFACTOS · disponibles primero y, entre ellas, las últimas en llegar
    filaCriaturas: criaturas.slice(0, POR_FILA),
    filaArtefactos: artefactos.slice(0, POR_FILA),
    destacadas, buscadas, sonUltimas,
  };
}

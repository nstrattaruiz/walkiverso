// Walkurio: de qué está hecho el planeta y cómo son sus lunas. Las ZONAS (nombres, textos, ubicación, productos)
// se editan desde el panel y están en js/contenido.js → WALKURIO.zonas.
//
// · MAPA: la superficie sale de dos imágenes que arma .dev/walkurio-mapa.mjs a partir del mapa plano de referencia.
//   Si llega un mapa mejor (4096×2048), se vuelve a correr ese script y el planeta cambia solo.
// · LUNAS: tamaño (radio del planeta = 1), órbita (distancia, inclinación en grados, vuelta completa en segundos,
//   dónde arranca en grados), colores de su superficie (claro, oscuro, en RGB de 0 a 1) y mapa (la foto de su superficie,
//   con un tinte).

export const MAPA = { tierra: 'img/walkurio/tierra.webp', campos: 'img/walkurio/campos.webp' };

export const LUNAS = [
  { id: 'luna-1', mapa: 'img/walkurio/lunas/luna-1.webp', tinte: [1.02, 1, 0.96], radio: 0.13, orbita: 1.9, inclinacion: 14, vuelta: 170, inicio: 35, claro: [0.66, 0.66, 0.7], oscuro: [0.33, 0.34, 0.4], crateres: 1, semilla: 3.1 },
  { id: 'luna-2', mapa: 'img/walkurio/lunas/luna-2.webp', tinte: [0.86, 0.95, 1.12], radio: 0.085, orbita: 2.55, inclinacion: -22, vuelta: 260, inicio: 215, claro: [0.82, 0.88, 0.96], oscuro: [0.48, 0.58, 0.72], crateres: 0.55, semilla: 7.7 },
];

/** Los paisajes de cerca que sabe dibujar el planeta (el número es el que usa js/anim/planeta3d.js). */
export const PAISAJES = { montanas: 1, bosque: 2, selva: 3, hielo: 4, desierto: 5, llanura: 6, costa: 7, 'bosque frio': 8 };
const SINONIMOS = { montana: 'montanas', sierra: 'montanas', cordillera: 'montanas', bosques: 'bosque', selvas: 'selva', jungla: 'selva', glaciar: 'hielo', glaciares: 'hielo', polo: 'hielo', nieve: 'hielo', desiertos: 'desierto', arido: 'desierto', llanuras: 'llanura', pradera: 'llanura', praderas: 'llanura', costas: 'costa', playa: 'costa', 'bosque nevado': 'bosque frio', 'bosques frios': 'bosque frio', 'bosque-frio': 'bosque frio', taiga: 'bosque frio' };
/** "Montañas", "montaña", "Glaciar"… → la clave del paisaje (o '' si no se reconoce: el planeta decide según el mapa). */
export function paisajeDe(texto) {
  const p = String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const k = SINONIMOS[p] ?? p;
  return PAISAJES[k] ? k : '';
}

/**
 * Arma el árbol de zonas a partir de la lista plana del panel.
 * Cada zona sale con: id, nombre, clima, texto, cuerpo, lat/lon (números o null), imagen, productos (lista de handles),
 * enlace ({ texto, url } o null), provisorio y zonas (las de adentro).
 */
export function arbolDeZonas(lista) {
  const num = (v) => (String(v ?? '').trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const limpio = (v) => String(v ?? '').trim();
  const zonas = lista.filter((z) => limpio(z.id) && limpio(z.nombre)).map((z) => ({
    id: limpio(z.id), dentro: limpio(z.dentro), nombre: limpio(z.nombre), clima: limpio(z.clima), texto: limpio(z.texto),
    cuerpo: limpio(z.cuerpo), lat: num(z.lat), lon: num(z.lon), imagen: limpio(z.imagen),
    productos: limpio(z.productos).split(/[\s,]+/).filter(Boolean),
    enlace: limpio(z.enlaceUrl) ? { texto: limpio(z.enlaceTexto) || 'Ver más', url: limpio(z.enlaceUrl) } : null,
    paisaje: paisajeDe(z.paisaje),
    // Mientras no tenga texto propio (vacío, o dice "a definir" o "por definir"), se marca "Por definir"
    provisorio: !limpio(z.texto) || /(a|por) definir/i.test(z.texto), zonas: [],
  }));
  const porId = new Map(zonas.map((z) => [z.id, z]));
  const raiz = [];
  for (const z of zonas) (porId.get(z.dentro)?.zonas ?? raiz).push(z);
  // El cuerpo se hereda: una región de una luna está en esa luna aunque no lo diga
  const heredar = (l, cuerpo) => l.forEach((z) => { z.cuerpo = z.cuerpo || cuerpo; heredar(z.zonas, z.cuerpo); });
  heredar(raiz, 'planeta');
  // Una zona sin ubicación en una luna es la luna entera; en el planeta, sin ubicación no se puede mostrar
  return raiz.filter(function valida(z) { z.zonas = z.zonas.filter(valida); return z.lat !== null || z.cuerpo !== 'planeta'; });
}

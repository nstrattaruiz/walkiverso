// Walkurio: el planeta. Dos partes:
// · GEOGRAFIA: de qué está hecho (continentes, cordilleras, zonas secas y húmedas). El planeta se dibuja solo a partir
//   de esto, así que mover un continente o alargar una cordillera es cambiar números acá. Coordenadas en grados:
//   [latitud, longitud]; la longitud 0 es la cara que se ve al llegar. Radios y anchos, en grados.
// · ZONAS: lo que se puede explorar. Cada zona puede tener zonas adentro (y esas, otras), sin límite de niveles.
//
// Los nombres y textos son PROVISORIOS (descriptivos, sacados de la imagen de referencia): Walkiver los reemplaza.
// `provisorio: true` muestra la marca "Por definir" en la página.

export const GEOGRAFIA = {
  // Masas de tierra: varias por continente para darle forma. [lat, lon, radio]
  continentes: [
    // Continente central (arriba, en el centro de la imagen)
    [17, -8, 13], [14, 6, 13], [19, 18, 9], [6, 20, 8], [24, -2, 8],
    // Continente del sur, alargado de oeste a este
    [-17, -14, 10], [-19, 0, 10], [-21, 13, 10], [-28, 20, 5],
    // Isla del este, alargada de norte a sur
    [6, 46, 7], [-5, 44, 7], [-14, 41, 4],
    // Gran continente del oeste, de norte a sur, con su cordillera
    [30, -60, 11], [14, -56, 12], [-4, -60, 13], [-22, -58, 12], [-38, -54, 9], [4, -44, 6],
    // Tierras del norte: una franja ancha
    [50, -38, 12], [52, -14, 13], [50, 10, 12], [54, 32, 11], [64, -4, 12],
    // Tierras del sur: el arco helado de abajo
    [-56, -30, 12], [-60, -6, 13], [-56, 18, 12], [-52, 36, 7],
    // La cara oculta (no aparece en la imagen): un continente lejano y un archipiélago
    [8, 160, 15], [-10, 175, 13], [22, 178, 9], [-6, -160, 8],
    [24, 108, 5], [16, 118, 4], [30, 124, 4], [-26, 120, 6],
    [-24, -110, 9], [-12, -120, 7],
  ],
  // Cordilleras: arcos de montaña de un punto a otro. [lat, lon, lat, lon, ancho, altura]
  cordilleras: [
    [3, -6, 24, 16, 5.5, 1],       // la diagonal del continente central
    [-14, -20, -20, 4, 6, 0.9],    // el oeste montañoso del continente del sur
    [9, 49, -12, 46, 3.5, 0.8],    // la sierra de la isla del este
    [34, -60, -40, -54, 4.5, 1.1], // la gran cordillera del oeste
    [-50, -34, -54, 30, 6, 0.9],   // las montañas del sur
    [50, -30, 54, 26, 5, 0.6],     // el norte
    [14, 152, -14, 176, 6, 0.9],   // continente lejano
    [-20, -116, -28, -104, 4, 0.7],
  ],
  // Zonas secas (desierto, estepa) y húmedas (bosque cerrado). [lat, lon, radio]
  secas: [[12, -12, 9], [-15, -12, 8], [-6, -62, 16], [-24, -60, 10], [12, 12, 5], [-2, 170, 8]],
  humedas: [[22, -4, 9], [16, 24, 8], [-22, 12, 9], [0, 44, 8], [4, -44, 7], [12, 160, 9]],
};

/** Una zona del planeta. lat/lon: dónde está. zonas: las de adentro (opcional). */
export const ZONAS = [
  {
    id: 'continente-central', nombre: 'Continente central', clima: 'Templado', lat: 15, lon: 2, provisorio: true,
    texto: 'Bosques al norte, llanuras secas al sur y una cordillera que lo cruza en diagonal. Texto a definir por Walkiver.',
    zonas: [
      { id: 'bosques-del-norte', nombre: 'Bosques del norte', clima: 'Húmedo', lat: 23, lon: -6, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'cordillera-central', nombre: 'Cordillera central', clima: 'Frío de altura', lat: 14, lon: 5, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'llanuras-secas', nombre: 'Llanuras secas', clima: 'Árido', lat: 12, lon: -13, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'valles-del-este', nombre: 'Valles del este', clima: 'Templado', lat: 12, lon: 20, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'continente-del-sur', nombre: 'Continente del sur', clima: 'Árido y selvático', lat: -19, lon: 0, provisorio: true,
    texto: 'Montañas y desierto de roca al oeste; selva cerrada al este. Texto a definir por Walkiver.',
    zonas: [
      { id: 'desierto-de-roca', nombre: 'Desierto de roca', clima: 'Árido', lat: -15, lon: -13, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'selvas-del-este', nombre: 'Selvas del este', clima: 'Húmedo', lat: -21, lon: 12, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'costa-sur', nombre: 'Costa sur', clima: 'Templado', lat: -26, lon: 0, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'isla-del-este', nombre: 'Isla del este', clima: 'Húmedo', lat: -1, lon: 45, provisorio: true,
    texto: 'Una isla larga con una sierra en su costa. Texto a definir por Walkiver.',
    zonas: [
      { id: 'sierra-costera', nombre: 'Sierra costera', clima: 'Frío de altura', lat: 2, lon: 48, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'valles-de-la-isla', nombre: 'Valles de la isla', clima: 'Húmedo', lat: -6, lon: 42, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'gran-cordillera', nombre: 'Gran cordillera del oeste', clima: 'Seco y frío', lat: 0, lon: -56, provisorio: true,
    texto: 'Un continente atravesado de norte a sur por montañas. Texto a definir por Walkiver.',
    zonas: [
      { id: 'cumbres', nombre: 'Las cumbres', clima: 'Helado', lat: 10, lon: -58, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'mesetas', nombre: 'Mesetas secas', clima: 'Árido', lat: -16, lon: -62, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'costa-verde', nombre: 'Costa verde', clima: 'Húmedo', lat: 4, lon: -45, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'tierras-del-norte', nombre: 'Tierras del norte', clima: 'Frío', lat: 50, lon: -6, provisorio: true,
    texto: 'Bosques fríos que se pierden en el hielo. Texto a definir por Walkiver.',
    zonas: [
      { id: 'bosques-frios', nombre: 'Bosques fríos', clima: 'Frío', lat: 48, lon: -20, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'hielos-del-norte', nombre: 'Hielos del norte', clima: 'Helado', lat: 66, lon: 4, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'tierras-del-sur', nombre: 'Tierras del sur', clima: 'Helado', lat: -57, lon: 0, provisorio: true,
    texto: 'Montañas y glaciares en el fondo del mundo. Texto a definir por Walkiver.',
    zonas: [
      { id: 'montanas-del-sur', nombre: 'Montañas del sur', clima: 'Helado', lat: -53, lon: 16, provisorio: true, texto: 'Texto a definir por Walkiver.' },
      { id: 'glaciares', nombre: 'Glaciares', clima: 'Helado', lat: -61, lon: -14, provisorio: true, texto: 'Texto a definir por Walkiver.' },
    ],
  },
  {
    id: 'continente-lejano', nombre: 'Continente lejano', clima: 'Por definir', lat: 4, lon: 165, provisorio: true,
    texto: 'Del otro lado del planeta. No aparece en la imagen de referencia: todo por definir.',
  },
];

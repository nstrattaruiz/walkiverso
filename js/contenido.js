// Walkiverso · textos de fábrica de la web.
// Si la tienda trae textos propios desde el panel, reemplazan a estos (ver js/datos/textos.js y PANEL.md).
// Para cambiar un texto a mano se edita acá: el diseño no se toca.
// Lo marcado como PROVISORIO es texto de relleno para reemplazar.

export const HERO = {
  titulo: 'Arte, Magia <em>y</em> Folklore',
  texto: 'Criaturas y artefactos de fantasía oscura, nacidos del folklore, la mitología y la ficción.',
  cta: 'Explorar tienda',
  pista: 'Mové la luz: hay cosas escondidas',
  // Fotos de fondo del hero (opcional). Una sola queda fija; varias se van cruzando. Ej.: ['img/hero-1.jpg', 'img/hero-2.jpg']
  imagenes: [
    'img/criaturas-portada-mandragora-mandrake-harrypotter-halloween.webp',
    'img/objetos-portada-bitacora-diario-journal-halloween.webp',
    'img/criaturas-portada-minidragora-mandrake-harrypotter-halloween.webp',
  ],
};

/** Cinta en movimiento debajo del hero. */
export const CINTA = ['Arte', 'Magia', 'Folklore', 'Criaturas con nombre', 'Artefactos con carácter', 'Piezas únicas', 'Certificado de autenticidad'];

export const CREACIONES = {
  sobre: 'Walkiverso',
  titulo: 'Las creaciones',
  texto: 'Todo nace de una historia, con materiales combinados y técnicas mixtas. Explorá el universo de Walkiver.',
  // `imagen`: foto de fondo de cada puerta. Sin imagen, el fondo va rotando entre las piezas.
  criaturas: { titulo: 'Criaturas', texto: 'Seres con nombre, historia y personalidad.', cta: 'Ver criaturas disponibles', imagen: 'img/fondo criaturas.webp' },
  artefactos: { titulo: 'Artefactos', texto: 'Artefactos misteriosos con mucho carácter.', cta: 'Ver artefactos disponibles', imagen: 'img/fondo artefactos.webp' },
};

/** Sección de duendes: cuántos quedan y el sorteo. Los textos son PROVISORIOS. */
export const DUENDES = {
  especie: 'Duende',            // la especie que muestra la sección (como está cargada en el panel)
  sobre: 'Buscan hogar',
  titulo: 'Duendes',
  quedan: 'duendes disponibles',
  queda: 'duende disponible',
  texto: 'Dicen que no elegís a tu duende: es él quien te elige. ¿Te animás a probar?',
  azar: 'Que un duende me elija',
  otraVez: 'Probar otra vez',
  eligio: 'Te eligió',
  verTodos: 'Ver todos los duendes',
};

/** Pedile un deseo al Walkiverso. Las respuestas II y III son PROVISORIAS. */
export const DESEO = {
  sobre: 'Solicitudes',
  titulo: 'Pedile un deseo al Walkiverso',
  texto: 'Tus ideas pueden inspirar a las próximas criaturas y objetos del taller.',
  cta: 'Solicitar una creación',
  items: [
    { q: '¿Cómo funcionan las solicitudes?', a: '<p>A través de este formulario podés enviarnos una solicitud para futuras creaciones del Walkiverso.</p><p>Cada creación es única: las criaturas se desarrollan por <strong>personajes</strong> y los objetos por <strong>diseños</strong>. Por ese motivo no realizamos encargos personalizados ni aceptamos pagos anticipados.</p><p>Estos aportes nos ayudan a entender qué creaciones despiertan más interés dentro de la comunidad.</p>' },
    { q: '¿Qué pasa con las solicitudes?', a: '<p>Las leemos todas. No se responden una por una ni garantizan que la pieza se realice, pero las ideas que más se repiten suelen inspirar futuras creaciones.</p>' },
    { q: '¿Cómo enterarte si llega una nueva pieza?', a: '<p>Las nuevas piezas se anuncian en la tienda y en nuestras redes.</p>' },
  ],
};

export const SECCIONES = {
  criaturas: { sobre: 'Tienda', titulo: 'Criaturas', texto: 'Seres con nombre, historia y personalidad.', cta: 'Ver todas las criaturas' },
  artefactos: { sobre: 'Tienda', titulo: 'Artefactos', texto: 'Objetos mágicos, decorativos y/o funcionales, nacidos de historias que todavía no terminamos de contar.', cta: 'Ver todos los artefactos' },
  destacadas: {
    sobre: 'Disponibles hoy',
    titulo: 'No las dejes <em>escapar</em>',
    texto: 'Cada obra es única en su momento. No trabajamos por encargos, así que si te gusta, no la dejes escapar: no sabemos cuándo volverá a estar disponible.',
  },
  buscadas: { sobre: 'Los que más piden', titulo: 'Los más buscados', cta: 'Ver toda la tienda' },
  // Se muestra en lugar de "Los más buscados" cuando ninguna pieza está marcada como más buscada
  ultimas: { sobre: 'Recién llegadas', titulo: 'Las últimas en llegar', cta: 'Ver toda la tienda' },
  universo: {
    sobre: 'El universo',
    pronto: 'Un territorio en desarrollo',
    titulo: 'Dónde las criaturas <em>cobran vida</em>',
    texto: 'Un universo que crece con cada criatura, cada historia y cada nueva creación.',
  },
  diferencia: [
    { titulo: 'Una criatura', texto: 'Un ser con nombre, historia y personalidad.', icono: 'i-ojo', cta: 'Ver criaturas', href: '/tienda?tipo=criatura' },
    { titulo: 'Un artefacto', texto: 'Un objeto mágico decorativo y/o funcional.', icono: 'i-sello', cta: 'Ver artefactos', href: '/tienda?tipo=artefacto' },
  ],
  tienda: { sobre: 'Tienda', titulo: 'Todas las criaturas y artefactos disponibles' },
};

/** Así nacen las criaturas. Para sumar un paso o un video alcanza con agregar un elemento: la sección crece sola. */
export const PROCESO = {
  sobre: 'El taller',
  titulo: 'Así nacen las criaturas',
  texto: 'De materiales inertes a una primera mirada.',
  orbe: 'Cómo se ve, qué características tiene, qué la hace especial.',
  despierta: 'Primera mirada.',
  // `texto` de cada paso: PROVISORIO. `imagen`: ruta de la foto (ver LEEME.md); sin imagen se muestra un marco de espera.
  pasos: [
    { nombre: 'Idea', texto: 'Todo empieza con una historia que pide un cuerpo.', imagen: '' },
    { nombre: 'Escultura', texto: 'La forma aparece a mano, volumen por volumen.', imagen: '' },
    { nombre: 'Diseño', texto: 'Se define cómo se ve y qué la vuelve reconocible.', imagen: '' },
    { nombre: 'Materiales', texto: 'Cartón, telas, alambre, hilos y materiales recuperados.', imagen: '' },
    { nombre: 'Detalles', texto: 'Texturas, color y pequeñas marcas que cuentan su pasado.', imagen: '' },
    { nombre: 'Personalidad', texto: 'Un gesto, una postura: ahí deja de ser un objeto.', imagen: '' },
    { nombre: 'Criatura', texto: 'Abre los ojos. Ya tiene nombre.', imagen: '' },
  ],
};

/** Magia en movimiento: reels del taller. `video`: archivo .mp4 en la carpeta (ej. /video/reel-1.mp4) · `enlace`: link al reel
 *  en Instagram (se usa si no hay video) · `poster`: imagen de portada vertical. Sin video ni enlace, la tarjeta dice "Muy pronto". */
export const REELS = {
  sobre: 'Desde el taller',
  titulo: 'Magia en movimiento',
  texto: 'Así nacen las criaturas: del cartón reciclado a su primera mirada.',
  items: [
    { titulo: 'Nace una mandrágora', etiqueta: 'Asomate al espejo', video: '', enlace: '', poster: '' },
    { titulo: 'Pintando a Sadybud', etiqueta: '', video: '', enlace: '', poster: '' },
    { titulo: 'Bitácora Corpus Vacuum', etiqueta: '', video: '', enlace: '', poster: '' },
    { titulo: 'Próximo reel', etiqueta: '', video: '', enlace: '', poster: '' },
    { titulo: 'Próximo reel', etiqueta: '', video: '', enlace: '', poster: '' },
  ],
};

/** Voces del Walkiverso. Los que tienen `ejemplo: true` son de muestra: reemplazarlos por testimonios reales antes de publicar. */
export const VOCES = {
  sobre: 'Quienes ya adoptaron',
  cta: 'Dejar mi comentario',
  titulo: 'Voces del Walkiverso',
  texto: 'Contanos qué te pareció.',
  items: [
    { nombre: 'Nombre', pais: 'Uruguay', pieza: 'Groompyroot', comentario: 'Acá va el comentario de quien adquirió la pieza: qué sintió al recibirla y dónde vive ahora.', imagen: '', ejemplo: true },
    { nombre: 'Nombre', pais: 'Argentina', pieza: 'Curso de la Academia', comentario: 'Acá va un segundo comentario, idealmente sobre un curso o un e-book.', imagen: '', ejemplo: true },
    { nombre: 'Nombre', pais: 'Uruguay', pieza: 'Bjorn', comentario: 'Acá va un tercer comentario, corto y concreto.', imagen: '', ejemplo: true },
  ],
};

export const WALKIVER = {
  sobre: 'Walkiver',
  cta: 'Conocer a Walkiver',
  titulo: 'Detrás de este universo creativo hay <em>un artista</em>',
  texto: 'Conocé a Walkiver, explorá sus videos mitológicos y adquirí su ebook “Somos Mitos” para comenzar a entender estas historias.',
  ebookHandle: 'somos-mitos',   // handle del producto del e-book en el panel
  imagen: '',                   // retrato de Walkiver (ver LEEME.md)
  // Página /walkiver. PROVISORIO: reemplazar por la biografía real.
  bio: [
    'Walkiver es el artista detrás del Walkiverso: imagina, esculpe y da nombre a cada criatura y a cada artefacto.',
    'Este espacio está reservado para su historia, contada por él.',
  ],
  videos: [],                   // [{ titulo, url }] videos mitológicos (YouTube)
};

export const ACADEMIA = {
  sobre: 'Cursos',
  cta: 'Ir a la Academia',
  titulo: 'Academia Walkiverso',
  subtitulo: 'El lugar donde nacen los monstruos.',
  texto: 'Aprendé en el taller de Walkiver.',
};

export const FICHA = {
  cuidadosTitulo: 'Cómo cuidarla',
  cuidados: 'Mantenela alejada de la humedad y del sol directo. Para limpiarla, alcanza con un pincel suave y seco. No la mojes ni utilices productos de limpieza sobre ella.',
};

export const FAQ = {
  sobre: 'Antes de adoptar',
  titulo: 'Las dudas más frecuentes',
  texto: 'Lo que más nos preguntan antes de adoptar una criatura.',
  items: [
    { q: '¿Qué medios de pago aceptan?', a: '<p>En Uruguay aceptamos <strong>Mercado Pago, tarjetas de crédito y débito, Abitab y Redpagos</strong>, con opciones de pago en cuotas.</p><p>Desde el exterior, los <strong>cursos y e-books</strong> pueden adquirirse mediante <strong>PayPal</strong>.</p>' },
    { q: '¿Hacen encargos personalizados?', a: '<p>No realizamos encargos personalizados ni aceptamos pagos por solicitudes.</p><p>Pero si soñás con una criatura o artefacto fantástico, podés pedirle un deseo al Walkiverso: tus ideas pueden inspirar futuras creaciones.</p>' },
    { q: '¿Con qué materiales están hechas?', a: '<p>Utilizamos una amplia variedad de materiales, como cartón, telas, alambre, PLA, acrílicos, hilos, cuerdas y diversos materiales reciclados, como ropa, accesorios y otros elementos.</p><p>Los materiales utilizados dependen del tipo de pieza —pieza Walkiverso o pieza única— y de las características de cada diseño.</p><p>Cada obra incluye una descripción de los materiales empleados, que también quedan registrados en su certificado de autenticidad.</p>' },
    { q: '¿Cómo cuido a mi criatura?', a: '<p>Mantenela alejada de la humedad y del sol directo.</p><p>Para limpiarla, alcanza con un pincel suave y seco.</p><p>No la mojes ni utilices productos de limpieza sobre ella.</p>' },
    { q: '¿Qué diferencia hay entre una pieza Walkiverso y una pieza única (OOAK)?', a: '<p>Las <strong>piezas Walkiverso</strong> representan personajes y artefactos que tienen una historia y un lugar dentro de Walkurio.</p><p>Tienen un nombre y un trasfondo propio que se mantiene vivo y continúa desarrollándose.</p><p>Cada cierto tiempo toman forma física en el taller mediante una combinación de impresión 3D y trabajo artesanal detallado.</p><p>Las <strong>piezas únicas (OOAK)</strong> son diseños nuevos y espontáneos de criaturas, artefactos u otras ideas que no forman parte de Walkurio.</p><p>Son oportunidades especiales para adquirir una obra única creada mediante técnicas tradicionales de escultura y desarrollada a lo largo de un proceso artesanal más extenso.</p>' },
    { q: '¿Cómo se realizan las piezas del Walkiverso?', a: '<p>Se crean mediante una combinación de tecnología y trabajo artesanal.</p><p>Su estructura base se reproduce mediante impresión 3D, utilizando el escaneado de la escultura física original, hecha a mano, y una posterior etapa de esculpido digital.</p><p>Después, cada pieza se trabaja artesanalmente realizando detalles, texturas y colores, utilizando materiales diversos como porcelana, telas, hilos y materiales reciclados, hasta conformar una obra fiel al diseño de la primera pieza que Walkiver creó con sus propias manos.</p>' },
    { q: '¿Las piezas traen certificado?', a: '<p>Sí.</p><p>Cada pieza incluye un certificado de autenticidad con:</p><ul><li>Nombre</li><li>Número de obra</li><li>Materiales utilizados</li><li>Sello de Walkiverso</li><li>Firma de Walkiver</li></ul>' },
    { q: '¿Hacen envíos?', a: '<p>Sí, realizamos envíos a todo Uruguay.</p><p>Por el momento, las piezas físicas no están disponibles para envío internacional, pero estamos trabajando para hacerlo posible.</p><p>Los cursos y e-books, en cambio, sí pueden adquirirse desde cualquier parte del mundo.</p>' },
  ],
};

export const PIE = { lema: 'Arte, Magia y Folklore.' };

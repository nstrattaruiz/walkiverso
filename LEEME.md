# Walkiverso · web para la plataforma

Tienda online de Walkiverso: **Arte, Magia y Folklore.** HTML, CSS y JS sin dependencias, con la firma NS,
lista para la plataforma (los datos salen de la tienda con el SDK).

> **Panel:** qué necesita esta tienda del panel, dónde aparece cada producto y cómo se editan los textos está en `PANEL.md`.

## Verla

**Sin la plataforma (demostración, datos de ejemplo):**

```
node .dev/servir.mjs      →  http://localhost:4173
```

Abajo a la izquierda aparece "Demostración · datos de ejemplo". El checkout es de prueba: no cobra.
Cupón de prueba: `MAGIA`.

**Con la plataforma (datos reales de la tienda):**

```
cd C:\dev\plataforma
npm run sitio -- dev --tienda <tienda>.localhost --carpeta "C:\Users\Nico Stratta\Desktop\Walkiverso"
```

La web detecta sola el SDK (`/api/v1/sdk.js`): si está, usa la tienda; si no, la demostración.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura: firma NS, contenedor de páginas, buscador, carrito, modal, pie |
| `js/config.js` | **Interruptores**: Walkurio publicado o no, nombres de las características y etiquetas del panel, menú y pie por defecto |
| `js/contenido.js` | **Textos de fábrica**: hero, secciones, proceso, testimonios, Walkiver, FAQ. El panel puede reemplazarlos (`js/datos/textos.js`) |
| `js/secciones/reglas.js` | **Qué piezas van en cada sección** de la portada y con qué respaldo |
| `panel/textos-walkiverso.json` | Lista de textos editables para el panel (generada con `node .dev/esquema.mjs`; los grupos de Walkiver salen de `walkiver/campos.js`, generado con `node .dev/walkiver-campos.mjs`) |
| `js/app.js` | Arranque y rutas |
| `js/datos/tienda.js` | SDK de la plataforma o tienda de demostración |
| `js/datos/modelo.js` | De producto de la plataforma a "pieza" (única / Walkiverso, especie, técnica…), catálogo y búsqueda |
| `js/datos/demo.js`, `demo-datos.js` | Tienda de demostración (solo fuera de la plataforma) |
| `js/ui/` | `marco` (header, menús, pie, aviso, cookies) · `tarjeta` (product card y grilla) · `carrito` · `buscador` · `piezas` (modal y FAQ) · `util` |
| `js/anim/` | `particulas` (hero) · `efectos` (apariciones, parallax con inercia, tarjetas que reaccionan) |
| `js/paginas/` | `inicio` · `tienda` (grilla + filtros) · `ficha` · `checkout` (3 pasos + pedido) · `academia` (cursos) · `walkiver` · `walkurio` (el planeta) · `contacto` (+ legales) · `cuenta` |
| `css/` | `ns-firma` (firma) · `wk-base` (paleta, temas, botones, formularios) · `wk-inicio` · `wk-tienda` · `wk-paginas` · `wk-forma` (la forma de la marca: barra, bloques, cinta, tipografía; se carga al final) |
| `img/` | Logo, ícono (con fondo transparente), favicon y ramas. Los tres SVG originales quedaron en la raíz |

Rutas: `/` · `/tienda` · `/categoria/:handle` · `/producto/:handle` · `/cursos` · `/curso/:slug` · `/walkiver` · `/contacto` ·
`/checkout` · `/pedido` · `/legal/:tipo` · `/cuenta` (módulo Cuentas) · `/walkurio` (fuera del menú hasta publicarla).

## Cómo cargar cada pieza en el panel

La web lee todo del producto. Nada está fijo en el diseño.

| En el panel | Valor | Qué controla |
|---|---|---|
| Característica **Tipo** | `Criatura` · `Artefacto` · `E-book` · `Curso` | Dónde aparece y el texto del botón ("Adoptar esta criatura" / "Adquirir artefacto") |
| Característica **Especie** | `Duende`, `Mandrágora`, `Minidrágora`, `Troll`… | Línea bajo el nombre, categorías y filtro de especie |
| Característica **Variedad** (opcional) | `Duende del Dinero`, `Duende de Protección`… | Se muestra en la tarjeta y la ficha en lugar de la especie; la especie sigue agrupando y filtrando |
| Característica **Clase** (artefactos) | `Bitácora`, `Decorativo`, `Funcional`… | Lo mismo, para artefactos |
| Categoría **`Piezas únicas`** o característica **`Pieza única: Sí`** | — | Badge PIEZA ÚNICA, tope de 1 en el carrito, filtro. Sin la marca es **pieza Walkiverso** |
| Característica **Técnica** | `Técnica mixta` · `Técnica tradicional` | Metadata discreta. Si falta: tradicional para únicas, mixta para el resto |
| Característica **Materiales** | separados por coma | Ficha y certificado |
| Característica **Número de obra** | `012` | Certificado |
| Característica **Historia** | texto | Sección "Su historia" de la ficha |
| Categoría **`No las dejes escapar`** o característica **`Destacado: Sí`** | — | Sección "No las dejes escapar" |
| Categoría **`Los más buscados`** o característica **`Más buscado: Sí`** | — | Sección "Los más buscados" |
| Características **Nivel** y **Duración** (producto del curso) | `Inicial`, `8 horas` | Tarjeta del curso |
| Stock en 0 | — | "Esta criatura ya encontró hogar." + "Ver otras criaturas →" |

Si en el panel conviene otro nombre para alguna característica o etiqueta, se cambia en `js/config.js`.

## Catálogo migrado de la tienda anterior

`js/datos/catalogo.js` trae los **32 productos publicados** en walkiverso.com (WooCommerce), sacados del respaldo de
Hostinger del 2026-10-06, con sus 142 fotos en `img/productos/<producto>/`. Lo usa solo la tienda de demostración;
en la plataforma los productos se cargan en el panel.

- 13 duendes, 9 mandrágoras, 6 minidrágoras, 3 pixies y 2 bitácoras. 17 con stock y 15 sin stock.
- Precios en pesos uruguayos, tal como estaban. Stock, descripción y SKU, también.
- El título viejo "Mandrágora - Groompyroot" pasó a nombre `Groompyroot` y especie `Mandrágora`.
- "Duendes Milarko" pasó a especie `Duende`; el tipo de duende quedó en la característica `Variedad`
  ("Duende del Dinero", "Duende de Protección"…), que se muestra en la tarjeta en lugar de la especie.
- Las bitácoras pasaron a tipo `Artefacto`, clase `Bitácora`.
- No se migraron: 43 productos en la papelera y 1 borrador; clientes, pedidos y usuarios.
- El e-book y los tres cursos de la demostración siguen siendo de relleno.

## Walkurio: el planeta

`/walkurio` es un planeta en 3D para explorar: se llega desde el espacio, se gira arrastrando, se acerca con la rueda
o pellizcando y se entra por zonas (y dentro de cada zona, a otras). Se ve entrando con la dirección; en el menú y en
el pie sigue oculta hasta poner `WALKURIO_PUBLICADO = true` en `js/config.js`.

| Archivo | Qué hace |
|---|---|
| `js/datos/walkurio.js` | **Lo que se edita.** `GEOGRAFIA`: continentes, cordilleras, zonas secas y húmedas (en grados). `ZONAS`: nombre, clima, texto, ubicación y zonas de adentro, sin límite de niveles |
| `js/anim/planeta3d.js` | El planeta: se dibuja solo a partir de la geografía (sin fotos), con relieve, climas, mares, hielo, nubes, atmósfera y estrellas. Al entrar a una zona calcula un "parche" de detalle para que de cerca se vea nítido |
| `js/paginas/walkurio.js` | La página: llegada, panel con migas, marcas sobre el planeta, teclado (flechas, + y −, Escape para volver) |
| `css/wk-mundo.css` | Estilos. La página no tiene pie: es pantalla completa |

- La dirección guarda dónde estás: `/walkurio#continente-central/cordillera-central` abre directo esa zona.
- Los nombres y textos de las zonas son **provisorios** (descriptivos, sacados de la imagen de referencia) y se
  marcan "Por definir" en la página. Cada zona tiene `provisorio: true`; sacarlo quita la marca.
- Al cambiar coordenadas: con `node .dev/servir.mjs`, la consola del navegador avisa si una zona cayó en el agua.
- Sin WebGL (navegadores muy viejos) queda el panel para recorrer las zonas, sin el planeta.

## Imágenes que faltan

Mientras no haya fotos, cada lugar muestra un marco de espera azul con el símbolo. Las fotos de las piezas se
cargan en el panel (producto); las demás van en `img/` y su ruta se escribe en `js/contenido.js`.

| Dónde | Archivo sugerido | Proporción / medida | Se carga en |
|---|---|---|---|
| Cada criatura y artefacto (principal + galería) | — | Vertical 4:5, 1600 × 2000 px. La pieza centrada y con aire arriba: el marco tiene forma de arco | Panel → Producto |
| Cada curso y e-book | — | 16:10, 1600 × 1000 px | Panel → Producto del curso |
| Proceso, 7 pasos | `img/proceso-01-idea.jpg` … `img/proceso-07-criatura.jpg` | Vertical 4:5, 1000 × 1250 px | `contenido.js` → `PROCESO.pasos[].imagen` |
| Retrato de Walkiver | `img/walkiver.jpg` | Vertical 4:5, 1200 × 1500 px | `contenido.js` → `WALKIVER.imagen` |
| Testimonios (opcional) | `img/voz-nombre.jpg` | Cuadrada, 200 × 200 px | `contenido.js` → `VOCES.items[].imagen` |
| Imagen al compartir | — | 1200 × 630 px | Panel → Apariencia |

## Textos provisorios (para reemplazar)

- `contenido.js` → `PROCESO.pasos[].texto`: una línea por paso del proceso.
- `contenido.js` → `VOCES.items`: tres testimonios marcados "Ejemplo" (se ven con esa etiqueta hasta reemplazarlos).
- `contenido.js` → `WALKIVER.bio` y `WALKIVER.videos`: biografía y videos de la página Walkiver.
- Etiquetas chicas sobre los títulos ("El taller", "Quienes ya adoptaron", "Antes de adoptar"…) en `js/paginas/inicio.js`.

## Notas

- **Referencia:** tema Pebble de Shopify (themes.shopify.com/themes/pebble). Se toma la estructura: secciones como bloques bien separados con fondos planos y claros, tarjetas rectangulares redondeadas, títulos centrados con etiqueta arriba, botones píldora con la flecha en un círculo y la cinta en movimiento. Colores, textos y contenido son de Walkiverso.
- **Barra:** transparente arriba y píldora de vidrio oscuro al bajar. En páginas que empiezan con fondo claro (ficha, checkout, cursos…) va siempre como píldora, para que se lea.
- Tipografías: Bricolage Grotesque (títulos), Fraunces en cursiva (acentos) e Instrument Sans (texto y botones), cargadas desde Google Fonts.
- **Favoritos:** el corazón guarda piezas en el navegador del visitante (`/favoritos`). No usa la plataforma: es por dispositivo y sin cuenta.
- **Duendes:** la sección de la portada muestra la especie indicada en `contenido.js` → `DUENDES.especie`, cuenta las unidades disponibles y sortea una pieza disponible al azar.
- **Pedile un deseo** (`js/secciones/deseo.js`): la solicitud va pidiendo una cosa por vez dentro de la sección y llega al panel → Mensajes con asunto "Deseo al Walkiverso". Las respuestas II y III son provisorias (`contenido.js` → `DESEO`). La imagen de referencia se sube con `tienda.archivos.subir` (JPG, PNG o WEBP, hasta 6 MB) y llega en el mail del mensaje.
- **Las creaciones** (`js/secciones/puertas.js`): dos puertas que rotan sus piezas de fondo y, al acercarse, muestran especies y piezas.
- **Magia en movimiento** (`js/secciones/reels.js`): los reels se cargan en `contenido.js` → `REELS` (`video`: archivo .mp4 en la carpeta, hasta 25 MB; o `enlace` a Instagram; `poster`: portada vertical 9:16, 720 × 1280 px). Sin video ni enlace, la tarjeta dice "Muy pronto". Los videos arrancan sin sonido.
- **Tratamiento de las fotos** (hero y puertas): no se editan los archivos; el CSS les baja apenas la saturación, les suma un tinte azul de la paleta, grano fino y viñeta, para que se integren y no resalten. Se ajusta en `css/wk-forma.css` ("Fotos: integradas a la paleta").
- **Fondo de las puertas:** `contenido.js` → `CREACIONES.criaturas.imagen` y `.artefactos.imagen`. Sin imagen, el fondo rota entre las piezas.
- **Polvo de hadas del mouse:** `js/anim/polvo.js` (solo con mouse; se apaga con "reducir movimiento").
- **Pie:** logo, lema, redes y línea legal. Ya no muestra columnas de enlaces (tampoco el menú de pie del panel).
- **Fotos del hero:** `contenido.js` → `HERO.imagenes` (una queda fija; varias se cruzan cada 7 s). Horizontales, 2400 × 1400 px. Llevan un velo azul para que el título se lea.
- **Bola de cristal:** es la de walkiverso-web, en 3D (`js/anim/orbe3d.js` + `js/vendor/three.module.min.js`, 690 KB). Se descarga recién cuando la sección se acerca a la pantalla; si el navegador no puede con el 3D, queda el humo en 2D (`js/anim/humo.js`).
- **Referencia walkiverso-web** (nstrattaruiz.github.io/walkiverso-web): se tomó solo la bola del deseo y los efectos de luz del pie (luciérnagas y halo detrás del logo).
- **Raíces:** `raices('izq' | 'der')` de `js/ui/piezas.js`, en una sección con la clase `wk-con-raices`.
- **Lo escondido del hero:** dibujos que solo se ven bajo la luz del cursor (en celular, una luz pasea sola). Están en `js/paginas/inicio.js` → `oculto()`.
- **Dudas frecuentes:** viven en el pie (en todas las páginas menos checkout, pedido y cuenta).
- **Raíces:** `data-crece` las hace crecer al entrar en pantalla; en la portada se agregan con `raices('izq' | 'der')`.
- **Barra:** el círculo y la barra miden 56 px (50 al bajar). El mismo cambio quedó aplicado en el Kit NS (`1-firma-ns/html/ns-firma.css` y `3-plantilla-tienda/css/ns-firma.css`).
- En la demostración la cuenta está activa: cualquier email y contraseña sirven para ingresar.
- La paleta está en `css/wk-base.css` (`:root`). La web no toma los colores del panel, para no romper la identidad azul y blanca.
- Sin sonido en ningún lado. Las animaciones usan `transform` y `opacity`, se pausan fuera de pantalla y respetan
  "reducir movimiento"; en celular hay menos partículas y no hay efectos de mouse.
- De la plantilla del Kit no se portaron (no aplican a esta tienda): pedido rápido por código, página de reseñas,
  asistente de compras y comprobantes de ERP.

## Verla desde cualquier compu (GitHub Pages)

- Repositorio: https://github.com/nstrattaruiz/walkiverso (público)
- Web: https://nstrattaruiz.github.io/walkiverso/ — corre en modo demostración (datos de ejemplo, no cobra) y lleva `noindex` para que no la tomen los buscadores.
- Para actualizarla: `git add -A`, `git commit -m "…"`, `git push`. Se publica sola en uno o dos minutos.
- La web funciona igual en la raíz (plataforma) y en una subcarpeta (Pages): `index.html` fija la carpeta base con `<base>` y `404.html` recupera las rutas internas en Pages. En el código, las rutas de la web pasan por `rutaWeb()` y `url()` de `js/ui/util.js`.

## Carga inicial

Fondo oscuro como el pie: una chispa escribe el logo de izquierda a derecha dejando polvo de luz, el logo estalla en destellos y la oscuridad se disipa como niebla. Una vez por visita (`sessionStorage`). El marcado y el guion de la chispa están al principio de `index.html` (`#carga`); se cierra desde `js/app.js` (`abrirTelon`) cuando la primera página ya está dibujada, con un mínimo de 2,6 s. Si algo fallara, se va sola a los 9 s.

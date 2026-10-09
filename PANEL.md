# Walkiverso · qué necesita del panel

Registro de lo que el panel de la plataforma tiene que ofrecer **para esta tienda**, y de cómo lo lee la web.
Está escrito para quien conecte Walkiverso a la plataforma. Lo general de la web está en `LEEME.md`.

Estado al 2026-10-09: la web corre con la tienda de demostración. Todo lo de la sección 1 y 2 ya funciona con lo que
el panel tiene hoy (categorías y características). La sección 3 necesita una función nueva en la plataforma.

## 1. Dónde aparece cada producto

Los criterios están en un solo archivo: `js/secciones/reglas.js`. Los nombres que reconoce la web, en `js/config.js` (`MARCAS`).

| Sección de la portada | Qué muestra | Si no hay nada marcado | Si no hay nada que mostrar |
|---|---|---|---|
| **Las creaciones** (dos puertas) | Cantidad disponible, especies y tres piezas de cada tipo | — | La puerta queda sin lista |
| **Criaturas** | Hasta 4 criaturas: disponibles primero y, entre ellas, las últimas en llegar | — | La sección no aparece |
| **Artefactos** | Igual, con artefactos | — | La sección no aparece |
| **Duendes** | **Todos** los productos de especie `Duende`, con el contador de unidades disponibles y el sorteo | — | La sección no aparece |
| **No las dejes escapar** | Hasta 4 piezas disponibles marcadas como **destacadas** | Lo que está por irse: piezas únicas primero, después las de menos stock, después las más nuevas | La sección no aparece |
| **Los más buscados** | Hasta 4 piezas disponibles marcadas como **más buscadas**, numeradas | Pasa a llamarse **"Las últimas en llegar"** y muestra las más nuevas (sin repetir las de arriba si alcanza), sin numerar | La sección no aparece |

Una pieza sin stock nunca aparece en "No las dejes escapar" ni en "Los más buscados", aunque esté marcada.
Las filas se acomodan solas a la cantidad: con 1 o 2 piezas, tarjetas anchas; con 3, tres columnas.

### Cómo marcar un producto

El panel hoy **no tiene etiquetas** de producto. Por eso cada marca se puede poner de tres maneras y alcanza con una:

| Marca | Como categoría (se elige en el producto) | Como característica | Como etiqueta (si un día existen) |
|---|---|---|---|
| **Pieza única (OOAK)** | `Piezas únicas` (también vale `Pieza única`, `OOAK`, `Piezas únicas OOAK`) | `Pieza única: Sí` | `pieza-unica`, `ooak` |
| **Destacada** → No las dejes escapar | `No las dejes escapar` (o `Destacados`) | `Destacado: Sí` | `destacado` |
| **Más buscada** → Los más buscados | `Los más buscados` (o `Más buscados`) | `Más buscado: Sí` | `mas-buscado` |

- **Recomendado: categorías.** Se eligen desde la ficha del producto, se ven de un vistazo en el listado y se pueden
  cargar por Excel (columna `Categorias`, varias separadas por coma).
- La característica sirve igual y también entra por Excel (columna `Caracteristicas`: `Pieza única: Sí`).
- La web compara sin mayúsculas ni acentos.
- Estas categorías de marca **no** salen como categorías de la tienda: los accesos de la página Tienda se arman con
  tipo y especie.

### Pieza única (OOAK)

Tiene que poder elegirse en cada producto desde el panel. **Hoy ya se puede** con la categoría `Piezas únicas` o la
característica `Pieza única: Sí`; no hace falta programar nada.

Qué cambia en la web cuando un producto es pieza única: badge "Pieza única", técnica tradicional por defecto, tope de
1 unidad en el carrito con el texto "1 disponible", aparece en el filtro y en el acceso "Piezas únicas" de la tienda,
y sube en el respaldo de "No las dejes escapar". Sin la marca, la pieza es "Pieza Walkiverso".

A la fecha, ninguno de los 32 productos migrados lleva la marca.

### Datos del producto que lee la web

| Característica | Valores | Para qué |
|---|---|---|
| `Tipo` | `Criatura` · `Artefacto` · `E-book` · `Curso` | En qué parte de la web aparece y el texto del botón de compra |
| `Especie` | `Duende`, `Mandrágora`, `Minidrágora`, `Pixie`… | Agrupa, filtra y arma los accesos de la tienda. **`Duende` alimenta la sección Duendes** |
| `Variedad` (opcional) | `Duende del Dinero`… | Se muestra en la tarjeta en lugar de la especie |
| `Clase` (artefactos) | `Bitácora`… | Lo mismo que la especie, para artefactos |
| `Técnica`, `Materiales`, `Número de obra`, `Historia` | texto | Ficha y certificado |

Los nombres de las características se pueden cambiar en `js/config.js` (`CAMPOS`).

## 2. Lo que la web ya toma del panel

Nombre, logo, favicon, SEO, contacto y redes, menú principal, aviso, cookies, páginas legales, productos, categorías,
carrito, checkout (pagos y envíos), cuentas de clientes y cursos. Detalle en el Kit NS (`2-webs-plataforma`).

A propósito **no** se toman: los colores (para no romper la identidad azul y blanca) y el menú de pie (el pie no lleva enlaces).

## 3. Textos de la web editables desde el panel (falta en la plataforma)

**Qué se pide:** una pantalla del panel, solo para Walkiverso, donde se puedan cambiar los textos de la web: títulos,
bajadas, botones, frases de la cinta, pasos del proceso, testimonios, preguntas frecuentes (agregar, quitar, ordenar), etc.

**Del lado de la web ya está hecho y probado.** Falta la pantalla y dónde guardarlo.

### El contrato

La web espera los textos dentro de `tienda.info()`:

```js
info.content = { texts: { 'HERO.titulo': 'Arte, Magia *y* Folklore', 'FAQ.items': [{ q: '…', a: '…' }], … } }
```

- Cada texto tiene una **clave** (`GRUPO.campo`). Solo se mandan los que el cliente cambió: lo que falte usa el valor de fábrica de `js/contenido.js`.
- Si `info.content` no existe, la web funciona igual que hoy.
- Claves desconocidas o valores con otra forma se ignoran: un dato mal cargado no rompe la web.
- **Nunca viaja HTML.** Se escribe texto con marcas simples y la web lo convierte (y escapa todo lo demás):
  `*palabra*` = cursiva de acento · `**palabra**` = negrita · renglón en blanco = párrafo nuevo · renglón que empieza con `- ` = ítem de lista.

### La lista de campos

`panel/textos-walkiverso.json` trae **todos** los campos (hoy 89, en 14 grupos), ya ordenados como aparecen en la web,
con clave, nombre legible, tipo y valor de fábrica. La pantalla del panel se puede dibujar sola a partir de ese archivo:
un bloque por grupo, un campo por texto.

Se genera desde `js/contenido.js`, no se escribe a mano. Al agregar o quitar un texto: `node .dev/esquema.mjs`.

| Tipo | Qué es | Control sugerido |
|---|---|---|
| `texto` | Una línea | Campo de texto |
| `texto-largo` | Varias líneas | Área de texto |
| `titulo` | Una línea; admite `*cursiva*` | Campo de texto con la ayuda al lado |
| `parrafos` | Párrafos, negrita, cursiva y listas | Área de texto con la ayuda al lado |
| `ruta` | Imagen, video o enlace | Campo de texto (mejor: selector de imagen) |
| `lista-texto` / `lista-ruta` | Lista de textos o de imágenes | Lista para agregar, quitar y ordenar |
| `lista` | Elementos con sus campos (preguntas, pasos, testimonios, reels) | Lista de tarjetas; con `"fija": true` no se agregan ni se quitan |

Grupos: Portada (Hero, Cinta, Las creaciones, Secciones de la tienda, Duendes, Así nacen las criaturas, Reels, Voces) ·
Walkiver · Pedile un deseo · Academia y cursos · Ficha de producto · Pie (Dudas frecuentes, Lema).

### Sugerencia para la plataforma

- Guardar un JSON por tienda (`{ clave: valor }`) y devolverlo en `info.content.texts`.
- Que la pantalla exista solo para las tiendas que tengan una lista de campos cargada, así sirve para otras webs propias.
- Botón "Volver al texto original" por campo: alcanza con borrar la clave.

### Probarlo hoy, sin plataforma

En la demostración, con la consola del navegador:

```js
sessionStorage.setItem('wk-demo-textos', JSON.stringify({ 'HERO.titulo': 'Monstruos *con* alma', 'HERO.cta': 'Entrar' }))
```

y recargar. Para volver: `sessionStorage.removeItem('wk-demo-textos')`.

## 4. Otras cosas que la plataforma todavía no resuelve

- **Imagen en "Pedile un deseo".** El formulario de contacto solo acepta texto (2.000 caracteres por campo, 64 KB en
  total). La web ya usa `tienda.archivos.subir(archivo)` si existe; hoy manda solo el nombre del archivo.
- **Etiquetas de producto.** No están en el panel ni en el importador. No son necesarias (ver sección 1).
- **Lista de deseos.** Los favoritos se guardan en el navegador de cada visitante.
- **Textos legales, mails y cupones** ya se manejan en el panel y la web no los toca.

## 5. Para pasar de la demostración a la tienda real

1. Activar pesos uruguayos (UYU) en Datos de la tienda.
2. Importar `walkiverso-productos-para-importar.csv` en Productos → Importar (32 productos, 142 fotos; quedó en el Escritorio de Nico).
3. Crear las categorías de marca que se vayan a usar (`Piezas únicas`, `No las dejes escapar`, `Los más buscados`) y sumar los productos.
4. Cargar contacto, redes, pagos, envíos y páginas legales.
5. Activar los módulos Cuentas de clientes y Cursos si corresponden.
6. Conectar la carpeta (`npm run sitio -- dev …`) y recorrer portada, tienda, ficha, checkout y pedido: esta web nunca se probó contra la plataforma.

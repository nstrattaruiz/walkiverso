// Genera panel/textos-walkiverso.json: la lista de todos los textos de la web que el panel puede ofrecer para editar,
// con su grupo, nombre, tipo y valor de fábrica. Sale de js/contenido.js, así que no se escribe a mano.
// Uso (después de agregar o quitar textos en contenido.js):  node .dev/esquema.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { esquema, GRUPOS } from '../js/datos/textos.js';

const campos = esquema();
const grupos = Object.values(GRUPOS).map((nombre) => ({ nombre, campos: campos.filter((c) => c.grupo === nombre).map(({ grupo, ...c }) => c) })).filter((g) => g.campos.length);
mkdirSync(new URL('../panel/', import.meta.url), { recursive: true });
writeFileSync(new URL('../panel/textos-walkiverso.json', import.meta.url), `${JSON.stringify({
  tienda: 'Walkiverso',
  descripcion: 'Textos de la web editables desde el panel. La web los lee de info.content.texts ({ clave: valor }); lo que falte usa el valor de fábrica.',
  tipos: {
    texto: 'Una línea de texto.',
    'texto-largo': 'Texto de varias líneas.',
    titulo: 'Una línea. *palabra* la pone en cursiva de acento.',
    parrafos: 'Varios párrafos (renglón en blanco entre ellos). **negrita**, *cursiva* y renglones que empiezan con "- " para listas.',
    ruta: 'Dirección de una imagen o video, o un enlace.',
    'lista-texto': 'Lista de textos cortos.',
    'lista-ruta': 'Lista de imágenes.',
    lista: 'Lista de elementos con sus propios campos. Con "fija": true se editan pero no se agregan ni se quitan.',
  },
  grupos,
}, null, 1)}\n`);
console.log(`${campos.length} campos en ${grupos.length} grupos`);
console.log(grupos.map((g) => `  ${g.nombre}: ${g.campos.length}`).join('\n'));

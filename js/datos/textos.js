// Textos editables desde el panel. Los textos de fábrica están en js/contenido.js; si la tienda trae textos
// propios (ver PANEL.md), reemplazan a los de fábrica antes de dibujar la web. Lo que la tienda no trae, queda como está.
//
// Cada texto tiene una clave con la forma "GRUPO.campo" ("HERO.titulo", "FAQ.items", "SECCIONES.destacadas.texto").
// Este archivo no usa nada del navegador: también lo usa .dev/esquema.mjs para armar la lista de campos del panel.
import * as CONTENIDO from '../contenido.js';

/** Grupos en el orden en que aparecen en la web: así se ordena el panel. */
export const GRUPOS = {
  HERO: 'Portada · Hero',
  CINTA: 'Portada · Cinta en movimiento',
  CREACIONES: 'Portada · Las creaciones',
  SECCIONES: 'Portada · Secciones de la tienda',
  DUENDES: 'Portada · Duendes',
  PROCESO: 'Portada · Así nacen las criaturas',
  REELS: 'Portada · Magia en movimiento (reels)',
  VOCES: 'Portada · Voces del Walkiverso',
  WALKIVER: 'Walkiver',
  DESEO: 'Pedile un deseo',
  ACADEMIA: 'Academia y cursos',
  FICHA: 'Ficha de producto',
  FAQ: 'Pie · Dudas frecuentes',
  PIE: 'Pie',
};

/** Nombres legibles de cada campo, para el panel. */
const ETIQUETAS = {
  sobre: 'Etiqueta sobre el título', titulo: 'Título', subtitulo: 'Subtítulo', texto: 'Texto', cta: 'Texto del botón', pista: 'Pista bajo el hero',
  imagenes: 'Fotos de fondo', imagen: 'Imagen', items: 'Elementos', pasos: 'Pasos', q: 'Pregunta', a: 'Respuesta', nombre: 'Nombre', pais: 'País',
  pieza: 'Pieza adquirida', comentario: 'Comentario', bio: 'Biografía (párrafos)', videos: 'Videos', url: 'Enlace', video: 'Video (archivo .mp4)',
  enlace: 'Enlace al reel', poster: 'Portada del reel', etiqueta: 'Etiqueta', lema: 'Lema', orbe: 'Texto junto al orbe', despierta: 'Texto al completar',
  quedan: 'Texto del contador (plural)', queda: 'Texto del contador (singular)', azar: 'Botón del sorteo', otraVez: 'Botón para repetir',
  eligio: 'Texto del elegido', verTodos: 'Botón "ver todos"', criaturas: 'Criaturas', artefactos: 'Artefactos', destacadas: 'No las dejes escapar',
  buscadas: 'Los más buscados', ultimas: 'Las últimas en llegar', universo: 'Dónde las criaturas cobran vida', diferencia: 'Una criatura / Un artefacto',
  tienda: 'Página de tienda', cuidadosTitulo: 'Título de cuidados', cuidados: 'Cuidados', CINTA: 'Frases',
};
/** Campos que son del código y no se ofrecen en el panel. */
const TECNICOS = new Set(['icono', 'href', 'especie', 'ebookHandle', 'ejemplo']);
const tipoDe = (clave, valor) => (/^(imagen|poster|video|url|enlace)$/.test(clave) ? 'ruta' : clave === 'titulo' ? 'titulo' : clave === 'a' ? 'parrafos' : String(valor).length > 90 ? 'texto-largo' : 'texto');

// ---------------------------------------------------------------- marcas simples ↔ HTML
// En el panel se escribe texto con dos marcas: *cursiva* (énfasis en títulos) y **negrita**; en las respuestas,
// un renglón en blanco separa párrafos y los renglones que empiezan con "- " arman una lista. Nunca se acepta HTML.
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const enLinea = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
export const aHtml = {
  titulo: (t) => enLinea(String(t).replace(/\s+/g, ' ').trim()),
  parrafos: (t) => String(t).replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const renglones = b.split('\n').map((r) => r.trim());
    return renglones.every((r) => r.startsWith('- ')) ? `<ul>${renglones.map((r) => `<li>${enLinea(r.slice(2))}</li>`).join('')}</ul>` : `<p>${enLinea(renglones.join(' '))}</p>`;
  }).join(''),
};
const deHtml = (h) => String(h).replace(/<\/p>\s*<p>/g, '\n\n').replace(/<\/(p|ul)>\s*<(p|ul)>/g, '\n\n').replace(/<li>/g, '- ').replace(/<\/li>/g, '\n').replace(/<(strong|b)>|<\/(strong|b)>/g, '**').replace(/<(em|i)>|<\/(em|i)>/g, '*')
  .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

// ---------------------------------------------------------------- recorrido del contenido
/** Lista de campos editables, con su clave, grupo, nombre, tipo y valor de fábrica (en texto con marcas). */
export function esquema() {
  const campos = [];
  const hoja = (clave, nombre, valor) => { const tipo = tipoDe(nombre, valor); return { clave, etiqueta: ETIQUETAS[nombre] ?? nombre, tipo, valor: tipo === 'titulo' || tipo === 'parrafos' ? deHtml(valor) : valor }; };
  const andar = (obj, ruta, grupo, sub) => {
    for (const [k, v] of Object.entries(obj)) {
      if (TECNICOS.has(k)) continue;
      const clave = `${ruta}.${k}`;
      if (typeof v === 'string') campos.push({ grupo, sub, ...hoja(clave, k, v) });
      else if (Array.isArray(v)) campos.push({ grupo, sub, ...lista(clave, k, v) });
      else if (v && typeof v === 'object') andar(v, clave, grupo, ETIQUETAS[k] ?? k);
    }
  };
  const lista = (clave, nombre, v) => {
    const etiqueta = ETIQUETAS[nombre] ?? nombre;
    if (v.every((x) => typeof x === 'string')) return { clave, etiqueta, tipo: /imagen/.test(nombre) ? 'lista-ruta' : 'lista-texto', valor: v };
    const modelo = Object.assign({}, ...v);   // todos los campos que aparecen en algún elemento
    const de = Object.keys(modelo).filter((k) => !TECNICOS.has(k) && typeof modelo[k] === 'string').map((k) => ({ clave: k, etiqueta: ETIQUETAS[k] ?? k, tipo: tipoDe(k, modelo[k]) }));
    // Si los elementos llevan datos del código (ícono, destino), la cantidad es fija: se editan pero no se agregan ni se quitan
    const fija = Object.keys(modelo).some((k) => TECNICOS.has(k) && k !== 'ejemplo');
    return { clave, etiqueta, tipo: 'lista', fija, campos: de, valor: v.map((x) => Object.fromEntries(de.map((c) => [c.clave, c.tipo === 'titulo' || c.tipo === 'parrafos' ? deHtml(x[c.clave] ?? '') : x[c.clave] ?? '']))) };
  };
  for (const [nombre, grupo] of Object.entries(GRUPOS)) {
    const v = CONTENIDO[nombre];
    if (Array.isArray(v)) campos.push({ grupo, sub: null, ...lista(nombre, nombre, v) });
    else if (v) andar(v, nombre, grupo, null);
  }
  return campos;
}

/**
 * Aplica los textos de la tienda sobre los de fábrica. `textos`: { "HERO.titulo": "…", "FAQ.items": [{ q, a }, …] }.
 * Solo se aceptan claves del esquema y valores con la forma esperada; lo demás se ignora (un dato mal cargado no rompe la web).
 * @returns las claves aplicadas.
 */
export function aplicarTextos(textos) {
  if (!textos || typeof textos !== 'object') return [];
  const porClave = new Map(esquema().map((c) => [c.clave, c]));
  const aplicadas = [];
  for (const [clave, valor] of Object.entries(textos)) {
    const campo = porClave.get(clave);
    if (!campo) continue;
    const partes = clave.split('.');
    const ultima = partes.pop();
    const dueno = partes.reduce((o, k) => o?.[k], CONTENIDO);
    const convertir = (tipo, v) => (aHtml[tipo] ? aHtml[tipo](v) : String(v).trim());
    if (campo.tipo === 'lista-texto' || campo.tipo === 'lista-ruta') {
      if (!Array.isArray(valor)) continue;
      const nueva = valor.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
      const destino = dueno ? dueno[ultima] : CONTENIDO[clave];   // CINTA es la lista misma
      destino.length = 0; destino.push(...nueva);
    } else if (campo.tipo === 'lista') {
      if (!Array.isArray(valor)) continue;
      const destino = dueno[ultima];
      const antes = destino.slice();
      const nueva = (campo.fija ? valor.slice(0, antes.length) : valor).filter((x) => x && typeof x === 'object').map((x, i) => ({
        ...(campo.fija ? antes[i] : {}),   // conserva lo que es del código (ícono, destino)
        ...Object.fromEntries(campo.campos.filter((c) => typeof x[c.clave] === 'string').map((c) => [c.clave, convertir(c.tipo, x[c.clave])])),
      }));
      if (campo.fija && nueva.length !== antes.length) continue;
      destino.length = 0; destino.push(...nueva);
    } else {
      if (typeof valor !== 'string' || !valor.trim()) continue;
      dueno[ultima] = convertir(campo.tipo, valor);
    }
    aplicadas.push(clave);
  }
  return aplicadas;
}

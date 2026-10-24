/* ============================================================
   idioma.js — traducciones.

   El juego está escrito en español; cada texto que se ve en pantalla
   pasa por t(), que lo cambia por su traducción:

     t('Cocina')                        // 'Kitchen' en inglés
     t('Día {n}', { n: 3 })             // 'Day 3'
     t('¡Felicidades {a la chef|al chef}!')  // también sirve con conGenero

   Las traducciones viven en js/idiomas/<código>.js como
   { 'texto en español': 'traducción' }. Si falta alguna, sale el
   español (nunca un hueco). Para sacar la lista de textos:
     node herramientas/textos.mjs

   El idioma se elige en Ajustes (se guarda en creperia.idioma). Si
   nunca se ha elegido: quien ya tenía partida sigue en español; un
   jugador nuevo, el idioma de su teléfono/PC (o inglés).
   ============================================================ */
const CLAVE = 'creperia.idioma';

export const IDIOMAS = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
  { id: 'fr', nombre: 'Français' },
  { id: 'pt', nombre: 'Português' },
  { id: 'de', nombre: 'Deutsch' },
  { id: 'ja', nombre: '日本語' },
  { id: 'ko', nombre: '한국어' },
];

function elegirIdioma() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (IDIOMAS.some((i) => i.id === guardado)) return guardado;
    if (localStorage.getItem('creperia.partida')) return 'es';
  } catch { /* sin localStorage: se decide por el navegador */ }
  for (const l of navigator.languages || [navigator.language || '']) {
    const corto = String(l).slice(0, 2).toLowerCase();
    if (IDIOMAS.some((i) => i.id === corto)) return corto;
  }
  return 'en';
}

export const idioma = elegirIdioma();

// El diccionario se carga antes de que arranque cualquier otro módulo
// (top-level await), así los datos ya nacen traducidos.
let diccionario = {};
if (idioma !== 'es') {
  try {
    diccionario = (await import(`./idiomas/${idioma}.js`)).default;
  } catch (err) {
    console.warn('No se pudo cargar el idioma', idioma, err);
  }
}

document.documentElement.lang = idioma === 'es' ? 'es-MX' : idioma;
document.documentElement.classList.add(`idioma-${idioma}`);

/** Traduce un texto en español y le pone los valores {nombre}. */
export function t(texto, valores) {
  let r = diccionario[texto] ?? texto;
  if (valores) r = r.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
  return r;
}

/** Traduce una lista de textos, tl(['Hola', 'Adiós']), o un objeto
 *  de listas, tl({ feliz: [...], triste: [...] }). */
export function tl(x) {
  if (Array.isArray(x)) return x.map((s) => t(s));
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, tl(v)]));
}

/** Traduce en su lugar los campos de texto de una lista de datos:
 *  traducirDatos(INGREDIENTES, 'nombre', 'descripcion'). También las
 *  listas de textos (['Bruja', 'Brujo']). Los "get nombre()" no se
 *  tocan: esos ya traducen solos con g(). */
export function traducirDatos(lista, ...campos) {
  for (const x of lista) {
    for (const c of campos) {
      if (!Object.getOwnPropertyDescriptor(x, c)?.writable) continue;
      if (typeof x[c] === 'string') x[c] = t(x[c]);
      else if (Array.isArray(x[c])) x[c] = x[c].map((s) => (typeof s === 'string' ? t(s) : s));
    }
  }
  return lista;
}

/** Guarda el idioma elegido y recarga el juego (la partida no se pierde). */
export function cambiarIdioma(id) {
  try { localStorage.setItem(CLAVE, id); } catch { /* nada */ }
  location.reload();
}

/** Traduce los textos fijos de index.html (los que tienen data-t). */
export function traducirPagina(raiz = document) {
  raiz.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.textContent.trim()); });
  raiz.querySelectorAll('[data-t-titulo]').forEach((el) => {
    if (el.title) el.title = t(el.title);
    const al = el.getAttribute('aria-label');
    if (al) el.setAttribute('aria-label', t(al));
  });
}

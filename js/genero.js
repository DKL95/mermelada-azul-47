/* ============================================================
   genero.js — textos que cambian según el sexo del personaje.

     g('Maestra crepera', 'Maestro crepero')
     conGenero('¡Felicidades {a la chef|al chef}!')   // {femenino|masculino}

   El sexo se elige al crear el personaje (personaje.js lo guarda).
   Mientras no haya personaje, se usa el femenino.
   ============================================================ */
const CLAVE_PERSONAJE = 'creperia.personaje';

export function sexo() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PERSONAJE))?.sexo === 'hombre' ? 'hombre' : 'mujer'; } catch { return 'mujer'; }
}

export function g(femenino, masculino) {
  return sexo() === 'hombre' ? masculino : femenino;
}

/** Cambia cada {femenino|masculino} del texto por la forma que toca. */
export function conGenero(texto) {
  return String(texto).replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_, f, m) => g(f, m));
}

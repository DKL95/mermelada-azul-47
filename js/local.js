/* ============================================================
   local.js — la decoración elegida para el local.

   Se guarda aparte de la partida (como el personaje): reiniciar
   la partida no la borra. Lo que se compra va al inventario de la
   cartera ('local.toldo:lunares'...).

   Uso:
     decoracion()                 // { toldo, colorToldo, letrero, ... }
     ponerDecoracion({ cielo: 'noche' })
     tieneDecoracion('cielo', opcion)
   Cada cambio avisa con el evento 'local:cambio'.
   ============================================================ */
import { tieneArticulo } from './cartera.js';
import { localInicial } from './data/local.js';

const CLAVE = 'creperia.local';

export const claveDecoracion = (cat, id) => `local.${cat}:${id}`;

export function decoracion() {
  try {
    return { ...localInicial(), ...JSON.parse(localStorage.getItem(CLAVE)) };
  } catch {
    return localInicial();
  }
}

export function ponerDecoracion(cambios) {
  try { localStorage.setItem(CLAVE, JSON.stringify({ ...decoracion(), ...cambios })); } catch { /* sin espacio */ }
  aplicarDecoracion();
  window.dispatchEvent(new Event('local:cambio'));
}

export function tieneDecoracion(cat, opcion) {
  return !opcion.precio || tieneArticulo(claveDecoracion(cat, opcion.id));
}

/** Lo que va por CSS: azulejos de la cocina y cielo (atributos en #app, ver escenas.css). */
export function aplicarDecoracion() {
  const d = decoracion();
  const app = document.getElementById('app');
  if (!app) return;
  app.dataset.pared = d.pared;
  app.dataset.cielo = d.cielo;
}

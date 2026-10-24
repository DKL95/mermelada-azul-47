/* ============================================================
   plataforma.js — en qué versión del juego estamos.

   El mismo código corre en tres lados:
     'web'     → navegador / GitHub Pages / iPhone (PWA)
     'android' → app de Play Store (Capacitor, ver GUIA_PLAY_STORE.md)
     'steam'   → programa de PC (Electron, carpeta steam/)

   En Steam el juego se compra una sola vez: no hay Chispitas de
   dinero real, solo se ganan jugando.

   Uso:
     import { PLATAFORMA, esSteam, esAndroid } from './plataforma.js';
   ============================================================ */

function detectar() {
  if (window.CandySteam?.esSteam) return 'steam';           // lo pone steam/preload.js
  if (window.Capacitor?.isNativePlatform?.()) return 'android';
  return 'web';
}

export const PLATAFORMA = detectar();
export const esSteam = PLATAFORMA === 'steam';
export const esAndroid = PLATAFORMA === 'android';

// Para que el CSS pueda adaptar cosas por versión (html.plataforma-steam …)
document.documentElement.classList.add(`plataforma-${PLATAFORMA}`);

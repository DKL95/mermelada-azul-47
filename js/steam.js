/* ============================================================
   steam.js — en la versión de PC, le avisa a Steam de cada logro
   ganado para que salga en el perfil del jugador.

   No toca cómo se ganan: solo mira la lista de logros de la partida
   (también los que ya tenía al abrir) y manda los nuevos a
   steam/main.js por window.CandySteam.logro().

   El nombre en Steam es LOGRO_ + el id en mayúsculas (primera →
   LOGRO_PRIMERA). Así hay que darlos de alta en Steamworks; la
   lista la saca steam/herramientas/logros.js.
   ============================================================ */
import { estado, suscribir } from './state.js';

export const nombreSteam = (id) => 'LOGRO_' + id.toUpperCase();

const avisados = new Set();

function avisar(e) {
  for (const id of e.logros) {
    if (avisados.has(id)) continue;
    avisados.add(id);
    window.CandySteam.logro(nombreSteam(id));
  }
}

export function iniciarSteam() {
  if (!window.CandySteam?.logro) return;
  suscribir(avisar);
  avisar(estado());
}

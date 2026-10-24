/* ============================================================
   steam/preload.js — lo que la versión de PC le avisa al juego.

   Pone window.CandySteam; js/plataforma.js lo usa para saber que
   está corriendo en Steam.
   ============================================================ */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('CandySteam', {
  esSteam: true,
});

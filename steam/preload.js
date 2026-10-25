/* ============================================================
   steam/preload.js — lo que la versión de PC le avisa al juego.

   Pone window.CandySteam; js/plataforma.js lo usa para saber que
   está corriendo en Steam, y js/steam.js para mandar los logros.
   ============================================================ */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('CandySteam', {
  esSteam: true,
  logro: (nombre) => ipcRenderer.send('steam:logro', String(nombre)),
});

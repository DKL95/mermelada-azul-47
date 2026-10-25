/* ============================================================
   steam/main.js — la versión de PC (Steam) con Electron.

   Abre el juego en una ventana. Los archivos del juego se sirven con
   un protocolo propio (app://juego/) en vez de file://, para que los
   módulos de JavaScript funcionen y la partida (localStorage) quede
   guardada siempre en el mismo "sitio".

   Mientras se desarrolla (npm start) usa la carpeta del juego de
   arriba (..); ya empaquetado, la copia que va dentro del programa
   (resources/juego).
   ============================================================ */
const { app, BrowserWindow, protocol, net, shell, Menu, ipcMain } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const RAIZ = app.isPackaged
  ? path.join(process.resourcesPath, 'juego')
  : path.join(__dirname, '..');

// ===== Steam =====
// 480 es "Spacewar", la app de prueba de Valve: sirve para probar los logros
// mientras Steam no te da el tuyo. Cuando lo tengas, cámbialo aquí
// (ver GUIA_STEAM.md).
const STEAM_APP_ID = 480;
const ES_PRUEBA = STEAM_APP_ID === 480;

let steamworks = null, steam = null;
try {
  steamworks = require('steamworks.js');
} catch (err) {
  console.warn('steamworks.js no se pudo cargar:', err.message);
}

// Ya publicado: si alguien abre el .exe sin Steam, Steam lo vuelve a abrir
// (así cuenta las horas y funcionan los logros).
if (steamworks && app.isPackaged && !ES_PRUEBA) {
  try {
    if (steamworks.restartAppIfNecessary(STEAM_APP_ID)) app.exit(0);
  } catch (err) {
    console.warn('Steam no respondió:', err.message);
  }
}

function iniciarSteam() {
  if (!steamworks) return;
  try {
    steam = steamworks.init(STEAM_APP_ID);
  } catch (err) {
    // Sin Steam abierto el juego funciona igual, solo sin logros
    console.warn('Steam no está abierto: el juego sigue sin logros.', err.message);
  }
}

// El juego avisa de cada logro ganado (js/steam.js → preload.js)
ipcMain.on('steam:logro', (_ev, nombre) => {
  if (!steam || typeof nombre !== 'string' || !/^LOGRO_[A-Z0-9_]{1,60}$/.test(nombre)) return;
  try {
    if (steam.achievement.isActivated(nombre)) return;
    if (steam.achievement.activate(nombre)) steam.stats.store();
  } catch (err) {
    console.warn('No se pudo dar el logro', nombre, err.message);
  }
});

// Antes de que arranque Electron: app:// se porta como un sitio normal (https)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function servirJuego() {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const archivo = path.normalize(path.join(RAIZ, decodeURIComponent(pathname)));
    // Nada fuera de la carpeta del juego
    if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) {
      return new Response('No encontrado', { status: 404 });
    }
    const ruta = pathname.endsWith('/') ? path.join(archivo, 'index.html') : archivo;
    return net.fetch(pathToFileURL(ruta).toString());
  });
}

// La pantalla está pensada para verse como de 1200×720: en ventanas más
// grandes todo crece parejo (como en un juego de consola) y en más chicas
// se encoge un poco, en vez de quedar diminuto o encimado.
const BASE = { ancho: 1200, alto: 720 };
function ajustarZoom(ventana) {
  const [ancho, alto] = ventana.getContentSize();
  const zoom = Math.min(ancho / BASE.ancho, alto / BASE.alto);
  ventana.webContents.setZoomFactor(Math.min(3, Math.max(0.75, zoom)));
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#1a1020',
    title: 'Creepy Crepas',
    icon: path.join(RAIZ, 'assets', 'icono-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Los enlaces externos (política de privacidad, etc.) se abren en el navegador
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (ev, url) => {
    if (!url.startsWith('app://')) { ev.preventDefault(); if (url.startsWith('https://')) shell.openExternal(url); }
  });

  // F11 = pantalla completa
  ventana.webContents.on('before-input-event', (ev, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      ventana.setFullScreen(!ventana.isFullScreen());
      ev.preventDefault();
    }
  });

  ventana.on('resize', () => ajustarZoom(ventana));
  ventana.webContents.on('did-finish-load', () => {
    ajustarZoom(ventana);
    ventana.webContents.setVisualZoomLevelLimits(1, 1); // sin zoom con dos dedos en el touchpad
  });

  ventana.loadURL('app://juego/index.html');
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  iniciarSteam();
  servirJuego();
  crearVentana();
});

app.on('window-all-closed', () => app.quit());

// La capa de Steam (Mayús+Tab) encima del juego
try {
  steamworks?.electronEnableSteamOverlay();
} catch (err) {
  console.warn('Sin capa de Steam:', err.message);
}

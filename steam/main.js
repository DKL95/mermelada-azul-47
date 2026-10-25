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
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const RAIZ = app.isPackaged
  ? path.join(process.resourcesPath, 'juego')
  : path.join(__dirname, '..');

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
  servirJuego();
  crearVentana();
});

app.on('window-all-closed', () => app.quit());

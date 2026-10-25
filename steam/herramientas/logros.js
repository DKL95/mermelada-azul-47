/* ============================================================
   steam/herramientas/logros.js — arma lo que Steamworks pide para
   dar de alta los logros (ver GUIA_STEAM.md, paso 4).

   Uso (dentro de la carpeta steam/):
     npm run logros

   Crea steam/logros/:
     logros.csv   nombre API, y nombre + descripción en cada idioma
     iconos/      LOGRO_X_ACHIEVED.png (color) y LOGRO_X_UNACHIEVED.png
                  (gris), 256×256: Steam los acomoda solos por el nombre

   Lee los logros de js/data/logros.js como texto (sin cargar el
   juego) y los traduce con los diccionarios de js/idiomas/.
   El nombre API es el mismo que usa js/steam.js: LOGRO_ + id en
   mayúsculas.
   ============================================================ */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const JUEGO = path.join(__dirname, '..', '..');
const SALIDA = path.join(__dirname, '..', 'logros');
const leer = (archivo) => fs.readFileSync(path.join(JUEGO, archivo), 'utf8');

// Idiomas del juego → nombre del idioma en Steamworks
const IDIOMAS = [
  ['es', 'latam'], ['en', 'english'], ['fr', 'french'], ['pt', 'brazilian'],
  ['de', 'german'], ['ja', 'japanese'], ['ko', 'koreana'],
];

/** Cuántas cosas hay en una lista de datos (ej. VIPS) contando sus "{ id:". */
function cuantos(archivo, lista) {
  const s = leer(archivo);
  const desde = s.indexOf(`export const ${lista} = [`);
  const hasta = s.indexOf('\n];', desde);
  return (s.slice(desde, hasta).match(/^\s*\{ id: '/gm) || []).length;
}

function logrosDelJuego() {
  const cuentas = { VIPS: cuantos('js/data/clientes.js', 'VIPS'), COMBOS: cuantos('js/data/ingredientes.js', 'COMBOS') };
  const TEXTO = "'((?:[^'\\\\]|\\\\.)*)'";
  const patron = new RegExp(
    `\\{ id: ${TEXTO}, emoji: ${TEXTO}, ` +
    `(?:nombre: ${TEXTO}|get nombre\\(\\) \\{ return g\\(${TEXTO}, ${TEXTO}\\); \\}), ` +
    `descripcion: (?:${TEXTO}|t\\(${TEXTO}, \\{ n: (\\w+)\\.length \\}\\))`, 'g');
  const lista = [];
  for (const m of leer('js/data/logros.js').matchAll(patron)) {
    const [, id, emoji, nombre, fem, masc, desc, descN, cuenta] = m;
    lista.push({
      id, emoji,
      nombres: nombre !== undefined ? [nombre] : [fem, masc],
      descripcion: desc ?? descN,
      vars: cuenta ? { n: cuentas[cuenta] } : {},
    });
  }
  return lista;
}

function traducir(dic, texto, vars) {
  const base = dic ? dic[texto] ?? texto : texto;
  return base.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;

/** Dibuja el ícono en una ventana escondida y regresa los dos PNG. */
async function dibujarIconos(win, emoji) {
  const datos = await win.webContents.executeJavaScript(`(() => {
    const dibujar = (gris) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      if (gris) x.filter = 'grayscale(1) brightness(0.8)';
      const fondo = x.createLinearGradient(0, 0, 256, 256);
      fondo.addColorStop(0, '#FFB15C');
      fondo.addColorStop(1, '#FF7A1A');
      x.fillStyle = fondo;
      x.beginPath(); x.roundRect(0, 0, 256, 256, 48); x.fill();
      x.fillStyle = '#2EC4B6';
      x.beginPath(); x.arc(128, 128, 98, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#FFF8EE';
      x.beginPath(); x.arc(128, 128, 86, 0, Math.PI * 2); x.fill();
      x.font = '112px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(${JSON.stringify(emoji)}, 128, 136);
      return c.toDataURL('image/png').split(',')[1];
    };
    return [dibujar(false), dibujar(true)];
  })()`);
  return datos.map((b64) => Buffer.from(b64, 'base64'));
}

app.whenReady().then(async () => {
  const logros = logrosDelJuego();
  const diccionarios = {};
  for (const [id] of IDIOMAS) {
    diccionarios[id] = id === 'es' ? null
      : (await import(pathToFileURL(path.join(JUEGO, 'js', 'idiomas', `${id}.js`)).href)).default;
  }

  // Tabla con los textos
  const filas = [['api', 'emoji', ...IDIOMAS.flatMap(([, steam]) => [`nombre_${steam}`, `descripcion_${steam}`])]];
  for (const l of logros) {
    const fila = ['LOGRO_' + l.id.toUpperCase(), l.emoji];
    for (const [id] of IDIOMAS) {
      // Los que cambian con el género van con las dos formas: "Maestra / Maestro crepero"
      const nombres = [...new Set(l.nombres.map((n) => traducir(diccionarios[id], n, {})))];
      fila.push(nombres.join(' / '), traducir(diccionarios[id], l.descripcion, l.vars));
    }
    filas.push(fila);
  }
  fs.mkdirSync(path.join(SALIDA, 'iconos'), { recursive: true });
  // Con BOM para que Excel lo abra bien con acentos
  fs.writeFileSync(path.join(SALIDA, 'logros.csv'), '﻿' + filas.map((f) => f.map(csv).join(',')).join('\r\n') + '\r\n');

  // Íconos
  const win = new BrowserWindow({ show: false, width: 300, height: 300 });
  await win.loadURL('data:text/html,<meta charset="utf-8"><body></body>');
  for (const l of logros) {
    const [color, gris] = await dibujarIconos(win, l.emoji);
    const api = 'LOGRO_' + l.id.toUpperCase();
    fs.writeFileSync(path.join(SALIDA, 'iconos', `${api}_ACHIEVED.png`), color);
    fs.writeFileSync(path.join(SALIDA, 'iconos', `${api}_UNACHIEVED.png`), gris);
  }

  const total = (leer('js/data/logros.js').match(/^\s*\{ id: '/gm) || []).length;
  console.log(`${logros.length} logros (de ${total} en el juego) → ${SALIDA}`);
  if (logros.length !== total) console.log('⚠ Algunos logros no se pudieron leer: revisa el patrón en herramientas/logros.js');
  app.quit();
});

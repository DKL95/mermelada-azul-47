/* ============================================================
   ranking.js — tabla de puntuaciones en línea (Supabase).

   Al terminar cada día se sube la ganancia a una tabla compartida
   (y cada partida del modo sin fin, a la suya), junto con el
   personaje para mostrar su carita. Si no hay internet, queda en
   una fila de espera y se manda después (al abrir el juego o al
   volver la conexión). Si la base todavía no tiene la columna del
   personaje (falta correr supabase-v2.sql), se manda sin él.

   El jugador (id al azar + nombre) se guarda aparte de la partida:
   si reinicias la partida sigues siendo el mismo jugador.

   Uso:
     import { abrirRanking, tieneNombre, registrarSinFin } from './ranking.js';
     abrirRanking()                                   // ventana con la tabla
     registrarSinFin({ puntos, crepas, segundos })    // al terminar una partida sin fin
   ============================================================ */
import { CONFIG } from './config.js';
import { estado } from './state.js';
import { on } from './turno.js';
import { mostrarModal, aviso, dinero } from './ui.js';
import { sonidos } from './audio.js';

const CLAVE_JUGADOR = 'creperia.jugador';
const CLAVE_PENDIENTES = 'creperia.pendientes';
const MAX_NOMBRE = 20;
const MAX_PENDIENTES = 60;  // días o partidas guardados sin conexión (los más viejos se tiran)
const CLAVE_PERSONAJE = 'creperia.personaje';
// Lo que se manda del personaje (personaje.js lo revisa al dibujarlo)
const CAMPOS_PERSONAJE = ['sexo', 'piel', 'estatura', 'complexion', 'peinado', 'pelo', 'vello', 'arriba', 'colorArriba',
  'colorArriba2', 'estampado', 'abajo', 'colorAbajo', 'calzado', 'colorCalzado', 'acc', 'colorAcc'];
const ESPERA_MS = 8000;     // si la red no responde en este tiempo, se reintenta luego

const activa = () => Boolean(CONFIG.tablaEnLinea?.url && CONFIG.tablaEnLinea?.clave);

// ---------- Guardado local (jugador y fila de espera) ----------

function leer(clave, porDefecto) {
  try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
}
function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin espacio o modo privado */ }
}

function jugador() {
  let j = leer(CLAVE_JUGADOR, null);
  if (!j?.id) {
    j = { id: crypto.randomUUID(), nombre: '' };
    escribir(CLAVE_JUGADOR, j);
  }
  return j;
}

/** El nombre con el que aparece en la tabla ('' si no tiene). */
export function nombreJugador() {
  return jugador().nombre;
}

export function tieneNombre() {
  return jugador().nombre.length > 0;
}

export function ponerNombre(nombre) {
  escribir(CLAVE_JUGADOR, { ...jugador(), nombre });
}

/** Quita espacios de más y caracteres invisibles; máximo 20 letras. */
export function limpiarNombre(texto) {
  return Array.from(texto.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202E]/g, '').replace(/\s+/g, ' ').trim())
    .slice(0, MAX_NOMBRE).join('');
}

/** Los nombres vienen de otros teléfonos: nunca se meten como HTML. */
function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Red ----------

async function pedir(ruta, opciones = {}) {
  const { url, clave } = CONFIG.tablaEnLinea;
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const resp = await fetch(`${url}/rest/v1/${ruta}`, {
      ...opciones,
      signal: control.signal,
      headers: { apikey: clave, 'Content-Type': 'application/json', ...opciones.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
    return resp.status === 204 || resp.status === 201 ? null : resp.json();
  } finally {
    clearTimeout(reloj);
  }
}

// ---------- Subir días y partidas ----------

/** El personaje guardado, solo con los campos que van a la tabla (o null). */
function personajeParaTabla() {
  const p = leer(CLAVE_PERSONAJE, null);
  if (!p) return null;
  return Object.fromEntries(CAMPOS_PERSONAJE.filter((k) => k in p).map((k) => [k, p[k]]));
}

function formar(fila) {
  const pendientes = leer(CLAVE_PENDIENTES, []);
  pendientes.push({ envio: crypto.randomUUID(), ...fila }); // envio: si se reintenta, el servidor lo ignora
  escribir(CLAVE_PENDIENTES, pendientes.slice(-MAX_PENDIENTES));
  enviarPendientes();
}

/** Al terminar una partida del modo sin fin. */
export function registrarSinFin({ puntos, crepas, segundos }) {
  if (!activa()) return;
  const limitar = (v, max) => Math.min(Math.max(Math.round(v) || 0, 0), max);
  formar({ tabla: 'sinfin', puntos: limitar(puntos, 1000000), crepas: limitar(crepas, 5000), segundos: limitar(segundos, 86400) });
}

/** Al terminar el día: lo formamos en la fila y tratamos de mandarlo. */
function registrarDia() {
  if (!activa()) return;
  const e = estado();
  const h = e.hoy;
  formar({
    tabla: 'puntuaciones',
    dia: Math.min(Math.max(e.dia, 1), 10000),
    ganado: Math.min(Math.max(Math.round(h.ganado - h.insumos), 0), 100000),
    vendidas: Math.min(Math.max(h.vendidas, 0), 500),
    reputacion: Math.round(Math.min(Math.max(e.reputacion, 0), 5) * 10) / 10,
  });
}

let enviando = false;
let conPersonaje = true; // se apaga si la base todavía no tiene la columna

/** Manda todo lo que esté en la fila. Necesita que el jugador ya tenga nombre. */
async function enviarPendientes() {
  if (!activa() || enviando || !navigator.onLine) return;
  const j = jugador();
  const pendientes = leer(CLAVE_PENDIENTES, []);
  if (!j.nombre || !pendientes.length) return;

  enviando = true;
  const personaje = personajeParaTabla();
  const enviados = new Set();
  // Cada tabla por separado (las filas viejas, de antes del modo sin fin, no traen tabla)
  const porTabla = {};
  for (const p of pendientes) (porTabla[p.tabla || 'puntuaciones'] ||= []).push(p);
  for (const [tabla, filas] of Object.entries(porTabla)) {
    const cuerpo = (conFoto) => JSON.stringify(filas.map(({ tabla: _, ...p }) => ({
      ...p, jugador_id: j.id, nombre: j.nombre, ...(conFoto && personaje ? { personaje } : {}),
    })));
    const mandar = (conFoto) => pedir(`${tabla}?on_conflict=envio`, {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: cuerpo(conFoto),
    });
    try {
      try {
        await mandar(conPersonaje);
      } catch (err) {
        if (!conPersonaje || !/personaje/i.test(err.message)) throw err;
        conPersonaje = false; // falta correr supabase-v2.sql: va sin la foto
        await mandar(false);
      }
      filas.forEach((p) => enviados.add(p.envio));
    } catch (err) {
      console.warn(`No se pudo subir a la tabla en línea (${tabla}); se reintenta después.`, err);
    }
  }
  // Solo se quitan los que se mandaron (pudo llegar otro día mientras tanto)
  if (enviados.size) escribir(CLAVE_PENDIENTES, leer(CLAVE_PENDIENTES, []).filter((p) => !enviados.has(p.envio)));
  enviando = false;
}

// ---------- Ventana de la tabla ----------

/** Pide el nombre. Devuelve true si quedó guardado. */
async function pedirNombre() {
  const cont = document.createElement('div');
  cont.innerHTML = `
    <p style="text-align:center">¿Con qué nombre quieres aparecer en la tabla?</p>
    <input class="campo-nombre" type="text" maxlength="${MAX_NOMBRE}" autocomplete="nickname"
      autocapitalize="words" enterkeyhint="done" placeholder="Tu nombre" aria-label="Tu nombre">
    <small class="ajuste-nota" style="text-align:center;margin-top:8px">Lo ve cualquiera que tenga el juego.</small>`;
  const campo = cont.querySelector('input');
  campo.value = jugador().nombre;

  const promesa = mostrarModal({
    titulo: '🏆 Tu nombre',
    contenido: cont,
    botones: [
      { texto: 'Cancelar', valor: null },
      { texto: 'Guardar', clase: 'btn-primario', valor: 'ok' },
    ],
  });
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') cont.closest('.modal').querySelector('.btn-primario').click();
  });
  setTimeout(() => campo.focus(), 50);

  const r = await promesa;
  const nombre = limpiarNombre(campo.value);
  if (r !== 'ok' || !nombre) return false;
  ponerNombre(nombre);
  enviarPendientes();
  return true;
}

let vista = 'mejor_dia'; // pestaña elegida: 'mejor_dia' | 'total' | 'sinfin'

// Cada pestaña: de qué vista de la base sale, por qué se ordena y cómo se muestra
const VISTAS = {
  mejor_dia: { tabla: 'tabla_jugadores', columnas: 'jugador_id,nombre,mejor_dia,total,dias', valor: (f) => dinero(f.mejor_dia),
    orden: 'mejor_dia', sub: (f) => `${f.dias} ${f.dias === 1 ? 'día' : 'días'}`, vacio: '¡Termina un día para estrenar la tabla! 🥞' },
  total: { tabla: 'tabla_jugadores', columnas: 'jugador_id,nombre,mejor_dia,total,dias', valor: (f) => dinero(f.total),
    orden: 'total', sub: (f) => `${f.dias} ${f.dias === 1 ? 'día' : 'días'}`, vacio: '¡Termina un día para estrenar la tabla! 🥞' },
  sinfin: { tabla: 'tabla_sinfin', columnas: 'jugador_id,nombre,mejor,crepas,partidas', valor: (f) => `${f.mejor.toLocaleString('es-MX')} pts`,
    orden: 'mejor', sub: (f) => `${f.crepas} crepas · ${f.partidas} ${f.partidas === 1 ? 'partida' : 'partidas'}`, vacio: '¡Juega el modo sin fin para estrenar esta tabla! ♾️' },
};

/** Carita del personaje (o un círculo con la inicial si no tiene). */
function carita(f, dibujar) {
  if (f.personaje && dibujar) {
    const svg = dibujar(f.personaje);
    if (svg) return `<span class="ranking-cara">${svg}</span>`;
  }
  return `<span class="ranking-cara sin-cara">${escapar(Array.from(f.nombre)[0] || '?')}</span>`;
}

function filasHTML(filas, miId, v, dibujar) {
  if (!filas.length) return `<p class="ranking-vacio">Todavía no hay nadie. ${v.vacio}</p>`;
  const medallas = ['🥇', '🥈', '🥉'];
  return `<ol class="ranking-lista">${filas.map((f, i) => `
    <li class="${f.jugador_id === miId ? 'yo' : ''}">
      <span class="ranking-pos">${medallas[i] ?? i + 1}</span>
      ${carita(f, dibujar)}
      <span class="ranking-nombre">${escapar(f.nombre)}<small>${v.sub(f)}</small></span>
      <b>${v.valor(f)}</b>
    </li>`).join('')}</ol>`;
}

const cache = {}; // filas ya leídas de cada vista de la base (mientras la ventana está abierta)

/** Lee una vista de la base; si todavía no tiene la columna del personaje, la lee sin ella. */
async function leerTabla(v) {
  const consulta = (cols) => pedir(`${v.tabla}?select=${cols}&order=${v.orden}.desc&limit=200`);
  try {
    return await consulta(`${v.columnas},personaje`);
  } catch (err) {
    if (!/personaje/i.test(err.message)) throw err;
    return consulta(v.columnas);
  }
}

export async function abrirRanking() {
  if (!activa()) { aviso('La tabla en línea no está configurada'); return; }
  if (!tieneNombre() && !(await pedirNombre())) return;
  enviarPendientes();

  // El dibujo de las caritas (revisa que el personaje que llega de otro teléfono sea válido)
  const { caritaDesdeTabla } = await import('./personaje.js');
  const cont = document.createElement('div');
  cont.innerHTML = `
    <div class="segmentado" id="rk-vista">
      <button data-valor="mejor_dia">Mejor día</button>
      <button data-valor="total">Acumulado</button>
      <button data-valor="sinfin">♾️ Sin fin</button>
    </div>
    <div id="rk-cuerpo" class="ranking-cuerpo"><p class="ranking-vacio">Cargando… ⏳</p></div>
    <p class="ranking-pie">Juegas como <b>${escapar(jugador().nombre)}</b> ·
      <button class="btn-enlace" id="rk-nombre">cambiar nombre</button></p>`;
  const cuerpo = cont.querySelector('#rk-cuerpo');
  // Los días subidos antes de guardar el personaje no traen carita: se toma la
  // de la otra tabla, y la tuya, de este teléfono
  const personajeDe = (id) => (id === jugador().id && personajeParaTabla())
    || Object.values(cache).flat().find((f) => f.jugador_id === id && f.personaje)?.personaje || null;

  const pintar = async () => {
    cont.querySelectorAll('#rk-vista button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.valor === vista));
    const v = VISTAS[vista];
    const pedida = vista;
    if (!cache[v.tabla]) {
      cuerpo.innerHTML = '<p class="ranking-vacio">Cargando… ⏳</p>';
      try {
        cache[v.tabla] = await leerTabla(v);
      } catch (err) {
        console.warn('No se pudo leer la tabla en línea.', err);
        if (vista === pedida) cuerpo.innerHTML = '<p class="ranking-vacio">No se pudo cargar la tabla. Revisa tu internet e inténtalo otra vez. 📶</p>';
        return;
      }
    }
    if (vista !== pedida) return; // cambió de pestaña mientras cargaba
    const filas = [...cache[v.tabla]].sort((a, b) => b[v.orden] - a[v.orden]).slice(0, 50)
      .map((f) => (f.personaje ? f : { ...f, personaje: personajeDe(f.jugador_id) }));
    cuerpo.innerHTML = filasHTML(filas, jugador().id, v, caritaDesdeTabla);
    // Si a alguien le falta la carita, se busca en la otra tabla (y se vuelve a pintar)
    const otra = Object.values(VISTAS).find((o) => o.tabla !== v.tabla);
    if (filas.some((f) => !f.personaje) && !cache[otra.tabla]) {
      try { cache[otra.tabla] = await leerTabla(otra); } catch { return; }
      if (vista === pedida) pintar();
    }
  };
  cont.querySelectorAll('#rk-vista button').forEach((b) => b.addEventListener('click', () => {
    sonidos.click();
    vista = b.dataset.valor;
    pintar();
  }));
  cont.querySelector('#rk-nombre').addEventListener('click', async () => {
    sonidos.click();
    await pedirNombre();
    abrirRanking();
  });
  // Cada vez que se abre, datos frescos
  for (const k of Object.keys(cache)) delete cache[k];
  mostrarModal({ titulo: '🏆 Tabla en línea', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
  pintar();
}

// ---------- Arranque ----------

on('finDia', registrarDia);
window.addEventListener('online', enviarPendientes);
enviarPendientes();

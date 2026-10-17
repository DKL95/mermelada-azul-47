/* ============================================================
   ranking.js — tabla de puntuaciones en línea (Supabase).

   Al terminar cada día se sube la ganancia a una tabla compartida.
   Si no hay internet, el día queda en una fila de espera y se
   manda después (al abrir el juego o al volver la conexión).

   El jugador (id al azar + nombre) se guarda aparte de la partida:
   si reinicias la partida sigues siendo el mismo jugador.

   Uso:
     import { abrirRanking, tieneNombre } from './ranking.js';
     abrirRanking()   // ventana con la tabla
   ============================================================ */
import { CONFIG } from './config.js';
import { estado } from './state.js';
import { on } from './turno.js';
import { mostrarModal, aviso, dinero } from './ui.js';
import { sonidos } from './audio.js';

const CLAVE_JUGADOR = 'creperia.jugador';
const CLAVE_PENDIENTES = 'creperia.pendientes';
const MAX_NOMBRE = 20;
const MAX_PENDIENTES = 60;  // días guardados sin conexión (los más viejos se tiran)
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

export function tieneNombre() {
  return jugador().nombre.length > 0;
}

function ponerNombre(nombre) {
  escribir(CLAVE_JUGADOR, { ...jugador(), nombre });
}

/** Quita espacios de más y caracteres invisibles; máximo 20 letras. */
function limpiarNombre(texto) {
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

// ---------- Subir días ----------

/** Al terminar el día: lo formamos en la fila y tratamos de mandarlo. */
function registrarDia() {
  if (!activa()) return;
  const e = estado();
  const h = e.hoy;
  const pendientes = leer(CLAVE_PENDIENTES, []);
  pendientes.push({
    envio: crypto.randomUUID(),  // si se reintenta, el servidor lo ignora
    dia: Math.min(Math.max(e.dia, 1), 10000),
    ganado: Math.min(Math.max(Math.round(h.ganado - h.insumos), 0), 100000),
    vendidas: Math.min(Math.max(h.vendidas, 0), 500),
    reputacion: Math.round(Math.min(Math.max(e.reputacion, 0), 5) * 10) / 10,
  });
  escribir(CLAVE_PENDIENTES, pendientes.slice(-MAX_PENDIENTES));
  enviarPendientes();
}

let enviando = false;

/** Manda todo lo que esté en la fila. Necesita que el jugador ya tenga nombre. */
async function enviarPendientes() {
  if (!activa() || enviando || !navigator.onLine) return;
  const j = jugador();
  const pendientes = leer(CLAVE_PENDIENTES, []);
  if (!j.nombre || !pendientes.length) return;

  enviando = true;
  try {
    await pedir('puntuaciones?on_conflict=envio', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(pendientes.map((p) => ({ ...p, jugador_id: j.id, nombre: j.nombre }))),
    });
    // Solo se quitan los que se mandaron (pudo llegar otro día mientras tanto)
    const enviados = new Set(pendientes.map((p) => p.envio));
    escribir(CLAVE_PENDIENTES, leer(CLAVE_PENDIENTES, []).filter((p) => !enviados.has(p.envio)));
  } catch (err) {
    console.warn('No se pudo subir a la tabla en línea; se reintenta después.', err);
  } finally {
    enviando = false;
  }
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

let vista = 'mejor_dia'; // pestaña elegida: 'mejor_dia' | 'total'

function filasHTML(filas, miId) {
  if (!filas.length) return '<p class="ranking-vacio">Todavía no hay nadie. ¡Termina un día para estrenar la tabla! 🥞</p>';
  const medallas = ['🥇', '🥈', '🥉'];
  return `<ol class="ranking-lista">${filas.map((f, i) => `
    <li class="${f.jugador_id === miId ? 'yo' : ''}">
      <span class="ranking-pos">${medallas[i] ?? i + 1}</span>
      <span class="ranking-nombre">${escapar(f.nombre)}<small>${f.dias} ${f.dias === 1 ? 'día' : 'días'}</small></span>
      <b>${dinero(f[vista])}</b>
    </li>`).join('')}</ol>`;
}

export async function abrirRanking() {
  if (!activa()) { aviso('La tabla en línea no está configurada'); return; }
  if (!tieneNombre() && !(await pedirNombre())) return;
  enviarPendientes();

  const cont = document.createElement('div');
  cont.innerHTML = `
    <div class="segmentado" id="rk-vista">
      <button data-valor="mejor_dia">Mejor día</button>
      <button data-valor="total">Acumulado</button>
    </div>
    <div id="rk-cuerpo" class="ranking-cuerpo"><p class="ranking-vacio">Cargando… ⏳</p></div>
    <p class="ranking-pie">Juegas como <b>${escapar(jugador().nombre)}</b> ·
      <button class="btn-enlace" id="rk-nombre">cambiar nombre</button></p>`;
  const cuerpo = cont.querySelector('#rk-cuerpo');
  let filas = null;

  const pintar = () => {
    cont.querySelectorAll('#rk-vista button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.valor === vista));
    if (filas) cuerpo.innerHTML = filasHTML([...filas].sort((a, b) => b[vista] - a[vista]).slice(0, 50), jugador().id);
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
  pintar();

  mostrarModal({ titulo: '🏆 Tabla en línea', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });

  try {
    // La vista ya trae una fila por jugador; aquí solo se ordena
    filas = await pedir('tabla_jugadores?select=jugador_id,nombre,mejor_dia,total,dias&order=total.desc&limit=200');
    pintar();
  } catch (err) {
    console.warn('No se pudo leer la tabla en línea.', err);
    cuerpo.innerHTML = '<p class="ranking-vacio">No se pudo cargar la tabla. Revisa tu internet e inténtalo otra vez. 📶</p>';
  }
}

// ---------- Arranque ----------

on('finDia', registrarDia);
window.addEventListener('online', enviarPendientes);
enviarPendientes();

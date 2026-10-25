/* ============================================================
   ranking.js — tabla de puntuaciones en línea (Supabase).

   Al terminar cada día se sube la ganancia a una tabla compartida
   (y cada partida del modo sin fin, a la suya), junto con el
   personaje para mostrar su carita. Si no hay internet, queda en
   una fila de espera y se manda después (al abrir el juego o al
   volver la conexión). Si la base todavía no tiene la columna del
   personaje (falta correr supabase-v2.sql), se manda sin él.
   Además, al abrir el juego (y cada vez que cambia) el personaje se
   sube a la tabla de caritas, para salir con su carita sin esperar
   a terminar un día (supabase-v3.sql).
   Y cuando cambian sus números (dinero, logros…), se suben a la tabla
   de perfiles: al tocar a alguien en la tabla se abre su mini perfil
   (supabase-v4.sql).

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
import { t } from './idioma.js';
import { LOGROS } from './data/logros.js';

const CLAVE_JUGADOR = 'creperia.jugador';
const CLAVE_PENDIENTES = 'creperia.pendientes';
const MAX_NOMBRE = 20;
const MAX_PENDIENTES = 60;  // días o partidas guardados sin conexión (los más viejos se tiran)
const CLAVE_PERSONAJE = 'creperia.personaje';
const CLAVE_CARA = 'creperia.caraEnviada'; // el último personaje que se subió (para no repetirlo)
const CLAVE_PERFIL = 'creperia.perfilEnviado'; // los últimos números del perfil que se subieron
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
  if (!j.nombre || !pendientes.length) { enviarCara(); enviarPerfil(); return; }

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
  enviarCara();
  enviarPerfil();
}

let mandandoCara = false;

/** Sube el personaje a la tabla de caritas si cambió desde la última vez. */
async function enviarCara() {
  if (!activa() || mandandoCara || !navigator.onLine) return;
  const j = jugador();
  const personaje = personajeParaTabla();
  if (!j.nombre || !personaje) return;
  const firma = JSON.stringify([j.id, personaje]);
  if (leer(CLAVE_CARA, '') === firma) return;
  mandandoCara = true;
  try {
    await pedir('caras', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ jugador_id: j.id, personaje }),
    });
    escribir(CLAVE_CARA, firma);
  } catch (err) {
    console.warn('No se pudo subir el personaje; se reintenta después.', err);
  }
  mandandoCara = false;
}

/** Los números del mini perfil, de la partida de este teléfono. */
function perfilParaTabla() {
  const e = estado();
  const limitar = (v, min, max) => Math.min(Math.max(Math.round(v) || 0, min), max);
  return {
    dinero: limitar(e.dinero, -1000000000, 1000000000),
    dinero_total: limitar(e.stats.dineroTotal, 0, 2000000000),
    logros: limitar(e.logros.length, 0, 1000),
    dia: limitar(e.dia, 1, 100000),
    vendidas: limitar(e.records.crepasVendidas, 0, 10000000),
  };
}

let mandandoPerfil = false;
let conPerfiles = true; // se apaga si la base todavía no tiene la tabla (falta supabase-v4.sql)

/** Sube los números del perfil si cambiaron desde la última vez. */
async function enviarPerfil() {
  if (!activa() || mandandoPerfil || !conPerfiles || !navigator.onLine) return;
  const j = jugador();
  if (!j.nombre) return;
  const perfil = perfilParaTabla();
  const firma = JSON.stringify([j.id, perfil]);
  if (leer(CLAVE_PERFIL, '') === firma) return;
  mandandoPerfil = true;
  try {
    await pedir('perfiles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ jugador_id: j.id, ...perfil }),
    });
    escribir(CLAVE_PERFIL, firma);
  } catch (err) {
    if (/perfiles/i.test(err.message)) conPerfiles = false;
    console.warn('No se pudo subir el perfil; se reintenta después.', err);
  }
  mandandoPerfil = false;
}

// ---------- Ventana de la tabla ----------

/** Pide el nombre. Devuelve true si quedó guardado. */
async function pedirNombre() {
  const cont = document.createElement('div');
  cont.innerHTML = `
    <p style="text-align:center">${t('¿Con qué nombre quieres aparecer en la tabla?')}</p>
    <input class="campo-nombre" type="text" maxlength="${MAX_NOMBRE}" autocomplete="nickname"
      autocapitalize="words" enterkeyhint="done" placeholder="${t('Tu nombre')}" aria-label="${t('Tu nombre')}">
    <small class="ajuste-nota" style="text-align:center;margin-top:8px">${t('Lo ve cualquiera que tenga el juego.')}</small>`;
  const campo = cont.querySelector('input');
  campo.value = jugador().nombre;

  const promesa = mostrarModal({
    titulo: `🏆 ${t('Tu nombre')}`,
    contenido: cont,
    botones: [
      { texto: t('Cancelar'), valor: null },
      { texto: t('Guardar'), clase: 'btn-primario', valor: 'ok' },
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
const dias = (f) => (f.dias === 1 ? t('{n} día', { n: 1 }) : t('{n} días', { n: f.dias }));
const VISTAS = {
  mejor_dia: { tabla: 'tabla_jugadores', columnas: 'jugador_id,nombre,mejor_dia,total,dias', valor: (f) => dinero(f.mejor_dia),
    orden: 'mejor_dia', sub: dias, vacio: `${t('¡Termina un día para estrenar la tabla!')} 🥞` },
  total: { tabla: 'tabla_jugadores', columnas: 'jugador_id,nombre,mejor_dia,total,dias', valor: (f) => dinero(f.total),
    orden: 'total', sub: dias, vacio: `${t('¡Termina un día para estrenar la tabla!')} 🥞` },
  sinfin: { tabla: 'tabla_sinfin', columnas: 'jugador_id,nombre,mejor,crepas,partidas', valor: (f) => t('{n} pts', { n: f.mejor.toLocaleString('es-MX') }),
    orden: 'mejor',
    sub: (f) => `${t('{n} crepas', { n: f.crepas })} · ${f.partidas === 1 ? t('{n} partida', { n: 1 }) : t('{n} partidas', { n: f.partidas })}`,
    vacio: `${t('¡Juega el modo sin fin para estrenar esta tabla!')} ♾️` },
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
  if (!filas.length) return `<p class="ranking-vacio">${t('Todavía no hay nadie.')} ${v.vacio}</p>`;
  const medallas = ['🥇', '🥈', '🥉'];
  return `<ol class="ranking-lista">${filas.map((f, i) => `
    <li class="${f.jugador_id === miId ? 'yo' : ''}">
      <button class="ranking-fila" data-i="${i}" aria-label="${escapar(t('Ver el perfil de {nombre}', { nombre: f.nombre }))}">
        <span class="ranking-pos">${medallas[i] ?? i + 1}</span>
        ${carita(f, dibujar)}
        <span class="ranking-nombre">${escapar(f.nombre)}<small>${v.sub(f)}</small></span>
        <b>${v.valor(f)}</b>
      </button>
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

/** La fila de un solo jugador en una tabla o vista de la base (o null si no hay). */
async function leerDe(tabla, columnas, id, extra = '') {
  const filas = await pedir(`${tabla}?select=${columnas}&jugador_id=eq.${encodeURIComponent(id)}${extra}&limit=1`);
  return filas?.[0] ?? null;
}

/** Mini perfil de un jugador de la tabla. Con "Volver" se regresa a la tabla. */
async function abrirPerfil(fila) {
  const { personajeDesdeTabla } = await import('./personaje.js');
  const id = fila.jugador_id;
  const soyYo = id === jugador().id;
  const figura = (personaje) => personajeDesdeTabla(personaje)
    || `<span class="perfil-inicial">${escapar(Array.from(fila.nombre)[0] || '?')}</span>`;
  const cont = document.createElement('div');
  cont.className = 'perfil';
  cont.innerHTML = `
    <div class="perfil-figura">${figura(fila.personaje)}</div>
    <div class="perfil-datos"><p class="ranking-vacio">${t('Cargando…')} ⏳</p></div>`;
  const datos = cont.querySelector('.perfil-datos');

  mostrarModal({
    titulo: fila.nombre, // va como texto, no como HTML
    contenido: cont,
    botones: [{ texto: `← ${t('Volver a la tabla')}`, clase: 'btn-primario', valor: 'volver' }],
  }).then((r) => { if (r === 'volver') abrirRanking({ conservar: true }); });

  // De la tabla ya leída, o se pide solo lo de este jugador
  const deCache = (tabla) => cache[tabla]?.find((f) => f.jugador_id === id);
  const [dias, sinfin, perfil] = await Promise.all([
    deCache('tabla_jugadores') ?? leerDe('tabla_jugadores', 'mejor_dia', id).catch(() => null),
    deCache('tabla_sinfin') ?? leerDe('tabla_sinfin', 'mejor', id).catch(() => null),
    // Tus números salen de este teléfono (los de la base pueden ir atrasados)
    soyYo ? perfilParaTabla()
      : leerDe('perfiles', 'dinero,dinero_total,logros,dia,vendidas', id, '&order=creado.desc').catch(() => null),
  ]);
  if (!cont.isConnected) return; // ya la cerró

  const dato = (emoji, etiqueta, valor) => `<li><span>${emoji} ${etiqueta}</span><b>${valor}</b></li>`;
  const numero = (n) => n.toLocaleString('es-MX');
  const lista = [];
  if (perfil) {
    lista.push(dato('💰', t('Dinero ahorita'), dinero(perfil.dinero)));
    lista.push(dato('🏦', t('Dinero ganado en total'), dinero(perfil.dinero_total)));
    lista.push(dato('🏅', t('Logros'), `${perfil.logros} / ${LOGROS.length}`));
    lista.push(dato('📅', t('Día'), numero(perfil.dia)));
    lista.push(dato('🥞', t('Crepas vendidas'), numero(perfil.vendidas)));
  }
  if (dias) lista.push(dato('🏆', t('Mejor día'), dinero(dias.mejor_dia)));
  if (sinfin) lista.push(dato('♾️', t('Sin fin'), t('{n} pts', { n: numero(sinfin.mejor) })));
  datos.innerHTML = `
    ${lista.length ? `<ul class="perfil-lista">${lista.join('')}</ul>` : ''}
    ${perfil ? '' : `<p class="ajuste-nota perfil-nota">${t('Su dinero y sus logros aparecen cuando juegue con la versión nueva.')}</p>`}`;
}

export async function abrirRanking({ conservar = false } = {}) {
  if (!activa()) { aviso(t('La tabla en línea no está configurada')); return; }
  if (!tieneNombre() && !(await pedirNombre())) return;
  enviarPendientes();

  // El dibujo de las caritas (revisa que el personaje que llega de otro teléfono sea válido)
  const { caritaDesdeTabla } = await import('./personaje.js');
  const cont = document.createElement('div');
  cont.innerHTML = `
    <div class="segmentado" id="rk-vista">
      <button data-valor="mejor_dia">${t('Mejor día')}</button>
      <button data-valor="total">${t('Acumulado')}</button>
      <button data-valor="sinfin">♾️ ${t('Sin fin')}</button>
    </div>
    <div id="rk-cuerpo" class="ranking-cuerpo"><p class="ranking-vacio">${t('Cargando…')} ⏳</p></div>
    <p class="ranking-pie">${t('Juegas como {nombre}', { nombre: `<b>${escapar(jugador().nombre)}</b>` })} ·
      <button class="btn-enlace" id="rk-nombre">${t('cambiar nombre')}</button></p>`;
  const cuerpo = cont.querySelector('#rk-cuerpo');
  // Tu carita siempre sale de este teléfono (la de la base puede ir atrasada);
  // a quien no trae carita se le busca en la otra tabla
  const personajeDe = (id) => (id === jugador().id && personajeParaTabla())
    || Object.values(cache).flat().find((f) => f.jugador_id === id && f.personaje)?.personaje || null;

  const pintar = async () => {
    cont.querySelectorAll('#rk-vista button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.valor === vista));
    const v = VISTAS[vista];
    const pedida = vista;
    if (!cache[v.tabla]) {
      cuerpo.innerHTML = `<p class="ranking-vacio">${t('Cargando…')} ⏳</p>`;
      try {
        cache[v.tabla] = await leerTabla(v);
      } catch (err) {
        console.warn('No se pudo leer la tabla en línea.', err);
        if (vista === pedida) cuerpo.innerHTML = `<p class="ranking-vacio">${t('No se pudo cargar la tabla. Revisa tu internet e inténtalo otra vez.')} 📶</p>`;
        return;
      }
    }
    if (vista !== pedida) return; // cambió de pestaña mientras cargaba
    const filas = [...cache[v.tabla]].sort((a, b) => b[v.orden] - a[v.orden]).slice(0, 50)
      .map((f) => (f.personaje && f.jugador_id !== jugador().id ? f : { ...f, personaje: personajeDe(f.jugador_id) || f.personaje }));
    cuerpo.innerHTML = filasHTML(filas, jugador().id, v, caritaDesdeTabla);
    cuerpo.querySelectorAll('.ranking-fila').forEach((b) => b.addEventListener('click', () => {
      sonidos.click();
      abrirPerfil(filas[b.dataset.i]);
    }));
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
  // Cada vez que se abre, datos frescos (menos al regresar de un perfil)
  if (!conservar) for (const k of Object.keys(cache)) delete cache[k];
  mostrarModal({ titulo: `🏆 ${t('Tabla en línea')}`, contenido: cont, botones: [{ texto: t('Cerrar'), clase: 'btn-primario' }] });
  pintar();
}

// ---------- Arranque ----------

on('finDia', registrarDia);
window.addEventListener('online', enviarPendientes);
// Al cambiar el personaje (un rato después, por si sigue probándose cosas) y al salir del juego
let esperaCara = 0;
window.addEventListener('personaje:cambio', () => { clearTimeout(esperaCara); esperaCara = setTimeout(enviarCara, 3000); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { enviarCara(); enviarPerfil(); } });
enviarPendientes();

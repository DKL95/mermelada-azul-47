/* ============================================================
   state.js — estado global del juego + guardado automático.

   Uso:
     import { estado, actualizar, suscribir } from './state.js';
     estado().dinero                       // leer
     actualizar(e => { e.dinero += 50; })  // cambiar (guarda solo)
     suscribir(e => pintar(e))             // reaccionar a cambios
   ============================================================ */
import { CONFIG } from './config.js';

const CLAVE_GUARDADO = 'creperia.partida';
const VERSION = 1; // súbela si cambia la forma del estado

/** Números del día en curso (se reinician cada día). */
export function hoyNuevo(reputacion = CONFIG.reputacionInicial) {
  return {
    vendidas: 0,      // crepas cobradas
    ventas: 0,        // lo que pagaron por las crepas (sin propinas)
    ganado: 0,        // todo lo que entró a la caja
    propinas: 0,      // propinas + bonos
    insumos: 0,       // lo gastado en ingredientes (si está activado)
    perdidos: 0,      // clientes que se fueron sin crepa
    quemadas: 0,
    racha: 0,         // clientes encantados seguidos
    repInicio: reputacion,
    logros: [],       // logros ganados hoy
  };
}

/** Estado de una partida nueva. Todo lo que se guarda vive aquí. */
function estadoInicial() {
  return {
    version: VERSION,
    dinero: CONFIG.dineroInicial,
    dia: 1,
    reputacion: CONFIG.reputacionInicial, // 0 a 5 (admite decimales)
    segundosTurno: 0,                     // tiempo transcurrido del día
    mejoras: {},                          // { idMejora: nivel }
    desbloqueados: [],                    // ids de ingredientes desbloqueados
    logros: [],                           // ids de logros obtenidos
    resenas: [],                          // buzón de reseñas
    charola: [],                          // crepas terminadas esperando entrega
    hoy: hoyNuevo(),                      // números del día en curso
    evento: null,                         // evento especial de hoy (id) o null
    stats: {                              // para los logros
      rachaMax: 0,
      exigentes5: 0,
      gourmets5: 0,
      ninosEncantados: 0,
      vips: [],
      famoso: false,
      combos: [],
      salsaPerfecta: 0,
      dineroTotal: 0,
    },
    records: {
      mejorDia: 0,          // dinero ganado en el mejor día
      crepasVendidas: 0,
      crepasPerfectas: 0,
    },
    ajustes: {
      sonido: true,
      dificultad: 'normal', // 'relajado' | 'normal' | 'desafio'
      costoInsumos: false,  // true = cada crepa descuenta lo que costaron sus ingredientes
    },
    tutorialVisto: false,
    bienvenidaVista: false,         // la romántica
    bienvenidaPublicaVista: false,
    sorpresaVista: false,
    pestana: 'cocina',
  };
}

/**
 * Combina lo guardado con los valores por defecto, para que una
 * partida vieja no truene si agregamos campos nuevos.
 */
function combinar(base, guardado) {
  for (const k of Object.keys(guardado)) {
    const v = guardado[k];
    const esObjeto = (x) => x && typeof x === 'object' && !Array.isArray(x);
    if (esObjeto(v) && esObjeto(base[k]) && Object.keys(base[k]).length === 0) {
      base[k] = v;          // diccionario libre (ej. mejoras): se copia completo
    } else if (esObjeto(v) && esObjeto(base[k])) {
      combinar(base[k], v);
    } else if (k in base) {
      base[k] = v;
    }
  }
  return base;
}

function cargar() {
  try {
    const texto = localStorage.getItem(CLAVE_GUARDADO);
    if (!texto) return estadoInicial();
    const guardado = JSON.parse(texto);
    const e = combinar(estadoInicial(), guardado);
    e.version = VERSION;
    return e;
  } catch (err) {
    console.warn('No se pudo leer la partida guardada, se empieza de nuevo.', err);
    return estadoInicial();
  }
}

let _estado = cargar();
const oyentes = new Set();
let temporizadorGuardado = null;

/** Devuelve el estado actual (no lo modifiques directo: usa actualizar). */
export function estado() {
  return _estado;
}

/** Aplica un cambio, avisa a los suscriptores y programa el guardado. */
export function actualizar(fn) {
  fn(_estado);
  oyentes.forEach((o) => o(_estado));
  programarGuardado();
}

/** Registra una función que se llama cada vez que cambia el estado. */
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Guarda en localStorage de inmediato. */
export function guardar() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = null;
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(_estado));
  } catch (err) {
    console.warn('No se pudo guardar la partida.', err);
  }
}

/** Agrupa varios cambios seguidos en un solo guardado. */
function programarGuardado() {
  if (temporizadorGuardado) return;
  temporizadorGuardado = setTimeout(guardar, 400);
}

/** Borra la partida y empieza de cero. */
export function reiniciarPartida() {
  _estado = estadoInicial();
  guardar();
  oyentes.forEach((o) => o(_estado));
}

// Guardar al salir o al mandar la app a segundo plano
window.addEventListener('pagehide', guardar);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') guardar();
});

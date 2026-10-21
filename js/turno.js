/* ============================================================
   turno.js — el día de trabajo: reloj, llegada de clientes,
   paciencia, comandas, bebidas, cobro, logros y cierre.

   Avisa a las pantallas con eventos:
     on('cambio', fn)    cambió la lista de clientes
     on('tic', fn)       ~4 veces por segundo (para barras de paciencia)
     on('cobro', fn)     se cobró una crepa  {cliente, total, resultado, bonos}
     on('seVa', fn)      un cliente se fue sin crepa
     on('logros', fn)    se ganaron logros  [logro, ...]
     on('horaPico', fn)  empezó la hora pico
     on('bebidas', fn)   cambió lo que hay en la barra de bebidas
     on('finDia', fn)    terminó el día
   ============================================================ */
import { CONFIG } from './config.js';
import { estado, actualizar, hoyNuevo } from './state.js';
import { crearCliente, describirPedido } from './clientes.js';
import { calificar, textoResena } from './calificacion.js';
import { ABANDONO, RESENAS_NOVIO, alAzar } from './data/mensajes.js';
import { ingrediente } from './data/ingredientes.js';
import { multIntervalo, multReputacion } from './data/mejoras.js';
import { EVENTOS, HORA_PICO, evento } from './data/eventos.js';
import { revisarLogros } from './data/logros.js';
import { ganarChispitas } from './cartera.js';
import { sonidos } from './audio.js';
import { esRomantica } from './romance.js';

export const LUGARES = 3;           // clientes que caben frente al mostrador
export const MAX_BEBIDA = 2;        // vasos listos de cada bebida
const SEG_CAMINAR = 2.4;            // lo que tarda en llegar caminando
const SEG_DESPEDIDA = 2.6;          // lo que se queda antes de irse

// Estado del día (no se guarda: si cierras la app, los clientes se van)
export const juego = {
  abierto: false,
  clientes: [],
  siguienteNumero: 1,
  proximaLlegada: 0,
  pausas: 0,
  bebidas: {},        // vasos listos en la barra {id: cantidad}
  famosaVino: false,  // la crítica famosa ya llegó hoy
  novioHoy: false,    // hoy viene el novio
  novioVino: false,
  enHoraPico: false,
  forzarTipo: null,   // el siguiente cliente será de este tipo (famosa o pruebas)
};

const oyentes = {};
export function on(nombre, fn) { (oyentes[nombre] ||= []).push(fn); }
function emitir(nombre, datos) { (oyentes[nombre] || []).forEach((fn) => fn(datos)); }

// ---------- Apertura y cierre ----------

export function abrir() {
  if (juego.abierto) return;
  juego.abierto = true;
  juego.proximaLlegada = 1.5;
  sonidos.campana();
  emitir('cambio');
}

export function diaTerminado() {
  return estado().segundosTurno >= CONFIG.duracionTurnoSegundos;
}

/** Elige el evento del día (o ninguno). */
function elegirEvento(e) {
  const hoyReal = new Date();
  if (hoyReal.getMonth() === 1 && hoyReal.getDate() === 14) return 'san_valentin'; // 14 de febrero de verdad
  if (e.dia < 2 || Math.random() > 0.4) return null;
  const opciones = EVENTOS.filter((x) => x.id !== e.evento);
  const total = opciones.reduce((s, x) => s + x.peso, 0);
  let r = Math.random() * total;
  for (const x of opciones) { r -= x.peso; if (r <= 0) return x.id; }
  return null;
}

/** Empieza el día siguiente (después del resumen). */
export function siguienteDia() {
  actualizar((e) => {
    e.dia += 1;
    e.segundosTurno = 0;
    e.evento = elegirEvento(e);
    e.hoy = hoyNuevo(e.reputacion);
  });
  juego.siguienteNumero = 1;
  juego.bebidas = {};
  juego.famosaVino = false;
  juego.novioHoy = Math.random() < 0.5;  // la mitad de los días pasa a verte
  juego.novioVino = false;
  juego.enHoraPico = false;
  emitir('bebidas');
  emitir('cambio');
}

/** Fracción del día que ya pasó (0..1). */
function avanceDia() {
  return estado().segundosTurno / CONFIG.duracionTurnoSegundos;
}

// ---------- Acciones con clientes ----------

/** Lista de comandas pendientes (ya tomadas, esperando su crepa). */
export function comandas() {
  return juego.clientes.filter((c) => c.estado === 'esperando').sort((a, b) => a.numero - b.numero);
}

export function tomarPedido(c) {
  if (c.estado !== 'pidiendo') return;
  c.estado = 'esperando';
  c.numero = juego.siguienteNumero++;
  sonidos.pop();
  emitir('cambio');
}

// ---------- Barra de bebidas ----------

/** Pone un vaso listo en la barra (después de prepararlo). */
export function agregarBebida(id) {
  if ((juego.bebidas[id] || 0) >= MAX_BEBIDA) return false;
  juego.bebidas[id] = (juego.bebidas[id] || 0) + 1;
  if (estado().ajustes.costoInsumos) {
    const costo = ingrediente(id).costo;
    actualizar((e) => { e.dinero -= costo; e.hoy.insumos += costo; });
  }
  emitir('bebidas');
  return true;
}

/** Entrega la crepa #indice de la charola al cliente, la califica y le cobra. */
export function entregar(c, indice) {
  if (c.estado !== 'esperando') return;
  const enCharola = estado().charola[indice];
  if (!enCharola) return;

  // Si pidió bebida y hay un vaso listo, se la llevamos también
  const crepa = { ...enCharola };
  const bebida = c.pedido.bebida;
  const conBebida = bebida && juego.bebidas[bebida] > 0;
  if (conBebida) { crepa.bebida = bebida; juego.bebidas[bebida]--; emitir('bebidas'); }

  const r = calificar(crepa, c);
  r.texto = textoResena(r, c);
  if (c.novio) {
    // El novio siempre queda encantado y deja una reseña cariñosa
    r.texto = alAzar(r.pct >= 70 ? RESENAS_NOVIO.perfecta : RESENAS_NOVIO.consuelo);
    r.emocion = 'encantado';
    r.categoria = 'encantado';
    r.estrellas = 5;
    r.propina = Math.round(c.precio * 0.5);
  }

  // Bonos: crepa perfecta y racha de clientes encantados seguidos
  const bonos = [];
  const racha = r.pct >= 90 ? (estado().hoy.racha || 0) + 1 : 0;
  if (r.pct >= 95) bonos.push({ texto: '✨ ¡Crepa perfecta!', monto: 10, chispitas: 1 });
  if (racha >= 2) bonos.push({ texto: `🔥 Racha x${racha}`, monto: Math.min(25, 5 * (racha - 1)) });
  const extra = bonos.reduce((s, b) => s + b.monto, 0);
  // Si faltó la bebida, no se cobra
  const precio = bebida && !conBebida ? c.precio - (c.precioBebida || 0) : c.precio;
  const total = precio + r.propina + extra;

  let logros = [];
  actualizar((e) => {
    e.charola.splice(indice, 1);
    e.dinero += total;
    e.hoy.vendidas += 1;
    e.hoy.ventas += precio;
    e.hoy.ganado += total;
    e.hoy.propinas += r.propina + extra;
    e.hoy.racha = racha;
    if (crepa.coccion?.etiqueta === 'quemada') e.hoy.quemadas += 1;
    e.records.crepasVendidas += 1;
    if (r.pct >= 95) e.records.crepasPerfectas += 1;
    actualizarStats(e, c, r, racha, total);

    // Reputación (la crítica famosa la mueve mucho más)
    let cambio = CAMBIO_REPUTACION[r.estrellas];
    if (c.novio) cambio = 0; // su reseña es de cariño, no cuenta para la reputación
    if (c.famosa) cambio = r.pct >= 90 ? 0.5 : r.pct >= 70 ? 0.1 : -0.3;
    if (cambio > 0) cambio *= multReputacion(e);
    e.reputacion = limitar(e.reputacion + cambio);

    guardarResena(e, c, r);
    logros = revisarLogros(e, { momento: 'entrega' });
    e.hoy.logros.push(...logros.map((l) => l.id));
  });
  ganarChispitas(bonos.reduce((s, b) => s + (b.chispitas || 0), 0));
  c.estado = 'atendido';
  c.resultado = r;
  c.salidaEn = SEG_DESPEDIDA + 1.5; // se queda un poco más para reaccionar
  sonidos.ching();
  emitir('cobro', { cliente: c, total, resultado: r, bonos, faltoBebida: bebida && !conBebida });
  if (logros.length) emitir('logros', logros);
  emitir('cambio');
}

/** Estadísticas para los logros. */
function actualizarStats(e, c, r, racha, total) {
  const s = e.stats;
  s.rachaMax = Math.max(s.rachaMax, racha);
  s.dineroTotal += total;
  if (r.estrellas === 5 && c.tipo === 'exigente') s.exigentes5 += 1;
  if (r.estrellas === 5 && c.tipo === 'gourmet' && !c.famosa) s.gourmets5 += 1;
  if (r.pct >= 90 && c.tipo === 'nino') s.ninosEncantados += 1;
  if (c.vip && !s.vips.includes(c.vip)) s.vips.push(c.vip);
  if (c.famosa && r.pct >= 90) s.famoso = true;
  if (c.pedido.combo && r.estrellas >= 4 && !s.combos.includes(c.pedido.combo)) s.combos.push(c.pedido.combo);
  if (c.pedido.salsas?.length && r.partes.decoracion >= 1 && !r.faltan.some((id) => c.pedido.salsas.includes(id))) s.salsaPerfecta += 1;
}

// Cuánto sube o baja la reputación según las estrellas
const CAMBIO_REPUTACION = { 5: 0.08, 4: 0.04, 3: 0, 2: -0.05, 1: -0.12 };
const limitar = (v) => Math.max(0, Math.min(5, v));

/** Guarda la reseña en el buzón (máximo 120, se borran las más viejas). */
function guardarResena(e, c, r) {
  e.resenas.push({
    id: c.id,
    dia: e.dia,
    estrellas: r.estrellas,
    pct: r.pct,
    texto: r.texto,
    emocion: r.emocion,
    nombre: c.nombre || null,
    apariencia: c.apariencia,
    pedido: describirPedido(c.pedido),
    partes: r.partes,
    leida: false,
  });
  if (e.resenas.length > 120) e.resenas.splice(0, e.resenas.length - 120);
}

// ---------- Pausa (ventanas abiertas, app en segundo plano) ----------

window.addEventListener('modal:abierto', () => { juego.pausas++; });
window.addEventListener('modal:cerrado', () => { juego.pausas = Math.max(0, juego.pausas - 1); });

// ---------- Ciclo principal ----------

function intervaloLlegada() {
  const e = estado();
  const dif = e.ajustes.dificultad;
  const [min, max] = dif === 'relajado' ? [38, 52] : dif === 'desafio' ? [20, 30] : [28, 40];
  // Cada día llega la gente un poquito más seguido
  const prisa = Math.min(10, (e.dia - 1) * 1.5);
  let t = Math.max(12, min + Math.random() * (max - min) - prisa);
  // Buena reputación = más clientes (5★ → 25% más seguido; 1★ → 20% menos)
  t *= 1.25 - 0.1 * e.reputacion;
  t *= multIntervalo(e) * (evento(e.evento)?.llegadas || 1);
  if (juego.enHoraPico) t *= HORA_PICO.llegadas;
  return Math.max(8, t);
}

function lugarLibre() {
  const ocupados = new Set(juego.clientes.map((c) => c.lugar));
  const libres = [...Array(LUGARES).keys()].filter((i) => !ocupados.has(i));
  return libres.length ? libres[Math.floor(Math.random() * libres.length)] : -1;
}

let ultimo = 0, acumTic = 0, acumReloj = 0;

function ciclo(ahora) {
  requestAnimationFrame(ciclo);
  const dt = Math.min(0.25, (ahora - (ultimo || ahora)) / 1000);
  ultimo = ahora;
  if (!juego.abierto || juego.pausas > 0 || document.hidden) return;

  // Reloj del día (se guarda cada medio segundo, no en cada cuadro)
  const cerrando = diaTerminado();
  if (!cerrando) {
    acumReloj += dt;
    if (acumReloj >= 0.5) {
      const suma = acumReloj;
      acumReloj = 0;
      actualizar((e) => { e.segundosTurno = Math.min(CONFIG.duracionTurnoSegundos, e.segundosTurno + suma); });
    }
  }

  // Hora pico
  const avance = avanceDia();
  const pico = avance >= HORA_PICO.desde && avance < HORA_PICO.hasta;
  if (pico !== juego.enHoraPico) {
    juego.enHoraPico = pico;
    if (pico) { juego.proximaLlegada = Math.min(juego.proximaLlegada, 2); emitir('horaPico'); }
  }

  // La crítica famosa llega una vez, ya avanzado el día
  if (estado().evento === 'famoso' && !juego.famosaVino && avance > 0.25 && !juego.forzarTipo) {
    juego.forzarTipo = 'famosa';
    juego.proximaLlegada = Math.min(juego.proximaLlegada, 1);
  }

  // El novio pasa a verte a media tarde (algunos días)
  if (juego.novioHoy && !juego.novioVino && avance > 0.5 && !juego.forzarTipo && estado().dia >= 2 && esRomantica()) {
    juego.forzarTipo = 'novio';
  }
  // Tutorial: el primer cliente llega rapidito y es tranquilo
  if (!estado().tutorialVisto && !juego.clientes.length && !juego.forzarTipo) {
    juego.forzarTipo = 'tranquilo';
    juego.proximaLlegada = Math.min(juego.proximaLlegada, 3);
  }

  // Llegadas (dejan de llegar 15 s antes de cerrar)
  juego.proximaLlegada -= dt;
  const quedaTiempo = estado().segundosTurno < CONFIG.duracionTurnoSegundos - 15;
  if (juego.proximaLlegada <= 0 && quedaTiempo) {
    const lugar = lugarLibre();
    if (lugar >= 0) {
      const c = crearCliente(juego.clientes, juego.forzarTipo);
      if (c.famosa) juego.famosaVino = true;
      if (c.novio) juego.novioVino = true;
      juego.forzarTipo = null;
      c.lugar = lugar;
      c.llegaEn = SEG_CAMINAR;
      juego.clientes.push(c);
      juego.proximaLlegada = intervaloLlegada();
      emitir('cambio');
    } else {
      juego.proximaLlegada = 3; // está lleno: reintenta en un rato
    }
  }

  // Cada cliente
  let cambio = false;
  for (const c of juego.clientes) {
    if (c.estado === 'llegando') {
      c.llegaEn -= dt;
      if (c.llegaEn <= 0) { c.estado = 'pidiendo'; sonidos.campana(); cambio = true; }
    } else if (c.estado === 'pidiendo' || c.estado === 'esperando') {
      c.paciencia -= dt;
      if (c.paciencia <= 0) {
        c.estado = 'enojado';
        c.salidaEn = SEG_DESPEDIDA;
        actualizar((e) => {
          e.hoy.perdidos += 1;
          e.hoy.racha = 0;
          e.reputacion = limitar(e.reputacion - (c.famosa ? 0.4 : 0.1));
          guardarResena(e, c, { estrellas: 1, pct: 0, texto: alAzar(ABANDONO), emocion: 'furioso', partes: null });
        });
        emitir('seVa', c);
        cambio = true;
      }
    } else if (c.salidaEn !== undefined) {
      c.salidaEn -= dt;
      if (c.salidaEn <= -SEG_CAMINAR) { c.borrar = true; cambio = true; }
    }
  }
  if (juego.clientes.some((c) => c.borrar)) juego.clientes = juego.clientes.filter((c) => !c.borrar);
  if (cambio) emitir('cambio');

  acumTic += dt;
  if (acumTic >= 0.25) { acumTic = 0; emitir('tic'); }

  // Fin del día: ya es hora de cerrar y no queda nadie
  if (cerrando && juego.clientes.length === 0) {
    juego.abierto = false;
    let logros = [];
    actualizar((e) => {
      e.records.mejorDia = Math.max(e.records.mejorDia, e.hoy.ganado - e.hoy.insumos);
      logros = revisarLogros(e, { momento: 'finDia' });
      e.hoy.logros.push(...logros.map((l) => l.id));
    });
    if (logros.length) emitir('logros', logros);
    emitir('finDia');
    emitir('cambio');
  }
}

requestAnimationFrame(ciclo);

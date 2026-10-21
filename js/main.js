/* ============================================================
   main.js — arranque del juego y navegación entre pestañas.
   ============================================================ */
import { CONFIG } from './config.js';
import { estado, actualizar, suscribir, reiniciarPartida, enModoTemporal } from './state.js';
import { mostrarModal, confirmar, aviso, dinero, estrellasSVG, rebotar } from './ui.js';
import { sonidos, silenciar } from './audio.js';
import * as cocina from './cocina.js';
import * as venta from './venta.js';
import { juego, on, comandas } from './turno.js';
import { TIPOS_CLIENTE } from './data/clientes.js';
import { EVENTOS } from './data/eventos.js';
import { avisarLogros } from './tienda.js';
import { pantallaInicio, bienvenida, revisarSorpresa, sorpresaDesbloqueada, abrirCarta, creditos, esRomantica, nombreCreperia } from './romance.js';
import { abrirRanking } from './ranking.js';
import { chispitas, suscribirCartera, iconoChispita, abrirTiendaChispitas, premioDiario, regaloPorLogros, ganarChispitas } from './cartera.js';
import { LOGROS, chispitasDe } from './data/logros.js';
import { personaje, editarPersonaje } from './personaje.js';
import { abrirBoutique } from './boutique.js';
import { aplicarDecoracion } from './local.js';
import { reloj } from './sinfin.js';
import { iniciarTutorial } from './tutorial.js';

// Cada pestaña es un módulo con montar / alMostrar / alOcultar
const PESTANAS = { cocina, venta };
let pestanaActual = null;

const $ = (sel) => document.querySelector(sel);

// ================= Barra superior =================

/** Convierte segundos del turno en hora del juego, ej. "1:30 p.m." */
export function horaDelJuego(segundos) {
  const horasTurno = CONFIG.horaCierre - CONFIG.horaApertura;
  const fraccion = Math.min(1, segundos / CONFIG.duracionTurnoSegundos);
  const minutosTotales = CONFIG.horaApertura * 60 + fraccion * horasTurno * 60;
  let h = Math.floor(minutosTotales / 60);
  const m = Math.floor(minutosTotales % 60 / 15) * 15; // avanza de 15 en 15 min
  const sufijo = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${sufijo}`;
}

// Recordamos lo último pintado para no tocar el DOM si nada cambió
const ultimo = {};

function pintarBarra(e) {
  // Sin fin: puntos, ♾️, corazones y tiempo en lugar de dinero, día, reputación y hora
  document.getElementById('app').classList.toggle('modo-sinfin', !!e.sinfin);
  if (e.sinfin) {
    const sf = e.sinfin;
    const clave = `${sf.puntos}|${sf.vidas}|${Math.floor(sf.segundos)}`;
    if (ultimo.sinfin === clave) return;
    if (ultimo.sinfin && sf.puntos !== ultimo.puntosSinfin) rebotar($('#ind-dinero'));
    if (ultimo.sinfin && sf.vidas < ultimo.vidas) rebotar($('#ind-reputacion'));
    $('#valor-dinero').textContent = `⭐ ${sf.puntos.toLocaleString('es-MX')}`;
    $('#valor-dia').textContent = '♾️';
    $('#valor-reputacion').innerHTML = `<span class="corazones">${'❤️'.repeat(Math.max(0, sf.vidas))}${'🖤'.repeat(Math.max(0, 3 - sf.vidas))}</span>`;
    $('#valor-reloj').textContent = reloj(sf.segundos);
    Object.assign(ultimo, { sinfin: clave, puntosSinfin: sf.puntos, vidas: sf.vidas, dinero: undefined, dia: undefined, rep: undefined, hora: undefined });
    return;
  }
  ultimo.sinfin = null;
  if (ultimo.dinero !== e.dinero) {
    if (ultimo.dinero !== undefined && ultimo.dinero !== null) rebotar($('#ind-dinero'));
    $('#valor-dinero').textContent = dinero(e.dinero);
    ultimo.dinero = e.dinero;
  }
  if (ultimo.dia !== e.dia) {
    $('#valor-dia').textContent = e.dia;
    ultimo.dia = e.dia;
  }
  const rep = Math.round(e.reputacion * 2) / 2; // de media en media estrella
  if (ultimo.rep !== rep) {
    $('#valor-reputacion').innerHTML = estrellasSVG(rep);
    $('#ind-reputacion').title = `Reputación: ${rep} de 5`;
    ultimo.rep = rep;
  }
  const hora = horaDelJuego(e.segundosTurno);
  if (ultimo.hora !== hora) {
    const [hm, sufijo] = hora.split(' ');
    $('#valor-reloj').innerHTML = `${hm}<small>${sufijo}</small>`;
    ultimo.hora = hora;
  }
}

// ================= Pestañas =================

function cambiarPestana(nombre) {
  if (nombre === pestanaActual || !PESTANAS[nombre]) return;
  if (pestanaActual) PESTANAS[pestanaActual].alOcultar();

  document.querySelectorAll('.pantalla').forEach((p) => p.classList.toggle('activa', p.dataset.pestana === nombre));
  document.querySelectorAll('.tab').forEach((t) => {
    const activa = t.dataset.pestana === nombre;
    t.classList.toggle('activa', activa);
    t.setAttribute('aria-selected', activa);
  });

  pestanaActual = nombre;
  PESTANAS[nombre].alMostrar();
  if (estado().pestana !== nombre) actualizar((e) => { e.pestana = nombre; });
}

// ================= Globitos en las pestañas =================

/** Venta: clientes esperando a que les tomen el pedido. Cocina: comandas pendientes. */
function pintarGlobos() {
  const porPedir = juego.clientes.filter((c) => c.estado === 'pidiendo').length;
  const pendientes = comandas().length;
  const gv = $('#globo-venta'), gc = $('#globo-cocina');
  gv.hidden = !porPedir; gv.textContent = porPedir;
  gc.hidden = !pendientes; gc.textContent = pendientes;
}

// ================= Ajustes =================

/** ¿Mostrar herramientas de prueba? (config o ?dev=1 en este dispositivo) */
function modoDesarrollo() {
  try {
    const p = new URLSearchParams(location.search).get('dev');
    if (p === '1') localStorage.setItem('creperia.dev', '1');
    if (p === '0') localStorage.removeItem('creperia.dev');
    return CONFIG.modoDesarrollo || localStorage.getItem('creperia.dev') === '1';
  } catch {
    return CONFIG.modoDesarrollo;
  }
}

function abrirAjustes() {
  const e = estado();
  const cont = document.createElement('div');
  cont.innerHTML = `
    <div class="ajuste">
      <span>👤 Mi personaje<small class="ajuste-nota">Cambia tu ropa, peinado y accesorios</small></span>
      <span class="botones-ajuste">
        <button class="btn btn-secundario" id="aj-boutique">🛍️</button>
        <button class="btn btn-secundario" id="aj-personaje">Editar</button>
      </span>
    </div>
    <div class="ajuste">
      <span>🔊 Sonido</span>
      <button class="switch" id="aj-sonido" role="switch" aria-checked="${e.ajustes.sonido}" aria-label="Sonido"></button>
    </div>
    <div class="ajuste">
      <span>🧾 Cobrar insumos<small class="ajuste-nota">Cada crepa descuenta lo que costaron sus ingredientes (más realista)</small></span>
      <button class="switch" id="aj-insumos" role="switch" aria-checked="${e.ajustes.costoInsumos}" aria-label="Cobrar insumos"></button>
    </div>
    <div class="ajuste ajuste-columna">
      <span>🎚️ Dificultad</span>
      <div class="segmentado" id="aj-dificultad">
        <button data-valor="relajado">Relajado</button>
        <button data-valor="normal">Normal</button>
        <button data-valor="desafio">Desafío</button>
      </div>
    </div>
    ${CONFIG.tablaEnLinea ? `
    <div class="ajuste">
      <span>🏆 Tabla en línea<small class="ajuste-nota">Compite con otros jugadores por la mejor ganancia</small></span>
      <button class="btn btn-secundario" id="aj-ranking">Ver</button>
    </div>` : ''}
    <div class="ajuste">
      <span>❓ Ayuda</span>
      <button class="btn btn-secundario" id="aj-ayuda">¿Cómo se juega?</button>
    </div>
    <div class="ajuste">
      <span>🎓 Tutorial</span>
      <button class="btn btn-secundario" id="aj-tutorial">Verlo otra vez</button>
    </div>
    ${esRomantica() ? `
    <div class="ajuste">
      <span>💌 Mensaje sorpresa</span>
      ${sorpresaDesbloqueada(e)
        ? '<button class="btn btn-secundario" id="aj-carta">Abrir 💌</button>'
        : `<span class="ajuste-nota">🔒 Se abre el día ${CONFIG.diaSorpresa}</span>`}
    </div>` : ''}
    <div class="ajuste">
      <span>💝 Créditos</span>
      <button class="btn btn-secundario" id="aj-creditos">Ver</button>
    </div>
    <div class="ajuste">
      <span>🗑️ Partida</span>
      <button class="btn btn-peligro" id="aj-reiniciar">Reiniciar</button>
    </div>
    ${modoDesarrollo() ? `
      <div class="seccion-dev">
        <strong>🛠️ Pruebas (solo desarrollo)</strong>
        <div class="modal-botones">
          <button class="btn" data-dev="dinero">+$100</button>
          <button class="btn" data-dev="dinero1000">+$1000</button>
          <button class="btn" data-dev="chispitas">+50 ✨</button>
          <button class="btn" data-dev="dia">+1 día</button>
          <button class="btn" data-dev="rep">±½ ⭐</button>
          <button class="btn" data-dev="reloj">+1 hora</button>
          <button class="btn" data-dev="cliente">🚶 Cliente ya</button>
          <button class="btn" data-dev="todo">🔓 Desbloquear todo</button>
        </div>
        <div class="modal-botones dev-tipos">
          ${TIPOS_CLIENTE.map((t) => `<button class="btn" data-tipo="${t.id}" title="${t.nombre}">${t.emoji}</button>`).join('')}
        </div>
        <small>Toca un emoji para que llegue ya un cliente de ese tipo (🤓 VIP necesita su combo disponible).</small>
        <div class="modal-botones dev-tipos">
          ${EVENTOS.map((x) => `<button class="btn" data-evento="${x.id}" title="${x.nombre}">${x.emoji}</button>`).join('')}
          <button class="btn" data-evento="" title="Sin evento">🚫</button>
        </div>
        <small>Evento de hoy (para probarlo).</small>
      </div>` : ''}
  `;

  // Sonido
  const sw = cont.querySelector('#aj-sonido');
  sw.addEventListener('click', () => {
    const nuevo = !estado().ajustes.sonido;
    actualizar((s) => { s.ajustes.sonido = nuevo; });
    sw.setAttribute('aria-checked', nuevo);
    silenciar(!nuevo);
    if (nuevo) sonidos.campana();
  });

  // Dificultad
  const seg = cont.querySelector('#aj-dificultad');
  const marcar = () => seg.querySelectorAll('button').forEach((b) =>
    b.setAttribute('aria-pressed', b.dataset.valor === estado().ajustes.dificultad));
  marcar();
  seg.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    sonidos.click();
    actualizar((s) => { s.ajustes.dificultad = b.dataset.valor; });
    marcar();
  });

  cont.querySelector('#aj-ayuda').addEventListener('click', () => { sonidos.click(); abrirAyuda(); });
  cont.querySelector('#aj-personaje').addEventListener('click', () => { sonidos.click(); editarPersonaje(); });
  cont.querySelector('#aj-boutique').addEventListener('click', () => abrirBoutique());
  cont.querySelector('#aj-tutorial').addEventListener('click', () => {
    sonidos.click();
    document.querySelector('#capa-modal .modal-botones .btn')?.click();
    cambiarPestana('venta');
    iniciarTutorial(true);
  });
  cont.querySelector('#aj-carta')?.addEventListener('click', () => abrirCarta());
  cont.querySelector('#aj-creditos').addEventListener('click', () => { sonidos.click(); creditos(); });
  cont.querySelector('#aj-ranking')?.addEventListener('click', () => { sonidos.click(); abrirRanking(); });

  // Reiniciar partida (con confirmación)
  cont.querySelector('#aj-reiniciar').addEventListener('click', async () => {
    if (enModoTemporal()) { aviso('Termina primero la partida sin fin ♾️'); return; }
    const ok = await confirmar(
      '¿Reiniciar partida?',
      'Se borrará todo: dinero, días, mejoras y reseñas. No se puede deshacer.',
      'Sí, borrar todo'
    );
    if (ok) {
      reiniciarPartida();
      location.reload(); // empieza limpio (sin clientes en pantalla)
    }
  });

  // Herramientas de prueba
  cont.querySelectorAll('[data-dev]').forEach((b) => b.addEventListener('click', () => {
    sonidos.ching();
    actualizar((s) => {
      const tipo = b.dataset.dev;
      if (tipo === 'dinero') s.dinero += 100;
      if (tipo === 'dinero1000') s.dinero += 1000;
      if (tipo === 'chispitas') ganarChispitas(50);
      if (tipo === 'dia') s.dia += 1;
      if (tipo === 'cliente') juego.proximaLlegada = 0;
      if (tipo === 'todo') {
        s.desbloqueados = s.desbloqueados.includes('*') ? s.desbloqueados.filter((x) => x !== '*') : [...s.desbloqueados, '*'];
        aviso(s.desbloqueados.includes('*') ? '🔓 Todo desbloqueado' : '🔒 Desbloqueo normal (por día)');
      }
      if (tipo === 'rep') s.reputacion = s.reputacion >= 5 ? 0.5 : s.reputacion + 0.5;
      if (tipo === 'reloj') {
        const segPorHora = CONFIG.duracionTurnoSegundos / (CONFIG.horaCierre - CONFIG.horaApertura);
        s.segundosTurno = (s.segundosTurno + segPorHora) % (CONFIG.duracionTurnoSegundos + 1);
      }
    });
  }));

  cont.querySelectorAll('[data-evento]').forEach((b) => b.addEventListener('click', () => {
    sonidos.click();
    actualizar((s) => { s.evento = b.dataset.evento || null; });
    aviso(`Evento de hoy: ${b.title}`);
  }));

  // Costo de insumos
  const swi = cont.querySelector('#aj-insumos');
  swi.addEventListener('click', () => {
    const nuevo = !estado().ajustes.costoInsumos;
    actualizar((s) => { s.ajustes.costoInsumos = nuevo; });
    swi.setAttribute('aria-checked', nuevo);
    sonidos.click();
  });

  cont.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => {
    sonidos.click();
    juego.forzarTipo = b.dataset.tipo;
    juego.proximaLlegada = 0;
    aviso(`Viene un cliente ${b.title} en cuanto haya lugar`);
  }));

  mostrarModal({ titulo: 'Ajustes', contenido: cont, botones: [{ texto: 'Listo', clase: 'btn-primario' }] });
}

function abrirAyuda() {
  mostrarModal({
    titulo: '¿Cómo se juega?',
    contenido: `
      <p>🛎️ <strong>Venta:</strong> llegan clientes y te piden una crepa. ¡No los hagas esperar mucho!</p>
      <p>🧀 <strong>Dulces y saladas:</strong> desde el día 2 también piden crepas saladas. Sus ingredientes están en las pestañitas «Salados» de cada estación.</p>
      <p>🍳 <strong>Cocina:</strong> prepara la crepa paso a paso: masa, cocción, relleno, doblado, toppings y decoración.</p>
      <p>〰️ <strong>Salsas:</strong> en Decorar, elige una salsa y arrastra el dedo sobre la crepa para dibujar. Ni muy poquita ni exagerada (¡a los niños sí les gusta exagerada!).</p>
      <p>📖 <strong>Menú:</strong> en la Cocina puedes ver las crepas de la casa y qué es cada ingrediente.</p>
      <p>🧾 Toca una comanda para prepararla; tócala otra vez para ver el pedido completo.</p>
      <p>🛒 <strong>Tienda:</strong> con lo que ganes compra mejoras y, en «Decoración», cambia el toldo, el letrero, el cielo y más. Ábrela desde la ventanilla cuando esté cerrado.</p>
      <p>🏆 <strong>Logros:</strong> cada uno da un premio en efectivo y Chispitas. ¡Y hay días con eventos especiales!</p>
      <p>♾️ <strong>Modo sin fin:</strong> desde la ventanilla, cuando está cerrado. Atiende sin parar hasta perder tus 3 corazones. No cambia tu partida normal.</p>
      <p>🛍️ <strong>Boutique:</strong> ropa, accesorios y disfraces para tu personaje. Pruébatelos antes de comprar, con pesos o con Chispitas.</p>
      <p>✨ <strong>Chispitas:</strong> moneda especial. Se ganan con crepas perfectas, logros y el premio diario, y sirven para comprar en la tienda. Toca el ✨ de arriba para verlas.</p>
      <p>⭐ Entre mejor quede, más propina y más estrellas de reputación.</p>
      <p style="color:var(--texto-suave);font-size:14px">¿Quieres repetir el tutorial? Está en ⚙️ Ajustes.</p>`,
    botones: [{ texto: '¡Entendido!', clase: 'btn-primario' }],
  });
}

// ================= Arranque =================

function iniciar() {
  document.title = nombreCreperia();

  // Montar las pantallas una sola vez
  cocina.montar($('#pantalla-cocina'));
  venta.montar($('#pantalla-venta'));

  // Pestañas
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => { sonidos.click(); cambiarPestana(t.dataset.pestana); }));

  $('#btn-ajustes').addEventListener('click', () => { sonidos.click(); abrirAjustes(); });

  on('cambio', pintarGlobos);
  on('logros', avisarLogros);

  aplicarDecoracion(); // azulejos y cielo elegidos

  // Barra superior reactiva
  suscribir(pintarBarra);
  pintarBarra(estado());
  $('#ind-chispitas .ind-chispita').innerHTML = iconoChispita();
  const pintarChispitas = (n) => {
    const v = $('#valor-chispitas');
    if (v.textContent !== String(n) && v.textContent !== '') rebotar($('#ind-chispitas'));
    v.textContent = n;
  };
  $('#valor-chispitas').textContent = chispitas();
  suscribirCartera(pintarChispitas);
  $('#ind-chispitas').addEventListener('click', () => abrirTiendaChispitas());

  cambiarPestana(estado().pestana || 'cocina');
  window.addEventListener('ayuda', () => { sonidos.click(); abrirAyuda(); });

  // iPhone ignora "user-scalable=no": bloqueamos el zoom con pellizco
  // para que no se mueva la pantalla mientras juega.
  ['gesturestart', 'gesturechange'].forEach((t) =>
    document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));

  // Pide al navegador no borrar la partida guardada por falta de espacio
  navigator.storage?.persist?.().catch(() => {});

  // Dentro de la app de Android: pagos con Google Play
  if (window.Capacitor?.isNativePlatform?.()) {
    import('./pagos-android.js').then((m) => m.iniciarPagos()).catch((err) => console.warn('Pagos no disponibles', err));
  }

  // Service worker (juego sin internet). Solo funciona en http(s), no en file://
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW no registrado', err));
  }
}

iniciar();

// Pantalla de inicio (con PIN si está configurado), bienvenida,
// cartita sorpresa pendiente y tutorial de la primera vez.
(async () => {
  await pantallaInicio();
  await bienvenida();
  if (!personaje()) await editarPersonaje({ primeraVez: true });
  await regaloPorLogros(LOGROS, chispitasDe);
  if (estado().tutorialVisto) await premioDiario(); // a quien juega por primera vez, desde mañana
  await revisarSorpresa();
  if (!estado().tutorialVisto) {
    cambiarPestana('venta');
    iniciarTutorial();
  }
})();

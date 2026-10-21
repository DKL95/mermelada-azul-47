/* ============================================================
   cocina.js — pestaña COCINA.

   Cada crepa pasa por estaciones en orden:
     masa → cocción → relleno → doblado → toppings → decorar → entrega

   La crepa en preparación vive en `crepa` (memoria). Al entregarla
   se guarda en la charola (estado global, se guarda solo).
   Lo que se pone encima (toppings, salsas, azúcar...) va en
   crepa.adornos, en coordenadas del dibujo de 200×200:
     { t:'p', e, id, x, y, s }        una pieza (topping) — s = semilla
     { t:'s', e, id, d, largo }       un trazo de salsa (path SVG)
   (e = estación donde se puso, para poder deshacer solo lo de ahí)
   ============================================================ */
import { estado, actualizar } from './state.js';
import { aviso, mostrarModal, confirmar } from './ui.js';
import { sonidos } from './audio.js';
import { Plancha } from './plancha.js';
import { DOBLADOS, COMBOS, INGREDIENTES, ingrediente, disponibles, disponiblesDe, comboDisponible, estaDisponible, dobladoDisponible } from './data/ingredientes.js';
import { MEJORAS, nivel, multVentana, capacidadCharola } from './data/mejoras.js';
import {
  iconoIngrediente, crepaDoblada, iconoDoblado, iconosPedido, ticketDetalle,
  trazoSalsa, sobreLaCrepa, conteoAdornos,
} from './dibujos.js';
import { on, comandas } from './turno.js';
import { describirPedido, tipoDe, nombreEnFrase } from './clientes.js';

// Las 7 estaciones
export const ESTACIONES = [
  { id: 'masa', nombre: 'Masa' },
  { id: 'coccion', nombre: 'Cocción' },
  { id: 'relleno', nombre: 'Relleno' },
  { id: 'doblado', nombre: 'Doblado' },
  { id: 'toppings', nombre: 'Toppings' },
  { id: 'decorar', nombre: 'Decorar' },
  { id: 'entrega', nombre: 'Entrega' },
];

// Las estaciones con bandeja de ingredientes y sus pestañitas
const BANDEJAS = {
  relleno: [['untable', '🫙 Untables'], ['fruta', '🍓 Frutas'], ['salado', '🧀 Salados']],
  toppings: [['crujiente', '🥜 Crujientes'], ['frio', '🍨 Fríos'], ['top_salado', '🥓 Salados']],
  decorar: [['salsa', '〰️ Salsas'], ['decoracion', '✨ Espolvorear'], ['deco_salada', '🌶️ Saladas']],
};

/** Lo que hay en cada pestañita: lo dulce va por categoría y lo salado
 *  de toppings y decorar va junto en la suya. */
function deBandeja(e, pestana) {
  if (pestana === 'top_salado') return disponiblesDe(true, e, 'crujiente', 'frio');
  if (pestana === 'deco_salada') return disponiblesDe(true, e, 'salsa', 'decoracion');
  return disponiblesDe(pestana === 'salado', e, pestana);
}

// Tiempos de cocción (segundos) y qué tan ancha es la zona perfecta
// según la dificultad. ventana 0.15 = ±15% del tiempo ideal.
const COCCION = {
  relajado: { t1: 7, t2: 5, ventana: 0.25 },
  normal: { t1: 6, t2: 4, ventana: 0.15 },
  desafio: { t1: 5, t2: 3.5, ventana: 0.1 },
};
const V_MAX = 1.6;          // en la barra: 1.6 veces el tiempo ideal = carbón
const MAX_PORCIONES = 3;    // de cada ingrediente
const MAX_TRAZOS = 40;      // trazos de salsa por crepa

let raiz, $esc, $panel, $instr, plancha;
let etapa = 'masa';
let crepa = null;            // la crepa que se está preparando
let seleccion = null;        // ingrediente elegido en la bandeja
let coccion = null;          // { lado, inicio, v1, v2, params }
let rafId = 0;
let pedidoActivo = null;     // número de comanda que se está preparando
let trazo = null;            // salsa que se está dibujando { id, tramos: [[x,y]...] }
// Pestañita elegida en cada bandeja (y la primera de cada sabor)
const DULCE = { relleno: 'untable', toppings: 'crujiente', decorar: 'salsa' };
const SALADA = { relleno: 'salado', toppings: 'top_salado', decorar: 'deco_salada' };
const categoria = { ...DULCE };

const $ = (sel) => raiz.querySelector(sel);

// ============================================================
//  Montaje
// ============================================================

export function montar(contenedor) {
  raiz = contenedor;
  raiz.innerHTML = `
    <div class="cocina">
      <div class="riel" id="riel-comandas"></div>

      <div class="repisa">${svgRepisa()}</div>

      <div class="mostrador-cocina">
        <div class="escenario" id="escenario">
          <button class="etiqueta-pedido" id="etiqueta-pedido" hidden></button>
          <div class="capa-plancha">${svgPlancha()}</div>
          <div class="capa-plato">${svgPlato()}</div>
          <span class="vapor"></span><span class="vapor"></span><span class="vapor"></span>
          <div class="doblada" id="doblada"></div>
          <svg class="capa-trazo" id="capa-trazo" viewBox="0 0 200 200" aria-hidden="true"></svg>
          <div class="rastra" id="rastra" hidden>${svgRastra()}</div>
        </div>
        <div class="panel-estacion" id="panel">
          <p class="instruccion" id="instruccion"></p>
          <div id="controles"></div>
        </div>
        <button class="btn-menu-cocina" id="btn-menu" aria-label="Menú de la casa">📖 Menú</button>
        <button class="btn-ayuda-cocina" id="btn-ayuda" aria-label="Ayuda">?</button>
        <button class="charola-cocina" id="btn-charola">📦 Charola: 0</button>
      </div>

      <div class="estaciones" id="estaciones">
        ${ESTACIONES.map((e, i) => `
          <div class="estacion" data-estacion="${e.id}">
            <span class="num">${i + 1}</span>${e.nombre}
          </div>`).join('')}
      </div>
    </div>`;

  $esc = $('#escenario');
  $panel = $('#controles');
  $instr = $('#instruccion');
  plancha = new Plancha($esc);

  $esc.addEventListener('pointerdown', alTocar);
  $esc.addEventListener('pointermove', alMover);
  $esc.addEventListener('pointerup', alSoltar);
  $esc.addEventListener('pointercancel', alSoltar);
  $('#btn-charola').addEventListener('click', verCharola);
  $('#btn-menu').addEventListener('click', verMenu);
  $('#btn-ayuda').addEventListener('click', () => window.dispatchEvent(new Event('ayuda')));
  const etiqueta = $('#etiqueta-pedido');
  etiqueta.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  etiqueta.addEventListener('click', (ev) => { ev.stopPropagation(); verComanda(pedidoActivo); });

  on('cambio', () => { pintarRiel(); pintarCharola(); });
  on('tic', pacienciaRiel);
  nuevaCrepa();
  pintarCharola();
  pintarRiel();
}

export function alMostrar() { plancha.pintar(); }
export function alOcultar() {}

// ============================================================
//  Flujo de estaciones
// ============================================================

function nuevaCrepa() {
  crepa = {
    id: Date.now().toString(36),
    semilla: Math.floor(Math.random() * 1e6),
    masa: 'masa_clasica',
    forma: 0,
    coccion: { lado1: 0, lado2: 0, puntaje: 0, etiqueta: '' },
    rellenos: {},
    doblado: null,
    adornos: [],
  };
  seleccion = null;
  trazo = null;
  plancha.masa = crepa.masa;
  plancha.reiniciar();
  $esc.classList.remove('en-plato', 'quemandose', 'doblando');
  $('#doblada').innerHTML = '';
  $('#capa-trazo').innerHTML = '';
  irA('masa');
}

function irA(nueva) {
  etapa = nueva;
  seleccion = null;
  $esc.dataset.etapa = etapa;
  // Pintar la fila de estaciones
  const orden = ESTACIONES.map((e) => e.id);
  const idx = orden.indexOf(etapa);
  raiz.querySelectorAll('.estacion').forEach((el) => {
    const i = orden.indexOf(el.dataset.estacion);
    el.classList.toggle('actual', i === idx);
    el.classList.toggle('hecha', i < idx);
  });
  raiz.querySelector('.estacion.actual')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });

  // Si la comanda que se prepara es de otro sabor, la bandeja abre en el suyo
  const pedido = comandas().find((c) => c.numero === pedidoActivo)?.pedido;
  if (pedido && DULCE[etapa] && !!pedido.salado !== (categoria[etapa] === SALADA[etapa])) {
    categoria[etapa] = pedido.salado ? SALADA[etapa] : DULCE[etapa];
  }

  ({
    masa: panelMasa, coccion: panelCoccion, relleno: panelBandeja, doblado: panelDoblado,
    toppings: panelBandeja, decorar: panelBandeja, entrega: panelEntrega,
  })[etapa]();
}

/** Pone botones en el panel. botones: [{texto, clase, id, alTocar}] */
function botones(lista) {
  const fila = document.createElement('div');
  fila.className = 'fila-botones';
  for (const b of lista) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.clase || '');
    if (b.id) btn.id = b.id;
    btn.innerHTML = b.texto;
    btn.addEventListener('click', () => { sonidos.click(); b.alTocar(); });
    fila.appendChild(btn);
  }
  return fila;
}

/** Redibuja la crepa doblada con todo lo que lleva encima. */
function pintarDoblada() {
  $('#doblada').innerHTML = crepaDoblada(crepa);
}

/** Coordenadas del dibujo (0..200) desde un evento de puntero. */
function a200(ev) {
  const r = $esc.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * 200, y: ((ev.clientY - r.top) / r.height) * 200 };
}

// ------------------------------------------------------------
//  1) MASA: tocar para verter, arrastrar en círculos para extender
// ------------------------------------------------------------

let arrastrando = false, ultimoPunto = null, pendienteMedir = false;

function panelMasa() {
  $instr.textContent = 'Toca el centro de la plancha para verter la masa 🥄';
  const masas = disponibles(estado(), 'masa');
  $panel.innerHTML = `
    ${masas.length > 1 ? `<div class="chips-masa">${masas.map((m) => `
      <button class="chip-masa${m.id === crepa.masa ? ' elegido' : ''}" data-id="${m.id}">${iconoIngrediente(m.id)}${m.nombre.replace(/^Masa (de )?/, '')}</button>`).join('')}
    </div>` : ''}
    <div class="medidores">
      <div class="medidor"><span>Masa</span><div class="barrita"><i id="m-masa" style="width:100%"></i></div></div>
      <div class="medidor"><span>Redondez</span><b id="m-forma">—</b></div>
    </div>`;
  $panel.appendChild(botones([
    { texto: '↺ Otra vez', alTocar: () => { plancha.reiniciar(); panelMasa(); } },
    { texto: '¡A cocinar! 🔥', clase: 'btn-primario', id: 'btn-cocinar', alTocar: empezarCoccion },
  ]));
  $panel.querySelectorAll('.chip-masa').forEach((b) => b.addEventListener('click', () => cambiarMasa(b.dataset.id)));
  actualizarMedidoresMasa();
}

/** Elegir otra masa: si ya habías vertido, se empieza de nuevo. */
function cambiarMasa(id) {
  if (id === crepa.masa) return;
  sonidos.click();
  crepa.masa = id;
  plancha.masa = id;
  if (plancha.vertida) plancha.reiniciar(); else plancha.pintar();
  panelMasa();
}

function actualizarMedidoresMasa() {
  const listo = plancha.vertida && (plancha.forma > 0.35 || plancha.masaRestante <= 0.02);
  const btn = $('#btn-cocinar');
  if (btn) btn.disabled = !listo;
  if (!plancha.vertida) return;
  $('#m-masa').style.width = Math.round(plancha.masaRestante * 100) + '%';
  $('#m-forma').textContent = Math.round(plancha.forma * 100) + '%';
}

function radioRastra() {
  // Mejora "Esparcidor profesional" (Fase 6) hace la rastra más ancha
  return 15 + 3 * (estado().mejoras.esparcidor || 0);
}

function moverRastra(ev, angulo) {
  const r = $esc.getBoundingClientRect();
  const el = $('#rastra');
  el.hidden = false;
  el.style.transform = `translate(${ev.clientX - r.left}px, ${ev.clientY - r.top}px) rotate(${angulo}rad)`;
}

// ------------------------------------------------------------
//  2) COCCIÓN: barra con zona perfecta, voltear a tiempo
// ------------------------------------------------------------

function empezarCoccion() {
  crepa.forma = plancha.forma;
  const base = COCCION[estado().ajustes.dificultad] || COCCION.normal;
  // La plancha profesional ensancha la zona perfecta
  const params = { ...base, ventana: Math.min(0.4, base.ventana * multVentana(estado())) };
  coccion = { lado: 1, inicio: performance.now(), v1: 0, v2: 0, params, alarma: false };
  sonidos.chisporroteo();
  irA('coccion');
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(cicloCoccion);
}

function panelCoccion() {
  const { ventana } = coccion.params;
  const pct = (v) => (v / V_MAX) * 100;
  $panel.innerHTML = `
    <div class="barra-coccion">
      <div class="zona cruda" style="width:${pct(1 - ventana)}%"></div>
      <div class="zona perfecta" style="width:${pct(2 * ventana)}%"></div>
      <div class="zona dorada" style="width:${pct(0.2)}%"></div>
      <div class="zona quemada" style="flex:1"></div>
      <div class="aguja" id="aguja"></div>
    </div>
    <div class="leyenda-coccion"><span>Cruda</span><span class="centro" style="left:${pct(1)}%">✨ Perfecta</span><span>Quemada</span></div>`;
  $panel.appendChild(botones([
    { texto: coccion.lado === 1 ? '¡Voltear! 🍳' : 'Sacar de la plancha ✋', clase: 'btn-primario btn-grande', alTocar: accionCoccion },
  ]));
  $instr.textContent = coccion.lado === 1
    ? 'Cuando las orillas se vean doraditas y salgan burbujitas... ¡voltéala!'
    : 'El segundo lado se cocina más rápido. ¡Sácala a tiempo!';
}

function vActual(ahora = performance.now()) {
  const { lado, inicio, params } = coccion;
  const t = (ahora - inicio) / 1000;
  return Math.min(V_MAX, t / (lado === 1 ? params.t1 : params.t2));
}

function cicloCoccion(ahora) {
  if (etapa !== 'coccion') return;
  const v = vActual(ahora);
  if (coccion.lado === 1) coccion.v1 = v; else coccion.v2 = v;

  const aguja = $('#aguja');
  if (aguja) aguja.style.left = (v / V_MAX) * 100 + '%';
  // Temporizador asistido: alarmita al entrar a la zona perfecta
  if (nivel(estado(), 'temporizador') && !coccion.alarma && v >= 1 - coccion.params.ventana) {
    coccion.alarma = true;
    sonidos.alarma();
    $('.barra-coccion')?.classList.add('alerta');
  }
  $esc.classList.toggle('quemandose', v > 1 + coccion.params.ventana + 0.15);

  // Solo redibujamos la crepa si la cocina está a la vista
  if (raiz.classList.contains('activa')) {
    plancha.ver({ modo: coccion.lado === 1 ? 'lado1' : 'lado2', v1: coccion.v1, v2: coccion.v2 });
  }
  rafId = requestAnimationFrame(cicloCoccion);
}

/** Calificación de un lado (0..1) */
function puntajeLado(v, ventana) {
  const lo = 1 - ventana, hi = 1 + ventana;
  if (v < lo) return Math.pow(v / lo, 1.5);
  if (v <= hi) return 1;
  return Math.max(0, 1 - (v - hi) / (V_MAX - hi));
}

function comentarioLado(v, ventana) {
  if (v < 1 - ventana) return v < 0.6 ? '¡Uy, todavía estaba cruda!' : 'Le faltó tantito';
  if (v <= 1 + ventana) return '¡Lado perfecto! ✨';
  if (v <= 1 + ventana + 0.2) return 'Quedó un poquito tostada';
  return '¡Se quemó! 🔥';
}

function accionCoccion() {
  const { ventana } = coccion.params;
  if (coccion.lado === 1) {
    coccion.v1 = vActual();
    aviso(comentarioLado(coccion.v1, ventana));
    // Animación de volteo: a la mitad se refleja la crepa
    $esc.classList.add('volteando');
    sonidos.voltear();
    sonidos.chisporroteo();
    setTimeout(() => {
      plancha.voltear();
      plancha.ver({ modo: 'lado2', v1: coccion.v1, v2: 0 });
    }, 200);
    setTimeout(() => $esc.classList.remove('volteando'), 420);
    coccion.lado = 2;
    coccion.inicio = performance.now();
    panelCoccion();
  } else {
    coccion.v2 = vActual();
    cancelAnimationFrame(rafId);
    aviso(comentarioLado(coccion.v2, ventana));
    const p1 = puntajeLado(coccion.v1, ventana);
    const p2 = puntajeLado(coccion.v2, ventana);
    const peor = coccion.v1 < 1 - ventana || coccion.v2 < 1 - ventana ? 'cruda'
      : Math.max(coccion.v1, coccion.v2) > 1 + ventana + 0.2 ? 'quemada'
      : Math.max(coccion.v1, coccion.v2) > 1 + ventana ? 'muy dorada' : 'perfecta';
    crepa.coccion = { lado1: coccion.v1, lado2: coccion.v2, puntaje: (p1 + p2) / 2, etiqueta: peor };
    $esc.classList.remove('quemandose');
    $esc.classList.add('en-plato');
    plancha.ver({ modo: 'plato', v1: coccion.v1, v2: coccion.v2 });
    irA('relleno');
  }
}

// ------------------------------------------------------------
//  3) RELLENO, 5) TOPPINGS y 6) DECORAR: bandeja de ingredientes
//     Relleno: se ponen sobre la crepa abierta (en el plato).
//     Toppings y Decorar: sobre la crepa ya doblada.
//     Las salsas se dibujan arrastrando el dedo.
// ------------------------------------------------------------

const SIGUIENTE = {
  relleno: { texto: 'Doblar →', ir: 'doblado' },
  toppings: { texto: 'Decorar →', ir: 'decorar' },
  decorar: { texto: 'Terminar →', ir: 'entrega' },
};
const INSTRUCCION_BASE = {
  relleno: 'Elige un relleno y toca la crepa para ponerlo',
  toppings: 'Elige un topping y toca la crepa para ponerlo encima',
  decorar: 'Elige una salsa y dibuja con el dedo, o espolvorea algo',
};

function panelBandeja() {
  const est = etapa;
  $instr.textContent = INSTRUCCION_BASE[est];
  $panel.innerHTML = '';

  // Pestañitas de categoría
  const tabs = document.createElement('div');
  tabs.className = 'tabs-bandeja';
  for (const [cat, nombre] of BANDEJAS[est]) {
    if (!deBandeja(estado(), cat).length) continue; // lo salado aparece hasta que se desbloquea
    const b = document.createElement('button');
    b.className = 'tab-bandeja' + (cat === categoria[est] ? ' activa' : '');
    b.textContent = nombre;
    b.addEventListener('click', () => {
      sonidos.click();
      categoria[est] = cat;
      seleccion = null;
      panelBandeja();
    });
    tabs.appendChild(b);
  }
  $panel.appendChild(tabs);

  // Ingredientes de la categoría elegida
  const bandeja = document.createElement('div');
  bandeja.className = 'bandeja-ingredientes';
  for (const ing of deBandeja(estado(), categoria[est])) {
    const b = document.createElement('button');
    b.className = 'btn-ingrediente';
    b.dataset.id = ing.id;
    b.innerHTML = `${iconoIngrediente(ing.id)}<span>${ing.nombre}</span><b class="cuenta" hidden>0</b>`;
    b.addEventListener('click', () => {
      sonidos.click();
      seleccion = seleccion === ing.id ? null : ing.id;
      pintarBandeja();
    });
    bandeja.appendChild(b);
  }
  $panel.appendChild(bandeja);

  const lista = [{ texto: '↶ Deshacer', alTocar: deshacer }];
  if (est === 'decorar') lista.push({ texto: '← Toppings', alTocar: () => irA('toppings') });
  lista.push({ texto: SIGUIENTE[est].texto, clase: 'btn-primario', alTocar: () => irA(SIGUIENTE[est].ir) });
  $panel.appendChild(botones(lista));
  pintarBandeja();
}

/** Marca el ingrediente elegido y cuántas porciones lleva cada uno. */
function pintarBandeja() {
  const { toppings, salsas } = conteoAdornos(crepa);
  raiz.querySelectorAll('.btn-ingrediente').forEach((b) => {
    const id = b.dataset.id;
    const esSalsa = ingrediente(id).categoria === 'salsa';
    const n = etapa === 'relleno' ? crepa.rellenos[id] || 0 : esSalsa ? (salsas[id] ? 1 : 0) : toppings[id] || 0;
    b.classList.toggle('elegido', id === seleccion);
    const c = b.querySelector('.cuenta');
    c.hidden = n === 0;
    c.textContent = esSalsa ? '✓' : '×' + n;
  });
  if (!seleccion) return;
  const ing = ingrediente(seleccion);
  const nombre = nombreEnFrase(ing.id);
  $instr.textContent =
    ing.categoria === 'salsa' ? `Arrastra el dedo sobre la crepa para dibujar con ${nombre} 〰️`
    : ing.forma === 'polvo' ? `Toca la crepa para espolvorear ${nombre} ❄️`
    : etapa === 'relleno' ? `Toca la crepa para poner ${nombre}`
    : `Toca la crepa para poner ${nombre} encima`;
}

function ponerRelleno(p) {
  if (!seleccion) { aviso('Primero elige un ingrediente 👇'); return; }
  if (!plancha.hayMasa(p)) { aviso('¡Ponlo encima de la crepa!'); return; }
  const n = crepa.rellenos[seleccion] || 0;
  if (n >= MAX_PORCIONES) { aviso(`Ya tiene suficiente ${nombreEnFrase(seleccion)}`); return; }
  crepa.rellenos[seleccion] = n + 1;
  plancha.agregarRelleno(seleccion, p);
  sonidos.pop();
  pintarBandeja();
}

/** Toppings, azúcar glass, canela, menta: una porción donde tocó. */
function ponerPieza(ev) {
  if (!seleccion) { aviso('Primero elige un ingrediente 👇'); return; }
  const { x, y } = a200(ev);
  if (!sobreLaCrepa(crepa.doblado, x, y)) { aviso('¡Ponlo encima de la crepa!'); return; }
  const n = conteoAdornos(crepa).toppings[seleccion] || 0;
  if (n >= MAX_PORCIONES) { aviso(`Ya tiene suficiente ${nombreEnFrase(seleccion)}`); return; }
  crepa.adornos.push({ t: 'p', e: etapa, id: seleccion, x: Math.round(x), y: Math.round(y), s: Math.floor(Math.random() * 1e6) });
  pintarDoblada();
  if (ingrediente(seleccion).forma === 'polvo') { sonidos.espolvorear(); polvito(ev, ingrediente(seleccion).color); }
  else sonidos.pop();
  pintarBandeja();
}

/** Partículas que caen al espolvorear (azúcar glass, canela). */
function polvito(ev, color) {
  const r = $esc.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i');
    p.className = 'particula';
    p.style.background = color;
    p.style.left = ev.clientX - r.left + (Math.random() - 0.5) * 40 + 'px';
    p.style.top = ev.clientY - r.top - 30 - Math.random() * 20 + 'px';
    p.style.animationDelay = Math.random() * 0.25 + 's';
    $esc.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}

// ----- Salsas dibujadas con el dedo -----

function empezarTrazo(ev) {
  if (crepa.adornos.filter((a) => a.t === 's').length >= MAX_TRAZOS) { aviso('¡Ya tiene muchísima salsa! 😅'); return; }
  $esc.setPointerCapture(ev.pointerId);
  trazo = { id: seleccion, tramos: [] };
  sonidos.salsa();
  seguirTrazo(ev);
}

function seguirTrazo(ev) {
  const { x, y } = a200(ev);
  const tramos = trazo.tramos;
  const actual = tramos[tramos.length - 1];
  if (!sobreLaCrepa(crepa.doblado, x, y)) {
    // Fuera de la crepa no cae salsa: se corta el trazo
    if (actual && actual.length) tramos.push([]);
    return;
  }
  if (!actual) { tramos.push([[x, y]]); }
  else {
    const ult = actual[actual.length - 1];
    if (ult && Math.hypot(x - ult[0], y - ult[1]) < 3) return; // menos puntos = guardado más ligero
    actual.push([x, y]);
  }
  pintarTrazoVivo();
}

/** Convierte los tramos en un path SVG y mide su largo. */
function trazoAPath(tramos) {
  let d = '', largo = 0;
  for (const t of tramos) {
    if (!t.length) continue;
    d += `M${Math.round(t[0][0])} ${Math.round(t[0][1])}`;
    if (t.length === 1) d += 'l0.1 0'; // una gotita
    for (let i = 1; i < t.length; i++) {
      d += `L${Math.round(t[i][0])} ${Math.round(t[i][1])}`;
      largo += Math.hypot(t[i][0] - t[i - 1][0], t[i][1] - t[i - 1][1]);
    }
    largo += 4; // cada gotita cuenta un poquito
  }
  return { d, largo: Math.round(largo) };
}

let pendienteTrazo = false;
function pintarTrazoVivo() {
  if (pendienteTrazo) return;
  pendienteTrazo = true;
  requestAnimationFrame(() => {
    pendienteTrazo = false;
    if (!trazo) return;
    $('#capa-trazo').innerHTML = trazoSalsa(trazo.id, trazoAPath(trazo.tramos).d);
  });
}

function terminarTrazo() {
  const { d, largo } = trazoAPath(trazo.tramos);
  if (d) {
    crepa.adornos.push({ t: 's', e: 'decorar', id: trazo.id, d, largo });
    pintarDoblada();
    pintarBandeja();
  } else {
    aviso('¡Dibuja encima de la crepa!');
  }
  trazo = null;
  $('#capa-trazo').innerHTML = '';
}

/** Deshace lo último que se puso en ESTA estación. */
function deshacer() {
  if (etapa === 'relleno') {
    const r = plancha.quitarUltimoRelleno();
    if (!r) return;
    crepa.rellenos[r.id]--;
    if (!crepa.rellenos[r.id]) delete crepa.rellenos[r.id];
  } else {
    const ult = crepa.adornos[crepa.adornos.length - 1];
    if (!ult || ult.e !== etapa) return;
    crepa.adornos.pop();
    pintarDoblada();
  }
  pintarBandeja();
}

// ------------------------------------------------------------
//  4) DOBLADO
// ------------------------------------------------------------

function panelDoblado() {
  $instr.textContent = '¿Cómo la doblamos?';
  $panel.innerHTML = `<div class="opciones-doblado">
    ${DOBLADOS.map((d) => {
      const ok = dobladoDisponible(d.id, estado());
      return `<button class="btn-doblado${ok ? '' : ' bloqueado'}" data-id="${d.id}" data-ok="${ok}">${iconoDoblado(d.id)}<span>${ok ? '' : '🔒 '}${d.nombre}</span></button>`;
    }).join('')}
  </div>`;
  $panel.querySelectorAll('.btn-doblado').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.ok !== 'true') {
      const m = MEJORAS.find((x) => x.id === DOBLADOS.find((d) => d.id === b.dataset.id).mejora);
      aviso(`🔒 Cómpralo en la tienda: ${m.nombre}`);
      return;
    }
    doblar(b.dataset.id);
  }));
  $panel.appendChild(botones([
    { texto: '← Rellenar más', alTocar: () => { crepa.doblado = null; crepa.adornos = []; $esc.classList.remove('doblando'); irA('relleno'); } },
    { texto: 'Toppings →', clase: 'btn-primario', id: 'btn-doblado-listo', alTocar: () => irA('toppings') },
  ]));
  $('#btn-doblado-listo').disabled = !crepa.doblado;
  marcarDoblado();
}

function doblar(estilo) {
  sonidos.doblar();
  crepa.doblado = estilo;
  crepa.adornos = []; // si cambia de doblado, lo de encima ya no cuadra
  pintarDoblada();
  $esc.classList.remove('doblando');
  void $esc.offsetWidth; // reinicia la animación
  $esc.classList.add('doblando');
  $('#btn-doblado-listo').disabled = false;
  marcarDoblado();
}

function marcarDoblado() {
  $panel.querySelectorAll('.btn-doblado').forEach((b) => b.classList.toggle('elegido', b.dataset.id === crepa.doblado));
}

// ------------------------------------------------------------
//  7) ENTREGA: resumen y mandar a la charola
// ------------------------------------------------------------

/** "Nutella ×2, fresa" */
function listaNombres(obj) {
  return Object.entries(obj).map(([id, n]) => `${ingrediente(id)?.nombre}${n > 1 ? ' ×' + n : ''}`).join(', ');
}

function panelEntrega() {
  $instr.textContent = '¡Lista! Mándala a la charola para entregarla en Venta.';
  const { toppings, salsas } = conteoAdornos(crepa);
  const doblado = DOBLADOS.find((d) => d.id === crepa.doblado)?.nombre;
  const encima = [listaNombres(toppings), Object.keys(salsas).map((id) => ingrediente(id).nombre).join(', ')].filter(Boolean).join(', ');
  $panel.innerHTML = `
    <div class="resumen-crepa">
      <span>🥣 ${ingrediente(crepa.masa).nombre.replace('Masa ', '')}</span>
      <span>🥞 Forma <b>${Math.round(crepa.forma * 100)}%</b></span>
      <span>🔥 ${crepa.coccion.etiqueta}</span>
      <span>📐 ${doblado}</span>
      <span class="ancho">🍓 ${listaNombres(crepa.rellenos) || 'Sin relleno'}</span>
      ${encima ? `<span class="ancho">🍨 ${encima}</span>` : ''}
    </div>`;
  $panel.appendChild(botones([
    { texto: '🗑️ Tirar', clase: 'btn-peligro', alTocar: tirarCrepa },
    { texto: 'A la charola 📦', clase: 'btn-primario', alTocar: mandarACharola },
  ]));
}

async function tirarCrepa() {
  if (await confirmar('¿Tirar esta crepa?', 'Empezarás una nueva desde la masa.', 'Sí, tirarla')) nuevaCrepa();
}

/** Si está activado el costo de insumos, cada crepa descuenta lo que costó hacerla. */
function cobrarInsumos() {
  const e = estado();
  if (!e.ajustes.costoInsumos) return;
  const { toppings, salsas } = conteoAdornos(crepa);
  let costo = ingrediente(crepa.masa).costo;
  for (const [id, n] of Object.entries({ ...crepa.rellenos, ...toppings })) costo += ingrediente(id).costo * n;
  for (const id of Object.keys(salsas)) costo += ingrediente(id).costo;
  actualizar((s) => { s.dinero -= costo; s.hoy.insumos += costo; });
  aviso(`🧾 Insumos: -$${costo}`);
}

function mandarACharola() {
  if (estado().charola.length >= capacidadCharola(estado())) {
    aviso('La charola está llena. ¡Entrega crepas en Venta!');
    return;
  }
  cobrarInsumos();
  // Se guarda sin la marca de estación (no hace falta en la charola)
  const adornos = crepa.adornos.map(({ e, ...resto }) => resto);
  const lista = { ...crepa, adornos, pedido: pedidoActivo, hechaEn: Date.now() };
  pedidoActivo = null;
  actualizar((e) => { e.charola.push(lista); });
  sonidos.ching();
  $esc.classList.add('enviando');
  setTimeout(() => {
    $esc.classList.remove('enviando');
    pintarCharola();
    pintarRiel();
    aviso(lista.pedido ? `¡Crepa #${lista.pedido} lista! Entrégala en Venta 🛎️` : '¡Crepa en la charola! 📦');
    nuevaCrepa();
  }, 450);
}

// ============================================================
//  Riel de comandas (pedidos tomados en Venta)
// ============================================================

function pintarRiel() {
  const riel = $('#riel-comandas');
  const lista = comandas();
  if (pedidoActivo && !lista.some((c) => c.numero === pedidoActivo)) pedidoActivo = null;
  if (!lista.length) {
    riel.innerHTML = '<span class="riel-vacio">🧾 Sin pedidos: toma pedidos en Venta</span>';
  } else {
    const enCharola = new Set(estado().charola.map((c) => c.pedido));
    riel.innerHTML = lista.map((c) => `
      <button class="comanda${c.numero === pedidoActivo ? ' activa' : ''}${enCharola.has(c.numero) ? ' lista' : ''}" data-num="${c.numero}">
        <span class="pinza"></span>
        <b>#${c.numero}${tipoDe(c).id !== 'normal' && tipoDe(c).id !== 'tranquilo' ? ' ' + tipoDe(c).emoji : ''}</b>
        <span class="ticket-iconos">${iconosPedido(c.pedido, 6)}</span>
        <i class="pac"></i>
      </button>`).join('');
    riel.querySelectorAll('.comanda').forEach((b) => b.addEventListener('click', () => {
      sonidos.click();
      const n = Number(b.dataset.num);
      // Primer toque: la empiezas a preparar. Segundo toque: ves el detalle.
      if (pedidoActivo === n) { verComanda(n); return; }
      pedidoActivo = n;
      aviso(`Preparando la comanda #${n} 📌 (tócala otra vez para ver el detalle)`);
      pintarRiel();
    }));
    pacienciaRiel();
  }
  const et = $('#etiqueta-pedido');
  et.hidden = !pedidoActivo;
  et.textContent = pedidoActivo ? `📌 #${pedidoActivo}` : '';
}

/** Ventana con el detalle completo de una comanda. */
async function verComanda(n) {
  const c = comandas().find((x) => x.numero === n);
  if (!c) return;
  const tipo = tipoDe(c);
  const quien = c.nombre ? `${tipo.emoji} ${c.nombre}` : tipo.id === 'normal' ? '' : `${tipo.emoji} ${tipo.nombre}`;
  const v = await mostrarModal({
    titulo: `🧾 Comanda #${n}`,
    contenido: `
      ${quien ? `<p class="det-quien">${quien}${tipo.nota ? ` · <small>${tipo.nota}</small>` : ''}</p>` : ''}
      <p class="det-texto">“Una crepa ${describirPedido(c.pedido)}”</p>
      ${ticketDetalle(c.pedido)}`,
    botones: [
      ...(pedidoActivo === n ? [{ texto: 'Ya no preparar', valor: 'soltar' }] : []),
      { texto: 'Entendido', clase: 'btn-primario' },
    ],
  });
  if (v === 'soltar') { pedidoActivo = null; pintarRiel(); }
}

function pacienciaRiel() {
  for (const c of comandas()) {
    const i = raiz.querySelector(`.comanda[data-num="${c.numero}"] .pac`);
    if (!i) continue;
    const p = Math.max(0, c.paciencia / c.pacienciaMax);
    i.style.width = p * 100 + '%';
    i.style.background = p > 0.5 ? '#2BD07A' : p > 0.25 ? '#FFB020' : '#FF3B3B';
  }
}

// ============================================================
//  Menú de la casa (recetas e ingredientes)
// ============================================================

function verMenu() {
  sonidos.click();
  const e = estado();
  const tarjeta = (c) => {
    const ok = comboDisponible(c, e);
    const pedido = { masa: c.masa || 'masa_clasica', rellenos: c.rellenos, toppings: c.toppings, salsas: c.salsas, doblado: c.doblado };
    return `
      <div class="menu-combo${ok ? '' : ' bloqueado'}">
        <div class="menu-combo-cabeza"><b>${ok ? '' : '🔒 '}${c.nombre}</b><small>${c.descripcion}</small></div>
        <div class="ticket-iconos">${iconosPedido(pedido)}</div>
      </div>`;
  };
  const dulces = COMBOS.filter((c) => !c.salado).map(tarjeta).join('');
  const saladas = COMBOS.filter((c) => c.salado).map(tarjeta).join('');
  const nombresCat = { masa: '🥣 Masas', untable: '🫙 Untables', fruta: '🍓 Frutas', salado: '🧀 Salados', crujiente: '🥜 Crujientes', frio: '🍨 Fríos', salsa: '〰️ Salsas', decoracion: '✨ Decoración' };
  if (disponibles(e, 'bebida').length) nombresCat.bebida = '☕ Bebidas';
  const ingredientes = Object.entries(nombresCat).map(([cat, titulo]) => `
    <h3 class="menu-titulo">${titulo}</h3>
    ${INGREDIENTES.filter((i) => i.categoria === cat).map((i) => {
      const ok = estaDisponible(i.id, e);
      return `<div class="menu-ing${ok ? '' : ' bloqueado'}">${iconoIngrediente(i.id)}
        <span><b>${i.nombre}</b><small>${ok ? i.descripcion : `🔒 Llega el día ${i.dia}`}</small></span></div>`;
    }).join('')}`).join('');
  mostrarModal({
    titulo: '📖 Menú de la casa',
    contenido: `<div class="menu-casa">
      <h3 class="menu-titulo">🥞 Crepas dulces de la casa</h3>${dulces}
      <h3 class="menu-titulo">🧀 Crepas saladas de la casa</h3>${saladas}
      <p class="menu-nota">Los clientes también piden cambios: “sin plátano”, “doble Nutella”, “extra crema”… ¡revisa bien el ticket!</p>
      ${ingredientes}
    </div>`,
    botones: [{ texto: 'Cerrar', clase: 'btn-primario' }],
  });
}

// ============================================================
//  Charola
// ============================================================

function pintarCharola() {
  const n = estado().charola.length;
  $('#btn-charola').textContent = `📦 Charola: ${n}/${capacidadCharola(estado())}`;
}

function verCharola() {
  sonidos.click();
  const lista = estado().charola;
  const cont = document.createElement('div');
  if (!lista.length) {
    cont.innerHTML = '<p style="text-align:center">Todavía no hay crepas terminadas.</p>';
  } else {
    cont.className = 'lista-charola';
    lista.forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'item-charola';
      const nombres = [...Object.keys(c.rellenos), ...Object.keys(conteoAdornos(c).toppings), ...Object.keys(conteoAdornos(c).salsas)];
      const texto = nombres.map((id) => ingrediente(id)?.nombre).join(', ') || 'Sin relleno';
      item.innerHTML = `${crepaDoblada(c)}<span>${c.pedido ? `<b>#${c.pedido}</b> · ` : ''}${texto}</span><button class="btn btn-peligro">Tirar</button>`;
      item.querySelector('button').addEventListener('click', () => {
        actualizar((e) => { e.charola.splice(i, 1); });
        pintarCharola();
        verCharola();
      });
      cont.appendChild(item);
    });
  }
  mostrarModal({ titulo: '📦 Charola', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
}

// ============================================================
//  Toques sobre el escenario (plancha / plato)
// ============================================================

function alTocar(ev) {
  const p = plancha.aMascara(ev);
  if (etapa === 'masa') {
    $esc.setPointerCapture(ev.pointerId);
    if (!plancha.vertida) {
      plancha.verter(p);
      plancha.ver({ modo: 'cruda' });
      sonidos.chisporroteo();
      $instr.textContent = 'Ahora arrastra en círculos para extenderla 🌀 (que quede redondita)';
      actualizarMedidoresMasa();
    }
    arrastrando = true;
    ultimoPunto = p;
    moverRastra(ev, 0);
  } else if (etapa === 'coccion') {
    accionCoccion();
  } else if (etapa === 'relleno') {
    ponerRelleno(p);
  } else if (etapa === 'toppings') {
    ponerPieza(ev);
  } else if (etapa === 'decorar') {
    if (seleccion && ingrediente(seleccion).categoria === 'salsa') empezarTrazo(ev);
    else ponerPieza(ev);
  }
}

function alMover(ev) {
  if (trazo) { seguirTrazo(ev); return; }
  if (!arrastrando || etapa !== 'masa') return;
  const p = plancha.aMascara(ev);
  const ang = Math.atan2(p.y - ultimoPunto.y, p.x - ultimoPunto.x) + Math.PI / 2;
  moverRastra(ev, ang);
  plancha.extender(ultimoPunto, p, radioRastra());
  ultimoPunto = p;
  // Medir y dibujar como máximo una vez por cuadro
  if (!pendienteMedir) {
    pendienteMedir = true;
    requestAnimationFrame(() => {
      pendienteMedir = false;
      plancha.medir();
      plancha.ver({ modo: 'cruda' });
      actualizarMedidoresMasa();
    });
  }
}

function alSoltar() {
  if (trazo) { terminarTrazo(); return; }
  if (!arrastrando) return;
  arrastrando = false;
  $('#rastra').hidden = true;
  plancha.medir();
  actualizarMedidoresMasa();
  if (plancha.masaRestante <= 0.02) $instr.textContent = 'Se acabó la masa del cucharón. ¡A cocinar!';
}

// ============================================================
//  Dibujos SVG del decorado
// ============================================================

/** Plancha de crepas vista desde arriba: base metálica + disco caliente. */
function svgPlancha() {
  return `
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="disco" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#5B5552"/>
        <stop offset="70%" stop-color="#3C3735"/>
        <stop offset="100%" stop-color="#2A2624"/>
      </radialGradient>
      <linearGradient id="aro" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#E7E2DE"/>
        <stop offset="100%" stop-color="#A69C95"/>
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="106" rx="98" ry="94" fill="rgba(27,42,85,0.18)"/>
    <circle cx="100" cy="100" r="98" fill="url(#aro)"/>
    <circle cx="100" cy="100" r="82" fill="url(#disco)"/>
    <!-- guía punteada: el tamaño ideal de la crepa -->
    <circle class="guia" cx="100" cy="100" r="70.5" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-dasharray="4 5"/>
    <path d="M45 70 A62 62 0 0 1 95 34" stroke="rgba(255,255,255,0.15)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="180" cy="176" r="11" fill="#E7E2DE" stroke="#A69C95" stroke-width="3"/>
    <rect x="178" y="167" width="4" height="9" rx="2" style="fill:var(--acento)"/>
    <circle cx="20" cy="176" r="5" fill="#FF8A5B"/>
  </svg>`;
}

/** Plato blanco donde se rellena y dobla la crepa. */
function svgPlato() {
  return `
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <ellipse cx="100" cy="106" rx="98" ry="94" fill="rgba(27,42,85,0.15)"/>
    <circle cx="100" cy="100" r="97" fill="#FFFFFF" stroke="#DDEEFF" stroke-width="2"/>
    <circle cx="100" cy="100" r="80" fill="#F6FAFF" stroke="#E6F0FF" stroke-width="2"/>
    <circle cx="100" cy="100" r="91" fill="none" style="stroke:var(--primario)" stroke-width="1.5" stroke-dasharray="2 6" opacity="0.6"/>
  </svg>`;
}

/** Rastra (esparcidor de madera en forma de T) */
function svgRastra() {
  return `
  <svg viewBox="-40 -40 80 80" aria-hidden="true">
    <rect x="-30" y="-4" width="60" height="8" rx="4" fill="#D9A86C" stroke="#A9795A" stroke-width="1.5"/>
    <rect x="-3" y="-34" width="6" height="32" rx="3" fill="#C99A62" stroke="#A9795A" stroke-width="1.5"/>
  </svg>`;
}

/** Repisa con frascos de ingredientes (decorativa). */
function svgRepisa() {
  // Frascos: [x, ancho, alto, color del contenido, color de tapa]
  const frascos = [
    [20, 34, 40, '#6B3E2E', '#E8556B'],   // Nutella
    [62, 30, 34, '#C47A3A', '#F6B93B'],   // cajeta
    [100, 28, 44, '#E8556B', '#FFFFFF'],  // mermelada
    [150, 40, 30, '#FFF1D6', '#4FAF8A'],  // lechera
    [204, 30, 38, '#B7D36B', '#D99A4E'],  // pistache
    [246, 34, 42, '#D99A4E', '#6B3E2E'],  // Lotus
    [292, 30, 34, '#F7F2E8', '#F7B7C5'],  // chocolate blanco
    [332, 30, 40, '#3B2219', '#E7A35C'],  // chocolate oscuro
  ];
  const piezas = frascos.map(([x, w, h, c, t]) => `
    <g>
      <rect x="${x}" y="${58 - h}" width="${w}" height="${h}" rx="6" fill="rgba(255,255,255,0.6)" stroke="rgba(27,42,85,0.25)" stroke-width="1.5"/>
      <rect x="${x + 3}" y="${58 - h * 0.7}" width="${w - 6}" height="${h * 0.7 - 3}" rx="4" fill="${c}"/>
      <rect x="${x - 2}" y="${58 - h - 6}" width="${w + 4}" height="8" rx="3" fill="${t}"/>
      <rect x="${x + 6}" y="${58 - h * 0.5}" width="${w - 12}" height="8" rx="2" fill="rgba(255,255,255,0.85)"/>
    </g>`).join('');
  return `
  <svg viewBox="0 0 380 70" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${piezas}
    <rect x="0" y="58" width="380" height="9" rx="3" style="fill:var(--toldo)"/>
    <rect x="0" y="66" width="380" height="3" fill="rgba(27,42,85,0.2)"/>
  </svg>`;
}

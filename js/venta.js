/* ============================================================
   venta.js — pestaña VENTA.
   Ventanilla de la crepería: los clientes llegan caminando,
   piden (se toma la comanda), esperan con su barra de paciencia
   y al entregarles su crepa pagan en la caja.
   ============================================================ */
import { CONFIG } from './config.js';
import { estado, suscribir, actualizar } from './state.js';
import { mostrarModal, aviso, dinero, rebotar } from './ui.js';
import { sonidos } from './audio.js';
import { juego, on, abrir, tomarPedido, entregar, siguienteDia, diaTerminado, agregarBebida, LUGARES, MAX_BEBIDA } from './turno.js';
import { abrirTienda, abrirLogros } from './tienda.js';
import { INGREDIENTES, COMBOS, disponibles, comboDisponible } from './data/ingredientes.js';
import { nivel } from './data/mejoras.js';
import { evento } from './data/eventos.js';
import { LOGROS } from './data/logros.js';
import { revisarSorpresa, nombreCreperia } from './romance.js';
import { tieneNombre } from './ranking.js';
import { dibujarCliente, caraSVG, caraCliente, tipoDe } from './clientes.js';
import { textoChispitas } from './cartera.js';
import { conGenero } from './genero.js';
import { personaje, dibujarPersonaje } from './personaje.js';
import { abrirBoutique } from './boutique.js';
import { svgFachada, svgCalle, svgMostrador } from './escenario.js';
import { decoracion } from './local.js';
import { empezarSinFin, puedeJugarSinFin, rendirse } from './sinfin.js';
import { PESOS, NOMBRES_PARTES } from './calificacion.js';
import { crepaDoblada, iconosPedido, iconoIngrediente } from './dibujos.js';
import { IMPACIENCIA, SE_VA, GRACIAS, alAzar } from './data/mensajes.js';

let raiz = null, $zona = null;
const elementos = new Map();   // id de cliente → elemento en pantalla
const POS_LUGAR = [22, 50, 78]; // % horizontal de cada lugar frente al mostrador

/** Se llama una sola vez al arrancar el juego. */
export function montar(contenedor) {
  raiz = contenedor;
  raiz.innerHTML = `
    <div class="venta">
      <div class="fachada">
        <div id="svg-fachada"></div>
        <button class="btn-buzon" id="btn-buzon" aria-label="Buzón de reseñas">📬<span class="tab-globo" id="globo-buzon" hidden>0</span></button>
        <div class="botones-fachada">
          <button class="btn-buzon" id="btn-logros" aria-label="Logros">🏆</button>
          <button class="btn-buzon" id="btn-tienda" aria-label="Tienda">🛒</button>
          <button class="btn-buzon" id="btn-boutique" aria-label="Boutique">🛍️</button>
        </div>
      </div>
      <div class="zona-clientes" id="zona-clientes">
        <div class="calle" id="calle"></div>
        <div class="clima" id="clima"></div>
        <div class="chef-venta" id="chef-venta" hidden></div>
        <button class="pildora btn-rendirse" id="btn-rendirse" hidden>✖ Terminar</button>
        <div class="aviso-zona" id="aviso-zona"></div>
      </div>
      <div class="mostrador-venta">
        <div id="svg-mostrador"></div>
        <div class="charola-venta" id="charola-venta"></div>
        <div class="barra-bebidas" id="barra-bebidas" hidden></div>
      </div>
    </div>`;
  $zona = raiz.querySelector('#zona-clientes');

  on('cambio', sincronizar);
  on('tic', actualizarPaciencias);
  on('cobro', animarCobro);
  on('seVa', () => { sonidos.enojado(); });
  on('finDia', mostrarFinDia);
  on('bebidas', pintarBarraBebidas);
  on('horaPico', () => aviso('⏰ ¡Hora pico! Va a llegar mucha gente'));
  suscribir((e) => { pintarCharola(e); pintarBuzon(e); pintarDecorado(e); });
  // Se puso o quitó el código especial: cambia el nombre del letrero
  window.addEventListener('version:cambio', () => { pintarDecorado(); pintarAvisoZona(); });
  window.addEventListener('personaje:cambio', () => { chefPintado = false; pintarChef(); });
  window.addEventListener('local:cambio', () => pintarDecorado());
  raiz.querySelector('#btn-buzon').addEventListener('click', abrirBuzon);
  raiz.querySelector('#btn-logros').addEventListener('click', abrirLogros);
  raiz.querySelector('#btn-tienda').addEventListener('click', () => {
    if (juego.abierto) { aviso('🛒 La tienda abre cuando la crepería está cerrada (antes de abrir o al terminar el día)'); return; }
    abrirTienda();
  });
  raiz.querySelector('#btn-boutique').addEventListener('click', () => abrirBoutique());
  raiz.querySelector('#btn-rendirse').addEventListener('click', () => { sonidos.click(); rendirse(); });
  raiz.querySelector('#barra-bebidas').addEventListener('click', prepararBebida);
  raiz.querySelector('#svg-mostrador').addEventListener('click', (ev) => { if (ev.target.closest('#perrita')) acariciarPerrita(); });
  pintarDecorado();
  pintarCharola();
  pintarBuzon();
  sincronizar();
}

export function alMostrar() {}
export function alOcultar() {}

// ============================================================
//  Mensaje central (abrir / esperando / cerrando)
// ============================================================

function pintarAvisoZona() {
  const el = raiz.querySelector('#aviso-zona');
  const e = estado();
  if (!juego.abierto) {
    const texto = e.segundosTurno > 0 ? `Seguir con el día ${e.dia}` : `🔑 Abrir ${nombreCreperia()}`;
    const ev = evento(e.evento);
    el.innerHTML = `<button class="btn btn-primario btn-abrir" id="btn-abrir">${texto}</button>
      <span class="sub-abrir">Día ${e.dia}</span>
      ${ev ? `<div class="tarjeta-evento"><b>${ev.emoji} ${ev.nombre}</b><small>${ev.descripcion}</small></div>` : ''}
      ${puedeJugarSinFin() ? '<button class="btn btn-sinfin" id="btn-sinfin">♾️ Modo sin fin</button>' : ''}`;
    el.querySelector('#btn-abrir').addEventListener('click', () => {
      abrir();
      if (ev) aviso(`${ev.emoji} Hoy: ${ev.nombre}`);
    });
    el.querySelector('#btn-sinfin')?.addEventListener('click', () => empezarSinFin());
  } else if (e.sinfin) {
    el.innerHTML = '';
  } else if (diaTerminado()) {
    el.innerHTML = `<span class="pildora">🌙 Ya cerramos: atiende a los que faltan</span>`;
  } else if (juego.clientes.length === 0) {
    el.innerHTML = `<span class="pildora flotando">Esperando clientes... ☕</span>`;
  } else {
    el.innerHTML = '';
  }
}

// ============================================================
//  Clientes en pantalla
// ============================================================

/** Con la crepería cerrada, el chef espera detrás del mostrador. */
let chefPintado = false;
function pintarChef() {
  const el = raiz.querySelector('#chef-venta');
  const p = personaje();
  el.hidden = juego.abierto || !p;
  if (el.hidden || chefPintado) return;
  el.innerHTML = dibujarPersonaje(p, { vista: 'busto', emocion: 'feliz' });
  chefPintado = true;
}

function sincronizar() {
  pintarAvisoZona();
  pintarChef();
  raiz.querySelector('#btn-rendirse').hidden = !(estado().sinfin && juego.abierto);
  const vivos = new Set(juego.clientes.map((c) => c.id));

  // Quitar a los que ya se fueron
  for (const [id, el] of elementos) {
    if (!vivos.has(id)) { el.remove(); elementos.delete(id); }
  }
  // Crear o actualizar
  for (const c of juego.clientes) {
    let el = elementos.get(c.id);
    if (!el) el = crearElemento(c);
    actualizarElemento(c, el);
  }
}

function crearElemento(c) {
  const el = document.createElement('div');
  el.className = 'cliente caminando' + (c.tipo === 'nino' ? ' nino' : '');
  el.dataset.tipo = c.tipo; // cada tipo espera a su manera (ver escenas.css)
  el.style.left = (c.lugar < LUGARES / 2 ? -20 : 120) + '%'; // entra por el lado más cercano
  el.innerHTML = `
    <div class="sobre-cabeza"></div>
    <div class="cuerpo-cliente">${dibujarCliente(c, 'normal')}</div>`;
  el.addEventListener('click', () => alTocarCliente(c));
  $zona.appendChild(el);
  elementos.set(c.id, el);
  // Al siguiente cuadro empieza a caminar hacia su lugar
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = POS_LUGAR[c.lugar] + '%'; }));
  el.dataset.emocion = 'normal';
  return el;
}

function ponerEmocion(el, emocion) {
  if (el.dataset.emocion === emocion) return;
  el.dataset.emocion = emocion;
  el.querySelector('.cara').innerHTML = caraSVG(emocion);
}

function actualizarElemento(c, el) {
  const sobre = el.querySelector('.sobre-cabeza');
  if (el.dataset.estado === c.estado) return;
  el.dataset.estado = c.estado;

  switch (c.estado) {
    case 'llegando':
      sobre.innerHTML = '';
      break;
    case 'pidiendo':
      el.classList.remove('caminando');
      sobre.innerHTML = `<div class="globo globo-pedir">${insignia(c)} ¡Toca para pedir!</div>${barraPaciencia()}`;
      break;
    case 'esperando':
      sobre.innerHTML = `<div class="ticket-cabeza">🧾 #${c.numero}</div>${barraPaciencia()}`;
      break;
    case 'atendido':
      // Primero la prueba... y luego reacciona según la calificación
      ponerEmocion(el, 'normal');
      sobre.innerHTML = `<div class="globo">${alAzar(GRACIAS)}</div>`;
      setTimeout(() => reaccionar(c, el), 900);
      programarSalida(el, 3900);
      break;
    case 'enojado':
      ponerEmocion(el, Math.random() < 0.5 ? 'furioso' : 'molesto');
      el.classList.add('azotando');
      sobre.innerHTML = `<div class="globo globo-enojado">${alAzar(SE_VA)}</div>`;
      cerrarTarjeta(c);
      programarSalida(el);
      break;
  }
  actualizarPaciencias();
}

/** Cara, globo con su reseña y estrellas según qué tanto le gustó. */
function reaccionar(c, el) {
  const r = c.resultado;
  if (!r) return;
  ponerEmocion(el, r.emocion);
  const clase = c.novio || r.pct >= 70 ? '' : r.pct >= 50 ? ' globo-neutral' : ' globo-enojado';
  el.querySelector('.sobre-cabeza').innerHTML = `
    <div class="globo globo-resena${clase}">
      ${estrellitas(r.estrellas)}
      ${r.texto}
    </div>`;
  if (r.emocion === 'encantado') { el.classList.add('brinco'); corazones(el); sonidos.encantado(); }
  if (r.pct >= 95 || c.novio) confeti();
  else if (r.emocion === 'feliz') el.classList.add('brinco');
  else if (r.emocion === 'furioso') el.classList.add('azotando');
}

/** Confeti de colores para las crepas perfectas. */
function confeti() {
  const colores = ['#FF4FA3', '#3DA5FF', '#FFD84D', '#22C55E', '#8B5CF6', '#FF6B4A'];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.className = 'confeti';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colores[i % colores.length];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1 + 's';
    $zona.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

/** Corazoncitos que salen flotando del cliente encantado. */
function corazones(el) {
  for (let i = 0; i < 6; i++) {
    const h = document.createElement('span');
    h.className = 'corazon';
    h.textContent = i % 2 ? '💕' : '💖';
    h.style.left = 20 + Math.random() * 60 + '%';
    h.style.animationDelay = i * 0.15 + 's';
    el.appendChild(h);
    setTimeout(() => h.remove(), 2200);
  }
}

/** Se despide un momento y luego camina hacia afuera. */
function programarSalida(el, espera = 2400) {
  setTimeout(() => {
    el.classList.remove('brinco', 'azotando');
    el.classList.add('caminando', 'saliendo');
    el.querySelector('.sobre-cabeza').innerHTML = '';
    el.style.left = '125%';
  }, espera);
}

/** Emoji del tipo de cliente (o el nombre si es VIP). */
function insignia(c) {
  const t = tipoDe(c);
  if (c.novio) return `💕 ${c.nombre}:`;
  if (c.nombre) return `${t.emoji} ${c.nombre}:`;
  return t.id === 'normal' || t.id === 'tranquilo' ? '💬' : t.emoji;
}

function barraPaciencia() {
  return `<div class="paciencia"><i></i></div>`;
}

function actualizarPaciencias() {
  for (const c of juego.clientes) {
    const el = elementos.get(c.id);
    if (!el || (c.estado !== 'pidiendo' && c.estado !== 'esperando')) continue;
    const p = Math.max(0, c.paciencia / c.pacienciaMax);
    const barra = el.querySelector('.paciencia i');
    if (barra) {
      barra.style.width = p * 100 + '%';
      barra.style.background = p > 0.5 ? '#2BD07A' : p > 0.25 ? '#FFB020' : '#FF3B3B';
    }
    ponerEmocion(el, p < 0.3 ? 'impaciente' : 'normal');
    // De vez en cuando se queja si ya casi se le acaba la paciencia
    if (p < 0.25 && c.estado === 'esperando' && !c.yaSeQuejo) {
      c.yaSeQuejo = true;
      const t = el.querySelector('.ticket-cabeza');
      if (t) t.textContent = `#${c.numero} · ${alAzar(IMPACIENCIA)}`;
    }
  }
}

// ============================================================
//  Tocar a un cliente: tomar pedido o entregar
// ============================================================

function alTocarCliente(c) {
  if (c.estado === 'pidiendo') abrirTarjeta(c);
  else if (c.estado === 'esperando') elegirCrepaPara(c);
}

let tarjetaDe = null;

function abrirTarjeta(c) {
  sonidos.click();
  cerrarTarjeta();
  tarjetaDe = c.id;
  const t = document.createElement('div');
  t.className = 'tarjeta-pedido';
  const tipo = tipoDe(c);
  const quien = c.novio ? `💕 ${c.nombre} · tu novio` : c.famosa ? `🌟 ${c.nombre} · crítica de comida famosa (¡que quede perfecta!)` : c.nombre ? `${tipo.emoji} ${c.nombre} · cliente VIP` : tipo.nota ? `${tipo.emoji} ${tipo.nombre} · ${conGenero(tipo.nota)}` : '';
  t.innerHTML = `
    ${quien ? `<p class="quien">${quien}</p>` : ''}
    <p class="dice">“${c.texto}”</p>
    <div class="ticket-iconos">${iconosPedido(c.pedido)}</div>
    <div class="fila-botones">
      <button class="btn" data-a="luego">Luego</button>
      <button class="btn btn-primario" data-a="tomar">Tomar pedido ✍️ · ${dinero(c.precio)}</button>
    </div>`;
  t.querySelector('[data-a="luego"]').addEventListener('click', (ev) => { ev.stopPropagation(); cerrarTarjeta(); });
  t.querySelector('[data-a="tomar"]').addEventListener('click', (ev) => {
    ev.stopPropagation();
    tomarPedido(c);
    cerrarTarjeta();
    aviso(`Comanda #${c.numero} a la cocina 🧾`);
  });
  $zona.appendChild(t);
}

function cerrarTarjeta(c) {
  if (c && tarjetaDe !== c.id) return;
  $zona.querySelector('.tarjeta-pedido')?.remove();
  tarjetaDe = null;
}

async function elegirCrepaPara(c) {
  const charola = estado().charola;
  if (!charola.length) {
    aviso('No hay crepas en la charola. ¡Ve a la Cocina! 🍳');
    return;
  }
  sonidos.click();
  const cont = document.createElement('div');
  cont.innerHTML = `
    <div class="ticket-grande"><b>Comanda #${c.numero}</b>
      <div class="ticket-iconos">${iconosPedido(c.pedido)}</div>
    </div>
    <p style="text-align:center;margin:8px 0">¿Cuál crepa le das?</p>
    <div class="opciones-charola">
      ${charola.map((cr, i) => `
        <button class="opcion-crepa${cr.pedido === c.numero ? ' sugerida' : ''}" data-i="${i}">
          ${crepaDoblada(cr)}
          <span>${cr.pedido ? '#' + cr.pedido : 'Libre'}</span>
        </button>`).join('')}
    </div>`;
  let elegida = null;
  cont.querySelectorAll('.opcion-crepa').forEach((b) => b.addEventListener('click', () => {
    elegida = Number(b.dataset.i);
    document.querySelector('#capa-modal .modal-botones .btn')?.click();
  }));
  await mostrarModal({ titulo: '🛎️ Entregar', contenido: cont, botones: [{ texto: 'Cancelar', valor: null }] });
  if (elegida !== null && c.estado === 'esperando') entregar(c, elegida);
}

// ============================================================
//  Cobro: monedas volando a la barra de dinero
// ============================================================

function animarCobro({ cliente, total, puntos, resultado, bonos, faltoBebida }) {
  if (faltoBebida) aviso('☕ ¡Faltó su bebida! Prepárala en la barra antes de entregar');
  const el = elementos.get(cliente.id);
  const app = document.getElementById('app');
  const destino = document.getElementById('ind-dinero').getBoundingClientRect();
  const rApp = app.getBoundingClientRect();
  const origen = (el || $zona).getBoundingClientRect();
  const ox = origen.left + origen.width / 2 - rApp.left;
  const oy = origen.top + origen.height * 0.4 - rApp.top;

  // Texto "+$85" flotando
  const txt = document.createElement('div');
  txt.className = 'texto-cobro';
  txt.textContent = estado().sinfin ? `+${puntos.toLocaleString('es-MX')} pts` : '+' + dinero(total);
  txt.style.left = ox + 'px';
  txt.style.top = oy + 'px';
  app.appendChild(txt);
  setTimeout(() => txt.remove(), 1400);

  // Monedas
  for (let i = 0; i < 6; i++) {
    const m = document.createElement('div');
    m.className = 'moneda';
    m.style.left = ox + (Math.random() - 0.5) * 40 + 'px';
    m.style.top = oy + (Math.random() - 0.5) * 30 + 'px';
    app.appendChild(m);
    setTimeout(() => {
      m.style.transform = `translate(${destino.left + 20 - rApp.left - parseFloat(m.style.left)}px, ${destino.top + 10 - rApp.top - parseFloat(m.style.top)}px) scale(0.5)`;
      m.style.opacity = '0.2';
    }, 60 + i * 70);
    setTimeout(() => m.remove(), 900 + i * 70);
  }
  setTimeout(() => rebotar(document.getElementById('ind-dinero')), 700);

  // Pantallita de la caja registradora
  const pantalla = raiz.querySelector('#pantalla-caja');
  if (pantalla) pantalla.textContent = dinero(total);

  if (resultado) setTimeout(() => mostrarCalificacion(cliente, resultado, bonos, estado().sinfin ? puntos : null), 900);
}

/** Estrellitas en texto: llenas y vacías */
function estrellitas(n, clase = '') {
  return `<span class="estrellitas ${clase}">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
}

/** Barras de cada parte de la calificación */
function barrasPartes(partes) {
  return Object.keys(PESOS).map((k) => {
    const v = Math.round((partes[k] ?? 1) * 100); // reseñas viejas no traen todas las partes
    const color = v >= 85 ? '#2BD07A' : v >= 50 ? '#FFB020' : '#FF3B3B';
    return `<div class="parte"><span>${NOMBRES_PARTES[k]}</span><div class="barrita"><i style="width:${v}%;background:${color}"></i></div><b>${v}%</b></div>`;
  }).join('');
}

// ============================================================
//  Tarjeta de calificación (aparece al entregar)
// ============================================================

let temporizadorCalif = 0;
function mostrarCalificacion(c, r, bonos = [], puntos = null) {
  $zona.querySelector('.tarjeta-calif')?.remove();
  const t = document.createElement('div');
  t.className = 'tarjeta-calif' + (r.pct >= 90 ? ' excelente' : r.pct < 50 ? ' mala' : '');
  const lineas = puntos !== null ? [
    `<span>⭐ Puntos</span><b>+${puntos.toLocaleString('es-MX')}</b>`,
    ...(r.estrellas <= 1 ? ['<span>💔 ¡Perdiste un corazón!</span><b></b>'] : []),
  ] : [
    `<span>Crepa</span><b>${dinero(c.precio)}</b>`,
    `<span>Propina</span><b>${r.propina ? '+' + dinero(r.propina) : '—'}</b>`,
    ...bonos.map((b) => `<span>${b.texto}</span><b>+${dinero(b.monto)}${b.chispitas ? ` · +${textoChispitas(b.chispitas)}` : ''}</b>`),
  ].map((l) => `<div class="linea">${l}</div>`).join('');
  t.innerHTML = `
    <div class="calif-cabeza">
      <span class="pct">${r.pct}%</span>
      ${estrellitas(r.estrellas, 'grandes')}
    </div>
    <div class="partes">${barrasPartes(r.partes)}</div>
    <div class="cuenta">${lineas}</div>`;
  t.addEventListener('click', () => t.remove());
  $zona.appendChild(t);
  clearTimeout(temporizadorCalif);
  temporizadorCalif = setTimeout(() => t.remove(), 5000);
}

// ============================================================
//  Decoración del local (mejoras compradas) y clima del evento
// ============================================================

// Lo que flota en el aire con cada decoración de fiesta (si no hay evento)
const PARTICULAS = { navidad: '❄️', halloween: '🦇', muertos: '🌼', valentin: '💗', cumple: '🎈', patrias: '🎉' };

let claveDecorado = '';
function pintarDecorado(e = estado()) {
  const decor = decoracion();
  const clave = JSON.stringify([e.mejoras, e.evento, e.ajustes.dificultad, nombreCreperia(), decor]);
  if (clave === claveDecorado) return;
  claveDecorado = clave;
  raiz.querySelector('#svg-fachada').innerHTML = svgFachada(nombreCreperia(), { letrero: nivel(e, 'letrero'), luces: nivel(e, 'luces'), decor });
  raiz.querySelector('#calle').innerHTML = svgCalle({ plantas: nivel(e, 'plantas'), mesitas: nivel(e, 'mesitas'), clima: e.evento, decor });
  raiz.querySelector('#svg-mostrador').innerHTML = svgMostrador({ perrita: nivel(e, 'mascota'), terminal: nivel(e, 'caja'), decor });
  const clima = raiz.querySelector('#clima');
  clima.className = 'clima ' + (e.evento || '');
  const particula = e.evento === 'san_valentin' ? '💗' : !e.evento ? PARTICULAS[decor.temporada] : null;
  clima.innerHTML = particula
    ? Array.from({ length: 8 }, (_, i) => `<span style="left:${8 + i * 12}%;animation-delay:${i * 0.9}s">${particula}</span>`).join('')
    : '';
  pintarBarraBebidas();
}

function acariciarPerrita() {
  sonidos.pop();
  const g = raiz.querySelector('#perrita');
  const r = g.getBoundingClientRect(), rApp = document.getElementById('app').getBoundingClientRect();
  const h = document.createElement('div');
  h.className = 'texto-cobro guau';
  h.textContent = '¡Guau! 💕';
  h.style.left = r.left + r.width / 2 - rApp.left + 'px';
  h.style.top = r.top - rApp.top + 'px';
  document.getElementById('app').appendChild(h);
  setTimeout(() => h.remove(), 1400);
}

// ----- Barra de bebidas (sobre el mostrador) -----

function pintarBarraBebidas() {
  const barra = raiz.querySelector('#barra-bebidas');
  const lista = disponibles(estado(), 'bebida');
  barra.hidden = !lista.length;
  if (!lista.length) return;
  const preparando = new Set([...barra.querySelectorAll('.preparando')].map((b) => b.dataset.id));
  barra.innerHTML = lista.map((b) => {
    const n = juego.bebidas[b.id] || 0;
    return `<button class="vaso-btn${preparando.has(b.id) ? ' preparando' : ''}" data-id="${b.id}" aria-label="${b.nombre}">
      ${iconoIngrediente(b.id)}
      <span class="vaso-cuenta">${'●'.repeat(n)}${'○'.repeat(MAX_BEBIDA - n)}</span>
      <i class="llenado"></i>
    </button>`;
  }).join('');
}

function prepararBebida(ev) {
  const b = ev.target.closest('.vaso-btn');
  if (!b || b.classList.contains('preparando')) return;
  const id = b.dataset.id;
  if ((juego.bebidas[id] || 0) >= MAX_BEBIDA) { aviso('Ya hay suficientes de esa bebida listas'); return; }
  sonidos.click();
  b.classList.add('preparando');
  setTimeout(() => {
    raiz.querySelector(`.vaso-btn[data-id="${id}"]`)?.classList.remove('preparando');
    if (agregarBebida(id)) sonidos.pop();
    pintarBarraBebidas();
  }, 2200);
}

// ============================================================
//  Buzón de reseñas
// ============================================================

function pintarBuzon(e = estado()) {
  const n = e.resenas.filter((r) => !r.leida).length;
  const b = raiz.querySelector('#globo-buzon');
  b.hidden = !n;
  b.textContent = n;
}

function tarjetaResena(r, titulo = '') {
  return `
    <div class="resena${r.leida ? '' : ' nueva'}">
      <div class="resena-cara">${caraCliente(r.apariencia, r.emocion)}</div>
      <div class="resena-texto">
        ${titulo ? `<small>${titulo}</small>` : ''}
        ${r.nombre ? `<small class="resena-nombre">${r.nombre}</small>` : ''}
        ${estrellitas(r.estrellas)}
        <p>“${r.texto}”</p>
        <small>${r.pct ? r.pct + '% · ' : ''}Crepa ${r.pedido}</small>
      </div>
    </div>`;
}

function abrirBuzon() {
  sonidos.click();
  const lista = [...estado().resenas].reverse();
  const cont = document.createElement('div');
  cont.className = 'buzon';
  if (!lista.length) {
    cont.innerHTML = '<p style="text-align:center">Todavía no hay reseñas. ¡Atiende a tus primeros clientes! 🥞</p>';
  } else {
    const prom = lista.reduce((s, r) => s + r.estrellas, 0) / lista.length;
    let html = `<div class="buzon-promedio">${prom.toFixed(1)} ★ <small>de ${lista.length} reseñas</small></div>`;
    let diaActual = null;
    for (const r of lista) {
      if (r.dia !== diaActual) { diaActual = r.dia; html += `<h3 class="buzon-dia">Día ${r.dia}</h3>`; }
      html += tarjetaResena(r);
    }
    cont.innerHTML = html;
  }
  mostrarModal({ titulo: '📬 Buzón de reseñas', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
  if (lista.some((r) => !r.leida)) actualizar((e) => { e.resenas.forEach((r) => { r.leida = true; }); });
}

// ============================================================
//  Charola sobre el mostrador
// ============================================================

let ultimaCharola = '';
function pintarCharola(e = estado()) {
  const clave = e.charola.map((c) => c.id).join(',');
  if (clave === ultimaCharola) return;
  ultimaCharola = clave;
  raiz.querySelector('#charola-venta').innerHTML = e.charola
    .map((c) => `<div class="mini-crepa">${crepaDoblada(c)}${c.pedido ? `<b>#${c.pedido}</b>` : ''}</div>`).join('');
}

// ============================================================
//  Fin del día: resumen completo y novedades del día siguiente
// ============================================================

async function mostrarFinDia() {
  const e = estado();
  sonidos.campana();
  const h = e.hoy;
  const deHoy = e.resenas.filter((r) => r.dia === e.dia);
  const calificadas = deHoy.filter((r) => r.partes);
  const prom = calificadas.length ? Math.round(calificadas.reduce((s, r) => s + r.pct, 0) / calificadas.length) : 0;
  const estrellasDia = deHoy.length ? Math.round(deHoy.reduce((s, r) => s + r.estrellas, 0) / deHoy.length) : 0;

  // Desglose: promedio de cada parte en el día
  let desglose = '';
  if (calificadas.length) {
    const promPartes = {};
    for (const k of Object.keys(PESOS)) promPartes[k] = calificadas.reduce((s, r) => s + (r.partes[k] ?? 1), 0) / calificadas.length;
    desglose = `<div class="partes desglose">${barrasPartes(promPartes)}</div>`;
  }
  const orden = [...deHoy].sort((a, b) => b.pct - a.pct);
  const mejor = orden[0], peor = orden[orden.length - 1];

  const neto = h.ganado - h.insumos;
  const dRep = e.reputacion - (h.repInicio ?? e.reputacion);
  const flecha = dRep > 0.005 ? `<span class="sube">▲ ${dRep.toFixed(2)}</span>` : dRep < -0.005 ? `<span class="baja">▼ ${Math.abs(dRep).toFixed(2)}</span>` : '<span>=</span>';
  const logrosHoy = LOGROS.filter((l) => h.logros.includes(l.id));
  const ev = evento(e.evento);

  await mostrarModal({
    titulo: `🌙 ¡Fin del día ${e.dia}!`,
    contenido: `
      <div class="resumen-dia">
        ${ev ? `<div class="evento-resumen">${ev.emoji} ${ev.nombre}</div>` : ''}
        ${personaje() ? `<div class="chef-resumen">${dibujarPersonaje(personaje(), { vista: 'cara', emocion: !deHoy.length || estrellasDia === 3 ? 'normal' : estrellasDia > 3 ? 'feliz' : 'triste' })}</div>` : ''}
        ${deHoy.length ? `<div class="estrellas-dia">${estrellitas(estrellasDia, 'grandes')}</div>` : ''}
        <div><span>🥞 Crepas vendidas</span><b>${h.vendidas}</b></div>
        <div><span>💵 Ventas</span><b>${dinero(h.ventas)}</b></div>
        <div><span>💝 Propinas y bonos</span><b>${dinero(h.propinas)}</b></div>
        ${e.ajustes.costoInsumos ? `<div><span>🧾 Insumos</span><b class="baja">-${dinero(h.insumos)}</b></div>` : ''}
        <div class="total"><span>💰 Ganancia del día</span><b>${dinero(neto)}</b></div>
        <div><span>⭐ Reputación</span><b>${e.reputacion.toFixed(1)} ${flecha}</b></div>
        <div><span>😊 Satisfacción promedio</span><b>${prom}%</b></div>
        <div><span>😤 Clientes que se fueron</span><b>${h.perdidos}</b></div>
        <div><span>🔥 Crepas quemadas</span><b>${h.quemadas}</b></div>
        ${neto > 0 && neto >= e.records.mejorDia ? '<div class="record">🏅 ¡Nuevo récord de ganancia!</div>' : ''}
        ${CONFIG.tablaEnLinea ? `<div class="ranking-aviso">${tieneNombre()
          ? '🏆 Tu ganancia va a la tabla en línea'
          : '🏆 Para competir en línea, ponte un nombre en ⚙️ → Tabla en línea'}</div>` : ''}
        ${logrosHoy.length ? `<div class="logros-hoy"><span>🏆 Logros de hoy</span>${logrosHoy.map((l) => `<span class="chip-logro">${l.emoji} ${l.nombre}</span>`).join('')}</div>` : ''}
        ${desglose}
        ${mejor ? tarjetaResena({ ...mejor, leida: true }, '👑 Mejor reseña') : ''}
        ${peor && peor !== mejor ? tarjetaResena({ ...peor, leida: true }, '💔 Peor reseña') : ''}
      </div>`,
    botones: [{ texto: 'Siguiente ☀️', clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  siguienteDia();
  await revisarSorpresa();
  mostrarNuevoDia();
}

/** Pantalla de "Día N": qué se desbloqueó, evento del día y acceso a la tienda. */
async function mostrarNuevoDia() {
  const e = estado();
  const ayer = { ...e, dia: e.dia - 1 };
  const todo = e.desbloqueados.includes('*');
  const ingredientes = todo ? [] : INGREDIENTES.filter((i) => i.dia === e.dia && i.categoria !== 'bebida');
  const combos = COMBOS.filter((c) => comboDisponible(c, e) && !comboDisponible(c, ayer));
  const ev = evento(e.evento);
  let html = '';
  if (ev) html += `<div class="tarjeta-evento grande"><b>${ev.emoji} Hoy: ${ev.nombre}</b><small>${ev.descripcion}</small></div>`;
  // El día que llegan los primeros ingredientes salados
  if (ingredientes.some((i) => i.salado) && !INGREDIENTES.some((i) => i.salado && i.dia < e.dia)) {
    html += `<div class="tarjeta-evento grande"><b>🧀 ¡Llegan las crepas saladas!</b>
      <small>Ahora también te pueden pedir jamón, quesos y más. Están en las pestañitas «Salados» de la cocina.</small></div>`;
  }
  if (ingredientes.length) {
    html += `<h3 class="menu-titulo">✨ Ingredientes nuevos</h3><div class="novedades">
      ${ingredientes.map((i) => `<span class="det-item">${iconoIngrediente(i.id)}${i.nombre}</span>`).join('')}</div>`;
  }
  if (combos.length) {
    html += `<h3 class="menu-titulo">📖 Nuevas crepas de la casa</h3><div class="novedades">
      ${combos.map((c) => `<span class="chip-logro">🥞 ${c.nombre}</span>`).join('')}</div>`;
  }
  if (!html) html = '<p style="text-align:center">¡Un nuevo día para hacer crepas deliciosas! 🥞</p>';
  html += `<p class="menu-nota">Tienes ${dinero(e.dinero)}. Puedes comprar mejoras en la 🛒 tienda antes de abrir.</p>`;
  const v = await mostrarModal({
    titulo: `☀️ Día ${e.dia}`,
    contenido: html,
    botones: [{ texto: '🛒 Tienda', valor: 'tienda' }, { texto: '¡A trabajar!', clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  if (v === 'tienda') abrirTienda();
}

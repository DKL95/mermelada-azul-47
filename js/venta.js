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
        </div>
      </div>
      <div class="zona-clientes" id="zona-clientes">
        <div class="calle" id="calle"></div>
        <div class="clima" id="clima"></div>
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
  raiz.querySelector('#btn-buzon').addEventListener('click', abrirBuzon);
  raiz.querySelector('#btn-logros').addEventListener('click', abrirLogros);
  raiz.querySelector('#btn-tienda').addEventListener('click', () => {
    if (juego.abierto) { aviso('🛒 La tienda abre cuando la crepería está cerrada (antes de abrir o al terminar el día)'); return; }
    abrirTienda();
  });
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
      ${ev ? `<div class="tarjeta-evento"><b>${ev.emoji} ${ev.nombre}</b><small>${ev.descripcion}</small></div>` : ''}`;
    el.querySelector('#btn-abrir').addEventListener('click', () => {
      abrir();
      if (ev) aviso(`${ev.emoji} Hoy: ${ev.nombre}`);
    });
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

function sincronizar() {
  pintarAvisoZona();
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
  const quien = c.novio ? `💕 ${c.nombre} · tu novio` : c.famosa ? `🌟 ${c.nombre} · crítica de comida famosa (¡que quede perfecta!)` : c.nombre ? `${tipo.emoji} ${c.nombre} · cliente VIP` : tipo.nota ? `${tipo.emoji} ${tipo.nombre} · ${tipo.nota}` : '';
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

function animarCobro({ cliente, total, resultado, bonos, faltoBebida }) {
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
  txt.textContent = '+' + dinero(total);
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

  if (resultado) setTimeout(() => mostrarCalificacion(cliente, resultado, bonos), 900);
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
function mostrarCalificacion(c, r, bonos = []) {
  $zona.querySelector('.tarjeta-calif')?.remove();
  const t = document.createElement('div');
  t.className = 'tarjeta-calif' + (r.pct >= 90 ? ' excelente' : r.pct < 50 ? ' mala' : '');
  const lineas = [
    `<span>Crepa</span><b>${dinero(c.precio)}</b>`,
    `<span>Propina</span><b>${r.propina ? '+' + dinero(r.propina) : '—'}</b>`,
    ...bonos.map((b) => `<span>${b.texto}</span><b>+${dinero(b.monto)}</b>`),
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

let claveDecorado = '';
function pintarDecorado(e = estado()) {
  const clave = JSON.stringify([e.mejoras, e.evento, e.ajustes.dificultad, nombreCreperia()]);
  if (clave === claveDecorado) return;
  claveDecorado = clave;
  raiz.querySelector('#svg-fachada').innerHTML = svgFachada(nombreCreperia(), { letrero: nivel(e, 'letrero'), luces: nivel(e, 'luces') });
  raiz.querySelector('#calle').innerHTML = svgCalle({ plantas: nivel(e, 'plantas'), mesitas: nivel(e, 'mesitas'), clima: e.evento });
  raiz.querySelector('#svg-mostrador').innerHTML = svgMostrador({ perrita: nivel(e, 'mascota'), terminal: nivel(e, 'caja') });
  const clima = raiz.querySelector('#clima');
  clima.className = 'clima ' + (e.evento || '');
  clima.innerHTML = e.evento === 'san_valentin'
    ? Array.from({ length: 8 }, (_, i) => `<span style="left:${8 + i * 12}%;animation-delay:${i * 0.9}s">💗</span>`).join('')
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

// ---------- Dibujos SVG ----------

/** Escapa texto para meterlo de forma segura dentro del SVG. */
function escapar(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Fachada: letrero con el nombre + toldo a rayas con ondas.
 *  op.letrero = letrero luminoso, op.luces = foquitos de colores */
function svgFachada(nombre, op = {}) {
  // Toldo: rayas alternadas azul/blanco y borde de ondas
  const rayas = [];
  const ondas = [];
  const n = 10;
  const ancho = 380 / n;
  for (let i = 0; i < n; i++) {
    const color = i % 2 === 0 ? 'var(--toldo)' : '#FFFFFF';
    rayas.push(`<rect x="${i * ancho}" y="62" width="${ancho}" height="34" style="fill:${color}"/>`);
    ondas.push(`<path d="M${i * ancho} 96 a${ancho / 2} ${ancho / 2.6} 0 0 0 ${ancho} 0 z" style="fill:${color}"/>`);
  }
  // Tamaño de letra según el largo del nombre
  const tam = nombre.length > 24 ? 15 : nombre.length > 18 ? 18 : 21;
  // Guirnalda de foquitos bajo el toldo
  const colores = ['#FF4FA3', '#FFD84D', '#3DA5FF', '#22C55E', '#FF6B4A'];
  const luces = !op.luces ? '' : `
    <path d="M0 104 ${Array.from({ length: 10 }, (_, i) => `Q${i * 38 + 19} 114 ${(i + 1) * 38} 104`).join(' ')}" stroke="#1B2A55" stroke-width="1.2" fill="none"/>
    ${Array.from({ length: 10 }, (_, i) => `<circle cx="${i * 38 + 19}" cy="110" r="4" fill="${colores[i % colores.length]}">
      <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" begin="${(i % 3) * 0.5}s" repeatCount="indefinite"/></circle>`).join('')}`;
  return `
  <svg viewBox="0 0 380 ${op.luces ? 118 : 120}" aria-hidden="true">
    <!-- pared superior -->
    <rect x="0" y="0" width="380" height="64" fill="#DDEEFF"/>
    <!-- letrero -->
    ${op.letrero ? `<rect x="44" y="4" width="292" height="56" rx="28" fill="#FFE59A" opacity="0.6"><animate attributeName="opacity" values="0.7;0.25;0.7" dur="2.4s" repeatCount="indefinite"/></rect>` : ''}
    <rect x="50" y="10" width="280" height="44" rx="22" fill="#1B2A55"/>
    <rect x="55" y="15" width="270" height="34" rx="17" fill="none" style="stroke:${op.letrero ? 'var(--acento)' : '#FFD84D'}" stroke-width="${op.letrero ? 3 : 2}" stroke-dasharray="${op.letrero ? 'none' : '4 4'}"/>
    <text x="190" y="38" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600"
          font-size="${tam}" fill="${op.letrero ? '#FFE59A' : '#FFFFFF'}">${escapar(nombre)}</text>
    <!-- foquitos -->
    ${[30, 350].map((x) => `<circle cx="${x}" cy="32" r="7" fill="#FFE59A"><animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/></circle>`).join('')}
    <!-- toldo -->
    ${rayas.join('')}
    ${ondas.join('')}
    <rect x="0" y="60" width="380" height="5" style="fill:var(--acento)"/>
    ${luces}
  </svg>`;
}

/** Fondo de la calle: nubes, edificios, árboles, faroles y banqueta.
 *  Lienzo angosto (260 de ancho) para que se vea grande en el celular.
 *  op.plantas, op.mesitas = decoración comprada; op.clima = id del evento */
function svgCalle(op = {}) {
  const SUELO = 180; // altura donde empieza la banqueta
  const lluvia = op.clima === 'lluvia';
  const arbol = (x, s) => `
    <g transform="translate(${x} ${SUELO}) scale(${s})">
      <rect x="-5" y="-40" width="10" height="42" rx="4" fill="#A9795A"/>
      <circle cx="0" cy="-58" r="28" fill="#9ED9B5"/>
      <circle cx="-18" cy="-44" r="18" fill="#8FD0A8"/>
      <circle cx="18" cy="-46" r="20" fill="#8FD0A8"/>
    </g>`;
  const farol = (x) => `
    <g transform="translate(${x} ${SUELO})">
      <rect x="-2.5" y="-92" width="5" height="92" rx="2" fill="#3B4F86"/>
      <rect x="-9" y="-104" width="18" height="16" rx="5" fill="#3B4F86"/>
      <rect x="-6" y="-101" width="12" height="10" rx="3" fill="#FFE59A"/>
    </g>`;
  const nube = (x, y, s) => `
    <g transform="translate(${x} ${y}) scale(${s})" fill="${lluvia ? '#B9C4D6' : '#FFFFFF'}" opacity="0.9">
      <ellipse cx="0" cy="0" rx="22" ry="12"/><ellipse cx="18" cy="-6" rx="16" ry="12"/><ellipse cx="34" cy="2" rx="16" ry="10"/>
    </g>`;
  const maceta = (x, flor) => `
    <g transform="translate(${x} ${SUELO + 4})">
      <path d="M-9 -12 h18 l-3 14 h-12 z" fill="#E07A4A"/>
      <rect x="-10" y="-14" width="20" height="4" rx="2" fill="#C9653A"/>
      <path d="M0 -14 q-8 -10 -4 -20 M0 -14 q6 -12 2 -22 M0 -14 q10 -6 10 -16" stroke="#3FB56B" stroke-width="2.5" fill="none"/>
      ${[[-4, -34], [2, -36], [10, -30]].map(([fx, fy]) => `<circle cx="${fx}" cy="${fy}" r="4" fill="${flor}"/><circle cx="${fx}" cy="${fy}" r="1.5" fill="#FFD84D"/>`).join('')}
    </g>`;
  const mesita = (x, sombrilla) => `
    <g transform="translate(${x} ${SUELO + 2})">
      <path d="M0 -44 v40" stroke="#9C948D" stroke-width="2"/>
      <path d="M-18 -42 q18 -16 36 0 z" fill="${sombrilla}"/>
      <ellipse cx="0" cy="-18" rx="13" ry="3.5" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.2"/>
      <path d="M0 -18 v16 M-6 -2 h12" stroke="#9C948D" stroke-width="2"/>
      <path d="M-20 -14 v12 M-20 -14 h-4 v-10 M-20 -8 h-6 v6" stroke="#FF4FA3" stroke-width="2" fill="none"/>
      <path d="M20 -14 v12 M20 -14 h4 v-10 M20 -8 h6 v6" stroke="#FF4FA3" stroke-width="2" fill="none"/>
    </g>`;
  return `
  <svg viewBox="0 0 260 230" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    ${op.clima === 'calor' ? '<circle cx="225" cy="30" r="22" fill="#FFD84D"/><circle cx="225" cy="30" r="30" fill="#FFD84D" opacity="0.3"/>' : ''}
    ${nube(20, 30, 0.9)}${nube(180, 50, 0.7)}
    <g><animateTransform attributeName="transform" type="translate" values="0 0;30 0;0 0" dur="40s" repeatCount="indefinite"/>${nube(100, 18, 0.55)}</g>
    <!-- edificios lejanos -->
    <rect x="-6" y="112" width="56" height="70" rx="6" fill="#FFC2E2"/>
    <rect x="212" y="100" width="54" height="82" rx="6" fill="#C9B8FF"/>
    ${[4, 28].map((x) => `<rect x="${x}" y="124" width="14" height="14" rx="3" fill="#FFFFFF"/>`).join('')}
    ${[222, 244].map((x) => `<rect x="${x}" y="112" width="14" height="16" rx="3" fill="#FFFFFF"/>`).join('')}
    ${arbol(72, 1.05)}${arbol(192, 0.9)}
    ${farol(24)}${farol(236)}
    <!-- banqueta -->
    <rect x="0" y="${SUELO}" width="260" height="${230 - SUELO}" fill="${lluvia ? '#D3DDEA' : '#E6EEF8'}"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * 50 + 20}" y="${SUELO}" width="2.5" height="${230 - SUELO}" fill="rgba(27,42,85,0.08)"/>`).join('')}
    <rect x="0" y="${SUELO}" width="260" height="3" fill="rgba(27,42,85,0.1)"/>
    ${op.mesitas ? mesita(6, '#FF4FA3') + mesita(254, '#3DA5FF') : ''}
    ${op.plantas ? maceta(46, '#FF4FA3') + maceta(214, '#8B5CF6') : ''}
  </svg>`;
}

/** Perrita French Poodle blanca dormida sobre el mostrador. */
function svgPerrita() {
  // Bolitas de pelo rizado: se pintan dos veces (contorno y relleno) para que el borde quede de una pieza
  const pelo = `
    <path d="M46 13 L53 4" stroke-width="2.5"/>
    <circle cx="54" cy="3" r="4.5"/>
    <ellipse cx="28" cy="16" rx="20" ry="7"/>
    <circle cx="15" cy="11" r="6.5"/><circle cx="24" cy="9" r="7"/><circle cx="34" cy="9" r="7"/><circle cx="42" cy="12" r="6"/>
    <circle cx="45" cy="20" r="4"/>
    <circle cx="1" cy="21" r="3.5"/><circle cx="8" cy="22" r="3.5"/>
    <circle cx="8" cy="10" r="8"/>
    <circle cx="3" cy="2" r="4.5"/><circle cx="9" cy="0" r="4.5"/><circle cx="14" cy="3" r="4"/>
    <ellipse cx="0" cy="13" rx="5.5" ry="3.8"/>`;
  return `
    <g id="perrita" transform="translate(178 4)" style="cursor:pointer">
      <g fill="#D8D2E6" stroke="#D8D2E6" stroke-width="3">${pelo}</g>
      <g fill="#FFFFFF" stroke="#FFFFFF">${pelo}</g>
      <path d="M20 13 q3 -3 6 0 M31 12 q3 -3 6 0 M40 17 q2 -2 4 0" stroke="#E6E1F0" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="13" cy="13" rx="4.2" ry="7.5" fill="#F3F0F8" stroke="#D8D2E6" stroke-width="1.5"/>
      <path d="M2 9 q2.5 2.5 5 0" stroke="#3B2A2A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <circle cx="-4.5" cy="12.5" r="1.6" fill="#3B2A2A"/>
      <circle cx="5" cy="13" r="1.3" fill="#FF8FB8"/>
      <path d="M12 -4 l-5 -3.5 l0 7 z M12 -4 l5 -3.5 l0 7 z" fill="#FF4FA3"/>
      <circle cx="12" cy="-4" r="1.6" fill="#E0237F"/>
      <text x="20" y="-6" font-family="Fredoka, sans-serif" font-size="9" fill="#3B4F86" opacity="0.7">z<animate attributeName="opacity" values="0;0.8;0" dur="2.5s" repeatCount="indefinite"/></text>
    </g>`;
}

/** Mostrador de madera con caja registradora y charola. */
function svgMostrador(op = {}) {
  return `
  <svg viewBox="0 -30 380 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <!-- cubierta -->
    <rect x="0" y="20" width="380" height="16" rx="4" fill="#FFFFFF"/>
    <rect x="0" y="34" width="380" height="4" fill="rgba(27,42,85,0.2)"/>
    <!-- frente con paneles -->
    <rect x="0" y="36" width="380" height="84" style="fill:var(--toldo)"/>
    ${[10, 105, 200, 295].map((x) => `<rect x="${x}" y="48" width="75" height="60" rx="8" style="fill:var(--toldo-oscuro)"/>`).join('')}

    <!-- charola de cartón (aquí llegan las crepas) -->
    <g transform="translate(40 2)">
      <path d="M0 18 L10 4 L90 4 L100 18 Z" fill="#E9D2BA" stroke="#C9A27C" stroke-width="2"/>
    </g>

    ${op.perrita ? svgPerrita() : ''}

    <!-- caja registradora -->
    <g transform="translate(250 -26)">
      <rect x="0" y="22" width="96" height="26" rx="6" style="fill:var(--acento)"/>
      <rect x="10" y="0" width="54" height="22" rx="4" style="fill:var(--acento-oscuro)"/>
      <rect x="15" y="4" width="44" height="13" rx="2" fill="#E8F6E9"/>
      <text id="pantalla-caja" x="37" y="14.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="9" fill="#2F7A5A">$0</text>
      ${[0, 1, 2].map((i) => `<rect x="${12 + i * 14}" y="27" width="10" height="7" rx="2" fill="#FFF"/>`).join('')}
      ${[0, 1, 2].map((i) => `<rect x="${12 + i * 14}" y="37" width="10" height="7" rx="2" fill="#FFF"/>`).join('')}
      <rect x="62" y="28" width="26" height="16" rx="3" style="fill:var(--acento-oscuro)"/>
      ${op.terminal ? '<g transform="translate(70 4)"><rect width="18" height="22" rx="3" fill="#1B2A55"/><rect x="3" y="3" width="12" height="7" rx="1" fill="#7FD3FF"/><rect x="3" y="13" width="12" height="6" rx="1" fill="#3B4F86"/></g>' : ''}
    </g>
  </svg>`;
}

/* ============================================================
   tienda.js — tienda de mejoras, decoración del local y vitrina
   de logros.
   ============================================================ */
import { estado, actualizar } from './state.js';
import { mostrarModal, aviso, dinero } from './ui.js';
import { sonidos } from './audio.js';
import { MEJORAS, nivel, mejoraVisible } from './data/mejoras.js';
import { LOGROS, revisarLogros, chispitasDe } from './data/logros.js';
import { chispitas, gastarChispitas, enChispitas, textoChispitas, agregarArticulos } from './cartera.js';
import { DECORACION, COLORES_TOLDO } from './data/local.js';
import { decoracion, ponerDecoracion, tieneDecoracion, claveDecoracion } from './local.js';
import { svgFachada, svgCalle, svgMostrador } from './escenario.js';
import { nombreCreperia } from './romance.js';

const SECCIONES = { cocina: '🍳 Para la cocina', local: '🏡 Para el local' };

// ============================================================
//  Tienda
// ============================================================

/** Abre la tienda (mejoras o decoración). Devuelve una promesa que se resuelve al cerrarla. */
export function abrirTienda(pestana = 'mejoras') {
  sonidos.click();
  const cont = document.createElement('div');
  cont.className = 'tienda';
  let probando = null; // { cat, opcion } de decoración que se está viendo antes de comprar
  const pintar = () => {
    const scroll = cont.closest('.modal')?.scrollTop;
    cont.innerHTML = `
      <div class="segmentado tienda-pestanas">
        <button data-pestana="mejoras" aria-pressed="${pestana === 'mejoras'}">🛒 Mejoras</button>
        <button data-pestana="decoracion" aria-pressed="${pestana === 'decoracion'}">🎨 Decoración</button>
      </div>
      ${pestana === 'mejoras' ? htmlTienda() : htmlDecoracion(probando)}`;
    if (scroll !== undefined) cont.closest('.modal').scrollTop = scroll;
  };
  pintar();
  cont.addEventListener('click', (ev) => {
    const tab = ev.target.closest('[data-pestana]');
    if (tab) { sonidos.click(); pestana = tab.dataset.pestana; probando = null; pintar(); return; }
    const b = ev.target.closest('[data-comprar]');
    if (b) { comprar(b.dataset.comprar, b.dataset.moneda); pintar(); return; }
    const color = ev.target.closest('[data-color-toldo]');
    if (color) { sonidos.click(); ponerDecoracion({ colorToldo: color.dataset.colorToldo || null }); pintar(); return; }
    const op = ev.target.closest('[data-decor]');
    if (op) {
      sonidos.click();
      const [cat, id] = op.dataset.decor.split(':');
      const opcion = DECORACION[cat].opciones.find((o) => o.id === id);
      if (tieneDecoracion(cat, opcion)) { probando = null; ponerDecoracion({ [cat]: id }); }
      else probando = { cat, opcion }; // se ve en la vista previa; abajo, para comprarla
      pintar();
      return;
    }
    const compra = ev.target.closest('[data-comprar-decor]');
    if (compra && probando) {
      const { cat, opcion } = probando;
      const pago = compra.dataset.comprarDecor;
      if (pago === 'chispitas' ? !gastarChispitas(enChispitas(opcion.precio)) : estado().dinero < opcion.precio) return;
      if (pago === 'pesos') actualizar((s) => { s.dinero -= opcion.precio; });
      agregarArticulos([claveDecoracion(cat, opcion.id)]);
      ponerDecoracion({ [cat]: opcion.id });
      probando = null;
      sonidos.compra();
      aviso(`🎨 ¡${opcion.nombre} para tu local!`);
      pintar();
    }
  });
  return mostrarModal({ titulo: '🛒 Tienda', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
}

/** Pestaña de decoración: vista previa del local y las opciones de cada parte. */
function htmlDecoracion(probando) {
  const e = estado();
  const d = { ...decoracion(), ...(probando ? { [probando.cat]: probando.opcion.id } : {}) };
  const ch = chispitas();
  const vista = `
    <div class="local-vista cielo-${d.cielo}">
      <div class="lv-fachada">${svgFachada(nombreCreperia(), { letrero: nivel(e, 'letrero'), luces: nivel(e, 'luces'), decor: d })}</div>
      <div class="lv-calle">${svgCalle({ plantas: nivel(e, 'plantas'), mesitas: nivel(e, 'mesitas'), decor: d, llenar: true })}</div>
      <div class="lv-mostrador">${svgMostrador({ perrita: nivel(e, 'mascota'), terminal: nivel(e, 'caja'), decor: d })}</div>
    </div>`;
  const grupos = Object.entries(DECORACION).map(([cat, { nombre, opciones }]) => `
    <h3 class="menu-titulo">${nombre}</h3>
    <div class="chips">${opciones.map((o) => {
      const suyo = tieneDecoracion(cat, o);
      const activo = d[cat] === o.id;
      return `<button class="chip${activo ? ' activo' : ''}${suyo ? '' : ' bloqueado'}" data-decor="${cat}:${o.id}">
        ${suyo ? '' : '🔒 '}${o.nombre}${suyo ? '' : `<span class="precio-chip">${dinero(o.precio)}</span>`}</button>`;
    }).join('')}</div>
    ${cat === 'toldo' ? `<div class="muestras">${COLORES_TOLDO.map((c) => `
      <button class="muestra${(d.colorToldo || null) === c ? ' activa' : ''}" data-color-toldo="${c || ''}"
        style="background:${c || 'var(--toldo)'}" aria-label="${c ? 'Color ' + c : 'Color de la versión'}"></button>`).join('')}</div>` : ''}`).join('');
  const barra = probando ? `
    <div class="barra-compra">
      <b>${probando.opcion.nombre}</b>
      <span class="precios en-fila">
        <button class="btn btn-primario" data-comprar-decor="pesos" ${e.dinero >= probando.opcion.precio ? '' : 'disabled'}>${dinero(probando.opcion.precio)}</button>
        <button class="btn btn-chispitas" data-comprar-decor="chispitas" ${ch >= enChispitas(probando.opcion.precio) ? '' : 'disabled'}>${textoChispitas(enChispitas(probando.opcion.precio))}</button>
      </span>
    </div>` : '';
  return `<div class="tienda-dinero">Tienes <b>${dinero(e.dinero)}</b> y <b>${textoChispitas(ch)}</b></div>
    ${vista}${barra}${grupos}
    <p class="menu-nota">La decoración es para siempre: no se pierde si reinicias la partida.</p>`;
}

function htmlTienda() {
  const e = estado();
  const ch = chispitas();
  let html = `<div class="tienda-dinero">Tienes <b>${dinero(e.dinero)}</b> y <b>${textoChispitas(ch)}</b></div>`;
  for (const [sec, titulo] of Object.entries(SECCIONES)) {
    html += `<h3 class="menu-titulo">${titulo}</h3>`;
    for (const m of MEJORAS.filter((x) => x.seccion === sec && mejoraVisible(x, e))) {
      const n = nivel(e, m.id);
      const max = m.precios.length;
      const precio = m.precios[n];
      const puntos = max > 1 ? `<span class="niveles">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'lleno' : ''}"></i>`).join('')}</span>` : '';
      const efecto = n > 0 ? m.efectos[n - 1] : m.efectos[0];
      // Se paga con pesos o con Chispitas
      const precioCh = enChispitas(precio);
      const boton = n >= max
        ? '<span class="comprado">✓ Tuyo</span>'
        : `<span class="precios">
            <button class="btn ${e.dinero >= precio ? 'btn-primario' : ''}" data-comprar="${m.id}" data-moneda="pesos" ${e.dinero >= precio ? '' : 'disabled'}>${dinero(precio)}</button>
            <button class="btn btn-chispitas" data-comprar="${m.id}" data-moneda="chispitas" ${ch >= precioCh ? '' : 'disabled'}>${textoChispitas(precioCh)}</button>
          </span>`;
      html += `
        <div class="mejora${n >= max ? ' tenida' : ''}">
          <span class="mejora-emoji">${m.emoji}</span>
          <span class="mejora-texto">
            <b>${m.nombre}</b>${puntos}
            <small>${m.descripcion}</small>
            <small class="efecto">${n > 0 && n < max ? `Ahora: ${efecto} → Siguiente: ${m.efectos[n]}` : efecto}</small>
          </span>
          ${boton}
        </div>`;
    }
  }
  return html;
}

function comprar(id, moneda = 'pesos') {
  const m = MEJORAS.find((x) => x.id === id);
  const e = estado();
  const n = nivel(e, id);
  const precio = m.precios[n];
  if (precio === undefined) return;
  if (moneda === 'chispitas' ? !gastarChispitas(enChispitas(precio)) : e.dinero < precio) return;
  let logros = [];
  actualizar((s) => {
    if (moneda === 'pesos') s.dinero -= precio;
    s.mejoras[id] = n + 1;
    logros = revisarLogros(s, { momento: 'compra' });
  });
  sonidos.compra();
  aviso(`${m.emoji} ¡${m.nombre}${m.precios.length > 1 ? ` nivel ${n + 1}` : ''} comprado!`);
  if (logros.length) avisarLogros(logros);
}

// ============================================================
//  Logros
// ============================================================

export function abrirLogros() {
  sonidos.click();
  const e = estado();
  const tenidos = LOGROS.filter((l) => e.logros.includes(l.id)).length;
  mostrarModal({
    titulo: '🏆 Logros',
    contenido: `
      <div class="logros-cuenta">${tenidos} de ${LOGROS.length}</div>
      <div class="logros">
        ${LOGROS.map((l) => {
          const ok = e.logros.includes(l.id);
          return `<div class="logro${ok ? ' ganado' : ''}">
            <span class="logro-emoji">${ok ? l.emoji : '🔒'}</span>
            <span><b>${l.nombre}</b><small>${l.descripcion}</small><small class="premio">Premio: ${dinero(l.premio)} · ${textoChispitas(chispitasDe(l))}</small></span>
          </div>`;
        }).join('')}
      </div>`,
    botones: [{ texto: 'Cerrar', clase: 'btn-primario' }],
  });
}

/** Cartelito animado de "¡Logro desbloqueado!" (uno tras otro). */
export function avisarLogros(lista) {
  const capa = document.getElementById('capa-avisos');
  lista.forEach((l, i) => setTimeout(() => {
    sonidos.logro();
    const el = document.createElement('div');
    el.className = 'aviso-logro';
    el.innerHTML = `<span class="logro-emoji">${l.emoji}</span><span><small>¡Logro desbloqueado!</small><b>${l.nombre}</b><small>+${dinero(l.premio)} · +${textoChispitas(chispitasDe(l))}</small></span>`;
    capa.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }, i * 1800));
}

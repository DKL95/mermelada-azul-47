/* ============================================================
   tienda.js — tienda de mejoras y vitrina de logros.
   ============================================================ */
import { estado, actualizar } from './state.js';
import { mostrarModal, aviso, dinero } from './ui.js';
import { sonidos } from './audio.js';
import { MEJORAS, nivel, mejoraVisible } from './data/mejoras.js';
import { LOGROS, revisarLogros } from './data/logros.js';

const SECCIONES = { cocina: '🍳 Para la cocina', local: '🏡 Para el local' };

// ============================================================
//  Tienda
// ============================================================

/** Abre la tienda. Devuelve una promesa que se resuelve al cerrarla. */
export function abrirTienda() {
  sonidos.click();
  const cont = document.createElement('div');
  cont.className = 'tienda';
  const pintar = () => { cont.innerHTML = htmlTienda(); };
  pintar();
  cont.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-comprar]');
    if (!b) return;
    comprar(b.dataset.comprar);
    pintar();
  });
  return mostrarModal({ titulo: '🛒 Tienda', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
}

function htmlTienda() {
  const e = estado();
  let html = `<div class="tienda-dinero">Tienes <b>${dinero(e.dinero)}</b></div>`;
  for (const [sec, titulo] of Object.entries(SECCIONES)) {
    html += `<h3 class="menu-titulo">${titulo}</h3>`;
    for (const m of MEJORAS.filter((x) => x.seccion === sec && mejoraVisible(x, e))) {
      const n = nivel(e, m.id);
      const max = m.precios.length;
      const precio = m.precios[n];
      const puntos = max > 1 ? `<span class="niveles">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'lleno' : ''}"></i>`).join('')}</span>` : '';
      const efecto = n > 0 ? m.efectos[n - 1] : m.efectos[0];
      const boton = n >= max
        ? '<span class="comprado">✓ Tuyo</span>'
        : `<button class="btn ${e.dinero >= precio ? 'btn-primario' : ''}" data-comprar="${m.id}" ${e.dinero >= precio ? '' : 'disabled'}>${dinero(precio)}</button>`;
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

function comprar(id) {
  const m = MEJORAS.find((x) => x.id === id);
  const e = estado();
  const n = nivel(e, id);
  const precio = m.precios[n];
  if (precio === undefined || e.dinero < precio) return;
  let logros = [];
  actualizar((s) => {
    s.dinero -= precio;
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
            <span><b>${l.nombre}</b><small>${l.descripcion}</small><small class="premio">Premio: ${dinero(l.premio)}</small></span>
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
    el.innerHTML = `<span class="logro-emoji">${l.emoji}</span><span><small>¡Logro desbloqueado!</small><b>${l.nombre}</b><small>+${dinero(l.premio)}</small></span>`;
    capa.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }, i * 1800));
}

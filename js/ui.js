/* ============================================================
   ui.js — piezas de interfaz reutilizables:
   ventanas emergentes (modales), confirmaciones, avisos,
   formato de dinero y dibujo de estrellas.
   ============================================================ */
import { CONFIG } from './config.js';

const capaModal = () => document.getElementById('capa-modal');
let cerrarActual = null; // función para cerrar la ventana abierta (si hay)

/**
 * Muestra una ventana emergente.
 * @param {object} op
 * @param {string} op.titulo
 * @param {string|HTMLElement} op.contenido  HTML o elemento
 * @param {Array<{texto:string, clase?:string, valor?:any, alTocar?:Function}>} op.botones
 *        alTocar: se llama antes de cerrar; si devuelve false (o una promesa
 *        de false) la ventana se queda abierta.
 * @param {boolean} [op.cerrarAlTocarFuera=true]
 * @returns {Promise<any>} el `valor` del botón tocado (o null)
 */
export function mostrarModal({ titulo, contenido, botones = [{ texto: 'Cerrar', valor: null }], cerrarAlTocarFuera = true }) {
  // Si ya había otra ventana abierta, se cierra primero
  if (cerrarActual) cerrarActual(null);
  return new Promise((resolver) => {
    const capa = capaModal();
    capa.innerHTML = '';

    const caja = document.createElement('div');
    caja.className = 'modal';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');

    const h = document.createElement('h2');
    h.textContent = titulo;
    caja.appendChild(h);

    const cuerpo = document.createElement('div');
    if (typeof contenido === 'string') cuerpo.innerHTML = contenido;
    else if (contenido) cuerpo.appendChild(contenido);
    caja.appendChild(cuerpo);

    const fila = document.createElement('div');
    fila.className = 'modal-botones';
    for (const b of botones) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.clase || '');
      btn.textContent = b.texto;
      btn.addEventListener('click', async () => {
        if (b.alTocar && !(await b.alTocar())) return;
        if (cerrarActual === cerrar) cerrar(b.valor ?? null);
      });
      fila.appendChild(btn);
    }
    caja.appendChild(fila);
    capa.appendChild(caja);

    const alTocarFuera = (ev) => { if (ev.target === capa) cerrar(null); };
    if (cerrarAlTocarFuera) capa.addEventListener('click', alTocarFuera);

    function cerrar(valor) {
      cerrarActual = null;
      capa.removeEventListener('click', alTocarFuera);
      capa.hidden = true;
      capa.innerHTML = '';
      window.dispatchEvent(new Event('modal:cerrado')); // el reloj del día sigue
      resolver(valor);
    }

    cerrarActual = cerrar;
    capa.hidden = false;
    window.dispatchEvent(new Event('modal:abierto')); // pausa el reloj del día
  });
}

/** Pregunta Sí/No. Devuelve true si confirma. */
export async function confirmar(titulo, mensaje, textoSi = 'Sí', textoNo = 'Cancelar') {
  const r = await mostrarModal({
    titulo,
    contenido: `<p style="text-align:center">${mensaje}</p>`,
    botones: [
      { texto: textoNo, valor: false },
      { texto: textoSi, clase: 'btn-peligro', valor: true },
    ],
  });
  return r === true;
}

/** Aviso flotante breve arriba de la pantalla. */
export function aviso(texto) {
  const capa = document.getElementById('capa-avisos');
  const el = document.createElement('div');
  el.className = 'aviso';
  el.textContent = texto;
  capa.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

const formatoDinero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: CONFIG.moneda,
  maximumFractionDigits: 0,
});
/** 1250 -> "$1,250" */
export function dinero(cantidad) {
  return formatoDinero.format(Math.round(cantidad));
}

/** Dibuja 5 estrellas SVG con relleno parcial (ej. 3.5 = tres y media). */
export function estrellasSVG(valor) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    const relleno = Math.max(0, Math.min(1, valor - i)); // 0..1
    const id = `estrella-${i}-${Math.round(relleno * 100)}`;
    html += `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs><linearGradient id="${id}">
          <stop offset="${relleno * 100}%" stop-color="#F6B93B"/>
          <stop offset="${relleno * 100}%" stop-color="#FFFFFF"/>
        </linearGradient></defs>
        <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"
              fill="url(#${id})" stroke="#D99A2B" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;
  }
  return html;
}

/** Hace rebotar un elemento (para llamar la atención). */
export function rebotar(el) {
  el.classList.remove('salta');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('salta');
}

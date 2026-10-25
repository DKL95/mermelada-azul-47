/* ============================================================
   teclado.js — jugar con teclado y mouse (sobre todo en la PC).

   No sabe nada de las reglas del juego: cada tecla solo "toca" el
   botón que ya está en pantalla, igual que el dedo.

     Tab        cambia entre Cocina y Venta
     Espacio    el botón principal (¡A cocinar!, Voltear, Siguiente…)
     Enter      igual que Espacio; en una ventana, su botón principal
     1–9        Cocina: elige masa, ingrediente o doblado
                Venta: atiende al cliente 1, 2 o 3 (de izquierda a derecha)
                Al entregar: elige la crepa de la charola
     ← →        pestañitas de la bandeja / hojas de la carta
     Z ⌫        deshacer
     F          cambiar de plancha (con la segunda plancha)
     M          menú de la casa
     Esc        cierra la ventana o el pedido; si no hay nada, Ajustes

   En la PC (Steam), o en cuanto alguien usa el teclado, los botones
   muestran su tecla en una etiquetita (html.con-teclado, ver ui.css).
   ============================================================ */
import { cerrarModal } from './ui.js';
import { esSteam } from './plataforma.js';
import { t } from './idioma.js';

const raiz = document.documentElement;
const visible = (el) => !!el && !el.disabled && el.offsetParent !== null;
const primero = (sel, dentro = document) => [...dentro.querySelectorAll(sel)].find(visible);
const enesimo = (sel, dentro, n) => [...dentro.querySelectorAll(sel)].filter(visible)[n];
const tocar = (el) => { if (!visible(el)) return false; el.click(); return true; };

const ES_NUMERO = /^[1-9]$/;
const FLECHA = { ArrowLeft: -1, ArrowRight: 1 };

raiz.style.setProperty('--tecla-espacio', JSON.stringify(t('Espacio')));
if (esSteam) raiz.classList.add('con-teclado');

/** Ventana abierta (modal). */
function enVentana(tecla, capa) {
  if (tecla === 'Escape') return cerrarModal();
  if (FLECHA[tecla]) return tocar(capa.querySelector(`[data-paso="${FLECHA[tecla]}"]`));
  if (ES_NUMERO.test(tecla)) return tocar(enesimo('.opcion-crepa', capa, tecla - 1));
  if (tecla === 'Enter' || tecla === ' ') {
    const botones = [...capa.querySelectorAll('.modal-botones .btn')].filter(visible);
    const principal = botones.find((b) => b.classList.contains('btn-primario'))
      || (botones.length === 1 ? botones[0] : primero('.btn-primario', capa));
    return tocar(principal);
  }
  return false;
}

function enCocina(tecla) {
  const panel = document.getElementById('controles');
  if (tecla === ' ' || tecla === 'Enter') return tocar(primero('.btn-primario', panel));
  if (ES_NUMERO.test(tecla)) return tocar(enesimo('.chip-masa, .btn-ingrediente, .btn-doblado', panel, tecla - 1));
  if (FLECHA[tecla]) {
    const tabs = [...panel.querySelectorAll('.tab-bandeja')];
    const i = tabs.findIndex((b) => b.classList.contains('activa'));
    return tocar(tabs[i + FLECHA[tecla]]);
  }
  const letra = tecla.toLowerCase();
  if (letra === 'z' || tecla === 'Backspace') return tocar(primero('[data-tecla="z"]', panel));
  if (letra === 'f') return tocar(primero('.fogon-btn:not(.activo)'));
  if (letra === 'm') return tocar(document.getElementById('btn-menu'));
  return false;
}

function enVenta(tecla) {
  const zona = document.getElementById('zona-clientes');
  const tarjeta = zona.querySelector('.tarjeta-pedido');
  if (tecla === 'Escape') return !!tarjeta && tocar(tarjeta.querySelector('[data-a="luego"]'));
  if (tecla === ' ' || tecla === 'Enter') {
    return tocar(tarjeta?.querySelector('[data-a="tomar"]')) || tocar(document.getElementById('btn-abrir'));
  }
  if (ES_NUMERO.test(tecla)) {
    const cliente = zona.querySelector(`.cliente[data-tecla="${tecla}"]`);
    if (cliente) { cliente.click(); return true; }
  }
  return false;
}

document.addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.repeat) return;
  if (ev.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const tecla = ev.key;
  raiz.classList.add('con-teclado');

  const inicio = document.getElementById('inicio');
  const capa = document.getElementById('capa-modal');
  let hecho = false;
  if (inicio) {
    hecho = (tecla === 'Enter' || tecla === ' ') && tocar(inicio.querySelector('#btn-entrar'));
  } else if (!capa.hidden) {
    hecho = enVentana(tecla, capa);
  } else {
    if (tecla === 'Tab') hecho = tocar(primero('.tab:not(.activa)')) || true;
    else hecho = document.querySelector('.pantalla.activa')?.dataset.pestana === 'cocina' ? enCocina(tecla) : enVenta(tecla);
    if (!hecho && tecla === 'Escape') hecho = tocar(document.getElementById('btn-ajustes'));
    // Fuera de las ventanas, Espacio y Enter son del juego: que no vuelvan a
    // tocar el último botón que se usó con el mouse.
    if (tecla === ' ' || tecla === 'Enter') hecho = true;
  }
  if (hecho) {
    ev.preventDefault();
    if (ev.target instanceof HTMLButtonElement) ev.target.blur();
  }
});

// La rueda del mouse mueve las filas que se deslizan de lado
// (ingredientes, estaciones), que en el celular se mueven con el dedo.
document.addEventListener('wheel', (ev) => {
  if (Math.abs(ev.deltaX) >= Math.abs(ev.deltaY)) return;
  const fila = ev.target.closest?.('.bandeja-ingredientes, .estaciones');
  if (!fila || fila.scrollWidth <= fila.clientWidth) return;
  fila.scrollLeft += ev.deltaY;
  ev.preventDefault();
}, { passive: false });

/* ============================================================
   tutorial.js — tutorial interactivo de la primera vez.

   Cada paso señala algo en pantalla (un aro que late) y muestra
   un globito con instrucciones. El paso avanza solo cuando ella
   hace lo que se pide (no hay que tocar "siguiente").
   ============================================================ */
import { estado, actualizar, suscribir } from './state.js';
import { juego, on, comandas } from './turno.js';
import { aviso } from './ui.js';
import { sonidos } from './audio.js';
import { t } from './idioma.js';

const PASOS = [
  {
    objetivo: '#btn-abrir',
    texto: `👋 ${t('Esta es tu ventanilla. Toca <b>Abrir</b> para empezar el día.')}`,
    listo: () => juego.abierto,
  },
  {
    objetivo: '#zona-clientes .cliente',
    texto: `🙋 ${t('¡Llegó alguien! Tócalo para ver qué quiere y luego <b>Tomar pedido</b>.')}`,
    listo: () => comandas().length > 0,
  },
  {
    objetivo: '.tab[data-pestana="cocina"]',
    texto: `🍳 ${t('El pedido ya está en la cocina. ¡Vamos para allá!')}`,
    listo: () => document.querySelector('#pantalla-cocina.activa'),
  },
  {
    objetivo: '#riel-comandas .comanda',
    texto: `🧾 ${t('Toca la comanda para prepararla (tócala otra vez para ver el pedido completo).')}`,
    listo: () => document.querySelector('.comanda.activa'),
  },
  {
    objetivo: '#escenario',
    arriba: true, // el globo va hasta arriba para no tapar los controles
    texto: `🥄 ${t('Toca el centro de la plancha para verter la masa y arrastra en círculos. Después sigue las instrucciones de cada estación, de la 1 a la 7.')}`,
    listo: () => estado().charola.length > 0,
  },
  {
    objetivo: '.tab[data-pestana="venta"]',
    texto: `📦 ${t('¡Crepa lista! Ve a <b>Venta</b> y toca al cliente para entregársela.')}`,
    listo: () => estado().records.crepasVendidas > vendidasInicio || juego.clientes.every((c) => c.estado !== 'esperando'),
  },
];

let paso = -1;
let vendidasInicio = 0;
let escuchando = false;
let $aro = null, $globo = null, intervalo = 0;

/** Arranca el tutorial si nunca lo ha visto. */
export function iniciarTutorial(forzar = false) {
  if (estado().tutorialVisto && !forzar) return;
  if (forzar) actualizar((e) => { e.tutorialVisto = false; });
  paso = 0;
  vendidasInicio = estado().records.crepasVendidas;
  crearPiezas();
  if (!escuchando) {
    escuchando = true;
    on('cambio', revisar);
    on('cobro', revisar);
    suscribir(revisar);
    document.addEventListener('click', () => setTimeout(revisar, 60), true);
  }
  clearInterval(intervalo);
  intervalo = setInterval(colocar, 400); // las cosas se mueven (clientes caminando)
  mostrarPaso();
}

function crearPiezas() {
  const app = document.getElementById('app');
  $aro?.remove(); $globo?.remove();
  $aro = document.createElement('div');
  $aro.className = 'tuto-aro';
  $globo = document.createElement('div');
  $globo.className = 'tuto-globo';
  app.append($aro, $globo);
}

function mostrarPaso() {
  const p = PASOS[paso];
  $globo.innerHTML = `
    <small>${t('Paso {n} de {total}', { n: paso + 1, total: PASOS.length })}</small>
    <p>${p.texto}</p>
    <button class="tuto-saltar">${t('Saltar tutorial')}</button>`;
  $globo.querySelector('.tuto-saltar').addEventListener('click', terminar);
  $globo.classList.remove('entra');
  void $globo.offsetWidth;
  $globo.classList.add('entra');
  colocar();
}

function revisar() {
  if (paso < 0 || paso >= PASOS.length) return;
  if (!PASOS[paso].listo()) return;
  paso++;
  sonidos.pop();
  if (paso >= PASOS.length) { terminar(true); return; }
  mostrarPaso();
}

/** Pone el aro sobre el objetivo y el globito arriba o abajo de él. */
function colocar() {
  if (paso < 0 || !$globo) return;
  const app = document.getElementById('app').getBoundingClientRect();
  const el = [...document.querySelectorAll(PASOS[paso].objetivo)].find((x) => x.offsetParent !== null);
  const anchoGlobo = Math.min(320, app.width - 24);
  $globo.style.width = anchoGlobo + 'px';
  $globo.style.left = (app.width - anchoGlobo) / 2 + 'px';
  if (!el) {
    $aro.hidden = true;
    $globo.style.top = app.height * 0.35 + 'px';
    return;
  }
  const r = el.getBoundingClientRect();
  $aro.hidden = false;
  Object.assign($aro.style, {
    left: r.left - app.left - 6 + 'px',
    top: r.top - app.top - 6 + 'px',
    width: r.width + 12 + 'px',
    height: r.height + 12 + 'px',
  });
  // Globo abajo si el objetivo está en la mitad de arriba; si no, arriba
  const altoGlobo = $globo.offsetHeight || 110;
  if (PASOS[paso].arriba) { $globo.style.top = '8px'; return; }
  const centro = r.top + r.height / 2 - app.top;
  const top = centro < app.height / 2
    ? Math.min(r.bottom - app.top + 14, app.height - altoGlobo - 8)
    : Math.max(8, r.top - app.top - altoGlobo - 14);
  $globo.style.top = top + 'px';
}

function terminar(completo = false) {
  paso = -1;
  clearInterval(intervalo);
  $aro?.remove(); $globo?.remove();
  $aro = $globo = null;
  actualizar((e) => { e.tutorialVisto = true; });
  if (completo === true) { sonidos.logro(); aviso(`🎉 ${t('¡Listo! Ya sabes todo lo básico. ¡A cocinar!')}`); }
}

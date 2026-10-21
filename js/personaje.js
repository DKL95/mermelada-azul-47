/* ============================================================
   personaje.js — el personaje del jugador: se guarda, se dibuja
   (cuerpo completo) y se edita en el creador.

   Vive aparte de la partida (como las Chispitas): reiniciar la
   partida no lo borra. El sexo también lo lee genero.js.

   Uso:
     import { personaje, dibujarPersonaje, editarPersonaje } from './personaje.js';
     dibujarPersonaje(personaje(), { vista: 'completo' | 'busto' | 'cara', emocion: 'feliz' })
     await editarPersonaje({ primeraVez: true })
   ============================================================ */
import { mostrarModal, aviso } from './ui.js';
import { sonidos } from './audio.js';
import { esRomantica } from './romance.js';
import { nombreJugador, ponerNombre, limpiarNombre } from './ranking.js';
import { g } from './genero.js';
import { CUERPO, ropa, extra, detallesCara, peinadoAtras, peinadoFrente, accesorio, caraSVG } from './clientes.js';
import {
  SEXOS, PIELES, ESTATURAS, COMPLEXIONES, PEINADOS, COLORES_PELO, VELLO, ARRIBA, ESTAMPADOS,
  ABAJO, CALZADO, ACCESORIOS, COLORES, COLORES_MEZCLILLA, personajeInicial,
} from './data/personaje.js';

const CLAVE = 'creperia.personaje';
const MAX_NOMBRE = 20;

// ============================================================
//  Guardado
// ============================================================

/** El personaje guardado, o null si todavía no lo crea. */
export function personaje() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE));
    if (!p) return null;
    const base = personajeInicial(p.sexo);
    return { ...base, ...p, acc: { ...base.acc, ...p.acc }, colorAcc: { ...base.colorAcc, ...p.colorAcc } };
  } catch {
    return null;
  }
}

function guardarPersonaje(p) {
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin espacio o modo privado */ }
  window.dispatchEvent(new Event('personaje:cambio'));
}

// ============================================================
//  Dibujo
// ============================================================

const PISO = 288;   // donde pisan los pies (coordenadas del dibujo)
const HOMBRO = 120; // de aquí para abajo se estira según estatura y complexión
let svgN = 0;

/** Piernas: pantalón, falda, short o el vuelo del vestido, y la piel que se asoma. */
function piernas(p) {
  const piel = `<rect x="40" y="196" width="15" height="86" rx="7" fill="${p.piel}"/><rect x="65" y="196" width="15" height="86" rx="7" fill="${p.piel}"/>`;
  if (p.arriba === 'vestido') {
    return `${piel}<path d="M24 194 H96 L106 238 H14 Z" fill="${p.colorArriba}"/>
      ${[[32, 222], [56, 214], [80, 226], [98, 232], [44, 232]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${p.colorArriba2}" opacity="0.8"/>`).join('')}`;
  }
  const c = p.colorAbajo;
  const pierna = (largo) => `<path d="M33 194 H59 L58 ${largo} H38 Z" fill="${c}"/><path d="M61 194 H87 L82 ${largo} H62 Z" fill="${c}"/>`;
  const cintura = `<rect x="32" y="190" width="56" height="10" rx="4" fill="${c}"/>`;
  switch (p.abajo) {
    case 'jeans':
      return `${piel}${pierna(282)}${cintura}
        <path d="M45 202 V280 M74 202 V280" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" stroke-dasharray="3 2"/>`;
    case 'short':
      return `${piel}${pierna(232)}${cintura}`;
    case 'falda':
      return `${piel}<path d="M30 190 H90 L100 240 H20 Z" fill="${c}"/><path d="M22 234 H98" stroke="rgba(0,0,0,0.12)" stroke-width="3"/>`;
    default: // pantalón
      return `${piel}${pierna(282)}${cintura}<path d="M60 200 V214" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>`;
  }
}

/** Zapato en (x, piso); lado -1 = izquierdo, 1 = derecho (la punta apunta hacia afuera). */
function zapato(p, x, lado) {
  const c = p.colorCalzado;
  const punta = `M${x - 9} ${PISO} V${PISO - 7} Q${x - 9} ${PISO - 13} ${x} ${PISO - 13} Q${x + 9} ${PISO - 13} ${x + 9} ${PISO - 7} V${PISO} Z`;
  const ladeo = `transform="translate(${lado * 2} 0)"`;
  switch (p.calzado) {
    case 'botas':
      return `<g ${ladeo}><path d="M${x - 9} ${PISO} V${PISO - 30} H${x + 9} V${PISO} Z" fill="${c}"/><path d="${punta}" fill="${c}"/>
        <rect x="${x - 10}" y="${PISO - 3}" width="20" height="4" rx="2" fill="rgba(0,0,0,0.35)"/></g>`;
    case 'zapatos':
      return `<g ${ladeo}><path d="${punta}" fill="${c}"/><rect x="${x - 10}" y="${PISO - 3}" width="20" height="4" rx="2" fill="rgba(0,0,0,0.4)"/>
        <path d="M${x - 5} ${PISO - 10} q5 -2 10 0" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/></g>`;
    case 'sandalias':
      return `<g ${ladeo}><path d="${punta}" fill="${p.piel}"/><rect x="${x - 10}" y="${PISO - 3}" width="20" height="4" rx="2" fill="${c}"/>
        <path d="M${x - 8} ${PISO - 7} H${x + 8} M${x} ${PISO - 12} V${PISO - 4}" stroke="${c}" stroke-width="3" stroke-linecap="round"/></g>`;
    default: // tenis
      return `<g ${ladeo}><path d="${punta}" fill="${c}"/><rect x="${x - 10}" y="${PISO - 4}" width="20" height="5" rx="2.5" fill="#FFFFFF" stroke="#D9DEE8"/>
        <path d="M${x - 4} ${PISO - 11} l3 3 M${x} ${PISO - 12} l3 3" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/></g>`;
  }
}

/** Brazos colgando a los lados del cuerpo, con sus manos y lo de la muñeca. */
function brazos(p) {
  const corta = ['playera', 'rayas', 'overol'].includes(p.arriba);
  const sinManga = p.arriba === 'vestido';
  const manga = p.arriba === 'overol' ? p.colorArriba2 : p.colorArriba;
  const brazo = (d) => `<path d="${d}" stroke="${sinManga || corta ? p.piel : manga}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  const mangaCorta = (d) => `<path d="${d}" stroke="${manga}" stroke-width="13" fill="none" stroke-linecap="round"/>`;
  let html = brazo('M37 132 Q22 150 21 188') + brazo('M83 132 Q98 150 99 188');
  if (corta) html += mangaCorta('M37 132 Q29 141 27 154') + mangaCorta('M83 132 Q91 141 93 154');
  html += `<circle cx="21" cy="193" r="6.5" fill="${p.piel}"/><circle cx="99" cy="193" r="6.5" fill="${p.piel}"/>`;
  const c = p.colorAcc.muneca;
  if (p.acc.muneca === 'reloj') {
    html += `<rect x="14" y="182" width="14" height="5" rx="2" fill="${c}"/><circle cx="21" cy="184.5" r="3.6" fill="#FFFFFF" stroke="${c}" stroke-width="1.5"/>`;
  } else if (p.acc.muneca === 'pulsera') {
    html += [92, 96, 100, 104].map((x, i) => `<circle cx="${x}" cy="${184 + (i % 2)}" r="2" fill="${i % 2 ? '#FFFFFF' : c}"/>`).join('');
  }
  return html;
}

/** Aretes (van colgando de las orejas). */
function aretes(id, c) {
  return [20, 100].map((x) => {
    switch (id) {
      case 'aretes': return `<circle cx="${x}" cy="84" r="3" fill="${c}"/>`;
      case 'arracadas': return `<circle cx="${x}" cy="88" r="5" fill="none" stroke="${c}" stroke-width="2"/>`;
      case 'perlas': return `<circle cx="${x}" cy="85" r="3.4" fill="#FFFFFF" stroke="#E3E7EE"/><circle cx="${x - 1}" cy="84" r="1" fill="#FFFFFF"/>`;
      case 'aretes_corazon': return `<path d="M${x} 81 v4" stroke="#FFD84D" stroke-width="1.5"/>
        <path d="M${x} 96 l-5.5 -5.5 a3.4 3.4 0 0 1 5.5 -4.3 a3.4 3.4 0 0 1 5.5 4.3 z" fill="#FF4FA3" stroke="#FFFFFF" stroke-width="1.2"/>`;
      default: return '';
    }
  }).join('');
}

/** Lo que los clientes.js saben dibujar, con los nombres de sus campos. */
function comoCliente(p) {
  return {
    piel: p.piel, pelo: p.pelo, peinado: p.peinado,
    ropa: p.colorArriba, ropa2: p.colorArriba2, vestimenta: p.arriba, estampado: p.estampado,
    colorAcc: p.colorAcc.cabeza,
    barba: p.sexo === 'hombre' && p.vello.startsWith('barba'),
  };
}

/**
 * SVG del personaje.
 *   vista 'completo'  de pies a cabeza
 *         'busto'     de la cintura para arriba (mismo encuadre que los clientes)
 *         'cara'      solo la cabeza
 */
export function dibujarPersonaje(p, { vista = 'completo', emocion = 'normal' } = {}) {
  const a = comoCliente(p);
  const alto = ESTATURAS.find((x) => x.id === p.estatura)?.esc || 1;
  const ancho = COMPLEXIONES.find((x) => x.id === p.complexion)?.esc || 1;
  const clip = 'cuerpo-personaje' + (++svgN);
  const r = ropa(a, clip);
  const hombre = p.sexo === 'hombre';
  const cuello = p.acc.cuello;
  const bufanda = cuello === 'bufanda'
    ? `<path d="M30 112 q30 14 60 0 v12 q-30 14 -60 0 z" fill="${p.colorAcc.cuello}"/><rect x="66" y="118" width="12" height="28" rx="4" fill="${p.colorAcc.cuello}"/>`
    : '';
  // Los pies siempre en el piso: si es más alto, todo sube
  const subir = vista === 'cara' ? 0 : (PISO - HOMBRO) * (1 - alto);
  const caja = { completo: '0 -26 120 324', busto: '0 0 120 210', cara: '8 8 104 104' }[vista];
  return `
  <svg viewBox="${caja}" class="personaje-svg" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${CUERPO}"/></clipPath></defs>
    ${vista === 'completo' ? `<ellipse cx="60" cy="${PISO}" rx="34" ry="5" fill="rgba(27,42,85,0.18)"/>` : ''}
    <g transform="translate(0 ${subir.toFixed(1)})">
      ${peinadoAtras(a)}
      <g transform="translate(60 ${HOMBRO}) scale(${ancho} ${alto}) translate(-60 -${HOMBRO})">
        ${piernas(p)}
        ${zapato(p, 47, -1)}${zapato(p, 73, 1)}
        ${r.abajo}
        ${brazos(p)}
      </g>
      <rect x="50" y="100" width="20" height="22" rx="8" fill="${p.piel}"/>
      ${r.encima}
      ${cuello !== 'ninguno' && cuello !== 'bufanda' ? extra({ extra: cuello, colorAcc: p.colorAcc.cuello }) : ''}
      <circle cx="60" cy="68" r="40" fill="${p.piel}"/>
      <ellipse cx="20" cy="72" rx="6" ry="9" fill="${p.piel}"/><ellipse cx="100" cy="72" rx="6" ry="9" fill="${p.piel}"/>
      ${aretes(p.acc.orejas, p.colorAcc.orejas)}
      ${detallesCara(a)}
      ${peinadoFrente(a)}
      <g class="cara">${caraSVG(emocion)}</g>
      ${hombre ? '' : '<path d="M40.5 66 l-3.5 -2.5 M79.5 66 l3.5 -2.5" stroke="#1B2A55" stroke-width="2" stroke-linecap="round"/>'}
      ${hombre && (p.vello === 'bigote' || p.vello === 'barba_bigote') ? `<path d="M46 80 q7 -6 14 0 q7 -6 14 0 q-7 6 -14 2 q-7 4 -14 -2 z" fill="${p.pelo}"/>` : ''}
      ${accesorio(p.acc.ojos, p.colorAcc.ojos)}
      ${accesorio(p.acc.cabeza, p.colorAcc.cabeza)}
      ${bufanda}
    </g>
  </svg>`;
}

// ============================================================
//  Creador
// ============================================================

const PESTANAS = [['cuerpo', '🧍 Cuerpo'], ['cabello', '💇 Cabello'], ['ropa', '👕 Ropa'], ['accesorios', '💍 Accesorios']];
const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];

/** Lee un campo como 'acc.cabeza' o 'piel'. */
function leer(p, campo) {
  return campo.split('.').reduce((o, k) => o[k], p);
}
function escribir(p, campo, valor) {
  const ks = campo.split('.');
  const ultimo = ks.pop();
  ks.reduce((o, k) => o[k], p)[ultimo] = valor;
}

/** Las opciones que se pueden elegir (sin lo exclusivo si no toca, ni barba en mujer). */
function opcionesDe(lista, p) {
  return lista.filter((o) => (!o.especial || esRomantica()) && (!o.soloHombre || p.sexo === 'hombre'));
}

const nombreOpcion = (o) => (Array.isArray(o.nombre) ? g(...o.nombre) : o.nombre);

function chips(campo, lista, p) {
  const actual = leer(p, campo);
  return `<div class="chips">${opcionesDe(lista, p).map((o) => `
    <button class="chip${o.id === actual ? ' activo' : ''}${o.especial ? ' especial' : ''}" data-campo="${campo}" data-valor="${o.id}">${nombreOpcion(o)}</button>`).join('')}</div>`;
}

function colores(campo, lista, p) {
  const actual = leer(p, campo);
  return `<div class="muestras">${lista.map((c) => `
    <button class="muestra${c === actual ? ' activa' : ''}" style="background:${c}" data-campo="${campo}" data-valor="${c}" aria-label="Color ${c}"></button>`).join('')}</div>`;
}

const grupo = (titulo, html) => `<div class="grupo-creador"><h4>${titulo}</h4>${html}</div>`;

// Ropa con segundo color (rayas, botones, cuello, etc.)
const CON_COLOR2 = ['filipina', 'rayas', 'sudadera', 'chamarra', 'sueter', 'vestido', 'overol', 'playera'];
// Accesorios que no cambian de color
const SIN_COLOR = ['ninguno', 'perlas', 'aretes_corazon', 'gorro_chef', 'lentes'];

function htmlPestana(pestana, p, nombre) {
  switch (pestana) {
    case 'cuerpo':
      return grupo('Nombre', `<input class="campo-nombre" id="creador-nombre" type="text" maxlength="${MAX_NOMBRE}" autocomplete="nickname" autocapitalize="words" enterkeyhint="done" placeholder="Tu nombre" value="${nombre.replace(/"/g, '&quot;')}">`)
        + grupo('Soy…', chips('sexo', SEXOS, p))
        + grupo('Piel', colores('piel', PIELES, p))
        + grupo('Estatura', chips('estatura', ESTATURAS, p))
        + grupo('Complexión', chips('complexion', COMPLEXIONES, p));
    case 'cabello':
      return grupo('Corte', chips('peinado', PEINADOS, p))
        + grupo('Color', colores('pelo', COLORES_PELO, p))
        + (p.sexo === 'hombre' ? grupo('Barba y bigote', chips('vello', VELLO, p)) : '');
    case 'ropa':
      return grupo('Arriba', chips('arriba', ARRIBA, p) + colores('colorArriba', COLORES, p)
          + (CON_COLOR2.includes(p.arriba) ? `<small class="nota-creador">Detalles</small>${colores('colorArriba2', COLORES, p)}` : ''))
        + (p.arriba === 'playera' ? grupo('Estampado', chips('estampado', ESTAMPADOS, p)) : '')
        + (p.arriba === 'vestido' ? '' : grupo('Abajo', chips('abajo', ABAJO, p) + colores('colorAbajo', p.abajo === 'jeans' ? COLORES_MEZCLILLA : COLORES, p)))
        + grupo('Calzado', chips('calzado', CALZADO, p) + colores('colorCalzado', COLORES, p));
    default: // accesorios
      return Object.entries(ACCESORIOS).map(([cat, { nombre: titulo, opciones }]) =>
        grupo(titulo, chips(`acc.${cat}`, opciones, p)
          + (SIN_COLOR.includes(p.acc[cat]) ? '' : colores(`colorAcc.${cat}`, COLORES, p)))).join('')
        + '<p class="nota-creador">Puedes traer uno de cada tipo a la vez. Pronto habrá más en la boutique 🛍️</p>';
  }
}

/** Personaje al azar (para el dado 🎲). */
function personajeAlAzar(sexo) {
  const p = personajeInicial(sexo);
  const de = (lista) => alAzar(opcionesDe(lista, p)).id;
  Object.assign(p, {
    piel: alAzar(PIELES), estatura: de(ESTATURAS), complexion: de(COMPLEXIONES),
    peinado: de(PEINADOS), pelo: alAzar(COLORES_PELO), vello: sexo === 'hombre' ? de(VELLO) : 'ninguno',
    arriba: de(ARRIBA), colorArriba: alAzar(COLORES), colorArriba2: alAzar(COLORES), estampado: de(ESTAMPADOS),
    abajo: de(ABAJO), calzado: de(CALZADO), colorCalzado: alAzar(COLORES),
  });
  p.colorAbajo = alAzar(p.abajo === 'jeans' ? COLORES_MEZCLILLA : COLORES);
  for (const [cat, { opciones }] of Object.entries(ACCESORIOS)) {
    p.acc[cat] = Math.random() < 0.5 ? 'ninguno' : de(opciones);
    p.colorAcc[cat] = alAzar(COLORES);
  }
  return p;
}

/**
 * Abre el creador. La primera vez no se puede cancelar.
 * Devuelve el personaje guardado (o null si canceló).
 */
export async function editarPersonaje({ primeraVez = false } = {}) {
  let p = personaje() || personajeInicial();
  if (primeraVez && esRomantica() && !personaje()) p.acc.orejas = 'aretes_corazon'; // un regalito 💕
  let nombre = nombreJugador();
  let pestana = 'cuerpo';

  const cont = document.createElement('div');
  cont.className = 'creador';
  cont.innerHTML = `
    <div class="creador-vista">
      <div class="creador-svg"></div>
      <button class="btn-dado" aria-label="Personaje al azar">🎲</button>
    </div>
    <div class="segmentado creador-tabs">${PESTANAS.map(([id, t]) => `<button data-pestana="${id}">${t}</button>`).join('')}</div>
    <div class="creador-opciones"></div>`;
  const $svg = cont.querySelector('.creador-svg');
  const $opc = cont.querySelector('.creador-opciones');

  const pintar = (soloVista = false) => {
    $svg.innerHTML = dibujarPersonaje(p, { emocion: 'feliz' });
    if (soloVista) return;
    cont.querySelectorAll('[data-pestana]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pestana === pestana));
    const scroll = $opc.scrollTop;
    $opc.innerHTML = htmlPestana(pestana, p, nombre);
    $opc.scrollTop = scroll;
  };

  cont.addEventListener('click', (ev) => {
    const tab = ev.target.closest('[data-pestana]');
    if (tab) { sonidos.click(); pestana = tab.dataset.pestana; $opc.scrollTop = 0; pintar(); return; }
    if (ev.target.closest('.btn-dado')) { sonidos.pop(); p = personajeAlAzar(p.sexo); pintar(); return; }
    const b = ev.target.closest('[data-campo]');
    if (!b) return;
    sonidos.click();
    if (b.dataset.campo === 'sexo' && b.dataset.valor !== p.sexo) {
      // Al cambiar de sexo, sin barba ni bigote si es mujer
      p.sexo = b.dataset.valor;
      if (p.sexo === 'mujer') p.vello = 'ninguno';
    } else {
      escribir(p, b.dataset.campo, b.dataset.valor);
    }
    // Los jeans tienen sus propios colores: si el que traía no es de esa lista, se cambia
    if (b.dataset.campo === 'abajo') {
      const lista = p.abajo === 'jeans' ? COLORES_MEZCLILLA : COLORES;
      if (!lista.includes(p.colorAbajo)) p.colorAbajo = lista[p.abajo === 'jeans' ? 0 : 1];
    }
    pintar();
  });
  cont.addEventListener('input', (ev) => { if (ev.target.id === 'creador-nombre') nombre = ev.target.value; });
  pintar();

  const r = await mostrarModal({
    titulo: primeraVez ? '✨ Crea tu personaje' : '👤 Mi personaje',
    contenido: cont,
    botones: primeraVez
      ? [{ texto: '¡Listo! 🥞', clase: 'btn-primario', valor: 'ok' }]
      : [{ texto: 'Cancelar', valor: null }, { texto: 'Guardar', clase: 'btn-primario', valor: 'ok' }],
    cerrarAlTocarFuera: !primeraVez,
  });
  if (r !== 'ok') return null;
  guardarPersonaje(p);
  const limpio = limpiarNombre(nombre);
  if (limpio) ponerNombre(limpio);
  sonidos.logro();
  if (!primeraVez) aviso('👤 ¡Personaje guardado!');
  return p;
}

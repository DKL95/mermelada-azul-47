/* ============================================================
   dibujos.js — dibujos SVG reutilizables:
   íconos de ingredientes, crepas dobladas, toppings y salsas.
   Todo está hecho con figuras simples para editarlo fácil.
   ============================================================ */
import { ingrediente, DOBLADOS } from './data/ingredientes.js';
import { t } from './idioma.js';

// ---------- Utilidades de color ----------

function hexARgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbAHex([r, g, b]) {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}
/** Mezcla dos colores: t=0 → a, t=1 → b */
export function mezclar(a, b, t) {
  const A = hexARgb(a), B = hexARgb(b);
  return rgbAHex(A.map((v, i) => v + (B[i] - v) * t));
}
/** Oscurece un color (0..1) */
export function oscurecer(c, cuanto) {
  return mezclar(c, '#2A160C', cuanto);
}

// Color de la crepa según qué tan cocida está (v = tiempo / tiempo ideal)
const ESCALA_COCCION = [
  [0.0, '#F7EBC4'], // masa cruda
  [0.5, '#F3D99A'],
  [0.85, '#EBC27A'], // empieza lo perfecto: dorado claro
  [1.15, '#DFA557'], // dorado
  [1.35, '#B87434'], // tostada de más
  [1.6, '#4A2E1C'], // quemada
];
// Cada masa "tiñe" el color: [color, cuánto]
const TINTE_MASA = {
  masa_chocolate: ['#5A3324', 0.62],
  masa_integral: ['#9A6A3E', 0.3],
  masa_sarraceno: ['#5E4030', 0.45],
};
/** Tiñe un color de crepa según la masa. */
export function tenir(c, masa) {
  const t = TINTE_MASA[masa];
  return t ? mezclar(c, t[0], t[1]) : c;
}
export function colorCoccion(v, masa) {
  let c = ESCALA_COCCION[ESCALA_COCCION.length - 1][1];
  if (v <= 0) c = ESCALA_COCCION[0][1];
  else {
    for (let i = 1; i < ESCALA_COCCION.length; i++) {
      const [v1, c1] = ESCALA_COCCION[i];
      const [v0, c0] = ESCALA_COCCION[i - 1];
      if (v <= v1) { c = mezclar(c0, c1, (v - v0) / (v1 - v0)); break; }
    }
  }
  return tenir(c, masa);
}

// ---------- Generador aleatorio con semilla ----------
// (para que el mismo relleno se dibuje siempre igual)
export function aleatorio(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const COLORES_GRAGEAS = ['#FF4FA3', '#3DA5FF', '#FFD84D', '#22C55E', '#8B5CF6', '#FF6B4A'];
const r1 = (n) => Math.round(n * 10) / 10;

// ============================================================
//  Toppings sobre la crepa doblada (coordenadas del dibujo 200×200)
// ============================================================

/** Un montoncito de topping en (x, y). */
export function piezaTopping(id, x, y, semilla = 1, escala = 1) {
  const ing = ingrediente(id);
  if (!ing) return '';
  const rnd = aleatorio(semilla);
  const c = ing.color;
  const regado = (n, radio, fn) => Array.from({ length: n }, (_, i) => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * radio;
    return fn(r1(Math.cos(a) * d), r1(Math.sin(a) * d), Math.round(rnd() * 360), i);
  }).join('');
  let cuerpo = '';
  switch (ing.forma) {
    case 'trozos':
      cuerpo = regado(10, 13, (px, py, rot) =>
        `<path transform="translate(${px} ${py}) rotate(${rot})" d="M-3 -2 L2 -3 L3.5 1 L-1 3 Z" fill="${c}" stroke="${oscurecer(c, 0.3)}" stroke-width="0.6"/>`);
      break;
    case 'chispas':
      cuerpo = regado(10, 13, (px, py, rot) =>
        `<path transform="translate(${px} ${py}) rotate(${rot % 40 - 20})" d="M0 -3.5 Q3 1 0 2.5 Q-3 1 0 -3.5 Z" fill="${c}"/>`);
      break;
    case 'grageas':
      cuerpo = regado(16, 14, (px, py, rot, i) =>
        `<rect transform="translate(${px} ${py}) rotate(${rot})" x="-2.6" y="-0.9" width="5.2" height="1.8" rx="0.9" fill="${COLORES_GRAGEAS[i % COLORES_GRAGEAS.length]}"/>`);
      break;
    case 'oreo':
      cuerpo = regado(11, 13, (px, py, rot, i) => i % 4 === 3
        ? `<circle cx="${px}" cy="${py}" r="1.6" fill="#F4F1EA"/>`
        : `<path transform="translate(${px} ${py}) rotate(${rot})" d="M-3 -2 L3 -2.5 L2 2 L-2.5 2.5 Z" fill="${c}"/>`);
      break;
    case 'malvavisco':
      cuerpo = regado(6, 11, (px, py, rot, i) =>
        `<rect transform="translate(${px} ${py}) rotate(${rot})" x="-3.5" y="-3" width="7" height="6" rx="2.5" fill="${i % 3 ? '#FFFFFF' : '#FFC7DD'}" stroke="#E9D9E2" stroke-width="0.6"/>`);
      break;
    case 'laminas':
      cuerpo = regado(9, 13, (px, py, rot) =>
        `<ellipse transform="translate(${px} ${py}) rotate(${rot})" rx="4.5" ry="1.8" fill="${c}" stroke="${oscurecer(c, 0.2)}" stroke-width="0.6"/>`);
      break;
    case 'tiras':
      cuerpo = regado(18, 14, (px, py, rot) =>
        `<path transform="translate(${px} ${py}) rotate(${rot})" d="M-2.5 0 q1.2 -1.5 2.5 0 t2.5 0" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
      break;
    case 'aros':
      cuerpo = regado(8, 13, (px, py, rot, i) =>
        `<circle cx="${px}" cy="${py}" r="2.8" fill="none" stroke="${COLORES_GRAGEAS[i % COLORES_GRAGEAS.length]}" stroke-width="2"/>`);
      break;
    case 'bola': {
      const sombra = oscurecer(c, 0.15);
      cuerpo = `
        <path d="M-15 4 q2 9 6 7 q2 6 6 1 q4 7 7 0 q4 5 6 -3 q4 2 5 -5 z" fill="${sombra}"/>
        <circle r="15" fill="${c}"/>
        <path d="M-14 3 q7 5 14 2 q7 3 14 -2" stroke="${sombra}" stroke-width="2" fill="none"/>
        <ellipse cx="-5" cy="-6" rx="5" ry="3" fill="#FFFFFF" opacity="0.45"/>`;
      break;
    }
    case 'crema':
      cuerpo = `
        <ellipse cx="0" cy="5" rx="15" ry="8" fill="#FFFFFF" stroke="#E3E7EE" stroke-width="1.2"/>
        <ellipse cx="0" cy="-1" rx="11" ry="7" fill="#FFFFFF" stroke="#E3E7EE" stroke-width="1.2"/>
        <ellipse cx="0" cy="-7" rx="7" ry="5" fill="#FFFFFF" stroke="#E3E7EE" stroke-width="1.2"/>
        <path d="M-2 -11 q2 -5 4 -3 q-1 2 -4 3 z" fill="#FFFFFF" stroke="#E3E7EE" stroke-width="1"/>`;
      break;
    case 'cebollitas':
      cuerpo = regado(7, 12, (px, py, rot) =>
        `<ellipse transform="translate(${px} ${py}) rotate(${rot})" rx="3.6" ry="2.7" fill="none" stroke="${oscurecer(c, 0.25)}" stroke-width="2.4"/>
         <ellipse transform="translate(${px} ${py}) rotate(${rot})" rx="3.6" ry="2.7" fill="none" stroke="${c}" stroke-width="1.4"/>`);
      break;
    case 'gratinado':
      cuerpo = `
        <path d="M-15 0 Q-14 -10 -4 -12 Q6 -15 13 -7 Q18 2 10 10 Q4 13 2 17 Q0 20 -2 14 Q-8 12 -12 8 Q-16 5 -15 0 Z" fill="${c}" stroke="${oscurecer(c, 0.18)}" stroke-width="1"/>
        ${regado(6, 10, (px, py) => `<ellipse cx="${px}" cy="${py}" rx="${r1(1.5 + rnd() * 2)}" ry="${r1(1 + rnd() * 1.5)}" fill="${oscurecer(c, 0.4)}" opacity="0.55"/>`)}
        <path d="M-8 -6 q4 -3 9 -2" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.5" stroke-linecap="round"/>`;
      break;
    case 'cubitos': {
      const [c1, c2] = ing.colores || [c, '#FFFFFF'];
      cuerpo = regado(7, 12, (px, py, rot) =>
        `<g transform="translate(${px} ${py}) rotate(${rot})"><rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" fill="${c1}" stroke="${oscurecer(c1, 0.2)}" stroke-width="0.6"/><rect x="-2.5" y="-2.5" width="3" height="2.5" rx="1" fill="${c2}" opacity="0.8"/></g>`);
      break;
    }
    case 'polvo':
      cuerpo = regado(46, 19, (px, py) =>
        `<circle cx="${px}" cy="${py}" r="${r1(0.6 + rnd() * 1)}" fill="${c}" opacity="${id === 'azucar_glass' ? 0.95 : 0.8}"/>`);
      break;
    case 'hoja':
      cuerpo = [-35, 35].map((rot) => `
        <g transform="rotate(${rot}) translate(0 -7)">
          <path d="M0 8 Q-7 0 0 -9 Q7 0 0 8 Z" fill="${c}" stroke="${oscurecer(c, 0.25)}" stroke-width="0.8"/>
          <path d="M0 7 V-7" stroke="${oscurecer(c, 0.25)}" stroke-width="0.8"/>
        </g>`).join('');
      break;
    default:
      cuerpo = `<circle r="8" fill="${c}"/>`;
  }
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${escala})">${cuerpo}</g>`;
}

/** Un trazo de salsa (path "M x y L x y ...") */
export function trazoSalsa(id, d) {
  const c = ingrediente(id)?.color || '#4A2618';
  const borde = oscurecer(c, 0.25);
  return `<path d="${d}" stroke="${borde}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
    <path d="${d}" stroke="${c}" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" stroke="#FFFFFF" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.35" transform="translate(-0.8 -0.8)"/>`;
}

/** Cuenta lo que se le puso encima a la crepa:
 *  toppings {id: porciones}, salsas {id: largo}, piezas (total). */
export function conteoAdornos(crepa) {
  const toppings = {}, salsas = {};
  let piezas = 0;
  for (const a of crepa.adornos || []) {
    if (a.t === 'p') { toppings[a.id] = (toppings[a.id] || 0) + 1; piezas++; }
    else if (a.t === 's') salsas[a.id] = (salsas[a.id] || 0) + a.largo;
  }
  return { toppings, salsas, piezas };
}

function capaAdornos(crepa) {
  return (crepa.adornos || []).map((a) => (a.t === 's' ? trazoSalsa(a.id, a.d) : piezaTopping(a.id, a.x, a.y, a.s))).join('');
}

// ---------- ¿El punto cae sobre la crepa doblada? ----------

const SILUETAS = {
  triangulo: [[100, 184], [28, 66], [50, 44], [75, 32], [100, 28], [125, 32], [150, 44], [172, 66]],
  rollo: [[18, 60], [111, 60], [111, 100], [182, 100], [182, 144], [89, 144], [89, 104], [18, 104]],
  cono: [[44, 70], [56, 56], [100, 51], [144, 56], [156, 70], [104, 184], [96, 184]],
  sobre: [[38, 38], [162, 38], [162, 162], [38, 162]],
};
/** Punto dentro de polígono (regla par-impar). */
export function sobreLaCrepa(doblado, x, y) {
  const pol = SILUETAS[doblado] || SILUETAS.triangulo;
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// ============================================================
//  Íconos de ingredientes (40×40)
// ============================================================

const TAPAS = {
  nutella: '#E23B3B', cajeta: '#FFD84D', lechera: '#3DA5FF', mermelada_fresa: '#FFFFFF', queso_crema: '#3DA5FF',
  choco_oscuro: '#E7A35C', dulce_leche: '#FF8FB8', cacahuate: '#E23B3B', choco_blanco: '#F7B7C5', lotus: '#D9372B', pistache: '#6E8B3D',
};

function frasco(ing) {
  const tapa = TAPAS[ing.id] || oscurecer(ing.color, 0.3);
  const cuadros = ing.id === 'mermelada_fresa'
    ? `<path d="M8 7 h24 v7 h-24 z" fill="#FFFFFF"/><path d="M11 7 v7 M17 7 v7 M23 7 v7 M29 7 v7" stroke="#E8556B" stroke-width="2.5"/>` : '';
  return `
    <rect x="9" y="12" width="22" height="24" rx="5" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.5"/>
    <rect x="11" y="18" width="18" height="16" rx="3" fill="${ing.color}" stroke="${oscurecer(ing.color, 0.12)}" stroke-width="0.8"/>
    <rect x="8" y="7" width="24" height="7" rx="3" fill="${tapa}" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>${cuadros}
    <rect x="13" y="23" width="14" height="5" rx="2" fill="rgba(255,255,255,0.85)"/>`;
}

function botella(ing) {
  return `
    <path d="M17 4 h6 l1 6 h-8 z" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.2"/>
    <rect x="11" y="10" width="18" height="27" rx="6" fill="${ing.color}" stroke="${oscurecer(ing.color, 0.3)}" stroke-width="1.5"/>
    <rect x="14" y="18" width="12" height="9" rx="2" fill="rgba(255,255,255,0.85)"/>
    <path d="M14 14 v18" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>`;
}

function tazonCon(ing) {
  return `
    <ellipse cx="20" cy="20" rx="16" ry="5" fill="#BFDFFF"/>
    ${piezaTopping(ing.id, 20, 15, 11, 1.25)}
    <path d="M4 20 h32 a16 14 0 0 1 -32 0 z" fill="#8EC5FF" stroke="#3DA5FF" stroke-width="1.5"/>
    <path d="M9 25 q11 5 22 0" stroke="#FFFFFF" stroke-width="1.5" fill="none" opacity="0.7"/>`;
}

function salero(ing) {
  return `
    <path d="M13 6 h14 l2 6 h-18 z" fill="#C9D7EA" stroke="#9FB2CC" stroke-width="1"/>
    ${[16, 20, 24].map((x) => `<circle cx="${x}" cy="9" r="0.9" fill="#5A6B86"/>`).join('')}
    <rect x="10" y="12" width="20" height="25" rx="5" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.5"/>
    <rect x="12" y="20" width="16" height="15" rx="3" fill="${ing.color}" stroke="${oscurecer(ing.color, 0.15)}" stroke-width="0.8"/>`;
}

/** Vaso de bebida: caliente (taza) o fría (vaso con popote). */
export function vaso(ing) {
  const caliente = ing.id === 'cafe' || ing.id === 'chocolate_caliente';
  if (caliente) {
    return `
      <path d="M17 10 q-3 -3 0 -6 M22 10 q-3 -3 0 -6" stroke="#C9D7EA" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M9 13 h20 l-2 21 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 z" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.5"/>
      <ellipse cx="19" cy="14.5" rx="9" ry="2.5" fill="${ing.color}"/>
      <path d="M29 18 h3 a4 4 0 0 1 0 8 h-3" stroke="#C9C2BC" stroke-width="2.5" fill="none"/>
      <rect x="12" y="22" width="14" height="5" rx="2" fill="#FF4FA3" opacity="0.8"/>`;
  }
  return `
    <path d="M23 4 l-3 12" stroke="#FF4FA3" stroke-width="2.5" stroke-linecap="round"/>
    ${ing.id === 'frappe' ? '<ellipse cx="20" cy="12" rx="9" ry="4" fill="#FFFFFF" stroke="#E3E7EE"/>' : ''}
    <path d="M10 13 h20 l-3 24 h-14 z" fill="rgba(221,238,255,0.9)" stroke="#9FC4EE" stroke-width="1.5"/>
    <path d="M11 17 h18 l-2.5 19 h-13 z" fill="${ing.color}" opacity="0.9"/>
    ${ing.id === 'limonada' ? '<rect x="14" y="20" width="5" height="5" rx="1" fill="#FFFFFF" opacity="0.7"/><rect x="21" y="25" width="5" height="5" rx="1" fill="#FFFFFF" opacity="0.7"/>' : ''}`;
}

function tazonMasa(ing) {
  return `
    <ellipse cx="20" cy="26" rx="15" ry="9" fill="#DDEEFF" stroke="#3DA5FF" stroke-width="2"/>
    <ellipse cx="20" cy="22" rx="13" ry="5" fill="${tenir('#F7EBC4', ing.id)}"/>
    <path d="M24 6 l6 14" stroke="#B88F69" stroke-width="3" stroke-linecap="round"/>`;
}

const baya = (cx, cy, r, c1, c2) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c1}"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.35}" fill="${c2}" opacity="0.7"/>`;

const ICONOS = {
  fresa: `
    <path d="M20 36 C8 28 7 15 14 12 C17 11 19 12 20 13 C21 12 23 11 26 12 C33 15 32 28 20 36 Z" fill="#E8414F"/>
    <path d="M13 11 L20 15 L27 11 L23 9 L20 5 L17 9 Z" fill="#3FB56B"/>
    ${[[16, 19], [23, 19], [19, 24], [15, 26], [24, 26], [20, 30]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="0.9" ry="1.4" fill="#FFE59A"/>`).join('')}`,
  platano: `
    <path d="M7 12 C9 28 22 36 34 30 C35 29 35 27 33 27 C24 29 14 24 11 11 Z" fill="#FFD84D" stroke="#D9A82B" stroke-width="1.5"/>
    <path d="M7 12 l-2 -3 l4 1 z" fill="#6B4A2B"/>`,
  limon: `
    <path d="M5 28 A15 15 0 0 1 35 28 Z" fill="#E8D23A"/>
    <path d="M8 27 A12 12 0 0 1 32 27 Z" fill="#FFF7B0"/>
    <path d="M20 27 L11 19 M20 27 L20 15 M20 27 L29 19" stroke="#E8D23A" stroke-width="1.5"/>
    <path d="M27 8 q2 4 0 6 q-2 -2 0 -6" fill="#7FD3FF"/>`,
  zarzamora: `
    ${[[16, 14], [24, 14], [12, 20], [20, 20], [28, 20], [16, 26], [24, 26], [20, 32]].map(([x, y]) => baya(x, y, 4.6, '#3A1F3D', '#8E6A93')).join('')}
    <path d="M17 9 l3 -5 l3 5" fill="#3FB56B"/>`,
  frambuesa: `
    ${[[16, 14], [24, 14], [12, 20], [20, 20], [28, 20], [16, 26], [24, 26], [20, 32]].map(([x, y]) => baya(x, y, 4.6, '#D93A62', '#FFB0C4')).join('')}`,
  arandano: `
    ${[[13, 24], [27, 24], [20, 14]].map(([x, y]) => `${baya(x, y, 8, '#3E4F9C', '#9AA8E6')}<path d="M${x - 2} ${y - 6} l2 2 l2 -2" stroke="#1F2A5C" stroke-width="1.2" fill="none"/>`).join('')}`,
  uva: `
    ${[[14, 14], [22, 14], [30, 14], [18, 21], [26, 21], [22, 28], [14, 22]].map(([x, y]) => baya(x, y, 5, '#8E5BA8', '#D6B8E6')).join('')}
    <path d="M22 9 V4" stroke="#6B4A2B" stroke-width="2"/><path d="M22 6 q6 -4 9 1 q-5 2 -9 -1" fill="#3FB56B"/>`,
  durazno: `
    <circle cx="20" cy="23" r="13" fill="#FFB067"/>
    <circle cx="15" cy="20" r="7" fill="#FF8A6B" opacity="0.5"/>
    <path d="M20 10 q2 13 0 26" stroke="#E57F45" stroke-width="1.5" fill="none"/>
    <path d="M20 10 q8 -6 12 0 q-6 3 -12 0" fill="#3FB56B"/>`,
  mango: `
    <path d="M10 26 C6 12 24 4 32 14 C38 24 26 38 16 34 C12 32 11 30 10 26 Z" fill="#FFB627"/>
    <path d="M14 26 C12 18 22 12 28 16" stroke="#FFD36E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M30 12 q4 -7 8 -4 q-3 5 -8 4" fill="#3FB56B"/>`,
  manzana: `
    <path d="M20 13 C10 7 4 16 7 26 C10 36 17 36 20 33 C23 36 30 36 33 26 C36 16 30 7 20 13 Z" fill="#E8414F"/>
    <path d="M7 20 C10 15 16 14 20 16 C24 14 30 15 33 20 L33 22 C30 26 27 21 24 25 C21 22 18 27 15 23 C12 26 10 22 7 23 Z" fill="#D9893A"/>
    <path d="M20 13 V6" stroke="#6B4A2B" stroke-width="2"/>`,
  kiwi: `
    <circle cx="20" cy="20" r="15" fill="#8A6A3E"/>
    <circle cx="20" cy="20" r="13" fill="#8CC63F"/>
    <ellipse cx="20" cy="20" rx="5" ry="4" fill="#E6F2C2"/>
    ${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<ellipse cx="${r1(20 + Math.cos(a) * 7.5)}" cy="${r1(20 + Math.sin(a) * 7.5)}" rx="0.9" ry="1.6" transform="rotate(${Math.round((a * 180) / Math.PI + 90)} ${r1(20 + Math.cos(a) * 7.5)} ${r1(20 + Math.sin(a) * 7.5)})" fill="#2B2B2B"/>`; }).join('')}`,
  pina: `
    <path d="M14 8 l6 7 l6 -7 l-3 9 h-6 z" fill="#3FB56B"/>
    <ellipse cx="20" cy="26" rx="10" ry="12" fill="#FFC93C" stroke="#D99A1E" stroke-width="1.5"/>
    <path d="M12 20 l16 12 M12 32 l16 -12 M14 16 l12 20 M14 36 l12 -20" stroke="#D99A1E" stroke-width="1" opacity="0.7"/>`,
  crema_batida: `
    <path d="M10 26 h20 l-3 11 h-14 z" fill="#3DA5FF"/>
    ${piezaTopping('crema_batida', 20, 18, 1, 0.95)}`,
  menta: `${piezaTopping('menta', 20, 22, 1, 1.5)}`,
  arugula: `${piezaTopping('arugula', 20, 22, 1, 1.5)}`,
};

/** Tablita de madera con el relleno salado picado encima. */
function tablita(ing) {
  return `
    <rect x="3" y="23" width="34" height="11" rx="4" fill="#D9A866" stroke="#B5803F" stroke-width="1.5"/>
    <path d="M7 27 h22" stroke="#C99555" stroke-width="1" opacity="0.7"/>
    ${[[12, 21, -20], [20, 17, 15], [28, 21, 40]].map(([x, y, rot]) => piezaFruta(ing.id, x, y, 1.05, rot)).join('')}`;
}

/** Ícono SVG de cualquier ingrediente. */
export function iconoIngrediente(id) {
  const ing = ingrediente(id);
  let cuerpo = ICONOS[id];
  if (!cuerpo && ing) {
    switch (ing.categoria) {
      case 'masa': cuerpo = tazonMasa(ing); break;
      case 'untable': cuerpo = frasco(ing); break;
      case 'salado': cuerpo = tablita(ing); break;
      case 'salsa': cuerpo = botella(ing); break;
      case 'crujiente': cuerpo = tazonCon(ing); break;
      // Lo frío dulce va en cono; lo salado (aguacate, crema ácida), en tazón
      case 'frio': cuerpo = ing.salado ? tazonCon(ing) : `<path d="M12 24 h16 l-4 13 h-8 z" fill="#E6B87A" stroke="#C99555" stroke-width="1.2"/>${piezaTopping(id, 20, 17, 1, 0.65)}`; break;
      case 'decoracion': cuerpo = salero(ing); break;
      case 'bebida': cuerpo = vaso(ing); break;
    }
  }
  if (!cuerpo) cuerpo = `<circle cx="20" cy="20" r="14" fill="${ing?.color || '#ccc'}"/>`;
  return `<svg viewBox="0 0 40 40" aria-hidden="true">${cuerpo}</svg>`;
}

// ---------- Piezas de relleno (para que se asomen en la crepa doblada) ----------

function piezaFruta(id, x, y, s = 1, rot = 0) {
  const ing = ingrediente(id);
  if (!ing) return '';
  const t = `transform="translate(${r1(x)} ${r1(y)}) rotate(${rot}) scale(${s})"`;
  const [c1, c2, c3] = ing.colores || [ing.color, '#FFFFFF'];
  switch (ing.forma) {
    case 'fresa':
      return `<g ${t}><path d="M0 -7 C6 -7 8 -2 6 2 C4 6 0 8 0 8 C0 8 -4 6 -6 2 C-8 -2 -6 -7 0 -7 Z" fill="#E8414F"/>
        <path d="M0 -4 C3 -4 4 -1 3 1 C2 4 0 5 0 5 C0 5 -2 4 -3 1 C-4 -1 -3 -4 0 -4 Z" fill="#F79AA5"/></g>`;
    case 'platano':
      return `<g ${t}><circle r="6.5" fill="#FBF0C0" stroke="#E8D48A" stroke-width="1.2"/><circle r="1.6" fill="#D9C27A"/></g>`;
    case 'baya':
      return `<g ${t}><circle r="5.5" fill="${c1}"/><circle cx="-1.8" cy="-1.8" r="1.8" fill="${c2}" opacity="0.8"/></g>`;
    case 'gajo':
      return `<g ${t}><path d="M-7 3 Q0 -9 7 3 Q0 -2 -7 3 Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/></g>`;
    case 'cubo':
      return `<g ${t}><rect x="-4.5" y="-4.5" width="9" height="9" rx="2" fill="${c1}"/><rect x="-3" y="-3" width="4" height="3" rx="1" fill="${c2}" opacity="0.8"/></g>`;
    case 'rodaja':
      return `<g ${t}><circle r="7" fill="#8A6A3E"/><circle r="6" fill="${c1}"/><circle r="2.2" fill="${c2}"/>
        ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${r1(Math.cos(i) * 3.8)}" cy="${r1(Math.sin(i) * 3.8)}" r="0.7" fill="${c3 || '#333'}"/>`).join('')}</g>`;
    case 'gotas':
      return `<g ${t}><path d="M-6 2 A6 6 0 0 1 6 2 Z" fill="${c1}"/><path d="M-4.5 1.5 A4.5 4.5 0 0 1 4.5 1.5 Z" fill="${c2}"/></g>`;
    case 'loncha':
      return `<g ${t}><path d="M-7 -3 Q-2 -8 6 -5 Q8 0 4 5 Q-3 7 -7 2 Z" fill="${c1}" stroke="${oscurecer(c1, 0.2)}" stroke-width="0.8"/>
        <path d="M-5 -1 Q0 -4 4 -2" stroke="${c2}" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`;
    case 'hebras':
      return `<g ${t}>${[-3, 0, 3].map((dy, i) => `<path d="M-6 ${dy} q3 -3 6 0 t6 0" stroke="${i === 1 ? c2 : c1}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    case 'champi':
      return `<g ${t}><rect x="-2" y="-1" width="4" height="6" rx="1.5" fill="${c2}" stroke="${oscurecer(c1, 0.15)}" stroke-width="0.6"/>
        <path d="M-6.5 0 A6.5 5.5 0 0 1 6.5 0 Z" fill="${c1}" stroke="${oscurecer(c1, 0.2)}" stroke-width="0.8"/></g>`;
    case 'hojita':
      return `<g ${t}><path d="M0 7 Q-7 0 0 -7 Q7 0 0 7 Z" fill="${c1}" stroke="${oscurecer(c1, 0.2)}" stroke-width="0.6"/><path d="M0 6 V-5" stroke="${c2}" stroke-width="0.9"/></g>`;
    case 'granos':
      return `<g ${t}>${[[-3, -2], [2, -3], [-1, 2], [4, 2]].map(([x, y]) => `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" rx="1.6" fill="${c1}" stroke="${oscurecer(c1, 0.2)}" stroke-width="0.5"/>`).join('')}</g>`;
    case 'tiras':
      return `<g ${t}><path d="M-7 3 Q0 -5 7 2" stroke="${c1}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M-5 1.5 Q0 -3 5 1" stroke="${c2}" stroke-width="1" fill="none" stroke-linecap="round"/></g>`;
    case 'rodaja_carne':
      return `<g ${t}><circle r="6.5" fill="${c1}" stroke="${oscurecer(c1, 0.25)}" stroke-width="0.8"/>
        ${[[-2.5, -2], [2, -3], [3, 1.5], [-1.5, 2.5], [0, 0]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="${c2}"/>`).join('')}</g>`;
    default:
      return `<g ${t}><path d="M-3 -2 L2 -3 L3 1 L-1 3 Z" fill="${ing.color}"/></g>`;
  }
}

/** Lista visual de lo que se asoma: bandas de untables y piezas sueltas. */
function separarRellenos(rellenos = {}) {
  const untables = [];
  const piezas = [];
  for (const [id, porciones] of Object.entries(rellenos)) {
    if (!porciones) continue;
    const ing = ingrediente(id);
    if (!ing) continue;
    if (ing.categoria === 'untable') untables.push(ing.color);
    else for (let i = 0; i < Math.min(porciones * 2, 6); i++) piezas.push(id);
  }
  return { untables, piezas };
}

// ---------- Crepa doblada ----------

/**
 * Devuelve el SVG de una crepa terminada (con toppings y salsas).
 * @param {object} crepa  { masa, coccion:{lado1,lado2}, rellenos:{id:porciones}, doblado, semilla, adornos }
 */
export function crepaDoblada(crepa) {
  const masa = crepa.masa || 'masa_clasica';
  const v1 = crepa.coccion?.lado1 ?? 1;
  const v2 = crepa.coccion?.lado2 ?? 1;
  const fuera = colorCoccion(v1, masa);                       // el lado que queda por fuera
  const dentro = colorCoccion(Math.min(v2, 1.1) * 0.8, masa);  // el interior, más clarito
  const sombra = oscurecer(fuera, 0.18);
  const borde = oscurecer(fuera, 0.35);
  const { untables, piezas } = separarRellenos(crepa.rellenos);
  const rnd = aleatorio(crepa.semilla || 7);

  // Manchitas de "encaje" tostado típicas de la crepa
  const manchas = (cx, cy, rx, ry, n = 9) => Array.from({ length: n }, () => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    return `<ellipse cx="${r1(cx + Math.cos(a) * rx * d)}" cy="${r1(cy + Math.sin(a) * ry * d)}" rx="${r1(2 + rnd() * 4)}" ry="${r1(1.5 + rnd() * 3)}" fill="${sombra}" opacity="0.45"/>`;
  }).join('');

  let cuerpo = '';
  switch (crepa.doblado) {
    case 'rollo': {
      // Rollo cortado en dos piezas: en cada corte se ve la espiral con el relleno
      const espiral = (cx, cy, rx, ry, escala, fase = 0) => {
        const pts = [];
        for (let k = 0; k <= 48; k++) {
          const t = k / 48, a = fase + t * Math.PI * 5, r = (0.18 + 0.78 * t) * escala;
          pts.push(`${r1(cx + Math.cos(a) * rx * r)} ${r1(cy + Math.sin(a) * ry * r)}`);
        }
        return 'M' + pts.join(' L');
      };
      // Lo de adentro: el primer untable, o el color de la primera fruta
      const relleno = untables[0] || (piezas[0] ? ingrediente(piezas[0]).color : null);
      const capa = mezclar(dentro, '#FFFFFF', 0.25); // las capas de crepa en el corte
      const pieza = (x, y, ancho, corteDerecha, fr) => {
        const cy = y + 22;
        const cx = corteDerecha ? x + ancho : x;   // el lado del corte
        const punta = corteDerecha ? x : x + ancho; // la otra punta, abierta y de lado
        const s = corteDerecha ? 1 : -1;
        // Cuerpo suavecito: un poco abombado por arriba
        const d = `M${punta} ${y + 8} Q${punta} ${y} ${punta + s * 10} ${y} Q${(punta + cx) / 2} ${y - 4} ${cx} ${y + 1}
          L${cx} ${y + 43} Q${(punta + cx) / 2} ${y + 46} ${punta + s * 10} ${y + 44} Q${punta} ${y + 44} ${punta} ${y + 36} Z`;
        // La última capa de crepa se enrolla por encima y termina en una orilla ondulada
        const paso = (ancho - 12) / 6;
        const ondas = Array.from({ length: 6 }, (_, i) => `q${r1(-s * paso / 2)} ${i % 2 ? -4 : 4} ${r1(-s * paso)} 0`).join(' ');
        const orilla = `M${cx - s * 6} ${y + 18} ${ondas}`;
        const solapa = `M${punta + s * 4} ${y + 3} L${cx - s * 6} ${y + 2} L${cx - s * 6} ${y + 18} ${ondas} Z`;
        // Relleno escurriendo por el corte
        const escurre = relleno
          ? `<path d="M${cx - 7} ${cy + 14} q-1 10 3 14 q4 4 6 -2 q2 -6 4 -12 z" fill="${relleno}" stroke="${oscurecer(relleno, 0.2)}" stroke-width="1.2"/>`
          : '';
        const bandas = untables.slice(1).map((c, i) => `<path d="${espiral(cx, cy, 12, 21, 0.9, 2 + i * 1.4)}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`).join('');
        return `
          <ellipse cx="${punta}" cy="${cy}" rx="5" ry="19" fill="${relleno || dentro}" stroke="${borde}" stroke-width="2.5"/>
          <path d="${d}" fill="${fuera}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/>
          ${manchas(x + ancho / 2, cy + 8, ancho / 2 - 14, 8, 4)}
          <path d="${solapa}" fill="${mezclar(fuera, '#FFFFFF', 0.12)}" opacity="0.9"/>
          <path d="${orilla}" fill="none" stroke="${sombra}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M${punta + s * 12} ${y + 7} L${cx - s * 14} ${y + 5}" stroke="rgba(255,255,255,0.45)" stroke-width="3.5" stroke-linecap="round"/>
          <ellipse cx="${cx}" cy="${cy}" rx="13" ry="23" fill="${relleno || dentro}" stroke="${borde}" stroke-width="3"/>
          <path d="${espiral(cx, cy, 12, 21, 1)}" fill="none" stroke="${capa}" stroke-width="3.2" stroke-linecap="round"/>
          ${bandas}
          ${escurre}
          ${fr}`;
      };
      const fruta = (desde, cx, cy) => piezas.slice(desde, desde + 2).map((id, i) => piezaFruta(id, cx + (i ? 5 : -3), cy + (i ? 9 : -6), 0.75, i * 60)).join('');
      // Lo que se salió del corte y quedó en el plato
      const sueltas = piezas.slice(4, 6).map((id, i) => piezaFruta(id, 40 + i * 18, 130 + i * 4, 0.85, i * 90)).join('');
      cuerpo = `
        <ellipse cx="100" cy="112" rx="92" ry="44" fill="#FFFFFF" stroke="#DCE6F2" stroke-width="3"/>
        <ellipse cx="100" cy="112" rx="74" ry="32" fill="none" stroke="#EEF3FA" stroke-width="2"/>
        ${pieza(18, 60, 80, true, fruta(0, 98, 82))}
        ${sueltas}
        ${pieza(102, 100, 80, false, fruta(2, 102, 122))}`;
      break;
    }
    case 'cono': {
      const montoncito = untables.map((c, i) => `<ellipse cx="100" cy="${66 - i * 4}" rx="${44 - i * 8}" ry="${12 - i * 2}" fill="${c}"/>`).join('');
      const fr = piezas.map((id, i) => piezaFruta(id, 70 + ((i * 37) % 60), 54 + ((i * 13) % 14), 1.1, i * 40)).join('');
      cuerpo = `
        <ellipse cx="100" cy="70" rx="56" ry="17" fill="${dentro}" stroke="${borde}" stroke-width="3"/>
        ${montoncito}${fr}
        <path d="M44 70 Q100 92 156 70 L104 182 Q100 188 96 182 Z" fill="${fuera}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/>
        ${manchas(100, 100, 30, 18, 6)}
        <path d="M58 82 Q100 104 140 84 L120 126 Q100 110 76 120 Z" fill="${sombra}" opacity="0.35"/>
        <!-- cono de papel para comerla caminando -->
        <path d="M70 122 Q100 132 130 122 L103 184 Q100 188 97 184 Z" fill="#FFFFFF" stroke="#C9D7EA" stroke-width="2" stroke-linejoin="round"/>
        <path d="M80 140 Q100 146 120 140 M88 158 Q100 162 112 158" stroke="#3DA5FF" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      break;
    }
    case 'sobre': {
      const centro = (untables[0] || (piezas[0] ? ingrediente(piezas[0]).color : dentro));
      const fr = piezas.slice(0, 4).map((id, i) => piezaFruta(id, 92 + (i % 2) * 16, 92 + Math.floor(i / 2) * 16, 0.9)).join('');
      cuerpo = `
        <rect x="38" y="38" width="124" height="124" rx="14" fill="${fuera}" stroke="${borde}" stroke-width="3"/>
        ${manchas(100, 100, 55, 55, 10)}
        <rect x="80" y="80" width="40" height="40" rx="6" fill="${centro}"/>
        ${fr}
        <path d="M40 40 L84 84 M160 40 L116 84 M40 160 L84 116 M160 160 L116 116" stroke="${sombra}" stroke-width="3" stroke-linecap="round"/>
        <path d="M42 44 L80 80 L80 120 L42 156 Z" fill="${oscurecer(fuera, 0.08)}" opacity="0.6"/>`;
      break;
    }
    case 'triangulo':
    default: {
      // El relleno se asoma por la orilla curva de arriba
      const bandas = untables.map((c, i) => `<path d="M36 ${60 - i * 5} Q100 ${-4 - i * 5} 164 ${60 - i * 5}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`).join('');
      const enArco = (t) => [30 * (1 - t) ** 2 + 200 * t * (1 - t) + 170 * t * t, 66 * (1 - t) ** 2 + 8 * t * (1 - t) + 66 * t * t];
      const fr = piezas.map((id, i) => {
        const [x, y] = enArco(0.18 + ((i * 0.37) % 0.64));
        return piezaFruta(id, x, y - 6, 1.1, i * 50);
      }).join('');
      cuerpo = `
        ${bandas}${fr}
        <path d="M100 182 L30 66 Q100 4 170 66 Z" fill="${fuera}" stroke="${borde}" stroke-width="3" stroke-linejoin="round"/>
        ${manchas(100, 90, 42, 38)}
        <path d="M100 182 L56 80 Q100 48 144 80 Z" fill="${dentro}" opacity="0.55" stroke="${sombra}" stroke-width="2"/>`;
    }
  }
  return `<svg viewBox="0 0 200 200" class="crepa-svg" aria-hidden="true">
    <ellipse cx="100" cy="186" rx="60" ry="8" fill="rgba(27,42,85,0.15)"/>
    ${cuerpo}
    ${capaAdornos(crepa)}
  </svg>`;
}

/** Ícono del estilo de doblado para los botones. */
export function iconoDoblado(estilo) {
  return crepaDoblada({ doblado: estilo, coccion: { lado1: 1, lado2: 1 }, rellenos: { nutella: 1, fresa: 1 }, semilla: 3 });
}

// ============================================================
//  Tickets de pedido
// ============================================================

/** Lista de lo que lleva un pedido, en orden: masa, rellenos, toppings, salsas. */
function itemsPedido(pedido) {
  const items = [];
  if (pedido.masa && pedido.masa !== 'masa_clasica') items.push([pedido.masa, 1]);
  for (const par of Object.entries(pedido.rellenos || {})) items.push(par);
  for (const par of Object.entries(pedido.toppings || {})) items.push(par);
  for (const id of pedido.salsas || []) items.push([id, 1]);
  if (pedido.bebida) items.push([pedido.bebida, 1]);
  return items;
}

/** Íconos de un pedido (ingredientes + doblado). max = cuántos íconos caben. */
export function iconosPedido(pedido, max = 99) {
  const items = itemsPedido(pedido);
  const visibles = items.length > max ? items.slice(0, max - 1) : items;
  const ing = visibles.map(([id, n]) =>
    `<span class="ico-ing">${iconoIngrediente(id)}${n > 1 ? `<b>×${n}</b>` : ''}</span>`).join('');
  const mas = items.length > visibles.length ? `<span class="ico-mas">+${items.length - visibles.length}</span>` : '';
  const d = DOBLADOS.find((x) => x.id === pedido.doblado);
  return `${ing}${mas}<span class="ico-doblez">${d.nombre}</span>`;
}

/** Ticket completo con nombres, agrupado por estación (para leerlo con calma). */
export function ticketDetalle(pedido) {
  const fila = (titulo, lista) => !lista.length ? '' : `
    <div class="det-fila"><span class="det-titulo">${titulo}</span>
      <span class="det-items">${lista.map(([id, n]) => `<span class="det-item">${iconoIngrediente(id)}${ingrediente(id).nombre}${n > 1 ? ` <b>×${n}</b>` : ''}</span>`).join('')}</span>
    </div>`;
  const d = DOBLADOS.find((x) => x.id === pedido.doblado);
  return `<div class="ticket-detalle">
    ${fila(`🥣 ${t('Masa')}`, [[pedido.masa || 'masa_clasica', 1]])}
    ${fila(`🍓 ${t('Adentro')}`, Object.entries(pedido.rellenos || {}))}
    <div class="det-fila"><span class="det-titulo">📐 ${t('Doblado')}</span><span class="det-items"><span class="det-item">${iconoDoblado(d.id)}${d.nombre}</span></span></div>
    ${fila(`🍨 ${t('Encima')}`, Object.entries(pedido.toppings || {}).filter(([id]) => ingrediente(id).categoria !== 'decoracion'))}
    ${fila(`🎨 ${t('Decorar')}`, [...(pedido.salsas || []).map((id) => [id, 1]), ...Object.entries(pedido.toppings || {}).filter(([id]) => ingrediente(id).categoria === 'decoracion')])}
    ${pedido.bebida ? fila(`☕ ${t('Bebida')}`, [[pedido.bebida, 1]]) : ''}
  </div>`;
}

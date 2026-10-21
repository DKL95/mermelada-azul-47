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
import { tieneArticulo } from './cartera.js';
import { nombreJugador, ponerNombre, limpiarNombre } from './ranking.js';
import { g } from './genero.js';
import { CUERPO, ropa, extra, detallesCara, peinadoAtras, peinadoFrente, accesorio, caraSVG } from './clientes.js';
import {
  SEXOS, PIELES, ESTATURAS, COMPLEXIONES, PEINADOS, COLORES_PELO, VELLO, ARRIBA, ESTAMPADOS,
  ABAJO, CALZADO, ACCESORIOS, COLORES, COLORES_MEZCLILLA, TRAJES, personajeInicial, claveArticulo,
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

export function guardarPersonaje(p) {
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin espacio o modo privado */ }
  window.dispatchEvent(new Event('personaje:cambio'));
}

// ============================================================
//  Dibujo
// ============================================================

const PISO = 288;   // donde pisan los pies (coordenadas del dibujo)
const HOMBRO = 120; // de aquí para abajo se estira según estatura y complexión
let svgN = 0;

/** Estrella de 5 picos (para emblemas, lentes, aretes…). */
function estrella(cx, cy, r, color, extra = '') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)},${(cy + Math.sin(ang) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${color}" ${extra}/>`;
}

/** Corazoncito con la punta en (x, y). */
const corazon = (x, y, r, color, extra = '') =>
  `<path d="M${x} ${y} l-${r} -${r} a${r * 0.62} ${r * 0.62} 0 0 1 ${r} -${r * 0.78} a${r * 0.62} ${r * 0.62} 0 0 1 ${r} ${r * 0.78} z" fill="${color}" ${extra}/>`;

// ---------- Torsos de los disfraces (mismo encuadre que ropa() de clientes.js) ----------
// manga: color de las mangas (null = sin mangas, se ven los brazos)

const TORSOS = {
  arana: (p, clip) => {
    const telarana = [...[0, 45, 90, 135, 180, 225, 270, 315].map((g) => {
      const a = (g * Math.PI) / 180;
      return `<path d="M60 150 L${(60 + Math.cos(a) * 80).toFixed(1)} ${(150 + Math.sin(a) * 80).toFixed(1)}"/>`;
    }), ...[14, 28, 42, 56].map((r) => `<circle cx="60" cy="150" r="${r}"/>`)].join('');
    return {
      manga: '#D62839',
      abajo: `<path d="${CUERPO}" fill="#D62839"/>
        <g clip-path="url(#${clip})">
          <path d="M18 206 Q22 150 40 128 L46 206 Z M102 206 Q98 150 80 128 L74 206 Z" fill="#1F5FFF"/>
          <g stroke="#7A1020" stroke-width="1" fill="none" opacity="0.6">${telarana}</g>
        </g>
        <g stroke="#1B1B2B" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M57 146 q-8 -7 -12 -2 M57 150 q-9 0 -13 4 M57 153 q-7 5 -9 11 M58 155 q-4 6 -4 12"/>
          <path d="M63 146 q8 -7 12 -2 M63 150 q9 0 13 4 M63 153 q7 5 9 11 M62 155 q4 6 4 12"/>
        </g>
        <ellipse cx="60" cy="151" rx="3.6" ry="6" fill="#1B1B2B"/><circle cx="60" cy="143.5" r="2.7" fill="#1B1B2B"/>`,
      encima: '',
    };
  },
  mago: (p) => ({
    manga: '#22222C',
    abajo: `<path d="${CUERPO}" fill="#22222C"/>
      <path d="M48 121 L60 152 L72 121 Z" fill="#FFFFFF"/>
      <path d="M58 124 h4 l2 22 l-4 6 l-4 -6 z" fill="${p.colorAcc.cuello}"/>
      <path d="M57 133 l6 -3 M57 141 l6 -3" stroke="#FFD84D" stroke-width="2"/>
      <path d="M44 121 L60 162 L34 142 Z M76 121 L60 162 L86 142 Z" fill="#30303D"/>
      <path d="M74 146 h12 v8 q-6 6 -6 6 q0 0 -6 -6 z" fill="${p.colorAcc.cuello}" stroke="#FFD84D" stroke-width="1.5"/>`,
    encima: '',
  }),
  murcielago: (p, clip) => ({
    manga: '#5A5F6E',
    abajo: `<path d="${CUERPO}" fill="#5A5F6E"/>
      <path d="M45 150 q4 -6 8 -2 l2 -4 l2 3 h6 l2 -3 l2 4 q4 -4 8 2 q-6 -1 -7 4 q-3 -3 -5 1 q-2 -3 -5 0 q-1 -5 -6 -3 z" fill="#1B1B2B"/>
      <g clip-path="url(#${clip})"><rect x="0" y="186" width="120" height="9" fill="#FFD84D"/>
      ${[36, 50, 70, 84].map((x) => `<rect x="${x - 4}" y="184" width="8" height="12" rx="2" fill="#E0B020"/>`).join('')}</g>`,
    encima: '',
  }),
  capitan: (p, clip) => ({
    manga: '#1F5FFF',
    abajo: `<path d="${CUERPO}" fill="#1F5FFF"/>
      <g clip-path="url(#${clip})"><rect x="36" y="176" width="48" height="32" fill="#FFFFFF"/>
      ${[38, 47, 56, 65, 74].map((x) => `<rect x="${x}" y="176" width="5" height="32" fill="#D62839"/>`).join('')}</g>
      ${estrella(60, 150, 13, '#FFFFFF', 'stroke="#C9D2E3" stroke-width="1"')}`,
    encima: '',
  }),
  heroe: (p, clip) => ({
    manga: '#1F5FFF',
    abajo: `<path d="${CUERPO}" fill="#1F5FFF"/>
      <path d="M47 136 h26 l-4 16 l-9 9 l-9 -9 z" fill="#FFD84D" stroke="#E0A800" stroke-width="1.5" stroke-linejoin="round"/>
      ${estrella(60, 147, 7, '#E8414F')}
      <g clip-path="url(#${clip})"><rect x="0" y="186" width="120" height="8" fill="#E8414F"/></g>
      <rect x="55" y="184" width="10" height="12" rx="2" fill="#FFD84D"/>`,
    encima: '',
  }),
  amazona: (p, clip) => ({
    manga: null,
    abajo: `<path d="${CUERPO}" fill="#D62839"/>
      <path d="M38 138 q10 -6 22 4 q12 -10 22 -4 q-10 4 -22 11 q-12 -7 -22 -11 z" fill="#FFD84D" stroke="#E0A800" stroke-width="1"/>
      <g clip-path="url(#${clip})"><rect x="0" y="180" width="120" height="9" fill="#FFD84D"/></g>`,
    encima: `<path d="M46 121 q14 10 28 0 v4 q-14 10 -28 0 z" fill="${p.piel}"/>`,
  }),
  astronauta: (p) => ({
    manga: '#F2F4F8',
    abajo: `<path d="${CUERPO}" fill="#F2F4F8" stroke="#C9D2E3" stroke-width="1.5"/>
      <rect x="46" y="142" width="28" height="18" rx="3" fill="#D9DEE8" stroke="#B8C2D6"/>
      <circle cx="53" cy="151" r="2.6" fill="#E8414F"/><circle cx="60" cy="151" r="2.6" fill="#3DA5FF"/><circle cx="67" cy="151" r="2.6" fill="#FFD84D"/>
      <rect x="26" y="146" width="12" height="8" rx="1" fill="#3DA5FF"/><path d="M26 150 h12" stroke="#FFFFFF" stroke-width="1.5"/>`,
    encima: `<rect x="36" y="116" width="48" height="9" rx="4.5" fill="#C9D2E3"/>`,
  }),
  pirata: (p) => ({
    manga: '#FAF6EC',
    abajo: `<path d="${CUERPO}" fill="#FAF6EC"/>
      <path d="M56 126 l8 5 M64 126 l-8 5 M56 134 l8 5 M64 134 l-8 5" stroke="#8A6A4A" stroke-width="1.2"/>
      <path d="M18 206 q0 -60 18 -82 L50 124 L46 206 Z M102 206 q0 -60 -18 -82 L70 124 L74 206 Z" fill="#3B2219"/>
      <rect x="20" y="180" width="80" height="12" fill="#C0392B"/><path d="M84 190 l6 16 l4 -2 l-4 -14 z" fill="#C0392B"/>`,
    encima: '',
  }),
  samurai: (p) => ({
    manga: p.colorArriba,
    abajo: `<path d="${CUERPO}" fill="${p.colorArriba}"/>
      <path d="M45 120 L68 172 M75 120 L52 172" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
      <rect x="22" y="170" width="76" height="14" fill="${p.colorArriba2}"/><path d="M62 172 l10 18 l5 -3 l-8 -15 z" fill="${p.colorArriba2}"/>`,
    encima: '',
  }),
  karategi: (p, clip) => ({
    manga: null, // sin mangas, como de pelea
    abajo: `<path d="${CUERPO}" fill="#F7F7F2"/>
      <path d="M44 121 L66 176 M76 121 L54 176" stroke="#D3D6DE" stroke-width="3"/>
      <g clip-path="url(#${clip})"><rect x="0" y="174" width="120" height="10" fill="#1B1B2B"/></g>
      <path d="M62 180 l-6 20 l5 1 l4 -18 z M64 180 l8 18 l4 -2 l-8 -16 z" fill="#1B1B2B"/>`,
    encima: '',
  }),
  gi_naranja: (p, clip) => ({
    manga: '#1F5FFF',
    abajo: `<path d="${CUERPO}" fill="#FF7A1A"/>
      <path d="M45 121 L60 150 L75 121 Z" fill="#1F5FFF"/>
      <path d="M45 121 L66 172 M75 121 L54 172" stroke="rgba(0,0,0,0.12)" stroke-width="2"/>
      <g clip-path="url(#${clip})"><rect x="0" y="172" width="120" height="11" fill="#1F5FFF"/></g>
      <path d="M62 178 l-4 18 l5 1 l2 -16 z" fill="#1F5FFF"/>`,
    encima: '',
  }),
  tunica_verde: (p, clip) => ({
    manga: '#F2F4F8',
    abajo: `<path d="${CUERPO}" fill="#3E9142"/>
      <path d="M48 121 L60 136 L72 121 Z" fill="#F2F4F8"/>
      <g clip-path="url(#${clip})"><rect x="0" y="176" width="120" height="8" fill="#6B3E2E"/></g>
      <rect x="54" y="174" width="12" height="12" rx="2" fill="none" stroke="#FFD84D" stroke-width="2.5"/>
      <path d="M36 140 L84 140" stroke="rgba(0,0,0,0.1)" stroke-width="2"/>`,
    encima: '',
  }),
  dino: (p, clip) => ({
    manga: '#4CAF50',
    abajo: `<path d="${CUERPO}" fill="#4CAF50"/>
      <g clip-path="url(#${clip})"><ellipse cx="60" cy="176" rx="22" ry="32" fill="#C5E8A5"/>
      ${[[52, 160], [58, 174], [64, 188], [66, 160], [54, 190]].map(([x, y]) => `<path d="M${x - 6} ${y} h12" stroke="#A5D47F" stroke-width="2"/>`).join('')}</g>
      ${[[30, 150], [88, 140], [34, 182], [86, 176]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#3E9142"/>`).join('')}`,
    encima: '',
  }),
};

// ---------- Accesorios nuevos (los que no sabe dibujar clientes.js) ----------

/** Cabeza y ojos. Si no es de aquí, lo dibuja accesorio() de clientes.js. */
function accesorioPersonaje(id, c) {
  switch (id) {
    // --- Cabeza ---
    case 'corona': return `<path d="M34 36 L39 14 L49 28 L60 10 L71 28 L81 14 L86 36 Z" fill="#FFD84D" stroke="#E0A800" stroke-width="2" stroke-linejoin="round"/>
      <rect x="33" y="33" width="54" height="8" rx="2" fill="#FFD84D" stroke="#E0A800" stroke-width="2"/>
      <circle cx="60" cy="37" r="3" fill="#E8414F"/><circle cx="46" cy="37" r="2.4" fill="#3DA5FF"/><circle cx="74" cy="37" r="2.4" fill="#22C55E"/>
      <circle cx="39" cy="14" r="2.2" fill="#FFFFFF"/><circle cx="60" cy="10" r="2.6" fill="#FFFFFF"/><circle cx="81" cy="14" r="2.2" fill="#FFFFFF"/>`;
    case 'tiara': return `<path d="M26 52 Q60 28 94 52" stroke="#FFD84D" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${estrella(60, 34, 9, '#E8414F', 'stroke="#FFD84D" stroke-width="2"')}`;
    case 'orejas_gato': return [-1, 1].map((s) => {
      const x = 60 + s * 30;
      return `<path d="M${x - s * 12} 40 L${x + s * 2} 10 L${x + s * 16} 34 Z" fill="${c}" stroke="rgba(0,0,0,0.15)" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M${x - s * 6} 36 L${x + s * 2} 18 L${x + s * 10} 33 Z" fill="#FFB3D6"/>`;
    }).join('');
    case 'cuernitos': return [-1, 1].map((s) => `<path d="M${60 + s * 22} 34 q${s * -6} -14 ${s * 2} -24 q${s * 1} 12 ${s * 10} 20 z" fill="#E8414F" stroke="#B02030" stroke-width="1.5"/>`).join('');
    case 'aureola': return `<ellipse cx="60" cy="12" rx="24" ry="6" fill="none" stroke="#FFD84D" stroke-width="4"/>
      <ellipse cx="60" cy="12" rx="24" ry="6" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>`;
    case 'sombrero_bruja': return `<path d="M58 -14 L86 38 H34 Z" fill="${c}"/><path d="M58 -14 q8 4 4 14" stroke="rgba(0,0,0,0.15)" stroke-width="3" fill="none"/>
      <rect x="38" y="30" width="44" height="8" fill="#1B1B2B"/><rect x="55" y="29" width="10" height="10" rx="1" fill="none" stroke="#FFD84D" stroke-width="2"/>
      <ellipse cx="60" cy="40" rx="50" ry="8" fill="${c}"/>`;
    case 'gorra_fontanero': return `<path d="M22 54 q2 -38 38 -38 q36 0 38 38 z" fill="${c}"/>
      <path d="M22 52 Q60 62 98 52 Q100 62 60 68 Q20 62 22 52 Z" fill="${c}" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>
      <circle cx="60" cy="36" r="10" fill="#FFFFFF"/>
      <path d="M54 32 h12 l-6 10 z" fill="#F2C27E" stroke="#C98E4B" stroke-width="1"/><path d="M54 32 h12 l-1.5 2.5 h-9 z" fill="#6B3E2E"/>`;
    case 'banda_roja': return `<rect x="20" y="46" width="80" height="9" rx="4" fill="#D62839"/>
      <path d="M98 50 q14 4 20 16 l-4 2 q-6 -10 -16 -12 z M98 52 q8 10 8 24 l-4 0 q0 -12 -6 -20 z" fill="#D62839"/>`;
    case 'pelo_picos': return `<path d="M16 76 L6 52 L22 54 L12 30 L33 38 L30 10 L50 30 L60 2 L70 30 L90 10 L87 38 L108 30 L98 54 L114 52 L104 76 Q100 46 60 44 Q20 46 16 76 Z" fill="#1B1B2B"/>
      <path d="M28 54 L38 66 L42 48 L52 62 L60 44 L68 62 L78 48 L82 66 L92 54 Q88 38 60 36 Q32 38 28 54 Z" fill="#1B1B2B"/>`;
    case 'gorro_elfo': return `<path d="M20 58 Q22 22 60 20 Q92 20 102 42 L126 96 Q104 74 96 58 Z" fill="#3E9142"/>
      <path d="M20 58 Q60 44 100 58" stroke="#2E7A34" stroke-width="4" fill="none"/>`;
    case 'capucha_erizo': return `<path d="M20 44 L-10 34 L14 58 L-12 68 L16 76 Z" fill="#1F5FFF"/>
      <path d="M33 32 L38 8 L52 27 Z M87 32 L82 8 L68 27 Z" fill="#1F5FFF"/><path d="M38 28 L40 16 L47 26 Z M82 28 L80 16 L73 26 Z" fill="#F6C9A4"/>
      <path d="M16 88 Q12 22 60 20 Q108 22 104 88 Q98 50 60 46 Q22 50 16 88 Z" fill="#1F5FFF"/>`;
    case 'banda_samurai': return `<rect x="20" y="44" width="80" height="10" rx="4" fill="#FFFFFF" stroke="#D9DEE8"/><circle cx="60" cy="49" r="4" fill="#E8414F"/>
      <path d="M98 48 l12 8 l-2 4 l-12 -6 z M98 50 l8 14 l-4 2 l-6 -12 z" fill="#FFFFFF" stroke="#D9DEE8"/>`;
    case 'mascara_arana': {
      const lineas = [...[200, 240, 270, 300, 340, 20, 60, 90, 120, 160].map((g) => {
        const a = (g * Math.PI) / 180;
        return `<path d="M60 72 L${(60 + Math.cos(a) * 34).toFixed(1)} ${(72 + Math.sin(a) * 34).toFixed(1)}"/>`;
      }), ...[11, 22, 32].map((r) => `<circle cx="60" cy="72" r="${r}"/>`)].join('');
      return `<circle cx="60" cy="68" r="41" fill="#D62839"/>
        <g stroke="#7A1020" stroke-width="1.1" fill="none" opacity="0.7">${lineas}</g>
        <path d="M34 62 q10 -10 22 2 q-8 14 -22 -2 z M86 62 q-10 -10 -22 2 q8 14 22 -2 z" fill="#FFFFFF" stroke="#1B1B2B" stroke-width="3" stroke-linejoin="round"/>`;
    }
    case 'capucha_murcielago': return `<path d="M30 40 L34 8 L46 30 Z M90 40 L86 8 L74 30 Z" fill="#2B2B35"/>
      <path d="M19 76 Q19 26 60 26 Q101 26 101 76 L88 80 Q76 70 60 78 Q44 70 32 80 Z" fill="#2B2B35"/>
      <path d="M38 64 q8 -5 16 1 q-8 4 -16 -1 z M82 64 q-8 -5 -16 1 q8 4 16 -1 z" fill="#FFFFFF"/>`;
    case 'casco_astronauta': return `<circle cx="60" cy="66" r="50" fill="rgba(190,230,255,0.28)" stroke="#FFFFFF" stroke-width="5"/>
      <circle cx="60" cy="66" r="50" fill="none" stroke="#C9D2E3" stroke-width="1.5"/>
      <path d="M28 44 A40 40 0 0 1 52 22" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
      <rect x="30" y="108" width="60" height="10" rx="5" fill="#C9D2E3"/>`;
    case 'sombrero_pirata': return `<path d="M14 46 Q60 -6 106 46 Q60 32 14 46 Z" fill="#1B1B2B"/>
      <path d="M16 45 Q60 31 104 45" stroke="#FFD84D" stroke-width="2" fill="none"/>
      <circle cx="60" cy="26" r="6" fill="#FFFFFF"/><rect x="56.5" y="29" width="7" height="4" rx="1" fill="#FFFFFF"/>
      <circle cx="57.6" cy="25.5" r="1.4" fill="#1B1B2B"/><circle cx="62.4" cy="25.5" r="1.4" fill="#1B1B2B"/>`;
    case 'gorro_dino': return `${[[30, 30], [44, 18], [60, 13], [76, 18], [90, 30]].map(([x, y]) => `<path d="M${x - 7} ${y + 6} L${x} ${y - 9} L${x + 7} ${y + 6} Z" fill="#FFD84D"/>`).join('')}
      <path d="M17 82 Q14 24 60 22 Q106 24 103 82 Q98 46 60 44 Q22 46 17 82 Z" fill="#4CAF50"/>
      <path d="M22 58 Q60 30 98 58" stroke="#3E9142" stroke-width="2" fill="none"/>`;
    // --- Ojos ---
    case 'lentes_redondos': return `<g fill="rgba(255,255,255,0.18)" stroke="#2B2B35" stroke-width="1.8"><circle cx="46" cy="70" r="9"/><circle cx="74" cy="70" r="9"/></g>
      <path d="M55 69 q5 -3 10 0 M37 68 L24 66 M83 68 L96 66" stroke="#2B2B35" stroke-width="1.8" fill="none"/>`;
    case 'lentes_corazon': return `${corazon(46, 79, 11, c, 'opacity="0.85" stroke="#1B2A55" stroke-width="1.5"')}${corazon(74, 79, 11, c, 'opacity="0.85" stroke="#1B2A55" stroke-width="1.5"')}
      <path d="M56 69 h8" stroke="#1B2A55" stroke-width="2.5"/>`;
    case 'lentes_estrella': return `${estrella(46, 70, 12, c, 'opacity="0.9" stroke="#1B2A55" stroke-width="1.5"')}${estrella(74, 70, 12, c, 'opacity="0.9" stroke="#1B2A55" stroke-width="1.5"')}
      <path d="M56 69 h8" stroke="#1B2A55" stroke-width="2.5"/>`;
    case 'antifaz': return `<path d="M28 66 Q32 54 46 59 Q60 65 74 59 Q88 54 92 66 Q90 81 74 77 Q60 73 46 77 Q30 81 28 66 Z" fill="${c}"/>
      <ellipse cx="46" cy="68" rx="6" ry="5" fill="#FFFFFF"/><ellipse cx="74" cy="68" rx="6" ry="5" fill="#FFFFFF"/>
      <circle cx="46" cy="68.5" r="3" fill="#1B2A55"/><circle cx="74" cy="68.5" r="3" fill="#1B2A55"/>`;
    case 'parche': return `<path d="M22 58 L98 50" stroke="#1B1B2B" stroke-width="2.5"/><ellipse cx="74" cy="70" rx="11" ry="10" fill="#1B1B2B"/>`;
    default: return accesorio(id, c);
  }
}

/** Cosas pintadas o pegadas en la cara (van encima del fleco). */
function caraExtra(id, c) {
  switch (id) {
    case 'corazon_mejilla': return corazon(84, 86, 5, c);
    case 'estrellitas': return `${estrella(86, 82, 4, '#FFD84D')}${estrella(92, 74, 2.6, c)}${estrella(32, 84, 3, '#7FD3FF')}`;
    case 'bigotes_gato': return `${corazon(60, 82, 4, '#FF8FB8')}
      <path d="M44 82 L28 79 M44 86 L28 87 M76 82 L92 79 M76 86 L92 87" stroke="#1B2A55" stroke-width="1.6" stroke-linecap="round"/>`;
    case 'curita': return `<g transform="rotate(-25 34 84)"><rect x="25" y="80" width="18" height="8" rx="4" fill="#F2C9A0" stroke="#D9A878"/>
      <rect x="31" y="80" width="6" height="8" fill="#E8B88A"/></g>`;
    case 'bigotote': return `<path d="M38 82 q8 -10 22 -4 q14 -6 22 4 q-4 8 -12 6 q-6 -4 -10 -2 q-4 -2 -10 2 q-8 2 -12 -6 z" fill="#3B2219"/>`;
    case 'cicatriz_rayo': return `<path d="M58 34 l7 0 l-4 6 l5 0 l-9 11 l3 -8 l-5 0 z" fill="#B03030" opacity="0.85"/>`;
    default: return '';
  }
}

/** Aretes (van colgando de las orejas). */
function aretes(id, c) {
  return [20, 100].map((x) => {
    switch (id) {
      case 'aretes': return `<circle cx="${x}" cy="84" r="3" fill="${c}"/>`;
      case 'arracadas': return `<circle cx="${x}" cy="88" r="5" fill="none" stroke="${c}" stroke-width="2"/>`;
      case 'perlas': return `<circle cx="${x}" cy="85" r="3.4" fill="#FFFFFF" stroke="#E3E7EE"/><circle cx="${x - 1}" cy="84" r="1" fill="#FFFFFF"/>`;
      case 'aretes_corazon': return `<path d="M${x} 81 v4" stroke="#FFD84D" stroke-width="1.5"/>${corazon(x, 96, 5.5, '#FF4FA3', 'stroke="#FFFFFF" stroke-width="1.2"')}`;
      case 'aretes_estrella': return `<path d="M${x} 81 v3" stroke="#FFD84D" stroke-width="1.5"/>${estrella(x, 89, 5, '#FFD84D', 'stroke="#E0A800" stroke-width="0.8"')}`;
      case 'aretes_fresa': return `<path d="M${x} 81 v3" stroke="#FFD84D" stroke-width="1.5"/>
        <path d="M${x} 96 c-5 -3 -5 -9 -2 -10 c1 -0.4 1.6 0 2 0.4 c0.4 -0.4 1 -0.8 2 -0.4 c3 1 3 7 -2 10 z" fill="#E8414F"/>
        <path d="M${x - 3} 86 l3 1.5 l3 -1.5" stroke="#3FB56B" stroke-width="1.5" fill="none"/>`;
      default: return '';
    }
  }).join('');
}

/** Cuello. Lo que no está aquí lo dibuja extra() de clientes.js. */
function cuelloPersonaje(id, c) {
  switch (id) {
    case 'ninguno': return '';
    case 'bufanda': case 'bufanda_rayas': {
      const rayas = id === 'bufanda_rayas'
        ? '<g fill="#FFD84D"><rect x="40" y="114" width="6" height="16"/><rect x="56" y="116" width="6" height="16"/><rect x="72" y="114" width="6" height="16"/><rect x="66" y="128" width="12" height="5"/><rect x="66" y="138" width="12" height="5"/></g>'
        : '';
      return `<path d="M30 112 q30 14 60 0 v12 q-30 14 -60 0 z" fill="${c}"/><rect x="66" y="118" width="12" height="28" rx="4" fill="${c}"/>${rayas}`;
    }
    case 'paliacate': return `<path d="M40 118 L80 118 L60 146 Z" fill="#C0392B"/>
      ${[[52, 124], [60, 130], [68, 124], [60, 138]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#FFFFFF"/>`).join('')}`;
    case 'medalla': return `<path d="M48 120 L58 146 M72 120 L62 146" stroke="${c}" stroke-width="5"/>
      <circle cx="60" cy="152" r="9" fill="#FFD84D" stroke="#E0A800" stroke-width="2"/>${estrella(60, 152, 5, '#FFFFFF')}`;
    default: return extra({ extra: id, colorAcc: c });
  }
}

/** Lo que trae en la mano (derecha; el escudo en la izquierda). */
function enLaMano(id, c) {
  switch (id) {
    case 'espatula': return `<path d="M100 196 L108 158" stroke="#8A5A3C" stroke-width="4" stroke-linecap="round"/>
      <rect x="102" y="138" width="14" height="22" rx="3" fill="#C9D2E3" stroke="#8A8FA3" transform="rotate(12 109 149)"/>`;
    case 'taza': return `<path d="M106 182 q-3 -5 0 -9 M111 182 q-3 -5 0 -9" stroke="rgba(27,42,85,0.3)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M100 184 h14 l-2 14 h-10 z" fill="#FFFFFF" stroke="#C9C2BC" stroke-width="1.5"/><path d="M114 187 h3 a3 3 0 0 1 0 6 h-3" stroke="#C9C2BC" stroke-width="2" fill="none"/>
      <rect x="102" y="189" width="10" height="4" fill="${c}"/>`;
    case 'globo': return `<path d="M100 192 q10 -40 4 -80" stroke="rgba(27,42,85,0.45)" stroke-width="1.2" fill="none"/>
      <ellipse cx="104" cy="98" rx="13" ry="16" fill="${c}"/><path d="M101 114 h6 l-3 -3 z" fill="${c}"/>
      <ellipse cx="99" cy="92" rx="3.5" ry="6" fill="rgba(255,255,255,0.5)" transform="rotate(20 99 92)"/>`;
    case 'rosa': return `<path d="M100 194 L104 160" stroke="#3FB56B" stroke-width="3" stroke-linecap="round"/>
      <path d="M102 176 q-8 -2 -10 -8 q8 0 10 8" fill="#3FB56B"/>
      <circle cx="104" cy="156" r="7" fill="#E8414F"/><path d="M100 155 q4 -5 8 0 q-4 4 -8 0" stroke="#B02030" stroke-width="1.2" fill="none"/>`;
    case 'varita': return `<path d="M100 194 L112 156" stroke="#5A3A24" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M100 194 L104 182" stroke="#3B2219" stroke-width="4.5" stroke-linecap="round"/>
      ${estrella(113, 152, 6, '#FFD84D')}<circle cx="120" cy="146" r="1.4" fill="#FFD84D"/><circle cx="106" cy="144" r="1" fill="#FFFFFF"/>`;
    case 'espada': return `<path d="M106 182 L106 126 L109 120 L112 126 L112 182 Z" fill="#E3E8F0" stroke="#8A8FA3" stroke-width="1.2"/>
      <rect x="97" y="181" width="24" height="5" rx="2" fill="#5B3FA0"/><rect x="106.5" y="186" width="5" height="10" rx="1.5" fill="#6B3E2E"/>`;
    case 'escudo': return `<circle cx="16" cy="182" r="19" fill="#FFD84D" stroke="#E0A800" stroke-width="2"/><circle cx="16" cy="182" r="14" fill="#1F5FFF"/>
      ${estrella(16, 182, 10, '#FFFFFF')}`;
    default: return '';
  }
}

/** Lo de la espalda: se dibuja detrás del cuerpo (las correas de la mochila, al frente). */
function espaldaAtras(id, c) {
  switch (id) {
    case 'capa': return `<path d="M34 126 Q20 200 10 276 Q60 286 110 276 Q100 200 86 126 Z" fill="${c}"/>
      <path d="M34 126 Q26 200 22 274" stroke="rgba(0,0,0,0.15)" stroke-width="5" fill="none"/>`;
    case 'alas_hada': return [-1, 1].map((s) => `
      <ellipse cx="${60 + s * 34}" cy="146" rx="24" ry="30" transform="rotate(${s * 30} ${60 + s * 34} 146)" fill="rgba(200,170,255,0.55)" stroke="#B48CFF" stroke-width="2"/>
      <ellipse cx="${60 + s * 28}" cy="188" rx="14" ry="18" transform="rotate(${s * -20} ${60 + s * 28} 188)" fill="rgba(255,190,230,0.55)" stroke="#FF8FC8" stroke-width="2"/>`).join('');
    case 'alas_angel': return [-1, 1].map((s) => [0, 1, 2].map((i) => `
      <ellipse cx="${60 + s * (32 + i * 6)}" cy="${140 + i * 14}" rx="${26 - i * 5}" ry="10" transform="rotate(${s * (25 + i * 15)} ${60 + s * (32 + i * 6)} ${140 + i * 14})" fill="#FFFFFF" stroke="#AEB9CF" stroke-width="1.5"/>`).join('')).join('');
    case 'mochila': return `<rect x="28" y="134" width="64" height="60" rx="12" fill="${c}"/>`;
    default: return '';
  }
}
function espaldaFrente(id, c) {
  return id === 'mochila'
    ? `<path d="M40 128 Q46 160 40 194 M80 128 Q74 160 80 194" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>
       <path d="M40 128 Q46 160 40 194 M80 128 Q74 160 80 194" stroke="rgba(0,0,0,0.15)" stroke-width="2" fill="none"/>`
    : '';
}

// ---------- Piernas, zapatos y brazos ----------

/** Piernas: pantalón, falda, short, mallas, tutú o el vuelo del vestido, y la piel que se asoma. */
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
    case 'mallas':
      return `<rect x="40" y="194" width="15" height="88" rx="7" fill="${c}"/><rect x="65" y="194" width="15" height="88" rx="7" fill="${c}"/>${cintura}`;
    case 'tutu':
      return `${piel}${[0, 1, 2].map((i) => `<path d="M${26 - i * 4} ${200 + i * 7} Q60 ${192 + i * 7} ${94 + i * 4} ${200 + i * 7} ${Array.from({ length: 6 }, (_, k) => `Q${94 + i * 4 - (k + 0.5) * ((68 + i * 8) / 6)} ${214 + i * 8} ${94 + i * 4 - (k + 1) * ((68 + i * 8) / 6)} ${200 + i * 7}`).join(' ')} Z" fill="${c}" opacity="${0.65 + i * 0.12}"/>`).join('')}${cintura}`;
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
    case 'botas_heroe':
      return `<g ${ladeo}><path d="M${x - 10} ${PISO} V${PISO - 46} Q${x} ${PISO - 52} ${x + 10} ${PISO - 46} V${PISO} Z" fill="${c}"/><path d="${punta}" fill="${c}"/>
        <path d="M${x - 10} ${PISO - 44} Q${x} ${PISO - 50} ${x + 10} ${PISO - 44}" stroke="rgba(255,255,255,0.35)" stroke-width="2" fill="none"/>
        <rect x="${x - 10}" y="${PISO - 3}" width="20" height="4" rx="2" fill="rgba(0,0,0,0.35)"/></g>`;
    case 'descalzo':
      return `<g ${ladeo}><path d="${punta}" fill="${p.piel}" stroke="rgba(0,0,0,0.12)"/>
        ${[-5, -1.5, 2, 5.5].map((dx) => `<circle cx="${x + dx}" cy="${PISO - 11}" r="1.6" fill="${p.piel}" stroke="rgba(0,0,0,0.15)" stroke-width="0.6"/>`).join('')}</g>`;
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
function brazos(p, manga) {
  const corta = ['playera', 'rayas', 'overol'].includes(p.arriba);
  const brazo = (d) => `<path d="${d}" stroke="${!manga || corta ? p.piel : manga}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  const mangaCorta = (d) => `<path d="${d}" stroke="${manga}" stroke-width="13" fill="none" stroke-linecap="round"/>`;
  let html = brazo('M37 132 Q22 150 21 188') + brazo('M83 132 Q98 150 99 188');
  if (corta && manga) html += mangaCorta('M37 132 Q29 141 27 154') + mangaCorta('M83 132 Q91 141 93 154');
  html += `<circle cx="21" cy="193" r="6.5" fill="${p.piel}"/><circle cx="99" cy="193" r="6.5" fill="${p.piel}"/>`;
  const c = p.colorAcc.muneca;
  switch (p.acc.muneca) {
    case 'reloj':
      html += `<rect x="14" y="182" width="14" height="5" rx="2" fill="${c}"/><circle cx="21" cy="184.5" r="3.6" fill="#FFFFFF" stroke="${c}" stroke-width="1.5"/>`;
      break;
    case 'reloj_inteligente':
      html += `<rect x="14" y="182" width="14" height="5" rx="2" fill="${c}"/><rect x="16.5" y="180" width="9" height="9" rx="2.5" fill="#1B1B2B"/><rect x="18" y="181.5" width="6" height="6" rx="1.5" fill="#7FD3FF"/>`;
      break;
    case 'pulsera':
      html += [92, 96, 100, 104].map((x, i) => `<circle cx="${x}" cy="${184 + (i % 2)}" r="2" fill="${i % 2 ? '#FFFFFF' : c}"/>`).join('');
      break;
    case 'guantes_blancos':
      html += [21, 99].map((x) => `<rect x="${x - 8}" y="181" width="16" height="7" rx="3" fill="#FFFFFF" stroke="#D9DEE8"/><circle cx="${x}" cy="194" r="8" fill="#FFFFFF" stroke="#D9DEE8" stroke-width="1.2"/>`).join('');
      break;
    case 'guantes_pelea':
      html += [21, 99].map((x) => `<circle cx="${x}" cy="193" r="7.5" fill="#D62839"/><rect x="${x - 7}" y="183" width="14" height="6" rx="2" fill="#D62839"/>
        <path d="M${x - 4} 197 h8" stroke="${p.piel}" stroke-width="2.5" stroke-linecap="round"/>`).join('');
      break;
    case 'munequeras':
      html += [21, 99].map((x) => `<rect x="${x - 8}" y="179" width="16" height="9" rx="3" fill="${c}"/>`).join('');
      break;
    case 'brazaletes':
      html += [21, 99].map((x) => `<rect x="${x - 8}" y="180" width="16" height="8" rx="2" fill="#FFD84D" stroke="#E0A800" stroke-width="1"/>${estrella(x, 184, 2.6, '#E8414F')}`).join('');
      break;
  }
  return html;
}

/** Lo que los clientes.js saben dibujar, con los nombres de sus campos. */
function comoCliente(p) {
  return {
    piel: p.piel, pelo: p.pelo, peinado: p.peinado,
    ropa: p.colorArriba, ropa2: p.colorArriba2, vestimenta: p.arriba, estampado: p.estampado,
    colorAcc: p.colorAcc.cabeza,
    barba: p.sexo === 'hombre' && p.vello.startsWith('barba'),
    pecas: p.acc.cara === 'pecas',
  };
}

/**
 * SVG del personaje.
 *   vista 'completo'  de pies a cabeza
 *         'busto'     de la cintura para arriba (mismo encuadre que los clientes)
 *         'cara'      solo la cabeza
 *         'cabeza'    la cabeza con lo que trae encima (sombreros, aureola…)
 */
export function dibujarPersonaje(p, { vista = 'completo', emocion = 'normal' } = {}) {
  const a = comoCliente(p);
  const hombre = p.sexo === 'hombre';
  const alto = ESTATURAS.find((x) => x.id === p.estatura)?.esc || 1;
  // Los hombres, de hombros un poco más anchos
  const ancho = (COMPLEXIONES.find((x) => x.id === p.complexion)?.esc || 1) * (hombre ? 1.08 : 1);
  const clip = 'cuerpo-personaje' + (++svgN);
  const traje = TORSOS[p.arriba];
  const r = traje ? traje(p, clip) : { ...ropa(a, clip), manga: p.arriba === 'vestido' ? null : p.arriba === 'overol' ? p.colorArriba2 : p.colorArriba };
  const acc = p.acc, col = p.colorAcc;
  // Cabeza: redonda en mujer; en hombre, con quijada más cuadrada
  const cabeza = hombre
    ? `<path d="M20 66 Q20 28 60 28 Q100 28 100 66 Q100 94 84 104 Q60 114 36 104 Q20 94 20 66 Z" fill="${p.piel}"/>`
    : `<circle cx="60" cy="68" r="40" fill="${p.piel}"/>`;
  // Cejas: delgadas y con pestañas en mujer; gruesas, del color del pelo, en hombre
  const cejas = hombre
    ? `<path d="M38 59 q8 -5 16 -1 M66 58 q8 -4 16 1" stroke="${p.peinado === 'calvo' ? '#2B1B12' : p.pelo}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : '<path d="M40.5 66 l-3.5 -2.5 M79.5 66 l3.5 -2.5" stroke="#1B2A55" stroke-width="2" stroke-linecap="round"/>';
  // Patillas con el pelo corto
  const patillas = hombre && ['corto', 'copete', 'rizado', 'afro'].includes(p.peinado)
    ? `<path d="M22 60 h6 v20 q-3 2 -6 0 z M92 60 h6 v20 q-3 2 -6 0 z" fill="${p.pelo}"/>`
    : '';
  // Los pies siempre en el piso: si es más alto, todo sube
  const subir = vista === 'cara' || vista === 'cabeza' ? 0 : (PISO - HOMBRO) * (1 - alto);
  // cabeza = la cara con espacio arriba para sombreros, aureola, etc.
  const caja = { completo: '0 -26 120 324', busto: '0 0 120 210', cara: '8 8 104 104', cabeza: '0 -18 120 128' }[vista];
  const casco = acc.cabeza === 'casco_astronauta'; // el casco va encima de todo
  return `
  <svg viewBox="${caja}" class="personaje-svg" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${CUERPO}"/></clipPath></defs>
    ${vista === 'completo' ? `<ellipse cx="60" cy="${PISO}" rx="34" ry="5" fill="rgba(27,42,85,0.18)"/>` : ''}
    <g transform="translate(0 ${subir.toFixed(1)})">
      <g transform="translate(60 ${HOMBRO}) scale(${ancho} ${alto}) translate(-60 -${HOMBRO})">${espaldaAtras(acc.espalda, col.espalda)}</g>
      ${peinadoAtras(a)}
      <g transform="translate(60 ${HOMBRO}) scale(${ancho} ${alto}) translate(-60 -${HOMBRO})">
        ${piernas(p)}
        ${zapato(p, 47, -1)}${zapato(p, 73, 1)}
        ${r.abajo}
        ${brazos(p, r.manga)}
        ${espaldaFrente(acc.espalda, col.espalda)}
        ${enLaMano(acc.mano, col.mano)}
      </g>
      <rect x="${hombre ? 47 : 50}" y="100" width="${hombre ? 26 : 20}" height="22" rx="8" fill="${p.piel}"/>
      ${r.encima}
      ${cuelloPersonaje(acc.cuello === 'bufanda' || acc.cuello === 'bufanda_rayas' ? 'ninguno' : acc.cuello, col.cuello)}
      ${cabeza}
      <ellipse cx="20" cy="72" rx="6" ry="9" fill="${p.piel}"/><ellipse cx="100" cy="72" rx="6" ry="9" fill="${p.piel}"/>
      ${aretes(acc.orejas, col.orejas)}
      ${detallesCara(a)}
      ${patillas}
      ${peinadoFrente(a)}
      <g class="cara">${caraSVG(emocion, { sinMejillas: hombre, sinCejas: hombre })}</g>
      ${cejas}
      ${hombre && (p.vello === 'bigote' || p.vello === 'barba_bigote') ? `<path d="M46 80 q7 -6 14 0 q7 -6 14 0 q-7 6 -14 2 q-7 4 -14 -2 z" fill="${p.pelo}"/>` : ''}
      ${caraExtra(acc.cara, col.cara)}
      ${accesorioPersonaje(acc.ojos, col.ojos)}
      ${casco ? '' : accesorioPersonaje(acc.cabeza, col.cabeza)}
      ${acc.cuello === 'bufanda' || acc.cuello === 'bufanda_rayas' ? cuelloPersonaje(acc.cuello, col.cuello) : ''}
      ${casco ? accesorioPersonaje(acc.cabeza, col.cabeza) : ''}
    </g>
  </svg>`;
}

// ============================================================
//  Personajes de otros jugadores (tabla en línea)
// ============================================================

const COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * El personaje que llega de otro teléfono, revisado campo por campo:
 * solo pasan ids que existen y colores #RRGGBB (se meten en el SVG).
 * Lo que no sirva se queda como en el personaje inicial.
 */
export function personajeSeguro(x) {
  if (!x || typeof x !== 'object') return null;
  const p = personajeInicial(x.sexo === 'hombre' ? 'hombre' : 'mujer');
  const elegir = (campo, lista) => { if (lista.some((o) => o.id === x[campo])) p[campo] = x[campo]; };
  const color = (campo) => { if (COLOR.test(x[campo])) p[campo] = x[campo]; };
  elegir('estatura', ESTATURAS); elegir('complexion', COMPLEXIONES); elegir('peinado', PEINADOS); elegir('vello', VELLO);
  elegir('arriba', ARRIBA); elegir('estampado', ESTAMPADOS); elegir('abajo', ABAJO); elegir('calzado', CALZADO);
  ['piel', 'pelo', 'colorArriba', 'colorArriba2', 'colorAbajo', 'colorCalzado'].forEach(color);
  for (const [cat, { opciones }] of Object.entries(ACCESORIOS)) {
    if (opciones.some((o) => o.id === x.acc?.[cat])) p.acc[cat] = x.acc[cat];
    if (COLOR.test(x.colorAcc?.[cat])) p.colorAcc[cat] = x.colorAcc[cat];
  }
  return p;
}

/** Carita para la tabla en línea ('' si no se puede). */
export function caritaDesdeTabla(x) {
  const p = personajeSeguro(x);
  return p ? dibujarPersonaje(p, { vista: 'cara' }) : '';
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

/** ¿Ya es suya esta opción? Lo gratis siempre; lo de la boutique, si lo compró
 *  (suelto o en su disfraz). */
export function tieneOpcion(campo, o) {
  if (!o.precio && !o.traje) return true;
  return tieneArticulo(claveArticulo(campo, o.id)) || (!!o.traje && tieneArticulo(claveArticulo('traje', o.traje)));
}

/** Aplica un disfraz completo (todas sus piezas) a una copia del personaje. */
export function conTraje(p, traje) {
  const nuevo = structuredClone(p);
  for (const [campo, valor] of Object.entries(traje.piezas)) escribir(nuevo, campo, valor);
  return nuevo;
}

/** Las opciones que se pueden elegir: las suyas, sin lo exclusivo si no toca, ni barba en mujer. */
function opcionesDe(lista, p, campo) {
  return lista.filter((o) => (!o.especial || esRomantica()) && (!o.soloHombre || p.sexo === 'hombre') && tieneOpcion(campo, o));
}

const nombreOpcion = (o) => (Array.isArray(o.nombre) ? g(...o.nombre) : o.nombre);

function chips(campo, lista, p) {
  const actual = leer(p, campo);
  return `<div class="chips">${opcionesDe(lista, p, campo).map((o) => `
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
const SIN_COLOR = ['ninguno', 'perlas', 'aretes_corazon', 'gorro_chef', 'lentes', 'corona', 'tiara', 'aureola', 'cuernitos',
  'banda_samurai', 'mascara_arana', 'capucha_murcielago', 'casco_astronauta', 'sombrero_pirata', 'gorro_dino', 'lentes_redondos',
  'parche', 'pecas', 'estrellitas', 'bigotes_gato', 'curita', 'cicatriz_rayo', 'aretes_estrella', 'aretes_fresa', 'paliacate',
  'brazaletes', 'espatula', 'rosa', 'varita', 'escudo', 'alas_hada', 'alas_angel', 'banda_roja', 'pelo_picos', 'gorro_elfo',
  'capucha_erizo', 'bigotote', 'guantes_blancos', 'guantes_pelea', 'espada'];
// Los trajes de disfraz traen sus colores
const TRAJE_ARRIBA = ARRIBA.filter((o) => o.traje).map((o) => o.id);

const botonBoutique = '<button class="btn btn-secundario btn-ir-boutique" data-boutique>🛍️ Ver más en la boutique</button>';

function htmlPestana(pestana, p, nombre, conBoutique) {
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
    case 'ropa': {
      const disfraces = TRAJES.filter((t) => tieneArticulo(claveArticulo('traje', t.id)));
      return (disfraces.length ? grupo('🦸 Mis disfraces', `<div class="chips">${disfraces.map((t) =>
          `<button class="chip especial" data-traje="${t.id}">${t.emoji} ${t.nombre}</button>`).join('')}</div>`) : '')
        + grupo('Arriba', chips('arriba', ARRIBA, p) + (TRAJE_ARRIBA.includes(p.arriba) && p.arriba !== 'samurai' ? '' : colores('colorArriba', COLORES, p))
          + (CON_COLOR2.includes(p.arriba) || p.arriba === 'samurai' ? `<small class="nota-creador">Detalles</small>${colores('colorArriba2', COLORES, p)}` : ''))
        + (p.arriba === 'playera' ? grupo('Estampado', chips('estampado', ESTAMPADOS, p)) : '')
        + (p.arriba === 'vestido' ? '' : grupo('Abajo', chips('abajo', ABAJO, p) + colores('colorAbajo', p.abajo === 'jeans' ? COLORES_MEZCLILLA : COLORES, p)))
        + grupo('Calzado', chips('calzado', CALZADO, p) + colores('colorCalzado', COLORES, p))
        + (conBoutique ? botonBoutique : '');
    }
    default: // accesorios
      return Object.entries(ACCESORIOS).map(([cat, { nombre: titulo, opciones }]) =>
        grupo(titulo, chips(`acc.${cat}`, opciones, p)
          + (SIN_COLOR.includes(p.acc[cat]) ? '' : colores(`colorAcc.${cat}`, COLORES, p)))).join('')
        + '<p class="nota-creador">Puedes traer uno de cada tipo a la vez.</p>' + (conBoutique ? botonBoutique : '');
  }
}

/** Personaje al azar (para el dado 🎲). */
function personajeAlAzar(sexo) {
  const p = personajeInicial(sexo);
  const de = (lista, campo = '') => alAzar(opcionesDe(lista, p, campo)).id;
  Object.assign(p, {
    piel: alAzar(PIELES), estatura: de(ESTATURAS), complexion: de(COMPLEXIONES),
    peinado: de(PEINADOS), pelo: alAzar(COLORES_PELO), vello: sexo === 'hombre' ? de(VELLO) : 'ninguno',
    arriba: de(ARRIBA, 'arriba'), colorArriba: alAzar(COLORES), colorArriba2: alAzar(COLORES), estampado: de(ESTAMPADOS),
    abajo: de(ABAJO, 'abajo'), calzado: de(CALZADO, 'calzado'), colorCalzado: alAzar(COLORES),
  });
  p.colorAbajo = alAzar(p.abajo === 'jeans' ? COLORES_MEZCLILLA : COLORES);
  for (const [cat, { opciones }] of Object.entries(ACCESORIOS)) {
    p.acc[cat] = Math.random() < 0.5 ? 'ninguno' : de(opciones, `acc.${cat}`);
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
    $opc.innerHTML = htmlPestana(pestana, p, nombre, !primeraVez);
    $opc.scrollTop = scroll;
  };

  cont.addEventListener('click', (ev) => {
    const tab = ev.target.closest('[data-pestana]');
    if (tab) { sonidos.click(); pestana = tab.dataset.pestana; $opc.scrollTop = 0; pintar(); return; }
    if (ev.target.closest('.btn-dado')) { sonidos.pop(); p = personajeAlAzar(p.sexo); pintar(); return; }
    const t = ev.target.closest('[data-traje]');
    if (t) { sonidos.pop(); p = conTraje(p, TRAJES.find((x) => x.id === t.dataset.traje)); pintar(); return; }
    if (ev.target.closest('[data-boutique]')) {
      // Se guarda lo que lleva y se abre la boutique (cierra esta ventana)
      guardarPersonaje(p);
      import('./boutique.js').then((m) => m.abrirBoutique());
      return;
    }
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

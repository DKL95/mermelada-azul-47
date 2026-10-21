/* ============================================================
   escenario.js — dibujos del local en la pestaña Venta:
   fachada (letrero y toldo), calle y mostrador.

   Lo que se compra en la tienda (mejoras) y la decoración elegida
   (local.js) llegan en `op`; la decoración en op.decor.
   ============================================================ */

const ARCOIRIS = ['#E8414F', '#FF7A1A', '#FFD84D', '#22C55E', '#3DA5FF', '#8B5CF6'];

/** Escapa texto para meterlo de forma segura dentro del SVG. */
function escapar(t) {
  return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Toldo con borde de ondas, según el estilo elegido. */
function toldo(estilo, base) {
  const n = 10;
  const ancho = 380 / n;
  const colorDe = (i) => (estilo === 'arcoiris' ? ARCOIRIS[i % ARCOIRIS.length]
    : estilo === 'rayas' ? (i % 2 === 0 ? base : '#FFFFFF') : base);
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<rect x="${i * ancho}" y="62" width="${ancho}" height="34" style="fill:${colorDe(i)}"/>
      <path d="M${i * ancho} 96 a${ancho / 2} ${ancho / 2.6} 0 0 0 ${ancho} 0 z" style="fill:${colorDe(i)}"/>`;
  }
  if (estilo === 'lunares') {
    for (let y = 70, f = 0; y < 98; y += 11, f++) {
      for (let x = 10 + (f % 2) * 10; x < 380; x += 20) html += `<circle cx="${x}" cy="${y}" r="3.2" fill="#FFFFFF" opacity="0.9"/>`;
    }
  }
  if (estilo === 'cuadros') {
    for (let y = 62, f = 0; y < 96; y += 17, f++) {
      for (let x = (f % 2) * 19, k = 0; x < 380; x += 38, k++) html += `<rect x="${x}" y="${y}" width="19" height="17" fill="#FFFFFF" opacity="0.75"/>`;
    }
  }
  if (estilo === 'liso') html += '<rect x="0" y="88" width="380" height="3" fill="#FFFFFF" opacity="0.6"/>';
  return html;
}

/** Letrero con el nombre, según el estilo elegido. op.letrero = luminoso (mejora). */
function letrero(nombre, estilo, luminoso) {
  const tam = nombre.length > 24 ? 15 : nombre.length > 18 ? 18 : 21;
  const texto = (color, extra = '', fuente = 'Fredoka, sans-serif', t = tam) =>
    `<text x="190" y="38" text-anchor="middle" font-family="${fuente}" font-weight="600" font-size="${t}" fill="${color}" ${extra}>${escapar(nombre)}</text>`;
  switch (estilo) {
    case 'pizarron':
      return `<rect x="50" y="8" width="280" height="48" rx="6" fill="#8A5A3C"/><rect x="56" y="13" width="268" height="38" rx="3" fill="#2F4A3A"/>
        ${texto('#F4F1E8', '', 'Caveat, Fredoka, cursive', tam + 6)}`;
    case 'madera':
      return `<rect x="50" y="10" width="280" height="44" rx="8" fill="#A86B3C" stroke="#7A4A26" stroke-width="3"/>
        <path d="M60 22 h90 M170 30 h120 M70 44 h70 M200 46 h110" stroke="#8F5A30" stroke-width="2" stroke-linecap="round"/>
        ${texto('#FFF1D2', 'stroke="#7A4A26" stroke-width="0.6"')}`;
    case 'neon':
      return `<rect x="50" y="10" width="280" height="44" rx="10" fill="#1B1B2B"/>
        <rect x="55" y="15" width="270" height="34" rx="8" fill="none" stroke="#FF4FA3" stroke-width="6" opacity="0.3"/>
        <rect x="55" y="15" width="270" height="34" rx="8" fill="none" stroke="#FF8FD0" stroke-width="2"/>
        ${texto('none', 'stroke="#FF4FA3" stroke-width="4" opacity="0.45"')}${texto('#FFE3F4')}`;
    case 'dorado':
      return `<rect x="50" y="10" width="280" height="44" rx="22" fill="#F2C94C" stroke="#B8860B" stroke-width="3"/>
        <rect x="60" y="14" width="260" height="10" rx="5" fill="#FFF3C4" opacity="0.6"/>
        ${texto('#5A3A00')}`;
    default: // clásico
      return `<rect x="50" y="10" width="280" height="44" rx="22" fill="#1B2A55"/>
        <rect x="55" y="15" width="270" height="34" rx="17" fill="none" style="stroke:${luminoso ? 'var(--acento)' : '#FFD84D'}" stroke-width="${luminoso ? 3 : 2}" stroke-dasharray="${luminoso ? 'none' : '4 4'}"/>
        ${texto(luminoso ? '#FFE59A' : '#FFFFFF')}`;
  }
}

/** Fachada: letrero con el nombre + toldo con ondas.
 *  op.letrero = letrero luminoso, op.luces = foquitos de colores, op.decor = decoración */
export function svgFachada(nombre, op = {}) {
  const d = op.decor || {};
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
    ${letrero(nombre, d.letrero, op.letrero)}
    <!-- foquitos -->
    ${[30, 350].map((x) => `<circle cx="${x}" cy="32" r="7" fill="#FFE59A"><animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/></circle>`).join('')}
    <!-- toldo -->
    ${toldo(d.toldo || 'rayas', d.colorToldo || 'var(--toldo)')}
    <rect x="0" y="60" width="380" height="5" style="fill:var(--acento)"/>
    ${luces}
  </svg>`;
}

/** Fondo de la calle: nubes, edificios, árboles, faroles y banqueta.
 *  Lienzo angosto (260 de ancho) para que se vea grande en el celular.
 *  op.plantas, op.mesitas = decoración comprada; op.clima = id del evento */
export function svgCalle(op = {}) {
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
    <g transform="translate(${x} ${y}) scale(${s})" fill="${lluvia ? '#B9C4D6' : '#FFFFFF'}" opacity="${op.decor?.cielo === 'noche' ? 0.25 : 0.9}">
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
  const d = op.decor || {};
  const noche = d.cielo === 'noche';
  const estrellas = noche
    ? [[30, 20], [70, 44], [110, 14], [150, 36], [196, 18], [240, 50], [90, 70], [210, 80], [16, 70]].map(([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}" fill="#FFFFFF"><animate attributeName="opacity" values="1;0.3;1" dur="${2 + (i % 3)}s" repeatCount="indefinite"/></circle>`).join('')
      + '<circle cx="222" cy="32" r="14" fill="#FFF3C4"/><circle cx="228" cy="27" r="12" fill="#1B2A55"/>'
    : '';
  const solTarde = d.cielo === 'atardecer' ? '<circle cx="200" cy="96" r="26" fill="#FFB347" opacity="0.9"/><circle cx="200" cy="96" r="36" fill="#FFB347" opacity="0.25"/>' : '';
  return `
  <svg viewBox="0 0 260 230" preserveAspectRatio="${op.llenar ? 'xMidYMid slice' : 'xMidYMax meet'}" aria-hidden="true">
    ${estrellas}${solTarde}
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
    ${fiesta(d.temporada, SUELO)}
  </svg>`;
}

/** Banderines colgando de farol a farol. forma: 'triangulo' | 'picado' | 'corazon' */
function banderines(colores, forma) {
  const n = 13;
  let html = '<path d="M24 60 Q130 84 236 60" stroke="#6B5A4A" stroke-width="1" fill="none"/>';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = (1 - t) ** 2 * 24 + 2 * (1 - t) * t * 130 + t * t * 236;
    const y = (1 - t) ** 2 * 60 + 2 * (1 - t) * t * 84 + t * t * 60;
    const c = colores[i % colores.length];
    if (forma === 'triangulo') html += `<path d="M${(x - 6).toFixed(1)} ${y.toFixed(1)} h12 l-6 13 z" fill="${c}"/>`;
    else if (forma === 'corazon') html += `<path d="M${x.toFixed(1)} ${(y + 13).toFixed(1)} l-6 -6 a3.6 3.6 0 0 1 6 -4.5 a3.6 3.6 0 0 1 6 4.5 z" fill="${c}"/>`;
    else {
      html += `<path d="M${(x - 7).toFixed(1)} ${y.toFixed(1)} h14 v14 l-2.3 -2 l-2.3 2 l-2.3 -2 l-2.3 2 l-2.3 -2 l-2.2 2 z" fill="${c}" opacity="0.92"/>
        <circle cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="2" fill="#FFFFFF" opacity="0.8"/>`;
    }
  }
  return html;
}

/** Decoración de fiesta sobre la calle. */
function fiesta(id, SUELO) {
  const flor = (x) => `<g transform="translate(${x} ${SUELO + 6})">${[0, 72, 144, 216, 288].map((g) => {
    const a = (g * Math.PI) / 180;
    return `<circle cx="${(Math.cos(a) * 4).toFixed(1)}" cy="${(Math.sin(a) * 4).toFixed(1)}" r="3.6" fill="#FF9F1C"/>`;
  }).join('')}<circle r="2.6" fill="#E07B00"/></g>`;
  const calabaza = (x) => `<g transform="translate(${x} ${SUELO + 4})">
    <ellipse cx="0" cy="0" rx="10" ry="8" fill="#FF7A1A"/><path d="M-4 -7 v14 M4 -7 v14" stroke="#E05F00" stroke-width="1.5"/>
    <rect x="-1.5" y="-12" width="3" height="5" rx="1" fill="#3E9142"/>
    <path d="M-5 -2 l2 -2 l2 2 z M1 -2 l2 -2 l2 2 z M-5 3 q5 3 10 0" fill="#3B2219" stroke="#3B2219" stroke-width="0.8"/></g>`;
  const globo = (x, c) => `<path d="M${x} 74 q-4 -14 2 -30" stroke="#6B5A4A" stroke-width="0.8" fill="none"/><ellipse cx="${x + 2}" cy="38" rx="8" ry="10" fill="${c}"/>`;
  const murcielago = (x, y) => `<path d="M${x - 9} ${y} q4 -5 7 -1 l2 -3 l2 3 q3 -4 7 1 q-4 0 -5 3 q-2 -2 -4 0 q-1 -3 -5 -3 z" fill="#2B2B35"/>`;
  switch (id) {
    case 'cumple': return banderines(ARCOIRIS, 'triangulo') + globo(18, '#FF4FA3') + globo(238, '#3DA5FF') + globo(30, '#FFD84D');
    case 'valentin': return banderines(['#FF4FA3', '#E8414F', '#FFB3D6'], 'corazon');
    case 'patrias': return banderines(['#1E8F4E', '#FFFFFF', '#D62839'], 'picado');
    case 'halloween': return banderines(['#FF7A1A', '#6B3FA0', '#1B1B2B'], 'triangulo') + calabaza(96) + calabaza(166) + murcielago(60, 30) + murcielago(150, 20);
    case 'muertos': return banderines(['#FF4FA3', '#8B5CF6', '#FF7A1A', '#FFD84D', '#22C55E', '#3DA5FF'], 'picado') + flor(92) + flor(104) + flor(158) + flor(170);
    case 'navidad': {
      const focos = Array.from({ length: 12 }, (_, i) => {
        const t = (i + 0.5) / 12;
        const x = (1 - t) ** 2 * 24 + 2 * (1 - t) * t * 130 + t * t * 236;
        const y = (1 - t) ** 2 * 60 + 2 * (1 - t) * t * 84 + t * t * 60;
        return `<ellipse cx="${x.toFixed(1)}" cy="${(y + 4).toFixed(1)}" rx="3" ry="4.5" fill="${['#E8414F', '#22C55E', '#FFD84D', '#3DA5FF'][i % 4]}">
          <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" begin="${(i % 3) * 0.4}s" repeatCount="indefinite"/></ellipse>`;
      }).join('');
      return `<path d="M24 60 Q130 84 236 60" stroke="#2E7A34" stroke-width="2" fill="none"/>${focos}
        <path d="M0 ${SUELO + 2} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 v6 h-260 z" fill="#FFFFFF"/>`;
    }
    default: return '';
  }
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

// Mostrador: [frente, paneles] y lo que se le dibuja encima
const MOSTRADORES = {
  pastel: ['#FFC2DD', '#FFAACB', ''],
  madera: ['#B07A4A', '#956236', [52, 70, 90, 110].map((y) => `<path d="M0 ${y} h380" stroke="#8A5A30" stroke-width="1.5" opacity="0.6"/>`).join('')],
  negro: ['#2B2B35', '#1F1F28', '<rect x="0" y="40" width="380" height="2" fill="#E0B44C"/><rect x="0" y="112" width="380" height="2" fill="#E0B44C"/>'],
  marmol: ['#F2F2F6', '#E6E6EE', '<path d="M20 50 q30 20 10 50 M140 46 q-20 30 20 60 M250 52 q30 10 20 40 M330 46 q-10 40 30 66" stroke="#C9CAD6" stroke-width="2" fill="none"/>'],
};

/** Mostrador con caja registradora y charola. */
export function svgMostrador(op = {}) {
  const m = MOSTRADORES[op.decor?.mostrador];
  const frente = m ? `fill="${m[0]}"` : 'style="fill:var(--toldo)"';
  const panel = m ? `fill="${m[1]}"` : 'style="fill:var(--toldo-oscuro)"';
  return `
  <svg viewBox="0 -30 380 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <!-- cubierta -->
    <rect x="0" y="20" width="380" height="16" rx="4" fill="#FFFFFF"/>
    <rect x="0" y="34" width="380" height="4" fill="rgba(27,42,85,0.2)"/>
    <!-- frente con paneles -->
    <rect x="0" y="36" width="380" height="84" ${frente}/>
    ${[10, 105, 200, 295].map((x) => `<rect x="${x}" y="48" width="75" height="60" rx="8" ${panel}/>`).join('')}
    ${m ? m[2] : ''}

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

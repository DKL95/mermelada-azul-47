/* ============================================================
   plancha.js — el dibujo "vivo" de la crepa en un <canvas>.

   - Guarda una MÁSCARA (dónde hay masa) en una cuadrícula de
     200x200 que representa el disco de la plancha.
   - Con ella calcula qué tan redonda quedó y la pinta con el
     color de cocción que toque.
   - También dibuja los rellenos encima.

   Coordenadas internas: el disco caliente es un círculo de
   radio 100 con centro (100,100) dentro de la cuadrícula.
   ============================================================ */
import { colorCoccion, mezclar, oscurecer, aleatorio, tenir } from './dibujos.js';
import { ingrediente } from './data/ingredientes.js';

const RES = 200;            // resolución de la máscara
const C = RES / 2;          // centro
const R_DISCO = 100;        // radio del disco caliente
const R_OBJETIVO = 86;      // la crepa ideal: un círculo de este radio
// En el SVG de la plancha el disco ocupa del 9% al 91% del ancho
const DISCO_INI = 0.09;
const DISCO_TAM = 0.82;

const AREA_OBJETIVO = Math.PI * R_OBJETIVO * R_OBJETIVO;

/** Crea un canvas fuera de pantalla. */
function lienzo(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Mapas precalculados: qué pixeles caen dentro del objetivo
const dentroObjetivo = new Uint8Array(RES * RES);
for (let y = 0; y < RES; y++) {
  for (let x = 0; x < RES; x++) {
    const dx = x + 0.5 - C, dy = y + 0.5 - C;
    dentroObjetivo[y * RES + x] = dx * dx + dy * dy <= R_OBJETIVO * R_OBJETIVO ? 1 : 0;
  }
}

export class Plancha {
  /** @param {HTMLElement} contenedor  el escenario cuadrado */
  constructor(contenedor) {
    this.cont = contenedor;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lienzo-crepa';
    this.cont.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.masa = 'masa_clasica'; // tipo de masa (cambia el color)

    this.mascara = lienzo(RES);
    this.mctx = this.mascara.getContext('2d', { willReadFrequently: true });
    this.temp = lienzo(RES);
    this.tctx = this.temp.getContext('2d');

    this.reiniciar();
    this.dimensionar();
    new ResizeObserver(() => { this.dimensionar(); this.pintar(); }).observe(this.cont);
  }

  /** Deja la plancha vacía para una crepa nueva. */
  reiniciar() {
    this.mctx.setTransform(1, 0, 0, 1, 0, 0);
    this.mctx.clearRect(0, 0, RES, RES);
    this.vertida = false;
    this.cubiertos = 0;
    this.dentro = 0;
    this.fuera = 0;
    this.centro = { x: C, y: C };
    this.rellenos = [];        // piezas colocadas {id, x, y, semilla}
    this.vista = { modo: 'cruda', v1: 0, v2: 0 };
    this.semillaManchas = Math.floor(Math.random() * 1e6);
    // Cuánta masa trae el cucharón (un poco más que el círculo ideal)
    this.volumen = AREA_OBJETIVO * 1.06;
    this.pintar();
  }

  dimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.cont.clientWidth;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(w * dpr);
    this.escala = dpr;
  }

  /** Convierte un evento de puntero a coordenadas de la máscara. */
  aMascara(ev) {
    const r = this.cont.getBoundingClientRect();
    const u = (ev.clientX - r.left) / r.width;
    const v = (ev.clientY - r.top) / r.height;
    return { x: ((u - DISCO_INI) / DISCO_TAM) * RES, y: ((v - DISCO_INI) / DISCO_TAM) * RES };
  }

  /** ¿Hay masa en este punto? */
  hayMasa(p) {
    if (p.x < 0 || p.y < 0 || p.x >= RES || p.y >= RES) return false;
    return this.mctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data[3] > 128;
  }

  // ================= MASA =================

  /** Recorta al disco: la masa no puede salirse de la plancha. */
  _conRecorte(fn) {
    const m = this.mctx;
    m.save();
    m.beginPath();
    m.arc(C, C, R_DISCO, 0, Math.PI * 2);
    m.clip();
    m.fillStyle = '#000';
    m.strokeStyle = '#000';
    fn(m);
    m.restore();
  }

  /** Vierte el cucharón de masa en un punto. */
  verter(p) {
    this._conRecorte((m) => {
      m.beginPath();
      m.arc(p.x, p.y, R_OBJETIVO * 0.38, 0, Math.PI * 2);
      m.fill();
    });
    this.vertida = true;
    this.medir();
  }

  get masaRestante() {
    return Math.max(0, 1 - this.cubiertos / this.volumen);
  }

  /** Extiende la masa con la rastra de un punto a otro. */
  extender(a, b, radioRastra) {
    if (!this.vertida || this.masaRestante <= 0) return;
    // La rastra solo arrastra masa que ya está en la plancha:
    // si empiezas lejos de la masa no pasa nada.
    if (!this._cercaDeMasa(a, radioRastra * 1.6)) return;
    this._conRecorte((m) => {
      m.lineCap = 'round';
      m.lineWidth = radioRastra * 2;
      m.beginPath();
      m.moveTo(a.x, a.y);
      m.lineTo(b.x, b.y);
      m.stroke();
    });
  }

  _cercaDeMasa(p, radio) {
    const x0 = Math.max(0, Math.floor(p.x - radio)), y0 = Math.max(0, Math.floor(p.y - radio));
    const x1 = Math.min(RES, Math.ceil(p.x + radio)), y1 = Math.min(RES, Math.ceil(p.y + radio));
    if (x1 <= x0 || y1 <= y0) return false;
    const d = this.mctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 128) return true;
    return false;
  }

  /** Cuenta pixeles de masa: dentro y fuera del círculo ideal, y su centro. */
  medir() {
    const d = this.mctx.getImageData(0, 0, RES, RES).data;
    let total = 0, dentro = 0, sx = 0, sy = 0;
    for (let i = 0, p = 0; p < RES * RES; p++, i += 4) {
      if (d[i + 3] > 128) {
        total++;
        if (dentroObjetivo[p]) dentro++;
        sx += p % RES;
        sy += (p / RES) | 0;
      }
    }
    this.cubiertos = total;
    this.dentro = dentro;
    this.fuera = total - dentro;
    if (total) this.centro = { x: sx / total, y: sy / total };
  }

  /**
   * Calificación de la forma (0..1): qué tanto llenaste el círculo
   * ideal, menos lo que se salió de él.
   */
  get forma() {
    const cobertura = this.dentro / AREA_OBJETIVO;
    const derrame = this.fuera / AREA_OBJETIVO;
    return Math.max(0, Math.min(1, (cobertura - derrame * 1.5) / 0.95));
  }

  // ================= VOLTEAR =================

  /** Voltea la crepa: la máscara y los rellenos se reflejan. */
  voltear() {
    this.temp.getContext('2d').clearRect(0, 0, RES, RES);
    this.tctx.drawImage(this.mascara, 0, 0);
    this.mctx.clearRect(0, 0, RES, RES);
    this.mctx.save();
    this.mctx.translate(this.centro.x * 2, 0);
    this.mctx.scale(-1, 1);
    this.mctx.drawImage(this.temp, 0, 0);
    this.mctx.restore();
    this.semillaManchas++;
  }

  // ================= RELLENOS =================

  agregarRelleno(id, p) {
    this.rellenos.push({ id, x: p.x, y: p.y, semilla: Math.floor(Math.random() * 1e6) });
    this.pintar();
  }
  quitarUltimoRelleno() {
    const r = this.rellenos.pop();
    this.pintar();
    return r;
  }

  // ================= DIBUJO =================

  /**
   * Cambia cómo se ve la crepa.
   * modo: 'cruda' (extendiendo), 'lado1' (cocinando 1er lado),
   *       'lado2' (ya volteada) o 'plato' (terminada)
   */
  ver(vista) {
    this.vista = { ...this.vista, ...vista };
    this.pintar();
  }

  pintar() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    if (!this.vertida) return;

    const { modo, v1, v2 } = this.vista;
    const m = this.masa;
    let arriba, orilla, manchas, burbujas = 0;
    if (modo === 'cruda') {
      arriba = tenir('#F9EDC8', m); orilla = tenir('#F4E2B0', m); manchas = 0;
    } else if (modo === 'lado1') {
      // Se ve la cara de arriba (cruda que se va "secando");
      // las orillas delatan qué tan dorado va el lado de abajo.
      arriba = tenir(mezclar('#F9EDC8', '#F2DDA6', Math.min(1, v1)), m);
      orilla = colorCoccion(v1, m);
      burbujas = Math.max(0, Math.min(1, (v1 - 0.3) / 0.6));
      manchas = 0;
    } else {
      // Ya volteada: se ve el lado 1 dorado
      arriba = colorCoccion(v1, m);
      orilla = colorCoccion(Math.max(v1, v2) + 0.1, m);
      manchas = Math.min(1, v1);
    }

    // 1) Capa temporal con la forma de la masa
    const t = this.tctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, RES, RES);
    t.fillStyle = orilla;
    t.fillRect(0, 0, RES, RES);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(this.mascara, 0, 0);

    // 2) Centro más claro que la orilla (encogiendo la forma)
    t.globalCompositeOperation = 'source-atop';
    t.save();
    t.translate(this.centro.x, this.centro.y);
    t.scale(0.93, 0.93);
    t.translate(-this.centro.x, -this.centro.y);
    t.filter = 'blur(2px)';
    t.drawImage(this._mascaraColor(arriba), 0, 0);
    t.restore();
    t.filter = 'none';

    // 3) Textura: manchitas doradas (encaje) o burbujitas
    const rnd = aleatorio(this.semillaManchas);
    if (manchas > 0) {
      t.fillStyle = oscurecer(arriba, 0.25);
      t.globalAlpha = 0.35 * manchas;
      for (let i = 0; i < 70; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R_OBJETIVO;
        t.beginPath();
        t.ellipse(this.centro.x + Math.cos(a) * d, this.centro.y + Math.sin(a) * d, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2);
        t.fill();
      }
    }
    if (burbujas > 0) {
      t.strokeStyle = 'rgba(255,255,255,0.8)';
      t.lineWidth = 1;
      t.globalAlpha = burbujas;
      const n = Math.floor(10 + burbujas * 50);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R_OBJETIVO * 0.9;
        t.beginPath();
        t.arc(this.centro.x + Math.cos(a) * d, this.centro.y + Math.sin(a) * d, 1 + rnd() * 2, 0, Math.PI * 2);
        t.stroke();
      }
    }
    // Masa integral: puntitos de salvado
    if (m === 'masa_integral') {
      t.fillStyle = 'rgba(110,70,35,0.45)';
      const rs = aleatorio(99);
      for (let i = 0; i < 120; i++) {
        const a = rs() * Math.PI * 2, d = Math.sqrt(rs()) * R_OBJETIVO;
        t.fillRect(this.centro.x + Math.cos(a) * d, this.centro.y + Math.sin(a) * d, 1.2, 1.2);
      }
    }
    // Brillo húmedo de la masa cruda
    if (modo === 'cruda' || modo === 'lado1') {
      t.globalAlpha = modo === 'cruda' ? 0.5 : 0.5 * (1 - Math.min(1, v1));
      t.strokeStyle = '#FFFFFF';
      t.lineWidth = 6;
      t.lineCap = 'round';
      t.beginPath();
      t.arc(this.centro.x, this.centro.y, R_OBJETIVO * 0.6, Math.PI * 1.1, Math.PI * 1.4);
      t.stroke();
    }
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'source-over';

    // 4) Rellenos encima
    for (const r of this.rellenos) dibujarRelleno(t, r);

    // 5) Pasar al canvas visible, escalado al disco
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.temp, W * DISCO_INI, W * DISCO_INI, W * DISCO_TAM, W * DISCO_TAM);
  }

  /** La máscara pintada de un color (auxiliar). */
  _mascaraColor(color) {
    if (!this._aux) { this._aux = lienzo(RES); this._actx = this._aux.getContext('2d'); }
    const a = this._actx;
    a.globalCompositeOperation = 'source-over';
    a.clearRect(0, 0, RES, RES);
    a.fillStyle = color;
    a.fillRect(0, 0, RES, RES);
    a.globalCompositeOperation = 'destination-in';
    a.drawImage(this.mascara, 0, 0);
    a.globalCompositeOperation = 'source-over';
    return this._aux;
  }
}

// ---------- Dibujo de cada relleno sobre la crepa ----------

function dibujarRelleno(t, { id, x, y, semilla }) {
  const ing = ingrediente(id);
  if (!ing) return;
  const rnd = aleatorio(semilla);
  t.save();
  t.translate(x, y);

  if (ing.categoria === 'untable') {
    // Una "embarrada" irregular con brillo
    t.fillStyle = ing.color;
    t.beginPath();
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 15 + rnd() * 6;
      const px = Math.cos(a) * r * 1.25, py = Math.sin(a) * r;
      i === 0 ? t.moveTo(px, py) : t.lineTo(px, py);
    }
    t.closePath();
    t.fill();
    // Orilla un poco más oscura (para que se vean los untables clarito)
    t.strokeStyle = oscurecer(ing.color, 0.18);
    t.lineWidth = 1.2;
    t.stroke();
    t.strokeStyle = 'rgba(255,255,255,0.35)';
    t.lineWidth = 2.5;
    t.lineCap = 'round';
    t.beginPath();
    t.arc(-3, -2, 9, Math.PI * 1.1, Math.PI * 1.6);
    t.stroke();
  } else {
    dibujarFruta(t, ing, rnd);
  }
  t.restore();
}

/** Frutas sobre la crepa abierta, según su forma. */
function dibujarFruta(t, ing, rnd) {
  const [c1, c2, c3] = ing.colores || [ing.color, '#FFFFFF'];
  const regar = (n, radio, fn) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(), d = radio * (0.5 + rnd() * 0.5);
      t.save();
      t.translate(Math.cos(a) * d, Math.sin(a) * d);
      t.rotate(rnd() * Math.PI * 2);
      fn(i);
      t.restore();
    }
  };
  const circulo = (x, y, r, color) => { t.fillStyle = color; t.beginPath(); t.arc(x, y, r, 0, Math.PI * 2); t.fill(); };
  switch (ing.forma) {
    case 'fresa':
      regar(3, 9, () => {
        t.fillStyle = '#E8414F';
        t.beginPath(); t.ellipse(0, 0, 6, 7.5, 0, 0, Math.PI * 2); t.fill();
        t.fillStyle = '#F79AA5';
        t.beginPath(); t.ellipse(0, 0.5, 3.5, 4.5, 0, 0, Math.PI * 2); t.fill();
      });
      break;
    case 'platano':
      regar(3, 7, () => {
        t.fillStyle = '#FBF0C0'; t.strokeStyle = '#E3CC80'; t.lineWidth = 1.2;
        t.beginPath(); t.arc(0, 0, 6, 0, Math.PI * 2); t.fill(); t.stroke();
        circulo(0, 0, 1.5, '#D9C27A');
      });
      break;
    case 'baya':
      regar(6, 11, () => { circulo(0, 0, 4.2, c1); circulo(-1.3, -1.3, 1.5, c2); });
      break;
    case 'gajo':
      regar(3, 8, () => {
        t.fillStyle = c1; t.strokeStyle = c2; t.lineWidth = 1.5;
        t.beginPath(); t.moveTo(-8, 3); t.quadraticCurveTo(0, -10, 8, 3); t.quadraticCurveTo(0, -2, -8, 3); t.fill(); t.stroke();
      });
      break;
    case 'cubo':
      regar(6, 11, () => { t.fillStyle = c1; t.fillRect(-4, -4, 8, 8); t.fillStyle = c2; t.fillRect(-3, -3, 3.5, 2.5); });
      break;
    case 'rodaja':
      regar(3, 8, () => {
        circulo(0, 0, 7, '#8A6A3E'); circulo(0, 0, 6, c1); circulo(0, 0, 2.2, c2);
        for (let i = 0; i < 6; i++) circulo(Math.cos(i) * 3.8, Math.sin(i) * 3.8, 0.7, c3 || '#333');
      });
      break;
    case 'gotas':
      // Jugo de limón: gotitas brillantes
      t.globalAlpha = 0.7;
      regar(7, 14, () => circulo(0, 0, 1.6 + rnd() * 1.5, c2));
      t.globalAlpha = 1;
      circulo(0, 0, 5, c1); circulo(0, 0, 3.8, c2);
      break;
    default:
      circulo(0, 0, 6, ing.color);
  }
}

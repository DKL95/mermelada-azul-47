/* ============================================================
   audio.js — sonidos sintetizados con Web Audio API
   (no se descarga ningún archivo de audio).
   El navegador solo permite sonar después de que el usuario
   toca la pantalla, por eso el contexto se crea "perezosamente".
   ============================================================ */
import { estado } from './state.js';

let ctx = null;

function contexto() {
  if (!estado().ajustes.sonido) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Tono simple con envolvente (ataque rápido, caída suave). */
function tono({ frec = 440, tipo = 'sine', dur = 0.2, vol = 0.2, retraso = 0, frecFinal = null }) {
  const c = contexto();
  if (!c) return;
  const t = c.currentTime + retraso;
  const osc = c.createOscillator();
  const gan = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frec, t);
  if (frecFinal) osc.frequency.exponentialRampToValueAtTime(frecFinal, t + dur);
  gan.gain.setValueAtTime(0.0001, t);
  gan.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gan).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Ruido blanco filtrado (para el chisporroteo de la plancha). */
function ruido({ dur = 0.6, vol = 0.08, frecFiltro = 3000 }) {
  const c = contexto();
  if (!c) return;
  const muestras = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, muestras, c.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < muestras; i++) {
    // ruido con "chasquidos" aleatorios, como aceite
    datos[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.3);
  }
  const fuente = c.createBufferSource();
  fuente.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'highpass';
  filtro.frequency.value = frecFiltro;
  const gan = c.createGain();
  gan.gain.setValueAtTime(vol, c.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  fuente.connect(filtro).connect(gan).connect(c.destination);
  fuente.start();
}

// ----- Sonidos del juego -----
export const sonidos = {
  /** Toque de botón */
  click: () => tono({ frec: 660, tipo: 'triangle', dur: 0.06, vol: 0.12 }),
  /** Ingrediente colocado */
  pop: () => tono({ frec: 380, frecFinal: 900, tipo: 'sine', dur: 0.12, vol: 0.25 }),
  /** Llega un cliente: campanita de puerta */
  campana: () => {
    tono({ frec: 1318, tipo: 'sine', dur: 0.6, vol: 0.18 });
    tono({ frec: 1760, tipo: 'sine', dur: 0.7, vol: 0.12, retraso: 0.12 });
  },
  /** Masa en la plancha */
  chisporroteo: () => ruido({ dur: 0.8, vol: 0.1 }),
  /** Temporizador asistido: "¡ya!" (tres pitiditos) */
  alarma: () => [0, 0.12, 0.24].forEach((r) => tono({ frec: 1568, tipo: 'square', dur: 0.08, vol: 0.07, retraso: r })),
  /** Logro conseguido: arpegio alegre */
  logro: () => [523, 659, 784, 1047].forEach((f, i) => tono({ frec: f, tipo: 'triangle', dur: 0.25, vol: 0.14, retraso: i * 0.09 })),
  /** Compra en la tienda */
  compra: () => { tono({ frec: 880, tipo: 'sine', dur: 0.15, vol: 0.15 }); tono({ frec: 1320, tipo: 'sine', dur: 0.3, vol: 0.15, retraso: 0.1 }); },
  /** Voltear la crepa: "fiu" */
  voltear: () => tono({ frec: 300, frecFinal: 1200, tipo: 'sine', dur: 0.18, vol: 0.15 }),
  /** Doblar: papelito */
  doblar: () => { ruido({ dur: 0.18, vol: 0.06, frecFiltro: 1500 }); tono({ frec: 520, frecFinal: 380, tipo: 'triangle', dur: 0.15, vol: 0.1 }); },
  /** Salsa: chorrito */
  salsa: () => tono({ frec: 220, frecFinal: 140, tipo: 'sine', dur: 0.25, vol: 0.18 }),
  /** Espolvorear azúcar o canela */
  espolvorear: () => ruido({ dur: 0.35, vol: 0.05, frecFiltro: 6000 }),
  /** Cliente que se va enojado */
  enojado: () => { tono({ frec: 220, frecFinal: 110, tipo: 'sawtooth', dur: 0.35, vol: 0.06 }); },
  /** Cliente encantado: "¡ding-ding!" */
  encantado: () => [1047, 1319, 1568].forEach((f, i) => tono({ frec: f, tipo: 'sine', dur: 0.3, vol: 0.12, retraso: i * 0.07 })),
  /** Cobro: "ching" de caja registradora */
  ching: () => {
    tono({ frec: 2093, tipo: 'square', dur: 0.08, vol: 0.06 });
    tono({ frec: 2637, tipo: 'sine', dur: 0.5, vol: 0.15, retraso: 0.06 });
  },
};

/** Activa o desactiva el sonido. */
export function silenciar(apagado) {
  if (apagado && ctx) ctx.suspend();
}

// iPhone (Safari) solo deja sonar si el audio se "despierta" dentro de
// un toque, y lo suspende al bloquear la pantalla o recibir una llamada
// (estado "interrupted"). Lo despertamos en cada toque y al regresar.
// Nota: en iPhone el interruptor de silencio también apaga estos sonidos.
function despertar() {
  if (!estado().ajustes.sonido) return;
  const c = contexto();
  if (c && c.state !== 'running') c.resume();
}
document.addEventListener('pointerdown', despertar, { capture: true, passive: true });
document.addEventListener('touchend', despertar, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
});

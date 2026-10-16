/* ============================================================
   romance.js — los detalles bonitos:
     - pantalla de inicio (con PIN opcional)
     - mensaje de bienvenida
     - cartita sorpresa (se abre en el día CONFIG.diaSorpresa)
     - créditos
   Todos los textos se editan en config.js.
   ============================================================ */
import { CONFIG } from './config.js';
import { estado, actualizar } from './state.js';
import { mostrarModal } from './ui.js';
import { sonidos } from './audio.js';

const CLAVE_ACCESO = 'creperia.acceso'; // PIN ya validado en este dispositivo
const SAL = 'candy-crepas:';

/** Escapa texto y convierte \n\n en párrafos. */
function parrafos(texto) {
  const seguro = String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return seguro.split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// ============================================================
//  PIN (hash SHA-256)
// ============================================================

/** SHA-256 en hexadecimal. Usa la del navegador si existe (https/localhost),
 *  si no, una versión en JavaScript (por ejemplo al probar por la red local). */
async function sha256(texto) {
  const datos = new TextEncoder().encode(texto);
  if (globalThis.crypto?.subtle) {
    const h = await crypto.subtle.digest('SHA-256', datos);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256JS(datos);
}

function sha256JS(bytes) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const largo = bytes.length;
  const total = Math.ceil((largo + 9) / 64) * 64;
  const m = new Uint8Array(total);
  m.set(bytes);
  m[largo] = 0x80;
  const bits = largo * 8;
  m[total - 4] = bits >>> 24; m[total - 3] = bits >>> 16; m[total - 2] = bits >>> 8; m[total - 1] = bits;
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = (m[i + t * 4] << 24) | (m[i + t * 4 + 1] << 16) | (m[i + t * 4 + 2] << 8) | m[i + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, k) => { H[k] = (H[k] + v) | 0; });
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/** ¿Hace falta pedir el PIN en este dispositivo? */
function necesitaPin() {
  if (!CONFIG.hashPin) return false;
  try { return localStorage.getItem(CLAVE_ACCESO) !== CONFIG.hashPin; } catch { return true; }
}

// ============================================================
//  Pantalla de inicio
// ============================================================

/** Crepa con corazón, dibujada para el inicio. */
function logo() {
  return `
  <svg viewBox="0 0 200 200" class="inicio-logo" aria-hidden="true">
    <ellipse cx="100" cy="182" rx="62" ry="9" fill="rgba(27,42,85,0.15)"/>
    <path d="M36 62 Q100 -4 164 62" fill="none" stroke="#6B3E2E" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 178 L30 66 Q100 4 170 66 Z" fill="#E7B66E" stroke="#B8813C" stroke-width="4" stroke-linejoin="round"/>
    <path d="M100 178 L56 80 Q100 48 144 80 Z" fill="#F3D99A" opacity="0.6"/>
    <path d="M100 128 l-17 -17 a10 10 0 0 1 17 -13 a10 10 0 0 1 17 13 z" fill="#FF4FA3" stroke="#fff" stroke-width="3"/>
    <circle cx="70" cy="40" r="7" fill="#E8414F"/><circle cx="132" cy="40" r="7" fill="#E8414F"/>
  </svg>`;
}

/**
 * Muestra la pantalla de inicio y espera a que entre.
 * (El toque en "¡A cocinar!" también despierta el audio del iPhone.)
 */
export function pantallaInicio() {
  return new Promise((resolver) => {
    const pin = necesitaPin();
    const capa = document.createElement('div');
    capa.id = 'inicio';
    capa.innerHTML = `
      <div class="inicio-caja">
        ${logo()}
        <h1>${CONFIG.nombreCreperia}</h1>
        <p class="inicio-dedicatoria">Hecho con cariño para <b>${CONFIG.nombreElla}</b> 💕</p>
        ${pin ? `
          <form class="inicio-pin" autocomplete="off">
            <label for="pin">🔐 Palabra secreta</label>
            <input id="pin" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
            <button class="btn btn-primario btn-grande" type="submit">Entrar</button>
            <small class="pin-error" hidden>Mmm… esa no es 🙈</small>
          </form>`
        : '<button class="btn btn-primario btn-grande" id="btn-entrar">¡A cocinar! 🥞</button>'}
      </div>`;
    document.getElementById('app').appendChild(capa);
    window.dispatchEvent(new Event('modal:abierto')); // el reloj espera

    const salir = () => {
      sonidos.campana();
      capa.classList.add('saliendo');
      setTimeout(() => capa.remove(), 400);
      window.dispatchEvent(new Event('modal:cerrado'));
      resolver();
    };

    if (!pin) {
      capa.querySelector('#btn-entrar').addEventListener('click', salir);
      return;
    }
    const form = capa.querySelector('form');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const valor = form.querySelector('input').value.trim().toLowerCase();
      const hash = await sha256(SAL + valor);
      if (hash === CONFIG.hashPin) {
        try { localStorage.setItem(CLAVE_ACCESO, hash); } catch { /* sin guardado: lo pedirá la próxima vez */ }
        salir();
      } else {
        form.querySelector('.pin-error').hidden = false;
        form.classList.remove('temblor');
        void form.offsetWidth;
        form.classList.add('temblor');
        sonidos.click();
      }
    });
  });
}

// ============================================================
//  Bienvenida, sorpresa y créditos
// ============================================================

/** Mensaje de bienvenida (solo la primera vez). */
export async function bienvenida() {
  if (estado().bienvenidaVista) return;
  await mostrarModal({
    titulo: `¡Hola, ${CONFIG.nombreElla}! 💕`,
    contenido: `<div class="carta-texto">${parrafos(CONFIG.mensajeBienvenida)}</div>`,
    botones: [{ texto: '¡Vamos! 🥞', clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  actualizar((e) => { e.bienvenidaVista = true; });
}

/** ¿Ya se puede abrir la cartita sorpresa? */
export function sorpresaDesbloqueada(e = estado()) {
  return e.dia >= CONFIG.diaSorpresa;
}

/** Si ya llegó el día y no la ha visto, abre la cartita. */
export async function revisarSorpresa() {
  const e = estado();
  if (!sorpresaDesbloqueada(e) || e.sorpresaVista) return;
  await abrirCarta(true);
}

/** Sobre que se abre con la cartita. */
export async function abrirCarta(primeraVez = false) {
  sonidos.logro();
  const cont = document.createElement('div');
  cont.className = 'carta';
  cont.innerHTML = `
    ${primeraVez ? `<p class="carta-aviso">¡Llegaste al día ${CONFIG.diaSorpresa}! Alguien te dejó algo… 💌</p>` : ''}
    <div class="sobre">
      <div class="sobre-solapa"></div>
      <div class="sobre-papel">
        <div class="carta-texto">${parrafos(CONFIG.mensajeSorpresa)}</div>
        <p class="carta-firma">${CONFIG.firma}</p>
      </div>
    </div>`;
  setTimeout(() => cont.querySelector('.sobre').classList.add('abierto'), 400);
  await mostrarModal({ titulo: '💌 Para ti', contenido: cont, botones: [{ texto: 'Guardar en mi corazón 💕', clase: 'btn-primario' }] });
  if (!estado().sorpresaVista) actualizar((e) => { e.sorpresaVista = true; });
}

export function creditos() {
  const e = estado();
  mostrarModal({
    titulo: '💝 Créditos',
    contenido: `
      <div class="creditos">
        ${logo()}
        <h3>${CONFIG.nombreCreperia}</h3>
        <p>Hecho con cariño para <b>${CONFIG.nombreElla}</b></p>
        <p class="carta-firma">${CONFIG.firma}</p>
        <div class="creditos-stats">
          <span>📅 Día ${e.dia}</span>
          <span>🥞 ${e.records.crepasVendidas} crepas</span>
          <span>✨ ${e.records.crepasPerfectas} perfectas</span>
        </div>
        <small>Juego original, dibujado con código. Sin anuncios y sin internet. 🌈</small>
      </div>`,
    botones: [{ texto: 'Cerrar', clase: 'btn-primario' }],
  });
}

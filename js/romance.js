/* ============================================================
   romance.js — pantalla de inicio y los detalles bonitos.

   El juego es para todo público. La versión romántica (dedicatoria,
   el cliente novio, la cartita sorpresa) se desbloquea en cada
   dispositivo con el código especial (botón 🔒 en la esquina del
   inicio). Se consulta con esRomantica().

   Los mensajes románticos van cifrados en config.js (versionEspecial):
   el código especial es la llave. Al ponerlo, la llave se guarda en el
   dispositivo y ya no se vuelve a pedir.

     - pantalla de inicio (+ botón del código especial)
     - mensaje de bienvenida (público o romántico)
     - cartita sorpresa (se abre en el día CONFIG.diaSorpresa)
     - créditos
   Los textos se editan en config.js y textos-especiales.json.
   ============================================================ */
import { CONFIG } from './config.js';
import { estado, actualizar } from './state.js';
import { mostrarModal } from './ui.js';
import { sonidos } from './audio.js';

const CLAVE_LLAVE = 'creperia.llave';   // llave de los textos (al poner el código)
// Los teléfonos que pusieron el PIN de entrada anterior (era el mismo
// código) guardaron este hash: conservan su versión sin hacer nada, y
// el código se les pide solo para abrir los textos cifrados.
const CLAVE_ACCESO = 'creperia.acceso';
const HASH_PIN_ANTERIOR = '5d18932c358ae05e4060c83d3d0b66bafaef949c9a634f1c8591f211f95465d6';

/** Escapa texto y convierte \n\n en párrafos. */
function parrafos(texto) {
  const seguro = String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return seguro.split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// ============================================================
//  Código especial (llave AES-GCM sacada del código con PBKDF2;
//  los mismos parámetros que herramientas/cifrar-textos.mjs)
// ============================================================

const deB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const aB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const leer = (clave) => { try { return localStorage.getItem(clave); } catch { return null; } };

/** ¿Está desbloqueada la versión romántica en este dispositivo? */
export function esRomantica() {
  if (!CONFIG.versionEspecial) return false;
  return Boolean(leer(CLAVE_LLAVE)) || leer(CLAVE_ACCESO) === HASH_PIN_ANTERIOR;
}

let textos = null; // los textos ya descifrados { mensajeBienvenida, mensajeSorpresa }

async function descifrar(llave) {
  const { iv, datos } = CONFIG.versionEspecial;
  const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, llave, deB64(datos));
  return JSON.parse(new TextDecoder().decode(plano));
}

/** Los textos de la versión especial, o null si en este dispositivo
 *  todavía no se ha puesto el código. */
async function textosEspeciales() {
  if (textos) return textos;
  const guardada = leer(CLAVE_LLAVE);
  if (!guardada || !globalThis.crypto?.subtle) return null;
  try {
    const llave = await crypto.subtle.importKey('raw', deB64(guardada), 'AES-GCM', false, ['decrypt']);
    textos = await descifrar(llave);
  } catch { /* llave de otra versión de los textos: se pedirá el código */ }
  return textos;
}

/** Pone la paleta de colores de la versión (ver base.css). */
export function aplicarTema() {
  const publica = !esRomantica();
  document.documentElement.dataset.tema = publica ? 'publico' : 'especial';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', publica ? '#2EC4B6' : '#3DA5FF');
}
aplicarTema(); // antes de que se pinte nada

/**
 * Revisa un código: si descifra los textos, es el bueno. Desbloquea la
 * versión romántica y guarda la llave. (Sin crypto.subtle, por ejemplo
 * al abrir el juego por http en la red local, no se puede revisar.)
 */
async function probarCodigo(texto) {
  if (!globalThis.crypto?.subtle) return false;
  const { sal, vueltas } = CONFIG.versionEspecial;
  try {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(texto.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']);
    const llave = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: deB64(sal), iterations: vueltas, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, true, ['decrypt'],
    );
    textos = await descifrar(llave); // si el código está mal, aquí truena
    try { localStorage.setItem(CLAVE_LLAVE, aB64(await crypto.subtle.exportKey('raw', llave))); } catch { /* lo pedirá otra vez */ }
    return true;
  } catch {
    return false;
  }
}

function bloquear() {
  textos = null;
  try { localStorage.removeItem(CLAVE_LLAVE); localStorage.removeItem(CLAVE_ACCESO); } catch { /* nada que borrar */ }
}

// ============================================================
//  Pantalla de inicio
// ============================================================

/** Crepa del inicio: con corazón en su versión; en la pública,
 *  con zigzag de chocolate y fresas. */
function logo() {
  const encima = esRomantica()
    ? '<path d="M100 128 l-17 -17 a10 10 0 0 1 17 -13 a10 10 0 0 1 17 13 z" fill="#FF4FA3" stroke="#fff" stroke-width="3"/>'
    : `<path d="M62 84 L80 74 L78 96 L100 82 L96 108 L120 90 L112 120 L132 98" fill="none" stroke="#6B3E2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
       <g transform="translate(86 128) rotate(-15)"><path d="M0 -9 C8 -9 10 -2 8 3 C5 8 0 10 0 10 C0 10 -5 8 -8 3 C-10 -2 -8 -9 0 -9 Z" fill="#E8414F" stroke="#fff" stroke-width="2"/><path d="M-5 -9 Q0 -14 5 -9" stroke="#3FB56B" stroke-width="3" fill="none" stroke-linecap="round"/></g>
       <g transform="translate(114 116) rotate(20)"><path d="M0 -9 C8 -9 10 -2 8 3 C5 8 0 10 0 10 C0 10 -5 8 -8 3 C-10 -2 -8 -9 0 -9 Z" fill="#E8414F" stroke="#fff" stroke-width="2"/><path d="M-5 -9 Q0 -14 5 -9" stroke="#3FB56B" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  return `
  <svg viewBox="0 0 200 200" class="inicio-logo" aria-hidden="true">
    <ellipse cx="100" cy="182" rx="62" ry="9" fill="rgba(27,42,85,0.15)"/>
    <path d="M36 62 Q100 -4 164 62" fill="none" stroke="#6B3E2E" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 178 L30 66 Q100 4 170 66 Z" fill="#E7B66E" stroke="#B8813C" stroke-width="4" stroke-linejoin="round"/>
    <path d="M100 178 L56 80 Q100 48 144 80 Z" fill="#F3D99A" opacity="0.6"/>
    ${encima}
    <circle cx="70" cy="40" r="7" fill="#E8414F"/><circle cx="132" cy="40" r="7" fill="#E8414F"/>
  </svg>`;
}

/** Nombre de la crepería: el especial en su versión. */
export function nombreCreperia() {
  return esRomantica() ? CONFIG.nombreCreperiaEspecial : CONFIG.nombreCreperia;
}

/** Texto bajo el título: dedicatoria en su versión, lema en la pública. */
function dedicatoria() {
  return esRomantica()
    ? `Hecho con cariño para <b>${CONFIG.nombreElla}</b> 💕`
    : '¡Tu propia crepería en el bolsillo! 🥞';
}

/**
 * Muestra la pantalla de inicio y espera a que entre.
 * (El toque en "¡A cocinar!" también despierta el audio del iPhone.)
 */
export function pantallaInicio() {
  return new Promise((resolver) => {
    const capa = document.createElement('div');
    capa.id = 'inicio';
    capa.innerHTML = `
      ${CONFIG.versionEspecial ? '<button class="inicio-codigo" aria-label="Código especial"></button>' : ''}
      <div class="inicio-caja">
        <div class="inicio-logo-caja"></div>
        <h1></h1>
        <p class="inicio-dedicatoria"></p>
        <button class="btn btn-primario btn-grande" id="btn-entrar">¡A cocinar! 🥞</button>
      </div>`;
    document.getElementById('app').appendChild(capa);
    window.dispatchEvent(new Event('modal:abierto')); // el reloj espera

    const pintar = () => {
      aplicarTema();
      capa.querySelector('.inicio-logo-caja').innerHTML = logo();
      capa.querySelector('h1').textContent = nombreCreperia();
      capa.querySelector('.inicio-dedicatoria').innerHTML = dedicatoria();
      document.title = nombreCreperia();
      const b = capa.querySelector('.inicio-codigo');
      if (b) b.textContent = esRomantica() ? '💕' : '🔒';
    };
    pintar();

    capa.querySelector('.inicio-codigo')?.addEventListener('click', async () => {
      sonidos.click();
      if (esRomantica() ? await ventanaQuitarCodigo() : await ventanaCodigo()) {
        pintar();
        window.dispatchEvent(new Event('version:cambio')); // letrero del local, etc.
        const caja = capa.querySelector('.inicio-caja');
        caja.classList.remove('brillo');
        void caja.offsetWidth;
        caja.classList.add('brillo');
      }
    });

    capa.querySelector('#btn-entrar').addEventListener('click', () => {
      sonidos.campana();
      capa.classList.add('saliendo');
      setTimeout(() => capa.remove(), 400);
      window.dispatchEvent(new Event('modal:cerrado'));
      resolver();
    }, { once: true });
  });
}

/** Pide el código especial. Devuelve true si desbloqueó. */
async function ventanaCodigo(pregunta = '¿Tienes un código especial?') {
  const cont = document.createElement('form');
  cont.className = 'inicio-pin';
  cont.autocomplete = 'off';
  cont.innerHTML = `
    <label for="codigo">${pregunta}</label>
    <input id="codigo" type="password" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false">
    <small class="pin-error" hidden>Mmm… ese no es 🙈</small>`;
  const campo = cont.querySelector('input');

  const revisar = async () => {
    const boton = cont.closest('.modal').querySelector('.btn-primario');
    boton.disabled = true; // revisar tarda un momentito (a propósito)
    const ok = await probarCodigo(campo.value);
    boton.disabled = false;
    if (ok) {
      sonidos.logro();
      return true;
    }
    cont.querySelector('.pin-error').hidden = false;
    cont.classList.remove('temblor');
    void cont.offsetWidth;
    cont.classList.add('temblor');
    sonidos.click();
    campo.select();
    return false; // la ventana se queda abierta
  };
  const promesa = mostrarModal({
    titulo: '🔒 Código',
    contenido: cont,
    botones: [
      { texto: 'Cancelar', valor: null },
      { texto: 'Entrar', clase: 'btn-primario', valor: 'ok', alTocar: revisar },
    ],
  });
  cont.addEventListener('submit', (ev) => {
    ev.preventDefault();
    cont.closest('.modal').querySelector('.btn-primario').click();
  });
  setTimeout(() => campo.focus(), 50);
  return (await promesa) === 'ok';
}

/** Ya está desbloqueada: ofrece volver a la versión para todos. */
async function ventanaQuitarCodigo() {
  const r = await mostrarModal({
    titulo: '💕 Versión especial',
    contenido: `<p style="text-align:center">Esta es la versión especial para <b>${CONFIG.nombreElla}</b>.</p>`,
    botones: [
      { texto: 'Volver a la normal', valor: 'quitar' },
      { texto: '¡Me quedo! 💕', clase: 'btn-primario' },
    ],
  });
  if (r !== 'quitar') return false;
  bloquear();
  return true;
}

// ============================================================
//  Bienvenida, sorpresa y créditos
// ============================================================

/** Mensaje de bienvenida: la primera vez que se abre el juego, y el
 *  romántico la primera vez que entra a su versión. */
export async function bienvenida() {
  if (!esRomantica()) {
    if (estado().bienvenidaPublicaVista || estado().bienvenidaVista) return;
    await mostrarModal({
      titulo: `¡Te damos la bienvenida a ${nombreCreperia()}!`,
      contenido: `<div class="carta-texto">${parrafos(CONFIG.mensajeBienvenidaPublico)}</div>`,
      botones: [{ texto: '¡Vamos! 🥞', clase: 'btn-primario' }],
      cerrarAlTocarFuera: false,
    });
    actualizar((e) => { e.bienvenidaPublicaVista = true; });
    return;
  }
  if (estado().bienvenidaVista) return;
  const t = await textosEspeciales();
  if (!t) return;
  await mostrarModal({
    titulo: `¡Hola, ${CONFIG.nombreElla}! 💕`,
    contenido: `<div class="carta-texto">${parrafos(t.mensajeBienvenida)}</div>`,
    botones: [{ texto: '¡Vamos! 🥞', clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  actualizar((e) => { e.bienvenidaVista = true; });
}

/** ¿Ya se puede abrir la cartita sorpresa? */
export function sorpresaDesbloqueada(e = estado()) {
  return esRomantica() && e.dia >= CONFIG.diaSorpresa;
}

/** Si ya llegó el día y no la ha visto, abre la cartita. */
export async function revisarSorpresa() {
  const e = estado();
  if (!sorpresaDesbloqueada(e) || e.sorpresaVista) return;
  await abrirCarta(true);
}

const RENGLON = 28; // alto de cada renglón de la hoja de libreta (px)

/**
 * Reparte la carta en hojas que quepan en `hoja` (sin desplazarse).
 * Llena de frase en frase; si un párrafo no cabe, sigue en la hoja
 * siguiente. La firma va al final de la última hoja.
 * Devuelve una lista de hojas, cada una con su HTML.
 */
function repartirEnHojas(hoja, texto, firma) {
  const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const parrafo = (frases, sigue) => `<p${sigue ? ' class="sigue"' : ''}>${escapar(frases.join(' '))}</p>`;
  const cabe = (partes) => {
    hoja.innerHTML = partes.join('');
    return hoja.scrollHeight <= hoja.clientHeight + 1;
  };
  const hojas = [];
  let actual = [];
  for (const p of String(texto).split(/\n\s*\n/)) {
    const frases = p.trim().split(/(?<=[.!?…»])\s+/);
    let trozo = [];
    let sigue = false; // el párrafo viene de la hoja anterior
    for (const f of frases) {
      if (cabe([...actual, parrafo([...trozo, f], sigue)])) { trozo.push(f); continue; }
      // No cabe: se cierra la hoja y la frase pasa a la siguiente
      if (trozo.length) actual.push(parrafo(trozo, sigue));
      if (actual.length) hojas.push(actual);
      sigue = trozo.length > 0;
      actual = [];
      trozo = [f];
    }
    actual.push(parrafo(trozo, sigue));
  }
  const htmlFirma = `<p class="carta-firma">${escapar(firma)}</p>`;
  if (!cabe([...actual, htmlFirma])) { hojas.push(actual); actual = []; }
  actual.push(htmlFirma);
  hojas.push(actual);
  return hojas.map((h) => h.join(''));
}

/** Sobre que se abre con la cartita: hojas de libreta que se pasan. */
export async function abrirCarta(primeraVez = false) {
  // La carta va cifrada: si en este teléfono no se ha puesto el código, se pide
  const t = await textosEspeciales();
  if (!t && !(await ventanaCodigo('Para abrir tu carta, escribe tu código especial 💌'))) return;
  sonidos.logro();
  // Tantos renglones como quepan cómodos en la pantalla
  const renglones = Math.max(8, Math.min(16, Math.floor(window.innerHeight * 0.48 / RENGLON)));
  const cont = document.createElement('div');
  cont.className = 'carta';
  cont.innerHTML = `
    ${primeraVez ? `<p class="carta-aviso">¡Llegaste al día ${CONFIG.diaSorpresa}! Alguien te dejó algo… 💌</p>` : ''}
    <div class="sobre">
      <div class="sobre-solapa"></div>
      <div class="sobre-papel">
        <div class="hoja-libreta" style="height:${renglones * RENGLON + RENGLON}px"></div>
        <div class="hojas-nav" hidden>
          <button class="btn-hoja" data-paso="-1" aria-label="Hoja anterior">‹</button>
          <span class="hojas-num"></span>
          <button class="btn-hoja" data-paso="1" aria-label="Hoja siguiente">›</button>
        </div>
      </div>
    </div>`;
  const promesa = mostrarModal({ titulo: '💌 Para ti', contenido: cont, botones: [{ texto: 'Guardar en mi corazón 💕', clase: 'btn-primario' }] });

  // Se mide con la letra manuscrita ya cargada (sin internet, con la de respaldo)
  const hoja = cont.querySelector('.hoja-libreta');
  await Promise.race([document.fonts?.load(`22px Caveat`) ?? null, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  const hojas = repartirEnHojas(hoja, textos.mensajeSorpresa, CONFIG.firma);

  let n = 0;
  const nav = cont.querySelector('.hojas-nav');
  const mostrar = (paso = 0) => {
    n = Math.max(0, Math.min(hojas.length - 1, n + paso));
    hoja.innerHTML = hojas[n];
    nav.querySelector('.hojas-num').textContent = `Hoja ${n + 1} de ${hojas.length}`;
    nav.querySelector('[data-paso="-1"]').disabled = n === 0;
    nav.querySelector('[data-paso="1"]').disabled = n === hojas.length - 1;
    if (paso) {
      hoja.classList.remove('pasando-adelante', 'pasando-atras');
      void hoja.offsetWidth;
      hoja.classList.add(paso > 0 ? 'pasando-adelante' : 'pasando-atras');
      sonidos.click();
    }
  };
  nav.hidden = hojas.length < 2;
  nav.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-paso]');
    if (b && !b.disabled) mostrar(Number(b.dataset.paso));
  });
  // Deslizar el dedo para pasar de hoja
  let x0 = null;
  hoja.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; }, { passive: true });
  hoja.addEventListener('touchend', (ev) => {
    if (x0 === null) return;
    const dx = ev.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) {
      const paso = dx < 0 ? 1 : -1;
      if (n + paso >= 0 && n + paso < hojas.length) mostrar(paso);
    }
  });
  mostrar();
  setTimeout(() => cont.querySelector('.sobre').classList.add('abierto'), 400);

  await promesa;
  if (!estado().sorpresaVista) actualizar((e) => { e.sorpresaVista = true; });
}

export function creditos() {
  const e = estado();
  mostrarModal({
    titulo: '💝 Créditos',
    contenido: `
      <div class="creditos">
        ${logo()}
        <h3>${nombreCreperia()}</h3>
        ${esRomantica()
          ? `<p>Hecho con cariño para <b>${CONFIG.nombreElla}</b></p><p class="carta-firma">${CONFIG.firma}</p>`
          : `<p>Un juego de <b>${CONFIG.creador}</b></p>`}
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

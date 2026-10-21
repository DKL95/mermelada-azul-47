/* ============================================================
   cartera.js — las Chispitas ✨ (moneda premium) y el premio diario.

   La cartera vive APARTE de la partida: reiniciar la partida no
   borra las Chispitas (se pueden comprar con dinero de verdad) ni
   lo comprado en la boutique (inventario).

   Se ganan jugando: crepas perfectas, logros y el premio diario.
   En la app de Android también se podrán comprar (window.CandyPagos,
   lo pone la app nativa; en la web los paquetes salen como "Pronto").

   Uso:
     import { chispitas, ganarChispitas, gastarChispitas } from './cartera.js';
     ganarChispitas(5)            // suma
     gastarChispitas(10)          // true si alcanzó (y las descuenta)
     iconoChispita()              // SVG del ícono
   ============================================================ */
import { estado } from './state.js';
import { mostrarModal, aviso } from './ui.js';
import { sonidos } from './audio.js';

const CLAVE = 'creperia.cartera';

// Premio diario según los días seguidos que se ha entrado (del 7 en adelante, el último)
export const PREMIOS_DIARIOS = [3, 3, 5, 5, 8, 8, 15];

// Paquetes para comprar (los precios los pone la tienda de Google Play)
export const PAQUETES = [
  { id: 'chispitas_60', nombre: 'Puñito', chispitas: 60 },
  { id: 'chispitas_150', nombre: 'Bolsita', chispitas: 150, nota: '+15% extra' },
  { id: 'chispitas_400', nombre: 'Frasco', chispitas: 400, nota: '+30% extra' },
  { id: 'chispitas_1000', nombre: 'Cofre', chispitas: 1000, nota: '¡El mejor precio!' },
];

/** Precio en Chispitas de algo que cuesta `pesos`. */
export function enChispitas(pesos) {
  return Math.max(1, Math.ceil(pesos / 50));
}

// ---------- Guardado ----------

function nueva() {
  // logrosPagados: cada logro da sus Chispitas una sola vez (aunque se reinicie la partida)
  // inventario: lo comprado en la boutique ('acc.cabeza:corona', 'traje:mago'...)
  return { chispitas: 0, diario: { ultimo: '', racha: 0 }, regaloLogros: false, logrosPagados: [], inventario: [] };
}

function cargar() {
  try {
    return { ...nueva(), ...JSON.parse(localStorage.getItem(CLAVE)) };
  } catch {
    return nueva();
  }
}

const cartera = cargar();
const oyentes = new Set();

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(cartera)); } catch { /* sin espacio o modo privado */ }
  oyentes.forEach((o) => o(cartera.chispitas));
}

export function chispitas() {
  return cartera.chispitas;
}

export function ganarChispitas(n) {
  if (!(n > 0)) return;
  cartera.chispitas += Math.round(n);
  guardar();
}

export function gastarChispitas(n) {
  if (cartera.chispitas < n) return false;
  cartera.chispitas -= n;
  guardar();
  return true;
}

export function tieneArticulo(clave) {
  return cartera.inventario.includes(clave);
}

/** ¿Tiene algo cuyo nombre empiece así? ('traje:', 'local.'...) */
export function tieneAlgunArticulo(prefijo) {
  return cartera.inventario.some((c) => c.startsWith(prefijo));
}

export function agregarArticulos(claves) {
  for (const c of claves) if (!cartera.inventario.includes(c)) cartera.inventario.push(c);
  guardar();
}

/** Paga las Chispitas de un logro, si no se habían pagado antes. */
export function premiarLogro(id, n) {
  if (cartera.logrosPagados.includes(id)) return;
  cartera.logrosPagados.push(id);
  ganarChispitas(n);
}

/** Llama a fn(chispitas) cada vez que cambian. */
export function suscribirCartera(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

// ---------- Dibujo ----------

let idGradiente = 0;

/** Ícono de Chispita: estrellita de azúcar de cuatro picos. */
export function iconoChispita(clase = '') {
  const id = `chispita-${++idGradiente}`; // cada ícono con su propio degradado
  return `<svg viewBox="0 0 24 24" class="icono-chispita ${clase}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE45C"/><stop offset="0.5" stop-color="#FF6FB5"/><stop offset="1" stop-color="#8A6CFF"/>
    </linearGradient></defs>
    <path d="M12 1.5 C12.9 7.6 16.4 11.1 22.5 12 C16.4 12.9 12.9 16.4 12 22.5 C11.1 16.4 7.6 12.9 1.5 12 C7.6 11.1 11.1 7.6 12 1.5 Z"
      fill="url(#${id})" stroke="#FFFFFF" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M12 6 C12.4 9.6 14.4 11.6 18 12 C14.4 12.4 12.4 14.4 12 18 C11.6 14.4 9.6 12.4 6 12 C9.6 11.6 11.6 9.6 12 6 Z" fill="#FFFFFF" opacity="0.35"/>
    <circle cx="19.6" cy="4.4" r="1.6" fill="#FFE45C"/><circle cx="4.4" cy="19.2" r="1.1" fill="#7FD3FF"/>
  </svg>`;
}

/** "12 ✨" con el ícono, para meter en textos y botones. */
export function textoChispitas(n) {
  return `<span class="monto-chispitas">${iconoChispita()}${n}</span>`;
}

// ---------- Regalo de bienvenida y premio diario ----------

const hoyTexto = (d = new Date()) => d.toLocaleDateString('en-CA'); // AAAA-MM-DD (hora local)

/**
 * La primera vez que alguien con partida avanzada ve las Chispitas,
 * recibe las que le tocan por los logros que ya tenía.
 * @param {function} porLogro  logro → chispitas que da
 */
export async function regaloPorLogros(logros, porLogro) {
  if (cartera.regaloLogros) return;
  cartera.regaloLogros = true;
  const ganados = logros.filter((l) => estado().logros.includes(l.id) && !cartera.logrosPagados.includes(l.id));
  const total = ganados.reduce((s, l) => s + porLogro(l), 0);
  cartera.logrosPagados.push(...ganados.map((l) => l.id));
  if (!total) { guardar(); return; }
  cartera.chispitas += total;
  guardar();
  sonidos.logro();
  await mostrarModal({
    titulo: '¡Llegaron las Chispitas!',
    contenido: `<div class="regalo-chispitas">
      <div class="chispita-grande">${iconoChispita()}</div>
      <p>Las <b>Chispitas</b> son una moneda especial: con ellas puedes comprar mejoras y, muy pronto, ropa y decoración.</p>
      <p>Por los <b>${ganados.length} logros</b> que ya tienes te tocan:</p>
      <p class="regalo-total">${textoChispitas(total)}</p>
    </div>`,
    botones: [{ texto: '¡Gracias! ✨', clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
}

/** Si hoy no lo ha recogido, muestra el premio diario. */
export async function premioDiario() {
  const hoy = hoyTexto();
  const d = cartera.diario;
  if (d.ultimo === hoy) return;
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const racha = d.ultimo === hoyTexto(ayer) ? d.racha + 1 : 1;
  const premio = PREMIOS_DIARIOS[Math.min(racha, PREMIOS_DIARIOS.length) - 1];
  const actual = Math.min(racha, PREMIOS_DIARIOS.length) - 1;

  const cont = document.createElement('div');
  cont.innerHTML = `
    <p class="diario-nota">Entra todos los días: ¡el premio crece!</p>
    <div class="diario-dias">
      ${PREMIOS_DIARIOS.map((n, i) => `
        <div class="diario-dia${i < actual ? ' recogido' : ''}${i === actual ? ' hoy' : ''}">
          <small>Día ${i + 1}${i === PREMIOS_DIARIOS.length - 1 ? '+' : ''}</small>
          ${iconoChispita()}<b>${n}</b>
        </div>`).join('')}
    </div>`;
  await mostrarModal({
    titulo: '🎁 Premio del día',
    contenido: cont,
    botones: [{ texto: `Recoger ${premio} ✨`, clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  cartera.diario = { ultimo: hoy, racha };
  cartera.chispitas += premio;
  guardar();
  sonidos.ching();
  aviso(`✨ +${premio} Chispitas`);
}

// ---------- Tienda de Chispitas ----------

export function abrirTiendaChispitas() {
  sonidos.click();
  const pagos = window.CandyPagos; // solo existe en la app de Android
  const cont = document.createElement('div');
  cont.className = 'tienda-chispitas';
  cont.innerHTML = `
    <div class="tienda-dinero">Tienes <b>${textoChispitas(cartera.chispitas)}</b></div>
    <div class="paquetes">
      ${PAQUETES.map((p) => `
        <div class="paquete">
          <div class="paquete-icono">${iconoChispita()}</div>
          <b>${p.nombre}</b>
          <span class="paquete-cantidad">${p.chispitas}</span>
          <small>${p.nota || '&nbsp;'}</small>
          ${pagos
            ? `<button class="btn btn-primario" data-paquete="${p.id}">${pagos.precio?.(p.id) || 'Comprar'}</button>`
            : '<button class="btn" disabled>Pronto</button>'}
        </div>`).join('')}
    </div>
    ${pagos ? '' : '<p class="menu-nota">Las Chispitas se podrán comprar en la app de Android. Mientras, ¡gánalas jugando!</p>'}
    <h3 class="menu-titulo">Gana Chispitas gratis</h3>
    <ul class="ganar-chispitas">
      <li>🎁 Premio diario: entra todos los días (hasta 15 ✨)</li>
      <li>✨ Cada crepa perfecta (95% o más): +1</li>
      <li>🏆 Cada logro que desbloquees</li>
    </ul>`;
  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-paquete]');
    if (!b || !pagos) return;
    const p = PAQUETES.find((x) => x.id === b.dataset.paquete);
    b.disabled = true;
    try {
      if ((await pagos.comprar(p.id))?.ok) {
        ganarChispitas(p.chispitas);
        sonidos.compra();
        aviso(`✨ +${p.chispitas} Chispitas. ¡Gracias!`);
        cont.querySelector('.tienda-dinero b').innerHTML = textoChispitas(cartera.chispitas);
      }
    } catch (err) {
      console.warn('No se pudo completar la compra.', err);
      aviso('No se pudo completar la compra');
    } finally {
      b.disabled = false;
    }
  });
  return mostrarModal({ titulo: 'Chispitas', contenido: cont, botones: [{ texto: 'Cerrar', clase: 'btn-primario' }] });
}

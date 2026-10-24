/* ============================================================
   sinfin.js — modo sin fin.

   Una partida aparte: al entrar se guarda la partida normal y se
   juega con un estado temporal (state.js). 3 corazones: se pierde
   uno si un cliente se va enojado o recibe una crepa de 1★. Los
   clientes llegan cada vez más seguido (turno.js). Al terminar se
   regresa a la partida normal, se guardan los récords, se suben
   los puntos a la tabla en línea y se dan Chispitas.
   ============================================================ */
import { estado, actualizar, entrarModoTemporal, salirModoTemporal, enModoTemporal, hoyNuevo } from './state.js';
import { mostrarModal } from './ui.js';
import { sonidos } from './audio.js';
import { juego, on, abrirSinFin, terminarSinFin, refrescar } from './turno.js';
import { revisarLogros } from './data/logros.js';
import { ganarChispitas, textoChispitas } from './cartera.js';
import { registrarSinFin } from './ranking.js';
import { avisarLogros } from './tienda.js';
import { t } from './idioma.js';

export const VIDAS = 3;
const PUNTOS_POR_CHISPITA = 2500;

/** Tiempo como 3:07 */
export function reloj(segundos) {
  const s = Math.floor(segundos);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function puedeJugarSinFin() {
  return !juego.abierto && !enModoTemporal() && estado().tutorialVisto;
}

/** Explica las reglas y, si acepta, empieza. */
export async function empezarSinFin() {
  if (!puedeJugarSinFin()) return;
  sonidos.click();
  const r = estado().stats.sinfin;
  const ok = await mostrarModal({
    titulo: `♾️ ${t('Modo sin fin')}`,
    contenido: `<div class="reglas-sinfin">
      <p>${t('Atiende a todos los clientes que puedas. ¡No se acaba hasta que pierdes tus <b>3 corazones</b>!')} ❤️❤️❤️</p>
      <ul>
        <li>💔 ${t('Pierdes uno si un cliente se va enojado o le das una crepa de 1★.')}</li>
        <li>⏩ ${t('Cada vez llegan más seguido y más exigentes.')}</li>
        <li>⭐ ${t('Ganas puntos por cada crepa (más si es perfecta) y bono por racha.')}</li>
        <li>🥞 ${t('Todos los ingredientes y doblados están disponibles.')}</li>
        <li>✨ ${t('Por cada {n} puntos ganas 1 Chispita.', { n: PUNTOS_POR_CHISPITA.toLocaleString('es-MX') })}</li>
      </ul>
      <p class="menu-nota">${t('Tu partida normal no cambia: dinero, días y reputación se quedan igual.')}</p>
      ${r.mejor ? `<p class="record-sinfin">🏅 ${t('Tu récord: {puntos}', { puntos: `<b>${t('{n} pts', { n: r.mejor.toLocaleString('es-MX') })}</b>` })}</p>` : ''}
    </div>`,
    botones: [{ texto: t('Ahora no'), valor: null }, { texto: `${t('¡A jugar!')} ♾️`, clase: 'btn-primario', valor: 'ok' }],
  });
  if (ok !== 'ok' || !puedeJugarSinFin()) return;
  entrarModoTemporal((e) => {
    e.sinfin = { vidas: VIDAS, puntos: 0, crepas: 0, perfectas: 0, racha: 0, rachaMax: 0, segundos: 0, perdioVida: false, crepasAlPerder: 0 };
    e.dia = 1;
    e.reputacion = 4;            // así también vienen los VIP
    e.segundosTurno = 0;
    e.evento = null;
    e.desbloqueados = ['*'];
    e.mejoras = { ...e.mejoras, doblado_cono: 1, doblado_sobre: 1, charola: 1 };
    e.charola = [];
    e.hoy = hoyNuevo(4);
    e.ajustes.dificultad = 'normal';
    e.ajustes.costoInsumos = false;
    return e;
  });
  abrirSinFin();
}

/** Terminar antes (pregunta primero). */
export async function rendirse() {
  const ok = await mostrarModal({
    titulo: t('¿Terminar la partida?'),
    contenido: `<p style="text-align:center">${t('Se guardan los puntos que llevas.')}</p>`,
    botones: [{ texto: t('Seguir jugando'), valor: null }, { texto: t('Terminar'), clase: 'btn-peligro', valor: 'ok' }],
  });
  if (ok === 'ok') terminarSinFin();
}

// Al acabarse la partida: de vuelta a la normal, récords, tabla, Chispitas y resumen
on('finSinFin', async (sf) => {
  salirModoTemporal();
  const r = estado().stats.sinfin;
  const record = sf.puntos > r.mejor;
  const sinPerder = sf.perdioVida ? sf.crepasAlPerder : sf.crepas;
  let logros = [];
  actualizar((e) => {
    const s = e.stats.sinfin;
    s.partidas += 1;
    s.mejor = Math.max(s.mejor, sf.puntos);
    s.maxSegundos = Math.max(s.maxSegundos, sf.segundos);
    s.maxCrepas = Math.max(s.maxCrepas, sf.crepas);
    s.maxRacha = Math.max(s.maxRacha, sf.rachaMax);
    s.mejorSinPerder = Math.max(s.mejorSinPerder, sinPerder);
    s.perfectas += sf.perfectas;
    logros = revisarLogros(e, { momento: 'sinfin', sinfin: sf });
  });
  const chispitas = Math.floor(sf.puntos / PUNTOS_POR_CHISPITA);
  ganarChispitas(chispitas);
  registrarSinFin({ puntos: sf.puntos, crepas: sf.crepas, segundos: sf.segundos });
  refrescar();
  sonidos.campana();
  await mostrarModal({
    titulo: `♾️ ${t('¡Se acabó!')}`,
    contenido: `<div class="resumen-dia">
      <div class="puntos-sinfin">${sf.puntos.toLocaleString('es-MX')} <small>${t('pts')}</small></div>
      ${record ? `<div class="record">🏅 ${t('¡Nuevo récord!')}</div>` : ''}
      <div><span>🥞 ${t('Crepas')}</span><b>${sf.crepas}</b></div>
      <div><span>✨ ${t('Perfectas')}</span><b>${sf.perfectas}</b></div>
      <div><span>🔥 ${t('Mejor racha')}</span><b>${sf.rachaMax}</b></div>
      <div><span>⏱️ ${t('Tiempo')}</span><b>${reloj(sf.segundos)}</b></div>
      ${chispitas ? `<div class="total"><span>${t('Premio')}</span><b>+${textoChispitas(chispitas)}</b></div>` : ''}
      <div><span>🏅 ${t('Récord')}</span><b>${t('{n} pts', { n: Math.max(r.mejor, sf.puntos).toLocaleString('es-MX') })}</b></div>
    </div>`,
    botones: [{ texto: t('Listo'), clase: 'btn-primario' }],
    cerrarAlTocarFuera: false,
  });
  if (logros.length) avisarLogros(logros);
});

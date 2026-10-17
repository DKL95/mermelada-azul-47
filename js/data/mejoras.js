/* ============================================================
   data/mejoras.js — tienda de mejoras y sus efectos.

     id, nombre, emoji, descripcion
     seccion   'cocina' | 'local'
     precios   precio de cada nivel [nivel1, nivel2, ...]
     efectos   texto de lo que da cada nivel
     soloEn    (opcional) dificultades donde aparece

   Las funciones de abajo calculan los efectos combinados;
   el resto del juego solo llama a esas funciones.
   ============================================================ */
import { CONFIG } from '../config.js';

export const MEJORAS = [
  // ----- Cocina -----
  { id: 'esparcidor', seccion: 'cocina', emoji: '🪵', nombre: 'Esparcidor profesional', precios: [300, 800],
    descripcion: 'Una rastra más ancha: la masa queda redonda con menos vueltas.', efectos: ['Rastra más ancha', 'Rastra extra ancha'] },
  { id: 'plancha', seccion: 'cocina', emoji: '🔥', nombre: 'Plancha profesional', precios: [450, 1100],
    descripcion: 'Calienta parejito, así la zona perfecta de cocción es más ancha.', efectos: ['Zona perfecta +30%', 'Zona perfecta +60%'] },
  { id: 'temporizador', seccion: 'cocina', emoji: '⏲️', nombre: 'Temporizador asistido', precios: [400],
    descripcion: 'Suena una alarmita justo cuando la crepa entra a la zona perfecta.', efectos: ['Alarma de volteo'] },
  { id: 'charola', seccion: 'cocina', emoji: '📦', nombre: 'Charola grande', precios: [350],
    descripcion: 'Caben 6 crepas terminadas en vez de 4.', efectos: ['6 lugares'] },
  { id: 'doblado_cono', seccion: 'cocina', emoji: '🍦', nombre: 'Conos de papel', precios: [250],
    descripcion: 'Aprende el doblado en cono, para comer caminando. Los clientes empezarán a pedirlo.', efectos: ['Doblado en cono'] },
  { id: 'doblado_sobre', seccion: 'cocina', emoji: '✉️', nombre: 'Doblado en sobre', precios: [350],
    descripcion: 'Las 4 orillas hacia el centro, como carta. Ideal para crepas con helado.', efectos: ['Doblado en sobre'] },
  { id: 'caja', seccion: 'cocina', emoji: '💳', nombre: 'Terminal para tarjeta', precios: [600],
    descripcion: 'Los clientes pagan con tarjeta y dejan más propina.', efectos: ['+10% de propinas'] },
  { id: 'bebidas', seccion: 'cocina', emoji: '☕', nombre: 'Barra de bebidas', precios: [900], soloEn: CONFIG.bebidasEnDificultades,
    descripcion: 'Café, chocolate caliente, limonada y frappé para acompañar la crepa.', efectos: ['Venta de bebidas'] },

  // ----- Decoración del local (se ve en la ventanilla) -----
  { id: 'plantas', seccion: 'local', emoji: '🪴', nombre: 'Macetas con flores', precios: [200],
    descripcion: 'El local se ve fresco y bonito.', efectos: ['+10% de paciencia'] },
  { id: 'mesitas', seccion: 'local', emoji: '🪑', nombre: 'Mesitas afuera', precios: [500],
    descripcion: 'Los clientes esperan sentaditos.', efectos: ['+15% de paciencia'] },
  { id: 'luces', seccion: 'local', emoji: '💡', nombre: 'Foquitos de colores', precios: [400],
    descripcion: 'Una guirnalda de foquitos en el toldo.', efectos: ['+10% de propinas'] },
  { id: 'letrero', seccion: 'local', emoji: '✨', nombre: 'Letrero luminoso', precios: [700],
    descripcion: 'El letrero brilla y se ve desde lejos.', efectos: ['Llega gente más seguido'] },
  { id: 'mascota', seccion: 'local', emoji: '🐩', nombre: `Mascota: ${CONFIG.nombreMascota}`, precios: [800],
    descripcion: 'Una French Poodle blanca que se duerme en el mostrador. ¡Todos la quieren!', efectos: ['La reputación sube más rápido'] },
];

/** Nivel comprado de una mejora (0 = no la tienes). */
export function nivel(e, id) {
  return e.mejoras[id] || 0;
}

/** ¿Esta mejora aparece en la tienda con la dificultad actual? */
export function mejoraVisible(m, e) {
  return !m.soloEn || m.soloEn.includes(e.ajustes.dificultad);
}

/** Multiplicador de la paciencia de los clientes. */
export function multPaciencia(e) {
  return 1 + 0.1 * nivel(e, 'plantas') + 0.15 * nivel(e, 'mesitas');
}

/** Multiplicador de las propinas. */
export function multPropina(e) {
  return 1 + 0.1 * nivel(e, 'caja') + 0.1 * nivel(e, 'luces');
}

/** Multiplicador del tiempo entre clientes (menos = llegan más seguido). */
export function multIntervalo(e) {
  return nivel(e, 'letrero') ? 0.85 : 1;
}

/** Cuánto se ensancha la zona perfecta de cocción. */
export function multVentana(e) {
  return 1 + 0.3 * nivel(e, 'plancha');
}

export function capacidadCharola(e) {
  return nivel(e, 'charola') ? 6 : 4;
}

/** Las subidas de reputación cuentan más con la mascota. */
export function multReputacion(e) {
  return nivel(e, 'mascota') ? 1.25 : 1;
}

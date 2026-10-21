/* ============================================================
   data/logros.js — logros / medallas.

     id, emoji, nombre, descripcion
              (los nombres con género son "get nombre()": se leen al pintarse)
     premio   pesos que se ganan al conseguirlo (y Chispitas: ver chispitasDe)
     cumple   función (e, ctx) → true si ya se ganó
              e   = estado del juego
              ctx = { momento: 'entrega' | 'finDia' | 'compra', ... }
   Las estadísticas que usan viven en e.stats, e.records y e.hoy.
   ============================================================ */
import { MEJORAS } from './mejoras.js';
import { COMBOS } from './ingredientes.js';
import { VIPS } from './clientes.js';
import { premiarLogro } from '../cartera.js';
import { g } from '../genero.js';

export const LOGROS = [
  { id: 'primera', emoji: '🥞', nombre: '¡Primera crepa!', descripcion: 'Vende tu primera crepa.', premio: 20,
    cumple: (e) => e.records.crepasVendidas >= 1 },
  { id: 'vendidas_50', emoji: '🧺', get nombre() { return g('Crepera de verdad', 'Crepero de verdad'); }, descripcion: 'Vende 50 crepas.', premio: 100,
    cumple: (e) => e.records.crepasVendidas >= 50 },
  { id: 'vendidas_200', emoji: '🏪', nombre: 'Negocio establecido', descripcion: 'Vende 200 crepas.', premio: 300,
    cumple: (e) => e.records.crepasVendidas >= 200 },
  { id: 'perfectas_10', emoji: '✨', nombre: 'Manos de seda', descripcion: 'Haz 10 crepas perfectas (95% o más).', premio: 100,
    cumple: (e) => e.records.crepasPerfectas >= 10 },
  { id: 'perfectas_50', emoji: '💎', get nombre() { return g('Maestra crepera', 'Maestro crepero'); }, descripcion: 'Haz 50 crepas perfectas.', premio: 400,
    cumple: (e) => e.records.crepasPerfectas >= 50 },
  { id: 'racha_5', emoji: '🔥', nombre: 'En racha', descripcion: '5 clientes encantados seguidos.', premio: 80,
    cumple: (e) => e.stats.rachaMax >= 5 },
  { id: 'racha_10', emoji: '🌋', nombre: 'Imparable', descripcion: '10 clientes encantados seguidos.', premio: 200,
    cumple: (e) => e.stats.rachaMax >= 10 },
  { id: 'exigente', emoji: '😤', nombre: 'Cliente exigente conquistado', descripcion: 'Dale 5 estrellas a un cliente exigente.', premio: 80,
    cumple: (e) => e.stats.exigentes5 >= 1 },
  { id: 'gourmet', emoji: '🧐', nombre: 'Aprobada por la crítica', descripcion: 'Dale 5 estrellas a un crítico gourmet.', premio: 150,
    cumple: (e) => e.stats.gourmets5 >= 1 },
  { id: 'ninos', emoji: '🍭', get nombre() { return g('Consentidora de niños', 'Consentidor de niños'); }, descripcion: 'Deja encantados a 5 niños.', premio: 80,
    cumple: (e) => e.stats.ninosEncantados >= 5 },
  { id: 'vips', emoji: '🤓', nombre: 'Clientela fiel', descripcion: `Atiende a los ${VIPS.length} clientes VIP.`, premio: 200,
    cumple: (e) => VIPS.every((v) => e.stats.vips.includes(v.id)) },
  { id: 'famoso', emoji: '🌟', get nombre() { return g('¡Famosa en internet!', '¡Famoso en internet!'); }, descripcion: 'Conquista a la crítica famosa.', premio: 250,
    cumple: (e) => e.stats.famoso },
  { id: 'combos', emoji: '📖', nombre: 'Todo el menú', descripcion: `Vende con 4★ o más las ${COMBOS.length} crepas de la casa.`, premio: 300,
    cumple: (e) => COMBOS.every((c) => e.stats.combos.includes(c.id)) },
  { id: 'salsa', emoji: '〰️', nombre: 'Artista de la salsa', descripcion: 'Decora 20 crepas con la salsa perfecta.', premio: 120,
    cumple: (e) => e.stats.salsaPerfecta >= 20 },
  { id: 'sin_quemadas', emoji: '🧯', nombre: 'Día sin quemadas', descripcion: 'Termina un día con 5+ crepas vendidas y ninguna quemada.', premio: 80,
    cumple: (e, ctx) => ctx.momento === 'finDia' && e.hoy.vendidas >= 5 && !e.hoy.quemadas },
  { id: 'sin_perder', emoji: '🤝', nombre: 'Nadie se fue enojado', descripcion: 'Termina un día con 5+ crepas vendidas sin perder clientes.', premio: 100,
    cumple: (e, ctx) => ctx.momento === 'finDia' && e.hoy.vendidas >= 5 && !e.hoy.perdidos },
  { id: 'dia_1000', emoji: '💰', nombre: 'Día redondo', descripcion: 'Gana $1,000 en un solo día.', premio: 150,
    cumple: (e) => e.hoy.ganado >= 1000 },
  { id: 'ahorro', emoji: '🐷', nombre: 'Alcancía llena', descripcion: 'Junta $5,000 en la caja.', premio: 200,
    cumple: (e) => e.dinero >= 5000 },
  { id: 'cinco_estrellas', emoji: '⭐', nombre: 'Cinco estrellas', descripcion: 'Llega a 5 estrellas de reputación.', premio: 300,
    cumple: (e) => e.reputacion >= 4.95 },
  { id: 'semana', emoji: '📅', nombre: 'Una semana abierta', descripcion: 'Llega al día 7.', premio: 100,
    cumple: (e) => e.dia >= 7 },
  { id: 'duena', emoji: '👑', get nombre() { return g('Dueña del changarro', 'Dueño del changarro'); }, descripcion: 'Compra todas las mejoras de la tienda.', premio: 500,
    cumple: (e) => MEJORAS.filter((m) => !m.soloEn || m.soloEn.includes(e.ajustes.dificultad))
      .every((m) => (e.mejoras[m.id] || 0) >= m.precios.length) },
  // Va al final para que se gane en la misma revisión que el último de los otros
  { id: 'todos', emoji: '💖', nombre: 'Ay que', descripcion: 'Desbloquea todos los demás logros.', premio: 1000,
    cumple: (e) => LOGROS.every((l) => l.id === 'todos' || e.logros.includes(l.id)) },
];

/** Chispitas que da un logro: una por cada $50 de premio (mínimo una). */
export function chispitasDe(logro) {
  return Math.max(1, Math.round(logro.premio / 50));
}

/**
 * Revisa qué logros nuevos se cumplen. Los marca en el estado y
 * suma su premio (pesos y Chispitas). Devuelve la lista de los recién ganados.
 * (Llamar dentro de actualizar()).
 */
export function revisarLogros(e, ctx) {
  const nuevos = [];
  for (const l of LOGROS) {
    if (e.logros.includes(l.id)) continue;
    if (l.cumple(e, ctx)) {
      e.logros.push(l.id);
      e.dinero += l.premio;
      premiarLogro(l.id, chispitasDe(l));
      nuevos.push(l);
    }
  }
  return nuevos;
}

/* ============================================================
   data/eventos.js — eventos especiales de un día.

     llegadas    multiplica el tiempo entre clientes (>1 = menos gente)
     paciencia   multiplica la paciencia
     propina     multiplica las propinas
     favoritos   ingredientes que se piden más ese día
     bebidas     bebidas que se piden más ese día
     peso        qué tan seguido sale (al azar)

   Además, TODOS los días hay una "hora pico" a media tarde.
   ============================================================ */
export const EVENTOS = [
  { id: 'lluvia', emoji: '🌧️', nombre: 'Día de lluvia',
    descripcion: 'Llega menos gente, pero con más paciencia… y antojo de chocolate.',
    llegadas: 1.5, paciencia: 1.25, propina: 1, peso: 3,
    favoritos: ['nutella', 'choco_oscuro', 'cajeta', 'dulce_leche', 'jarabe_chocolate', 'salsa_cajeta', 'masa_chocolate'],
    bebidas: ['chocolate_caliente', 'cafe'] },
  { id: 'calor', emoji: '☀️', nombre: 'Día de calor',
    descripcion: '¡Qué calorón! Todos quieren helado y fruta fresca.',
    llegadas: 0.9, paciencia: 0.9, propina: 1, peso: 3,
    favoritos: ['helado_vainilla', 'helado_fresa', 'helado_chocolate', 'mango', 'pina', 'limon', 'kiwi', 'fresa'],
    bebidas: ['limonada', 'frappe'] },
  { id: 'quincena', emoji: '💸', nombre: 'Día de quincena',
    descripcion: 'A la gente le acaban de pagar: llegan más clientes y dejan mejor propina.',
    llegadas: 0.75, paciencia: 1, propina: 1.25, peso: 2, favoritos: [] },
  { id: 'san_valentin', emoji: '💘', nombre: 'Día de San Valentín',
    descripcion: 'El amor está en el aire: fresas, chocolate y propinas generosas.',
    llegadas: 0.85, paciencia: 1.1, propina: 1.3, peso: 1,
    favoritos: ['fresa', 'frambuesa', 'nutella', 'choco_blanco', 'helado_fresa', 'jarabe_fresa', 'mermelada_fresa', 'crema_batida'],
    bebidas: ['chocolate_caliente'] },
  { id: 'famoso', emoji: '🌟', nombre: 'Visita famosa',
    descripcion: 'Dicen que hoy viene una crítica de comida muy famosa… ¡que su crepa quede perfecta!',
    llegadas: 1, paciencia: 1, propina: 1, peso: 1.5, favoritos: [] },
];

// Hora pico: en esta parte del día llega el doble de gente
export const HORA_PICO = { desde: 0.42, hasta: 0.62, llegadas: 0.5 };

/** Busca un evento por id (o null). */
export function evento(id) {
  return EVENTOS.find((x) => x.id === id) || null;
}

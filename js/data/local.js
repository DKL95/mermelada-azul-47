/* ============================================================
   data/local.js — decoración del local (aparte de las mejoras).

   Cada categoría: { nombre, opciones: [{ id, nombre, precio? }] }
   Lo que no tiene precio es gratis. 'tema' = los colores de la
   versión (pública o especial).
   ============================================================ */
import { traducirDatos } from '../idioma.js';

export const DECORACION = {
  toldo: { nombre: '⛱️ Toldo', opciones: [
    { id: 'rayas', nombre: 'Rayas' }, { id: 'liso', nombre: 'Liso' },
    { id: 'lunares', nombre: 'Lunares', precio: 400 }, { id: 'cuadros', nombre: 'Cuadritos', precio: 500 },
    { id: 'arcoiris', nombre: '🌈 Arcoíris', precio: 900 },
  ] },
  letrero: { nombre: '🪧 Letrero', opciones: [
    { id: 'clasico', nombre: 'Clásico' }, { id: 'pizarron', nombre: 'Pizarrón', precio: 400 },
    { id: 'madera', nombre: 'Madera', precio: 500 }, { id: 'neon', nombre: '💡 Neón', precio: 800 },
    { id: 'dorado', nombre: '✨ Dorado', precio: 1200 },
  ] },
  mostrador: { nombre: '🧱 Mostrador', opciones: [
    { id: 'tema', nombre: 'Del color del toldo' }, { id: 'pastel', nombre: 'Rosa pastel', precio: 500 },
    { id: 'madera', nombre: 'Madera', precio: 600 }, { id: 'negro', nombre: 'Negro elegante', precio: 600 },
    { id: 'marmol', nombre: 'Mármol', precio: 900 },
  ] },
  pared: { nombre: '🧩 Azulejos de la cocina', opciones: [
    { id: 'tema', nombre: 'Aqua' }, { id: 'blanco', nombre: 'Blancos', precio: 300 },
    { id: 'rosa', nombre: 'Rosas', precio: 400 }, { id: 'amarillo', nombre: 'Amarillos', precio: 400 },
    { id: 'ajedrez', nombre: '♟️ Ajedrez', precio: 700 },
  ] },
  cielo: { nombre: '🌤️ Cielo', opciones: [
    { id: 'dia', nombre: 'De día' }, { id: 'atardecer', nombre: '🌇 Atardecer', precio: 600 },
    { id: 'noche', nombre: '🌙 Noche estrellada', precio: 800 },
  ] },
  temporada: { nombre: '🎉 Decoración de fiesta', opciones: [
    { id: 'ninguna', nombre: 'Nada' }, { id: 'cumple', nombre: '🎈 Cumpleaños', precio: 500 },
    { id: 'valentin', nombre: '💗 San Valentín', precio: 700 }, { id: 'patrias', nombre: '🇲🇽 Fiestas patrias', precio: 700 },
    { id: 'halloween', nombre: '🎃 Halloween', precio: 900 }, { id: 'muertos', nombre: '🌼 Día de Muertos', precio: 900 },
    { id: 'navidad', nombre: '🎄 Navidad', precio: 900 },
  ] },
};

traducirDatos(Object.values(DECORACION), 'nombre');
Object.values(DECORACION).forEach((c) => traducirDatos(c.opciones, 'nombre'));

// Colores del toldo (gratis). null = el color de la versión.
export const COLORES_TOLDO = [null, '#E8414F', '#FF4FA3', '#FF7A1A', '#FFB020', '#22C55E', '#8B5CF6', '#1B1B2B'];

export function localInicial() {
  return { toldo: 'rayas', colorToldo: null, letrero: 'clasico', mostrador: 'tema', pared: 'tema', cielo: 'dia', temporada: 'ninguna' };
}

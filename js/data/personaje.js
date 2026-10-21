/* ============================================================
   data/personaje.js — opciones para crear el personaje.

   Cada opción: { id, nombre }
     soloHombre  solo se ofrece si el personaje es hombre (barba, bigote)
     especial    solo existe en la versión especial (con el código)
   Los colores son listas de #RRGGBB.
   Las ids de ropa, peinados y accesorios son las mismas que usan
   los clientes (clientes.js las sabe dibujar).
   ============================================================ */

export const SEXOS = [
  { id: 'mujer', nombre: '👩 Mujer' },
  { id: 'hombre', nombre: '👨 Hombre' },
];

export const PIELES = ['#FFE0C7', '#F6C9A4', '#E8B08A', '#C98E66', '#A26B48', '#7A4E33', '#5A3825'];

// esc = cuánto se estira el cuerpo a lo alto
export const ESTATURAS = [
  { id: 'baja', nombre: 'Baja', esc: 0.86 },
  { id: 'media', nombre: 'Media', esc: 1 },
  { id: 'alta', nombre: 'Alta', esc: 1.12 },
];

// esc = cuánto se ensancha el cuerpo; nombre: [femenino, masculino]
export const COMPLEXIONES = [
  { id: 'delgada', nombre: ['Delgada', 'Delgado'], esc: 0.86 },
  { id: 'media', nombre: ['Media', 'Medio'], esc: 1 },
  { id: 'robusta', nombre: ['Robusta', 'Robusto'], esc: 1.18 },
];

export const PEINADOS = [
  { id: 'corto', nombre: 'Corto' }, { id: 'largo', nombre: 'Largo' }, { id: 'bob', nombre: 'Bob' },
  { id: 'chongo', nombre: 'Chongo' }, { id: 'coleta', nombre: 'Coleta' }, { id: 'colitas', nombre: 'Colitas' },
  { id: 'trenzas', nombre: 'Trenzas' }, { id: 'rizado', nombre: 'Rizado' }, { id: 'afro', nombre: 'Afro' },
  { id: 'copete', nombre: 'Copete' }, { id: 'calvo', nombre: 'Rapado' },
];

export const COLORES_PELO = ['#1B1B2B', '#2B1B12', '#4A2E1C', '#7A4A26', '#C68B4B', '#E8C27A', '#B8462E', '#D9D9E0', '#FF7AC6', '#8B5CF6', '#3DA5FF', '#2BD0B0'];

export const VELLO = [
  { id: 'ninguno', nombre: 'Nada' },
  { id: 'bigote', nombre: 'Bigote', soloHombre: true },
  { id: 'barba', nombre: 'Barba', soloHombre: true },
  { id: 'barba_bigote', nombre: 'Barba y bigote', soloHombre: true },
];

export const ARRIBA = [
  { id: 'filipina', nombre: '👨‍🍳 Filipina de chef' }, { id: 'playera', nombre: 'Playera' }, { id: 'rayas', nombre: 'Rayas' },
  { id: 'sudadera', nombre: 'Sudadera' }, { id: 'camisa', nombre: 'Camisa' }, { id: 'sueter', nombre: 'Suéter' },
  { id: 'chamarra', nombre: 'Chamarra' }, { id: 'saco', nombre: 'Saco' }, { id: 'overol', nombre: 'Overol' },
  { id: 'vestido', nombre: 'Vestido' },
];

export const ESTAMPADOS = [
  { id: 'ninguno', nombre: 'Lisa' }, { id: 'corazon', nombre: '❤️ Corazón' }, { id: 'estrella', nombre: '⭐ Estrella' },
  { id: 'puntos', nombre: 'Puntos' }, { id: 'crepa', nombre: '🥞 Crepa' },
];

export const ABAJO = [
  { id: 'pantalon', nombre: 'Pantalón' }, { id: 'jeans', nombre: 'Jeans' },
  { id: 'falda', nombre: 'Falda' }, { id: 'short', nombre: 'Short' },
];

export const CALZADO = [
  { id: 'tenis', nombre: 'Tenis' }, { id: 'zapatos', nombre: 'Zapatos' },
  { id: 'botas', nombre: 'Botas' }, { id: 'sandalias', nombre: 'Sandalias' },
];

// Accesorios: se puede traer uno de cada categoría a la vez
export const ACCESORIOS = {
  cabeza: { nombre: '🎩 Cabeza', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'gorro_chef', nombre: 'Gorro de chef' }, { id: 'gorra', nombre: 'Gorra' },
    { id: 'gorro', nombre: 'Gorro' }, { id: 'boina', nombre: 'Boina' }, { id: 'sombrero', nombre: 'Sombrero' },
    { id: 'diadema', nombre: 'Diadema' }, { id: 'moño', nombre: 'Moño' }, { id: 'flor', nombre: 'Flor' },
    { id: 'audifonos', nombre: 'Audífonos' },
  ] },
  ojos: { nombre: '👓 Ojos', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'lentes', nombre: 'Lentes' }, { id: 'lentesSol', nombre: 'Lentes de sol' },
  ] },
  orejas: { nombre: '👂 Orejas', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'aretes', nombre: 'Aretes' }, { id: 'arracadas', nombre: 'Arracadas' },
    { id: 'perlas', nombre: 'Perlas' }, { id: 'aretes_corazon', nombre: '💕 Aretes de corazón', especial: true },
  ] },
  cuello: { nombre: '🧣 Cuello', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'collar', nombre: 'Collar' }, { id: 'bufanda', nombre: 'Bufanda' },
    { id: 'corbata', nombre: 'Corbata' }, { id: 'moñito', nombre: 'Moñito' },
  ] },
  muneca: { nombre: '⌚ Muñeca', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'reloj', nombre: 'Reloj' }, { id: 'pulsera', nombre: 'Pulsera' },
  ] },
};

// Colores para ropa y accesorios
export const COLORES = ['#FFFFFF', '#1B1B2B', '#8A8FA3', '#FF4FA3', '#E8414F', '#FF7A1A', '#FFD84D', '#22C55E', '#14B8A6', '#3DA5FF', '#1F5FFF', '#8B5CF6', '#6B3E2E'];
export const COLORES_MEZCLILLA = ['#3D6FD8', '#5A8BE0', '#2E4F9E', '#1B1B2B'];

/** Personaje con el que se empieza (se puede cambiar todo). */
export function personajeInicial(sexo = 'mujer') {
  const mujer = sexo === 'mujer';
  return {
    sexo,
    piel: '#E8B08A',
    estatura: 'media',
    complexion: 'media',
    peinado: mujer ? 'largo' : 'corto',
    pelo: '#2B1B12',
    vello: 'ninguno',
    arriba: 'filipina',
    colorArriba: '#FFFFFF',
    colorArriba2: '#1B1B2B',
    estampado: 'ninguno',
    abajo: 'pantalon',
    colorAbajo: '#1B1B2B',
    calzado: 'tenis',
    colorCalzado: '#FF4FA3',
    acc: { cabeza: 'gorro_chef', ojos: 'ninguno', orejas: 'ninguno', cuello: 'ninguno', muneca: 'ninguno' },
    colorAcc: { cabeza: '#FF4FA3', ojos: '#1B1B2B', orejas: '#FFD84D', cuello: '#FF4FA3', muneca: '#FF4FA3' },
  };
}

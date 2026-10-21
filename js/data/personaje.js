/* ============================================================
   data/personaje.js — opciones para crear el personaje.

   Cada opción: { id, nombre }
     soloHombre  solo se ofrece si el personaje es hombre (barba, bigote)
     especial    solo existe en la versión especial (con el código)
     precio      se compra en la boutique (pesos; en Chispitas: enChispitas)
     traje       viene incluida en ese disfraz (TRAJES)
   Lo que no tiene precio ni traje es gratis desde el inicio.
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
  // Trajes de los disfraces
  { id: 'arana', nombre: '🕷️ Traje arácnido', traje: 'arana' }, { id: 'mago', nombre: '🧙 Túnica de mago', traje: 'mago' },
  { id: 'murcielago', nombre: '🦇 Traje nocturno', traje: 'murcielago' }, { id: 'capitan', nombre: '🛡️ Traje de capitán', traje: 'capitan' },
  { id: 'heroe', nombre: '⭐ Traje de héroe', traje: 'heroe' }, { id: 'amazona', nombre: '⚔️ Armadura amazona', traje: 'amazona' },
  { id: 'astronauta', nombre: '🚀 Traje espacial', traje: 'astronauta' }, { id: 'pirata', nombre: '☠️ Ropa de pirata', traje: 'pirata' },
  { id: 'samurai', nombre: '🎌 Kimono samurái', traje: 'samurai' }, { id: 'dino', nombre: '🦖 Pijama de dino', traje: 'dino' },
  { id: 'karategi', nombre: '🥋 Karategui', traje: 'peleador' }, { id: 'gi_naranja', nombre: '🐉 Gi naranja', traje: 'guerrero' },
  { id: 'tunica_verde', nombre: '🗡️ Túnica verde', traje: 'bosque' },
];

export const ESTAMPADOS = [
  { id: 'ninguno', nombre: 'Lisa' }, { id: 'corazon', nombre: '❤️ Corazón' }, { id: 'estrella', nombre: '⭐ Estrella' },
  { id: 'puntos', nombre: 'Puntos' }, { id: 'crepa', nombre: '🥞 Crepa' },
];

export const ABAJO = [
  { id: 'pantalon', nombre: 'Pantalón' }, { id: 'jeans', nombre: 'Jeans' },
  { id: 'falda', nombre: 'Falda' }, { id: 'short', nombre: 'Short' },
  { id: 'mallas', nombre: 'Mallas', precio: 300 }, { id: 'tutu', nombre: 'Tutú', precio: 500 },
];

export const CALZADO = [
  { id: 'tenis', nombre: 'Tenis' }, { id: 'zapatos', nombre: 'Zapatos' },
  { id: 'botas', nombre: 'Botas' }, { id: 'sandalias', nombre: 'Sandalias' },
  { id: 'botas_heroe', nombre: 'Botas de héroe', precio: 600 },
  { id: 'descalzo', nombre: 'Descalzo', traje: 'peleador' },
];

// Accesorios: se puede traer uno de cada categoría a la vez
export const ACCESORIOS = {
  cabeza: { nombre: '🎩 Cabeza', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'gorro_chef', nombre: 'Gorro de chef' }, { id: 'gorra', nombre: 'Gorra' },
    { id: 'gorro', nombre: 'Gorro' }, { id: 'boina', nombre: 'Boina' }, { id: 'sombrero', nombre: 'Sombrero' },
    { id: 'diadema', nombre: 'Diadema' }, { id: 'moño', nombre: 'Moño' }, { id: 'flor', nombre: 'Flor' },
    { id: 'audifonos', nombre: 'Audífonos' },
    { id: 'corona', nombre: '👑 Corona', precio: 1200 }, { id: 'tiara', nombre: 'Tiara', precio: 900 },
    { id: 'orejas_gato', nombre: '🐱 Orejas de gato', precio: 500 }, { id: 'cuernitos', nombre: '😈 Cuernitos', precio: 500 },
    { id: 'aureola', nombre: '😇 Aureola', precio: 600 }, { id: 'sombrero_bruja', nombre: '🧹 Sombrero de bruja', precio: 700 },
    { id: 'banda_samurai', nombre: 'Banda samurái', precio: 300 }, { id: 'banda_roja', nombre: 'Banda roja', precio: 300 },
    { id: 'gorra_fontanero', nombre: '🍄 Gorra de fontanero', precio: 500 },
    { id: 'pelo_picos', nombre: 'Pelo de picos', traje: 'guerrero' }, { id: 'gorro_elfo', nombre: 'Gorro de elfo', traje: 'bosque' },
    { id: 'capucha_erizo', nombre: 'Capucha de erizo', traje: 'erizo' },
    { id: 'mascara_arana', nombre: 'Máscara arácnida', traje: 'arana' }, { id: 'capucha_murcielago', nombre: 'Capucha nocturna', traje: 'murcielago' },
    { id: 'casco_astronauta', nombre: 'Casco espacial', traje: 'astronauta' }, { id: 'sombrero_pirata', nombre: 'Sombrero pirata', traje: 'pirata' },
    { id: 'gorro_dino', nombre: 'Gorro de dino', traje: 'dino' },
  ] },
  ojos: { nombre: '👓 Ojos', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'lentes', nombre: 'Lentes' }, { id: 'lentesSol', nombre: 'Lentes de sol' },
    { id: 'lentes_redondos', nombre: 'Lentes redondos', precio: 400 }, { id: 'lentes_corazon', nombre: '💗 Lentes de corazón', precio: 500 },
    { id: 'lentes_estrella', nombre: '⭐ Lentes de estrella', precio: 500 }, { id: 'antifaz', nombre: 'Antifaz', precio: 500 },
    { id: 'parche', nombre: 'Parche', precio: 300 },
  ] },
  cara: { nombre: '😺 Cara', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'pecas', nombre: 'Pecas', precio: 150 },
    { id: 'corazon_mejilla', nombre: '💗 Corazoncito', precio: 250 }, { id: 'estrellitas', nombre: '✨ Estrellitas', precio: 250 },
    { id: 'bigotes_gato', nombre: '🐱 Bigotes de gato', precio: 300 }, { id: 'curita', nombre: 'Curita', precio: 150 },
    { id: 'bigotote', nombre: '🥸 Bigotote', precio: 300 },
    { id: 'cicatriz_rayo', nombre: '⚡ Cicatriz de rayo', traje: 'mago' },
  ] },
  orejas: { nombre: '👂 Orejas', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'aretes', nombre: 'Aretes' }, { id: 'arracadas', nombre: 'Arracadas' },
    { id: 'perlas', nombre: 'Perlas' }, { id: 'aretes_corazon', nombre: '💕 Aretes de corazón', especial: true },
    { id: 'aretes_estrella', nombre: '⭐ Aretes de estrella', precio: 400 }, { id: 'aretes_fresa', nombre: '🍓 Aretes de fresa', precio: 400 },
  ] },
  cuello: { nombre: '🧣 Cuello', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'collar', nombre: 'Collar' }, { id: 'bufanda', nombre: 'Bufanda' },
    { id: 'corbata', nombre: 'Corbata' }, { id: 'moñito', nombre: 'Moñito' },
    { id: 'bufanda_rayas', nombre: 'Bufanda de rayas', precio: 500 }, { id: 'paliacate', nombre: 'Paliacate', precio: 300 },
    { id: 'medalla', nombre: '🏅 Medalla', precio: 800 },
  ] },
  muneca: { nombre: '⌚ Muñeca', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'reloj', nombre: 'Reloj' }, { id: 'pulsera', nombre: 'Pulsera' },
    { id: 'reloj_inteligente', nombre: 'Reloj inteligente', precio: 600 }, { id: 'brazaletes', nombre: 'Brazaletes dorados', precio: 700 },
    { id: 'guantes_blancos', nombre: '🧤 Guantes blancos', precio: 300 }, { id: 'guantes_pelea', nombre: '🥊 Guantes de pelea', precio: 300 },
    { id: 'munequeras', nombre: 'Muñequeras', precio: 250 },
  ] },
  mano: { nombre: '✋ Mano', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'espatula', nombre: 'Espátula', precio: 300 }, { id: 'taza', nombre: '☕ Taza', precio: 200 },
    { id: 'globo', nombre: '🎈 Globo', precio: 250 }, { id: 'rosa', nombre: '🌹 Rosa', precio: 300 },
    { id: 'varita', nombre: '🪄 Varita', precio: 600 }, { id: 'espada', nombre: '🗡️ Espada', precio: 600 },
    { id: 'escudo', nombre: 'Escudo estrella', traje: 'capitan' },
  ] },
  espalda: { nombre: '🪽 Espalda', opciones: [
    { id: 'ninguno', nombre: 'Nada' }, { id: 'mochila', nombre: '🎒 Mochila', precio: 400 }, { id: 'capa', nombre: 'Capa', precio: 900 },
    { id: 'alas_hada', nombre: '🧚 Alas de hada', precio: 1000 }, { id: 'alas_angel', nombre: '😇 Alas de ángel', precio: 1000 },
  ] },
};

/* Disfraces: se compran completos. Al comprarlo se desbloquean todas
   sus piezas (las que dicen traje: ese id) y se pone de una vez.
   piezas = campos del personaje que cambia. */
export const TRAJES = [
  { id: 'arana', nombre: 'Héroe arácnido', emoji: '🕷️', precio: 1500,
    piezas: { arriba: 'arana', 'acc.cabeza': 'mascara_arana', abajo: 'mallas', colorAbajo: '#1F5FFF', calzado: 'botas_heroe', colorCalzado: '#D62839' } },
  { id: 'mago', nombre: 'Aprendiz de mago', emoji: '🧙', precio: 1500,
    piezas: { arriba: 'mago', 'acc.ojos': 'lentes_redondos', 'acc.cara': 'cicatriz_rayo', 'acc.cuello': 'bufanda_rayas', 'colorAcc.cuello': '#8E1B2B', 'acc.mano': 'varita', 'acc.cabeza': 'ninguno', abajo: 'pantalon', colorAbajo: '#1B1B2B', calzado: 'zapatos', colorCalzado: '#1B1B2B' } },
  { id: 'murcielago', nombre: 'Vigilante nocturno', emoji: '🦇', precio: 1500,
    piezas: { arriba: 'murcielago', 'acc.cabeza': 'capucha_murcielago', 'acc.espalda': 'capa', 'colorAcc.espalda': '#1B1B2B', abajo: 'mallas', colorAbajo: '#5A5F6E', calzado: 'botas_heroe', colorCalzado: '#1B1B2B' } },
  { id: 'capitan', nombre: 'Capitán estrella', emoji: '🛡️', precio: 1500,
    piezas: { arriba: 'capitan', 'acc.mano': 'escudo', 'acc.cabeza': 'ninguno', abajo: 'mallas', colorAbajo: '#1F5FFF', calzado: 'botas_heroe', colorCalzado: '#D62839' } },
  { id: 'heroe', nombre: 'Héroe volador', emoji: '⭐', precio: 1500,
    piezas: { arriba: 'heroe', 'acc.espalda': 'capa', 'colorAcc.espalda': '#E8414F', 'acc.cabeza': 'ninguno', abajo: 'mallas', colorAbajo: '#1F5FFF', calzado: 'botas_heroe', colorCalzado: '#E8414F' } },
  { id: 'amazona', nombre: 'Guerrera amazona', emoji: '⚔️', precio: 1500,
    piezas: { arriba: 'amazona', 'acc.cabeza': 'tiara', 'acc.muneca': 'brazaletes', abajo: 'falda', colorAbajo: '#1F5FFF', calzado: 'botas_heroe', colorCalzado: '#D62839' } },
  { id: 'astronauta', nombre: 'Astronauta', emoji: '🚀', precio: 1500,
    piezas: { arriba: 'astronauta', 'acc.cabeza': 'casco_astronauta', abajo: 'pantalon', colorAbajo: '#F2F4F8', calzado: 'botas', colorCalzado: '#8A8FA3' } },
  { id: 'pirata', nombre: 'Pirata', emoji: '☠️', precio: 1200,
    piezas: { arriba: 'pirata', 'acc.cabeza': 'sombrero_pirata', 'acc.ojos': 'parche', abajo: 'pantalon', colorAbajo: '#1B1B2B', calzado: 'botas', colorCalzado: '#3B2219' } },
  { id: 'samurai', nombre: 'Samurái', emoji: '🎌', precio: 1200,
    piezas: { arriba: 'samurai', colorArriba: '#1B2A55', colorArriba2: '#E8414F', 'acc.cabeza': 'banda_samurai', abajo: 'pantalon', colorAbajo: '#1B1B2B', calzado: 'sandalias', colorCalzado: '#6B3E2E' } },
  { id: 'dino', nombre: 'Dino', emoji: '🦖', precio: 1000,
    piezas: { arriba: 'dino', 'acc.cabeza': 'gorro_dino', abajo: 'pantalon', colorAbajo: '#4CAF50', calzado: 'tenis', colorCalzado: '#4CAF50' } },
  { id: 'hada', nombre: 'Hada', emoji: '🧚', precio: 1000,
    piezas: { arriba: 'vestido', colorArriba: '#C9A0FF', colorArriba2: '#FFFFFF', 'acc.espalda': 'alas_hada', 'acc.mano': 'varita', 'acc.cabeza': 'tiara', calzado: 'sandalias', colorCalzado: '#C9A0FF' } },
  { id: 'gatito', nombre: 'Gatito', emoji: '🐱', precio: 800,
    piezas: { arriba: 'sudadera', colorArriba: '#FFD6E8', colorArriba2: '#FFFFFF', 'acc.cabeza': 'orejas_gato', 'colorAcc.cabeza': '#FFFFFF', 'acc.cara': 'bigotes_gato', abajo: 'pantalon', colorAbajo: '#8A8FA3' } },

  // Parodias de videojuegos (sin nombres ni logotipos)
  { id: 'fontanero', nombre: 'Fontanero rojo', emoji: '🍄', precio: 1500,
    piezas: { arriba: 'overol', colorArriba: '#1F5FFF', colorArriba2: '#E8414F', 'acc.cabeza': 'gorra_fontanero', 'colorAcc.cabeza': '#E8414F', 'acc.cara': 'bigotote', 'acc.muneca': 'guantes_blancos', abajo: 'pantalon', colorAbajo: '#1F5FFF', calzado: 'zapatos', colorCalzado: '#6B3E2E' } },
  { id: 'fontanero_verde', nombre: 'Fontanero verde', emoji: '🍄', precio: 1500,
    piezas: { arriba: 'overol', colorArriba: '#1F5FFF', colorArriba2: '#22C55E', 'acc.cabeza': 'gorra_fontanero', 'colorAcc.cabeza': '#22C55E', 'acc.cara': 'bigotote', 'acc.muneca': 'guantes_blancos', abajo: 'pantalon', colorAbajo: '#1F5FFF', calzado: 'zapatos', colorCalzado: '#6B3E2E' } },
  { id: 'peleador', nombre: 'Peleador callejero', emoji: '🥋', precio: 1500,
    piezas: { arriba: 'karategi', 'acc.cabeza': 'banda_roja', 'acc.muneca': 'guantes_pelea', 'acc.cara': 'ninguno', abajo: 'pantalon', colorAbajo: '#F7F7F2', calzado: 'descalzo' } },
  { id: 'guerrero', nombre: 'Guerrero naranja', emoji: '🐉', precio: 1500,
    piezas: { arriba: 'gi_naranja', 'acc.cabeza': 'pelo_picos', 'acc.muneca': 'munequeras', 'colorAcc.muneca': '#1F5FFF', abajo: 'pantalon', colorAbajo: '#FF7A1A', calzado: 'botas', colorCalzado: '#1F5FFF' } },
  { id: 'bosque', nombre: 'Héroe del bosque', emoji: '🗡️', precio: 1500,
    piezas: { arriba: 'tunica_verde', 'acc.cabeza': 'gorro_elfo', 'acc.mano': 'espada', abajo: 'mallas', colorAbajo: '#F2F4F8', calzado: 'botas', colorCalzado: '#6B3E2E' } },
  { id: 'erizo', nombre: 'Erizo veloz', emoji: '💨', precio: 1500,
    piezas: { arriba: 'sudadera', colorArriba: '#1F5FFF', colorArriba2: '#FFFFFF', 'acc.cabeza': 'capucha_erizo', 'acc.muneca': 'guantes_blancos', abajo: 'pantalon', colorAbajo: '#1F5FFF', calzado: 'tenis', colorCalzado: '#E8414F' } },
];

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
    acc: { cabeza: 'gorro_chef', ojos: 'ninguno', cara: 'ninguno', orejas: 'ninguno', cuello: 'ninguno', muneca: 'ninguno', mano: 'ninguno', espalda: 'ninguno' },
    colorAcc: { cabeza: '#FF4FA3', ojos: '#1B1B2B', cara: '#FF4FA3', orejas: '#FFD84D', cuello: '#FF4FA3', muneca: '#FF4FA3', mano: '#FF4FA3', espalda: '#E8414F' },
  };
}

/** Clave de un artículo en el inventario: 'arriba:arana', 'acc.cabeza:corona', 'traje:mago'. */
export const claveArticulo = (campo, id) => `${campo}:${id}`;

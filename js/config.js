/* ============================================================
   config.js — PERSONALIZACIÓN.
   Este es el único archivo que necesitas editar para poner
   nombres, dedicatorias y mensajes especiales.
   ============================================================ */
export const CONFIG = {
  // Nombre que aparece en el letrero y en la pantalla de inicio
  nombreCreperia: 'Creepy Crepas',
  // El nombre en la versión especial (al poner el código)
  nombreCreperiaEspecial: 'Candy Crepas',

  // Nombre de ella (para dedicatorias y créditos)
  nombreElla: 'Devany',

  // Tu nombre (el cliente especial "el novio", que siempre deja una reseña cariñosa)
  nombreNovio: 'Derek',

  // Cómo te ves en el juego (colores en formato #RRGGBB).
  // peinado: 'corto' | 'largo' | 'chongo' | 'rizado' | 'coleta' | 'calvo'
  // accesorio: 'ninguno' | 'gorra' | 'lentes' | 'moño' | 'bufanda' | 'boina' | 'audifonos'
  aparienciaNovio: { piel: '#E8B08A', pelo: '#2B1B12', ropa: '#1F5FFF', peinado: 'corto', accesorio: 'ninguno', colorAcc: '#FF4FA3' },

  // Nombre de la perrita mascota (se compra en la tienda)
  nombreMascota: 'Candy',

  // Quién hizo el juego (créditos de la versión pública)
  creador: 'Derek',

  // Bienvenida de la versión pública: sale la primera vez que se abre el juego.
  // (Puedes usar varios párrafos separándolos con \n\n)
  mensajeBienvenidaPublico: '¡Abriste tu propia crepería! 🥞\n\nAtiende a los clientes, prepara crepas deliciosas y haz crecer tu negocio. ¡Mucha suerte!',

  // ----- Versión romántica (se desbloquea con el código especial) -----

  // Los mensajes de la versión especial (bienvenida y la cartita del día
  // `diaSorpresa`) van CIFRADOS con el código especial, para que no se
  // puedan leer en el código. Se editan en textos-especiales.json (no se
  // sube a GitHub) y se cifran con:
  //   node herramientas/cifrar-textos.mjs TU_CODIGO
  // El mismo código desbloquea la versión (botón 🔒 en la esquina del inicio).
  // null = sin versión especial.
  versionEspecial: {
    vueltas: 600000,
    sal: 'EwHdq13KP7+39n2A6fjRWw==',
    iv: 'QG1u8QXVtmAXuR6i',
    datos: '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',
  },

  // Día en que se abre la cartita sorpresa
  diaSorpresa: 7,

  // Firma de la cartita y de los créditos
  firma: 'Con cariño y amor, Derek',

  // ----- Ajustes del juego -----
  moneda: 'MXN',
  dineroInicial: 500,          // pesos con los que empieza
  reputacionInicial: 3,        // de 0 a 5 estrellas
  duracionTurnoSegundos: 180,  // duración real de un día de trabajo
  horaApertura: 9,             // 9:00 a.m. (hora "del juego")
  horaCierre: 21,              // 9:00 p.m.

  // Bebidas (café, chocolate caliente, limonada, frappé) como venta extra.
  // Solo aparecen en estas dificultades:
  bebidasEnDificultades: ['desafio'],

  // Tabla de puntuaciones en línea (Supabase). La clave "publishable" es
  // pública a propósito: la base solo deja leer y agregar puntuaciones.
  // null = sin tabla en línea.
  tablaEnLinea: {
    url: 'https://dcczvcaiwouprlfliucj.supabase.co',
    clave: 'sb_publishable_klsUMU0uZKXmVhfu9bXGvQ_vS0lCbQz',
  },

  // Herramientas de prueba en Ajustes. Apagadas al publicar.
  // Truco: abrir el juego con ?dev=1 al final del enlace las activa en ese
  // dispositivo (y ?dev=0 las vuelve a apagar).
  modoDesarrollo: false,
};

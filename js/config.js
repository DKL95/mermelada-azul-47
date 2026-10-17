/* ============================================================
   config.js — PERSONALIZACIÓN.
   Este es el único archivo que necesitas editar para poner
   nombres, dedicatorias y mensajes especiales.
   ============================================================ */
export const CONFIG = {
  // Nombre que aparece en el letrero y en la pantalla de inicio
  nombreCreperia: 'Candy Crepas',

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

  // Mensaje de bienvenida: sale la primera vez que abre el juego.
  // (Puedes usar varios párrafos separándolos con \n\n)
  mensajeBienvenida: '¡Bienvenida a tu crepería! La hice con mucho cariño, pensando en ti y en lo mucho que sabes de crepas. 💕',

  // Mensaje sorpresa: se abre como cartita al llegar al día `diaSorpresa`.
  mensajeSorpresa: 'Hoy, como todos los días, te ves hermosa',
  diaSorpresa: 7,

  // Firma de la cartita y de los créditos
  firma: 'Con amor, Derek',

  // PIN o palabra secreta de entrada. Se guarda el HASH, no el texto.
  // null = sin PIN. Para generarlo, en una terminal (cambia TU_PIN):
  //   node -e "console.log(require('crypto').createHash('sha256').update('candy-crepas:' + 'TU_PIN'.trim().toLowerCase()).digest('hex'))"
  // y pega aquí el resultado entre comillas. Es una barrera ligera, no seguridad real.
  hashPin: '5d18932c358ae05e4060c83d3d0b66bafaef949c9a634f1c8591f211f95465d6',

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

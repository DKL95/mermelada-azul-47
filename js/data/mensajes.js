/* ============================================================
   data/mensajes.js — frases de los clientes (español de México).
   Comodines:
     {pedido}   descripción de la crepa (al pedir)
     {combo}    nombre de la crepa de la casa
     {nombre}   nombre del cliente VIP
     {ing}      un ingrediente de su pedido o el que faltó/sobró
     {doblado}  el doblado que pidió ("en triángulo")
   ============================================================ */

// Cómo piden la crepa
export const FORMAS_DE_PEDIR = [
  '¡Hola! Me das una crepa {pedido}, porfa 🙏',
  'Quiero una crepa {pedido}.',
  '¿Me preparas una crepa {pedido}?',
  'Buenas, una crepa {pedido}, por favor.',
  'Se me antoja una crepa {pedido} 😋',
  '¡Holi! Una {pedido}, porfis.',
  '¿Me encargas una crepa {pedido}?',
  'Para mí una crepa {pedido}, gracias.',
];

// Cómo piden los niños (con mucha emoción)
export const FORMAS_NINO = [
  '¡Quiero una crepa {pedido}! ¡Con muuucho dulce! 🤩',
  '¡Holaaa! ¿Me das una crepa {pedido}? 🍭',
  'Mi mamá dijo que sí: ¡una crepa {pedido}! 🥳',
  '¡Una crepa {pedido}, porfaaa! 🙏',
  '¡Yo quiero la crepa {pedido}! ¡Bien bonita! ✨',
];

// Cada tipo de cliente tiene su manera de hablar
export const FORMAS_POR_TIPO = {
  tranquilo: [
    'Hola, buenas 😌 Cuando puedas, una crepa {pedido}. Sin prisa.',
    'Qué bonito lugar 🌸 Me das una crepa {pedido}, porfa.',
    'Tómate tu tiempo: una crepa {pedido}, por favor ☺️',
  ],
  apurado: [
    '¡Rápido, porfa! Una crepa {pedido}, que se me hace tarde ⏱️',
    'Una crepa {pedido}... ¡para ayer! 🏃',
    'Tengo junta en 5 minutos: ¡una crepa {pedido}! 📱',
    '¡Hola-hola! Una {pedido}, pero rapidito 😅',
  ],
  exigente: [
    'Una crepa {pedido}. Y fíjate bien, que la última vez me la dieron mal 😒',
    'Quiero una crepa {pedido}. Exactamente así, ¿eh?',
    'Buenas. Una crepa {pedido}. Ni más ni menos ☝️',
  ],
  gourmet: [
    'Mmm, veamos... una crepa {pedido}. Sorpréndame 🧐',
    'Bonjour. Una crepa {pedido}, s\'il vous plaît. Espero perfección.',
    'He probado crepas en París. A ver qué tal la suya: {pedido} 🎩',
  ],
};

// Clientes VIP: piden "lo de siempre"
export const SALUDOS_VIP = [
  '¡Hola de nuevo! Lo de siempre: una crepa {pedido} 😉',
  'Ya sabes cuál es la mía: la {pedido}, porfa 💕',
  '¡Aquí ando otra vez! Mi crepa {pedido} de siempre, ¿va?',
  'Vine nada más por mi crepa {pedido}, ¡como siempre!',
];

// La crítica famosa
export const SALUDOS_FAMOSA = [
  'Hola, vengo a reseñar su crepería 📸. Quiero una crepa {pedido}.',
  'Mis seguidores quieren saber qué tal están sus crepas. Una {pedido}, por favor ✨',
];

// El novio (cliente especial)
export const FORMAS_NOVIO = [
  'Hola, guapa 😍 ¿Me haces una crepa {pedido}? La quiero hecha por la mejor crepera del mundo.',
  'Vine nada más a verte... y por una crepa {pedido} 💕',
  '¿Me regalas una crepa {pedido}? Pago con abrazos (y también con dinero 😅).',
  'Hola, mi amor. Una crepa {pedido}, porfa. Sin prisa, yo te espero 🥰',
  'Me dijeron que aquí trabaja la crepera más bonita. Una {pedido}, por favor 😏',
];

// Mientras esperan y se les acaba la paciencia
export const IMPACIENCIA = ['¿Ya merito?', 'Mmm... 🕐', '¿Falta mucho?', 'Tengo hambre...', '¿Sigue mi crepa?'];

// Cuando se van porque se les acabó la paciencia (globo)
export const SE_VA = ['¡Ya me voy!', 'Ni modo, otro día...', '¡Qué tardado! 😤', 'Mejor me voy por unos tacos.'];

// Reseña que dejan cuando se van sin crepa
export const ABANDONO = [
  'Esperé y esperé... y nada. Ya no vuelvo.',
  'Ni me atendieron 😤',
  'Me fui con hambre, qué mal servicio.',
  'Tardaron una eternidad, mejor me fui.',
  'Nunca llegó mi crepa 😭',
  'Me dejaron esperando, ¡qué falta de respeto!',
];

// ---------- Reseñas según qué tan contentos quedaron ----------
export const RESENAS = {
  encantado: [
    '¡Está deliciosa! Ya tienes cliente fijo.',
    'La mejor crepa que he probado, ¡gracias!',
    'Vengo mañana otra vez 💕',
    'Perfecta, como de abuelita pero con {ing}.',
    '¡Con {ing} estaba buenísima! 😍',
    '¡Qué rico! Le voy a contar a todas mis amigas.',
    '10 de 10, no le cambio nada.',
    'Me hiciste el día con esta crepa ✨',
    '¡Uff, una delicia! La masa suavecita y doradita.',
    'Neta la mejor crepería de la ciudad.',
    'Me la comí en tres mordidas, ¡riquísima!',
    'Ya encontré mi lugar favorito 🥰',
    '¡Qué bonita y qué rica! Hasta le tomé foto.',
    'Perfecta la cantidad de {ing}, ni más ni menos.',
    '¡Wow! Así sí dan ganas de regresar.',
    'Se nota que la hacen con amor 💕',
    'La crepa de mis sueños, en serio.',
    '¡Crepa nivel {experta|experto}! Felicidades {a la chef|al chef}.',
  ],
  contento: [
    '¡Qué rica! Me gustó mucho.',
    'Muy buena, sí regreso.',
    'Bien servida, ¡harto relleno!',
    'Bastante bien, me gustó.',
    'Estuvo sabrosa, gracias 😊',
    'Buena crepa, buen precio.',
    'Me gustó, la recomiendo.',
    'Rica y calientita, como debe ser.',
    'Muy rica, nomás un detallito por ahí.',
    'Buen sabor, buena atención.',
    'Sí me la volvería a pedir.',
    '¡Qué rico sabía con {ing}!',
    'Bonita y sabrosa, ¡gracias!',
    'Cumplió, me gustó mucho.',
    'Rica, aunque la próxima la quiero perfecta 😉',
    'Muy bien, se nota que saben.',
  ],
  regular: [
    'Estuvo bien, nada más.',
    'Le faltó un poquito de algo...',
    'Está rica, pero la he probado mejor.',
    'Ni fu ni fa.',
    'Pues... se deja comer.',
    'Normalita, la verdad.',
    'Esperaba un poquito más.',
    'Ahí la llevas, pero le falta.',
    'No estuvo mal, pero tampoco wow.',
    'Mmm, más o menos.',
    'Comible, pero no regreso por ella.',
    'Le falta cariño a esta crepa.',
    'Estuvo okay, sin chiste.',
    'Me la comí, pero sin emoción.',
    'Regular, la neta.',
  ],
  molesto: [
    'Se me hizo muy tardado...',
    'Yo no pedí eso, qué decepción.',
    'Pues no me gustó mucho 😕',
    'Qué lástima, se veía mejor en el menú.',
    'Mmm no, así no era.',
    'Me quedé con las ganas.',
    'No regreso pronto, la verdad.',
    'Ay no, qué decepción.',
    'Esperaba algo mucho mejor.',
    'Le faltó muchísimo.',
    'Nada que ver con lo que pedí.',
    'Mi crepa estaba bien triste 😢',
    'Pagué y ni me gustó.',
    'No sé qué pasó, pero no.',
    'Le faltó atención a mi pedido.',
    'Uy, mejor ni comento...',
  ],
  furioso: [
    'Ya no vuelvo, ¡qué mal servicio!',
    'Odio este lugar.',
    '¡Qué horror de crepa! 😡',
    '¡Esto no es lo que pedí! Me voy.',
    'Peor crepa de mi vida 😭',
    '¡Quiero mi dinero de vuelta!',
    'Nunca más, nunca más.',
    '¡¿Qué es esto?! 😤',
    '¡Me arruinaron el día!',
    'Le voy a contar a todos... y no cosas bonitas.',
    'Ni mi perrito se la comería.',
    '¡Qué desastre!',
    '¡Qué coraje! Tanto esperar para esto.',
    'Cero estrellas si pudiera.',
    '¡Ash! Me voy a otra crepería.',
  ],
};

// Reseñas especiales de los niños cuando quedan contentos
export const RESENAS_NINO = [
  '¡Mamá, mira cuánta chispita! 🤩',
  '¡Es la crepa más bonita del mundo mundial!',
  '¡Sabe a cumpleaños! 🎂',
  '¡Quiero otra! ¡Quiero otra!',
  '¡Wiii! ¡Tiene muchos colores! 🌈',
  'Cuando sea grande quiero hacer crepas como tú.',
  '¡Me la comí toda y no me manché! (bueno, poquito)',
];

// Reseñas del novio: siempre cariñosas
export const RESENAS_NOVIO = {
  perfecta: [
    'La mejor crepa del mundo, hecha por la mejor persona del mundo 💕',
    'Perfecta, igualito que tú 😍',
    'Si pudiera dar 100 estrellas, te las daba todas ⭐',
    'Cada día cocinas más rico. Estoy muy orgulloso de ti.',
    'Ya sé por qué me enamoré: por estas crepas (y por ti, claro) 💘',
    'Me la comí despacito para que me durara más 🥰',
    'Esta crepa sabe a domingo contigo.',
    'Chef, ¿me firma la servilleta? Soy su fan número uno.',
  ],
  consuelo: [
    'Estaba un poquito rara, pero la hiciste tú, así que es mi favorita 💕',
    'No importa cómo quede, contigo todo sabe rico 🥰',
    'Le faltó tantito, pero te sobra cariño. ¡10 de 10!',
    'Hasta quemadita la quiero, porque es tuya 😅💕',
    'Un día sin tus crepas es un día triste. ¡Gracias, amor!',
    'Te salió... interesante 😂 Te quiero muchísimo.',
    'Tranquila, mañana te sale perfecta. Yo siempre vengo.',
  ],
};

// ---------- Quejas específicas (según lo que salió peor) ----------
export const RAZONES = {
  faltan: ['¿Y mi {ing}? No le pusiste...', 'Le faltó {ing}, yo sí lo pedí.', 'Pedí {ing} y no venía 😕', 'Le pusieron muy poquito de {ing}.'],
  sobran: ['Yo no pedí {ing}...', '¿Por qué trae {ing}? No me gusta.', 'Yo no pedí eso, qué decepción.', 'Le pusieron {ing} de más.'],
  cruda: ['Estaba cruda por dentro 😕', 'Le faltó cocción, sabía a masa.', 'La masa estaba aguadita.', 'Le faltó plancha a mi crepa.'],
  quemada: ['Estaba quemada, qué mal.', 'Sabía a carbón 😣', 'Se les pasó en la plancha.', 'Muy tostada para mi gusto.'],
  forma: ['Estaba bien deforme la crepa jaja', 'Parecía mapa en vez de crepa.', 'Muy chueca, pero bueno.', 'Le faltó redondez.'],
  doblado: ['La pedí {doblado} y me la dieron diferente.', 'Ese no es el doblado que pedí.', 'Yo la quería {doblado}...'],
  masa: ['La pedí {ing} y me tocó otra masa 😕', 'Esa no es la masa que pedí...', 'Yo la quería {ing}, ¿eh?'],
  pocaSalsa: ['Le faltó {ing}, casi ni se veía.', 'Muy poquito {ing}, ¿eh?', 'Pedí {ing} y apenas tenía un hilito.'],
  muchaSalsa: ['¡Traía demasiado {ing}! Empalagosa.', 'La ahogaron en {ing} 😵', 'Muy rica, pero con tanto {ing} ya no sabía a crepa.'],
  pocaDeco: ['¡Le faltaron colores y dulces! 😢', 'Está muy simple... ¡yo quería más decoración!', '¿Y las chispitas? ¡Quería más!'],
  espera: ['Se me hizo muy tardado...', '¡Esperé un siglo!', 'Rica pero tardadísima.', 'Tanto tiempo para una crepa...'],
};

// Al recibir su crepa, mientras la prueban (antes de la reseña)
export const GRACIAS = ['¡Gracias! 💕', '¡Qué rico se ve!', '¡Mmm, a ver...', '¡Justo lo que quería!'];

/** Elige un elemento al azar de una lista. */
export function alAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

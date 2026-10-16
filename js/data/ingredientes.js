/* ============================================================
   data/ingredientes.js — catálogo de ingredientes y combos.

   Cada ingrediente:
     id        identificador interno (sin espacios ni acentos)
     nombre    como se muestra en el juego
     categoria 'masa' | 'untable' | 'fruta' | 'crujiente' | 'frio' | 'salsa' | 'decoracion' | 'bebida'
     costo     costo del insumo en pesos por porción
     precio    lo que paga el cliente por porción (en la masa: precio base)
     color     color principal para dibujarlo
     dia       día en que se desbloquea (1 = desde el inicio)
     forma     cómo se dibuja sobre la crepa (frutas, toppings)
     colores   colores extra para el dibujo
     marca     true = nombre propio (se escribe con mayúscula en las frases)

   En qué estación se pone cada categoría:
     Relleno  → untable, fruta        (dentro de la crepa)
     Toppings → crujiente, frio       (encima, ya doblada)
     Decorar  → salsa (se dibuja con el dedo), decoracion
     Bebidas  → se preparan en la barra de la ventanilla (mejora "Barra de bebidas")
   ============================================================ */
import { CONFIG } from '../config.js';

export const INGREDIENTES = [
  // --- Masas ---
  { id: 'masa_clasica', nombre: 'Masa clásica', categoria: 'masa', costo: 6, precio: 40, color: '#F2C27E', dia: 1, frase: '',
    descripcion: 'Harina, huevo, leche, mantequilla derretida y un toque de vainilla.' },
  { id: 'masa_chocolate', nombre: 'Masa de chocolate', categoria: 'masa', costo: 8, precio: 46, color: '#7A4A35', dia: 2, frase: 'en masa de chocolate',
    descripcion: 'La masa clásica con cacao en polvo. Queda morenita y huele delicioso.' },
  { id: 'masa_integral', nombre: 'Masa integral', categoria: 'masa', costo: 7, precio: 46, color: '#C9965E', dia: 4, frase: 'en masa integral',
    descripcion: 'Con harina integral: más rústica, con sabor a nuez.' },

  // --- Untables (se embarran adentro) ---
  { id: 'nutella', nombre: 'Nutella', categoria: 'untable', costo: 8, precio: 20, color: '#6B3E2E', dia: 1, marca: true,
    descripcion: 'Crema de avellana con chocolate. La reina de las crepas.' },
  { id: 'cajeta', nombre: 'Cajeta', categoria: 'untable', costo: 6, precio: 15, color: '#C47A3A', dia: 1,
    descripcion: 'Dulce de leche de cabra, muy mexicano.' },
  { id: 'lechera', nombre: 'Lechera', categoria: 'untable', costo: 5, precio: 12, color: '#FFF1D2', dia: 1,
    descripcion: 'Leche condensada: dulcecita y cremosa.' },
  { id: 'mermelada_fresa', nombre: 'Mermelada de fresa', categoria: 'untable', costo: 5, precio: 12, color: '#D9304A', dia: 2,
    descripcion: 'Mermelada casera de fresa.' },
  { id: 'queso_crema', nombre: 'Queso crema', categoria: 'untable', costo: 7, precio: 15, color: '#FBF7EE', dia: 2,
    descripcion: 'Suavecito y un poco ácido; la base de las crepas tipo cheesecake.' },
  { id: 'choco_oscuro', nombre: 'Chocolate oscuro', categoria: 'untable', costo: 8, precio: 18, color: '#3B2219', dia: 2,
    descripcion: 'Chocolate amargo derretido.' },
  { id: 'dulce_leche', nombre: 'Dulce de leche', categoria: 'untable', costo: 6, precio: 15, color: '#D9A05B', dia: 3,
    descripcion: 'Como la cajeta pero de leche de vaca: más suave.' },
  { id: 'cacahuate', nombre: 'Crema de cacahuate', categoria: 'untable', costo: 6, precio: 14, color: '#C8894A', dia: 3,
    descripcion: 'Crema de cacahuate tostado.' },
  { id: 'choco_blanco', nombre: 'Chocolate blanco', categoria: 'untable', costo: 8, precio: 18, color: '#F6EBD9', dia: 3,
    descripcion: 'Chocolate blanco derretido.' },
  { id: 'lotus', nombre: 'Lotus', categoria: 'untable', costo: 10, precio: 22, color: '#C27C3E', dia: 4, marca: true,
    descripcion: 'Crema de galleta caramelizada con canela (tipo Biscoff).' },
  { id: 'pistache', nombre: 'Crema de pistache', categoria: 'untable', costo: 14, precio: 28, color: '#A8C46A', dia: 5,
    descripcion: 'Crema de pistache: la favorita de los gourmet.' },

  // --- Frutas ---
  { id: 'fresa', nombre: 'Fresa', categoria: 'fruta', costo: 5, precio: 12, color: '#E8556B', dia: 1, forma: 'fresa',
    descripcion: 'Rebanadas de fresa fresca.' },
  { id: 'platano', nombre: 'Plátano', categoria: 'fruta', costo: 3, precio: 8, color: '#F7E08A', dia: 1, forma: 'platano',
    descripcion: 'Rodajas de plátano.' },
  { id: 'limon', nombre: 'Limón', categoria: 'fruta', costo: 2, precio: 5, color: '#F4E04D', dia: 1, forma: 'gotas', colores: ['#F4E04D', '#FFF7B0'],
    descripcion: 'Unas gotitas de jugo de limón: el secreto de la crepa clásica francesa.' },
  { id: 'zarzamora', nombre: 'Zarzamora', categoria: 'fruta', costo: 7, precio: 14, color: '#3A1F3D', dia: 2, forma: 'baya', colores: ['#3A1F3D', '#6E3F70'],
    descripcion: 'Zarzamoras enteras, moradas casi negras.' },
  { id: 'frambuesa', nombre: 'Frambuesa', categoria: 'fruta', costo: 8, precio: 15, color: '#E0446A', dia: 2, forma: 'baya', colores: ['#D93A62', '#F57C9A'],
    descripcion: 'Frambuesas enteras.' },
  { id: 'durazno', nombre: 'Durazno', categoria: 'fruta', costo: 5, precio: 10, color: '#FFB067', dia: 3, forma: 'gajo', colores: ['#FFC47E', '#F2804A'],
    descripcion: 'Gajos de durazno en almíbar.' },
  { id: 'arandano', nombre: 'Arándano', categoria: 'fruta', costo: 8, precio: 15, color: '#4A5FB0', dia: 3, forma: 'baya', colores: ['#3E4F9C', '#7C8FD6'],
    descripcion: 'Moras azules.' },
  { id: 'mango', nombre: 'Mango', categoria: 'fruta', costo: 5, precio: 10, color: '#FFB627', dia: 3, forma: 'cubo', colores: ['#FFB627', '#FFD36E'],
    descripcion: 'Cubitos de mango.' },
  { id: 'manzana', nombre: 'Manzana caramelizada', categoria: 'fruta', costo: 6, precio: 12, color: '#D9893A', dia: 4, forma: 'cubo', colores: ['#E9B15A', '#B8662A'],
    descripcion: 'Manzana en cubitos cocinada con mantequilla y azúcar.' },
  { id: 'kiwi', nombre: 'Kiwi', categoria: 'fruta', costo: 6, precio: 12, color: '#7DBB3C', dia: 4, forma: 'rodaja', colores: ['#8CC63F', '#E6F2C2', '#2B2B2B'],
    descripcion: 'Rodajas de kiwi.' },
  { id: 'uva', nombre: 'Uva', categoria: 'fruta', costo: 4, precio: 9, color: '#8E5BA8', dia: 5, forma: 'baya', colores: ['#8E5BA8', '#BE96D6'],
    descripcion: 'Uvas partidas a la mitad.' },
  { id: 'pina', nombre: 'Piña', categoria: 'fruta', costo: 4, precio: 9, color: '#FFD84D', dia: 5, forma: 'cubo', colores: ['#FFD84D', '#FFF0A0'],
    descripcion: 'Trocitos de piña.' },

  // --- Crujientes (toppings) ---
  { id: 'nuez', nombre: 'Nuez picada', categoria: 'crujiente', costo: 5, precio: 10, color: '#A86B3C', dia: 1, forma: 'trozos',
    descripcion: 'Nuez en trocitos, combina perfecto con cajeta.' },
  { id: 'chispas', nombre: 'Chispas de chocolate', categoria: 'crujiente', costo: 4, precio: 8, color: '#4A2A1C', dia: 1, forma: 'chispas',
    descripcion: 'Chispitas de chocolate semiamargo.' },
  { id: 'grageas', nombre: 'Grageas', categoria: 'crujiente', costo: 3, precio: 6, color: '#FF4FA3', dia: 1, forma: 'grageas',
    descripcion: 'Chochitos de colores. A los niños les encantan.' },
  { id: 'oreo', nombre: 'Oreo triturada', categoria: 'crujiente', costo: 5, precio: 10, color: '#2B2B33', dia: 2, forma: 'oreo',
    descripcion: 'Galleta de chocolate con crema, en pedacitos.' },
  { id: 'malvaviscos', nombre: 'Malvaviscos', categoria: 'crujiente', costo: 4, precio: 8, color: '#FFE3EE', dia: 2, forma: 'malvavisco',
    descripcion: 'Bombones mini.' },
  { id: 'almendra', nombre: 'Almendra fileteada', categoria: 'crujiente', costo: 6, precio: 12, color: '#EBCB9B', dia: 3, forma: 'laminas',
    descripcion: 'Láminas finas de almendra tostada.' },
  { id: 'coco', nombre: 'Coco rallado', categoria: 'crujiente', costo: 3, precio: 7, color: '#FFFFFF', dia: 3, forma: 'tiras',
    descripcion: 'Coco rallado.' },
  { id: 'granola', nombre: 'Granola', categoria: 'crujiente', costo: 4, precio: 8, color: '#C0904F', dia: 4, forma: 'trozos',
    descripcion: 'Avena tostada con miel.' },
  { id: 'cereal', nombre: 'Cereal', categoria: 'crujiente', costo: 3, precio: 7, color: '#FF8A3D', dia: 4, forma: 'aros',
    descripcion: 'Aritos de cereal de colores.' },

  // --- Fríos y cremosos (toppings) ---
  { id: 'crema_batida', nombre: 'Crema batida', categoria: 'frio', costo: 4, precio: 10, color: '#FFFFFF', dia: 1, forma: 'crema',
    descripcion: 'Chantilly: crema batida con azúcar.' },
  { id: 'helado_vainilla', nombre: 'Helado de vainilla', categoria: 'frio', costo: 8, precio: 18, color: '#FFF4D6', dia: 2, forma: 'bola',
    descripcion: 'Una bola de helado de vainilla.' },
  { id: 'helado_chocolate', nombre: 'Helado de chocolate', categoria: 'frio', costo: 8, precio: 18, color: '#7B4A33', dia: 3, forma: 'bola',
    descripcion: 'Una bola de helado de chocolate.' },
  { id: 'helado_fresa', nombre: 'Helado de fresa', categoria: 'frio', costo: 8, precio: 18, color: '#FFB3C6', dia: 3, forma: 'bola',
    descripcion: 'Una bola de helado de fresa.' },

  // --- Salsas (se dibujan con el dedo) ---
  { id: 'jarabe_chocolate', nombre: 'Jarabe de chocolate', categoria: 'salsa', costo: 3, precio: 8, color: '#4A2618', dia: 1,
    descripcion: 'Jarabe de chocolate para decorar en zigzag.' },
  { id: 'salsa_lechera', nombre: 'Lechera líquida', categoria: 'salsa', costo: 3, precio: 7, color: '#FFF6DE', dia: 1,
    descripcion: 'Un chorrito de leche condensada.' },
  { id: 'caramelo', nombre: 'Caramelo', categoria: 'salsa', costo: 3, precio: 8, color: '#D98A2B', dia: 2,
    descripcion: 'Salsa de caramelo.' },
  { id: 'salsa_cajeta', nombre: 'Cajeta líquida', categoria: 'salsa', costo: 3, precio: 8, color: '#B5672C', dia: 2,
    descripcion: 'Cajeta calientita para bañar.' },
  { id: 'miel', nombre: 'Miel', categoria: 'salsa', costo: 4, precio: 8, color: '#F2B233', dia: 3,
    descripcion: 'Miel de abeja.' },
  { id: 'jarabe_fresa', nombre: 'Jarabe de fresa', categoria: 'salsa', costo: 3, precio: 7, color: '#E23B5A', dia: 3,
    descripcion: 'Jarabe rojo de fresa.' },

  // --- Decoración final (se espolvorea o se coloca) ---
  { id: 'azucar_glass', nombre: 'Azúcar glass', categoria: 'decoracion', costo: 1, precio: 4, color: '#FFFFFF', dia: 1, forma: 'polvo',
    descripcion: 'Azúcar finita, como nieve. Se espolvorea con un coladorcito.' },
  { id: 'canela', nombre: 'Canela molida', categoria: 'decoracion', costo: 1, precio: 4, color: '#9C5A2E', dia: 2, forma: 'polvo',
    descripcion: 'Canela en polvo, perfecta con manzana.' },
  { id: 'menta', nombre: 'Hojitas de menta', categoria: 'decoracion', costo: 2, precio: 5, color: '#3FB56B', dia: 3, forma: 'hoja',
    descripcion: 'Para que se vea de restaurante.' },

  // --- Bebidas (venta extra; necesitan la mejora "Barra de bebidas") ---
  { id: 'cafe', nombre: 'Café americano', categoria: 'bebida', costo: 5, precio: 25, color: '#5B3A29', dia: 1,
    descripcion: 'Café de olla calientito.' },
  { id: 'chocolate_caliente', nombre: 'Chocolate caliente', categoria: 'bebida', costo: 7, precio: 28, color: '#7B4A33', dia: 1,
    descripcion: 'Chocolate espumoso, perfecto para la lluvia.' },
  { id: 'limonada', nombre: 'Limonada', categoria: 'bebida', costo: 4, precio: 22, color: '#E9F27A', dia: 1,
    descripcion: 'Limonada natural con hielo.' },
  { id: 'frappe', nombre: 'Frappé', categoria: 'bebida', costo: 9, precio: 35, color: '#C9A27C', dia: 1,
    descripcion: 'Café frío licuado con hielo y crema batida.' },
];

/* Estilos de doblado. En una crepería real:
   - Triángulo: se dobla a la mitad y otra vez a la mitad (en cuartos). El más común.
   - Rollo: se enrolla como taco largo.
   - Cono: se enrolla en forma de cucurucho, para comer caminando.
   - Sobre: se doblan las 4 orillas hacia el centro, como un sobre de carta. */
export const DOBLADOS = [
  { id: 'triangulo', nombre: 'Triángulo', frase: 'en triángulo' },
  { id: 'rollo', nombre: 'Rollo', frase: 'enrollada' },
  { id: 'cono', nombre: 'Cono', frase: 'en cono', mejora: 'doblado_cono' },
  { id: 'sobre', nombre: 'Sobre', frase: 'en sobre', mejora: 'doblado_sobre' },
];

/** ¿Ya sabes hacer este doblado? (cono y sobre se compran en la tienda) */
export function dobladoDisponible(id, e) {
  const d = DOBLADOS.find((x) => x.id === id);
  return !!d && (!d.mejora || !!e.mejoras[d.mejora] || e.desbloqueados.includes('*'));
}

/* Crepas "de la casa": combos con nombre.
   masa (opcional, si no: clásica), rellenos y toppings {id: porciones},
   salsas [ids], doblado. */
export const COMBOS = [
  { id: 'clasica', nombre: 'Clásica', descripcion: 'La original de París: gotitas de limón y azúcar glass.',
    rellenos: { limon: 1 }, toppings: { azucar_glass: 1 }, salsas: [], doblado: 'triangulo' },
  { id: 'nutella_fresa', nombre: 'Nutella con fresa', descripcion: 'La más pedida de todas.',
    rellenos: { nutella: 1, fresa: 1 }, toppings: {}, salsas: [], doblado: 'triangulo' },
  { id: 'cajeta_nuez', nombre: 'Cajeta con nuez', descripcion: 'Bien mexicana.',
    rellenos: { cajeta: 1 }, toppings: { nuez: 1 }, salsas: [], doblado: 'rollo' },
  { id: 'fresas_crema', nombre: 'Fresas con crema', descripcion: 'Como el postre de feria, pero en crepa.',
    rellenos: { fresa: 1 }, toppings: { crema_batida: 1 }, salsas: ['salsa_lechera'], doblado: 'cono' },
  { id: 'banana_split', nombre: 'Banana Split', descripcion: 'Plátano, helado, crema batida y chocolate.',
    rellenos: { platano: 1 }, toppings: { helado_vainilla: 1, crema_batida: 1 }, salsas: ['jarabe_chocolate'], doblado: 'sobre' },
  { id: 'oreo_cheesecake', nombre: 'Oreo Cheesecake', descripcion: 'Queso crema con galleta Oreo.',
    rellenos: { queso_crema: 1 }, toppings: { oreo: 1, crema_batida: 1 }, salsas: [], doblado: 'triangulo' },
  { id: 'choco_banana', nombre: 'Choco Banana', descripcion: 'Doble chocolate: en la masa y adentro.',
    masa: 'masa_chocolate', rellenos: { choco_oscuro: 1, platano: 1 }, toppings: { chispas: 1 }, salsas: [], doblado: 'rollo' },
  { id: 'frutos_rojos', nombre: 'Frutos Rojos', descripcion: 'Fresa, frambuesa y zarzamora con jarabe.',
    rellenos: { fresa: 1, frambuesa: 1, zarzamora: 1 }, toppings: { azucar_glass: 1 }, salsas: ['jarabe_fresa'], doblado: 'sobre' },
  { id: 'lotus_dream', nombre: 'Lotus Dream', descripcion: 'Crema Lotus, plátano y caramelo.',
    rellenos: { lotus: 1, platano: 1 }, toppings: { crema_batida: 1 }, salsas: ['caramelo'], doblado: 'rollo' },
  { id: 'manzana_canela', nombre: 'Manzana Canela', descripcion: 'Como pay de manzana calientito.',
    rellenos: { manzana: 1 }, toppings: { helado_vainilla: 1, canela: 1 }, salsas: ['caramelo'], doblado: 'cono' },
  { id: 'tropical', nombre: 'Tropical', descripcion: 'Mango, kiwi y coco con miel.',
    rellenos: { mango: 1, kiwi: 1 }, toppings: { coco: 1 }, salsas: ['miel'], doblado: 'sobre' },
  { id: 'pistache_royale', nombre: 'Pistache Royale', descripcion: 'La elegante: pistache, frambuesa y menta.',
    masa: 'masa_integral', rellenos: { pistache: 1, frambuesa: 1 }, toppings: { menta: 1 }, salsas: [], doblado: 'triangulo' },
];

/** Busca un ingrediente por id. */
export function ingrediente(id) {
  return INGREDIENTES.find((i) => i.id === id);
}

/** ¿Ya se puede usar este ingrediente? (por día o desbloqueado a mano) */
export function estaDisponible(id, e) {
  const ing = ingrediente(id);
  if (!ing) return false;
  if (ing.categoria === 'bebida') return !!e.mejoras.bebidas && CONFIG.bebidasEnDificultades.includes(e.ajustes.dificultad);
  return (ing.dia || 1) <= e.dia || e.desbloqueados.includes(id) || e.desbloqueados.includes('*');
}

/** Ingredientes disponibles de ciertas categorías. */
export function disponibles(e, ...categorias) {
  return INGREDIENTES.filter((i) => categorias.includes(i.categoria) && estaDisponible(i.id, e));
}

/** ¿Se puede preparar este combo con lo que hay? */
export function comboDisponible(combo, e) {
  return dobladoDisponible(combo.doblado, e) && [combo.masa || 'masa_clasica', ...Object.keys(combo.rellenos), ...Object.keys(combo.toppings), ...combo.salsas]
    .every((id) => estaDisponible(id, e));
}

/** Todo lo que lleva un pedido (sin la masa) en un solo objeto {id: porciones}.
 *  Las salsas cuentan como 1. Sirve para comparar pedido contra crepa. */
export function todoDelPedido(p) {
  const r = { ...(p.rellenos || {}), ...(p.toppings || {}) };
  for (const s of p.salsas || []) r[s] = 1;
  if (p.bebida) r[p.bebida] = 1;
  return r;
}

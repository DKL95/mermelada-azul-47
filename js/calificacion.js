/* ============================================================
   calificacion.js — qué tanto le gustó la crepa al cliente.

   Se califican 6 cosas (cada una de 0 a 1) y se combinan con
   un peso. Luego la exigencia del cliente "endurece" el
   resultado: a un exigente cualquier detalle le baja mucho.
   ============================================================ */
import { DOBLADOS, ingrediente, todoDelPedido } from './data/ingredientes.js';
import { RESENAS, RESENAS_NINO, RAZONES, alAzar } from './data/mensajes.js';
import { tipoDe, nombreEnFrase } from './clientes.js';
import { conteoAdornos } from './dibujos.js';
import { estado } from './state.js';
import { multPropina } from './data/mejoras.js';
import { evento } from './data/eventos.js';

// Cuánto pesa cada parte en la calificación final (suman 1)
export const PESOS = {
  ingredientes: 0.3,
  coccion: 0.2,
  forma: 0.12,
  doblado: 0.12,
  decoracion: 0.1,
  espera: 0.16,
};

export const NOMBRES_PARTES = {
  ingredientes: '🍓 Ingredientes',
  coccion: '🔥 Cocción',
  forma: '🥞 Forma',
  doblado: '📐 Doblado',
  decoracion: '🎨 Decoración',
  espera: '⏱️ Espera',
};

// Largo de salsa (en unidades del dibujo de 200×200) que se ve "bien"
const SALSA_MIN = 90;
const SALSA_MAX = 480;
const SALSA_MINIMA = 25; // menos que esto ni se nota

/** Todo lo que lleva una crepa terminada en un solo objeto {id: porciones}. */
export function todoDeLaCrepa(crepa) {
  const { toppings, salsas } = conteoAdornos(crepa);
  const r = { ...(crepa.rellenos || {}), ...toppings };
  for (const [id, largo] of Object.entries(salsas)) if (largo >= SALSA_MINIMA) r[id] = 1;
  if (crepa.bebida) r[crepa.bebida] = 1;
  return r;
}

/**
 * ¿Pusiste lo que pidió? Cada ingrediente pedido vale lo mismo;
 * lo que no pidió (o porciones de más) resta. La masa equivocada también.
 * Devuelve también qué faltó y qué sobró, para los mensajes.
 */
function calificarIngredientes(pedido, crepa) {
  const pedidoTodo = todoDelPedido(pedido);
  const puesto = todoDeLaCrepa(crepa);
  const pedidos = Object.entries(pedidoTodo);
  let credito = 0;
  const faltan = [], sobran = [];
  for (const [id, n] of pedidos) {
    const g = puesto[id] || 0;
    credito += Math.min(g, n) / n;
    if (g < n) faltan.push(id);
    if (g > n) sobran.push(id);
  }
  let puntaje = pedidos.length ? credito / pedidos.length : 1;
  for (const [id, g] of Object.entries(puesto)) {
    if (!pedidoTodo[id]) { puntaje -= 0.25; sobran.push(id); }           // no lo pidió
    else if (g > pedidoTodo[id]) puntaje -= 0.1 * (g - pedidoTodo[id]); // porción de más
  }
  const masaMal = (crepa.masa || 'masa_clasica') !== (pedido.masa || 'masa_clasica');
  if (masaMal) puntaje -= 0.6;
  return { puntaje: Math.max(0, Math.min(1, puntaje)), faltan, sobran, masaMal };
}

/**
 * Decoración y cantidad: que la salsa no sea ni un hilito ni un
 * diluvio. A los niños les gusta exagerada (mientras más, mejor).
 */
function calificarDecoracion(pedido, crepa, tipo) {
  const { salsas, piezas } = conteoAdornos(crepa);
  const nino = tipo.id === 'nino';
  const [min, max] = nino ? [SALSA_MIN * 1.8, SALSA_MAX * 2.5] : [SALSA_MIN, SALSA_MAX];
  const puntos = [];
  let poca = null, mucha = null;
  for (const id of pedido.salsas || []) {
    const largo = salsas[id] || 0;
    if (largo < SALSA_MINIMA) continue; // si no la pusiste, ya cuenta como "faltó" en ingredientes
    if (largo < min) { puntos.push(0.4 + 0.6 * (largo / min)); poca = poca || id; }
    else if (largo <= max) puntos.push(1);
    else { puntos.push(Math.max(0.2, 1 - (largo - max) / (max * 1.2))); mucha = mucha || id; }
  }
  let puntaje = puntos.length ? puntos.reduce((s, v) => s + v, 0) / puntos.length : 1;
  // Los niños quieren MUCHA decoración
  let pocaDeco = false;
  if (nino && piezas + Object.keys(salsas).length < 5) { puntaje *= 0.6; pocaDeco = true; }
  return { puntaje, poca, mucha, pocaDeco };
}

/** Le da tiempo de sobra: hasta 60% de paciencia restante es calificación completa. */
function calificarEspera(c) {
  const p = Math.max(0, c.paciencia / c.pacienciaMax);
  return Math.min(1, 0.35 + p * 1.1);
}

/** Convierte un porcentaje a estrellas (1 a 5). */
export function estrellasDe(pct) {
  if (pct >= 90) return 5;
  if (pct >= 70) return 4;
  if (pct >= 50) return 3;
  if (pct >= 25) return 2;
  return 1;
}

/** Reacción según la tabla de satisfacción. */
export function reaccionDe(pct, partes) {
  if (pct >= 90) return { emocion: 'encantado', categoria: 'encantado' };
  if (pct >= 70) return { emocion: 'feliz', categoria: 'contento' };
  if (pct >= 50) return { emocion: 'neutral', categoria: 'regular' };
  if (pct >= 25) return { emocion: partes.espera < 0.5 ? 'triste' : 'molesto', categoria: 'molesto' };
  return { emocion: Math.random() < 0.6 ? 'furioso' : 'triste', categoria: 'furioso' };
}

/**
 * Califica una crepa entregada a un cliente.
 * @returns {{pct, estrellas, partes, faltan, sobran, peor, emocion, categoria, propina}}
 */
export function calificar(crepa, cliente) {
  const tipo = tipoDe(cliente);
  const ing = calificarIngredientes(cliente.pedido, crepa);
  const deco = calificarDecoracion(cliente.pedido, crepa, tipo);
  const partes = {
    ingredientes: ing.puntaje,
    coccion: crepa.coccion?.puntaje ?? 0,
    forma: crepa.forma ?? 0,
    doblado: crepa.doblado === cliente.pedido.doblado ? 1 : 0,
    decoracion: deco.puntaje,
    espera: calificarEspera(cliente),
  };
  let base = 0;
  for (const k of Object.keys(PESOS)) base += PESOS[k] * partes[k];

  // La exigencia endurece: 0.3 → casi igual; 0.95 → mucho más estricto
  let pct = Math.round(100 * Math.pow(base, 0.6 + tipo.exigencia));
  // Si la crepa no se parece nada a lo que pidió, no puede quedar contento
  if (partes.ingredientes < 0.35) pct = Math.min(pct, 45);

  // La parte que peor salió (para el mensaje del cliente)
  let peor = 'ingredientes';
  for (const k of Object.keys(partes)) if (partes[k] < partes[peor]) peor = k;

  const { emocion, categoria } = reaccionDe(pct, partes);

  // Propina: porcentaje del precio según qué tan contento quedó
  const tasa = pct >= 90 ? 0.25 + Math.random() * 0.1 : pct >= 70 ? 0.1 + Math.random() * 0.05 : pct >= 50 ? 0.04 : 0;
  const e = estado();
  let propina = cliente.precio * tasa * tipo.propina * multPropina(e) * (evento(e.evento)?.propina || 1);
  // El apurado premia la rapidez (y castiga la lentitud)
  if (tipo.id === 'apurado') propina *= cliente.paciencia / cliente.pacienciaMax > 0.5 ? 1.5 : 0.5;

  return {
    pct, estrellas: estrellasDe(pct), partes, peor, emocion, categoria,
    propina: Math.round(propina),
    faltan: ing.faltan, sobran: ing.sobran, masaMal: ing.masaMal,
    deco, etiquetaCoccion: crepa.coccion?.etiqueta,
  };
}

/**
 * Escribe la reseña del cliente. Si quedó contento, una frase
 * bonita (a veces mencionando un ingrediente); si no, casi siempre
 * se queja justo de lo que salió peor.
 */
export function textoResena(r, cliente) {
  const p = cliente.pedido;
  const pedidos = Object.keys(todoDelPedido(p));
  const ingPedido = pedidos.find((id) => ingrediente(id)?.categoria === 'untable') || pedidos[0];
  const doblado = DOBLADOS.find((d) => d.id === p.doblado)?.frase || '';
  let plantilla, ing = ingPedido;

  if (r.categoria === 'encantado' || r.categoria === 'contento' || Math.random() < 0.25) {
    const banco = cliente.tipo === 'nino' && r.pct >= 70 && Math.random() < 0.6 ? RESENAS_NINO : RESENAS[r.categoria];
    plantilla = alAzar(banco);
  } else {
    switch (r.peor) {
      case 'ingredientes': {
        const noPedido = r.sobran.find((id) => !todoDelPedido(p)[id]);
        if (r.masaMal && Math.random() < 0.5) { plantilla = alAzar(RAZONES.masa); ing = p.masa || 'masa_clasica'; }
        else if (noPedido) { plantilla = alAzar(RAZONES.sobran); ing = noPedido; }
        else if (r.faltan.length) { plantilla = alAzar(RAZONES.faltan); ing = r.faltan[0]; }
        else if (r.masaMal) { plantilla = alAzar(RAZONES.masa); ing = p.masa || 'masa_clasica'; }
        else { plantilla = alAzar(RAZONES.sobran); ing = r.sobran[0] || ingPedido; }
        break;
      }
      case 'decoracion':
        if (r.deco.pocaDeco) plantilla = alAzar(RAZONES.pocaDeco);
        else if (r.deco.mucha) { plantilla = alAzar(RAZONES.muchaSalsa); ing = r.deco.mucha; }
        else { plantilla = alAzar(RAZONES.pocaSalsa); ing = r.deco.poca || ingPedido; }
        break;
      case 'coccion': plantilla = alAzar(r.etiquetaCoccion === 'cruda' ? RAZONES.cruda : RAZONES.quemada); break;
      case 'forma': plantilla = alAzar(RAZONES.forma); break;
      case 'doblado': plantilla = alAzar(RAZONES.doblado); break;
      default: plantilla = alAzar(RAZONES.espera);
    }
  }
  return plantilla.replace('{ing}', nombreEnFrase(ing)).replace('{doblado}', doblado);
}

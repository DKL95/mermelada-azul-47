/* ============================================================
   clientes.js — generación y dibujo de clientes.

   El dibujo es un SVG armado con piezas:
     cuerpo (ropa) + cabeza (piel) + peinado + accesorio + CARA
   La cara también es por piezas (ojos, cejas, boca, mejillas)
   para que cada emoción sea solo una combinación distinta.
   ============================================================ */
import { estado } from './state.js';
import {
  TIPOS_CLIENTE, VIPS, FAMOSA, MULT_PACIENCIA, PIELES, PELOS, PELOS_FANTASIA, ROPAS, SACOS, MEZCLILLAS,
  PEINADOS, ACCESORIOS, VESTIMENTAS, ESTAMPADOS, EXTRAS, ESTILOS,
} from './data/clientes.js';
import { DOBLADOS, COMBOS, ingrediente, disponibles, disponiblesDe, comboDisponible, dobladoDisponible } from './data/ingredientes.js';
import { FORMAS_DE_PEDIR, FORMAS_POR_TIPO, FORMAS_NINO, SALUDOS_VIP, SALUDOS_FAMOSA, FORMAS_NOVIO, alAzar } from './data/mensajes.js';
import { CONFIG } from './config.js';
import { multPaciencia } from './data/mejoras.js';
import { evento } from './data/eventos.js';

let contador = 0;

// ============================================================
//  Generación
// ============================================================

/** Peso de cada tipo hoy: depende del día, la reputación y la dificultad. */
function pesoHoy(t, e) {
  if (e.dia < (t.desdeDia || 1) || e.reputacion < (t.repMin || 0)) return 0;
  let p = Math.max(0.3, Math.min(t.peso * 3, t.peso + t.porDia * (e.dia - (t.desdeDia || 1))));
  const dif = e.ajustes.dificultad;
  if (t.id === 'exigente' || t.id === 'gourmet') p *= dif === 'desafio' ? 1.5 : dif === 'relajado' ? 0.6 : 1;
  return p;
}

function elegirTipo(enFila) {
  const e = estado();
  // Un VIP solo si hay alguno libre (que no esté ya en la fila) y su combo se puede preparar
  const vipsLibres = VIPS.filter((v) => !enFila.some((c) => c.vip === v.id) && comboDisponible(combo(v.favorito), e));
  const opciones = TIPOS_CLIENTE.map((t) => [t, t.id === 'vip' && !vipsLibres.length ? 0 : pesoHoy(t, e)]);
  const total = opciones.reduce((s, [, p]) => s + p, 0);
  let r = Math.random() * total;
  for (const [t, p] of opciones) { r -= p; if (r <= 0) return { tipo: t, vipsLibres }; }
  return { tipo: TIPOS_CLIENTE[0], vipsLibres };
}

function entre(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
const combo = (id) => COMBOS.find((c) => c.id === id);

/** Nombre para meter en una frase ("Nutella", pero "fresa" en minúscula). */
export function nombreEnFrase(id) {
  const i = ingrediente(id);
  if (!i) return 'eso';
  if (i.categoria === 'masa') return i.frase ? i.frase.replace(/^en /, '') : 'clásica';
  return i.enFrase || (i.marca ? i.nombre : i.nombre.toLowerCase());
}

/** Copia un combo como pedido (sin tocar el original). */
function pedidoDeCombo(c) {
  return {
    combo: c.id,
    salado: !!c.salado,
    masa: c.masa || 'masa_clasica',
    rellenos: { ...c.rellenos },
    toppings: { ...c.toppings },
    salsas: [...c.salsas],
    doblado: c.doblado,
    cambios: [],
  };
}

/** ¿Se le puede pedir "doble" a este relleno? (untables y, en las saladas, sus rellenos) */
const doblable = (id) => ['untable', 'salado'].includes(ingrediente(id).categoria);

/** Cambios típicos a un combo: "sin plátano", "doble Nutella", "extra crema". */
function aplicarCambio(p, e) {
  const opciones = [];
  const quitables = [...Object.keys(p.rellenos), ...Object.keys(p.toppings), ...p.salsas];
  // La crema de cada sabor: batida en las dulces, ácida en las saladas
  const crema = p.salado ? 'crema_acida' : 'crema_batida';
  const otrasMasas = disponiblesDe(!!p.salado, e, 'masa').filter((i) => i.id !== 'masa_clasica');
  if (quitables.length >= 3) opciones.push('sin');
  if (Object.keys(p.rellenos).some(doblable)) opciones.push('doble');
  if (p.toppings[crema] || disponibles(e, 'frio').some((i) => i.id === crema)) opciones.push('crema');
  if (p.masa === 'masa_clasica' && otrasMasas.length) opciones.push('masa');
  if (!opciones.length) return;
  switch (alAzar(opciones)) {
    case 'sin': {
      const id = alAzar(quitables);
      delete p.rellenos[id];
      delete p.toppings[id];
      p.salsas = p.salsas.filter((s) => s !== id);
      p.cambios.push(`sin ${nombreEnFrase(id)}`);
      break;
    }
    case 'doble': {
      const id = Object.keys(p.rellenos).find(doblable);
      if (p.rellenos[id] > 1) return;
      p.rellenos[id] = 2;
      p.cambios.push(`con doble ${nombreEnFrase(id)}`);
      break;
    }
    case 'crema':
      if (p.toppings[crema] > 1) return;
      p.cambios.push(p.toppings[crema] ? 'con extra crema' : `con ${nombreEnFrase(crema)}`);
      p.toppings[crema] = (p.toppings[crema] || 0) + 1;
      break;
    case 'masa': {
      const m = alAzar(otrasMasas);
      p.masa = m.id;
      p.cambios.push(m.frase);
      break;
    }
  }
}

// Lo que más les gusta a los niños
const DULCES_NINO = ['nutella', 'lechera', 'choco_blanco', 'choco_oscuro', 'cajeta'];
const TOPPINGS_NINO = ['grageas', 'malvaviscos', 'chispas', 'oreo', 'cereal', 'crema_batida', 'helado_chocolate', 'helado_fresa', 'helado_vainilla'];

/** Pedido dulce armado al gusto (sin combo). */
function pedidoLibre(tipo, e) {
  const p = { combo: null, masa: 'masa_clasica', rellenos: {}, toppings: {}, salsas: [], doblado: 'triangulo', cambios: [] };
  const nino = tipo.id === 'nino';
  const [min, max] = tipo.complejidad;
  let n = entre(min, max);

  const masas = disponiblesDe(false, e, 'masa').filter((i) => i.id !== 'masa_clasica');
  if (masas.length && Math.random() < (nino ? 0.3 : 0.15)) p.masa = alAzar(masas).id;

  // Casi siempre llevan un untable de base (a veces "doble")
  let untables = disponiblesDe(false, e, 'untable');
  if (nino) untables = untables.filter((i) => DULCES_NINO.includes(i.id));
  if (untables.length && Math.random() < 0.85) {
    p.rellenos[elegirConAntojo(untables, e).id] = Math.random() < (nino ? 0.3 : 0.12) ? 2 : 1;
    n--;
  }

  // El resto se reparte entre categorías: [categoría, peso, máximo]
  const reparto = nino
    ? [['crujiente', 3, 3], ['frio', 2, 1], ['salsa', 3, 2], ['fruta', 1, 1]]
    : [['fruta', 3, 3], ['crujiente', 2, 2], ['frio', 1.5, 1], ['salsa', 1.5, 2], ['decoracion', 1, 1]];
  const usados = {};
  for (let intentos = 0; n > 0 && intentos < 30; intentos++) {
    const vivas = reparto.filter(([cat, , tope]) => (usados[cat] || 0) < tope);
    if (!vivas.length) break;
    const total = vivas.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, cat = vivas[0][0];
    for (const [c, w] of vivas) { r -= w; if (r <= 0) { cat = c; break; } }
    let lista = disponiblesDe(false, e, cat).filter((i) => !p.rellenos[i.id] && !p.toppings[i.id] && !p.salsas.includes(i.id));
    if (nino && (cat === 'crujiente' || cat === 'frio')) lista = lista.filter((i) => TOPPINGS_NINO.includes(i.id));
    if (!lista.length) { usados[cat] = 99; continue; }
    const ing = elegirConAntojo(lista, e);
    if (cat === 'fruta') p.rellenos[ing.id] = 1;
    else if (cat === 'salsa') p.salsas.push(ing.id);
    else p.toppings[ing.id] = 1;
    usados[cat] = (usados[cat] || 0) + 1;
    n--;
  }
  // Los niños siempre quieren al menos una salsa
  if (nino && !p.salsas.length) {
    const s = disponiblesDe(false, e, 'salsa');
    if (s.length) p.salsas.push(alAzar(s).id);
  }
  // Si quedó vacía, al menos una fruta
  if (!Object.keys(p.rellenos).length && !Object.keys(p.toppings).length && !p.salsas.length) {
    p.rellenos[alAzar(disponiblesDe(false, e, 'fruta')).id] = 1;
  }
  // El triángulo es el doblado más común en las creperías; los niños aman el cono
  const doblados = DOBLADOS.filter((d) => dobladoDisponible(d.id, e)).map((d) => d.id);
  const r = Math.random();
  if (nino && doblados.includes('cono') && r < 0.5) p.doblado = 'cono';
  else p.doblado = r < 0.45 ? 'triangulo' : alAzar(doblados);
  return p;
}

/** Pedido salado armado al gusto: uno o dos rellenos salados de base
 *  y lo demás repartido entre más relleno, toppings, salsas y espolvorear. */
function pedidoSalado(tipo, e) {
  const p = { combo: null, salado: true, masa: 'masa_clasica', rellenos: {}, toppings: {}, salsas: [], doblado: 'triangulo', cambios: [] };
  const [min, max] = tipo.complejidad;
  let n = entre(min, max);

  const masas = disponiblesDe(true, e, 'masa');
  if (masas.length && Math.random() < 0.3) p.masa = alAzar(masas).id;

  const rellenos = disponiblesDe(true, e, 'salado');
  p.rellenos[elegirConAntojo(rellenos, e).id] = 1;
  n--;

  // [de dónde sale, peso, máximo]
  const reparto = [['salado', 3, 2], ['crujiente', 1.5, 1], ['frio', 1, 1], ['salsa', 1.5, 1], ['decoracion', 1, 1]];
  const usados = {};
  for (let intentos = 0; n > 0 && intentos < 30; intentos++) {
    const vivas = reparto.filter(([cat, , tope]) => (usados[cat] || 0) < tope);
    if (!vivas.length) break;
    const total = vivas.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, cat = vivas[0][0];
    for (const [c, w] of vivas) { r -= w; if (r <= 0) { cat = c; break; } }
    const lista = disponiblesDe(true, e, cat).filter((i) => !p.rellenos[i.id] && !p.toppings[i.id] && !p.salsas.includes(i.id));
    if (!lista.length) { usados[cat] = 99; continue; }
    const ing = elegirConAntojo(lista, e);
    if (cat === 'salado') p.rellenos[ing.id] = 1;
    else if (cat === 'salsa') p.salsas.push(ing.id);
    else p.toppings[ing.id] = 1;
    usados[cat] = (usados[cat] || 0) + 1;
    n--;
  }
  // En las saladas se lleva más el sobre y el triángulo
  const doblados = DOBLADOS.filter((d) => dobladoDisponible(d.id, e)).map((d) => d.id);
  const r = Math.random();
  p.doblado = r < 0.4 ? 'triangulo' : r < 0.7 && doblados.includes('sobre') ? 'sobre' : alAzar(doblados);
  return p;
}

/** ¿Este cliente quiere algo salado? (los niños, siempre dulce) */
function quiereSalado(tipo, e) {
  if (tipo.id === 'nino' || disponiblesDe(true, e, 'salado').length < 2) return false;
  return Math.random() < (tipo.id === 'gourmet' ? 0.4 : 0.3);
}

/** Elige al azar, pero con antojo de los favoritos del evento del día. */
function elegirConAntojo(lista, e) {
  const fav = evento(e.evento)?.favoritos || [];
  const antojo = lista.filter((i) => fav.includes(i.id));
  return alAzar(antojo.length && Math.random() < 0.55 ? antojo : lista);
}

/** A veces piden una bebida (si hay barra de bebidas). */
function quizaBebida(p, tipo, e) {
  const bebidas = disponibles(e, 'bebida');
  if (!bebidas.length || tipo.id === 'nino' || Math.random() > 0.4) return p;
  const fav = evento(e.evento)?.bebidas || [];
  p.bebida = fav.length && Math.random() < 0.6 ? alAzar(fav) : alAzar(bebidas).id;
  return p;
}

/** Arma un pedido según el tipo de cliente (o el combo favorito de un VIP). */
export function crearPedido(tipo, comboFijo = null) {
  const e = estado();
  return quizaBebida(armarPedido(tipo, comboFijo, e), tipo, e);
}

function armarPedido(tipo, comboFijo, e) {
  if (comboFijo) return pedidoDeCombo(combo(comboFijo));
  const salado = quiereSalado(tipo, e);
  const combos = COMBOS.filter((c) => comboDisponible(c, e) && !!c.salado === salado);
  if (combos.length && Math.random() < tipo.combo) {
    // Los gourmet prefieren los combos más elaborados
    const elaborados = combos.filter((c) => Object.keys({ ...c.rellenos, ...c.toppings }).length + c.salsas.length >= 3);
    const lista = tipo.id === 'gourmet' && elaborados.length ? elaborados : combos;
    const p = pedidoDeCombo(alAzar(lista));
    if (Math.random() < tipo.cambios) {
      aplicarCambio(p, e);
      if (tipo.id === 'exigente' && Math.random() < 0.4) aplicarCambio(p, e);
    }
    return p;
  }
  return salado ? pedidoSalado(tipo, e) : pedidoLibre(tipo, e);
}

/** Texto natural del pedido:
 *  "de Nutella con fresa, y nuez encima, bañada de caramelo, en triángulo"
 *  o, si es combo: "Banana Split, sin plátano" */
export function describirPedido(pedido) {
  const bebida = pedido.bebida ? `, y un ${nombreEnFrase(pedido.bebida)} para tomar` : '';
  if (pedido.combo) {
    const c = combo(pedido.combo);
    return c.nombre + (pedido.cambios?.length ? `, ${unirY(pedido.cambios)}` : '') + bebida;
  }
  const conPorciones = ([id, n]) => (n > 1 ? `doble ${nombreEnFrase(id)}` : nombreEnFrase(id));
  const rellenos = Object.entries(pedido.rellenos).map(conPorciones);
  // "de Nutella con fresa" / "de jamón con queso"; si solo hay fruta: "con fresa"
  const hayBase = Object.keys(pedido.rellenos).some((id) => ['untable', 'salado'].includes(ingrediente(id).categoria));
  const partes = [];
  if (rellenos.length) {
    if (hayBase) {
      const [primero, ...resto] = rellenos;
      partes.push(`de ${primero}${resto.length ? ` con ${unirY(resto)}` : ''}`);
    } else {
      partes.push(`con ${unirY(rellenos)}`);
    }
  }
  const tops = Object.entries(pedido.toppings || {}).map(conPorciones);
  if (tops.length) partes.push(`con ${unirY(tops)} encima`);
  if (pedido.salsas?.length) partes.push(`bañada de ${unirY(pedido.salsas.map(nombreEnFrase))}`);
  const masa = ingrediente(pedido.masa || 'masa_clasica');
  if (masa.frase) partes.push(masa.frase);
  partes.push(DOBLADOS.find((x) => x.id === pedido.doblado).frase);
  return partes.join(', ') + bebida;
}

function unirY(lista) {
  if (lista.length <= 1) return lista.join('');
  return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
}

/** Precio de un pedido en pesos. */
export function precioPedido(pedido, tipo) {
  let total = ingrediente(pedido.masa || 'masa_clasica').precio;
  for (const [id, n] of Object.entries({ ...pedido.rellenos, ...pedido.toppings })) total += ingrediente(id).precio * n;
  for (const id of pedido.salsas || []) total += ingrediente(id).precio;
  if (pedido.bebida) total += ingrediente(pedido.bebida).precio;
  return Math.round(total * (tipo?.pago || 1));
}

/** Apariencia al azar, vestida según la personalidad de su tipo. */
function aparienciaPara(tipo) {
  const estilo = ESTILOS[tipo.id] || {};
  const nino = tipo.id === 'nino';
  const ropa = alAzar(ROPAS);
  const a = {
    piel: alAzar(PIELES),
    pelo: Math.random() < 0.08 && tipo.id !== 'gourmet' ? alAzar(PELOS_FANTASIA) : alAzar(PELOS),
    ropa,
    ropa2: alAzar(ROPAS.filter((c) => c !== ropa)),
    peinado: alAzar(estilo.peinados || PEINADOS),
    accesorio: alAzar(estilo.accesorios || ACCESORIOS),
    colorAcc: alAzar(ROPAS),
    vestimenta: alAzar(estilo.vestimentas || VESTIMENTAS),
    estampado: alAzar(ESTAMPADOS),
    extra: alAzar(estilo.extras || EXTRAS),
    pecas: Math.random() < (nino ? 0.4 : 0.15),
    lunar: Math.random() < 0.1,
    aretes: !nino && Math.random() < 0.25,
  };
  if (a.vestimenta === 'saco') a.ropa = alAzar(SACOS);
  if (a.vestimenta === 'overol') a.ropa = alAzar(MEZCLILLAS);
  // Corbata y moñito solo con camisa o saco
  if ((a.extra === 'corbata' || a.extra === 'moñito') && !['camisa', 'saco'].includes(a.vestimenta)) a.extra = 'ninguno';
  // Barba o bigote para algunos adultos
  if (!nino && !['colitas', 'trenzas'].includes(a.peinado)) {
    const r = Math.random();
    if (r < 0.1) a.barba = true; else if (r < 0.18) a.bigote = true;
  }
  if (tipo.id === 'gourmet') { a.colorAcc = '#1B2A55'; a.bigote = Math.random() < 0.5; a.barba = false; }
  if (tipo.id === 'apurado') a.colorAcc = alAzar(['#1B1B2B', '#FF4FA3', '#FFFFFF', '#1F5FFF']);
  if (nino && a.peinado === 'calvo') a.peinado = 'corto';
  return a;
}

/** Crea un cliente nuevo al azar. enFila = clientes que ya están. */
export function crearCliente(enFila = [], forzarTipo = null) {
  let { tipo, vipsLibres } = elegirTipo(enFila);
  // forzar un tipo (la crítica famosa, o pruebas en modo desarrollo)
  const famosa = forzarTipo === 'famosa';
  const novio = forzarTipo === 'novio';
  const forzado = TIPOS_CLIENTE.find((t) => t.id === (famosa ? 'gourmet' : novio ? 'tranquilo' : forzarTipo));
  if (forzado && (forzado.id !== 'vip' || vipsLibres.length)) tipo = forzado;
  const vip = tipo.id === 'vip' ? alAzar(vipsLibres) : null;
  const e = estado();
  // El novio siempre pide una crepa de la casa
  const combosHoy = COMBOS.filter((c) => comboDisponible(c, e));
  const pedido = crearPedido(tipo, novio && combosHoy.length ? alAzar(combosHoy).id : vip?.favorito);
  let mult = (MULT_PACIENCIA[e.ajustes.dificultad] || 1) * multPaciencia(e) * (evento(e.evento)?.paciencia || 1);
  if (novio) mult *= 2;                 // él siempre te espera 💕
  if (!e.tutorialVisto) mult *= 3;      // durante el tutorial nadie tiene prisa
  const paciencia = tipo.paciencia * mult;
  const propias = FORMAS_POR_TIPO[tipo.id] && Math.random() < 0.7 ? FORMAS_POR_TIPO[tipo.id] : FORMAS_DE_PEDIR;
  const formas = novio ? FORMAS_NOVIO : famosa ? SALUDOS_FAMOSA : vip ? SALUDOS_VIP : tipo.id === 'nino' ? FORMAS_NINO : propias;
  contador++;
  return {
    id: `c${Date.now().toString(36)}${contador}`,
    tipo: tipo.id,
    vip: vip?.id || null,
    famosa,
    novio,
    nombre: novio ? CONFIG.nombreNovio : famosa ? FAMOSA.nombre : vip?.nombre || null,
    numero: 0,                // número de comanda (se asigna al tomar el pedido)
    pedido,
    texto: alAzar(formas).replace('{pedido}', describirPedido(pedido)),
    precio: precioPedido(pedido, tipo),
    precioBebida: pedido.bebida ? Math.round(ingrediente(pedido.bebida).precio * tipo.pago) : 0,
    pacienciaMax: paciencia,
    paciencia,
    estado: 'llegando',       // llegando → pidiendo → esperando → atendido | enojado
    lugar: -1,
    apariencia: novio ? { ...CONFIG.aparienciaNovio, corazon: true } : famosa ? { ...FAMOSA.apariencia } : vip ? { ...vip.apariencia } : aparienciaPara(tipo),
  };
}

export function tipoDe(cliente) {
  return TIPOS_CLIENTE.find((t) => t.id === cliente.tipo) || TIPOS_CLIENTE[0];
}

// ============================================================
//  Cara por piezas (viewBox de la cabeza: centro 60,70)
// ============================================================

const OJOS = {
  normal: `<ellipse cx="46" cy="70" rx="4" ry="5" fill="#1B2A55"/><ellipse cx="74" cy="70" rx="4" ry="5" fill="#1B2A55"/>
           <circle cx="47.5" cy="68" r="1.4" fill="#fff"/><circle cx="75.5" cy="68" r="1.4" fill="#fff"/>`,
  feliz: `<path d="M41 71 q5 -7 10 0 M69 71 q5 -7 10 0" stroke="#1B2A55" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  corazon: `<path d="M46 75 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z M74 75 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4 z" fill="#FF4FA3"/>`,
  cerrados: `<path d="M41 70 h10 M69 70 h10" stroke="#1B2A55" stroke-width="3" stroke-linecap="round"/>`,
  enojados: `<ellipse cx="46" cy="71" rx="4" ry="4" fill="#1B2A55"/><ellipse cx="74" cy="71" rx="4" ry="4" fill="#1B2A55"/>`,
  llorando: `<path d="M41 70 q5 4 10 0 M69 70 q5 4 10 0" stroke="#1B2A55" stroke-width="3" fill="none" stroke-linecap="round"/>
             <path d="M44 74 q-3 8 0 12 q3 -4 0 -12 M76 74 q-3 8 0 12 q3 -4 0 -12" fill="#7FD3FF"/>`,
};
const CEJAS = {
  ninguna: '',
  relajadas: `<path d="M40 60 q6 -4 12 0 M68 60 q6 -4 12 0" stroke="#1B2A55" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>`,
  rectas: `<path d="M40 60 h12 M68 60 h12" stroke="#1B2A55" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`,
  preocupadas: `<path d="M40 61 l12 -4 M80 61 l-12 -4" stroke="#1B2A55" stroke-width="2.5" stroke-linecap="round"/>`,
  enojadas: `<path d="M40 57 l12 5 M80 57 l-12 5" stroke="#1B2A55" stroke-width="3" stroke-linecap="round"/>`,
};
const BOCAS = {
  sonrisa: `<path d="M50 84 q10 9 20 0" stroke="#1B2A55" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  abierta: `<path d="M48 82 q12 16 24 0 z" fill="#8A2335" stroke="#1B2A55" stroke-width="2" stroke-linejoin="round"/><path d="M53 88 q7 5 14 0" fill="#FF8FA8"/>`,
  recta: `<path d="M52 86 h16" stroke="#1B2A55" stroke-width="3" stroke-linecap="round"/>`,
  triste: `<path d="M50 89 q10 -8 20 0" stroke="#1B2A55" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ondulada: `<path d="M49 87 q3 -3 6 0 t6 0 t6 0 t4 0" stroke="#1B2A55" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  grito: `<ellipse cx="60" cy="88" rx="7" ry="8" fill="#8A2335" stroke="#1B2A55" stroke-width="2"/>`,
};
const MEJILLAS = {
  ninguna: '',
  rosa: `<ellipse cx="38" cy="80" rx="6" ry="3.5" fill="#FF8FB8" opacity="0.6"/><ellipse cx="82" cy="80" rx="6" ry="3.5" fill="#FF8FB8" opacity="0.6"/>`,
  rojas: `<ellipse cx="38" cy="79" rx="8" ry="5" fill="#FF3B3B" opacity="0.45"/><ellipse cx="82" cy="79" rx="8" ry="5" fill="#FF3B3B" opacity="0.45"/>`,
};

// Cada emoción = una combinación de piezas
export const EMOCIONES = {
  normal: { ojos: 'normal', cejas: 'relajadas', boca: 'sonrisa', mejillas: 'ninguna' },
  feliz: { ojos: 'feliz', cejas: 'relajadas', boca: 'abierta', mejillas: 'rosa' },
  encantado: { ojos: 'corazon', cejas: 'relajadas', boca: 'abierta', mejillas: 'rosa' },
  neutral: { ojos: 'normal', cejas: 'rectas', boca: 'recta', mejillas: 'ninguna' },
  impaciente: { ojos: 'normal', cejas: 'preocupadas', boca: 'ondulada', mejillas: 'ninguna' },
  molesto: { ojos: 'enojados', cejas: 'enojadas', boca: 'triste', mejillas: 'ninguna' },
  furioso: { ojos: 'enojados', cejas: 'enojadas', boca: 'grito', mejillas: 'rojas' },
  triste: { ojos: 'llorando', cejas: 'preocupadas', boca: 'triste', mejillas: 'ninguna' },
};

/** Cara por piezas. op.sinMejillas: sin chapitas (op.sinCejas: las cejas las pone quien llama). */
export function caraSVG(emocion = 'normal', op = {}) {
  const e = EMOCIONES[emocion] || EMOCIONES.normal;
  const mejillas = op.sinMejillas && e.mejillas === 'rosa' ? '' : MEJILLAS[e.mejillas];
  return `${mejillas}${op.sinCejas ? '' : CEJAS[e.cejas]}${OJOS[e.ojos]}${BOCAS[e.boca]}`;
}

// ============================================================
//  Cuerpo, ropa, peinado y accesorios
//  (se exportan para armar también el personaje: personaje.js)
// ============================================================

// Silueta del cuerpo (también sirve para recortar estampados)
export const CUERPO = 'M18 206 q0 -86 42 -86 q42 0 42 86 z';
const SOMBRA = 'rgba(27,42,85,0.18)';
const CUELLO = '<path d="M44 122 q16 14 32 0" stroke="rgba(255,255,255,0.5)" stroke-width="4" fill="none" stroke-linecap="round"/>';

/** Florecita de 5 pétalos. */
export function flor(x, y, color, r = 5) {
  const petalos = [0, 1, 2, 3, 4].map((i) => {
    const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return `<circle cx="${(x + Math.cos(ang) * r).toFixed(1)}" cy="${(y + Math.sin(ang) * r).toFixed(1)}" r="${r * 0.75}" fill="${color}"/>`;
  }).join('');
  return `${petalos}<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#FFD84D"/>`;
}

/** Estrella de 5 picos. */
function estrella(cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(ang) * rr).toFixed(1)},${(cy + Math.sin(ang) * rr).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
}

/** Dibujito al frente de la playera. */
function estampado(tipo, color, clip) {
  switch (tipo) {
    case 'corazon': return `<path d="M60 174 l-11 -11 a6.5 6.5 0 0 1 11 -8.5 a6.5 6.5 0 0 1 11 8.5 z" fill="${color}"/>`;
    case 'estrella': return estrella(60, 162, 13, color);
    case 'crepa': return `<path d="M47 150 L73 150 L60 176 z" fill="#F2C27E" stroke="#C98E4B" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M47 150 L73 150 L70 156 L50 156 z" fill="#6B3E2E"/><circle cx="55" cy="151" r="2" fill="#E8556B"/><circle cx="65" cy="151" r="2" fill="#E8556B"/>`;
    case 'puntos': {
      let d = '';
      for (let y = 134, f = 0; y < 206; y += 15, f++) {
        for (let x = 20 + (f % 2) * 8; x < 104; x += 16) d += `<circle cx="${x}" cy="${y}" r="3.5"/>`;
      }
      return `<g clip-path="url(#${clip})" fill="${color}">${d}</g>`;
    }
    default: return '';
  }
}

/** Ropa: lo que va debajo del cuello y lo que va encima. */
export function ropa(a, clip) {
  const c2 = a.ropa2 || a.colorAcc;
  const base = `<path d="${CUERPO}" fill="${a.ropa}"/>`;
  const resorte = `<rect x="0" y="198" width="120" height="8" fill="rgba(27,42,85,0.15)" clip-path="url(#${clip})"/>`;
  switch (a.vestimenta) {
    case 'rayas': {
      let r = '';
      for (let y = 130; y < 206; y += 14) r += `<rect x="0" y="${y}" width="120" height="6"/>`;
      return { abajo: `${base}<g clip-path="url(#${clip})" fill="${c2}">${r}</g>${CUELLO}`, encima: '' };
    }
    case 'sudadera':
      return {
        abajo: `${base}<path d="M30 132 q30 -28 60 0 q-30 12 -60 0 z" fill="rgba(27,42,85,0.2)"/>
          <path d="M36 180 q24 -8 48 0 v16 h-48 z" fill="rgba(27,42,85,0.15)"/>${resorte}`,
        encima: `<path d="M53 124 v22 M67 124 v22" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="53" cy="147" r="2.5" fill="${c2}"/><circle cx="67" cy="147" r="2.5" fill="${c2}"/>`,
      };
    case 'camisa':
      return {
        abajo: `${base}<path d="M60 128 v78" stroke="rgba(27,42,85,0.2)" stroke-width="2"/>
          ${[142, 160, 178, 196].map((y) => `<circle cx="60" cy="${y}" r="2.4" fill="#FFFFFF"/>`).join('')}
          <rect x="70" y="146" width="14" height="12" rx="2" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>`,
        encima: `<path d="M49 116 L60 130 L41 131 z M71 116 L60 130 L79 131 z" fill="#FFFFFF" stroke="rgba(27,42,85,0.2)" stroke-width="1.5" stroke-linejoin="round"/>`,
      };
    case 'saco':
      return {
        abajo: `${base}<path d="M44 121 L76 121 L60 170 z" fill="#FFFFFF"/>
          <path d="M44 121 L60 170 L38 140 z M76 121 L60 170 L82 140 z" fill="rgba(255,255,255,0.14)" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="60" cy="182" r="2.6" fill="rgba(0,0,0,0.35)"/><circle cx="60" cy="195" r="2.6" fill="rgba(0,0,0,0.35)"/>
          <path d="M76 148 h12 l-3 -7 l-3 4 l-3 -5 z" fill="${a.colorAcc}"/>`,
        encima: '',
      };
    case 'vestido':
      return {
        abajo: `${base}<path d="M28 160 L92 160 L114 206 L6 206 z" fill="${a.ropa}"/>
          ${[[30, 186], [52, 176], [74, 190], [94, 180], [44, 198], [64, 166]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${c2}" opacity="0.8"/>`).join('')}
          <rect x="26" y="155" width="68" height="8" rx="4" fill="${c2}"/>${flor(82, 159, '#FFFFFF', 3.5)}`,
        encima: `<path d="M46 121 q14 18 28 0 z" fill="${a.piel}"/>`,
      };
    case 'overol':
      return {
        abajo: `<path d="${CUERPO}" fill="${c2}"/>${CUELLO}
          <g clip-path="url(#${clip})" fill="${a.ropa}"><rect x="38" y="148" width="44" height="60" rx="6"/><rect x="0" y="182" width="120" height="30"/></g>
          <path d="M33 134 L44 152 M87 134 L76 152" stroke="${a.ropa}" stroke-width="7" stroke-linecap="round"/>
          <circle cx="44" cy="152" r="3.2" fill="#FFD84D"/><circle cx="76" cy="152" r="3.2" fill="#FFD84D"/>
          <rect x="50" y="160" width="20" height="12" rx="2" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="3 2"/>`,
        encima: '',
      };
    case 'chamarra':
      return {
        abajo: `${base}<path d="M60 124 V206" stroke="#D9D9E0" stroke-width="3"/><path d="M60 128 V204" stroke="#8A8A99" stroke-width="1.5" stroke-dasharray="1.5 2.5"/>
          <path d="M32 176 l10 -8 M88 176 l-10 -8" stroke="rgba(27,42,85,0.3)" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="0" y="197" width="120" height="9" fill="${c2}" clip-path="url(#${clip})"/>`,
        encima: `<path d="M41 124 q19 12 38 0 l-5 -8 q-14 9 -28 0 z" fill="${c2}"/>`,
      };
    case 'sueter': {
      let zig = 'M10 150';
      for (let x = 20; x <= 110; x += 10) zig += ` L${x} ${(x / 10) % 2 ? 160 : 150}`;
      const puntos = [30, 45, 60, 75, 90].map((x) => `<circle cx="${x}" cy="174" r="2.6"/>`).join('');
      return {
        abajo: `${base}<g clip-path="url(#${clip})"><path d="${zig}" stroke="${c2}" stroke-width="4" fill="none" stroke-linejoin="round"/>
          <g fill="${c2}">${puntos}</g></g>${resorte}
          <path d="M44 122 q16 14 32 0" stroke="${c2}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
        encima: '',
      };
    }
    case 'filipina': // chaqueta de chef, cruzada, con dos filas de botones
      return {
        abajo: `${base}<path d="M60 124 L84 140 V206" stroke="rgba(27,42,85,0.18)" stroke-width="2" fill="none"/>
          ${[146, 164, 182].map((y) => `<circle cx="50" cy="${y}" r="2.6" fill="${c2}"/><circle cx="72" cy="${y}" r="2.6" fill="${c2}"/>`).join('')}`,
        encima: `<path d="M44 118 h32 v8 q-16 6 -32 0 z" fill="${a.ropa}" stroke="rgba(27,42,85,0.18)" stroke-width="1.5"/>`,
      };
    default: // playera
      return { abajo: `${base}${CUELLO}${estampado(a.estampado, c2, clip)}`, encima: '' };
  }
}

/** Lo que traen colgado o en la mano. */
export function extra(a) {
  const c = a.colorAcc;
  switch (a.extra) {
    case 'corbata': return `<path d="M56 122 h8 l-1 6 h-6 z" fill="${c}"/><path d="M57 128 L63 128 L66 160 L60 168 L54 160 z" fill="${c}"/>
      <path d="M58 140 l5 -4 M57 152 l7 -5" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>`;
    case 'moñito': return `<path d="M60 126 l-11 -6 v12 z M60 126 l11 -6 v12 z" fill="${c}"/><circle cx="60" cy="126" r="3" fill="${c}" stroke="rgba(0,0,0,0.2)"/>`;
    case 'collar': {
      let d = '';
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const x = (1 - t) ** 2 * 44 + 2 * (1 - t) * t * 60 + t * t * 76;
        const y = (1 - t) ** 2 * 122 + 2 * (1 - t) * t * 146 + t * t * 122;
        d += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`;
      }
      return `<g fill="#FFFFFF" stroke="#D9D9E0" stroke-width="0.8">${d}</g>`;
    }
    case 'bolso': return `<path d="M36 130 L88 178" stroke="${c}" stroke-width="3"/><rect x="80" y="172" width="24" height="20" rx="5" fill="${c}"/>
      <path d="M80 179 h24" stroke="rgba(0,0,0,0.2)" stroke-width="2"/><circle cx="92" cy="181" r="2" fill="#FFD84D"/>`;
    case 'camara': return `<path d="M38 128 Q60 162 82 128" stroke="#1B1B2B" stroke-width="2.5" fill="none"/>
      <rect x="47" y="148" width="26" height="17" rx="3" fill="#2B2B35"/><rect x="51" y="145" width="8" height="4" rx="1" fill="#2B2B35"/>
      <circle cx="60" cy="156.5" r="5.5" fill="#5B6B8C" stroke="#FFFFFF" stroke-width="1.5"/><circle cx="68" cy="151" r="1.4" fill="#FFD84D"/>`;
    case 'mochila': return `<path d="M36 134 Q43 162 37 194 M84 134 Q77 162 83 194" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <rect x="35" y="160" width="7" height="5" rx="1" fill="rgba(0,0,0,0.25)"/><rect x="78" y="160" width="7" height="5" rx="1" fill="rgba(0,0,0,0.25)"/>`;
    case 'cafe': return `<path d="M93 150 q-3 -6 0 -10 M99 150 q-3 -6 0 -10" stroke="rgba(27,42,85,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M86 158 h20 l-2.5 28 h-15 z" fill="#FFFFFF" stroke="#C9B8A6" stroke-width="1.5" stroke-linejoin="round"/>
      <rect x="84" y="153" width="24" height="6" rx="2.5" fill="#6B3E2E"/><rect x="87.5" y="166" width="17" height="9" fill="#C47A3A"/>`;
    case 'paleta': return `<path d="M100 198 V146" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="100" cy="136" r="12" fill="${c}"/><path d="M100 136 m-7 0 a7 7 0 1 1 7 7 a4 4 0 1 1 -4 -4" stroke="#FFFFFF" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case 'globo': return `<path d="M108 52 q-12 40 -4 80 q6 30 -8 58" stroke="rgba(27,42,85,0.45)" stroke-width="1.2" fill="none"/>
      <ellipse cx="108" cy="36" rx="11" ry="14" fill="${c}"/><path d="M105 50 h6 l-3 -3 z" fill="${c}"/>
      <ellipse cx="104" cy="31" rx="3" ry="5" fill="rgba(255,255,255,0.5)" transform="rotate(20 104 31)"/>`;
    default: return '';
  }
}

/** Pecas, lunar y barba (van debajo de los ojos y la boca). */
export function detallesCara(a) {
  let d = '';
  if (a.barba) d += `<path d="M22 72 Q24 110 60 112 Q96 110 98 72 Q94 96 80 98 Q70 93 60 94 Q50 93 40 98 Q26 96 22 72 Z" fill="${a.pelo}"/>`;
  if (a.pecas) d += `<g fill="#B5653A" opacity="0.5">${[[34, 78], [39, 82], [31, 83], [86, 78], [81, 82], [89, 83]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`;
  if (a.lunar) d += '<circle cx="75" cy="88" r="1.7" fill="#4A2E1C"/>';
  return d;
}

export function peinadoAtras(a) {
  const { peinado: p, pelo: color } = a;
  switch (p) {
    case 'largo': return `<path d="M20 70 q0 -48 40 -48 q40 0 40 48 v52 q-12 6 -20 0 v-40 h-40 v40 q-8 6 -20 0 z" fill="${color}"/>`;
    case 'coleta': return `<ellipse cx="100" cy="66" rx="12" ry="20" fill="${color}" transform="rotate(20 100 66)"/>`;
    case 'afro': return `<circle cx="60" cy="58" r="50" fill="${color}"/>`;
    case 'bob': return `<path d="M18 70 q0 -50 42 -50 q42 0 42 50 v26 q-6 6 -14 4 v-30 h-56 v30 q-8 2 -14 -4 z" fill="${color}"/>`;
    case 'colitas': return `<ellipse cx="14" cy="54" rx="11" ry="17" fill="${color}" transform="rotate(-25 14 54)"/>
      <ellipse cx="106" cy="54" rx="11" ry="17" fill="${color}" transform="rotate(25 106 54)"/>`;
    case 'trenzas': return [22, 98].map((x) => [88, 101, 114, 127].map((y) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="8" fill="${color}"/>`).join('')
      + `<circle cx="${x}" cy="137" r="4" fill="${a.colorAcc}"/>`).join('');
    default: return '';
  }
}
export function peinadoFrente(a) {
  const { peinado: p, pelo: color } = a;
  const raya = `<path d="M22 66 q0 -44 38 -44 q38 0 38 44 q-14 -22 -38 -22 q-24 0 -38 22 z" fill="${color}"/>`;
  switch (p) {
    case 'corto': return `<path d="M22 66 q0 -44 38 -44 q38 0 38 44 q-10 -16 -24 -18 q-8 8 -30 6 q-14 2 -22 12 z" fill="${color}"/>`;
    case 'largo': return `<path d="M22 70 q0 -46 38 -46 q38 0 38 46 q-6 -18 -18 -24 q-14 10 -40 8 q-12 4 -18 16 z" fill="${color}"/>`;
    case 'chongo': return `<circle cx="60" cy="24" r="14" fill="${color}"/><path d="M22 64 q2 -40 38 -40 q36 0 38 40 q-12 -20 -38 -20 q-26 0 -38 20 z" fill="${color}"/>`;
    case 'rizado': return [[30, 46], [44, 34], [60, 30], [76, 34], [90, 46], [24, 60], [96, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${color}"/>`).join('');
    case 'coleta': return raya;
    case 'afro': return `<path d="M22 64 q0 -42 38 -42 q38 0 38 42 q-8 -14 -18 -16 q-10 6 -20 2 q-10 4 -20 -2 q-10 2 -18 16 z" fill="${color}"/>`;
    case 'bob': return `<path d="M22 64 q0 -42 38 -42 q38 0 38 42 v-6 q-2 -2 -6 -2 h-64 q-4 0 -6 2 z" fill="${color}"/>`;
    case 'copete': return `<path d="M22 62 q0 -40 38 -40 q38 0 38 40 q-6 -14 -16 -18 q-20 -2 -40 0 q-14 4 -20 18 z" fill="${color}"/>
      <path d="M30 40 q16 -32 56 -14 q-6 8 -20 8 q-20 -4 -36 6 z" fill="${color}"/>`;
    case 'colitas': return `${raya}<circle cx="24" cy="50" r="4.5" fill="${a.colorAcc}"/><circle cx="96" cy="50" r="4.5" fill="${a.colorAcc}"/>`;
    case 'trenzas': return raya;
    default: return ''; // calvo
  }
}
export function accesorio(a, color) {
  switch (a) {
    case 'gorra': return `<path d="M22 54 q4 -34 38 -34 q34 0 38 34 z" fill="${color}"/><path d="M60 52 h48 q4 0 2 5 h-50 z" fill="${color}"/><circle cx="60" cy="20" r="4" fill="${color}"/>`;
    case 'lentes': return `<g fill="rgba(255,255,255,0.25)" stroke="#1B2A55" stroke-width="3"><circle cx="46" cy="70" r="10"/><circle cx="74" cy="70" r="10"/></g><path d="M56 69 h8" stroke="#1B2A55" stroke-width="3"/>`;
    case 'lentesSol': return `<g fill="${color}" stroke="${color}" stroke-width="2"><rect x="35" y="63" width="22" height="14" rx="6"/><rect x="63" y="63" width="22" height="14" rx="6"/></g><path d="M57 68 h6" stroke="${color}" stroke-width="3"/><path d="M39 66 l6 0" stroke="#fff" stroke-width="2" opacity="0.6"/>`;
    case 'boina': return `<path d="M24 46 q4 -26 40 -26 q34 0 34 22 q-30 -8 -74 4 z" fill="${color}"/><circle cx="62" cy="19" r="4" fill="${color}"/>`;
    case 'audifonos': return `<path d="M20 70 q0 -52 40 -52 q40 0 40 52" fill="none" stroke="${color}" stroke-width="6"/><rect x="12" y="62" width="14" height="22" rx="6" fill="${color}"/><rect x="94" y="62" width="14" height="22" rx="6" fill="${color}"/>`;
    case 'moño': return `<g transform="translate(86 34) rotate(20)"><path d="M0 0 l-12 -8 v16 z M0 0 l12 -8 v16 z" fill="${color}"/><circle r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/></g>`;
    case 'gorro': return `<path d="M20 58 q0 -44 40 -44 q40 0 40 44 z" fill="${color}"/><rect x="18" y="50" width="84" height="13" rx="6.5" fill="${color}"/>
      <path d="M28 52 v9 M38 52 v9 M48 52 v9 M58 52 v9 M68 52 v9 M78 52 v9 M88 52 v9" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
      <circle cx="60" cy="14" r="9" fill="#FFFFFF"/>`;
    case 'sombrero': return `<path d="M34 44 q0 -28 26 -28 q26 0 26 28 z" fill="#E9C77B"/><rect x="34" y="35" width="52" height="8" fill="${color}"/>
      <ellipse cx="60" cy="45" rx="54" ry="9" fill="#E9C77B" stroke="#C9A55B" stroke-width="1.5"/>`;
    case 'diadema': return `<path d="M22 62 q2 -40 38 -40 q36 0 38 40" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>${flor(82, 30, color, 5)}`;
    case 'flor': return flor(86, 38, color, 6);
    case 'gorro_chef': return `<rect x="30" y="34" width="60" height="16" rx="4" fill="#FFFFFF" stroke="#D9DEE8" stroke-width="1.5"/>
      ${[[38, 22, 13], [60, 14, 16], [82, 22, 13]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="#D9DEE8" stroke-width="1.5"/>`).join('')}
      <rect x="31" y="27" width="58" height="12" fill="#FFFFFF"/>`;
    default: return '';
  }
}

let svgN = 0; // para que cada dibujo tenga su propio recorte

/**
 * SVG completo de un cliente.
 * @param {object} cliente
 * @param {string} emocion  una de EMOCIONES
 */
export function dibujarCliente(cliente, emocion = 'normal') {
  const a = cliente.apariencia;
  const clip = 'cuerpo' + (++svgN);
  const r = ropa(a, clip);
  const bufanda = a.accesorio === 'bufanda'
    ? `<path d="M30 112 q30 14 60 0 v12 q-30 14 -60 0 z" fill="${a.colorAcc}"/><rect x="66" y="118" width="12" height="28" rx="4" fill="${a.colorAcc}"/>`
    : '';
  return `
  <svg viewBox="0 0 120 210" class="cliente-svg" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${CUERPO}"/></clipPath></defs>
    <ellipse cx="60" cy="204" rx="38" ry="6" fill="${SOMBRA}"/>
    ${peinadoAtras(a)}
    <!-- cuerpo y ropa -->
    ${r.abajo}
    <!-- cuello y cabeza -->
    <rect x="50" y="100" width="20" height="22" rx="8" fill="${a.piel}"/>
    ${r.encima}
    ${extra(a)}
    <circle cx="60" cy="68" r="40" fill="${a.piel}"/>
    <ellipse cx="20" cy="72" rx="6" ry="9" fill="${a.piel}"/><ellipse cx="100" cy="72" rx="6" ry="9" fill="${a.piel}"/>
    ${a.aretes ? '<circle cx="20" cy="84" r="3" fill="#FFD84D"/><circle cx="100" cy="84" r="3" fill="#FFD84D"/>' : ''}
    ${detallesCara(a)}
    ${peinadoFrente(a)}
    <g class="cara">${caraSVG(emocion)}</g>
    ${a.corazon ? '<path d="M60 152 l-9 -9 a5.5 5.5 0 0 1 9 -7 a5.5 5.5 0 0 1 9 7 z" fill="#FF4FA3" stroke="#fff" stroke-width="1.5"/>' : ''}
    ${a.bigote ? `<path d="M46 80 q7 -6 14 0 q7 -6 14 0 q-7 6 -14 2 q-7 4 -14 -2 z" fill="${a.pelo}"/>` : ''}
    ${accesorio(a.accesorio, a.colorAcc)}
    ${bufanda}
  </svg>`;
}

/** Solo la cabeza de un cliente (para el buzón de reseñas). */
export function caraCliente(apariencia, emocion) {
  return dibujarCliente({ apariencia }, emocion)
    .replace('viewBox="0 0 120 210"', 'viewBox="8 8 104 104"');
}

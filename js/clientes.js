/* ============================================================
   clientes.js — generación y dibujo de clientes.

   El dibujo es un SVG armado con piezas:
     cuerpo (ropa) + cabeza (piel) + peinado + accesorio + CARA
   La cara también es por piezas (ojos, cejas, boca, mejillas)
   para que cada emoción sea solo una combinación distinta.
   ============================================================ */
import { estado } from './state.js';
import { TIPOS_CLIENTE, VIPS, FAMOSA, MULT_PACIENCIA, PIELES, PELOS, ROPAS, PEINADOS, ACCESORIOS } from './data/clientes.js';
import { DOBLADOS, COMBOS, ingrediente, disponibles, comboDisponible, dobladoDisponible } from './data/ingredientes.js';
import { FORMAS_DE_PEDIR, FORMAS_NINO, SALUDOS_VIP, SALUDOS_FAMOSA, FORMAS_NOVIO, alAzar } from './data/mensajes.js';
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
  return i.marca ? i.nombre : i.nombre.toLowerCase();
}

/** Copia un combo como pedido (sin tocar el original). */
function pedidoDeCombo(c) {
  return {
    combo: c.id,
    masa: c.masa || 'masa_clasica',
    rellenos: { ...c.rellenos },
    toppings: { ...c.toppings },
    salsas: [...c.salsas],
    doblado: c.doblado,
    cambios: [],
  };
}

/** Cambios típicos a un combo: "sin plátano", "doble Nutella", "extra crema". */
function aplicarCambio(p, e) {
  const opciones = [];
  const quitables = [...Object.keys(p.rellenos), ...Object.keys(p.toppings), ...p.salsas];
  if (quitables.length >= 3) opciones.push('sin');
  if (Object.keys(p.rellenos).some((id) => ingrediente(id).categoria === 'untable')) opciones.push('doble');
  if (p.toppings.crema_batida || disponibles(e, 'frio').some((i) => i.id === 'crema_batida')) opciones.push('crema');
  if (p.masa === 'masa_clasica' && disponibles(e, 'masa').length > 1) opciones.push('masa');
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
      const id = Object.keys(p.rellenos).find((x) => ingrediente(x).categoria === 'untable');
      if (p.rellenos[id] > 1) return;
      p.rellenos[id] = 2;
      p.cambios.push(`con doble ${nombreEnFrase(id)}`);
      break;
    }
    case 'crema':
      if (p.toppings.crema_batida > 1) return;
      p.cambios.push(p.toppings.crema_batida ? 'con extra crema' : 'con crema batida');
      p.toppings.crema_batida = (p.toppings.crema_batida || 0) + 1;
      break;
    case 'masa': {
      const m = alAzar(disponibles(e, 'masa').filter((i) => i.id !== 'masa_clasica'));
      p.masa = m.id;
      p.cambios.push(m.frase);
      break;
    }
  }
}

// Lo que más les gusta a los niños
const DULCES_NINO = ['nutella', 'lechera', 'choco_blanco', 'choco_oscuro', 'cajeta'];
const TOPPINGS_NINO = ['grageas', 'malvaviscos', 'chispas', 'oreo', 'cereal', 'crema_batida', 'helado_chocolate', 'helado_fresa', 'helado_vainilla'];

/** Pedido armado al gusto (sin combo). */
function pedidoLibre(tipo, e) {
  const p = { combo: null, masa: 'masa_clasica', rellenos: {}, toppings: {}, salsas: [], doblado: 'triangulo', cambios: [] };
  const nino = tipo.id === 'nino';
  const [min, max] = tipo.complejidad;
  let n = entre(min, max);

  const masas = disponibles(e, 'masa').filter((i) => i.id !== 'masa_clasica');
  if (masas.length && Math.random() < (nino ? 0.3 : 0.15)) p.masa = alAzar(masas).id;

  // Casi siempre llevan un untable de base (a veces "doble")
  let untables = disponibles(e, 'untable');
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
    let lista = disponibles(e, cat).filter((i) => !p.rellenos[i.id] && !p.toppings[i.id] && !p.salsas.includes(i.id));
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
    const s = disponibles(e, 'salsa');
    if (s.length) p.salsas.push(alAzar(s).id);
  }
  // Si quedó vacía, al menos una fruta
  if (!Object.keys(p.rellenos).length && !Object.keys(p.toppings).length && !p.salsas.length) {
    p.rellenos[alAzar(disponibles(e, 'fruta')).id] = 1;
  }
  // El triángulo es el doblado más común en las creperías; los niños aman el cono
  const doblados = DOBLADOS.filter((d) => dobladoDisponible(d.id, e)).map((d) => d.id);
  const r = Math.random();
  if (nino && doblados.includes('cono') && r < 0.5) p.doblado = 'cono';
  else p.doblado = r < 0.45 ? 'triangulo' : alAzar(doblados);
  return p;
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
  const combos = COMBOS.filter((c) => comboDisponible(c, e));
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
  return pedidoLibre(tipo, e);
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
  const hayUntable = Object.keys(pedido.rellenos).some((id) => ingrediente(id).categoria === 'untable');
  const partes = [];
  if (rellenos.length) {
    if (hayUntable) {
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

/** Apariencia al azar (con detalles según el tipo). */
function aparienciaPara(tipo) {
  const a = {
    piel: alAzar(PIELES),
    pelo: alAzar(PELOS),
    ropa: alAzar(ROPAS),
    peinado: alAzar(PEINADOS),
    accesorio: alAzar(ACCESORIOS),
    colorAcc: alAzar(ROPAS),
  };
  if (tipo.id === 'gourmet') { a.accesorio = 'boina'; a.colorAcc = '#1B2A55'; a.bigote = Math.random() < 0.5; }
  if (tipo.id === 'exigente' && Math.random() < 0.6) a.accesorio = 'lentes';
  if (tipo.id === 'apurado') a.accesorio = 'audifonos';
  if (tipo.id === 'nino') {
    if (a.peinado === 'calvo') a.peinado = 'corto';
    if (a.accesorio === 'bufanda') a.accesorio = 'gorra';
  }
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
  const formas = novio ? FORMAS_NOVIO : famosa ? SALUDOS_FAMOSA : vip ? SALUDOS_VIP : tipo.id === 'nino' ? FORMAS_NINO : FORMAS_DE_PEDIR;
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

export function caraSVG(emocion = 'normal') {
  const e = EMOCIONES[emocion] || EMOCIONES.normal;
  return `${MEJILLAS[e.mejillas]}${CEJAS[e.cejas]}${OJOS[e.ojos]}${BOCAS[e.boca]}`;
}

// ============================================================
//  Cuerpo, peinado y accesorios
// ============================================================

function peinadoAtras(p, color) {
  if (p === 'largo') return `<path d="M20 70 q0 -48 40 -48 q40 0 40 48 v52 q-12 6 -20 0 v-40 h-40 v40 q-8 6 -20 0 z" fill="${color}"/>`;
  if (p === 'coleta') return `<ellipse cx="100" cy="66" rx="12" ry="20" fill="${color}" transform="rotate(20 100 66)"/>`;
  return '';
}
function peinadoFrente(p, color) {
  switch (p) {
    case 'corto': return `<path d="M22 66 q0 -44 38 -44 q38 0 38 44 q-10 -16 -24 -18 q-8 8 -30 6 q-14 2 -22 12 z" fill="${color}"/>`;
    case 'largo': return `<path d="M22 70 q0 -46 38 -46 q38 0 38 46 q-6 -18 -18 -24 q-14 10 -40 8 q-12 4 -18 16 z" fill="${color}"/>`;
    case 'chongo': return `<circle cx="60" cy="24" r="14" fill="${color}"/><path d="M22 64 q2 -40 38 -40 q36 0 38 40 q-12 -20 -38 -20 q-26 0 -38 20 z" fill="${color}"/>`;
    case 'rizado': return [[30, 46], [44, 34], [60, 30], [76, 34], [90, 46], [24, 60], [96, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="${color}"/>`).join('');
    case 'coleta': return `<path d="M22 66 q0 -44 38 -44 q38 0 38 44 q-14 -22 -38 -22 q-24 0 -38 22 z" fill="${color}"/>`;
    default: return ''; // calvo
  }
}
function accesorio(a, color) {
  switch (a) {
    case 'gorra': return `<path d="M22 54 q4 -34 38 -34 q34 0 38 34 z" fill="${color}"/><path d="M60 52 h48 q4 0 2 5 h-50 z" fill="${color}"/><circle cx="60" cy="20" r="4" fill="${color}"/>`;
    case 'lentes': return `<g fill="rgba(255,255,255,0.25)" stroke="#1B2A55" stroke-width="3"><circle cx="46" cy="70" r="10"/><circle cx="74" cy="70" r="10"/></g><path d="M56 69 h8" stroke="#1B2A55" stroke-width="3"/>`;
    case 'lentesSol': return `<g fill="${color}" stroke="${color}" stroke-width="2"><rect x="35" y="63" width="22" height="14" rx="6"/><rect x="63" y="63" width="22" height="14" rx="6"/></g><path d="M57 68 h6" stroke="${color}" stroke-width="3"/><path d="M39 66 l6 0" stroke="#fff" stroke-width="2" opacity="0.6"/>`;
    case 'boina': return `<path d="M24 46 q4 -26 40 -26 q34 0 34 22 q-30 -8 -74 4 z" fill="${color}"/><circle cx="62" cy="19" r="4" fill="${color}"/>`;
    case 'audifonos': return `<path d="M20 70 q0 -52 40 -52 q40 0 40 52" fill="none" stroke="${color}" stroke-width="6"/><rect x="12" y="62" width="14" height="22" rx="6" fill="${color}"/><rect x="94" y="62" width="14" height="22" rx="6" fill="${color}"/>`;
    case 'moño': return `<g transform="translate(86 34) rotate(20)"><path d="M0 0 l-12 -8 v16 z M0 0 l12 -8 v16 z" fill="${color}"/><circle r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/></g>`;
    default: return '';
  }
}

/**
 * SVG completo de un cliente.
 * @param {object} cliente
 * @param {string} emocion  una de EMOCIONES
 */
export function dibujarCliente(cliente, emocion = 'normal') {
  const a = cliente.apariencia;
  const bufanda = a.accesorio === 'bufanda'
    ? `<path d="M30 112 q30 14 60 0 v12 q-30 14 -60 0 z" fill="${a.colorAcc}"/><rect x="66" y="118" width="12" height="28" rx="4" fill="${a.colorAcc}"/>`
    : '';
  return `
  <svg viewBox="0 0 120 210" class="cliente-svg" aria-hidden="true">
    <ellipse cx="60" cy="204" rx="38" ry="6" fill="rgba(27,42,85,0.18)"/>
    ${peinadoAtras(a.peinado, a.pelo)}
    <!-- cuerpo -->
    <path d="M18 206 q0 -86 42 -86 q42 0 42 86 z" fill="${a.ropa}"/>
    <path d="M44 122 q16 14 32 0" stroke="rgba(255,255,255,0.5)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- cuello y cabeza -->
    <rect x="50" y="100" width="20" height="22" rx="8" fill="${a.piel}"/>
    <circle cx="60" cy="68" r="40" fill="${a.piel}"/>
    <ellipse cx="20" cy="72" rx="6" ry="9" fill="${a.piel}"/><ellipse cx="100" cy="72" rx="6" ry="9" fill="${a.piel}"/>
    ${peinadoFrente(a.peinado, a.pelo)}
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

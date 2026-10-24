/* ============================================================
   boutique.js — tienda de ropa, accesorios y disfraces.

   Todo se puede pagar con pesos o con Chispitas (enChispitas).
   Antes de comprar, se prueba en el personaje. Lo comprado se
   guarda en la cartera (no se pierde al reiniciar la partida) y
   aparece en el creador (personaje.js).
   ============================================================ */
import { estado, actualizar, enModoTemporal } from './state.js';
import { revisarLogros } from './data/logros.js';
import { avisarLogros } from './tienda.js';
import { mostrarModal, aviso, dinero } from './ui.js';
import { sonidos } from './audio.js';
import { chispitas, gastarChispitas, enChispitas, textoChispitas, tieneArticulo, agregarArticulos } from './cartera.js';
import { personaje, guardarPersonaje, dibujarPersonaje, tieneOpcion, conTraje, nombreTraje } from './personaje.js';
import { ACCESORIOS, ABAJO, CALZADO, TRAJES, claveArticulo, personajeInicial, piezasDe, todasLasPiezas } from './data/personaje.js';
import { t } from './idioma.js';

// [id, título, de dónde salen los artículos]
const SECCIONES = [
  ['trajes', `🦸 ${t('Disfraces')}`],
  ['halloween', `🎃 ${t('Halloween y terror')}`],
  ...Object.entries(ACCESORIOS).map(([cat, { nombre }]) => [`acc.${cat}`, nombre]),
  ['abajo', `👖 ${t('Abajo')}`],
  ['calzado', `👟 ${t('Calzado')}`],
];

// En qué encuadre se ve mejor cada cosa en su tarjetita
const VISTA = { 'acc.cabeza': 'cabeza', 'acc.ojos': 'cara', 'acc.cara': 'cara', 'acc.orejas': 'cara', 'acc.cuello': 'busto' };

/** Lo que se vende en una sección: { campo, id, nombre, precio, traje? } */
function articulos(seccion) {
  if (seccion === 'trajes' || seccion === 'halloween') {
    return TRAJES.filter((tr) => (tr.grupo || 'trajes') === seccion)
      .map((tr) => ({ campo: 'traje', id: tr.id, nombre: nombreTraje(tr), precio: tr.precio, traje: tr }));
  }
  const lista = seccion === 'abajo' ? ABAJO : seccion === 'calzado' ? CALZADO : ACCESORIOS[seccion.slice(4)].opciones;
  return lista.filter((o) => o.precio).map((o) => ({ campo: seccion, id: o.id, nombre: o.nombre, precio: o.precio, opcion: o }));
}

const esSuyo = (art) => (art.traje ? tieneArticulo(claveArticulo('traje', art.id)) : tieneOpcion(art.campo, art.opcion));

/** El personaje con el artículo puesto (para probárselo). */
function probar(p, art) {
  if (art.traje) return conTraje(p, art.traje);
  const nuevo = structuredClone(p);
  const ks = art.campo.split('.');
  if (ks.length === 2) nuevo[ks[0]][ks[1]] = art.id;
  else nuevo[art.campo] = art.id;
  // Con vestido no se ve lo de abajo: para probarlo, una playera
  if (art.campo === 'abajo' && nuevo.arriba === 'vestido') nuevo.arriba = 'playera';
  return nuevo;
}

/** ¿Ya lo trae puesto? */
function puesto(p, art) {
  if (art.traje) return Object.entries(piezasDe(art.traje, p)).every(([c, v]) => c.split('.').reduce((o, k) => o[k], p) === v);
  return art.campo.split('.').reduce((o, k) => o[k], p) === art.id;
}

/** Todo lo que desbloquea comprar el artículo. */
function clavesDe(art) {
  if (!art.traje) return [claveArticulo(art.campo, art.id)];
  // Un disfraz trae sus piezas (también las que se venden sueltas, como la capa o la varita)
  return [claveArticulo('traje', art.id), ...Object.entries(todasLasPiezas(art.traje))
    .filter(([campo]) => ['arriba', 'abajo', 'calzado'].includes(campo) || campo.startsWith('acc.'))
    .map(([campo, id]) => claveArticulo(campo, id))];
}

export function abrirBoutique(seccionInicial = 'trajes') {
  // En el sin fin el dinero es temporal: la boutique espera a que termine
  if (enModoTemporal()) { aviso(`🛍️ ${t('La boutique abre al terminar la partida sin fin')}`); return null; }
  sonidos.click();
  let p = personaje() || personajeInicial();
  let seccion = seccionInicial;
  let elegido = null; // el artículo que se está probando

  const cont = document.createElement('div');
  cont.className = 'boutique';
  cont.innerHTML = `
    <div class="tienda-dinero boutique-dinero"></div>
    <div class="boutique-vista"></div>
    <div class="boutique-secciones">${SECCIONES.map(([id, titulo]) => `<button class="chip" data-seccion="${id}">${titulo}</button>`).join('')}</div>
    <div class="boutique-articulos"></div>
    <div class="boutique-barra"></div>`;
  const $ = (sel) => cont.querySelector(sel);

  const pintarDinero = () => {
    $('.boutique-dinero').innerHTML = t('Tienes {dinero} y {chispitas}', { dinero: `<b>${dinero(estado().dinero)}</b>`, chispitas: `<b>${textoChispitas(chispitas())}</b>` });
  };

  const pintarVista = () => {
    $('.boutique-vista').innerHTML = dibujarPersonaje(elegido ? probar(p, elegido) : p, { emocion: 'feliz' });
  };

  const pintarBarra = () => {
    const barra = $('.boutique-barra');
    if (!elegido) { barra.innerHTML = `<p class="nota-creador">${t('Toca algo para probártelo')} 👆</p>`; return; }
    const precioCh = enChispitas(elegido.precio);
    let botones;
    if (esSuyo(elegido)) {
      botones = puesto(p, elegido)
        ? `<span class="comprado">✓ ${t('Lo traes puesto')}</span>`
        : `<button class="btn btn-primario" data-accion="poner">${t('Ponérmelo')}</button>`;
    } else {
      botones = `<button class="btn btn-primario" data-accion="pesos" ${estado().dinero >= elegido.precio ? '' : 'disabled'}>${dinero(elegido.precio)}</button>
        <button class="btn btn-chispitas" data-accion="chispitas" ${chispitas() >= precioCh ? '' : 'disabled'}>${textoChispitas(precioCh)}</button>`;
    }
    barra.innerHTML = `<b class="boutique-nombre">${elegido.nombre}</b><span class="precios en-fila">${botones}</span>`;
  };

  const pintarArticulos = () => {
    cont.querySelectorAll('[data-seccion]').forEach((b) => b.classList.toggle('activo', b.dataset.seccion === seccion));
    const lista = articulos(seccion);
    $('.boutique-articulos').innerHTML = lista.map((art, i) => {
      const suyo = esSuyo(art);
      return `
        <button class="articulo${elegido?.campo === art.campo && elegido?.id === art.id ? ' elegido' : ''}${suyo ? ' tuyo' : ''}" data-i="${i}">
          <span class="articulo-vista">${dibujarPersonaje(probar(p, art), { vista: art.traje ? 'completo' : VISTA[art.campo] || 'completo', emocion: 'feliz' })}</span>
          <b>${art.nombre}</b>
          <small>${suyo ? `✓ ${t('Tuyo')}` : `${dinero(art.precio)} · ${textoChispitas(enChispitas(art.precio))}`}</small>
        </button>`;
    }).join('');
  };

  const pintar = () => { pintarDinero(); pintarVista(); pintarArticulos(); pintarBarra(); };

  const ponerse = () => {
    p = probar(p, elegido);
    guardarPersonaje(p);
  };

  const comprar = (moneda) => {
    const precio = elegido.precio;
    if (moneda === 'chispitas') {
      if (!gastarChispitas(enChispitas(precio))) return;
    } else {
      if (estado().dinero < precio) return;
      actualizar((e) => { e.dinero -= precio; });
    }
    agregarArticulos(clavesDe(elegido));
    ponerse();
    sonidos.compra();
    aviso(`🛍️ ${t('¡{nombre} es tuyo!', { nombre: elegido.nombre })}`);
    let logros = [];
    actualizar((e) => { logros = revisarLogros(e, { momento: 'compra' }); });
    if (logros.length) avisarLogros(logros);
  };

  cont.addEventListener('click', (ev) => {
    const sec = ev.target.closest('[data-seccion]');
    if (sec) {
      sonidos.click();
      seccion = sec.dataset.seccion;
      elegido = null;
      $('.boutique-articulos').scrollTop = 0;
      pintar();
      return;
    }
    const art = ev.target.closest('[data-i]');
    if (art) {
      sonidos.pop();
      elegido = articulos(seccion)[Number(art.dataset.i)];
      pintar();
      return;
    }
    const acc = ev.target.closest('[data-accion]');
    if (!acc || !elegido) return;
    if (acc.dataset.accion === 'poner') { sonidos.pop(); ponerse(); aviso(`👤 ${t('¡Listo!')}`); }
    else comprar(acc.dataset.accion);
    pintar();
  });
  pintar();

  return mostrarModal({ titulo: `🛍️ ${t('Boutique')}`, contenido: cont, botones: [{ texto: t('Cerrar'), clase: 'btn-primario' }] });
}

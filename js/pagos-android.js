/* ============================================================
   pagos-android.js — compra de Chispitas con Google Play.

   Solo se carga dentro de la app de Android (Capacitor) y necesita
   el plugin cordova-plugin-purchase (ver GUIA_PLAY_STORE.md).
   Pone window.CandyPagos, que usa la tienda de Chispitas (cartera.js):
     CandyPagos.precio(id)   → '$19.00' (el precio local de Google Play)
     CandyPagos.comprar(id)  → Promise<{ ok }>

   Las Chispitas se acreditan aquí, cuando Google Play confirma el
   pago (también si la app se cerró a medio pago y se confirma al
   volver a abrirla). Cada compra se acredita una sola vez.

   Los ids de los paquetes (PAQUETES en cartera.js) deben existir
   igual en Play Console → Monetizar → Productos integrados.
   ============================================================ */
import { PAQUETES, ganarChispitas } from './cartera.js';
import { aviso } from './ui.js';
import { sonidos } from './audio.js';
import { t } from './idioma.js';

const CLAVE_ACREDITADAS = 'creperia.compras'; // ids de transacciones ya acreditadas

function acreditadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_ACREDITADAS)) || []; } catch { return []; }
}

/** Acredita una compra una sola vez (por id de transacción). */
function acreditar(idTransaccion, idProducto) {
  const lista = acreditadas();
  if (lista.includes(idTransaccion)) return false;
  const paquete = PAQUETES.find((p) => p.id === idProducto);
  if (!paquete) return false;
  ganarChispitas(paquete.chispitas);
  try { localStorage.setItem(CLAVE_ACREDITADAS, JSON.stringify([...lista, idTransaccion].slice(-200))); } catch { /* sin espacio */ }
  sonidos.compra();
  aviso(`✨ ${t('+{n} Chispitas. ¡Gracias!', { n: paquete.chispitas })}`);
  return true;
}

export async function iniciarPagos() {
  // Los plugins de Cordova quedan listos con el evento deviceready
  if (!window.CdvPurchase) {
    await new Promise((listo) => {
      document.addEventListener('deviceready', listo, { once: true });
      setTimeout(listo, 8000);
    });
  }
  const { store, ProductType, Platform } = window.CdvPurchase || {};
  if (!store) {
    console.warn('Pagos: falta el plugin cordova-plugin-purchase.');
    return;
  }
  const esperando = new Map(); // idProducto → resolver de la compra en curso

  store.register(PAQUETES.map((p) => ({ id: p.id, type: ProductType.CONSUMABLE, platform: Platform.GOOGLE_PLAY })));
  store.when()
    .approved((tx) => tx.verify())
    .verified((recibo) => recibo.finish())
    .finished((tx) => {
      for (const producto of tx.products) {
        acreditar(tx.transactionId, producto.id);
        esperando.get(producto.id)?.({ ok: true });
        esperando.delete(producto.id);
      }
    });
  store.error((err) => console.warn('Pagos:', err));
  await store.initialize([Platform.GOOGLE_PLAY]);

  window.CandyPagos = {
    precio(id) {
      return store.get(id, Platform.GOOGLE_PLAY)?.pricing?.price || '';
    },
    comprar(id) {
      const oferta = store.get(id, Platform.GOOGLE_PLAY)?.getOffer();
      if (!oferta) return Promise.resolve({ ok: false });
      return new Promise((resolver) => {
        esperando.set(id, resolver);
        oferta.order().then((err) => {
          // err: canceló o falló (si no hay error, se resuelve al confirmarse en .finished)
          if (err) { esperando.delete(id); resolver({ ok: false }); }
        });
      });
    },
  };
}

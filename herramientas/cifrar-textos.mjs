/* ============================================================
   cifrar-textos.mjs — cifra los textos de la versión especial.

   Los textos viven en textos-especiales.json (NO se sube a GitHub).
   Este script los cifra con el código especial y escribe el
   resultado en js/config.js (campo versionEspecial).

   Uso (en la carpeta del juego):
     node herramientas/cifrar-textos.mjs TU_CODIGO

   Cifrado: AES-GCM con una llave sacada del código con PBKDF2
   (SHA-256, muchas vueltas para que cada intento sea lento).
   Los mismos parámetros los usa js/romance.js para descifrar.
   ============================================================ */
import fs from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const VUELTAS = 600000;
const codigo = (process.argv[2] || '').trim().toLowerCase();
if (!codigo) {
  console.error('Falta el código. Uso: node herramientas/cifrar-textos.mjs TU_CODIGO');
  process.exit(1);
}

const textos = JSON.parse(fs.readFileSync('textos-especiales.json', 'utf8'));
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

const sal = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(codigo), 'PBKDF2', false, ['deriveKey']);
const llave = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: sal, iterations: VUELTAS, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
);
const datos = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, new TextEncoder().encode(JSON.stringify(textos)));

const bloque = `versionEspecial: {
    vueltas: ${VUELTAS},
    sal: '${b64(sal)}',
    iv: '${b64(iv)}',
    datos: '${b64(new Uint8Array(datos))}',
  },`;

const ruta = 'js/config.js';
const config = fs.readFileSync(ruta, 'utf8');
const patron = /versionEspecial: (?:\{[\s\S]*?\n {2}\}|null),/;
if (!patron.test(config)) {
  console.error('No encontré el campo versionEspecial en js/config.js');
  process.exit(1);
}
fs.writeFileSync(ruta, config.replace(patron, bloque));
console.log(`Listo: ${Object.keys(textos).join(', ')} cifrados en ${ruta}`);

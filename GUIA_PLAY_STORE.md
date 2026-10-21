# 🤖 Guía: publicar Creepy Crepas en Google Play

Se usa [Capacitor](https://capacitorjs.com): mete la página del juego dentro de una app de Android. El código del juego **no cambia**; dentro de la app se activan solos los pagos de Chispitas con Google Play (`js/pagos-android.js`).

> En iPhone el juego se instala como app desde Safari (ver `README.md`). Una app de iPhone "de verdad" necesita una Mac con Xcode y una cuenta de Apple; esta guía no lo cubre.

**Lo que vas a necesitar:**

- Una cuenta de desarrollador de Google Play: <https://play.google.com/console> (pago único de 25 USD, pide verificar tu identidad; puede tardar unos días).
- Para vender Chispitas: un **perfil de pagos** de Google (Play Console te lo pide al crear productos) con tu cuenta de banco.

---

## 1. Instalar lo necesario (una sola vez)

1. **Node.js LTS**: <https://nodejs.org>. Comprueba en PowerShell: `node -v` y `npm -v`.
2. **Android Studio**: <https://developer.android.com/studio>. Al abrirlo la primera vez deja que instale el *Android SDK* (opción *Standard*).

## 2. Crear el proyecto de Android

En **otra carpeta**, para no mezclarlo con el repositorio del juego:

```powershell
mkdir "C:\Escritorio\creepy-crepas-android"
cd "C:\Escritorio\creepy-crepas-android"
npm init -y
npm install @capacitor/core @capacitor/android cordova-plugin-purchase
npm install -D @capacitor/cli @capacitor/assets
npx cap init "Creepy Crepas" com.dkl95.creepycrepas --web-dir www
```

> ⚠️ El id (`com.dkl95.creepycrepas`) **no se puede cambiar** después de publicar. Si prefieres otro, cámbialo ahora.

`cordova-plugin-purchase` es el plugin de compras de Google Play.

## 3. Copiar el juego a `www`

```powershell
robocopy "C:\Escritorio\Juego crepas" ".\www" /MIR /XD .git herramientas /XF *.md *.sql .gitignore .nojekyll robots.txt textos-especiales.json
```

> ⚠️ **Nunca** quites `textos-especiales.json` de esa lista: tiene la carta de Devany sin cifrar y quedaría dentro de la app.

(`robocopy` dice "error" con códigos 1–3 aunque haya copiado bien; es normal.)

## 4. Agregar Android

```powershell
npx cap add android
npx cap sync android
```

## 5. Ícono y pantalla de carga

```powershell
mkdir assets
copy "www\assets\icono-1024.png" "assets\icon-only.png"
npx capacitor-assets generate --android --iconBackgroundColor "#2EC4B6" --splashBackgroundColor "#FFF8EE"
```

## 6. Dejarlo siempre vertical

Abre `android\app\src\main\AndroidManifest.xml` y en la etiqueta `<activity ...>` agrega:

```xml
android:screenOrientation="portrait"
```

## 7. Probarlo en tu teléfono (sin publicar)

```powershell
cd android
.\gradlew assembleDebug
```

Pasa `android\app\build\outputs\apk\debug\app-debug.apk` al teléfono y ábrelo (Android pedirá permiso para instalar apps de origen desconocido). Las compras **no** funcionan en esta versión: solo en la que se instala desde Play.

## 8. Firmar la app (una sola vez)

Google pide un archivo de llave para firmar. En Android Studio (`npx cap open android`): **Build → Generate Signed App Bundle or APK → Android App Bundle → Create new…**

- Guárdalo, por ejemplo, en `C:\Escritorio\llaves\creepy-crepas.jks`.
- ⚠️ **Guarda el archivo y las contraseñas en un lugar seguro** (y un respaldo). Sin ellos no podrás publicar actualizaciones. Esa carpeta **no** debe ir al repositorio.
- Al terminar te da `android\app\release\app-release.aab`: eso es lo que se sube a Play.

## 9. Crear la app en Play Console

1. **Crear app**: nombre *Creepy Crepas*, idioma *Español (Latinoamérica)*, *Juego*, *Gratis*.
2. **Contenido de la app** (Play Console te va guiando):
    - **Política de privacidad**: `https://dkl95.github.io/mermelada-azul-47/privacidad.html` (ya tiene el correo de contacto).
    - **Anuncios**: no tiene anuncios.
    - **Clasificación de contenido**: llena el cuestionario (sin violencia, sin apuestas; tiene compras dentro de la app e interacción con otros usuarios solo por apodos en una tabla).
    - **Público objetivo**: te recomiendo **13 años o más**. Si eliges menores de 13, Google aplica la política de *Familias*, que es más estricta.
    - **Seguridad de los datos**: el juego recopila *nombre de usuario (apodo)* e *ID de usuario* (aleatorio) para la tabla en línea; se comparten públicamente en la tabla; se envían cifrados (HTTPS); el usuario puede pedir que se borren. Las compras las procesa Google.
3. **Ficha de Play Store**: descripción, ícono 512×512 (`assets/icono-512.png`), gráfico de funciones 1024×500 y al menos 2 capturas del teléfono.

## 10. Productos de Chispitas

Play Console → **Monetizar → Productos → Productos integrados** → crea estos 4, **con estos ids exactos** (son los de `PAQUETES` en `js/cartera.js`):

| Id del producto | Nombre | Precio sugerido |
|---|---|---|
| `chispitas_60` | Puñito de Chispitas (60) | $19 MXN |
| `chispitas_150` | Bolsita de Chispitas (150) | $39 MXN |
| `chispitas_400` | Frasco de Chispitas (400) | $89 MXN |
| `chispitas_1000` | Cofre de Chispitas (1000) | $179 MXN |

Actívalos. Son productos *consumibles* (se pueden comprar varias veces).

## 11. Primera versión: prueba interna

1. **Pruebas → Prueba interna → Crear versión** y sube el `.aab`.
2. Agrega tu correo (y el de quien quieras) como **verificador**.
3. **Configuración → Pruebas de licencia**: agrega los mismos correos; así las compras de prueba no cobran.
4. Instala la app desde el enlace de la prueba interna y compra un paquete: deben llegar las Chispitas.
5. Cuando todo esté bien: **Producción → Crear versión** con el mismo `.aab` y envíalo a revisión (la primera puede tardar varios días). Las cuentas personales nuevas deben hacer antes una **prueba cerrada con al menos 12 personas durante 14 días**; Play Console te lo indica.

## 12. Actualizar la app después de cambiar el juego

```powershell
cd "C:\Escritorio\creepy-crepas-android"
robocopy "C:\Escritorio\Juego crepas" ".\www" /MIR /XD .git herramientas /XF *.md *.sql .gitignore .nojekyll robots.txt textos-especiales.json
npx cap sync android
```

En `android\app\build.gradle` sube `versionCode` (1 → 2 → 3…) y `versionName` ("1.1"…), genera otro `.aab` firmado (paso 8, con la misma llave) y súbelo como versión nueva.

---

## ℹ️ Notas

- La partida de la app es **independiente** de la de la página web o el iPhone.
- **Las Chispitas compradas se guardan en el teléfono.** Si desinstalan la app se pierden (Google no las devuelve porque son consumibles). Si algún día quieres evitarlo, haría falta un sistema de cuentas.
- Las compras se verifican en el teléfono, sin servidor propio. Para un juego como este suele bastar; un jugador muy hábil podría hacer trampa con su propio saldo.
- **Disfraces de parodia:** son dibujos inspirados, sin nombres ni logotipos oficiales. Aun así, si Google rechaza la app por algún personaje, se cambia ese dibujo y se vuelve a enviar.
- Si `npx cap` o Gradle fallan por Java, abre el proyecto en Android Studio y acepta lo que sugiera actualizar.

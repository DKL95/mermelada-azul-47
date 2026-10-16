# 🤖 Guía: convertir Candy Crepas en APK (Android)

> **Importante:** un APK solo sirve en **Android**. En iPhone el juego ya se instala como app desde Safari (ver `README.md`). Para una app de iPhone "de verdad" se necesita una **Mac con Xcode** y una cuenta de desarrollador de Apple (`npx cap add ios`); esta guía no cubre eso.

Se usa [Capacitor](https://capacitorjs.com): mete la página del juego dentro de una app de Android. El código del juego **no cambia**.

---

## 1. Instalar lo necesario (una sola vez)

1. **Node.js LTS**: <https://nodejs.org> → instalador de Windows. Comprueba en PowerShell:
   ```powershell
   node -v
   npm -v
   ```
2. **Android Studio**: <https://developer.android.com/studio>. Al abrirlo la primera vez deja que instale el *Android SDK* (opción *Standard*). Ya trae Java incluido.

## 2. Crear el proyecto de Android

Se hace en **otra carpeta**, para no mezclarlo con el repositorio del juego.

```powershell
mkdir "C:\Escritorio\candy-crepas-android"
cd "C:\Escritorio\candy-crepas-android"
npm init -y
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli @capacitor/assets
npx cap init "Candy Crepas" com.dkl95.candycrepas --web-dir www
```

## 3. Copiar el juego a `www`

```powershell
robocopy "C:\Escritorio\Juego crepas" ".\www" /MIR /XD .git /XF *.md .gitignore .nojekyll robots.txt
```

(`robocopy` dice "error" con códigos 1–3 aunque haya copiado bien; es normal.)

## 4. Agregar Android

```powershell
npx cap add android
npx cap sync android
```

## 5. Ícono y pantalla de carga

1. Crea una carpeta `assets` (dentro de `candy-crepas-android`, no dentro de `www`).
2. Pon ahí:
   - `icon-only.png`: el ícono, mínimo 1024×1024. Puedes abrir `www/assets/icono.svg` en Chrome, hacer zoom y exportarlo, o usar `icono-512.png` (se verá un poco menos nítido).
   - `splash.png`: imagen de 2732×2732 con el logo al centro y fondo `#F3F9FF`. Es opcional: si no la pones, se genera con el ícono.
3. Genera todos los tamaños:
   ```powershell
   npx capacitor-assets generate --android --iconBackgroundColor "#F3F9FF" --splashBackgroundColor "#F3F9FF"
   ```

## 6. Dejarlo siempre vertical

Abre `android\app\src\main\AndroidManifest.xml` y en la etiqueta `<activity ...>` agrega:

```xml
android:screenOrientation="portrait"
```

## 7. Crear el APK

```powershell
npx cap open android
```

En Android Studio espera a que termine de cargar (barra de abajo) y luego **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. Al terminar, *locate* abre la carpeta:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Sin abrir Android Studio también funciona:

```powershell
cd android
.\gradlew assembleDebug
```

## 8. Instalarlo en el teléfono

1. Pasa `app-debug.apk` al Android (cable, Drive, WhatsApp como documento…).
2. Ábrelo. Android pedirá permiso para **instalar apps de origen desconocido**: acéptalo solo para esa app (Archivos, Drive, etc.).
3. Listo: aparece el ícono de Candy Crepas.

## 9. Actualizar la app después de cambiar el juego

```powershell
cd "C:\Escritorio\candy-crepas-android"
robocopy "C:\Escritorio\Juego crepas" ".\www" /MIR /XD .git /XF *.md .gitignore .nojekyll robots.txt
npx cap sync android
cd android
.\gradlew assembleDebug
```

Instala el APK nuevo encima del anterior; **la partida se conserva** mientras no desinstales la app.

---

## ℹ️ Notas

- La partida del APK es **independiente** de la de la página web o el iPhone (cada una guarda la suya).
- Funciona sin internet. La letra redondeada (Fredoka) se baja de internet la primera vez; sin conexión usa la letra del sistema.
- El APK *debug* sirve para instalarlo a mano. Para subirlo a Google Play haría falta firmarlo (*Build → Generate Signed Bundle*) y una cuenta de desarrollador (pago único).
- Si `npx cap` falla con un error de Java o Gradle, abre el proyecto en Android Studio y acepta lo que te sugiera actualizar.

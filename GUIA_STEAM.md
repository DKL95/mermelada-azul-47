# 🎮 Guía: publicar Creepy Crepas en Steam

La versión de PC es el **mismo juego** dentro de [Electron](https://www.electronjs.org) (un Chrome que corre como programa). Todo vive en la carpeta `steam/`:

| Archivo | Qué hace |
|---|---|
| `steam/main.js` | Abre la ventana, sirve el juego, zoom con la ventana, conecta con Steam (logros) |
| `steam/preload.js` | Le avisa al juego que está en Steam (`window.CandySteam`) |
| `steam/herramientas/logros.js` | Arma la lista e íconos de logros para Steamworks |
| `js/steam.js` | Del lado del juego: manda cada logro ganado a Steam |

En Steam el juego **se compra una vez**: no hay tienda de Chispitas con dinero real, solo se ganan jugando.

**Lo que vas a necesitar:**

- Una cuenta de **Steamworks**: <https://partner.steamgames.com>. Pide tus datos fiscales y de banco, y verificar tu identidad.
- Pagar **Steam Direct**: 100 USD por juego (te los regresan cuando el juego vende 1,000 USD). Después de pagar hay que esperar **30 días** antes de poder lanzar, y Valve revisa la página de la tienda y el juego (unos días cada una).
- Tener **Steam instalado y abierto** en tu PC para probar los logros.

---

## 1. Instalar lo necesario (una sola vez)

1. **Node.js LTS**: <https://nodejs.org>. Comprueba en PowerShell: `node -v` y `npm -v`.
2. En la carpeta `steam/`:

```powershell
cd "C:\Escritorio\Juego crepas\steam"
npm install
```

## 2. Probarlo en tu PC

```powershell
npm start
```

- **F11** = pantalla completa. Todo crece con la ventana.
- Mientras no tengas tu App ID, el juego usa el **480** ("Spacewar", la app de prueba de Valve): si Steam está abierto, tu perfil dirá que juegas *Spacewar* y la capa de Steam (Mayús+Tab) funciona. Los logros todavía no se ven porque Spacewar no tiene los nuestros.
- Sin Steam abierto el juego funciona igual, solo sin logros.

> ⚠️ La tabla en línea es la **misma** que la del juego en el navegador. Si pruebas y escribes un nombre, ese nombre sube a la tabla de verdad.

## 3. Poner tu App ID

Cuando pagues Steam Direct, Steamworks te da un número (App ID, por ejemplo `3456780`). Ponlo en `steam/main.js`:

```js
const STEAM_APP_ID = 3456780;
```

Con un App ID real, el juego ya empaquetado se reabre solo a través de Steam si alguien abre el `.exe` directo (así cuenta las horas y funcionan los logros).

## 4. Dar de alta los logros

El juego tiene 34 logros. Para sacar la lista y los íconos:

```powershell
cd "C:\Escritorio\Juego crepas\steam"
npm run logros
```

Crea `steam/logros/`:

- `logros.csv`: ábrelo con Excel. Por logro: el **nombre API** (`LOGRO_PRIMERA`…), y nombre + descripción en los 7 idiomas, con el nombre del idioma como lo usa Steam (`latam`, `english`, `french`, `brazilian`, `german`, `japanese`, `koreana`).
- `iconos/`: `LOGRO_X_ACHIEVED.png` (a color) y `LOGRO_X_UNACHIEVED.png` (gris), de 256×256.

En Steamworks: tu app → **Edit Steamworks Settings → Stats & Achievements → Achievements**:

1. **New Achievement** por cada fila del CSV:
   - **API Name**: exactamente el de la columna `api` (`LOGRO_PRIMERA`). Si no es igual, el logro nunca se da.
   - **Display Name** y **Description**: los de español en *Latin American Spanish*; cambia el idioma con el menú de arriba para poner los demás.
   - **Set By**: *Client*.
2. Íconos: en la misma página está la opción para **subir varias imágenes a la vez**; elige todos los PNG de `iconos/`. Como se llaman igual que el nombre API (`LOGRO_X_ACHIEVED` / `LOGRO_X_UNACHIEVED`), se acomodan solos en su logro.
3. ⚠️ Pestaña **Publish → Prepare for Publishing → Publish to Steam**. Si no publicas, los cambios no existen para el juego.

Si cambias o agregas logros en `js/data/logros.js`, vuelve a correr `npm run logros` y da de alta solo los nuevos.

> Para probar desde cero: en Steam abre la consola (`steam://open/console` en el navegador) y escribe `reset_all_stats TU_APP_ID`.

## 5. Guardado en la nube (Steam Cloud), opcional

La partida se guarda en `%APPDATA%\Creepy Crepas\Local Storage`. Para que se pase entre PCs:
**Edit Steamworks Settings → Application → Steam Cloud**:

- *Byte quota per user*: `10000000` · *Number of files allowed per user*: `100`
- **Root Overrides / Auto-Cloud** → *Add new path*: Root `WinAppDataRoaming`, Subdirectory `Creepy Crepas/Local Storage`, Pattern `*`, OS `Windows`, *Recursive* ✔.

Publica los cambios (como en el paso 4).

## 6. Empaquetar el juego

```powershell
cd "C:\Escritorio\Juego crepas\steam"
npm run empaquetar
```

Queda en `steam\dist\win-unpacked\` (unos 320 MB): `Creepy Crepas.exe` y todo lo que necesita. El juego va adentro, en `resources\juego\`, y **solo** lleva `index.html`, `privacidad.html`, `manifest.webmanifest`, `css`, `js` y `assets` (la lista está en `steam/package.json`, en `extraResources`).

> ⚠️ **Nunca** agregues `textos-especiales.json` a esa lista: tiene la carta de Devany sin cifrar y quedaría dentro del juego.

Antes de subirlo, ábrelo: doble clic en `Creepy Crepas.exe`.

## 7. Subir el juego a Steam (SteamPipe)

1. En Steamworks: **Edit Steamworks Settings → Installation → General**: *Launch Options* → *Add new launch option*: Executable `Creepy Crepas.exe`, Operating System *Windows*. Publica los cambios.
2. Baja el **Steamworks SDK**: <https://partner.steamgames.com/downloads/list> y descomprímelo (por ejemplo en `C:\steamworks_sdk`).
3. Copia **el contenido** de `steam\dist\win-unpacked\` a `C:\steamworks_sdk\tools\ContentBuilder\content\`.
4. En `C:\steamworks_sdk\tools\ContentBuilder\scripts\` crea `app_build.vdf` (cambia `3456780` por tu App ID y `3456781` por el **Depot ID**, que ves en *SteamPipe → Depots*; casi siempre es el App ID + 1):

```
"AppBuild"
{
  "AppID" "3456780"
  "Desc" "Creepy Crepas 1.0.0"
  "ContentRoot" "..\content\"
  "BuildOutput" "..\output\"
  "Depots"
  {
    "3456781"
    {
      "FileMapping"
      {
        "LocalPath" "*"
        "DepotPath" "."
        "recursive" "1"
      }
    }
  }
}
```

5. En PowerShell:

```powershell
cd "C:\steamworks_sdk\tools\ContentBuilder\builder"
.\steamcmd.exe +login TU_USUARIO_DE_STEAM +run_app_build "..\scripts\app_build.vdf" +quit
```

   La primera vez pide tu contraseña y el código de Steam Guard.
6. En Steamworks: **SteamPipe → Builds**: aparece la build nueva. Ponla en la rama `default` y **Preview Change → Set Build Live Now**.
7. Para instalarla tú y probarla antes del lanzamiento: **Users & Permissions → Request Steam Product Keys**, pide una clave y actívala en tu Steam.

## 8. Actualizar el juego después

1. Cambia lo que quieras en el juego (es el mismo código de la web).
2. Sube el número en `steam/package.json` (`"version": "1.0.1"`).
3. Repite los pasos 6 y 7 (empaquetar, copiar a `content\`, `run_app_build`, poner la build en `default`).

## ℹ️ Notas

- **Steam Deck**: corre la versión de Windows con Proton. Para el sello de *Verificado* se necesita control (gamepad), que el juego todavía no tiene: por ahora es con pantalla táctil, mouse y teclado.
- **Teclado**: Tab = Cocina/Venta, Espacio = botón principal, 1–9 = ingredientes o clientes, Esc = cerrar/Ajustes (lista completa en `js/teclado.js`).
- El `.exe` no va firmado. Desde Steam no importa; si algún día lo repartes fuera de Steam, Windows mostraría un aviso de "editor desconocido".
- La versión especial (🔒 código) también existe en la PC, igual que en la web.

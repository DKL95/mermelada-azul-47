# 🥞 Creepy Crepas

Juego casual de crepería para el celular: los clientes llegan a la ventanilla, piden su crepa (dulce o salada) y tú la preparas paso a paso (masa, cocción, relleno, doblado, toppings y decoración con el dedo). Se califica cada crepa, los clientes dejan reseñas y con las ganancias compras mejoras para el local.

Es para todo público, con una versión especial para Devany que se desbloquea con un código (botón 🔒 en la esquina de la pantalla de inicio). Está hecho con HTML, CSS y JavaScript sin frameworks, todos los dibujos son SVG/código y funciona sin internet como app (PWA).

---

## ▶️ Jugar en tu computadora (Windows)

Necesitas un servidor local (los módulos de JavaScript no funcionan abriendo el `index.html` con doble clic).

```powershell
cd "C:\Escritorio\Juego crepas"
python -m http.server 5173
```

Abre <http://localhost:5173> en Chrome. Para verlo como celular: `F12` → ícono de celular (Ctrl+Shift+M) → elige un iPhone.

> Alternativa sin Python: `npx serve .` (necesita Node.js).

## ✏️ Personalizar (`js/config.js`)

Todo lo personal está en **un solo archivo**:

| Campo | Qué es |
|---|---|
| `nombreCreperia` | Nombre del letrero y de la pantalla de inicio (versión pública) |
| `nombreCreperiaEspecial` | El nombre en la versión especial (Candy Crepas) |
| `creador` | Quién hizo el juego (créditos de la versión pública) |
| `mensajeBienvenidaPublico` | Bienvenida de la versión pública |
| `nombreElla`, `nombreNovio` | Nombres para la dedicatoria y el cliente especial (versión especial) |
| `aparienciaNovio` | Colores y peinado del cliente especial |
| `versionEspecial` | Los mensajes de la versión especial, **cifrados** (ver abajo) |
| `diaSorpresa` | Día en que se abre la cartita sorpresa |
| `firma` | Firma de la cartita y los créditos |
| `nombreMascota` | Nombre de la perrita de la tienda |
| `bebidasEnDificultades` | En qué dificultades existe la barra de bebidas |

### Versión especial y su código

Sin el código, el juego es para todo público: sin dedicatoria, sin el cliente novio y sin la cartita sorpresa. En la pantalla de inicio, el botón 🔒 de la esquina pide el código; con él se activa la versión especial en ese dispositivo (el botón cambia a 💕, y tocándolo se puede volver a la normal). La partida es la misma en las dos versiones.

Los mensajes de la versión especial (la bienvenida y la cartita) van **cifrados** en `config.js`: el código es la llave, así que en GitHub no se pueden leer. El código no está guardado en ningún lado; se revisa intentando descifrar los textos.

Para cambiar los mensajes o el código:

1. Edita `textos-especiales.json` (está en `.gitignore`: **no se sube**; guárdalo en un lugar seguro, sin él no se pueden recuperar los textos).
2. En PowerShell, en la carpeta del juego:

```powershell
node herramientas/cifrar-textos.mjs TU_CODIGO
```

Eso reescribe `versionEspecial` en `config.js`. Si cambias el código, quien ya tenía la versión especial tendrá que volver a ponerlo.

> ⚠️ **Es una barrera, no seguridad total.** Con un código corto (6 números), alguien con conocimientos podría probar todas las combinaciones; cada intento es lento a propósito (PBKDF2, 600 000 vueltas), pero no imposible.

### Herramientas de prueba

Están apagadas. Para verlas en un dispositivo, abre el juego con `?dev=1` al final del enlace (por ejemplo `.../mermelada-azul-47/?dev=1`); aparecen en ⚙️ Ajustes. Con `?dev=0` se apagan.

---

## 🌐 Publicar en GitHub Pages (Windows)

El repositorio es `DKL95/mermelada-azul-47` (nombre poco obvio a propósito). GitHub Pages gratis necesita que el repositorio sea **público**.

1. **Subir los cambios** (PowerShell, en la carpeta del juego):
   ```powershell
   git add -A
   git commit -m "Actualizar juego"
   git push
   ```
2. **Hacer público el repositorio** (solo la primera vez): en GitHub → *Settings* → *General* → hasta abajo, *Danger Zone* → *Change repository visibility* → *Make public*.
   O con la terminal: `gh repo edit DKL95/mermelada-azul-47 --visibility public --accept-visibility-change-consequences`
3. **Activar Pages** (solo la primera vez): *Settings* → *Pages* → *Build and deployment* → *Source: Deploy from a branch* → rama `main`, carpeta `/ (root)` → *Save*.
   O con la terminal: `gh api -X POST repos/DKL95/mermelada-azul-47/pages -f "source[branch]=main" -f "source[path]=/"`
4. Espera 1–2 minutos. El juego queda en:
   **<https://dkl95.github.io/mermelada-azul-47/>**

Cada `git push` posterior actualiza el juego en un par de minutos.

### Para que el iPhone baje la versión nueva

El juego guarda una copia para funcionar sin internet. Al publicar cambios, sube el número de `VERSION_CACHE` en `sw.js` (ej. `creperia-v9` → `creperia-v10`). En el iPhone basta con abrir el juego con internet y cerrarlo/abrirlo otra vez.

### Privacidad

- `index.html` trae `noindex, nofollow` y hay un `robots.txt` que pide a los buscadores no indexarlo.
- Comparte el enlace solo con ella.
- Ojo: en un repositorio público cualquiera puede ver el código y el historial (incluido `config.js`).

---

## 📱 Instalar en el iPhone

1. Abre el enlace en **Safari** (tiene que ser Safari).
2. Toca el botón **Compartir** (cuadrito con flecha hacia arriba).
3. **Agregar a pantalla de inicio** → *Agregar*.
4. Ábrelo desde el ícono: se ve a pantalla completa, como app, y funciona sin internet.

> 🔈 Si no se oye nada, revisa el interruptor de silencio del iPhone y el ⚙️ de Sonido del juego.
> 💾 La partida se guarda sola en el teléfono. Si se borra la app de la pantalla de inicio o los datos de Safari, se pierde.

## 🤖 Android (APK)

Para tenerlo como app instalable en Android, sigue [`GUIA_APK.md`](GUIA_APK.md) (Capacitor + Android Studio).

## 🏆 Tabla en línea

En ⚙️ Ajustes → **Tabla en línea** cada jugador elige su nombre y ve la tabla (mejor día y acumulado). Al terminar cada día la ganancia se sube sola; sin internet se guarda y se manda después.

- Usa un proyecto gratis de [Supabase](https://supabase.com) (`candy-crepas`). La tabla se crea con [`supabase.sql`](supabase.sql) en el *SQL Editor*.
- La URL y la clave *publishable* están en `js/config.js` (`tablaEnLinea`). Esa clave puede ser pública: la base solo deja **leer y agregar**, no cambiar ni borrar. Para apagar la tabla, pon `tablaEnLinea: null`.
- Como el código es público, alguien muy curioso podría subir puntuaciones inventadas (dentro de límites razonables). Para borrar una, en Supabase: *Table Editor* → `puntuaciones`.
- Supabase pausa los proyectos gratis tras ~1 semana sin uso; si la tabla deja de cargar, entra al panel y dale *Restore*.

---

## 🗂️ Estructura

```
index.html            pantalla principal
manifest.webmanifest  datos de la app (PWA)
sw.js                 funciona sin internet
css/                  estilos (base, interfaz, escenas)
js/
  main.js             arranque, pestañas, ajustes
  config.js           ✏️ personalización
  state.js            estado y guardado automático
  cocina.js           pestaña Cocina (estaciones)
  plancha.js          la crepa en la plancha (canvas)
  venta.js            pestaña Venta (clientes, cobro, resumen)
  turno.js            el día: llegadas, paciencia, cobro, logros
  clientes.js         generación y dibujo de clientes
  calificacion.js     cómo se califica cada crepa
  dibujos.js          íconos e ilustraciones SVG
  tienda.js           tienda y logros
  romance.js          inicio, código especial, cartitas, créditos
  tutorial.js         tutorial de la primera vez
  ranking.js          tabla de puntuaciones en línea
  audio.js            sonidos sintetizados
  data/               ingredientes, combos, clientes, mensajes,
                      mejoras, eventos, logros
assets/               íconos de la app
herramientas/         cifrar-textos.mjs (cifra los mensajes especiales)
```

Hecho con 💕 para Devany.

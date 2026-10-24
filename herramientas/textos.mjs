/* ============================================================
   herramientas/textos.mjs — lista los textos del juego que se
   traducen y revisa qué le falta a cada idioma.

     node herramientas/textos.mjs           resumen por idioma
     node herramientas/textos.mjs en        textos que le faltan al inglés (JSON)
     node herramientas/textos.mjs --todos   todos los textos (JSON)

   Encuentra:
     - t('…'), g('…', '…') y los textos dentro de tl([…])
     - en los archivos que usan traducirDatos(), los campos
       nombre, descripcion, frase, enFrase, nota y efectos
     - los data-t de index.html y el mensaje de bienvenida de config.js
   ============================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAMPOS = ['nombre', 'descripcion', 'frase', 'enFrase', 'nota', 'efectos'];

/** Lee un literal de texto de JS que empieza en s[i] ('…', "…" o `…`). */
function literal(s, i) {
  const q = s[i];
  let r = '';
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') {
      const n = s[++j];
      r += n === 'n' ? '\n' : n === 't' ? '\t' : n;
      continue;
    }
    if (q === '`' && c === '$' && s[j + 1] === '{') return null; // con valores: no es un texto fijo
    if (c === q) return { texto: r, fin: j + 1 };
    r += c;
  }
  return null;
}

/** Todos los literales entre la posición i y el paréntesis que cierra. */
function literalesHastaCerrar(s, i) {
  const r = [];
  let nivel = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\'' || c === '"' || c === '`') {
      const l = literal(s, j);
      if (!l) { // plantilla con ${}: se salta completa
        let k = j + 1;
        while (k < s.length && s[k] !== '`') k += s[k] === '\\' ? 2 : 1;
        j = k;
        continue;
      }
      r.push(l.texto);
      j = l.fin - 1;
    } else if (c === '(' || c === '[' || c === '{') nivel++;
    else if (c === ')' || c === ']' || c === '}') { if (--nivel === 0) break; }
  }
  return r;
}

function sinComentarios(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/^\s*\/\/.*$/gm, '');
}

export function textosDelJuego() {
  const textos = new Set();
  const archivos = [
    ...readdirSync(join(RAIZ, 'js')).filter((f) => f.endsWith('.js')).map((f) => join(RAIZ, 'js', f)),
    ...readdirSync(join(RAIZ, 'js', 'data')).filter((f) => f.endsWith('.js')).map((f) => join(RAIZ, 'js', 'data', f)),
  ];
  for (const archivo of archivos) {
    const s = sinComentarios(readFileSync(archivo, 'utf8'));
    // t('…')  y  g('…', '…')
    for (const m of s.matchAll(/(?<![\w.$])(t|g)\(\s*(?=['"`])/g)) {
      const i = m.index + m[0].length;
      if (m[1] === 't') {
        const l = literal(s, i);
        if (l) textos.add(l.texto);
      } else {
        literalesHastaCerrar(s, m.index + 1).forEach((x) => textos.add(x));
      }
    }
    // tl([...]) / tl({...})
    for (const m of s.matchAll(/(?<![\w.$])tl\(/g)) literalesHastaCerrar(s, m.index + 2).forEach((x) => textos.add(x));
    // Campos de datos traducidos con traducirDatos()
    if (/traducirDatos\(/.test(s) && !archivo.endsWith('idioma.js')) {
      for (const m of s.matchAll(new RegExp(`\\b(${CAMPOS.join('|')})\\s*:\\s*(?=['"\`\\[])`, 'g'))) {
        const i = m.index + m[0].length;
        if (s[i] === '[') literalesHastaCerrar(s, i).forEach((x) => textos.add(x));
        else { const l = literal(s, i); if (l) textos.add(l.texto); }
      }
    }
  }
  // index.html
  const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<[^>]*\bdata-t\b[^>]*>([^<]*)</g)) textos.add(m[1].trim());
  for (const m of html.matchAll(/<[^>]*\bdata-t-titulo\b[^>]*>/g)) {
    for (const a of m[0].matchAll(/(?:title|aria-label)="([^"]*)"/g)) textos.add(a[1]);
  }
  // Bienvenida pública (config.js)
  const config = readFileSync(join(RAIZ, 'js', 'config.js'), 'utf8');
  const bienvenida = config.match(/mensajeBienvenidaPublico:\s*(?=')/);
  if (bienvenida) textos.add(literal(config, bienvenida.index + bienvenida[0].length).texto);

  textos.delete('');
  // Solo lo que tiene letras (y la coma con que se juntan las listas: en japonés es '、')
  return [...textos].filter((x) => /\p{L}/u.test(x) || x === ', ').sort((a, b) => a.localeCompare(b, 'es'));
}

const IDIOMAS = ['en', 'fr', 'pt', 'de', 'ja', 'ko'];

async function diccionario(id) {
  try { return (await import(pathToFileURL(join(RAIZ, 'js', 'idiomas', `${id}.js`)))).default; } catch { return {}; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const todos = textosDelJuego();
  const arg = process.argv[2];
  if (arg === '--todos') {
    console.log(JSON.stringify(todos, null, 1));
  } else if (arg) {
    const d = await diccionario(arg);
    console.log(JSON.stringify(todos.filter((x) => !(x in d)), null, 1));
  } else {
    console.log(`${todos.length} textos en el juego`);
    for (const id of IDIOMAS) {
      const d = await diccionario(id);
      const faltan = todos.filter((x) => !(x in d)).length;
      const sobran = Object.keys(d).filter((x) => !todos.includes(x)).length;
      console.log(`  ${id}: faltan ${faltan}${sobran ? `, sobran ${sobran} (ya no se usan)` : ''}`);
    }
  }
}

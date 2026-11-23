#!/usr/bin/env node
/*
 * Sube las migraciones de supabase/migrations/ a un proyecto Supabase nuevo.
 * Uso:  node scripts/subir-migraciones.cjs "postgresql://postgres:CLAVE@db.upqtualahrhosyqretde.supabase.co:5432/postgres"
 * Requiere el cliente `psql` instalado. No toca el codigo de la app.
 *
 * 1) Ejecuta primero *_portabilidad_tablas_base.sql.
 * 2) Recorre el resto en orden; si una falla (dependencia que se crea mas adelante)
 *    la deja pendiente y reintenta en la siguiente pasada, hasta que no haya progreso.
 * 3) Registra cada migracion aplicada en supabase_migrations.schema_migrations.
 *    Las que sigan fallando se marcan como aplicadas solo con --forzar (obsoletas).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const url = process.argv[2];
const forzar = process.argv.includes("--forzar");
if (!url || url.startsWith("--")) {
  console.error('Falta la URL de conexion: node scripts/subir-migraciones.cjs "postgresql://..."');
  process.exit(1);
}
const dir = path.join(__dirname, "..", "supabase", "migrations");

const os = require("os");
const usaPsql = !spawnSync("psql", ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).error
  && spawnSync("psql", ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).status === 0;
console.log(usaPsql ? "Usando psql." : "psql no esta instalado: usando npx supabase db query.");

// Ejecuta SQL con psql o, si no existe, con `npx supabase db query` (archivo temporal).
function ejecutarSql(texto) {
  if (usaPsql) {
    return spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q"], { encoding: "utf8", input: texto });
  }
  const tmp = path.join(os.tmpdir(), `mig-${process.pid}-${Date.now()}.sql`);
  fs.writeFileSync(tmp, texto);
  try {
    return spawnSync("npx", ["--yes", "supabase", "db", "query", "--db-url", url, "-f", tmp], {
      encoding: "utf8", shell: process.platform === "win32",
    });
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) { /* ignorar */ }
  }
}
function psql(args, input) {
  // Consulta de lectura: devuelve las filas como texto (una por linea).
  if (usaPsql) return spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", input });
  const consulta = args[args.length - 1];
  const r = ejecutarSql(consulta);
  const filas = [];
  try {
    const j = JSON.parse(r.stdout);
    const lista = Array.isArray(j) ? j : j.rows || j.result || [];
    lista.forEach((x) => filas.push(Object.values(x)[0]));
    r.stdout = filas.join("\n");
  } catch (_) {
    r.stdout = (r.stdout || "").split("\n").filter((l) => /^\d{6,}$/.test(l.trim())).join("\n");
  }
  return r;
}
function sql(texto) {
  return ejecutarSql(texto);
}

const prueba = ejecutarSql("select 1");
if (prueba.error || prueba.status !== 0) {
  console.error("No se pudo conectar:", prueba.error ? prueba.error.message : prueba.stderr);
  process.exit(1);
}

sql(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);

const aplicadas = new Set(
  (psql(["-At", "-c", "select version from supabase_migrations.schema_migrations"]).stdout || "")
    .split("\n").map((s) => s.trim()).filter(Boolean)
);

const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const temporales = archivos.filter((f) => /^BLOQUE_/i.test(f));
if (temporales.length) console.warn("Aviso: archivos temporales ignorados:", temporales.join(", "));
const prefijos = {};
archivos.forEach((f) => { const p = f.split("_")[0]; (prefijos[p] = prefijos[p] || []).push(f); });
Object.entries(prefijos).filter(([, v]) => v.length > 1).forEach(([p, v]) => console.warn("Aviso: prefijo duplicado", p, v.join(", ")));

const validos = archivos.filter((f) => !/^BLOQUE_/i.test(f));
const base = validos.filter((f) => /portabilidad_tablas_base/.test(f));
const resto = validos.filter((f) => !base.includes(f));
let pendientes = [...base, ...resto].filter((f) => !aplicadas.has(f.split("_")[0]));

function aplicar(f) {
  const contenido = fs.readFileSync(path.join(dir, f), "utf8");
  const r = sql("begin;\n" + contenido + "\n;commit;");
  if (r.status !== 0) { sql("rollback;"); return r.stderr.trim().split("\n").pop(); }
  const version = f.split("_")[0];
  const nombre = f.replace(/\.sql$/, "").slice(version.length + 1).replace(/'/g, "''");
  sql(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}','${nombre}') on conflict do nothing;`);
  return null;
}

let pasada = 0;
while (pendientes.length) {
  pasada++;
  const fallaron = [];
  let ok = 0;
  for (const f of pendientes) {
    const err = aplicar(f);
    if (err) fallaron.push({ f, err }); else { ok++; console.log("OK  ", f); }
  }
  console.log(`Pasada ${pasada}: ${ok} aplicadas, ${fallaron.length} pendientes`);
  if (ok === 0) {
    console.log("Sin progreso. Migraciones con error:");
    fallaron.forEach(({ f, err }) => console.log(" -", f, "=>", err));
    if (forzar) {
      fallaron.forEach(({ f }) => {
        const v = f.split("_")[0];
        sql(`insert into supabase_migrations.schema_migrations (version, name) values ('${v}','forzada') on conflict do nothing;`);
      });
      console.log("Marcadas como aplicadas por --forzar.");
    }
    process.exit(fallaron.length && !forzar ? 2 : 0);
  }
  pendientes = fallaron.map((x) => x.f);
}
console.log("Todas las migraciones quedaron aplicadas.");

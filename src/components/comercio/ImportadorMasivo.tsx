import { useMemo, useRef, useState } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel } from "@/lib/exportes";

type Fila = Record<string, string>;

const num = (s: string): number => {
  const n = Number((s ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
};

/** Parte una línea CSV respetando comillas ("a;b" no se parte por dentro). */
function partirLinea(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        comillas = !comillas;
      }
    } else if (c === sep && !comillas) {
      celdas.push(actual.trim());
      actual = "";
    } else {
      actual += c;
    }
  }
  celdas.push(actual.trim());
  return celdas;
}

function parsearCSV(texto: string): { columnas: string[]; filas: Fila[] } {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) return { columnas: [], filas: [] };
  const sep = (lineas[0].match(/;/g) ?? []).length >= (lineas[0].match(/,/g) ?? []).length ? ";" : ",";
  const columnas = partirLinea(lineas[0], sep).map((c) => c.toLowerCase());
  const filas: Fila[] = lineas.slice(1).map((l) => {
    const celdas = partirLinea(l, sep);
    const f: Fila = {};
    columnas.forEach((c, i) => {
      f[c] = celdas[i] ?? "";
    });
    return f;
  });
  return { columnas, filas };
}

const PLANTILLA_COLUMNAS = ["nombre", "precio_detal", "stock", "codigo_barras", "sku", "costo", "stock_minimo"];

type ErrorFila = { linea: number; problema: string };

/**
 * Importador masivo de productos desde Excel/CSV.
 * La plantilla se descarga en un clic; el archivo se lee en el navegador,
 * se muestra vista previa con errores y solo las filas válidas se guardan.
 */
export function ImportadorMasivo({ alTerminar }: { alTerminar: () => void }) {
  const archivo = useRef<HTMLInputElement | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [errores, setErrores] = useState<ErrorFila[]>([]);
  const [guardando, setGuardando] = useState(false);

  const descargarPlantilla = () => {
    exportarExcel("plantilla-productos", PLANTILLA_COLUMNAS, [
      ["Pan francés x5", 2500, 100, "7701234000011", "PAN-FRA-5", 1200, 10],
      ["Leche bolsa 1L", 3800, 50, "7701234000028", "LEC-BOL-1L", 2900, 5],
    ]);
    toast.success("Plantilla descargada: llénala y vuelve a subirla aquí.");
  };

  const leerArchivo = async (f: File) => {
    const texto = await f.text();
    const { columnas, filas: leidas } = parsearCSV(texto);
    if (leidas.length === 0) {
      setFilas([]);
      setErrores([{ linea: 0, problema: "No se encontraron filas. Descarga la plantilla y revisa el formato." }]);
      return;
    }
    if (!columnas.includes("nombre")) {
      setFilas([]);
      setErrores([{ linea: 0, problema: "Falta la columna «nombre». Usa la plantilla descargada." }]);
      return;
    }
    const errs: ErrorFila[] = [];
    leidas.forEach((r, i) => {
      const linea = i + 2;
      if (!r.nombre || r.nombre.trim().length < 2) errs.push({ linea, problema: "Sin nombre de producto." });
      if (r.precio_detal !== undefined && r.precio_detal !== "" && !(num(r.precio_detal) >= 0))
        errs.push({ linea, problema: `Precio no válido: «${r.precio_detal}».` });
      if (r.stock !== undefined && r.stock !== "" && !(num(r.stock) >= 0))
        errs.push({ linea, problema: `Stock no válido: «${r.stock}».` });
      if (r.costo !== undefined && r.costo !== "" && !(num(r.costo) >= 0))
        errs.push({ linea, problema: `Costo no válido: «${r.costo}».` });
    });
    setFilas(leidas);
    setErrores(errs);
  };

  const validas = useMemo(() => {
    const lineasMal = new Set(errores.map((e) => e.linea));
    return filas.filter((_, i) => !lineasMal.has(i + 2));
  }, [filas, errores]);

  const guardar = async () => {
    if (validas.length === 0) return toast.error("No hay filas válidas para importar.");
    setGuardando(true);
    let ok = 0;
    // Lotes de 100 para no saturar la conexión.
    for (let i = 0; i < validas.length; i += 100) {
      const lote = validas.slice(i, i + 100).map((r) => ({
        nombre: r.nombre.trim(),
        precio_detal: r.precio_detal !== "" ? num(r.precio_detal) || 0 : 0,
        stock: r.stock !== "" ? num(r.stock) || 0 : 0,
        codigo_barras: r.codigo_barras?.trim() || null,
        sku: r.sku?.trim() || null,
        costo: r.costo !== "" ? num(r.costo) || 0 : 0,
        stock_minimo: r.stock_minimo !== "" ? num(r.stock_minimo) || 0 : 0,
      }));
      const { error } = await supabase.from("com_productos").insert(lote);
      if (error) {
        setGuardando(false);
        return toast.error("Se detuvo en el lote con error: revisa códigos repetidos.");
      }
      ok += lote.length;
    }
    setGuardando(false);
    toast.success(`${ok} productos importados.`);
    setFilas([]);
    setErrores([]);
    if (archivo.current) archivo.current.value = "";
    alTerminar();
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <h2 className="font-medium text-foreground">Importar desde Excel o CSV</h2>
      <p className="text-sm text-muted-foreground">
        Descarga la plantilla, llénala con tus productos y súbela aquí. Revisamos los errores antes de guardar.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={descargarPlantilla}
          className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40"
        >
          <Download className="h-4 w-4" /> Descargar plantilla
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <FileUp className="h-4 w-4" /> Elegir archivo (.csv, .xls, .xlsx)
          <input
            ref={archivo}
            type="file"
            accept=".csv,.txt,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivo(f);
            }}
          />
        </label>
      </div>
      {filas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-foreground">
            {filas.length} filas leídas · {validas.length} válidas
            {errores.length > 0 && <span className="text-destructive"> · {errores.length} con error</span>}
          </p>
          {errores.slice(0, 6).map((e, i) => (
            <p key={i} className="text-xs text-destructive">
              Fila {e.linea}: {e.problema}
            </p>
          ))}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-glass-border p-2">
            {filas.slice(0, 8).map((r, i) => (
              <p key={i} className="truncate text-xs text-muted-foreground">
                {i + 2}. {r.nombre || "(sin nombre)"} · ${r.precio_detal || "0"} · stock {r.stock || "0"}
              </p>
            ))}
          </div>
          <button
            type="button"
            disabled={guardando || validas.length === 0}
            onClick={guardar}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? "Guardando…" : `Guardar ${validas.length} productos`}
          </button>
        </div>
      )}
    </GlassPanel>
  );
}

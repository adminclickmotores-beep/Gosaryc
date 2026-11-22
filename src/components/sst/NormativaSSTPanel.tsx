import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Cargando, Encabezado, boton, botonSec, campo } from "@/components/comercio/ComercioModulos";
import { exportarExcel } from "@/lib/exportes";
import { SECTORIALES_SST } from "@/lib/sst-normativa";
import { sstNormativaActualizar } from "@/lib/sst-normativa.functions";

type Norma = Tables<"sst_normas">;

export function NormativaSSTPanel() {
  const [lista, setLista] = useState<Norma[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState("");
  const [propiaCodigo, setPropiaCodigo] = useState("");
  const [propiaTitulo, setPropiaTitulo] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_normas").select("*").order("origen").order("codigo").limit(100);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const actualizar = async () => {
    setBuscando(true);
    try {
      const r = await sstNormativaActualizar({ data: { anio: new Date().getFullYear() } });
      toast.success(r.verificadaIA ? `Normativa SST verificada con IA: ${r.total} normas vigentes.` : `Normativa SST guardada: ${r.total} normas vigentes.`);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la normativa.");
    } finally {
      setBuscando(false);
    }
  };

  const agregar = async (n: { codigo: string; titulo: string; tema: string; resumen: string; fuente: string }) => {
    const { error } = await supabase.from("sst_normas").upsert(
      { codigo: n.codigo, titulo: n.titulo, tema: n.tema, resumen: n.resumen, fuente: n.fuente, estado: "Vigente", origen: "sectorial", ultima_actualizacion: new Date().toISOString() },
      { onConflict: "owner_id,codigo" },
    );
    if (error) { toast.error("No se pudo agregar la norma."); return; }
    toast.success("Norma sectorial agregada.");
    await cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="Cerebro SST + normativa Colombia 2026" texto="El asistente de este módulo actúa como Especialista SST y cita siempre estas normas vigentes al generar profesiogramas, matrices GTC 45, listas de la Res. 0312 y certificados médicos. Pulsa el botón para verificar y guardar la matriz." />
      <button type="button" className={boton} disabled={buscando} onClick={() => void actualizar()}>
        {buscando ? "Actualizando…" : "Actualizar normativa SST Colombia (IA)"}
      </button>
      <div className="mt-3 space-y-2">
        {lista.map((n) => (
          <div key={n.id} className="rounded-xl border border-glass-border p-3">
            <p className="break-words font-semibold">{n.titulo}</p>
            <p className="text-xs text-muted-foreground">{n.resumen} · {n.fuente}</p>
            {n.nota && <p className="text-xs text-muted-foreground">Nota: {n.nota}</p>}
            <p className="mt-1 text-xs">
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">{n.estado}</span>
              <span className="ml-2 text-muted-foreground">Verificada: {n.ultima_actualizacion.slice(0, 10)}{n.origen === "sectorial" ? " · sectorial" : ""}</span>
            </p>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Pulsa el botón para cargar la normativa vigente 2026.</p>}
      </div>

      <div className="mt-4 rounded-xl border border-glass-border p-3">
        <p className="mb-2 text-sm font-semibold">Agregar norma sectorial</p>
        <div className="flex flex-wrap gap-2">
          <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Elegir norma sugerida…</option>
            {SECTORIALES_SST.map((n) => <option key={n.codigo} value={n.codigo}>{n.titulo}</option>)}
          </select>
          <button type="button" className={botonSec} disabled={!sel} onClick={() => {
            const n = SECTORIALES_SST.find((x) => x.codigo === sel);
            if (n) void agregar(n).then(() => setSel(""));
          }}>Agregar</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className={campo} placeholder="Código (ej. RES-1234-2024)" maxLength={80} value={propiaCodigo} onChange={(e) => setPropiaCodigo(e.target.value)} />
          <input className={campo} placeholder="Título de la norma" maxLength={200} value={propiaTitulo} onChange={(e) => setPropiaTitulo(e.target.value)} />
          <button type="button" className={botonSec} disabled={propiaCodigo.trim().length < 3 || propiaTitulo.trim().length < 4} onClick={() => {
            void agregar({ codigo: propiaCodigo.trim().toUpperCase(), titulo: propiaTitulo.trim(), tema: "Sectorial", resumen: "Norma sectorial agregada por el usuario.", fuente: "Agregada manualmente" }).then(() => { setPropiaCodigo(""); setPropiaTitulo(""); });
          }}>Agregar otra</button>
        </div>
      </div>

      <button type="button" className={`${botonSec} mt-3`} onClick={() => void exportarExcel("normativa-sst", ["Norma", "Resumen", "Fuente", "Estado", "Verificada"], lista.map((n) => [n.titulo, n.resumen, n.fuente, n.estado, n.ultima_actualizacion.slice(0, 10)]))}>Exportar Excel</button>
    </GlassPanel>
  );
}

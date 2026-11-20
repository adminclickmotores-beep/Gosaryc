import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bike, Car, FileText, FolderOpen, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { abrirArchivoPrivado } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Vehiculo = Tables<"vehiculos_inventario">;
type Documento = Tables<"documentos_vehiculo">;

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const TIPOS = [
  "Tarjeta de propiedad", "SOAT", "Tecnomecánica", "Seguro todo riesgo", "Contrato de compraventa",
  "Traspaso", "Cédula del propietario", "Peritaje", "Factura de compra", "Otro",
];

const etiqueta = (v: Vehiculo) =>
  [v.tipo === "moto" ? "Moto" : "Carro", v.marca, v.modelo, v.anio, v.placa].filter(Boolean).join(" ");

export function DocumentosVehiculos() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [seleccion, setSeleccion] = useState("");
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const [v, d] = await Promise.all([
      supabase.from("vehiculos_inventario").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("documentos_vehiculo").select("*").order("created_at", { ascending: false }).limit(2000),
    ]);
    if (v.error || d.error) toast.error("No se pudieron cargar los documentos.");
    setVehiculos(v.data ?? []);
    setDocs(d.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const vehiculo = vehiculos.find((v) => v.id === seleccion) ?? null;
  const docsVehiculo = docs.filter((d) => d.vehiculo_id === seleccion);

  const subir = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0 || !seleccion) return;
    setSubiendo(true);
    const { data: negocioId, error: errId } = await supabase.rpc("mi_negocio_id");
    if (errId || !negocioId) {
      setSubiendo(false);
      return toast.error("No se pudo identificar tu negocio.");
    }
    let subidos = 0;
    for (const archivo of Array.from(archivos)) {
      const valido = archivo.type.startsWith("image/") || archivo.type === "application/pdf";
      if (!valido) { toast.error("Sube solo imágenes o PDF."); continue; }
      if (archivo.size > 10 * 1024 * 1024) { toast.error(`${archivo.name} pesa más de 10 MB.`); continue; }
      const ext = (archivo.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const ruta = `${negocioId}/vehiculo-${seleccion}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("creditos_docs").upload(ruta, archivo);
      if (error) { toast.error(`No se pudo subir ${archivo.name}.`); continue; }
      const { error: errFila } = await supabase
        .from("documentos_vehiculo")
        .insert({ vehiculo_id: seleccion, tipo, nombre: archivo.name, ruta });
      if (errFila) {
        await supabase.storage.from("creditos_docs").remove([ruta]);
        toast.error(`No se pudo guardar ${archivo.name}.`);
        continue;
      }
      subidos += 1;
    }
    setSubiendo(false);
    if (subidos) toast.success(subidos === 1 ? "Documento guardado en la nube." : `${subidos} documentos guardados en la nube.`);
    cargar();
  };

  const abrir = async (d: Documento) => {
    if (!(await abrirArchivoPrivado("creditos_docs", d.ruta))) toast.error("No se pudo abrir el documento.");
  };

  const borrar = async (d: Documento) => {
    if (!window.confirm(`¿Eliminar "${d.nombre}"?`)) return;
    await supabase.storage.from("creditos_docs").remove([d.ruta]);
    const { error } = await supabase.from("documentos_vehiculo").delete().eq("id", d.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <FolderOpen className="h-7 w-7 text-primary" /> Documentos del vehículo
        </h1>
        <p className="text-sm text-muted-foreground">
          Guarda en la nube la tarjeta de propiedad, SOAT, tecnomecánica, contratos y demás papeles de cada vehículo del inventario.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <h2 className="font-medium text-foreground">Vehículos</h2>
          {cargando && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!cargando && vehiculos.length === 0 && (
            <p className="text-sm text-muted-foreground">Primero registra un vehículo en el inventario.</p>
          )}
          <ul className="space-y-2">
            {vehiculos.map((v) => {
              const n = docs.filter((d) => d.vehiculo_id === v.id).length;
              const Icono = v.tipo === "moto" ? Bike : Car;
              return (
                <li key={v.id}>
                  <button
                    onClick={() => setSeleccion(v.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${seleccion === v.id ? "border-primary bg-primary/10" : "border-glass-border hover:bg-glass/40"}`}
                  >
                    <Icono className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 break-words text-sm text-foreground">{etiqueta(v)}</span>
                    <span className="shrink-0 rounded-full bg-glass/60 px-2 py-0.5 text-xs text-muted-foreground">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </GlassPanel>

        <GlassPanel className="min-w-0 space-y-4 p-5">
          {!vehiculo ? (
            <p className="text-sm text-muted-foreground">Elige un vehículo para ver y subir sus documentos.</p>
          ) : (
            <>
              <div>
                <h2 className="break-words font-medium text-foreground">{etiqueta(vehiculo)}</h2>
                <p className="text-xs text-muted-foreground">{docsVehiculo.length} documento(s) guardados</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${campo} sm:w-auto`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Paperclip className="h-4 w-4" /> {subiendo ? "Subiendo..." : "Subir documento"}
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" disabled={subiendo}
                    onChange={(e) => { subir(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Imágenes o PDF de hasta 10 MB. Quedan privados en la nube.</p>
              {docsVehiculo.length === 0 && <p className="text-sm text-muted-foreground">Este vehículo aún no tiene documentos.</p>}
              <ul className="space-y-2">
                {docsVehiculo.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-glass-border px-3 py-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <button onClick={() => abrir(d)} className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-foreground">{d.tipo}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.nombre} · {new Date(d.created_at).toLocaleDateString("es-CO")}
                      </span>
                    </button>
                    <button onClick={() => borrar(d)} aria-label="Eliminar documento" className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

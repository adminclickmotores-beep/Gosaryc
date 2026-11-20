import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { FotoPrivada } from "@/components/vehiculos/FotoPrivada";
import { quitarFotoPrivada, subirFotoPrivada, urlFirmada } from "@/lib/fotos-vehiculos";

type Vehiculo = Tables<"vehiculos_inventario">;
type Gasto = Tables<"vehiculo_gastos">;
type Movimiento = Tables<"vehiculo_movimientos">;
type Documento = Tables<"documentos_vehiculo">;
type Cotizacion = Tables<"cotizaciones_vehiculo">;
type Retoma = Tables<"retomas_vehiculos">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

export const CATEGORIAS_GASTO = [
  { clave: "reparacion", texto: "Reparación" },
  { clave: "alistamiento", texto: "Alistamiento" },
  { clave: "tramites", texto: "Trámites" },
  { clave: "otro", texto: "Otro gasto" },
];

export const PROCEDENCIAS: Record<string, string> = {
  compra: "Compra",
  retoma: "Retoma",
  consignacion: "Consignación",
  propio: "Vehículo propio",
};

/** Costo total = adquisición + todos los gastos. Utilidad real solo cuando ya se vendió. */
export function calcularCostos(v: Vehiculo, gastos: number) {
  const adquisicion = v.precio_compra ?? 0;
  const costoTotal = adquisicion + gastos;
  const vendido = v.estado === "vendido" || v.estado === "entregado";
  const precioBase = vendido ? v.precio_venta_final ?? v.precio : v.precio;
  return { adquisicion, costoTotal, utilidad: precioBase - costoTotal, vendido };
}

export const TIPOS_DOCUMENTO = [
  "Tarjeta de propiedad", "SOAT", "Tecnomecánica", "Seguro todo riesgo", "Contrato de compraventa",
  "Traspaso", "Cédula del propietario", "Peritaje", "Factura de compra", "Otro",
];

type PermisosFicha = { editar: boolean; retirar: boolean; gastos: boolean; costos: boolean };

export function FichaVehiculo({
  vehiculo, perm, onCerrar, onEditar, onCambio, onRetirar,
}: {
  vehiculo: Vehiculo; perm: PermisosFicha; onCerrar: () => void; onEditar: () => void; onCambio: () => void; onRetirar: () => void;
}) {
  const [tipoDoc, setTipoDoc] = useState(TIPOS_DOCUMENTO[0]);
  const [subiendo, setSubiendo] = useState(false);
  const [vista, setVista] = useState<{ url: string; nombre: string; pdf: boolean } | null>(null);
  const [fotosLocal, setFotosLocal] = useState<string[]>(vehiculo.fotos ?? []);
  useEffect(() => setFotosLocal(vehiculo.fotos ?? []), [vehiculo.fotos]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [cotis, setCotis] = useState<Cotizacion[]>([]);
  const [retomas, setRetomas] = useState<Retoma[]>([]);
  const [cat, setCat] = useState("reparacion");
  const [desc, setDesc] = useState("");
  const [monto, setMonto] = useState("");
  const [prov, setProv] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const id = vehiculo.id;
    const [g, m, d, c, r] = await Promise.all([
      supabase.from("vehiculo_gastos").select("*").eq("vehiculo_id", id).order("fecha", { ascending: false }),
      supabase.from("vehiculo_movimientos").select("*").eq("vehiculo_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("documentos_vehiculo").select("*").eq("vehiculo_id", id).order("created_at", { ascending: false }),
      supabase.from("cotizaciones_vehiculo").select("*").eq("vehiculo_id", id).order("created_at", { ascending: false }),
      supabase.from("retomas_vehiculos").select("*").eq("vehiculo_id", id).order("created_at", { ascending: false }),
    ]);
    setGastos(g.data ?? []);
    setMovs(m.data ?? []);
    setDocs(d.data ?? []);
    setCotis(c.data ?? []);
    setRetomas(r.data ?? []);
  }, [vehiculo.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const { adquisicion, costoTotal, utilidad, vendido } = calcularCostos(vehiculo, totalGastos);

  const agregarGasto = async () => {
    const valor = Number(monto);
    if (!desc.trim()) return toast.error("Describe el gasto.");
    if (!Number.isFinite(valor) || valor <= 0) return toast.error("Escribe un valor mayor a cero.");
    setGuardando(true);
    const { error } = await supabase.from("vehiculo_gastos").insert({
      vehiculo_id: vehiculo.id, categoria: cat, descripcion: desc.trim(), monto: valor, proveedor: prov.trim() || null,
    });
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar el gasto.");
    setDesc(""); setMonto(""); setProv("");
    await cargar();
    onCambio();
  };

  const borrarGasto = async (g: Gasto) => {
    if (!window.confirm(`¿Eliminar el gasto “${g.descripcion}”?`)) return;
    const { error } = await supabase.from("vehiculo_gastos").delete().eq("id", g.id);
    if (error) return toast.error("No se pudo eliminar el gasto.");
    await cargar();
    onCambio();
  };

  const abrirDoc = async (d: Documento) => {
    const local = await urlLocalPrivada("creditos_docs", d.ruta);
    if (!local) return toast.error("No se pudo abrir el documento.");
    setVista({ url: local, nombre: d.nombre, pdf: d.ruta.toLowerCase().endsWith(".pdf") });
  };

  const subirFotos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    if (!perm.editar) return toast.error("No tienes permiso para editar este vehículo.");
    setSubiendo(true);
    const { data: negocioId } = await supabase.rpc("mi_negocio_id");
    if (!negocioId) { setSubiendo(false); return toast.error("No se pudo identificar tu negocio."); }
    const nuevas: string[] = [];
    for (const a of Array.from(archivos)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(a.type)) { toast.error(`${a.name}: usa JPG, PNG o WEBP.`); continue; }
      if (a.size > 4 * 1024 * 1024) { toast.error(`${a.name} pesa más de 4 MB.`); continue; }
      const ruta = await subirFotoPrivada(a, negocioId, vehiculo.id);
      if (!ruta) { toast.error(`No se pudo subir ${a.name}.`); continue; }
      nuevas.push(ruta);
    }
    if (nuevas.length > 0) {
      const lista = [...fotosLocal, ...nuevas];
      const { error } = await supabase.from("vehiculos_inventario").update({ fotos: lista }).eq("id", vehiculo.id);
      if (error) toast.error("No se pudieron guardar las fotos en el vehículo.");
      else { setFotosLocal(lista); toast.success("Fotos guardadas."); onCambio(); }
    }
    setSubiendo(false);
  };

  const quitarFoto = async (url: string) => {
    if (!perm.editar) return toast.error("No tienes permiso para editar este vehículo.");
    if (!window.confirm("¿Quitar esta foto del vehículo?")) return;
    const lista = fotosLocal.filter((u) => u !== url);
    const { error } = await supabase.from("vehiculos_inventario").update({ fotos: lista }).eq("id", vehiculo.id);
    if (error) return toast.error("No se pudo quitar la foto.");
    await quitarFotoPrivada(url);
    setFotosLocal(lista);
    onCambio();
  };

  const subirDocs = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    if (!perm.editar) return toast.error("No tienes permiso para adjuntar documentos.");
    setSubiendo(true);
    const { data: negocioId } = await supabase.rpc("mi_negocio_id");
    if (!negocioId) { setSubiendo(false); return toast.error("No se pudo identificar tu negocio."); }
    let ok = 0;
    for (const a of Array.from(archivos)) {
      if (!(a.type.startsWith("image/") || a.type === "application/pdf")) { toast.error(`${a.name}: solo imágenes o PDF.`); continue; }
      if (a.size > 10 * 1024 * 1024) { toast.error(`${a.name} pesa más de 10 MB.`); continue; }
      const ext = (a.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const ruta = `${negocioId}/vehiculo-${vehiculo.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("creditos_docs").upload(ruta, a);
      if (error) { toast.error(`No se pudo subir ${a.name}.`); continue; }
      const { error: e2 } = await supabase.from("documentos_vehiculo").insert({ vehiculo_id: vehiculo.id, tipo: tipoDoc, nombre: a.name, ruta });
      if (e2) { await supabase.storage.from("creditos_docs").remove([ruta]); toast.error(`No se pudo guardar ${a.name}.`); continue; }
      ok += 1;
    }
    setSubiendo(false);
    if (ok) toast.success(ok === 1 ? "Documento guardado." : `${ok} documentos guardados.`);
    cargar();
  };

  const borrarDoc = async (d: Documento) => {
    if (!perm.editar) return toast.error("No tienes permiso para eliminar documentos.");
    if (!window.confirm(`¿Eliminar "${d.nombre}"?`)) return;
    const { error } = await supabase.from("documentos_vehiculo").delete().eq("id", d.id);
    if (error) return toast.error("No se pudo eliminar el documento.");
    await supabase.storage.from("creditos_docs").remove([d.ruta]);
    if (vista?.nombre === d.nombre) setVista(null);
    cargar();
  };

  const fila = (k: string, v: string | number | null) =>
    v === null || v === "" ? null : (
      <div key={k} className="flex justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{k}</span>
        <span className="break-words text-right text-foreground">{v}</span>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-sm sm:p-6">
      <GlassPanel className="w-full max-w-3xl space-y-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words font-display text-2xl text-foreground">
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.linea ?? ""} {vehiculo.anio ?? ""}
            </h2>
            <p className="text-xs text-muted-foreground">
              {PROCEDENCIAS[vehiculo.procedencia] ?? vehiculo.procedencia} · {vehiculo.placa ?? "Sin placa"} · Estado: {vehiculo.estado}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {perm.editar && !vehiculo.eliminado_en && <button onClick={onEditar} className="rounded-lg border border-glass-border px-3 py-1.5 text-sm text-primary">Editar</button>}
            {perm.retirar && !vehiculo.eliminado_en && <button onClick={onRetirar} className="rounded-lg border border-glass-border px-3 py-1.5 text-sm text-destructive">Retirar</button>}
            <button onClick={onCerrar} aria-label="Cerrar" className="rounded-lg border border-glass-border p-1.5 text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Fotografías</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {fotosLocal.map((u) => (
              <div key={u} className="relative shrink-0">
                <button type="button" onClick={async () => { const s = await urlFirmada(u); if (s) window.open(s, "_blank", "noopener"); else toast.error("No se pudo abrir la foto."); }}>
                  <FotoPrivada valor={u} className="h-28 w-40 rounded-lg object-cover" />
                </button>
                {perm.editar && (
                  <button onClick={() => quitarFoto(u)} aria-label="Quitar foto" className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {perm.editar && (
              <label className="flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-glass-border px-2 text-center text-xs text-muted-foreground">
                {subiendo ? "Subiendo…" : "Agregar fotos"}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={subiendo} onChange={(e) => { subirFotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          {fotosLocal.length === 0 && <p className="text-xs text-muted-foreground">Sin fotografías todavía (JPG, PNG o WEBP, hasta 4 MB).</p>}
        </div>

        {vehiculo.eliminado_en && (
          <p className="rounded-lg border border-glass-border p-3 text-sm text-muted-foreground">
            Retirado del inventario el {new Date(vehiculo.eliminado_en).toLocaleDateString("es-CO")}
            {vehiculo.motivo_retiro ? `: ${vehiculo.motivo_retiro}` : ""}. Su historial y sus costos se conservan.
          </p>
        )}

        {perm.costos && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Adquisición</p><p className="text-sm font-medium text-foreground">{dinero(adquisicion)}</p></div>
          <div><p className="text-xs text-muted-foreground">Gastos</p><p className="text-sm font-medium text-foreground">{dinero(totalGastos)}</p></div>
          <div><p className="text-xs text-muted-foreground">Costo total</p><p className="text-sm font-medium text-foreground">{dinero(costoTotal)}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">{vendido ? "Utilidad real" : "Utilidad proyectada"}</p>
            <p className={`text-sm font-medium ${utilidad < 0 ? "text-destructive" : "text-foreground"}`}>{dinero(utilidad)}</p>
          </div>
        </div>
        )}
        {perm.costos && vehiculo.procedencia === "consignacion" && (
          <p className="text-xs text-muted-foreground">Vehículo en consignación: el costo de adquisición suele ser 0 hasta pactar lo que se le paga al propietario.</p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">Identificación</h3>
            {[
              fila("Placa", vehiculo.placa), fila("VIN", vehiculo.vin), fila("Chasis", vehiculo.chasis),
              fila("Motor", vehiculo.motor_numero), fila("Versión", vehiculo.version), fila("Color", vehiculo.color),
              fila("Kilometraje", vehiculo.kilometraje !== null ? `${vehiculo.kilometraje.toLocaleString("es-CO")} km` : null),
              fila("Combustible", vehiculo.combustible), fila("Transmisión", vehiculo.transmision),
              fila("Matriculado en", vehiculo.ciudad_matricula), fila("SOAT vence", vehiculo.soat_vence),
              fila("Tecnomecánica vence", vehiculo.tecnomecanica_vence), fila("Ingreso", vehiculo.fecha_ingreso),
              fila("Venta", vehiculo.fecha_venta),
            ]}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-medium text-foreground">Propietario y precios</h3>
            {[
              fila("Propietario", vehiculo.propietario_nombre), fila("Documento", vehiculo.propietario_documento),
              fila("Teléfono", vehiculo.propietario_telefono), fila("Correo", vehiculo.propietario_email),
              fila("Precio de venta", dinero(vehiculo.precio)),
              fila("Precio final de venta", vehiculo.precio_venta_final !== null ? dinero(vehiculo.precio_venta_final) : null),
            ]}
            {!vehiculo.propietario_nombre && <p className="text-xs text-muted-foreground">Sin datos de propietario registrados.</p>}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Gastos, reparaciones y alistamiento</h3>
          {!perm.gastos && !perm.costos && <p className="text-xs text-muted-foreground">No tienes permiso para ver ni registrar gastos.</p>}
          {perm.gastos && !vehiculo.eliminado_en && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select className={campo} value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIAS_GASTO.map((c) => <option key={c.clave} value={c.clave}>{c.texto}</option>)}
            </select>
            <input className={`${campo} col-span-1 sm:col-span-2`} placeholder="Descripción *" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <input className={campo} placeholder="Valor (COP) *" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
            <input className={`${campo} col-span-2 sm:col-span-3`} placeholder="Proveedor o taller (opcional)" value={prov} onChange={(e) => setProv(e.target.value)} />
            <button onClick={agregarGasto} disabled={guardando} className="rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {guardando ? "Guardando…" : "Agregar gasto"}
            </button>
          </div>
          )}
          {perm.costos && gastos.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay gastos registrados para este vehículo.</p>}
          <ul className="space-y-1">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 break-words text-foreground">
                  {g.fecha} · {CATEGORIAS_GASTO.find((c) => c.clave === g.categoria)?.texto ?? g.categoria} · {g.descripcion}{g.proveedor ? ` (${g.proveedor})` : ""}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {dinero(g.monto)}
                  {perm.gastos && <button onClick={() => borrarGasto(g)} aria-label="Eliminar gasto" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Documentos</h3>
          {perm.editar && !vehiculo.eliminado_en && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select className={campo} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
                {TIPOS_DOCUMENTO.map((t) => <option key={t}>{t}</option>)}
              </select>
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-glass-border px-3 py-2.5 text-sm text-muted-foreground">
                {subiendo ? "Subiendo…" : "Adjuntar PDF o imagen (máx. 10 MB)"}
                <input type="file" accept="application/pdf,image/*" multiple className="hidden" disabled={subiendo} onChange={(e) => { subirDocs(e.target.files); e.target.value = ""; }} />
              </label>
            </div>
          )}
          {docs.length === 0 && <p className="text-xs text-muted-foreground">Sin documentos adjuntos.</p>}
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <button onClick={() => abrirDoc(d)} className="inline-flex min-w-0 items-center gap-1.5 break-all text-left text-sm text-primary">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {d.tipo} · {d.nombre}
                </button>
                {perm.editar && <button onClick={() => borrarDoc(d)} aria-label="Eliminar documento" className="shrink-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ul>
          {vista && (
            <div className="space-y-2 rounded-lg border border-glass-border p-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="break-all">{vista.nombre}</span>
                <button onClick={() => setVista(null)} className="shrink-0 text-primary">Cerrar vista previa</button>
              </div>
              {vista.pdf
                ? <iframe src={vista.url} title={vista.nombre} className="h-96 w-full rounded-md" />
                : <img src={vista.url} alt={vista.nombre} className="max-h-96 w-full rounded-md object-contain" />}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Operaciones relacionadas</h3>
          {cotis.length === 0 && retomas.length === 0 && (
            <p className="text-xs text-muted-foreground">Todavía no hay cotizaciones ni retomas ligadas a este vehículo.</p>
          )}
          <ul className="space-y-1 text-sm text-foreground">
            {cotis.map((c) => <li key={c.id}>Cotización #{c.numero} · {c.cliente} · {c.estado} · {dinero(c.total_a_pagar)}</li>)}
            {retomas.map((r) => <li key={r.id}>{r.operacion} · {r.marca} {r.modelo} {r.placa ?? ""} · {r.resultado}</li>)}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Historial de movimientos</h3>
          {movs.length === 0 && <p className="text-xs text-muted-foreground">Sin movimientos todavía.</p>}
          <ul className="space-y-1">
            {movs.map((m) => (
              <li key={m.id} className="break-words text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString("es-CO")} · {m.detalle}
              </li>
            ))}
          </ul>
        </div>
      </GlassPanel>
    </div>
  );
}

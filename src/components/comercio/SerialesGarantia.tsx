import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, usarProductos } from "@/components/comercio/ComercioModulos";
import { ROTULO_SERIAL, serialValido, sumarDias, type EstadoSerial } from "@/lib/retail-grupo1";
import { limpiarTelefono, limpiarTexto } from "@/lib/validacion-publica";

type Serial = Tables<"com_seriales">;

const hoy = () => new Date().toISOString().slice(0, 10);

/** Seriales / IMEI por unidad con venta, garantía y control de devoluciones. */
export function SerialesGarantia() {
  const { productos, cargando: cargandoProductos, recargar: recargarProductos } = usarProductos();
  const [seriales, setSeriales] = useState<Serial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [productoId, setProductoId] = useState("");
  const [serial, setSerial] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ventaDe, setVentaDe] = useState<string | null>(null);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("com_seriales").select("*").order("created_at", { ascending: false }).limit(500);
    setSeriales(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreDe = useMemo(() => new Map(productos.map((p) => [p.id, p.nombre])), [productos]);

  const registrar = async () => {
    const s = serial.trim().toUpperCase();
    if (!productoId) return toast.error("Elige el producto.");
    if (!serialValido(s)) return toast.error("Escribe un serial o IMEI válido (3 a 60 letras, números o guiones).");
    setGuardando(true);
    const { error } = await supabase.from("com_seriales").insert({ producto_id: productoId, serial: s });
    setGuardando(false);
    if (error) return toast.error(/duplicate|unique/i.test(error.message) ? "Ese serial o IMEI ya está registrado." : "No se pudo registrar el serial.");
    toast.success("Serial registrado.");
    setSerial("");
    void cargar();
  };

  const vender = async (s: Serial) => {
    const prod = productos.find((p) => p.id === s.producto_id);
    const dias = prod?.garantia_dias ?? 0;
    const fecha = hoy();
    const { error } = await supabase
      .from("com_seriales")
      .update({
        estado: "vendido",
        cliente: limpiarTexto(cliente, 120) || null,
        telefono: limpiarTelefono(telefono) || null,
        vendido_el: fecha,
        garantia_hasta: dias > 0 ? sumarDias(fecha, dias) : null,
      })
      .eq("id", s.id);
    if (error) return toast.error("No se pudo marcar como vendido.");
    toast.success(dias > 0 ? `Vendido. Garantía hasta ${sumarDias(fecha, dias)}.` : "Vendido.");
    setVentaDe(null);
    setCliente("");
    setTelefono("");
    void cargar();
    void recargarProductos();
  };

  const cambiar = async (s: Serial, estado: EstadoSerial) => {
    const { error } = await supabase.from("com_seriales").update({ estado }).eq("id", s.id);
    if (error) return toast.error("No se pudo actualizar.");
    void cargar();
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return seriales.filter(
      (s) => !q || s.serial.toLowerCase().includes(q) || (s.cliente ?? "").toLowerCase().includes(q) || (nombreDe.get(s.producto_id) ?? "").toLowerCase().includes(q),
    );
  }, [seriales, busqueda, nombreDe]);

  if (cargando || cargandoProductos) return <Cargando />;
  const conSerial = productos.filter((p) => p.requiere_serial);
  const opciones = conSerial.length > 0 ? conSerial : productos;

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Seriales, IMEI y garantía"
        texto="Registra cada equipo o pieza con su serial. Al venderlo se guarda el cliente y la garantía queda calculada; si regresa, lo marcas en garantía o devuelto."
      />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo serial</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Producto *">
            <select className={campo} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Elige un producto</option>
              {opciones.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Serial / IMEI *">
            <input className={campo} maxLength={60} value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Escanea o escribe" />
          </Campo>
        </div>
        {conSerial.length === 0 && <p className="text-xs text-muted-foreground">Marca «Lleva serial / IMEI» en Productos y precios para que aparezcan aquí solo esos productos.</p>}
        <button className={boton} disabled={guardando} onClick={registrar}><Plus className="h-4 w-4" /> Registrar serial</button>
      </GlassPanel>

      <input className={campo} placeholder="Buscar por serial, cliente o producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay seriales.</p>}
      {visibles.map((s) => {
        const vigente = s.garantia_hasta ? s.garantia_hasta >= hoy() : false;
        return (
          <GlassPanel key={s.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-foreground">{nombreDe.get(s.producto_id) ?? "Producto"} · {s.serial}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {ROTULO_SERIAL[s.estado as EstadoSerial] ?? s.estado}
                  {s.cliente ? ` · ${s.cliente}` : ""}{s.telefono ? ` · ${s.telefono}` : ""}
                  {s.vendido_el ? ` · vendido ${s.vendido_el}` : ""}
                </p>
                {s.garantia_hasta && (
                  <p className={`inline-flex items-center gap-1 text-xs ${vigente ? "text-primary" : "text-destructive"}`}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Garantía {vigente ? "vigente" : "vencida"} hasta {s.garantia_hasta}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.estado === "disponible" && <button className={botonSec} onClick={() => setVentaDe(ventaDe === s.id ? null : s.id)}>Vender</button>}
                {s.estado === "vendido" && vigente && <button className={botonSec} onClick={() => cambiar(s, "en_garantia")}>Entró a garantía</button>}
                {(s.estado === "vendido" || s.estado === "en_garantia") && <button className={botonSec} onClick={() => cambiar(s, "devuelto")}>Devuelto</button>}
                {s.estado === "en_garantia" && <button className={botonSec} onClick={() => cambiar(s, "vendido")}>Resuelto</button>}
              </div>
            </div>
            {ventaDe === s.id && (
              <div className="grid gap-2 sm:grid-cols-3">
                <input className={campo} placeholder="Cliente" maxLength={120} value={cliente} onChange={(e) => setCliente(e.target.value)} />
                <input className={campo} placeholder="Teléfono" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                <button className={boton} onClick={() => vender(s)}>Confirmar venta</button>
              </div>
            )}
          </GlassPanel>
        );
      })}
    </div>
  );
}

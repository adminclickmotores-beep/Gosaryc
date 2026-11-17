import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel } from "@/lib/exportes";

type Fila = (string | number)[][];

/** Descarga en un clic toda la base del negocio en archivos Excel (clientes, productos, ventas, cartera y contabilidad). */
export function RespaldoTotal() {
  const [ocupado, setOcupado] = useState(false);

  const respaldar = async () => {
    setOcupado(true);
    try {
      const [clientes, productos, restaurante, ventas, fiados, asientos] = await Promise.all([
        supabase.from("restaurante_clientes").select("nombre,telefono,direccion,total_pedidos,total_gastado").limit(5000),
        supabase.from("com_productos").select("nombre,codigo_barras,sku,unidad_base,stock,costo,precio_detal").limit(5000),
        supabase.from("restaurante_productos").select("nombre,precio,activo").limit(5000),
        supabase.from("com_ventas").select("cliente,telefono,tipo_precio,metodo,total,created_at").order("created_at", { ascending: false }).limit(5000),
        supabase.from("fiados").select("titulo,contacto,telefono,monto,abonado,estado,fecha").order("created_at", { ascending: false }).limit(5000),
        supabase.from("asientos_contables").select("fecha,concepto,debe,haber").order("created_at", { ascending: false }).limit(5000),
      ]);
      const paquetes: { nombre: string; cols: string[]; filas: Fila }[] = [
        { nombre: "respaldo_clientes", cols: ["Nombre", "Teléfono", "Dirección", "Pedidos", "Gastado"], filas: (clientes.data ?? []).map((c) => [c.nombre, c.telefono, c.direccion ?? "", c.total_pedidos, c.total_gastado]) },
        { nombre: "respaldo_productos", cols: ["Producto", "Barras", "SKU", "Unidad", "Stock", "Costo", "Precio"], filas: (productos.data ?? []).map((p) => [p.nombre, p.codigo_barras ?? "", p.sku ?? "", p.unidad_base, p.stock, p.costo, p.precio_detal]) },
        { nombre: "respaldo_menu", cols: ["Plato", "Precio", "Activo"], filas: (restaurante.data ?? []).map((p) => [p.nombre, p.precio, p.activo ? "Sí" : "No"]) },
        { nombre: "respaldo_ventas", cols: ["Cliente", "Teléfono", "Precio", "Medio", "Total", "Fecha"], filas: (ventas.data ?? []).map((v) => [v.cliente ?? "", v.telefono ?? "", v.tipo_precio, v.metodo, v.total, new Date(v.created_at).toLocaleString("es-CO")]) },
        { nombre: "respaldo_cartera", cols: ["Título", "Cliente", "Teléfono", "Monto", "Abonado", "Estado", "Fecha"], filas: (fiados.data ?? []).map((f) => [f.titulo, f.contacto ?? "", f.telefono ?? "", f.monto, f.abonado, f.estado, f.fecha ?? ""]) },
        { nombre: "respaldo_contabilidad", cols: ["Fecha", "Concepto", "Debe", "Haber"], filas: (asientos.data ?? []).map((a) => [a.fecha ?? "", a.concepto ?? "", a.debe, a.haber]) },
      ];
      const total = paquetes.reduce((s, p) => s + p.filas.length, 0);
      for (const p of paquetes) exportarExcel(p.nombre, p.cols, p.filas);
      toast.success(total === 0 ? "Respaldo descargado (el negocio aún no tiene datos)." : `Respaldo descargado: ${total} registros en 6 archivos Excel.`);
    } catch {
      toast.error("No se pudo armar el respaldo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <h2 className="font-medium text-foreground">Respaldo total del negocio</h2>
        <p className="text-sm text-muted-foreground">Descarga clientes, productos, ventas, cartera y contabilidad en Excel con un clic.</p>
      </div>
      <button onClick={respaldar} disabled={ocupado} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {ocupado ? "Armando…" : "Descargar respaldo"}
      </button>
    </GlassPanel>
  );
}

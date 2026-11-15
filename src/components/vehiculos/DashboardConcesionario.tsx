import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { configModulo } from "@/lib/modulos-config";

type Vehiculo = Tables<"vehiculos_inventario">;
type Credito = Tables<"solicitudes_credito">;
type Registro = Tables<"modulo_registros">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const MODULOS = ["ventas_veh", "comisiones", "alistamiento", "cartera_veh", "costos_veh", "vehiculos_usados"];

/** Tablero real del concesionario: todo sale de los registros guardados, nada simulado. */
export function DashboardConcesionario() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [mes, setMes] = useState("");
  const [hoy, setHoy] = useState("");

  useEffect(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setMes(`${d.getFullYear()}-${mm}`);
    setHoy(`${d.getFullYear()}-${mm}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [v, c, r] = await Promise.all([
        supabase.from("vehiculos_inventario").select("*").limit(2000),
        supabase.from("solicitudes_credito").select("*").limit(2000),
        supabase.from("modulo_registros").select("*").in("modulo", MODULOS).eq("anulado", false).limit(2000),
      ]);
      if (cancelado) return;
      setVehiculos(v.data ?? []);
      setCreditos(c.data ?? []);
      setRegistros(r.data ?? []);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const d = useMemo(() => {
    const disp = vehiculos.filter((v) => v.estado === "disponible");
    const sep = vehiculos.filter((v) => v.estado === "separado");
    const vend = vehiculos.filter((v) => v.estado === "vendido");
    const utilidad = vend.reduce((s, v) => s + (v.precio - (v.precio_compra ?? 0)), 0);
    const abiertos = (m: string) => registros.filter((r) => r.modulo === m && !configModulo(m).cerrados.includes(r.estado));
    const todos = (m: string) => registros.filter((r) => r.modulo === m);
    const ventasMes = todos("ventas_veh").filter((r) => mes && (r.fecha ?? r.created_at).startsWith(mes));
    const aprobados = creditos.filter((c) => c.estado === "aprobado").length;
    const rechazados = creditos.filter((c) => c.estado === "rechazado").length;
    const pendientes = creditos.filter((c) => c.estado !== "aprobado" && c.estado !== "rechazado").length;
    const gastoAlistamiento = todos("alistamiento").reduce((s, r) => s + r.monto, 0);
    const comisiones = todos("comisiones").reduce((s, r) => s + r.monto, 0);
    const cartera = abiertos("cartera_veh").reduce((s, r) => s + Math.max(r.monto - r.abonado, 0), 0);
    const retomas = todos("vehiculos_usados").length;
    const alertas: string[] = [];
    if (hoy) {
      for (const v of vehiculos) {
        if (v.estado === "vendido") continue;
        const nombre = `${v.marca} ${v.modelo}${v.placa ? ` · ${v.placa}` : ""}`;
        if (v.soat_vence && v.soat_vence < hoy) alertas.push(`${nombre}: SOAT vencido`);
        if (v.tecnomecanica_vence && v.tecnomecanica_vence < hoy) alertas.push(`${nombre}: tecnomecánica vencida`);
      }
    }
    return {
      disp, sep, vend, utilidad, ventasMes, aprobados, rechazados, pendientes,
      gastoAlistamiento, comisiones, cartera, retomas, alertas,
      valorInventario: disp.reduce((s, v) => s + v.precio, 0),
    };
  }, [vehiculos, creditos, registros, mes, hoy]);

  const tarjetas = [
    { t: "Inventario disponible", v: String(d.disp.length), s: dinero(d.valorInventario) },
    { t: "Reservados", v: String(d.sep.length), s: "separados con anticipo" },
    { t: "Vendidos", v: String(d.vend.length), s: `Utilidad: ${dinero(d.utilidad)}` },
    { t: "Ventas del mes", v: String(d.ventasMes.length), s: dinero(d.ventasMes.reduce((s, r) => s + r.monto, 0)) },
    { t: "Compras y retomas", v: String(d.retomas), s: "registradas" },
    { t: "Gastos de alistamiento", v: dinero(d.gastoAlistamiento), s: "acumulado" },
    { t: "Comisiones", v: dinero(d.comisiones), s: "de asesores" },
    { t: "Financiaciones pendientes", v: String(d.pendientes), s: "en trámite" },
    { t: "Créditos aprobados", v: String(d.aprobados), s: `${d.rechazados} rechazados` },
    { t: "Cartera pendiente", v: dinero(d.cartera), s: "por cobrar" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tarjetas.map((c) => (
          <GlassPanel key={c.t} className="min-w-0 p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className="truncate text-lg font-medium text-foreground">{c.v}</p>
            <p className="truncate text-xs text-muted-foreground">{c.s}</p>
          </GlassPanel>
        ))}
      </div>
      {d.alertas.length > 0 && (
        <GlassPanel className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Alertas pendientes
          </p>
          <ul className="space-y-1">
            {d.alertas.slice(0, 8).map((a) => (
              <li key={a} className="break-words text-xs text-muted-foreground">{a}</li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Vehiculo = Tables<"vehiculos_inventario">;

const DIAS_AVISO = 30;
const MS_DIA = 86400000;

const hoyIso = (): string => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

type Alerta = {
  id: string;
  vehiculo: string;
  documento: string;
  fecha: string;
  dias: number;
};

const textoDias = (dias: number): string => {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
};

export function VencimientosVehiculos() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data } = await supabase
        .from("vehiculos_inventario")
        .select("*")
        .neq("estado", "vendido")
        .limit(500);
      if (!activo) return;
      const hoy = Date.parse(hoyIso());
      const lista: Alerta[] = [];
      for (const v of (data ?? []) as Vehiculo[]) {
        const nombre = [v.marca, v.modelo, v.placa].filter(Boolean).join(" ") || "Vehículo sin datos";
        const documentos: { nombre: string; fecha: string | null }[] = [
          { nombre: "SOAT", fecha: v.soat_vence },
          { nombre: "Tecnomecánica", fecha: v.tecnomecanica_vence },
        ];
        for (const doc of documentos) {
          if (!doc.fecha) continue;
          const dias = Math.round((Date.parse(doc.fecha) - hoy) / MS_DIA);
          if (Number.isNaN(dias) || dias > DIAS_AVISO) continue;
          lista.push({ id: `${v.id}-${doc.nombre}`, vehiculo: nombre, documento: doc.nombre, fecha: doc.fecha, dias });
        }
      }
      lista.sort((a, b) => a.dias - b.dias);
      setAlertas(lista);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <CalendarClock className="h-7 w-7 text-primary" /> Alertas de vencimientos
        </h1>
        <p className="text-sm text-muted-foreground">
          SOAT y tecnomecánica de tus vehículos que ya vencieron o vencen en los próximos {DIAS_AVISO} días.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!cargando && alertas.length === 0 && (
        <GlassPanel className="p-5">
          <p className="text-sm text-muted-foreground">No hay SOAT ni tecnomecánicas por vencer en los próximos {DIAS_AVISO} días.</p>
        </GlassPanel>
      )}

      <div className="space-y-3">
        {alertas.map((a) => (
          <GlassPanel key={a.id} className="space-y-1 p-4">
            <p className="break-words text-sm font-medium text-foreground">{a.vehiculo}</p>
            <p className="break-words text-xs text-muted-foreground">
              {a.documento} · {a.fecha} · {textoDias(a.dias)}
            </p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

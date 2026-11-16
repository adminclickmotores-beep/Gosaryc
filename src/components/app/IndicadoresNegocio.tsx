import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, ListChecks, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import type { TipoNegocio } from "@/lib/modulos-negocio";
import { configModulo } from "@/lib/modulos-config";
import { agruparPorTabla } from "@/lib/tablas-modulo";

type Registro = Tables<"modulo_registros">;
type Alerta = { id: string; titulo: string; modulo: string; texto: string };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const diasHasta = (fecha: string, hoy: string) =>
  Math.round((new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86400000);

/** Resumen del negocio: suma los registros de todos sus módulos y marca lo que requiere atención. */
export function IndicadoresNegocio({ tipo }: { tipo: TipoNegocio }) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [hoy, setHoy] = useState("");
  const ids = useMemo(() => tipo.modulos.map((m) => m.id), [tipo]);
  const titulos = useMemo(() => new Map(tipo.modulos.map((m) => [m.id, m.titulo] as const)), [tipo]);

  useEffect(() => {
    setHoy(hoyLocal());
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      // Cada módulo se lee de su tabla propia (o de la genérica) y todo se junta en un solo resumen.
      const grupos = Array.from(agruparPorTabla(ids).entries());
      const resultados = await Promise.all(
        grupos.map(async ([tabla, modulos]): Promise<Registro[]> => {
          const consulta = supabase.from(tabla as "modulo_registros").select("*").eq("anulado", false);
          const { data } = await (tabla === "modulo_registros" ? consulta.in("modulo", modulos) : consulta).limit(2000);
          // Las tablas propias son de un solo módulo: se marca de cuál es cada fila.
          return (data ?? []).map((r) => (tabla === "modulo_registros" ? r : { ...r, modulo: modulos[0] }));
        }),
      );
      if (!cancelado) setRegistros(resultados.flat());
    })();
    return () => {
      cancelado = true;
    };
  }, [ids]);

  const resumen = useMemo(() => {
    let pendiente = 0;
    const alertas: Alerta[] = [];
    for (const r of registros) {
      const cfg = configModulo(r.modulo);
      if (cfg.cerrados.includes(r.estado)) continue;
      pendiente += Math.max(r.monto - r.abonado, 0);
      const nombre = titulos.get(r.modulo) ?? "";
      if (cfg.tipo === "stock" && r.minimo > 0 && r.cantidad <= r.minimo) {
        alertas.push({
          id: r.id,
          titulo: r.titulo,
          modulo: nombre,
          texto: r.cantidad <= 0 ? "agotado" : "bajo el mínimo",
        });
        continue;
      }
      if (r.fecha && hoy) {
        const d = diasHasta(r.fecha, hoy);
        if (d < 0) alertas.push({ id: r.id, titulo: r.titulo, modulo: nombre, texto: `vencido hace ${-d} días` });
        else if (d <= 7) alertas.push({ id: r.id, titulo: r.titulo, modulo: nombre, texto: d === 0 ? "es hoy" : `faltan ${d} días` });
      }
    }
    return { pendiente, alertas };
  }, [registros, hoy, titulos]);

  const tarjetas = [
    { t: "Registros activos", v: String(registros.length), tono: 165, Icono: ListChecks },
    { t: "Pendiente en tus módulos", v: dinero(resumen.pendiente), tono: 75, Icono: Wallet },
    { t: "Requieren atención", v: String(resumen.alertas.length), tono: 20, Icono: BellRing },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tarjetas.map((c) => (
          <GlassPanel
            key={c.t}
            hover="lift"
            className="menu-card flex min-w-0 items-center gap-3 p-4"
            style={{ "--tono": c.tono } as React.CSSProperties}
          >
            <span className="menu-card-icon">
              <c.Icono className="h-5 w-5 shrink-0" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.t}</p>
              <p className="truncate text-lg font-semibold text-foreground">{c.v}</p>
            </div>
          </GlassPanel>
        ))}
      </div>
      {resumen.alertas.length > 0 && (
        <GlassPanel className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Requiere atención
          </p>
          <ul className="space-y-1">
            {resumen.alertas.slice(0, 8).map((a) => (
              <li key={a.id} className="break-words text-xs text-muted-foreground">
                {a.titulo} · {a.modulo}: {a.texto}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}

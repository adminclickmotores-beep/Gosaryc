import { useState } from "react";
import { Loader2, TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { revisarVitrina, type ResultadoVitrina } from "@/lib/precios-ia.functions";

type Fila = {
  id: string; tipo: string; marca: string; modelo: string; linea: string | null;
  anio: number | null; cilindraje: string | null; kilometraje: number | null; precio: number;
};

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Compara los precios de los vehículos disponibles contra el mercado del mes. */
export function RevisarVitrina({ vehiculos }: { vehiculos: Fila[] }) {
  const [cargando, setCargando] = useState(false);
  const [res, setRes] = useState<ResultadoVitrina[] | null>(null);

  const revisar = async () => {
    const items = vehiculos
      .filter((v) => v.anio && v.precio > 0)
      .slice(0, 8)
      .map((v) => ({
        id: v.id,
        tipo: v.tipo,
        marca: v.marca,
        linea: v.linea || v.modelo,
        anio: v.anio ?? 0,
        cilindraje: v.cilindraje ?? "",
        km: v.kilometraje ?? 0,
        precio: v.precio,
      }));
    if (items.length === 0) {
      toast.error("No hay vehículos disponibles con año y precio para revisar.");
      return;
    }
    setCargando(true);
    try {
      setRes(await revisarVitrina({ data: { items } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo consultar el mercado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <GlassPanel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Scale className="h-5 w-5 text-primary" /> Vitrina frente al mercado del mes
        </p>
        <button
          type="button"
          onClick={() => void revisar()}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
          Revisar Precios de mi Vitrina vs. Mercado del Mes
        </button>
      </div>
      {res && (
        <ul className="space-y-2">
          {res.map((x) => {
            const v = vehiculos.find((a) => a.id === x.id);
            if (!v) return null;
            const dif = ((v.precio - x.mercado) / x.mercado) * 100;
            const alerta =
              dif > 8
                ? { t: "Por encima del mercado: considera bajar el precio", c: "border-red-500/50 bg-red-500/10" }
                : dif < -8
                  ? { t: "Por debajo del mercado: puedes subir el precio", c: "border-amber-500/50 bg-amber-500/10" }
                  : { t: "Alineado con el mercado", c: "border-emerald-500/50 bg-emerald-500/10" };
            const Icono = x.tendencia === "alza" ? TrendingUp : x.tendencia === "baja" ? TrendingDown : Minus;
            return (
              <li key={x.id} className={`rounded-lg border p-3 text-sm ${alerta.c}`}>
                <p className="font-medium">{v.marca} {v.linea || v.modelo} {v.anio}</p>
                <p className="text-muted-foreground">
                  Tu precio {dinero(v.precio)} · Mercado {dinero(x.mercado)} ({dif > 0 ? "+" : ""}{dif.toFixed(1)} %)
                </p>
                <p className="flex items-center gap-1">
                  <Icono className="h-4 w-4" /> {alerta.t} · Tendencia: {x.tendencia === "alza" ? "en alza" : x.tendencia === "baja" ? "a la baja" : "estable"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}

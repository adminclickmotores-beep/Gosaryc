import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Pedido = Tables<"restaurante_pedidos">;
type Item = Tables<"restaurante_pedido_items">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const RANGOS = [
  { dias: 1, texto: "Hoy" },
  { dias: 7, texto: "7 días" },
  { dias: 30, texto: "30 días" },
] as const;

export function Reportes() {
  const [dias, setDias] = useState<number>(7);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true);
      const desde = new Date();
      desde.setHours(0, 0, 0, 0);
      desde.setDate(desde.getDate() - (dias - 1));
      const { data } = await supabase
        .from("restaurante_pedidos")
        .select("*")
        .gte("created_at", desde.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);
      const lista = (data ?? []).filter((p) => p.estado !== "cancelado");
      let its: Item[] = [];
      if (lista.length > 0) {
        const { data: d2 } = await supabase
          .from("restaurante_pedido_items")
          .select("*")
          .in("pedido_id", lista.map((p) => p.id));
        its = d2 ?? [];
      }
      if (!vivo) return;
      setPedidos(lista);
      setItems(its);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [dias]);

  const resumen = useMemo(() => {
    const total = pedidos.reduce((s, p) => s + p.total, 0);
    const porDia = new Map<string, number>();
    for (const p of pedidos) {
      const k = new Date(p.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
      porDia.set(k, (porDia.get(k) ?? 0) + p.total);
    }
    const porPlato = new Map<string, { cantidad: number; ingreso: number }>();
    for (const i of items) {
      const a = porPlato.get(i.nombre) ?? { cantidad: 0, ingreso: 0 };
      a.cantidad += i.cantidad;
      a.ingreso += i.cantidad * i.precio_unitario;
      porPlato.set(i.nombre, a);
    }
    const top = [...porPlato.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 8);
    const porModalidad = new Map<string, number>();
    for (const p of pedidos) porModalidad.set(p.modalidad, (porModalidad.get(p.modalidad) ?? 0) + 1);
    return {
      total,
      cantidad: pedidos.length,
      ticket: pedidos.length ? total / pedidos.length : 0,
      dias: [...porDia.entries()].reverse(),
      top,
      modalidades: [...porModalidad.entries()],
    };
  }, [pedidos, items]);

  const maxDia = Math.max(1, ...resumen.dias.map(([, v]) => v));
  const maxPlato = Math.max(1, ...resumen.top.map(([, v]) => v.cantidad));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.dias}
            onClick={() => setDias(r.dias)}
            className={`rounded-full px-4 py-1.5 text-sm ${dias === r.dias ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {r.texto}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Cargando reportes…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="font-display text-2xl text-foreground">{dinero(resumen.total)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="font-display text-2xl text-foreground">{resumen.cantidad}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ticket promedio</p>
              <p className="font-display text-2xl text-foreground">{dinero(resumen.ticket)}</p>
            </GlassPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="space-y-3 p-5">
              <h2 className="font-medium text-foreground">Platos más vendidos</h2>
              {resumen.top.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ventas en este periodo.</p>}
              {resumen.top.map(([nombre, v]) => (
                <div key={nombre} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-foreground">{nombre}</span>
                    <span className="shrink-0 text-muted-foreground">{v.cantidad} · {dinero(v.ingreso)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-glass/60">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(v.cantidad / maxPlato) * 100}%` }} />
                  </div>
                </div>
              ))}
            </GlassPanel>

            <GlassPanel className="space-y-3 p-5">
              <h2 className="font-medium text-foreground">Ventas por día</h2>
              {resumen.dias.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ventas en este periodo.</p>}
              {resumen.dias.map(([dia, v]) => (
                <div key={dia} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-foreground">{dia}</span>
                    <span className="text-muted-foreground">{dinero(v)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-glass/60">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(v / maxDia) * 100}%` }} />
                  </div>
                </div>
              ))}
              {resumen.modalidades.length > 0 && (
                <p className="pt-2 text-xs capitalize text-muted-foreground">
                  {resumen.modalidades.map(([m, n]) => `${m}: ${n}`).join(" · ")}
                </p>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}

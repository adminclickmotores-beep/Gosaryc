import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Movimiento = Tables<"restaurante_movimientos_caja">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const ETIQUETAS: Record<string, string> = { apertura: "Apertura de caja", ingreso: "Ingreso", gasto: "Gasto" };

export function CajaPanel() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [tipo, setTipo] = useState<"ingreso" | "gasto" | "apertura">("gasto");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");

  const cargar = useCallback(async () => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("restaurante_movimientos_caja")
      .select("*")
      .gte("created_at", inicio.toISOString())
      .eq("anulado", false)
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudo cargar la caja.");
    const { data: pedidosHoy } = await supabase
      .from("restaurante_pedidos")
      .select("total")
      .eq("estado", "entregado")
      .gte("created_at", inicio.toISOString());
    setVentasHoy((pedidosHoy ?? []).reduce((s, p) => s + p.total, 0));
    setMovimientos(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const apertura = movimientos.filter((m) => m.tipo === "apertura").reduce((s, m) => s + m.monto, 0);
    const ingresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const gastos = movimientos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
    const ingresosTotales = ingresos + ventasHoy;
    return { apertura, ingresos: ingresosTotales, gastos, saldo: apertura + ingresosTotales - gastos };
  }, [movimientos, ventasHoy]);

  const agregar = async () => {
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0) return toast.error("Escribe un monto válido.");
    if (tipo !== "apertura" && !concepto.trim()) return toast.error("Escribe a qué corresponde el movimiento.");
    const { error } = await supabase.from("restaurante_movimientos_caja").insert({
      tipo,
      concepto: concepto.trim() || "Apertura de caja",
      monto: valor,
    });
    if (error) return toast.error("No se pudo registrar el movimiento.");
    setConcepto("");
    setMonto("");
    cargar();
  };

  const quitar = async (m: Movimiento) => {
    // Los movimientos de caja no se borran: se anulan con motivo (solo el dueño) y queda auditoría.
    const motivo = window.prompt("Motivo de la anulación (obligatorio):")?.trim();
    if (!motivo) return toast.error("Sin motivo no se puede anular.");
    const { error } = await supabase
      .from("restaurante_movimientos_caja")
      .update({ anulado: true, motivo_anulacion: motivo })
      .eq("id", m.id);
    if (error) return toast.error("No se pudo anular. Solo el dueño del negocio puede hacerlo.");
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Apertura</p>
          <p className="font-display text-xl text-foreground">{dinero(resumen.apertura)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Ingresos y ventas</p>
          <p className="font-display text-xl text-foreground">{dinero(resumen.ingresos)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="font-display text-xl text-foreground">{dinero(resumen.gastos)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Saldo en caja</p>
          <p className="font-display text-xl text-primary">{dinero(resumen.saldo)}</p>
        </GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Registrar movimiento de hoy</h2>
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as "ingreso" | "gasto" | "apertura")}>
            <option value="apertura">Apertura de caja (dinero inicial)</option>
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
          {tipo !== "apertura" && (
            <input className={campo} placeholder="Concepto (ej. Compra de hielo)" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          )}
          <input className={campo} placeholder="Monto" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
          <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Registrar
          </button>
        </GlassPanel>

        <div className="space-y-2">
          {cargando && <p className="text-sm text-muted-foreground">Cargando caja…</p>}
          {!cargando && movimientos.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay movimientos hoy. Registra la apertura de caja para empezar.</p>
          )}
          {movimientos.map((m) => (
            <GlassPanel key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">{m.concepto}</p>
                <p className="text-xs text-muted-foreground">
                  {ETIQUETAS[m.tipo] ?? m.tipo} · {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-medium ${m.tipo === "gasto" ? "text-destructive" : "text-foreground"}`}>
                {m.tipo === "gasto" ? "-" : "+"}
                {dinero(m.monto)}
              </span>
              <button
                onClick={() => quitar(m)}
                className="shrink-0 rounded-full border border-glass-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                Anular
              </button>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { toast } from "sonner";
import { useNegocio } from "@/hooks/use-negocio";
import { enlaceResumenDueno, guardarTelefonoDueno, telefonoDuenoGuardado, type DatosCierre } from "@/lib/resumen-cierre";
import { SelectorSucursal } from "@/components/negocio/SucursalesTraslados";
import { leerSucursalActual } from "@/lib/sucursales";

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
  const [sucursal, setSucursal] = useState<string | null>(() => leerSucursalActual());
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [costoProducto, setCostoProducto] = useState<Map<string, number>>(new Map());
  const [gastosDia, setGastosDia] = useState(0);
  const [kardex, setKardex] = useState<Tables<"restaurante_kardex">[]>([]);
  const [nombreInsumo, setNombreInsumo] = useState<Map<string, string>>(new Map());

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
      const lista = (data ?? []).filter((p) => p.estado !== "cancelado" && (!sucursal || p.sucursal_id === sucursal));
      let its: Item[] = [];
      if (lista.length > 0) {
        const { data: d2 } = await supabase
          .from("restaurante_pedido_items")
          .select("*")
          .in("pedido_id", lista.map((p) => p.id));
        its = d2 ?? [];
      }
      // Costo por porción de cada producto (recetas + precio de los insumos).
      const [rec, ing, ins, gas] = await Promise.all([
        supabase.from("restaurante_recetas").select("*"),
        supabase.from("restaurante_receta_ingredientes").select("*"),
        supabase.from("restaurante_insumos").select("*"),
        supabase
          .from("movimientos_turno")
          .select("*")
          .eq("tipo", "gasto")
          .eq("anulado", false)
          .gte("created_at", desde.toISOString()),
      ]);
      const precioInsumo = new Map<string, number>();
      for (const i of ins.data ?? []) {
        precioInsumo.set(i.id, i.cantidad_compra > 0 ? i.precio_compra / i.cantidad_compra : 0);
      }
      const costoReceta = new Map<string, number>();
      for (const g of ing.data ?? []) {
        costoReceta.set(g.receta_id, (costoReceta.get(g.receta_id) ?? 0) + g.cantidad * (precioInsumo.get(g.insumo_id) ?? 0));
      }
      const costos = new Map<string, number>();
      for (const r of rec.data ?? []) {
        const base = costoReceta.get(r.id) ?? 0;
        costos.set(r.producto_id, (base * (1 + r.merma_pct / 100)) / Math.max(1, r.porciones));
      }
      const { data: kd } = await supabase
        .from("restaurante_kardex")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (!vivo) return;
      setKardex(kd ?? []);
      setNombreInsumo(new Map((ins.data ?? []).map((i) => [i.id, `${i.nombre} (${i.unidad})`] as [string, string])));
      setCostoProducto(costos);
      setGastosDia(((gas.data ?? []) as { monto: number; sucursal_id?: string | null }[]).filter((m) => !sucursal || (m.sucursal_id ?? null) === sucursal).reduce((s, m) => s + m.monto, 0));
      setPedidos(lista);
      setItems(its);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [dias, sucursal]);

  useEffect(() => {
    const alCambiar = (): void => setSucursal(leerSucursalActual());
    window.addEventListener("gosaryc:sucursal", alCambiar);
    return () => window.removeEventListener("gosaryc:sucursal", alCambiar);
  }, []);

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

  // Utilidad real: solo pedidos cobrados (entregados) menos costo de insumos y gastos de caja.
  const utilidad = useMemo(() => {
    const cobrados = new Set(pedidos.filter((p) => p.estado === "entregado").map((p) => p.id));
    const ventas = pedidos.filter((p) => cobrados.has(p.id)).reduce((s, p) => s + p.total, 0);
    let costo = 0;
    let sinReceta = 0;
    for (const i of items) {
      if (!cobrados.has(i.pedido_id)) continue;
      const c = i.producto_id ? costoProducto.get(i.producto_id) : undefined;
      if (c === undefined) sinReceta += i.cantidad;
      else costo += c * i.cantidad;
    }
    const neta = ventas - costo - gastosDia;
    return { ventas, costo, gastos: gastosDia, neta, margen: ventas > 0 ? (neta / ventas) * 100 : 0, sinReceta };
  }, [pedidos, items, costoProducto, gastosDia]);

  const maxDia = Math.max(1, ...resumen.dias.map(([, v]) => v));
  const maxPlato = Math.max(1, ...resumen.top.map(([, v]) => v.cantidad));

  const exportarVentasExcel = () => {
    exportarExcel("reporte-ventas", ["Pedido", "Fecha", "Modalidad", "Estado", "Total"],
      pedidos.map((p) => [p.numero_factura ?? p.id.slice(0, 8), new Date(p.created_at).toLocaleString("es-CO"), p.modalidad, p.estado, p.total]));
  };

  const exportarVentasPdf = () => {
    imprimirReporte("Reporte de ventas", `Últimos ${dias} días`, ["Plato o producto", "Cantidad", "Ingreso"],
      resumen.top.map(([nombre, v]) => [nombre, String(v.cantidad), dinero(v.ingreso)]),
      [`Ventas: ${dinero(resumen.total)} en ${resumen.cantidad} pedidos (ticket ${dinero(resumen.ticket)})`,
        `Utilidad neta: ${dinero(utilidad.neta)} (ventas ${dinero(utilidad.ventas)} - costos ${dinero(utilidad.costo)} - gastos ${dinero(utilidad.gastos)})`]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <button
            key={r.dias}
            onClick={() => setDias(r.dias)}
            className={`rounded-full px-4 py-1.5 text-sm ${dias === r.dias ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {r.texto}
          </button>
        ))}
        <SelectorSucursal alCambiar={setSucursal} />
        <button onClick={exportarVentasExcel} className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground">
          Exportar a Excel
        </button>
        <button onClick={exportarVentasPdf} className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground">
          Exportar a PDF
        </button>
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

          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Utilidad real {dias === 1 ? "de hoy" : `de los últimos ${dias} días`}</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Ventas cobradas</p>
                <p className="truncate text-lg text-foreground">{dinero(utilidad.ventas)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">− Costo de insumos</p>
                <p className="truncate text-lg text-foreground">{dinero(utilidad.costo)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">− Gastos de caja</p>
                <p className="truncate text-lg text-foreground">{dinero(utilidad.gastos)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">= Utilidad ({utilidad.margen.toFixed(0)}%)</p>
                <p className={`truncate text-lg font-medium ${utilidad.neta < 0 ? "text-destructive" : "text-primary"}`}>
                  {dinero(utilidad.neta)}
                </p>
              </div>
            </div>
            {utilidad.sinReceta > 0 && (
              <p className="text-xs text-muted-foreground">
                {utilidad.sinReceta} unidades vendidas no tienen receta, así que su costo no está incluido. Crea la receta en el recetario para que la utilidad sea exacta.
              </p>
            )}
          </GlassPanel>

          <ResumenCierreWhatsApp ventas={utilidad.ventas} gastos={utilidad.gastos} />

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

          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Kardex de insumos (últimos movimientos)</h2>
            {kardex.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cuando vendas platos con receta, aquí verás cuánto insumo se descontó de cada uno.
              </p>
            )}
            {kardex.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border pb-2 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="break-words text-foreground">{nombreInsumo.get(k.insumo_id) ?? "Insumo"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(k.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} · {k.motivo ?? k.tipo}
                  </p>
                </div>
                <p className="shrink-0 text-right text-foreground">
                  <span className={k.cantidad < 0 ? "text-destructive" : "text-primary"}>
                    {k.cantidad > 0 ? "+" : ""}{Number(k.cantidad.toFixed(2))}
                  </span>
                  <span className="block text-xs text-muted-foreground">queda {Number(k.stock_resultante.toFixed(2))}</span>
                </p>
              </div>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

/** Resumen ejecutivo del día para enviar al WhatsApp del dueño con un clic. */
export function ResumenCierreWhatsApp({ ventas, gastos }: { ventas?: number; gastos?: number }) {
  const { negocio } = useNegocio();
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    let tel = telefonoDuenoGuardado();
    if (!tel) {
      const pedido = window.prompt("WhatsApp del dueño para enviar el cierre (10 dígitos):", "");
      if (!pedido) return;
      tel = pedido;
      guardarTelefonoDueno(pedido);
    }
    setEnviando(true);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const iso = inicio.toISOString();
    let v = ventas;
    let g = gastos;
    if (v === undefined || g === undefined) {
      try {
        const { data: hoyMovs } = await supabase.from("movimientos_turno").select("tipo, monto").eq("anulado", false).gte("created_at", iso);
        const vivos = hoyMovs ?? [];
        const esIngreso = (t: string): boolean => t === "venta" || t === "ingreso";
        v = vivos.filter((m) => esIngreso(m.tipo)).reduce((s, m) => s + m.monto, 0);
        g = vivos.filter((m) => !esIngreso(m.tipo)).reduce((s, m) => s + m.monto, 0);
      } catch {
        v = 0;
        g = 0;
      }
    }
    let efectivo = (v ?? 0) - (g ?? 0);
    let transf = 0;
    try {
      const { data: abiertos } = await supabase
        .from("turnos_caja")
        .select("id, fondo_inicial")
        .eq("estado", "abierto")
        .order("abierto_en", { ascending: false })
        .limit(1);
      const turno = abiertos?.[0];
      if (turno) {
        const { data: movs } = await supabase
          .from("movimientos_turno")
          .select("tipo, metodo, monto")
          .eq("turno_id", turno.id)
          .eq("anulado", false);
        const vivos = movs ?? [];
        const suma = (f: (m: { tipo: string; metodo: string }) => boolean): number =>
          vivos.filter(f).reduce((s, m) => s + m.monto, 0);
        const ingEf = suma((m) => (m.tipo === "venta" || m.tipo === "ingreso") && m.metodo === "efectivo");
        const egrEf = suma((m) => (m.tipo === "gasto" || m.tipo === "retiro") && m.metodo === "efectivo");
        efectivo = turno.fondo_inicial + ingEf - egrEf;
        transf = suma((m) => (m.tipo === "venta" || m.tipo === "ingreso") && (m.metodo === "transferencia" || m.metodo === "tarjeta"));
      }
    } catch {
      /* sin turno abierto: se usa el estimado */
    }
    let creditos = 0;
    try {
      const { data: fi } = await supabase.from("fiados").select("monto, abonado").eq("anulado", false).gte("created_at", iso);
      creditos = (fi ?? []).reduce((s, f) => s + Math.max(f.monto - f.abonado, 0), 0);
    } catch {
      /* sin fiados del día */
    }
    let criticos: string[] = [];
    try {
      const { data: prods } = await supabase.from("com_productos").select("nombre, stock, stock_minimo, unidad_base").eq("activo", true).limit(200);
      criticos = (prods ?? [])
        .filter((p) => p.stock <= p.stock_minimo)
        .slice(0, 5)
        .map((p) => `${p.nombre} (quedan ${p.stock} ${p.unidad_base})`);
    } catch {
      /* sin inventario comercial */
    }
    const datos: DatosCierre = {
      negocio: negocio?.nombre ?? "Mi negocio",
      fecha: new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }),
      ventas: v ?? 0,
      gastos: g ?? 0,
      efectivoEsperado: efectivo,
      transferencias: transf,
      creditosDelDia: creditos,
      stockCritico: criticos,
    };
    const url = enlaceResumenDueno(tel, datos);
    setEnviando(false);
    if (!url) {
      toast.error("Ese número de WhatsApp no es válido.");
      return;
    }
    window.open(url, "_blank", "noopener");
    toast.success("Cierre listo para enviar por WhatsApp.");
  };

  return (
    <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <h2 className="font-medium text-foreground">Cierre del día por WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Envía ventas, efectivo, créditos y stock crítico al WhatsApp del dueño con un clic.
        </p>
      </div>
      <button
        type="button"
        disabled={enviando}
        onClick={enviar}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {enviando ? "Armando…" : "Enviar cierre por WhatsApp"}
      </button>
    </GlassPanel>
  );
}

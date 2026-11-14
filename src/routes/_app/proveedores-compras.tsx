import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/proveedores-compras")({
  head: () => ({ meta: [{ title: "Proveedores y compras" }] }),
  component: ProveedoresComprasPage,
});

type Fila = { titulo: string; contacto: string | null; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function ProveedoresComprasPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [insumos, setInsumos] = useState<Tables<"restaurante_insumos">[]>([]);
  const [compras, setCompras] = useState<Tables<"restaurante_kardex">[]>([]);
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [credito, setCredito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarInventario = useCallback(async () => {
    const [i, k] = await Promise.all([
      supabase.from("restaurante_insumos").select("*").order("nombre"),
      supabase.from("restaurante_kardex").select("*").eq("tipo", "compra").order("created_at", { ascending: false }).limit(15),
    ]);
    setInsumos(i.data ?? []);
    setCompras(k.data ?? []);
  }, []);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  const insumoSel = insumos.find((x) => x.id === insumoId);
  const cantNum = Number(cantidad);
  const costoNum = Number(costo);
  const unitNuevo = cantNum > 0 && costoNum >= 0 ? costoNum / cantNum : 0;
  const unitActual = insumoSel ? insumoSel.precio_compra / Math.max(insumoSel.cantidad_compra, 0.000001) : 0;
  const unitProm =
    insumoSel && cantNum > 0
      ? (Math.max(insumoSel.stock, 0) * unitActual + cantNum * unitNuevo) / (Math.max(insumoSel.stock, 0) + cantNum)
      : 0;

  const registrarCompra = async () => {
    if (!insumoSel) return toast.error("Elige el insumo que compraste.");
    if (!Number.isFinite(cantNum) || cantNum <= 0) return toast.error("Escribe la cantidad comprada.");
    if (!Number.isFinite(costoNum) || costoNum < 0 || !costo.trim()) return toast.error("Escribe el valor total de la compra.");
    setGuardando(true);
    const { error } = await supabase.rpc("registrar_compra_insumo", {
      p_insumo: insumoSel.id,
      p_cantidad: cantNum,
      p_costo_total: costoNum,
      p_proveedor: proveedor.trim() || insumoSel.proveedor || "",
      p_credito: credito,
    });
    setGuardando(false);
    if (error) return toast.error("No se pudo registrar la compra.");
    toast.success(`Compra registrada: +${cantNum} ${insumoSel.unidad} al inventario.`);
    setCantidad("");
    setCosto("");
    setCredito(false);
    cargarInventario();
    cargar();
  };

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, contacto, estado, monto")
      .eq("modulo", "proveedores");
    if (error) toast.error("No se pudieron cargar los proveedores.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porProveedor = useMemo(() => {
    const mapa = new Map<string, { porPagar: number; pagado: number }>();
    for (const f of filas) {
      const nombre = (f.contacto ?? f.titulo).trim() || f.titulo;
      const actual = mapa.get(nombre) ?? { porPagar: 0, pagado: 0 };
      if (f.estado === "hecho") actual.pagado += f.monto;
      else actual.porPagar += f.monto;
      mapa.set(nombre, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.porPagar - a.porPagar);
  }, [filas]);

  const totalPorPagar = porProveedor.reduce((s, p) => s + p.porPagar, 0);
  const totalPagado = porProveedor.reduce((s, p) => s + p.pagado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Truck className="h-7 w-7 text-primary" /> Proveedores y compras
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que debes a cada proveedor por sus compras. Registra cada compra en{" "}
          <Link to="/modulos/$id" params={{ id: "proveedores" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcala como "Pagado" cuando la canceles.
        </p>
      </div>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Registrar compra al inventario</h2>
        {insumos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Primero crea tus insumos en el Recetario e inventario.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className={campo}
                value={insumoId}
                onChange={(e) => {
                  setInsumoId(e.target.value);
                  setProveedor(insumos.find((x) => x.id === e.target.value)?.proveedor ?? "");
                }}
              >
                <option value="">Elige el insumo *</option>
                {insumos.map((x) => (
                  <option key={x.id} value={x.id}>{x.nombre} (hay {Number(x.stock.toFixed(2))} {x.unidad})</option>
                ))}
              </select>
              <input className={campo} placeholder="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
              <input
                className={campo}
                inputMode="decimal"
                placeholder={`Cantidad comprada${insumoSel ? ` (${insumoSel.unidad})` : ""} *`}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              <input className={campo} inputMode="decimal" placeholder="Valor total pagado (COP) *" value={costo} onChange={(e) => setCosto(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={credito} onChange={(e) => setCredito(e.target.checked)} className="h-4 w-4" />
              Compra a crédito (queda por pagar al proveedor)
            </label>
            {insumoSel && cantNum > 0 && costo.trim() !== "" && (
              <p className="text-xs text-muted-foreground">
                Costo de esta compra: {dinero(unitNuevo)} por {insumoSel.unidad}. El costo promedio del inventario pasa de{" "}
                {dinero(unitActual)} a <span className="text-foreground">{dinero(unitProm)}</span>.
              </p>
            )}
            <button
              disabled={guardando}
              onClick={registrarCompra}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              Registrar compra
            </button>
          </>
        )}
        {compras.length > 0 && (
          <div className="space-y-1 border-t border-glass-border pt-3">
            <p className="text-xs text-muted-foreground">Últimas compras</p>
            {compras.map((c) => (
              <p key={c.id} className="break-words text-xs text-foreground">
                {new Date(c.created_at).toLocaleDateString("es-CO")} · {insumos.find((x) => x.id === c.insumo_id)?.nombre ?? "Insumo"} · +{Number(c.cantidad.toFixed(2))} · {c.motivo}
              </p>
            ))}
          </div>
        )}
      </GlassPanel>

      {cargando && <p className="text-sm text-muted-foreground">Cargando proveedores…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Por pagar</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(totalPorPagar)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ya pagado</p>
              <p className="truncate font-display text-xl text-primary">{dinero(totalPagado)}</p>
            </GlassPanel>
          </div>

          {porProveedor.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes compras registradas.</p>}

          <div className="space-y-2">
            {porProveedor.map((p) => (
              <GlassPanel key={p.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{p.nombre}</p>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Por pagar: <span className="text-foreground">{dinero(p.porPagar)}</span></p>
                  <p>Pagado: <span className="text-foreground">{dinero(p.pagado)}</span></p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

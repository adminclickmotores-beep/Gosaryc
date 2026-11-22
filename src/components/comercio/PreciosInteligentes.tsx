import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Flame, Loader2, PackageX, Sparkles, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { campo, dinero, usarProductos } from "@/components/comercio/ComercioModulos";
import { consultarIndicadores, publicarOfertaAgente, type Indicadores } from "@/lib/precios-ia.functions";

type Producto = Tables<"com_productos">;

const CLAVE_PARAMS = "gosaryc:rentabilidad:parametros";
const CLAVE_IND = "gosaryc:rentabilidad:indicadores";
const MARGEN_MINIMO_OFERTA = 8;

type Params = { margen: number; comision: number; merma: number; ivaNoDesc: number };
const PARAMS_BASE: Params = { margen: 25, comision: 2.5, merma: 1, ivaNoDesc: 0 };

const redondear50 = (n: number) => Math.ceil(n / 50) * 50;
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const objeto = (j: Json): Record<string, Json | undefined> =>
  j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, Json | undefined>) : {};

// ============================================================
// Cálculo de rentabilidad por producto
// ============================================================
type Semaforo = "rojo" | "ambar" | "verde" | "sin_costo";
type Analisis = {
  semaforo: Semaforo;
  costoReal: number;
  neto: number;
  utilidad: number;
  margenPct: number;
  equilibrio: number;
  sugerido: number;
  dias: number;
  perdidaPoder: number;
  reajusteIpc: number;
  nota: string;
};

function analizar(p: Producto, par: Params, ipcAnual: number | null): Analisis {
  const imp = p.tipo_impuesto === "iva" || p.impuesto_pct > 0 ? p.impuesto_pct / 100 : 0;
  const aLista = (neto: number) => redondear50(p.precio_incluye_impuesto ? neto * (1 + imp) : neto);
  const neto = p.precio_incluye_impuesto ? p.precio_detal / (1 + imp) : p.precio_detal;
  const costoReal = p.costo * (1 + par.ivaNoDesc / 100) * (1 + par.merma / 100);
  const com = par.comision / 100;
  const utilidad = neto * (1 - com) - costoReal;
  const margenPct = neto > 0 ? (utilidad / neto) * 100 : -100;
  const equilibrio = aLista(costoReal / (1 - com));
  const divisor = 1 - com - par.margen / 100;
  const sugerido = aLista(divisor > 0.05 ? costoReal / divisor : costoReal * 2);

  const a = objeto(p.atributos);
  const ref = typeof a.precio_actualizado === "string" ? a.precio_actualizado : p.created_at;
  const dias = Math.max(0, Math.floor((Date.now() - new Date(ref).getTime()) / 86400000));
  const ipcAcum = ipcAnual && dias >= 60 ? (ipcAnual * dias) / 365 : 0;
  const reajusteIpc = redondear50(p.precio_detal * (1 + ipcAcum / 100));
  const perdidaPoder = Math.max(0, reajusteIpc - p.precio_detal);

  const base = { costoReal, neto, utilidad, margenPct, equilibrio, sugerido, dias, perdidaPoder, reajusteIpc };
  if (p.costo <= 0) return { ...base, semaforo: "sin_costo", nota: "Falta registrar el costo de compra." };
  if (margenPct < 10) return { ...base, semaforo: "rojo", nota: margenPct < 0 ? "Vendes por debajo de tu costo real." : "Margen por debajo del 10 %." };
  if (ipcAcum >= 1 && perdidaPoder >= 50) {
    return { ...base, semaforo: "ambar", nota: `Hace ${dias} días no actualizas el precio; la inflación (${ipcAcum.toFixed(1)} %) le quitó poder adquisitivo.` };
  }
  return { ...base, semaforo: "verde", nota: "Producto rentable." };
}

const ESTILO: Record<Semaforo, string> = {
  rojo: "border-red-500/50 bg-red-500/10",
  ambar: "border-amber-500/50 bg-amber-500/10",
  verde: "border-emerald-500/40 bg-emerald-500/10",
  sin_costo: "border-glass-border bg-glass/30",
};
const PUNTO: Record<Semaforo, string> = {
  rojo: "bg-red-500",
  ambar: "bg-amber-500",
  verde: "bg-emerald-500",
  sin_costo: "bg-muted-foreground",
};

// ============================================================
// Pestaña 1: Rentabilidad y precios sugeridos
// ============================================================
export function RentabilidadPrecios() {
  const { productos, cargando, recargar } = usarProductos();
  const [par, setPar] = useState<Params>(PARAMS_BASE);
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [filtro, setFiltro] = useState<Semaforo | "todos">("todos");
  const [aplicando, setAplicando] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem(CLAVE_PARAMS);
      if (p) setPar({ ...PARAMS_BASE, ...(JSON.parse(p) as Partial<Params>) });
      const i = localStorage.getItem(CLAVE_IND);
      if (i) setInd(JSON.parse(i) as Indicadores);
    } catch {
      // valores por defecto
    }
  }, []);

  const cambiarPar = (k: keyof Params, v: string) => {
    const nuevo = { ...par, [k]: Math.min(95, Math.max(0, num(v))) };
    setPar(nuevo);
    try {
      localStorage.setItem(CLAVE_PARAMS, JSON.stringify(nuevo));
    } catch {
      // sin almacenamiento
    }
  };

  const traerIndicadores = useCallback(async (silencioso: boolean) => {
    setBuscando(true);
    try {
      const r = await consultarIndicadores({ data: {} });
      if (r) {
        setInd(r);
        try {
          localStorage.setItem(CLAVE_IND, JSON.stringify(r));
        } catch {
          // sin almacenamiento
        }
        if (!silencioso) toast.success("Inflación y UVT actualizadas desde internet.");
      } else if (!silencioso) {
        toast.error("No pude consultar la inflación ahora. Revisa la llave de Gemini.");
      }
    } catch (e) {
      if (!silencioso) toast.error(e instanceof Error ? e.message : "No se pudo consultar.");
    } finally {
      setBuscando(false);
    }
  }, []);

  // Si el dato tiene más de 3 días (o no existe) se refresca solo.
  useEffect(() => {
    let vencido = true;
    try {
      const i = localStorage.getItem(CLAVE_IND);
      if (i) vencido = Date.now() - new Date((JSON.parse(i) as Indicadores).fecha).getTime() > 3 * 86400000;
    } catch {
      vencido = true;
    }
    if (vencido) void traerIndicadores(true);
  }, [traerIndicadores]);

  const filas = useMemo(
    () => productos.filter((p) => p.activo).map((p) => ({ p, a: analizar(p, par, ind?.ipc_anual ?? null) })),
    [productos, par, ind],
  );
  const conteo = useMemo(() => {
    const c = { rojo: 0, ambar: 0, verde: 0, sin_costo: 0 };
    for (const f of filas) c[f.a.semaforo] += 1;
    return c;
  }, [filas]);
  const visibles = filas
    .filter((f) => filtro === "todos" || f.a.semaforo === filtro)
    .sort((x, y) => ({ rojo: 0, ambar: 1, sin_costo: 2, verde: 3 })[x.a.semaforo] - ({ rojo: 0, ambar: 1, sin_costo: 2, verde: 3 })[y.a.semaforo]);

  const aplicar = async (p: Producto, precio: number) => {
    setAplicando(p.id);
    const atributos = { ...objeto(p.atributos), precio_actualizado: new Date().toISOString() } as Json;
    const { error } = await supabase.from("com_productos").update({ precio_detal: precio, atributos }).eq("id", p.id);
    setAplicando(null);
    if (error) return toast.error("No se pudo actualizar el precio.");
    toast.success(`Precio de ${p.nombre} actualizado a ${dinero(precio)}.`);
    void recargar();
  };

  if (cargando) return <div className="flex min-h-[20dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <GlassPanel className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg">Parámetros de tu costo real</h3>
            <p className="text-sm text-muted-foreground">
              Costo real = costo de compra + IVA no descontable + merma; además se descuenta la comisión de datáfono/pasarela del precio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void traerIndicadores(false)}
            disabled={buscando}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm hover:bg-glass/40 disabled:opacity-60"
          >
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            Actualizar IPC y UVT
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["margen", "Margen objetivo %"],
              ["comision", "Comisión datáfono %"],
              ["merma", "Merma %"],
              ["ivaNoDesc", "IVA no descontable %"],
            ] as const
          ).map(([k, t]) => (
            <label key={k} className="block text-sm text-muted-foreground">
              <span className="mb-1 block">{t}</span>
              <input className={campo} inputMode="decimal" value={String(par[k])} onChange={(e) => cambiarPar(k, e.target.value)} />
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {ind
            ? `Inflación anual: ${ind.ipc_anual !== null ? `${ind.ipc_anual} %` : "sin dato"} · UVT: ${ind.uvt !== null ? dinero(ind.uvt) : "sin dato"} · Fuente: ${ind.fuente} (${ind.fecha.slice(0, 10)})`
            : "Aún no hay dato de inflación; el semáforo ámbar se activa al consultarlo."}
        </p>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            ["rojo", "En pérdida / margen bajo", conteo.rojo],
            ["ambar", "Desactualizados", conteo.ambar],
            ["verde", "Rentables", conteo.verde],
            ["todos", "Ver todos", filas.length],
          ] as const
        ).map(([k, t, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFiltro(k)}
            className={`rounded-xl border p-3 text-left ${filtro === k ? "ring-2 ring-primary" : ""} ${k === "todos" ? "border-glass-border bg-glass/30" : ESTILO[k]}`}
          >
            <p className="text-2xl font-semibold">{n}</p>
            <p className="text-sm text-muted-foreground">{t}</p>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <GlassPanel className="p-6 text-center text-sm text-muted-foreground">No hay productos en esta categoría.</GlassPanel>
      ) : (
        <div className="space-y-2">
          {visibles.map(({ p, a }) => (
            <div key={p.id} className={`rounded-xl border p-3 ${ESTILO[a.semaforo]}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${PUNTO[a.semaforo]}`} />
                    <span className="break-words">{p.nombre}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Precio {dinero(p.precio_detal)} · Costo real {dinero(Math.round(a.costoReal))} · Margen {a.margenPct.toFixed(1)} %
                  </p>
                </div>
                {a.semaforo === "verde" && (
                  <p className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Utilidad neta {dinero(Math.round(a.utilidad))} ({a.margenPct.toFixed(1)} %)
                  </p>
                )}
              </div>
              {a.semaforo === "rojo" && (
                <div className="mt-2 space-y-2">
                  <p className="flex items-center gap-1 text-sm"><AlertTriangle className="h-4 w-4 text-red-500" /> {a.nota}</p>
                  <p className="text-sm">
                    Precio mínimo de equilibrio: <b>{dinero(a.equilibrio)}</b> · Precio sugerido ({par.margen} % de margen): <b>{dinero(a.sugerido)}</b>
                  </p>
                  <button
                    type="button"
                    disabled={aplicando === p.id}
                    onClick={() => void aplicar(p, a.sugerido)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {aplicando === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Aplicar precio sugerido en 1 clic
                  </button>
                </div>
              )}
              {a.semaforo === "ambar" && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm">{a.nota}</p>
                  <p className="text-sm">
                    Poder adquisitivo perdido: <b>{dinero(a.perdidaPoder)}</b> por unidad · Reajuste exacto: <b>{dinero(a.reajusteIpc)}</b>
                  </p>
                  <button
                    type="button"
                    disabled={aplicando === p.id}
                    onClick={() => void aplicar(p, a.reajusteIpc)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {aplicando === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Aplicar reajuste por inflación
                  </button>
                </div>
              )}
              {a.semaforo === "sin_costo" && <p className="mt-1 text-sm text-muted-foreground">{a.nota}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Pestaña 2: Inventario quedado y ofertas sugeridas
// ============================================================
type Quedado = {
  p: Producto;
  diasSinVenta: number;
  diasParaVencer: number | null;
  capital: number;
  motivo: string;
  oferta: { activa: boolean; precio: number } | null;
};
type Estrategia = { clave: "descuento" | "combo"; titulo: string; detalle: string; precio: number; cambiaPrecio: boolean; mensaje: string };

function estrategias(q: Quedado, par: Params, estrella: Producto | null): Estrategia[] {
  const { p } = q;
  const imp = p.tipo_impuesto === "iva" || p.impuesto_pct > 0 ? p.impuesto_pct / 100 : 0;
  const com = par.comision / 100;
  const costoReal = p.costo * (1 + par.ivaNoDesc / 100) * (1 + par.merma / 100);
  const lista = (neto: number) => redondear50(p.precio_incluye_impuesto ? neto * (1 + imp) : neto);
  const netoActual = p.precio_incluye_impuesto ? p.precio_detal / (1 + imp) : p.precio_detal;
  // Precio neto mínimo para conservar 8 % de ganancia sobre el neto.
  const netoMin = costoReal / (1 - com - MARGEN_MINIMO_OFERTA / 100);
  const maxDesc = netoActual > 0 ? Math.floor((1 - netoMin / netoActual) * 100) : 0;
  const lista_: Estrategia[] = [];
  if (maxDesc >= 5) {
    const d = Math.min(15, maxDesc);
    const precio = lista(netoActual * (1 - d / 100));
    lista_.push({
      clave: "descuento",
      titulo: `Descuento relámpago del ${d} %`,
      detalle: `Pasa de ${dinero(p.precio_detal)} a ${dinero(precio)} y aún te queda al menos ${MARGEN_MINIMO_OFERTA} % de ganancia.`,
      precio,
      cambiaPrecio: true,
      mensaje: `Oferta relámpago: ${p.nombre} ahora a ${dinero(precio)} (antes ${dinero(p.precio_detal)}), hasta agotar existencias. Ofrécelo activamente cuando el cliente pregunte por productos similares o quiera aprovechar.`,
    });
  } else {
    lista_.push({
      clave: "descuento",
      titulo: "Precio de liquidación al costo protegido",
      detalle: `Tu margen es muy ajustado para descontar. Mejor mantén ${dinero(p.precio_detal)} y empújalo con un combo.`,
      precio: p.precio_detal,
      cambiaPrecio: false,
      mensaje: `${p.nombre} es un producto recomendado, disponible ahora. Ofrécelo junto con otros productos cuando encaje.`,
    });
  }
  const compañero = estrella ? estrella.nombre : "tu producto más vendido";
  lista_.push({
    clave: "combo",
    titulo: `Combo gancho con ${compañero}`,
    detalle: `Ofrece ${p.nombre} como regalo-sugerencia al comprar ${compañero}, sin bajar el precio en caja. Solo se envía al agente de WhatsApp.`,
    precio: p.precio_detal,
    cambiaPrecio: false,
    mensaje: `Combo: al comprar ${compañero} sugiere llevar también ${p.nombre} (${dinero(p.precio_detal)}). Menciónalo siempre que el cliente pida ${compañero}.`,
  });
  return lista_;
}

export function InventarioQuedado() {
  const { productos, cargando, recargar } = usarProductos();
  const [par, setPar] = useState<Params>(PARAMS_BASE);
  const [ultimaVenta, setUltimaVenta] = useState<Map<string, number>>(new Map());
  const [vendidas90, setVendidas90] = useState<Map<string, number>>(new Map());
  const [vence, setVence] = useState<Map<string, string>>(new Map());
  const [leyendo, setLeyendo] = useState(true);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem(CLAVE_PARAMS);
      if (p) setPar({ ...PARAMS_BASE, ...(JSON.parse(p) as Partial<Params>) });
    } catch {
      // valores por defecto
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [items, lotes] = await Promise.all([
        supabase.from("com_venta_items").select("producto_id, cantidad_base, created_at").order("created_at", { ascending: false }).limit(5000),
        supabase.from("com_lotes").select("producto_id, vence, cantidad_actual").gt("cantidad_actual", 0).not("vence", "is", null).limit(2000),
      ]);
      if (!vivo) return;
      const ult = new Map<string, number>();
      const cant = new Map<string, number>();
      const corte = Date.now() - 90 * 86400000;
      for (const i of items.data ?? []) {
        const t = new Date(i.created_at).getTime();
        if (!ult.has(i.producto_id)) ult.set(i.producto_id, t);
        if (t >= corte) cant.set(i.producto_id, (cant.get(i.producto_id) ?? 0) + Number(i.cantidad_base));
      }
      const vc = new Map<string, string>();
      for (const l of lotes.data ?? []) {
        if (!l.vence) continue;
        const previo = vc.get(l.producto_id);
        if (!previo || l.vence < previo) vc.set(l.producto_id, l.vence);
      }
      setUltimaVenta(ult);
      setVendidas90(cant);
      setVence(vc);
      setLeyendo(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const estrella = useMemo(() => {
    let mejor: Producto | null = null;
    let max = 0;
    for (const p of productos) {
      const c = vendidas90.get(p.id) ?? 0;
      if (c > max) {
        max = c;
        mejor = p;
      }
    }
    return mejor;
  }, [productos, vendidas90]);

  const lista = useMemo<Quedado[]>(() => {
    const hoy = Date.now();
    const out: Quedado[] = [];
    for (const p of productos) {
      if (!p.activo || p.stock <= 0) continue;
      const ult = ultimaVenta.get(p.id) ?? new Date(p.created_at).getTime();
      const diasSinVenta = Math.floor((hoy - ult) / 86400000);
      const v = vence.get(p.id);
      const diasParaVencer = v ? Math.ceil((new Date(`${v}T23:59:59`).getTime() - hoy) / 86400000) : null;
      const lento = diasSinVenta > 45;
      const porVencer = diasParaVencer !== null && diasParaVencer < 30;
      if (!lento && !porVencer) continue;
      const a = objeto(p.atributos);
      const of = a.oferta_activa === true ? { activa: true, precio: p.precio_detal } : null;
      out.push({
        p,
        diasSinVenta,
        diasParaVencer,
        capital: Math.max(0, p.stock) * p.costo,
        motivo: porVencer
          ? diasParaVencer! < 0
            ? `Vencido hace ${Math.abs(diasParaVencer!)} días`
            : `Vence en ${diasParaVencer} días`
          : `${diasSinVenta} días sin venderse`,
        oferta: of,
      });
    }
    return out.sort((x, y) => y.capital - x.capital);
  }, [productos, ultimaVenta, vence]);

  const capitalTotal = lista.reduce((s, q) => s + q.capital, 0);

  const activar = async (q: Quedado, e: Estrategia) => {
    setTrabajando(q.p.id + e.clave);
    try {
      const a = objeto(q.p.atributos);
      if (e.cambiaPrecio) {
        const atributos = {
          ...a,
          oferta_activa: true,
          precio_original: typeof a.precio_original === "number" ? a.precio_original : q.p.precio_detal,
          oferta_texto: e.titulo,
          precio_actualizado: new Date().toISOString(),
        } as Json;
        const { error } = await supabase.from("com_productos").update({ precio_detal: e.precio, atributos }).eq("id", q.p.id);
        if (error) throw new Error("No se pudo poner el precio promocional.");
      }
      await publicarOfertaAgente({ data: { productoId: q.p.id, texto: e.mensaje, activa: true } });
      toast.success(e.cambiaPrecio ? "Oferta activa en caja y en el agente de WhatsApp." : "Combo enviado al agente de WhatsApp.");
      void recargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo activar la oferta.");
    } finally {
      setTrabajando(null);
    }
  };

  const quitar = async (q: Quedado) => {
    setTrabajando(q.p.id + "quitar");
    try {
      const a = objeto(q.p.atributos);
      const original = typeof a.precio_original === "number" ? a.precio_original : q.p.precio_detal;
      const resto = { ...a };
      delete resto.oferta_activa;
      delete resto.precio_original;
      delete resto.oferta_texto;
      const { error } = await supabase
        .from("com_productos")
        .update({ precio_detal: original, atributos: { ...resto, precio_actualizado: new Date().toISOString() } as Json })
        .eq("id", q.p.id);
      if (error) throw new Error("No se pudo restaurar el precio.");
      await publicarOfertaAgente({ data: { productoId: q.p.id, texto: "", activa: false } });
      toast.success("Oferta terminada, precio restaurado.");
      void recargar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar la oferta.");
    } finally {
      setTrabajando(null);
    }
  };

  if (cargando || leyendo) return <div className="flex min-h-[20dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <GlassPanel className="flex flex-wrap items-center gap-4 p-4">
        <PackageX className="h-8 w-8 text-amber-500" />
        <div>
          <p className="text-sm text-muted-foreground">Capital atrapado en inventario quedado</p>
          <p className="text-2xl font-semibold">{dinero(Math.round(capitalTotal))}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {lista.length} producto(s) con más de 45 días sin venta o que vencen en menos de 30 días.
        </p>
      </GlassPanel>

      {lista.length === 0 ? (
        <GlassPanel className="p-6 text-center text-sm text-muted-foreground">
          No tienes inventario quedado. Todo lo que tienes se está moviendo.
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {lista.map((q) => {
            const est = estrategias(q, par, estrella && estrella.id !== q.p.id ? estrella : null);
            return (
              <GlassPanel key={q.p.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <Flame className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="break-words">{q.p.nombre}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {q.motivo} · {q.p.stock} {q.p.unidad_base} en stock · Capital atrapado {dinero(Math.round(q.capital))}
                    </p>
                  </div>
                  {q.oferta?.activa && (
                    <button
                      type="button"
                      disabled={trabajando !== null}
                      onClick={() => void quitar(q)}
                      className="rounded-lg border border-glass-border px-3 py-2 text-sm hover:bg-glass/40 disabled:opacity-60"
                    >
                      Terminar oferta activa ({dinero(q.oferta.precio)})
                    </button>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {est.map((e) => (
                    <div key={e.clave} className="rounded-lg border border-glass-border bg-glass/30 p-3">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="h-4 w-4 text-primary" /> {e.titulo}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{e.detalle}</p>
                      <button
                        type="button"
                        disabled={trabajando !== null}
                        onClick={() => void activar(q, e)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {trabajando === q.p.id + e.clave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Activar oferta ahora
                      </button>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Envoltorio: Productos + Rentabilidad + Inventario quedado
// ============================================================
export function ProductosInteligentes({ productos }: { productos: ReactNode }) {
  const [pestana, setPestana] = useState<"productos" | "rentabilidad" | "quedado">("productos");
  const botones = [
    { k: "productos", t: "Productos" },
    { k: "rentabilidad", t: "Rentabilidad y precios sugeridos" },
    { k: "quedado", t: "Inventario quedado y ofertas sugeridas" },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {botones.map((b) => (
          <button
            key={b.k}
            type="button"
            onClick={() => setPestana(b.k)}
            className={`rounded-full border px-4 py-2 text-sm ${pestana === b.k ? "border-primary bg-primary text-primary-foreground" : "border-glass-border hover:bg-glass/40"}`}
          >
            {b.t}
          </button>
        ))}
      </div>
      {pestana === "productos" && productos}
      {pestana === "rentabilidad" && <RentabilidadPrecios />}
      {pestana === "quedado" && <InventarioQuedado />}
    </div>
  );
}

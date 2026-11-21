import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, diasEntre, hoyISO, msg } from "@/components/negocios/comunes";

type Unidad = Tables<"cond_unidades">;
type Cuota = Tables<"cond_cuotas">;
type Vista = "unidades" | "cuotas" | "cartera";

/** Misma fórmula que la base de datos: valor × tasa mensual × días de mora / 30. */
const moraEstimada = (c: Cuota, tasa: number, hoy: string): number => {
  if (c.estado === "pagada") return c.mora;
  const dias = Math.max(diasEntre(c.vence, hoy), 0);
  return Math.round((c.valor * Math.min(Math.max(tasa, 0), 3) * dias) / 100 / 30);
};

function PanelCondominio({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [uni, setUni] = useState("");
  const [prop, setProp] = useState("");
  const [tel, setTel] = useState("");
  const [correo, setCorreo] = useState("");
  const [valorCuota, setValorCuota] = useState("");
  const [edicion, setEdicion] = useState<Record<string, string>>({});
  const [periodo, setPeriodo] = useState("");
  const [vence, setVence] = useState("");
  const [tasa, setTasa] = useState("2");
  const [metodo, setMetodo] = useState("efectivo");
  const [filtro, setFiltro] = useState<"pendientes" | "pagadas" | "todas">("pendientes");
  const [ocupado, setOcupado] = useState("");

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setPeriodo(h.slice(0, 7));
    setVence(`${h.slice(0, 8)}10`);
  }, []);

  const cargar = useCallback(async () => {
    const [u, c] = await Promise.all([
      supabase.from("cond_unidades").select("*").order("unidad").limit(1000),
      supabase.from("cond_cuotas").select("*").order("periodo", { ascending: false }).order("unidad").limit(1500),
    ]);
    setUnidades(u.data ?? []);
    setCuotas(c.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const tasaNum = num(tasa);
  const crearUnidad = async () => {
    if (!uni.trim()) return toast.error("Escribe el apartamento o casa.");
    if (prop.trim().length < 2) return toast.error("Escribe el propietario.");
    const { error } = await supabase.from("cond_unidades").insert({
      unidad: uni.trim(), propietario: prop.trim(), telefono: tel.trim() || null, correo: correo.trim() || null, cuota: Math.max(num(valorCuota), 0),
    });
    if (error) return toast.error(error.code === "23505" ? "Esa unidad ya existe." : msg(error.message, "No se pudo guardar la unidad."));
    toast.success("Unidad registrada.");
    setUni(""); setProp(""); setTel(""); setCorreo(""); setValorCuota("");
    void cargar();
  };
  const guardarCuota = async (u: Unidad) => {
    const v = edicion[u.id];
    if (v === undefined) return;
    const { error } = await supabase.from("cond_unidades").update({ cuota: Math.max(num(v), 0) }).eq("id", u.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar la cuota."));
    setEdicion((e) => {
      const { [u.id]: _omitido, ...resto } = e;
      return resto;
    });
    toast.success("Cuota actualizada para los próximos periodos.");
    void cargar();
  };
  const alternarActiva = async (u: Unidad) => {
    const { error } = await supabase.from("cond_unidades").update({ activa: !u.activa }).eq("id", u.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar la unidad."));
    void cargar();
  };

  const generar = async () => {
    setOcupado("generar");
    const { data, error } = await supabase.rpc("cond_generar_cuotas", { p_periodo: periodo, p_vence: vence });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudieron generar las cuotas."));
    const r = (data ?? {}) as { cuotas?: number; total?: number };
    toast.success(`Se generaron ${r.cuotas ?? 0} cuotas por ${dinero(r.total ?? 0)}. Quedaron en cartera y en Contabilidad.`);
    void cargar();
  };

  const recibo = (c: Cuota, r: { recibo?: string; valor?: number; mora?: number; dias_mora?: number; total?: number }) => {
    imprimirReporte(`Recibo de caja ${r.recibo ?? ""}`, `Unidad ${c.unidad} · ${c.propietario} · Periodo ${c.periodo}`,
      ["Concepto", "Valor"],
      [["Cuota de administración", dinero(r.valor ?? c.valor)], [`Interés de mora (${r.dias_mora ?? 0} días)`, dinero(r.mora ?? 0)]],
      [`Total recibido: ${dinero(r.total ?? c.valor)}`]);
  };
  const cobrar = async (c: Cuota) => {
    setOcupado(c.id);
    const { data, error } = await supabase.rpc("cond_cobrar_cuota", { p_cuota: c.id, p_metodo: metodo, p_tasa: tasaNum });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo registrar el recaudo."));
    const r = (data ?? {}) as { recibo?: string; valor?: number; mora?: number; dias_mora?: number; total?: number };
    toast.success(`Recaudo ${r.recibo ?? ""} por ${dinero(r.total ?? c.valor)} a Caja.`);
    recibo(c, r);
    void cargar();
  };

  const lista = useMemo(() => cuotas.filter((c) => (filtro === "todas" ? true : filtro === "pagadas" ? c.estado === "pagada" : c.estado === "pendiente")), [cuotas, filtro]);
  const cartera = useMemo(() => {
    const mapa = new Map<string, { unidad: string; propietario: string; telefono: string | null; cuotas: number; vencidas: number; saldo: number; mora: number }>();
    for (const c of cuotas) {
      if (c.estado === "pagada") continue;
      const u = unidades.find((x) => x.id === c.unidad_id);
      const x = mapa.get(c.unidad_id) ?? { unidad: c.unidad, propietario: c.propietario, telefono: u?.telefono ?? null, cuotas: 0, vencidas: 0, saldo: 0, mora: 0 };
      x.cuotas += 1;
      x.saldo += c.valor;
      if (hoy && c.vence < hoy) {
        x.vencidas += 1;
        x.mora += moraEstimada(c, tasaNum, hoy);
      }
      mapa.set(c.unidad_id, x);
    }
    return Array.from(mapa.values()).sort((a, b) => b.saldo + b.mora - (a.saldo + a.mora));
  }, [cuotas, unidades, hoy, tasaNum]);

  if (cargando) return <Cargando />;
  const totalCartera = cartera.reduce((s, x) => s + x.saldo, 0);
  const totalMora = cartera.reduce((s, x) => s + x.mora, 0);
  const recaudadoMes = cuotas.filter((c) => c.estado === "pagada" && c.pagada_en && hoy && c.pagada_en.slice(0, 7) === hoy.slice(0, 7)).reduce((s, c) => s + c.pagado + c.mora, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Administración del condominio" texto="Directorio de unidades y propietarios, cuotas mensuales de administración, mora automática, estado de cartera por inmueble y recaudo a Caja o Bancos con recibo." />
      <Pestanas items={[{ clave: "unidades", texto: "Unidades y propietarios" }, { clave: "cuotas", texto: "Cuotas y recaudo" }, { clave: "cartera", texto: "Cartera por inmueble" }]} valor={vista} onChange={setVista} />

      {vista === "unidades" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nueva unidad</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo etiqueta="Apto / casa *"><input className={campo} value={uni} onChange={(e) => setUni(e.target.value)} placeholder="Ej. Torre 2 - 301" /></Campo>
              <Campo etiqueta="Propietario *"><input className={campo} value={prop} onChange={(e) => setProp(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
              <Campo etiqueta="Correo"><input className={campo} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Campo>
              <Campo etiqueta="Cuota mensual"><input className={campo} inputMode="decimal" value={valorCuota} onChange={(e) => setValorCuota(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearUnidad()}>Guardar unidad</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {unidades.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay unidades registradas.</p> : unidades.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{u.unidad} · {u.propietario}</p>
                  <p className="break-words text-xs text-muted-foreground">{[u.telefono, u.correo].filter(Boolean).join(" · ") || "Sin contacto"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!u.activa && <Etiqueta texto="Inactiva" tono="alerta" />}
                  <input className={`${campo} !w-32`} inputMode="decimal" aria-label="Cuota mensual" value={edicion[u.id] ?? String(u.cuota)} onChange={(e) => setEdicion((x) => ({ ...x, [u.id]: e.target.value }))} />
                  {edicion[u.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarCuota(u)}>Guardar</button>}
                  <button type="button" className={botonSec} onClick={() => void alternarActiva(u)}>{u.activa ? "Desactivar" : "Activar"}</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "cuotas" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Generar cuotas del mes</h2>
            <p className="text-xs text-muted-foreground">Crea la cuota de todas las unidades activas que aún no la tengan. No duplica y registra la cartera en Contabilidad.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Periodo"><input type="month" className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Campo>
              <Campo etiqueta="Vence el"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
              <Campo etiqueta="Interés de mora mensual % (máx. 3)"><input className={campo} inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={ocupado === "generar"} onClick={() => void generar()}>{ocupado === "generar" ? "Generando…" : "Generar cuotas"}</button>
          </GlassPanel>

          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Mostrar">
              <select className={campo} value={filtro} onChange={(e) => setFiltro(e.target.value as "pendientes" | "pagadas" | "todas")}>
                <option value="pendientes">Pendientes</option><option value="pagadas">Pagadas</option><option value="todas">Todas</option>
              </select>
            </Campo>
            <Campo etiqueta="Recibir con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          </div>
          <GlassPanel className="space-y-2 p-4">
            {lista.length === 0 ? <p className="text-sm text-muted-foreground">No hay cuotas para mostrar.</p> : lista.map((c) => {
              const mora = moraEstimada(c, tasaNum, hoy);
              const vencida = c.estado === "pendiente" && !!hoy && c.vence < hoy;
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">{c.unidad} · {c.propietario}</p>
                    <p className="text-xs text-muted-foreground">Periodo {c.periodo} · vence {c.vence}{c.recibo ? ` · ${c.recibo}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-foreground">{dinero(c.valor)}</span>
                    {vencida && <Etiqueta texto={`Mora ${dinero(mora)}`} tono="alerta" />}
                    {c.estado === "pagada" ? <Etiqueta texto={`Pagada${c.mora > 0 ? ` (+${dinero(c.mora)} mora)` : ""}`} tono="ok" /> : (
                      <button type="button" className={boton} disabled={ocupado === c.id} onClick={() => void cobrar(c)}>Recaudar {dinero(c.valor + mora)}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </GlassPanel>
        </>
      )}

      {vista === "cartera" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Cartera pendiente" valor={dinero(totalCartera)} alerta={totalCartera > 0} />
            <Indicador titulo="Mora estimada hoy" valor={dinero(totalMora)} />
            <Indicador titulo="Recaudado este mes" valor={dinero(recaudadoMes)} />
          </div>
          <Campo etiqueta="Interés de mora mensual % usado en el cálculo"><input className={`${campo} !w-40`} inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} /></Campo>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Estado de cartera por inmueble</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("cartera-condominio", ["Unidad", "Propietario", "Cuotas pendientes", "Vencidas", "Saldo", "Mora estimada"], cartera.map((x) => [x.unidad, x.propietario, x.cuotas, x.vencidas, x.saldo, x.mora]))}>Descargar Excel</button>
            </div>
            {cartera.length === 0 ? <p className="text-sm text-muted-foreground">Todos los inmuebles están al día.</p> : cartera.map((x) => (
              <p key={x.unidad} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{x.unidad} · {x.propietario} · {x.cuotas} cuota(s){x.vencidas > 0 ? `, ${x.vencidas} vencida(s)` : ""}</span>
                <span className="text-foreground">{dinero(x.saldo + x.mora)}</span>
              </p>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

export function UnidadesCondominio() {
  return <PanelCondominio vistaInicial="unidades" />;
}
export function CuotasCondominio() {
  return <PanelCondominio vistaInicial="cuotas" />;
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Cotizacion = Tables<"cotizaciones_vehiculo">;
type Vehiculo = Tables<"vehiculos_inventario">;
type Tasa = Tables<"tasas_vehiculo">;

const ESTADOS = [
  { clave: "borrador", texto: "Borrador" },
  { clave: "enviada", texto: "Enviada" },
  { clave: "aceptada", texto: "Aceptada" },
  { clave: "rechazada", texto: "Rechazada" },
];
const PLAZOS = [12, 24, 36, 48, 60, 72, 84];
// Referencia inicial (% mensual vencido) mientras no registres la tasa del mes.
const TASA_REFERENCIA: Record<string, number> = { nuevo: 1.45, usado: 1.75 };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const nombreMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

/** Cuota fija de capital + intereses (sin seguros). tasa en % mensual. */
export function calcularCuota(capital: number, tasaMensualPct: number, meses: number): number {
  if (capital <= 0 || meses <= 0) return 0;
  const i = tasaMensualPct / 100;
  if (i === 0) return capital / meses;
  return (capital * i) / (1 - Math.pow(1 + i, -meses));
}

export function CotizacionesVehiculos() {
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [tasas, setTasas] = useState<Tasa[]>([]);
  const [filtro, setFiltro] = useState("todos");

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [vehiculoTxt, setVehiculoTxt] = useState("");
  const [condicion, setCondicion] = useState("usado");
  const [formaPago, setFormaPago] = useState("contado");
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState("");
  const [inicial, setInicial] = useState("");
  const [plazo, setPlazo] = useState(60);
  const [tasaManual, setTasaManual] = useState<string | null>(null);
  const [vigente, setVigente] = useState("");
  const [notas, setNotas] = useState("");

  const [tasaNuevo, setTasaNuevo] = useState("");
  const [tasaUsado, setTasaUsado] = useState("");

  const cargar = useCallback(async () => {
    const [c, v, t] = await Promise.all([
      supabase.from("cotizaciones_vehiculo").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("vehiculos_inventario").select("*").in("estado", ["disponible", "separado"]).order("created_at", { ascending: false }).limit(500),
      supabase.from("tasas_vehiculo").select("*").order("mes", { ascending: false }).limit(60),
    ]);
    if (c.error) toast.error("No se pudieron cargar las cotizaciones.");
    setLista(c.data ?? []);
    setVehiculos(v.data ?? []);
    setTasas(t.data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const mes = mesActual();

  /** Tasa vigente: la del mes actual, o la más reciente registrada, o la referencia. */
  const tasaVigente = useCallback(
    (cond: string): { tasa: number; origen: string } => {
      const delTipo = tasas.filter((t) => t.condicion === cond && t.mes <= mes).sort((a, b) => (a.mes < b.mes ? 1 : -1));
      if (delTipo.length > 0) {
        return { tasa: delTipo[0].tasa_mensual, origen: delTipo[0].mes === mes ? "del mes" : `de ${nombreMes(delTipo[0].mes)}` };
      }
      return { tasa: TASA_REFERENCIA[cond] ?? 1.6, origen: "de referencia" };
    },
    [tasas, mes],
  );

  const vigenteCond = tasaVigente(condicion);
  const tasaUsada = tasaManual !== null && tasaManual.trim() !== "" ? Number(tasaManual) : Number.NaN;

  const valorPrecio = Number(precio) || 0;
  const valorDesc = Math.min(Math.max(Number(descuento) || 0, 0), valorPrecio);
  const precioFinal = valorPrecio - valorDesc;
  const valorInicial = Math.min(Math.max(Number(inicial) || 0, 0), precioFinal);
  const monto = Math.max(0, precioFinal - valorInicial);
  const tasaValida = Number.isFinite(tasaUsada) && tasaUsada >= 0;
  const cuota = formaPago === "credito" && tasaValida ? calcularCuota(monto, tasaUsada, plazo) : 0;
  const totalCredito = cuota * plazo + valorInicial;
  const intereses = Math.max(0, cuota * plazo - monto);

  const elegirVehiculo = (id: string) => {
    setVehiculoId(id);
    const v = vehiculos.find((x) => x.id === id);
    if (!v) return;
    setVehiculoTxt([v.tipo === "moto" ? "Moto" : "Carro", v.marca, v.modelo, v.version, v.anio, v.placa].filter(Boolean).join(" "));
    setCondicion(v.condicion === "nuevo" ? "nuevo" : "usado");
    setPrecio(String(v.precio));
    setTasaManual(null);
  };

  const guardarTasas = async () => {
    const filas: { condicion: string; valor: string }[] = [
      { condicion: "nuevo", valor: tasaNuevo },
      { condicion: "usado", valor: tasaUsado },
    ];
    for (const f of filas) {
      if (!f.valor.trim()) continue;
      const n = Number(f.valor.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 10) return toast.error("Escribe una tasa mensual válida (por ejemplo 1.6).");
      const existente = tasas.find((t) => t.mes === mes && t.condicion === f.condicion);
      const { error } = existente
        ? await supabase.from("tasas_vehiculo").update({ tasa_mensual: n }).eq("id", existente.id)
        : await supabase.from("tasas_vehiculo").insert({ mes, condicion: f.condicion, tasa_mensual: n });
      if (error) return toast.error("No se pudo guardar la tasa.");
    }
    setTasaNuevo("");
    setTasaUsado("");
    toast.success(`Tasas de ${nombreMes(mes)} guardadas.`);
    cargar();
  };

  const guardar = async () => {
    if (!cliente.trim()) return toast.error("Escribe el nombre del cliente.");
    if (!vehiculoTxt.trim()) return toast.error("Elige o escribe el vehículo.");
    if (precioFinal <= 0) return toast.error("Escribe el precio del vehículo.");
    if (formaPago === "credito" && !tasaValida) return toast.error("Escribe la tasa mensual del crédito.");
    if (formaPago === "credito" && monto <= 0) return toast.error("El valor a financiar debe ser mayor a cero.");
    const numero = lista.reduce((m, c) => Math.max(m, c.numero), 0) + 1;
    const { error } = await supabase.from("cotizaciones_vehiculo").insert({
      numero,
      cliente: cliente.trim(),
      telefono: telefono.trim() || null,
      vehiculo_id: vehiculoId || null,
      vehiculo: vehiculoTxt.trim(),
      condicion,
      forma_pago: formaPago,
      precio: valorPrecio,
      descuento: valorDesc,
      cuota_inicial: formaPago === "credito" ? valorInicial : 0,
      monto_financiar: formaPago === "credito" ? monto : 0,
      plazo_meses: formaPago === "credito" ? plazo : null,
      tasa_mensual: formaPago === "credito" ? tasaUsada : null,
      cuota_mensual: formaPago === "credito" ? Math.round(cuota) : null,
      total_a_pagar: formaPago === "credito" ? Math.round(totalCredito) : precioFinal,
      vigente_hasta: vigente || null,
      notas: notas.trim() || null,
    });
    if (error) return toast.error("No se pudo guardar la cotización.");
    toast.success(`Cotización #${numero} guardada.`);
    setCliente(""); setTelefono(""); setVehiculoId(""); setVehiculoTxt(""); setPrecio(""); setDescuento("");
    setInicial(""); setTasaManual(null); setVigente(""); setNotas("");
    cargar();
  };

  const cambiarEstado = async (c: Cotizacion, estado: string) => {
    const { error } = await supabase.from("cotizaciones_vehiculo").update({ estado }).eq("id", c.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
  };

  const borrar = async (c: Cotizacion) => {
    if (!window.confirm(`¿Eliminar la cotización #${c.numero}?`)) return;
    const { error } = await supabase.from("cotizaciones_vehiculo").delete().eq("id", c.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  const texto = (c: Cotizacion) => {
    const base = `Cotización #${c.numero} para ${c.cliente}\n${c.vehiculo} (${c.condicion === "nuevo" ? "nuevo" : "usado"})\nPrecio: ${dinero(c.precio)}`;
    const desc = c.descuento > 0 ? `\nDescuento: ${dinero(c.descuento)}` : "";
    const vig = c.vigente_hasta ? `\nVálida hasta: ${c.vigente_hasta}` : "";
    if (c.forma_pago === "contado") return `${base}${desc}\nPago de contado: ${dinero(c.total_a_pagar)}${vig}`;
    return `${base}${desc}\nCuota inicial: ${dinero(c.cuota_inicial)}\nA financiar: ${dinero(c.monto_financiar)}\nPlazo: ${c.plazo_meses} meses\nTasa: ${c.tasa_mensual}% mensual\nCuota mensual aprox.: ${dinero(c.cuota_mensual ?? 0)}\n(Capital e intereses; no incluye seguro de vida ni otros costos. Sujeto a aprobación de la entidad.)${vig}`;
  };

  const enviar = (c: Cotizacion) => {
    const tel = (c.telefono ?? "").replace(/\D/g, "");
    const base = tel ? `https://wa.me/${tel.length === 10 ? `57${tel}` : tel}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(texto(c))}`, "_blank", "noopener");
  };

  const visibles = useMemo(() => (filtro === "todos" ? lista : lista.filter((c) => c.estado === filtro)), [lista, filtro]);
  const abiertas = lista.filter((c) => c.estado === "borrador" || c.estado === "enviada").length;
  const aceptadas = lista.filter((c) => c.estado === "aceptada").length;
  const chip = (activo: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm ${activo ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <FileText className="h-7 w-7 text-primary" /> Cotizaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Cotiza un carro o una moto de contado o a crédito. Si es a crédito, la cuota se calcula sola.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Cotizaciones</p><p className="text-lg font-medium text-foreground">{lista.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Por cerrar</p><p className="text-lg font-medium text-foreground">{abiertas}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Aceptadas</p><p className="text-lg font-medium text-foreground">{aceptadas}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <GlassPanel className="h-fit space-y-3 p-5">
            <h2 className="font-medium text-foreground">Nueva cotización</h2>
            <input className={campo} placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            <input className={campo} placeholder="WhatsApp / teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Vehículo del inventario</span>
              <select className={campo} value={vehiculoId} onChange={(e) => elegirVehiculo(e.target.value)}>
                <option value="">Elegir del inventario (o escribe abajo)</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.tipo === "moto" ? "Moto" : "Carro", v.marca, v.modelo, v.anio, v.placa].filter(Boolean).join(" ")} · {dinero(v.precio)}
                  </option>
                ))}
              </select>
            </label>
            <input className={campo} placeholder="Vehículo (marca, modelo, año)" value={vehiculoTxt} onChange={(e) => { setVehiculoTxt(e.target.value); setVehiculoId(""); }} />

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Estado del vehículo</span>
              <div className="flex gap-2">
                <button type="button" className={chip(condicion === "nuevo")} onClick={() => { setCondicion("nuevo"); setTasaManual(null); }}>Nuevo</button>
                <button type="button" className={chip(condicion === "usado")} onClick={() => { setCondicion("usado"); setTasaManual(null); }}>Usado</button>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Forma de pago</span>
              <div className="flex gap-2">
                <button type="button" className={chip(formaPago === "contado")} onClick={() => setFormaPago("contado")}>De contado</button>
                <button type="button" className={chip(formaPago === "credito")} onClick={() => setFormaPago("credito")}>A crédito</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Precio del vehículo (COP)</span>
                <input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Descuento (COP)</span>
                <input className={campo} inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
              </label>
            </div>

            {formaPago === "credito" && (
              <div className="space-y-3 rounded-xl border border-glass-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Cuota inicial (COP)</span>
                    <input className={campo} inputMode="decimal" value={inicial} onChange={(e) => setInicial(e.target.value)} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Plazo</span>
                    <select className={campo} value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>
                      {PLAZOS.map((p) => <option key={p} value={p}>{p} meses ({p / 12} {p === 12 ? "año" : "años"})</option>)}
                    </select>
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Tasa mensual (%) que cobra la entidad
                  </span>
                  <input className={campo} inputMode="decimal" placeholder="Ej: 1.6" value={tasaManual ?? ""} onChange={(e) => setTasaManual(e.target.value.replace(",", "."))} />
                </label>
                <div className="space-y-1 rounded-lg bg-glass/40 p-3 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">A financiar</span><span className="text-foreground">{dinero(monto)}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Cuota mensual (capital + intereses)</span><span className="text-lg font-medium text-primary">{dinero(Math.round(cuota))}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Intereses totales</span><span className="text-foreground">{dinero(Math.round(intereses))}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Total a pagar (con inicial)</span><span className="text-foreground">{dinero(Math.round(totalCredito))}</span></div>
                </div>
                <p className="text-xs text-muted-foreground">No incluye seguro de vida, seguro del vehículo ni otros costos de la entidad. Es un valor aproximado.</p>
              </div>
            )}

            {formaPago === "contado" && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total de contado</span>
                <span className="text-lg font-medium text-foreground">{dinero(precioFinal)}</span>
              </div>
            )}

            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Válida hasta</span>
              <input className={campo} type="date" value={vigente} onChange={(e) => setVigente(e.target.value)} />
            </label>
            <textarea className={campo} rows={2} placeholder="Notas o condiciones (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
            <button onClick={guardar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Guardar cotización
            </button>
          </GlassPanel>

          <GlassPanel className="h-fit space-y-3 p-5">
            <h2 className="font-medium text-foreground">Tasas de {nombreMes(mes)}</h2>
            <p className="text-xs text-muted-foreground">
              Escribe la tasa mensual promedio que están manejando los bancos este mes. Se usa sola en las cotizaciones y cada mes queda guardada.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Nuevo (% mensual) · hoy {tasaVigente("nuevo").tasa}%</span>
                <input className={campo} inputMode="decimal" value={tasaNuevo} onChange={(e) => setTasaNuevo(e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Usado (% mensual) · hoy {tasaVigente("usado").tasa}%</span>
                <input className={campo} inputMode="decimal" value={tasaUsado} onChange={(e) => setTasaUsado(e.target.value)} />
              </label>
            </div>
            <button onClick={guardarTasas} className="rounded-lg border border-glass-border px-4 py-2 text-sm text-foreground hover:bg-glass/40">
              Guardar tasas del mes
            </button>
            {tasas.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {[...new Set(tasas.map((t) => t.mes))].slice(0, 6).map((m) => (
                  <li key={m} className="capitalize">
                    {nombreMes(m)}: nuevo {tasas.find((t) => t.mes === m && t.condicion === "nuevo")?.tasa_mensual ?? "—"}% · usado {tasas.find((t) => t.mes === m && t.condicion === "usado")?.tasa_mensual ?? "—"}%
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[{ clave: "todos", texto: "Todas" }, ...ESTADOS].map((e) => (
              <button
                key={e.clave}
                onClick={() => setFiltro(e.clave)}
                className={`rounded-full px-4 py-1.5 ${filtro === e.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
              >
                {e.texto}
              </button>
            ))}
          </div>
          {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay cotizaciones.</p>}
          {visibles.map((c) => (
            <GlassPanel key={c.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">#{c.numero} · {c.cliente}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {c.vehiculo} · {c.condicion === "nuevo" ? "Nuevo" : "Usado"} · {c.forma_pago === "credito" ? "A crédito" : "De contado"}
                  </p>
                </div>
                <button onClick={() => borrar(c)} aria-label="Eliminar" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {c.forma_pago === "credito" ? (
                <p className="text-xs text-muted-foreground">
                  Inicial {dinero(c.cuota_inicial)} · {c.plazo_meses} meses al {c.tasa_mensual}% mensual · cuota{" "}
                  <b className="text-foreground">{dinero(c.cuota_mensual ?? 0)}</b>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Precio {dinero(c.precio)}{c.descuento > 0 ? ` · descuento ${dinero(c.descuento)}` : ""}</p>
              )}
              {c.vigente_hasta && <p className="text-xs text-muted-foreground">Válida hasta {c.vigente_hasta}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{dinero(c.total_a_pagar)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => enviar(c)} className="inline-flex items-center gap-1 rounded-lg border border-glass-border px-2 py-1.5 text-xs text-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                  <select
                    className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1.5 text-base text-foreground"
                    value={c.estado}
                    onChange={(e) => cambiarEstado(c, e.target.value)}
                  >
                    {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
                  </select>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

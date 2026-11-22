import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, BadgeCheck, ChevronDown, ChevronUp, ExternalLink, Gauge, Loader2, MessageCircle, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import {
  obtenerTarifasVehiculares,
  tasarVehiculo,
  TARIFAS_2026,
  type TarifasRespuesta,
  type TasacionVehiculo,
} from "@/lib/precios-ia.functions";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
/** Si el año vigente aún no está verificado, se reajustan las últimas tarifas con este IPC aproximado. */
const IPC_REAJUSTE = 0.05;
const NOTA_PERITAJE =
  "⚠️ Oferta preliminar de compra para reventa sujeta a peritaje mecánico, estructural y revisión jurídica previa. El cierre definitivo se realiza una vez aprobado el peritaje.";
const PERFILES: { c: string; t: string; p: number }[] = [
  { c: "carne", t: "Alta rotación «carne» (11 %)", p: 11 },
  { c: "media", t: "Gama media (14 %)", p: 14 },
  { c: "camioneta", t: "Camioneta / alto cilindraje (20 %)", p: 20 },
  { c: "poco", t: "Poco comercial (26 %)", p: 26 },
  { c: "manual", t: "Manual (% o $)", p: 0 },
];
const num = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function Entrada({ t, children }: { t: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted-foreground">
      <span className="mb-1 block">{t}</span>
      {children}
    </label>
  );
}

/** Tasador de compra para reventa de carros y motos usados (100 % manual, sin consultas por placa). */
export function TasadorMercado({ abierto = false }: { abierto?: boolean }) {
  const [visible, setVisible] = useState(abierto);
  const [f, setF] = useState({
    tipo: "carro", marca: "", linea: "", anio: "", cilindraje: "", km: "", precio: "",
    combustible: "gasolina", ajusteGnv: "18",
    rotacion: "media", margen: "14", modoMargen: "pct",
    color: "comercial", ciudad: "local", duenos: "1",
    derechos: "", alistamiento: "", impuestos: "0",
    soatFecha: "", tecnoFecha: "", soatTarifa: "", tecnoTarifa: "", tecnoExento: false,
    certificado: false, prenda: false, autorretenedor: false,
  });
  const [cargando, setCargando] = useState(false);
  const [r, setR] = useState<TasacionVehiculo | null>(null);
  const [tar, setTar] = useState<TarifasRespuesta | null>(null);
  // La fecha y el año actual se leen en el navegador (evita diferencias servidor/cliente).
  const [hoy, setHoy] = useState<number | null>(null);
  useEffect(() => { setHoy(Date.now()); }, []);
  const anioActual = hoy ? new Date(hoy).getFullYear() : 2026;
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const marcar = (k: keyof typeof f, v: boolean) => setF((p) => ({ ...p, [k]: v }));

  // Tarifas del año vigente: se actualizan solas al cambiar de año o cada 30 días.
  useEffect(() => {
    if (!visible || tar) return;
    let vivo = true;
    obtenerTarifasVehiculares({ data: {} })
      .then((x) => { if (vivo) setTar(x); })
      .catch(() => { /* se usan las tarifas 2026 de respaldo */ });
    return () => { vivo = false; };
  }, [visible, tar]);

  const consultar = async () => {
    setCargando(true);
    try {
      const res = await tasarVehiculo({
        data: { tipo: f.tipo, marca: f.marca, linea: f.linea, anio: num(f.anio), cilindraje: f.cilindraje, km: num(f.km) },
      });
      setR(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo consultar el mercado.");
    } finally {
      setCargando(false);
    }
  };

  const precio = num(f.precio);
  let semaforo: { t: string; c: string; d: string } | null = null;
  if (r && precio > 0) {
    const barato = r.bajo + (r.promedio - r.bajo) * 0.35;
    const justo = r.promedio + (r.alto - r.promedio) * 0.35;
    semaforo =
      precio <= barato
        ? { t: "Barato (alta rotación)", c: "border-emerald-500/50 bg-emerald-500/10", d: "Se vende rápido: está por debajo de lo que pide el mercado." }
        : precio <= justo
          ? { t: "Precio justo", c: "border-amber-500/50 bg-amber-500/10", d: "Está dentro del rango normal del mercado." }
          : { t: "Costoso (riesgo de quedarse en vitrina)", c: "border-red-500/50 bg-red-500/10", d: "Está por encima del mercado; tardará en rotar." };
  }

  // ---- Tarifas vigentes (con reajuste automático si el año vigente aún no está verificado) ----
  const T = tar?.tarifas ?? TARIFAS_2026;
  const factor = T.anio < anioActual ? Math.pow(1 + IPC_REAJUSTE, anioActual - T.anio) : 1;
  const redondear = (n: number) => Math.round((n * factor) / 100) * 100;
  const esMoto = f.tipo === "moto";
  const cc = num(f.cilindraje);
  const soatBase = esMoto
    ? cc > 0 && cc < 100 ? T.soat.moto_menor_100 : cc > 200 ? T.soat.moto_mayor_200 : T.soat.moto_100_200
    : cc > 2500 ? T.soat.carro_mayor_2500 : cc >= 1500 ? T.soat.carro_1500_2500 : T.soat.carro_menor_1500;
  const pick = (v: string, def: number) => (v.trim() === "" ? def : num(v));
  const derechosDef = redondear(esMoto ? T.transito.derechos_moto : T.transito.derechos_carro);
  const alistDef = Math.round(((esMoto ? 140000 : 380000) * factor) / 100) * 100;
  const soatDef = redondear(soatBase);
  const tecnoDef = redondear(esMoto ? T.tecno.moto : T.tecno.carro);
  const derechos = pick(f.derechos, derechosDef);
  const alistamiento = pick(f.alistamiento, alistDef);
  const soatAnual = pick(f.soatTarifa, soatDef);
  const tecnoAnual = pick(f.tecnoTarifa, tecnoDef);
  const certificado = f.certificado ? redondear(T.transito.certificado) : 0;
  const prenda = f.prenda ? redondear(T.transito.prenda) : 0;
  const traspasoTotal = derechos + certificado + prenda;
  const impuestos = num(f.impuestos);

  // ---- Valor base: mercado del día (-5 %), tope por 0 km en modelos nuevos ----
  const anio = num(f.anio);
  const esNuevo = anio >= anioActual && anio > 0;
  const base0 = r ? r.promedio : 0;
  const base1 = r && esNuevo && r.precio_0km ? Math.min(base0, Math.round(r.precio_0km * 0.9)) : base0;

  // ---- Ajustes porcentuales del vehículo ----
  const ajustes: { t: string; p: number }[] = [];
  if (r?.tendencia === "baja") ajustes.push({ t: "Modelo a la baja (colchón de seguridad)", p: 3 });
  if (f.combustible === "gnv") ajustes.push({ t: "Gas vehicular (GNV)", p: Math.min(40, num(f.ajusteGnv)) });
  if (f.color === "poco") ajustes.push({ t: "Color poco comercial", p: 4 });
  if (f.ciudad === "foranea") ajustes.push({ t: "Matrícula foránea / plaza lenta", p: 3 });
  if (f.duenos === "4") ajustes.push({ t: "4 o más dueños", p: 3.5 });
  else if (f.duenos === "2") ajustes.push({ t: "2 a 3 dueños", p: 1.5 });
  const km = num(f.km);
  const kmAnio = km > 0 && anio > 0 ? km / Math.max(1, anioActual - anio) : 0;
  const umbralKm = esMoto ? 10000 : 15000;
  if (kmAnio > umbralKm) {
    const p = Math.min(6, 3 + (kmAnio / umbralKm - 1) * 6);
    ajustes.push({ t: `Kilometraje alto (${Math.round(kmAnio).toLocaleString("es-CO")} km/año)`, p: Math.round(p * 10) / 10 });
  }
  const pctTotal = ajustes.reduce((s, a) => s + a.p, 0);
  const ajusteValor = Math.round((base1 * pctTotal) / 100);
  const valorAjustado = Math.max(0, base1 - ajusteValor);

  // ---- Retención en la fuente (1 %, con exenciones) ----
  const motoExenta = esMoto && cc > 0 && cc <= T.retefuente.moto_exenta_cc_max;
  const retiene = !f.autorretenedor && !motoExenta;
  const retefuente = retiene ? Math.round((valorAjustado * T.retefuente.porcentaje) / 100) : 0;

  // ---- Prorrateo SOAT / Tecnomecánica (regla de 6 meses) ----
  const prorrateo = (fecha: string, anual: number): { dias: number | null; valor: number } => {
    if (!fecha || !hoy) return { dias: null, valor: 0 };
    const dias = Math.ceil((new Date(`${fecha}T23:59:59`).getTime() - hoy) / 86400000);
    if (dias >= 180) return { dias, valor: 0 };
    if (dias <= 0) return { dias, valor: anual };
    return { dias, valor: Math.round(((180 - dias) / 365) * anual) };
  };
  const pSoat = prorrateo(f.soatFecha, soatAnual);
  const pTecno = f.tecnoExento ? { dias: null, valor: 0 } : prorrateo(f.tecnoFecha, tecnoAnual);
  const papeles = pSoat.valor + pTecno.valor;

  // ---- Utilidad esperada según perfil de rotación ----
  const perfil = PERFILES.find((p) => p.c === f.rotacion) ?? PERFILES[1];
  const margenPesos = r
    ? f.rotacion !== "manual"
      ? (valorAjustado * perfil.p) / 100
      : f.modoMargen === "pesos" ? num(f.margen) : (valorAjustado * Math.min(60, num(f.margen))) / 100
    : 0;
  const descuentos = traspasoTotal + retefuente + papeles + impuestos + alistamiento + Math.round(margenPesos);
  const maximo = r ? Math.max(0, Math.round(valorAjustado - descuentos)) : 0;
  // Oferta inicial: deja 3 % de margen de regateo bajo el tope.
  const inicial = Math.round((maximo * 0.97) / 100) * 100;

  const copiarWhatsApp = async () => {
    if (!r) return;
    const t = [
      `Oferta de compra - ${f.marca} ${f.linea} ${f.anio}`.trim(),
      `Oferta inicial para abrir negociación: ${dinero(inicial)}`,
      `Oferta tope máxima de compra: ${dinero(maximo)}`,
      `Descuentos: ajustes del vehículo ${dinero(ajusteValor)}, traspaso ${dinero(traspasoTotal)}, retefuente ${dinero(retefuente)}, SOAT/Tecnomecánica ${dinero(papeles)}, impuestos pendientes ${dinero(impuestos)}, alistamiento y peritaje ${dinero(alistamiento)}, utilidad esperada ${dinero(Math.round(margenPesos))}`,
      NOTA_PERITAJE,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Oferta copiada para WhatsApp.");
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank", "noopener,noreferrer");
    }
  };

  const Tendencia = r
    ? r.tendencia === "alza"
      ? { t: "En alza", Icono: TrendingUp, c: "text-emerald-600 dark:text-emerald-400" }
      : r.tendencia === "baja"
        ? { t: "A la baja", Icono: TrendingDown, c: "text-red-600 dark:text-red-400" }
        : { t: "Estable", Icono: Minus, c: "text-amber-600 dark:text-amber-400" }
    : null;

  return (
    <GlassPanel className="mb-4 space-y-3 p-4">
      <button type="button" onClick={() => setVisible((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 font-display text-lg">
          <Gauge className="h-5 w-5 text-primary" /> Tasador de compra para reventa (carros y motos usados)
        </span>
        {visible ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {visible && (
        <div className="space-y-4">
          <p
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              tar && !tar.alDia ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"
            }`}
          >
            <BadgeCheck className="h-4 w-4" />
            {tar && !tar.alDia
              ? `Tarifas ${T.anio} reajustadas a ${anioActual} (verificación pendiente)`
              : `Tarifas SOAT, Tecno, Tránsito y Retefuente ${T.anio} al día`}
          </p>
          <p className="text-xs text-muted-foreground">Tasación 100 % manual: no consulta placas ni servicios externos de pago.</p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Entrada t="Tipo">
              <select className={campo} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </Entrada>
            <Entrada t="Marca"><input className={campo} maxLength={40} value={f.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Mazda" /></Entrada>
            <Entrada t="Línea"><input className={campo} maxLength={60} value={f.linea} onChange={(e) => set("linea", e.target.value)} placeholder="CX-30 Touring" /></Entrada>
            <Entrada t="Año"><input className={campo} inputMode="numeric" maxLength={4} value={f.anio} onChange={(e) => set("anio", e.target.value)} placeholder="2020" /></Entrada>
            <Entrada t="Cilindraje (cc)"><input className={campo} maxLength={20} value={f.cilindraje} onChange={(e) => set("cilindraje", e.target.value)} placeholder="2000" /></Entrada>
            <Entrada t="Kilometraje"><input className={campo} inputMode="numeric" value={f.km} onChange={(e) => set("km", e.target.value)} placeholder="45000" /></Entrada>
            <Entrada t="Precio ofrecido / pedido ($)"><input className={campo} inputMode="numeric" value={f.precio} onChange={(e) => set("precio", e.target.value)} placeholder="65000000" /></Entrada>
            <Entrada t="Combustible">
              <select className={campo} value={f.combustible} onChange={(e) => set("combustible", e.target.value)}>
                <option value="gasolina">Gasolina</option>
                <option value="gnv">Gas vehicular (GNV)</option>
              </select>
            </Entrada>
            <Entrada t="Color">
              <select className={campo} value={f.color} onChange={(e) => set("color", e.target.value)}>
                <option value="comercial">Comercial (0 %)</option>
                <option value="poco">Poco comercial (-4 %)</option>
              </select>
            </Entrada>
            <Entrada t="Ciudad de matrícula">
              <select className={campo} value={f.ciudad} onChange={(e) => set("ciudad", e.target.value)}>
                <option value="local">Plaza local (0 %)</option>
                <option value="foranea">Foránea / lenta (-3 %)</option>
              </select>
            </Entrada>
            <Entrada t="Dueños">
              <select className={campo} value={f.duenos} onChange={(e) => set("duenos", e.target.value)}>
                <option value="1">1 dueño</option>
                <option value="2">2-3 dueños</option>
                <option value="4">4 o más dueños (-3,5 %)</option>
              </select>
            </Entrada>
          </div>

          {f.combustible === "gnv" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1 space-y-2">
                <p className="font-medium">Gas vehicular: alto riesgo de rechazo y complejidad comercial para la reventa.</p>
                <Entrada t="Descuento por GNV (%)">
                  <input className={`${campo} max-w-[8rem]`} inputMode="decimal" value={f.ajusteGnv} onChange={(e) => set("ajusteGnv", e.target.value)} />
                </Entrada>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void consultar()}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar precio de mercado en tiempo real (IA web)
          </button>

          {r && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-glass-border bg-glass/30 p-3"><p className="text-xs text-muted-foreground">Bajo</p><p className="font-semibold">{dinero(r.bajo)}</p></div>
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Mercado de hoy (-5 % negociación)</p><p className="text-lg font-semibold">{dinero(r.promedio)}</p></div>
                <div className="rounded-lg border border-glass-border bg-glass/30 p-3"><p className="text-xs text-muted-foreground">Alto</p><p className="font-semibold">{dinero(r.alto)}</p></div>
              </div>
              {Tendencia && (
                <p className={`inline-flex items-center gap-2 text-sm font-medium ${Tendencia.c}`}>
                  <Tendencia.Icono className="h-4 w-4" /> Tendencia del mes: {Tendencia.t}
                </p>
              )}
              {r.resumen && <p className="text-sm text-muted-foreground">{r.resumen}</p>}
              {esNuevo && (
                <p className="text-sm text-muted-foreground">
                  {r.precio_0km
                    ? `Modelo ${f.anio}: precio oficial 0 km ${dinero(r.precio_0km)}; con depreciación de primer dueño (-10 %) el tope de referencia es ${dinero(Math.round(r.precio_0km * 0.9))}.`
                    : `Modelo ${f.anio}: no se encontró el precio 0 km oficial; se usa el mercado de hoy.`}
                </p>
              )}

              {semaforo ? (
                <div className={`rounded-lg border p-3 ${semaforo.c}`}>
                  <p className="font-medium">{semaforo.t}</p>
                  <p className="text-sm text-muted-foreground">{semaforo.d}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Escribe el precio ofrecido para ver si es barato, justo o costoso.</p>
              )}

              <div className="space-y-3 rounded-lg border border-glass-border bg-glass/30 p-3">
                <p className="font-medium">Oferta de compra para reventa (antes de peritaje)</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Entrada t="Perfil de rotación">
                    <select className={campo} value={f.rotacion} onChange={(e) => set("rotacion", e.target.value)}>
                      {PERFILES.map((p) => <option key={p.c} value={p.c}>{p.t}</option>)}
                    </select>
                  </Entrada>
                  {f.rotacion === "manual" && (
                    <Entrada t="Ganancia manual">
                      <div className="flex gap-2">
                        <input className={campo} inputMode="decimal" value={f.margen} onChange={(e) => set("margen", e.target.value)} />
                        <select className={`${campo} w-24`} value={f.modoMargen} onChange={(e) => set("modoMargen", e.target.value)}>
                          <option value="pct">%</option>
                          <option value="pesos">$</option>
                        </select>
                      </div>
                    </Entrada>
                  )}
                  <Entrada t="Derechos de tránsito + MinTransporte + RUNT ($)"><input className={campo} inputMode="numeric" value={f.derechos} onChange={(e) => set("derechos", e.target.value)} placeholder={String(derechosDef)} /></Entrada>
                  <Entrada t="Alistamiento y peritaje interno ($)"><input className={campo} inputMode="numeric" value={f.alistamiento} onChange={(e) => set("alistamiento", e.target.value)} placeholder={String(alistDef)} /></Entrada>
                  <Entrada t="Fecha vencimiento SOAT"><input type="date" className={campo} value={f.soatFecha} onChange={(e) => set("soatFecha", e.target.value)} /></Entrada>
                  <Entrada t="Fecha vencimiento Tecnomecánica"><input type="date" className={campo} value={f.tecnoFecha} disabled={f.tecnoExento} onChange={(e) => set("tecnoFecha", e.target.value)} /></Entrada>
                  <Entrada t="Tarifa anual SOAT ($)"><input className={campo} inputMode="numeric" value={f.soatTarifa} onChange={(e) => set("soatTarifa", e.target.value)} placeholder={String(soatDef)} /></Entrada>
                  <Entrada t="Tarifa Tecnomecánica ($)"><input className={campo} inputMode="numeric" value={f.tecnoTarifa} onChange={(e) => set("tecnoTarifa", e.target.value)} placeholder={String(tecnoDef)} /></Entrada>
                  <Entrada t="Impuestos pendientes ($)"><input className={campo} inputMode="numeric" value={f.impuestos} onChange={(e) => set("impuestos", e.target.value)} /></Entrada>
                </div>
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-4">
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.tecnoExento} onChange={(e) => marcar("tecnoExento", e.target.checked)} /> Tecnomecánica exenta por modelo nuevo</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.certificado} onChange={(e) => marcar("certificado", e.target.checked)} /> Certificado de tradición ({dinero(redondear(T.transito.certificado))})</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.prenda} onChange={(e) => marcar("prenda", e.target.checked)} /> Levantamiento de prenda ({dinero(redondear(T.transito.prenda))})</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.autorretenedor} onChange={(e) => marcar("autorretenedor", e.target.checked)} /> Vendedor autorretenedor o persona jurídica (sin retefuente)</label>
                </div>
                {motoExenta && !f.autorretenedor && (
                  <p className="text-xs text-muted-foreground">Moto de {cc} cc (≤ {T.retefuente.moto_exenta_cc_max} cc): no se aplica retención en la fuente.</p>
                )}

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Oferta inicial para abrir negociación</p>
                    <p className="text-2xl font-semibold">{dinero(inicial)}</p>
                    <p className="text-xs text-muted-foreground">Con 3 % de margen de regateo</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Oferta tope máxima de compra</p>
                    <p className="text-2xl font-semibold">{dinero(maximo)}</p>
                    <p className="text-xs text-muted-foreground">Protege tu ganancia completa</p>
                  </div>
                </div>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Valor de mercado de hoy: {dinero(base0)}{base1 !== base0 && ` → tope por 0 km con -10 % de primer dueño: ${dinero(base1)}`}</li>
                  {ajustes.map((a) => (
                    <li key={a.t}>− {a.t} ({a.p} %): {dinero(Math.round((base1 * a.p) / 100))}</li>
                  ))}
                  <li>= Valor ajustado: {dinero(valorAjustado)}</li>
                  <li>− Traspaso total: {dinero(traspasoTotal)}</li>
                  <li>− Retención en la fuente {T.retefuente.porcentaje} %: {retiene ? dinero(retefuente) : "no aplica"}</li>
                  <li>
                    − Descuento SOAT/Tecnomecánica: {dinero(papeles)}
                    {pSoat.dias !== null && ` (SOAT: ${pSoat.dias <= 0 ? "vencido" : `${pSoat.dias} días`})`}
                    {pTecno.dias !== null && ` (Tecno: ${pTecno.dias <= 0 ? "vencida" : `${pTecno.dias} días`})`}
                  </li>
                  <li>− Impuestos pendientes: {dinero(impuestos)}</li>
                  <li>− Alistamiento y peritaje interno: {dinero(alistamiento)}</li>
                  <li>− Utilidad esperada: {dinero(Math.round(margenPesos))}</li>
                </ul>
                {precio > 0 && (
                  <p className={`text-sm ${precio <= maximo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {precio <= maximo
                      ? "El precio pedido está dentro de lo seguro."
                      : `El precio pedido supera la oferta tope por ${dinero(Math.round(precio - maximo))}. Negocia.`}
                  </p>
                )}
                <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm font-medium">{NOTA_PERITAJE}</p>
                <button type="button" onClick={() => void copiarWhatsApp()} className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm">
                  <MessageCircle className="h-4 w-4" /> Copiar oferta para WhatsApp
                </button>
              </div>

              {r.fuentes.length > 0 && (
                <div className="text-sm">
                  <p className="mb-1 text-muted-foreground">Fuentes consultadas ({r.fecha.slice(0, 10)}):</p>
                  <ul className="space-y-1">
                    {r.fuentes.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">
                          <ExternalLink className="h-3 w-3 shrink-0" /> {s.titulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

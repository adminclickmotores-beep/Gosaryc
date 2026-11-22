import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Gauge, Loader2, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { tasarVehiculo, type TasacionVehiculo } from "@/lib/precios-ia.functions";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
/** Reajuste anual aplicado a las tarifas desde el 1 de enero de 2027 (IPC/SMMLV aproximado). */
const IPC_REAJUSTE = 0.05;
const NOTA_PERITAJE =
  "⚠️ Oferta preliminar de compra para reventa sujeta a peritaje mecánico, estructural, de chasis/motor y verificación jurídica. El cierre final se realiza una vez aprobado el peritaje.";
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

/** Tasador de mercado en vivo para carros y motos usados (Gemini + Google Search). */
export function TasadorMercado({ abierto = false }: { abierto?: boolean }) {
  const [visible, setVisible] = useState(abierto);
  const [f, setF] = useState({
    tipo: "carro", marca: "", linea: "", anio: "", cilindraje: "", km: "", precio: "",
    derechos: "", alistamiento: "", margen: "12", modoMargen: "pct",
    soatFecha: "", tecnoFecha: "", soatTarifa: "", tecnoTarifa: "", tecnoExento: false,
    certificado: false, prenda: false,
  });
  // Fecha y año actual se leen en el navegador (evita diferencias entre servidor y cliente).
  const [hoy, setHoy] = useState<number | null>(null);
  useEffect(() => { setHoy(Date.now()); }, []);
  const anioActual = hoy ? new Date(hoy).getFullYear() : 2026;
  const [cargando, setCargando] = useState(false);
  const [r, setR] = useState<TasacionVehiculo | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

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

  // ---- Tarifas oficiales 2026 (reajuste automático desde el 1 de enero de 2027) ----
  const esMoto = f.tipo === "moto";
  const factor = anioActual >= 2027 ? Math.pow(1 + IPC_REAJUSTE, anioActual - 2026) : 1;
  const redondear = (n: number) => Math.round(n / 100) * 100;
  const cc = num(f.cilindraje);
  const soatBase = esMoto
    ? cc > 0 && cc < 100 ? 256200 : cc > 200 ? 761400 : 343300
    : cc > 2500 ? 677400 : cc >= 1500 ? 611050 : 520100;
  const tecnoBase = esMoto ? 233500 : 335000;
  const derechosDef = redondear((esMoto ? 145500 : 260400) * factor);
  const alistDef = redondear((esMoto ? 140000 : 380000) * factor);
  const soatDef = redondear(soatBase * factor);
  const tecnoDef = redondear(tecnoBase * factor);
  const pick = (v: string, def: number) => (v.trim() === "" ? def : num(v));

  const derechos = pick(f.derechos, derechosDef);
  const alistamiento = pick(f.alistamiento, alistDef);
  const soatAnual = pick(f.soatTarifa, soatDef);
  const tecnoAnual = pick(f.tecnoTarifa, tecnoDef);
  const avaluo = r ? r.promedio : 0;
  const retefuente = Math.round(avaluo * 0.01);
  const certificado = f.certificado ? redondear(58400 * factor) : 0;
  const prenda = f.prenda ? redondear(206900 * factor) : 0;
  const traspasoTotal = derechos + certificado + prenda;

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

  const margenPesos = r
    ? f.modoMargen === "pesos" ? num(f.margen) : (r.promedio * Math.min(60, num(f.margen))) / 100
    : 0;
  const descuentos = traspasoTotal + retefuente + papeles + alistamiento + Math.round(margenPesos);
  const maximo = r ? Math.max(0, Math.round(r.promedio - descuentos)) : 0;
  const inicial = Math.round((maximo * 0.9) / 100) * 100;

  const copiarWhatsApp = async () => {
    if (!r) return;
    const t = [
      `Oferta de compra - ${f.marca} ${f.linea} ${f.anio}`.trim(),
      `Oferta inicial sugerida: ${dinero(inicial)}`,
      `Oferta tope máxima: ${dinero(maximo)}`,
      `Descuentos: traspaso ${dinero(traspasoTotal)}, retefuente 1 % ${dinero(retefuente)}, SOAT/Tecnomecánica ${dinero(papeles)}, alistamiento y peritaje ${dinero(alistamiento)}, utilidad esperada ${dinero(Math.round(margenPesos))}`,
      NOTA_PERITAJE,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(t);
      toast.success("Oferta copiada para WhatsApp.");
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <GlassPanel className="mb-4 space-y-3 p-4">
      <button type="button" onClick={() => setVisible((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 font-display text-lg">
          <Gauge className="h-5 w-5 text-primary" /> Tasador de mercado en vivo (carros y motos usados)
        </span>
        {visible ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {visible && (
        <div className="space-y-4">
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
            <Entrada t="Cilindraje"><input className={campo} maxLength={20} value={f.cilindraje} onChange={(e) => set("cilindraje", e.target.value)} placeholder="2000 cc" /></Entrada>
            <Entrada t="Kilometraje"><input className={campo} inputMode="numeric" value={f.km} onChange={(e) => set("km", e.target.value)} placeholder="45000" /></Entrada>
            <Entrada t="Precio ofrecido / pedido ($)"><input className={campo} inputMode="numeric" value={f.precio} onChange={(e) => set("precio", e.target.value)} placeholder="65000000" /></Entrada>
          </div>

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
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Promedio en Colombia</p><p className="text-lg font-semibold">{dinero(r.promedio)}</p></div>
                <div className="rounded-lg border border-glass-border bg-glass/30 p-3"><p className="text-xs text-muted-foreground">Alto</p><p className="font-semibold">{dinero(r.alto)}</p></div>
              </div>
              {r.resumen && <p className="text-sm text-muted-foreground">{r.resumen}</p>}

              {semaforo ? (
                <div className={`rounded-lg border p-3 ${semaforo.c}`}>
                  <p className="font-medium">{semaforo.t}</p>
                  <p className="text-sm text-muted-foreground">{semaforo.d}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Escribe el precio ofrecido para ver si es barato, justo o costoso.</p>
              )}

              <div className="space-y-3 rounded-lg border border-glass-border bg-glass/30 p-3">
                <p className="font-medium">Oferta de compra para reventa (tarifas Colombia 2026{factor > 1 ? `, reajustadas a ${anioActual}` : ", reajuste automático en 2027"})</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Entrada t={`Derechos de tránsito + MinTransporte + RUNT ($)`}><input className={campo} inputMode="numeric" value={f.derechos} onChange={(e) => set("derechos", e.target.value)} placeholder={String(derechosDef)} /></Entrada>
                  <Entrada t="Alistamiento y peritaje interno ($)"><input className={campo} inputMode="numeric" value={f.alistamiento} onChange={(e) => set("alistamiento", e.target.value)} placeholder={String(alistDef)} /></Entrada>
                  <Entrada t="Fecha vencimiento SOAT"><input type="date" className={campo} value={f.soatFecha} onChange={(e) => set("soatFecha", e.target.value)} /></Entrada>
                  <Entrada t="Fecha vencimiento Tecnomecánica">
                    <input type="date" className={campo} value={f.tecnoFecha} disabled={f.tecnoExento} onChange={(e) => set("tecnoFecha", e.target.value)} />
                  </Entrada>
                  <Entrada t="Tarifa anual SOAT ($)"><input className={campo} inputMode="numeric" value={f.soatTarifa} onChange={(e) => set("soatTarifa", e.target.value)} placeholder={String(soatDef)} /></Entrada>
                  <Entrada t="Tarifa Tecnomecánica ($)"><input className={campo} inputMode="numeric" value={f.tecnoTarifa} onChange={(e) => set("tecnoTarifa", e.target.value)} placeholder={String(tecnoDef)} /></Entrada>
                  <Entrada t="Ganancia de la compraventa">
                    <div className="flex gap-2">
                      <input className={campo} inputMode="decimal" value={f.margen} onChange={(e) => set("margen", e.target.value)} />
                      <select className={`${campo} w-24`} value={f.modoMargen} onChange={(e) => set("modoMargen", e.target.value)}>
                        <option value="pct">%</option>
                        <option value="pesos">$</option>
                      </select>
                    </div>
                  </Entrada>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.tecnoExento} onChange={(e) => setF((p) => ({ ...p, tecnoExento: e.target.checked }))} /> Tecnomecánica exenta por modelo nuevo</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.certificado} onChange={(e) => setF((p) => ({ ...p, certificado: e.target.checked }))} /> Certificado de tradición ({dinero(redondear(58400 * factor))})</label>
                  <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={f.prenda} onChange={(e) => setF((p) => ({ ...p, prenda: e.target.checked }))} /> Levantamiento de prenda ({dinero(redondear(206900 * factor))})</label>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Oferta inicial de compra sugerida</p>
                    <p className="text-xl font-semibold">{dinero(inicial)}</p>
                    <p className="text-xs text-muted-foreground">Para abrir la negociación</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Oferta tope máxima de compra</p>
                    <p className="text-xl font-semibold">{dinero(maximo)}</p>
                    <p className="text-xs text-muted-foreground">Sin sacrificar tu ganancia mínima</p>
                  </div>
                </div>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Valor de mercado consultado: {dinero(r.promedio)}</li>
                  <li>− Traspaso total: {dinero(traspasoTotal)}</li>
                  <li>− Retención en la fuente 1 %: {dinero(retefuente)}</li>
                  <li>
                    − Prorrateo SOAT/Tecnomecánica: {dinero(papeles)}
                    {pSoat.dias !== null && ` (SOAT: ${pSoat.dias <= 0 ? "vencido" : `${pSoat.dias} días`})`}
                    {pTecno.dias !== null && ` (Tecno: ${pTecno.dias <= 0 ? "vencida" : `${pTecno.dias} días`})`}
                  </li>
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

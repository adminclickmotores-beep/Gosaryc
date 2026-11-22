import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Gauge, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { tasarVehiculo, type TasacionVehiculo } from "@/lib/precios-ia.functions";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
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
    traspaso: "", soat: "", alistamiento: "", margen: "10",
  });
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

  // Calculadora de compra / retoma segura: reventa al promedio menos gastos y margen esperado.
  const gastos = num(f.traspaso) + num(f.soat) + num(f.alistamiento);
  const margenPesos = r ? (r.promedio * Math.min(60, num(f.margen))) / 100 : 0;
  const maximo = r ? Math.max(0, r.promedio - gastos - margenPesos) : 0;

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
                <p className="font-medium">Calculadora de compra / retoma segura</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Entrada t="Traspaso ($)"><input className={campo} inputMode="numeric" value={f.traspaso} onChange={(e) => set("traspaso", e.target.value)} /></Entrada>
                  <Entrada t="SOAT / Tecnomecánica ($)"><input className={campo} inputMode="numeric" value={f.soat} onChange={(e) => set("soat", e.target.value)} /></Entrada>
                  <Entrada t="Alistamiento ($)"><input className={campo} inputMode="numeric" value={f.alistamiento} onChange={(e) => set("alistamiento", e.target.value)} /></Entrada>
                  <Entrada t="Ganancia esperada (%)"><input className={campo} inputMode="decimal" value={f.margen} onChange={(e) => set("margen", e.target.value)} /></Entrada>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reventa al promedio {dinero(r.promedio)} − gastos {dinero(gastos)} − ganancia {dinero(Math.round(margenPesos))}
                </p>
                <p className="text-lg">
                  Valor máximo que debes ofrecer: <b>{dinero(Math.round(maximo))}</b>
                </p>
                {precio > 0 && (
                  <p className={`text-sm ${precio <= maximo ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {precio <= maximo
                      ? "El precio pedido está dentro de lo seguro."
                      : `El precio pedido supera lo seguro por ${dinero(Math.round(precio - maximo))}. Negocia.`}
                  </p>
                )}
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

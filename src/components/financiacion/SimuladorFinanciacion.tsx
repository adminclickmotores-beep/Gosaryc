import { useMemo, useState } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { calcularCuota } from "@/components/vehiculos/CotizacionesVehiculos";
import { enlaceWhatsapp, imprimirReporte } from "@/lib/exportes";
import { limpiarTelefono, limpiarTexto } from "@/lib/validacion-publica";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const PLAZOS = [6, 12, 18, 24, 36, 48, 60, 72, 84];

const aNum = (v: string) => {
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

type Fila = { n: number; cuota: number; capital: number; interes: number; seguro: number; saldo: number };

type Props = { tipo: "vehiculo" | "ganado" };

/** Simulador de financiación propia con tabla de amortización, PDF y envío por WhatsApp. */
export function SimuladorFinanciacion({ tipo }: Props) {
  const esGanado = tipo === "ganado";
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [bien, setBien] = useState("");
  const [valor, setValor] = useState("");
  const [inicial, setInicial] = useState("");
  const [tasa, setTasa] = useState(esGanado ? "1.8" : "1.6");
  const [plazo, setPlazo] = useState(esGanado ? 12 : 48);
  const [seguro, setSeguro] = useState("");

  const calculo = useMemo(() => {
    const v = aNum(valor);
    const ini = Math.min(aNum(inicial), v);
    const financiado = Math.max(v - ini, 0);
    const t = aNum(tasa);
    const seg = aNum(seguro);
    const cuotaBase = calcularCuota(financiado, t, plazo);
    const filas: Fila[] = [];
    let saldo = financiado;
    for (let i = 1; i <= plazo && financiado > 0; i++) {
      const interes = saldo * (t / 100);
      const capital = Math.min(cuotaBase - interes, saldo);
      saldo = Math.max(saldo - capital, 0);
      filas.push({ n: i, cuota: cuotaBase + seg, capital, interes, seguro: seg, saldo });
    }
    const totalIntereses = filas.reduce((a, f) => a + f.interes, 0);
    const totalPagar = filas.reduce((a, f) => a + f.cuota, 0) + ini;
    return { v, ini, financiado, cuotaBase, seg, filas, totalIntereses, totalPagar, pctInicial: v > 0 ? (ini / v) * 100 : 0 };
  }, [valor, inicial, tasa, plazo, seguro]);

  const titulo = esGanado ? "Financiación de ganado" : "Financiación de vehículo";
  const bienTxt = bien.trim() || (esGanado ? "Lote de ganado" : "Vehículo");

  const imprimir = () => {
    if (!calculo.filas.length) return;
    imprimirReporte(
      `${titulo} - tabla de amortización`,
      `${cliente.trim() || "Cliente"} · ${bienTxt} · Valor ${dinero(calculo.v)} · Inicial ${dinero(calculo.ini)} · Tasa ${aNum(tasa)}% mensual · ${plazo} cuotas`,
      ["Cuota", "Valor cuota", "Capital", "Interés", "Seguro", "Saldo"],
      calculo.filas.map((f) => [String(f.n), dinero(f.cuota), dinero(f.capital), dinero(f.interes), dinero(f.seguro), dinero(f.saldo)]),
      ["Totales", dinero(calculo.totalPagar - calculo.ini), dinero(calculo.financiado), dinero(calculo.totalIntereses), dinero(calculo.seg * plazo), ""],
    );
  };

  const enlace = enlaceWhatsapp(
    telefono,
    `Hola ${cliente.trim() || ""}, esta es tu simulación de financiación para ${bienTxt}:\n` +
      `Valor: ${dinero(calculo.v)}\nCuota inicial: ${dinero(calculo.ini)} (${calculo.pctInicial.toFixed(0)}%)\n` +
      `Financiado: ${dinero(calculo.financiado)}\nPlazo: ${plazo} meses a ${aNum(tasa)}% mensual\n` +
      `Cuota mensual: ${dinero(calculo.cuotaBase + calculo.seg)}\nTotal a pagar: ${dinero(calculo.totalPagar)}`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">
          Simula la cuota, muestra la tabla de amortización mes a mes y envíala al cliente por PDF o WhatsApp.
        </p>
      </div>

      <GlassPanel className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Cliente</span>
          <input className={campo} value={cliente} maxLength={80} onChange={(e) => setCliente(limpiarTexto(e.target.value, 80))} placeholder="Nombre completo" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">WhatsApp del cliente</span>
          <input className={campo} value={telefono} inputMode="tel" maxLength={15} onChange={(e) => setTelefono(limpiarTelefono(e.target.value))} placeholder="3001234567" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{esGanado ? "Ganado (lote, raza, cantidad)" : "Vehículo (marca, modelo, placa)"}</span>
          <input className={campo} value={bien} maxLength={100} onChange={(e) => setBien(limpiarTexto(e.target.value, 100))} placeholder={esGanado ? "20 novillas Brahman" : "Mazda CX-30 2023"} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Valor total (COP)</span>
          <input className={campo} value={valor} inputMode="numeric" onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, "").slice(0, 12))} placeholder="85000000" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Cuota inicial / retoma (COP)</span>
          <input className={campo} value={inicial} inputMode="numeric" onChange={(e) => setInicial(e.target.value.replace(/[^\d]/g, "").slice(0, 12))} placeholder="17000000" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Tasa mensual (%)</span>
          <input className={campo} value={tasa} inputMode="decimal" onChange={(e) => setTasa(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Plazo (meses)</span>
          <select className={campo} value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>
            {PLAZOS.map((p) => (<option key={p} value={p}>{p} meses</option>))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{esGanado ? "Seguro / sanidad mensual (COP)" : "Seguro mensual (COP)"}</span>
          <input className={campo} value={seguro} inputMode="numeric" onChange={(e) => setSeguro(e.target.value.replace(/[^\d]/g, "").slice(0, 9))} placeholder="0" />
        </label>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Cuota mensual", v: dinero(calculo.cuotaBase + calculo.seg) },
          { k: "Monto financiado", v: dinero(calculo.financiado) },
          { k: "Total intereses", v: dinero(calculo.totalIntereses) },
          { k: "Total a pagar", v: dinero(calculo.totalPagar) },
        ].map((c) => (
          <GlassPanel key={c.k} className="p-4">
            <p className="text-xs text-muted-foreground">{c.k}</p>
            <p className="mt-1 break-words text-lg font-bold">{c.v}</p>
          </GlassPanel>
        ))}
      </div>

      {calculo.v > 0 && calculo.pctInicial < 20 && !esGanado && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          La inicial es del {calculo.pctInicial.toFixed(0)}%: la mayoría de financieras piden mínimo 20%.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={imprimir} disabled={!calculo.filas.length} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <FileText className="h-4 w-4" /> Tabla en PDF
        </button>
        {enlace && calculo.filas.length > 0 ? (
          <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm font-semibold">
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </a>
        ) : null}
      </div>

      {calculo.filas.length > 0 && (
        <GlassPanel className="overflow-x-auto p-2">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 py-2">Cuota</th><th className="px-2">Valor cuota</th><th className="px-2">Capital</th><th className="px-2">Interés</th><th className="px-2">Seguro</th><th className="px-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {calculo.filas.map((f) => (
                <tr key={f.n} className="border-t border-glass-border">
                  <td className="px-2 py-1.5">{f.n}</td>
                  <td className="px-2 font-semibold">{dinero(f.cuota)}</td>
                  <td className="px-2">{dinero(f.capital)}</td>
                  <td className="px-2">{dinero(f.interes)}</td>
                  <td className="px-2">{dinero(f.seguro)}</td>
                  <td className="px-2">{dinero(f.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CalendarClock, Calculator, ImageOff, MessageCircle, ShieldCheck, X } from "lucide-react";
import { FotoPrivada } from "@/components/vehiculos/FotoPrivada";
import { calcularCuota } from "@/components/vehiculos/CotizacionesVehiculos";
import type { Tables } from "@/integrations/supabase/types";

type Vehiculo = Tables<"vehiculos_inventario">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const entrada =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const aNumero = (s: string): number => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const enlaceWa = (telefono: string, texto: string): string => {
  const d = telefono.replace(/\D/g, "");
  const num = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
};

function estadoDocumento(fecha: string | null): { texto: string; clase: string } {
  if (!fecha) return { texto: "Sin registrar", clase: "text-muted-foreground" };
  const dias = Math.ceil((new Date(`${fecha}T00:00:00`).getTime() - Date.now()) / 86400000);
  const f = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  if (dias < 0) return { texto: `Vencido (${f})`, clase: "text-destructive" };
  if (dias <= 30) return { texto: `Vence en ${dias} días (${f})`, clase: "text-amber-500" };
  return { texto: `Vigente hasta ${f}`, clase: "text-primary" };
}

/** Vista ampliada dividida: foto grande a la izquierda y ficha técnica completa a la derecha. */
export function VistaVehiculo({
  vehiculo: v,
  nombreNegocio,
  onCerrar,
  onAbrirFicha,
}: {
  vehiculo: Vehiculo;
  nombreNegocio: string;
  onCerrar: () => void;
  onAbrirFicha: () => void;
}) {
  const fotos = v.fotos ?? [];
  const [indice, setIndice] = useState(0);
  const [inicialPct, setInicialPct] = useState("30");
  const [plazo, setPlazo] = useState("60");
  const [tasa, setTasa] = useState("1.6");
  const [tel, setTel] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("10:00");

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const titulo = `${v.marca} ${v.modelo}${v.version ? ` ${v.version}` : ""}${v.anio ? ` ${v.anio}` : ""}`;
  const inicial = Math.min(Math.max(aNumero(inicialPct), 0), 100);
  const financiado = v.precio * (1 - inicial / 100);
  const meses = Math.max(Math.round(aNumero(plazo)), 1);
  const cuota = calcularCuota(financiado, Math.max(aNumero(tasa), 0), meses);
  const soat = estadoDocumento(v.soat_vence);
  const tecno = estadoDocumento(v.tecnomecanica_vence);

  const datos: [string, string | number | null][] = [
    ["Año", v.anio],
    ["Kilometraje", v.kilometraje !== null ? `${v.kilometraje.toLocaleString("es-CO")} km` : null],
    ["Color", v.color],
    ["Combustible", v.combustible],
    ["Transmisión", v.transmision],
    ["Cilindraje", v.cilindraje],
    [v.tipo === "moto" ? "Tipo" : "Carrocería", v.carroceria],
    ["Puertas", v.tipo === "carro" ? v.puertas : null],
    ["Tracción", v.tipo === "carro" ? v.traccion : null],
    ["Placa", v.placa],
    ["Matriculado en", v.ciudad_matricula],
    ["Propietarios", v.num_propietarios],
  ];

  const textoFicha =
    `*${titulo}*\n${v.tipo === "moto" ? "Moto" : "Carro"} ${v.condicion === "nuevo" ? "nuevo" : "usado"}\n` +
    `Precio: ${dinero(v.precio)}\n` +
    datos
      .filter(([k, x]) => x !== null && x !== "" && k !== "Placa")
      .map(([k, x]) => `${k}: ${x}`)
      .join("\n") +
    (v.placa ? `\nPlaca termina en ${v.placa.slice(-1)}` : "") +
    (v.equipamiento ? `\nEquipamiento: ${v.equipamiento}` : "") +
    `\n\nCuota estimada: ${dinero(cuota)} al mes (${inicial}% de cuota inicial, ${meses} meses). Valor orientativo.` +
    `\n\n${nombreNegocio}`;

  const textoPrueba =
    `Hola, confirmamos tu prueba de manejo del ${titulo} en ${nombreNegocio}` +
    `${fecha ? ` el ${new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}` : ""}` +
    `${hora ? ` a las ${hora}` : ""}. Lleva tu documento de identidad y tu licencia de conducción.`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92dvh] w-full max-w-5xl grid-cols-1 overflow-y-auto rounded-t-3xl border border-glass-border bg-card text-card-foreground shadow-2xl sm:rounded-3xl md:grid-cols-12"
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onCerrar}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-col md:col-span-6">
          <div className="group relative aspect-[4/3] w-full overflow-hidden bg-muted md:aspect-auto md:min-h-[380px] md:flex-1">
            {fotos[indice] ? (
              <FotoPrivada
                valor={fotos[indice]}
                className="absolute inset-0 h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
                <ImageOff className="h-16 w-16" />
              </span>
            )}
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {fotos.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  aria-label={`Foto ${i + 1}`}
                  onClick={() => setIndice(i)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === indice ? "border-primary" : "border-transparent opacity-70"}`}
                >
                  <FotoPrivada valor={f} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-5 md:col-span-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">
              {v.tipo === "moto" ? "Moto" : "Carro"} · {v.condicion === "nuevo" ? "Nuevo" : "Usado"}
            </p>
            <h3 className="break-words pr-10 font-display text-2xl leading-tight">{titulo}</h3>
            <p className="precio-esmeralda mt-1 text-2xl font-semibold">{dinero(v.precio)}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {datos
              .filter(([, x]) => x !== null && x !== "")
              .map(([k, x]) => (
                <p key={k} className="min-w-0 break-words">
                  <span className="text-muted-foreground">{k}: </span>
                  <span className="text-foreground">{x}</span>
                </p>
              ))}
          </div>

          <div className="space-y-1 rounded-xl border border-glass-border bg-glass/30 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Documentos al día
            </p>
            <p>
              <span className="text-muted-foreground">SOAT: </span>
              <span className={soat.clase}>{soat.texto}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Tecnomecánica: </span>
              <span className={tecno.clase}>{tecno.texto}</span>
            </p>
          </div>

          {v.equipamiento && (
            <p className="break-words text-sm text-muted-foreground">
              <span className="text-foreground">Equipamiento: </span>
              {v.equipamiento}
            </p>
          )}

          <div className="space-y-2 rounded-xl border border-glass-border bg-glass/30 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Calculator className="h-4 w-4 text-primary" /> Simulador de cuota
            </p>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Inicial %</span>
                <input className={entrada} inputMode="decimal" value={inicialPct} onChange={(e) => setInicialPct(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Meses</span>
                <input className={entrada} inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Tasa % mes</span>
                <input className={entrada} inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              Financiado {dinero(financiado)} · cuota estimada{" "}
              <span className="text-lg font-semibold text-foreground">{dinero(cuota)}</span> al mes
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-glass-border bg-glass/30 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" /> Prueba de manejo y envío al cliente
            </p>
            <input className={entrada} inputMode="tel" placeholder="WhatsApp del cliente" value={tel} onChange={(e) => setTel(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className={entrada} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              <input className={entrada} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={enlaceWa(tel, textoPrueba)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-sm text-foreground hover:bg-glass/40"
              >
                <CalendarClock className="h-4 w-4" /> Agendar prueba
              </a>
              <a
                href={enlaceWa(tel, textoFicha)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pro inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                <MessageCircle className="h-4 w-4" /> Enviar ficha
              </a>
            </div>
          </div>

          <button type="button" onClick={onAbrirFicha} className="text-sm text-primary hover:underline">
            Abrir ficha completa de gestión (costos, gastos, documentos)
          </button>
        </div>
      </div>
    </div>
  );
}

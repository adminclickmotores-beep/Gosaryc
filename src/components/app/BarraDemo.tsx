import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pause, Play, Radio, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CORREO_DEMO, esCuentaDemo, restaurarDemo } from "@/lib/demo-real";

/** Elemento de la pantalla sobre el que actúa el recorrido (por selector y/o por texto visible). */
type Objetivo = { css?: string; texto?: RegExp };
/** Una acción del ejercicio en vivo: aviso flotante + clic, resaltado o selección dentro del módulo. */
type Accion = {
  ms: number;
  aviso: string;
  ok?: boolean;
  clic?: Objetivo[];
  resaltar?: Objetivo[];
  elegir?: Objetivo[];
};
type Paso = { titulo: string; texto: string; ruta: string; vista?: string; guion: Accion[] };
type Aviso = { id: number; texto: string; ok: boolean };

const TEXTOS = "h1, h2, h3, h4, p, span, td, th, li, label, button, [role=button], a";

// Restaurante y comidas: 6 pasos en vivo dentro de cada módulo.
const PASOS_RESTAURANTE: Paso[] = [
  {
    titulo: "Vitrina del menú en mosaico y POS",
    texto: "Abrimos Vender y cobrar: el menú con fotos HD y la vista dividida de un plato eligiendo papa francesa y salsa de ajo.",
    ruta: "/restaurante",
    vista: "venta",
    guion: [
      { ms: 1200, aviso: "Abriendo Vender y cobrar con el menú en mosaico", clic: [{ css: "button", texto: /mosaico/i }] },
      { ms: 4000, aviso: "Se abre el plato en vista dividida: foto grande y opciones", clic: [{ css: "[role=button]", texto: /chuleta/i }, { css: "[role=button]:has(img)" }] },
      { ms: 7500, aviso: "Eligiendo papa francesa", clic: [{ css: ".fixed button", texto: /papa francesa/i }] },
      { ms: 10000, aviso: "Agregando salsa de ajo", clic: [{ css: ".fixed button", texto: /\bajo\b/i }] },
      { ms: 12500, aviso: "Plato agregado a la cuenta con sus opciones", ok: true, clic: [{ css: "button", texto: /agregar al pedido/i }] },
    ],
  },
  {
    titulo: "Comanda automática a cocina",
    texto: "El pedido se confirma y la comanda cae sola en Pedidos y cocina, lista para preparar.",
    ruta: "/restaurante",
    vista: "pedidos",
    guion: [
      { ms: 1200, aviso: "Pedido confirmado: la comanda sale sola a cocina", ok: true },
      { ms: 3500, aviso: "La orden cae en pantalla lista para preparar", resaltar: [{ texto: /^\s*nuevo/i }, { texto: /nuevo/i }] },
      { ms: 7500, aviso: "Cocina la pasa a preparación con un solo toque", resaltar: [{ texto: /preparando|en preparaci/i }] },
      { ms: 11000, aviso: "Cuando está lista, se avisa al mesero o al domiciliario", resaltar: [{ texto: /^\s*listo/i }] },
    ],
  },
  {
    titulo: "Inventario de insumos y escandallo",
    texto: "Cada venta descuenta los ingredientes de la receta y avisa cuando un insumo baja del mínimo.",
    ruta: "/restaurante",
    vista: "recetario",
    guion: [
      { ms: 1200, aviso: "Abriendo Inventario de insumos y recetas" },
      { ms: 3500, aviso: "Alerta: insumos por debajo del mínimo", resaltar: [{ texto: /m[ií]nimo|por debajo|agotad/i }] },
      { ms: 7500, aviso: "Cada receta calcula el costo real del plato", resaltar: [{ texto: /costo/i }] },
      { ms: 11000, aviso: "Ingredientes descontados automáticamente por la venta", ok: true },
    ],
  },
  {
    titulo: "Agente WhatsApp IA tomando pedidos",
    texto: "Un cliente pide por chat y el agente responde solo y deja el pedido registrado.",
    ruta: "/restaurante",
    vista: "negocio",
    guion: [
      { ms: 1500, aviso: "Abriendo el simulador del agente de WhatsApp IA", resaltar: [{ texto: /Agente IA/i }] },
      { ms: 4000, aviso: "Un cliente escribe por WhatsApp para pedir", clic: [{ css: "button", texto: /chuleta apanada con papa/i }, { css: "button", texto: /men[uú]/i }] },
      { ms: 10500, aviso: "El agente respondió solo y registró el pedido", ok: true },
    ],
  },
  {
    titulo: "Caja con efectivo, Nequi y Daviplata",
    texto: "El arqueo separa lo que entró en efectivo de lo que entró por transferencia.",
    ruta: "/restaurante",
    vista: "caja",
    guion: [
      { ms: 1200, aviso: "Abriendo la caja del restaurante con el turno del día" },
      { ms: 3500, aviso: "Arqueo: lo que entró en efectivo", resaltar: [{ texto: /efectivo/i }] },
      { ms: 7000, aviso: "Y lo que entró por Nequi, Daviplata o transferencia, por separado", resaltar: [{ texto: /transferencia|nequi|daviplata/i }] },
      { ms: 10500, aviso: "Caja cuadrada al peso", ok: true },
    ],
  },
  {
    titulo: "Ventas, costos y utilidad",
    texto: "La ganancia real del día y el cierre listo para enviar por WhatsApp.",
    ruta: "/restaurante",
    vista: "reportes",
    guion: [
      { ms: 1200, aviso: "Abriendo Ventas, costos y utilidad del día" },
      { ms: 3500, aviso: "Ganancia real del día: ventas menos costos", resaltar: [{ texto: /utilidad|ganancia/i }] },
      { ms: 7500, aviso: "Cierre del día listo para enviar por WhatsApp", resaltar: [{ css: "button", texto: /whatsapp/i }] },
      { ms: 10500, aviso: "Tu restaurante, controlado de punta a punta", ok: true },
    ],
  },
];

// Concesionario de vehículos: 6 pasos en vivo dentro de cada módulo.
const PASOS_VEHICULOS: Paso[] = [
  {
    titulo: "Vitrina en mosaico HD y rentabilidad",
    texto: "Inventario en mosaico con fotos HD y la ficha de una moto: compra + alistamiento = utilidad neta, con su SOAT.",
    ruta: "/modulos/vehiculos",
    guion: [
      { ms: 1200, aviso: "Abriendo el inventario de vehículos en vista mosaico", clic: [{ css: "button", texto: /^\s*mosaico\s*$/i }] },
      { ms: 4000, aviso: "Fotos HD de motos y carros de gama media", resaltar: [{ css: "[class*=grid] img" }] },
      { ms: 7000, aviso: "Abriendo la ficha ampliada del vehículo", clic: [{ css: "button", texto: /^\s*ficha\s*$/i }] },
      { ms: 10000, aviso: "Compra + alistamiento = utilidad neta", resaltar: [{ texto: /utilidad/i }] },
      { ms: 13500, aviso: "Estado del SOAT y la tecnomecánica al día", ok: true, resaltar: [{ texto: /soat/i }] },
    ],
  },
  {
    titulo: "Cotización y simulador de cuota",
    texto: "Se elige un vehículo y el sistema calcula la cuota inicial y la mensual, lista para WhatsApp.",
    ruta: "/modulos/cotizaciones_veh",
    guion: [
      { ms: 1200, aviso: "Abriendo Cotizaciones con simulador de cuota" },
      { ms: 3500, aviso: "Seleccionando un vehículo del inventario", elegir: [{ css: "select", texto: /\$/ }] },
      { ms: 6000, aviso: "Forma de pago a crédito: cuota inicial y plazo", clic: [{ css: "button", texto: /^\s*a cr[eé]dito\s*$/i }] },
      { ms: 9000, aviso: "Cuota mensual calculada al instante con la tasa del mes", resaltar: [{ texto: /cuota mensual/i }] },
      { ms: 12500, aviso: "Lista para enviar por WhatsApp al cliente", ok: true, resaltar: [{ css: "button", texto: /whatsapp/i }] },
    ],
  },
  {
    titulo: "Taller y alistamiento",
    texto: "Una orden activa con repuestos y mano de obra que se suman al costo del vehículo.",
    ruta: "/modulos/taller",
    guion: [
      { ms: 1200, aviso: "Abriendo Taller y mantenimientos" },
      { ms: 3500, aviso: "Orden activa en el taller", resaltar: [{ texto: /en curso|en proceso|abierta|activa/i }] },
      { ms: 7000, aviso: "Repuestos usados en la orden", resaltar: [{ texto: /repuesto/i }] },
      { ms: 10500, aviso: "La mano de obra se suma al costo del vehículo", ok: true, resaltar: [{ texto: /mano de obra/i }] },
    ],
  },
  {
    titulo: "Venta y facturación",
    texto: "Se cierra una venta en vivo: el inventario se actualiza y la factura queda lista.",
    ruta: "/modulos/ventas_veh",
    guion: [
      { ms: 1200, aviso: "Abriendo Ventas y entregas" },
      { ms: 3500, aviso: "Cerrando la venta en vivo", resaltar: [{ texto: /vendid|entregad|venta/i }] },
      { ms: 7000, aviso: "Venta registrada · Inventario actualizado · Factura lista", ok: true },
      { ms: 10500, aviso: "Acta de entrega y traspaso listos", resaltar: [{ texto: /acta|traspaso|entrega/i }] },
    ],
  },
  {
    titulo: "Agente WhatsApp IA 24/7",
    texto: "Un cliente cotiza un vehículo por chat y el agente responde solo, de día o de noche.",
    ruta: "/restaurante",
    guion: [
      { ms: 1500, aviso: "Abriendo el agente de WhatsApp IA 24/7", resaltar: [{ texto: /Agente IA/i }] },
      { ms: 4000, aviso: "Un cliente cotiza una moto por WhatsApp", clic: [{ css: "button", texto: /moto 200cc/i }, { css: "button", texto: /motos tienen/i }] },
      { ms: 10500, aviso: "El agente respondió solo con precio y papeles", ok: true },
    ],
  },
  {
    titulo: "Caja y contabilidad automática",
    texto: "El ingreso de la venta se refleja en el arqueo y el asiento contable queda cuadrado solo.",
    ruta: "/finanzas",
    guion: [
      { ms: 1200, aviso: "Abriendo Caja y contabilidad" },
      { ms: 3500, aviso: "La venta ya aparece como ingreso", resaltar: [{ texto: /ingreso/i }] },
      { ms: 7000, aviso: "Asiento contable creado automáticamente", resaltar: [{ texto: /asiento|d[eé]bito/i }] },
      { ms: 10500, aviso: "Débitos y créditos cuadrados al peso", ok: true },
    ],
  },
];

// Busca en pantalla el primer objetivo visible (el más preciso cuando se busca por texto).
const buscar = (objetivos: Objetivo[]): HTMLElement | null => {
  for (const o of objetivos) {
    const nodos = Array.from(document.querySelectorAll<HTMLElement>(o.css ?? TEXTOS)).filter(
      (el: HTMLElement) => el.getClientRects().length > 0 && !el.closest("[data-barra-demo]"),
    );
    const candidatos = o.texto ? nodos.filter((el: HTMLElement) => o.texto!.test(el.textContent ?? "")) : nodos;
    if (!candidatos.length) continue;
    if (!o.texto) return candidatos[0];
    return candidatos.reduce((a: HTMLElement, b: HTMLElement) =>
      (b.textContent ?? "").length < (a.textContent ?? "").length ? b : a,
    );
  }
  return null;
};

// Resalta el elemento con un borde azul cobalto y lo trae al centro de la pantalla.
const marcar = (el: HTMLElement) => {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const antes = { outline: el.style.outline, offset: el.style.outlineOffset, sombra: el.style.boxShadow };
  el.style.outline = "3px solid #2563EB";
  el.style.outlineOffset = "4px";
  el.style.boxShadow = "0 0 0 8px rgba(37, 99, 235, 0.25)";
  window.setTimeout(() => {
    el.style.outline = antes.outline;
    el.style.outlineOffset = antes.offset;
    el.style.boxShadow = antes.sombra;
  }, 2600);
};

/** Barra de recorrido guiado con ejercicio en vivo: solo en cuentas demo. */
export function BarraDemo() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const contador = useRef(0);
  const arrancado = useRef(false);
  const demo = esCuentaDemo(user?.email);
  const tipo = user?.email?.toLowerCase() === CORREO_DEMO.vehiculos ? "vehiculos" : "restaurante";
  const PASOS = tipo === "vehiculos" ? PASOS_VEHICULOS : PASOS_RESTAURANTE;

  // Abre la pantalla del paso (y la pestaña exacta del panel cuando la tiene).
  const abrir = (p: Paso) => {
    if (p.vista) nav({ to: p.ruta as never, search: { vista: p.vista } as never });
    else nav({ to: p.ruta as never });
  };

  // Al entrar a la demo, el recorrido arranca directamente dentro del primer módulo.
  useEffect(() => {
    if (!demo || arrancado.current) return;
    arrancado.current = true;
    abrir(PASOS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Ejercicio en vivo del paso actual: avisos flotantes + clics y resaltados dentro del módulo.
  useEffect(() => {
    if (!demo || !auto) return;
    const p = PASOS[Math.min(paso, PASOS.length - 1)];
    const timers: number[] = [];
    let vivo = true;
    setAvisos([]);

    const ejecutar = (a: Accion, intento: number) => {
      if (!vivo) return;
      const objetivo = a.clic ?? a.resaltar ?? a.elegir;
      if (!objetivo) return;
      const el = buscar(objetivo);
      if (!el) {
        if (intento < 8) timers.push(window.setTimeout(() => ejecutar(a, intento + 1), 500));
        return;
      }
      marcar(el);
      if (a.elegir && el instanceof HTMLSelectElement) {
        const opcion = Array.from(el.options).find((o: HTMLOptionElement) => o.value);
        const fijar = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
        if (opcion && fijar) {
          fijar.call(el, opcion.value);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      if (a.clic) timers.push(window.setTimeout(() => vivo && el.click(), 700));
    };

    p.guion.forEach((a: Accion) => {
      timers.push(
        window.setTimeout(() => {
          contador.current += 1;
          const id = contador.current;
          setAvisos((prev: Aviso[]) => [...prev.slice(-2), { id, texto: a.aviso, ok: !!a.ok }]);
          timers.push(window.setTimeout(() => setAvisos((prev: Aviso[]) => prev.filter((x: Aviso) => x.id !== id)), 6000));
          ejecutar(a, 0);
        }, a.ms),
      );
    });

    const fin = (p.guion[p.guion.length - 1]?.ms ?? 0) + 5000;
    timers.push(
      window.setTimeout(() => {
        if (paso >= PASOS.length - 1) {
          setAuto(false);
          return;
        }
        setPaso(paso + 1);
        abrir(PASOS[paso + 1]);
      }, fin),
    );

    return () => {
      vivo = false;
      timers.forEach((t: number) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, auto, paso, tipo]);

  if (!demo) return null;
  const pasoActual = PASOS[Math.min(paso, PASOS.length - 1)];
  const enVivo = avisos[avisos.length - 1];

  const ir = (n: number) => {
    const i = Math.max(0, Math.min(n, PASOS.length - 1));
    setPaso(i);
    abrir(PASOS[i]);
  };

  // Al terminar, el piloto automático vuelve a empezar desde el primer paso.
  const alternarAuto = () => {
    if (!auto && paso >= PASOS.length - 1) ir(0);
    else if (!auto) abrir(PASOS[paso]);
    if (auto) setAvisos([]);
    setAuto((a: boolean) => !a);
  };

  const restaurar = async () => {
    setBusy(true);
    try {
      await restaurarDemo(tipo);
      toast.success("Datos iniciales restaurados.");
    } catch {
      toast.error("No se pudieron restaurar los datos. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-40";

  return (
    <>
      {/* Avisos flotantes del ejercicio en vivo */}
      <div
        data-barra-demo
        aria-live="polite"
        className="pointer-events-none fixed left-3 right-3 top-16 z-[70] flex flex-col items-end gap-2 sm:left-auto sm:w-80"
      >
        {avisos.map((a: Aviso) => (
          <div
            key={a.id}
            className="flex w-full items-start gap-2.5 rounded-xl border-2 border-[#2563EB] bg-[#0F172A] px-3.5 py-3 text-sm font-medium text-white shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300"
          >
            {a.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Radio className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-[#60A5FA]" />
            )}
            <span className="min-w-0 break-words">{a.texto}</span>
          </div>
        ))}
      </div>

      {/* Barra inferior del recorrido */}
      <div
        data-barra-demo
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-[60] flex justify-center px-3 md:bottom-4"
      >
        <div className="pointer-events-auto w-full max-w-3xl space-y-3 rounded-2xl border-2 border-[#2563EB] bg-[#0F172A] p-4 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 break-words">
              <p className="text-base font-semibold leading-snug">
                Paso {paso + 1} de {PASOS.length}: {pasoActual.titulo}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-200">{pasoActual.texto}</p>
              {auto && enVivo && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#93C5FD]">
                  <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" /> En vivo: {enVivo.texto}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${auto ? "bg-[#2563EB] text-white" : "bg-white/15 text-slate-200"}`}
            >
              {auto ? "Piloto automático" : "Explorando"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className={btn} onClick={alternarAuto}>
              {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {auto ? "Pausar / Explorar libremente" : "Piloto automático"}
            </button>
            <button type="button" className={btn} onClick={() => ir(paso - 1)} disabled={paso === 0}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <button type="button" className={btn} onClick={() => ir(paso + 1)} disabled={paso === PASOS.length - 1}>
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" className={btn} onClick={restaurar} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Restaurar
            </button>
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              <Rocket className="h-4 w-4" /> Crear mi cuenta gratis
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, Radio, Rocket, Minimize2, Maximize2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CORREO_DEMO, esCuentaDemo } from "@/lib/demo-real";

/** Cada cuánto el piloto automático pasa a la siguiente ventana. */
const INTERVALO_MS = 20000;
/** Los tiempos de cada guion se multiplican por esto para que se alcance a leer cada aviso. */
const ESCALA = 4.5;

/** Elemento de la pantalla que se resalta como apoyo visual (opcional: la navegación no depende de él). */
type Objetivo = { css?: string; texto?: RegExp };
/** Una acción dentro de la ventana: aviso flotante y, si aplica, un resaltado, un clic o el chat del agente. */
type Accion = {
  ms: number;
  aviso: string;
  ok?: boolean;
  clic?: Objetivo[];
  resaltar?: Objetivo[];
  elegir?: Objetivo[];
  agente?: boolean;
};
type Paso = { titulo: string; texto: string; ruta: string; vista?: string; ancla?: string; guion: Accion[] };
type Aviso = { id: number; texto: string; ok: boolean };

const TEXTOS = "h1, h2, h3, h4, p, span, td, th, li, label, button, [role=button], a";

// Restaurante y comidas: 6 ventanas reales, una cada 4,5 segundos.
const PASOS_RESTAURANTE: Paso[] = [
  {
    titulo: "Vender y cobrar: menú en mosaico HD",
    texto: "El punto de venta con las fotos de los platos y la selección en vivo de papa francesa y salsa de ajo.",
    ruta: "/restaurante",
    vista: "venta",
    guion: [
      { ms: 300, aviso: "Abriendo Vender y cobrar con el menú en fotos HD" },
      { ms: 1000, aviso: "Se abre el plato con sus opciones", clic: [{ css: "[role=button]", texto: /chuleta/i }, { css: "[role=button]:has(img)" }] },
      { ms: 2100, aviso: "Eligiendo papa francesa", clic: [{ css: ".fixed button", texto: /papa francesa/i }] },
      { ms: 2900, aviso: "Agregando salsa de ajo", clic: [{ css: ".fixed button", texto: /\bajo\b/i }] },
      { ms: 3700, aviso: "Plato agregado a la cuenta con sus opciones", ok: true, clic: [{ css: "button", texto: /agregar al pedido/i }] },
    ],
  },
  {
    titulo: "Pedidos y cocina",
    texto: "La comanda cae sola en pantalla, lista para preparar.",
    ruta: "/restaurante",
    vista: "pedidos",
    guion: [
      { ms: 300, aviso: "La comanda llegó sola a cocina", resaltar: [{ texto: /^\s*nuevo/i }] },
      { ms: 2000, aviso: "Cocina la pasa a preparación con un toque", resaltar: [{ texto: /preparando|en preparaci/i }] },
      { ms: 3500, aviso: "Pedido listo para entregar", ok: true },
    ],
  },
  {
    titulo: "Inventario de insumos",
    texto: "Cada venta descuenta los ingredientes de la receta y avisa cuando un insumo baja del mínimo.",
    ruta: "/restaurante",
    vista: "recetario",
    guion: [
      { ms: 300, aviso: "Abriendo Inventario de insumos y recetas" },
      { ms: 1700, aviso: "Alerta: insumos por debajo del mínimo", resaltar: [{ texto: /m[ií]nimo|por debajo|agotad/i }] },
      { ms: 3400, aviso: "Ingredientes descontados automáticamente por receta", ok: true },
    ],
  },
  {
    titulo: "Agente WhatsApp IA",
    texto: "Un cliente pide por chat y la IA toma el pedido sola.",
    ruta: "/restaurante",
    vista: "agente",
    ancla: "agente-whatsapp-demo",
    guion: [
      { ms: 300, aviso: "Abriendo el Agente WhatsApp IA" },
      { ms: 800, aviso: "Un cliente escribe por WhatsApp para pedir", agente: true },
      { ms: 3500, aviso: "La IA respondió sola y registró el pedido", ok: true },
    ],
  },
  {
    titulo: "Caja del restaurante",
    texto: "El arqueo separa lo que entró en efectivo de lo que entró por Nequi, Daviplata o transferencia.",
    ruta: "/restaurante",
    vista: "caja",
    guion: [
      { ms: 300, aviso: "Abriendo la caja con el turno del día" },
      { ms: 1500, aviso: "Arqueo: lo que entró en efectivo", resaltar: [{ texto: /efectivo/i }] },
      { ms: 2800, aviso: "Y lo que entró por Nequi, Daviplata o transferencia", resaltar: [{ texto: /transferencia|nequi|daviplata/i }] },
      { ms: 3900, aviso: "Caja cuadrada al peso", ok: true },
    ],
  },
  {
    titulo: "Finanzas y rentabilidad",
    texto: "Los ingresos reales del día, los gastos y la utilidad neta, con los asientos contables cuadrados.",
    ruta: "/finanzas",
    guion: [
      { ms: 300, aviso: "Abriendo Finanzas y rentabilidad" },
      { ms: 1700, aviso: "Ingresos reales del día y utilidad neta", resaltar: [{ texto: /utilidad neta/i }] },
      { ms: 3400, aviso: "Asientos contables creados y cuadrados solos", ok: true },
    ],
  },
];

// Concesionario de vehículos: 6 ventanas reales, una cada 4,5 segundos.
const PASOS_VEHICULOS: Paso[] = [
  {
    titulo: "Inventario de vehículos en mosaico HD",
    texto: "Fotos de motos y carros de gama media con su costo de compra, alistamiento y utilidad neta.",
    ruta: "/modulos/vehiculos",
    guion: [
      { ms: 300, aviso: "Abriendo el inventario de vehículos", clic: [{ css: "button", texto: /^\s*mosaico\s*$/i }] },
      { ms: 1500, aviso: "Fotos HD de motos y carros de gama media", resaltar: [{ css: "[class*=grid] img" }] },
      { ms: 2800, aviso: "Compra + alistamiento = utilidad neta", resaltar: [{ texto: /utilidad/i }] },
      { ms: 3800, aviso: "SOAT y tecnomecánica al día", ok: true },
    ],
  },
  {
    titulo: "Cotización y cuota mensual",
    texto: "Se elige un vehículo y el sistema calcula la cuota inicial y la mensual, lista para enviar por WhatsApp.",
    ruta: "/modulos/cotizaciones_veh",
    guion: [
      { ms: 300, aviso: "Abriendo Cotizaciones con simulador de cuota" },
      { ms: 1000, aviso: "Seleccionando un vehículo del inventario", elegir: [{ css: "select", texto: /\$/ }] },
      { ms: 1900, aviso: "Forma de pago a crédito", clic: [{ css: "button", texto: /^\s*a cr[eé]dito\s*$/i }] },
      { ms: 2900, aviso: "Cuota mensual calculada al instante", resaltar: [{ texto: /cuota mensual/i }] },
      { ms: 3800, aviso: "Lista para enviar por WhatsApp al cliente", ok: true, resaltar: [{ css: "button", texto: /whatsapp/i }] },
    ],
  },
  {
    titulo: "Taller y mantenimientos",
    texto: "Una orden activa con repuestos y mano de obra que se suman al costo del vehículo.",
    ruta: "/modulos/taller",
    guion: [
      { ms: 300, aviso: "Abriendo Taller y mantenimientos" },
      { ms: 1700, aviso: "Orden activa con repuestos y mano de obra", resaltar: [{ texto: /repuesto|mano de obra/i }] },
      { ms: 3400, aviso: "El costo se suma al vehículo automáticamente", ok: true },
    ],
  },
  {
    titulo: "Ventas y entregas",
    texto: "Ventas reales cerradas y una venta nueva en vivo que actualiza el inventario.",
    ruta: "/modulos/ventas_veh",
    guion: [
      { ms: 300, aviso: "Abriendo Ventas y entregas" },
      { ms: 1600, aviso: "Cerrando una venta nueva en vivo", resaltar: [{ texto: /vendid|entregad|venta/i }] },
      { ms: 3000, aviso: "Venta registrada · Inventario actualizado", ok: true },
    ],
  },
  {
    titulo: "Agente WhatsApp IA 24/7",
    texto: "Un cliente cotiza una moto por chat y la IA responde sola con precio y papeles.",
    ruta: "/negocio/concesionario",
    vista: "agente",
    ancla: "agente-whatsapp-demo",
    guion: [
      { ms: 300, aviso: "Abriendo el Agente WhatsApp IA" },
      { ms: 800, aviso: "Un cliente cotiza una moto por WhatsApp", agente: true },
      { ms: 3500, aviso: "La IA respondió sola con precio y papeles", ok: true },
    ],
  },
  {
    titulo: "Finanzas y rentabilidad",
    texto: "Ingresos reales del día, utilidad neta y asientos contables cuadrados.",
    ruta: "/finanzas",
    guion: [
      { ms: 300, aviso: "Abriendo Finanzas y rentabilidad" },
      { ms: 1700, aviso: "Ingresos del día y utilidad neta", resaltar: [{ texto: /utilidad neta/i }] },
      { ms: 3400, aviso: "Débitos y créditos cuadrados al peso", ok: true },
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
  el.scrollIntoView({ behavior: "auto", block: "center" });
  const antes = { outline: el.style.outline, offset: el.style.outlineOffset, sombra: el.style.boxShadow };
  el.style.outline = "3px solid #2563EB";
  el.style.outlineOffset = "4px";
  el.style.boxShadow = "0 0 0 8px rgba(37, 99, 235, 0.25)";
  window.setTimeout(() => {
    el.style.outline = antes.outline;
    el.style.outlineOffset = antes.offset;
    el.style.boxShadow = antes.sombra;
  }, 5000);
};

// ¿La pantalla actual ya es la del paso? (el panel del negocio puede vivir en /restaurante o /negocio/<tipo>,
// y además debe estar abierta la pestaña exacta: nunca se queda en Configuración).
const enRutaDelPaso = (p: Paso, ruta: string, busqueda: string): boolean =>
  p.vista
    ? ruta === p.ruta && new URLSearchParams(busqueda).get("vista") === p.vista
    : ruta === p.ruta;

/** Barra del recorrido guiado: solo en cuentas demo. Cambia de ventana sola cada 4,5 segundos. */
export function BarraDemo() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [paso, setPaso] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [minimizada, setMinimizada] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const contador = useRef(0);
  const cifrasListas = useRef(false);
  const demo = esCuentaDemo(user?.email);
  const tipo = user?.email?.toLowerCase() === CORREO_DEMO.vehiculos ? "vehiculos" : "restaurante";
  const PASOS = tipo === "vehiculos" ? PASOS_VEHICULOS : PASOS_RESTAURANTE;
  const indice = Math.min(paso, PASOS.length - 1);

  // Abre la ventana real del paso (y la pestaña exacta del panel cuando la tiene).
  const abrir = (p: Paso) => {
    if (p.vista) nav({ to: p.ruta as never, search: { vista: p.vista } as never });
    else nav({ to: p.ruta as never });
  };

  // Al entrar a la demo se aseguran las cifras del día (Finanzas, Ventas y Caja nunca en $ 0).
  useEffect(() => {
    if (!demo || cifrasListas.current) return;
    cifrasListas.current = true;
    void supabase.rpc("demo_cifras_del_dia").then(({ error }) => {
      if (error) console.warn("Demo: no se cargaron las cifras del día", error.message);
      else window.dispatchEvent(new Event("negocio:cambio"));
    });
  }, [demo]);

  // Cada cambio de paso abre su ventana. Si otra pantalla se impone (por ejemplo el panel
  // general), se vuelve a abrir la del paso para que el recorrido nunca se quede atascado.
  useEffect(() => {
    if (!demo) return;
    const p = PASOS[indice];
    abrir(p);
    const revisar = () => {
      if (!enRutaDelPaso(p, window.location.pathname, window.location.search)) abrir(p);
    };
    const correctores = [window.setTimeout(revisar, 1500), window.setTimeout(revisar, 3500), window.setTimeout(revisar, 6500)];
    return () => correctores.forEach((t: number) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, indice, tipo]);

  // Temporizador real: cada 4,5 segundos avanza al siguiente paso (1 → 2 → … → 6).
  useEffect(() => {
    if (!demo || !isPlaying) return;
    const temporizador = window.setInterval(() => {
      if (indice >= PASOS.length - 1) {
        setIsPlaying(false);
        return;
      }
      setPaso(indice + 1);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [demo, isPlaying, indice, PASOS.length]);

  // Ejercicio en vivo dentro de la ventana: avisos flotantes y apoyos visuales.
  useEffect(() => {
    if (!demo || !isPlaying) return;
    const p = PASOS[indice];
    const timers: number[] = [];
    let vivo = true;
    setAvisos([]);

    if (p.ancla) {
      const ancla = p.ancla;
      const llevar = (intento: number) => {
        if (!vivo) return;
        const el = document.getElementById(ancla);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else if (intento < 8) timers.push(window.setTimeout(() => llevar(intento + 1), 250));
      };
      timers.push(window.setTimeout(() => llevar(0), 250));
    }

    const ejecutar = (a: Accion, intento: number) => {
      if (!vivo) return;
      if (a.agente) {
        // El chat del agente puede tardar un instante en aparecer: se espera a que esté en pantalla.
        if (document.getElementById("agente-whatsapp-demo")) window.dispatchEvent(new Event("gosaryc:demo-agente"));
        else if (intento < 6) timers.push(window.setTimeout(() => ejecutar(a, intento + 1), 250));
        return;
      }
      const objetivo = a.clic ?? a.resaltar ?? a.elegir;
      if (!objetivo) return;
      const el = buscar(objetivo);
      if (!el) {
        if (intento < 4) timers.push(window.setTimeout(() => ejecutar(a, intento + 1), 250));
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
      if (a.clic) timers.push(window.setTimeout(() => vivo && el.click(), 1200));
    };

    p.guion.forEach((a: Accion) => {
      timers.push(
        window.setTimeout(() => {
          contador.current += 1;
          const id = contador.current;
          setAvisos((prev: Aviso[]) => [...prev.slice(-2), { id, texto: a.aviso, ok: !!a.ok }]);
          timers.push(window.setTimeout(() => setAvisos((prev: Aviso[]) => prev.filter((x: Aviso) => x.id !== id)), 10000));
          ejecutar(a, 0);
        }, a.ms * ESCALA),
      );
    });

    return () => {
      vivo = false;
      timers.forEach((t: number) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, isPlaying, indice, tipo]);

  if (!demo) return null;
  const pasoActual = PASOS[indice];
  const enVivo = avisos[avisos.length - 1];

  const ir = (n: number) => {
    const i = Math.max(0, Math.min(n, PASOS.length - 1));
    if (i === indice) abrir(PASOS[i]);
    else setPaso(i);
  };

  // Al terminar, el piloto automático vuelve a empezar desde el primer paso.
  const alternarAuto = () => {
    if (isPlaying) {
      setAvisos([]);
      setIsPlaying(false);
      return;
    }
    if (indice >= PASOS.length - 1) setPaso(0);
    else abrir(PASOS[indice]);
    setIsPlaying(true);
  };

  const btn =
    "inline-flex min-h-8 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-40";

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
            className="demo-oscuro flex w-full items-start gap-2.5 rounded-xl border-2 border-[#2563EB] bg-[#0F172A] px-3.5 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300"
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

      {/* Control compacto del recorrido, sin cubrir el contenido */}
      <div
        data-barra-demo
        className="demo-oscuro pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-3 z-[60] flex justify-end md:bottom-4 md:right-4"
      >
        {cerrada ? (
          <button
            type="button"
            onClick={() => setCerrada(false)}
            aria-label="Mostrar recorrido de demostración"
            title="Mostrar recorrido"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#2563EB]/60 bg-[#0F172A]/85 text-[#93C5FD] shadow-lg backdrop-blur-md transition hover:bg-[#1E293B]"
          >
            <Radio className="h-5 w-5" />
          </button>
        ) : minimizada ? (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#2563EB]/60 bg-[#0F172A] px-2 py-1.5 text-white shadow-xl">
            <button
              type="button"
              onClick={() => setMinimizada(false)}
              className="flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold hover:bg-white/10"
              aria-label="Ampliar recorrido"
            >
              <Radio className="h-4 w-4 shrink-0 text-[#60A5FA]" />
              <span>Paso {indice + 1}/{PASOS.length}</span>
              <span className="text-white/60">{isPlaying ? "En vivo" : "Pausado"}</span>
            </button>
            <button
              type="button"
              onClick={alternarAuto}
              aria-label={isPlaying ? "Pausar recorrido" : "Reanudar recorrido"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMinimizada(false)}
              aria-label="Expandir recorrido"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCerrada(true)}
              aria-label="Cerrar recorrido"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="pointer-events-auto w-[min(23rem,calc(100vw-1.5rem))] space-y-2 rounded-2xl border border-[#2563EB]/60 bg-[#0F172A] p-3 text-white shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Radio className={`h-4 w-4 shrink-0 text-[#60A5FA] ${isPlaying ? "animate-pulse" : ""}`} />
                  <span className="text-xs font-bold text-[#93C5FD]">
                    {isPlaying ? "Piloto automático" : "Explorando"}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                    Paso {indice + 1}/{PASOS.length}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold leading-snug">{pasoActual.titulo}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/70">{pasoActual.texto}</p>
                {isPlaying && enVivo && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-relaxed text-[#93C5FD]">
                    <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse" />
                    <span>{enVivo.texto}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMinimizada(true)}
                  aria-label="Minimizar recorrido"
                  title="Minimizar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCerrada(true)}
                  aria-label="Cerrar recorrido"
                  title="Cerrar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                style={{ width: `${((indice + 1) / PASOS.length) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className={btn} onClick={alternarAuto}>
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isPlaying ? "Pausar" : "Reanudar"}
              </button>
              <button type="button" className={btn} onClick={() => ir(indice - 1)} disabled={indice === 0}>
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button type="button" className={btn} onClick={() => ir(indice + 1)} disabled={indice === PASOS.length - 1}>
                Siguiente <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <Link
                to="/login"
                search={{ mode: "signup" }}
                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#1D4ED8]"
              >
                <Rocket className="h-3.5 w-3.5" /> Crear cuenta
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

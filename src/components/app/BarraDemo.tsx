import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CORREO_DEMO, esCuentaDemo, restaurarDemo } from "@/lib/demo-real";

type Paso = { titulo: string; texto: string; ruta: string };

// Recorrido del restaurante: pedidos, comanda, agente y caja.
const PASOS_RESTAURANTE: Paso[] = [
  { titulo: "Portada y KPIs", texto: "Ventas del día, caja abierta y resumen del restaurante.", ruta: "/dashboard" },
  { titulo: "Menú con fotos", texto: "Platos con fotos, precios, salsas y tipo de papa a elegir.", ruta: "/restaurante" },
  { titulo: "Punto de venta / Comanda", texto: "Registra pedidos y ventas en segundos; la comanda sale sola a cocina.", ruta: "/restaurante" },
  { titulo: "Agente WhatsApp IA", texto: "Prueba el simulador de chat que atiende y toma pedidos.", ruta: "/settings" },
  { titulo: "Caja y Contabilidad", texto: "Caja, asientos contables y reportes al día.", ruta: "/finanzas" },
  { titulo: "Cierre", texto: "Crea tu cuenta gratis y empieza con tu propio negocio.", ruta: "/dashboard" },
];

// Recorrido del concesionario: inventario, cotización, crédito, venta y alertas.
const PASOS_VEHICULOS: Paso[] = [
  { titulo: "Panel del concesionario", texto: "Inventario disponible, separados, vendidos, créditos, comisiones y cartera en un vistazo.", ruta: "/restaurante" },
  { titulo: "Inventario con fotos", texto: "Motos y carros con fotos, precio, costo de compra, alistamiento y utilidad por vehículo.", ruta: "/modulos/vehiculos" },
  { titulo: "Cotizaciones a crédito", texto: "Cuota mensual calculada con la tasa del mes, lista para enviar por WhatsApp.", ruta: "/modulos/cotizaciones_veh" },
  { titulo: "Créditos con financieras", texto: "Solicitudes aprobadas, en estudio y rechazadas con sus documentos.", ruta: "/modulos/creditos_veh" },
  { titulo: "Separaciones", texto: "Anticipos recibidos y vehículos reservados para cada cliente.", ruta: "/modulos/separaciones_veh" },
  { titulo: "Ventas y entregas", texto: "Ventas cerradas, traspaso y acta de entrega al comprador.", ruta: "/modulos/ventas_veh" },
  { titulo: "Alertas de SOAT y tecnomecánica", texto: "Vencimientos próximos y vencidos de cada vehículo.", ruta: "/modulos/vencimientos_veh" },
  { titulo: "Agente WhatsApp IA", texto: "Prueba el asesor de chat que responde por motos y carros.", ruta: "/settings" },
  { titulo: "Caja y Contabilidad", texto: "Caja, asientos contables y reportes al día.", ruta: "/finanzas" },
  { titulo: "Cierre", texto: "Crea tu cuenta gratis y empieza con tu propio concesionario.", ruta: "/restaurante" },
];

/** Barra de recorrido guiado: solo en cuentas demo, abajo y centrada. */
export function BarraDemo() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(true);
  const demo = esCuentaDemo(user?.email);
  const tipo = user?.email?.toLowerCase() === CORREO_DEMO.vehiculos ? "vehiculos" : "restaurante";
  const PASOS = tipo === "vehiculos" ? PASOS_VEHICULOS : PASOS_RESTAURANTE;

  useEffect(() => {
    if (!demo || !auto) return;
    const t = setTimeout(() => {
      const sig = Math.min(paso + 1, PASOS.length - 1);
      if (sig === paso) {
        setAuto(false);
        return;
      }
      setPaso(sig);
      nav({ to: PASOS[sig].ruta as never });
    }, 9000);
    return () => clearTimeout(t);
  }, [demo, auto, paso, nav, PASOS]);

  if (!demo) return null;
  const pasoActual = PASOS[Math.min(paso, PASOS.length - 1)];

  const ir = (n: number) => {
    const i = Math.max(0, Math.min(n, PASOS.length - 1));
    setPaso(i);
    nav({ to: PASOS[i].ruta as never });
  };

  // Al terminar, el piloto automático vuelve a empezar desde el primer paso.
  const alternarAuto = () => {
    if (!auto && paso >= PASOS.length - 1) ir(0);
    setAuto((a) => !a);
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

  const btn = "inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs font-medium hover:bg-glass-strong disabled:opacity-50";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 flex justify-center px-3 md:bottom-4">
      <div className="pointer-events-auto w-full max-w-2xl space-y-2 rounded-2xl border border-emerald-500/40 bg-background/95 p-3 text-xs shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 break-words">
            <span className="font-semibold">Paso {paso + 1} de {PASOS.length}: {pasoActual.titulo}</span>
            <span className="block text-muted-foreground">{pasoActual.texto}</span>
          </p>
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium">
            {auto ? "Piloto automático" : "Explorando"}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={btn} onClick={() => ir(paso - 1)} disabled={paso === 0}>
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          <button type="button" className={btn} onClick={alternarAuto}>
            {auto ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {auto ? "Pausar / Explorar" : "Piloto automático"}
          </button>
          <button type="button" className={btn} onClick={() => ir(paso + 1)} disabled={paso === PASOS.length - 1}>
            Siguiente <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={btn} onClick={restaurar} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Restaurar
          </button>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Rocket className="h-3.5 w-3.5" /> Crear mi cuenta gratis
          </Link>
        </div>
      </div>
    </div>
  );
}

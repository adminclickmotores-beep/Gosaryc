import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, RefreshCw, Rocket } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CORREO_DEMO, esCuentaDemo, restaurarDemo } from "@/lib/demo-real";

/** Barra discreta que solo aparece dentro de las cuentas demo reales. */
export function BarraDemo() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!esCuentaDemo(user?.email)) return null;
  const tipo = user?.email?.toLowerCase() === CORREO_DEMO.vehiculos ? "vehiculos" : "restaurante";

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

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-foreground">
      <span className="min-w-0 break-words font-medium">Modo Demo Real — Estás explorando con datos de prueba</span>
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={restaurar}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-3 py-1.5 font-medium hover:bg-glass-strong disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Restaurar datos iniciales
        </button>
        <Link
          to="/login"
          search={{ mode: "signup" }}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:opacity-90"
        >
          <Rocket className="h-3.5 w-3.5" />
          Crear mi cuenta gratis
        </Link>
      </span>
    </div>
  );
}

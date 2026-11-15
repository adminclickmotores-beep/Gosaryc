import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/cartera-fiados")({
  head: () => ({ meta: [{ title: "Cartera y fiados" }] }),
  component: CarteraFiadosPage,
});

type Fila = {
  titulo: string;
  contacto: string | null;
  telefono: string | null;
  estado: string;
  monto: number;
  abonado: number;
  anulado: boolean;
};

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function CarteraFiadosPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, contacto, telefono, estado, monto, abonado, anulado")
      .eq("modulo", "fiados");
    if (error) toast.error("No se pudo cargar la cartera.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const deudores = useMemo(() => {
    const mapa = new Map<string, { contacto: string | null; telefono: string | null; debe: number; abonado: number }>();
    for (const f of filas) {
      if (f.anulado || f.estado === "pagado") continue;
      const saldo = f.monto - f.abonado;
      if (saldo <= 0) continue;
      const clave = (f.contacto ?? f.titulo).trim() || f.titulo;
      const actual = mapa.get(clave) ?? { contacto: f.contacto, telefono: f.telefono, debe: 0, abonado: 0 };
      actual.debe += saldo;
      actual.abonado += f.abonado;
      if (!actual.telefono && f.telefono) actual.telefono = f.telefono;
      mapa.set(clave, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, contacto: v.contacto, telefono: v.telefono, debe: v.debe, abonado: v.abonado }))
      .sort((a, b) => b.debe - a.debe);
  }, [filas]);

  const totalPorCobrar = deudores.reduce((s, d) => s + d.debe, 0);
  // Lo cobrado = abonos recibidos en fiados vigentes (los anulados no cuentan).
  const totalCobrado = filas.filter((f) => !f.anulado).reduce((s, f) => s + f.abonado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Coins className="h-7 w-7 text-primary" /> Cartera y fiados
        </h1>
        <p className="text-sm text-muted-foreground">
          Quién te debe y cuánto. Para agregar un fiado o registrar un abono, usa{" "}
          <Link to="/modulos/$id" params={{ id: "fiados" }} className="text-primary">
            sus registros
          </Link>
          . Márcalo como "Pagado" cuando el cliente salde la deuda.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando cartera…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Por cobrar</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(totalPorCobrar)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Deudores</p>
              <p className="font-display text-xl text-foreground">{deudores.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ya cobrado</p>
              <p className="truncate font-display text-xl text-primary">{dinero(totalCobrado)}</p>
            </GlassPanel>
          </div>

          {deudores.length === 0 && <p className="text-sm text-muted-foreground">Nadie te debe por ahora.</p>}

          <div className="space-y-2">
            {deudores.map((d) => (
              <GlassPanel key={d.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{d.contacto ?? d.nombre}</p>
                </div>
                {d.telefono && (
                  <a
                    href={`https://wa.me/${d.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hola ${d.contacto ?? d.nombre}, te recordamos tu saldo pendiente de ${dinero(d.debe)}. ¡Gracias!`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full border border-glass-border px-3 py-1 text-xs text-primary"
                  >
                    Recordar por WhatsApp
                  </a>
                )}
                <div className="shrink-0 text-right">
                  <p className="text-sm text-foreground">{dinero(d.debe)}</p>
                  {d.abonado > 0 && <p className="text-xs text-muted-foreground">Ha abonado {dinero(d.abonado)}</p>}
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins, Send } from "lucide-react";
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
  fecha: string | null;
};

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function CarteraFiadosPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, contacto, telefono, estado, monto, abonado, anulado, fecha")
      .eq("modulo", "fiados");
    if (error) toast.error("No se pudo cargar la cartera.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Clave de la API local de WhatsApp: se guarda solo en este navegador.
  const [claveWa, setClaveWa] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setClaveWa(localStorage.getItem("whatsapp_local_token") ?? "");
  }, []);

  const guardarClave = (valor: string) => {
    setClaveWa(valor);
    localStorage.setItem("whatsapp_local_token", valor);
  };

  const enviarVencidos = async () => {
    const lista = vencidos.flatMap((d) =>
      d.telefono
        ? [
            {
              telefono: d.telefono,
              mensaje: `Hola ${d.contacto ?? d.nombre}, tu saldo de ${dinero(d.debe)} venció el ${d.vencido}. Por favor ponte al día. ¡Gracias!`,
            },
          ]
        : [],
    );
    if (lista.length === 0) {
      toast.error("Ningún cobro vencido tiene teléfono registrado.");
      return;
    }
    if (!claveWa.trim()) {
      toast.error("Pega la clave de la API de WhatsApp.");
      return;
    }
    if (!window.confirm(`Se enviarán ${lista.length} recordatorios por WhatsApp. ¿Continuar?`)) return;

    setEnviando(true);
    try {
      const res = await fetch("http://localhost:3001/enviar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveWa.trim()}` },
        body: JSON.stringify({ mensajes: lista }),
      });
      if (!res.ok) {
        const cuerpo = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(cuerpo.error ?? "La API de WhatsApp no respondió bien.");
        return;
      }
      const { resultados } = (await res.json()) as { resultados: { ok: boolean }[] };
      const enviados = resultados.filter((r) => r.ok).length;
      toast.success(`Recordatorios enviados: ${enviados} de ${resultados.length}.`);
    } catch {
      toast.error("No se pudo conectar con WhatsApp. Revisa que la API local esté corriendo.");
    } finally {
      setEnviando(false);
    }
  };

  const deudores = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const mapa = new Map<
      string,
      { contacto: string | null; telefono: string | null; debe: number; abonado: number; vencido: string | null }
    >();
    for (const f of filas) {
      if (f.anulado || f.estado === "pagado") continue;
      const saldo = f.monto - f.abonado;
      if (saldo <= 0) continue;
      const clave = (f.contacto ?? f.titulo).trim() || f.titulo;
      const actual = mapa.get(clave) ?? { contacto: f.contacto, telefono: f.telefono, debe: 0, abonado: 0, vencido: null };
      actual.debe += saldo;
      actual.abonado += f.abonado;
      if (!actual.telefono && f.telefono) actual.telefono = f.telefono;
      if (f.fecha && f.fecha < hoy && (!actual.vencido || f.fecha < actual.vencido)) actual.vencido = f.fecha;
      mapa.set(clave, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({
        nombre,
        contacto: v.contacto,
        telefono: v.telefono,
        debe: v.debe,
        abonado: v.abonado,
        vencido: v.vencido,
      }))
      .sort((a, b) => b.debe - a.debe);
  }, [filas]);

  const vencidos = deudores.filter((d) => d.vencido !== null);
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

          {vencidos.length > 0 && (
            <GlassPanel className="space-y-3 p-4">
              <p className="text-sm font-medium text-foreground">Cobros vencidos ({vencidos.length})</p>
              {vencidos.map((d) => (
                <div key={`vencido-${d.nombre}`} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm text-foreground">{d.contacto ?? d.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencido desde {d.vencido} · {dinero(d.debe)}
                    </p>
                  </div>
                  {d.telefono && (
                    <a
                      href={`https://wa.me/${d.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${d.contacto ?? d.nombre}, tu saldo de ${dinero(d.debe)} venció el ${d.vencido}. Por favor ponte al día. ¡Gracias!`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-glass-border px-3 py-1 text-xs text-primary"
                    >
                      Recordar por WhatsApp
                    </a>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3 border-t border-glass-border pt-3">
                <input
                  type="password"
                  autoComplete="off"
                  value={claveWa}
                  onChange={(e) => guardarClave(e.target.value)}
                  placeholder="Clave de la API de WhatsApp"
                  className="min-w-0 flex-1 rounded-md border border-glass-border bg-transparent px-3 py-2 text-base text-foreground"
                />
                <button
                  type="button"
                  onClick={enviarVencidos}
                  disabled={enviando}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {enviando ? "Enviando…" : "Enviar recordatorios a todos"}
                </button>
              </div>
            </GlassPanel>
          )}

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

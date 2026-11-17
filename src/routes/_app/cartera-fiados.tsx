import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import type { Tables } from "@/integrations/supabase/types";
import { usePermisos } from "@/hooks/use-permisos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";

type Cupo = Tables<"com_cupos">;
const claveCliente = (nombre: string | null, tel: string | null): string => {
  const d = (tel ?? "").replace(/\D/g, "");
  return d || (nombre ?? "").trim().toLowerCase();
};

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
  const { esAdmin } = usePermisos();
  const [cupos, setCupos] = useState<Cupo[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevoCupo, setNuevoCupo] = useState("");
  const [nuevoPlazo, setNuevoPlazo] = useState("30");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("fiados")
      .select("titulo, contacto, telefono, estado, monto, abonado, anulado, fecha");
    if (error) toast.error("No se pudo cargar la cartera.");
    setFilas(data ?? []);
    const { data: c } = await supabase.from("com_cupos").select("*");
    setCupos(c ?? []);
    setCargando(false);
  }, []);

  const cupoDe = (nombre: string | null, tel: string | null): Cupo | undefined =>
    cupos.find((c) => c.cliente_clave === claveCliente(nombre, tel) || c.cliente_clave === (nombre ?? "").trim().toLowerCase());

  const guardarCupo = async (nombre: string, tel: string | null, cupoTxt: string, plazoTxt: string) => {
    const cupo = Number(cupoTxt.replace(",", "."));
    const plazo = Math.floor(Number(plazoTxt));
    if (!nombre.trim()) return toast.error("Escribe el nombre del cliente.");
    if (!Number.isFinite(cupo) || cupo < 0) return toast.error("El cupo debe ser un número válido.");
    if (!Number.isFinite(plazo) || plazo < 0 || plazo > 365) return toast.error("El plazo debe estar entre 0 y 365 días.");
    const clave = claveCliente(nombre, tel);
    const existente = cupos.find((c) => c.cliente_clave === clave);
    const { error } = existente
      ? await supabase.from("com_cupos").update({ cupo_maximo: cupo, plazo_dias: plazo, cliente: nombre.trim(), telefono: tel }).eq("id", existente.id)
      : await supabase.from("com_cupos").insert({ cliente_clave: clave, cliente: nombre.trim(), telefono: tel, cupo_maximo: cupo, plazo_dias: plazo });
    if (error) return toast.error("No se pudo guardar el cupo. Solo el dueño puede cambiarlo.");
    toast.success("Cupo guardado.");
    cargar();
  };

  const editarCupo = (nombre: string, tel: string | null) => {
    const actual = cupoDe(nombre, tel);
    const c = window.prompt(`Cupo máximo de crédito para ${nombre} (COP):`, String(actual?.cupo_maximo ?? 0));
    if (c === null) return;
    const p = window.prompt("Días de plazo para pagar:", String(actual?.plazo_dias ?? 30));
    if (p === null) return;
    void guardarCupo(nombre, tel, c, p);
  };

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
      { contacto: string | null; telefono: string | null; debe: number; abonado: number; vencido: string | null; detalle: string[] }
    >();
    for (const f of filas) {
      if (f.anulado || f.estado === "pagado") continue;
      const saldo = f.monto - f.abonado;
      if (saldo <= 0) continue;
      const clave = (f.contacto ?? f.titulo).trim() || f.titulo;
      const actual = mapa.get(clave) ?? { contacto: f.contacto, telefono: f.telefono, debe: 0, abonado: 0, vencido: null, detalle: [] };
      actual.detalle.push(`- ${f.titulo}: ${dinero(saldo)}${f.fecha ? ` (vence ${f.fecha}${f.fecha < hoy ? ", VENCIDO" : ""})` : ""}`);
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
        detalle: v.detalle,
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
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => exportarExcel("cartera-fiados", ["Cliente", "Teléfono", "Debe", "Abonado", "Vencido"],
              deudores.map((d) => [d.nombre, d.telefono ?? "", d.debe, d.abonado, d.vencido ?? ""]))}
            className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Exportar a Excel
          </button>
          <button
            onClick={() => imprimirReporte("Cartera y fiados", "Saldos por cobrar", ["Cliente", "Teléfono", "Debe", "Vencido"],
              deudores.map((d) => [d.nombre, d.telefono ?? "", dinero(d.debe), d.vencido ?? "al día"]),
              [`Total por cobrar: ${dinero(totalPorCobrar)} · Ya cobrado: ${dinero(totalCobrado)}`])}
            className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Exportar a PDF
          </button>
        </div>
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

          {esAdmin && (
            <GlassPanel className="space-y-3 p-4">
              <p className="text-sm font-medium text-foreground">Cupo de crédito por cliente</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <input className="rounded-md border border-glass-border bg-transparent px-3 py-2 text-base text-foreground" placeholder="Cliente" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                <input className="rounded-md border border-glass-border bg-transparent px-3 py-2 text-base text-foreground" placeholder="Celular" inputMode="tel" value={nuevoTel} onChange={(e) => setNuevoTel(e.target.value)} />
                <input className="rounded-md border border-glass-border bg-transparent px-3 py-2 text-base text-foreground" placeholder="Cupo máximo (COP)" inputMode="decimal" value={nuevoCupo} onChange={(e) => setNuevoCupo(e.target.value)} />
                <input className="rounded-md border border-glass-border bg-transparent px-3 py-2 text-base text-foreground" placeholder="Plazo (días)" inputMode="numeric" value={nuevoPlazo} onChange={(e) => setNuevoPlazo(e.target.value)} />
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
                  onClick={async () => {
                    await guardarCupo(nuevoNombre, nuevoTel.trim() || null, nuevoCupo, nuevoPlazo);
                    setNuevoNombre(""); setNuevoTel(""); setNuevoCupo("");
                  }}
                >
                  Guardar cupo
                </button>
              </div>
              {cupos.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Con cupo: {cupos.map((c) => `${c.cliente} (${dinero(c.cupo_maximo)}, ${c.plazo_dias} d)`).join(" · ")}
                </p>
              )}
            </GlassPanel>
          )}

          <div className="space-y-2">
            {deudores.map((d) => {
              const nombreCli = d.contacto ?? d.nombre;
              const cupo = cupoDe(nombreCli, d.telefono);
              const estadoCuenta = `Hola ${nombreCli}, este es tu estado de cuenta:\n${d.detalle.join("\n")}\nTotal pendiente: ${dinero(d.debe)}${cupo ? `\nCupo disponible: ${dinero(Math.max(cupo.cupo_maximo - d.debe, 0))}` : ""}\n¡Gracias!`;
              return (
              <GlassPanel key={d.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{nombreCli}</p>
                  <p className="text-xs text-muted-foreground">
                    {cupo ? `Cupo ${dinero(cupo.cupo_maximo)} · Disponible ${dinero(Math.max(cupo.cupo_maximo - d.debe, 0))} · Plazo ${cupo.plazo_dias} días` : "Sin cupo asignado"}
                    {d.vencido ? ` · Vencido desde ${d.vencido}` : ""}
                  </p>
                </div>
                {esAdmin && (
                  <button type="button" onClick={() => editarCupo(nombreCli, d.telefono)} className="shrink-0 rounded-full border border-glass-border px-3 py-1 text-xs text-foreground">
                    Cupo y plazo
                  </button>
                )}
                {d.telefono && (
                  <a
                    href={`https://wa.me/${d.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(estadoCuenta)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full border border-glass-border px-3 py-1 text-xs text-primary"
                  >
                    Enviar estado de cuenta
                  </a>
                )}
                <div className="shrink-0 text-right">
                  <p className="text-sm text-foreground">{dinero(d.debe)}</p>
                  {d.abonado > 0 && <p className="text-xs text-muted-foreground">Ha abonado {dinero(d.abonado)}</p>}
                </div>
              </GlassPanel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

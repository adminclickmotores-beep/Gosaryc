import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LifeBuoy, Send, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNegocio } from "@/hooks/use-negocio";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/soporte")({
  head: () => ({ meta: [{ title: "Soporte: pide ayuda" }] }),
  component: SoportePage,
});

type Ticket = Tables<"tickets_soporte">;

const CORREO_SOPORTE = "gosarycsoporte@gmail.com";

const CATEGORIAS: { valor: string; etiqueta: string }[] = [
  { valor: "falla", etiqueta: "Algo no funciona" },
  { valor: "duda", etiqueta: "Tengo una duda" },
  { valor: "cuenta", etiqueta: "Mi cuenta o licencia" },
  { valor: "sugerencia", etiqueta: "Sugerencia" },
];

const ESTADOS: { valor: string; etiqueta: string }[] = [
  { valor: "abierto", etiqueta: "Abierto" },
  { valor: "en_proceso", etiqueta: "En proceso" },
  { valor: "resuelto", etiqueta: "Resuelto" },
];

const etiquetaEstado = (e: string) => ESTADOS.find((x) => x.valor === e)?.etiqueta ?? e;
const etiquetaCategoria = (c: string) => CATEGORIAS.find((x) => x.valor === c)?.etiqueta ?? c;
const fecha = (iso: string) => new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50";

function SoportePage() {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const esSoporte = (user?.email ?? "").trim().toLowerCase() === CORREO_SOPORTE;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verTodos, setVerTodos] = useState(esSoporte);
  const [categoria, setCategoria] = useState("falla");
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("tickets_soporte")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("No se pudieron cargar los tickets.");
    else setTickets(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (esSoporte) setVerTodos(true);
  }, [esSoporte]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (asunto.trim().length < 3 || descripcion.trim().length < 10) {
      toast.error("Escribe un asunto y cuéntanos qué pasó (al menos una frase).");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.from("tickets_soporte").insert({
      user_id: user.id,
      correo: user.email ?? null,
      negocio: negocio?.nombre ?? null,
      categoria,
      asunto: asunto.trim(),
      descripcion: descripcion.trim(),
      pagina: document.referrer ? new URL(document.referrer).pathname : null,
    });
    setEnviando(false);
    if (error) {
      toast.error("No se pudo enviar tu solicitud. Intenta de nuevo.");
      return;
    }
    toast.success("Solicitud enviada. El equipo de soporte te responderá pronto.");
    setAsunto("");
    setDescripcion("");
    void cargar();
  };

  const actualizar = async (id: string, cambios: { estado?: string; respuesta?: string }) => {
    const { error } = await supabase
      .from("tickets_soporte")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("No se pudo guardar el cambio.");
    else {
      toast.success("Ticket actualizado.");
      void cargar();
    }
  };

  const lista = esSoporte && verTodos ? tickets : tickets.filter((t) => t.user_id === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl">
          <LifeBuoy className="h-6 w-6 text-primary" /> Soporte
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Antes de escribirnos, pregúntale al agente virtual o revisa la Academia: casi todo se resuelve ahí en minutos.
          Si algo sigue fallando, crea un ticket y te ayudamos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/asistente-virtual"
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-sm hover:bg-glass/70"
          >
            <Sparkles className="h-4 w-4 text-primary" /> Preguntar al agente virtual
          </Link>
          <Link
            to={"/academia" as never}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-sm hover:bg-glass/70"
          >
            <GraduationCap className="h-4 w-4 text-primary" /> Abrir la Academia
          </Link>
        </div>
      </div>

      <GlassPanel className="p-5">
        <h2 className="font-display text-lg">Crear un ticket</h2>
        <form onSubmit={enviar} className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="tk-cat">
              ¿Qué necesitas?
            </label>
            <select id="tk-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="tk-asunto">
              Asunto
            </label>
            <input
              id="tk-asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              maxLength={120}
              placeholder="Ej: No me deja cerrar la caja"
              className={campo}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="tk-desc">
              Cuéntanos qué pasó
            </label>
            <textarea
              id="tk-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="En qué pantalla estabas, qué hiciste y qué esperabas que pasara."
              className={campo}
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {enviando ? "Enviando…" : "Enviar al soporte"}
          </button>
        </form>
      </GlassPanel>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg">{esSoporte && verTodos ? "Bandeja de soporte" : "Mis tickets"}</h2>
          {esSoporte && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className="rounded-lg border border-glass-border bg-glass/40 px-3 py-1.5 text-sm hover:bg-glass/70"
            >
              {verTodos ? "Ver solo los míos" : "Ver todos"}
            </button>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {cargando ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay tickets.</p>
          ) : (
            lista.map((t) => (
              <TicketTarjeta key={t.id} t={t} esSoporte={esSoporte && verTodos} onGuardar={actualizar} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TicketTarjeta({
  t,
  esSoporte,
  onGuardar,
}: {
  t: Ticket;
  esSoporte: boolean;
  onGuardar: (id: string, cambios: { estado?: string; respuesta?: string }) => Promise<void>;
}) {
  const [respuesta, setRespuesta] = useState(t.respuesta ?? "");
  return (
    <GlassPanel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium">{t.asunto}</p>
          <p className="text-xs text-muted-foreground">
            {etiquetaCategoria(t.categoria)} · {fecha(t.created_at)}
            {esSoporte && (t.negocio || t.correo) ? ` · ${t.negocio ?? ""} ${t.correo ?? ""}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-glass-border px-2.5 py-0.5 text-xs">{etiquetaEstado(t.estado)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">{t.descripcion}</p>
      {!esSoporte && t.respuesta && (
        <div className="mt-3 rounded-lg border border-glass-border bg-glass/40 p-3 text-sm">
          <p className="mb-1 text-xs text-muted-foreground">Respuesta de soporte</p>
          <p className="whitespace-pre-wrap break-words">{t.respuesta}</p>
        </div>
      )}
      {esSoporte && (
        <div className="mt-3 space-y-2">
          <textarea
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            rows={3}
            placeholder="Escribe la respuesta para el cliente"
            className={campo}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={t.estado}
              onChange={(e) => void onGuardar(t.id, { estado: e.target.value })}
              className="rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base"
            >
              {ESTADOS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.etiqueta}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onGuardar(t.id, { respuesta: respuesta.trim(), estado: t.estado === "abierto" ? "en_proceso" : t.estado })}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Guardar respuesta
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

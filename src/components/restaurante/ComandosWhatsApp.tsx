import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Terminal, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";

type Autorizado = {
  id: string;
  telefono: string;
  nombre: string;
  puede_inventario: boolean;
  puede_facturar: boolean;
  puede_pedidos: boolean;
  puede_reportes: boolean;
  activo: boolean;
};

type Comando = {
  id: string;
  telefono: string;
  nombre: string;
  accion: string;
  texto_original: string;
  vista_previa: string;
  estado: string;
  resultado: string;
  created_at: string;
};

type Permiso = "puede_inventario" | "puede_facturar" | "puede_pedidos" | "puede_reportes";

const PERMISOS: Array<{ clave: Permiso; texto: string }> = [
  { clave: "puede_inventario", texto: "Crear Inventario" },
  { clave: "puede_facturar", texto: "Facturar" },
  { clave: "puede_pedidos", texto: "Montar Pedidos" },
  { clave: "puede_reportes", texto: "Consultar Reportes" },
];

const ESTILO_ESTADO: Record<string, string> = {
  ejecutado: "bg-emerald-500/15 text-emerald-600",
  consulta: "bg-sky-500/15 text-sky-600",
  pendiente: "bg-amber-500/15 text-amber-600",
  cancelado: "bg-muted text-muted-foreground",
  error: "bg-red-500/15 text-red-600",
};

const campo =
  "w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70";

/** Números autorizados para comandos remotos + historial de comandos ejecutados (tiempo real). */
export function ComandosWhatsApp() {
  const { negocio } = useNegocio();
  const { esAdmin } = usePermisos();
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);
  const [comandos, setComandos] = useState<Comando[]>([]);
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarAutorizados = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_comandos_autorizados")
      .select("id,telefono,nombre,puede_inventario,puede_facturar,puede_pedidos,puede_reportes,activo")
      .order("created_at", { ascending: true })
      .limit(50);
    setAutorizados((data ?? []) as Autorizado[]);
  }, []);

  const cargarComandos = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_comandos_ejecutados")
      .select("id,telefono,nombre,accion,texto_original,vista_previa,estado,resultado,created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    setComandos((data ?? []) as Comando[]);
  }, []);

  useEffect(() => {
    if (!negocio?.id || !esAdmin) return;
    void cargarAutorizados();
    void cargarComandos();
    const canal = supabase
      .channel(`comandos-wa-${negocio.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_comandos_ejecutados" }, () => void cargarComandos())
      .subscribe();
    const reloj = window.setInterval(() => void cargarComandos(), 20000);
    return () => {
      window.clearInterval(reloj);
      void supabase.removeChannel(canal);
    };
  }, [negocio?.id, esAdmin, cargarAutorizados, cargarComandos]);

  if (!negocio || !esAdmin) return null;

  const agregar = async () => {
    const tel = telefono.replace(/\D/g, "");
    if (tel.length < 7 || tel.length > 15) return toast.error("Escribe un número de WhatsApp válido con indicativo (ej. 573001234567).");
    setGuardando(true);
    const { error } = await supabase.from("whatsapp_comandos_autorizados").insert({
      telefono: tel,
      nombre: nombre.trim().slice(0, 80),
      puede_reportes: true,
    });
    setGuardando(false);
    if (error) return toast.error(error.code === "23505" ? "Ese número ya está registrado." : "No se pudo guardar el número.");
    setTelefono("");
    setNombre("");
    toast.success("Número autorizado. En unos segundos el agente lo reconocerá.");
    void cargarAutorizados();
  };

  const cambiar = async (a: Autorizado, cambios: Partial<Pick<Autorizado, Permiso | "activo">>) => {
    setAutorizados((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...cambios } : x)));
    const { error } = await supabase.from("whatsapp_comandos_autorizados").update(cambios).eq("id", a.id);
    if (error) {
      toast.error("No se pudo actualizar el permiso.");
      void cargarAutorizados();
    }
  };

  return (
    <GlassPanel className="space-y-5 p-5 text-foreground">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Números Autorizados para Comandos Remotos</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Registra tu WhatsApp y el de tus encargados. Desde esos números puedes escribirle al agente (texto, nota de voz o fotos) para
        subir inventario o vehículos, montar pedidos, facturar o consultar reportes. Siempre te muestra una vista previa y espera tu «SÍ»
        antes de guardar. Los demás números siguen recibiendo atención normal como clientes.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={campo} inputMode="tel" placeholder="WhatsApp con indicativo (573001234567)" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={20} />
        <input className={campo} placeholder="Nombre (dueño, encargado...)" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
        <button type="button" onClick={() => void agregar()} disabled={guardando} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> Autorizar
        </button>
      </div>

      {autorizados.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay números autorizados.</p>
      ) : (
        <ul className="space-y-3">
          {autorizados.map((a) => (
            <li key={a.id} className="rounded-xl border border-glass-border bg-card/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 break-words text-sm font-medium">
                  {a.nombre || "Sin nombre"} <span className="text-muted-foreground">· +{a.telefono}</span>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={a.activo} onChange={(e) => void cambiar(a, { activo: e.target.checked })} /> Activo
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {PERMISOS.map((p) => (
                  <label key={p.clave} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={a[p.clave]} onChange={(e) => void cambiar(a, { [p.clave]: e.target.checked } as Partial<Pick<Autorizado, Permiso | "activo">>)} /> {p.texto}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-glass-border pt-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Comandos Ejecutados</h3>
        </div>
        {comandos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Cuando un número autorizado envíe un comando, aparecerá aquí en tiempo real.</p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {comandos.map((c) => (
              <li key={c.id} className="rounded-lg border border-glass-border bg-card/60 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{c.nombre || `+${c.telefono}`} · {c.accion.replace(/_/g, " ")}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${ESTILO_ESTADO[c.estado] ?? ESTILO_ESTADO.cancelado}`}>{c.estado}</span>
                </div>
                {c.texto_original ? <p className="mt-1 break-words text-muted-foreground">«{c.texto_original.slice(0, 200)}»</p> : null}
                {c.resultado ? <p className="mt-1 whitespace-pre-line break-words">{c.resultado}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassPanel>
  );
}

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

type Miembro = Tables<"equipo_negocio">;
type Registro = Tables<"equipo_auditoria">;

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

/** Combinaciones listas de módulos; solo se marcan los que existen en el tipo de negocio. */
const ROLES_RAPIDOS: { nombre: string; modulos: string[] }[] = [
  { nombre: "Cajero", modulos: ["pedidos", "caja_diaria"] },
  { nombre: "Cocina", modulos: ["cocina"] },
  { nombre: "Mesero", modulos: ["pedidos", "mesas"] },
  { nombre: "Domiciliario", modulos: ["domicilios"] },
  { nombre: "Contador/a", modulos: ["finanzas", "facturas", "caja_diaria"] },
  { nombre: "Bodega / compras", modulos: ["insumos", "proveedores"] },
  { nombre: "Agenda y clientes", modulos: ["agenda", "clientes", "cotizaciones"] },
];

export function EquipoPermisos() {
  const { negocio } = useNegocio();
  const { esAdmin, cargando } = usePermisos();
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const modulos = tipo.modulos;

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [auditoria, setAuditoria] = useState<Registro[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("equipo_negocio").select("*").order("created_at");
    setMiembros(data ?? []);
    const { data: registros } = await supabase
      .from("equipo_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setAuditoria(registros ?? []);
  }, []);

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin, cargar]);

  const alternarNuevo = (id: string) =>
    setElegidos((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const agregar = async () => {
    const correo = email.trim().toLowerCase();
    if (!correo.includes("@")) return toast.error("Escribe un correo válido.");
    if (elegidos.length === 0) return toast.error("Marca al menos un módulo que podrá usar.");
    setGuardando(true);
    const { error } = await supabase
      .from("equipo_negocio")
      .insert({ email: correo, nombre: nombre.trim() || null, modulos: elegidos });
    setGuardando(false);
    if (error)
      return toast.error(
        error.message.toLowerCase().includes("duplicate") ? "Ese correo ya está en tu equipo." : "No se pudo guardar.",
      );
    setEmail("");
    setNombre("");
    setElegidos([]);
    toast.success("Persona autorizada. Debe crear su cuenta con ese correo para entrar.");
    cargar();
  };

  const actualizar = async (m: Miembro, cambios: Partial<Pick<Miembro, "modulos" | "activo">>) => {
    const { error } = await supabase.from("equipo_negocio").update(cambios).eq("id", m.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
    window.dispatchEvent(new Event("equipo:cambio"));
  };

  const alternarModulo = (m: Miembro, id: string) =>
    actualizar(m, { modulos: m.modulos.includes(id) ? m.modulos.filter((x) => x !== id) : [...m.modulos, id] });

  const quitar = async (m: Miembro) => {
    const { error } = await supabase.from("equipo_negocio").delete().eq("id", m.id);
    if (error) return toast.error("No se pudo quitar.");
    toast.success("Persona quitada del equipo.");
    cargar();
  };

  if (cargando) return <div className="h-24 animate-pulse rounded-xl bg-glass/30" />;

  if (!esAdmin)
    return (
      <GlassPanel className="p-6">
        <h2 className="font-display text-xl">Equipo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo el administrador puede crear cuentas y definir qué puede hacer cada persona.
        </p>
      </GlassPanel>
    );

  return (
    <div className="space-y-6">
      <GlassPanel className="space-y-4 p-6">
        <div>
          <h2 className="font-display text-xl">Agregar persona al equipo</h2>
          <p className="text-sm text-muted-foreground">
            Escribe su correo y marca lo que podrá hacer. Luego esa persona crea su cuenta con ese mismo correo en
            la pantalla de registro y entra solo a lo que le permitiste.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input className={campo} placeholder="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input
            className={campo}
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Rol rápido (luego puedes ajustar los módulos):</p>
          <div className="flex flex-wrap gap-2">
            {ROLES_RAPIDOS.map((r) => (
              <button
                key={r.nombre}
                type="button"
                onClick={() => setElegidos(r.modulos.filter((id) => modulos.some((m) => m.id === id)))}
                className="rounded-full border border-glass-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {r.nombre}
              </button>
            ))}
          </div>
          <p className="pt-1 text-xs text-muted-foreground">Puede usar:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {modulos.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm">
                <input type="checkbox" checked={elegidos.includes(m.id)} onChange={() => alternarNuevo(m.id)} />
                <span className="min-w-0 truncate">{m.titulo}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={agregar}
          disabled={guardando}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <UserPlus className="h-4 w-4" /> {guardando ? "Guardando…" : "Autorizar persona"}
        </button>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-6">
        <h2 className="font-display text-xl">Tu equipo ({miembros.length})</h2>
        {miembros.length === 0 && <p className="text-sm text-muted-foreground">Aún no has agregado a nadie.</p>}
        {miembros.map((m) => (
          <div key={m.id} className="space-y-3 rounded-xl border border-glass-border bg-glass/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.nombre || m.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.nombre ? `${m.email} · ` : ""}
                  {m.user_id ? "Cuenta creada" : "Aún no crea su cuenta"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => actualizar(m, { activo: !m.activo })}
                  className="rounded-full border border-glass-border px-3 py-1.5 text-xs"
                >
                  {m.activo ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => quitar(m)}
                  title="Quitar"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-glass-strong hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {modulos.map((mod) => (
                <label key={mod.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={m.modulos.includes(mod.id)} onChange={() => alternarModulo(m, mod.id)} />
                  <span className="min-w-0 truncate">{mod.titulo}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </GlassPanel>

      <GlassPanel className="space-y-3 p-6">
        <h2 className="font-display text-xl">Historial de cambios</h2>
        {auditoria.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay cambios registrados.</p>}
        <ul className="space-y-2">
          {auditoria.map((a) => (
            <li key={a.id} className="rounded-lg border border-glass-border px-3 py-2 text-sm">
              <p className="break-words">
                <span className="font-medium">{a.actor_email || "Alguien"}</span> {a.accion}{" "}
                <span className="font-medium">{a.miembro_email}</span>
              </p>
              {a.detalle && <p className="break-words text-xs text-muted-foreground">{a.detalle}</p>}
              <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-MX")}</p>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}

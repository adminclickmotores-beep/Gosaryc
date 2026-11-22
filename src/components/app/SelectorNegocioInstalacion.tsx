import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Layers, Lock, Search, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { TIPOS_NEGOCIO, resolverTipoNegocio } from "@/lib/modulos-negocio";
import { BRAND } from "@/lib/brand";
import { PERFIL_MULTI, guardarPerfilEquipo, leerPerfilEquipo } from "@/lib/perfil-equipo";

/** Pantalla de primer arranque: elegir el negocio que se opera en este equipo. */
export function SelectorNegocioInstalacion({ onElegido, cancelar }: { onElegido?: (perfil: string) => void; cancelar?: () => void }) {
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return TIPOS_NEGOCIO.filter((x) => !t || x.etiqueta.toLowerCase().includes(t) || x.clave.includes(t));
  }, [q]);

  const elegir = async (perfil: string) => {
    await guardarPerfilEquipo(perfil);
    onElegido?.(perfil);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background p-4 sm:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl sm:text-3xl">¿Qué negocio vas a operar en este equipo?</h1>
          <p className="text-sm text-muted-foreground">
            {BRAND.name} cargará solo las pantallas de ese negocio para que abra al instante. Puedes cambiarlo después en Configuración.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass/40 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar negocio: concesionario, restaurante, ferretería…"
            className="w-full bg-transparent text-base outline-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => void elegir(PERFIL_MULTI)}
            className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-left transition hover:bg-primary/20"
          >
            <Layers className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Multi-negocio</span>
              <span className="block text-xs text-muted-foreground">Administro varios negocios desde este equipo</span>
            </span>
          </button>
          {lista.map((t) => (
            <button
              key={t.clave}
              type="button"
              onClick={() => void elegir(t.clave)}
              className="flex items-center gap-3 rounded-xl border border-glass-border bg-glass/30 p-4 text-left transition hover:border-primary/50 hover:bg-glass/60"
            >
              <Store className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{t.etiqueta}</span>
                <span className="block text-xs text-muted-foreground">{t.modulos.length} módulos</span>
              </span>
            </button>
          ))}
        </div>
        {lista.length === 0 && <p className="text-center text-sm text-muted-foreground">Sin resultados</p>}
        {cancelar && (
          <div className="text-center">
            <button type="button" onClick={cancelar} className="text-sm text-muted-foreground underline">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Configuración → Sistema: cambiar el negocio del equipo con la contraseña del administrador. */
export function CambiarNegocioEquipo() {
  const { user } = useAuth();
  const [actual, setActual] = useState<string | null>(null);
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);

  useEffect(() => {
    void leerPerfilEquipo().then(setActual);
  }, []);

  const etiqueta = !actual ? "Sin fijar (se usa el negocio de tu cuenta)" : actual === PERFIL_MULTI ? "Multi-negocio" : resolverTipoNegocio(actual).etiqueta;

  const verificar = async () => {
    if (!user?.email || !clave) return;
    setVerificando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: clave });
    setVerificando(false);
    if (error) {
      toast.error("Contraseña incorrecta");
      return;
    }
    setClave("");
    setEligiendo(true);
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-display text-lg">
        <Lock className="h-4 w-4 text-primary" /> Negocio de este equipo
      </h2>
      <p className="text-sm text-muted-foreground">
        Negocio actual: <span className="font-medium text-foreground">{etiqueta}</span>. Para cambiarlo escribe la contraseña del administrador.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type={ver ? "text" : "password"}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void verificar()}
            placeholder="Contraseña de administrador"
            className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2 pr-10 text-base outline-none"
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          disabled={verificando || !clave}
          onClick={() => void verificar()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Cambiar negocio
        </button>
      </div>
      {eligiendo && (
        <SelectorNegocioInstalacion
          cancelar={() => setEligiendo(false)}
          onElegido={(p) => {
            setActual(p);
            setEligiendo(false);
            toast.success("Negocio del equipo actualizado");
          }}
        />
      )}
    </GlassPanel>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Fila = {
  owner_id: string | null;
  nombre: string;
  nit: string | null;
  dian_activa: boolean;
};

type Cfg = {
  owner_id: string;
  activa: boolean;
  proveedor_url: string;
  token_api: string;
  prefijo: string;
  resolucion: string;
  rango_desde: string;
  rango_hasta: string;
  ambiente: string;
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const VACIA: Cfg = {
  owner_id: "",
  activa: false,
  proveedor_url: "",
  token_api: "",
  prefijo: "",
  resolucion: "",
  rango_desde: "",
  rango_hasta: "",
  ambiente: "Pruebas",
};

/**
 * Habilitación DIAN por negocio (solo Superadmin).
 * Se usa en /superadmin (web) y en /licencias (web, escritorio y APK admin).
 */
export function DianAdmin() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [mapa, setMapa] = useState<Record<string, Cfg>>({});
  const [busca, setBusca] = useState("");
  const [elegido, setElegido] = useState("");
  const [form, setForm] = useState<Cfg>(VACIA);
  const [verToken, setVerToken] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("negocio_config").select("owner_id,nombre,nit,dian_activa").order("created_at", { ascending: false }).limit(200),
      supabase.from("negocio_dian_config").select("*"),
    ]);
    if (a.data) setFilas(a.data as Fila[]);
    const m: Record<string, Cfg> = {};
    for (const c of (b.data ?? []) as {
      owner_id: string; activa: boolean; proveedor_url: string | null; token_api: string | null;
      prefijo: string | null; resolucion: string | null; rango_desde: number | null; rango_hasta: number | null; ambiente: string;
    }[]) {
      m[c.owner_id] = {
        owner_id: c.owner_id,
        activa: c.activa,
        proveedor_url: c.proveedor_url ?? "",
        token_api: c.token_api ?? "",
        prefijo: c.prefijo ?? "",
        resolucion: c.resolucion ?? "",
        rango_desde: c.rango_desde != null ? String(c.rango_desde) : "",
        rango_hasta: c.rango_hasta != null ? String(c.rango_hasta) : "",
        ambiente: c.ambiente ?? "Pruebas",
      };
    }
    setMapa(m);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const elegir = (ownerId: string) => {
    setElegido(ownerId);
    setVerToken(false);
    setForm(mapa[ownerId] ?? { ...VACIA, owner_id: ownerId });
  };

  const guardar = async () => {
    if (!elegido) return toast.error("Elige primero el negocio.");
    if (form.activa && (!form.proveedor_url.trim() || !form.token_api.trim())) {
      return toast.error("Para activar, escribe la URL del proveedor y el Token API.");
    }
    setGuardando(true);
    const { error } = await supabase.from("negocio_dian_config").upsert(
      {
        owner_id: elegido,
        activa: form.activa,
        proveedor_url: form.proveedor_url.trim() || null,
        token_api: form.token_api.trim() || null,
        prefijo: form.prefijo.trim() || null,
        resolucion: form.resolucion.trim() || null,
        rango_desde: form.rango_desde ? Math.max(Math.floor(Number(form.rango_desde)) || 0, 0) || null : null,
        rango_hasta: form.rango_hasta ? Math.max(Math.floor(Number(form.rango_hasta)) || 0, 0) || null : null,
        ambiente: form.ambiente === "Producción" ? "Producción" : "Pruebas",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" },
    );
    setGuardando(false);
    if (error) return toast.error(error.message || "No se pudo guardar la configuración DIAN.");
    toast.success(form.activa ? "DIAN activada para este negocio." : "Configuración DIAN guardada (desactivada).");
    cargar();
  };

  const q = busca.trim().toLowerCase();
  const visibles = filas.filter((f) => !q || f.nombre.toLowerCase().includes(q));

  return (
    <GlassPanel className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-medium text-foreground">
        <FileCheck className="h-4 w-4 text-primary" /> Habilitación DIAN por negocio
      </h2>
      <p className="text-xs text-muted-foreground">
        Solo tú ves esta sección. Activa el interruptor y configura el proveedor tecnológico de cada cliente que contrate la facturación electrónica.
      </p>
      <input className={campo} placeholder="Buscar negocio por nombre" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Negocio</span>
        <select className={campo} value={elegido} onChange={(e) => elegir(e.target.value)}>
          <option value="">Elige el negocio…</option>
          {visibles.map((f) => (
            <option key={f.owner_id ?? f.nombre} value={f.owner_id ?? ""}>
              {f.nombre}{f.dian_activa ? " · DIAN activa" : ""}
            </option>
          ))}
        </select>
      </label>
      {elegido && (
        <div className="space-y-3 rounded-lg border border-glass-border bg-glass/30 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">DIAN activa para este cliente</span>
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => setForm({ ...form, activa: e.target.checked })}
              className="h-5 w-5 accent-primary"
              aria-label="DIAN activa"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">URL del proveedor tecnológico</span>
            <input className={campo} inputMode="url" placeholder="https://api.proveedor.com/factura" value={form.proveedor_url} onChange={(e) => setForm({ ...form, proveedor_url: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Token API</span>
            <div className="flex gap-2">
              <input
                className={campo}
                type={verToken ? "text" : "password"}
                autoComplete="off"
                placeholder="Token del proveedor"
                value={form.token_api}
                onChange={(e) => setForm({ ...form, token_api: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setVerToken(!verToken)}
                aria-label={verToken ? "Ocultar token" : "Mostrar token"}
                className="shrink-0 rounded-lg border border-glass-border px-3 py-2.5 text-foreground"
              >
                {verToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Prefijo</span>
              <input className={campo} placeholder="Ej: SETT" value={form.prefijo} onChange={(e) => setForm({ ...form, prefijo: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Resolución</span>
              <input className={campo} placeholder="Ej: 18760000001" value={form.resolucion} onChange={(e) => setForm({ ...form, resolucion: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Rango inicial</span>
              <input className={campo} inputMode="numeric" value={form.rango_desde} onChange={(e) => setForm({ ...form, rango_desde: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Rango final</span>
              <input className={campo} inputMode="numeric" value={form.rango_hasta} onChange={(e) => setForm({ ...form, rango_hasta: e.target.value })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Ambiente</span>
            <select className={campo} value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value })}>
              <option value="Pruebas">Pruebas</option>
              <option value="Producción">Producción</option>
            </select>
          </label>
          <button
            onClick={() => void guardar()}
            disabled={guardando}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar configuración DIAN"}
          </button>
        </div>
      )}
    </GlassPanel>
  );
}

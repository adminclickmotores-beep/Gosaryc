import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ListChecks, Loader2, Radar, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Cargando, Encabezado, boton, botonSec, campo } from "@/components/comercio/ComercioModulos";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { limpiarTexto } from "@/lib/validacion-publica";
import { secopChecklistIA, type ItemChecklistSecop } from "@/lib/secop-checklist.functions";
import {
  PALABRAS_POR_SECTOR,
  rastrearLicitaciones,
  type OportunidadSecop,
  type PerfilSecop,
} from "@/lib/secop-rastrear";

const ESTADOS = ["Nueva", "En estudio", "Propuesta enviada", "Adjudicada", "Descartada"] as const;
const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const lista = (s: string): string[] => s.split(",").map((x) => limpiarTexto(x, 80)).filter(Boolean);

function leerChecklist(j: Json | null): ItemChecklistSecop[] {
  if (!Array.isArray(j)) return [];
  const salida: ItemChecklistSecop[] = [];
  for (const x of j) {
    if (x && typeof x === "object" && !Array.isArray(x)) {
      const o = x as { documento?: unknown; detalle?: unknown };
      if (typeof o.documento === "string") salida.push({ documento: o.documento, detalle: typeof o.detalle === "string" ? o.detalle : "" });
    }
  }
  return salida;
}

export function SecopRadar() {
  const { negocio } = useNegocio();
  const [perfil, setPerfil] = useState<PerfilSecop | null>(null);
  const [ops, setOps] = useState<OportunidadSecop[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [claves, setClaves] = useState("");
  const [codigos, setCodigos] = useState("");
  const [deptos, setDeptos] = useState("");
  const [minimo, setMinimo] = useState("0");
  const [avisar, setAvisar] = useState(true);
  const [filtro, setFiltro] = useState<string>("Todas");
  const [generando, setGenerando] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const auto = useRef(false);

  const aplicarPerfil = (p: PerfilSecop) => {
    setPerfil(p);
    setClaves(p.palabras_clave.join(", "));
    setCodigos(p.codigos_unspsc.join(", "));
    setDeptos(p.departamentos.join(", "));
    setMinimo(String(p.cuantia_minima));
    setAvisar(p.notificar_whatsapp);
  };

  const cargarOps = useCallback(async () => {
    const { data } = await supabase
      .from("secop_oportunidades")
      .select("*")
      .order("fecha_cierre", { ascending: true, nullsFirst: false })
      .limit(200);
    setOps(data ?? []);
  }, []);

  const iniciar = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase.from("secop_perfiles").select("*").limit(1);
    if (data && data[0]) {
      aplicarPerfil(data[0]);
    } else {
      const clave = resolverTipoNegocio(negocio.tipo_negocio).clave;
      const { data: nuevo, error } = await supabase
        .from("secop_perfiles")
        .insert({
          owner_id: negocio.owner_id ?? undefined,
          palabras_clave: PALABRAS_POR_SECTOR[clave] ?? [],
          departamentos: ["Valle del Cauca"],
        })
        .select("*")
        .single();
      if (error || !nuevo) toast.error("No se pudo crear tu perfil de búsqueda.");
      else aplicarPerfil(nuevo);
    }
    await cargarOps();
    setCargando(false);
  }, [negocio, cargarOps]);

  useEffect(() => {
    void iniciar();
  }, [iniciar]);

  const buscar = useCallback(
    async (p: PerfilSecop, silencioso: boolean) => {
      if (!negocio) return;
      setBuscando(true);
      try {
        const r = await rastrearLicitaciones({
          perfil: p,
          negocioId: negocio.id,
          ownerId: negocio.owner_id ?? "",
          telefonoAdmin: negocio.telefono_pedidos ?? null,
        });
        if (r.error) toast.error(r.error);
        else if (!silencioso || r.nuevas > 0)
          toast.success(r.nuevas > 0 ? `${r.nuevas} licitación(es) nueva(s) encontrada(s)` : `Sin licitaciones nuevas (${r.revisadas} revisadas)`);
        await cargarOps();
        const { data } = await supabase.from("secop_perfiles").select("*").limit(1);
        if (data && data[0]) setPerfil(data[0]);
      } catch {
        toast.error("No se pudo consultar SECOP II. Intenta de nuevo en un momento.");
      } finally {
        setBuscando(false);
      }
    },
    [negocio, cargarOps],
  );

  // Consulta automática diaria: al abrir el radar si pasaron más de 24 horas desde la última búsqueda.
  useEffect(() => {
    if (!perfil || auto.current || !perfil.activo) return;
    const ult = perfil.ultima_consulta ? new Date(perfil.ultima_consulta).getTime() : 0;
    if (Date.now() - ult > 24 * 3600 * 1000) {
      auto.current = true;
      void buscar(perfil, true);
    }
  }, [perfil, buscar]);

  const guardarPerfil = async () => {
    if (!perfil) return;
    const cambios = {
      palabras_clave: lista(claves),
      codigos_unspsc: lista(codigos),
      departamentos: lista(deptos),
      cuantia_minima: Math.max(0, Number(minimo) || 0),
      notificar_whatsapp: avisar,
    };
    const { data, error } = await supabase.from("secop_perfiles").update(cambios).eq("id", perfil.id).select("*").single();
    if (error || !data) return toast.error("No se pudo guardar el perfil.");
    aplicarPerfil(data);
    toast.success("Perfil de búsqueda guardado");
  };

  const cambiarEstado = async (o: OportunidadSecop, estado: string) => {
    const { error } = await supabase.from("secop_oportunidades").update({ estado_interno: estado }).eq("id", o.id);
    if (error) return toast.error("No se pudo cambiar el estado.");
    setOps((x) => x.map((y) => (y.id === o.id ? { ...y, estado_interno: estado } : y)));
  };

  const generarChecklist = async (o: OportunidadSecop) => {
    setGenerando(o.id);
    try {
      const r = await secopChecklistIA({
        data: {
          entidad: o.entidad ?? "",
          objeto: o.objeto ?? "",
          modalidad: o.modalidad ?? "",
          cuantia: o.cuantia,
          cierre: o.fecha_cierre ?? "",
          // nota: campos opcionales normalizados a string
        },
      });
      const { error } = await supabase
        .from("secop_oportunidades")
        .update({ checklist_ia: r.items as unknown as Json })
        .eq("id", o.id);
      if (error) throw new Error("guardar");
      setOps((x) => x.map((y) => (y.id === o.id ? { ...y, checklist_ia: r.items as unknown as Json } : y)));
      setAbierta(o.id);
      toast.success("Checklist generado");
    } catch (e) {
      toast.error(e instanceof Error && e.message !== "guardar" ? e.message : "No se pudo generar el checklist.");
    } finally {
      setGenerando(null);
    }
  };

  if (cargando) return <Cargando />;
  const visibles = ops.filter((o) => (filtro === "Todas" ? o.estado_interno !== "Descartada" : o.estado_interno === filtro));

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Radar de Licitaciones SECOP II"
        texto="Encuentra procesos de contratación del Estado que encajan con tu negocio y recibe el aviso por WhatsApp."
      />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Palabras clave (separadas por coma)
            <textarea className={`${campo} mt-1`} rows={3} value={claves} onChange={(e) => setClaves(e.target.value)} />
          </label>
          <div className="space-y-3">
            <label className="block text-sm">
              Departamentos
              <input className={`${campo} mt-1`} value={deptos} onChange={(e) => setDeptos(e.target.value)} placeholder="Valle del Cauca" />
            </label>
            <label className="block text-sm">
              Códigos UNSPSC (opcional)
              <input className={`${campo} mt-1`} value={codigos} onChange={(e) => setCodigos(e.target.value)} placeholder="80101500, 85101700" />
            </label>
          </div>
          <label className="text-sm">
            Cuantía mínima (COP)
            <input className={`${campo} mt-1`} inputMode="numeric" value={minimo} onChange={(e) => setMinimo(e.target.value.replace(/[^\d]/g, ""))} />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} className="h-4 w-4" />
            Avisarme por WhatsApp cuando haya una licitación nueva
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSec} onClick={() => void guardarPerfil()}>
            Guardar perfil
          </button>
          <button type="button" className={boton} disabled={buscando || !perfil} onClick={() => perfil && void buscar(perfil, false)}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar Licitaciones Ahora
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Última consulta: {perfil?.ultima_consulta ? new Date(perfil.ultima_consulta).toLocaleString("es-CO") : "aún no se ha consultado"}. El radar
          vuelve a buscar solo, una vez al día, cuando abres este módulo. Guarda el perfil antes de buscar si cambiaste algo.
        </p>
      </GlassPanel>

      <div className="flex flex-wrap gap-2">
        {["Todas", ...ESTADOS].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setFiltro(e)}
            className={`rounded-full border px-3 py-1 text-xs ${filtro === e ? "border-primary bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"}`}
          >
            {e}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
          <Radar className="mx-auto mb-2 h-7 w-7 text-primary" />
          Todavía no hay oportunidades. Pulsa «Buscar Licitaciones Ahora».
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {visibles.map((o) => {
            const items = leerChecklist(o.checklist_ia);
            return (
              <GlassPanel key={o.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-foreground">{o.entidad}</p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{(o.objeto ?? "").slice(0, 300)}</p>
                  </div>
                  <select className="rounded-lg border border-glass-border bg-glass/40 px-2 py-2 text-base" value={o.estado_interno} onChange={(e) => void cambiarEstado(o, e.target.value)}>
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{cop(o.cuantia)}</span>
                  <span>{o.modalidad}</span>
                  <span>{o.departamento}</span>
                  <span>Cierre: {o.fecha_cierre ? new Date(o.fecha_cierre).toLocaleDateString("es-CO") : "por confirmar"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {o.url_proceso && (
                    <a href={o.url_proceso} target="_blank" rel="noopener noreferrer" className={botonSec}>
                      <ExternalLink className="h-4 w-4" /> Ver en SECOP II
                    </a>
                  )}
                  <button type="button" className={botonSec} disabled={generando === o.id} onClick={() => void generarChecklist(o)}>
                    {generando === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                    Checklist de Requisitos IA
                  </button>
                  {items.length > 0 && (
                    <button type="button" className={botonSec} onClick={() => setAbierta(abierta === o.id ? null : o.id)}>
                      {abierta === o.id ? "Ocultar checklist" : `Ver checklist (${items.length})`}
                    </button>
                  )}
                </div>
                {abierta === o.id && items.length > 0 && (
                  <ul className="space-y-1.5 rounded-lg border border-glass-border bg-glass/20 p-3 text-sm">
                    {items.map((i, n) => (
                      <li key={n}>
                        <span className="font-medium">{i.documento}</span>
                        {i.detalle && <span className="text-muted-foreground"> — {i.detalle}</span>}
                      </li>
                    ))}
                    <li className="pt-1 text-xs text-muted-foreground">Confirma siempre contra los pliegos oficiales del proceso.</li>
                  </ul>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Interruptor en Configuración para mostrar u ocultar el Radar SECOP II en el menú. */
export function SecopInterruptor() {
  const { negocio } = useNegocio();
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    setActivo(negocio?.secop_activo === true);
  }, [negocio?.secop_activo]);
  if (!negocio) return null;
  const alternar = (valor: boolean) => {
    setActivo(valor);
    void supabase
      .from("negocio_config")
      .update({ secop_activo: valor })
      .eq("id", negocio.id)
      .select("id")
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setActivo(!valor);
          toast.error("No se pudo guardar el cambio.");
          return;
        }
        window.dispatchEvent(new Event("crm:cambio"));
        toast.success(valor ? "Radar de Licitaciones visible en el menú" : "Radar de Licitaciones oculto del menú");
      });
  };
  return (
    <GlassPanel className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-medium text-foreground">Radar de Licitaciones SECOP II</p>
        <p className="text-sm text-muted-foreground">Muestra en el menú el módulo para contratar con el Estado.</p>
      </div>
      <input type="checkbox" className="h-5 w-5" checked={activo} onChange={(e) => alternar(e.target.checked)} aria-label="Mostrar Radar de Licitaciones" />
    </GlassPanel>
  );
}

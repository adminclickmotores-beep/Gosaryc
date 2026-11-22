/**
 * Rastreo de licitaciones en Datos Abiertos Colombia (SECOP II - Procesos de Contratación).
 * API pública SODA (sin llave). Se ejecuta desde el navegador del negocio.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const SECOP_API = "https://www.datos.gov.co/resource/p6dx-8zbt.json";

/** Palabras clave inteligentes precargadas según el tipo de negocio. */
export const PALABRAS_POR_SECTOR: Record<string, string[]> = {
  salud: ["salud ocupacional", "SG-SST", "examenes medicos ocupacionales", "capacitacion seguridad y salud en el trabajo"],
  construccion: ["obra civil", "construccion", "mantenimiento de infraestructura", "interventoria"],
  inmobiliaria: ["arrendamiento de inmueble", "avaluo", "administracion de bienes"],
  ferreteria: ["suministro de materiales", "ferreteria", "elementos de construccion", "herramientas"],
  distribuidora: ["suministro", "distribucion de productos", "abastecimiento"],
  farmacia: ["medicamentos", "dispositivos medicos", "insumos hospitalarios"],
  alquiler_vehiculos: ["alquiler de vehiculos", "arrendamiento de vehiculos", "servicio de transporte"],
  transporte: ["servicio de transporte", "transporte de carga", "transporte de pasajeros"],
  seguridad_aseo: ["vigilancia y seguridad privada", "aseo y cafeteria", "servicios generales"],
  tecnologia: ["software", "soporte tecnico", "equipos de computo", "licencias"],
  profesional: ["prestacion de servicios profesionales", "asesoria", "consultoria"],
  taller: ["mantenimiento de vehiculos", "repuestos", "mantenimiento preventivo y correctivo"],
  taller_motos: ["mantenimiento de motocicletas", "repuestos motocicletas"],
  eventos: ["logistica de eventos", "apoyo logistico", "alimentacion y catering"],
  educacion: ["capacitacion", "formacion", "servicios educativos"],
  agro: ["insumos agricolas", "asistencia tecnica agropecuaria", "proyecto productivo"],
  ganaderia: ["ganado", "insumos pecuarios", "asistencia tecnica pecuaria"],
  fundacion: ["operador", "convenio de asociacion", "programa social"],
  mascotas: ["servicios veterinarios", "medicina veterinaria", "control animal"],
};

export type PerfilSecop = Tables<"secop_perfiles">;
export type OportunidadSecop = Tables<"secop_oportunidades">;

type FilaApi = Record<string, unknown> & { urlproceso?: { url?: string } | string };

const txt = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const fecha = (v: unknown): string | null => {
  const s = txt(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const comilla = (s: string): string => s.replace(/'/g, "''").replace(/[%_]/g, "");

async function pedir(params: Record<string, string>): Promise<FilaApi[]> {
  const url = `${SECOP_API}?${new URLSearchParams(params).toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`SECOP ${r.status}`);
  const j: unknown = await r.json();
  return Array.isArray(j) ? (j as FilaApi[]) : [];
}

async function consultar(perfil: PerfilSecop): Promise<FilaApi[]> {
  const desde = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 19);
  const deptos = perfil.departamentos.map((d) => `'${comilla(d).toUpperCase()}'`).join(",");
  const base: Record<string, string> = { $order: "fecha_de_publicacion_del DESC", $limit: "40" };
  const where = [`fecha_de_publicacion_del > '${desde}'`];
  const conDepto = deptos ? [...where, `upper(departamento_entidad) in(${deptos})`] : where;

  const consultas: Array<Record<string, string>> = [];
  for (const k of perfil.palabras_clave.slice(0, 12)) {
    consultas.push({ ...base, $q: k, $where: conDepto.join(" AND ") });
  }
  for (const c of perfil.codigos_unspsc.slice(0, 8)) {
    const limpio = c.replace(/\D/g, "");
    if (limpio.length >= 6) {
      consultas.push({ ...base, $where: [...conDepto, `codigo_principal_de_categoria like '%${limpio}%'`].join(" AND ") });
    }
  }
  const salida: FilaApi[] = [];
  for (const q of consultas) {
    try {
      salida.push(...(await pedir(q)));
    } catch {
      // Si un filtro no es aceptado, se reintenta solo con la búsqueda por palabra.
      try {
        salida.push(...(await pedir({ ...base, ...(q.$q ? { $q: q.$q } : {}) })));
      } catch {
        /* se omite esa consulta */
      }
    }
  }
  return salida;
}

export type ResultadoRastreo = { nuevas: number; revisadas: number; error?: string };

export async function rastrearLicitaciones(opts: {
  perfil: PerfilSecop;
  negocioId: string;
  ownerId: string;
  telefonoAdmin: string | null;
}): Promise<ResultadoRastreo> {
  const { perfil, negocioId, ownerId, telefonoAdmin } = opts;
  if (perfil.palabras_clave.length === 0 && perfil.codigos_unspsc.length === 0) {
    return { nuevas: 0, revisadas: 0, error: "Agrega al menos una palabra clave o un código UNSPSC." };
  }
  const filas = await consultar(perfil);
  const ahora = Date.now();
  const unicas = new Map<string, FilaApi>();
  for (const f of filas) {
    const id = txt(f.id_del_proceso) || txt(f.referencia_del_proceso);
    if (!id || unicas.has(id)) continue;
    const cuantia = Number(txt(f.precio_base)) || 0;
    if (cuantia < perfil.cuantia_minima) continue;
    const cierre = fecha(f.fecha_de_recepcion_de) ?? fecha(f.fecha_de_apertura_efectiva);
    if (cierre && new Date(cierre).getTime() < ahora) continue;
    unicas.set(id, f);
  }
  const ids = [...unicas.keys()];
  let existentes = new Set<string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("secop_oportunidades").select("proceso_id").in("proceso_id", ids);
    existentes = new Set((data ?? []).map((x) => x.proceso_id));
  }
  let nuevas = 0;
  for (const [id, f] of unicas) {
    if (existentes.has(id)) continue;
    const cuantia = Number(txt(f.precio_base)) || 0;
    const urlRaw = typeof f.urlproceso === "string" ? f.urlproceso : txt(f.urlproceso?.url);
    const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : null;
    const entidad = txt(f.entidad).slice(0, 300);
    const objeto = (txt(f.descripci_n_del_procedimiento) || txt(f.nombre_del_procedimiento)).slice(0, 3000);
    const cierre = fecha(f.fecha_de_recepcion_de) ?? fecha(f.fecha_de_apertura_efectiva);
    const { error } = await supabase.from("secop_oportunidades").insert({
      owner_id: ownerId,
      proceso_id: id.slice(0, 80),
      referencia: txt(f.referencia_del_proceso).slice(0, 200) || null,
      entidad,
      objeto,
      modalidad: txt(f.modalidad_de_contratacion).slice(0, 200) || null,
      cuantia,
      departamento: txt(f.departamento_entidad).slice(0, 120) || null,
      fecha_publicacion: fecha(f.fecha_de_publicacion_del),
      fecha_cierre: cierre,
      url_proceso: url,
    });
    if (error) continue;
    nuevas += 1;

    // Tarjeta caliente en el CRM (si falla, la oportunidad igual queda guardada).
    await supabase.from("crm_leads").insert({
      negocio_id: negocioId,
      owner_id: ownerId,
      nombre: entidad.slice(0, 80) || "Entidad pública",
      telefono: "",
      interes: objeto.slice(0, 300),
      valor_estimado: cuantia,
      canal_origen: "SECOP II",
      temperatura: "Caliente",
      datos_extra: { url_proceso: url, fecha_cierre: cierre, proceso_id: id, origen: "SECOP II" },
      atendido_por_humano: true,
    });

    if (perfil.notificar_whatsapp && telefonoAdmin) {
      const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cuantia);
      const cierreTxt = cierre ? new Date(cierre).toLocaleDateString("es-CO") : "por confirmar";
      await supabase.from("whatsapp_outbox").insert({
        business_id: negocioId,
        telefono: telefonoAdmin,
        mensaje: `Nueva licitación SECOP II\nEntidad: ${entidad}\nObjeto: ${objeto.slice(0, 250)}\nCuantía: ${cop}\nCierre: ${cierreTxt}\n${url ?? ""}`.trim(),
      });
    }
  }
  await supabase.from("secop_perfiles").update({ ultima_consulta: new Date().toISOString() }).eq("id", perfil.id);
  return { nuevas, revisadas: unicas.size };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Landmark, Paperclip, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { escaparHtml, urlSegura } from "@/lib/exportes";

type Solicitud = Tables<"solicitudes_credito">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const ESTADOS = [
  { clave: "borrador", texto: "Borrador" },
  { clave: "enviado", texto: "Enviado a estudio" },
  { clave: "aprobado", texto: "Aprobado" },
  { clave: "rechazado", texto: "Rechazado" },
  { clave: "desembolsado", texto: "Desembolsado" },
];
const TIPOS_DOC = ["Cédula", "Desprendibles de pago", "Certificado laboral", "Extractos bancarios", "Declaración de renta", "Cámara de comercio", "Otro"];

type Form = Record<string, string>;

const VACIO: Form = {
  estado: "borrador", entidad: "", nombre_completo: "", tipo_documento: "CC", numero_documento: "",
  fecha_nacimiento: "", lugar_expedicion: "", estado_civil: "", personas_a_cargo: "", telefono: "", email: "",
  direccion: "", ciudad: "", tipo_vivienda: "", ocupacion: "", tipo_vinculacion: "", empresa: "", cargo: "",
  antiguedad: "", telefono_empresa: "", ingresos_mensuales: "", otros_ingresos: "", egresos_mensuales: "",
  patrimonio: "", ref1_nombre: "", ref1_telefono: "", ref1_parentesco: "", ref2_nombre: "", ref2_telefono: "",
  ref2_parentesco: "", vehiculo: "", valor_vehiculo: "", cuota_inicial: "", monto_solicitado: "",
  plazo_meses: "", observaciones: "",
};

const NUMERICOS = [
  "personas_a_cargo", "ingresos_mensuales", "otros_ingresos", "egresos_mensuales", "patrimonio",
  "valor_vehiculo", "cuota_inicial", "monto_solicitado", "plazo_meses",
];
const ENTEROS = ["personas_a_cargo", "plazo_meses"];

const esc = escaparHtml;

const sep = "||";

export function SolicitudesCredito() {
  const { negocio } = useNegocio();
  const [lista, setLista] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [docs, setDocs] = useState<string[]>([]);
  const [tipoDoc, setTipoDoc] = useState(TIPOS_DOC[0]);
  const [editando, setEditando] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("solicitudes_credito")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error("No se pudieron cargar las solicitudes.");
    setLista(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const inp = (k: string, placeholder: string, extra?: { type?: string; inputMode?: "numeric" | "decimal" | "tel" | "email" }) => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{placeholder}</span>
      <input
        className={campo}
        type={extra?.type ?? "text"}
        inputMode={extra?.inputMode}
        value={form[k] ?? ""}
        onChange={(e) => set(k, e.target.value)}
      />
    </label>
  );

  const limpiar = () => {
    setForm(VACIO);
    setDocs([]);
    setEditando(null);
  };

  const abrirDoc = async (item: string) => {
    const ruta = item.split(sep)[1];
    const { data, error } = await supabase.storage.from("creditos_docs").createSignedUrl(ruta, 300);
    if (error || !data) return toast.error("No se pudo abrir el documento.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const subirDocs = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    const { data: negocioId, error: errId } = await supabase.rpc("mi_negocio_id");
    if (errId || !negocioId) {
      setSubiendo(false);
      return toast.error("No se pudo identificar tu negocio.");
    }
    const nuevos: string[] = [];
    for (const archivo of Array.from(archivos)) {
      const valido = archivo.type.startsWith("image/") || archivo.type === "application/pdf";
      if (!valido) { toast.error("Sube solo imágenes o PDF."); continue; }
      if (archivo.size > 8 * 1024 * 1024) { toast.error(`${archivo.name} pesa más de 8 MB.`); continue; }
      const ext = (archivo.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const ruta = `${negocioId}/credito-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("creditos_docs").upload(ruta, archivo);
      if (error) { toast.error(`No se pudo subir ${archivo.name}.`); continue; }
      nuevos.push(`${tipoDoc}${sep}${ruta}`);
    }
    setDocs((d) => [...d, ...nuevos]);
    setSubiendo(false);
  };

  const quitarDoc = async (item: string) => {
    await supabase.storage.from("creditos_docs").remove([item.split(sep)[1]]);
    setDocs((d) => d.filter((x) => x !== item));
  };

  const guardar = async () => {
    if (!form.nombre_completo.trim()) return toast.error("Escribe el nombre completo del solicitante.");
    const datos: Record<string, string | number | string[] | null> = { documentos: docs };
    for (const k of Object.keys(VACIO)) {
      const v = (form[k] ?? "").trim();
      if (NUMERICOS.includes(k)) {
        if (!v) { datos[k] = null; continue; }
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return toast.error("Revisa los valores numéricos.");
        datos[k] = ENTEROS.includes(k) ? Math.round(n) : n;
      } else if (k === "estado" || k === "tipo_documento" || k === "nombre_completo") {
        datos[k] = v;
      } else {
        datos[k] = v || null;
      }
    }
    setGuardando(true);
    const fila = { ...datos, nombre_completo: form.nombre_completo.trim() } as unknown as TablesInsert<"solicitudes_credito">;
    const { error } = editando
      ? await supabase.from("solicitudes_credito").update(fila).eq("id", editando)
      : await supabase.from("solicitudes_credito").insert(fila);
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar la solicitud.");
    toast.success(editando ? "Solicitud actualizada." : "Solicitud guardada.");
    limpiar();
    cargar();
  };

  const editar = (s: Solicitud) => {
    const f: Form = { ...VACIO };
    for (const k of Object.keys(VACIO)) {
      const v = (s as unknown as Record<string, unknown>)[k];
      f[k] = v === null || v === undefined ? "" : String(v);
    }
    setForm(f);
    setDocs(s.documentos ?? []);
    setEditando(s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (s: Solicitud, estado: string) => {
    const { error } = await supabase.from("solicitudes_credito").update({ estado }).eq("id", s.id);
    if (error) return toast.error("No se pudo actualizar el estado.");
    cargar();
  };

  const borrar = async (s: Solicitud) => {
    if (!window.confirm(`¿Eliminar la solicitud de ${s.nombre_completo}?`)) return;
    const rutas = (s.documentos ?? []).map((d) => d.split(sep)[1]).filter(Boolean);
    if (rutas.length) await supabase.storage.from("creditos_docs").remove(rutas);
    const { error } = await supabase.from("solicitudes_credito").delete().eq("id", s.id);
    if (error) return toast.error("No se pudo eliminar.");
    if (editando === s.id) limpiar();
    cargar();
  };

  const imprimir = (s: Solicitud) => {
    const color = negocio?.color_principal && /^#[0-9a-f]{6}$/i.test(negocio.color_principal) ? negocio.color_principal : "#0e7490";
    const nombre = negocio?.nombre || "Solicitud de crédito";
    const contacto = [negocio?.telefono_pedidos, negocio?.ciudad, negocio?.sitio_web].filter(Boolean).join("  ·  ");
    const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    const m = (n: number | null) => (n === null ? "" : dinero(n));
    const cuotaPct = s.valor_vehiculo && s.cuota_inicial !== null ? `${Math.round((s.cuota_inicial / s.valor_vehiculo) * 100)}%` : "";
    const bloque = (titulo: string, filas: [string, string | number | null][]) =>
      `<h2>${esc(titulo)}</h2><div class="grid">${filas
        .map(([k, v]) => `<div class="c"><span>${esc(k)}</span><b>${esc(v) || "&nbsp;"}</b></div>`)
        .join("")}</div>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Solicitud de crédito - ${esc(s.nombre_completo)}</title>
<style>
@page{size:A4;margin:12mm}
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12px}
header{display:flex;align-items:center;gap:14px;border-bottom:4px solid ${color};padding-bottom:10px;margin-bottom:10px}
header img{max-height:54px;max-width:130px;object-fit:contain}
header h1{margin:0;font-size:20px;color:${color}}header p{margin:2px 0 0;font-size:11px;color:#555}
h2{margin:12px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${color};border-bottom:1px solid #ddd;padding-bottom:2px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 10px}
.c{border-bottom:1px solid #ccc;padding:2px 0;min-height:30px;break-inside:avoid}.c span{display:block;font-size:9px;color:#666;text-transform:uppercase}.c b{font-weight:normal;font-size:12px}
.firmas{display:flex;gap:30px;margin-top:46px}.firmas div{flex:1;border-top:1px solid #111;padding-top:4px;font-size:11px;text-align:center}
p.nota{font-size:10px;color:#555;margin-top:10px}
footer{text-align:center;font-size:10px;color:#666;margin-top:14px;border-top:1px solid #ddd;padding-top:6px}
</style></head><body>
<header>${urlSegura(negocio?.logo_url) ? `<img src="${urlSegura(negocio?.logo_url)}" alt="">` : ""}<div><h1>Solicitud de crédito de vehículo</h1>
<p>${esc(nombre)} · ${esc(fecha)}${s.entidad ? ` · Para estudio de: ${esc(s.entidad)}` : ""}</p></div></header>
${bloque("1. Datos del solicitante", [
  ["Nombre completo", s.nombre_completo], ["Tipo de documento", s.tipo_documento], ["Número de documento", s.numero_documento],
  ["Fecha de nacimiento", s.fecha_nacimiento], ["Lugar de expedición", s.lugar_expedicion], ["Estado civil", s.estado_civil],
  ["Personas a cargo", s.personas_a_cargo], ["Teléfono / celular", s.telefono], ["Correo electrónico", s.email],
  ["Dirección", s.direccion], ["Ciudad", s.ciudad], ["Tipo de vivienda", s.tipo_vivienda],
])}
${bloque("2. Información laboral y financiera", [
  ["Ocupación", s.ocupacion], ["Tipo de vinculación", s.tipo_vinculacion], ["Empresa", s.empresa],
  ["Cargo", s.cargo], ["Antigüedad", s.antiguedad], ["Teléfono de la empresa", s.telefono_empresa],
  ["Ingresos mensuales", m(s.ingresos_mensuales)], ["Otros ingresos", m(s.otros_ingresos)], ["Egresos mensuales", m(s.egresos_mensuales)],
  ["Patrimonio", m(s.patrimonio)],
])}
${bloque("3. Referencias personales", [
  ["Referencia 1 - nombre", s.ref1_nombre], ["Teléfono", s.ref1_telefono], ["Parentesco", s.ref1_parentesco],
  ["Referencia 2 - nombre", s.ref2_nombre], ["Teléfono", s.ref2_telefono], ["Parentesco", s.ref2_parentesco],
])}
${bloque("4. Vehículo y crédito solicitado", [
  ["Vehículo", s.vehiculo], ["Valor del vehículo", m(s.valor_vehiculo)], ["Cuota inicial", `${m(s.cuota_inicial)} ${cuotaPct}`.trim()],
  ["Monto solicitado", m(s.monto_solicitado)], ["Plazo (meses)", s.plazo_meses], ["Entidad", s.entidad],
])}
${s.observaciones ? `<h2>Observaciones</h2><p>${esc(s.observaciones)}</p>` : ""}
<h2>Documentos adjuntos</h2><p>${(s.documentos ?? []).length ? (s.documentos ?? []).map((d) => esc(d.split(sep)[0])).join(", ") : "Ninguno"}</p>
<p class="nota">Declaro que la información suministrada es veraz y autorizo a la entidad financiera a consultarla y verificarla en las centrales de riesgo y demás fuentes, para el estudio de esta solicitud.</p>
<div class="firmas"><div>Firma del solicitante<br>C.C. ${esc(s.numero_documento)}</div><div>Huella</div><div>Asesor / ${esc(nombre)}</div></div>
<footer>${esc(contacto)}</footer>
<script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permite las ventanas emergentes para generar el PDF.");
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success("En la ventana que se abrió elige “Guardar como PDF”.");
  };

  const visibles = useMemo(() => (filtro === "todos" ? lista : lista.filter((s) => s.estado === filtro)), [lista, filtro]);
  const enEstudio = lista.filter((s) => s.estado === "enviado");
  const montoEstudio = enEstudio.reduce((t, s) => t + (s.monto_solicitado ?? 0), 0);
  const aprobados = lista.filter((s) => s.estado === "aprobado" || s.estado === "desembolsado").length;

  const seccion = (t: string) => <h3 className="pt-2 text-sm font-medium text-primary">{t}</h3>;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Landmark className="h-7 w-7 text-primary" /> Créditos y entidades financieras
        </h1>
        <p className="text-sm text-muted-foreground">
          Diligencia la solicitud de crédito del cliente, sube sus documentos e imprímela en PDF para enviarla a estudio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Solicitudes</p><p className="text-lg font-medium text-foreground">{lista.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">En estudio</p><p className="truncate text-lg font-medium text-foreground">{enEstudio.length} · {dinero(montoEstudio)}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Aprobados</p><p className="text-lg font-medium text-foreground">{aprobados}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium text-foreground">{editando ? "Editar solicitud" : "Nueva solicitud de crédito"}</h2>
            {editando && <button onClick={limpiar} className="text-xs text-primary">Cancelar edición</button>}
          </div>

          {seccion("Datos del solicitante")}
          {inp("nombre_completo", "Nombre completo *")}
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Documento</span>
              <select className={campo} value={form.tipo_documento} onChange={(e) => set("tipo_documento", e.target.value)}>
                {["CC", "CE", "NIT", "Pasaporte"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {inp("numero_documento", "Número", { inputMode: "numeric" })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {inp("fecha_nacimiento", "Fecha de nacimiento", { type: "date" })}
            {inp("lugar_expedicion", "Lugar de expedición")}
            {inp("estado_civil", "Estado civil")}
            {inp("personas_a_cargo", "Personas a cargo", { inputMode: "numeric" })}
            {inp("telefono", "Teléfono / celular", { inputMode: "tel" })}
            {inp("email", "Correo electrónico", { type: "email", inputMode: "email" })}
            {inp("direccion", "Dirección")}
            {inp("ciudad", "Ciudad")}
            {inp("tipo_vivienda", "Tipo de vivienda (propia, familiar, arriendo)")}
          </div>

          {seccion("Información laboral y financiera")}
          <div className="grid gap-3 sm:grid-cols-2">
            {inp("ocupacion", "Ocupación")}
            {inp("tipo_vinculacion", "Vinculación (empleado, independiente, pensionado)")}
            {inp("empresa", "Empresa donde trabaja")}
            {inp("cargo", "Cargo")}
            {inp("antiguedad", "Antigüedad (ej: 3 años)")}
            {inp("telefono_empresa", "Teléfono de la empresa", { inputMode: "tel" })}
            {inp("ingresos_mensuales", "Ingresos mensuales (COP)", { inputMode: "decimal" })}
            {inp("otros_ingresos", "Otros ingresos (COP)", { inputMode: "decimal" })}
            {inp("egresos_mensuales", "Egresos mensuales (COP)", { inputMode: "decimal" })}
            {inp("patrimonio", "Patrimonio (COP)", { inputMode: "decimal" })}
          </div>

          {seccion("Referencias personales")}
          <div className="grid gap-3 sm:grid-cols-3">
            {inp("ref1_nombre", "Referencia 1 - nombre")}
            {inp("ref1_telefono", "Teléfono", { inputMode: "tel" })}
            {inp("ref1_parentesco", "Parentesco")}
            {inp("ref2_nombre", "Referencia 2 - nombre")}
            {inp("ref2_telefono", "Teléfono", { inputMode: "tel" })}
            {inp("ref2_parentesco", "Parentesco")}
          </div>

          {seccion("Vehículo y crédito solicitado")}
          <div className="grid gap-3 sm:grid-cols-2">
            {inp("vehiculo", "Vehículo (marca, modelo, año, placa)")}
            {inp("entidad", "Entidad financiera (banco o financiera)")}
            {inp("valor_vehiculo", "Valor del vehículo (COP)", { inputMode: "decimal" })}
            {inp("cuota_inicial", "Cuota inicial (COP)", { inputMode: "decimal" })}
            {inp("monto_solicitado", "Monto a financiar (COP)", { inputMode: "decimal" })}
            {inp("plazo_meses", "Plazo en meses", { inputMode: "numeric" })}
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Observaciones</span>
            <textarea className={campo} rows={2} value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Estado</span>
            <select className={campo} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
              {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
            </select>
          </label>

          {seccion("Documentos del cliente")}
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${campo} sm:w-auto`} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
              {TIPOS_DOC.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-sm text-foreground hover:bg-glass/40">
              <Paperclip className="h-4 w-4" /> {subiendo ? "Subiendo..." : "Subir archivo"}
              <input type="file" accept="image/*,application/pdf" multiple className="hidden" disabled={subiendo}
                onChange={(e) => { subirDocs(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          {docs.length > 0 && (
            <ul className="space-y-1">
              {docs.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2 rounded-lg border border-glass-border px-3 py-1.5 text-sm">
                  <button type="button" onClick={() => abrirDoc(d)} className="min-w-0 truncate text-left text-foreground hover:text-primary">
                    {d.split(sep)[0]}
                  </button>
                  <button type="button" onClick={() => quitarDoc(d)} aria-label="Quitar documento" className="shrink-0 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Imágenes o PDF de hasta 8 MB. Los documentos son privados.</p>

          <button onClick={guardar} disabled={guardando || subiendo} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Guardar solicitud"}
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[{ clave: "todos", texto: "Todas" }, ...ESTADOS].map((e) => (
              <button
                key={e.clave}
                onClick={() => setFiltro(e.clave)}
                className={`rounded-full px-4 py-1.5 ${filtro === e.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
              >
                {e.texto}
              </button>
            ))}
          </div>
          {cargando && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay solicitudes.</p>}
          {visibles.map((s) => (
            <GlassPanel key={s.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-foreground">{s.nombre_completo}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {[s.vehiculo, s.entidad, s.telefono].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-muted-foreground">
                  <button onClick={() => editar(s)} aria-label="Editar" className="hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => borrar(s)} aria-label="Eliminar" className="hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Monto: {dinero(s.monto_solicitado ?? 0)}{s.plazo_meses ? ` · ${s.plazo_meses} meses` : ""} · {(s.documentos ?? []).length} documento(s)
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => imprimir(s)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <FileText className="h-4 w-4" /> Imprimir PDF
                </button>
                <select
                  className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1.5 text-base text-foreground"
                  value={s.estado}
                  onChange={(e) => cambiarEstado(s, e.target.value)}
                >
                  {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
                </select>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

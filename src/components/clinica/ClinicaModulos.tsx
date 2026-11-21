import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, ImageIcon, Loader2, MessageCircle, Paperclip, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Json, Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { escaparHtml } from "@/lib/exportes";

type Paciente = Tables<"cl_pacientes">;
type Historia = Tables<"cl_historias">;
type Nota = Tables<"cl_notas_aclaratorias">;
type Vacuna = Tables<"cl_vacunas">;
type Servicio = Tables<"cl_servicios">;
type Insumo = Tables<"cl_insumos">;
type Cita = Tables<"cl_citas">;
type Cobro = Tables<"cl_cobros">;
type Comision = Tables<"cl_comisiones">;

type FormulaItem = { medicamento: string; dosis: string; frecuencia: string; duracion: string };
type LineaCobro = { tipo: string; nombre: string; cantidad: number; total: number; comision: number };
type LineaNueva = { tipo: "servicio" | "insumo"; id: string; nombre: string; cantidad: string };

const BUCKET = "creditos_docs";
const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const boton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
const botonSec =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40 disabled:opacity-50";
const num = (s: string): number => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const numN = (s: string): number | null => (s.trim() === "" ? null : num(s));
const textoN = (s: string): string | null => (s.trim() === "" ? null : s.trim());
const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasHasta = (fecha: string): number =>
  Math.round((new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoy()}T00:00:00`).getTime()) / 86400000);
const fechaHora = (iso: string): string => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
const fechaCorta = (f: string): string => new Date(`${f}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" });
const esc = escaparHtml;

const leerFormula = (j: Json): FormulaItem[] => {
  if (!Array.isArray(j)) return [];
  return j.flatMap((x): FormulaItem[] => {
    if (x === null || typeof x !== "object" || Array.isArray(x)) return [];
    return [{
      medicamento: String(x.medicamento ?? ""),
      dosis: String(x.dosis ?? ""),
      frecuencia: String(x.frecuencia ?? ""),
      duracion: String(x.duracion ?? ""),
    }];
  });
};
const leerLineas = (j: Json): LineaCobro[] => {
  if (!Array.isArray(j)) return [];
  return j.flatMap((x): LineaCobro[] => {
    if (x === null || typeof x !== "object" || Array.isArray(x)) return [];
    return [{
      tipo: String(x.tipo ?? ""),
      nombre: String(x.nombre ?? ""),
      cantidad: Number(x.cantidad ?? 0),
      total: Number(x.total ?? 0),
      comision: Number(x.comision ?? 0),
    }];
  });
};

function usarVoc() {
  const { negocio } = useNegocio();
  const vet = negocio ? resolverTipoNegocio(negocio.tipo_negocio).clave === "mascotas" : false;
  return {
    vet,
    nombreNegocio: negocio?.nombre ?? "",
    paciente: vet ? "Mascota" : "Paciente",
    pacientes: vet ? "Pacientes / Mascotas" : "Pacientes",
    duenio: vet ? "Dueño / acudiente" : "Titular / acudiente",
    profesional: vet ? "Veterinario" : "Profesional",
  };
}

function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted-foreground">
      <span className="mb-1 block">{etiqueta}</span>
      {children}
    </label>
  );
}

function Cargando() {
  return (
    <div className="flex min-h-[30dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function useUrlFirmada(ruta: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ruta) return;
    let vivo = true;
    let local: string | null = null;
    void urlLocalPrivada(BUCKET, ruta).then((u) => {
      local = u;
      if (vivo) setUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      vivo = false;
      if (local) URL.revokeObjectURL(local);
    };
  }, [ruta]);
  return url;
}

function FotoPaciente({ ruta }: { ruta: string | null }) {
  const url = useUrlFirmada(ruta);
  if (!ruta || !url) return <ImageIcon className="h-6 w-6 shrink-0 text-muted-foreground" />;
  return <img src={url} alt="Foto del paciente" className="h-16 w-16 max-w-full shrink-0 rounded-lg object-cover" />;
}

function EnlaceAdjunto({ ruta }: { ruta: string }) {
  const url = useUrlFirmada(ruta);
  const nombre = ruta.split("/").pop() ?? "adjunto";
  if (!url) return <span className="text-xs text-muted-foreground">{nombre}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 break-all text-xs text-primary hover:underline">
      <Paperclip className="h-3 w-3 shrink-0" /> {nombre}
    </a>
  );
}

async function subirArchivo(file: File, carpeta: string): Promise<string | null> {
  const { data: owner } = await supabase.rpc("mi_negocio_id");
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ruta = `${owner}/clinica/${carpeta}/${crypto.randomUUID()}.${ext || "bin"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type || undefined });
  return error ? null : ruta;
}

function imprimirDocumento(titulo: string, cuerpo: string) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    toast.error("Permite las ventanas emergentes para poder imprimir.");
    return;
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px;text-align:left;font-size:13px}.m{color:#555;font-size:13px;margin:2px 0}.firma{margin-top:60px;border-top:1px solid #111;width:260px;padding-top:4px;font-size:13px}</style></head><body>${cuerpo}</body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

function usarPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cl_pacientes").select("*").order("nombre");
    setPacientes(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  return { pacientes, cargando, recargar: cargar };
}

function SelectorPaciente({ pacientes, valor, onCambio, etiqueta }: { pacientes: Paciente[]; valor: string; onCambio: (v: string) => void; etiqueta: string }) {
  return (
    <Campo etiqueta={etiqueta}>
      <select className={campo} value={valor} onChange={(e) => onCambio(e.target.value)}>
        <option value="">Elige...</option>
        {pacientes.filter((p) => p.activo).map((p) => (
          <option key={p.id} value={p.id}>{p.nombre} · {p.duenio_nombre}</option>
        ))}
      </select>
    </Campo>
  );
}

const enlaceWhatsapp = (tel: string | null, texto: string): string | null => {
  const digitos = (tel ?? "").replace(/\D/g, "");
  if (digitos.length < 7) return null;
  const completo = digitos.length === 10 ? `57${digitos}` : digitos;
  return `https://wa.me/${completo}?text=${encodeURIComponent(texto)}`;
};

// ============================================================
// Pacientes / Mascotas
// ============================================================
export function PacientesClinica() {
  const voc = usarVoc();
  const { pacientes, cargando, recargar } = usarPacientes();
  const vacio = { nombre: "", especie: "", raza: "", sexo: "", nacimiento: "", peso: "", alergias: "", duenio: "", documento: "", telefono: "", correo: "", notas: "" };
  const [f, setF] = useState(vacio);
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busca, setBusca] = useState("");
  const [ediciones, setEdiciones] = useState<Record<string, { peso: string; alergias: string }>>({});
  const set = (k: keyof typeof vacio, v: string) => setF((p) => ({ ...p, [k]: v }));

  const crear = async () => {
    if (!f.nombre.trim()) return toast.error(`Escribe el nombre del ${voc.paciente.toLowerCase()}.`);
    if (!f.duenio.trim()) return toast.error(`Escribe el nombre del ${voc.duenio.toLowerCase()}.`);
    setGuardando(true);
    let ruta: string | null = null;
    if (foto) {
      ruta = await subirArchivo(foto, "fotos");
      if (!ruta) {
        setGuardando(false);
        return toast.error("No se pudo subir la foto. Intenta con otra imagen.");
      }
    }
    const { error } = await supabase.from("cl_pacientes").insert({
      nombre: f.nombre.trim(), especie: textoN(f.especie), raza: textoN(f.raza), sexo: textoN(f.sexo),
      fecha_nacimiento: textoN(f.nacimiento), peso_kg: numN(f.peso), alergias: textoN(f.alergias), foto_path: ruta,
      duenio_nombre: f.duenio.trim(), duenio_documento: textoN(f.documento), duenio_telefono: textoN(f.telefono),
      duenio_correo: textoN(f.correo), notas: textoN(f.notas),
    });
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar la ficha.");
    toast.success("Ficha creada.");
    setF(vacio);
    setFoto(null);
    void recargar();
  };

  const actualizar = async (p: Paciente) => {
    const e = ediciones[p.id];
    if (!e) return;
    const { error } = await supabase.from("cl_pacientes").update({ peso_kg: numN(e.peso), alergias: textoN(e.alergias) }).eq("id", p.id);
    if (error) return toast.error("No se pudo actualizar.");
    toast.success("Ficha actualizada.");
    setEdiciones((x) => {
      const copia = { ...x };
      delete copia[p.id];
      return copia;
    });
    void recargar();
  };

  const cambiarActivo = async (p: Paciente) => {
    const { error } = await supabase.from("cl_pacientes").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return toast.error("No se pudo actualizar.");
    void recargar();
  };

  const lista = pacientes.filter((p) => {
    const q = busca.trim().toLowerCase();
    return !q || `${p.nombre} ${p.duenio_nombre} ${p.duenio_documento ?? ""} ${p.raza ?? ""}`.toLowerCase().includes(q);
  });

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo={voc.pacientes} texto={`Ficha de cada ${voc.paciente.toLowerCase()}${voc.vet ? " con especie, raza, peso, alergias y foto" : " con datos, alergias y foto"}, y de su ${voc.duenio.toLowerCase()}. Las fichas no se borran: se desactivan.`} />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={`Nombre del ${voc.paciente.toLowerCase()}`}><input className={campo} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></Campo>
          {voc.vet && <Campo etiqueta="Especie"><input className={campo} value={f.especie} onChange={(e) => set("especie", e.target.value)} placeholder="Perro, gato..." /></Campo>}
          {voc.vet && <Campo etiqueta="Raza"><input className={campo} value={f.raza} onChange={(e) => set("raza", e.target.value)} /></Campo>}
          <Campo etiqueta="Sexo">
            <select className={campo} value={f.sexo} onChange={(e) => set("sexo", e.target.value)}>
              <option value="">Sin indicar</option>
              <option value="Hembra">{voc.vet ? "Hembra" : "Femenino"}</option>
              <option value="Macho">{voc.vet ? "Macho" : "Masculino"}</option>
            </select>
          </Campo>
          <Campo etiqueta="Fecha de nacimiento"><input type="date" className={campo} value={f.nacimiento} onChange={(e) => set("nacimiento", e.target.value)} /></Campo>
          <Campo etiqueta="Peso (kg)"><input className={campo} inputMode="decimal" value={f.peso} onChange={(e) => set("peso", e.target.value)} /></Campo>
          <Campo etiqueta="Alergias"><input className={campo} value={f.alergias} onChange={(e) => set("alergias", e.target.value)} placeholder="Penicilina, pollo..." /></Campo>
          <Campo etiqueta={voc.duenio}><input className={campo} value={f.duenio} onChange={(e) => set("duenio", e.target.value)} /></Campo>
          <Campo etiqueta="Documento"><input className={campo} value={f.documento} onChange={(e) => set("documento", e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono / WhatsApp"><input className={campo} inputMode="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} /></Campo>
          <Campo etiqueta="Correo"><input className={campo} type="email" value={f.correo} onChange={(e) => set("correo", e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Notas"><input className={campo} value={f.notas} onChange={(e) => set("notas", e.target.value)} /></Campo>
        <label className={`${botonSec} cursor-pointer`}>
          <Camera className="h-4 w-4" /> {foto ? foto.name : "Subir foto"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <div><button type="button" className={boton} disabled={guardando} onClick={crear}>{guardando ? "Guardando..." : "Crear ficha"}</button></div>
      </GlassPanel>

      <input className={campo} placeholder="Buscar por nombre, dueño o documento..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay fichas.</p>}
        {lista.map((p) => {
          const e = ediciones[p.id];
          return (
            <GlassPanel key={p.id} className={`space-y-2 p-4 ${p.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3">
                <FotoPaciente ruta={p.foto_path} />
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{p.nombre}{p.especie ? ` · ${p.especie}` : ""}{p.raza ? ` · ${p.raza}` : ""}</p>
                  <p className="break-words text-xs text-muted-foreground">{voc.duenio}: {p.duenio_nombre}{p.duenio_telefono ? ` · ${p.duenio_telefono}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{p.sexo ?? ""}{p.fecha_nacimiento ? ` · nació ${fechaCorta(p.fecha_nacimiento)}` : ""}</p>
                </div>
              </div>
              {p.alergias && <p className="break-words text-sm text-destructive">Alergias: {p.alergias}</p>}
              <div className="grid grid-cols-2 gap-2">
                <input className={campo} inputMode="decimal" aria-label="Peso en kg" placeholder="Peso kg" value={e?.peso ?? (p.peso_kg !== null ? String(p.peso_kg) : "")} onChange={(ev) => setEdiciones((x) => ({ ...x, [p.id]: { peso: ev.target.value, alergias: x[p.id]?.alergias ?? p.alergias ?? "" } }))} />
                <input className={campo} aria-label="Alergias" placeholder="Alergias" value={e?.alergias ?? p.alergias ?? ""} onChange={(ev) => setEdiciones((x) => ({ ...x, [p.id]: { peso: x[p.id]?.peso ?? (p.peso_kg !== null ? String(p.peso_kg) : ""), alergias: ev.target.value } }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                {e && <button type="button" className={boton} onClick={() => actualizar(p)}>Guardar cambios</button>}
                <button type="button" className={botonSec} onClick={() => cambiarActivo(p)}>{p.activo ? "Desactivar" : "Activar"}</button>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Historias clínicas evolutivas (no se editan ni se borran: solo notas aclaratorias)
// ============================================================
function imprimirFormula(h: Historia, p: Paciente | undefined, negocio: string, profesional: string) {
  const items = leerFormula(h.formula);
  const filas = items.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.medicamento)}</td><td>${esc(x.dosis)}</td><td>${esc(x.frecuencia)}</td><td>${esc(x.duracion)}</td></tr>`).join("");
  imprimirDocumento(
    "Fórmula médica",
    `<h1>${esc(negocio || "Fórmula médica")}</h1><p class="m">Fórmula médica · ${esc(fechaHora(h.created_at))}</p>
     <h2>${esc(p?.nombre ?? "")}${p?.especie ? ` (${esc(p.especie)}${p.raza ? ` · ${esc(p.raza)}` : ""})` : ""}</h2>
     <p class="m">Responsable: ${esc(p?.duenio_nombre ?? "")}${p?.duenio_documento ? ` · Doc. ${esc(p.duenio_documento)}` : ""}</p>
     ${p?.peso_kg ? `<p class="m">Peso: ${p.peso_kg} kg</p>` : ""}${p?.alergias ? `<p class="m">Alergias: ${esc(p.alergias)}</p>` : ""}
     <p class="m">Diagnóstico: ${esc(h.diagnostico)}</p>
     <table><thead><tr><th>#</th><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead><tbody>${filas}</tbody></table>
     ${h.tratamiento ? `<h2>Indicaciones</h2><p class="m">${esc(h.tratamiento)}</p>` : ""}
     ${h.control_en ? `<p class="m">Próximo control: ${esc(fechaCorta(h.control_en))}</p>` : ""}
     <div class="firma">${esc(profesional || h.profesional || "Profesional tratante")}</div>`,
  );
}

export function HistoriasClinica() {
  const voc = usarVoc();
  const { pacientes, cargando } = usarPacientes();
  const [pacienteId, setPacienteId] = useState("");
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const vacio = { profesional: "", motivo: "", peso: "", temp: "", fc: "", fr: "", presion: "", otros: "", diagnostico: "", tratamiento: "", control: "", controlMotivo: "" };
  const [f, setF] = useState(vacio);
  const [formula, setFormula] = useState<FormulaItem[]>([]);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [nuevasNotas, setNuevasNotas] = useState<Record<string, string>>({});
  const set = (k: keyof typeof vacio, v: string) => setF((p) => ({ ...p, [k]: v }));

  const cargar = useCallback(async () => {
    if (!pacienteId) {
      setHistorias([]);
      setNotas([]);
      return;
    }
    const [h, n] = await Promise.all([
      supabase.from("cl_historias").select("*").eq("paciente_id", pacienteId).order("created_at", { ascending: false }),
      supabase.from("cl_notas_aclaratorias").select("*").eq("paciente_id", pacienteId).order("created_at", { ascending: true }),
    ]);
    setHistorias(h.data ?? []);
    setNotas(n.data ?? []);
  }, [pacienteId]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const paciente = pacientes.find((p) => p.id === pacienteId);

  const guardar = async () => {
    if (!pacienteId) return toast.error(`Elige el ${voc.paciente.toLowerCase()}.`);
    if (!f.motivo.trim()) return toast.error("Escribe el motivo de consulta.");
    if (!f.diagnostico.trim()) return toast.error("Escribe el diagnóstico.");
    setGuardando(true);
    const rutas: string[] = [];
    for (const a of archivos) {
      const r = await subirArchivo(a, pacienteId);
      if (!r) {
        setGuardando(false);
        return toast.error(`No se pudo subir ${a.name}.`);
      }
      rutas.push(r);
    }
    const validas = formula.filter((x) => x.medicamento.trim());
    const { error } = await supabase.from("cl_historias").insert({
      paciente_id: pacienteId, profesional: textoN(f.profesional), motivo: f.motivo.trim(),
      peso_kg: numN(f.peso), temperatura: numN(f.temp), frecuencia_cardiaca: numN(f.fc), frecuencia_respiratoria: numN(f.fr),
      presion: textoN(f.presion), otros_signos: textoN(f.otros), diagnostico: f.diagnostico.trim(), tratamiento: textoN(f.tratamiento),
      formula: validas, adjuntos: rutas, control_en: textoN(f.control), control_motivo: textoN(f.controlMotivo),
    });
    if (error) {
      setGuardando(false);
      return toast.error("No se pudo guardar la historia.");
    }
    if (numN(f.peso) !== null) await supabase.from("cl_pacientes").update({ peso_kg: numN(f.peso) }).eq("id", pacienteId);
    setGuardando(false);
    toast.success("Evolución guardada en la historia clínica.");
    setF(vacio);
    setFormula([]);
    setArchivos([]);
    void cargar();
  };

  const agregarNota = async (h: Historia) => {
    const texto = (nuevasNotas[h.id] ?? "").trim();
    if (texto.length < 3) return toast.error("Escribe la nota aclaratoria.");
    const { error } = await supabase.from("cl_notas_aclaratorias").insert({ paciente_id: h.paciente_id, historia_id: h.id, nota: texto });
    if (error) return toast.error("No se pudo guardar la nota.");
    setNuevasNotas((x) => ({ ...x, [h.id]: "" }));
    toast.success("Nota aclaratoria agregada.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Historias clínicas" texto="Cada consulta queda como una evolución. No se edita ni se borra: si hay un error, se agrega una nota aclaratoria que queda para la auditoría médica." />
      <GlassPanel className="space-y-3 p-4">
        <SelectorPaciente pacientes={pacientes} valor={pacienteId} onCambio={setPacienteId} etiqueta={voc.paciente} />
        {paciente?.alergias && <p className="text-sm text-destructive">Alergias: {paciente.alergias}</p>}
        {pacienteId && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta={voc.profesional}><input className={campo} value={f.profesional} onChange={(e) => set("profesional", e.target.value)} /></Campo>
              <Campo etiqueta="Motivo de consulta"><input className={campo} value={f.motivo} onChange={(e) => set("motivo", e.target.value)} /></Campo>
              <Campo etiqueta="Peso (kg)"><input className={campo} inputMode="decimal" value={f.peso} onChange={(e) => set("peso", e.target.value)} /></Campo>
              <Campo etiqueta="Temperatura (°C)"><input className={campo} inputMode="decimal" value={f.temp} onChange={(e) => set("temp", e.target.value)} /></Campo>
              <Campo etiqueta="Frecuencia cardiaca"><input className={campo} inputMode="decimal" value={f.fc} onChange={(e) => set("fc", e.target.value)} /></Campo>
              <Campo etiqueta="Frecuencia respiratoria"><input className={campo} inputMode="decimal" value={f.fr} onChange={(e) => set("fr", e.target.value)} /></Campo>
              {!voc.vet && <Campo etiqueta="Presión arterial"><input className={campo} value={f.presion} onChange={(e) => set("presion", e.target.value)} placeholder="120/80" /></Campo>}
              <Campo etiqueta="Otros signos"><input className={campo} value={f.otros} onChange={(e) => set("otros", e.target.value)} /></Campo>
              <Campo etiqueta="Diagnóstico"><input className={campo} value={f.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} /></Campo>
              <Campo etiqueta="Tratamiento / indicaciones"><input className={campo} value={f.tratamiento} onChange={(e) => set("tratamiento", e.target.value)} /></Campo>
              <Campo etiqueta="Próximo control (opcional)"><input type="date" className={campo} value={f.control} onChange={(e) => set("control", e.target.value)} /></Campo>
              <Campo etiqueta="Motivo del control"><input className={campo} value={f.controlMotivo} onChange={(e) => set("controlMotivo", e.target.value)} placeholder="Control post-operatorio, retiro de puntos..." /></Campo>
            </div>
            <p className="text-sm text-muted-foreground">Fórmula médica</p>
            {formula.map((x, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                {(["medicamento", "dosis", "frecuencia", "duracion"] as const).map((k) => (
                  <input key={k} className={campo} placeholder={k === "medicamento" ? "Medicamento" : k === "dosis" ? "Dosis" : k === "frecuencia" ? "Cada..." : "Duración"} value={x[k]} onChange={(e) => setFormula((l) => l.map((y, i) => (i === idx ? { ...y, [k]: e.target.value } : y)))} />
                ))}
                <button type="button" className={botonSec} aria-label="Quitar medicamento" onClick={() => setFormula((l) => l.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={botonSec} onClick={() => setFormula((l) => [...l, { medicamento: "", dosis: "", frecuencia: "", duracion: "" }])}><Plus className="h-4 w-4" /> Medicamento</button>
              <label className={`${botonSec} cursor-pointer`}>
                <Paperclip className="h-4 w-4" /> {archivos.length > 0 ? `${archivos.length} adjunto(s)` : "Exámenes / radiografías"}
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => setArchivos(Array.from(e.target.files ?? []))} />
              </label>
              <button type="button" className={boton} disabled={guardando} onClick={guardar}>{guardando ? "Guardando..." : "Guardar evolución"}</button>
            </div>
          </>
        )}
      </GlassPanel>

      <div className="space-y-3">
        {pacienteId && historias.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay evoluciones para este {voc.paciente.toLowerCase()}.</p>}
        {historias.map((h) => {
          const f2 = leerFormula(h.formula);
          const susNotas = notas.filter((n) => n.historia_id === h.id);
          return (
            <GlassPanel key={h.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{h.motivo}</p>
                  <p className="text-xs text-muted-foreground">{fechaHora(h.created_at)}{h.profesional ? ` · ${h.profesional}` : ""}</p>
                </div>
                {f2.length > 0 && <button type="button" className={botonSec} onClick={() => imprimirFormula(h, paciente, voc.nombreNegocio, h.profesional ?? "")}><Printer className="h-4 w-4" /> Fórmula</button>}
              </div>
              <p className="break-words text-sm text-foreground">
                {[h.peso_kg !== null ? `${h.peso_kg} kg` : "", h.temperatura !== null ? `${h.temperatura} °C` : "", h.frecuencia_cardiaca !== null ? `FC ${h.frecuencia_cardiaca}` : "", h.frecuencia_respiratoria !== null ? `FR ${h.frecuencia_respiratoria}` : "", h.presion ?? "", h.otros_signos ?? ""].filter(Boolean).join(" · ")}
              </p>
              <p className="break-words text-sm text-foreground">Diagnóstico: {h.diagnostico}</p>
              {h.tratamiento && <p className="break-words text-sm text-muted-foreground">Tratamiento: {h.tratamiento}</p>}
              {f2.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {f2.map((x, i) => (<li key={i}>{x.medicamento} · {x.dosis} · {x.frecuencia} · {x.duracion}</li>))}
                </ul>
              )}
              {h.control_en && <p className="text-sm text-foreground">Control: {fechaCorta(h.control_en)}{h.control_motivo ? ` · ${h.control_motivo}` : ""}</p>}
              {h.adjuntos.length > 0 && <div className="flex flex-col gap-1">{h.adjuntos.map((a) => (<EnlaceAdjunto key={a} ruta={a} />))}</div>}
              {susNotas.map((n) => (
                <p key={n.id} className="break-words rounded-lg border border-glass-border bg-glass/30 p-2 text-xs text-muted-foreground">Nota aclaratoria ({fechaHora(n.created_at)}): {n.nota}</p>
              ))}
              <div className="flex flex-wrap gap-2">
                <input className={`${campo} flex-1`} placeholder="Agregar nota aclaratoria" value={nuevasNotas[h.id] ?? ""} onChange={(e) => setNuevasNotas((x) => ({ ...x, [h.id]: e.target.value }))} />
                <button type="button" className={botonSec} onClick={() => agregarNota(h)}>Agregar nota</button>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Carnet de vacunación / desparasitación
// ============================================================
const TIPOS_VACUNA: Record<string, string> = { vacuna: "Vacuna", desparasitacion: "Desparasitación", otro: "Otro" };

export function VacunasClinica() {
  const voc = usarVoc();
  const { pacientes, cargando } = usarPacientes();
  const [pacienteId, setPacienteId] = useState("");
  const [lista, setLista] = useState<Vacuna[]>([]);
  const vacio = { tipo: "vacuna", nombre: "", aplicada: hoy(), proxima: "", lote: "", por: "", notas: "" };
  const [f, setF] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof vacio, v: string) => setF((p) => ({ ...p, [k]: v }));

  const cargar = useCallback(async () => {
    if (!pacienteId) return setLista([]);
    const { data } = await supabase.from("cl_vacunas").select("*").eq("paciente_id", pacienteId).order("aplicada_en", { ascending: false });
    setLista(data ?? []);
  }, [pacienteId]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!pacienteId) return toast.error(`Elige el ${voc.paciente.toLowerCase()}.`);
    if (!f.nombre.trim()) return toast.error("Escribe el nombre de la vacuna o del producto.");
    if (f.proxima && f.proxima < f.aplicada) return toast.error("La próxima dosis no puede ser anterior a la aplicación.");
    setGuardando(true);
    const { error } = await supabase.from("cl_vacunas").insert({
      paciente_id: pacienteId, tipo: f.tipo, nombre: f.nombre.trim(), aplicada_en: f.aplicada, proxima_en: textoN(f.proxima),
      lote: textoN(f.lote), aplicado_por: textoN(f.por), notas: textoN(f.notas),
    });
    setGuardando(false);
    if (error) return toast.error("No se pudo registrar la dosis.");
    toast.success("Dosis registrada en el carnet.");
    setF(vacio);
    void cargar();
  };

  const imprimirCarnet = () => {
    const p = pacientes.find((x) => x.id === pacienteId);
    if (!p) return;
    const filas = lista.map((v) => `<tr><td>${esc(TIPOS_VACUNA[v.tipo] ?? v.tipo)}</td><td>${esc(v.nombre)}</td><td>${esc(fechaCorta(v.aplicada_en))}</td><td>${v.proxima_en ? esc(fechaCorta(v.proxima_en)) : ""}</td><td>${esc(v.lote ?? "")}</td><td>${esc(v.aplicado_por ?? "")}</td></tr>`).join("");
    imprimirDocumento("Carnet de vacunación", `<h1>${esc(voc.nombreNegocio || "Carnet")}</h1><p class="m">Carnet de vacunación y desparasitación</p><h2>${esc(p.nombre)}${p.especie ? ` · ${esc(p.especie)}` : ""}${p.raza ? ` · ${esc(p.raza)}` : ""}</h2><p class="m">${esc(voc.duenio)}: ${esc(p.duenio_nombre)}</p><table><thead><tr><th>Tipo</th><th>Aplicación</th><th>Fecha</th><th>Próxima</th><th>Lote</th><th>Aplicó</th></tr></thead><tbody>${filas}</tbody></table>`);
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo={voc.vet ? "Carnet de vacunación y desparasitación" : "Vacunas y esquemas"} texto="Cada dosis queda con su fecha, lote y próxima aplicación; el sistema te avisa antes de que se venza. Los registros no se editan ni se borran." />
      <GlassPanel className="space-y-3 p-4">
        <SelectorPaciente pacientes={pacientes} valor={pacienteId} onCambio={setPacienteId} etiqueta={voc.paciente} />
        {pacienteId && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Tipo">
                <select className={campo} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
                  {Object.entries(TIPOS_VACUNA).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </Campo>
              <Campo etiqueta="Vacuna o producto"><input className={campo} value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Rabia, triple felina, albendazol..." /></Campo>
              <Campo etiqueta="Fecha de aplicación"><input type="date" className={campo} value={f.aplicada} onChange={(e) => set("aplicada", e.target.value)} /></Campo>
              <Campo etiqueta="Próxima dosis"><input type="date" className={campo} value={f.proxima} onChange={(e) => set("proxima", e.target.value)} /></Campo>
              <Campo etiqueta="Lote"><input className={campo} value={f.lote} onChange={(e) => set("lote", e.target.value)} /></Campo>
              <Campo etiqueta="Aplicado por"><input className={campo} value={f.por} onChange={(e) => set("por", e.target.value)} /></Campo>
            </div>
            <Campo etiqueta="Notas"><input className={campo} value={f.notas} onChange={(e) => set("notas", e.target.value)} /></Campo>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={boton} disabled={guardando} onClick={guardar}>{guardando ? "Guardando..." : "Registrar dosis"}</button>
              {lista.length > 0 && <button type="button" className={botonSec} onClick={imprimirCarnet}><Printer className="h-4 w-4" /> Imprimir carnet</button>}
            </div>
          </>
        )}
      </GlassPanel>
      <div className="space-y-2">
        {pacienteId && lista.length === 0 && <p className="text-sm text-muted-foreground">Sin dosis registradas.</p>}
        {lista.map((v) => {
          const dias = v.proxima_en ? diasHasta(v.proxima_en) : null;
          return (
            <GlassPanel key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground">{TIPOS_VACUNA[v.tipo] ?? v.tipo}: {v.nombre}</p>
                <p className="text-xs text-muted-foreground">Aplicada {fechaCorta(v.aplicada_en)}{v.lote ? ` · lote ${v.lote}` : ""}{v.aplicado_por ? ` · ${v.aplicado_por}` : ""}{v.notas ? ` · ${v.notas}` : ""}</p>
              </div>
              {v.proxima_en && dias !== null && (
                <p className={`text-sm ${dias < 0 ? "text-destructive" : "text-foreground"}`}>Próxima {fechaCorta(v.proxima_en)}{dias < 0 ? " (vencida)" : dias <= 30 ? ` (en ${dias} días)` : ""}</p>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Servicios y tarifas
// ============================================================
const CATEGORIAS: Record<string, string> = { consulta: "Consulta", cirugia: "Cirugía", procedimiento: "Procedimiento", vacuna: "Vacunación", desparasitacion: "Desparasitación", hospitalizacion: "Hospitalización", peluqueria: "Peluquería y baño", otro: "Otro" };

export function ServiciosClinica() {
  const { esAdmin, cargando: cargPermisos } = usePermisos();
  const [lista, setLista] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const vacio = { nombre: "", categoria: "consulta", precio: "", pct: "" };
  const [f, setF] = useState(vacio);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cl_servicios").select("*").order("nombre");
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede crear o editar servicios y honorarios.");
    if (!f.nombre.trim()) return toast.error("Escribe el nombre del servicio.");
    if (num(f.pct) < 0 || num(f.pct) > 100) return toast.error("La comisión debe estar entre 0 y 100%.");
    const { error } = await supabase.from("cl_servicios").insert({ nombre: f.nombre.trim(), categoria: f.categoria, precio: num(f.precio), comision_pct: num(f.pct) });
    if (error) return toast.error("No se pudo guardar el servicio.");
    setF(vacio);
    void cargar();
  };
  const alternar = async (s: Servicio) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede modificar servicios.");
    const { error } = await supabase.from("cl_servicios").update({ activo: !s.activo }).eq("id", s.id);
    if (error) return toast.error("No se pudo actualizar.");
    void cargar();
  };

  if (cargando || cargPermisos) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Servicios y tarifas" texto="Consultas, cirugías y procedimientos con su precio y el porcentaje de honorarios que gana el profesional." />
      {!esAdmin && (
        <GlassPanel className="p-4 text-sm text-muted-foreground">
          Vista de solo lectura. Solo el dueño o administrador puede crear o editar servicios, precios y porcentajes de honorarios.
        </GlassPanel>
      )}
      {esAdmin && (
        <GlassPanel className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Servicio"><input className={campo} value={f.nombre} onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))} placeholder="Consulta general, esterilización..." /></Campo>
            <Campo etiqueta="Tipo">
              <select className={campo} value={f.categoria} onChange={(e) => setF((p) => ({ ...p, categoria: e.target.value }))}>
                {Object.entries(CATEGORIAS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </Campo>
            <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={f.precio} onChange={(e) => setF((p) => ({ ...p, precio: e.target.value }))} /></Campo>
            <Campo etiqueta="Honorarios del profesional (%)"><input className={campo} inputMode="decimal" value={f.pct} onChange={(e) => setF((p) => ({ ...p, pct: e.target.value }))} /></Campo>
          </div>
          <div><button type="button" className={boton} onClick={crear}>Agregar servicio</button></div>
        </GlassPanel>
      )}
      <div className="space-y-2">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">{esAdmin ? "Aún no hay servicios. Crea al menos la consulta para poder cobrar." : "Aún no hay servicios registrados."}</p>}
        {lista.map((s) => (
          <GlassPanel key={s.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 ${s.activo ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <p className="break-words font-medium text-foreground">{s.nombre}</p>
              <p className="text-xs text-muted-foreground">{CATEGORIAS[s.categoria] ?? s.categoria} · {dinero(s.precio)} · honorarios {s.comision_pct}%</p>
            </div>
            {esAdmin && (
              <button type="button" className={botonSec} onClick={() => alternar(s)}>{s.activo ? "Desactivar" : "Activar"}</button>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Medicamentos e insumos médicos (con vencimiento)
// ============================================================
export function InsumosClinica() {
  const [lista, setLista] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const vacio = { nombre: "", unidad: "und", stock: "", minimo: "", precio: "", vence: "", lote: "" };
  const [f, setF] = useState(vacio);
  const [entradas, setEntradas] = useState<Record<string, string>>({});
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cl_insumos").select("*").order("nombre");
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (!f.nombre.trim()) return toast.error("Escribe el nombre del medicamento o insumo.");
    const { error } = await supabase.from("cl_insumos").insert({
      nombre: f.nombre.trim(), unidad: f.unidad.trim() || "und", stock: Math.max(num(f.stock), 0), minimo: Math.max(num(f.minimo), 0),
      precio_venta: Math.max(num(f.precio), 0), vence_en: textoN(f.vence), lote: textoN(f.lote),
    });
    if (error) return toast.error("No se pudo guardar.");
    setF(vacio);
    void cargar();
  };
  const ingresar = async (i: Insumo) => {
    const n = num(entradas[i.id] ?? "");
    if (n <= 0) return toast.error("Escribe la cantidad que entra.");
    const { error } = await supabase.from("cl_insumos").update({ stock: i.stock + n }).eq("id", i.id);
    if (error) return toast.error("No se pudo actualizar el stock.");
    setEntradas((x) => ({ ...x, [i.id]: "" }));
    void cargar();
  };
  const alternar = async (i: Insumo) => {
    const { error } = await supabase.from("cl_insumos").update({ activo: !i.activo }).eq("id", i.id);
    if (error) return toast.error("No se pudo actualizar.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Medicamentos e insumos médicos" texto="Existencias, precio de venta y vencimiento. Lo que se aplica en una consulta se descuenta solo, y un producto vencido no se puede aplicar." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre"><input className={campo} value={f.nombre} onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))} /></Campo>
          <Campo etiqueta="Unidad"><input className={campo} value={f.unidad} onChange={(e) => setF((p) => ({ ...p, unidad: e.target.value }))} /></Campo>
          <Campo etiqueta="Existencias"><input className={campo} inputMode="decimal" value={f.stock} onChange={(e) => setF((p) => ({ ...p, stock: e.target.value }))} /></Campo>
          <Campo etiqueta="Stock mínimo"><input className={campo} inputMode="decimal" value={f.minimo} onChange={(e) => setF((p) => ({ ...p, minimo: e.target.value }))} /></Campo>
          <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={f.precio} onChange={(e) => setF((p) => ({ ...p, precio: e.target.value }))} /></Campo>
          <Campo etiqueta="Vence"><input type="date" className={campo} value={f.vence} onChange={(e) => setF((p) => ({ ...p, vence: e.target.value }))} /></Campo>
          <Campo etiqueta="Lote"><input className={campo} value={f.lote} onChange={(e) => setF((p) => ({ ...p, lote: e.target.value }))} /></Campo>
        </div>
        <div><button type="button" className={boton} onClick={crear}>Agregar</button></div>
      </GlassPanel>
      <div className="space-y-2">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay medicamentos ni insumos.</p>}
        {lista.map((i) => {
          const dias = i.vence_en ? diasHasta(i.vence_en) : null;
          const bajo = i.minimo > 0 && i.stock <= i.minimo;
          return (
            <GlassPanel key={i.id} className={`space-y-2 p-3 ${i.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{i.nombre}{i.lote ? ` · lote ${i.lote}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    Hay {i.stock} {i.unidad} · {dinero(i.precio_venta)}
                    {i.vence_en ? ` · vence ${fechaCorta(i.vence_en)}` : ""}
                  </p>
                </div>
                <p className={`text-sm ${bajo || (dias !== null && dias <= 60) ? "text-destructive" : "text-muted-foreground"}`}>
                  {dias !== null && dias < 0 ? "Vencido" : dias !== null && dias <= 60 ? `Vence en ${dias} días` : bajo ? "Stock bajo" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${campo} w-32`} inputMode="decimal" placeholder="Entrada" value={entradas[i.id] ?? ""} onChange={(e) => setEntradas((x) => ({ ...x, [i.id]: e.target.value }))} />
                <button type="button" className={botonSec} onClick={() => ingresar(i)}>Sumar al stock</button>
                <button type="button" className={botonSec} onClick={() => alternar(i)}>{i.activo ? "Desactivar" : "Activar"}</button>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Agenda por especialista y consultorio → Caja
// ============================================================
const ESTADOS_CITA: Record<string, string> = { agendada: "Agendada", en_consulta: "En consulta", atendida: "Atendida", no_asistio: "No asistió", cancelada: "Cancelada" };

export function AgendaClinica() {
  const voc = usarVoc();
  const { pacientes, cargando } = usarPacientes();
  const [dia, setDia] = useState(hoy());
  const [filtro, setFiltro] = useState("");
  const [citas, setCitas] = useState<Cita[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const vacio = { pacienteId: "", profesional: "", consultorio: "", inicio: "", duracion: "30", motivo: "" };
  const [f, setF] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaNueva[]>([]);
  const [eleccion, setEleccion] = useState("");
  const [cantidad, setCantidad] = useState("1");

  const cargar = useCallback(async () => {
    const desde = new Date(`${dia}T00:00:00`);
    const hasta = new Date(desde.getTime() + 86400000);
    const [c, s, i] = await Promise.all([
      supabase.from("cl_citas").select("*").gte("inicio", desde.toISOString()).lt("inicio", hasta.toISOString()).order("inicio"),
      supabase.from("cl_servicios").select("*").eq("activo", true).order("nombre"),
      supabase.from("cl_insumos").select("*").eq("activo", true).order("nombre"),
    ]);
    setCitas(c.data ?? []);
    setServicios(s.data ?? []);
    setInsumos(i.data ?? []);
  }, [dia]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const profesionales = useMemo(() => Array.from(new Set(citas.map((c) => c.profesional))), [citas]);
  const nombrePaciente = (id: string): string => pacientes.find((p) => p.id === id)?.nombre ?? "—";

  const crear = async () => {
    if (!f.pacienteId) return toast.error(`Elige el ${voc.paciente.toLowerCase()}.`);
    if (!f.profesional.trim()) return toast.error(`Escribe el ${voc.profesional.toLowerCase()} que atiende.`);
    if (!f.inicio) return toast.error("Elige la fecha y hora.");
    setGuardando(true);
    const { error } = await supabase.from("cl_citas").insert({
      paciente_id: f.pacienteId, profesional: f.profesional.trim(), consultorio: textoN(f.consultorio),
      inicio: new Date(f.inicio).toISOString(), duracion_min: Math.max(Math.round(num(f.duracion)), 5), motivo: textoN(f.motivo),
    });
    setGuardando(false);
    if (error) return toast.error(error.code === "23505" ? "Ese profesional ya tiene una cita a esa hora." : "No se pudo agendar la cita.");
    toast.success("Cita agendada.");
    setF({ ...vacio, profesional: f.profesional, consultorio: f.consultorio });
    void cargar();
  };

  const cambiar = async (c: Cita, estado: string) => {
    const { error } = await supabase.from("cl_citas").update({ estado }).eq("id", c.id);
    if (error) return toast.error(error.message || "No se pudo cambiar el estado.");
    void cargar();
  };

  const agregarLinea = () => {
    const [tipo, id] = eleccion.split(":");
    if (!id || (tipo !== "s" && tipo !== "i")) return toast.error("Elige un servicio o medicamento.");
    if (num(cantidad) <= 0) return toast.error("La cantidad debe ser mayor a cero.");
    const nombre = tipo === "s" ? servicios.find((s) => s.id === id)?.nombre : insumos.find((i) => i.id === id)?.nombre;
    setLineas((l) => [...l, { tipo: tipo === "s" ? "servicio" : "insumo", id, nombre: nombre ?? "", cantidad }]);
    setEleccion("");
    setCantidad("1");
  };

  const precioLinea = (l: LineaNueva): number => {
    const p = l.tipo === "servicio" ? servicios.find((s) => s.id === l.id)?.precio : insumos.find((i) => i.id === l.id)?.precio_venta;
    return (p ?? 0) * num(l.cantidad);
  };

  const finalizar = async (c: Cita) => {
    if (lineas.length === 0) return toast.error("Agrega al menos la consulta o el servicio realizado.");
    const items: Json = lineas.map((l) => ({ tipo: l.tipo, id: l.id, cantidad: num(l.cantidad) }));
    const { error } = await supabase.rpc("cl_finalizar_cita", { p_cita: c.id, p_items: items });
    if (error) return toast.error(error.message || "No se pudo finalizar la cita.");
    toast.success("Cita atendida: pasó a Caja para cobrar.");
    setFinalizando(null);
    setLineas([]);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const visibles = citas.filter((c) => !filtro || c.profesional === filtro);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo={`Agenda por ${voc.profesional.toLowerCase()} y consultorio`} texto="Agenda, atiende y finaliza: al terminar, la consulta y los medicamentos aplicados pasan directo a Caja." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectorPaciente pacientes={pacientes} valor={f.pacienteId} onCambio={(v) => setF((p) => ({ ...p, pacienteId: v }))} etiqueta={voc.paciente} />
          <Campo etiqueta={voc.profesional}><input className={campo} value={f.profesional} onChange={(e) => setF((p) => ({ ...p, profesional: e.target.value }))} /></Campo>
          <Campo etiqueta="Consultorio / sala"><input className={campo} value={f.consultorio} onChange={(e) => setF((p) => ({ ...p, consultorio: e.target.value }))} /></Campo>
          <Campo etiqueta="Fecha y hora"><input type="datetime-local" className={campo} value={f.inicio} onChange={(e) => setF((p) => ({ ...p, inicio: e.target.value }))} /></Campo>
          <Campo etiqueta="Duración (min)"><input className={campo} inputMode="numeric" value={f.duracion} onChange={(e) => setF((p) => ({ ...p, duracion: e.target.value }))} /></Campo>
          <Campo etiqueta="Motivo"><input className={campo} value={f.motivo} onChange={(e) => setF((p) => ({ ...p, motivo: e.target.value }))} /></Campo>
        </div>
        <div><button type="button" className={boton} disabled={guardando} onClick={crear}>{guardando ? "Agendando..." : "Agendar cita"}</button></div>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Día"><input type="date" className={campo} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
        <Campo etiqueta={`Ver por ${voc.profesional.toLowerCase()}`}>
          <select className={campo} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            {profesionales.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </Campo>
      </div>

      <div className="space-y-3">
        {visibles.length === 0 && <p className="text-sm text-muted-foreground">No hay citas para este día.</p>}
        {visibles.map((c) => {
          const abierta = c.estado === "agendada" || c.estado === "en_consulta";
          return (
            <GlassPanel key={c.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{new Date(c.inicio).toLocaleTimeString("es-CO", { timeStyle: "short" })} · {nombrePaciente(c.paciente_id)}</p>
                  <p className="break-words text-xs text-muted-foreground">{c.profesional}{c.consultorio ? ` · ${c.consultorio}` : ""} · {c.duracion_min} min{c.motivo ? ` · ${c.motivo}` : ""}</p>
                </div>
                <span className="rounded-full border border-glass-border px-3 py-1 text-xs text-foreground">{ESTADOS_CITA[c.estado] ?? c.estado}</span>
              </div>
              {abierta && (
                <div className="flex flex-wrap gap-2">
                  {c.estado === "agendada" && <button type="button" className={botonSec} onClick={() => cambiar(c, "en_consulta")}>Pasar a consulta</button>}
                  <button type="button" className={boton} onClick={() => { setFinalizando(finalizando === c.id ? null : c.id); setLineas([]); }}>Finalizar y pasar a Caja</button>
                  <button type="button" className={botonSec} onClick={() => cambiar(c, "no_asistio")}>No asistió</button>
                  <button type="button" className={botonSec} onClick={() => cambiar(c, "cancelada")}>Cancelar</button>
                </div>
              )}
              {finalizando === c.id && (
                <div className="space-y-2 rounded-lg border border-glass-border bg-glass/30 p-3">
                  <div className="grid grid-cols-[1fr_5rem_auto] gap-2">
                    <select className={campo} value={eleccion} onChange={(e) => setEleccion(e.target.value)}>
                      <option value="">Consulta, procedimiento o medicamento...</option>
                      <optgroup label="Servicios">
                        {servicios.map((s) => (<option key={s.id} value={`s:${s.id}`}>{s.nombre} · {dinero(s.precio)}</option>))}
                      </optgroup>
                      <optgroup label="Medicamentos aplicados">
                        {insumos.filter((i) => i.stock > 0).map((i) => (<option key={i.id} value={`i:${i.id}`}>{i.nombre} · {dinero(i.precio_venta)} (hay {i.stock})</option>))}
                      </optgroup>
                    </select>
                    <input className={campo} inputMode="decimal" aria-label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                    <button type="button" className={botonSec} onClick={agregarLinea}><Plus className="h-4 w-4" /></button>
                  </div>
                  {servicios.length === 0 && <p className="text-xs text-muted-foreground">Primero crea la consulta en “Servicios y tarifas”.</p>}
                  {lineas.map((l, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm text-foreground">
                      <span className="min-w-0 break-words">{l.nombre} × {l.cantidad}</span>
                      <span className="flex items-center gap-2">{dinero(precioLinea(l))}
                        <button type="button" aria-label="Quitar" className={botonSec} onClick={() => setLineas((x) => x.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></button>
                      </span>
                    </div>
                  ))}
                  <p className="text-sm text-foreground">Total a cobrar: <strong>{dinero(lineas.reduce((s, l) => s + precioLinea(l), 0))}</strong></p>
                  <button type="button" className={boton} onClick={() => finalizar(c)}>Confirmar y enviar a Caja</button>
                </div>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Cobros (Caja de la clínica)
// ============================================================
export function CajaClinica() {
  const { pacientes } = usarPacientes();
  const [lista, setLista] = useState<Cobro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metodos, setMetodos] = useState<Record<string, string>>({});
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cl_cobros").select("*").order("created_at", { ascending: false }).limit(100);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cobrar = async (c: Cobro) => {
    const { error } = await supabase.rpc("cl_cobrar", { p_cobro: c.id, p_metodo: metodos[c.id] ?? "efectivo" });
    if (error) return toast.error(error.message || "No se pudo cobrar.");
    toast.success("Cobro registrado en Caja y Contabilidad.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  const pendientes = lista.filter((c) => c.estado === "pendiente");
  const cobrados = lista.filter((c) => c.estado === "cobrado");
  const totalHoy = cobrados.filter((c) => (c.cobrado_en ?? "").slice(0, 10) === hoy()).reduce((s, c) => s + c.total, 0);
  const tarjeta = (c: Cobro) => {
    const items = leerLineas(c.items);
    return (
      <GlassPanel key={c.id} className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">{pacientes.find((p) => p.id === c.paciente_id)?.nombre ?? "—"} · {c.profesional}</p>
            <p className="text-xs text-muted-foreground">{fechaHora(c.created_at)}{c.metodo ? ` · ${c.metodo}` : ""}</p>
          </div>
          <p className="text-sm text-foreground"><strong>{dinero(c.total)}</strong></p>
        </div>
        <ul className="text-sm text-muted-foreground">
          {items.map((x, i) => (<li key={i} className="break-words">{x.nombre} × {x.cantidad} · {dinero(x.total)}</li>))}
        </ul>
        {c.estado === "pendiente" && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${campo} w-auto`} value={metodos[c.id] ?? "efectivo"} onChange={(e) => setMetodos((x) => ({ ...x, [c.id]: e.target.value }))}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia / tarjeta</option>
            </select>
            <button type="button" className={boton} onClick={() => cobrar(c)}>Cobrar {dinero(c.total)}</button>
          </div>
        )}
      </GlassPanel>
    );
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Caja de consultas" texto="Aquí llegan las citas finalizadas con la consulta y los medicamentos aplicados. Al cobrar entra a Caja y Contabilidad, y se generan los honorarios del profesional." />
      <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">Por cobrar: <span className="text-foreground">{pendientes.length}</span> · cobrado hoy: <span className="text-foreground">{dinero(totalHoy)}</span></p></GlassPanel>
      <div className="space-y-3">
        {pendientes.length === 0 && <p className="text-sm text-muted-foreground">No hay cobros pendientes.</p>}
        {pendientes.map(tarjeta)}
      </div>
      {cobrados.length > 0 && <p className="text-sm text-muted-foreground">Cobros recientes</p>}
      <div className="space-y-3">{cobrados.slice(0, 20).map(tarjeta)}</div>
    </div>
  );
}

// ============================================================
// Alertas automáticas
// ============================================================
export function AlertasClinica() {
  const voc = usarVoc();
  const { pacientes, cargando } = usarPacientes();
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    void (async () => {
      const [v, h, i] = await Promise.all([
        supabase.from("cl_vacunas").select("*").order("aplicada_en", { ascending: false }).limit(1000),
        supabase.from("cl_historias").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("cl_insumos").select("*").eq("activo", true),
      ]);
      setVacunas(v.data ?? []);
      setHistorias(h.data ?? []);
      setInsumos(i.data ?? []);
      setListo(true);
    })();
  }, []);

  const datos = useMemo(() => {
    const ultimas = new Map<string, Vacuna>();
    for (const v of vacunas) {
      const k = `${v.paciente_id}|${v.tipo}|${v.nombre.toLowerCase()}`;
      if (!ultimas.has(k)) ultimas.set(k, v);
    }
    const proximas = Array.from(ultimas.values())
      .filter((v) => v.proxima_en !== null && diasHasta(v.proxima_en) <= 30)
      .sort((a, b) => (a.proxima_en ?? "").localeCompare(b.proxima_en ?? ""));
    const controles = historias
      .filter((h) => h.control_en !== null && diasHasta(h.control_en) <= 14 && !historias.some((o) => o.paciente_id === h.paciente_id && o.created_at > h.created_at))
      .sort((a, b) => (a.control_en ?? "").localeCompare(b.control_en ?? ""));
    const porVencer = insumos.filter((i) => i.vence_en !== null && diasHasta(i.vence_en) <= 60).sort((a, b) => (a.vence_en ?? "").localeCompare(b.vence_en ?? ""));
    const bajos = insumos.filter((i) => i.minimo > 0 && i.stock <= i.minimo);
    return { proximas, controles, porVencer, bajos };
  }, [vacunas, historias, insumos]);

  if (cargando || !listo) return <Cargando />;
  const pac = (id: string): Paciente | undefined => pacientes.find((p) => p.id === id);
  const aviso = (p: Paciente | undefined, texto: string) => {
    const url = enlaceWhatsapp(p?.duenio_telefono ?? null, `Hola ${p?.duenio_nombre ?? ""}, te escribimos de ${voc.nombreNegocio}: ${texto}`);
    if (!url) return null;
    return <a href={url} target="_blank" rel="noreferrer" className={botonSec}><MessageCircle className="h-4 w-4" /> Avisar</a>;
  };
  const vacioTodo = datos.proximas.length + datos.controles.length + datos.porVencer.length + datos.bajos.length === 0;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Alertas y recordatorios" texto="Vacunas por vencer, controles post-operatorios pendientes y medicamentos próximos a vencer o con poco stock." />
      {vacioTodo && <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">Todo al día: no hay alertas por ahora.</p></GlassPanel>}

      {datos.proximas.length > 0 && <p className="text-sm text-muted-foreground">Vacunas y desparasitaciones próximas o vencidas</p>}
      {datos.proximas.map((v) => {
        const p = pac(v.paciente_id);
        const d = diasHasta(v.proxima_en ?? hoy());
        return (
          <GlassPanel key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="break-words font-medium text-foreground">{p?.nombre ?? "—"} · {v.nombre}</p>
              <p className={`text-xs ${d < 0 ? "text-destructive" : "text-muted-foreground"}`}>{v.proxima_en ? fechaCorta(v.proxima_en) : ""} · {d < 0 ? `vencida hace ${-d} días` : d === 0 ? "es hoy" : `en ${d} días`}</p>
            </div>
            {aviso(p, `a ${p?.nombre ?? ""} le toca ${v.nombre} el ${v.proxima_en ? fechaCorta(v.proxima_en) : ""}. ¿Agendamos?`)}
          </GlassPanel>
        );
      })}

      {datos.controles.length > 0 && <p className="text-sm text-muted-foreground">Controles pendientes (post-operatorios y seguimientos)</p>}
      {datos.controles.map((h) => {
        const p = pac(h.paciente_id);
        const d = diasHasta(h.control_en ?? hoy());
        return (
          <GlassPanel key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="break-words font-medium text-foreground">{p?.nombre ?? "—"} · {h.control_motivo ?? "Control"}</p>
              <p className={`text-xs ${d < 0 ? "text-destructive" : "text-muted-foreground"}`}>{h.control_en ? fechaCorta(h.control_en) : ""} · {d < 0 ? `atrasado ${-d} días` : d === 0 ? "es hoy" : `en ${d} días`}</p>
            </div>
            {aviso(p, `te recordamos el control de ${p?.nombre ?? ""} el ${h.control_en ? fechaCorta(h.control_en) : ""}.`)}
          </GlassPanel>
        );
      })}

      {datos.porVencer.length > 0 && <p className="text-sm text-muted-foreground">Medicamentos e insumos por vencer</p>}
      {datos.porVencer.map((i) => {
        const d = diasHasta(i.vence_en ?? hoy());
        return (
          <GlassPanel key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="break-words font-medium text-foreground">{i.nombre}{i.lote ? ` · lote ${i.lote}` : ""} · hay {i.stock} {i.unidad}</p>
            <p className={`text-sm ${d < 0 ? "text-destructive" : "text-foreground"}`}>{d < 0 ? `Vencido hace ${-d} días` : `Vence en ${d} días`}</p>
          </GlassPanel>
        );
      })}

      {datos.bajos.length > 0 && <p className="text-sm text-muted-foreground">Stock bajo</p>}
      {datos.bajos.map((i) => (
        <GlassPanel key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="break-words font-medium text-foreground">{i.nombre}</p>
          <p className="text-sm text-destructive">Quedan {i.stock} {i.unidad} (mínimo {i.minimo})</p>
        </GlassPanel>
      ))}
    </div>
  );
}

// ============================================================
// Honorarios y comisiones por profesional
// ============================================================
export function ComisionesClinica() {
  const voc = usarVoc();
  const { esAdmin } = usePermisos();
  const [lista, setLista] = useState<Comision[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cl_comisiones").select("*").order("created_at", { ascending: false }).limit(500);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resumen = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of lista) if (c.estado === "pendiente") m.set(c.profesional, (m.get(c.profesional) ?? 0) + c.valor);
    return Array.from(m.entries());
  }, [lista]);

  const liquidar = async (prof: string) => {
    const { error } = await supabase.rpc("cl_liquidar_comisiones", { p_profesional: prof, p_hasta: hoy() });
    if (error) return toast.error(error.message || "No se pudo liquidar.");
    toast.success("Honorarios liquidados y enviados a Contabilidad.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Honorarios y comisiones" texto={`Se calculan solos al cobrar cada consulta, cirugía o procedimiento según el porcentaje de cada servicio. Liquidar los envía a Contabilidad como nómina por pagar.`} />
      <div className="space-y-2">
        {resumen.length === 0 && <p className="text-sm text-muted-foreground">No hay honorarios pendientes de liquidar.</p>}
        {resumen.map(([prof, total]) => (
          <GlassPanel key={prof} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="font-medium text-foreground">{prof}</p>
              <p className="text-sm text-muted-foreground">Pendiente: {dinero(total)}</p>
            </div>
            {esAdmin ? (
              <button type="button" className={boton} onClick={() => liquidar(prof)}>Liquidar {dinero(total)}</button>
            ) : (
              <p className="text-xs text-muted-foreground">Solo el dueño liquida.</p>
            )}
          </GlassPanel>
        ))}
      </div>
      {lista.length > 0 && <p className="text-sm text-muted-foreground">Detalle por {voc.profesional.toLowerCase()}</p>}
      <div className="space-y-2">
        {lista.slice(0, 80).map((c) => (
          <GlassPanel key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-foreground">{c.profesional} · {c.concepto}</p>
              <p className="text-xs text-muted-foreground">{fechaCorta(c.fecha)} · base {dinero(c.base)} · {c.porcentaje}%</p>
            </div>
            <p className="text-sm text-foreground">{dinero(c.valor)} · {c.estado === "pendiente" ? "pendiente" : "liquidada"}</p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { BadgeCheck, Building2, ClipboardList, Copy, ExternalLink, FileUp, Globe, Save, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClasificacionEmpleados } from "@/components/empresa/ClasificacionEmpleados";
import { EVENTO_COTIZAR_SST, clasificarEmpresaPorEmpleados, type DatosCotizarSST } from "@/lib/clasificacion-empresa";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { boton, campo } from "@/components/comercio/ComercioModulos";

/** Tipos de negocio B2B / corporativos donde se muestra el consultor completo. */
const RUBROS_B2B = new Set<string>([
  "profesional", // contabilidad y despachos
  "inmobiliaria",
  "construccion",
  "concesionario",
  "ferreteria",
  "tecnologia",
  "transporte",
  "eventos",
  "taller",
]);

/** ¿Este módulo es la ficha de clientes corporativos / cotizaciones de un negocio B2B? */
export function mostrarConsultorNIT(claveNegocio: string, idModulo: string): boolean {
  const esFicha = idModulo.startsWith("cotizaciones") || idModulo.startsWith("clientes_");
  if (claveNegocio === "salud") return idModulo === "sst_empresas"; // Salud Ocupacional: empresas clientes
  return RUBROS_B2B.has(claveNegocio) && esFicha;
}

const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación oficial de la DIAN (módulo 11). */
export function calcularDV(base: string): number {
  const digitos = base.split("").reverse();
  let suma = 0;
  digitos.forEach((d: string, i: number) => {
    suma += Number(d) * (PESOS[i] ?? 0);
  });
  const r = suma % 11;
  return r > 1 ? 11 - r : r;
}

export type ResultadoNIT = {
  base: string;
  dvIngresado: string | null;
  dvCorrecto: number;
  valido: boolean | null; // null = no se escribió DV para comparar
};

/** Separa el NIT del DV ("900.123.456-7") y calcula el DV correcto. Devuelve null si aún no es un NIT. */
export function analizarNIT(texto: string): ResultadoNIT | null {
  const limpio = texto.trim().replace(/[.\s]/g, "");
  const [parteBase, parteDv] = limpio.split("-");
  const base = (parteBase ?? "").replace(/\D/g, "");
  if (base.length < 6 || base.length > 15) return null;
  const dvIngresado = parteDv !== undefined ? parteDv.replace(/\D/g, "") : null;
  const dvCorrecto = calcularDV(base);
  return {
    base,
    dvIngresado,
    dvCorrecto,
    valido: dvIngresado ? Number(dvIngresado) === dvCorrecto : null,
  };
}

const formatearBase = (b: string) => b.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Veredicto({ r }: { r: ResultadoNIT }) {
  if (r.valido === false) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-amber-300">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> El dígito de verificación no coincide: para {formatearBase(r.base)} debería ser {r.dvCorrecto}.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-emerald-300">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
      {r.valido ? `NIT válido: ${formatearBase(r.base)}-${r.dvCorrecto}` : `Dígito de verificación: ${r.dvCorrecto} (NIT ${formatearBase(r.base)}-${r.dvCorrecto})`}
    </p>
  );
}

type Coincidencia = {
  id: string;
  nombre: string;
  telefono: string;
  correo: string | null;
  documento: string | null;
  digito_verificacion: string | null;
};

type Props = {
  /** "rapido": solo valida el NIT que ya se está escribiendo (modal de Facturación DIAN). "completo": ficha con consulta. */
  modo: "rapido" | "completo";
  /** Solo para el modo rápido: el NIT escrito en el formulario. */
  valor?: string;
  /** Muestra el botón «Cotizar SG-SST según empleados» (solo en Salud Ocupacional). */
  cotizarSST?: boolean;
};

type DatosEmpresa = {
  razonSocial: string;
  estado: string;
  ciiu: string;
  ciudad: string;
  empleados: string;
  direccion: string;
  correo: string;
  telefono: string;
};

const VACIO: DatosEmpresa = { razonSocial: "", estado: "", ciiu: "", ciudad: "", empleados: "", direccion: "", correo: "", telefono: "" };

/** Conjunto de datos abiertos de matrículas mercantiles (RUES) en datos.gov.co. */
const URL_DATOS_ABIERTOS = "https://www.datos.gov.co/resource/c82u-588k.json";

const PORTALES: { nombre: string; url: string }[] = [
  { nombre: "Consulta RUT DIAN", url: "https://muisca.dian.gov.co/WebRutMuisca/DefConsultaEstadoRUT.faces" },
  { nombre: "RUES", url: "https://www.rues.org.co/" },
  { nombre: "Ventanilla Única Empresarial", url: "https://www.vue.gov.co/" },
];

function primero(fila: Record<string, unknown>, claves: string[]): string {
  for (const k of claves) {
    const v = fila[k];
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return "";
}

/** Extrae los datos del RUT a partir del texto plano del PDF. */
function leerTextoRUT(texto: string): { nit: string; datos: DatosEmpresa } {
  const t = texto.replace(/\s+/g, " ");
  const nitM = /Identificaci[oó]n Tributaria[^0-9]{0,80}(\d{6,10})/i.exec(t) ?? /\b(\d{9})\b/.exec(t);
  const razon = /Raz[oó]n social\s*:?\s*(.+?)\s+(?:\d{2}\.|Nombre comercial|Sigla)/i.exec(t);
  const dir = /Direcci[oó]n principal\s*:?\s*(.+?)\s+(?:\d{2}\.|Correo)/i.exec(t);
  const correo = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(t);
  const tel = /Tel[eé]fono\s*1?\s*:?\s*(\d{7,10})/i.exec(t);
  const seccion = /Actividad econ[oó]mica(.{0,400})/i.exec(t);
  const codigos = seccion ? Array.from(new Set(seccion[1]?.match(/\b\d{4}\b/g) ?? [])) : [];
  return {
    nit: nitM?.[1] ?? "",
    datos: {
      ...VACIO,
      razonSocial: (razon?.[1] ?? "").trim(),
      direccion: (dir?.[1] ?? "").trim(),
      correo: correo?.[0] ?? "",
      telefono: tel?.[1] ?? "",
      ciiu: codigos.slice(0, 3).join(", "),
    },
  };
}

export function ConsultorEmpresaNIT({ modo, valor = "", cotizarSST = false }: Props) {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [coincidencias, setCoincidencias] = useState<Coincidencia[] | null>(null);
  const [datos, setDatos] = useState<DatosEmpresa>(VACIO);
  const [consultandoAbiertos, setConsultandoAbiertos] = useState(false);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const refArchivo = useRef<HTMLInputElement | null>(null);

  if (modo === "rapido") {
    const r = analizarNIT(valor);
    return r ? <Veredicto r={r} /> : null;
  }

  const r = analizarNIT(texto);
  const clasif = clasificarEmpresaPorEmpleados(datos.empleados);
  const cotizarSg = () => {
    if (!clasif) return;
    const detalle: DatosCotizarSST = { empleados: clasif.cantidadEmpleados, ciiu: datos.ciiu, nombre: datos.razonSocial, nit: r ? `${r.base}-${r.dvCorrecto}` : "" };
    window.dispatchEvent(new CustomEvent<DatosCotizarSST>(EVENTO_COTIZAR_SST, { detail: detalle }));
    toast.success("Trabajadores y CIIU enviados a Empresas cliente SG-SST.");
  };
  const cambiar = (k: keyof DatosEmpresa, v: string) => setDatos((d: DatosEmpresa) => ({ ...d, [k]: v }));

  const consultarAbiertos = async () => {
    const termino = r ? r.base : datos.razonSocial.trim();
    if (!termino) {
      toast.error("Escribe un NIT o una razón social.");
      return;
    }
    setConsultandoAbiertos(true);
    try {
      const url = `${URL_DATOS_ABIERTOS}?$q=${encodeURIComponent(termino)}&$limit=1`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("http");
      const filas = (await resp.json()) as Record<string, unknown>[];
      const f = filas[0];
      if (!f) {
        toast.info("No se encontró esa empresa en Datos Abiertos. Verifica en DIAN, RUES o VUE.");
        return;
      }
      setDatos((d: DatosEmpresa) => ({
        ...d,
        razonSocial: primero(f, ["razon_social", "razon_social_nombre", "nombre"]) || d.razonSocial,
        estado: primero(f, ["estado_matricula", "estado_de_la_matricula", "estado"]) || d.estado,
        ciiu: primero(f, ["ciiu", "cod_ciiu_act_econ_pri", "codigo_ciiu", "actividad_economica"]) || d.ciiu,
        ciudad: primero(f, ["ciudad", "municipio", "municipio_comercial", "ciudad_comercial"]) || d.ciudad,
        empleados: primero(f, ["empleados", "cantidad_empleados", "personal_total", "numero_empleados"]) || d.empleados,
      }));
      toast.success("Datos autocompletados desde Datos Abiertos.");
    } catch {
      toast.error("No se pudo consultar Datos Abiertos. Usa los portales oficiales.");
    } finally {
      setConsultandoAbiertos(false);
    }
  };

  const abrirPortal = async (p: { nombre: string; url: string }) => {
    if (r) {
      try {
        await navigator.clipboard.writeText(r.base);
        toast.success("NIT copiado, pégalo en el portal");
      } catch {
        toast.error("No se pudo copiar el NIT.");
      }
    } else {
      toast.info("Escribe el NIT para copiarlo antes de abrir el portal.");
    }
    window.open(p.url, "_blank", "noopener,noreferrer");
  };

  const subirPdf = async (archivo: File) => {
    setLeyendoPdf(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const doc = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
      let completo = "";
      for (let i = 1; i <= Math.min(doc.numPages, 4); i++) {
        const pagina = await doc.getPage(i);
        const contenido = await pagina.getTextContent();
        completo += " " + (contenido.items as Array<{ str?: string }>).map((it) => (typeof it.str === "string" ? it.str : "")).join(" ");
      }
      const leido = leerTextoRUT(completo);
      if (!leido.nit && !leido.datos.razonSocial) {
        toast.error("No pude leer datos en ese PDF. ¿Es el RUT original de la DIAN?");
        return;
      }
      if (leido.nit) setTexto(leido.nit);
      setDatos((d: DatosEmpresa) => ({ ...d, ...Object.fromEntries(Object.entries(leido.datos).filter(([, v]) => v)) }));
      toast.success("RUT leído. Revisa los datos antes de guardar.");
    } catch {
      toast.error("No se pudo leer el PDF.");
    } finally {
      setLeyendoPdf(false);
      if (refArchivo.current) refArchivo.current.value = "";
    }
  };

  const guardarCliente = async () => {
    if (!r || !datos.razonSocial.trim()) {
      toast.error("Falta el NIT y la razón social.");
      return;
    }
    setGuardando(true);
    const notas = [
      datos.ciiu && `CIIU: ${datos.ciiu}`,
      datos.estado && `Matrícula: ${datos.estado}`,
      datos.ciudad && `Ciudad: ${datos.ciudad}`,
      datos.empleados && `Empleados: ${datos.empleados}`,
    ]
      .filter(Boolean)
      .join(" · ");
    const { error } = await supabase.from("restaurante_clientes").insert({
      nombre: datos.razonSocial.trim().slice(0, 200),
      telefono: datos.telefono.trim() || "-",
      correo: datos.correo.trim() || null,
      direccion: datos.direccion.trim() || null,
      documento: r.base,
      digito_verificacion: String(r.dvCorrecto),
      notas: notas || null,
    });
    setGuardando(false);
    if (error) {
      toast.error("No se pudo guardar el cliente.");
      return;
    }
    toast.success("Cliente guardado en tu negocio.");
  };

  const consultar = async () => {
    if (!r) {
      toast.error("Escribe un NIT de 6 a 15 dígitos.");
      return;
    }
    setBuscando(true);
    const { data, error } = await supabase
      .from("restaurante_clientes")
      .select("id,nombre,telefono,correo,documento,digito_verificacion")
      .ilike("documento", `${r.base}%`)
      .limit(5);
    setBuscando(false);
    if (error) {
      toast.error("No se pudo consultar tus clientes. Inténtalo de nuevo.");
      return;
    }
    setCoincidencias((data ?? []) as Coincidencia[]);
  };

  const copiar = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(`${r.base}-${r.dvCorrecto}`);
      toast.success("NIT con dígito de verificación copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  return (
    <GlassPanel className="mb-3">
      <div className="mb-2 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Consultor de empresa por NIT</h3>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Escribe el NIT del cliente corporativo para validar su dígito de verificación y ver si ya lo tienes registrado.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${campo} min-w-0 flex-1`}
          inputMode="numeric"
          maxLength={20}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setCoincidencias(null);
          }}
          placeholder="Ej. 900.123.456-7"
        />
        <button type="button" className={boton} onClick={() => void consultar()} disabled={buscando}>
          <Search className="h-4 w-4" /> {buscando ? "Consultando…" : "Consultar"}
        </button>
        {r && (
          <button type="button" aria-label="Copiar NIT con dígito" className={boton} onClick={() => void copiar()}>
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
      {r && (
        <div className="mt-2">
          <Veredicto r={r} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={boton} onClick={() => void consultarAbiertos()} disabled={consultandoAbiertos}>
          <Globe className="h-4 w-4" /> {consultandoAbiertos ? "Consultando…" : "Consultar en Datos Abiertos"}
        </button>
        <button type="button" className={boton} onClick={() => refArchivo.current?.click()} disabled={leyendoPdf}>
          <FileUp className="h-4 w-4" /> {leyendoPdf ? "Leyendo RUT…" : "Subir RUT (PDF)"}
        </button>
        <input
          ref={refArchivo}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subirPdf(f);
          }}
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(
          [
            ["razonSocial", "Razón social"],
            ["estado", "Estado de matrícula"],
            ["ciiu", "Código CIIU"],
            ["ciudad", "Ciudad"],
            ["empleados", "Cantidad de empleados"],
            ["direccion", "Dirección"],
            ["correo", "Correo"],
            ["telefono", "Teléfono"],
          ] as [keyof DatosEmpresa, string][]
        ).map(([k, etiqueta]) => (
          <label key={k} className="block text-xs text-muted-foreground">
            {etiqueta}
            <input className={`${campo} mt-1 w-full`} maxLength={200} value={datos[k]} onChange={(e) => cambiar(k, e.target.value)} />
          </label>
        ))}
      </div>
      {clasif && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ClasificacionEmpleados cantidad={datos.empleados} />
          {cotizarSST && (
            <button type="button" className={boton} onClick={cotizarSg}>
              <ClipboardList className="h-4 w-4" /> Cotizar SG-SST según empleados
            </button>
          )}
        </div>
      )}
      <div className="mt-2">
        <button type="button" className={boton} onClick={() => void guardarCliente()} disabled={guardando}>
          <Save className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar en Clientes"}
        </button>
      </div>
      <div className="mt-3 border-t border-glass-border pt-2">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
          <ShieldCheck className="h-3.5 w-3.5" /> Verificación oficial (copia el NIT y abre el portal)
        </p>
        <div className="flex flex-wrap gap-2">
          {PORTALES.map((p: { nombre: string; url: string }) => (
            <button key={p.nombre} type="button" className={boton} onClick={() => void abrirPortal(p)}>
              <ExternalLink className="h-4 w-4" /> {p.nombre}
            </button>
          ))}
        </div>
      </div>
      {coincidencias && (
        <div className="mt-2 space-y-1.5">
          {coincidencias.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ese NIT aún no está en tus clientes registrados.</p>
          ) : (
            coincidencias.map((c: Coincidencia) => (
              <div key={c.id} className="rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-sm">
                <p className="font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {c.documento}
                  {c.digito_verificacion ? `-${c.digito_verificacion}` : ""} · {c.telefono}
                  {c.correo ? ` · ${c.correo}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </GlassPanel>
  );
}

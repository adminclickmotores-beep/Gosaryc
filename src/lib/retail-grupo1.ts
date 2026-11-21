// Base compartida del Grupo 1 (comercio y retail): campos específicos por tipo de negocio,
// garantías y validaciones. Los datos se guardan en com_productos (owner_id = negocio del usuario).

export type CampoEspecifico = {
  clave: string;
  etiqueta: string;
  ejemplo?: string;
  opciones?: string[];
};

export type PerfilRetail = {
  /** Campos extra que se guardan dentro de «atributos» del producto. */
  campos: CampoEspecifico[];
  /** Pide serial / IMEI por unidad vendida. */
  requiereSerial: boolean;
  /** Días de garantía sugeridos. */
  garantiaDias: number;
  /** Sugiere llevar lotes y vencimientos. */
  lotes: boolean;
};

const BASE: PerfilRetail = { campos: [], requiereSerial: false, garantiaDias: 0, lotes: false };

export const PERFIL_RETAIL: Record<string, PerfilRetail> = {
  tienda: { ...BASE, lotes: true, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "categoria", etiqueta: "Categoría", ejemplo: "Aseo, granos, bebidas" }] },
  supermercado: { ...BASE, lotes: true, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "categoria", etiqueta: "Sección", ejemplo: "Lácteos, aseo, licores" }, { clave: "contenido", etiqueta: "Contenido neto", ejemplo: "500 g" }] },
  ferreteria: { ...BASE, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "medida", etiqueta: "Medida", ejemplo: "1/2 pulgada, 3 m" }, { clave: "material", etiqueta: "Material", ejemplo: "Acero, PVC" }] },
  carniceria: { ...BASE, lotes: true, campos: [{ clave: "corte", etiqueta: "Corte", ejemplo: "Lomo, costilla" }, { clave: "origen", etiqueta: "Origen / proveedor" }, { clave: "refrigerado", etiqueta: "Conservación", opciones: ["Refrigerado", "Congelado", "Ambiente"] }] },
  panaderia: { ...BASE, lotes: true, campos: [{ clave: "categoria", etiqueta: "Categoría", ejemplo: "Pan, torta, galleta" }] },
  moda: { ...BASE, campos: [{ clave: "talla", etiqueta: "Talla", ejemplo: "S, M, L, 32" }, { clave: "color", etiqueta: "Color" }, { clave: "marca", etiqueta: "Marca" }, { clave: "temporada", etiqueta: "Temporada", ejemplo: "2026-1" }] },
  farmacia: { ...BASE, lotes: true, campos: [{ clave: "principio_activo", etiqueta: "Principio activo" }, { clave: "invima", etiqueta: "Registro INVIMA" }, { clave: "laboratorio", etiqueta: "Laboratorio" }, { clave: "conservacion", etiqueta: "Conservación", opciones: ["Ambiente", "Refrigerado"] }] },
  optica: { ...BASE, requiereSerial: false, garantiaDias: 90, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "material", etiqueta: "Material de la montura" }, { clave: "color", etiqueta: "Color" }, { clave: "tratamiento", etiqueta: "Tratamiento del lente", ejemplo: "Antirreflejo, fotocromático" }] },
  papeleria: { ...BASE, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "presentacion", etiqueta: "Presentación", ejemplo: "Resma x 500" }] },
  joyeria: { ...BASE, requiereSerial: true, garantiaDias: 365, campos: [{ clave: "material", etiqueta: "Material", ejemplo: "Oro 18k, plata 925" }, { clave: "peso_g", etiqueta: "Peso (g)" }, { clave: "piedra", etiqueta: "Piedra / quilates" }] },
  licorera: { ...BASE, lotes: true, campos: [{ clave: "grado", etiqueta: "Grado alcohólico (%)" }, { clave: "volumen_ml", etiqueta: "Volumen (ml)" }, { clave: "marca", etiqueta: "Marca" }] },
  celulares: { ...BASE, requiereSerial: true, garantiaDias: 365, campos: [{ clave: "marca", etiqueta: "Marca" }, { clave: "modelo", etiqueta: "Modelo" }, { clave: "almacenamiento", etiqueta: "Almacenamiento", ejemplo: "128 GB" }, { clave: "color", etiqueta: "Color" }, { clave: "condicion", etiqueta: "Condición", opciones: ["Nuevo", "Reacondicionado", "Usado"] }] },
};

export function perfilRetail(tipo: string | null | undefined): PerfilRetail {
  return PERFIL_RETAIL[tipo ?? ""] ?? BASE;
}

/** Limpia los atributos escritos por el usuario: solo claves conocidas, texto corto y sin vacíos. */
export function limpiarAtributos(valores: Record<string, string>, campos: CampoEspecifico[]): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const c of campos) {
    const v = (valores[c.clave] ?? "").replace(/[<>]/g, "").trim().slice(0, 80);
    if (v) salida[c.clave] = v;
  }
  return salida;
}

/** Texto corto con los atributos de un producto para listas y tickets. */
export function resumenAtributos(atributos: unknown, campos: CampoEspecifico[]): string {
  if (!atributos || typeof atributos !== "object") return "";
  const a = atributos as Record<string, unknown>;
  return campos
    .filter((c) => typeof a[c.clave] === "string" && a[c.clave])
    .map((c) => `${c.etiqueta}: ${String(a[c.clave])}`)
    .join(" · ");
}

export function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const ESTADOS_SERIAL = ["disponible", "vendido", "en_garantia", "devuelto"] as const;
export type EstadoSerial = (typeof ESTADOS_SERIAL)[number];
export const ROTULO_SERIAL: Record<EstadoSerial, string> = {
  disponible: "Disponible",
  vendido: "Vendido",
  en_garantia: "En garantía",
  devuelto: "Devuelto",
};

export function serialValido(s: string): boolean {
  return /^[A-Za-z0-9\-_/. ]{3,60}$/.test(s.trim());
}

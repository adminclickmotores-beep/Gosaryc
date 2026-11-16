import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Motor especializado por rubro.
 * Cada tipo de negocio puede definir en la base (esquemas_rubro / esquemas_rubro_campos):
 *  - vocabulario propio (cliente -> Paciente, registro -> Consulta...),
 *  - campos especializados por módulo con validaciones,
 *  - alertas por fecha y cálculos automáticos.
 * Si el rubro no tiene esquema (o la consulta falla) todo vuelve a los respaldos de
 * src/lib/modulos-negocio.ts y src/lib/modulos-config.ts: la pantalla nunca queda vacía ni se rompe.
 */
export type TipoCampoRubro = "text" | "tel" | "email" | "date" | "select" | "number" | "textarea" | "foto" | "archivo";

export type ValidacionCampo = { min?: number; max?: number; patron?: string; mensaje?: string };

export type CampoRubro = {
  modulo: string;
  clave: string;
  etiqueta: string;
  tipo: TipoCampoRubro;
  obligatorio: boolean;
  opciones: string[];
  validacion: ValidacionCampo;
  placeholder?: string;
  ayuda?: string;
};

export type AlertaRubro = { modulo: string; campo: string; dias: number; texto: string };

export type CalculoRubro = {
  modulo: string;
  clave: string;
  etiqueta: string;
  operacion: "porcentaje" | "producto" | "suma" | "resta";
  campos: string[];
  valor?: number;
};

export type EsquemaRubro = {
  tipo: string;
  nombre: string;
  vocabulario: Record<string, string>;
  campos: CampoRubro[];
  alertas: AlertaRubro[];
  calculos: CalculoRubro[];
};

const esObjeto = (j: Json | undefined): j is { [k: string]: Json | undefined } =>
  !!j && typeof j === "object" && !Array.isArray(j);

const texto = (j: Json | undefined): string | undefined => (typeof j === "string" && j.trim() ? j : undefined);
const numero = (j: Json | undefined): number | undefined => (typeof j === "number" && Number.isFinite(j) ? j : undefined);

const leerLista = (j: Json | undefined): Json[] => (Array.isArray(j) ? j : []);

const TIPOS_VALIDOS: TipoCampoRubro[] = ["text", "tel", "email", "date", "select", "number", "textarea", "foto", "archivo"];

const leerVocabulario = (j: Json | undefined): Record<string, string> => {
  const salida: Record<string, string> = {};
  if (!esObjeto(j)) return salida;
  for (const [k, v] of Object.entries(j)) {
    const t = texto(v);
    if (t) salida[k] = t;
  }
  return salida;
};

const leerAlertas = (j: Json | undefined): AlertaRubro[] => {
  const salida: AlertaRubro[] = [];
  for (const x of leerLista(j)) {
    if (!esObjeto(x)) continue;
    const modulo = texto(x.modulo);
    const mensaje = texto(x.texto);
    if (!modulo || !mensaje) continue;
    salida.push({ modulo, campo: texto(x.campo) ?? "fecha", dias: numero(x.dias) ?? 7, texto: mensaje });
  }
  return salida;
};

const OPERACIONES: CalculoRubro["operacion"][] = ["porcentaje", "producto", "suma", "resta"];

const leerCalculos = (j: Json | undefined): CalculoRubro[] => {
  const salida: CalculoRubro[] = [];
  for (const x of leerLista(j)) {
    if (!esObjeto(x)) continue;
    const modulo = texto(x.modulo);
    const clave = texto(x.clave);
    const etiqueta = texto(x.etiqueta);
    const operacion = OPERACIONES.find((o) => o === x.operacion);
    if (!modulo || !clave || !etiqueta || !operacion) continue;
    const campos = leerLista(x.campos).filter((c): c is string => typeof c === "string");
    salida.push({ modulo, clave, etiqueta, operacion, campos, valor: numero(x.valor) });
  }
  return salida;
};

const cache = new Map<string, Promise<EsquemaRubro | null>>();

/** Carga el esquema de un rubro. Devuelve null si no existe o si la consulta falla (se usan los respaldos). */
export function cargarEsquemaRubro(tipo: string): Promise<EsquemaRubro | null> {
  const guardado = cache.get(tipo);
  if (guardado) return guardado;
  const promesa = (async (): Promise<EsquemaRubro | null> => {
    try {
      const [esq, cam] = await Promise.all([
        supabase.from("esquemas_rubro").select("*").eq("tipo_negocio", tipo).eq("activo", true).maybeSingle(),
        supabase.from("esquemas_rubro_campos").select("*").eq("tipo_negocio", tipo).eq("activo", true).order("orden"),
      ]);
      if (esq.error || !esq.data) return null;
      const campos: CampoRubro[] = (cam.data ?? []).map((c) => {
        const val: { [k: string]: Json | undefined } = esObjeto(c.validacion) ? c.validacion : {};
        return {
          modulo: c.modulo,
          clave: c.clave,
          etiqueta: c.etiqueta,
          tipo: TIPOS_VALIDOS.find((t) => t === c.tipo) ?? "text",
          obligatorio: c.obligatorio,
          opciones: leerLista(c.opciones).filter((o): o is string => typeof o === "string"),
          validacion: { min: numero(val.min), max: numero(val.max), patron: texto(val.patron), mensaje: texto(val.mensaje) },
          placeholder: c.placeholder ?? undefined,
          ayuda: c.ayuda ?? undefined,
        };
      });
      return {
        tipo,
        nombre: esq.data.nombre,
        vocabulario: leerVocabulario(esq.data.vocabulario),
        campos,
        alertas: leerAlertas(esq.data.alertas),
        calculos: leerCalculos(esq.data.calculos),
      };
    } catch {
      return null;
    }
  })();
  cache.set(tipo, promesa);
  // Si falló, se permite reintentar en la próxima visita.
  promesa.then((r) => {
    if (!r) cache.delete(tipo);
  });
  return promesa;
}

/** Esquema del rubro actual (null mientras carga o si no tiene: la pantalla usa sus respaldos). */
export function useEsquemaRubro(tipo: string | undefined): EsquemaRubro | null {
  const [esquema, setEsquema] = useState<EsquemaRubro | null>(null);
  useEffect(() => {
    let vivo = true;
    setEsquema(null);
    if (!tipo) return;
    cargarEsquemaRubro(tipo).then((r) => {
      if (vivo) setEsquema(r);
    });
    return () => {
      vivo = false;
    };
  }, [tipo]);
  return esquema;
}

/** Palabra del rubro (ej. "cliente" -> "Paciente"); si no hay, el valor por defecto. */
export const vocabulario = (esq: EsquemaRubro | null, clave: string, porDefecto: string): string =>
  esq?.vocabulario[clave] ?? porDefecto;

/** Campos especializados del módulo que la pantalla sabe capturar (las fotos y archivos se manejan aparte). */
export const camposDelModulo = (esq: EsquemaRubro | null, modulo: string): CampoRubro[] =>
  (esq?.campos ?? []).filter((c) => c.modulo === modulo && c.tipo !== "foto" && c.tipo !== "archivo");

/** Valida los campos especializados. Devuelve el mensaje del primer error o null si todo está bien. */
export function validarCamposRubro(campos: CampoRubro[], valores: Record<string, string>): string | null {
  for (const c of campos) {
    const v = (valores[c.clave] ?? "").trim();
    if (!v) {
      if (c.obligatorio) return `Completa: ${c.etiqueta}.`;
      continue;
    }
    const { min, max, patron, mensaje } = c.validacion;
    if (c.tipo === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) return `${c.etiqueta} debe ser un número.`;
      if (min !== undefined && n < min) return mensaje ?? `${c.etiqueta} no puede ser menor a ${min}.`;
      if (max !== undefined && n > max) return mensaje ?? `${c.etiqueta} no puede ser mayor a ${max}.`;
    } else {
      if (min !== undefined && v.length < min) return mensaje ?? `${c.etiqueta} es muy corto (mínimo ${min} caracteres).`;
      if (max !== undefined && v.length > max) return mensaje ?? `${c.etiqueta} es muy largo (máximo ${max} caracteres).`;
    }
    if (patron) {
      try {
        if (!new RegExp(patron).test(v)) return mensaje ?? `${c.etiqueta} no tiene el formato correcto.`;
      } catch {
        // Patrón mal escrito en el catálogo: se ignora en vez de bloquear al cliente.
      }
    }
  }
  return null;
}

/** Cálculos automáticos del rubro para un registro (monto + campos extra). */
export function calcularRubro(
  esq: EsquemaRubro | null,
  modulo: string,
  monto: number,
  valores: Record<string, string>,
): { clave: string; etiqueta: string; valor: number }[] {
  if (!esq) return [];
  const salida: { clave: string; etiqueta: string; valor: number }[] = [];
  for (const c of esq.calculos) {
    if (c.modulo !== modulo) continue;
    const nums = c.campos.map((k) => (k === "monto" ? monto : Number(valores[k] ?? "")));
    if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) continue;
    let valor: number;
    if (c.operacion === "porcentaje") valor = (nums[0] * (c.valor ?? 0)) / 100;
    else if (c.operacion === "producto") valor = nums.reduce((a, b) => a * b, 1);
    else if (c.operacion === "suma") valor = nums.reduce((a, b) => a + b, 0);
    else valor = nums.slice(1).reduce((a, b) => a - b, nums[0]);
    salida.push({ clave: c.clave, etiqueta: c.etiqueta, valor: Math.round(valor * 100) / 100 });
  }
  return salida;
}

/** Alerta del rubro para un registro: texto si la fecha (propia o de un campo extra) está dentro del plazo. */
export function alertaRubro(
  esq: EsquemaRubro | null,
  modulo: string,
  fecha: string | null,
  datos: Json,
  hoy: string,
): string | null {
  if (!esq || !hoy) return null;
  const extras = esObjeto(datos) ? datos : {};
  for (const a of esq.alertas) {
    if (a.modulo !== modulo) continue;
    const f = a.campo === "fecha" ? fecha : texto(extras[a.campo]) ?? null;
    if (!f) continue;
    const dias = Math.round((new Date(`${f}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86400000);
    if (Number.isFinite(dias) && dias <= a.dias) return a.texto;
  }
  return null;
}

export type CategoriaEmpresaColombia =
  | "Microempresa"
  | "Pequeña Empresa"
  | "Mediana Empresa"
  | "Gran Empresa";

export type ClasificacionEmpresa = {
  cantidadEmpleados: number;
  categoria: CategoriaEmpresaColombia;
};

/** Evento que lleva la cantidad de trabajadores y el CIIU desde el consultor de NIT hasta Empresas cliente SG-SST. */
export const EVENTO_COTIZAR_SST = "gosaryc:cotizar-sst";

export type DatosCotizarSST = {
  empleados: number;
  ciiu: string;
  nombre: string;
  nit: string;
};

/** Estándares mínimos de la Res. 0312 de 2019 según el número de trabajadores. */
export function estandaresSST(empleados: number): number {
  if (empleados <= 10) return 7;
  if (empleados <= 50) return 21;
  return 60;
}

export function normalizarCantidadEmpleados(
  valor: unknown,
): number | null {
  if (typeof valor === "number") {
    return Number.isSafeInteger(valor) && valor >= 1
      ? valor
      : null;
  }

  if (typeof valor !== "string") return null;

  const texto = valor.trim().replace(/\s/g, "");

  const esNumeroValido =
    /^\d+$/.test(texto) ||
    /^\d{1,3}(?:\.\d{3})+$/.test(texto);

  if (!esNumeroValido) return null;

  const cantidad = Number(texto.replace(/\./g, ""));

  return Number.isSafeInteger(cantidad) && cantidad >= 1
    ? cantidad
    : null;
}

export function clasificarEmpresaPorEmpleados(
  valor: unknown,
): ClasificacionEmpresa | null {
  const cantidad = normalizarCantidadEmpleados(valor);

  if (cantidad === null) return null;

  let categoria: CategoriaEmpresaColombia;

  if (cantidad <= 10) {
    categoria = "Microempresa";
  } else if (cantidad <= 50) {
    categoria = "Pequeña Empresa";
  } else if (cantidad <= 200) {
    categoria = "Mediana Empresa";
  } else {
    categoria = "Gran Empresa";
  }

  return {
    cantidadEmpleados: cantidad,
    categoria,
  };
}

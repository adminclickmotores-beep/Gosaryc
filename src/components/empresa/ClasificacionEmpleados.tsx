import { clasificarEmpresaPorEmpleados } from "@/lib/clasificacion-empresa";

type Props = {
  cantidad: number | string | null | undefined;
  className?: string;
};

export function ClasificacionEmpleados({
  cantidad,
  className = "",
}: Props) {
  const resultado = clasificarEmpresaPorEmpleados(cantidad);

  if (!resultado) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ${className}`}
      aria-label={`${resultado.cantidadEmpleados} trabajadores. ${resultado.categoria}`}
    >
      {resultado.cantidadEmpleados.toLocaleString("es-CO")} trabajadores
      <span>·</span>
      {resultado.categoria}
    </span>
  );
}

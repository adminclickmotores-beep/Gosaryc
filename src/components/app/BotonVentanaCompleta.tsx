import { ExternalLink } from "lucide-react";

/** Abre la pantalla actual (opcionalmente una pestaña concreta) en una ventana nueva, a pantalla completa y sin menús. */
export function BotonVentanaCompleta({
  vista,
  texto,
  className = "",
}: {
  vista?: string;
  texto?: string;
  className?: string;
}) {
  const abrir = () => {
    const params = new URLSearchParams();
    if (vista) params.set("vista", vista);
    params.set("ventana", "completa");
    window.open(`${window.location.pathname}?${params.toString()}`, "_blank", "noopener,noreferrer");
  };
  return (
    <button
      type="button"
      onClick={abrir}
      title="Abrir en ventana completa"
      aria-label="Abrir en ventana completa"
      className={`inline-flex items-center justify-center gap-1.5 ${className}`}
    >
      <ExternalLink className="h-4 w-4" />
      {texto}
    </button>
  );
}

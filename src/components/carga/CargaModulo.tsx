import { Loader2 } from "lucide-react";

/** Cargando liviano para módulos diferidos (React.lazy + Suspense). */
export function CargaModulo({ texto = "Cargando módulo…" }: { texto?: string }) {
  return (
    <div className="flex min-h-[30dvh] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>{texto}</span>
    </div>
  );
}

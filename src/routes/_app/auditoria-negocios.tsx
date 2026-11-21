import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { auditoriaNegocios } from "@/lib/auditoria-negocios";

export const Route = createFileRoute("/_app/auditoria-negocios")({
  head: () => ({ meta: [{ title: "Auditoría de negocios" }] }),
  component: AuditoriaNegociosPage,
});

function AuditoriaNegociosPage() {
  const filas = useMemo(() => auditoriaNegocios(), []);
  const dedicados = filas.filter((f) => f.logica === "Dedicada").length;
  const mixtos = filas.filter((f) => f.logica === "Mixta").length;
  const genericos = filas.filter((f) => f.logica === "Plantilla genérica").length;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Auditoría de negocios</h1>
        <p className="text-sm text-muted-foreground">
          {filas.length} negocios configurados: {dedicados} con lógica dedicada, {mixtos} mixtos y {genericos} con plantilla genérica en su núcleo.
        </p>
      </div>
      <GlassPanel className="overflow-x-auto p-3">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Negocio</th>
              <th className="px-2 py-2">Módulos activos</th>
              <th className="px-2 py-2">Dedicados</th>
              <th className="px-2 py-2">Lógica</th>
              <th className="px-2 py-2">Núcleo aún genérico</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-glass-border align-top">
                <td className="px-2 py-2">{f.numero}</td>
                <td className="px-2 py-2 font-medium text-foreground">{f.nombre}</td>
                <td className="px-2 py-2">{f.activos}</td>
                <td className="px-2 py-2">{f.dedicados}</td>
                <td className="px-2 py-2">{f.logica}</td>
                <td className="px-2 py-2 text-xs text-muted-foreground break-words">{f.genericosLista.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}

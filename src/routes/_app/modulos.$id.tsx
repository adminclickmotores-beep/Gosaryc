import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { ModuloOperativo } from "@/components/modulos/ModuloOperativo";
import { InventarioVehiculos } from "@/components/vehiculos/InventarioVehiculos";
import { SeparacionesVehiculos } from "@/components/vehiculos/SeparacionesVehiculos";
import { CajaTurnos } from "@/components/caja/CajaTurnos";
import { ComprasVehiculos } from "@/components/vehiculos/ComprasVehiculos";
import { ConsignacionesVehiculos } from "@/components/vehiculos/ConsignacionesVehiculos";
import { RetomasVehiculos } from "@/components/vehiculos/RetomasVehiculos";
import { SolicitudesCredito } from "@/components/vehiculos/SolicitudesCredito";
import { CotizacionesVehiculos } from "@/components/vehiculos/CotizacionesVehiculos";
import { DocumentosVehiculos } from "@/components/vehiculos/DocumentosVehiculos";
import { VencimientosVehiculos } from "@/components/vehiculos/VencimientosVehiculos";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

export const Route = createFileRoute("/_app/modulos/$id")({
  head: () => ({ meta: [{ title: "Módulo del negocio" }] }),
  component: ModuloPage,
});

function ModuloPage() {
  const { id } = Route.useParams();
  const { negocio, cargando: cargandoNegocio } = useNegocio();
  const { esAdmin, puede, cargando: cargandoPermisos } = usePermisos();

  if (cargandoNegocio || cargandoPermisos) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // El módulo debe existir para el tipo de negocio de esta cuenta (si no, no se abre aunque se escriba la dirección a mano).
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const existeEnTipo = tipo.modulos.some((m) => m.id === id);
  if (!existeEnTipo) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-glass-border bg-glass/30 p-8 text-center">
        <h1 className="font-display text-2xl">Este módulo no existe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu negocio no tiene esta sección. Vuelve al inicio para ver las que sí tienes.
        </p>
        <Link to="/dashboard" className="mt-5 inline-block text-sm text-primary hover:underline">
          Ir al inicio
        </Link>
      </div>
    );
  }

  // Solo el administrador o quien tenga el módulo asignado.
  if (!esAdmin && !puede(id)) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-glass-border bg-glass/30 p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 font-display text-2xl">Sin acceso a esta sección</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu cuenta no tiene permiso para este módulo. Si lo necesitas, pídeselo a quien administra el negocio.
        </p>
      </div>
    );
  }

  if (id === "vehiculos") return <InventarioVehiculos />;
  if (id === "caja_diaria") return <CajaTurnos />;
  if (id === "compras_veh") return <ComprasVehiculos />;
  if (id === "consignaciones_veh") return <ConsignacionesVehiculos />;
  if (id === "vehiculos_usados") return <RetomasVehiculos />;
  if (id === "creditos_veh") return <SolicitudesCredito />;
  if (id === "separaciones_veh") return <SeparacionesVehiculos />;
  if (id === "vencimientos_veh") return <VencimientosVehiculos />;
  if (id === "documentos_veh") return <DocumentosVehiculos />;
  if (id === "cotizaciones_veh") return <CotizacionesVehiculos />;
  return <ModuloOperativo id={id} />;
}

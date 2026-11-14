import { createFileRoute } from "@tanstack/react-router";
import { ModuloOperativo } from "@/components/modulos/ModuloOperativo";
import { InventarioVehiculos } from "@/components/vehiculos/InventarioVehiculos";
import { SeparacionesVehiculos } from "@/components/vehiculos/SeparacionesVehiculos";
import { CajaTurnos } from "@/components/caja/CajaTurnos";
import { RetomasVehiculos } from "@/components/vehiculos/RetomasVehiculos";
import { SolicitudesCredito } from "@/components/vehiculos/SolicitudesCredito";
import { CotizacionesVehiculos } from "@/components/vehiculos/CotizacionesVehiculos";
import { DocumentosVehiculos } from "@/components/vehiculos/DocumentosVehiculos";
import { VencimientosVehiculos } from "@/components/vehiculos/VencimientosVehiculos";

export const Route = createFileRoute("/_app/modulos/$id")({
  head: () => ({ meta: [{ title: "Módulo del negocio" }] }),
  component: ModuloPage,
});

function ModuloPage() {
  const { id } = Route.useParams();
  if (id === "vehiculos") return <InventarioVehiculos />;
  if (id === "caja_diaria") return <CajaTurnos />;
  if (id === "vehiculos_usados") return <RetomasVehiculos />;
  if (id === "creditos_veh") return <SolicitudesCredito />;
  if (id === "separaciones_veh") return <SeparacionesVehiculos />;
  if (id === "vencimientos_veh") return <VencimientosVehiculos />;
  if (id === "documentos_veh") return <DocumentosVehiculos />;
  if (id === "cotizaciones_veh") return <CotizacionesVehiculos />;
  return <ModuloOperativo id={id} />;
}

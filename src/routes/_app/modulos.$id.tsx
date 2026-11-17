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
import { EncargosPan, MermasPan, ProduccionPan, RecetasPan, TurnosPan } from "@/components/panaderia/PanaderiaModulos";
import {
  AgendaClinica,
  AlertasClinica,
  CajaClinica,
  ComisionesClinica,
  HistoriasClinica,
  InsumosClinica,
  PacientesClinica,
  ServiciosClinica,
  VacunasClinica,
} from "@/components/clinica/ClinicaModulos";
import { PosComercial, ProductosComercial } from "@/components/comercio/ComercioModulos";
import { CotizadorFerreteria, DespostesFrescos, LotesComercial } from "@/components/comercio/ComercioEspecial";
import { AgendaBelleza, ComisionesBelleza, FichasBelleza, ServiciosBelleza } from "@/components/belleza/BellezaModulos";
import { CheckinGimnasio, PlanesGimnasio, SociosGimnasio, ValoracionGimnasio } from "@/components/gimnasio/GimnasioModulos";
import { ComisionesTaller, OrdenesTaller, ProyectosMedida, RepuestosTaller } from "@/components/taller/TallerModulos";
import { AgroLotes, ObrasConstructora, PropiedadesInmobiliaria, TransporteManifiestos } from "@/components/medida/MedidaModulos";
import { AcademicoEducacion, ControlFarmacia, EventosSalon, FormulasOptica, HabitacionesHotel, MatriculasEducacion, MatrizModa, PensionesEducacion, ReservasHotel } from "@/components/turismo/TurismoModulos";
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

  if (id === "pan_produccion") return <ProduccionPan />;
  if (id === "pan_recetas") return <RecetasPan />;
  if (id === "pan_mermas") return <MermasPan />;
  if (id === "encargos_tortas") return <EncargosPan />;
  if (id === "pan_turnos") return <TurnosPan />;
  if (id === "com_pos") return <PosComercial />;
  if (id === "com_productos") return <ProductosComercial />;
  if (id === "com_lotes") return <LotesComercial />;
  if (id === "com_cotizador") return <CotizadorFerreteria />;
  if (id === "com_desposte") return <DespostesFrescos />;
  if (id === "bel_agenda") return <AgendaBelleza />;
  if (id === "bel_fichas") return <FichasBelleza />;
  if (id === "bel_servicios") return <ServiciosBelleza />;
  if (id === "bel_comisiones") return <ComisionesBelleza />;
  if (id === "tal_ordenes") return <OrdenesTaller />;
  if (id === "tal_repuestos") return <RepuestosTaller />;
  if (id === "tal_comisiones") return <ComisionesTaller />;
  if (id === "tal_proyectos") return <ProyectosMedida />;
  if (id === "obr_obras") return <ObrasConstructora />;
  if (id === "inm_propiedades") return <PropiedadesInmobiliaria />;
  if (id === "agr_lotes") return <AgroLotes />;
  if (id === "tra_manifiestos") return <TransporteManifiestos />;
  if (id === "hot_habitaciones") return <HabitacionesHotel />;
  if (id === "hot_reservas") return <ReservasHotel />;
  if (id === "edu_matriculas") return <MatriculasEducacion />;
  if (id === "edu_pensiones") return <PensionesEducacion />;
  if (id === "edu_academico") return <AcademicoEducacion />;
  if (id === "mod_matriz") return <MatrizModa />;
  if (id === "far_control") return <ControlFarmacia />;
  if (id === "opt_formulas") return <FormulasOptica />;
  if (id === "eve_eventos") return <EventosSalon />;
  if (id === "gim_checkin") return <CheckinGimnasio />;
  if (id === "gim_socios") return <SociosGimnasio />;
  if (id === "gim_planes") return <PlanesGimnasio />;
  if (id === "gim_valoracion") return <ValoracionGimnasio />;
  if (id === "cl_agenda") return <AgendaClinica />;
  if (id === "cl_pacientes") return <PacientesClinica />;
  if (id === "cl_historias") return <HistoriasClinica />;
  if (id === "cl_vacunas") return <VacunasClinica />;
  if (id === "cl_alertas") return <AlertasClinica />;
  if (id === "cl_caja") return <CajaClinica />;
  if (id === "cl_servicios") return <ServiciosClinica />;
  if (id === "cl_insumos") return <InsumosClinica />;
  if (id === "cl_comisiones") return <ComisionesClinica />;
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, lazy, type ReactElement } from "react";
import { Loader2, Lock } from "lucide-react";
import { ModuloOperativo } from "@/components/modulos/ModuloOperativo";
import { InventarioVehiculos } from "@/components/vehiculos/InventarioVehiculos";
import { SeparacionesVehiculos } from "@/components/vehiculos/SeparacionesVehiculos";
import { ComprasVehiculos } from "@/components/vehiculos/ComprasVehiculos";
import { ConsignacionesVehiculos } from "@/components/vehiculos/ConsignacionesVehiculos";
import { RetomasVehiculos } from "@/components/vehiculos/RetomasVehiculos";
import { SolicitudesCredito } from "@/components/vehiculos/SolicitudesCredito";
import { CotizacionesVehiculos } from "@/components/vehiculos/CotizacionesVehiculos";
import { DocumentosVehiculos } from "@/components/vehiculos/DocumentosVehiculos";
import { VencimientosVehiculos } from "@/components/vehiculos/VencimientosVehiculos";
import { SimuladorFinanciacion } from "@/components/financiacion/SimuladorFinanciacion";
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
import { SerialesGarantia } from "@/components/comercio/SerialesGarantia";
import { CotizadorFerreteria,DespostesFrescos, LotesComercial } from "@/components/comercio/ComercioEspecial";
import { AgendaBelleza, ComisionesBelleza, FichasBelleza, ServiciosBelleza } from "@/components/belleza/BellezaModulos";
import { CheckinGimnasio, PlanesGimnasio, SociosGimnasio, ValoracionGimnasio } from "@/components/gimnasio/GimnasioModulos";
import { ComisionesTaller, OrdenesTaller, ProyectosMedida, RepuestosTaller } from "@/components/taller/TallerModulos";
import { AgroLotes, ObrasConstructora, PropiedadesInmobiliaria, TransporteManifiestos } from "@/components/medida/MedidaModulos";
import { AcademicoEducacion, ControlFarmacia, EventosSalon, FormulasOptica, HabitacionesHotel, MatriculasEducacion, MatrizModa, PensionesEducacion, ReservasHotel } from "@/components/turismo/TurismoModulos";
import { CargaModulo } from "@/components/carga/CargaModulo";
import { AgendaServicios } from "@/components/servicios/AgendaServicios";
import { CuotasCondominio, UnidadesCondominio } from "@/components/condominio/CondominioModulos";
import { PrestamosCobranza, PrestamosCreditos, PrestamosCronograma } from "@/components/prestamos/PrestamosModulos";
import { InsumosTextil, OrdenesConfeccion } from "@/components/textil/TextilModulos";
import { CatalogoArreglos, EncargosFlor, FloresStock } from "@/components/floristeria/FloristeriaModulos";
import { ContratosAlquiler, EntregasAlquiler, FlotaAlquiler, MultasAlquiler, ReservasAlquiler } from "@/components/alquiler/AlquilerModulos";
import { DotacionSeguridad, NovedadesSeguridad, PuestosSeguridad, TurnosSeguridad } from "@/components/seguridad/SeguridadModulos";
import { AnimalesGanaderia, GuiasGanaderia, InsumosGanaderia, ProduccionGanaderia, SanidadGanaderia } from "@/components/ganaderia/GanaderiaModulos";
import { BeneficiariosFundacion, DonacionesFundacion, ProyectosFundacion, VoluntariosFundacion } from "@/components/fundacion/FundacionModulos";
import { AportesIglesia, EventosIglesia, GruposIglesia, MiembrosIglesia, VisitasIglesia } from "@/components/iglesia/IglesiaModulos";
import { AbonadosParqueadero } from "@/components/parqueadero/AbonadosParqueadero";

// Módulos pesados con carga diferida: el panel abre al instante y cada uno
// baja solo cuando se visita (cero lags en la página principal y el login).
const FacturaFiscalLazy = lazy(() =>
  import("@/components/fiscal/FacturaFiscal").then((m) => ({ default: m.FacturaFiscal })),
);
const EmpresasSSTLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.EmpresasSST })),
);
const TrabajadoresEvaluacionesLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.TrabajadoresEvaluaciones })),
);
const ProfesiogramaMatrizLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.ProfesiogramaMatriz })),
);
const EstandaresSSTLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.EstandaresSST })),
);
const VigilanciaAusentismoLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.VigilanciaAusentismo })),
);
const CapacitacionesBrigadasLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.CapacitacionesBrigadas })),
);
const NormativaSSTLazy = lazy(() =>
  import("@/components/sst/SaludOcupacionalModulos").then((m) => ({ default: m.NormativaSST })),
);
const CajaTurnosLazy = lazy(() =>
  import("@/components/caja/CajaTurnos").then((m) => ({ default: m.CajaTurnos })),
);
import { JoyeriaPiezas, LavanderiaOrdenes, LicoreraDomicilios, PapeleriaEncargos, ParqueaderoTurnos, ProfesionalCasos, TecnologiaProyectos } from "@/components/oficios/OficiosModulos";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { ConsultorEmpresaNIT, mostrarConsultorNIT } from "@/components/negocio/ConsultorEmpresaNIT";

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

  const contenido = ((): ReactElement => {
  if (id === "pan_produccion") return <ProduccionPan />;
  if (id === "pan_recetas") return <RecetasPan />;
  if (id === "pan_mermas") return <MermasPan />;
  if (id === "encargos_tortas") return <EncargosPan />;
  if (id === "pan_turnos") return <TurnosPan />;
  if (id === "com_pos") return <PosComercial />;
  if (id === "com_productos") return <ProductosComercial />;
  if (id === "com_lotes") return <LotesComercial />;
  if (id === "com_seriales") return <SerialesGarantia />;
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
  if (id === "lav_ordenes") return <LavanderiaOrdenes />;
  if (id === "sst_empresas") return (<Suspense fallback={<CargaModulo />}><EmpresasSSTLazy /></Suspense>);
  if (id === "sst_evaluaciones") return (<Suspense fallback={<CargaModulo />}><TrabajadoresEvaluacionesLazy /></Suspense>);
  if (id === "sst_profesiograma") return (<Suspense fallback={<CargaModulo />}><ProfesiogramaMatrizLazy /></Suspense>);
  if (id === "sst_estandares") return (<Suspense fallback={<CargaModulo />}><EstandaresSSTLazy /></Suspense>);
  if (id === "sst_sve") return (<Suspense fallback={<CargaModulo />}><VigilanciaAusentismoLazy /></Suspense>);
  if (id === "sst_capacitaciones") return (<Suspense fallback={<CargaModulo />}><CapacitacionesBrigadasLazy /></Suspense>);
  if (id === "sst_normativa") return (<Suspense fallback={<CargaModulo />}><NormativaSSTLazy /></Suspense>);
  if (id === "prof_casos") return <ProfesionalCasos />;
  if (id === "tec_proyectos") return <TecnologiaProyectos />;
  if (id === "pap_encargos") return <PapeleriaEncargos />;
  if (id === "joy_apartados") return <JoyeriaPiezas />;
  if (id === "lic_domicilios") return <LicoreraDomicilios />;
  if (id === "parq_turnos") return <ParqueaderoTurnos />;
  if (id === "agenda_serv" || id === "ordenes_serv_cita") return <AgendaServicios />;
  if (id === "unidades_cond") return <UnidadesCondominio />;
  if (id === "cuotas_cond") return <CuotasCondominio />;
  if (id === "prestamos_reg") return <PrestamosCreditos />;
  if (id === "cronograma_cuotas") return <PrestamosCronograma />;
  if (id === "cobranza_diaria") return <PrestamosCobranza />;
  if (id === "ordenes_confeccion" || id === "cortes_tela") return <OrdenesConfeccion />;
  if (id === "insumos_textil") return <InsumosTextil />;
  if (id === "arreglos_flor") return <CatalogoArreglos />;
  if (id === "encargos_flor") return <EncargosFlor />;
  if (id === "flores_frescas") return <FloresStock />;
  if (id === "flota_alquiler") return <FlotaAlquiler />;
  if (id === "reservas_alquiler") return <ReservasAlquiler />;
  if (id === "contratos_alquiler") return <ContratosAlquiler />;
  if (id === "entregas_alq") return <EntregasAlquiler />;
  if (id === "multas_alquiler") return <MultasAlquiler />;
  if (id === "puestos_seg") return <PuestosSeguridad />;
  if (id === "turnos_seg") return <TurnosSeguridad />;
  if (id === "dotacion_seg") return <DotacionSeguridad />;
  if (id === "novedades_seg") return <NovedadesSeguridad />;
  if (id === "lotes_ganado") return <AnimalesGanaderia />;
  if (id === "produccion_pecuaria") return <ProduccionGanaderia />;
  if (id === "sanidad_pecuaria") return <SanidadGanaderia />;
  if (id === "alimentacion_pecuaria") return <InsumosGanaderia />;
  if (id === "guias_movilizacion") return <GuiasGanaderia />;
  if (id === "donaciones_fund") return <DonacionesFundacion />;
  if (id === "proyectos_fund") return <ProyectosFundacion />;
  if (id === "beneficiarios_fund") return <BeneficiariosFundacion />;
  if (id === "voluntarios_fund") return <VoluntariosFundacion />;
  if (id === "miembros_iglesia") return <MiembrosIglesia />;
  if (id === "aportes_iglesia") return <AportesIglesia />;
  if (id === "eventos_iglesia") return <EventosIglesia />;
  if (id === "grupos_iglesia") return <GruposIglesia />;
  if (id === "visitas_iglesia") return <VisitasIglesia />;
  if (id === "parq_abonados") return <AbonadosParqueadero />;
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
  if (id === "caja_diaria") return (<Suspense fallback={<CargaModulo />}><CajaTurnosLazy /></Suspense>);
  if (id === "compras_veh") return <ComprasVehiculos />;
  if (id === "consignaciones_veh") return <ConsignacionesVehiculos />;
  if (id === "vehiculos_usados") return <RetomasVehiculos />;
  if (id === "creditos_veh") return <SolicitudesCredito />;
  if (id === "separaciones_veh") return <SeparacionesVehiculos />;
  if (id === "vencimientos_veh") return <VencimientosVehiculos />;
  if (id === "documentos_veh") return <DocumentosVehiculos />;
  if (id === "cotizaciones_veh") return <CotizacionesVehiculos />;
  if (id === "financiacion_veh") return <SimuladorFinanciacion tipo="vehiculo" />;
  if (id === "financiacion_agro") return <SimuladorFinanciacion tipo="ganado" />;
  if (id === "facturas" || id.startsWith("facturas_")) return (<Suspense fallback={<CargaModulo texto="Cargando facturación…" />}><FacturaFiscalLazy /></Suspense>);
  return <ModuloOperativo id={id} />;
  })();

  // Consultor de empresa por NIT: solo en la ficha de clientes corporativos / cotizaciones de los rubros B2B.
  if (mostrarConsultorNIT(tipo.clave, id)) {
    return (
      <>
        <ConsultorEmpresaNIT modo="completo" cotizarSST={tipo.clave === "salud"} />
        {contenido}
      </>
    );
  }
  return contenido;
}

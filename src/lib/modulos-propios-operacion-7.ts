import type { FamiliaPropia } from "@/lib/modulos-propios";
import { cta, prov, sel, t, d } from "@/lib/modulos-propios-operacion";

/** Proveedores y cuentas por cobrar propios de los despachos profesionales, la cobranza y la guardería. */
export const PROPIOS_OPERACION_7: Record<string, Record<string, FamiliaPropia>> = {
  prof: {
    proveedores: prov("Proveedores y peritos del despacho", "Peritos, notarías, mensajería, software jurídico y colaboradores externos de cada caso.",
      "Proveedor o colaborador", "Servicio prestado, caso al que se carga y valor", [t("caso", "Caso o cliente al que se carga"), sel("rubro", "Rubro", ["Perito o avalúo", "Notaría y registro", "Mensajería y diligencias", "Software y bases de datos", "Abogado colaborador", "Traducciones", "Papelería y archivo"])]),
    cuentas: cta("Honorarios por cobrar", "Honorarios pactados, abonos recibidos y saldo pendiente de cada cliente y caso.",
      "Cuenta (cliente y caso)", "Honorarios pactados, abonos y fecha de cobro", [t("caso", "Caso o expediente"), t("pactado", "Honorarios pactados (COP)"), sel("modalidad", "Modalidad", ["Cuota litis", "Por hora", "Valor fijo", "Mensualidad"])]),
  },
  prest: {
    proveedores: prov("Fondeadores y proveedores de la cartera", "Socios que fondean la cartera, abogados de cobro, centrales de riesgo y servicios.",
      "Proveedor o fondeador", "Capital recibido, tasa pactada y servicio contratado", [sel("rubro", "Rubro", ["Fondeador o socio", "Abogado de cobro", "Central de riesgo", "Software de cartera", "Notaría y garantías", "Mensajería"]), t("tasa", "Tasa pactada (%)")]),
    cuentas: cta("Cartera en mora y promesas de pago", "Deudores en mora, días de atraso, promesas de pago y gestión de cobro.",
      "Cuenta (deudor y préstamo)", "Cuotas vencidas, días de mora y promesa de pago", [t("prestamo", "Préstamo"), t("dias_mora", "Días de mora"), t("cuotas_vencidas", "Cuotas vencidas"), d("promesa", "Promesa de pago para")]),
  },
  guard: {
    proveedores: prov("Proveedores de la guardería", "Alimentos, material didáctico, aseo, pañales y servicios del jardín.",
      "Proveedor o pedido", "Alimentos, material, aseo y fecha de entrega", [sel("rubro", "Rubro", ["Alimentos y lácteos", "Material didáctico", "Aseo y desinfección", "Pañales y cuidado infantil", "Dotación y mobiliario", "Transporte escolar"])]),
  },
};

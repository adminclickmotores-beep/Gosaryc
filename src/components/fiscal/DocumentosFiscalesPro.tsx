import { useEffect, useMemo, useState } from "react";
import { FileText, Landmark, FileMinus2, ReceiptText, FileCode2, Users, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel, escaparHtml } from "@/lib/exportes";

type Cuenta = Tables<"cuentas_contables">;
type Asiento = Tables<"asientos_contables">;
type Factura = Tables<"fac_emitidas">;
type RegProveedor = Tables<"proveedores_registros">;
type Liq = Tables<"nomina_liquidaciones">;
type Emp = Tables<"nomina_empleados">;

type Props = {
  nombre: string;
  nit: string;
  ciudad: string;
  cuentas: Cuenta[];
  asientos: Asiento[];
  facturas: Factura[];
  provs: RegProveedor[];
  ownerId: string | null;
};

type Sub = "retenciones" | "conciliacion" | "notas" | "soporte" | "nominaxml" | "pila";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full min-w-0 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const boton = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground";
const botonSec = "inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2 text-sm text-foreground";

const redondear = (n: number): number => Math.round(n);
const soloDigitos = (t: string): string => t.replace(/\D/g, "");

const descargarTexto = (nombre: string, contenido: string, tipo: string): void => {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const abrirImpresion = (titulo: string, cuerpo: string): void => {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    descargarTexto(`${titulo}.html`, cuerpo, "text/html");
    toast.info("Tu navegador bloqueó la ventana; descargué el documento para que lo imprimas.");
    return;
  }
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title><style>
body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:13px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:15px}table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{border:1px solid #999;padding:5px 8px;text-align:left}td.n{text-align:right}.pagina{page-break-after:always;padding-bottom:20px}
.firma{margin-top:50px;border-top:1px solid #111;width:260px;padding-top:4px}small{color:#555}
</style></head><body>${cuerpo}<script>window.onload=function(){window.print()}</script></body></html>`,
  );
  w.document.close();
};

const xmlEsc = (t: string | number): string => escaparHtml(String(t));
const hoyISO = (): string => new Date().toISOString().slice(0, 10);

/** ------------------------- Parseo de extracto bancario ------------------------- */
const parseValor = (t: string): number => {
  let s = t.replace(/[^0-9,.\-()]/g, "");
  let neg = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) neg = true;
  s = s.replace(/-/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(s) && !/\.\d{3}/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(/[.,]/g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
};

const parseFecha = (t: string): string => {
  const s = t.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
};

type MovBanco = { fecha: string; descripcion: string; valor: number };
const parseExtracto = (texto: string): MovBanco[] => {
  const salida: MovBanco[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const partes = linea.split(/[;\t]|,(?=\s*[^\d])/).map((p) => p.trim());
    const cols = partes.length >= 3 ? partes : linea.split(",").map((p) => p.trim());
    if (cols.length < 3) continue;
    const fecha = parseFecha(cols[0]);
    if (!fecha) continue;
    const valor = parseValor(cols[cols.length - 1]);
    if (valor === 0) continue;
    salida.push({ fecha, descripcion: cols.slice(1, -1).join(" "), valor });
  }
  return salida;
};

const difDias = (a: string, b: string): number =>
  Math.abs(Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86400000));

/** ------------------------- Tarifas de retención ------------------------- */
const CONCEPTOS_RETE: { clave: string; texto: string; tarifa: number }[] = [
  { clave: "compras", texto: "Compras generales (2,5 %)", tarifa: 2.5 },
  { clave: "servicios", texto: "Servicios generales (4 %)", tarifa: 4 },
  { clave: "honorarios", texto: "Honorarios y comisiones (10 %)", tarifa: 10 },
  { clave: "honorarios11", texto: "Honorarios persona jurídica (11 %)", tarifa: 11 },
  { clave: "arriendos", texto: "Arrendamientos de inmuebles (3,5 %)", tarifa: 3.5 },
  { clave: "transporte", texto: "Transporte de carga (1 %)", tarifa: 1 },
  { clave: "ninguna", texto: "Sin retención (0 %)", tarifa: 0 },
];

const MOTIVOS_NC = [
  { c: "1", t: "Devolución parcial de bienes / no aceptación parcial del servicio" },
  { c: "2", t: "Anulación de factura electrónica" },
  { c: "3", t: "Rebaja o descuento parcial o total" },
  { c: "4", t: "Ajuste de precio" },
  { c: "5", t: "Descuento comercial por pronto pago" },
  { c: "6", t: "Descuento comercial por volumen de ventas" },
];
const MOTIVOS_ND = [
  { c: "1", t: "Intereses" },
  { c: "2", t: "Gastos por cobrar" },
  { c: "3", t: "Cambio del valor" },
  { c: "4", t: "Otros" },
];

/** ------------------------- Componente ------------------------- */
export function DocumentosFiscalesPro({ nombre, nit, ciudad, cuentas, asientos, facturas, provs, ownerId }: Props) {
  const [sub, setSub] = useState<Sub>("retenciones");
  const subs: { c: Sub; t: string; i: typeof FileText }[] = [
    { c: "retenciones", t: "Certificados de retención", i: FileText },
    { c: "conciliacion", t: "Conciliación bancaria", i: Landmark },
    { c: "notas", t: "Nota crédito / débito", i: FileMinus2 },
    { c: "soporte", t: "Documento soporte", i: ReceiptText },
    { c: "nominaxml", t: "XML nómina electrónica", i: FileCode2 },
    { c: "pila", t: "Planilla PILA", i: Users },
  ];
  const nitLimpio = soloDigitos(nit);

  /* ---- Certificados masivos de retención ---- */
  const anio = new Date().getFullYear();
  const [anioCert, setAnioCert] = useState(String(anio));
  const [ajustes, setAjustes] = useState<Record<string, { nit: string; concepto: string }>>({});
  const [conReteIva, setConReteIva] = useState(false);
  const [reteIcaMil, setReteIcaMil] = useState("0");

  const proveedoresCert = useMemo(() => {
    const mapa = new Map<string, { nombre: string; base: number; nitReg: string }>();
    for (const p of provs) {
      if (!p.created_at.startsWith(anioCert)) continue;
      const clave = p.titulo.trim().toLowerCase();
      const datos = (p.datos ?? {}) as Record<string, unknown>;
      const nitReg = typeof datos.nit === "string" ? datos.nit : typeof datos.documento === "string" ? datos.documento : "";
      const previo = mapa.get(clave);
      if (previo) previo.base += Number(p.monto) || 0;
      else mapa.set(clave, { nombre: p.titulo, base: Number(p.monto) || 0, nitReg });
    }
    return Array.from(mapa.entries()).map(([clave, v]) => {
      const aj = ajustes[clave] ?? { nit: v.nitReg, concepto: "compras" };
      const tarifa = CONCEPTOS_RETE.find((c) => c.clave === aj.concepto)?.tarifa ?? 0;
      const rf = redondear((v.base * tarifa) / 100);
      const ri = conReteIva ? redondear(v.base * 0.19 * 0.15) : 0;
      const rc = redondear((v.base * (Number(reteIcaMil) || 0)) / 1000);
      return { clave, nombre: v.nombre, base: v.base, nit: aj.nit, concepto: aj.concepto, tarifa, rf, ri, rc };
    });
  }, [provs, anioCert, ajustes, conReteIva, reteIcaMil]);

  const cambiarAjuste = (clave: string, parcial: Partial<{ nit: string; concepto: string }>): void => {
    setAjustes((a) => ({ ...a, [clave]: { nit: a[clave]?.nit ?? "", concepto: a[clave]?.concepto ?? "compras", ...parcial } }));
  };

  const certificadosHtml = (filas: typeof proveedoresCert): string =>
    filas
      .map(
        (f) => `<div class="pagina">
<h1>Certificado de retenciones practicadas — año gravable ${escaparHtml(anioCert)}</h1>
<small>Art. 381 del Estatuto Tributario</small>
<h2>Agente retenedor</h2>
<p>${escaparHtml(nombre)} · NIT ${escaparHtml(nit || "—")} · ${escaparHtml(ciudad)}</p>
<h2>Beneficiario del pago</h2>
<p>${escaparHtml(f.nombre)} · NIT/CC ${escaparHtml(f.nit || "—")}</p>
<table><tr><th>Concepto</th><th>Base</th><th>Tarifa</th><th>Valor retenido</th></tr>
<tr><td>Retención en la fuente — ${escaparHtml(CONCEPTOS_RETE.find((c) => c.clave === f.concepto)?.texto ?? "")}</td><td class="n">${dinero(f.base)}</td><td class="n">${f.tarifa} %</td><td class="n">${dinero(f.rf)}</td></tr>
${f.ri > 0 ? `<tr><td>ReteIVA (15 % del IVA)</td><td class="n">${dinero(f.base)}</td><td class="n">15 %</td><td class="n">${dinero(f.ri)}</td></tr>` : ""}
${f.rc > 0 ? `<tr><td>ReteICA</td><td class="n">${dinero(f.base)}</td><td class="n">${escaparHtml(reteIcaMil)} ‰</td><td class="n">${dinero(f.rc)}</td></tr>` : ""}
<tr><th colspan="3">Total retenido</th><th class="n">${dinero(f.rf + f.ri + f.rc)}</th></tr></table>
<p>Ciudad donde se consignó la retención: ${escaparHtml(ciudad)}. Expedido el ${hoyISO()}.</p>
<div class="firma">Firma del agente retenedor</div></div>`,
      )
      .join("");

  const generarCertificados = (): void => {
    const filas = proveedoresCert.filter((f) => f.rf + f.ri + f.rc > 0);
    if (filas.length === 0) return void toast.error("No hay proveedores con retención en ese año. Revisa el concepto de cada uno.");
    abrirImpresion(`Certificados de retención ${anioCert}`, certificadosHtml(filas));
    toast.success(`${filas.length} certificados generados en un solo documento.`);
  };

  /* ---- Conciliación bancaria ---- */
  const [prefijoBanco, setPrefijoBanco] = useState("1110");
  const [textoExtracto, setTextoExtracto] = useState("");
  const [tolerancia, setTolerancia] = useState("3");
  const [resultadoConc, setResultadoConc] = useState<{
    conciliados: { f: string; d: string; v: number; fl: string }[];
    soloBanco: MovBanco[];
    soloLibros: { fecha: string; concepto: string; valor: number }[];
  } | null>(null);

  const conciliar = (): void => {
    const extracto = parseExtracto(textoExtracto);
    if (extracto.length === 0) return void toast.error("No pude leer movimientos. Usa el formato: fecha;descripción;valor");
    const ids = new Set(cuentas.filter((c) => c.codigo.startsWith(prefijoBanco)).map((c) => c.id));
    const libros = asientos
      .filter((a) => ids.has(a.cuenta_id))
      .map((a) => ({ fecha: a.fecha.slice(0, 10), concepto: a.concepto, valor: (Number(a.debe) || 0) - (Number(a.haber) || 0), usado: false }));
    const tol = Number(tolerancia) || 0;
    const conciliados: { f: string; d: string; v: number; fl: string }[] = [];
    const soloBanco: MovBanco[] = [];
    for (const m of extracto) {
      const idx = libros.findIndex((l) => !l.usado && Math.abs(l.valor - m.valor) < 1 && difDias(l.fecha, m.fecha) <= tol);
      if (idx >= 0) {
        libros[idx].usado = true;
        conciliados.push({ f: m.fecha, d: m.descripcion, v: m.valor, fl: libros[idx].fecha });
      } else soloBanco.push(m);
    }
    setResultadoConc({ conciliados, soloBanco, soloLibros: libros.filter((l) => !l.usado) });
  };

  const leerArchivoExtracto = (f: File | undefined): void => {
    if (!f) return;
    void f.text().then((t) => setTextoExtracto(t));
  };

  const exportarConciliacion = (): void => {
    if (!resultadoConc) return;
    const filas: (string | number)[][] = [
      ...resultadoConc.conciliados.map((c): (string | number)[] => ["Conciliado", c.f, c.d, c.v, c.fl]),
      ...resultadoConc.soloBanco.map((c): (string | number)[] => ["Solo en banco (falta en libros)", c.fecha, c.descripcion, c.valor, ""]),
      ...resultadoConc.soloLibros.map((c): (string | number)[] => ["Solo en libros (no aparece en banco)", c.fecha, c.concepto, c.valor, c.fecha]),
    ];
    exportarExcel(`conciliacion-bancaria-${hoyISO()}`, ["Estado", "Fecha banco", "Descripción", "Valor", "Fecha libros"], filas);
  };

  /* ---- Notas crédito / débito ---- */
  const [tipoNota, setTipoNota] = useState<"credito" | "debito">("credito");
  const [facturaId, setFacturaId] = useState("");
  const [motivoNota, setMotivoNota] = useState("2");
  const [valorNota, setValorNota] = useState("");
  const [prefNota, setPrefNota] = useState("NC");
  const [numNota, setNumNota] = useState("1");
  const [descNota, setDescNota] = useState("");
  const facturaSel = facturas.find((f) => f.id === facturaId) ?? null;

  const calcNota = (): { base: number; iva: number; total: number; num: string } | null => {
    if (!facturaSel) return null;
    const total = Number(valorNota) || Number(facturaSel.total);
    const tasa = Number(facturaSel.subtotal) > 0 ? Number(facturaSel.iva) / Number(facturaSel.subtotal) : 0;
    const base = redondear(total / (1 + tasa));
    return { base, iva: total - base, total, num: `${prefNota}${numNota}` };
  };

  const xmlNota = (): string => {
    const c = calcNota();
    if (!c || !facturaSel) return "";
    const credito = tipoNota === "credito";
    const raiz = credito ? "CreditNote" : "DebitNote";
    const lineaTag = credito ? "CreditNoteLine" : "DebitNoteLine";
    const cantTag = credito ? "CreditedQuantity" : "DebitedQuantity";
    return `<?xml version="1.0" encoding="UTF-8"?>
<${raiz} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${raiz}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${credito ? "20" : "30"}</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: ${credito ? "Nota Crédito de Factura Electrónica de Venta" : "Nota Débito de Factura Electrónica de Venta"}</cbc:ProfileID>
  <cbc:ID>${xmlEsc(c.num)}</cbc:ID>
  <cbc:IssueDate>${hoyISO()}</cbc:IssueDate>
  <cbc:${credito ? "CreditNoteTypeCode" : "DebitNoteTypeCode"}>${credito ? "91" : "92"}</cbc:${credito ? "CreditNoteTypeCode" : "DebitNoteTypeCode"}>
  <cbc:Note>${xmlEsc(descNota || "Sin observaciones")}</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:DiscrepancyResponse><cbc:ReferenceID>${xmlEsc(facturaSel.numero)}</cbc:ReferenceID><cbc:ResponseCode>${xmlEsc(motivoNota)}</cbc:ResponseCode></cac:DiscrepancyResponse>
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${xmlEsc(facturaSel.numero)}</cbc:ID>${facturaSel.dian_cufe ? `<cbc:UUID schemeName="CUFE-SHA384">${xmlEsc(facturaSel.dian_cufe)}</cbc:UUID>` : ""}<cbc:IssueDate>${xmlEsc(facturaSel.created_at.slice(0, 10))}</cbc:IssueDate></cac:InvoiceDocumentReference></cac:BillingReference>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(nombre)}</cbc:RegistrationName><cbc:CompanyID>${xmlEsc(nitLimpio)}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(facturaSel.cliente)}</cbc:RegistrationName><cbc:CompanyID>${xmlEsc(facturaSel.cliente_doc ?? "")}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="COP">${c.iva}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="COP">${c.base}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="COP">${c.base}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="COP">${c.total}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="COP">${c.total}</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:${lineaTag}><cbc:ID>1</cbc:ID><cbc:${cantTag} unitCode="EA">1</cbc:${cantTag}><cbc:LineExtensionAmount currencyID="COP">${c.base}</cbc:LineExtensionAmount><cac:Item><cbc:Description>${xmlEsc(descNota || "Ajuste a factura")}</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount currencyID="COP">${c.base}</cbc:PriceAmount></cac:Price></cac:${lineaTag}>
</${raiz}>`;
  };

  const htmlNota = (): string => {
    const c = calcNota();
    if (!c || !facturaSel) return "";
    const motivos = tipoNota === "credito" ? MOTIVOS_NC : MOTIVOS_ND;
    return `<h1>Nota ${tipoNota === "credito" ? "crédito" : "débito"} N.º ${escaparHtml(c.num)}</h1>
<p>${escaparHtml(nombre)} · NIT ${escaparHtml(nit || "—")} · Fecha ${hoyISO()}</p>
<p>Cliente: ${escaparHtml(facturaSel.cliente)} · Documento ${escaparHtml(facturaSel.cliente_doc ?? "—")}</p>
<p>Factura afectada: N.º ${escaparHtml(String(facturaSel.numero))}${facturaSel.dian_cufe ? ` · CUFE ${escaparHtml(facturaSel.dian_cufe)}` : ""}</p>
<p>Motivo: ${escaparHtml(motivos.find((m) => m.c === motivoNota)?.t ?? "")}</p>
<p>${escaparHtml(descNota)}</p>
<table><tr><th>Base</th><th>IVA</th><th>Total de la nota</th></tr><tr><td class="n">${dinero(c.base)}</td><td class="n">${dinero(c.iva)}</td><td class="n">${dinero(c.total)}</td></tr></table>`;
  };

  /* ---- Documento soporte ---- */
  const [dsProv, setDsProv] = useState("");
  const [dsNombre, setDsNombre] = useState("");
  const [dsDoc, setDsDoc] = useState("");
  const [dsConcepto, setDsConcepto] = useState("");
  const [dsValor, setDsValor] = useState("");
  const [dsIva, setDsIva] = useState("0");
  const [dsRete, setDsRete] = useState("compras");
  const [dsNum, setDsNum] = useState("1");

  useEffect(() => {
    const p = provs.find((x) => x.id === dsProv);
    if (!p) return;
    setDsNombre(p.titulo);
    setDsValor(String(Math.round(Number(p.monto) || 0)));
    setDsConcepto(p.detalle ?? "");
    const datos = (p.datos ?? {}) as Record<string, unknown>;
    if (typeof datos.nit === "string") setDsDoc(datos.nit);
  }, [dsProv, provs]);

  const calcSoporte = (): { base: number; iva: number; rete: number; neto: number } => {
    const base = Number(dsValor) || 0;
    const iva = redondear((base * (Number(dsIva) || 0)) / 100);
    const tar = CONCEPTOS_RETE.find((c) => c.clave === dsRete)?.tarifa ?? 0;
    const rete = redondear((base * tar) / 100);
    return { base, iva, rete, neto: base + iva - rete };
  };

  const xmlSoporte = (): string => {
    const c = calcSoporte();
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Documento soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura de venta o documento equivalente</cbc:ProfileID>
  <cbc:ID>DS${xmlEsc(dsNum)}</cbc:ID>
  <cbc:IssueDate>${hoyISO()}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>05</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(dsNombre)}</cbc:RegistrationName><cbc:CompanyID>${xmlEsc(soloDigitos(dsDoc))}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(nombre)}</cbc:RegistrationName><cbc:CompanyID>${xmlEsc(nitLimpio)}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  <cac:WithholdingTaxTotal><cbc:TaxAmount currencyID="COP">${c.rete}</cbc:TaxAmount></cac:WithholdingTaxTotal>
  <cac:TaxTotal><cbc:TaxAmount currencyID="COP">${c.iva}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="COP">${c.base}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="COP">${c.base}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="COP">${c.base + c.iva}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="COP">${c.neto}</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="COP">${c.base}</cbc:LineExtensionAmount><cac:Item><cbc:Description>${xmlEsc(dsConcepto || "Adquisición de bienes o servicios")}</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount currencyID="COP">${c.base}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;
  };

  const htmlSoporte = (): string => {
    const c = calcSoporte();
    return `<h1>Documento soporte en adquisiciones a no obligados a facturar N.º DS${escaparHtml(dsNum)}</h1>
<p>Adquirente: ${escaparHtml(nombre)} · NIT ${escaparHtml(nit || "—")} · Fecha ${hoyISO()}</p>
<p>Vendedor: ${escaparHtml(dsNombre)} · Documento ${escaparHtml(dsDoc || "—")}</p>
<table><tr><th>Concepto</th><th>Valor</th></tr>
<tr><td>${escaparHtml(dsConcepto || "Adquisición de bienes o servicios")}</td><td class="n">${dinero(c.base)}</td></tr>
<tr><td>IVA</td><td class="n">${dinero(c.iva)}</td></tr>
<tr><td>Retención en la fuente</td><td class="n">- ${dinero(c.rete)}</td></tr>
<tr><th>Neto a pagar</th><th class="n">${dinero(c.neto)}</th></tr></table>`;
  };

  /* ---- Nómina: liquidaciones y empleados ---- */
  const [liqs, setLiqs] = useState<Liq[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [periodo, setPeriodo] = useState(hoyISO().slice(0, 7));

  useEffect(() => {
    let vivo = true;
    void (async () => {
      let ql = supabase.from("nomina_liquidaciones").select("*").order("periodo_fin", { ascending: false }).limit(1000);
      let qe = supabase.from("nomina_empleados").select("*").limit(500);
      if (ownerId) {
        ql = ql.eq("owner_id", ownerId);
        qe = qe.eq("owner_id", ownerId);
      }
      const [l, e] = await Promise.all([ql, qe]);
      if (!vivo) return;
      setLiqs(l.data ?? []);
      setEmps(e.data ?? []);
    })();
    return () => {
      vivo = false;
    };
  }, [ownerId]);

  const liqsPeriodo = useMemo(() => liqs.filter((l) => l.periodo_fin.startsWith(periodo)), [liqs, periodo]);

  const generarXmlNomina = (): void => {
    if (liqsPeriodo.length === 0) return void toast.error("No hay liquidaciones de nómina en ese mes.");
    const cuerpo = liqsPeriodo
      .map((l, i) => {
        const emp = emps.find((e) => e.id === l.empleado_id);
        const devengado = Number(l.devengado) || 0;
        const ded = Number(l.descuentos) || 0;
        const salud = redondear(ded / 2);
        const pension = ded - salud;
        return `  <NominaIndividual>
    <Periodo FechaIngreso="${xmlEsc(emp?.fecha_ingreso ?? "")}" FechaLiquidacionInicio="${xmlEsc(l.periodo_inicio)}" FechaLiquidacionFin="${xmlEsc(l.periodo_fin)}" TiempoLaborado="${xmlEsc(l.dias)}" FechaGen="${hoyISO()}"/>
    <NumeroSecuenciaXML Prefijo="NIE" Consecutivo="${i + 1}" Numero="NIE${i + 1}"/>
    <Empleador RazonSocial="${xmlEsc(nombre)}" NIT="${xmlEsc(nitLimpio.slice(0, -1) || nitLimpio)}" DV="${xmlEsc(nitLimpio.slice(-1))}" Pais="CO"/>
    <Trabajador NumeroDocumento="${xmlEsc(emp?.documento ?? "")}" NombreCompleto="${xmlEsc(l.empleado_nombre)}" Cargo="${xmlEsc(emp?.cargo ?? "")}" SalarioIntegral="false"/>
    <Pago Forma="1" Metodo="42"/>
    <Devengados>
      <Basico DiasTrabajados="${xmlEsc(l.dias)}" SueldoTrabajado="${redondear(Number(l.salario_base) * (Number(l.dias) / 30))}"/>
      <AuxilioTransporte>${redondear(Number(l.auxilio) || 0)}</AuxilioTransporte>
      <HorasExtras>${redondear(Number(l.extras) || 0)}</HorasExtras>
    </Devengados>
    <Deducciones>
      <Salud Porcentaje="4" Deduccion="${salud}"/>
      <FondoPension Porcentaje="4" Deduccion="${pension}"/>
    </Deducciones>
    <DevengadosTotal>${redondear(devengado)}</DevengadosTotal>
    <DeduccionesTotal>${redondear(ded)}</DeduccionesTotal>
    <ComprobanteTotal>${redondear(Number(l.neto) || 0)}</ComprobanteTotal>
  </NominaIndividual>`;
      })
      .join("\n");
    descargarTexto(`nomina-electronica-${periodo}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<NominaIndividualLote>\n${cuerpo}\n</NominaIndividualLote>`, "application/xml");
    toast.success(`XML con ${liqsPeriodo.length} documentos de nómina descargado.`);
  };

  /* ---- PILA ---- */
  const [smmlv, setSmmlv] = useState("1750905");
  const filasPila = useMemo(() => {
    const salarioMin = Number(smmlv) || 0;
    const porEmp = new Map<string, { dias: number; ibc: number }>();
    for (const l of liqsPeriodo) {
      const clave = l.empleado_id ?? l.empleado_nombre;
      const previo = porEmp.get(clave) ?? { dias: 0, ibc: 0 };
      previo.dias += Number(l.dias) || 0;
      previo.ibc += (Number(l.salario_base) || 0) * ((Number(l.dias) || 0) / 30) + (Number(l.extras) || 0);
      porEmp.set(clave, previo);
    }
    return Array.from(porEmp.entries()).map(([clave, v]) => {
      const emp = emps.find((e) => e.id === clave);
      const liq = liqsPeriodo.find((l) => (l.empleado_id ?? l.empleado_nombre) === clave);
      const dias = Math.min(30, v.dias);
      const ibc = Math.max(redondear(v.ibc), redondear((salarioMin * dias) / 30));
      const exo = emp?.exonerado ?? false;
      const arlPct = Number(emp?.tarifa_arl) || 0.522;
      return {
        doc: emp?.documento ?? "",
        nombre: emp?.nombre ?? liq?.empleado_nombre ?? "",
        eps: emp?.eps ?? "",
        afp: emp?.fondo_pension ?? "",
        dias,
        ibc,
        saludEmp: redondear(ibc * 0.04),
        saludEmpl: exo ? 0 : redondear(ibc * 0.085),
        pensionEmp: redondear(ibc * 0.04),
        pensionEmpl: redondear(ibc * 0.12),
        arl: redondear((ibc * arlPct) / 100),
        caja: redondear(ibc * 0.04),
        sena: exo ? 0 : redondear(ibc * 0.02),
        icbf: exo ? 0 : redondear(ibc * 0.03),
      };
    });
  }, [liqsPeriodo, emps, smmlv]);

  const totalPila = filasPila.reduce(
    (t, f) => t + f.saludEmp + f.saludEmpl + f.pensionEmp + f.pensionEmpl + f.arl + f.caja + f.sena + f.icbf,
    0,
  );

  const exportarPila = (): void => {
    if (filasPila.length === 0) return void toast.error("No hay liquidaciones de nómina en ese mes.");
    exportarExcel(
      `planilla-pila-${periodo}`,
      ["Documento", "Nombre", "EPS", "AFP", "Días", "IBC", "Salud empleado 4%", "Salud empleador 8,5%", "Pensión empleado 4%", "Pensión empleador 12%", "ARL", "Caja 4%", "SENA 2%", "ICBF 3%"],
      filasPila.map((f): (string | number)[] => [f.doc, f.nombre, f.eps, f.afp, f.dias, f.ibc, f.saludEmp, f.saludEmpl, f.pensionEmp, f.pensionEmpl, f.arl, f.caja, f.sena, f.icbf]),
    );
  };

  const csvPila = (): void => {
    if (filasPila.length === 0) return void toast.error("No hay liquidaciones de nómina en ese mes.");
    const enc = "Documento;Nombre;EPS;AFP;Dias;IBC;Salud;Pension;ARL;Caja;SENA;ICBF";
    const lineas = filasPila.map((f) =>
      [f.doc, f.nombre, f.eps, f.afp, f.dias, f.ibc, f.saludEmp + f.saludEmpl, f.pensionEmp + f.pensionEmpl, f.arl, f.caja, f.sena, f.icbf].join(";"),
    );
    descargarTexto(`pila-${periodo}.csv`, `${enc}\n${lineas.join("\n")}`, "text/csv");
  };

  /* ------------------------- Render ------------------------- */
  return (
    <GlassPanel className="space-y-4 p-4">
      <div>
        <p className="font-display text-lg text-foreground">Documentos fiscales y de nómina</p>
        <p className="text-xs text-muted-foreground">
          Certificados de retención, conciliación bancaria, notas crédito y débito, documento soporte, XML de nómina electrónica y planilla PILA. Son borradores listos para enviar a tu proveedor tecnológico o contador: confírmalos antes de transmitirlos a la DIAN o a la UGPP.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {subs.map((s) => (
          <button
            key={s.c}
            onClick={() => setSub(s.c)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${sub === s.c ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            <s.i className="h-4 w-4" /> {s.t}
          </button>
        ))}
      </div>

      {sub === "retenciones" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Año gravable
              <input className={campo} inputMode="numeric" value={anioCert} onChange={(e) => setAnioCert(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              ReteICA (por mil, 0 = no aplica)
              <input className={campo} inputMode="decimal" value={reteIcaMil} onChange={(e) => setReteIcaMil(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 pt-5 text-sm text-foreground">
              <input type="checkbox" checked={conReteIva} onChange={(e) => setConReteIva(e.target.checked)} /> Incluir ReteIVA (15 % del IVA 19 %)
            </label>
          </div>
          <div className="space-y-2">
            {proveedoresCert.map((f) => (
              <div key={f.clave} className="grid gap-2 rounded-lg border border-glass-border p-3 sm:grid-cols-5">
                <p className="text-sm text-foreground sm:col-span-2">
                  {f.nombre}
                  <span className="block text-xs text-muted-foreground">Base {dinero(f.base)}</span>
                </p>
                <input className={campo} placeholder="NIT / CC" value={f.nit} onChange={(e) => cambiarAjuste(f.clave, { nit: e.target.value })} />
                <select className={campo} value={f.concepto} onChange={(e) => cambiarAjuste(f.clave, { concepto: e.target.value })}>
                  {CONCEPTOS_RETE.map((c) => (
                    <option key={c.clave} value={c.clave}>{c.texto}</option>
                  ))}
                </select>
                <p className="text-sm text-foreground">Retenido: {dinero(f.rf + f.ri + f.rc)}</p>
              </div>
            ))}
            {proveedoresCert.length === 0 && <p className="text-sm text-muted-foreground">No hay compras a proveedores registradas en {anioCert}.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={boton} onClick={generarCertificados}><Printer className="h-4 w-4" /> Generar todos los certificados (PDF)</button>
            <button
              className={botonSec}
              onClick={() =>
                exportarExcel(
                  `certificados-retencion-${anioCert}`,
                  ["Proveedor", "NIT", "Concepto", "Base", "Tarifa %", "Retefuente", "ReteIVA", "ReteICA"],
                  proveedoresCert.map((f): (string | number)[] => [f.nombre, f.nit, f.concepto, f.base, f.tarifa, f.rf, f.ri, f.rc]),
                )
              }
            >
              <Download className="h-4 w-4" /> Excel
            </button>
          </div>
        </div>
      )}

      {sub === "conciliacion" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Cuenta de bancos (código inicia con)
              <input className={campo} value={prefijoBanco} onChange={(e) => setPrefijoBanco(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Tolerancia de fechas (días)
              <input className={campo} inputMode="numeric" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Subir extracto (CSV o TXT)
              <input className={campo} type="file" accept=".csv,.txt" onChange={(e) => leerArchivoExtracto(e.target.files?.[0])} />
            </label>
          </div>
          <textarea
            className={`${campo} min-h-32`}
            placeholder={"Pega aquí el extracto, una línea por movimiento:\n2026-11-03;Consignación cliente;1500000\n2026-11-05;Pago proveedor;-420000"}
            value={textoExtracto}
            onChange={(e) => setTextoExtracto(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button className={boton} onClick={conciliar}><Landmark className="h-4 w-4" /> Conciliar</button>
            {resultadoConc && <button className={botonSec} onClick={exportarConciliacion}><Download className="h-4 w-4" /> Excel</button>}
          </div>
          {resultadoConc && (
            <div className="space-y-2 text-sm text-foreground">
              <p>
                Conciliados: <strong>{resultadoConc.conciliados.length}</strong> · Solo en banco: <strong>{resultadoConc.soloBanco.length}</strong> · Solo en libros: <strong>{resultadoConc.soloLibros.length}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Diferencia banco vs libros: {dinero(resultadoConc.soloBanco.reduce((t, m) => t + m.valor, 0) - resultadoConc.soloLibros.reduce((t, m) => t + m.valor, 0))}
              </p>
              {resultadoConc.soloBanco.map((m, i) => (
                <p key={`b${i}`} className="rounded border border-amber-500/40 px-2 py-1">Falta en libros · {m.fecha} · {m.descripcion} · {dinero(m.valor)}</p>
              ))}
              {resultadoConc.soloLibros.map((m, i) => (
                <p key={`l${i}`} className="rounded border border-destructive/40 px-2 py-1">No aparece en banco · {m.fecha} · {m.concepto} · {dinero(m.valor)}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {sub === "notas" && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={campo} value={tipoNota} onChange={(e) => { const t = e.target.value === "debito" ? "debito" : "credito"; setTipoNota(t); setPrefNota(t === "credito" ? "NC" : "ND"); setMotivoNota(t === "credito" ? "2" : "1"); }}>
              <option value="credito">Nota crédito</option>
              <option value="debito">Nota débito</option>
            </select>
            <select className={`${campo} sm:col-span-2`} value={facturaId} onChange={(e) => setFacturaId(e.target.value)}>
              <option value="">Elige la factura que se modifica</option>
              {facturas.map((f) => (
                <option key={f.id} value={f.id}>N.º {f.numero} · {f.cliente} · {dinero(Number(f.total))}</option>
              ))}
            </select>
            <select className={`${campo} sm:col-span-2`} value={motivoNota} onChange={(e) => setMotivoNota(e.target.value)}>
              {(tipoNota === "credito" ? MOTIVOS_NC : MOTIVOS_ND).map((m) => (
                <option key={m.c} value={m.c}>{m.c} · {m.t}</option>
              ))}
            </select>
            <input className={campo} inputMode="decimal" placeholder="Valor total (vacío = total de la factura)" value={valorNota} onChange={(e) => setValorNota(e.target.value)} />
            <input className={campo} placeholder="Prefijo" value={prefNota} onChange={(e) => setPrefNota(e.target.value)} />
            <input className={campo} inputMode="numeric" placeholder="Consecutivo" value={numNota} onChange={(e) => setNumNota(e.target.value)} />
            <input className={campo} placeholder="Descripción del ajuste" value={descNota} onChange={(e) => setDescNota(e.target.value)} />
          </div>
          {facturaSel ? (
            <>
              <p className="text-sm text-foreground">
                Nota {calcNota()?.num}: base {dinero(calcNota()?.base ?? 0)} + IVA {dinero(calcNota()?.iva ?? 0)} = <strong>{dinero(calcNota()?.total ?? 0)}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <button className={boton} onClick={() => abrirImpresion(`Nota ${tipoNota} ${prefNota}${numNota}`, htmlNota())}><Printer className="h-4 w-4" /> Imprimir / PDF</button>
                <button className={botonSec} onClick={() => descargarTexto(`nota-${tipoNota}-${prefNota}${numNota}.xml`, xmlNota(), "application/xml")}><FileCode2 className="h-4 w-4" /> XML</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Elige una factura para armar la nota.</p>
          )}
        </div>
      )}

      {sub === "soporte" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Úsalo cuando le compras a alguien que no está obligado a facturar (persona natural no responsable de IVA, por ejemplo).</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={`${campo} sm:col-span-3`} value={dsProv} onChange={(e) => setDsProv(e.target.value)}>
              <option value="">Tomar datos de una compra a proveedor (opcional)</option>
              {provs.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo} · {dinero(Number(p.monto))}</option>
              ))}
            </select>
            <input className={campo} placeholder="Nombre del vendedor" value={dsNombre} onChange={(e) => setDsNombre(e.target.value)} />
            <input className={campo} placeholder="Documento / NIT" value={dsDoc} onChange={(e) => setDsDoc(e.target.value)} />
            <input className={campo} placeholder="Concepto" value={dsConcepto} onChange={(e) => setDsConcepto(e.target.value)} />
            <input className={campo} inputMode="decimal" placeholder="Valor base" value={dsValor} onChange={(e) => setDsValor(e.target.value)} />
            <input className={campo} inputMode="decimal" placeholder="IVA %" value={dsIva} onChange={(e) => setDsIva(e.target.value)} />
            <select className={campo} value={dsRete} onChange={(e) => setDsRete(e.target.value)}>
              {CONCEPTOS_RETE.map((c) => (
                <option key={c.clave} value={c.clave}>{c.texto}</option>
              ))}
            </select>
            <input className={campo} inputMode="numeric" placeholder="Consecutivo DS" value={dsNum} onChange={(e) => setDsNum(e.target.value)} />
          </div>
          <p className="text-sm text-foreground">
            Base {dinero(calcSoporte().base)} + IVA {dinero(calcSoporte().iva)} − Retención {dinero(calcSoporte().rete)} = <strong>{dinero(calcSoporte().neto)}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={boton} onClick={() => (dsNombre && Number(dsValor) > 0 ? abrirImpresion(`Documento soporte DS${dsNum}`, htmlSoporte()) : toast.error("Falta el vendedor o el valor."))}><Printer className="h-4 w-4" /> Imprimir / PDF</button>
            <button className={botonSec} onClick={() => (dsNombre && Number(dsValor) > 0 ? descargarTexto(`documento-soporte-DS${dsNum}.xml`, xmlSoporte(), "application/xml") : toast.error("Falta el vendedor o el valor."))}><FileCode2 className="h-4 w-4" /> XML</button>
          </div>
        </div>
      )}

      {(sub === "nominaxml" || sub === "pila") && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Mes de la nómina
              <input className={campo} type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            </label>
            {sub === "pila" && (
              <label className="space-y-1 text-xs text-muted-foreground">
                Salario mínimo vigente
                <input className={campo} inputMode="numeric" value={smmlv} onChange={(e) => setSmmlv(e.target.value)} />
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{liqsPeriodo.length} liquidaciones de nómina en ese mes.</p>

          {sub === "nominaxml" && (
            <button className={boton} onClick={generarXmlNomina}><FileCode2 className="h-4 w-4" /> Descargar XML de nómina electrónica</button>
          )}

          {sub === "pila" && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm text-foreground">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="p-1">Empleado</th><th className="p-1">Días</th><th className="p-1">IBC</th><th className="p-1">Salud</th><th className="p-1">Pensión</th><th className="p-1">ARL</th><th className="p-1">Parafiscales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasPila.map((f, i) => (
                      <tr key={`${f.doc}${i}`} className="border-t border-glass-border">
                        <td className="p-1">{f.nombre}</td>
                        <td className="p-1">{f.dias}</td>
                        <td className="p-1">{dinero(f.ibc)}</td>
                        <td className="p-1">{dinero(f.saludEmp + f.saludEmpl)}</td>
                        <td className="p-1">{dinero(f.pensionEmp + f.pensionEmpl)}</td>
                        <td className="p-1">{dinero(f.arl)}</td>
                        <td className="p-1">{dinero(f.caja + f.sena + f.icbf)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-foreground">Total a pagar en la planilla: <strong>{dinero(totalPila)}</strong></p>
              <div className="flex flex-wrap gap-2">
                <button className={boton} onClick={exportarPila}><Download className="h-4 w-4" /> Excel</button>
                <button className={botonSec} onClick={csvPila}><FileText className="h-4 w-4" /> CSV</button>
              </div>
              <p className="text-xs text-muted-foreground">Cálculo de apoyo para cargar en tu operador de PILA. Empleadores exonerados no pagan salud 8,5 %, SENA ni ICBF.</p>
            </>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

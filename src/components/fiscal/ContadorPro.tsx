import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { abrirArchivoPrivado } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { exportarExcel } from "@/lib/exportes";
import { actualizarNormativa, asesorContable, type MensajeContador } from "@/lib/contador-ia.functions";

type Cuenta = Tables<"cuentas_contables">;
type Asiento = Tables<"asientos_contables">;
type Oblig = Tables<"obligaciones_tributarias_negocio">;
type Novedad = Tables<"novedades_normativas">;
type Tarifa = Tables<"ica_tarifas">;
type Tercero = Tables<"restaurante_clientes">;
type Factura = Tables<"fac_emitidas">;
type RegProveedor = Tables<"proveedores_registros">;

export const UVT_2026 = 54000;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full min-w-0 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const diasHasta = (fecha: string): number => {
  const [a, m, dia] = fecha.split("-").map(Number);
  const v = new Date(a, m - 1, dia).getTime();
  const h = new Date();
  const hoy0 = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime();
  return Math.round((v - hoy0) / 86400000);
};

type Semaforo = { color: string; texto: string };
const semaforoDe = (o: Oblig): Semaforo => {
  if (o.estado === "presentada") return { color: "border-primary/40 text-primary", texto: "Presentada" };
  const d = diasHasta(o.fecha_vencimiento);
  if (d < 0) return { color: "border-destructive/60 text-destructive", texto: `Vencida hace ${-d} ${-d === 1 ? "día" : "días"}` };
  if (d <= 3) return { color: "border-destructive/60 text-destructive", texto: d === 0 ? "Vence hoy" : `Vence en ${d} días` };
  if (d <= 10) return { color: "border-amber-500/60 text-amber-300", texto: `Vence en ${d} días` };
  return { color: "border-emerald-500/40 text-emerald-300", texto: `Al día · faltan ${d} días` };
};

const waNum = (t: string | null | undefined): string => (t ?? "").replace(/\D/g, "");
const enlaceWa = (tel: string | null | undefined, msg: string): string | null => {
  const t = waNum(tel);
  if (!t) return null;
  const n = t.length === 10 ? `57${t}` : t;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
};

/** Dígito de verificación DIAN (módulo 11). */
const dvValido = (doc: string, dv: string): boolean => {
  const d = doc.replace(/\D/g, "");
  if (!/^\d$/.test(dv.trim()) || d.length < 5) return false;
  const primos = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const t = d.slice(-15).padStart(15, "0");
  let s = 0;
  for (let i = 0; i < 15; i++) s += Number(t[i]) * primos[i];
  const r = s % 11;
  return (r < 2 ? r : 11 - r) === Number(dv.trim());
};

type Tab = "vencimientos" | "impuestos" | "exogena" | "normativa";

export function ContadorPro({ cuentas, filas }: { cuentas: Cuenta[]; filas: Asiento[] }) {
  const { negocio, recargar } = useNegocio();
  const [tab, setTab] = useState<Tab>("vencimientos");
  const [obligs, setObligs] = useState<Oblig[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [generoAuto, setGeneroAuto] = useState(false);
  const [listo, setListo] = useState(false);

  // Contador + ICA del negocio
  const [cNombre, setCNombre] = useState("");
  const [cTel, setCTel] = useState("");
  const [cCorreo, setCCorreo] = useState("");
  const [icaMun, setIcaMun] = useState("");
  const [icaCiuu, setIcaCiuu] = useState("");
  const [guardandoContador, setGuardandoContador] = useState(false);

  // Impuestos
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tarifaRenta, setTarifaRenta] = useState("35");
  const [datosFiscales, setDatosFiscales] = useState<{ asientos: Asiento[]; facturas: Factura[]; provs: RegProveedor[] }>({ asientos: [], facturas: [], provs: [] });
  const [tarifaId, setTarifaId] = useState("");
  const [nMun, setNMun] = useState("");
  const [nCiuu, setNCiuu] = useState("");
  const [nAct, setNAct] = useState("");
  const [nTar, setNTar] = useState("");

  // Exógena: edición inline de terceros
  const [editando, setEditando] = useState<Record<string, { documento: string; dv: string; correo: string; direccion: string }>>({});

  // Normativa + asesor
  const [actualizando, setActualizando] = useState(false);
  const [uvtIa, setUvtIa] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<MensajeContador[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [preguntando, setPreguntando] = useState(false);

  const anio = new Date().getFullYear();

  const cargar = useCallback(async () => {
    const [o, n, t, c] = await Promise.all([
      supabase.from("obligaciones_tributarias_negocio").select("*").eq("anio", anio).order("fecha_vencimiento"),
      supabase.from("novedades_normativas").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("ica_tarifas").select("*").order("municipio"),
      supabase.from("restaurante_clientes").select("*").order("nombre").limit(500),
    ]);
    if (o.data) setObligs(o.data);
    if (n.data) setNovedades(n.data);
    if (t.data) setTarifas(t.data);
    if (c.data) setTerceros(c.data);
    setListo(true);
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Datos fiscales del negocio activo: asientos vigentes, facturas emitidas y compras a proveedores del período.
  const duenoId = negocio?.owner_id ?? null;
  useEffect(() => {
    let vivo = true;
    void (async () => {
      let qa = supabase.from("asientos_contables").select("*").eq("anulado", false).order("fecha").limit(20000);
      let qf = supabase.from("fac_emitidas").select("*").order("created_at").limit(20000);
      let qp = supabase.from("proveedores_registros").select("*").eq("anulado", false).order("created_at").limit(20000);
      if (duenoId) {
        qa = qa.eq("owner_id", duenoId);
        qf = qf.eq("owner_id", duenoId);
        qp = qp.eq("owner_id", duenoId);
      }
      if (desde) {
        qa = qa.gte("fecha", desde);
        qf = qf.gte("created_at", desde);
        qp = qp.gte("created_at", desde);
      }
      if (hasta) {
        qa = qa.lte("fecha", hasta);
        qf = qf.lte("created_at", `${hasta}T23:59:59`);
        qp = qp.lte("created_at", `${hasta}T23:59:59`);
      }
      const [a, f, p] = await Promise.all([qa, qf, qp]);
      if (!vivo) return;
      setDatosFiscales({ asientos: a.data ?? [], facturas: f.data ?? [], provs: p.data ?? [] });
    })();
    return () => {
      vivo = false;
    };
  }, [desde, hasta, duenoId]);

  useEffect(() => {
    if (!negocio) return;
    setCNombre(negocio.contador_nombre ?? "");
    setCTel(negocio.contador_telefono ?? "");
    setCCorreo(negocio.contador_correo ?? "");
    setIcaMun(negocio.ica_municipio ?? "");
    setIcaCiuu(negocio.ica_ciuu ?? "");
  }, [negocio]);

  const generarCronograma = useCallback(
    async (silencioso = false) => {
      if (!negocio) return false;
      const { data: cal } = await supabase.from("calendario_tributario_oficial").select("*").eq("anio", anio);
      if (!cal || cal.length === 0) {
        if (!silencioso) toast.error("Aún no hay calendario oficial cargado.");
        return false;
      }
      const nit = (negocio.nit ?? "").replace(/\D/g, "");
      const ultimo = nit ? nit[nit.length - 1] : null;
      const regimen = negocio.regimen_tributario ?? "";
      const esSimple = regimen.toLowerCase().includes("simple");
      const { data: actuales } = await supabase
        .from("obligaciones_tributarias_negocio")
        .select("impuesto,periodo")
        .eq("anio", anio);
      const ya = new Set((actuales ?? []).map((x) => `${x.impuesto}|${x.periodo}`));
      const nuevas = cal
        .filter((r) => {
          if (r.ultimo_digito && ultimo && r.ultimo_digito !== ultimo) return false;
          if (esSimple && r.impuesto.startsWith("Renta")) return false;
          if (!esSimple && r.impuesto.startsWith("Régimen Simple")) return false;
          if (r.municipio && negocio.ica_municipio && r.municipio !== negocio.ica_municipio) return false;
          return !ya.has(`${r.impuesto}|${r.periodo}`);
        })
        .map((r) => ({ anio, impuesto: r.impuesto, periodo: r.periodo, fecha_vencimiento: r.fecha_vencimiento }));
      if (nuevas.length > 0) {
        const { error } = await supabase.from("obligaciones_tributarias_negocio").insert(nuevas);
        if (error) {
          if (!silencioso) toast.error("No se pudo generar el cronograma.");
          return false;
        }
      }
      await cargar();
      if (!silencioso) toast.success(nuevas.length > 0 ? `Cronograma ${anio} generado.` : "Tu cronograma ya está al día.");
      return true;
    },
    [negocio, anio, cargar],
  );

  useEffect(() => {
    if (!generoAuto && listo && negocio && obligs.length === 0) {
      setGeneroAuto(true);
      void generarCronograma(true);
    }
  }, [generoAuto, listo, negocio, obligs.length, generarCronograma]);

  const guardarContador = async () => {
    if (!negocio) return;
    setGuardandoContador(true);
    const { error } = await supabase
      .from("negocio_config")
      .update({
        contador_nombre: cNombre.trim() || null,
        contador_telefono: cTel.replace(/\D/g, "") || null,
        contador_correo: cCorreo.trim() || null,
        ica_municipio: icaMun.trim() || null,
        ica_ciuu: icaCiuu.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", negocio.id);
    setGuardandoContador(false);
    if (error) return toast.error("No se pudo guardar. Solo el dueño puede hacerlo.");
    toast.success("Datos del contador guardados.");
    recargar();
  };

  const marcarPresentada = async (id: string, presentada: boolean) => {
    const { error } = await supabase
      .from("obligaciones_tributarias_negocio")
      .update({ estado: presentada ? "presentada" : "pendiente" })
      .eq("id", id);
    if (error) return toast.error("No se pudo actualizar.");
    setObligs((ls) => ls.map((o) => (o.id === id ? { ...o, estado: presentada ? "presentada" : "pendiente" } : o)));
  };

  const subirSoporte = async (o: Oblig, cual: "soporte_url" | "acuse_url", archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.type !== "application/pdf") return toast.error("Solo se aceptan archivos PDF.");
    if (archivo.size > 8 * 1024 * 1024) return toast.error("El PDF debe pesar menos de 8 MB.");
    const { data: ses } = await supabase.auth.getUser();
    const uid = ses.user?.id;
    if (!uid) return toast.error("Sin sesión.");
    const ruta = `${uid}/${o.id}-${cual === "soporte_url" ? "declaracion" : "acuse"}-${Date.now()}.pdf`;
    const { error: up } = await supabase.storage.from("soportes_tributarios").upload(ruta, archivo, { upsert: true });
    if (up) return toast.error("No se pudo subir el PDF.");
    const parche = cual === "soporte_url" ? { soporte_url: ruta } : { acuse_url: ruta };
    const { error } = await supabase.from("obligaciones_tributarias_negocio").update(parche).eq("id", o.id);
    if (error) return toast.error("No se pudo guardar el soporte.");
    toast.success("PDF guardado.");
    cargar();
  };

  const verSoporte = async (ruta: string | null) => {
    if (!ruta) return;
    if (!(await abrirArchivoPrivado("soportes_tributarios", ruta))) toast.error("No se pudo abrir el PDF.");
  };

  const pendientes = useMemo(() => obligs.filter((o) => o.estado !== "presentada"), [obligs]);
  const vencidas = useMemo(() => pendientes.filter((o) => diasHasta(o.fecha_vencimiento) <= 3), [pendientes]);

  // ---- Pre-liquidación con los asientos reales ----
  // Todo sale de los asientos contables reales y de las facturas emitidas del negocio (nada se estima con porcentajes).
  const fiscal = useMemo(() => {
    const porId = new Map(cuentas.map((c) => [c.id, c]));
    let ingresos = 0;
    let gastos = 0;
    const cod: Record<string, { debe: number; haber: number }> = {};
    for (const f of datosFiscales.asientos) {
      const c = porId.get(f.cuenta_id);
      if (!c) continue;
      if (c.tipo === "ingreso") ingresos += f.haber - f.debe;
      if (c.tipo === "gasto") gastos += f.debe - f.haber;
      for (const p of ["2408", "2495", "1355", "2365", "2368", "2367"]) {
        if (c.codigo.startsWith(p)) {
          const x = cod[p] ?? { debe: 0, haber: 0 };
          x.debe += f.debe;
          x.haber += f.haber;
          cod[p] = x;
        }
      }
    }
    const g = (p: string) => cod[p] ?? { debe: 0, haber: 0 };
    const fac = datosFiscales.facturas;
    const sum = (f: (x: Factura) => number) => fac.reduce((s, x) => s + (Number(f(x)) || 0), 0);
    return {
      ingresos: Math.max(0, ingresos),
      gastos: Math.max(0, gastos),
      ivaGenerado: g("2408").haber,
      ivaDescontable: g("2408").debe,
      impoconsumo: g("2495").haber - g("2495").debe,
      retencionesAFavor: g("1355").debe - g("1355").haber,
      retencionesPorPagar: g("2365").haber - g("2365").debe,
      reteicaPorPagar: g("2368").haber - g("2368").debe,
      nFacturas: fac.length,
      baseFacturada: sum((x) => x.subtotal),
      ivaFacturado: sum((x) => x.iva),
      incFacturado: sum((x) => x.impoconsumo),
      retefuenteFacturas: sum((x) => x.retefuente),
      reteivaFacturas: sum((x) => x.reteiva),
      reteicaFacturas: sum((x) => x.reteica),
    };
  }, [datosFiscales, cuentas]);
  const libro = { ingresos: fiscal.ingresos, gastos: fiscal.gastos };

  const descuadre = useMemo(() => {
    let d = 0;
    let h = 0;
    for (const f of filas) {
      if (f.anulado) continue;
      d += f.debe;
      h += f.haber;
    }
    return d - h;
  }, [filas]);

  const tRenta = Math.min(Math.max(Number(tarifaRenta) || 0, 0), 100);
  const ivaGenerado = Math.round(fiscal.ivaGenerado);
  const ivaDescontable = Math.round(fiscal.ivaDescontable);
  const ivaNeto = ivaGenerado - ivaDescontable;
  const ivaPagar = Math.max(0, ivaNeto);
  const retePagar = Math.round(fiscal.retencionesPorPagar);
  const utilidadAntes = libro.ingresos - libro.gastos;
  const rentaEstimada = Math.round(Math.max(0, utilidadAntes) * tRenta / 100);
  const rentaNeta = Math.max(0, rentaEstimada - Math.round(Math.max(0, fiscal.retencionesAFavor)));
  const tarifaSel = tarifas.find((t) => t.id === tarifaId) ?? tarifas.find((t) => t.municipio === icaMun && (!icaCiuu || t.ciuu === icaCiuu)) ?? null;
  const icaPagar = tarifaSel ? Math.round((libro.ingresos * tarifaSel.tarifa_por_mil) / 1000) : 0;
  const enUvt = (n: number) => `${(n / UVT_2026).toFixed(2)} UVT`;

  const guardarTarifa = async () => {
    if (!nMun.trim() || !nTar) return toast.error("Escribe municipio y tarifa por mil.");
    const { error } = await supabase.from("ica_tarifas").insert({
      municipio: nMun.trim(),
      ciuu: nCiuu.trim() || "—",
      actividad: nAct.trim() || "General",
      tarifa_por_mil: Math.max(Number(nTar) || 0, 0),
    });
    if (error) return toast.error("No se pudo guardar la tarifa.");
    setNMun("");
    setNCiuu("");
    setNAct("");
    setNTar("");
    toast.success("Tarifa ICA guardada.");
    cargar();
  };

  // ---- Exógena: auditoría de terceros ----
  const hallazgos = useMemo(() => {
    const out: { id: string; nombre: string; problema: string }[] = [];
    for (const t of terceros) {
      if (!t.documento?.trim()) out.push({ id: t.id, nombre: t.nombre, problema: "Sin NIT o documento" });
      else if (!t.digito_verificacion?.trim()) out.push({ id: t.id, nombre: t.nombre, problema: "NIT sin dígito de verificación" });
      else if (!dvValido(t.documento, t.digito_verificacion)) out.push({ id: t.id, nombre: t.nombre, problema: "Dígito de verificación inválido" });
      if (!t.correo?.trim()) out.push({ id: t.id, nombre: t.nombre, problema: "Sin correo electrónico" });
      if (!t.direccion?.trim()) out.push({ id: t.id, nombre: t.nombre, problema: "Sin dirección" });
    }
    return out;
  }, [terceros]);

  const empezarEdicion = (t: Tercero) => {
    setEditando((e) => ({
      ...e,
      [t.id]: { documento: t.documento ?? "", dv: t.digito_verificacion ?? "", correo: t.correo ?? "", direccion: t.direccion ?? "" },
    }));
  };

  const guardarTercero = async (id: string) => {
    const e = editando[id];
    if (!e) return;
    const { error } = await supabase
      .from("restaurante_clientes")
      .update({ documento: e.documento.trim() || null, digito_verificacion: e.dv.trim() || null, correo: e.correo.trim() || null, direccion: e.direccion.trim() || null })
      .eq("id", id);
    if (error) return toast.error("No se pudo guardar el tercero.");
    toast.success("Tercero actualizado.");
    setEditando((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    cargar();
  };

  const exportarFormato = (formato: "1001" | "1005" | "1006" | "1007" | "1008" | "1009") => {
    const conDoc = terceros.filter((t) => t.documento?.trim());
    const base = conDoc.map((t) => [t.documento ?? "", t.digito_verificacion ?? "", t.nombre, t.correo ?? "", t.direccion ?? ""]);
    const r2 = (n: number) => Math.round(n * 100) / 100;
    // Agrupa las facturas emitidas por documento del cliente.
    const porCliente = new Map<string, { doc: string; nombre: string; base: number; iva: number; inc: number; ret: number; total: number }>();
    for (const f of datosFiscales.facturas) {
      const clave = (f.cliente_doc ?? "").trim() || f.cliente;
      const x = porCliente.get(clave) ?? { doc: (f.cliente_doc ?? "").trim(), nombre: f.cliente, base: 0, iva: 0, inc: 0, ret: 0, total: 0 };
      x.base += Number(f.subtotal) || 0;
      x.iva += Number(f.iva) || 0;
      x.inc += Number(f.impoconsumo) || 0;
      x.ret += Number(f.total_retenciones) || 0;
      x.total += Number(f.total) || 0;
      porCliente.set(clave, x);
    }
    const clientes = Array.from(porCliente.values());
    // Agrupa las compras por proveedor (NIT guardado en la compra).
    const porProv = new Map<string, { nit: string; nombre: string; pagos: number }>();
    for (const p of datosFiscales.provs) {
      const nit = ((p.datos as unknown as { nit?: string | null } | null)?.nit ?? "").toString().trim();
      const clave = nit || (p.contacto ?? p.titulo);
      const x = porProv.get(clave) ?? { nit, nombre: p.contacto ?? p.titulo, pagos: 0 };
      x.pagos += Number(p.monto) || 0;
      porProv.set(clave, x);
    }
    const provs = Array.from(porProv.values());
    if (formato === "1001") {
      const filasP = provs.map((p) => [p.nit, "", p.nombre, r2(p.pagos), ""] as (string | number)[]);
      exportarExcel("exogena-1001-borrador", ["NIT", "DV", "Tercero", "Pago o abono en cuenta", "Retención practicada"],
        [...filasP, ["TOTAL", "", "", r2(provs.reduce((s, p) => s + p.pagos, 0)), r2(Math.max(0, fiscal.retencionesPorPagar))]]);
    } else if (formato === "1005") {
      const filasP = provs.map((p) => [p.nit, "", p.nombre, r2(p.pagos), ""] as (string | number)[]);
      exportarExcel("exogena-1005-borrador", ["NIT", "DV", "Tercero", "Base de la compra", "IVA descontable"],
        [...filasP, ["TOTAL", "", "", r2(provs.reduce((s, p) => s + p.pagos, 0)), r2(fiscal.ivaDescontable)]]);
    } else if (formato === "1006") {
      exportarExcel("exogena-1006-borrador", ["NIT / Documento", "Tercero", "Base gravable", "IVA generado", "Impoconsumo"],
        [...clientes.map((c) => [c.doc, c.nombre, r2(c.base), r2(c.iva), r2(c.inc)] as (string | number)[]),
          ["TOTAL", "", r2(clientes.reduce((s, c) => s + c.base, 0)), r2(fiscal.ivaGenerado), r2(fiscal.impoconsumo)]]);
    } else if (formato === "1007") {
      exportarExcel("exogena-1007-borrador", ["NIT / Documento", "Tercero", "Ingresos brutos", "Devoluciones", "Retenciones que te practicaron"],
        [...clientes.map((c) => [c.doc, c.nombre, r2(c.base), "", r2(c.ret)] as (string | number)[]),
          ["TOTAL", "", r2(clientes.reduce((s, c) => s + c.base, 0)), "", r2(clientes.reduce((s, c) => s + c.ret, 0))]]);
    } else if (formato === "1008")
      exportarExcel("exogena-1008-borrador", ["NIT", "DV", "Tercero", "Correo", "Dirección", "Saldo por cobrar"],
        conDoc.map((t) => [t.documento ?? "", t.digito_verificacion ?? "", t.nombre, t.correo ?? "", t.direccion ?? "", t.total_gastado]));
    else
      exportarExcel(`exogena-${formato}-borrador`, ["NIT", "DV", "Tercero", "Correo", "Dirección", "Valor"],
        base.map((b) => [...b, ""]));
    toast.success(`Borrador del formato ${formato} exportado. Tu contador lo valida antes de enviarlo.`);
  };

  // ---- Normativa + asesor ----
  const actualizar = async () => {
    setActualizando(true);
    try {
      const r = await actualizarNormativa({ data: { anio } });
      setUvtIa(r.uvt);
      toast.success(r.total > 0 ? `${r.total} novedades guardadas.` : "Sin novedades nuevas.");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setActualizando(false);
    }
  };

  const cifrasResumen = useMemo(() => {
    const top = [...filas].slice(-5).map((f) => `${f.fecha} ${f.concepto}: debe ${f.debe}, haber ${f.haber}`).join("\n") || "Sin asientos.";
    return `Ingresos del periodo: ${dinero(libro.ingresos)}. Gastos del periodo: ${dinero(libro.gastos)}. UVT 2026: $${UVT_2026}. Obligaciones pendientes: ${pendientes.length} (vencidas o por vencer: ${vencidas.length}). Terceros con datos incompletos: ${hallazgos.length}. Últimos asientos:\n${top}`;
  }, [libro, pendientes.length, vencidas.length, hallazgos.length, filas]);

  const preguntar = async () => {
    if (!pregunta.trim()) return;
    const nuevas: MensajeContador[] = [...msgs, { role: "user", content: pregunta.trim() }];
    setMsgs(nuevas);
    setPregunta("");
    setPreguntando(true);
    try {
      const r = await asesorContable({ data: { messages: nuevas, cifras: cifrasResumen } });
      setMsgs([...nuevas, { role: "assistant", content: r.respuesta }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo consultar.");
    } finally {
      setPreguntando(false);
    }
  };

  const tabs: { clave: Tab; texto: string }[] = [
    { clave: "vencimientos", texto: "Vencimientos" },
    { clave: "impuestos", texto: "Impuestos" },
    { clave: "exogena", texto: "Exógena" },
    { clave: "normativa", texto: "Normativa e IA" },
  ];

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
        <CalendarClock className="h-6 w-6 text-primary" /> Contador Pro Colombia
      </h2>
      <p className="text-sm text-muted-foreground">
        Vencimientos con semáforo, pre-liquidación de Retefuente, IVA e ICA, validador de exógena y actualizador normativo con IA. Todo estimado: tu contador confirma antes de declarar.
      </p>
      {vencidas.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          Tienes {vencidas.length} {vencidas.length === 1 ? "obligación vencida o por vencer en 3 días" : "obligaciones vencidas o por vencer en 3 días"}. Revísalas en Vencimientos.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => (
          <button
            key={t.clave}
            onClick={() => setTab(t.clave)}
            className={`rounded-full px-4 py-1.5 ${tab === t.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {t.texto}
          </button>
        ))}
      </div>

      {tab === "vencimientos" && (
        <div className="space-y-3">
          <GlassPanel className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block space-y-1 text-xs text-muted-foreground">
              Contador
              <input className={campo} placeholder="Nombre" value={cNombre} onChange={(e) => setCNombre(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              WhatsApp del contador
              <input className={campo} inputMode="tel" placeholder="300 123 4567" value={cTel} onChange={(e) => setCTel(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Correo del contador
              <input className={campo} inputMode="email" placeholder="contador@correo.com" value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Municipio ICA
              <input className={campo} placeholder="Ej: Bogotá" value={icaMun} onChange={(e) => setIcaMun(e.target.value)} />
            </label>
            <label className="block items-end space-y-1 text-xs text-muted-foreground">
              <span>CIIU</span>
              <span className="flex gap-2">
                <input className={campo} placeholder="Ej: 4711" value={icaCiuu} onChange={(e) => setIcaCiuu(e.target.value)} />
                <button onClick={() => void guardarContador()} disabled={guardandoContador} className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
                  {guardandoContador ? "…" : "Guardar"}
                </button>
              </span>
            </label>
          </GlassPanel>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void generarCronograma()} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
              Generar mi cronograma {anio}
            </button>
          </div>

          {obligs.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes obligaciones. Genera tu cronograma con tu NIT y régimen.</p>}
          {obligs.map((o) => {
            const s = semaforoDe(o);
            const msg = `Hola, te recuerdo que ${o.impuesto} (${o.periodo || anio}) vence el ${o.fecha_vencimiento}. Negocio: ${negocio?.nombre ?? ""}.`;
            const waContador = enlaceWa(cTel, msg);
            const waNegocio = enlaceWa(negocio?.telefono_pedidos, msg);
            return (
              <GlassPanel key={o.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{o.impuesto}{o.periodo ? ` · ${o.periodo}` : ""}</p>
                    <p className="text-xs text-muted-foreground">Vence el {o.fecha_vencimiento}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${s.color}`}>{s.texto}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button onClick={() => void marcarPresentada(o.id, o.estado !== "presentada")} className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> {o.estado === "presentada" ? "Marcar pendiente" : "Marcar presentada"}
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-foreground">
                    <Upload className="h-4 w-4" /> Declaración PDF
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => void subirSoporte(o, "soporte_url", e.target.files?.[0])} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-foreground">
                    <Upload className="h-4 w-4" /> Acuse PDF
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => void subirSoporte(o, "acuse_url", e.target.files?.[0])} />
                  </label>
                  {o.soporte_url && <button onClick={() => void verSoporte(o.soporte_url)} className="rounded-lg border border-glass-border px-3 py-2 text-foreground">Ver declaración</button>}
                  {o.acuse_url && <button onClick={() => void verSoporte(o.acuse_url)} className="rounded-lg border border-glass-border px-3 py-2 text-foreground">Ver acuse</button>}
                  {waContador && (
                    <a href={waContador} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-foreground">
                      <MessageCircle className="h-4 w-4 text-primary" /> Avisar al contador
                    </a>
                  )}
                  {waNegocio && (
                    <a href={waNegocio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-foreground">
                      <MessageCircle className="h-4 w-4 text-primary" /> Avisarme a mí
                    </a>
                  )}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {tab === "impuestos" && (
        <div className="space-y-3">
          <GlassPanel className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1 text-xs text-muted-foreground">
              Desde
              <input type="date" className={campo} value={desde} onChange={(e) => setDesde(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Hasta
              <input type="date" className={campo} value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              Tarifa de renta %
              <input className={campo} inputMode="decimal" value={tarifaRenta} onChange={(e) => setTarifaRenta(e.target.value)} />
            </label>
            <p className="self-end text-xs text-muted-foreground">
              Cifras tomadas de tus asientos contables y de {fiscal.nFacturas} facturas emitidas del período.
            </p>
          </GlassPanel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <GlassPanel className="space-y-1 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Calculator className="h-4 w-4 text-primary" /> Retefuente (F. 350)</p>
              <p className="text-xs text-muted-foreground">Retenciones por pagar (2365) · Base gastos: {dinero(libro.gastos)} · {enUvt(libro.gastos)}</p>
              <p className="text-xl text-foreground">{dinero(retePagar)}</p>
              <p className="text-xs text-muted-foreground">A tu favor (1355): {dinero(Math.round(fiscal.retencionesAFavor))} · En facturas: Retefuente {dinero(fiscal.retefuenteFacturas)}, ReteIVA {dinero(fiscal.reteivaFacturas)}</p>
            </GlassPanel>
            <GlassPanel className="space-y-1 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Calculator className="h-4 w-4 text-primary" /> IVA (F. 300)</p>
              <p className="text-xs text-muted-foreground">Generado (2408) {dinero(ivaGenerado)} − Descontable / devoluciones {dinero(ivaDescontable)}</p>
              <p className="text-xl text-foreground">{ivaNeto < 0 ? `Saldo a favor ${dinero(-ivaNeto)}` : dinero(ivaPagar)}</p>
              <p className="text-xs text-muted-foreground">Base gravable facturada: {dinero(fiscal.baseFacturada)} · Base ingresos: {dinero(libro.ingresos)} · {enUvt(libro.ingresos)}</p>
            </GlassPanel>
            <GlassPanel className="space-y-1 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Calculator className="h-4 w-4 text-primary" /> Impoconsumo (2495)</p>
              <p className="text-xs text-muted-foreground">Facturado: {dinero(fiscal.incFacturado)}</p>
              <p className="text-xl text-foreground">{dinero(Math.round(fiscal.impoconsumo))}</p>
              <p className="text-xs text-muted-foreground">Saldo por pagar según asientos.</p>
            </GlassPanel>
            <GlassPanel className="space-y-1 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Calculator className="h-4 w-4 text-primary" /> Renta (provisión)</p>
              <p className="text-xs text-muted-foreground">Utilidad {dinero(utilidadAntes)} × {tRenta}% = {dinero(rentaEstimada)}</p>
              <p className="text-xl text-foreground">{dinero(rentaNeta)}</p>
              <p className="text-xs text-muted-foreground">Menos retenciones a favor (1355). Confírmalo con tu contador.</p>
            </GlassPanel>
            <GlassPanel className="space-y-1 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Calculator className="h-4 w-4 text-primary" /> ICA{tarifaSel ? ` · ${tarifaSel.municipio}` : ""}</p>
              <p className="text-xs text-muted-foreground">{tarifaSel ? `${tarifaSel.actividad} · ${tarifaSel.tarifa_por_mil} por mil` : "Elige una tarifa abajo"}</p>
              <p className="text-xl text-foreground">{dinero(icaPagar)}</p>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Tarifa aplicable
                <select className={campo} value={tarifaId} onChange={(e) => setTarifaId(e.target.value)}>
                  <option value="">Automática por municipio/CIIU</option>
                  {tarifas.map((t) => <option key={t.id} value={t.id}>{t.municipio} · {t.ciuu} · {t.tarifa_por_mil}‰</option>)}
                </select>
              </label>
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-2 p-4">
            <p className="text-sm font-medium text-foreground">Tarifas ICA por CIIU y municipio</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input className={campo} placeholder="Municipio" value={nMun} onChange={(e) => setNMun(e.target.value)} />
              <input className={campo} placeholder="CIIU" value={nCiuu} onChange={(e) => setNCiuu(e.target.value)} />
              <input className={campo} placeholder="Actividad" value={nAct} onChange={(e) => setNAct(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Por mil (ej: 11.04)" value={nTar} onChange={(e) => setNTar(e.target.value)} />
              <button onClick={() => void guardarTarifa()} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Agregar</button>
            </div>
            {tarifas.map((t) => (
              <p key={t.id} className="text-sm text-foreground">{t.municipio} · CIIU {t.ciuu} · {t.actividad} · <strong>{t.tarifa_por_mil}‰</strong></p>
            ))}
            {tarifas.length === 0 && <p className="text-xs text-muted-foreground">Agrega la tarifa de tu municipio y actividad (verifícala con tu contador).</p>}
          </GlassPanel>
        </div>
      )}

      {tab === "exogena" && (
        <div className="space-y-3">
          <GlassPanel className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground"><FileSearch className="h-4 w-4 text-primary" /> Pre-validador de terceros</p>
            {Math.abs(descuadre) >= 0.005 && (
              <p className="text-sm text-destructive">Tus libros están descuadrados por {dinero(Math.abs(descuadre))}. Cuadra el balance antes de generar medios magnéticos.</p>
            )}
            {hallazgos.length === 0 ? (
              <p className="text-sm text-primary">Tus terceros están completos: NIT con DV válido, correo y dirección.</p>
            ) : (
              <p className="text-sm text-foreground">{hallazgos.length} {hallazgos.length === 1 ? "dato por corregir" : "datos por corregir"} antes de enviar la exógena.</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {(["1001", "1005", "1006", "1007", "1008", "1009"] as const).map((f) => (
                <button key={f} onClick={() => exportarFormato(f)} className="rounded-full border border-glass-border px-4 py-1.5 text-muted-foreground">
                  Borrador {f} a Excel
                </button>
              ))}
            </div>
          </GlassPanel>
          {terceros.map((t) => {
            const e = editando[t.id];
            const problemas = hallazgos.filter((h) => h.id === t.id).map((h) => h.problema);
            return (
              <GlassPanel key={t.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {[t.documento && `Doc ${t.documento}${t.digito_verificacion ? `-${t.digito_verificacion}` : " (sin DV)"}`, t.correo, t.direccion].filter(Boolean).join(" · ") || "Sin datos fiscales"}
                    </p>
                  </div>
                  {problemas.length > 0 ? (
                    <span className="shrink-0 rounded-full border border-amber-500/60 px-2.5 py-0.5 text-xs text-amber-300">{problemas.join(" · ")}</span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-emerald-500/40 px-2.5 py-0.5 text-xs text-emerald-300">Completo</span>
                  )}
                </div>
                {e ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <input className={campo} placeholder="NIT o documento" value={e.documento} onChange={(ev) => setEditando((p) => ({ ...p, [t.id]: { ...e, documento: ev.target.value } }))} />
                    <input className={campo} inputMode="numeric" placeholder="DV" value={e.dv} onChange={(ev) => setEditando((p) => ({ ...p, [t.id]: { ...e, dv: ev.target.value } }))} />
                    <input className={campo} inputMode="email" placeholder="Correo" value={e.correo} onChange={(ev) => setEditando((p) => ({ ...p, [t.id]: { ...e, correo: ev.target.value } }))} />
                    <input className={campo} placeholder="Dirección" value={e.direccion} onChange={(ev) => setEditando((p) => ({ ...p, [t.id]: { ...e, direccion: ev.target.value } }))} />
                    <button onClick={() => void guardarTercero(t.id)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">Guardar</button>
                  </div>
                ) : (
                  <button onClick={() => empezarEdicion(t)} className="text-xs text-primary hover:underline">Completar datos fiscales</button>
                )}
              </GlassPanel>
            );
          })}
          {terceros.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes terceros registrados. Se crean desde tus clientes y domicilios.</p>}
        </div>
      )}

      {tab === "normativa" && (
        <div className="space-y-3">
          <GlassPanel className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Sparkles className="h-4 w-4 text-primary" /> Actualizador normativo automático</p>
            <p className="text-xs text-muted-foreground">Consulta con IA los cambios recientes (UVT, decretos, topes, resoluciones DIAN), los guarda y con un clic los aplicas a tu calendario.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void actualizar()} disabled={actualizando} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${actualizando ? "animate-spin" : ""}`} /> {actualizando ? "Consultando…" : "Actualizar normativa y calendarios (IA)"}
              </button>
              <button onClick={() => void generarCronograma()} className="rounded-full border border-glass-border px-4 py-2 text-sm text-foreground">
                Aplicar al calendario
              </button>
              {uvtIa != null && <span className="text-xs text-muted-foreground">La IA reporta UVT {anio}: ${uvtIa.toLocaleString("es-CO")}</span>}
            </div>
          </GlassPanel>
          {novedades.map((n) => (
            <GlassPanel key={n.id} className="space-y-1 p-4">
              <p className="font-medium text-foreground">{n.titulo}</p>
              <p className="text-sm text-muted-foreground">{n.resumen}</p>
              <p className="text-xs text-muted-foreground">Fuente: {n.fuente}{n.vigencia_desde ? ` · Vigente desde ${n.vigencia_desde}` : ""}</p>
            </GlassPanel>
          ))}
          <GlassPanel className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Sparkles className="h-4 w-4 text-primary" /> Asesor contable IA</p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {msgs.map((m, i) => (
                <p key={i} className={`rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-8 bg-primary/15 text-foreground" : "mr-8 bg-glass text-foreground"}`}>{m.content}</p>
              ))}
              {msgs.length === 0 && <p className="text-xs text-muted-foreground">Pregunta con tus palabras: vencimientos, sanciones, qué declarar. La IA ve tus cifras reales y aprende tus criterios.</p>}
            </div>
            <div className="flex gap-2">
              <input
                className={campo}
                placeholder="Ej: ¿qué impuestos se me vencen este mes?"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void preguntar();
                }}
              />
              <button onClick={() => void preguntar()} disabled={preguntando || !pregunta.trim()} aria-label="Enviar pregunta" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </section>
  );
}

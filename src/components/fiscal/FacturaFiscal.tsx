import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, MessageCircle, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirFactura, type DatosFactura, type FormatoFactura, type ItemFactura } from "@/lib/exportes";
import { estadoApiLocal, fijarImpresionDirecta, guardarColaLocal, impresionDirectaActivada, imprimirTirillaLocal, leerImpresoraCaja } from "@/lib/impresion-local";
import { ConsultorEmpresaNIT } from "@/components/negocio/ConsultorEmpresaNIT";
import { calcularCufeSimulado, calcularRetenciones, construirJsonFiscal, construirXmlDian, enlaceSolicitudDian, enviarFacturaDian, guardarCufeQr, marcarDianPendiente } from "@/lib/dian";

type Fac = Tables<"fac_emitidas">;

const itemVacio = (): ItemFactura => ({ descripcion: "", cantidad: 1, precio: 0 });

export function FacturaFiscal() {
  const { negocio } = useNegocio();
  const [facs, setFacs] = useState<Fac[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [docCli, setDocCli] = useState("");
  const [correoCli, setCorreoCli] = useState("");
  const [tipoPersona, setTipoPersona] = useState<"Natural" | "Jurídica">("Natural");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [items, setItems] = useState<ItemFactura[]>([itemVacio()]);
  const [iva, setIva] = useState("");
  const [inc, setInc] = useState("0");
  const [retefuente, setRetefuente] = useState("0");
  const [reteiva, setReteiva] = useState("0");
  const [reteica, setReteica] = useState("0");
  const [formato, setFormato] = useState<"58mm" | "80mm" | "carta">("80mm");
  const [directa, setDirecta] = useState(() => impresionDirectaActivada());
  const [apiMsg, setApiMsg] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("fac_emitidas").select("*").order("numero", { ascending: false }).limit(80);
    setFacs(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  useEffect(() => {
    if (negocio) setIva(String(negocio.iva_defecto ?? 0));
  }, [negocio]);

  const datosFactura = (f: Fac): DatosFactura => ({
    negocio: negocio?.razon_social || negocio?.nombre || "Mi negocio",
    nit: negocio?.nit ? `${negocio.nit}${negocio.digito_verificacion ? `-${negocio.digito_verificacion}` : ""}` : "Sin NIT registrado",
    direccion: negocio?.direccion_fiscal ?? undefined,
    telefono: negocio?.telefono_pedidos ?? undefined,
    resolucion: negocio?.resolucion_facturacion ?? undefined,
    prefijo: negocio?.prefijo_facturacion ?? undefined,
    logoUrl: negocio?.logo_url ?? undefined,
    regimen: [negocio?.regimen_tributario, negocio?.responsabilidad_fiscal].filter(Boolean).join(" · ") || undefined,
    piePagina: negocio?.pie_factura ?? undefined,
    numero: String(f.numero),
    fechaHora: new Date(f.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }),
    metodoPago: f.metodo_pago ?? metodoPago,
    cliente: f.cliente,
    clienteNit: f.cliente_doc ?? undefined,
    clienteCorreo: correoCli.trim() || undefined,
    items: (Array.isArray(f.items) ? f.items : []) as ItemFactura[],
    ivaPct: f.subtotal > 0 ? Math.round((f.iva / f.subtotal) * 100) : 0,
    incPct: f.subtotal > 0 ? Math.round((Number(f.impoconsumo ?? 0) / f.subtotal) * 10000) / 100 : 0,
    retefuente: Number(f.retefuente ?? 0),
    reteiva: Number(f.reteiva ?? 0),
    reteica: Number(f.reteica ?? 0),
    dianCufe: f.dian_cufe ?? undefined,
    dianQr: f.dian_qr ?? undefined,
    dianEstado: f.dian_estado ?? undefined,
  });

  const descargarArchivo = (nombre: string, contenido: string, tipo: string) => {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const descargarDianFactura = (f: Fac, tipo: "json" | "xml") => {
    const d = datosFactura(f);
    if (tipo === "json") {
      const payload = construirJsonFiscal({
        prefijo: d.prefijo ?? null,
        numero: f.numero,
        resolucion: d.resolucion ?? null,
        negocio: d.negocio,
        nit: d.nit,
        regimen: negocio?.regimen_tributario ?? null,
        responsabilidad: negocio?.responsabilidad_fiscal ?? null,
        softwareId: negocio?.dian_software_id ?? null,
        pin: negocio?.dian_pin ?? null,
        cliente: d.cliente,
        clienteDoc: d.clienteNit,
        clienteCorreo: d.clienteCorreo,
        clienteTipoPersona: tipoPersona,
        metodoPago: d.metodoPago,
        items: d.items,
        ivaPct: d.ivaPct ?? 0,
        incPct: d.incPct ?? 0,
        ambiente: negocio?.dian_ambiente ?? "Pruebas",
      });
      descargarArchivo(`DIAN-${d.prefijo ?? "FE"}${f.numero}.json`, JSON.stringify({ ...payload, cufe: f.dian_cufe, qr: f.dian_qr }, null, 2), "application/json;charset=utf-8");
      return;
    }
    const xml = construirXmlDian({
      prefijo: d.prefijo ?? "FE",
      numero: f.numero,
      fechaIso: f.created_at,
      negocio: d.negocio,
      nit: d.nit,
      cliente: d.cliente,
      clienteDoc: d.clienteNit ?? "",
      clienteCorreo: d.clienteCorreo,
      subtotal: f.subtotal,
      iva: f.iva,
      total: f.total,
      cufe: f.dian_cufe,
      ambiente: negocio?.dian_ambiente ?? "Pruebas",
      items: d.items,
    });
    descargarArchivo(`DIAN-${d.prefijo ?? "FE"}${f.numero}.xml`, xml, "application/xml;charset=utf-8");
  };

  const cambiarDirecta = (v: boolean) => {
    setDirecta(v);
    fijarImpresionDirecta(v);
  };

  const probarImpresora = async () => {
    setApiMsg("Buscando impresora…");
    const est = await estadoApiLocal();
    const anchoTermico: "58mm" | "80mm" = formato === "58mm" ? "58mm" : "80mm";
    if (!est.disponible) {
      setApiMsg(`API local no detectada: abriendo vista previa térmica (${anchoTermico}).`);
      imprimirFactura(
        {
          negocio: negocio?.razon_social || negocio?.nombre || "Mi negocio",
          nit: negocio?.nit ? `${negocio.nit}${negocio.digito_verificacion ? `-${negocio.digito_verificacion}` : ""}` : "Sin NIT",
          regimen: negocio?.regimen_tributario ?? undefined,
          resolucion: negocio?.resolucion_facturacion ?? undefined,
          prefijo: negocio?.prefijo_facturacion ?? undefined,
          logoUrl: negocio?.logo_url ?? undefined,
          numero: "PRUEBA",
          metodoPago: "Efectivo",
          cliente: "Prueba de impresión POS",
          items: [{ descripcion: "Tirilla térmica de prueba", cantidad: 1, precio: 1000 }],
          ivaPct: 0,
        },
        anchoTermico,
      );
      return;
    }
    const ok = await imprimirTirillaLocal({
      negocio: negocio?.razon_social || negocio?.nombre || "Mi negocio",
      numero: "PRUEBA",
      cliente: "Prueba de impresión",
      items: [{ descripcion: "Tirilla de prueba", cantidad: 1, precio: 1000 }],
      subtotal: 1000, iva: 0, ivaPct: 0, total: 1000, metodo: "Efectivo",
      formato: anchoTermico,
      impresora: leerImpresoraCaja() || undefined,
    });
    setApiMsg(ok ? `Impreso en ${leerImpresoraCaja() || est.predeterminada || "la de caja"} (${anchoTermico}).` : "No se pudo imprimir. Revisa la impresora de caja en Windows.");
  };

  const emitir = async () => {
    const validos = items.filter((i) => i.descripcion.trim().length >= 2 && i.cantidad > 0 && i.precio >= 0);
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (validos.length === 0) return toast.error("Agrega al menos un ítem con descripción, cantidad y precio.");
    const ivaPctNum = Math.min(Math.max(num(iva), 0), 100);
    const incPctNum = Math.min(Math.max(num(inc), 0), 100);
    const { data, error } = await supabase.rpc("fac_emitir", {
      p_cliente: cliente.trim(),
      p_cliente_doc: docCli.trim() || null,
      p_items: validos as never,
      p_iva: ivaPctNum,
      p_formato: formato === "carta" ? "carta" : formato,
      p_inc: incPctNum,
      p_retefuente: Math.min(Math.max(num(retefuente), 0), 100),
      p_reteiva: Math.min(Math.max(num(reteiva), 0), 100),
      p_reteica: Math.min(Math.max(num(reteica), 0), 30),
      p_metodo: metodoPago,
    });
    if (error) return toast.error(error.message.length < 220 ? error.message : "No se pudo emitir la factura.");
    const numero = (data as { numero?: number } | null)?.numero ?? 0;
    toast.success(`Factura ${numero} emitida.`);
    const correoSnapshot = correoCli.trim();
    const metodoSnapshot = metodoPago;
    setCliente(""); setDocCli(""); setCorreoCli(""); setItems([itemVacio()]);
    await cargar();
    const { data: recien } = await supabase.from("fac_emitidas").select("*").eq("numero", numero).limit(1).single();
    if (recien) {
      let datos: DatosFactura = {
        ...datosFactura(recien),
        clienteCorreo: correoSnapshot || undefined,
        metodoPago: metodoSnapshot,
        incPct: incPctNum,
      };
      if (negocio?.dian_activa) {
        try {
          const { data: cfg } = await supabase.rpc("mi_dian_config");
          const c = (cfg ?? {}) as { activa?: boolean; proveedor_url?: string; token_api?: string; prefijo?: string; resolucion?: string; ambiente?: string };
          if (c.activa && c.proveedor_url && c.token_api) {
            const payload = construirJsonFiscal({
              prefijo: c.prefijo ?? negocio.prefijo_facturacion ?? null,
              numero: recien.numero,
              resolucion: c.resolucion ?? negocio.resolucion_facturacion ?? null,
              negocio: datos.negocio,
              nit: datos.nit,
              regimen: negocio.regimen_tributario,
              responsabilidad: negocio.responsabilidad_fiscal,
              softwareId: negocio.dian_software_id,
              pin: negocio.dian_pin,
              cliente: datos.cliente,
              clienteDoc: datos.clienteNit,
              clienteCorreo: correoSnapshot || undefined,
              clienteTipoPersona: tipoPersona,
              metodoPago: metodoSnapshot,
              items: datos.items,
              ivaPct: datos.ivaPct ?? 0,
              incPct: incPctNum,
              retefuentePct: Math.min(Math.max(num(retefuente), 0), 100),
              reteivaPct: Math.min(Math.max(num(reteiva), 0), 100),
              reteicaPorMil: Math.min(Math.max(num(reteica), 0), 30),
              ambiente: c.ambiente ?? negocio.dian_ambiente ?? "Pruebas",
            });
            const r = await enviarFacturaDian(c.proveedor_url, c.token_api, payload);
            if (r.ok) {
              await guardarCufeQr(recien.id, r);
              datos = { ...datos, dianCufe: r.cufe, dianQr: r.qr, dianEstado: r.estado };
              toast.success(r.cufe ? "DIAN aceptada: CUFE guardado." : "Factura enviada a la DIAN.");
            } else {
              await marcarDianPendiente(recien.id, { error: r.error });
              toast.error(`Se emitió la factura, pero la DIAN no respondió: ${r.error}`);
            }
          } else {
            // Modo Habilitación / Pruebas sin webhook externo aún: genera CUFE SHA-384 simulado + QR verificable.
            const sim = await calcularCufeSimulado({
              prefijo: c.prefijo ?? negocio.prefijo_facturacion ?? "SETP",
              numero: recien.numero,
              nitEmisor: datos.nit,
              docCliente: datos.clienteNit ?? "",
              subtotal: recien.subtotal,
              iva: recien.iva,
              total: recien.total,
              pin: negocio.dian_pin ?? undefined,
              ambiente: c.ambiente ?? negocio.dian_ambiente ?? "Pruebas",
            });
            await guardarCufeQr(recien.id, { cufe: sim.cufe, qr: sim.qr, estado: "habilitacion", respuesta: { modo: "simulado_habilitacion" } });
            datos = { ...datos, dianCufe: sim.cufe, dianQr: sim.qr, dianEstado: "habilitacion" };
            toast.success("Factura emitida con CUFE y QR de habilitación DIAN.");
          }
        } catch {
          await marcarDianPendiente(recien.id, { error: "No se pudo contactar al proveedor DIAN." });
        }
        await cargar();
      }
      if (!navigator.onLine) {
        void guardarColaLocal({ numero: recien.numero, cliente: datos.cliente, items: validos, total: recien.total });
      }
      const formatoImprimir: FormatoFactura = formato;
      const anchoTermico: "58mm" | "80mm" = formato === "58mm" ? "58mm" : "80mm";
      if (directa && formato !== "carta") {
        const ok = await imprimirTirillaLocal({
          negocio: datos.negocio, nit: datos.nit, direccion: datos.direccion, telefono: datos.telefono,
          resolucion: datos.resolucion, numero: datos.numero, cliente: datos.cliente, clienteDoc: datos.clienteNit,
          items: datos.items, subtotal: recien.subtotal, iva: recien.iva, ivaPct: datos.ivaPct, total: recien.total,
          metodo: metodoSnapshot,
          cufe: datos.dianCufe ?? undefined, qr: datos.dianQr ?? undefined,
          formato: anchoTermico,
          impresora: leerImpresoraCaja() || undefined,
        });
        if (!ok) imprimirFactura(datos, formatoImprimir);
      } else {
        imprimirFactura(datos, formatoImprimir);
      }
    }
  };

  const cambiarItem = (i: number, parche: Partial<ItemFactura>) =>
    setItems((ls) => ls.map((x, k) => (k === i ? { ...x, ...parche } : x)));

  const total = items.reduce((s, i) => s + num(String(i.cantidad)) * num(String(i.precio)), 0);
  const rangoUso = facs.length > 0 ? Math.max(...facs.map((f) => f.numero)) : null;

  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="Facturación" texto="Factura tirilla o carta con consecutivo, NIT y resolución. Lista para conectarse por API a tu proveedor DIAN." />
      {negocio && !negocio.dian_activa && (
        <div className="mb-2 space-y-2 rounded-lg border border-primary/30 bg-glass/40 px-3 py-3">
          <p className="text-sm font-medium text-foreground">Tu cuenta está lista para Facturación Electrónica DIAN</p>
          <p className="text-xs text-muted-foreground">
            Cuando actives el servicio, cada factura se envía automáticamente a la DIAN y sale con su CUFE y su QR oficial en la tirilla y en el PDF. Este servicio adicional lo activa el administrador de Gosaryc.
          </p>
          <a
            href={enlaceSolicitudDian(negocio.nombre ?? "Mi negocio", negocio.nit ?? "")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Solicitar Activación DIAN por WhatsApp
          </a>
        </div>
      )}
      {negocio?.dian_activa && (
        <p className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Facturación electrónica DIAN activa: cada factura se envía automáticamente y guarda su CUFE y QR oficial.
        </p>
      )}
      {negocio?.resolucion_vence && (
        <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Tu resolución vence el {negocio.resolucion_vence}. Pide la nueva a la DIAN antes de esa fecha para no quedarte sin rango.
        </p>
      )}
      {negocio && (
        <p className="mb-2 text-xs text-muted-foreground">
          {negocio.razon_social || negocio.nombre} · {negocio.tipo_documento} {negocio.nit ?? "sin NIT"}{negocio.digito_verificacion ? `-${negocio.digito_verificacion}` : ""}
          {negocio.resolucion_facturacion ? ` · Res. ${negocio.resolucion_facturacion}` : " · Sin resolución registrada (complétala en Mi negocio)"}
          {rangoUso !== null ? ` · Último número: ${rangoUso}` : ""}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-glass-border bg-glass/40 px-3 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox" checked={directa} onChange={(e) => cambiarDirecta(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
          Impresión directa en caja (API local)
        </label>
        <button type="button" className={botonSec} onClick={() => void probarImpresora()}>
          <Printer className="h-4 w-4" /> Probar impresora
        </button>
        {apiMsg && <span className="text-xs text-muted-foreground">{apiMsg}</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o razón social" /></Campo>
        <Campo etiqueta="NIT o CC del cliente"><input className={campo} value={docCli} onChange={(e) => setDocCli(e.target.value)} placeholder="Opcional" /><ConsultorEmpresaNIT modo="rapido" valor={docCli} /></Campo>
        <Campo etiqueta="Correo del cliente (DIAN)"><input className={campo} type="email" value={correoCli} onChange={(e) => setCorreoCli(e.target.value)} placeholder="cliente@correo.com" /></Campo>
        <Campo etiqueta="Tipo de persona">
          <select className={campo} value={tipoPersona} onChange={(e) => setTipoPersona(e.target.value as "Natural" | "Jurídica")}>
            <option value="Natural">Persona Natural</option>
            <option value="Jurídica">Persona Jurídica</option>
          </select>
        </Campo>
        <Campo etiqueta="Medio de pago">
          <select className={campo} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia (Nequi / Daviplata / Bre-B)</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Crédito">Crédito</option>
          </select>
        </Campo>
        <Campo etiqueta="Formato de impresión">
          <select className={campo} value={formato} onChange={(e) => setFormato(e.target.value as "58mm" | "80mm" | "carta")}>
            <option value="58mm">Tirilla térmica 58 mm</option>
            <option value="80mm">Tirilla térmica 80 mm</option>
            <option value="carta">PDF / Carta</option>
          </select>
        </Campo>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-6"><Campo etiqueta={i === 0 ? "Descripción" : ""}><input className={campo} value={it.descripcion} onChange={(e) => cambiarItem(i, { descripcion: e.target.value })} placeholder="Producto o servicio" /></Campo></div>
            <div className="col-span-2"><Campo etiqueta={i === 0 ? "Cant." : ""}><input className={campo} inputMode="decimal" value={String(it.cantidad)} onChange={(e) => cambiarItem(i, { cantidad: num(e.target.value) })} /></Campo></div>
            <div className="col-span-3"><Campo etiqueta={i === 0 ? "Precio" : ""}><input className={campo} inputMode="decimal" value={String(it.precio)} onChange={(e) => cambiarItem(i, { precio: num(e.target.value) })} /></Campo></div>
            <div className="col-span-1">
              <button type="button" aria-label="Quitar ítem" className={botonSec} onClick={() => setItems((ls) => (ls.length > 1 ? ls.filter((_, k) => k !== i) : [itemVacio()]))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <button type="button" className={botonSec} onClick={() => setItems((ls) => [...ls, itemVacio()])}><Plus className="h-4 w-4" /> Ítem</button>
        <Campo etiqueta="IVA %"><input className={campo} inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} style={{ maxWidth: 92 }} /></Campo>
        <Campo etiqueta="INC %"><input className={campo} inputMode="decimal" value={inc} onChange={(e) => setInc(e.target.value)} style={{ maxWidth: 92 }} /></Campo>
        <Campo etiqueta="Retefuente %"><input className={campo} inputMode="decimal" value={retefuente} onChange={(e) => setRetefuente(e.target.value)} style={{ maxWidth: 92 }} /></Campo>
        <Campo etiqueta="ReteIVA % del IVA"><input className={campo} inputMode="decimal" value={reteiva} onChange={(e) => setReteiva(e.target.value)} style={{ maxWidth: 92 }} /></Campo>
        <Campo etiqueta="ReteICA ‰"><input className={campo} inputMode="decimal" value={reteica} onChange={(e) => setReteica(e.target.value)} style={{ maxWidth: 92 }} /></Campo>
        <div className="text-sm">
          {(() => {
            const ivaP = Math.min(Math.max(num(iva), 0), 100);
            const incP = Math.min(Math.max(num(inc), 0), 100);
            const ivaV = Math.round(total * (ivaP / 100));
            const incV = Math.round(total * (incP / 100));
            const ret = calcularRetenciones(total, ivaV, Math.min(Math.max(num(retefuente), 0), 100), Math.min(Math.max(num(reteiva), 0), 100), Math.min(Math.max(num(reteica), 0), 30));
            return (
              <>
                <p>Subtotal {dinero(Math.round(total))} · IVA {dinero(ivaV)} · INC {dinero(incV)}</p>
                <p>Total estimado: <strong>{dinero(Math.round(total) + ivaV + incV)}</strong></p>
                {ret.total_retenciones > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Retenciones: {dinero(ret.total_retenciones)} · Neto a recibir: <strong>{dinero(Math.round(total) + ivaV + incV - ret.total_retenciones)}</strong>
                  </p>
                )}
              </>
            );
          })()}
        </div>
        <button type="button" className={boton} onClick={() => void emitir()}>Emitir e imprimir</button>
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Facturas emitidas</p>
          <div className="flex gap-2">
            <button
              type="button" className={botonSec}
              onClick={() => exportarExcel("facturas-emitidas", ["Número", "Fecha", "Cliente", "Subtotal", "IVA", "Impoconsumo", "Retefuente", "ReteIVA", "ReteICA", "Total", "Neto a recibir"],
                facs.map((f) => [f.numero, new Date(f.created_at).toLocaleString("es-CO"), f.cliente, f.subtotal, f.iva, f.impoconsumo ?? 0, f.retefuente ?? 0, f.reteiva ?? 0, f.reteica ?? 0, f.total, f.neto_a_recibir || f.total]))}
            >
              Exportar a Excel
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {facs.slice(0, 40).map((f) => {
            const fmt: FormatoFactura = f.formato === "carta" ? "carta" : f.formato === "58mm" ? "58mm" : "80mm";
            return (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">
                    #{negocio?.prefijo_facturacion ? `${negocio.prefijo_facturacion}-` : ""}{f.numero} · {f.cliente} · {dinero(f.total)}
                    {f.dian_cufe ? " · DIAN ✓" : f.dian_estado && f.dian_estado !== "pendiente" && f.dian_estado !== "no_aplica" ? ` · DIAN ${f.dian_estado}` : ""}
                  </p>
                  {f.dian_cufe && (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">CUFE: {f.dian_cufe}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {f.dian_qr && /^https?:\/\//i.test(f.dian_qr) && (
                    <a href={f.dian_qr} target="_blank" rel="noopener noreferrer" className={botonSec}>
                      <ExternalLink className="h-3.5 w-3.5" /> QR DIAN
                    </a>
                  )}
                  <button type="button" className={botonSec} onClick={() => descargarDianFactura(f, "xml")}>
                    <Download className="h-3.5 w-3.5" /> XML
                  </button>
                  <button type="button" className={botonSec} onClick={() => descargarDianFactura(f, "json")}>
                    <Download className="h-3.5 w-3.5" /> JSON
                  </button>
                  <button type="button" className={botonSec} onClick={() => imprimirFactura(datosFactura(f), fmt)}>
                    <Printer className="h-4 w-4" /> PDF / Tirilla
                  </button>
                </div>
              </div>
            );
          })}
          {facs.length === 0 && <p className="text-sm text-muted-foreground">Aún no has emitido facturas.</p>}
        </div>
      </div>
    </GlassPanel>
  );
}

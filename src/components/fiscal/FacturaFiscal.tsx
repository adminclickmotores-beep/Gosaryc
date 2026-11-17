import { useCallback, useEffect, useState } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirFactura, type DatosFactura, type ItemFactura } from "@/lib/exportes";
import { estadoApiLocal, fijarImpresionDirecta, guardarColaLocal, impresionDirectaActivada, imprimirTirillaLocal } from "@/lib/impresion-local";

type Fac = Tables<"fac_emitidas">;

const itemVacio = (): ItemFactura => ({ descripcion: "", cantidad: 1, precio: 0 });

export function FacturaFiscal() {
  const { negocio } = useNegocio();
  const [facs, setFacs] = useState<Fac[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [docCli, setDocCli] = useState("");
  const [items, setItems] = useState<ItemFactura[]>([itemVacio()]);
  const [iva, setIva] = useState("");
  const [formato, setFormato] = useState<"tirilla" | "carta">("tirilla");
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
    numero: String(f.numero),
    cliente: f.cliente,
    clienteNit: f.cliente_doc ?? undefined,
    items: (Array.isArray(f.items) ? f.items : []) as ItemFactura[],
    ivaPct: f.subtotal > 0 ? Math.round((f.iva / f.subtotal) * 100) : 0,
  });

  const cambiarDirecta = (v: boolean) => {
    setDirecta(v);
    fijarImpresionDirecta(v);
  };

  const probarImpresora = async () => {
    setApiMsg("Buscando impresora…");
    const est = await estadoApiLocal();
    if (!est.disponible) {
      setApiMsg("La API local no está corriendo (¿estás en celular o navegador?). Se usa la impresión normal.");
      return;
    }
    const ok = await imprimirTirillaLocal({
      negocio: negocio?.razon_social || negocio?.nombre || "Mi negocio",
      numero: "PRUEBA",
      cliente: "Prueba de impresión",
      items: [{ descripcion: "Tirilla de prueba", cantidad: 1, precio: 1000 }],
      subtotal: 1000, iva: 0, ivaPct: 0, total: 1000, metodo: "Efectivo",
      formato: formato === "tirilla" ? "80mm" : "80mm",
    });
    setApiMsg(ok ? `Impreso en ${est.predeterminada || "la predeterminada"}.` : "No se pudo imprimir. Revisa la impresora predeterminada de Windows.");
  };

  const emitir = async () => {
    const validos = items.filter((i) => i.descripcion.trim().length >= 2 && i.cantidad > 0 && i.precio >= 0);
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (validos.length === 0) return toast.error("Agrega al menos un ítem con descripción, cantidad y precio.");
    const { data, error } = await supabase.rpc("fac_emitir", {
      p_cliente: cliente.trim(),
      p_cliente_doc: docCli.trim() || null,
      p_items: validos as never,
      p_iva: Math.min(Math.max(num(iva), 0), 100),
      p_formato: formato,
    });
    if (error) return toast.error(error.message.length < 220 ? error.message : "No se pudo emitir la factura.");
    const numero = (data as { numero?: number } | null)?.numero ?? 0;
    toast.success(`Factura ${numero} emitida.`);
    setCliente(""); setDocCli(""); setItems([itemVacio()]);
    await cargar();
    const { data: recien } = await supabase.from("fac_emitidas").select("*").eq("numero", numero).limit(1).single();
    if (recien) {
      const datos = datosFactura(recien);
      if (!navigator.onLine) {
        void guardarColaLocal({ numero: recien.numero, cliente, items: validos, total: recien.total });
      }
      if (directa) {
        const ok = await imprimirTirillaLocal({
          negocio: datos.negocio, nit: datos.nit, direccion: datos.direccion, telefono: datos.telefono,
          resolucion: datos.resolucion, numero: datos.numero, cliente: datos.cliente, clienteDoc: datos.clienteNit,
          items: datos.items, subtotal: recien.subtotal, iva: recien.iva, ivaPct: datos.ivaPct, total: recien.total,
          formato: formato === "tirilla" ? "80mm" : "80mm",
        });
        if (!ok) imprimirFactura(datos, formato); // Sin API local (celular): impresión normal, sin error.
      } else {
        imprimirFactura(datos, formato);
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
          Impresión directa por API local (escritorio)
        </label>
        <button type="button" className={botonSec} onClick={() => void probarImpresora()}>
          <Printer className="h-4 w-4" /> Probar impresora
        </button>
        {apiMsg && <span className="text-xs text-muted-foreground">{apiMsg}</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre o razón social" /></Campo>
        <Campo etiqueta="NIT o CC del cliente"><input className={campo} value={docCli} onChange={(e) => setDocCli(e.target.value)} placeholder="Opcional" /></Campo>
        <Campo etiqueta="Formato">
          <select className={campo} value={formato} onChange={(e) => setFormato(e.target.value as "tirilla" | "carta")}>
            <option value="tirilla">Tirilla 80 mm</option>
            <option value="carta">Carta</option>
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
        <Campo etiqueta="IVA %"><input className={campo} inputMode="decimal" value={iva} onChange={(e) => setIva(e.target.value)} style={{ maxWidth: 100 }} /></Campo>
        <p className="text-sm">Total estimado: <strong>{dinero(Math.round(total * (1 + Math.min(Math.max(num(iva), 0), 100) / 100)))}</strong></p>
        <button type="button" className={boton} onClick={() => void emitir()}>Emitir e imprimir</button>
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Facturas emitidas</p>
          <div className="flex gap-2">
            <button
              type="button" className={botonSec}
              onClick={() => exportarExcel("facturas-emitidas", ["Número", "Fecha", "Cliente", "Subtotal", "IVA", "Total"],
                facs.map((f) => [f.numero, new Date(f.created_at).toLocaleString("es-CO"), f.cliente, f.subtotal, f.iva, f.total]))}
            >
              Exportar a Excel
            </button>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {facs.slice(0, 40).map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm">
              <span>#{f.numero} · {f.cliente} · {dinero(f.total)}</span>
              <button type="button" className={botonSec} onClick={() => imprimirFactura(datosFactura(f), (f.formato === "carta" ? "carta" : "tirilla"))}>
                <Printer className="h-4 w-4" /> Reimprimir
              </button>
            </div>
          ))}
          {facs.length === 0 && <p className="text-sm text-muted-foreground">Aún no has emitido facturas.</p>}
        </div>
      </div>
    </GlassPanel>
  );
}

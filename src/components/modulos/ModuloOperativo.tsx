import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Ban, Banknote, CalendarClock, Download, History, MessageCircle,
  PackageMinus, PackagePlus, Printer, RefreshCw, Search, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesUpdate } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { buscarModulo } from "@/lib/modulos-negocio";
import { configModulo } from "@/lib/modulos-config";

type Registro = Tables<"modulo_registros">;
type Entrada = { f: string; t: string };
type Panel = { id: string; accion: "abono" | "renovar" | "anular" | "stock" } | null;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const botonSec =
  "inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-1.5 text-xs text-foreground hover:bg-glass/60";

const TIPOS_SALDO = ["cartera", "reserva", "pago", "huesped", "estudiante", "proyecto"];
const TIPOS_FECHA = ["cartera", "reserva", "cita", "vencimiento", "socio", "proyecto", "pago", "venta"];
const EXCLUIR_FLUJO = ["por_vencer", "vencido", "bajo", "agotado"];

const leerHistorial = (j: Json): Entrada[] => {
  if (!Array.isArray(j)) return [];
  const salida: Entrada[] = [];
  for (const x of j) {
    if (x && typeof x === "object" && !Array.isArray(x)) {
      const f = x.f;
      const t = x.t;
      if (typeof f === "string" && typeof t === "string") salida.push({ f, t });
    }
  }
  return salida;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hoyLocal = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
};

const diasHasta = (fecha: string, hoy: string) =>
  Math.round((new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86400000);

const fmtFechaHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
};

export function ModuloOperativo({ id }: { id: string }) {
  const modulo = buscarModulo(id);
  const cfg = configModulo(id);
  const tipo = cfg.tipo;
  const conSaldo = TIPOS_SALDO.includes(tipo);
  const conStock = tipo === "stock";
  const conAlertaFecha = TIPOS_FECHA.includes(tipo) || tipo === "general";
  const renovable = tipo === "vencimiento" || tipo === "socio";

  const [lista, setLista] = useState<Registro[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [hoy, setHoy] = useState("");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [abonoInicial, setAbonoInicial] = useState("");
  const [cantidadIni, setCantidadIni] = useState("");
  const [minimoIni, setMinimoIni] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [op, setOp] = useState("entrada");
  const [verHistorial, setVerHistorial] = useState<string | null>(null);

  useEffect(() => {
    setHoy(hoyLocal());
  }, []);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", id)
      .order("created_at", { ascending: false })
      .limit(500);
    setLista(data ?? []);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const flujo = useMemo(
    () => cfg.estados.filter((e) => !EXCLUIR_FLUJO.includes(e.clave) && !e.clave.includes("cancel")),
    [cfg],
  );
  const estadoCancel = cfg.estados.find((e) => e.clave.includes("cancel"))?.clave;
  const textoEstado = (clave: string) => cfg.estados.find((e) => e.clave === clave)?.texto ?? clave;

  const cerrado = (r: Registro) => r.anulado || cfg.cerrados.includes(r.estado);

  const estadoStock = (cant: number, min: number) => (cant <= 0 ? "agotado" : cant <= min ? "bajo" : "pendiente");

  const estadoTrasAbono = (completo: boolean): string | null => {
    if (tipo === "cartera") return completo ? "pagado" : "abonado";
    if (tipo === "reserva") return "abonado";
    if (tipo === "pago") return completo ? "hecho" : "en_proceso";
    if (tipo === "estudiante" || tipo === "proyecto" || tipo === "huesped") return "en_proceso";
    return null;
  };

  /** Alerta de fecha: texto + si es crítica. */
  const alertaFecha = (r: Registro): { texto: string; critica: boolean } | null => {
    if (!hoy || !r.fecha || cerrado(r) || !conAlertaFecha) return null;
    const d = diasHasta(r.fecha, hoy);
    if (d < 0) return { texto: `Vencido hace ${-d} ${-d === 1 ? "día" : "días"}`, critica: true };
    if (d === 0) return { texto: "Es hoy", critica: true };
    if (d <= 7) return { texto: `Faltan ${d} ${d === 1 ? "día" : "días"}`, critica: false };
    return null;
  };

  const alertaStock = (r: Registro): string | null => {
    if (!conStock || r.anulado) return null;
    if (r.cantidad <= 0) return "Agotado: hay que reponer";
    if (r.cantidad <= r.minimo) return `Bajo el mínimo (${r.minimo})`;
    return null;
  };

  const tieneAlerta = (r: Registro) => Boolean(alertaFecha(r) || alertaStock(r));

  const guardar = async (r: Registro, cambios: TablesUpdate<"modulo_registros">, texto: string) => {
    const hist = [...leerHistorial(r.historial), { f: new Date().toISOString(), t: texto }];
    const { error } = await supabase
      .from("modulo_registros")
      .update({ ...cambios, historial: hist as unknown as Json })
      .eq("id", r.id);
    if (error) {
      toast.error("No se pudo guardar el cambio.");
      return false;
    }
    await cargar();
    return true;
  };

  const limpiarPanel = () => {
    setPanel(null);
    setValor("");
    setNota("");
    setOp("entrada");
  };

  const agregar = async () => {
    const precio = monto.trim() ? Number(monto) : 0;
    if (!titulo.trim() || !Number.isFinite(precio) || precio < 0) return toast.error("Escribe un título y un valor válido.");
    if (cfg.exigeFecha && !fecha) return toast.error(`Indica la fecha: ${cfg.etiquetaFecha.toLowerCase()}.`);
    let abonado = 0;
    let cantidad = 0;
    let minimo = 0;
    let estado = cfg.estados[0].clave;
    const hist: Entrada[] = [{ f: new Date().toISOString(), t: "Registro creado" }];
    if (conSaldo && abonoInicial.trim()) {
      abonado = Number(abonoInicial);
      if (!Number.isFinite(abonado) || abonado < 0) return toast.error("El abono inicial no es válido.");
      if (abonado > precio) return toast.error("El abono no puede ser mayor al valor total.");
      if (abonado > 0) {
        const e = estadoTrasAbono(abonado >= precio && precio > 0);
        if (e) estado = e;
        hist.push({ f: new Date().toISOString(), t: `Abono inicial de ${dinero(abonado)}` });
      }
    }
    if (conStock) {
      cantidad = cantidadIni.trim() ? Number(cantidadIni) : 0;
      minimo = minimoIni.trim() ? Number(minimoIni) : 0;
      if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isFinite(minimo) || minimo < 0) {
        return toast.error("La cantidad y el mínimo deben ser números válidos.");
      }
      estado = estadoStock(cantidad, minimo);
      if (cantidad > 0) hist.push({ f: new Date().toISOString(), t: `Existencia inicial: ${cantidad}` });
    }
    const { error } = await supabase.from("modulo_registros").insert({
      modulo: id,
      estado,
      titulo: titulo.trim(),
      detalle: detalle.trim() || null,
      contacto: contacto.trim() || null,
      telefono: telefono.trim() || null,
      monto: precio,
      fecha: fecha || null,
      abonado,
      cantidad,
      minimo,
      historial: hist as unknown as Json,
    });
    if (error) return toast.error("No se pudo guardar el registro.");
    setTitulo(""); setDetalle(""); setContacto(""); setTelefono(""); setMonto(""); setFecha("");
    setAbonoInicial(""); setCantidadIni(""); setMinimoIni("");
    toast.success("Registro guardado.");
    cargar();
  };

  const avanzar = async (r: Registro) => {
    const i = flujo.findIndex((e) => e.clave === r.estado);
    const sig = flujo[i + 1];
    if (!sig) return;
    const cierra = cfg.cerrados.includes(sig.clave);
    const saldo = r.monto - r.abonado;
    if (cierra && saldo > 0 && (tipo === "reserva" || tipo === "huesped")) {
      return toast.error(`Aún hay un saldo de ${dinero(saldo)}. Registra el abono antes de cerrar.`);
    }
    const cambios: TablesUpdate<"modulo_registros"> = { estado: sig.clave };
    let texto = `Estado: ${textoEstado(r.estado)} → ${sig.texto}`;
    if (cierra && saldo > 0 && (tipo === "cartera" || tipo === "pago")) {
      cambios.abonado = r.monto;
      texto += ` (se saldó ${dinero(saldo)})`;
    }
    if (await guardar(r, cambios, texto)) toast.success(`Pasó a "${sig.texto}".`);
  };

  const registrarAbono = async (r: Registro) => {
    const v = Number(valor);
    const saldo = r.monto - r.abonado;
    if (!Number.isFinite(v) || v <= 0) return toast.error("Escribe un valor mayor a cero.");
    if (v > saldo) return toast.error(`El abono no puede pasar del saldo (${dinero(saldo)}).`);
    const nuevo = r.abonado + v;
    const completo = nuevo >= r.monto;
    const estado = estadoTrasAbono(completo);
    const cambios: TablesUpdate<"modulo_registros"> = { abonado: nuevo };
    if (estado && !cerrado(r)) cambios.estado = estado;
    const ok = await guardar(r, cambios, `Abono de ${dinero(v)}${nota.trim() ? ` · ${nota.trim()}` : ""}. Saldo: ${dinero(r.monto - nuevo)}`);
    if (ok) {
      toast.success(completo ? "Quedó saldado." : "Abono registrado.");
      limpiarPanel();
    }
  };

  const renovar = async (r: Registro) => {
    if (!valor) return toast.error("Elige la nueva fecha.");
    if (r.fecha && valor <= r.fecha) return toast.error("La nueva fecha debe ser posterior a la actual.");
    const ok = await guardar(
      r,
      { fecha: valor, estado: cfg.estados[0].clave },
      `Renovado: ${r.fecha ?? "sin fecha"} → ${valor}${nota.trim() ? ` · ${nota.trim()}` : ""}`,
    );
    if (ok) {
      toast.success("Renovado con la nueva fecha.");
      limpiarPanel();
    }
  };

  const anular = async (r: Registro) => {
    if (nota.trim().length < 3) return toast.error("Escribe el motivo de la anulación.");
    const cambios: TablesUpdate<"modulo_registros"> = { anulado: true, motivo_anulacion: nota.trim() };
    if (estadoCancel) cambios.estado = estadoCancel;
    const ok = await guardar(r, cambios, `Anulado · ${nota.trim()}`);
    if (ok) {
      toast.success("Registro anulado.");
      limpiarPanel();
    }
  };

  const moverStock = async (r: Registro) => {
    const v = Number(valor);
    if (!Number.isFinite(v) || v < 0 || (op !== "ajuste" && v <= 0)) return toast.error("Escribe una cantidad válida.");
    if (op === "merma" && nota.trim().length < 3) return toast.error("Indica el motivo de la merma.");
    let nueva = r.cantidad;
    if (op === "entrada") nueva = r.cantidad + v;
    else if (op === "ajuste") nueva = v;
    else nueva = r.cantidad - v;
    if (nueva < 0) return toast.error(`No hay suficiente: existen ${r.cantidad}.`);
    const nombres: Record<string, string> = { entrada: "Entrada", salida: "Salida", merma: "Merma", ajuste: "Conteo físico" };
    const ok = await guardar(
      r,
      { cantidad: nueva, estado: estadoStock(nueva, r.minimo) },
      `${nombres[op]}: ${op === "ajuste" ? `de ${r.cantidad} a ${nueva}` : v} · existencia ${nueva}${nota.trim() ? ` · ${nota.trim()}` : ""}`,
    );
    if (ok) {
      toast.success("Movimiento registrado.");
      limpiarPanel();
    }
  };

  const borrar = async (r: Registro) => {
    if (!window.confirm("¿Eliminar este registro definitivamente? Si solo quieres cancelarlo, usa Anular.")) return;
    const { error } = await supabase.from("modulo_registros").delete().eq("id", r.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  const whatsapp = (r: Registro) => {
    const t = (r.telefono ?? "").replace(/\D/g, "");
    if (!t) return;
    const numero = t.length === 10 ? `57${t}` : t;
    let msg = `Hola ${r.contacto ?? ""}, te escribimos por "${r.titulo}".`;
    if (conSaldo && r.monto - r.abonado > 0) msg += ` Tienes un saldo pendiente de ${dinero(r.monto - r.abonado)}.`;
    if (r.fecha && tipo !== "general") msg += ` Fecha: ${r.fecha}.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const imprimir = (r: Registro) => {
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return toast.error("Permite las ventanas emergentes para imprimir.");
    const fila = (a: string, b: string) => `<div class="f"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
    const hist = leerHistorial(r.historial)
      .map((h) => `<div class="h">${esc(fmtFechaHora(h.f))} · ${esc(h.t)}</div>`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante</title><style>
      @page{size:80mm auto;margin:4mm}body{font-family:monospace;font-size:12px;width:72mm;margin:0 auto;color:#000}
      h1{font-size:14px;text-align:center;margin:0 0 2px}.c{text-align:center;margin-bottom:6px}
      .f{display:flex;justify-content:space-between;gap:8px;margin:2px 0}hr{border:0;border-top:1px dashed #000;margin:6px 0}.h{font-size:10px;margin:1px 0}
    </style></head><body>
      <h1>${esc(modulo?.titulo ?? "Comprobante")}</h1><div class="c">${esc(new Date().toLocaleString("es-CO"))}</div><hr>
      ${fila("Concepto", r.titulo)}
      ${r.contacto ? fila(cfg.etiquetaContacto, r.contacto) : ""}
      ${r.telefono ? fila("Teléfono", r.telefono) : ""}
      ${r.fecha ? fila(cfg.etiquetaFecha, r.fecha) : ""}
      ${fila("Estado", r.anulado ? "Anulado" : textoEstado(r.estado))}
      <hr>${fila(cfg.etiquetaMonto.replace(" (COP)", ""), dinero(r.monto))}
      ${conSaldo ? fila("Abonado", dinero(r.abonado)) + fila("Saldo", dinero(r.monto - r.abonado)) : ""}
      ${conStock ? fila("Existencia", String(r.cantidad)) : ""}
      ${r.detalle ? `<hr><div>${esc(r.detalle)}</div>` : ""}
      ${r.anulado ? `<hr><div>ANULADO: ${esc(r.motivo_anulacion ?? "")}</div>` : ""}
      ${hist ? `<hr>${hist}` : ""}
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportar = () => {
    const celda = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const cab = ["Título", "Contacto", "Teléfono", "Fecha", "Estado", "Valor", "Abonado", "Saldo", "Cantidad", "Mínimo", "Anulado", "Motivo", "Creado"];
    const filas = visibles.map((r) => [
      r.titulo, r.contacto, r.telefono, r.fecha, r.anulado ? "Anulado" : textoEstado(r.estado), r.monto, r.abonado,
      r.monto - r.abonado, r.cantidad, r.minimo, r.anulado ? "Sí" : "No", r.motivo_anulacion, r.created_at,
    ].map(celda).join(","));
    const csv = "﻿" + [cab.map(celda).join(","), ...filas].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-${hoy || "reporte"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!modulo) {
    return (
      <GlassPanel className="space-y-3 p-6">
        <p className="text-foreground">Este módulo no existe.</p>
        <Link to="/restaurante" className="text-sm text-primary">Volver al panel</Link>
      </GlassPanel>
    );
  }

  const activos = lista.filter((r) => !r.anulado);
  const q = busca.trim().toLowerCase();
  const visibles = lista
    .filter((r) => {
      if (filtro === "anulados") return r.anulado;
      if (filtro === "alertas") return tieneAlerta(r);
      if (filtro !== "todos" && r.estado !== filtro) return false;
      return !(filtro !== "todos" && r.anulado);
    })
    .filter((r) => !q || [r.titulo, r.contacto, r.telefono, r.detalle].some((x) => (x ?? "").toLowerCase().includes(q)));

  const abiertos = activos.filter((r) => !cfg.cerrados.includes(r.estado));
  const pendiente = abiertos.reduce((s, r) => s + (conSaldo ? r.monto - r.abonado : r.monto), 0);
  const total = activos.reduce((s, r) => s + r.monto, 0);
  const cobrado = activos.reduce((s, r) => s + r.abonado, 0);
  const conAlerta = activos.filter(tieneAlerta).length;
  const valorInventario = activos.reduce((s, r) => s + r.cantidad * r.monto, 0);

  const tarjetas: { t: string; v: string }[] = conStock
    ? [
        { t: "Artículos", v: String(activos.length) },
        { t: "Valor del inventario", v: dinero(valorInventario) },
        { t: "A reponer", v: String(conAlerta) },
      ]
    : [
        { t: "Registros activos", v: String(activos.length) },
        { t: cfg.resumen, v: dinero(pendiente) },
        { t: conSaldo ? "Recibido en abonos" : "Total", v: dinero(conSaldo ? cobrado : total) },
        { t: "Con alerta", v: String(conAlerta) },
      ];

  const filtros = [
    { clave: "todos", texto: "Todos" },
    ...cfg.estados,
    { clave: "alertas", texto: `Con alerta (${conAlerta})` },
    { clave: "anulados", texto: "Anulados" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <modulo.Icon className="h-7 w-7 text-primary" /> {modulo.titulo}
        </h1>
        <p className="text-sm text-muted-foreground">{modulo.descripcion}</p>
      </div>

      <div className={`grid gap-3 ${tarjetas.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3"}`}>
        {tarjetas.map((c) => (
          <GlassPanel key={c.t} className="p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className="truncate text-lg font-medium text-foreground">{c.v}</p>
          </GlassPanel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nuevo registro</h2>
          <input className={campo} placeholder={cfg.placeholderTitulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <textarea className={campo} rows={2} placeholder={cfg.placeholderDetalle} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
          <input className={campo} placeholder={cfg.etiquetaContacto} value={contacto} onChange={(e) => setContacto(e.target.value)} />
          <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className={campo} placeholder={cfg.etiquetaMonto} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
          {conSaldo && (
            <input className={campo} placeholder="Abono inicial (COP, opcional)" inputMode="decimal" value={abonoInicial} onChange={(e) => setAbonoInicial(e.target.value)} />
          )}
          {conStock && (
            <div className="grid grid-cols-2 gap-2">
              <input className={campo} placeholder="Cantidad inicial" inputMode="decimal" value={cantidadIni} onChange={(e) => setCantidadIni(e.target.value)} />
              <input className={campo} placeholder="Stock mínimo" inputMode="decimal" value={minimoIni} onChange={(e) => setMinimoIni(e.target.value)} />
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{cfg.etiquetaFecha}{cfg.exigeFecha ? " *" : ""}</span>
            <input className={campo} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Guardar registro
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={`${campo} pl-9`} placeholder="Buscar por nombre, contacto o teléfono" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <button onClick={exportar} disabled={visibles.length === 0} className={botonSec}>
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {filtros.map((e) => (
              <button
                key={e.clave}
                onClick={() => setFiltro(e.clave)}
                className={`rounded-full px-4 py-1.5 ${filtro === e.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
              >
                {e.texto}
              </button>
            ))}
          </div>
          {visibles.length === 0 && <p className="text-sm text-muted-foreground">No hay registros para mostrar.</p>}
          {visibles.map((r) => {
            const af = alertaFecha(r);
            const as = alertaStock(r);
            const saldo = r.monto - r.abonado;
            const i = flujo.findIndex((e) => e.clave === r.estado);
            const sig = i >= 0 ? flujo[i + 1] : undefined;
            const abierto = panel?.id === r.id;
            const hist = leerHistorial(r.historial);
            return (
              <GlassPanel key={r.id} className={`space-y-2 p-4 ${r.anulado ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`min-w-0 break-words text-sm font-medium text-foreground ${r.anulado ? "line-through" : ""}`}>{r.titulo}</p>
                  <span className="shrink-0 rounded-full border border-glass-border px-2.5 py-0.5 text-xs text-muted-foreground">
                    {r.anulado ? "Anulado" : textoEstado(r.estado)}
                  </span>
                </div>
                {r.detalle && <p className="break-words text-xs text-muted-foreground">{r.detalle}</p>}
                <p className="break-words text-xs text-muted-foreground">
                  {[r.contacto, r.telefono, r.fecha].filter(Boolean).join(" · ")}
                </p>
                {(af || as) && (
                  <p className={`flex items-center gap-1.5 text-xs ${af?.critica || as ? "text-destructive" : "text-primary"}`}>
                    <AlertTriangle className="h-3.5 w-3.5" /> {as ?? af?.texto}
                  </p>
                )}
                {r.anulado && <p className="break-words text-xs text-destructive">Motivo: {r.motivo_anulacion}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
                  <span>{dinero(r.monto)}</span>
                  {conSaldo && (
                    <span className="text-xs text-muted-foreground">
                      Abonado {dinero(r.abonado)} · Saldo <span className="text-foreground">{dinero(saldo)}</span>
                    </span>
                  )}
                  {conStock && (
                    <span className="text-xs text-muted-foreground">
                      Existencia <span className="text-foreground">{r.cantidad}</span> · Mínimo {r.minimo}
                    </span>
                  )}
                </div>

                {!r.anulado && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sig && !conStock && (
                      <button onClick={() => avanzar(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                        <ArrowRight className="h-3.5 w-3.5" /> Pasar a {sig.texto}
                      </button>
                    )}
                    {conSaldo && saldo > 0 && (
                      <button onClick={() => { limpiarPanel(); setPanel({ id: r.id, accion: "abono" }); }} className={botonSec}>
                        <Banknote className="h-3.5 w-3.5" /> Abono
                      </button>
                    )}
                    {conStock && (
                      <button onClick={() => { limpiarPanel(); setPanel({ id: r.id, accion: "stock" }); }} className={botonSec}>
                        {op === "salida" ? <PackageMinus className="h-3.5 w-3.5" /> : <PackagePlus className="h-3.5 w-3.5" />} Movimiento
                      </button>
                    )}
                    {renovable && (
                      <button onClick={() => { limpiarPanel(); setPanel({ id: r.id, accion: "renovar" }); }} className={botonSec}>
                        <RefreshCw className="h-3.5 w-3.5" /> Renovar
                      </button>
                    )}
                    {r.telefono && (
                      <button onClick={() => whatsapp(r)} className={botonSec}>
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    )}
                    <button onClick={() => { limpiarPanel(); setPanel({ id: r.id, accion: "anular" }); }} className={botonSec}>
                      <Ban className="h-3.5 w-3.5" /> Anular
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => imprimir(r)} className={botonSec}>
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                  <button onClick={() => setVerHistorial(verHistorial === r.id ? null : r.id)} className={botonSec}>
                    <History className="h-3.5 w-3.5" /> Historial ({hist.length})
                  </button>
                  {r.anulado && (
                    <button onClick={() => borrar(r)} className={botonSec}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>

                {abierto && panel && (
                  <div className="space-y-2 rounded-lg border border-glass-border bg-glass/30 p-3">
                    {panel.accion === "abono" && (
                      <>
                        <p className="text-xs text-muted-foreground">Saldo actual: {dinero(saldo)}</p>
                        <input className={campo} placeholder="Valor del abono (COP)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
                        <input className={campo} placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => registrarAbono(r)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Registrar abono</button>
                          <button onClick={limpiarPanel} className={botonSec}>Cancelar</button>
                        </div>
                      </>
                    )}
                    {panel.accion === "renovar" && (
                      <>
                        <label className="block space-y-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Nueva fecha</span>
                          <input className={campo} type="date" value={valor} onChange={(e) => setValor(e.target.value)} />
                        </label>
                        <input className={campo} placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => renovar(r)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Renovar</button>
                          <button onClick={limpiarPanel} className={botonSec}>Cancelar</button>
                        </div>
                      </>
                    )}
                    {panel.accion === "anular" && (
                      <>
                        <p className="text-xs text-muted-foreground">El registro queda en el historial como anulado y deja de sumar.</p>
                        <input className={campo} placeholder="Motivo de la anulación *" value={nota} onChange={(e) => setNota(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => anular(r)} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground">Confirmar anulación</button>
                          <button onClick={limpiarPanel} className={botonSec}>Cancelar</button>
                        </div>
                      </>
                    )}
                    {panel.accion === "stock" && (
                      <>
                        <p className="text-xs text-muted-foreground">Existencia actual: {r.cantidad}</p>
                        <select className={campo} value={op} onChange={(e) => setOp(e.target.value)}>
                          <option value="entrada">Entrada (compra o ingreso)</option>
                          <option value="salida">Salida (uso o venta)</option>
                          <option value="merma">Merma (daño o pérdida)</option>
                          <option value="ajuste">Conteo físico (fijar existencia)</option>
                        </select>
                        <input className={campo} placeholder={op === "ajuste" ? "Cantidad contada" : "Cantidad"} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
                        <input className={campo} placeholder={op === "merma" ? "Motivo de la merma *" : "Nota (opcional)"} value={nota} onChange={(e) => setNota(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => moverStock(r)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Registrar</button>
                          <button onClick={limpiarPanel} className={botonSec}>Cancelar</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {verHistorial === r.id && (
                  <ul className="space-y-1 rounded-lg border border-glass-border bg-glass/30 p-3 text-xs text-muted-foreground">
                    {hist.length === 0 && <li>Sin movimientos todavía.</li>}
                    {[...hist].reverse().map((h, k) => (
                      <li key={`${h.f}-${k}`} className="break-words">
                        <span className="text-foreground">{fmtFechaHora(h.f)}</span> · {h.t}
                      </li>
                    ))}
                  </ul>
                )}
              </GlassPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

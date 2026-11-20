import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/cotizaciones")({
  head: () => ({ meta: [{ title: "Cotizaciones" }] }),
  component: CotizacionesPage,
});

type Cotizacion = Tables<"cotizaciones">;
type Linea = { descripcion: string; cantidad: number; precio: number };

const ESTADOS = [
  { clave: "borrador", texto: "Borrador" },
  { clave: "enviada", texto: "Enviada" },
  { clave: "aceptada", texto: "Aceptada" },
  { clave: "rechazada", texto: "Rechazada" },
];

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const lineasDe = (c: Cotizacion): Linea[] => (Array.isArray(c.items) ? (c.items as unknown as Linea[]) : []);

function CotizacionesPage() {
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [plazoEntrega, setPlazoEntrega] = useState("");
  const [vigente, setVigente] = useState("");
  const [notas, setNotas] = useState("");
  const [descuento, setDescuento] = useState("");
  const [lineas, setLineas] = useState<{ descripcion: string; cantidad: string; precio: string }[]>([
    { descripcion: "", cantidad: "1", precio: "" },
  ]);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error("No se pudieron cargar las cotizaciones.");
    setLista(data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Datos que manda el CRM y Embudo IA al pulsar «Crear cotización».
  useEffect(() => {
    const crudo = window.sessionStorage.getItem("crm:cotizar");
    if (!crudo) return;
    window.sessionStorage.removeItem("crm:cotizar");
    try {
      const d = JSON.parse(crudo) as { cliente?: string; telefono?: string; nota?: string; valor?: number };
      setCliente(String(d.cliente ?? "").slice(0, 80));
      setTelefono(String(d.telefono ?? "").slice(0, 20));
      setNotas(String(d.nota ?? "").slice(0, 300));
      if (d.valor && d.valor > 0) setLineas([{ descripcion: String(d.nota ?? "").slice(0, 80), cantidad: "1", precio: String(Math.round(d.valor)) }]);
    } catch {
      // datos ilegibles: se ignoran
    }
  }, []);

  const lineasValidas: Linea[] = lineas
    .map((l) => ({ descripcion: l.descripcion.trim(), cantidad: Number(l.cantidad), precio: Number(l.precio) }))
    .filter((l) => l.descripcion && Number.isFinite(l.cantidad) && l.cantidad > 0 && Number.isFinite(l.precio) && l.precio >= 0);
  const subtotal = lineasValidas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const desc = Math.min(Math.max(Number(descuento) || 0, 0), subtotal);
  const total = subtotal - desc;

  const actualizarLinea = (i: number, parte: Partial<{ descripcion: string; cantidad: string; precio: string }>) =>
    setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, ...parte } : l)));

  const guardar = async () => {
    if (!cliente.trim()) return toast.error("Escribe el nombre del cliente.");
    if (lineasValidas.length === 0) return toast.error("Agrega al menos un producto o servicio con cantidad y precio.");
    const numero = lista.reduce((m, c) => Math.max(m, c.numero), 0) + 1;
    const { error } = await supabase.from("cotizaciones").insert({
      numero,
      cliente: cliente.trim(),
      telefono: telefono.trim() || null,
      documento: documento.trim() || null,
      correo: correo.trim() || null,
      direccion: direccion.trim() || null,
      forma_pago: formaPago.trim() || null,
      plazo_entrega: plazoEntrega.trim() || null,
      items: lineasValidas,
      descuento: desc,
      total,
      vigente_hasta: vigente || null,
      notas: notas.trim() || null,
    });
    if (error) return toast.error("No se pudo guardar la cotización.");
    toast.success(`Cotización #${numero} guardada.`);
    setCliente("");
    setTelefono("");
    setDocumento("");
    setCorreo("");
    setDireccion("");
    setFormaPago("");
    setPlazoEntrega("");
    setVigente("");
    setNotas("");
    setDescuento("");
    setLineas([{ descripcion: "", cantidad: "1", precio: "" }]);
    cargar();
  };

  const cambiarEstado = async (c: Cotizacion, estado: string) => {
    const { error } = await supabase.from("cotizaciones").update({ estado }).eq("id", c.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
  };

  const borrar = async (c: Cotizacion) => {
    const { error } = await supabase.from("cotizaciones").delete().eq("id", c.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  const textoWhatsapp = (c: Cotizacion) => {
    const filas = lineasDe(c)
      .map((l) => `- ${l.descripcion} x${l.cantidad}: ${dinero(l.cantidad * l.precio)}`)
      .join("\n");
    const desct = c.descuento > 0 ? `\nDescuento: ${dinero(c.descuento)}` : "";
    const vig = c.vigente_hasta ? `\nVálida hasta: ${c.vigente_hasta}` : "";
    return `Cotización #${c.numero} para ${c.cliente}\n${filas}${desct}\nTotal: ${dinero(c.total)}${vig}`;
  };

  const enviar = (c: Cotizacion) => {
    const tel = (c.telefono ?? "").replace(/\D/g, "");
    const base = tel ? `https://wa.me/${tel.length === 10 ? `57${tel}` : tel}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(textoWhatsapp(c))}`, "_blank", "noopener");
  };

  const visibles = filtro === "todos" ? lista : lista.filter((c) => c.estado === filtro);
  const abiertas = lista.filter((c) => c.estado === "borrador" || c.estado === "enviada").reduce((s, c) => s + c.total, 0);
  const aceptadas = lista.filter((c) => c.estado === "aceptada").reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <FileText className="h-7 w-7 text-primary" /> Cotizaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Arma una propuesta con productos o servicios, envíala por WhatsApp y sigue si el cliente la acepta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Cotizaciones</p>
          <p className="text-lg font-medium text-foreground">{lista.length}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Por cerrar</p>
          <p className="truncate text-lg font-medium text-foreground">{dinero(abiertas)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Aceptadas</p>
          <p className="truncate text-lg font-medium text-foreground">{dinero(aceptadas)}</p>
        </GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nueva cotización</h2>
          <input className={campo} placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <input className={campo} placeholder="WhatsApp / teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className={campo} placeholder="Documento o NIT (opcional)" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          <input className={campo} inputMode="email" placeholder="Correo (opcional)" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <input className={campo} placeholder="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={campo} placeholder="Forma de pago (ej. 50% anticipo)" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} />
            <input className={campo} placeholder="Plazo de entrega (ej. 5 días)" value={plazoEntrega} onChange={(e) => setPlazoEntrega(e.target.value)} />
          </div>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Productos o servicios</span>
            {lineas.map((l, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-glass-border p-2">
                <input className={campo} placeholder="Descripción" value={l.descripcion} onChange={(e) => actualizarLinea(i, { descripcion: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input className={`${campo} w-24 shrink-0`} placeholder="Cant." inputMode="decimal" value={l.cantidad} onChange={(e) => actualizarLinea(i, { cantidad: e.target.value })} />
                  <input className={campo} placeholder="Precio unitario" inputMode="decimal" value={l.precio} onChange={(e) => actualizarLinea(i, { precio: e.target.value })} />
                  {lineas.length > 1 && (
                    <button type="button" aria-label="Quitar" onClick={() => setLineas((ls) => ls.filter((_, k) => k !== i))} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLineas((ls) => [...ls, { descripcion: "", cantidad: "1", precio: "" }])}
              className="inline-flex items-center gap-1 text-sm text-primary"
            >
              <Plus className="h-4 w-4" /> Agregar línea
            </button>
          </div>
          <input className={campo} placeholder="Descuento (valor)" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Válida hasta</span>
            <input className={campo} type="date" value={vigente} onChange={(e) => setVigente(e.target.value)} />
          </label>
          <textarea className={campo} rows={2} placeholder="Notas o condiciones (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-medium text-foreground">{dinero(total)}</span>
          </div>
          <button onClick={guardar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Guardar cotización
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[{ clave: "todos", texto: "Todas" }, ...ESTADOS].map((e) => (
              <button
                key={e.clave}
                onClick={() => setFiltro(e.clave)}
                className={`rounded-full px-4 py-1.5 ${filtro === e.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
              >
                {e.texto}
              </button>
            ))}
          </div>
          {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay cotizaciones.</p>}
          {visibles.map((c) => (
            <GlassPanel key={c.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">
                  #{c.numero} · {c.cliente}
                </p>
                <button onClick={() => borrar(c)} aria-label="Eliminar" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {lineasDe(c).map((l, i) => (
                  <li key={i} className="break-words">
                    {l.descripcion} x{l.cantidad} · {dinero(l.cantidad * l.precio)}
                  </li>
                ))}
              </ul>
              {c.vigente_hasta && <p className="text-xs text-muted-foreground">Válida hasta {c.vigente_hasta}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{dinero(c.total)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enviar(c)}
                    className="inline-flex items-center gap-1 rounded-lg border border-glass-border px-2 py-1.5 text-xs text-foreground"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>
                  <select
                    className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1.5 text-base text-foreground"
                    value={c.estado}
                    onChange={(e) => cambiarEstado(c, e.target.value)}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.clave} value={e.clave}>{e.texto}</option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";

type Lav = Tables<"lav_ordenes">;
type Prof = Tables<"prof_casos">;
type Tec = Tables<"tec_proyectos">;
type Pap = Tables<"pap_encargos">;
type Joy = Tables<"joy_piezas">;
type Lic = Tables<"lic_domicilios">;
type Parq = Tables<"parq_turnos">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);

const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

async function cobrar(tabla: string, id: string, valorTxt: string, metodo: string): Promise<boolean> {
  if (num(valorTxt) <= 0) {
    toast.error("Escribe el valor del abono o cobro.");
    return false;
  }
  const { error } = await supabase.rpc("ofi_cobrar", { p_tabla: tabla, p_id: id, p_valor: num(valorTxt), p_metodo: metodo });
  if (error) {
    toast.error(msg(error.message, "No se pudo cobrar."));
    return false;
  }
  toast.success("Cobro registrado. Entró a Caja y Contabilidad.");
  return true;
}

function Cobro({ tabla, id, onListo }: { tabla: string; id: string; onListo: () => void }) {
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Campo etiqueta="Abono o cobro"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} style={{ maxWidth: 130 }} /></Campo>
      <Campo etiqueta="Método">
        <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </Campo>
      <button type="button" className={botonSec} onClick={() => void cobrar(tabla, id, valor, metodo).then((ok) => { if (ok) { setValor(""); onListo(); } })}>
        Cobrar
      </button>
    </div>
  );
}

// ============================================================
// Lavandería: órdenes de lavado con cobro
// ============================================================
export function LavanderiaOrdenes() {
  const [lista, setLista] = useState<Lav[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [prendas, setPrendas] = useState("");
  const [total, setTotal] = useState("");
  const [entrega, setEntrega] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("lav_ordenes").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (prendas.trim().length < 2) return toast.error("Describe las prendas.");
    const { error } = await supabase.from("lav_ordenes").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null, prendas: prendas.trim(),
      total: Math.max(num(total), 0), entrega: entrega || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCliente(""); setTel(""); setPrendas(""); setTotal(""); setEntrega("");
    toast.success("Orden de lavado creada.");
    void cargar();
  };

  const avanzar = async (o: Lav, estado: string) => {
    await supabase.from("lav_ordenes").update({ estado }).eq("id", o.id);
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando lavandería…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Órdenes de lavado y cobro" descripcion="Prendas recibidas, fecha de entrega y cobro que entra a Caja y Contabilidad." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Prendas"><input className={campo} value={prendas} onChange={(e) => setPrendas(e.target.value)} placeholder="2 pantalones, 3 camisas…" /></Campo>
        <Campo etiqueta="Total"><input className={campo} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} /></Campo>
        <Campo etiqueta="Entrega"><input type="date" className={campo} value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Recibir prendas</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.filter((o) => o.estado !== "cobrado").map((o) => {
          const wa = aWhatsapp(o.telefono, `Hola ${o.cliente}, tus prendas (${o.prendas}) ya están listas. Total ${dinero(o.total)}, abono ${dinero(o.abono)}, saldo ${dinero(Math.max(o.total - o.abono, 0))}.`);
          return (
            <div key={o.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{o.cliente} <span className="text-xs text-muted-foreground">· {o.estado}{o.entrega ? ` · entrega ${o.entrega}` : ""}</span></p>
              <p className="text-xs text-muted-foreground">{o.prendas} · total {dinero(o.total)} · abono {dinero(o.abono)} · saldo {dinero(Math.max(o.total - o.abono, 0))}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {o.estado === "recibida" && <button type="button" className={botonSec} onClick={() => void avanzar(o, "en_proceso")}>A proceso</button>}
                {o.estado === "en_proceso" && <button type="button" className={botonSec} onClick={() => void avanzar(o, "lista")}>Lista</button>}
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Avisar</a>}
              </div>
              <Cobro tabla="lav_ordenes" id={o.id} onListo={() => void cargar()} />
            </div>
          );
        })}
        {lista.filter((o) => o.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Sin órdenes abiertas.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Profesionales: casos y cobro de honorarios
// ============================================================
export function ProfesionalCasos() {
  const [lista, setLista] = useState<Prof[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [asunto, setAsunto] = useState("");
  const [honorarios, setHonorarios] = useState("");
  const [vence, setVence] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("prof_casos").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (asunto.trim().length < 3) return toast.error("Describe el asunto o caso.");
    const { error } = await supabase.from("prof_casos").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null, asunto: asunto.trim(),
      honorarios: Math.max(num(honorarios), 0), vence: vence || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCliente(""); setTel(""); setAsunto(""); setHonorarios(""); setVence("");
    toast.success("Caso abierto.");
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando casos…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Casos y cobro de honorarios" descripcion="Asunto, honorarios pactados y abonos; cada cobro entra a Caja y Contabilidad." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Asunto"><input className={campo} value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Tutela, declaración, contrato…" /></Campo>
        <Campo etiqueta="Honorarios"><input className={campo} inputMode="decimal" value={honorarios} onChange={(e) => setHonorarios(e.target.value)} /></Campo>
        <Campo etiqueta="Vence"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Abrir caso</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.filter((c) => c.estado !== "cobrado").map((c) => {
          const wa = aWhatsapp(c.telefono, `Hola ${c.cliente}, te escribimos por "${c.asunto}": honorarios ${dinero(c.honorarios)}, abono ${dinero(c.abono)}, saldo ${dinero(Math.max(c.honorarios - c.abono, 0))}.`);
          return (
            <div key={c.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{c.cliente} · {c.asunto} <span className="text-xs text-muted-foreground">({c.estado}{c.vence ? ` · vence ${c.vence}` : ""})</span></p>
              <p className="text-xs text-muted-foreground">Honorarios {dinero(c.honorarios)} · abono {dinero(c.abono)} · saldo {dinero(Math.max(c.honorarios - c.abono, 0))}</p>
              {wa && <a className={`${botonSec} mt-1`} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Cobrar por WhatsApp</a>}
              <Cobro tabla="prof_casos" id={c.id} onListo={() => void cargar()} />
            </div>
          );
        })}
        {lista.filter((c) => c.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Sin casos abiertos.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Agencia digital: proyectos y cobro
// ============================================================
export function TecnologiaProyectos() {
  const [lista, setLista] = useState<Tec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [alcance, setAlcance] = useState("");
  const [valor, setValor] = useState("");
  const [horas, setHoras] = useState("");
  const [entrega, setEntrega] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("tec_proyectos").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (alcance.trim().length < 3) return toast.error("Describe el alcance del proyecto.");
    const { error } = await supabase.from("tec_proyectos").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null, alcance: alcance.trim(),
      valor: Math.max(num(valor), 0), horas: Math.max(num(horas), 0), entrega: entrega || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCliente(""); setTel(""); setAlcance(""); setValor(""); setHoras(""); setEntrega("");
    toast.success("Proyecto registrado.");
    void cargar();
  };

  const avanzar = async (p: Tec, estado: string) => {
    await supabase.from("tec_proyectos").update({ estado }).eq("id", p.id);
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando proyectos…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Proyectos y cobro" descripcion="Alcance, horas y valor con abonos; cada cobro entra a Caja y Contabilidad." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Alcance"><input className={campo} value={alcance} onChange={(e) => setAlcance(e.target.value)} placeholder="Sitio web, campaña, logo…" /></Campo>
        <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo etiqueta="Horas estimadas"><input className={campo} inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} /></Campo>
        <Campo etiqueta="Entrega"><input type="date" className={campo} value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Campo>
      </div>
      <button type="button" className={`${boton} mt-2`} onClick={() => void crear()}>Registrar proyecto</button>
      <div className="mt-3 space-y-2">
        {lista.filter((p) => p.estado !== "cobrado").map((p) => (
          <div key={p.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{p.cliente} · {p.alcance} <span className="text-xs text-muted-foreground">({p.estado}{p.entrega ? ` · entrega ${p.entrega}` : ""})</span></p>
            <p className="text-xs text-muted-foreground">Valor {dinero(p.valor)} · {p.horas} h · abono {dinero(p.abono)} · saldo {dinero(Math.max(p.valor - p.abono, 0))}</p>
            <div className="mt-1 flex gap-2">
              {p.estado === "cotizado" && <button type="button" className={botonSec} onClick={() => void avanzar(p, "en_proceso")}>Iniciar</button>}
              {p.estado === "en_proceso" && <button type="button" className={botonSec} onClick={() => void avanzar(p, "entregado")}>Entregar</button>}
            </div>
            <Cobro tabla="tec_proyectos" id={p.id} onListo={() => void cargar()} />
          </div>
        ))}
        {lista.filter((p) => p.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Sin proyectos abiertos.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Papelería: encargos y copias con cobro
// ============================================================
export function PapeleriaEncargos() {
  const [lista, setLista] = useState<Pap[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [detalle, setDetalle] = useState("");
  const [valor, setValor] = useState("");
  const [entrega, setEntrega] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("pap_encargos").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (detalle.trim().length < 3) return toast.error("Describe el encargo.");
    const { error } = await supabase.from("pap_encargos").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null, detalle: detalle.trim(),
      valor: Math.max(num(valor), 0), entrega: entrega || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCliente(""); setTel(""); setDetalle(""); setValor(""); setEntrega("");
    toast.success("Encargo recibido.");
    void cargar();
  };

  const avanzar = async (p: Pap, estado: string) => {
    await supabase.from("pap_encargos").update({ estado }).eq("id", p.id);
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando encargos…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Encargos y copias con cobro" descripcion="Detalle, fecha de entrega y cobro que entra a Caja y Contabilidad." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Detalle"><input className={campo} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="100 copias, pendón 2x1…" /></Campo>
        <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo etiqueta="Entrega"><input type="date" className={campo} value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Recibir encargo</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.filter((p) => p.estado !== "cobrado").map((p) => (
          <div key={p.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{p.cliente} · {p.detalle} <span className="text-xs text-muted-foreground">({p.estado}{p.entrega ? ` · entrega ${p.entrega}` : ""})</span></p>
            <p className="text-xs text-muted-foreground">Valor {dinero(p.valor)} · abono {dinero(p.abono)} · saldo {dinero(Math.max(p.valor - p.abono, 0))}</p>
            <div className="mt-1 flex gap-2">
              {p.estado === "recibido" && <button type="button" className={botonSec} onClick={() => void avanzar(p, "produccion")}>A producción</button>}
              {p.estado === "produccion" && <button type="button" className={botonSec} onClick={() => void avanzar(p, "lista")}>Lista</button>}
            </div>
            <Cobro tabla="pap_encargos" id={p.id} onListo={() => void cargar()} />
          </div>
        ))}
        {lista.filter((p) => p.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Sin encargos abiertos.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Joyería: piezas, apartados y venta
// ============================================================
export function JoyeriaPiezas() {
  const [lista, setLista] = useState<Joy[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descripcion, setDescripcion] = useState("");
  const [material, setMaterial] = useState("");
  const [peso, setPeso] = useState("");
  const [precio, setPrecio] = useState("");
  const [cliente, setCliente] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("joy_piezas").select("*").order("created_at", { ascending: false }).limit(100);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (descripcion.trim().length < 3) return toast.error("Describe la pieza.");
    const { error } = await supabase.from("joy_piezas").insert({
      descripcion: descripcion.trim(), material: material.trim() || null, peso: peso.trim() || null,
      precio: Math.max(num(precio), 0), cliente: cliente.trim() || null,
      estado: cliente.trim() ? "apartada" : "disponible",
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setDescripcion(""); setMaterial(""); setPeso(""); setPrecio(""); setCliente("");
    toast.success("Pieza registrada.");
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando joyería…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Piezas, apartados y venta" descripcion="Material, peso y precio; aparta con abono y cobra el saldo contra entrega." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Descripción"><input className={campo} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Anillo oro 18k…" /></Campo>
        <Campo etiqueta="Material"><input className={campo} value={material} onChange={(e) => setMaterial(e.target.value)} /></Campo>
        <Campo etiqueta="Peso"><input className={campo} value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="5.2 g" /></Campo>
        <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        <Campo etiqueta="Apartada para (opcional)"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Registrar pieza</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.filter((j) => j.estado !== "cobrado").map((j) => (
          <div key={j.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{j.descripcion} <span className="text-xs text-muted-foreground">· {j.estado}{j.cliente ? ` · ${j.cliente}` : ""}</span></p>
            <p className="text-xs text-muted-foreground">{[j.material, j.peso].filter(Boolean).join(" · ")} · precio {dinero(j.precio)} · abono {dinero(j.abono)} · saldo {dinero(Math.max(j.precio - j.abono, 0))}</p>
            <Cobro tabla="joy_piezas" id={j.id} onListo={() => void cargar()} />
          </div>
        ))}
        {lista.filter((j) => j.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Vitrina al día: sin piezas pendientes.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Licorera: domicilios verificados con cobro
// ============================================================
export function LicoreraDomicilios() {
  const [lista, setLista] = useState<Lic[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [doc, setDoc] = useState("");
  const [edad, setEdad] = useState(false);
  const [pedido, setPedido] = useState("");
  const [total, setTotal] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("lic_domicilios").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (pedido.trim().length < 2) return toast.error("Describe el pedido.");
    const { error } = await supabase.from("lic_domicilios").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null, documento: doc.trim() || null,
      edad_ok: edad, pedido: pedido.trim(), total: Math.max(num(total), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCliente(""); setTel(""); setDoc(""); setEdad(false); setPedido(""); setTotal("");
    toast.success("Domicilio registrado.");
    void cargar();
  };

  const avanzar = async (l: Lic, estado: string) => {
    await supabase.from("lic_domicilios").update({ estado }).eq("id", l.id);
    void cargar();
  };

  if (cargando) return <Cargando texto="Cargando domicilios…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Domicilios verificados y cobro" descripcion="Verifica la mayoría de edad con el documento: sin eso no deja cobrar. El pago entra a Caja." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Documento (verificación de edad)"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="CC de quien recibe" /></Campo>
        <Campo etiqueta="Pedido"><input className={campo} value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="Six pack, media de ron…" /></Campo>
        <Campo etiqueta="Total"><input className={campo} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} /></Campo>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={edad} onChange={(e) => setEdad(e.target.checked)} /> Mayor de edad verificado
        </label>
      </div>
      <button type="button" className={`${boton} mt-2`} onClick={() => void crear()}>Registrar domicilio</button>
      <div className="mt-3 space-y-2">
        {lista.filter((l) => l.estado !== "cobrado").map((l) => (
          <div key={l.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{l.cliente} · {l.pedido} <span className="text-xs text-muted-foreground">({l.estado})</span></p>
            <p className="text-xs text-muted-foreground">
              Total {dinero(l.total)} · abono {dinero(l.abono)} · saldo {dinero(Math.max(l.total - l.abono, 0))}
              {l.edad_ok ? " · edad verificada" : " · ⚠ falta verificar la edad"}
            </p>
            {l.estado === "recibido" && <button type="button" className={`${botonSec} mt-1`} onClick={() => void avanzar(l, "en_ruta")}>En ruta</button>}
            {!l.edad_ok && <p className="mt-1 text-xs text-destructive">Registra el documento y marca la verificación para poder cobrar.</p>}
            <Cobro tabla="lic_domicilios" id={l.id} onListo={() => void cargar()} />
          </div>
        ))}
        {lista.filter((l) => l.estado !== "cobrado").length === 0 && <p className="text-sm text-muted-foreground">Sin domicilios pendientes.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Parqueadero: turnos por horas con cobro automático
// ============================================================
export function ParqueaderoTurnos() {
  const [lista, setLista] = useState<Parq[]>([]);
  const [cargando, setCargando] = useState(true);
  const [placa, setPlaca] = useState("");
  const [tarifa, setTarifa] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("parq_turnos").select("*").order("entrada", { ascending: false }).limit(100);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ingresar = async () => {
    if (placa.trim().length < 3) return toast.error("Escribe la placa.");
    if (num(tarifa) <= 0) return toast.error("Escribe la tarifa por hora.");
    const { error } = await supabase.from("parq_turnos").insert({
      placa: placa.trim().toUpperCase(), tarifa: num(tarifa),
    });
    if (error) return toast.error(msg(error.message, "No se pudo registrar el ingreso."));
    setPlaca("");
    toast.success("Vehículo adentro. El tiempo ya corre.");
    void cargar();
  };

  const activos = lista.filter((p) => p.estado === "activo");
  const minutos = (entrada: string) => Math.max(0, Math.round((Date.now() - new Date(entrada).getTime()) / 60000));

  if (cargando) return <Cargando texto="Cargando parqueadero…" />;
  return (
    <GlassPanel>
      <Encabezado titulo="Turnos y cobro por horas" descripcion="Registra la placa al entrar; al salir cobra las horas por la tarifa. Entra a Caja y Contabilidad." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Placa"><input className={campo} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC123" /></Campo>
        <Campo etiqueta="Tarifa por hora"><input className={campo} inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} placeholder="3000" /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void ingresar()}>Registrar ingreso</button></div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Adentro ahora: {activos.length} vehículo(s).</p>
      <div className="mt-2 space-y-2">
        {activos.map((p) => {
          const min = minutos(p.entrada);
          const estimado = Math.max(Math.round((min / 60) * p.tarifa), p.tarifa);
          return (
            <div key={p.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{p.placa} <span className="text-xs text-muted-foreground">· lleva {min} min · tarifa {dinero(p.tarifa)}/h</span></p>
              <p className="text-xs text-muted-foreground">Cobro estimado al salir: {dinero(estimado)}</p>
              <Cobro tabla="parq_turnos" id={p.id} onListo={() => void cargar()} />
            </div>
          );
        })}
        {activos.length === 0 && <p className="text-sm text-muted-foreground">Parqueadero vacío.</p>}
      </div>
    </GlassPanel>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, CalendarCheck, Store, ShieldCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

const campo =
  "w-full rounded-xl border border-glass-border bg-glass/40 px-3.5 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function enlaceWhats(diez: string, texto: string): string {
  const d = (diez || "").replace(/\D/g, "");
  const num = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

type Item = { id: string; nombre: string; precio: number };

/** Enlace público universal: catálogo con pedido por WhatsApp + solicitud de cita online. */
export function EnlaceUniversal({ dueno, nombre, telefono, descripcion }: { dueno: string; nombre: string; telefono: string; descripcion: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [citaNombre, setCitaNombre] = useState("");
  const [citaTel, setCitaTel] = useState("");
  const [citaFecha, setCitaFecha] = useState("");
  const [citaHora, setCitaHora] = useState("");
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [valido, setValido] = useState<{ trabajador: string; empresa: string; tipo: string; concepto: string; fecha: string; vence: string | null; codigo: string } | null>(null);
  const [noHallado, setNoHallado] = useState(false);
  const [cotiTipo, setCotiTipo] = useState("Exámenes ocupacionales");
  const [cotiNombre, setCotiNombre] = useState("");
  const [cotiTel, setCotiTel] = useState("");

  type Validacion = { trabajador?: unknown; empresa?: unknown; tipo?: unknown; concepto?: unknown; fecha?: unknown; vence?: unknown; codigo?: unknown };
  const validar = async () => {
    if (codigo.trim().length < 4 || validando) return;
    setValidando(true);
    setNoHallado(false);
    setValido(null);
    const { data } = await supabase.rpc("sst_validar_certificado", { p_codigo: codigo.trim() });
    setValidando(false);
    const r = (data ?? null) as Validacion | null;
    if (r && typeof r.trabajador === "string") {
      setValido({
        trabajador: r.trabajador,
        empresa: typeof r.empresa === "string" ? r.empresa : "",
        tipo: typeof r.tipo === "string" ? r.tipo : "",
        concepto: typeof r.concepto === "string" ? r.concepto : "",
        fecha: typeof r.fecha === "string" ? r.fecha : "",
        vence: typeof r.vence === "string" ? r.vence : null,
        codigo: typeof r.codigo === "string" ? r.codigo : "",
      });
    } else {
      setNoHallado(true);
    }
  };

  useEffect(() => {
    void (async () => {
      const [a, b] = await Promise.all([
        supabase.from("com_productos").select("id,nombre,precio_detal").eq("owner_id", dueno).eq("activo", true).order("nombre").limit(200),
        supabase.from("restaurante_productos").select("id,nombre,precio").eq("owner_id", dueno).eq("activo", true).order("nombre").limit(200),
      ]);
      const lista: Item[] = [
        ...((a.data ?? []).map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio_detal })) as Item[]),
        ...((b.data ?? []).map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio })) as Item[]),
      ];
      setItems(lista.slice(0, 200));
    })();
  }, [dueno]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Store className="h-7 w-7" /></div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl text-foreground">{nombre}</h1>
          {descripcion ? <p className="text-sm text-muted-foreground">{descripcion}</p> : null}
        </div>
      </div>

      <GlassPanel className="mt-5 space-y-2 p-5">
        <h2 className="font-medium text-foreground">Catálogo</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Escríbenos por WhatsApp y te enviamos el catálogo completo.</p>}
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 border-b border-glass-border pb-2 text-sm last:border-0">
            <span className="min-w-0 break-words text-foreground">{p.nombre} · {dinero(p.precio)}</span>
            <a href={enlaceWhats(telefono, `Hola ${nombre}, me interesa: ${p.nombre} (${dinero(p.precio)})`)} target="_blank" rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <MessageCircle className="h-3 w-3" /> Pedir
            </a>
          </div>
        ))}
        <a href={enlaceWhats(telefono, `Hola ${nombre}, quiero hacer un pedido.`)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-foreground">
          <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
        </a>
      </GlassPanel>

      <GlassPanel className="mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4" /> Validar certificado de aptitud</h2>
        <p className="text-sm text-muted-foreground">Escribe el código seguro del certificado y comprueba que sea válido.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={campo} placeholder="Código seguro (ej. a1b2c3d4)" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <button
            type="button"
            onClick={() => void validar()}
            disabled={validando || codigo.trim().length < 4}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" /> {validando ? "Verificando…" : "Verificar"}
          </button>
        </div>
        {valido && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <p className="font-semibold text-foreground">Certificado válido · {valido.codigo}</p>
            <p className="mt-1 break-words text-muted-foreground">Trabajador: {valido.trabajador} · Empresa: {valido.empresa}</p>
            <p className="break-words text-muted-foreground">Evaluación: {valido.tipo} · Concepto: {valido.concepto}</p>
            <p className="break-words text-muted-foreground">Fecha: {valido.fecha}{valido.vence ? ` · Vence: ${valido.vence}` : ""}</p>
          </div>
        )}
        {noHallado && (
          <p className="text-sm text-rose-300">No encontramos un certificado con ese código. Revisa las letras y los números.</p>
        )}
      </GlassPanel>

      <GlassPanel className="mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-medium text-foreground"><FileText className="h-4 w-4" /> Cotiza exámenes, outsourcing o capacitaciones</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className={campo} value={cotiTipo} onChange={(e) => setCotiTipo(e.target.value)} aria-label="Tipo de cotización">
            {["Exámenes ocupacionales", "Outsourcing SG-SST", "Capacitación o brigada"].map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
          <input className={campo} placeholder="Tu nombre *" value={cotiNombre} onChange={(e) => setCotiNombre(e.target.value)} />
          <input className={campo} placeholder="Tu teléfono *" inputMode="tel" value={cotiTel} onChange={(e) => setCotiTel(e.target.value)} />
        </div>
        <a
          href={enlaceWhats(telefono, `Hola ${nombre}, quiero una cotización de ${cotiTipo}. Nombre: ${cotiNombre || "-"}, teléfono: ${cotiTel || "-"}`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Solicitar cotización por WhatsApp
        </a>
      </GlassPanel>

      <GlassPanel className="mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-medium text-foreground"><CalendarCheck className="h-4 w-4" /> Pide tu cita online</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={campo} placeholder="Tu nombre *" value={citaNombre} onChange={(e) => setCitaNombre(e.target.value)} />
          <input className={campo} placeholder="Tu teléfono *" inputMode="tel" value={citaTel} onChange={(e) => setCitaTel(e.target.value)} />
          <input className={campo} type="date" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} aria-label="Fecha de la cita" />
          <input className={campo} type="time" value={citaHora} onChange={(e) => setCitaHora(e.target.value)} aria-label="Hora de la cita" />
        </div>
        <a
          href={enlaceWhats(telefono, `Hola ${nombre}, quiero una cita. Nombre: ${citaNombre || "-"}, teléfono: ${citaTel || "-"}, fecha: ${citaFecha || "-"}, hora: ${citaHora || "-"}`)}
          target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <CalendarCheck className="h-4 w-4" /> Solicitar cita por WhatsApp
        </a>
      </GlassPanel>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/welcome" className="underline">Abrir panel del negocio</Link>
      </p>
    </div>
  );
}

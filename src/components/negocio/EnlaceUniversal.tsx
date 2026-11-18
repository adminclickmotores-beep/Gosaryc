import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, CalendarCheck, Store, ShieldCheck, FileText, ImageOff, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { LIMITES, limpiarCodigo, limpiarTelefono, limpiarTexto } from "@/lib/validacion-publica";

const campo =
  "w-full rounded-xl border border-glass-border bg-glass/40 px-3.5 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function enlaceWhats(diez: string, texto: string): string {
  const d = (diez || "").replace(/\D/g, "");
  const num = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

type Item = { id: string; nombre: string; precio: number; imagen: string | null; descripcion: string | null };

/** ¿Este tipo de negocio es Salud Ocupacional / SG-SST / Medicina Laboral? Solo esos ven las tarjetas SST. */
function esNegocioSST(tipo: string | null | undefined): boolean {
  return /sst|sg-sst|salud ocupacional|medicina laboral|seguridad y salud/i.test((tipo ?? "").trim());
}

/** Familias que trabajan por citas o visitas (muestran la tarjeta de agendamiento). El comercio puro solo muestra catálogo. */
const CLAVES_CON_CITA = new Set([
  "servicios", "salud", "mascotas", "belleza", "educacion", "profesional", "eventos",
  "optica", "taller", "concesionario", "alquiler_vehiculos", "tecnologia", "inmobiliaria", "seguridad_aseo",
]);

/** Familias cuyo "catálogo" son servicios, no productos (cambia el título de la tarjeta). */
const CLAVES_SERVICIOS = new Set([
  "servicios", "salud", "mascotas", "belleza", "educacion", "profesional", "eventos", "optica",
]);

/**
 * Enlace público universal: muestra ÚNICAMENTE las tarjetas del tipo de negocio
 * de la cuenta visitada (resuelta por su owner_id). Nada se consulta sin ese
 * owner_id y las tarjetas de Salud Ocupacional solo existen para negocios SST.
 */
export function EnlaceUniversal({ dueno, nombre, telefono, descripcion, tipoNegocio }: { dueno: string; nombre: string; telefono: string; descripcion: string; tipoNegocio?: string | null }) {
  const [items, setItems] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState<Item | null>(null);
  const [cantidad, setCantidad] = useState(1);
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

  const esSST = esNegocioSST(tipoNegocio);
  const clave = resolverTipoNegocio(tipoNegocio).clave;
  const muestraCita = !esSST && CLAVES_CON_CITA.has(clave);
  const esTaller = clave === "taller" || clave === "concesionario" || clave === "alquiler_vehiculos";
  const tituloCatalogo = esSST ? "Catálogo" : CLAVES_SERVICIOS.has(clave) ? "Servicios y precios" : "Catálogo";

  type Validacion = { trabajador?: unknown; empresa?: unknown; tipo?: unknown; concepto?: unknown; fecha?: unknown; vence?: unknown; codigo?: unknown };
  const validar = async () => {
    if (codigo.trim().length < 4 || validando) return;
    setValidando(true);
    setNoHallado(false);
    setValido(null);
    const { data } = await supabase.rpc("sst_validar_certificado", { p_codigo: limpiarCodigo(codigo) });
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
    // Sin owner_id no se consulta nada: nunca se muestran datos de otra cuenta.
    if (!dueno) {
      setItems([]);
      return;
    }
    void (async () => {
      const [a, b] = await Promise.all([
        supabase.from("com_productos").select("id,nombre,precio_detal,imagen_url").eq("owner_id", dueno).eq("activo", true).order("nombre").limit(200),
        supabase.from("restaurante_productos").select("id,nombre,precio,imagen_url,descripcion").eq("owner_id", dueno).eq("activo", true).order("nombre").limit(200),
      ]);
      const lista: Item[] = [
        ...(a.data ?? []).map((p): Item => ({ id: p.id, nombre: p.nombre, precio: p.precio_detal, imagen: p.imagen_url, descripcion: null })),
        ...(b.data ?? []).map((p): Item => ({ id: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagen_url, descripcion: p.descripcion })),
      ];
      setItems(lista.slice(0, 200));
    })();
  }, [dueno]);

  if (!dueno) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <GlassPanel className="p-8 text-center">
          <h1 className="font-display text-2xl text-foreground">Enlace no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">Revisa el enlace con el equipo que te lo envió.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Store className="h-7 w-7" /></div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl text-foreground">{nombre}</h1>
          {descripcion ? <p className="text-sm text-muted-foreground">{descripcion}</p> : null}
        </div>
      </div>

      <GlassPanel className="mt-5 space-y-3 p-5">
        <h2 className="font-medium text-foreground">{tituloCatalogo}</h2>
        {items.length === 0 && <p className="text-sm text-muted-foreground">Escríbenos por WhatsApp y te enviamos {CLAVES_SERVICIOS.has(clave) ? "la disponibilidad y los precios" : "el catálogo completo"}.</p>}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setAbierto(p); setCantidad(1); }}
                className="group min-w-0 overflow-hidden rounded-2xl border border-glass-border bg-card text-left shadow-sm transition hover:shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} loading="lazy" className="h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/50"><ImageOff className="h-10 w-10" /></span>
                  )}
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="break-words text-sm font-medium leading-snug text-foreground">{p.nombre}</p>
                  <p className="precio-esmeralda text-base font-semibold">{dinero(p.precio)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        <a href={enlaceWhats(telefono, `Hola ${nombre}, quiero hacer un pedido.`)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-foreground">
          <MessageCircle className="h-4 w-4" /> Pedir por WhatsApp
        </a>
      </GlassPanel>

      {esSST && (
        <GlassPanel className="mt-4 space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4" /> Validar certificado de aptitud</h2>
          <p className="text-sm text-muted-foreground">Escribe el código seguro del certificado y comprueba que sea válido.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={campo} placeholder="Código seguro (ej. a1b2c3d4)" value={codigo} maxLength={LIMITES.codigo} onChange={(e) => setCodigo(limpiarCodigo(e.target.value))} />
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
      )}

      {esSST && (
        <GlassPanel className="mt-4 space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-medium text-foreground"><FileText className="h-4 w-4" /> Cotiza exámenes, outsourcing o capacitaciones</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={campo} value={cotiTipo} onChange={(e) => setCotiTipo(e.target.value)} aria-label="Tipo de cotización">
              {["Exámenes ocupacionales", "Outsourcing SG-SST", "Capacitación o brigada"].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <input className={campo} placeholder="Tu nombre *" maxLength={LIMITES.nombre} value={cotiNombre} onChange={(e) => setCotiNombre(e.target.value)} />
            <input className={campo} placeholder="Tu teléfono *" inputMode="tel" type="tel" maxLength={LIMITES.telefono} value={cotiTel} onChange={(e) => setCotiTel(limpiarTelefono(e.target.value))} />
          </div>
          <a
            href={enlaceWhats(telefono, `Hola ${nombre}, quiero una cotización de ${cotiTipo}. Nombre: ${limpiarTexto(cotiNombre, LIMITES.nombre) || "-"}, teléfono: ${limpiarTelefono(cotiTel) || "-"}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Solicitar cotización por WhatsApp
          </a>
        </GlassPanel>
      )}

      {muestraCita && (
        <GlassPanel className="mt-4 space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-medium text-foreground"><CalendarCheck className="h-4 w-4" /> {esTaller ? "Agenda tu servicio o visita" : "Pide tu cita online"}</h2>
          {esTaller && <p className="text-sm text-muted-foreground">Reserva mantenimiento, revisión o visita para ver un vehículo.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={campo} placeholder="Tu nombre *" maxLength={LIMITES.nombre} value={citaNombre} onChange={(e) => setCitaNombre(e.target.value)} />
            <input className={campo} placeholder="Tu teléfono *" inputMode="tel" type="tel" maxLength={LIMITES.telefono} value={citaTel} onChange={(e) => setCitaTel(limpiarTelefono(e.target.value))} />
            <input className={campo} type="date" value={citaFecha} onChange={(e) => setCitaFecha(e.target.value)} aria-label="Fecha de la cita" />
            <input className={campo} type="time" value={citaHora} onChange={(e) => setCitaHora(e.target.value)} aria-label="Hora de la cita" />
          </div>
          <a
            href={enlaceWhats(telefono, `Hola ${nombre}, quiero ${esTaller ? "agendar un servicio" : "una cita"}. Nombre: ${limpiarTexto(citaNombre, LIMITES.nombre) || "-"}, teléfono: ${limpiarTelefono(citaTel) || "-"}, fecha: ${citaFecha || "-"}, hora: ${citaHora || "-"}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <CalendarCheck className="h-4 w-4" /> {esTaller ? "Solicitar agendamiento por WhatsApp" : "Solicitar cita por WhatsApp"}
          </a>
        </GlassPanel>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setAbierto(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={abierto.nombre}
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[92dvh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-t-3xl border border-glass-border bg-background shadow-2xl sm:rounded-3xl md:grid-cols-2"
          >
            <button type="button" aria-label="Cerrar" onClick={() => setAbierto(null)} className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75">
              <X className="h-5 w-5" />
            </button>
            <div className="group relative aspect-[4/3] w-full overflow-hidden bg-muted md:aspect-auto md:min-h-[340px]">
              {abierto.imagen ? (
                <img src={abierto.imagen} alt={abierto.nombre} className="absolute inset-0 h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/50"><ImageOff className="h-16 w-16" /></span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-4 p-5">
              <div>
                <h3 className="break-words pr-10 font-display text-2xl leading-tight text-foreground">{abierto.nombre}</h3>
                <p className="precio-esmeralda mt-1 text-2xl font-semibold">{dinero(abierto.precio)}</p>
                {abierto.descripcion && <p className="mt-2 break-words text-sm text-muted-foreground">{abierto.descripcion}</p>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Quitar uno" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="rounded-full border border-glass-border p-2.5"><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center text-lg font-semibold tabular-nums">{cantidad}</span>
                  <button type="button" aria-label="Agregar uno" onClick={() => setCantidad((c) => Math.min(50, c + 1))} className="rounded-full border border-glass-border p-2.5"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <a
                href={enlaceWhats(telefono, `Hola ${nombre}, quiero pedir:\n${cantidad} x ${abierto.nombre}\nTotal: ${dinero(abierto.precio * cantidad)}`)}
                target="_blank"
                rel="noreferrer"
                className="btn-pro mt-auto flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-semibold"
              >
                <MessageCircle className="h-5 w-5" /> Pedir por WhatsApp · {dinero(abierto.precio * cantidad)}
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/welcome" className="underline">Abrir panel del negocio</Link>
      </p>
    </div>
  );
}

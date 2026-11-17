import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { enlaceSolicitudDian } from "@/lib/dian";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { AgenteWhatsApp } from "@/components/restaurante/AgenteWhatsApp";
import { MenuQR } from "@/components/restaurante/MenuQR";
import { SucursalesTraslados } from "@/components/negocio/SucursalesTraslados";
import { RespaldoTotal } from "@/components/negocio/RespaldoTotal";
import { TIPOS_NEGOCIO, resolverTipoNegocio } from "@/lib/modulos-negocio";

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

type Form = {
  nombre: string;
  eslogan: string;
  descripcion: string;
  tipo_negocio: string;
  ciudad: string;
  cobertura: string;
  telefono_pedidos: string;
  instagram: string;
  sitio_web: string;
  horarios: string;
  aviso_entrega: string;
  logo_url: string;
  portada_url: string;
  color_principal: string;
  razon_social: string;
  tipo_documento: string;
  nit: string;
  digito_verificacion: string;
  direccion_fiscal: string;
  regimen_tributario: string;
  responsabilidad_fiscal: string;
  resolucion_facturacion: string;
  rango_desde: string;
  rango_hasta: string;
  resolucion_vence: string;
  pie_factura: string;
  iva_defecto: string;
};

const VACIO: Form = {
  logo_url: "",
  portada_url: "",
  color_principal: "",
  nombre: "",
  eslogan: "",
  descripcion: "",
  tipo_negocio: "",
  ciudad: "",
  cobertura: "",
  telefono_pedidos: "",
  instagram: "",
  sitio_web: "",
  horarios: "",
  aviso_entrega: "",
  razon_social: "",
  tipo_documento: "NIT",
  nit: "",
  digito_verificacion: "",
  direccion_fiscal: "",
  regimen_tributario: "No responsable de IVA",
  responsabilidad_fiscal: "R-99-PN",
  resolucion_facturacion: "",
  rango_desde: "1",
  rango_hasta: "1000",
  resolucion_vence: "",
  pie_factura: "",
  iva_defecto: "0",
};

const CAMPOS: { clave: keyof Form; etiqueta: string; ejemplo: string; largo?: boolean }[] = [
  { clave: "nombre", etiqueta: "Nombre del negocio", ejemplo: "Ej: Café La Esquina" },
  { clave: "eslogan", etiqueta: "Eslogan", ejemplo: "Ej: El mejor sabor del barrio" },
  { clave: "descripcion", etiqueta: "Descripción", ejemplo: "Ej: Somos un negocio familiar con más de 10 años de experiencia.", largo: true },
  { clave: "ciudad", etiqueta: "Ciudad", ejemplo: "Ej: Cali, Valle del Cauca" },
  { clave: "cobertura", etiqueta: "Cobertura de entregas", ejemplo: "Ej: Todos los barrios de la ciudad" },
  { clave: "telefono_pedidos", etiqueta: "WhatsApp / teléfono de pedidos", ejemplo: "Ej: 300 123 4567" },
  { clave: "instagram", etiqueta: "Instagram", ejemplo: "Ej: @minegocio" },
  { clave: "sitio_web", etiqueta: "Página web", ejemplo: "Ej: https://www.minegocio.com" },
  { clave: "horarios", etiqueta: "Horarios (una línea por día)", ejemplo: "Ej:\nLunes a viernes: 8:00 a. m. a 6:00 p. m.\nSábado: 9:00 a. m. a 2:00 p. m.\nDomingo: cerrado", largo: true },
  { clave: "aviso_entrega", etiqueta: "Aviso de entrega", ejemplo: "Ej: El domicilio se cobra aparte según el sector" },
];

type Ajuste = { etiqueta?: string; ejemplo?: string };

/** Qué campos se piden según el tipo de negocio (solo lo que ese negocio necesita). */
function camposDelTipo(clave: string, usaPedidos: boolean): Set<keyof Form> {
  const s = new Set<keyof Form>(["nombre", "eslogan", "descripcion", "ciudad", "telefono_pedidos", "instagram", "sitio_web", "horarios"]);
  if (usaPedidos || ["tienda", "farmacia", "lavanderia", "transporte"].includes(clave)) {
    s.add("cobertura");
    s.add("aviso_entrega");
  }
  if (["salud", "profesional"].includes(clave)) s.delete("eslogan");
  if (["tecnologia", "agro", "construccion", "transporte", "inmobiliaria", "profesional"].includes(clave)) s.delete("horarios");
  if (["agro", "transporte", "salud", "educacion"].includes(clave)) s.delete("instagram");
  if (["agro", "concesionario", "salud"].includes(clave)) s.delete("sitio_web");
  return s;
}

const AJUSTES: Record<string, Partial<Record<keyof Form, Ajuste>>> = {
  restaurante: { telefono_pedidos: { etiqueta: "WhatsApp / teléfono de pedidos" } },
  concesionario: {
    descripcion: { ejemplo: "Ej: Vehículos nuevos y usados con garantía y financiación." },
    telefono_pedidos: { etiqueta: "WhatsApp de la sala de ventas", ejemplo: "Ej: 300 123 4567" },
    horarios: { etiqueta: "Horario de la sala de ventas (una línea por día)" },
  },
  tienda: { cobertura: { etiqueta: "Zonas de envío", ejemplo: "Ej: Envíos a toda la ciudad" }, aviso_entrega: { etiqueta: "Aviso de envíos y cambios", ejemplo: "Ej: Cambios dentro de 8 días con factura" } },
  farmacia: { cobertura: { etiqueta: "Zona de domicilios" }, aviso_entrega: { etiqueta: "Aviso para domicilios", ejemplo: "Ej: Domicilio gratis en compras desde $30.000" } },
  lavanderia: { cobertura: { etiqueta: "Zona de recogida y entrega" }, aviso_entrega: { etiqueta: "Aviso de recogida y entrega", ejemplo: "Ej: Entrega en 48 horas" } },
  transporte: { cobertura: { etiqueta: "Rutas y zonas que cubres", ejemplo: "Ej: Cali - Bogotá - Medellín" }, aviso_entrega: { etiqueta: "Condiciones del servicio", ejemplo: "Ej: Carga asegurada, pago contra entrega" } },
  salud: { telefono_pedidos: { etiqueta: "WhatsApp / teléfono para citas" }, horarios: { etiqueta: "Horario de atención (una línea por día)" } },
  belleza: { telefono_pedidos: { etiqueta: "WhatsApp para reservar citas" }, horarios: { etiqueta: "Horario de atención (una línea por día)" } },
  servicios: { telefono_pedidos: { etiqueta: "WhatsApp para reservar citas" }, horarios: { etiqueta: "Horario de atención (una línea por día)" } },
  mascotas: { telefono_pedidos: { etiqueta: "WhatsApp / teléfono para citas" } },
  taller: { telefono_pedidos: { etiqueta: "WhatsApp para citas y cotizaciones" } },
  educacion: { telefono_pedidos: { etiqueta: "WhatsApp de inscripciones" } },
  hospedaje: { telefono_pedidos: { etiqueta: "WhatsApp de reservas" }, descripcion: { ejemplo: "Ej: Habitaciones cómodas cerca al centro, desayuno incluido." } },
  gimnasio: { telefono_pedidos: { etiqueta: "WhatsApp de inscripciones" } },
  inmobiliaria: { telefono_pedidos: { etiqueta: "WhatsApp de asesores" } },
  profesional: { telefono_pedidos: { etiqueta: "WhatsApp / teléfono de contacto" } },
  eventos: { telefono_pedidos: { etiqueta: "WhatsApp para cotizar eventos" } },
  construccion: { telefono_pedidos: { etiqueta: "WhatsApp para cotizaciones" } },
  agro: { telefono_pedidos: { etiqueta: "WhatsApp de pedidos y ventas" } },
  tecnologia: { telefono_pedidos: { etiqueta: "WhatsApp comercial" } },
};

export function NegocioConfig() {
  const { negocio, recargar } = useNegocio();
  const navegar = useNavigate();
  const [form, setForm] = useState<Form>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const tipoActual = resolverTipoNegocio(form.tipo_negocio);

  useEffect(() => {
    if (!negocio) return;
    setForm({
      nombre: negocio.nombre,
      eslogan: negocio.eslogan ?? "",
      descripcion: negocio.descripcion ?? "",
      tipo_negocio: negocio.tipo_negocio ?? "",
      ciudad: negocio.ciudad ?? "",
      cobertura: negocio.cobertura ?? "",
      telefono_pedidos: negocio.telefono_pedidos ?? "",
      instagram: negocio.instagram ?? "",
      sitio_web: negocio.sitio_web ?? "",
      horarios: negocio.horarios ?? "",
      aviso_entrega: negocio.aviso_entrega ?? "",
      logo_url: negocio.logo_url ?? "",
      portada_url: negocio.portada_url ?? "",
      color_principal: negocio.color_principal ?? "",
      razon_social: negocio.razon_social ?? "",
      tipo_documento: negocio.tipo_documento ?? "NIT",
      nit: negocio.nit ?? "",
      digito_verificacion: negocio.digito_verificacion ?? "",
      direccion_fiscal: negocio.direccion_fiscal ?? "",
      regimen_tributario: negocio.regimen_tributario ?? "No responsable de IVA",
      responsabilidad_fiscal: negocio.responsabilidad_fiscal ?? "R-99-PN",
      resolucion_facturacion: negocio.resolucion_facturacion ?? "",
      rango_desde: String(negocio.rango_desde ?? 1),
      rango_hasta: String(negocio.rango_hasta ?? 1000),
      resolucion_vence: negocio.resolucion_vence ?? "",
      pie_factura: negocio.pie_factura ?? "",
      iva_defecto: String(negocio.iva_defecto ?? 0),
    });
  }, [negocio]);

  const subirImagen = async (archivo: File | undefined, clave: "logo_url" | "portada_url") => {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) return toast.error("Elige un archivo de imagen.");
    if (archivo.size > 3 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 3 MB.");
    const ext = (archivo.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const { data: negocioId } = await supabase.rpc("mi_negocio_id");
    if (!negocioId) return toast.error("No se pudo identificar tu negocio.");
    const ruta = `${negocioId}/${clave === "logo_url" ? "logo" : "portada"}-${Date.now()}.${ext || "png"}`;
    const { error } = await supabase.storage.from("negocios").upload(ruta, archivo, { upsert: true });
    if (error) return toast.error("No se pudo subir la imagen.");
    const { data } = supabase.storage.from("negocios").getPublicUrl(ruta);
    setForm((f) => ({ ...f, [clave]: data.publicUrl }));
    toast.success("Imagen cargada. Guarda los cambios para aplicarla.");
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error("El negocio necesita un nombre.");
    setGuardando(true);
    const datos = {
      nombre: form.nombre.trim(),
      eslogan: form.eslogan.trim() || null,
      descripcion: form.descripcion.trim() || null,
      tipo_negocio: tipoActual.clave,
      ciudad: form.ciudad.trim() || null,
      cobertura: form.cobertura.trim() || null,
      telefono_pedidos: form.telefono_pedidos.trim() || null,
      instagram: form.instagram.trim() || null,
      sitio_web: form.sitio_web.trim() || null,
      horarios: form.horarios.trim() || null,
      aviso_entrega: form.aviso_entrega.trim() || null,
      logo_url: form.logo_url || null,
      portada_url: form.portada_url || null,
      color_principal: /^#[0-9a-f]{6}$/i.test(form.color_principal) ? form.color_principal : null,
      razon_social: form.razon_social.trim() || null,
      tipo_documento: ["NIT", "CC", "CE", "PASAPORTE"].includes(form.tipo_documento) ? form.tipo_documento : "NIT",
      nit: form.nit.replace(/\D/g, "") || null,
      digito_verificacion: form.digito_verificacion.replace(/\D/g, "").slice(0, 1) || null,
      direccion_fiscal: form.direccion_fiscal.trim() || null,
      regimen_tributario: form.regimen_tributario || "No responsable de IVA",
      responsabilidad_fiscal: form.responsabilidad_fiscal.trim() || "R-99-PN",
      resolucion_facturacion: form.resolucion_facturacion.trim() || null,
      rango_desde: Math.max(Math.floor(Number(form.rango_desde)) || 1, 1),
      rango_hasta: Math.max(Math.floor(Number(form.rango_hasta)) || 1000, 1),
      resolucion_vence: form.resolucion_vence || null,
      pie_factura: form.pie_factura.trim() || null,
      iva_defecto: Math.min(Math.max(Number(form.iva_defecto) || 0, 0), 100),
      updated_at: new Date().toISOString(),
    };
    const { data: guardado, error } = negocio
      ? await supabase.from("negocio_config").update(datos).eq("id", negocio.id).select("id")
      : await supabase.from("negocio_config").insert(datos).select("id");
    setGuardando(false);
    if (error || !guardado || guardado.length === 0)
      return toast.error("No se pudieron guardar los datos. Tu cuenta debe ser la del administrador del negocio.");
    toast.success("Datos del negocio guardados.");
    recargar();
    window.dispatchEvent(new Event("negocio:cambio"));
  };

  return (
    <div className="space-y-4">
    <GlassPanel className="space-y-4 p-5">
      <div>
        <h2 className="font-medium text-foreground">Datos de tu negocio</h2>
        <p className="text-sm text-muted-foreground">
          {tipoActual.usaPedidos
            ? "Se muestran en el menú digital y los usa el asistente. Cámbialos cuando quieras."
            : "Son los datos con los que tus clientes te identifican y contactan. Cámbialos cuando quieras."}
        </p>
      </div>
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Tipo de negocio</span>
          <select
            className={campo}
            value={tipoActual.clave}
            onChange={async (e) => {
              const nuevo = e.target.value;
              // El tipo se guarda al instante para que el menú y los módulos cambien de inmediato.
              if (negocio && resolverTipoNegocio(negocio.tipo_negocio).clave !== nuevo) {
                const { data: ok, error: errTipo } = await supabase
                  .from("negocio_config")
                  .update({
                    tipo_negocio: nuevo,
                    // La base guarda los datos del negocio anterior y carga los de este tipo
                    // (o los deja en blanco si es la primera vez que lo eliges).
                    nombre: `Mi ${resolverTipoNegocio(nuevo).etiqueta.split("/")[0].trim().toLowerCase()}`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", negocio.id)
                  .select("id");
                if (errTipo || !ok || ok.length === 0) {
                  return toast.error("No se pudo cambiar el tipo de negocio. Tu cuenta debe ser la del administrador.");
                }
                window.dispatchEvent(new Event("negocio:cambio"));
                // La dirección sigue al tipo elegido, al instante.
                const destino = nuevo === "restaurante" ? "/restaurante" : `/negocio/${nuevo}`;
                if (window.location.pathname !== destino) {
                  navegar({
                    to: destino as never,
                    search: { vista: "negocio", ventana: new URLSearchParams(window.location.search).get("ventana") ?? undefined } as never,
                    replace: true,
                  });
                }
              }
              // Los datos del formulario se recargan solos desde la base con los del tipo elegido.
              setForm((f) => ({ ...f, tipo_negocio: nuevo }));
              if (negocio && resolverTipoNegocio(negocio.tipo_negocio).clave !== nuevo) {
                recargar();
                toast.info("Cambiaste de tipo de negocio: aquí solo ves los datos de este tipo. Completa los tuyos y guarda.");
              }
            }}
          >
            {TIPOS_NEGOCIO.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Módulos de este tipo: {tipoActual.modulos.map((m) => m.titulo).join(" · ")}. Puedes editar o borrar cualquier dato (logo, portada, horarios…) y pulsar Guardar.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Logo de tu negocio</span>
          {form.logo_url ? (
            <div className="flex items-center gap-3">
              <img src={form.logo_url} alt="Logo" className="h-20 w-20 rounded-xl border border-glass-border object-cover" />
              <button
                type="button"
                onClick={() => setForm({ ...form, logo_url: "" })}
                className="rounded-lg border border-glass-border px-3 py-2 text-xs text-destructive"
              >
                Quitar logo
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            className={campo}
            onChange={(e) => subirImagen(e.target.files?.[0], "logo_url")}
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Imagen de portada</span>
          {form.portada_url ? (
            <div className="space-y-2">
              <img src={form.portada_url} alt="Portada" className="h-20 w-full max-w-xs rounded-xl border border-glass-border object-cover" />
              <button
                type="button"
                onClick={() => setForm({ ...form, portada_url: "" })}
                className="rounded-lg border border-glass-border px-3 py-2 text-xs text-destructive"
              >
                Quitar portada
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            className={campo}
            onChange={(e) => subirImagen(e.target.files?.[0], "portada_url")}
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Color principal de tu marca</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Color principal"
              className="h-11 w-16 cursor-pointer rounded-lg border border-glass-border bg-transparent"
              value={/^#[0-9a-f]{6}$/i.test(form.color_principal) ? form.color_principal : "#2563eb"}
              onChange={(e) => setForm({ ...form, color_principal: e.target.value })}
            />
            {form.color_principal ? (
              <button
                type="button"
                onClick={() => setForm({ ...form, color_principal: "" })}
                className="rounded-lg border border-glass-border px-3 py-2 text-xs text-muted-foreground"
              >
                Usar color de Gosaryc
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.filter((c) => camposDelTipo(tipoActual.clave, tipoActual.usaPedidos).has(c.clave)).map((raw) => {
          const c = { ...raw, ...(AJUSTES[tipoActual.clave]?.[raw.clave] ?? {}) };
          return (
          <label key={c.clave} className={`block space-y-1 ${c.largo ? "md:col-span-2" : ""}`}>
            <span className="text-xs text-muted-foreground">
              {c.etiqueta}
            </span>
            {c.largo ? (
              <textarea
                className={campo}
                rows={c.clave === "horarios" ? 7 : 2}
                placeholder={c.ejemplo}
                value={form[c.clave]}
                onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              />
            ) : (
              <input
                className={campo}
                placeholder={c.ejemplo}
                value={form[c.clave]}
                onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              />
            )}
          </label>
          );
        })}
      </div>
      <div className="rounded-xl border border-glass-border p-4">
        <h3 className="font-medium text-foreground">Datos fiscales (DIAN - Colombia)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Salen en tus facturas de venta. Confirma cada dato con tu contador; el NIT lleva punto de verificación y la resolución trae rango y vencimiento.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Razón social (si es diferente al nombre)</span>
            <input className={campo} placeholder="Ej: Café La Esquina S.A.S." value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Tipo de documento</span>
              <select className={campo} value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
                {["NIT", "CC", "CE", "PASAPORTE"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">NIT o documento + DV</span>
              <div className="flex gap-2">
                <input className={campo} inputMode="numeric" placeholder="900123456" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
                <input className={campo} inputMode="numeric" placeholder="DV" aria-label="Dígito de verificación" style={{ maxWidth: 64 }} value={form.digito_verificacion} onChange={(e) => setForm({ ...form, digito_verificacion: e.target.value })} />
              </div>
            </label>
          </div>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">Dirección fiscal</span>
            <input className={campo} placeholder="Ej: Calle 5 # 10-20, Cali" value={form.direccion_fiscal} onChange={(e) => setForm({ ...form, direccion_fiscal: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Régimen tributario</span>
            <select className={campo} value={form.regimen_tributario} onChange={(e) => setForm({ ...form, regimen_tributario: e.target.value })}>
              {["No responsable de IVA", "Responsable de IVA", "Régimen simple de tributación", "Gran contribuyente", "Autorretenedor"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Responsabilidad fiscal</span>
            <input className={campo} placeholder="Ej: R-99-PN, O-13, O-15, O-23…" value={form.responsabilidad_fiscal} onChange={(e) => setForm({ ...form, responsabilidad_fiscal: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Resolución de facturación DIAN</span>
            <input className={campo} placeholder="Ej: 18760000001 del 2025-01-15" value={form.resolucion_facturacion} onChange={(e) => setForm({ ...form, resolucion_facturacion: e.target.value })} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Rango desde</span>
              <input className={campo} inputMode="numeric" value={form.rango_desde} onChange={(e) => setForm({ ...form, rango_desde: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Rango hasta</span>
              <input className={campo} inputMode="numeric" value={form.rango_hasta} onChange={(e) => setForm({ ...form, rango_hasta: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">IVA % por defecto</span>
              <input className={campo} inputMode="decimal" value={form.iva_defecto} onChange={(e) => setForm({ ...form, iva_defecto: e.target.value })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">La resolución vence el</span>
            <input type="date" className={campo} value={form.resolucion_vence} onChange={(e) => setForm({ ...form, resolucion_vence: e.target.value })} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground">Pie de página de la factura (garantía, devoluciones, agradecimiento)</span>
            <input className={campo} placeholder="Ej: Gracias por su compra. Garantía de 30 días presentando esta factura." value={form.pie_factura} onChange={(e) => setForm({ ...form, pie_factura: e.target.value })} />
          </label>
        </div>
      </div>
      <div className="rounded-xl border border-primary/30 bg-glass/40 p-4">
        <h3 className="font-medium text-foreground">Facturación Electrónica DIAN</h3>
        {negocio?.dian_activa ? (
          <p className="mt-1 text-xs text-emerald-300">
            Tu facturación electrónica DIAN está activa: cada factura se envía automáticamente y guarda su CUFE y QR oficial.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Tu cuenta está lista para Facturación Electrónica DIAN. Este servicio adicional lo activa el administrador de Gosaryc cuando lo contrates: tus facturas saldrán con CUFE y QR oficial.
            </p>
            <a
              href={enlaceSolicitudDian(form.nombre || negocio?.nombre || "Mi negocio", form.nit || negocio?.nit || "")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" /> Solicitar Activación DIAN por WhatsApp
            </a>
          </>
        )}
      </div>
      <button
        disabled={guardando}
        onClick={guardar}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </GlassPanel>
    <AgenteWhatsApp />
    <MenuQR />
    <SucursalesTraslados />
    <RespaldoTotal />
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
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
};

const CAMPOS: { clave: keyof Form; etiqueta: string; largo?: boolean }[] = [
  { clave: "nombre", etiqueta: "Nombre del negocio" },
  { clave: "eslogan", etiqueta: "Eslogan" },
  { clave: "descripcion", etiqueta: "Descripción", largo: true },
  { clave: "ciudad", etiqueta: "Ciudad" },
  { clave: "cobertura", etiqueta: "Cobertura de entregas" },
  { clave: "telefono_pedidos", etiqueta: "WhatsApp / teléfono de pedidos" },
  { clave: "instagram", etiqueta: "Instagram" },
  { clave: "sitio_web", etiqueta: "Página web" },
  { clave: "horarios", etiqueta: "Horarios (una línea por día)", largo: true },
  { clave: "aviso_entrega", etiqueta: "Aviso de entrega" },
];

export function NegocioConfig() {
  const { negocio, recargar } = useNegocio();
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
    });
  }, [negocio]);

  const subirImagen = async (archivo: File | undefined, clave: "logo_url" | "portada_url") => {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) return toast.error("Elige un archivo de imagen.");
    if (archivo.size > 3 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 3 MB.");
    const ext = (archivo.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `${clave === "logo_url" ? "logo" : "portada"}-${Date.now()}.${ext || "png"}`;
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
  };

  return (
    <GlassPanel className="space-y-4 p-5">
      <div>
        <h2 className="font-medium text-foreground">Datos de tu negocio</h2>
        <p className="text-sm text-muted-foreground">
          Se muestran en el menú digital y los usa el asistente. Cámbialos cuando quieras.
        </p>
      </div>
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Tipo de negocio</span>
          <select
            className={campo}
            value={tipoActual.clave}
            onChange={(e) => setForm({ ...form, tipo_negocio: e.target.value })}
          >
            {TIPOS_NEGOCIO.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Módulos de este tipo: {tipoActual.modulos.map((m) => m.titulo).join(" · ")}. Guarda para activarlos en el menú.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Logo de tu negocio</span>
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="h-20 w-20 rounded-xl border border-glass-border object-cover" />
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
            <img src={form.portada_url} alt="Portada" className="h-20 w-full max-w-xs rounded-xl border border-glass-border object-cover" />
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
                Usar color de Gosaly
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.clave} className={`block space-y-1 ${c.largo ? "md:col-span-2" : ""}`}>
            <span className="text-xs text-muted-foreground">{c.etiqueta}</span>
            {c.largo ? (
              <textarea
                className={campo}
                rows={c.clave === "horarios" ? 7 : 2}
                value={form[c.clave]}
                onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              />
            ) : (
              <input
                className={campo}
                value={form[c.clave]}
                onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <button
        disabled={guardando}
        onClick={guardar}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </GlassPanel>
  );
}

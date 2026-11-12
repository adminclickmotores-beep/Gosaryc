import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";

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
};

const VACIO: Form = {
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
  { clave: "tipo_negocio", etiqueta: "Tipo de negocio (comida, repuestos, vehículos…)" },
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
    });
  }, [negocio]);

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error("El negocio necesita un nombre.");
    setGuardando(true);
    const datos = {
      nombre: form.nombre.trim(),
      eslogan: form.eslogan.trim() || null,
      descripcion: form.descripcion.trim() || null,
      tipo_negocio: form.tipo_negocio.trim() || null,
      ciudad: form.ciudad.trim() || null,
      cobertura: form.cobertura.trim() || null,
      telefono_pedidos: form.telefono_pedidos.trim() || null,
      instagram: form.instagram.trim() || null,
      sitio_web: form.sitio_web.trim() || null,
      horarios: form.horarios.trim() || null,
      aviso_entrega: form.aviso_entrega.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = negocio
      ? await supabase.from("negocio_config").update(datos).eq("id", negocio.id)
      : await supabase.from("negocio_config").insert(datos);
    setGuardando(false);
    if (error) return toast.error("No se pudieron guardar los datos.");
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

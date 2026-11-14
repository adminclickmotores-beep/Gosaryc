import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Opcion = Tables<"restaurante_producto_opciones">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

/** Variantes (elegir una) y complementos (elegir varios) de un producto del menú. */
export function OpcionesProducto({ productoId }: { productoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<Opcion[]>([]);
  const [grupo, setGrupo] = useState("");
  const [nombre, setNombre] = useState("");
  const [extra, setExtra] = useState("");
  const [multiple, setMultiple] = useState(false);
  const [obligatorio, setObligatorio] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("restaurante_producto_opciones")
      .select("*")
      .eq("producto_id", productoId)
      .order("created_at");
    setLista(data ?? []);
  }, [productoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async () => {
    const valor = extra.trim() === "" ? 0 : Number(extra);
    if (!grupo.trim() || !nombre.trim()) return toast.error("Escribe el grupo y el nombre de la opción.");
    if (!Number.isFinite(valor) || valor < 0) return toast.error("El precio adicional no es válido.");
    // Las reglas (obligatorio / varias) son del grupo: si el grupo ya existe, se conservan.
    const existente = lista.find((o) => o.grupo.toLowerCase() === grupo.trim().toLowerCase());
    const { error } = await supabase.from("restaurante_producto_opciones").insert({
      producto_id: productoId,
      grupo: existente?.grupo ?? grupo.trim(),
      nombre: nombre.trim(),
      precio_extra: valor,
      multiple: existente ? existente.multiple : multiple,
      obligatorio: existente ? existente.obligatorio : obligatorio,
    });
    if (error) return toast.error("No se pudo guardar la opción.");
    setNombre("");
    setExtra("");
    window.dispatchEvent(new Event("menu:cambio"));
    cargar();
  };

  const quitar = async (o: Opcion) => {
    const { error } = await supabase.from("restaurante_producto_opciones").delete().eq("id", o.id);
    if (error) return toast.error("No se pudo quitar la opción.");
    window.dispatchEvent(new Event("menu:cambio"));
    cargar();
  };

  const grupos = Array.from(new Set(lista.map((o) => o.grupo)));

  return (
    <div className="rounded-xl border border-glass-border bg-glass/20 px-3 py-2">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs text-foreground"
      >
        <span>Variantes y complementos ({lista.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div className="mt-3 space-y-3">
          {grupos.map((g) => {
            const items = lista.filter((o) => o.grupo === g);
            const ref = items[0];
            return (
              <div key={g} className="space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {g}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {ref.multiple ? "elige varias" : "elige una"} · {ref.obligatorio ? "obligatorio" : "opcional"}
                  </span>
                </p>
                {items.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0 break-words">
                      {o.nombre}
                      {o.precio_extra > 0 ? ` (+${dinero(o.precio_extra)})` : ""}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${o.nombre}`}
                      onClick={() => quitar(o)}
                      className="shrink-0 p-1 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="space-y-2 border-t border-glass-border pt-3">
            <input
              className={campo}
              list={`grupos-${productoId}`}
              placeholder="Grupo (ej. Tamaño, Salsas, Adiciones)"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            />
            <datalist id={`grupos-${productoId}`}>
              {grupos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <input className={campo} placeholder="Opción (ej. Grande, BBQ, Queso extra)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input className={campo} placeholder="Precio adicional (opcional)" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} />
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="h-4 w-4 accent-primary" />
                Se pueden elegir varias
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={obligatorio} onChange={(e) => setObligatorio(e.target.checked)} className="h-4 w-4 accent-primary" />
                Obligatorio
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Si el grupo ya existe, conserva sus reglas.</p>
            <button type="button" onClick={agregar} className="w-full rounded-lg border border-primary px-4 py-2.5 text-sm text-primary">
              Agregar opción
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

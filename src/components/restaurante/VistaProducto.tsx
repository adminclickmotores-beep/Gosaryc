import { useEffect, useMemo, useState } from "react";
import { ImageOff, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Producto = Tables<"restaurante_productos">;
type Opcion = Tables<"restaurante_producto_opciones">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export type SeleccionProducto = { cantidad: number; extraUnidad: number; texto: string };

/** Vista ampliada dividida: foto grande a la izquierda y opciones a la derecha. */
export function VistaProducto({
  producto,
  onCerrar,
  onAgregar,
}: {
  producto: Producto;
  onCerrar: () => void;
  onAgregar: (sel: SeleccionProducto) => void;
}) {
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState("");

  useEffect(() => {
    let vivo = true;
    void supabase
      .from("restaurante_producto_opciones")
      .select("*")
      .eq("producto_id", producto.id)
      .order("created_at")
      .then(({ data }) => {
        if (vivo) setOpciones(data ?? []);
      });
    return () => {
      vivo = false;
    };
  }, [producto.id]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const grupos = useMemo(() => Array.from(new Set(opciones.map((o) => o.grupo))), [opciones]);

  const alternar = (grupo: string, id: string, multiple: boolean) =>
    setElegidas((prev) => {
      const actual = prev[grupo] ?? [];
      if (multiple) {
        return { ...prev, [grupo]: actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id] };
      }
      return { ...prev, [grupo]: actual.includes(id) ? [] : [id] };
    });

  const extraUnidad = opciones
    .filter((o) => (elegidas[o.grupo] ?? []).includes(o.id))
    .reduce((s, o) => s + (o.precio_extra ?? 0), 0);
  const total = (producto.precio + extraUnidad) * cantidad;
  const descripcion = (producto as { descripcion?: string | null }).descripcion ?? "";

  const agregar = () => {
    for (const g of grupos) {
      const ref = opciones.find((o) => o.grupo === g);
      if (ref?.obligatorio && (elegidas[g] ?? []).length === 0) {
        toast.error(`Elige una opción en “${g}”.`);
        return;
      }
    }
    const partes = grupos
      .map((g) => {
        const nombres = opciones.filter((o) => o.grupo === g && (elegidas[g] ?? []).includes(o.id)).map((o) => o.nombre);
        return nombres.length > 0 ? `${g}: ${nombres.join(", ")}` : "";
      })
      .filter((x) => x !== "");
    if (nota.trim()) partes.push(`Nota: ${nota.trim()}`);
    onAgregar({ cantidad, extraUnidad, texto: partes.length > 0 ? `${producto.nombre} → ${partes.join(" | ")}` : "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92dvh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-t-3xl border border-glass-border bg-card text-card-foreground shadow-2xl sm:rounded-3xl md:grid-cols-12"
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onCerrar}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="group relative aspect-[4/3] w-full overflow-hidden bg-muted md:col-span-7 md:aspect-auto md:min-h-[420px]">
          {producto.imagen_url ? (
            <img
              src={producto.imagen_url}
              alt={producto.nombre}
              className="absolute inset-0 h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
              <ImageOff className="h-16 w-16" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-5 md:col-span-5">
          <div>
            <h3 className="break-words font-display text-2xl leading-tight">{producto.nombre}</h3>
            <p className="precio-esmeralda mt-1 text-2xl font-semibold">{dinero(producto.precio + extraUnidad)}</p>
            {descripcion && <p className="mt-2 break-words text-sm text-muted-foreground">{descripcion}</p>}
          </div>

          {grupos.map((g) => {
            const items = opciones.filter((o) => o.grupo === g);
            const ref = items[0];
            return (
              <div key={g} className="space-y-2">
                <p className="text-sm font-medium">
                  {g}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {ref.multiple ? "elige varias" : "elige una"} · {ref.obligatorio ? "obligatorio" : "opcional"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((o) => {
                    const activa = (elegidas[g] ?? []).includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => alternar(g, o.id, ref.multiple)}
                        className={`rounded-full border px-3.5 py-2 text-sm transition ${activa ? "border-primary bg-primary text-primary-foreground" : "border-glass-border bg-glass-strong text-foreground hover:border-primary/50"}`}
                      >
                        {o.nombre}
                        {o.precio_extra > 0 ? ` +${dinero(o.precio_extra)}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <textarea
            rows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Notas de cocina: sin cebolla, término medio..."
            className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          />

          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cantidad</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Quitar uno"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="rounded-full border border-glass-border p-2.5"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums">{cantidad}</span>
                <button
                  type="button"
                  aria-label="Agregar uno"
                  onClick={() => setCantidad((c) => Math.min(100, c + 1))}
                  className="rounded-full border border-glass-border p-2.5"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={agregar}
              className="btn-pro w-full rounded-2xl px-4 py-4 text-base font-semibold"
            >
              Agregar al pedido · {dinero(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

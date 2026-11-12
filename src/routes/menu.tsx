import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Star, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú digital — haz tu pedido" },
      { name: "description", content: "Mira el menú, arma tu pedido y recíbelo en casa o recógelo en el local." },
    ],
  }),
  component: MenuPage,
});

type Categoria = Tables<"restaurante_categorias">;
type Producto = Tables<"restaurante_productos">;
type Modalidad = "domicilio" | "recoger" | "mesa";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function MenuPage() {
  const { negocio } = useNegocio();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [paso, setPaso] = useState<"menu" | "datos" | "listo">("menu");
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("domicilio");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("restaurante_categorias").select("*").eq("activa", true).order("orden"),
        supabase.from("restaurante_productos").select("*").eq("activo", true).order("nombre"),
      ]);
      setCategorias(c.data ?? []);
      setProductos(p.data ?? []);
      setCargando(false);
    })();
  }, []);

  const lineas = useMemo(
    () =>
      productos
        .filter((p) => (carrito[p.id] ?? 0) > 0)
        .map((p) => ({ producto: p, cantidad: carrito[p.id] })),
    [productos, carrito],
  );
  const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);

  const cambiar = (id: string, delta: number) =>
    setCarrito((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));

  const enviar = async () => {
    if (!nombre.trim() || !telefono.trim()) return toast.error("Escribe tu nombre y teléfono.");
    if (modalidad === "domicilio" && !direccion.trim()) return toast.error("Escribe la dirección de entrega.");
    setEnviando(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("restaurante_pedidos").insert({
      id,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono.trim(),
      modalidad,
      direccion: modalidad === "domicilio" ? direccion.trim() : null,
      notas: notas.trim() || null,
      total,
    });
    if (error) {
      setEnviando(false);
      return toast.error("No pudimos registrar tu pedido. Intenta de nuevo.");
    }
    const { error: errItems } = await supabase.from("restaurante_pedido_items").insert(
      lineas.map((l) => ({
        pedido_id: id,
        producto_id: l.producto.id,
        nombre: l.producto.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.producto.precio,
      })),
    );
    setEnviando(false);
    if (errItems) return toast.error("No pudimos guardar los productos del pedido.");
    setCodigo(id.slice(0, 6).toUpperCase());
    setCarrito({});
    setPaso("listo");
  };

  if (paso === "listo") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-primary" />
        <h1 className="font-display text-3xl text-foreground">¡Pedido recibido!</h1>
        <p className="text-muted-foreground">
          Tu código es <span className="font-mono text-foreground">{codigo}</span>. Ya lo enviamos a cocina.
        </p>
        <button
          onClick={() => setPaso("menu")}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Hacer otro pedido
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-32 pt-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl text-foreground">{negocio?.nombre ?? "Nuestro menú"}</h1>
          <p className="text-sm text-muted-foreground">
            {negocio?.eslogan ?? "Arma tu pedido y lo preparamos al momento."}
          </p>
        </div>
        <Link to="/instalar" className="shrink-0 text-xs text-primary hover:underline">Instalar app</Link>
      </header>

      {negocio && paso === "menu" && (
        <GlassPanel className="mb-6 space-y-2 p-4 text-sm">
          {negocio.descripcion && <p className="text-foreground">{negocio.descripcion}</p>}
          {(negocio.ciudad || negocio.cobertura) && (
            <p className="text-muted-foreground">
              {[negocio.ciudad, negocio.cobertura].filter(Boolean).join(" · ")}
            </p>
          )}
          {negocio.aviso_entrega && <p className="text-muted-foreground">{negocio.aviso_entrega}</p>}
          {negocio.telefono_pedidos && (
            <p className="text-foreground">WhatsApp: {negocio.telefono_pedidos}</p>
          )}
          {negocio.horarios && (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer text-foreground">Horarios</summary>
              <p className="mt-1 whitespace-pre-line">{negocio.horarios}</p>
            </details>
          )}
        </GlassPanel>
      )}

      {paso === "menu" && (
        <>
          {cargando && <p className="text-muted-foreground">Cargando menú…</p>}
          {!cargando && productos.length === 0 && (
            <p className="text-muted-foreground">El menú aún no tiene productos.</p>
          )}
          {categorias.map((cat) => {
            const items = productos.filter((p) => p.categoria_id === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} className="mb-8">
                <h2 className="mb-3 font-display text-xl text-foreground">{cat.nombre}</h2>
                <div className="space-y-3">
                  {items.map((p) => (
                    <GlassPanel key={p.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          {p.nombre}
                          {p.destacado && <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-label="Recomendado" />}
                        </p>
                        {p.descripcion && <p className="text-sm text-muted-foreground">{p.descripcion}</p>}
                        <p className="mt-1 text-sm text-foreground">{dinero(p.precio)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {(carrito[p.id] ?? 0) > 0 && (
                          <>
                            <button onClick={() => cambiar(p.id, -1)} aria-label="Quitar uno" className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border text-foreground">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-5 text-center text-foreground">{carrito[p.id]}</span>
                          </>
                        )}
                        <button onClick={() => cambiar(p.id, 1)} aria-label="Agregar uno" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {paso === "datos" && (
        <GlassPanel className="space-y-4 p-5">
          <h2 className="font-display text-xl text-foreground">Tus datos</h2>
          <input className={campo} placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {([
              ["domicilio", "Domicilio"],
              ["recoger", "Recoger"],
              ["mesa", "En mesa"],
            ] as [Modalidad, string][]).map(([v, t]) => (
              <button
                key={v}
                type="button"
                onClick={() => setModalidad(v)}
                className={`rounded-lg border px-2 py-2.5 text-sm ${modalidad === v ? "border-primary bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {modalidad === "domicilio" && (
            <input className={campo} placeholder="Dirección de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          )}
          <textarea className={campo} rows={2} placeholder="Notas (sin cebolla, sin hielo…)" value={notas} onChange={(e) => setNotas(e.target.value)} />
          <div className="space-y-1 border-t border-glass-border pt-3 text-sm">
            {lineas.map((l) => (
              <div key={l.producto.id} className="flex justify-between gap-3 text-muted-foreground">
                <span>{l.cantidad} × {l.producto.nombre}</span>
                <span>{dinero(l.producto.precio * l.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-base font-medium text-foreground">
              <span>Total</span>
              <span>{dinero(total)}</span>
            </div>
          </div>
        </GlassPanel>
      )}

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-glass-border bg-black/70 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            {paso === "datos" && (
              <button onClick={() => setPaso("menu")} className="rounded-full border border-glass-border px-4 py-3 text-sm text-foreground">
                Volver
              </button>
            )}
            <button
              disabled={enviando}
              onClick={() => (paso === "menu" ? setPaso("datos") : enviar())}
              className="flex flex-1 items-center justify-between gap-3 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                {paso === "menu" ? `Ver pedido (${unidades})` : "Confirmar pedido"}
              </span>
              <span>{dinero(total)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

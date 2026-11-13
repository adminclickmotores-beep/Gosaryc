import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { useNegocio } from "@/hooks/use-negocio";
import { PasoAPaso } from "@/components/restaurante/PasoAPaso";
import { resolverTipoNegocio, TIPOS_NEGOCIO } from "@/lib/modulos-negocio";
import { toast } from "sonner";
import { GuiaRapida } from "@/components/app/GuiaRapida";
import { GUIAS_NEGOCIO } from "@/lib/guia-negocio";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { NegocioConfig } from "@/components/restaurante/NegocioConfig";
import { RecetarioInventario } from "@/components/restaurante/RecetarioInventario";
import { MenuQR } from "@/components/restaurante/MenuQR";
import { Reportes } from "@/components/restaurante/Reportes";
import { MesasPanel } from "@/components/restaurante/MesasPanel";
import { CajaPanel } from "@/components/restaurante/CajaPanel";

export const Route = createFileRoute("/_app/restaurante")({
  head: () => ({ meta: [{ title: "Panel de tu negocio" }] }),
  component: RestaurantePage,
});

type Pedido = Tables<"restaurante_pedidos">;
type Item = Tables<"restaurante_pedido_items">;
type Producto = Tables<"restaurante_productos">;
type Categoria = Tables<"restaurante_categorias">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const ESTADOS: { clave: string; titulo: string }[] = [
  { clave: "nuevo", titulo: "Nuevos" },
  { clave: "preparando", titulo: "En cocina" },
  { clave: "listo", titulo: "Listos" },
  { clave: "en_camino", titulo: "En camino" },
  { clave: "entregado", titulo: "Entregados" },
];

const SIGUIENTE = (p: Pedido): { estado: string; texto: string } | null => {
  if (p.estado === "nuevo") return { estado: "preparando", texto: "Enviar a cocina" };
  if (p.estado === "preparando") return { estado: "listo", texto: "Marcar listo" };
  if (p.estado === "listo")
    return p.modalidad === "domicilio"
      ? { estado: "en_camino", texto: "Sale a domicilio" }
      : { estado: "entregado", texto: "Entregado" };
  if (p.estado === "en_camino") return { estado: "entregado", texto: "Entregado" };
  return null;
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function RestaurantePage() {
  const { negocio } = useNegocio();
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const [vistaElegida, setVista] = useState<"pedidos" | "menu" | "qr" | "mesas" | "caja" | "reportes" | "recetario" | "negocio">("pedidos");
  const vista = tipo.usaPedidos ? vistaElegida : "negocio";
  const vistas = tipo.usaPedidos
    ? (["pedidos", "menu", "qr", "mesas", "caja", "reportes", "recetario", "negocio"] as const)
    : (["negocio"] as const);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("restaurante_pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const lista = data ?? [];
    setPedidos(lista);
    if (lista.length > 0) {
      const { data: its } = await supabase
        .from("restaurante_pedido_items")
        .select("*")
        .in("pedido_id", lista.map((p) => p.id));
      setItems(its ?? []);
    } else {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const mover = async (p: Pedido, estado: string) => {
    const { error } = await supabase.from("restaurante_pedidos").update({ estado }).eq("id", p.id);
    if (error) return toast.error("No se pudo actualizar el pedido.");
    cargar();
  };

  const cambiarTipo = async (clave: string) => {
    if (!negocio) return;
    const { data, error } = await supabase
      .from("negocio_config")
      .update({ tipo_negocio: clave, updated_at: new Date().toISOString() })
      .eq("id", negocio.id)
      .select("id");
    if (error || !data || data.length === 0)
      return toast.error("No se pudo cambiar el tipo de negocio. Tu cuenta debe ser la del administrador.");
    toast.success("Tipo de negocio actualizado.");
    window.dispatchEvent(new Event("negocio:cambio"));
  };

  const ventasHoy = pedidos
    .filter((p) => p.estado !== "cancelado" && new Date(p.created_at).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">{tipo.panel}</h1>
          <p className="text-base italic text-primary">{GUIAS_NEGOCIO[tipo.clave].frase}</p>
          <p className="text-sm text-muted-foreground">
            {tipo.usaPedidos ? `Ventas de hoy: ${dinero(ventasHoy)}` : negocio?.nombre ?? tipo.etiqueta}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            aria-label="Tipo de negocio"
            value={tipo.clave}
            disabled={!negocio}
            onChange={(e) => cambiarTipo(e.target.value)}
            className="rounded-full border border-glass-border bg-glass/40 px-4 py-2 text-base text-foreground outline-none focus:border-primary/50"
          >
            {TIPOS_NEGOCIO.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          {tipo.usaPedidos && (
            <Link to="/menu" target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
              <ExternalLink className="h-4 w-4" /> Menú público
            </Link>
          )}
          <Link to="/instalar" className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
            <Download className="h-4 w-4" /> Instalar app
          </Link>
        </div>
      </div>

      <GuiaRapida tipo={tipo.clave} />

      <PasoAPaso
        negocio={negocio}
        tipo={tipo}
        onAbrirNegocio={() => setVista("negocio")}
        onAbrirMenu={() => setVista("menu")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tipo.modulos.map(({ id, Icon, titulo, descripcion, estado, ruta }) => {
          const contenido = (
            <GlassPanel className="flex h-full items-center gap-3 p-4">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{estado === "Activo" ? descripcion : "Próximo"}</p>
              </div>
            </GlassPanel>
          );
          return ruta && ruta !== "/restaurante" ? (
            <Link key={id} to={ruta as never}>
              {contenido}
            </Link>
          ) : (
            <div key={id}>{contenido}</div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {vistas.map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`rounded-full px-5 py-2 text-sm ${vista === v ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {v === "pedidos" ? "Pedidos y cocina" : v === "menu" ? "Menú" : v === "qr" ? "QR del menú" : v === "mesas" ? "Mesas" : v === "caja" ? "Caja" : v === "reportes" ? "Reportes" : v === "recetario" ? "Recetario e inventario" : "Mi negocio"}
          </button>
        ))}
      </div>

      {vista === "pedidos" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {ESTADOS.map((col) => {
            const lista = pedidos.filter((p) => p.estado === col.clave);
            return (
              <div key={col.clave} className="min-w-0 space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {col.titulo} ({lista.length})
                </h2>
                {lista.map((p) => {
                  const sig = SIGUIENTE(p);
                  return (
                    <GlassPanel key={p.id} className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm text-foreground">#{p.id.slice(0, 6).toUpperCase()}</span>
                        <span className="text-xs capitalize text-muted-foreground">{p.modalidad}</span>
                      </div>
                      <p className="break-words text-sm text-foreground">{p.cliente_nombre} · {p.cliente_telefono}</p>
                      {p.direccion && <p className="break-words text-xs text-muted-foreground">{p.direccion}</p>}
                      <ul className="text-sm text-muted-foreground">
                        {items.filter((i) => i.pedido_id === p.id).map((i) => (
                          <li key={i.id}>{i.cantidad} × {i.nombre}</li>
                        ))}
                      </ul>
                      {p.notas && <p className="text-xs italic text-muted-foreground">“{p.notas}”</p>}
                      <p className="text-sm font-medium text-foreground">{dinero(p.total)}</p>
                      <div className="flex gap-2">
                        {sig && (
                          <button onClick={() => mover(p, sig.estado)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                            {sig.texto}
                          </button>
                        )}
                        {p.estado !== "entregado" && p.estado !== "cancelado" && (
                          <button onClick={() => mover(p, "cancelado")} className="rounded-lg border border-glass-border px-3 py-2 text-xs text-muted-foreground">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </GlassPanel>
                  );
                })}
                {lista.length === 0 && <p className="text-xs text-muted-foreground/70">Sin pedidos</p>}
              </div>
            );
          })}
        </div>
      ) : vista === "menu" ? (
        <GestionMenu />
      ) : vista === "qr" ? (
        <MenuQR />
      ) : vista === "mesas" ? (
        <MesasPanel />
      ) : vista === "caja" ? (
        <CajaPanel />
      ) : vista === "reportes" ? (
        <Reportes />
      ) : vista === "recetario" ? (
        <RecetarioInventario />
      ) : (
        <NegocioConfig />
      )}
    </div>
  );
}

function GestionMenu() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const cargar = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from("restaurante_categorias").select("*").order("orden"),
      supabase.from("restaurante_productos").select("*").order("nombre"),
    ]);
    setCategorias(c.data ?? []);
    setProductos(p.data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async () => {
    const valor = Number(precio);
    if (!nombre.trim() || !Number.isFinite(valor) || valor < 0) return toast.error("Escribe nombre y precio válidos.");
    const { error } = await supabase.from("restaurante_productos").insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: valor,
      categoria_id: categoriaId || null,
    });
    if (error) return toast.error("No se pudo guardar el producto.");
    setNombre("");
    setDescripcion("");
    setPrecio("");
    cargar();
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    const { error } = await supabase
      .from("restaurante_categorias")
      .insert({ nombre: nuevaCategoria.trim(), orden: categorias.length + 1 });
    if (error) return toast.error("No se pudo crear la categoría.");
    setNuevaCategoria("");
    cargar();
  };

  const alternar = async (p: Producto) => {
    await supabase.from("restaurante_productos").update({ activo: !p.activo }).eq("id", p.id);
    cargar();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nuevo producto</h2>
          <input className={campo} placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className={campo} placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <input className={campo} placeholder="Precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Agregar al menú
          </button>
        </GlassPanel>
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nueva categoría</h2>
          <input className={campo} placeholder="Ej. Postres" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
          <button onClick={agregarCategoria} className="w-full rounded-lg border border-glass-border px-4 py-2.5 text-sm text-foreground">
            Crear categoría
          </button>
        </GlassPanel>
      </div>

      <div className="space-y-2">
        {productos.map((p) => (
          <GlassPanel key={p.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${p.activo ? "text-foreground" : "text-muted-foreground line-through"}`}>{p.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {categorias.find((c) => c.id === p.categoria_id)?.nombre ?? "Sin categoría"} · {dinero(p.precio)}
              </p>
            </div>
            <button onClick={() => alternar(p)} className="shrink-0 rounded-full border border-glass-border px-3 py-1.5 text-xs text-foreground">
              {p.activo ? "Ocultar" : "Mostrar"}
            </button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

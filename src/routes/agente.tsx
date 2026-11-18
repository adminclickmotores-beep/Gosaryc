import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { LIMITES, limpiarTelefono, limpiarTexto, telefonoValido } from "@/lib/validacion-publica";

export const Route = createFileRoute("/agente")({
  head: () => ({
    meta: [
      { title: "Asistente de pedidos" },
      { name: "description", content: "Pide por chat: elige tus productos, la entrega y confirma tu pedido." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { n?: string } =>
    typeof s.n === "string" && s.n ? { n: s.n } : {},
  component: AgentePage,
});

type Producto = Tables<"restaurante_productos">;
type Categoria = Tables<"restaurante_categorias">;
type Modalidad = "domicilio" | "recoger" | "mesa";
type Paso =
  | "pedido"
  | "extras"
  | "modalidad"
  | "direccion"
  | "nombre"
  | "telefono"
  | "confirmar"
  | "listo"
  | "transferido";
type Linea = { producto: Producto; cantidad: number };
type Msg = { de: "bot" | "tu"; texto: string; opciones?: string[] };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const PALABRAS_NUM: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };

const MODALIDADES = ["Domicilio", "Recoger en el local", "En mesa"];

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function AgentePage() {
  const { n } = Route.useSearch();
  const { negocio, cargando: cargandoNegocio } = useNegocio(n);
  const dueno = n ?? negocio?.owner_id ?? null;
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState<Paso>("pedido");
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [modalidad, setModalidad] = useState<Modalidad>("domicilio");
  const [direccion, setDireccion] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const finRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!dueno) {
      if (!cargandoNegocio) setCargando(false);
      return;
    }
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("restaurante_categorias").select("*").eq("owner_id", dueno).eq("activa", true).order("orden"),
        supabase.from("restaurante_productos").select("*").eq("owner_id", dueno).eq("activo", true).order("nombre"),
      ]);
      setCategorias(c.data ?? []);
      setProductos(p.data ?? []);
      setCargando(false);
    })();
  }, [dueno, cargandoNegocio]);

  // Saludo inicial, una sola vez cuando ya cargó el menú.
  useEffect(() => {
    if (cargando || mensajes.length > 0) return;
    setMensajes([
      {
        de: "bot",
        texto:
          "Hola, soy el asistente de pedidos. Dime qué quieres pedir, por ejemplo: 2 hamburguesas. También puedes tocar un producto.",
        opciones: productos.slice(0, 8).map((p) => p.nombre),
      },
    ]);
  }, [cargando, productos, mensajes.length]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  const buscarProducto = (t: string): Producto | undefined =>
    productos.find((p) => t.includes(normal(p.nombre))) ??
    productos.find((p) => normal(p.nombre).split(" ").some((w) => w.length >= 4 && t.includes(w)));

  const cantidadDe = (t: string): number => {
    const m = t.match(/\b(\d+)\b/);
    if (m) return Math.min(100, Math.max(1, parseInt(m[1], 10)));
    for (const [w, n] of Object.entries(PALABRAS_NUM)) {
      if (new RegExp(`\\b${w}\\b`).test(t)) return n;
    }
    return 1;
  };

  const sumar = (ls: Linea[], p: Producto, c: number): Linea[] => {
    const existe = ls.some((l) => l.producto.id === p.id);
    return existe
      ? ls.map((l) => (l.producto.id === p.id ? { ...l, cantidad: l.cantidad + c } : l))
      : [...ls, { producto: p, cantidad: c }];
  };

  const enviar = async (): Promise<string> => {
    const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
    const nombreLimpio = limpiarTexto(nombre, LIMITES.nombre);
    const telefonoLimpio = limpiarTelefono(telefono);
    if (!nombreLimpio || !telefonoValido(telefonoLimpio)) {
      return "Revisa tu nombre y tu teléfono (de 7 a 15 números) antes de confirmar.";
    }
    if (lineas.length === 0 || lineas.some((l) => l.cantidad < 1 || l.cantidad > 100)) {
      return "Revisa las cantidades: cada producto admite de 1 a 100 unidades.";
    }
    setEnviando(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("restaurante_pedidos").insert({
      id,
      owner_id: dueno,
      cliente_nombre: nombreLimpio,
      cliente_telefono: telefonoLimpio,
      modalidad,
      direccion: modalidad === "domicilio" ? limpiarTexto(direccion, LIMITES.direccion) : null,
      total,
      canal: "agente",
    });
    if (error) {
      setEnviando(false);
      return "No pude registrar tu pedido. Intenta de nuevo en un momento.";
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
    if (errItems) return "El pedido se creó, pero no pude guardar los productos. Avisa al restaurante con tu teléfono.";
    const cod = id.slice(0, 6).toUpperCase();
    setCodigo(cod);
    setLineas([]);
    setPaso("listo");
    return `Tu pedido quedó registrado con el código ${cod} y ya lo enviamos a cocina. Total: ${dinero(total)}.`;
  };

  const procesar = async (entradaRaw: string) => {
    const entrada = entradaRaw.trim();
    if (!entrada || enviando || cargando) return;
    const t = normal(entrada);
    const out: Msg[] = [{ de: "tu", texto: entrada }];
    const say = (texto: string, opciones?: string[]) => out.push({ de: "bot", texto, opciones });
    const finish = () => setMensajes((m) => [...m, ...out]);
    const opcionesProductos = productos.slice(0, 8).map((p) => p.nombre);
    const extrasNombres = productos
      .filter((p) => /acompa|bebida/.test(normal(categorias.find((c) => c.id === p.categoria_id)?.nombre ?? "")))
      .map((p) => p.nombre);
    setTexto("");

    if (/\b(persona|humano|asesor|atencion al cliente)\b/.test(t)) {
      setPaso("transferido");
      say("Te paso con una persona del equipo. Te atenderá por este mismo medio en cuanto esté disponible.");
      return finish();
    }
    if (/\bestado\b/.test(t) && paso !== "confirmar") {
      say("Por ahora no puedo consultar el estado de un pedido desde el chat. Si necesitas saberlo, pide que te atiendan con una persona.");
      return finish();
    }

    if (paso === "transferido") {
      say("Una persona del equipo te responderá en breve.");
      return finish();
    }

    if (paso === "listo") {
      if (/otro|nuevo|hola/.test(t)) {
        setLineas([]);
        setDireccion("");
        setNombre("");
        setTelefono("");
        setModalidad("domicilio");
        setCodigo("");
        setPaso("pedido");
        say("Con gusto. Dime qué quieres pedir.", opcionesProductos);
      } else {
        say(`Tu pedido ${codigo} ya está en cocina. Para otro pedido escribe "otro pedido".`, ["Otro pedido"]);
      }
      return finish();
    }

    if (paso === "pedido" || paso === "extras") {
      if (/^(listo|ya|eso es todo|nada mas|no|no gracias|terminar|continuar)$/.test(t)) {
        if (lineas.length === 0) {
          say("Aún no tienes productos en el pedido. ¿Qué te gustaría?", opcionesProductos);
        } else if (paso === "pedido" && extrasNombres.length > 0) {
          setPaso("extras");
          say("¿Quieres agregar acompañamientos o bebidas?", [...extrasNombres.slice(0, 6), "No, gracias"]);
        } else {
          setPaso("modalidad");
          say("¿Cómo lo recibes?", MODALIDADES);
        }
        return finish();
      }
      if (/recomi|sugi|destacad/.test(t)) {
        const dest = productos.filter((p) => p.destacado).map((p) => p.nombre);
        say(
          dest.length > 0 ? "Te recomiendo estos productos:" : "Por ahora no tengo recomendaciones, pero puedes elegir de la lista.",
          dest.length > 0 ? dest : opcionesProductos,
        );
        return finish();
      }
      if (/menu|carta|que hay|que tienen/.test(t)) {
        say(
          `Tenemos: ${categorias.map((c) => c.nombre).join(", ") || "menú en preparación"}. Estos son algunos productos:`,
          opcionesProductos,
        );
        return finish();
      }
      const encontrado = buscarProducto(t);
      if (!encontrado) {
        say("No encontré ese producto. Estas son las opciones:", opcionesProductos);
        return finish();
      }
      const cant = cantidadDe(t);
      setLineas(sumar(lineas, encontrado, cant));
      say(`Agregué ${cant} × ${encontrado.nombre}. ¿Algo más?`, ["Listo"]);
      return finish();
    }

    if (paso === "modalidad") {
      const modo: Modalidad | null = /domicilio|llev|envi|a casa/.test(t)
        ? "domicilio"
        : /recog|recoj|local/.test(t)
          ? "recoger"
          : /mesa/.test(t)
            ? "mesa"
            : null;
      if (!modo) {
        say("Elige una opción:", MODALIDADES);
      } else if (modo === "domicilio") {
        setModalidad(modo);
        setPaso("direccion");
        say("¿A qué dirección te lo llevamos?");
      } else {
        setModalidad(modo);
        setPaso("nombre");
        say("¿A nombre de quién lo pongo?");
      }
      return finish();
    }

    if (paso === "direccion") {
      if (limpiarTexto(entrada, LIMITES.direccion).length < 5) {
        say("Escribe la dirección completa, por favor.");
      } else {
        setDireccion(limpiarTexto(entrada, LIMITES.direccion));
        setPaso("nombre");
        say("¿A nombre de quién lo pongo?");
      }
      return finish();
    }

    if (paso === "nombre") {
      if (limpiarTexto(entrada, LIMITES.nombre).length < 2) {
        say("¿Me dices tu nombre?");
      } else {
        setNombre(limpiarTexto(entrada, LIMITES.nombre));
        setPaso("telefono");
        say("¿Cuál es tu teléfono para avisarte?");
      }
      return finish();
    }

    if (paso === "telefono") {
      const digitos = entrada.replace(/\D/g, "");
      if (digitos.length < 7 || digitos.length > 15) {
        say("Escribe un teléfono válido, de 7 a 15 números.");
      } else {
        setTelefono(digitos);
        setPaso("confirmar");
        const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);
        const detalle = lineas.map((l) => `${l.cantidad} × ${l.producto.nombre}`).join(", ");
        const donde = modalidad === "domicilio" ? `Entrega en ${direccion}` : `Modalidad: ${modalidad}`;
        say(`Tu pedido: ${detalle}. ${donde}. Total: ${dinero(total)}. ¿Lo confirmo?`, ["Confirmar pedido", "Cancelar"]);
      }
      return finish();
    }

    if (paso === "confirmar") {
      if (/^(confirmar|confirmar pedido|confirmo|si|dale|ok)$/.test(t)) {
        say(await enviar());
      } else if (/cancel/.test(t)) {
        setLineas([]);
        setPaso("pedido");
        say("Pedido cancelado. Si quieres empezar otro, dime qué quieres.", opcionesProductos);
      } else {
        say("Confirma tu pedido o cancélalo.", ["Confirmar pedido", "Cancelar"]);
      }
      return finish();
    }
  };

  const total = lineas.reduce((s, l) => s + l.producto.precio * l.cantidad, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-8">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">Asistente de pedidos</h1>
          <p className="text-sm text-muted-foreground">Pide paso a paso, sin esperar en la fila.</p>
        </div>
      </header>

      <GlassPanel className="flex min-h-[60dvh] flex-col gap-4 p-4">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {cargando && <p className="text-sm text-muted-foreground">Cargando menú…</p>}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.de === "tu" ? "justify-end" : "justify-start"}`}>
              {m.de === "bot" && <Bot className="mt-2 h-4 w-4 shrink-0 text-primary" />}
              <div className="min-w-0 max-w-[85%] space-y-2">
                <p
                  className={`break-words rounded-2xl px-4 py-2.5 text-sm ${
                    m.de === "tu" ? "bg-primary text-primary-foreground" : "bg-glass-strong text-foreground"
                  }`}
                >
                  {m.texto}
                </p>
                {m.opciones && m.opciones.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.opciones.map((o, j) => (
                      <button
                        key={`${i}-${j}-${o}`}
                        type="button"
                        disabled={enviando}
                        onClick={() => procesar(o)}
                        className="max-w-full break-words rounded-full border border-glass-border px-3 py-1.5 text-left text-xs text-foreground hover:bg-glass-strong disabled:opacity-50"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {m.de === "tu" && <User className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
          <div ref={finRef} />
        </div>

        {lineas.length > 0 && paso !== "listo" && (
          <p className="text-xs text-muted-foreground">Llevas {dinero(total)} en tu pedido.</p>
        )}

        <form
          className="flex items-center gap-2 border-t border-glass-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            procesar(texto);
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pedido o tu duda"
            maxLength={LIMITES.direccion}
            disabled={enviando || cargando}
            className={campo}
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!texto.trim() || enviando}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}

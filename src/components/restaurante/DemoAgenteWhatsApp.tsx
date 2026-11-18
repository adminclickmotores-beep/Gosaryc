import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, CheckCheck, Phone, QrCode, Send, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { CORREO_DEMO } from "@/lib/demo-real";

type Mensaje = { de: "cliente" | "agente"; texto: string; hora: string };
type Vehiculo = {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  version: string | null;
  cilindraje: string | null;
  anio: number | null;
  kilometraje: number | null;
  placa: string | null;
  precio: number | null;
  observaciones: string | null;
  soat_vence: string | null;
  tecnomecanica_vence: string | null;
};
type Plato = { id: string; nombre: string; precio: number; descripcion: string | null };

const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const horaAhora = () => new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const RAPIDAS: Record<"vehiculos" | "restaurante", string[]> = {
  vehiculos: ["¿Qué motos tienen disponibles?", "¿Cuánto vale la moto 200cc y qué papeles tiene?", "Quiero agendar una cita en taller"],
  restaurante: ["Hola, ¿me envías el menú?", "Quiero pedir 1 chuleta apanada con papa francesa y salsa de ajo", "¿Cuál es el horario y domicilio?"],
};

/** Demostración interactiva del Agente WhatsApp IA para las cuentas demo: nunca toca sesiones reales. */
export function DemoAgenteWhatsApp({ onConectarReal }: { onConectarReal: () => void }) {
  const { user } = useAuth();
  const tipo: "vehiculos" | "restaurante" = (user?.email ?? "").toLowerCase() === CORREO_DEMO.vehiculos ? "vehiculos" : "restaurante";
  const [nombre, setNombre] = useState(tipo === "vehiculos" ? "ClickMotores Demo" : "Crokante Gourmet Demo");
  const [horarios, setHorarios] = useState("Todos los días 11:00 a.m. - 10:00 p.m.");
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [esperaCita, setEsperaCita] = useState(false);
  const fin = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    const { data: cfg } = await supabase.from("negocio_config").select("nombre,horarios").eq("owner_id", user.id).limit(1).maybeSingle();
    if (cfg?.nombre) setNombre(cfg.nombre);
    if (cfg?.horarios) setHorarios(cfg.horarios);
    if (tipo === "vehiculos") {
      const { data } = await supabase
        .from("vehiculos_inventario")
        .select("id,tipo,marca,modelo,version,cilindraje,anio,kilometraje,placa,precio,observaciones,soat_vence,tecnomecanica_vence")
        .eq("owner_id", user.id)
        .limit(20);
      setVehiculos((data ?? []) as Vehiculo[]);
    } else {
      const { data } = await supabase
        .from("restaurante_productos")
        .select("id,nombre,precio,descripcion")
        .eq("owner_id", user.id)
        .eq("activo", true)
        .limit(30);
      setPlatos((data ?? []) as Plato[]);
    }
  }, [user, tipo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, escribiendo]);

  const nombreVeh = (v: Vehiculo) => `${v.marca} ${v.modelo}${v.version ? ` ${v.version}` : ""}${v.anio ? ` ${v.anio}` : ""}`;

  const responderVehiculos = (m: string): string => {
    const t = norm(m);
    if (esperaCita && /(lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|hoy|\d)/.test(t)) {
      setEsperaCita(false);
      return `Cita agendada en el taller de ${nombre} (simulación de la demo): ${m.trim()}. Te enviaré un recordatorio por este chat el día anterior. ¿Algo más en que te ayude?`;
    }
    if (/(cita|taller|agendar|mantenimiento|revision)/.test(t)) {
      setEsperaCita(true);
      return "Con gusto te agendo en el taller. ¿Qué día y a qué hora te queda mejor? Atendemos de lunes a sábado de 8:00 a.m. a 5:00 p.m.";
    }
    const cc = t.match(/(\d{3,4})\s*cc/);
    const porCC = cc ? vehiculos.filter((v) => v.cilindraje === cc[1]) : [];
    const porModelo = vehiculos.filter((v) => [v.marca, v.modelo].some((p) => p && t.includes(norm(p).split(" ")[0])));
    const elegidos = porCC.length > 0 ? porCC : porModelo;
    if (elegidos.length > 0 && /(vale|precio|cuesta|papeles|soat|tecno|placa|kilometr|info|detalle|cuanto)/.test(t + " info")) {
      const v = elegidos[0];
      return `${nombreVeh(v)}${v.placa ? ` · placa ${v.placa}` : ""}\nPrecio: ${v.precio ? dinero(v.precio) : "a consultar"}\nKilometraje: ${(v.kilometraje ?? 0).toLocaleString("es-CO")} km\nPapeles: SOAT vigente hasta ${v.soat_vence ?? "pendiente"} y tecnomecánica hasta ${v.tecnomecanica_vence ?? "pendiente"}, traspaso incluido.\n${v.observaciones ?? ""}\n¿Quieres agendar una visita o una prueba de manejo?`.trim();
    }
    if (/(moto)/.test(t) || /(carro|camioneta|sedan|suv|auto|vehiculo|disponible|inventario|tienen)/.test(t)) {
      const lista = vehiculos.filter((v) => (/(moto)/.test(t) ? v.tipo === "moto" : /(carro|camioneta|sedan|suv|auto)/.test(t) ? v.tipo === "carro" : true));
      if (lista.length === 0) return "En este momento no tengo unidades de ese tipo disponibles. ¿Te muestro otras opciones?";
      return `Tenemos disponibles:\n${lista.map((v) => `• ${nombreVeh(v)} — ${v.precio ? dinero(v.precio) : "consultar"}`).join("\n")}\n\nEscríbeme el modelo o la cilindrada y te cuento precio y papeles.`;
    }
    if (/(hola|buenas|buenos)/.test(t)) return `¡Hola! Soy el asistente de ${nombre}. Puedo mostrarte motos y carros, darte precios y papeles, o agendarte en el taller. ¿Qué buscas?`;
    return "Puedo ayudarte con motos y carros disponibles, precios, papeles o una cita en el taller. ¿Qué te gustaría saber? Si prefieres, te paso con un asesor.";
  };

  const crearPedidoDemo = async (items: Array<{ p: Plato; c: number }>): Promise<void> => {
    if (!user) return;
    const total = items.reduce((s, x) => s + x.p.precio * x.c, 0);
    const { data: creado } = await supabase
      .from("restaurante_pedidos")
      .insert({
        owner_id: user.id,
        cliente_nombre: "Cliente WhatsApp (demo)",
        cliente_telefono: "3000000000",
        estado: "pendiente",
        metodo_pago: "efectivo",
        modalidad: "mostrador",
        total,
      })
      .select("id")
      .single();
    if (creado) {
      await supabase.from("restaurante_pedido_items").insert(
        items.map((x) => ({ pedido_id: creado.id, producto_id: x.p.id, nombre: x.p.nombre, cantidad: x.c, precio_unitario: x.p.precio })),
      );
      window.dispatchEvent(new Event("negocio:cambio"));
    }
  };

  const responderRestaurante = async (m: string): Promise<string> => {
    const t = norm(m);
    if (/(horario|domicilio|hora|abren|cierran|envio|entrega)/.test(t)) {
      return `Horario: ${horarios}.\nHacemos domicilios en Medellín; el valor depende del barrio y lo confirmamos al tomar tu pedido. También puedes recoger en el local. ¿Te tomo el pedido?`;
    }
    if (/(quiero|pedir|pedido|ordenar|dame|me das|mandame|enviame \d)/.test(t)) {
      const items: Array<{ p: Plato; c: number }> = [];
      for (const p of platos) {
        const palabras = norm(p.nombre).split(" ").filter((w) => w.length > 3);
        const coincide = palabras.some((w) => t.includes(w) || (w.endsWith("s") ? t.includes(w.slice(0, -1)) : false));
        if (!coincide) continue;
        const antes = t.slice(0, Math.max(t.indexOf(palabras.find((w) => t.includes(w)) ?? ""), 0));
        const num = antes.match(/(\d+)\s*(?:x\s*)?[a-z]*\s*$/);
        const c = num ? Math.min(parseInt(num[1], 10), 20) : /\b(dos)\b/.test(antes) ? 2 : 1;
        items.push({ p, c: c > 0 ? c : 1 });
      }
      if (items.length === 0) return "Claro, ¿qué plato te gustaría pedir? Tenemos chuleta apanada, alitas, hamburguesa artesanal y limonada natural.";
      const extras: string[] = [];
      if (/papa francesa/.test(t)) extras.push("papa francesa");
      else if (/papa amarilla/.test(t)) extras.push("papa amarilla");
      if (/ajo/.test(t)) extras.push("salsa de ajo");
      if (/bbq/.test(t)) extras.push("salsa BBQ");
      if (/pina/.test(t)) extras.push("salsa de piña (+$500)");
      const total = items.reduce((s, x) => s + x.p.precio * x.c, 0);
      await crearPedidoDemo(items);
      return `¡Pedido registrado! (simulación de la demo)\n${items.map((x) => `• ${x.c} x ${x.p.nombre} — ${dinero(x.p.precio * x.c)}`).join("\n")}${extras.length ? `\nCon: ${extras.join(", ")}` : ""}\nTotal: ${dinero(total)} + domicilio.\nYa lo ves en Pedidos de tu panel. ¿Me confirmas dirección y forma de pago?`;
    }
    if (/(menu|carta|platos|que tienen|que venden|precios|hola|buenas)/.test(t)) {
      return `¡Hola! Bienvenido a ${nombre}. Este es nuestro menú:\n${platos.map((p) => `• ${p.nombre} — ${dinero(p.precio)}`).join("\n")}\n\nEscríbeme qué quieres pedir, por ejemplo: "1 chuleta apanada con papa francesa y salsa de ajo".`;
    }
    const uno = platos.find((p) => norm(p.nombre).split(" ").some((w) => w.length > 4 && t.includes(w)));
    if (uno) return `${uno.nombre}: ${dinero(uno.precio)}. ${uno.descripcion ?? ""} ¿Te lo agrego al pedido?`;
    return "Puedo enviarte el menú, tomarte el pedido o contarte el horario y los domicilios. ¿Qué prefieres? Si quieres hablar con una persona, dímelo.";
  };

  const enviar = async (valor: string) => {
    const limpio = valor.trim();
    if (!limpio || escribiendo) return;
    setTexto("");
    setMensajes((m) => [...m, { de: "cliente", texto: limpio, hora: horaAhora() }]);
    setEscribiendo(true);
    await new Promise((r) => setTimeout(r, 700));
    let respuesta: string;
    try {
      respuesta = tipo === "vehiculos" ? responderVehiculos(limpio) : await responderRestaurante(limpio);
    } catch {
      respuesta = "Tuve un inconveniente al consultar el catálogo. Intenta de nuevo en un momento.";
    }
    setEscribiendo(false);
    setMensajes((m) => [...m, { de: "agente", texto: respuesta, hora: horaAhora() }]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassPanel className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="icon-chip h-10 w-10 shrink-0 rounded-xl"><Bot className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h3 className="font-display text-lg">Agente WhatsApp IA</h3>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Modo Demo Local Activo (Puerto 3001)
            </p>
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-glass-border bg-background/40 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> Así se vincula tu celular en 5 segundos</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Abre la app de escritorio y enciende el agente.</li>
            <li>En tu celular, abre WhatsApp y entra a «Dispositivos vinculados».</li>
            <li>Escanea el código QR que aparece en pantalla.</li>
            <li>Listo: el agente responde y toma pedidos con los datos de tu negocio.</li>
          </ol>
          <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-glass-border text-muted-foreground">
            <Smartphone className="h-8 w-8" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Esta cuenta es compartida: por seguridad, aquí no se pueden vincular números reales. Prueba el simulador de la derecha para ver cómo atiende el agente.
        </p>
        <button type="button" onClick={onConectarReal} className="text-xs text-muted-foreground underline hover:text-foreground">
          Conectar mi puente local real (localhost:3001)
        </button>
      </GlassPanel>

      <GlassPanel className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20"><Phone className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{nombre}</p>
            <p className="text-xs opacity-80">{escribiendo ? "escribiendo…" : "en línea · Agente IA"}</p>
          </div>
        </div>
        <div className="h-80 space-y-2 overflow-y-auto bg-background/50 p-3">
          {mensajes.length === 0 && <p className="text-center text-xs text-muted-foreground">Toca una pregunta rápida o escribe tu mensaje como si fueras un cliente.</p>}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.de === "cliente" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.de === "cliente" ? "bg-primary/20" : "bg-glass-strong"}`}>
                {m.texto}
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  {m.hora} {m.de === "cliente" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                </span>
              </div>
            </div>
          ))}
          <div ref={fin} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-glass-border/60 p-3">
          {RAPIDAS[tipo].map((q) => (
            <button
              key={q}
              type="button"
              disabled={escribiendo}
              onClick={() => void enviar(q)}
              className="rounded-full border border-glass-border px-3 py-1.5 text-left text-xs hover:bg-primary/10 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 border-t border-glass-border/60 p-3">
          <input
            className="min-w-0 flex-1 rounded-full border border-glass-border bg-background/60 px-4 py-2 text-base"
            placeholder="Escribe un mensaje…"
            value={texto}
            maxLength={300}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void enviar(texto);
            }}
          />
          <button
            type="button"
            onClick={() => void enviar(texto)}
            disabled={escribiendo || !texto.trim()}
            aria-label="Enviar mensaje"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}

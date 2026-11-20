import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Car, UtensilsCrossed, ShoppingCart, ArrowRight, ScanBarcode, Search, Printer, X, MessageCircle,
  Kanban, Calculator, Send, Plus, Minus, Trash2, Sparkles, Package, AlertTriangle,
} from "lucide-react";

/**
 * Demo interactiva: vive 100% en memoria del navegador.
 * No importa ni llama al cliente de base de datos, auth, storage ni funciones.
 */
export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Demo interactiva en vivo | Gosaryc" }] }),
  component: DemoPage,
});

const CLAVE = "gosaryc_demo_sector";
type Sector = "auto" | "rest" | "comercio";
type Producto = { id: string; nombre: string; precio: number; stock: number; ean: string; foto: string; minimo: number };
type Empleado = { id: string; nombre: string; cargo: string; salario: number; horasExtra: number; comisiones: number };
type Prospecto = { id: string; nombre: string; interes: string; nivel: "FRIO" | "TIBIO" | "CALIENTE"; etapa: "Nuevo" | "Contactado" | "Negociando" | "Cerrado" };
type Mensaje = { de: "bot" | "cli"; texto: string };

const ESCENARIOS: Record<Sector, {
  titulo: string; negocio: string; descripcion: string; icono: typeof Car;
  productos: Producto[]; empleados: Empleado[]; preguntas: string[];
}> = {
  auto: {
    titulo: "Concesionario y Taller Automotriz", negocio: "AutoElite Colombia", icono: Car,
    descripcion: "Inventario de autos y motos, retomas, taller, CRM de compradores y comisiones.",
    productos: [
      { id: "a1", nombre: "Renault Kwid 2023", precio: 42900000, stock: 2, ean: "7701234500011", foto: "renault,kwid", minimo: 1 },
      { id: "a2", nombre: "Mazda CX-30 2022", precio: 98500000, stock: 1, ean: "7701234500028", foto: "mazda,suv", minimo: 1 },
      { id: "a3", nombre: "Pulsar NS200 2024", precio: 12800000, stock: 5, ean: "7701234500035", foto: "motorcycle,sport", minimo: 2 },
      { id: "a4", nombre: "Yamaha XTZ 150", precio: 11500000, stock: 4, ean: "7701234500042", foto: "yamaha,motorcycle", minimo: 2 },
      { id: "a5", nombre: "Revisión y alineación", precio: 180000, stock: 99, ean: "7701234500059", foto: "car,workshop", minimo: 0 },
    ],
    empleados: [
      { id: "e1", nombre: "Carlos Mejía", cargo: "Asesor comercial", salario: 2200000, horasExtra: 4, comisiones: 1450000 },
      { id: "e2", nombre: "Laura Ríos", cargo: "Jefe de taller", salario: 2800000, horasExtra: 6, comisiones: 600000 },
      { id: "e3", nombre: "Andrés Pardo", cargo: "Mecánico", salario: 1750905, horasExtra: 10, comisiones: 320000 },
    ],
    preguntas: ["Hola, ¿tienen disponible la NS200 y cuánto piden de inicial?", "Quiero cotizar el Mazda CX-30", "Tengo un reclamo con mi pedido"],
  },
  rest: {
    titulo: "Restaurante y Comidas Rápidas", negocio: "Sabores del Valle", icono: UtensilsCrossed,
    descripcion: "Catálogo con fotos, mesas, POS táctil, comanda de cocina y pedidos por WhatsApp.",
    productos: [
      { id: "r1", nombre: "Chuleta de cerdo", precio: 24000, stock: 30, ean: "7702345600011", foto: "pork,chop,plate", minimo: 5 },
      { id: "r2", nombre: "Alitas BBQ x8", precio: 22000, stock: 25, ean: "7702345600028", foto: "chicken,wings", minimo: 5 },
      { id: "r3", nombre: "Hamburguesa artesanal", precio: 19500, stock: 40, ean: "7702345600035", foto: "burger", minimo: 8 },
      { id: "r4", nombre: "Combo familiar", precio: 69000, stock: 12, ean: "7702345600042", foto: "fastfood,combo", minimo: 3 },
      { id: "r5", nombre: "Limonada de coco", precio: 8500, stock: 50, ean: "7702345600059", foto: "lemonade,drink", minimo: 10 },
    ],
    empleados: [
      { id: "e1", nombre: "María Gómez", cargo: "Cocinera", salario: 1900000, horasExtra: 8, comisiones: 0 },
      { id: "e2", nombre: "Juan Pérez", cargo: "Mesero", salario: 1750905, horasExtra: 12, comisiones: 380000 },
      { id: "e3", nombre: "Sandra Lugo", cargo: "Cajera", salario: 1850000, horasExtra: 2, comisiones: 150000 },
    ],
    preguntas: ["Quiero pedir 2 platos a domicilio", "¿Tienen combo familiar?", "Tengo un reclamo con mi pedido"],
  },
  comercio: {
    titulo: "Ferretería / Minimercado", negocio: "MultiComercio POS", icono: ShoppingCart,
    descripcion: "Productos con código de barras EAN-13, escáner, control de stock y nómina.",
    productos: [
      { id: "c1", nombre: "Taladro percutor 600W", precio: 189000, stock: 6, ean: "7703456700010", foto: "power,drill", minimo: 2 },
      { id: "c2", nombre: "Cemento gris 50 kg", precio: 34500, stock: 3, ean: "7703456700027", foto: "cement,bag", minimo: 5 },
      { id: "c3", nombre: "Pintura blanca galón", precio: 78000, stock: 14, ean: "7703456700034", foto: "paint,bucket", minimo: 4 },
      { id: "c4", nombre: "Arroz Diana 5 lb", precio: 19800, stock: 40, ean: "7703456700041", foto: "rice,bag", minimo: 10 },
      { id: "c5", nombre: "Aceite 3 L", precio: 31500, stock: 2, ean: "7703456700058", foto: "cooking,oil", minimo: 6 },
    ],
    empleados: [
      { id: "e1", nombre: "Pedro Castaño", cargo: "Vendedor", salario: 1750905, horasExtra: 6, comisiones: 420000 },
      { id: "e2", nombre: "Diana Cruz", cargo: "Bodeguera", salario: 1800000, horasExtra: 4, comisiones: 0 },
      { id: "e3", nombre: "Luis Ortiz", cargo: "Cajero", salario: 1850000, horasExtra: 0, comisiones: 180000 },
    ],
    preguntas: ["¿Tienen cemento y cuánto vale?", "Quiero pedir 3 galones de pintura", "Tengo un reclamo con mi pedido"],
  },
};

const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 1100;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); void ctx.close(); }, 120);
  } catch { /* sin audio */ }
}

function Foto({ clave, nombre }: { clave: string; nombre: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground"><Package className="h-8 w-8" /></div>;
  return (
    <img
      src={`https://loremflickr.com/240/160/${clave}?lock=${nombre.length}`}
      alt={nombre} loading="lazy" onError={() => setOk(false)}
      className="h-24 w-full max-w-full object-cover"
    />
  );
}

function DemoPage() {
  const [sector, setSector] = useState<Sector | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const g = sessionStorage.getItem(CLAVE) as Sector | null;
    if (g && g in ESCENARIOS) setSector(g);
    setListo(true);
  }, []);

  const elegir = (s: Sector) => { sessionStorage.setItem(CLAVE, s); setSector(s); };
  const salir = () => { sessionStorage.removeItem(CLAVE); setSector(null); };

  if (!listo) return null;
  if (!sector) return <Selector onElegir={elegir} />;
  return <Simulador key={sector} sector={sector} onSalir={salir} />;
}

function Selector({ onElegir }: { onElegir: (s: Sector) => void }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← Volver a la portada</Link>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Demo interactiva en vivo</h1>
        <p className="mt-2 text-muted-foreground">Elige un tipo de negocio y juega con el sistema sin registrarte. Nada se guarda: al recargar todo vuelve limpio.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {(Object.keys(ESCENARIOS) as Sector[]).map((k) => {
            const e = ESCENARIOS[k];
            const I = e.icono;
            return (
              <button key={k} onClick={() => onElegir(k)} className="rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-lg">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><I className="h-6 w-6" /></span>
                <h2 className="text-lg font-bold">{e.titulo}</h2>
                <p className="text-sm font-semibold text-primary">{e.negocio}</p>
                <p className="mt-2 text-sm text-muted-foreground">{e.descripcion}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">Entrar ahora <ArrowRight className="h-4 w-4" /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Tab = "pos" | "wa" | "crm" | "nomina";

function Simulador({ sector, onSalir }: { sector: Sector; onSalir: () => void }) {
  const esc = ESCENARIOS[sector];
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("pos");
  const [productos, setProductos] = useState<Producto[]>(esc.productos);
  const [prospectos, setProspectos] = useState<Prospecto[]>([
    { id: "p0", nombre: "Cliente de ejemplo", interes: esc.productos[0].nombre, nivel: "TIBIO", etapa: "Contactado" },
  ]);
  const [pqrs, setPqrs] = useState(0);

  const irRegistro = () => {
    sessionStorage.removeItem(CLAVE);
    void navigate({ to: "/login", search: { mode: "signup" } });
  };

  const tabs: { id: Tab; label: string; icon: typeof Car }[] = [
    { id: "pos", label: "1. Jugar con el POS", icon: ShoppingCart },
    { id: "wa", label: "2. Probar WhatsApp IA", icon: MessageCircle },
    { id: "crm", label: "3. Ver CRM Kanban", icon: Kanban },
    { id: "nomina", label: "4. Liquidar Nómina", icon: Calculator },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 shrink-0" /> Modo Demostración Interactivo · Estás probando {esc.negocio}</p>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold " + (tab === t.id ? "bg-background text-foreground" : "bg-primary-foreground/15 hover:bg-primary-foreground/25")}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
            <button onClick={irRegistro} className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Crear mi cuenta gratis (30 días)</button>
            <button onClick={onSalir} className="text-xs underline">Cambiar negocio</button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "pos" && <Pos productos={productos} setProductos={setProductos} />}
        {tab === "wa" && <WhatsApp sector={sector} onProspecto={(p) => setProspectos((a) => [p, ...a])} onPqrs={() => setPqrs((n) => n + 1)} />}
        {tab === "crm" && <Crm prospectos={prospectos} setProspectos={setProspectos} pqrs={pqrs} />}
        {tab === "nomina" && <Nomina empleados={esc.empleados} negocio={esc.negocio} />}
      </main>
    </div>
  );
}

function Pos({ productos, setProductos }: { productos: Producto[]; setProductos: React.Dispatch<React.SetStateAction<Producto[]>> }) {
  const [q, setQ] = useState("");
  const [carro, setCarro] = useState<Record<string, number>>({});
  const [pago, setPago] = useState("Efectivo");
  const [tirilla, setTirilla] = useState<{ lineas: { n: string; c: number; t: number }[]; total: number; pago: string; cufe: string } | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "" });

  const filtrados = useMemo(() => productos.filter((p) => (p.nombre + p.ean).toLowerCase().includes(q.toLowerCase())), [productos, q]);
  const lineas = productos.filter((p) => carro[p.id]).map((p) => ({ p, c: carro[p.id] }));
  const total = lineas.reduce((s, l) => s + l.p.precio * l.c, 0);
  const bajos = productos.filter((p) => p.minimo > 0 && p.stock <= p.minimo);

  const agregar = (p: Producto) => {
    if ((carro[p.id] ?? 0) >= p.stock) return;
    setCarro((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
  };
  const quitar = (id: string) => setCarro((c) => {
    const n = { ...c }; if ((n[id] ?? 0) > 1) n[id] -= 1; else delete n[id]; return n;
  });
  const escanear = () => {
    const disp = productos.filter((p) => p.stock > (carro[p.id] ?? 0));
    if (!disp.length) return;
    const p = disp[Math.floor(Math.random() * disp.length)];
    beep(); agregar(p);
  };
  const cobrar = () => {
    if (!lineas.length) return;
    setTirilla({
      lineas: lineas.map((l) => ({ n: l.p.nombre, c: l.c, t: l.p.precio * l.c })),
      total, pago, cufe: Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
    });
    setProductos((ps) => ps.map((p) => (carro[p.id] ? { ...p, stock: p.stock - carro[p.id] } : p)));
    setCarro({});
  };
  const crear = () => {
    const precio = Number(nuevo.precio);
    if (!nuevo.nombre.trim() || !precio) return;
    setProductos((ps) => [...ps, { id: "n" + Date.now(), nombre: nuevo.nombre.trim().slice(0, 60), precio, stock: 10, ean: "77" + String(Date.now()).slice(-11), foto: "product", minimo: 2 }]);
    setNuevo({ nombre: "", precio: "" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o código" className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-base" />
          </div>
          <button onClick={escanear} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><ScanBarcode className="h-4 w-4" /> Simular Escaneo EAN-13</button>
        </div>
        {bajos.length > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /> Stock bajo: {bajos.map((b) => b.nombre).join(", ")}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => agregar(p)} disabled={p.stock <= 0} className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary disabled:opacity-50">
              <Foto clave={p.foto} nombre={p.nombre} />
              <div className="p-3">
                <p className="break-words text-sm font-semibold">{p.nombre}</p>
                <p className="text-sm font-bold text-primary">{cop(p.precio)}</p>
                <p className="text-[11px] text-muted-foreground">EAN {p.ean} · Stock {p.stock}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row">
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nuevo producto" className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base" />
          <input value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Precio COP" className="rounded-lg border border-border bg-card px-3 py-2 text-base sm:w-40" />
          <button onClick={crear} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Crear</button>
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Venta actual</h3>
        <ul className="mt-3 space-y-2">
          {lineas.length === 0 && <li className="text-sm text-muted-foreground">Toca un producto o simula un escaneo.</li>}
          {lineas.map((l) => (
            <li key={l.p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{l.p.nombre}</span>
              <span className="flex items-center gap-1">
                <button onClick={() => quitar(l.p.id)} aria-label="Quitar uno"><Minus className="h-4 w-4" /></button>
                <b>{l.c}</b>
                <button onClick={() => agregar(l.p)} aria-label="Agregar uno"><Plus className="h-4 w-4" /></button>
                <button onClick={() => setCarro((c) => { const n = { ...c }; delete n[l.p.id]; return n; })} aria-label="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-1">
          {["Efectivo", "Nequi", "Datáfono"].map((m) => (
            <button key={m} onClick={() => setPago(m)} className={"flex-1 rounded-lg px-2 py-2 text-xs font-semibold " + (pago === m ? "bg-primary text-primary-foreground" : "bg-muted")}>{m}</button>
          ))}
        </div>
        <p className="mt-4 flex justify-between text-lg font-extrabold"><span>Total</span><span>{cop(total)}</span></p>
        <button onClick={cobrar} disabled={!lineas.length} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-50"><Printer className="h-4 w-4" /> Cobrar e Imprimir Tirilla</button>
      </aside>

      {tirilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 p-4">
          <div className="max-h-[90dvh] w-full max-w-[320px] overflow-y-auto rounded bg-white p-4 font-mono text-[12px] text-black shadow-2xl">
            <button onClick={() => setTirilla(null)} className="float-right" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            <p className="text-center font-bold">GOSARYC DEMO</p>
            <p className="text-center">Factura electrónica (simulada)</p>
            <hr className="my-2 border-dashed border-black" />
            {tirilla.lineas.map((l, i) => (
              <p key={i} className="flex justify-between gap-2"><span className="break-words">{l.c} x {l.n}</span><span>{cop(l.t)}</span></p>
            ))}
            <hr className="my-2 border-dashed border-black" />
            <p className="flex justify-between font-bold"><span>TOTAL</span><span>{cop(tirilla.total)}</span></p>
            <p>Pago: {tirilla.pago}</p>
            <p className="mt-2 break-all">CUFE: {tirilla.cufe}</p>
            <div className="mx-auto mt-3 grid h-24 w-24 grid-cols-8 gap-px">
              {Array.from({ length: 64 }, (_, i) => <span key={i} className={(parseInt(tirilla.cufe[i % 24], 16) + i) % 3 === 0 ? "bg-white" : "bg-black"} />)}
            </div>
            <p className="mt-2 text-center">¡Gracias por su compra!</p>
            <button onClick={() => window.print()} className="mt-3 w-full rounded bg-black py-2 text-white">Imprimir</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsApp({ sector, onProspecto, onPqrs }: { sector: Sector; onProspecto: (p: Prospecto) => void; onPqrs: () => void }) {
  const esc = ESCENARIOS[sector];
  const [msgs, setMsgs] = useState<Mensaje[]>([{ de: "bot", texto: `Hola, soy el asistente de ${esc.negocio}. ¿En qué te ayudo?` }]);
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement | null>(null);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const enviar = (t: string) => {
    const limpio = t.trim().slice(0, 300);
    if (!limpio) return;
    const m = limpio.toLowerCase();
    let respuesta: string;
    let nivel: Prospecto["nivel"] = "FRIO";
    if (/reclamo|queja|mal estado|demora|tard/.test(m)) {
      respuesta = "Lamento lo ocurrido. Radiqué tu PQRS con número PQ-" + Math.floor(1000 + Math.random() * 9000) + " y un asesor te contactará hoy.";
      onPqrs();
    } else if (/pedir|domicilio|quiero|cotiz|inicial|disponible|compr/.test(m)) {
      nivel = "CALIENTE";
      const p = esc.productos.find((x) => m.split(/\s+/).some((w) => w.length > 3 && x.nombre.toLowerCase().includes(w))) ?? esc.productos[0];
      respuesta = `Sí, tenemos ${p.nombre} por ${cop(p.precio)}. Te califiqué como cliente CALIENTE y creé tu tarjeta en el CRM; un asesor te escribe en minutos.`;
    } else {
      nivel = "TIBIO";
      respuesta = "Con gusto te ayudo. Contamos con " + esc.productos.slice(0, 3).map((p) => p.nombre).join(", ") + ". ¿Cuál te interesa?";
    }
    setMsgs((a) => [...a, { de: "cli", texto: limpio }]);
    setTexto("");
    setTimeout(() => {
      setMsgs((a) => [...a, { de: "bot", texto: respuesta + (nivel !== "FRIO" || !/reclamo|queja/.test(m) ? ` [${nivel}]` : "") }]);
      if (!/reclamo|queja|mal estado|demora|tard/.test(m)) {
        onProspecto({ id: "w" + Date.now(), nombre: "Cliente WhatsApp", interes: limpio.slice(0, 50), nivel, etapa: "Nuevo" });
      }
    }, 500);
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border-4 border-foreground/80 bg-card p-3">
      <p className="rounded-t-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">{esc.negocio} · WhatsApp IA</p>
      <div className="h-80 space-y-2 overflow-y-auto bg-muted p-3">
        {msgs.map((m, i) => (
          <div key={i} className={"max-w-[85%] break-words rounded-xl px-3 py-2 text-sm " + (m.de === "bot" ? "bg-card" : "ml-auto bg-primary text-primary-foreground")}>{m.texto}</div>
        ))}
        <div ref={fin} />
      </div>
      <div className="flex flex-wrap gap-1 py-2">
        {esc.preguntas.map((p) => (
          <button key={p} onClick={() => enviar(p)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">{p}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje" maxLength={300} className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-base" />
        <button className="rounded-full bg-primary px-4 text-primary-foreground" aria-label="Enviar"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

const ETAPAS: Prospecto["etapa"][] = ["Nuevo", "Contactado", "Negociando", "Cerrado"];

function Crm({ prospectos, setProspectos, pqrs }: { prospectos: Prospecto[]; setProspectos: React.Dispatch<React.SetStateAction<Prospecto[]>>; pqrs: number }) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const mover = (id: string, etapa: Prospecto["etapa"]) => setProspectos((a) => a.map((p) => (p.id === id ? { ...p, etapa } : p)));
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Arrastra las tarjetas (o usa los botones). Los chats de WhatsApp IA aparecen aquí al instante. PQRS radicadas: <b>{pqrs}</b></p>
      <div className="grid gap-3 md:grid-cols-4">
        {ETAPAS.map((e) => (
          <div key={e} onDragOver={(ev) => ev.preventDefault()} onDrop={() => { if (arrastrando) mover(arrastrando, e); setArrastrando(null); }} className="min-h-40 rounded-xl border border-border bg-muted/40 p-2">
            <p className="mb-2 text-xs font-bold uppercase">{e}</p>
            <div className="space-y-2">
              {prospectos.filter((p) => p.etapa === e).map((p) => (
                <div key={p.id} draggable onDragStart={() => setArrastrando(p.id)} className="cursor-grab rounded-lg border border-border bg-card p-2 text-sm">
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="break-words text-xs text-muted-foreground">{p.interes}</p>
                  <span className={"mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold " + (p.nivel === "CALIENTE" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground")}>{p.nivel}</span>
                  <div className="mt-1 flex gap-1">
                    {ETAPAS.filter((x) => x !== e).map((x) => (
                      <button key={x} onClick={() => mover(p.id, x)} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{x}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SMMLV = 1750905;
const AUX = 249095;

function calcular(e: Empleado) {
  const valorHora = e.salario / 240;
  const extras = Math.round(e.horasExtra * valorHora * 1.25);
  const aux = e.salario <= 2 * SMMLV ? AUX : 0;
  const devengado = e.salario + aux + extras + e.comisiones;
  const ibc = e.salario + extras + e.comisiones;
  const salud = Math.round(ibc * 0.04);
  const pension = Math.round(ibc * 0.04);
  const neto = devengado - salud - pension;
  const base = e.salario + aux;
  return {
    extras, aux, devengado, salud, pension, neto,
    prima: Math.round(base * 0.0833), cesantias: Math.round(base * 0.0833),
    intereses: Math.round(base * 0.01), vacaciones: Math.round(e.salario * 0.0417),
  };
}

function Nomina({ empleados, negocio }: { empleados: Empleado[]; negocio: string }) {
  const [liquidado, setLiquidado] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const emp = empleados.find((e) => e.id === sel);
  const r = emp ? calcular(emp) : null;
  return (
    <div>
      <button onClick={() => setLiquidado(true)} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">Liquidar Nómina del Periodo</button>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-2">Empleado</th><th className="p-2">Salario</th><th className="p-2">H. extra</th><th className="p-2">Comisiones</th>{liquidado && <><th className="p-2">Devengado</th><th className="p-2">Neto</th><th className="p-2" /></>}</tr></thead>
          <tbody>
            {empleados.map((e) => {
              const c = calcular(e);
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-2">{e.nombre}<br /><span className="text-xs text-muted-foreground">{e.cargo}</span></td>
                  <td className="p-2">{cop(e.salario)}</td><td className="p-2">{e.horasExtra}</td><td className="p-2">{cop(e.comisiones)}</td>
                  {liquidado && <><td className="p-2">{cop(c.devengado)}</td><td className="p-2 font-bold">{cop(c.neto)}</td><td className="p-2"><button onClick={() => setSel(e.id)} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Desprendible</button></td></>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {emp && r && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 p-4">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 text-sm text-black">
            <button onClick={() => setSel(null)} className="float-right" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            <h3 className="font-bold">Desprendible de pago · {negocio}</h3>
            <p>{emp.nombre} — {emp.cargo}</p>
            <table className="mt-3 w-full">
              <tbody>
                {([["Salario base", emp.salario], ["Auxilio de transporte", r.aux], ["Horas extra (+25%)", r.extras], ["Comisiones", emp.comisiones], ["Total devengado", r.devengado], ["Salud 4%", -r.salud], ["Pensión 4%", -r.pension], ["NETO A PAGAR", r.neto], ["Prov. prima", r.prima], ["Prov. cesantías", r.cesantias], ["Prov. int. cesantías", r.intereses], ["Prov. vacaciones", r.vacaciones]] as [string, number][]).map(([k, v]) => (
                  <tr key={k} className={"border-t " + (k === "NETO A PAGAR" || k === "Total devengado" ? "font-bold" : "")}><td className="py-1">{k}</td><td className="py-1 text-right">{cop(v)}</td></tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => window.print()} className="mt-4 w-full rounded bg-black py-2 text-white">Imprimir desprendible</button>
          </div>
        </div>
      )}
    </div>
  );
}

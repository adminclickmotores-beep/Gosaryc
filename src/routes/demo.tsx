import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Car, UtensilsCrossed, ShoppingCart, ArrowRight, ScanBarcode, Search, Printer, X, MessageCircle,
  Kanban, Calculator, Send, Plus, Minus, Trash2, Sparkles, Package, AlertTriangle, Bike, Wrench,
  Coffee, Hammer, Paintbrush, Droplet, Wheat, Flame, Beef, Sandwich, Wallet, Receipt, TrendingUp,
  Truck, FileText, Handshake, CheckCircle2, Bot, UserRound, Boxes, Landmark, Pizza,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
type Prod = {
  id: string; nombre: string; precio: number; stock: number; ean: string; ico: string; minimo: number;
  cat: string; costo: number; ficha?: [string, string][];
};
type Empleado = { id: string; nombre: string; cargo: string; salario: number; horasExtra: number; comisiones: number };
type Prospecto = {
  id: string; nombre: string; interes: string; nivel: "FRIO" | "TIBIO" | "CALIENTE";
  etapa: "Nuevo" | "Contactado" | "Prueba de manejo" | "Cotizado" | "Negociando" | "Cerrado";
  telefono?: string; origen?: string; valor?: number; proximo?: string; notas?: string;
};
type Venta = { id: string; hora: string; detalle: string; total: number; pago: string; tipo: string; envio: number };
type Gasto = { id: string; concepto: string; valor: number };
type Pedido = {
  id: string; cliente: string; canal: string; barrio: string; direccion: string; envio: number;
  items: string; total: number; estado: string; repartidor: string; cobrado: boolean;
};
type Tarifas = Record<string, number>;
type NuevaVenta = Omit<Venta, "id" | "hora">;

const ICONOS: Record<string, LucideIcon> = {
  car: Car, moto: Bike, llave: Wrench, cafe: Coffee, martillo: Hammer, pintura: Paintbrush, gota: Droplet,
  trigo: Wheat, fuego: Flame, carne: Beef, sandwich: Sandwich, caja: Package, pizza: Pizza,
};

const ESCENARIOS: Record<Sector, {
  titulo: string; negocio: string; descripcion: string; icono: LucideIcon;
  productos: Prod[]; empleados: Empleado[]; preguntas: string[]; costoPct: number;
}> = {
  auto: {
    titulo: "Concesionario y Taller Automotriz", negocio: "AutoElite Colombia", icono: Car, costoPct: 0.88,
    descripcion: "Inventario de autos y motos con ficha, cotización con financiación, separación y entrega, taller, CRM y comisiones.",
    productos: [
      { id: "a1", nombre: "Renault Kwid 2023", precio: 42900000, costo: 38500000, stock: 2, ean: "7701234500011", ico: "car", minimo: 1, cat: "Vehículo", ficha: [["Año", "2023"], ["Kilometraje", "18.400 km"], ["Color", "Blanco glaciar"], ["Combustible", "Gasolina"], ["Placa", "KLM 482"], ["Estado", "Peritaje aprobado"]] },
      { id: "a2", nombre: "Mazda CX-30 2022", precio: 98500000, costo: 90200000, stock: 1, ean: "7701234500028", ico: "car", minimo: 1, cat: "Vehículo", ficha: [["Año", "2022"], ["Kilometraje", "31.200 km"], ["Color", "Gris acero"], ["Combustible", "Gasolina"], ["Placa", "PQR 917"], ["Estado", "Garantía vigente"]] },
      { id: "a3", nombre: "Pulsar NS200 2024", precio: 12800000, costo: 11300000, stock: 5, ean: "7701234500035", ico: "moto", minimo: 2, cat: "Vehículo", ficha: [["Año", "2024"], ["Kilometraje", "0 km"], ["Color", "Negro mate"], ["Cilindraje", "200 cc"], ["Placa", "Por matricular"], ["Estado", "Nueva"]] },
      { id: "a4", nombre: "Yamaha XTZ 150", precio: 11500000, costo: 10100000, stock: 4, ean: "7701234500042", ico: "moto", minimo: 2, cat: "Vehículo", ficha: [["Año", "2023"], ["Kilometraje", "6.800 km"], ["Color", "Azul"], ["Cilindraje", "150 cc"], ["Placa", "XTZ 34D"], ["Estado", "Revisada"]] },
    ],
    empleados: [
      { id: "e1", nombre: "Carlos Mejía", cargo: "Asesor comercial", salario: 2200000, horasExtra: 4, comisiones: 1450000 },
      { id: "e2", nombre: "Laura Ríos", cargo: "Jefe de taller", salario: 2800000, horasExtra: 6, comisiones: 600000 },
      { id: "e3", nombre: "Andrés Pardo", cargo: "Mecánico", salario: 1750905, horasExtra: 10, comisiones: 320000 },
    ],
    preguntas: [
      "Hola, ¿tienen disponible la NS200 y cuánto piden de inicial?", "Quiero cotizar el Mazda CX-30 a crédito",
      "¿Reciben mi carro en retoma?", "¿Puedo hacer test drive esta semana?",
      "Necesito cita en el taller para alineación", "Tengo un reclamo con mi pedido",
    ],
  },
  rest: {
    titulo: "Restaurante y Comidas Rápidas", negocio: "Sabores del Valle", icono: UtensilsCrossed, costoPct: 0.38,
    descripcion: "Platos con foto y acompañantes, mesas, domicilios con tarifa por zona, caja, ventas, finanzas y pedidos por WhatsApp.",
    productos: [
      { id: "r1", nombre: "Chuleta de cerdo", precio: 24000, costo: 9500, stock: 30, ean: "7702345600011", ico: "carne", minimo: 5, cat: "Plato" },
      { id: "r2", nombre: "Alitas BBQ x8", precio: 22000, costo: 8200, stock: 25, ean: "7702345600028", ico: "fuego", minimo: 5, cat: "Plato" },
      { id: "r3", nombre: "Hamburguesa artesanal", precio: 19500, costo: 7000, stock: 40, ean: "7702345600035", ico: "sandwich", minimo: 8, cat: "Plato" },
      { id: "r4", nombre: "Combo familiar", precio: 69000, costo: 26000, stock: 12, ean: "7702345600042", ico: "pizza", minimo: 3, cat: "Plato" },
      { id: "r5", nombre: "Limonada de coco", precio: 8500, costo: 2200, stock: 50, ean: "7702345600059", ico: "cafe", minimo: 10, cat: "Bebida" },
    ],
    empleados: [
      { id: "e1", nombre: "María Gómez", cargo: "Cocinera", salario: 1900000, horasExtra: 8, comisiones: 0 },
      { id: "e2", nombre: "Juan Pérez", cargo: "Mesero", salario: 1750905, horasExtra: 12, comisiones: 380000 },
      { id: "e3", nombre: "Sandra Lugo", cargo: "Cajera", salario: 1850000, horasExtra: 2, comisiones: 150000 },
    ],
    preguntas: [
      "Quiero pedir 2 hamburguesas a domicilio", "¿Cuánto cuesta el envío a Laureles?", "¿Tienen combo familiar?",
      "¿A qué hora cierran?", "¿Qué medios de pago aceptan?", "Tengo un reclamo con mi pedido",
    ],
  },
  comercio: {
    titulo: "Ferretería / Minimercado", negocio: "MultiComercio POS", icono: ShoppingCart, costoPct: 0.68,
    descripcion: "Productos con imagen y código de barras EAN-13, escáner, inventario con proveedor, caja, ventas, envíos y finanzas.",
    productos: [
      { id: "c1", nombre: "Taladro percutor 600W", precio: 189000, costo: 128000, stock: 6, ean: "7703456700010", ico: "martillo", minimo: 2, cat: "Ferretería" },
      { id: "c2", nombre: "Cemento gris 50 kg", precio: 34500, costo: 27000, stock: 3, ean: "7703456700027", ico: "caja", minimo: 5, cat: "Ferretería" },
      { id: "c3", nombre: "Pintura blanca galón", precio: 78000, costo: 52000, stock: 14, ean: "7703456700034", ico: "pintura", minimo: 4, cat: "Ferretería" },
      { id: "c4", nombre: "Arroz Diana 5 lb", precio: 19800, costo: 15200, stock: 40, ean: "7703456700041", ico: "trigo", minimo: 10, cat: "Mercado" },
      { id: "c5", nombre: "Aceite 3 L", precio: 31500, costo: 24800, stock: 2, ean: "7703456700058", ico: "gota", minimo: 6, cat: "Mercado" },
    ],
    empleados: [
      { id: "e1", nombre: "Pedro Castaño", cargo: "Vendedor", salario: 1750905, horasExtra: 6, comisiones: 420000 },
      { id: "e2", nombre: "Diana Cruz", cargo: "Bodeguera", salario: 1800000, horasExtra: 4, comisiones: 0 },
      { id: "e3", nombre: "Luis Ortiz", cargo: "Cajero", salario: 1850000, horasExtra: 0, comisiones: 180000 },
    ],
    preguntas: [
      "¿Tienen cemento y cuánto vale?", "Quiero 3 galones de pintura", "¿Hacen domicilio a Envigado?",
      "¿Aceptan Nequi?", "¿Hasta qué hora atienden?", "Tengo un reclamo con mi pedido",
    ],
  },
};

const SERVICIOS_TALLER: { n: string; v: number }[] = [
  { n: "Revisión y alineación", v: 180000 }, { n: "Cambio de aceite y filtro", v: 120000 },
  { n: "Pastillas y frenos", v: 260000 }, { n: "Diagnóstico por escáner", v: 90000 },
];

const ACOMPANANTES: { n: string; v: number }[] = [
  { n: "Papas fritas", v: 4000 }, { n: "Arroz", v: 3000 }, { n: "Ensalada", v: 3500 },
  { n: "Yuca frita", v: 3500 }, { n: "Plátano maduro", v: 3000 }, { n: "Salsa extra", v: 1000 },
];

const TARIFAS_INICIALES: Tarifas = { Centro: 3000, Laureles: 5000, "El Poblado": 7000, Envigado: 9000, "Belén": 6000 };
const REPARTIDORES = ["Camilo", "Yurley", "Dani"];
const ESTADOS_PEDIDO = ["Nuevo", "En preparación", "En camino", "Entregado"];

const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const horaAhora = () => new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

function cuotaMensual(monto: number, tasaPct: number, meses: number) {
  const r = tasaPct / 100;
  if (r <= 0) return monto / meses;
  return (monto * r) / (1 - Math.pow(1 + r, -meses));
}

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

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

function Foto({ ico, nombre, alto = "h-24" }: { ico: string; nombre: string; alto?: string }) {
  const I = ICONOS[ico] ?? Package;
  const h = hash(nombre);
  return (
    <div
      className={"flex w-full items-center justify-center " + alto}
      style={{ background: `linear-gradient(135deg, hsl(${h} 65% 42%), hsl(${(h + 50) % 360} 70% 30%))` }}
      role="img" aria-label={nombre}
    >
      <I className="h-10 w-10 text-white/90" />
    </div>
  );
}

function Modal({ onClose, children, ancho = "max-w-md" }: { onClose: () => void; children: ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 p-4">
      <div className={"max-h-[90dvh] w-full overflow-y-auto rounded-xl bg-card p-5 text-sm text-card-foreground shadow-2xl " + ancho}>
        <button onClick={onClose} className="float-right" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        {children}
      </div>
    </div>
  );
}

function Tarjeta({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xl font-extrabold">{valor}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
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

type TabDef = { id: string; label: string; icon: LucideIcon; ayuda: string };

const TABS: Record<Sector, TabDef[]> = {
  auto: [
    { id: "inv", label: "Inventario", icon: Car, ayuda: "Toca un vehículo para ver su ficha completa, cotizarlo o separarlo." },
    { id: "cot", label: "Cotizar y financiar", icon: Calculator, ayuda: "Mueve la cuota inicial y el plazo: la cuota mensual se recalcula al instante." },
    { id: "cierre", label: "Separación y entrega", icon: Handshake, ayuda: "Lleva la venta paso a paso: separación, crédito, documentos, factura y entrega." },
    { id: "taller", label: "Taller", icon: Wrench, ayuda: "Recibe un vehículo, avanza la orden y cóbrala al entregarlo." },
    { id: "wa", label: "WhatsApp IA", icon: MessageCircle, ayuda: "Escribe lo que quieras como si fueras un cliente. A la derecha ves lo que registra tu equipo." },
    { id: "crm", label: "CRM", icon: Kanban, ayuda: "Los interesados de WhatsApp aparecen aquí. Arrastra las tarjetas entre etapas." },
    { id: "fin", label: "Finanzas", icon: TrendingUp, ayuda: "Ingresos, gastos y utilidad se actualizan con cada venta y cada entrega." },
    { id: "nomina", label: "Comisiones y nómina", icon: Landmark, ayuda: "Liquida el periodo y abre el desprendible de cada empleado." },
  ],
  rest: [
    { id: "pos", label: "Tomar pedido", icon: ShoppingCart, ayuda: "Toca un plato, elige acompañantes, escoge mesa, recoger o domicilio y cobra." },
    { id: "ped", label: "Domicilios", icon: Truck, ayuda: "Avanza cada pedido: preparación, repartidor, en camino y entregado. Ajusta la tarifa por zona." },
    { id: "caja", label: "Caja", icon: Wallet, ayuda: "Abre el turno, registra gastos, cuenta el efectivo y revisa la diferencia." },
    { id: "ventas", label: "Ventas", icon: Receipt, ayuda: "Todas las ventas del día, por mesa, mostrador y domicilio." },
    { id: "fin", label: "Finanzas y contabilidad", icon: TrendingUp, ayuda: "Utilidad del día, gastos y asientos contables automáticos." },
    { id: "wa", label: "WhatsApp IA", icon: MessageCircle, ayuda: "Pide un domicilio por chat: el pedido llega solo a la pestaña Domicilios." },
    { id: "nomina", label: "Nómina", icon: Landmark, ayuda: "Liquida el periodo y abre el desprendible de cada empleado." },
  ],
  comercio: [
    { id: "pos", label: "Punto de venta", icon: ShoppingCart, ayuda: "Escanea o digita un código EAN-13, cobra y mira cómo baja el stock." },
    { id: "inv", label: "Inventario", icon: Boxes, ayuda: "Revisa el stock bajo, pide a tu proveedor y crea productos nuevos." },
    { id: "ped", label: "Pedidos y envíos", icon: Truck, ayuda: "Despacha pedidos a domicilio con la tarifa por zona ya configurada." },
    { id: "caja", label: "Caja", icon: Wallet, ayuda: "Abre el turno, registra gastos, cuenta el efectivo y revisa la diferencia." },
    { id: "ventas", label: "Ventas", icon: Receipt, ayuda: "Todas las ventas del día con su medio de pago." },
    { id: "fin", label: "Finanzas y contabilidad", icon: TrendingUp, ayuda: "Utilidad del día, gastos y asientos contables automáticos." },
    { id: "wa", label: "WhatsApp IA", icon: MessageCircle, ayuda: "Consulta precios y pide por chat: el pedido llega a Pedidos y envíos." },
    { id: "nomina", label: "Nómina", icon: Landmark, ayuda: "Liquida el periodo y abre el desprendible de cada empleado." },
  ],
};

function ventasIniciales(sector: Sector): Venta[] {
  if (sector === "rest") return [
    { id: "s1", hora: "11:42", detalle: "2 x Hamburguesa artesanal, 1 x Limonada de coco", total: 47500, pago: "Nequi", tipo: "Mesa 3", envio: 0 },
    { id: "s2", hora: "12:10", detalle: "1 x Combo familiar", total: 74000, pago: "Efectivo", tipo: "Domicilio", envio: 5000 },
    { id: "s3", hora: "12:36", detalle: "2 x Alitas BBQ x8", total: 44000, pago: "Datáfono", tipo: "Recoger", envio: 0 },
  ];
  if (sector === "comercio") return [
    { id: "s1", hora: "08:20", detalle: "1 x Taladro percutor 600W", total: 189000, pago: "Datáfono", tipo: "Mostrador", envio: 0 },
    { id: "s2", hora: "09:05", detalle: "3 x Arroz Diana 5 lb", total: 59400, pago: "Efectivo", tipo: "Mostrador", envio: 0 },
    { id: "s3", hora: "10:30", detalle: "2 x Pintura blanca galón", total: 156000, pago: "Nequi", tipo: "Mostrador", envio: 0 },
  ];
  return [
    { id: "s1", hora: "09:15", detalle: "Revisión y alineación · KLM 482", total: 180000, pago: "Datáfono", tipo: "Taller", envio: 0 },
    { id: "s2", hora: "10:40", detalle: "Yamaha XTZ 150 · entrega a Julián Vega", total: 11500000, pago: "Transferencia", tipo: "Vehículo", envio: 0 },
  ];
}

function pedidosIniciales(sector: Sector): Pedido[] {
  if (sector === "rest") return [
    { id: "P101", cliente: "Natalia Ruiz", canal: "WhatsApp", barrio: "Laureles", direccion: "Cra 70 #44-12", envio: 5000, items: "2 x Alitas BBQ x8", total: 49000, estado: "En camino", repartidor: "Camilo", cobrado: false },
  ];
  if (sector === "comercio") return [
    { id: "P101", cliente: "Obras Hernández", canal: "WhatsApp", barrio: "Envigado", direccion: "Cl 37 Sur #30-15", envio: 9000, items: "4 x Cemento gris 50 kg", total: 147000, estado: "Nuevo", repartidor: "", cobrado: false },
  ];
  return [];
}

function Simulador({ sector, onSalir }: { sector: Sector; onSalir: () => void }) {
  const esc = ESCENARIOS[sector];
  const tabs = TABS[sector];
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>(tabs[0].id);
  const [productos, setProductos] = useState<Prod[]>(esc.productos);
  const [ventas, setVentas] = useState<Venta[]>(() => ventasIniciales(sector));
  const [gastos, setGastos] = useState<Gasto[]>([{ id: "g1", concepto: "Servicios públicos", valor: 85000 }]);
  const [pedidos, setPedidos] = useState<Pedido[]>(() => pedidosIniciales(sector));
  const [tarifas, setTarifas] = useState<Tarifas>(TARIFAS_INICIALES);
  const [vehSel, setVehSel] = useState<string>(esc.productos[0].id);
  const [prospectos, setProspectos] = useState<Prospecto[]>([
    { id: "p0", nombre: "Julián Vega", interes: esc.productos[0].nombre, nivel: "TIBIO", etapa: "Contactado", telefono: "310 555 0142", origen: "Facebook", valor: esc.productos[0].precio, proximo: "Llamar mañana 10:00 a. m.", notas: "Quiere financiar a 60 meses." },
    { id: "p1", nombre: "Marcela Torres", interes: esc.productos[1].nombre, nivel: "CALIENTE", etapa: "Negociando", telefono: "300 555 0177", origen: "Referido", valor: esc.productos[1].precio, proximo: "Enviar cotización final", notas: "Ofrece su Spark 2019 en retoma." },
    { id: "p2", nombre: "Andrea Cano", interes: esc.productos[2].nombre, nivel: "CALIENTE", etapa: "Prueba de manejo", telefono: "315 555 0108", origen: "WhatsApp", valor: esc.productos[2].precio, proximo: "Prueba el sábado 9:00 a. m.", notas: "" },
    { id: "p3", nombre: "Felipe Duque", interes: esc.productos[3].nombre, nivel: "FRIO", etapa: "Nuevo", telefono: "320 555 0166", origen: "Vitrina", valor: esc.productos[3].precio, proximo: "Primer contacto", notas: "" },
  ]);
  const [pqrs, setPqrs] = useState(0);

  const irRegistro = () => {
    sessionStorage.removeItem(CLAVE);
    void navigate({ to: "/login", search: { mode: "signup" } });
  };

  const registrarVenta = (v: NuevaVenta) => {
    setVentas((a) => [{ ...v, id: "v" + Date.now() + Math.floor(Math.random() * 100), hora: horaAhora() }, ...a]);
  };
  const upsertProspecto = (p: Prospecto) => setProspectos((a) => (a.some((x) => x.id === p.id) ? a.map((x) => (x.id === p.id ? { ...x, ...p, etapa: x.etapa } : x)) : [p, ...a]));
  const nuevoPedido = (p: Pedido) => setPedidos((a) => [p, ...a]);

  const actual = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 shrink-0" /> Modo Demostración Interactivo · Estás probando {esc.negocio}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={irRegistro} className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Crear mi cuenta gratis (30 días)</button>
              <button onClick={onSalir} className="text-xs underline">Cambiar negocio</button>
            </div>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={"inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold " + (tab === t.id ? "bg-background text-foreground" : "bg-primary-foreground/15 hover:bg-primary-foreground/25")}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"><b>Qué probar:</b> {actual.ayuda}</p>
        {tab === "pos" && <Pos sector={sector} productos={productos} setProductos={setProductos} tarifas={tarifas} registrarVenta={registrarVenta} nuevoPedido={nuevoPedido} />}
        {tab === "inv" && sector === "auto" && <InventarioAuto productos={productos} onCotizar={(id) => { setVehSel(id); setTab("cot"); }} onSeparar={(id) => { setVehSel(id); setTab("cierre"); }} />}
        {tab === "inv" && sector === "comercio" && <InventarioComercio productos={productos} setProductos={setProductos} setGastos={setGastos} />}
        {tab === "cot" && <CotizadorAuto productos={productos.filter((p) => p.cat === "Vehículo")} vehSel={vehSel} setVehSel={setVehSel} onSeparar={(id) => { setVehSel(id); setTab("cierre"); }} />}
        {tab === "cierre" && <CierreAuto productos={productos} setProductos={setProductos} vehSel={vehSel} registrarVenta={registrarVenta} />}
        {tab === "taller" && <Taller registrarVenta={registrarVenta} />}
        {tab === "ped" && <Domicilios pedidos={pedidos} setPedidos={setPedidos} tarifas={tarifas} setTarifas={setTarifas} registrarVenta={registrarVenta} />}
        {tab === "caja" && <Caja ventas={ventas} gastos={gastos} setGastos={setGastos} />}
        {tab === "ventas" && <Ventas ventas={ventas} />}
        {tab === "fin" && <Finanzas sector={sector} ventas={ventas} gastos={gastos} setGastos={setGastos} />}
        {tab === "wa" && <WhatsApp sector={sector} productos={productos} tarifas={tarifas} onLead={upsertProspecto} onPedido={nuevoPedido} onPqrs={() => setPqrs((n) => n + 1)} />}
        {tab === "crm" && <Crm prospectos={prospectos} setProspectos={setProspectos} pqrs={pqrs} vehiculos={productos.filter((p) => p.cat === "Vehículo")} />}
        {tab === "nomina" && <Nomina empleados={esc.empleados} negocio={esc.negocio} />}
      </main>
    </div>
  );
}

/* ───────────── Punto de venta (restaurante y comercio) ───────────── */

type Linea = { key: string; p: Prod; extras: string[]; extraValor: number; nota: string; c: number };
type Tirilla = { lineas: { n: string; c: number; t: number; extras: string[] }[]; subtotal: number; envio: number; total: number; pago: string; servicio: string; cufe: string; recibe: number };

function Pos({ sector, productos, setProductos, tarifas, registrarVenta, nuevoPedido }: {
  sector: Sector; productos: Prod[]; setProductos: React.Dispatch<React.SetStateAction<Prod[]>>;
  tarifas: Tarifas; registrarVenta: (v: NuevaVenta) => void; nuevoPedido: (p: Pedido) => void;
}) {
  const esRest = sector === "rest";
  const [q, setQ] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [pago, setPago] = useState("Efectivo");
  const [servicio, setServicio] = useState(esRest ? "Mesa" : "Mostrador");
  const [mesa, setMesa] = useState("1");
  const [barrio, setBarrio] = useState(Object.keys(tarifas)[0] ?? "");
  const [dir, setDir] = useState("");
  const [cliente, setCliente] = useState("");
  const [recibe, setRecibe] = useState("");
  const [error, setError] = useState("");
  const [personalizar, setPersonalizar] = useState<Prod | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [cant, setCant] = useState(1);
  const [nota, setNota] = useState("");
  const [tirilla, setTirilla] = useState<Tirilla | null>(null);

  const filtrados = useMemo(() => productos.filter((p) => norm(p.nombre + p.ean).includes(norm(q))), [productos, q]);
  const subtotal = lineas.reduce((s, l) => s + (l.p.precio + l.extraValor) * l.c, 0);
  const envio = servicio === "Domicilio" ? tarifas[barrio] ?? 0 : 0;
  const total = subtotal + envio;
  const bajos = productos.filter((p) => p.minimo > 0 && p.stock <= p.minimo);
  const enCarro = (id: string) => lineas.filter((l) => l.p.id === id).reduce((s, l) => s + l.c, 0);

  const agregarLinea = (p: Prod, extras: string[], c: number, n: string) => {
    if (enCarro(p.id) + c > p.stock) { setError(`Solo quedan ${p.stock} de ${p.nombre}.`); return; }
    setError("");
    const extraValor = extras.reduce((s, x) => s + (ACOMPANANTES.find((a) => a.n === x)?.v ?? 0), 0);
    const key = p.id + "|" + [...extras].sort().join(",") + "|" + n;
    setLineas((ls) => (ls.some((l) => l.key === key) ? ls.map((l) => (l.key === key ? { ...l, c: l.c + c } : l)) : [...ls, { key, p, extras, extraValor, nota: n, c }]));
  };
  const tocar = (p: Prod) => {
    if (esRest && p.cat === "Plato") { setPersonalizar(p); setSel([]); setCant(1); setNota(""); return; }
    agregarLinea(p, [], 1, "");
  };
  const cambiar = (key: string, d: number) => setLineas((ls) => ls.flatMap((l) => {
    if (l.key !== key) return [l];
    const c = l.c + d;
    if (c <= 0) return [];
    if (d > 0 && enCarro(l.p.id) >= l.p.stock) return [l];
    return [{ ...l, c }];
  }));
  const escanear = () => {
    const disp = productos.filter((p) => p.stock > enCarro(p.id));
    if (!disp.length) return;
    beep(); agregarLinea(disp[Math.floor(Math.random() * disp.length)], [], 1, "");
  };
  const buscarEnter = () => {
    const p = productos.find((x) => x.ean === q.trim());
    if (p) { beep(); agregarLinea(p, [], 1, ""); setQ(""); }
  };
  const cobrar = () => {
    if (!lineas.length) return;
    if (servicio === "Domicilio" && dir.trim().length < 4) { setError("Escribe la dirección de entrega."); return; }
    if (pago === "Efectivo" && recibe && Number(recibe) < total) { setError("El efectivo recibido no alcanza para el total."); return; }
    setError("");
    const detalle = lineas.map((l) => `${l.c} x ${l.p.nombre}`).join(", ");
    const tipo = servicio === "Mesa" ? `Mesa ${mesa}` : servicio;
    registrarVenta({ detalle, total, pago, tipo, envio });
    if (servicio === "Domicilio") {
      nuevoPedido({ id: "P" + String(Date.now()).slice(-4), cliente: cliente.trim() || "Cliente del local", canal: "POS", barrio, direccion: dir.trim(), envio, items: detalle, total, estado: "Nuevo", repartidor: "", cobrado: true });
    }
    setTirilla({
      lineas: lineas.map((l) => ({ n: l.p.nombre, c: l.c, t: (l.p.precio + l.extraValor) * l.c, extras: l.extras })),
      subtotal, envio, total, pago, servicio: tipo, recibe: Number(recibe) || 0,
      cufe: Array.from({ length: 24 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
    });
    setProductos((ps) => ps.map((p) => (enCarro(p.id) ? { ...p, stock: p.stock - enCarro(p.id) } : p)));
    setLineas([]); setRecibe(""); setDir(""); setCliente("");
  };
  const servicios = esRest ? ["Mesa", "Recoger", "Domicilio"] : ["Mostrador", "Domicilio"];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarEnter(); } }}
              placeholder={esRest ? "Buscar plato o bebida" : "Buscar producto o digitar código EAN-13 + Enter"} className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-base" />
          </div>
          {!esRest && <button onClick={escanear} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><ScanBarcode className="h-4 w-4" /> Simular escaneo EAN-13</button>}
        </div>
        {bajos.length > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0" /> Stock bajo: {bajos.map((b) => b.nombre).join(", ")}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {filtrados.map((p) => (
            <button key={p.id} onClick={() => tocar(p)} disabled={p.stock <= 0} className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary disabled:opacity-50">
              <Foto ico={p.ico} nombre={p.nombre} />
              <div className="p-3">
                <p className="break-words text-sm font-semibold">{p.nombre}</p>
                <p className="text-sm font-bold text-primary">{cop(p.precio)}</p>
                <p className="text-[11px] text-muted-foreground">{esRest ? `${p.cat} · ` : `EAN ${p.ean} · `}Stock {p.stock}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">{esRest ? "Pedido actual" : "Venta actual"}</h3>
        <ul className="mt-3 space-y-2">
          {lineas.length === 0 && <li className="text-sm text-muted-foreground">Toca un producto{esRest ? "" : " o simula un escaneo"}.</li>}
          {lineas.map((l) => (
            <li key={l.key} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words">
                {l.p.nombre}
                {l.extras.length > 0 && <span className="block text-xs text-muted-foreground">+ {l.extras.join(", ")}</span>}
                {l.nota && <span className="block text-xs italic text-muted-foreground">“{l.nota}”</span>}
              </span>
              <span className="flex items-center gap-1">
                <button onClick={() => cambiar(l.key, -1)} aria-label="Quitar uno"><Minus className="h-4 w-4" /></button>
                <b>{l.c}</b>
                <button onClick={() => cambiar(l.key, 1)} aria-label="Agregar uno"><Plus className="h-4 w-4" /></button>
                <button onClick={() => cambiar(l.key, -l.c)} aria-label="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></button>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">{esRest ? "Servicio" : "Entrega"}</p>
        <div className="mt-1 flex gap-1">
          {servicios.map((s) => (
            <button key={s} onClick={() => setServicio(s)} className={"flex-1 rounded-lg px-2 py-2 text-xs font-semibold " + (servicio === s ? "bg-primary text-primary-foreground" : "bg-muted")}>{s}</button>
          ))}
        </div>
        {servicio === "Mesa" && (
          <select value={mesa} onChange={(e) => setMesa(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-base">
            {Array.from({ length: 8 }, (_, i) => <option key={i} value={String(i + 1)}>Mesa {i + 1}</option>)}
          </select>
        )}
        {servicio === "Domicilio" && (
          <div className="mt-2 space-y-2">
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
            <select value={barrio} onChange={(e) => setBarrio(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base">
              {Object.entries(tarifas).map(([b, v]) => <option key={b} value={b}>{b} · envío {cop(v)}</option>)}
            </select>
            <input value={dir} onChange={(e) => setDir(e.target.value)} placeholder="Dirección de entrega" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
          </div>
        )}

        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Medio de pago</p>
        <div className="mt-1 flex gap-1">
          {["Efectivo", "Nequi", "Datáfono"].map((m) => (
            <button key={m} onClick={() => setPago(m)} className={"flex-1 rounded-lg px-2 py-2 text-xs font-semibold " + (pago === m ? "bg-primary text-primary-foreground" : "bg-muted")}>{m}</button>
          ))}
        </div>
        {pago === "Efectivo" && (
          <div className="mt-2 flex items-center gap-2">
            <input value={recibe} onChange={(e) => setRecibe(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Efectivo recibido" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base" />
            {Number(recibe) >= total && total > 0 && <span className="text-xs font-bold">Cambio {cop(Number(recibe) - total)}</span>}
          </div>
        )}

        <div className="mt-4 space-y-1 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><span>{cop(subtotal)}</span></p>
          {servicio === "Domicilio" && <p className="flex justify-between"><span>Envío a {barrio}</span><span>{cop(envio)}</span></p>}
        </div>
        <p className="mt-1 flex justify-between text-lg font-extrabold"><span>Total</span><span>{cop(total)}</span></p>
        {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
        <button onClick={cobrar} disabled={!lineas.length} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-50"><Printer className="h-4 w-4" /> Cobrar e imprimir tirilla</button>
      </aside>

      {personalizar && (
        <Modal onClose={() => setPersonalizar(null)}>
          <h3 className="font-bold">{personalizar.nombre} · {cop(personalizar.precio)}</h3>
          <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Acompañantes</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {ACOMPANANTES.map((a) => {
              const on = sel.includes(a.n);
              return (
                <button key={a.n} onClick={() => setSel((s) => (on ? s.filter((x) => x !== a.n) : [...s, a.n]))} className={"rounded-lg border px-2 py-2 text-left text-xs font-semibold " + (on ? "border-primary bg-primary/10" : "border-border")}>
                  {a.n}<span className="block font-normal text-muted-foreground">+ {cop(a.v)}</span>
                </button>
              );
            })}
          </div>
          <input value={nota} onChange={(e) => setNota(e.target.value.slice(0, 60))} placeholder="Nota para cocina (sin cebolla, bien asado…)" className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <button onClick={() => setCant((c) => Math.max(1, c - 1))} aria-label="Menos"><Minus className="h-4 w-4" /></button>
              <b>{cant}</b>
              <button onClick={() => setCant((c) => c + 1)} aria-label="Más"><Plus className="h-4 w-4" /></button>
            </span>
            <button onClick={() => { agregarLinea(personalizar, sel, cant, nota.trim()); setPersonalizar(null); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              Agregar · {cop((personalizar.precio + sel.reduce((s, x) => s + (ACOMPANANTES.find((a) => a.n === x)?.v ?? 0), 0)) * cant)}
            </button>
          </div>
        </Modal>
      )}

      {tirilla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/60 p-4">
          <div className="max-h-[90dvh] w-full max-w-[320px] overflow-y-auto rounded bg-white p-4 font-mono text-[12px] text-black shadow-2xl">
            <button onClick={() => setTirilla(null)} className="float-right" aria-label="Cerrar"><X className="h-4 w-4" /></button>
            <p className="text-center font-bold">GOSARYC DEMO</p>
            <p className="text-center">Factura electrónica (simulada)</p>
            <p className="text-center">{tirilla.servicio}</p>
            <hr className="my-2 border-dashed border-black" />
            {tirilla.lineas.map((l, i) => (
              <div key={i}>
                <p className="flex justify-between gap-2"><span className="break-words">{l.c} x {l.n}</span><span>{cop(l.t)}</span></p>
                {l.extras.length > 0 && <p className="pl-2 text-[10px]">+ {l.extras.join(", ")}</p>}
              </div>
            ))}
            <hr className="my-2 border-dashed border-black" />
            <p className="flex justify-between"><span>Subtotal</span><span>{cop(tirilla.subtotal)}</span></p>
            {tirilla.envio > 0 && <p className="flex justify-between"><span>Envío</span><span>{cop(tirilla.envio)}</span></p>}
            <p className="flex justify-between font-bold"><span>TOTAL</span><span>{cop(tirilla.total)}</span></p>
            <p>Pago: {tirilla.pago}{tirilla.pago === "Efectivo" && tirilla.recibe >= tirilla.total ? ` · Cambio ${cop(tirilla.recibe - tirilla.total)}` : ""}</p>
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

/* ───────────── Domicilios / pedidos y envíos ───────────── */

function Domicilios({ pedidos, setPedidos, tarifas, setTarifas, registrarVenta }: {
  pedidos: Pedido[]; setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
  tarifas: Tarifas; setTarifas: React.Dispatch<React.SetStateAction<Tarifas>>; registrarVenta: (v: NuevaVenta) => void;
}) {
  const [aviso, setAviso] = useState("");
  const avanzar = (p: Pedido) => {
    const i = ESTADOS_PEDIDO.indexOf(p.estado);
    const sig = ESTADOS_PEDIDO[i + 1];
    if (!sig) return;
    if (sig === "En camino" && !p.repartidor) { setAviso(`Asigna un repartidor al pedido ${p.id} antes de despacharlo.`); return; }
    setAviso("");
    if (sig === "Entregado" && !p.cobrado) registrarVenta({ detalle: p.items, total: p.total, pago: "Efectivo", tipo: "Domicilio", envio: p.envio });
    setPedidos((a) => a.map((x) => (x.id === p.id ? { ...x, estado: sig, cobrado: true } : x)));
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-3">
        {aviso && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{aviso}</p>}
        {pedidos.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Aún no hay pedidos. Crea uno con «Domicilio» en el punto de venta o desde WhatsApp IA.</p>}
        {pedidos.map((p) => {
          const sig = ESTADOS_PEDIDO[ESTADOS_PEDIDO.indexOf(p.estado) + 1];
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{p.id} · {p.cliente} <span className="text-xs font-normal text-muted-foreground">({p.canal})</span></p>
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{p.estado}</span>
              </div>
              <p className="mt-1 break-words text-sm">{p.items}</p>
              <p className="text-xs text-muted-foreground">{p.barrio} · {p.direccion || "Sin dirección"} · Envío {cop(p.envio)} · Total {cop(p.total)}{p.cobrado ? " · Pagado" : " · Pago contra entrega"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={p.repartidor} disabled={p.estado === "Entregado"} onChange={(e) => setPedidos((a) => a.map((x) => (x.id === p.id ? { ...x, repartidor: e.target.value } : x)))} className="rounded-lg border border-border bg-background px-2 py-1.5 text-base">
                  <option value="">Repartidor…</option>
                  {REPARTIDORES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {sig ? <button onClick={() => avanzar(p)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Pasar a «{sig}»</button>
                  : <span className="inline-flex items-center gap-1 text-xs font-bold"><CheckCircle2 className="h-4 w-4" /> Entregado</span>}
              </div>
            </div>
          );
        })}
      </section>
      <aside className="h-fit rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Tarifa de envío por zona</h3>
        <p className="text-xs text-muted-foreground">Configurada una sola vez: el punto de venta y el WhatsApp IA la usan solos.</p>
        <ul className="mt-3 space-y-2">
          {Object.entries(tarifas).map(([b, v]) => (
            <li key={b} className="flex items-center justify-between gap-2 text-sm">
              <span>{b}</span>
              <input value={v} onChange={(e) => setTarifas((t) => ({ ...t, [b]: Number(e.target.value.replace(/\D/g, "")) }))} inputMode="numeric" className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right text-base" />
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/* ───────────── Caja, ventas y finanzas ───────────── */

function sumaPago(ventas: Venta[], m: string) { return ventas.filter((v) => v.pago === m).reduce((s, v) => s + v.total, 0); }

function Caja({ ventas, gastos, setGastos }: { ventas: Venta[]; gastos: Gasto[]; setGastos: React.Dispatch<React.SetStateAction<Gasto[]>> }) {
  const [base, setBase] = useState("200000");
  const [conteo, setConteo] = useState("");
  const [cerrado, setCerrado] = useState(false);
  const [g, setG] = useState({ concepto: "", valor: "" });
  const efectivo = sumaPago(ventas, "Efectivo");
  const totalGastos = gastos.reduce((s, x) => s + x.valor, 0);
  const esperado = Number(base || 0) + efectivo - totalGastos;
  const dif = conteo === "" ? null : Number(conteo) - esperado;
  const agregar = () => {
    const valor = Number(g.valor);
    if (!g.concepto.trim() || !valor) return;
    setGastos((a) => [{ id: "g" + Date.now(), concepto: g.concepto.trim().slice(0, 50), valor }, ...a]);
    setG({ concepto: "", valor: "" });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Turno de caja {cerrado ? "(cerrado)" : "(abierto)"}</h3>
        <label className="block text-sm">Base de apertura
          <input value={base} onChange={(e) => setBase(e.target.value.replace(/\D/g, ""))} disabled={cerrado} inputMode="numeric" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </label>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          {["Efectivo", "Nequi", "Datáfono"].map((m) => <div key={m} className="rounded-lg bg-muted p-2"><p className="text-xs">{m}</p><b>{cop(sumaPago(ventas, m))}</b></div>)}
        </div>
        <p className="flex justify-between text-sm"><span>Gastos del turno</span><b>-{cop(totalGastos)}</b></p>
        <p className="flex justify-between text-lg font-extrabold"><span>Efectivo esperado en caja</span><span>{cop(esperado)}</span></p>
        <label className="block text-sm">Efectivo contado
          <input value={conteo} onChange={(e) => setConteo(e.target.value.replace(/\D/g, ""))} disabled={cerrado} inputMode="numeric" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </label>
        {dif !== null && <p className={"text-sm font-bold " + (dif === 0 ? "" : "text-destructive")}>{dif === 0 ? "Caja cuadrada" : dif > 0 ? `Sobrante de ${cop(dif)}` : `Faltante de ${cop(-dif)}`}</p>}
        <button onClick={() => setCerrado(true)} disabled={cerrado || conteo === ""} className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-50">Cerrar turno y generar arqueo</button>
        {cerrado && <p className="rounded-lg bg-muted p-2 text-xs">Arqueo guardado. Ventas del turno: {cop(ventas.reduce((s, v) => s + v.total, 0))}.</p>}
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Gastos de caja</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={g.concepto} onChange={(e) => setG({ ...g, concepto: e.target.value })} placeholder="Concepto" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base" />
          <input value={g.valor} onChange={(e) => setG({ ...g, valor: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Valor" className="rounded-lg border border-border bg-background px-3 py-2 text-base sm:w-32" />
          <button onClick={agregar} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Anotar</button>
        </div>
        <ul className="divide-y divide-border text-sm">
          {gastos.map((x) => <li key={x.id} className="flex justify-between py-2"><span>{x.concepto}</span><b>{cop(x.valor)}</b></li>)}
        </ul>
      </section>
    </div>
  );
}

function Ventas({ ventas }: { ventas: Venta[] }) {
  const [f, setF] = useState("Todos");
  const lista = ventas.filter((v) => f === "Todos" || v.pago === f);
  const total = lista.reduce((s, v) => s + v.total, 0);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tarjeta titulo="Ventas registradas" valor={String(lista.length)} />
        <Tarjeta titulo="Total vendido" valor={cop(total)} />
        <Tarjeta titulo="Ticket promedio" valor={cop(lista.length ? total / lista.length : 0)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {["Todos", "Efectivo", "Nequi", "Datáfono", "Transferencia"].map((m) => (
          <button key={m} onClick={() => setF(m)} className={"rounded-full px-3 py-1 text-xs font-semibold " + (f === m ? "bg-primary text-primary-foreground" : "bg-muted")}>{m}</button>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-2">Hora</th><th className="p-2">Detalle</th><th className="p-2">Tipo</th><th className="p-2">Pago</th><th className="p-2 text-right">Total</th></tr></thead>
          <tbody>
            {lista.map((v) => (
              <tr key={v.id} className="border-t border-border"><td className="p-2">{v.hora}</td><td className="p-2">{v.detalle}</td><td className="p-2">{v.tipo}</td><td className="p-2">{v.pago}</td><td className="p-2 text-right font-semibold">{cop(v.total)}</td></tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Sin ventas con este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Finanzas({ sector, ventas, gastos, setGastos }: { sector: Sector; ventas: Venta[]; gastos: Gasto[]; setGastos: React.Dispatch<React.SetStateAction<Gasto[]>> }) {
  const [g, setG] = useState({ concepto: "", valor: "" });
  const ingresos = ventas.reduce((s, v) => s + (v.total - v.envio), 0);
  const costo = Math.round(ingresos * ESCENARIOS[sector].costoPct);
  const totalGastos = gastos.reduce((s, x) => s + x.valor, 0);
  const utilidad = ingresos - costo - totalGastos;
  const tasa = sector === "rest" ? 0.08 : 0.19;
  const baseGrav = ingresos / (1 + tasa);
  const iva = ingresos - baseGrav;
  const agregar = () => {
    const valor = Number(g.valor);
    if (!g.concepto.trim() || !valor) return;
    setGastos((a) => [{ id: "g" + Date.now(), concepto: g.concepto.trim().slice(0, 50), valor }, ...a]);
    setG({ concepto: "", valor: "" });
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Ingresos" valor={cop(ingresos)} sub={`${ventas.length} ventas`} />
        <Tarjeta titulo="Costo de ventas" valor={cop(costo)} sub={`${Math.round(ESCENARIOS[sector].costoPct * 100)} % estimado`} />
        <Tarjeta titulo="Gastos" valor={cop(totalGastos)} sub={`${gastos.length} registros`} />
        <Tarjeta titulo="Utilidad neta" valor={cop(utilidad)} sub={utilidad >= 0 ? "Vas en ganancia" : "Vas en pérdida"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold">Contabilidad automática</h3>
          <p className="text-xs text-muted-foreground">{sector === "rest" ? "Impoconsumo 8 %" : "IVA 19 %"} incluido en las ventas: {cop(iva)}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead className="bg-muted text-left"><tr><th className="p-2">Cuenta</th><th className="p-2 text-right">Débito</th><th className="p-2 text-right">Crédito</th></tr></thead>
              <tbody>
                {ventas.slice(0, 4).flatMap((v) => {
                  const b = (v.total - v.envio) / (1 + tasa);
                  return [
                    <tr key={v.id + "d"} className="border-t border-border"><td className="p-2">{v.pago === "Efectivo" ? "1105 Caja" : "1110 Bancos"} · {v.hora}</td><td className="p-2 text-right">{cop(v.total - v.envio)}</td><td className="p-2" /></tr>,
                    <tr key={v.id + "c"} className="border-t border-border"><td className="p-2 pl-5">4135 Ingresos por ventas</td><td className="p-2" /><td className="p-2 text-right">{cop(b)}</td></tr>,
                    <tr key={v.id + "i"} className="border-t border-border"><td className="p-2 pl-5">2408 {sector === "rest" ? "Impoconsumo" : "IVA generado"}</td><td className="p-2" /><td className="p-2 text-right">{cop(v.total - v.envio - b)}</td></tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold">Registrar gasto</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={g.concepto} onChange={(e) => setG({ ...g, concepto: e.target.value })} placeholder="Concepto" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base" />
            <input value={g.valor} onChange={(e) => setG({ ...g, valor: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Valor" className="rounded-lg border border-border bg-background px-3 py-2 text-base sm:w-32" />
            <button onClick={agregar} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Anotar</button>
          </div>
          <ul className="divide-y divide-border text-sm">
            {gastos.map((x) => <li key={x.id} className="flex justify-between py-2"><span>{x.concepto}</span><b>{cop(x.valor)}</b></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ───────────── Inventario (comercio) ───────────── */

function InventarioComercio({ productos, setProductos, setGastos }: {
  productos: Prod[]; setProductos: React.Dispatch<React.SetStateAction<Prod[]>>; setGastos: React.Dispatch<React.SetStateAction<Gasto[]>>;
}) {
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "" });
  const [aviso, setAviso] = useState("");
  const bajos = productos.filter((p) => p.stock <= p.minimo);
  const reponer = (ids: string[]) => {
    const sel = productos.filter((p) => ids.includes(p.id));
    if (!sel.length) return;
    const costo = sel.reduce((s, p) => s + p.costo * Math.max(p.minimo * 3, 10), 0);
    setProductos((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, stock: p.stock + Math.max(p.minimo * 3, 10) } : p)));
    setGastos((a) => [{ id: "g" + Date.now(), concepto: "Compra a proveedor (" + sel.length + " ref.)", valor: costo }, ...a]);
    setAviso(`Orden de compra enviada al proveedor por ${cop(costo)}. El stock ya se actualizó y el gasto quedó en Finanzas.`);
  };
  const crear = () => {
    const precio = Number(nuevo.precio);
    if (!nuevo.nombre.trim() || !precio) return;
    setProductos((ps) => [...ps, { id: "n" + Date.now(), nombre: nuevo.nombre.trim().slice(0, 60), precio, costo: Math.round(precio * 0.7), stock: 10, ean: "77" + String(Date.now()).slice(-11), ico: "caja", minimo: 2, cat: "Otros" }]);
    setNuevo({ nombre: "", precio: "" });
  };
  return (
    <div className="space-y-4">
      {bajos.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {bajos.length} producto(s) con stock bajo: {bajos.map((b) => b.nombre).join(", ")}</span>
          <button onClick={() => reponer(bajos.map((b) => b.id))} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground">Pedir todo al proveedor</button>
        </div>
      )}
      {aviso && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{aviso}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-2">Producto</th><th className="p-2">Código EAN-13</th><th className="p-2">Costo</th><th className="p-2">Precio</th><th className="p-2">Stock</th><th className="p-2" /></tr></thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-2"><span className="flex items-center gap-2"><span className="w-10 overflow-hidden rounded"><Foto ico={p.ico} nombre={p.nombre} alto="h-8" /></span>{p.nombre}</span></td>
                <td className="p-2 font-mono text-xs">{p.ean}</td><td className="p-2">{cop(p.costo)}</td><td className="p-2">{cop(p.precio)}</td>
                <td className={"p-2 font-bold " + (p.stock <= p.minimo ? "text-destructive" : "")}>{p.stock}</td>
                <td className="p-2"><button onClick={() => reponer([p.id])} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Reponer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row">
        <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nuevo producto" className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base" />
        <input value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Precio COP" className="rounded-lg border border-border bg-card px-3 py-2 text-base sm:w-40" />
        <button onClick={crear} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Crear con EAN automático</button>
      </div>
    </div>
  );
}

/* ───────────── Concesionario ───────────── */

function InventarioAuto({ productos, onCotizar, onSeparar }: { productos: Prod[]; onCotizar: (id: string) => void; onSeparar: (id: string) => void }) {
  const [ver, setVer] = useState<Prod | null>(null);
  const [tipo, setTipo] = useState("Todos");
  const veh = productos.filter((p) => p.cat === "Vehículo");
  const lista = veh.filter((p) => tipo === "Todos" || (tipo === "Motos" ? p.ico === "moto" : p.ico === "car"));
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tarjeta titulo="Vehículos en vitrina" valor={String(veh.reduce((s, p) => s + p.stock, 0))} />
        <Tarjeta titulo="Valor del inventario" valor={cop(veh.reduce((s, p) => s + p.precio * p.stock, 0))} />
        <Tarjeta titulo="Margen potencial" valor={cop(veh.reduce((s, p) => s + (p.precio - p.costo) * p.stock, 0))} />
      </div>
      <div className="mt-4 flex gap-1">
        {["Todos", "Carros", "Motos"].map((t) => <button key={t} onClick={() => setTipo(t)} className={"rounded-full px-3 py-1 text-xs font-semibold " + (tipo === t ? "bg-primary text-primary-foreground" : "bg-muted")}>{t}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {lista.map((p) => (
          <button key={p.id} onClick={() => setVer(p)} className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary">
            <Foto ico={p.ico} nombre={p.nombre} alto="h-32" />
            <div className="p-3">
              <p className="text-sm font-semibold">{p.nombre}</p>
              <p className="font-bold text-primary">{cop(p.precio)}</p>
              <p className="text-xs text-muted-foreground">{p.stock > 0 ? `${p.stock} disponible(s)` : "Vendido / separado"}</p>
            </div>
          </button>
        ))}
      </div>
      {ver && (
        <Modal onClose={() => setVer(null)}>
          <div className="-mx-5 -mt-5 mb-3 overflow-hidden rounded-t-xl"><Foto ico={ver.ico} nombre={ver.nombre} alto="h-36" /></div>
          <h3 className="text-lg font-bold">{ver.nombre}</h3>
          <p className="text-xl font-extrabold text-primary">{cop(ver.precio)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {(ver.ficha ?? []).map(([k, v]) => <div key={k} className="rounded-lg bg-muted p-2"><dt className="text-[11px] uppercase text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            <div className="rounded-lg bg-muted p-2"><dt className="text-[11px] uppercase text-muted-foreground">Costo de compra</dt><dd className="font-semibold">{cop(ver.costo)}</dd></div>
            <div className="rounded-lg bg-muted p-2"><dt className="text-[11px] uppercase text-muted-foreground">Utilidad</dt><dd className="font-semibold">{cop(ver.precio - ver.costo)}</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button onClick={() => onCotizar(ver.id)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Cotizar</button>
            <button disabled={ver.stock <= 0} onClick={() => onSeparar(ver.id)} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50">Separar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CotizadorAuto({ productos, vehSel, setVehSel, onSeparar }: { productos: Prod[]; vehSel: string; setVehSel: (id: string) => void; onSeparar: (id: string) => void }) {
  const v = productos.find((p) => p.id === vehSel) ?? productos[0];
  const [inicialPct, setInicialPct] = useState(30);
  const [plazo, setPlazo] = useState(60);
  const [tasa, setTasa] = useState(1.6);
  const [cliente, setCliente] = useState("");
  const [guardadas, setGuardadas] = useState<{ id: string; cliente: string; veh: string; cuota: number; plazo: number; enviada: boolean }[]>([]);
  if (!v) return null;
  const tramites = Math.round(v.precio * 0.02);
  const inicial = Math.round((v.precio * inicialPct) / 100);
  const financiado = v.precio - inicial;
  const cuota = cuotaMensual(financiado, tasa, plazo);
  const guardar = () => setGuardadas((a) => [{ id: "c" + Date.now(), cliente: cliente.trim() || "Cliente sin nombre", veh: v.nombre, cuota, plazo, enviada: false }, ...a]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <label className="block text-sm font-semibold">Vehículo
          <select value={v.id} onChange={(e) => setVehSel(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base">
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {cop(p.precio)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Cuota inicial: {inicialPct} % ({cop(inicial)})
          <input type="range" min={10} max={60} step={5} value={inicialPct} onChange={(e) => setInicialPct(Number(e.target.value))} className="mt-1 w-full" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">Plazo
            <select value={plazo} onChange={(e) => setPlazo(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base">
              {[24, 36, 48, 60, 72].map((m) => <option key={m} value={m}>{m} meses</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">Tasa mensual %
            <input value={tasa} onChange={(e) => setTasa(Math.min(5, Math.max(0, Number(e.target.value) || 0)))} inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
          </label>
        </div>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold">Resumen de la cotización</h3>
        <p className="flex justify-between text-sm"><span>Precio del vehículo</span><b>{cop(v.precio)}</b></p>
        <p className="flex justify-between text-sm"><span>Cuota inicial</span><b>{cop(inicial)}</b></p>
        <p className="flex justify-between text-sm"><span>Valor a financiar</span><b>{cop(financiado)}</b></p>
        <p className="flex justify-between text-sm"><span>Matrícula y trámites (2 %)</span><b>{cop(tramites)}</b></p>
        <p className="flex justify-between rounded-lg bg-primary px-3 py-2 text-lg font-extrabold text-primary-foreground"><span>Cuota mensual</span><span>{cop(cuota)}</span></p>
        <p className="text-xs text-muted-foreground">Total a pagar al banco en {plazo} meses: {cop(cuota * plazo)}</p>
        <div className="flex gap-2">
          <button onClick={guardar} className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground">Guardar cotización</button>
          <button onClick={() => onSeparar(v.id)} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-accent-foreground">Pasar a separación</button>
        </div>
        {guardadas.length > 0 && (
          <ul className="divide-y divide-border border-t border-border text-sm">
            {guardadas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">{c.cliente} · {c.veh}<span className="block text-xs text-muted-foreground">{cop(c.cuota)} x {c.plazo} meses</span></span>
                <button onClick={() => setGuardadas((a) => a.map((x) => (x.id === c.id ? { ...x, enviada: true } : x)))} disabled={c.enviada} className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-60">{c.enviada ? "Enviada" : "Enviar por WhatsApp"}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ETAPAS_VENTA = ["Separado", "Crédito aprobado", "Documentos", "Facturado", "Entregado"];
const DOCS = ["Cédula", "Certificado laboral", "Contrato de venta", "Seguro SOAT"];
type Negocio = { id: string; cliente: string; vehId: string; abono: number; etapa: number; docs: boolean[] };

function CierreAuto({ productos, setProductos, vehSel, registrarVenta }: {
  productos: Prod[]; setProductos: React.Dispatch<React.SetStateAction<Prod[]>>; vehSel: string; registrarVenta: (v: NuevaVenta) => void;
}) {
  const veh = productos.filter((p) => p.cat === "Vehículo");
  const [lista, setLista] = useState<Negocio[]>([{ id: "n0", cliente: "Marcela Torres", vehId: "a1", abono: 1500000, etapa: 0, docs: [false, false, false, false] }]);
  const [cliente, setCliente] = useState("");
  const [vId, setVId] = useState(vehSel);
  const [abono, setAbono] = useState("2000000");
  const [error, setError] = useState("");
  const nombreDe = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "Vehículo";

  const crear = () => {
    const v = veh.find((p) => p.id === vId);
    if (!cliente.trim() || !Number(abono)) { setError("Escribe el nombre del cliente y el abono."); return; }
    if (!v || v.stock <= 0) { setError("Ese vehículo ya no está disponible."); return; }
    setError("");
    setLista((a) => [{ id: "n" + Date.now(), cliente: cliente.trim().slice(0, 40), vehId: v.id, abono: Number(abono), etapa: 0, docs: [false, false, false, false] }, ...a]);
    setProductos((ps) => ps.map((p) => (p.id === v.id ? { ...p, stock: p.stock - 1 } : p)));
    setCliente("");
  };
  const avanzar = (n: Negocio) => {
    const sig = n.etapa + 1;
    if (sig >= ETAPAS_VENTA.length) return;
    if (ETAPAS_VENTA[n.etapa] === "Documentos" && n.docs.some((d) => !d)) { setError("Completa la lista de documentos antes de facturar."); return; }
    setError("");
    if (ETAPAS_VENTA[sig] === "Entregado") {
      const v = productos.find((p) => p.id === n.vehId);
      if (v) registrarVenta({ detalle: `${v.nombre} · entrega a ${n.cliente}`, total: v.precio, pago: "Transferencia", tipo: "Vehículo", envio: 0 });
    }
    setLista((a) => a.map((x) => (x.id === n.id ? { ...x, etapa: sig } : x)));
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 lg:flex-row">
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base" />
        <select value={vId} onChange={(e) => setVId(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-base">
          {veh.map((p) => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.nombre}{p.stock <= 0 ? " (no disponible)" : ""}</option>)}
        </select>
        <input value={abono} onChange={(e) => setAbono(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Abono de separación" className="rounded-lg border border-border bg-card px-3 py-2 text-base lg:w-48" />
        <button onClick={crear} className="inline-flex items-center justify-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"><Handshake className="h-4 w-4" /> Separar vehículo</button>
      </section>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <div className="space-y-3">
        {lista.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-card p-4">
            <p className="font-bold">{n.cliente} · {nombreDe(n.vehId)}</p>
            <p className="text-xs text-muted-foreground">Abono de separación: {cop(n.abono)} · Asesor: Carlos Mejía · Comisión estimada {cop((productos.find((p) => p.id === n.vehId)?.precio ?? 0) * 0.015)}</p>
            <ol className="mt-3 flex flex-wrap gap-1">
              {ETAPAS_VENTA.map((e, i) => <li key={e} className={"rounded-full px-3 py-1 text-xs font-semibold " + (i <= n.etapa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}. {e}</li>)}
            </ol>
            {ETAPAS_VENTA[n.etapa] === "Documentos" && (
              <div className="mt-3 grid gap-1 sm:grid-cols-2">
                {DOCS.map((d, i) => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={n.docs[i]} onChange={() => setLista((a) => a.map((x) => (x.id === n.id ? { ...x, docs: x.docs.map((v, j) => (j === i ? !v : v)) } : x)))} className="h-4 w-4" /> {d}
                  </label>
                ))}
              </div>
            )}
            <div className="mt-3">
              {n.etapa < ETAPAS_VENTA.length - 1
                ? <button onClick={() => avanzar(n)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Avanzar a «{ETAPAS_VENTA[n.etapa + 1]}»</button>
                : <span className="inline-flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="h-4 w-4" /> Vehículo entregado: la venta ya está en Finanzas</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ESTADOS_TALLER = ["Recibido", "En reparación", "Listo", "Entregado"];
type Orden = { id: string; placa: string; cliente: string; servicio: string; valor: number; estado: string };

function Taller({ registrarVenta }: { registrarVenta: (v: NuevaVenta) => void }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([
    { id: "OT-21", placa: "KLM 482", cliente: "Julián Vega", servicio: "Pastillas y frenos", valor: 260000, estado: "En reparación" },
    { id: "OT-22", placa: "XTZ 34D", cliente: "Paola Marín", servicio: "Cambio de aceite y filtro", valor: 120000, estado: "Recibido" },
  ]);
  const [f, setF] = useState({ placa: "", cliente: "", servicio: SERVICIOS_TALLER[0].n });
  const crear = () => {
    if (!f.placa.trim() || !f.cliente.trim()) return;
    const s = SERVICIOS_TALLER.find((x) => x.n === f.servicio) ?? SERVICIOS_TALLER[0];
    setOrdenes((a) => [{ id: "OT-" + (23 + a.length), placa: f.placa.trim().toUpperCase().slice(0, 8), cliente: f.cliente.trim().slice(0, 40), servicio: s.n, valor: s.v, estado: "Recibido" }, ...a]);
    setF({ placa: "", cliente: "", servicio: SERVICIOS_TALLER[0].n });
  };
  const avanzar = (o: Orden) => {
    const sig = ESTADOS_TALLER[ESTADOS_TALLER.indexOf(o.estado) + 1];
    if (!sig) return;
    if (sig === "Entregado") registrarVenta({ detalle: `${o.servicio} · ${o.placa}`, total: o.valor, pago: "Datáfono", tipo: "Taller", envio: 0 });
    setOrdenes((a) => a.map((x) => (x.id === o.id ? { ...x, estado: sig } : x)));
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 lg:flex-row">
        <input value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} placeholder="Placa" className="rounded-lg border border-border bg-card px-3 py-2 text-base lg:w-32" />
        <input value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} placeholder="Cliente" className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base" />
        <select value={f.servicio} onChange={(e) => setF({ ...f, servicio: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-base">
          {SERVICIOS_TALLER.map((s) => <option key={s.n} value={s.n}>{s.n} · {cop(s.v)}</option>)}
        </select>
        <button onClick={crear} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Recibir vehículo</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ordenes.map((o) => {
          const sig = ESTADOS_TALLER[ESTADOS_TALLER.indexOf(o.estado) + 1];
          return (
            <div key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between"><p className="font-bold">{o.id} · {o.placa}</p><span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{o.estado}</span></div>
              <p className="text-sm">{o.servicio} · {cop(o.valor)}</p>
              <p className="text-xs text-muted-foreground">Cliente: {o.cliente}</p>
              <div className="mt-2">
                {sig ? <button onClick={() => avanzar(o)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">{sig === "Entregado" ? "Cobrar y entregar" : `Pasar a «${sig}»`}</button>
                  : <span className="inline-flex items-center gap-1 text-xs font-bold"><CheckCircle2 className="h-4 w-4" /> Cobrado y entregado</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── WhatsApp IA ───────────── */

type Mensaje = { de: "bot" | "cli"; texto: string };
type Evento = { tipo: "lead" | "pedido" | "pqrs" | "cita" | "humano"; texto: string };
const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const STOP = ["con", "del", "los", "las", "gris", "blanca", "blanco"];

function WhatsApp({ sector, productos, tarifas, onLead, onPedido, onPqrs }: {
  sector: Sector; productos: Prod[]; tarifas: Tarifas; onLead: (p: Prospecto) => void; onPedido: (p: Pedido) => void; onPqrs: () => void;
}) {
  const esc = ESCENARIOS[sector];
  const [msgs, setMsgs] = useState<Mensaje[]>([{ de: "bot", texto: `Hola, soy el asistente virtual de ${esc.negocio}. ¿En qué te puedo ayudar?` }]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement | null>(null);
  const pendiente = useRef<{ p: Prod; c: number } | null>(null);
  const contador = useRef(0);
  const leadId = useRef("w" + Date.now());
  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs]);

  const buscarProd = (m: string): Prod | null => {
    let mejor: Prod | null = null; let puntos = 0;
    for (const p of productos) {
      const tokens = norm(p.nombre).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.includes(w));
      const s = tokens.filter((w) => m.includes(w)).length;
      if (s > puntos) { puntos = s; mejor = p; }
    }
    if (!mejor && sector === "auto") {
      if (/\bcx\b|cx-?30|suv/.test(m)) return productos.find((p) => p.id === "a2") ?? null;
      if (/\bns\b|moto/.test(m)) return productos.find((p) => p.id === "a3") ?? null;
      if (/xtz/.test(m)) return productos.find((p) => p.id === "a4") ?? null;
      if (/carro|auto|vehiculo/.test(m)) return productos.find((p) => p.id === "a1") ?? null;
    }
    return mejor;
  };
  const barrioDe = (m: string): string | null => Object.keys(tarifas).find((b) => m.includes(norm(b))) ?? null;
  const cantidadDe = (m: string): number => {
    const d = m.match(/\b(\d{1,2})\b/);
    if (d && Number(d[1]) <= 20 && Number(d[1]) > 0) return Number(d[1]);
    for (const w of m.split(/\s+/)) if (NUMEROS[w]) return NUMEROS[w];
    return 1;
  };

  const crearPedido = (p: Prod, c: number, barrio: string | null): string => {
    const envio = barrio ? tarifas[barrio] ?? 0 : 0;
    const total = p.precio * c + envio;
    onPedido({ id: "P" + String(Date.now()).slice(-4), cliente: "Cliente de WhatsApp", canal: "WhatsApp", barrio: barrio ?? "Recoger en local", direccion: barrio ? "Dirección por confirmar" : "", envio, items: `${c} x ${p.nombre}`, total, estado: "Nuevo", repartidor: "", cobrado: false });
    setEventos((a) => [{ tipo: "pedido", texto: `Pedido creado: ${c} x ${p.nombre} · ${barrio ? `domicilio a ${barrio}` : "recoger"} · ${cop(total)}. Ya aparece en ${sector === "rest" ? "Domicilios" : "Pedidos y envíos"}.` }, ...a]);
    return barrio
      ? `Listo, anoté ${c} x ${p.nombre} para ${barrio}. Producto ${cop(p.precio * c)} + envío ${cop(envio)} = ${cop(total)}. Pagas al recibir (efectivo o Nequi). Te avisamos cuando salga el repartidor.`
      : `Listo, quedó el pedido de ${c} x ${p.nombre} para recoger en el local por ${cop(total)}. Te esperamos.`;
  };

  const responder = (limpio: string): string => {
    const m = norm(limpio);
    const prod = buscarProd(m);
    const barrio = barrioDe(m);
    const pregunta = pendiente.current;

    if (/reclamo|queja|mal estado|demora|tard|molest/.test(m)) {
      onPqrs();
      const n = "PQ-" + Math.floor(1000 + Math.random() * 9000);
      setEventos((a) => [{ tipo: "pqrs", texto: `PQRS ${n} radicada y asignada a un asesor humano.` }, ...a]);
      return `Lamento mucho lo ocurrido. Radiqué tu solicitud con el número ${n} y una persona del equipo te contacta hoy. ¿Me cuentas qué pasó para adelantar la revisión?`;
    }
    if (pregunta && (barrio || /recog|local|voy|paso por/.test(m))) {
      pendiente.current = null;
      return crearPedido(pregunta.p, pregunta.c, barrio);
    }
    if (/gracias|chao|hasta luego|perfecto|listo/.test(m) && m.length < 30) return "Con mucho gusto. Aquí estoy cuando me necesites.";
    if (/^(hola|buenas|buenos dias|buen dia|buenas tardes|hey)\b/.test(m) && m.length < 25) return `Hola, bienvenido a ${esc.negocio}. Puedo darte precios, disponibilidad${sector === "auto" ? ", financiación y citas de taller" : ", tarifas de envío y tomar tu pedido"}. ¿Qué necesitas?`;
    if (/horario|hora|abren|cierran|atienden|abierto/.test(m)) return sector === "auto" ? "Atendemos de lunes a sábado de 8:00 a. m. a 6:00 p. m. y domingos de 9:00 a. m. a 1:00 p. m. con cita previa." : sector === "rest" ? "Abrimos todos los días de 11:00 a. m. a 10:00 p. m. Los domicilios se reciben hasta las 9:30 p. m." : "Atendemos de lunes a sábado de 7:00 a. m. a 7:00 p. m. y domingos hasta las 2:00 p. m.";
    if (/donde|direccion|ubicad|queda|sede/.test(m)) return `Estamos en la Calle 10 #43-25, Medellín. ${sector === "auto" ? "Tenemos parqueadero para clientes." : "Puedes recoger tu pedido sin fila."}`;
    if (/medios de pago|como pago|nequi|tarjeta|efectivo|transferencia|datafono|pago/.test(m)) return `Aceptamos efectivo, Nequi, tarjeta débito y crédito${sector === "auto" ? ", transferencia y crédito con las principales entidades financieras" : ""}.`;

    if (sector === "auto") {
      if (/financ|credito|cuota|inicial|plazo|meses/.test(m)) {
        const v = prod ?? productos[0];
        const cuota = cuotaMensual(v.precio * 0.7, 1.6, 60);
        setEventos((a) => [{ tipo: "lead", texto: `Interesado en financiación de ${v.nombre}. Nuevo prospecto en el CRM.` }, ...a]);
        onLead({ id: leadId.current, nombre: "Cliente WhatsApp", interes: `Financiar ${v.nombre}`, nivel: "CALIENTE", etapa: "Nuevo" });
        return `Para el ${v.nombre} (${cop(v.precio)}) con 30 % de inicial (${cop(v.precio * 0.3)}) a 60 meses la cuota queda cerca de ${cop(cuota)} al mes. La tasa final depende del estudio de crédito. ¿Quieres que un asesor te lo prepare con tus datos?`;
      }
      if (/retoma|permuta|recib\w* mi|cambio mi|vender mi/.test(m)) {
        setEventos((a) => [{ tipo: "cita", texto: "Solicitud de retoma: se pidió avalúo del vehículo del cliente." }, ...a]);
        return "Sí recibimos tu vehículo como parte de pago. Hacemos el avalúo en 30 minutos con peritaje. ¿Me das marca, modelo, año y kilometraje para dejar la cita lista?";
      }
      if (/test drive|probar|manejar|conocer|ver el|visita/.test(m)) {
        setEventos((a) => [{ tipo: "cita", texto: "Cita de prueba de manejo solicitada." }, { tipo: "lead", texto: "Prospecto caliente agregado al CRM." }, ...a]);
        onLead({ id: leadId.current, nombre: "Cliente WhatsApp", interes: `Prueba de manejo ${(prod ?? productos[0]).nombre}`, nivel: "CALIENTE", etapa: "Nuevo" });
        return `Claro, agendemos tu prueba de manejo${prod ? ` del ${prod.nombre}` : ""}. Tengo espacio mañana a las 10:00 a. m. o a las 4:00 p. m. ¿Cuál te sirve?`;
      }
      if (/taller|cita|revision|aceite|freno|alinea|mecanic|mantenimiento/.test(m)) {
        setEventos((a) => [{ tipo: "cita", texto: "Cita de taller solicitada por WhatsApp." }, ...a]);
        return "En el taller hacemos alineación (desde $90.000), cambio de aceite ($120.000) y revisión completa ($180.000). Tengo cupo mañana a las 8:00 a. m. ¿Me das la placa para reservar?";
      }
      if (/garantia/.test(m)) return "Los vehículos usados llevan garantía de 3 meses o 5.000 km en motor y caja, y los nuevos la del fabricante.";
      if (prod) {
        setEventos((a) => [{ tipo: "lead", texto: `Consulta por ${prod.nombre}. Prospecto registrado en el CRM.` }, ...a]);
        onLead({ id: leadId.current, nombre: "Cliente WhatsApp", interes: prod.nombre, nivel: /quiero|cotiz|compr|disponible/.test(m) ? "CALIENTE" : "TIBIO", etapa: "Nuevo" });
        return `El ${prod.nombre} está disponible (${prod.stock > 0 ? `${prod.stock} en vitrina` : "agotado por ahora"}) en ${cop(prod.precio)}. ${prod.ficha ? `Tiene ${prod.ficha[1][1]} y ${prod.ficha[2][1].toLowerCase()}. ` : ""}¿Te lo cotizo con financiación o prefieres venir a verlo?`;
      }
    } else {
      if (/domicilio|envio|enviar|llevan|mandan|cuanto cuesta el/.test(m) && !/pedir|quiero/.test(m) || (barrio && /envio|domicilio|llega/.test(m))) {
        if (barrio) return `El envío a ${barrio} cuesta ${cop(tarifas[barrio])}. ${prod ? `¿Te anoto ${prod.nombre}?` : "¿Qué te gustaría pedir?"}`;
        return "Hacemos domicilios a: " + Object.entries(tarifas).map(([b, v]) => `${b} (${cop(v)})`).join(", ") + ". ¿A qué barrio sería?";
      }
      if (prod && /pedir|quiero|ordenar|comprar|llevar|necesito|dame|me das|anota/.test(m)) {
        const c = cantidadDe(m);
        if (c > prod.stock) return `Solo me quedan ${prod.stock} de ${prod.nombre}. ¿Te sirve esa cantidad?`;
        if (barrio || /recog/.test(m)) { pendiente.current = null; return crearPedido(prod, c, barrio); }
        pendiente.current = { p: prod, c };
        return `Perfecto, ${c} x ${prod.nombre} (${cop(prod.precio * c)}). ¿Lo enviamos a domicilio? Dime tu barrio (${Object.keys(tarifas).join(", ")}) o escribe «recoger».`;
      }
      if (/combo|promo|carta|menu|catalogo|que tienen|que venden|que hay/.test(m) && !prod) return "Esto es lo que tengo hoy: " + productos.slice(0, 5).map((p) => `${p.nombre} (${cop(p.precio)})`).join(", ") + ". ¿Cuál te antoja?";
      if (prod) {
        const extra = sector === "rest" ? " Puedes agregarle acompañantes como papas, arroz o ensalada." : "";
        return `${prod.nombre}: ${cop(prod.precio)}. ${prod.stock > prod.minimo ? `Hay ${prod.stock} disponibles.` : prod.stock > 0 ? `Quedan pocas unidades (${prod.stock}).` : "Se agotó por hoy."}${extra} ¿Te lo anoto?`;
      }
    }

    contador.current += 1;
    setEventos((a) => [{ tipo: "humano", texto: `Consulta sin respuesta automática: «${limpio.slice(0, 50)}». Se avisó a un asesor humano.` }, ...a]);
    const variantes = [
      `Gracias por escribir. Sobre «${limpio.slice(0, 40)}» no tengo el dato exacto y prefiero no inventarte nada: ya le avisé a una persona del equipo para que te responda hoy. Mientras tanto te ayudo con ${sector === "auto" ? "precios, financiación o citas de taller" : "precios, envíos o tu pedido"}.`,
      "Esa consulta necesita revisión de alguien del equipo; ya quedó anotada y te escriben en breve. Si quieres, avanzamos con otra cosa mientras tanto.",
      "Para darte una respuesta exacta sobre eso lo confirmo con el equipo y te cuentan por este mismo chat. ¿Algo más en lo que te pueda ayudar ahora?",
    ];
    return variantes[(contador.current - 1) % variantes.length];
  };

  const enviar = (t: string) => {
    const limpio = t.trim().slice(0, 300);
    if (!limpio) return;
    setMsgs((a) => [...a, { de: "cli", texto: limpio }]);
    setTexto("");
    setTimeout(() => {
      const r = responder(limpio);
      setMsgs((a) => [...a, { de: "bot", texto: r }]);
    }, 500);
  };

  const iconoEvento = (t: Evento["tipo"]) => (t === "pedido" ? Truck : t === "lead" ? Kanban : t === "cita" ? FileText : t === "pqrs" ? AlertTriangle : UserRound);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="rounded-3xl border-4 border-foreground/80 bg-card p-3">
        <p className="rounded-t-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">{esc.negocio} · WhatsApp</p>
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
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe cualquier pregunta" maxLength={300} className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-base" />
          <button className="rounded-full bg-primary px-4 text-primary-foreground" aria-label="Enviar"><Send className="h-4 w-4" /></button>
        </form>
      </div>
      <aside className="h-fit rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 font-bold"><Bot className="h-4 w-4" /> Lo que ve tu equipo (el cliente no lo ve)</h3>
        <p className="text-xs text-muted-foreground">Cada conversación se convierte en acciones dentro del sistema.</p>
        <ul className="mt-3 space-y-2">
          {eventos.length === 0 && <li className="text-sm text-muted-foreground">Escribe un mensaje y aquí aparecerá lo que el sistema registra por ti.</li>}
          {eventos.map((e, i) => {
            const I = iconoEvento(e.tipo);
            return <li key={i} className="flex items-start gap-2 rounded-lg bg-muted p-2 text-sm"><I className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-words">{e.texto}</span></li>;
          })}
        </ul>
      </aside>
    </div>
  );
}

/* ───────────── CRM y nómina ───────────── */

const ETAPAS: Prospecto["etapa"][] = ["Nuevo", "Contactado", "Prueba de manejo", "Cotizado", "Negociando", "Cerrado"];
const ORIGENES = ["WhatsApp", "Facebook", "Instagram", "Referido", "Vitrina", "Página web"];

function Crm({ prospectos, setProspectos, pqrs, vehiculos }: {
  prospectos: Prospecto[]; setProspectos: React.Dispatch<React.SetStateAction<Prospecto[]>>; pqrs: number; vehiculos: Prod[];
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("Todos");
  const [f, setF] = useState({ nombre: "", telefono: "", veh: vehiculos[0]?.id ?? "", origen: ORIGENES[0] });
  const mover = (id: string, etapa: Prospecto["etapa"]) => setProspectos((a) => a.map((p) => (p.id === id ? { ...p, etapa } : p)));
  const editar = (id: string, cambio: Partial<Prospecto>) => setProspectos((a) => a.map((p) => (p.id === id ? { ...p, ...cambio } : p)));
  const crear = () => {
    const v = vehiculos.find((x) => x.id === f.veh);
    if (!f.nombre.trim() || !v) return;
    setProspectos((a) => [{ id: "m" + Date.now(), nombre: f.nombre.trim().slice(0, 40), interes: v.nombre, nivel: "TIBIO", etapa: "Nuevo", telefono: f.telefono.trim().slice(0, 20), origen: f.origen, valor: v.precio, proximo: "Primer contacto", notas: "" }, ...a]);
    setF({ ...f, nombre: "", telefono: "" });
  };
  const visibles = prospectos.filter((p) => filtro === "Todos" || p.nivel === filtro);
  const abiertos = prospectos.filter((p) => p.etapa !== "Cerrado");
  const cerrados = prospectos.filter((p) => p.etapa === "Cerrado").length;
  const enJuego = abiertos.reduce((s, p) => s + (p.valor ?? 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Prospectos activos" valor={String(abiertos.length)} sub={`${prospectos.filter((p) => p.nivel === "CALIENTE").length} calientes`} />
        <Tarjeta titulo="Valor en negociación" valor={cop(enJuego)} />
        <Tarjeta titulo="Ventas cerradas" valor={String(cerrados)} sub={`${prospectos.length ? Math.round((cerrados / prospectos.length) * 100) : 0} % de conversión`} />
        <Tarjeta titulo="PQRS radicadas" valor={String(pqrs)} />
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 lg:flex-row">
        <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre del prospecto" className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base" />
        <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value.replace(/[^\d ]/g, "") })} inputMode="tel" placeholder="Teléfono" className="rounded-lg border border-border bg-card px-3 py-2 text-base lg:w-36" />
        <select value={f.veh} onChange={(e) => setF({ ...f, veh: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-base">
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <select value={f.origen} onChange={(e) => setF({ ...f, origen: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-base">
          {ORIGENES.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button onClick={crear} className="inline-flex items-center justify-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"><Plus className="h-4 w-4" /> Agregar prospecto</button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {["Todos", "CALIENTE", "TIBIO", "FRIO"].map((n) => (
          <button key={n} onClick={() => setFiltro(n)} className={"rounded-full px-3 py-1 text-xs font-semibold " + (filtro === n ? "bg-primary text-primary-foreground" : "bg-muted")}>{n === "Todos" ? "Todos" : n.charAt(0) + n.slice(1).toLowerCase()}</button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Arrastra las tarjetas entre etapas o usa el selector.</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1100px] grid-cols-6 gap-3">
          {ETAPAS.map((e) => (
            <div key={e} onDragOver={(ev) => ev.preventDefault()} onDrop={() => { if (arrastrando) mover(arrastrando, e); setArrastrando(null); }} className="min-h-40 rounded-xl border border-border bg-muted/40 p-2">
              <p className="mb-2 flex justify-between text-xs font-bold uppercase"><span>{e}</span><span>{visibles.filter((p) => p.etapa === e).length}</span></p>
              <div className="space-y-2">
                {visibles.filter((p) => p.etapa === e).map((p) => (
                  <div key={p.id} draggable onDragStart={() => setArrastrando(p.id)} className="cursor-grab space-y-1 rounded-lg border border-border bg-card p-2 text-sm">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold">{p.nombre}</p>
                      <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold " + (p.nivel === "CALIENTE" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground")}>{p.nivel}</span>
                    </div>
                    <p className="break-words text-xs">{p.interes}{p.valor ? ` · ${cop(p.valor)}` : ""}</p>
                    <p className="text-[11px] text-muted-foreground">{p.telefono || "Sin teléfono"} · {p.origen ?? "Sin origen"}</p>
                    <input value={p.proximo ?? ""} onChange={(ev) => editar(p.id, { proximo: ev.target.value.slice(0, 60) })} placeholder="Próxima acción" className="w-full rounded border border-border bg-background px-2 py-1 text-base" />
                    <input value={p.notas ?? ""} onChange={(ev) => editar(p.id, { notas: ev.target.value.slice(0, 120) })} placeholder="Notas" className="w-full rounded border border-border bg-background px-2 py-1 text-base" />
                    <div className="flex gap-1">
                      <select value={p.nivel} onChange={(ev) => editar(p.id, { nivel: ev.target.value as Prospecto["nivel"] })} className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-1 text-base">
                        <option value="CALIENTE">Caliente</option><option value="TIBIO">Tibio</option><option value="FRIO">Frío</option>
                      </select>
                      <select value={p.etapa} onChange={(ev) => mover(p.id, ev.target.value as Prospecto["etapa"])} className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-1 text-base">
                        {ETAPAS.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
      <button onClick={() => setLiquidado(true)} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground">Liquidar nómina del periodo</button>
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

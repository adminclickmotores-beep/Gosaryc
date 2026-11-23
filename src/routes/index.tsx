import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { motion } from "framer-motion";
import {
  UtensilsCrossed, ChefHat, Bike, Boxes, Wallet, Download, ArrowRight, Check, Users, Receipt, BarChart3,
  TrendingUp, FileText, Gift, CalendarDays, Bot, MessageCircle, Brain, Headphones, X, Search, Sun, Moon,
  Car, Calculator, ChevronDown, ShieldCheck, Smartphone, WifiOff, CheckCheck, QrCode, Wrench, BadgeCheck,
  Banknote, Radio, Mic, Languages,
} from "lucide-react";
import { useIdioma, useTx } from "@/lib/idioma";
import { SECTORES, buscarSector } from "@/lib/sectores";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Software profesional para administrar tu negocio en Colombia` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — Gestión profesional para cada tipo de negocio en Colombia` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `https://${BRAND.domain}/` },
    ],
    links: [{ rel: "canonical", href: `https://${BRAND.domain}/` }],
  }),
});

type Icono = ComponentType<{ className?: string }>;

type TextoModulo = {
  label: string; desc: string; detalle: string; beneficios: string[]; como: string;
};

type Modulo = {
  Icon: Icono;
  familia: "ventas" | "operacion" | "finanzas" | "equipo" | "cumplimiento";
  ancho?: "dian" | "nomina";
  es: TextoModulo;
  en: TextoModulo;
};

// Degradados suaves por familia (ventas, operación, finanzas, equipo, cumplimiento).
const FAMILIA: Record<Modulo["familia"], { fondo: string; texto: string }> = {
  ventas: { fondo: "linear-gradient(135deg, #10b9812e, #10b98108)", texto: "#10b981" },
  operacion: { fondo: "linear-gradient(135deg, #f59e0b2e, #f59e0b08)", texto: "#f59e0b" },
  finanzas: { fondo: "linear-gradient(135deg, #3b82f62e, #3b82f608)", texto: "#3b82f6" },
  equipo: { fondo: "linear-gradient(135deg, #8b5cf62e, #8b5cf608)", texto: "#8b5cf6" },
  cumplimiento: { fondo: "linear-gradient(135deg, #06b6d42e, #06b6d408)", texto: "#06b6d4" },
};

const MODULOS: Modulo[] = [
  {
    Icon: UtensilsCrossed, familia: "ventas",
    es: { label: "Ventas, POS y escáner de barras", desc: "Cobra en segundos con escáner de códigos de barras (cámara móvil o pistola USB/Bluetooth), imprime tirillas térmicas 58mm/80mm y genera etiquetas de barras.", detalle: "Publicas tu catálogo digital con tu marca, cobras rápido con lector de códigos de barras (cámara del celular o pistola) e imprimes tirillas térmicas 58mm/80mm y etiquetas.", beneficios: ["Escáner con cámara móvil o pistola + impresión de etiquetas", "Impresión térmica 58mm/80mm y catálogo QR con tu logo", "Cobro con todos los medios de pago y descarga al inventario"], como: "Escaneas o tocas el producto, cobras y el inventario y la tirilla salen al instante." },
    en: { label: "Sales, POS and barcode scanner", desc: "Check out in seconds with a barcode scanner (phone camera or USB/Bluetooth gun), print 58mm/80mm thermal receipts and make barcode labels.", detalle: "Publish your digital catalog with your brand, check out fast with a barcode reader (phone camera or gun) and print 58mm/80mm thermal receipts and labels.", beneficios: ["Scanner with phone camera or gun + label printing", "58mm/80mm thermal printing and QR catalog with your logo", "Checkout with every payment method and automatic stock deduction"], como: "Scan or tap the product, charge, and the inventory update and receipt print instantly." },
  },
  {
    Icon: ChefHat, familia: "operacion",
    es: { label: "Operación y comandas en vivo", desc: "Tablero en tiempo real: cada pedido avanza de principio a fin, con comanda automática en impresora de cocina 58mm/80mm y control de tiempos.", detalle: "Un tablero en tiempo real donde cada pedido avanza de principio a fin, con comanda automática a cocina y control de tiempos.", beneficios: ["Tablero: nuevos, en cocina, listos y entregados", "Comanda térmica automática 58mm/80mm al registrar el pedido", "Control de mesas y tiempos de preparación"], como: "El pedido entra y se imprime en cocina al instante; marcas cada avance con un toque." },
    en: { label: "Live operations and kitchen tickets", desc: "Real-time board: every order moves from start to finish, with automatic kitchen tickets on a 58mm/80mm printer and time tracking.", detalle: "A real-time board where each order moves from start to finish, with automatic kitchen tickets and time tracking.", beneficios: ["Board: new, in kitchen, ready and delivered", "Automatic 58mm/80mm thermal ticket when the order is saved", "Table management and preparation time control"], como: "The order arrives and prints in the kitchen instantly; you mark each step with one tap." },
  },
  {
    Icon: Receipt, familia: "cumplimiento", ancho: "dian",
    es: { label: "Facturación electrónica DIAN", desc: "Registra ingresos y egresos, gestiona saldos pendientes por cliente y emite facturas electrónicas con CUFE y código QR.", detalle: "Registras ingresos y egresos, gestionas los saldos pendientes por cliente y emites facturas electrónicas con CUFE y código QR.", beneficios: ["Factura electrónica DIAN con CUFE y QR", "Cuentas por cobrar con abonos y saldos", "Resolución, prefijo y rangos configurables"], como: "Vendes, eliges facturar y el documento sale con todos los requisitos." },
    en: { label: "DIAN electronic invoicing", desc: "Record income and expenses, manage client balances and issue electronic invoices with CUFE and QR code (Colombian DIAN).", detalle: "Record income and expenses, manage balances by client and issue electronic invoices with CUFE and QR code (Colombian DIAN).", beneficios: ["DIAN electronic invoice with CUFE and QR", "Receivables with payments and balances", "Configurable resolution, prefix and ranges"], como: "You sell, choose to invoice, and the document comes out with every requirement." },
  },
  {
    Icon: Bike, familia: "operacion",
    es: { label: "Domicilios y clientes", desc: "Rutas, tarifas por barrio, repartidores y base de clientes con historial de compras y direcciones.", detalle: "Organizas entregas con rutas, tarifas por barrio y repartidores, y guardas a cada cliente con su historial y direcciones.", beneficios: ["Tarifas de domicilio por barrio o zona", "Repartidores con liquidación de cada entrega", "Historial de cada cliente: qué pide y dónde vive"], como: "Registras el pedido con su dirección y se lo asignas al repartidor de turno." },
    en: { label: "Delivery and customers", desc: "Routes, delivery fees by neighborhood, drivers and a customer base with purchase history and addresses.", detalle: "Organize deliveries with routes, delivery fees by neighborhood and drivers, and keep each customer with their history and addresses.", beneficios: ["Delivery fees by neighborhood or zone", "Drivers with a settlement for each delivery", "History for each customer: what they order and where they live"], como: "Record the order with its address and assign it to the driver on shift." },
  },
  {
    Icon: Boxes, familia: "operacion",
    es: { label: "Inventario, recetas y costos", desc: "Existencias, costo real por plato o producto, alertas de faltantes, lotes y vencimientos. Sin hojas de cálculo.", detalle: "Controlas existencias, costo real por plato o producto, alertas de faltantes, lotes y vencimientos, sin hojas de cálculo.", beneficios: ["Costo real de cada plato con su receta", "Descuento automático al vender", "Alertas de stock bajo y productos por vencer"], como: "Cargas tus insumos una vez con su receta; cada venta descuenta sola." },
    en: { label: "Inventory, recipes and costs", desc: "Stock, real cost per dish or product, low-stock alerts, batches and expiry dates. No spreadsheets.", detalle: "Control stock, real cost per dish or product, low-stock alerts, batches and expiry dates, without spreadsheets.", beneficios: ["Real cost of each dish from its recipe", "Automatic deduction when you sell", "Low-stock alerts and products about to expire"], como: "Load your ingredients once with their recipe; every sale deducts them automatically." },
  },
  {
    Icon: Wallet, familia: "finanzas",
    es: { label: "Finanzas y rentabilidad", desc: "Caja por turnos con arqueo discriminado, cuentas por cobrar con recordatorios por WhatsApp y utilidad real del periodo.", detalle: "Llevas la caja por turnos con arqueo discriminado, las cuentas por cobrar con recordatorios por WhatsApp y la utilidad real del periodo.", beneficios: ["Cierre de caja por turno: efectivo, transferencia y tarjeta", "Cuentas por cobrar con recordatorio por WhatsApp", "Utilidad real: ventas menos costos y gastos"], como: "Abres turno, registras movimientos y cierras con el arqueo; el reporte sale solo." },
    en: { label: "Finance and profitability", desc: "Shift-based cash register with detailed count, receivables with WhatsApp reminders and real profit for the period.", detalle: "Run the cash register by shift with a detailed count, receivables with WhatsApp reminders and the real profit for the period.", beneficios: ["Shift cash close: cash, transfer and card", "Receivables with WhatsApp reminders", "Real profit: sales minus costs and expenses"], como: "Open a shift, record movements and close with the count; the report is generated automatically." },
  },
  {
    Icon: Users, familia: "equipo", ancho: "nomina",
    es: { label: "Nómina ley colombiana", desc: "Empleados, turnos y liquidación de nómina con SMMLV, auxilio, salud, pensión, primas, cesantías y PILA según la normatividad vigente.", detalle: "Registras empleados y turnos, y liquidas la nómina con SMMLV, auxilios, salud, pensión, primas, cesantías y PILA según la norma vigente.", beneficios: ["Empleados con salario y auxilios de ley", "Liquidación automática: salud, pensión, primas y cesantías", "Desprendible por WhatsApp e histórico por periodo"], como: "Registras a cada empleado una vez; cada periodo liquidas con un clic." },
    en: { label: "Payroll under Colombian law", desc: "Employees, shifts and payroll calculation with SMMLV, transport allowance, health, pension, bonuses, severance and PILA under current rules.", detalle: "Register employees and shifts, and calculate payroll with SMMLV, allowances, health, pension, bonuses, severance and PILA under current rules.", beneficios: ["Employees with salary and legal allowances", "Automatic calculation: health, pension, bonuses and severance", "Pay slip by WhatsApp and history by period"], como: "Register each employee once; each period you calculate payroll with one click." },
  },
  {
    Icon: ShieldCheck, familia: "cumplimiento",
    es: { label: "Diseñado para tu tipo de negocio", desc: "Restaurante con Rappi y sanidad, salud con RIPS y habilitación, concesionario con traspasos, tienda con código de barras, taller con órdenes: cada negocio con sus propios formularios.", detalle: "Cada negocio recibe sus propios módulos, textos y color: restaurante, salud, concesionario, tienda, taller y más de 50 tipos.", beneficios: ["Módulos exactos según tu tipo de negocio", "Textos y vocabulario de tu actividad, sin tecnicismos", "Tu color y tu logo en todo el programa"], como: "Eliges tu tipo al crear la cuenta y el programa se adapta solo." },
    en: { label: "Designed for your type of business", desc: "Restaurant with delivery apps, clinic with health records, dealership with transfers, store with barcodes, workshop with work orders: each business with its own forms.", detalle: "Each business gets its own modules, texts and color: restaurant, clinic, dealership, store, workshop and more than 50 types.", beneficios: ["Exact modules for your type of business", "Texts and vocabulary of your activity, without jargon", "Your color and your logo across the whole program"], como: "You choose your type when you create the account and the program adapts by itself." },
  },
  {
    Icon: BarChart3, familia: "finanzas",
    es: { label: "Reportes, metas e indicadores", desc: "Ventas por producto, por medio de pago, por sede y por periodo. Define metas semanales y mide el avance de cada equipo.", detalle: "Ves tus ventas por producto, medio de pago, sede y periodo, defines metas semanales y mides el avance de cada equipo.", beneficios: ["Ventas por producto, pago, sede y periodo", "Metas semanales con avance por equipo", "Exporta a Excel o imprime en PDF"], como: "Cada venta alimenta los reportes; consultas el periodo que quieras." },
    en: { label: "Reports, goals and indicators", desc: "Sales by product, payment method, branch and period. Set weekly goals and track each team's progress.", detalle: "See your sales by product, payment method, branch and period, set weekly goals and track each team's progress.", beneficios: ["Sales by product, payment, branch and period", "Weekly goals with progress by team", "Export to Excel or print to PDF"], como: "Every sale feeds the reports; you check the period you want." },
  },
  {
    Icon: FileText, familia: "ventas",
    es: { label: "Cotizaciones y documentos", desc: "Cotizaciones profesionales enviadas por WhatsApp, control de vencimientos y archivo digital de tus documentos.", detalle: "Envías cotizaciones profesionales por WhatsApp, controlas sus vencimientos y archivas tus documentos por cliente.", beneficios: ["Cotización clara con tu logo, enviada por WhatsApp", "Control de vencimientos y seguimiento", "Documentos archivados por cliente"], como: "Armas la cotización con tus productos y la envías con un toque." },
    en: { label: "Quotes and documents", desc: "Professional quotes sent by WhatsApp, expiry tracking and a digital archive for your documents.", detalle: "Send professional quotes by WhatsApp, track their expiry dates and archive your documents by client.", beneficios: ["Clear quote with your logo, sent by WhatsApp", "Expiry tracking and follow-up", "Documents archived by client"], como: "Build the quote with your products and send it with one tap." },
  },
  {
    Icon: TrendingUp, familia: "ventas",
    es: { label: "CRM, Embudo IA y Bandeja PQRS", desc: "El Agente de WhatsApp IA autoconfigurado por sector registra cada contacto en tu Kanban y cola por llegada, calificado como frío, tibio o caliente, con bandeja PQRS.", detalle: "Ves todos tus prospectos en un tablero visual, atiendes PQRS desde la misma bandeja y priorizas a los clientes más calientes calificados automáticamente por la IA.", beneficios: ["Tablero Kanban, cola por llegada y bandeja PQRS integrada", "Agente WhatsApp IA autoconfigurado por sector (Local + Nube)", "Cotiza, agenda y factura desde la ficha 360° del cliente"], como: "El agente de WhatsApp registra, califica y radica PQRS solo; tú solo arrastras y cierras." },
    en: { label: "CRM, AI funnel and complaints inbox", desc: "The WhatsApp AI agent, auto-configured by sector, records every contact in your Kanban and queue, rated cold, warm or hot, with a complaints inbox.", detalle: "See all your prospects on a visual board, handle complaints from the same inbox and prioritize the hottest clients, rated automatically by AI.", beneficios: ["Kanban board, arrival queue and built-in complaints inbox", "WhatsApp AI agent auto-configured by sector (Local + Cloud)", "Quote, schedule and invoice from the client's 360° card"], como: "The WhatsApp agent records, rates and files complaints on its own; you just drag and close." },
  },
  {
    Icon: Gift, familia: "ventas",
    es: { label: "Combos, puntos y fidelización", desc: "Promociones por horario, combos, puntos por compra y recompensas para que tus clientes regresen.", detalle: "Creas promociones por horario, combos, puntos por compra y recompensas para que tus clientes regresen.", beneficios: ["Combos y 2x1 por horario o día", "Puntos por cada compra", "Recompensas para clientes frecuentes"], como: "Defines el combo o los puntos una vez y se aplican solos al vender." },
    en: { label: "Combos, points and loyalty", desc: "Promotions by time of day, combos, purchase points and rewards to bring your customers back.", detalle: "Create promotions by time of day, combos, purchase points and rewards to bring your customers back.", beneficios: ["Combos and 2x1 by time or day", "Points for every purchase", "Rewards for frequent customers"], como: "Set the combo or points once and they apply automatically when you sell." },
  },
  {
    Icon: CalendarDays, familia: "equipo",
    es: { label: "Agenda, reservas y pedidos recurrentes", desc: "Citas por profesional y recurso, reservas de mesas o espacios, y pedidos que se repiten cada semana sin olvidar ninguno.", detalle: "Atiendes citas por profesional, reservas de mesas o espacios, y pedidos que se repiten cada semana sin olvidar ninguno.", beneficios: ["Agenda por profesional, sin cruces", "Reservas de mesas o espacios con anticipo", "Pedidos semanales automáticos"], como: "Agendas la cita o el pedido recurrente y el programa te avisa." },
    en: { label: "Calendar, bookings and recurring orders", desc: "Appointments by professional and resource, table or space bookings, and orders that repeat every week without missing one.", detalle: "Handle appointments by professional, table or space bookings, and orders that repeat every week without missing one.", beneficios: ["Calendar by professional, no overlaps", "Table or space bookings with deposit", "Automatic weekly orders"], como: "You book the appointment or recurring order and the program reminds you." },
  },
];

type PestanaTexto = { corto: string; titular: string; beneficios: string[] };

type Pestana = {
  id: string; Icon: Icono; es: PestanaTexto; en: PestanaTexto;
};

const PESTANAS: Pestana[] = [
  {
    id: "rest", Icon: UtensilsCrossed,
    es: { corto: "Restaurantes y comidas", titular: "Vende más en horas pico sin que se pierda una sola comanda.", beneficios: ["Menú QR en mesa y tirillas térmicas 58mm/80mm", "Comanda automática a cocina al registrar el pedido", "Escandallo que descuenta ingredientes por plato", "Agente WhatsApp IA + operación sin internet"] },
    en: { corto: "Restaurants and food", titular: "Sell more at peak hours without losing a single kitchen ticket.", beneficios: ["QR menu at the table and 58mm/80mm thermal receipts", "Automatic kitchen ticket when the order is saved", "Recipe costing that deducts ingredients per dish", "WhatsApp AI agent + offline operation"] },
  },
  {
    id: "veh", Icon: Car,
    es: { corto: "Vehículos y talleres", titular: "Controla cada vehículo desde que entra hasta el traspaso final.", beneficios: ["Hoja de vida y utilidad neta por placa (compra + arreglos vs venta)", "Alertas de SOAT, Tecnomecánica y órdenes de taller con fotos", "Agente WhatsApp IA + CRM y Embudo con PQRS"] },
    en: { corto: "Vehicles and workshops", titular: "Track every vehicle from the day it arrives to the final transfer.", beneficios: ["Vehicle history and net profit per plate (purchase + repairs vs sale)", "Alerts for insurance and technical inspection, and work orders with photos", "WhatsApp AI agent + CRM and funnel with complaints"] },
  },
  {
    id: "dian", Icon: Receipt,
    es: { corto: "Comercio, Escáner y DIAN", titular: "Cobra en segundos, imprime etiquetas y factura con la DIAN.", beneficios: ["Escáner de códigos de barras con cámara móvil o pistola + etiquetas", "Impresión térmica 58mm/80mm y Facturación electrónica DIAN con CUFE y QR", "Arqueo de caja por turnos y recordatorios por WhatsApp"] },
    en: { corto: "Retail, scanner and DIAN", titular: "Check out in seconds, print labels and invoice with DIAN.", beneficios: ["Barcode scanner with phone camera or gun + labels", "58mm/80mm thermal printing and DIAN electronic invoicing with CUFE and QR", "Shift cash count and WhatsApp reminders"] },
  },
  {
    id: "nom", Icon: Calculator,
    es: { corto: "Nómina ley colombiana", titular: "Liquida tu nómina en minutos cumpliendo al 100% con la ley.", beneficios: ["Cálculo automático de SMMLV, auxilio y recargos", "Salud, pensión, primas y cesantías", "Desprendible por WhatsApp y archivo PILA listo"] },
    en: { corto: "Payroll under Colombian law", titular: "Calculate your payroll in minutes, fully compliant with the law.", beneficios: ["Automatic calculation of SMMLV, allowance and surcharges", "Health, pension, bonuses and severance", "Pay slip by WhatsApp and PILA file ready"] },
  },
];

type MensajeChat = { de: "cliente" | "agente"; texto: string; hora: string };

const CHAT: { es: MensajeChat; en: MensajeChat }[] = [
  { es: { de: "cliente", texto: "Buenas noches, ¿siguen abiertos? Quiero pedir algo para la cena", hora: "11:42 p. m." }, en: { de: "cliente", texto: "Good evening, are you still open? I'd like to order something for dinner", hora: "11:42 PM" } },
  { es: { de: "agente", texto: "¡Hola! Sí, atendemos 24/7 por aquí. Hoy te recomiendo la Hamburguesa Artesanal con papas, la más pedida.", hora: "11:42 p. m." }, en: { de: "agente", texto: "Hi! Yes, we serve 24/7 here. Today I recommend the Artisan Burger with fries, our most ordered.", hora: "11:42 PM" } },
  { es: { de: "cliente", texto: "Dame 2 hamburguesas y una limonada de coco", hora: "11:43 p. m." }, en: { de: "cliente", texto: "Give me 2 burgers and a coconut lemonade", hora: "11:43 PM" } },
  { es: { de: "agente", texto: "Perfecto: 2 x Hamburguesa $56.000 + Limonada $9.500 + domicilio $5.000 = $70.500. ¿Pagas por Nequi o contraentrega?", hora: "11:43 p. m." }, en: { de: "agente", texto: "Perfect: 2 x Burger $56,000 + Lemonade $9,500 + delivery $5,000 = $70,500. Will you pay by Nequi or cash on delivery?", hora: "11:43 PM" } },
  { es: { de: "cliente", texto: "Nequi. Ya transferí", hora: "11:44 p. m." }, en: { de: "cliente", texto: "Nequi. I already transferred", hora: "11:44 PM" } },
  { es: { de: "agente", texto: "Pago confirmado. Tu pedido ya está en cocina y llega en 35 min.", hora: "11:44 p. m." }, en: { de: "agente", texto: "Payment confirmed. Your order is already in the kitchen and arrives in 35 min.", hora: "11:44 PM" } },
];

const COLORES_SECTOR = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

const ESTILOS = `
.gs-land{--gs-bg:#F8FAFC;--gs-card:#FFFFFF;--gs-borde:#E2E8F0;--gs-texto:#0F172A;--gs-muted:#475569;--gs-cobalto:#1E40AF;--gs-esm:#059669;--gs-glass:rgba(255,255,255,.8);
  background-color:var(--gs-bg);background-image:radial-gradient(#cbd5e1 1px,transparent 1px);background-size:22px 22px;color:var(--gs-texto);font-family:"Inter",ui-sans-serif,system-ui,sans-serif}
.gs-land.gs-dark{--gs-bg:#090D16;--gs-card:#111827;--gs-borde:#1E293B;--gs-texto:#F8FAFC;--gs-muted:#94A3B8;--gs-cobalto:#3B82F6;--gs-esm:#10B981;--gs-glass:rgba(9,13,22,.8);
  background-image:radial-gradient(#1e293b 1px,transparent 1px)}
.gs-land .gs-titulo{font-family:"Plus Jakarta Sans","Inter",sans-serif;font-weight:800;letter-spacing:-0.03em}
.gs-land h1,.gs-land h2,.gs-land h3,.gs-land h4,.gs-land .gs-titulo{color:var(--gs-texto)}
.gs-land .gs-final h2,.gs-land .gs-final h3,.gs-land .gs-final .gs-titulo{color:#fff}
.gs-land .gs-num{font-variant-numeric:tabular-nums}
.gs-land .gs-muted{color:var(--gs-muted)}
.gs-land .gs-card{background:var(--gs-card);border:1px solid var(--gs-borde);border-radius:1.25rem;transition:transform .3s,border-color .3s,box-shadow .3s}
.gs-land .gs-card-hover:hover{transform:translateY(-4px);border-color:var(--gs-cobalto);box-shadow:0 16px 40px -18px color-mix(in srgb,var(--gs-cobalto) 55%,transparent)}
.gs-land .gs-cta{background:var(--gs-esm);color:#fff;font-weight:700;transition:transform .2s,filter .2s,box-shadow .2s}
.gs-land .gs-cta:hover{transform:translateY(-1px);filter:brightness(1.08);box-shadow:0 12px 28px -10px var(--gs-esm)}
.gs-land .gs-sec{border:1px solid var(--gs-borde);background:var(--gs-card);color:var(--gs-texto);font-weight:600;transition:border-color .2s,transform .2s}
.gs-land .gs-sec:hover{border-color:var(--gs-cobalto);transform:translateY(-1px)}
.gs-land .gs-nav{background:var(--gs-glass);border-bottom:1px solid var(--gs-borde)}
.gs-land .gs-azul{color:var(--gs-cobalto)}
.gs-land .gs-verde{color:var(--gs-esm)}
.gs-land input.gs-input{background:var(--gs-card);border:1px solid var(--gs-borde);color:var(--gs-texto);font-size:16px}
.gs-land input.gs-input:focus{outline:none;border-color:var(--gs-cobalto);box-shadow:0 0 0 3px color-mix(in srgb,var(--gs-cobalto) 25%,transparent)}
.gs-land .gs-final{background:linear-gradient(135deg,#172554,#0f172a 55%,#000)}
.gs-land h1.gs-grad-titulo{background:linear-gradient(90deg,#020617,#065f46 55%,#0d9488);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.gs-land.gs-dark h1.gs-grad-titulo{background:linear-gradient(90deg,#fff,#a7f3d0 55%,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.gs-land .gs-cta-esm{background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;font-weight:700;box-shadow:0 10px 30px -8px rgba(16,185,129,.55);transition:transform .15s,box-shadow .15s}
.gs-land .gs-cta-esm:hover{transform:translateY(-1px);box-shadow:0 14px 36px -8px rgba(6,182,212,.6)}
.gs-land .gs-cristal{background:var(--gs-glass);border:1px solid var(--gs-borde);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
@keyframes gs-flota{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.gs-land .gs-flota{animation:gs-flota 5s ease-in-out infinite}
.gs-land .gs-flota-2{animation:gs-flota 6s ease-in-out infinite reverse}
@keyframes gs-barra{from{transform:scaleY(.2)}to{transform:scaleY(1)}}
.gs-land .gs-barra{transform-origin:bottom;animation:gs-barra .9s cubic-bezier(.2,.8,.2,1) both}
`;

function Aparece({ children, retraso = 0, className = "" }: { children: ReactNode; retraso?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: retraso, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Encabezado({ ojo, titulo, texto }: { ojo: string; titulo: string; texto?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="gs-azul text-xs font-bold uppercase tracking-[0.2em]">{ojo}</p>
      <h2 className="gs-titulo mt-3 text-3xl sm:text-4xl">{titulo}</h2>
      {texto ? <p className="gs-muted mt-3 text-sm sm:text-base">{texto}</p> : null}
    </div>
  );
}

function VistaPrevia({ id }: { id: string }) {
  const tx = useTx();
  if (id === "rest") {
    return (
      <div className="gs-card p-5">
        <div className="flex items-center justify-between">
          <span className="gs-titulo text-lg">{tx("Mesa 04", "Table 04")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> {tx("En cocina", "In kitchen")}</span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--gs-borde)" }}>
          <span className="text-sm">2 × {tx("Hamburguesa Artesanal", "Artisan Burger")}</span>
          <span className="gs-num gs-verde text-sm font-bold">$56.000</span>
        </div>
        <p className="gs-muted gs-num mt-3 text-xs">{tx("Tiempo en cocina: 06:12 min · Comanda impresa automáticamente", "Kitchen time: 06:12 min · Ticket printed automatically")}</p>
      </div>
    );
  }
  if (id === "veh") {
    return (
      <div className="gs-card p-5">
        <div className="flex items-center justify-between">
          <span className="gs-titulo text-lg">{tx("Placa KLM-45G", "Plate KLM-45G")}</span>
          <Wrench className="gs-azul h-5 w-5" />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="gs-muted">{tx("Inversión", "Investment")}</dt><dd className="gs-num font-semibold">$28.5M</dd></div>
          <div className="flex justify-between"><dt className="gs-muted">{tx("Utilidad neta", "Net profit")}</dt><dd className="gs-num gs-verde font-bold">+$4.2M</dd></div>
        </dl>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500"><Check className="h-3.5 w-3.5" /> {tx("SOAT vigente", "Insurance valid")}</p>
      </div>
    );
  }
  if (id === "dian") {
    const celdas = [1,1,1,0,1,0,1, 1,0,1,1,0,0,1, 1,1,0,1,1,1,0, 0,1,1,0,1,0,1, 1,0,0,1,1,1,1, 0,1,0,1,0,0,1, 1,1,1,0,1,1,0];
    return (
      <div className="gs-card flex items-center gap-5 p-5">
        <div className="min-w-0 flex-1">
          <span className="gs-titulo text-lg">FE-1048</span>
          <p className="gs-muted gs-num mt-1 text-xs">{tx("Total", "Total")} $214.200 · CUFE 8f3a…c91d</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500"><BadgeCheck className="h-3.5 w-3.5" /> {tx("Validada por la DIAN ✓", "Validated by DIAN ✓")}</p>
        </div>
        <svg viewBox="0 0 7 7" className="h-20 w-20 shrink-0 rounded-lg bg-white p-1" aria-label={tx("Código QR de la factura", "Invoice QR code")}>
          {celdas.map((c, i) => (c ? <rect key={i} x={i % 7} y={Math.floor(i / 7)} width="1" height="1" fill="#0F172A" /> : null))}
        </svg>
      </div>
    );
  }
  return (
    <div className="gs-card p-5">
      <div className="flex items-center justify-between">
        <span className="gs-titulo text-lg">{tx("Desprendible digital", "Digital pay slip")}</span>
        <Banknote className="gs-verde h-5 w-5" />
      </div>
      <p className="gs-num gs-verde mt-3 text-2xl font-extrabold">$1.847.300</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        {[tx("SMMLV", "SMMLV"), tx("Seguridad Social", "Social security"), tx("Enviar por WhatsApp", "Send by WhatsApp")].map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-500"><Check className="h-3 w-3" /> {t}</span>
        ))}
      </div>
    </div>
  );
}

function SelectorEspecialidad() {
  const tx = useTx();
  const { idioma } = useIdioma();
  const [activa, setActiva] = useState<string>(PESTANAS[0].id);
  const p = PESTANAS.find((x) => x.id === activa) ?? PESTANAS[0];
  const txt = idioma === "en" ? p.en : p.es;
  return (
    <div className="gs-card mt-10 p-4 sm:p-6">
      <div role="tablist" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {PESTANAS.map(({ id, Icon, es, en }) => {
          const on = id === activa;
          const corto = idioma === "en" ? en.corto : es.corto;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActiva(id)}
              className="flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition"
              style={{
                borderColor: on ? "var(--gs-cobalto)" : "var(--gs-borde)",
                background: on ? "color-mix(in srgb, var(--gs-cobalto) 12%, transparent)" : "transparent",
                color: on ? "var(--gs-cobalto)" : "var(--gs-texto)",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" /> <span className="min-w-0">{corto}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid items-center gap-6 lg:grid-cols-2">
        <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="min-w-0">
          <h3 className="gs-titulo text-2xl sm:text-3xl">{txt.titular}</h3>
          <ul className="mt-4 space-y-2">
            {txt.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm"><Check className="gs-verde mt-0.5 h-4 w-4 shrink-0" /><span className="gs-muted">{b}</span></li>
            ))}
          </ul>
        </motion.div>
        <motion.div key={`${p.id}-ui`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="min-w-0">
          <VistaPrevia id={p.id} />
        </motion.div>
      </div>
      <span className="sr-only">{tx("Especialidad seleccionada", "Selected specialty")}</span>
    </div>
  );
}

function ChatWhatsApp() {
  const tx = useTx();
  const { idioma } = useIdioma();
  const [visibles, setVisibles] = useState<number>(1);
  useEffect(() => {
    const t = window.setTimeout(
      () => setVisibles((v) => (v >= CHAT.length ? 1 : v + 1)),
      visibles >= CHAT.length ? 4500 : 1700,
    );
    return () => window.clearTimeout(t);
  }, [visibles]);
  return (
    <div className="gs-card overflow-hidden" style={{ background: "color-mix(in srgb, var(--gs-esm) 8%, var(--gs-card))" }}>
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--gs-borde)" }}>
        <span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: "var(--gs-esm)" }}><Bot className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{tx("Agente", "Agent")} {BRAND.name}</p>
          <p className="gs-verde text-xs">● {tx("en línea 24/7", "online 24/7")}</p>
        </div>
      </div>
      <div className="flex min-h-[22rem] flex-col gap-2.5 p-4">
        {CHAT.slice(0, visibles).map((fila, i) => {
          const m = idioma === "en" ? fila.en : fila.es;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.de === "cliente" ? "self-start" : "self-end text-white"}`}
              style={m.de === "cliente" ? { background: "var(--gs-card)", border: "1px solid var(--gs-borde)" } : { background: "var(--gs-esm)" }}
            >
              <p>{m.texto}</p>
              <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.de === "cliente" ? "gs-muted" : "text-white/80"}`}>
                {m.hora} {m.de === "agente" && i === visibles - 1 && i === CHAT.length - 1 ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" /> : null}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ExploradorSectores() {
  const tx = useTx();
  const [sel, setSel] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>("");
  const [todos, setTodos] = useState<boolean>(false);
  const ficha = sel ? buscarSector(sel) : undefined;
  const FichaIcon = ficha?.Icon;

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q) return SECTORES.filter((s) => s.label.toLowerCase().includes(q));
    return todos ? SECTORES : SECTORES.slice(0, 6);
  }, [busca, todos]);

  const guardarPreseleccion = (slug: string) => {
    try {
      localStorage.setItem("gosaryc:tipo_preseleccionado", slug);
    } catch {
      /* almacenamiento bloqueado */
    }
  };

  return (
    <div className="mt-10">
      <div className="relative mx-auto max-w-md">
        <Search className="gs-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={tx("Busca tu tipo de negocio…", "Search your type of business…")}
          aria-label={tx("Buscar tipo de negocio", "Search type of business")}
          className="gs-input w-full rounded-full py-3 pl-11 pr-4"
        />
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {lista.map(({ Icon, label, slug }, i) => {
          const color = COLORES_SECTOR[i % COLORES_SECTOR.length];
          const activo = sel === slug;
          return (
            <li key={slug}>
              <button type="button" onClick={() => setSel(activo ? null : slug)} aria-expanded={activo} className="block h-full w-full">
                <div className={`gs-card gs-card-hover flex h-full flex-col items-center gap-3 p-4 text-center ${activo ? "ring-2" : ""}`} style={activo ? { borderColor: "var(--gs-cobalto)" } : undefined}>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${color}22`, color }}><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-semibold sm:text-sm">{label}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {lista.length === 0 && <p className="gs-muted mt-6 text-center text-sm">{tx("No encontramos ese negocio. Prueba con otra palabra.", "We couldn't find that business. Try another word.")}</p>}
      {!busca.trim() && (
        <div className="mt-5 text-center">
          <button type="button" onClick={() => setTodos((v) => !v)} className="gs-sec inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm">
            {todos ? tx("Ver menos", "Show less") : tx("Ver los +50 sectores", "See all 50+ sectors")} <ChevronDown className={`h-4 w-4 transition ${todos ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {ficha && FichaIcon ? (
        <div className="gs-card mt-6 p-6 text-left sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--gs-cobalto) 14%, transparent)", color: "var(--gs-cobalto)" }}><FichaIcon className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="gs-azul text-xs font-bold uppercase tracking-[0.2em]">{tx("Ficha del negocio", "Business profile")}</p>
              <h3 className="gs-titulo mt-1 break-words text-2xl">{ficha.label}</h3>
            </div>
          </div>
          <p className="mt-5 font-semibold">{tx("Qué problema resuelve", "What problem it solves")}</p>
          <p className="gs-muted mt-1 text-sm sm:text-base">{ficha.resumen}</p>
          <p className="mt-5 font-semibold">{tx("Funciones reales incluidas", "Real features included")}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {ficha.acciones.map((a) => (
              <li key={a.titulo} className="flex items-start gap-2 text-sm">
                <Check className="gs-verde mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0"><strong>{a.titulo}:</strong> <span className="gs-muted">{a.texto}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/login" search={{ mode: "signup" }} onClick={() => guardarPreseleccion(ficha.slug)} className="gs-cta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
              {tx("Probar", "Try")} {BRAND.name} {tx("gratis para", "free for")} {ficha.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/sectores/$slug" params={{ slug: ficha.slug }} className="gs-sec inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
              {tx("Ver ficha completa", "See full profile")}
            </Link>
          </div>
        </div>
      ) : (
        <p className="gs-muted mt-6 text-center text-sm">{tx("Toca tu tipo de negocio para ver qué problema resuelve, sus funciones reales y cómo empezar gratis.", "Tap your type of business to see what problem it solves, its real features and how to start for free.")}</p>
      )}
    </div>
  );
}

function MiniDian() {
  const tx = useTx();
  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--gs-borde)" }}>
      <QrCode className="gs-azul h-8 w-8 shrink-0" />
      <div className="min-w-0 text-xs">
        <p className="gs-num font-semibold">FE-1048 · CUFE 8f3a…c91d</p>
        <p className="gs-verde font-semibold">{tx("Validada por la DIAN ✓", "Validated by DIAN ✓")}</p>
      </div>
    </div>
  );
}

function MiniNomina() {
  const tx = useTx();
  return (
    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
      {[[tx("Salud", "Health"), "4%"], [tx("Pensión", "Pension"), "4%"], [tx("Auxilio", "Allowance"), tx("Sí", "Yes")]].map(([k, v]) => (
        <div key={k} className="rounded-xl border p-2" style={{ borderColor: "var(--gs-borde)" }}>
          <p className="gs-muted">{k}</p>
          <p className="gs-num gs-verde font-bold">{v}</p>
        </div>
      ))}
    </div>
  );
}

function LandingPage() {
  const { session } = useAuth();
  const { idioma, cambiarIdioma } = useIdioma();
  const tx = useTx();
  const [fichaModulo, setFichaModulo] = useState<Modulo | null>(null);
  const [oscuro, setOscuro] = useState<boolean>(false);

  useEffect(() => {
    try {
      setOscuro(localStorage.getItem("gosaryc:tema_portada") === "oscuro");
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);

  const cambiarTema = () => {
    setOscuro((v) => {
      const nuevo = !v;
      try {
        localStorage.setItem("gosaryc:tema_portada", nuevo ? "oscuro" : "claro");
      } catch {
        /* almacenamiento bloqueado */
      }
      return nuevo;
    });
  };

  useEffect(() => {
    if (!fichaModulo) return;
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFichaModulo(null);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [fichaModulo]);

  const clase = `gs-land relative min-h-screen overflow-x-hidden${oscuro ? " gs-dark" : ""}`;
  const ficha = fichaModulo ? (idioma === "en" ? fichaModulo.en : fichaModulo.es) : null;

  return (
    <div className={clase}>
      <style>{ESTILOS}</style>

      <header className="gs-nav sticky top-0 z-50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2.5">
            <img src="/icono-app.svg" alt={tx(`Logo de ${BRAND.name}`, `${BRAND.name} logo`)} className="h-9 w-9 rounded-xl object-cover" />
            <span className="gs-titulo truncate text-xl">{BRAND.name}</span>
          </Link>
          <nav className="gs-muted hidden items-center gap-1 text-sm font-medium lg:flex" aria-label={tx("Principal", "Main")}>
            <a href="#sectores" className="rounded-full px-3 py-2 hover:opacity-80">{tx("Soluciones por Sector", "Solutions by Sector")}</a>
            <a href="#conocer" className="rounded-full px-3 py-2 hover:opacity-80">{tx("CRM Inteligente", "Smart CRM")}</a>
            <a href="#crm-ia" className="rounded-full px-3 py-2 hover:opacity-80">{tx("WhatsApp IA 24/7", "AI WhatsApp 24/7")}</a>
            <Link to="/demo" className="rounded-full px-3 py-2 hover:opacity-80">{tx("Demostración en Vivo", "Live Demo")}</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => cambiarIdioma(idioma === "es" ? "en" : "es")}
              aria-label={tx("Cambiar idioma", "Change language")}
              title={tx("Cambiar idioma", "Change language")}
              className="gs-sec inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold"
            >
              <Languages className="h-4 w-4" />
              <span>{idioma === "es" ? "EN" : "ES"}</span>
            </button>
            <button type="button" onClick={cambiarTema} aria-label={oscuro ? tx("Activar modo claro", "Switch to light mode") : tx("Activar modo oscuro", "Switch to dark mode")} className="gs-sec grid h-10 w-10 place-items-center rounded-full">
              {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/instalar" className="gs-muted hidden rounded-full px-4 py-2 text-sm font-medium sm:inline-flex">{tx("Descargar app", "Download app")}</Link>
            {session ? (
              <Link to="/restaurante" className="gs-cta inline-flex rounded-full px-5 py-2.5 text-sm">{tx("Ir a mi panel", "Go to my dashboard")}</Link>
            ) : (
              <Link to="/login" search={{ mode: "signin" }} className="gs-cta-esm inline-flex rounded-full px-5 py-2.5 text-sm">{tx("Iniciar sesión", "Sign in")}</Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 sm:px-8">
        {/* A. HERO */}
        <section className="grid items-center gap-10 pb-6 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="min-w-0">
            <p className="gs-cristal inline-flex max-w-full flex-wrap items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium" style={{ boxShadow: "0 0 0 1px color-mix(in srgb, var(--gs-esm) 35%, transparent), 0 0 24px -6px color-mix(in srgb, var(--gs-esm) 55%, transparent)" }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--gs-esm)" }} />
              {tx("Multiplataforma • Web, Android y PC • +48 Sectores en Colombia", "Multiplatform • Web, Android and PC • 48+ sectors in Colombia")}
            </p>
            <h1 className="gs-titulo gs-grad-titulo mt-6 break-words pb-1 text-4xl leading-[1.05] sm:text-6xl">
              {tx("Controla cada peso, cada venta y cada turno de tu negocio.", "Control every peso, every sale and every shift of your business.")}
            </h1>
            <p className="gs-muted mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              {tx(
                "El sistema POS y administrativo todo-en-uno para restaurantes, compraventas, talleres, tiendas y +50 sectores en Colombia. Escanea códigos de barras con tu celular o pistola, imprime tirillas térmicas 58mm/80mm y comandas, factura con la DIAN, liquida nómina legal y vende 24/7 con Agente WhatsApp IA + CRM y bandeja PQRS, incluso sin internet.",
                "The all-in-one POS and admin system for restaurants, pawn shops, workshops, stores and 50+ sectors in Colombia. Scan barcodes with your phone or gun, print 58mm/80mm thermal receipts and kitchen tickets, invoice with DIAN, run legal payroll and sell 24/7 with the WhatsApp AI agent, CRM and complaints inbox, even offline.",
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/demo" className="gs-cta-esm inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
                {tx("Probar Demo Interactiva", "Try the Interactive Demo")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" search={{ mode: "signup" }} className="gs-cristal inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold">
                {tx("Crear Cuenta / 30 Días Gratis", "Create Account / 30 Days Free")}
              </Link>
              <Link to="/instalar" className="gs-cristal inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm sm:hidden">
                <Download className="h-4 w-4" /> {tx("Descargar App", "Download App")}
              </Link>
            </div>
            <ul className="gs-muted mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold">
              {[tx("Sin tarjeta", "No credit card"), tx("Facturación DIAN", "DIAN invoicing"), tx("Funciona sin internet", "Works offline")].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="gs-verde h-4 w-4" /> {t}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="gs-muted font-medium">{tx("Abre directo:", "Open directly:")}</span>
              <Link to="/demo" search={{ sector: "auto" }} className="gs-sec inline-flex rounded-full px-3 py-1.5 font-semibold">AutoElite Colombia</Link>
              <Link to="/demo" search={{ sector: "rest" }} className="gs-sec inline-flex rounded-full px-3 py-1.5 font-semibold">Sabores del Valle</Link>
              <Link to="/demo" search={{ sector: "comercio" }} className="gs-sec inline-flex rounded-full px-3 py-1.5 font-semibold">MultiComercio POS</Link>
            </div>
            <p className="gs-card mt-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium">
              <Mic className="gs-verde mt-0.5 h-5 w-5 shrink-0" />
              <span className="min-w-0 break-words">{tx("Controla todo tu negocio por voz: factura, crea inventario, modifica precios y consulta reportes hablando", "Control your whole business by voice: invoice, create inventory, change prices and check reports by speaking")}</span>
            </p>
            <ul className="gs-muted mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
              {[
                tx("30 días de prueba gratis sin compromiso", "30 days free trial, no commitment"),
                tx("Agente WhatsApp IA + CRM y PQRS", "WhatsApp AI agent + CRM and complaints"),
                tx("Escáner cámara/pistola + etiquetas", "Camera/gun scanner + labels"),
                tx("Tirillas 58mm/80mm y comandas", "58mm/80mm receipts and kitchen tickets"),
                tx("Facturación DIAN y Nómina Colombia", "DIAN invoicing and Colombian payroll"),
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5"><Check className="gs-verde h-4 w-4" /> {t}</li>
              ))}
            </ul>
          </div>

          <div className="relative min-w-0" aria-hidden="true">
            <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="gs-flota absolute -top-4 right-2 z-20 inline-flex max-w-[85%] items-center gap-2 rounded-full px-3 py-2 text-[11px] font-bold shadow-lg gs-cristal">
              <MessageCircle className="gs-verde h-4 w-4 shrink-0" /> <span className="truncate">{tx("WhatsApp IA • Pedido tomado ($84.000)", "WhatsApp AI • Order taken ($84,000)")}</span>
            </div>
            <div className="gs-flota-2 absolute -bottom-4 left-2 z-20 inline-flex max-w-[85%] items-center gap-2 rounded-full px-3 py-2 text-[11px] font-bold shadow-lg gs-cristal">
              <TrendingUp className="gs-azul h-4 w-4 shrink-0" /> <span className="truncate">{tx("CRM • Lead Score 94 pts • Preaprobado", "CRM • Lead Score 94 pts • Pre-approved")}</span>
            </div>
            <div className="gs-card mt-4 space-y-4 rounded-3xl p-5 backdrop-blur-xl" style={{ boxShadow: "0 24px 60px -30px color-mix(in srgb, var(--gs-esm) 70%, transparent)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="gs-muted text-xs">{tx("Ventas de hoy", "Today's sales")}</p>
                  <p className="gs-titulo gs-num text-3xl">$1.284.500</p>
                  <p className="gs-num gs-verde mt-1 text-xs font-bold">▲ +18.4% {tx("vs ayer", "vs yesterday")}</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--gs-esm) 15%, transparent)", color: "var(--gs-esm)" }}><TrendingUp className="h-5 w-5" /></span>
              </div>
              <div className="flex h-24 items-end gap-2">
                {[38, 55, 42, 70, 52, 88, 64].map((h, i) => (
                  <div key={i} className="gs-barra flex-1 rounded-t-lg" style={{ height: `${h}%`, background: "linear-gradient(to top, #10b981, #22d3ee)", animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--gs-borde)" }}>
                  <p className="gs-muted flex items-center gap-1.5 text-xs"><Radio className="gs-verde h-3.5 w-3.5 animate-pulse" /> {tx("Pedidos activos", "Active orders")}</p>
                  <p className="gs-titulo gs-num text-xl">38</p>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--gs-borde)" }}>
                  <p className="gs-muted text-xs">{tx("Por cobrar", "To collect")}</p>
                  <p className="gs-titulo gs-num text-xl">$216.000</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--gs-esm)" }}><MessageCircle className="h-3 w-3" /> {tx("Cobrar por WhatsApp", "Collect by WhatsApp")}</span>
                </div>
              </div>
              <p className="gs-muted flex items-center gap-2 rounded-lg px-1 text-xs"><WifiOff className="gs-verde h-3.5 w-3.5" /> <span className="gs-verde">●</span> {tx("Modo Offline Activo · Sincronización en la nube lista", "Offline Mode Active · Cloud sync ready")}</p>
            </div>
          </div>
        </section>

        {/* B. SELECTOR POR ESPECIALIDAD */}
        <Aparece className="mt-20 scroll-mt-24">
          <span id="sectores" className="block scroll-mt-24" />
          <Encabezado
            ojo={tx("Propuestas dirigidas", "Tailored proposals")}
            titulo={tx("Una solución pensada para tu tipo de negocio", "A solution built for your type of business")}
            texto={tx("Elige tu especialidad y mira cómo se ve Gosaryc en tu día a día.", "Choose your specialty and see how Gosaryc looks in your day-to-day.")}
          />
          <SelectorEspecialidad />
        </Aparece>

        {/* C. ECOSISTEMA */}
        <section id="conocer" className="mt-24 scroll-mt-24" aria-labelledby="modulos">
          <Aparece>
            <Encabezado
              ojo={tx("Qué incluye", "What's included")}
              titulo={tx("Un ecosistema completo, explicado en lenguaje claro", "A complete ecosystem, explained in plain language")}
              texto={tx("13 módulos reales. Toca cualquier tarjeta para ver el detalle sin iniciar sesión.", "13 real modules. Tap any card to see the details without signing in.")}
            />
          </Aparece>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {MODULOS.map((m, i) => {
              const f = FAMILIA[m.familia];
              const txt = idioma === "en" ? m.en : m.es;
              return (
                <Aparece key={m.es.label} retraso={(i % 3) * 0.06} className={m.ancho ? "md:col-span-2" : ""}>
                  <button type="button" onClick={() => setFichaModulo(m)} className="block h-full w-full text-left">
                    <div className="gs-card gs-card-hover relative h-full overflow-hidden p-6">
                      <div className="pointer-events-none absolute inset-0" style={{ background: f.fondo }} />
                      <div className="relative">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: f.fondo, color: f.texto, border: `1px solid ${f.texto}33` }}><m.Icon className="h-5 w-5" /></span>
                        <h3 className="gs-titulo mt-5 text-lg">{txt.label}</h3>
                        <p className="gs-muted mt-1.5 text-sm">{txt.desc}</p>
                        {m.ancho === "dian" && <MiniDian />}
                        {m.ancho === "nomina" && <MiniNomina />}
                        <span className="gs-azul mt-4 inline-flex items-center gap-1 text-xs font-semibold">{tx("Explorar módulo", "Explore module")} <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </button>
                </Aparece>
              );
            })}
          </div>

          {fichaModulo && ficha && (
            <div className="gs-land fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" style={{ background: "transparent" }} role="dialog" aria-modal="true" aria-label={ficha.label}>
              <button type="button" aria-label={tx("Cerrar detalle", "Close details")} onClick={() => setFichaModulo(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div className={`${oscuro ? "gs-dark " : ""}gs-land gs-card relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 text-left backdrop-blur-xl sm:p-8`} style={{ backgroundImage: "none" }}>
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: FAMILIA[fichaModulo.familia].fondo, color: FAMILIA[fichaModulo.familia].texto }}><fichaModulo.Icon className="h-6 w-6" /></span>
                  <button type="button" onClick={() => setFichaModulo(null)} aria-label={tx("Cerrar", "Close")} className="gs-sec rounded-full p-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="gs-titulo mt-4 text-2xl">{ficha.label}</h3>
                <p className="gs-muted mt-2 text-sm sm:text-base">{ficha.detalle}</p>
                <p className="mt-5 font-semibold">{tx("Beneficios reales", "Real benefits")}</p>
                <ul className="mt-2 space-y-2">
                  {ficha.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm"><Check className="gs-verde mt-0.5 h-4 w-4 shrink-0" /><span className="gs-muted">{b}</span></li>
                  ))}
                </ul>
                <p className="mt-5 font-semibold">{tx("Cómo funciona", "How it works")}</p>
                <p className="gs-muted mt-1 text-sm">{ficha.como}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/login" search={{ mode: "signup" }} className="gs-cta inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
                    {tx("Crear cuenta y probar gratis", "Create account and try it free")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" search={{ mode: "signin" }} className="gs-sec inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
                    {tx("Ya tengo cuenta, iniciar sesión", "I already have an account, sign in")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* C2. CRM INTELIGENTE */}
        <section className="mt-24" aria-labelledby="crm-ia">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Aparece className="min-w-0">
              <p className="gs-card inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider">
                <Brain className="gs-verde h-4 w-4" /> {tx("CRM INTELIGENTE CON IA INTEGRADA", "SMART CRM WITH BUILT-IN AI")}
              </p>
              <h2 id="crm-ia" className="gs-titulo mt-5 break-words text-3xl sm:text-5xl" style={{ background: "linear-gradient(135deg, var(--gs-cobalto), var(--gs-esm))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {tx("Convierte cada mensaje de WhatsApp en una venta cerrada", "Turn every WhatsApp message into a closed sale")}
              </h2>
              <p className="gs-muted mt-5 max-w-xl text-base sm:text-lg">
                {tx(
                  "Tu CRM califica a cada prospecto automáticamente, calcula la viabilidad de su crédito y organiza el embudo de ventas sin trabajo manual.",
                  "Your CRM rates every prospect automatically, calculates their credit viability and organizes the sales funnel with no manual work.",
                )}
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  { Icon: TrendingUp, t: tx("Calificación Automática (Lead Scoring 0-100)", "Automatic Scoring (Lead Scoring 0-100)"), d: tx("Prioriza al instante a los clientes listos para comprar hoy.", "Instantly prioritizes customers ready to buy today.") },
                  { Icon: Calculator, t: tx("Preaprobado Financiero en Segundos", "Financial pre-approval in seconds"), d: tx("Calcula capacidad de pago, cuota inicial y retoma sin salir de la ficha.", "Calculates payment capacity, down payment and trade-in without leaving the profile.") },
                  { Icon: MessageCircle, t: tx("Conectado con WhatsApp IA y Facturación", "Connected to WhatsApp AI and invoicing"), d: tx("Del primer mensaje al cierre y comisión sin digitar dos veces.", "From the first message to the close and commission without typing twice.") },
                ].map(({ Icon, t, d }) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--gs-esm) 14%, transparent)", color: "var(--gs-esm)" }}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="font-bold">{t}</p>
                      <p className="gs-muted text-sm">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/demo" search={{ sector: "auto", tab: "crm" }} className="gs-cta mt-8 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm">
                {tx("Probar Demo Interactiva del CRM", "Try the Interactive CRM Demo")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Aparece>
            <Aparece retraso={0.1} className="relative min-w-0">
              <div className="absolute -inset-4 -z-10 rounded-[36px] opacity-20 blur-3xl" style={{ background: "linear-gradient(135deg, var(--gs-cobalto), var(--gs-esm))" }} />
              <div className="gs-card space-y-3 rounded-2xl border p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{tx("Embudo de ventas", "Sales funnel")}</p>
                  <span className="gs-muted text-xs">{tx("Ordenado por puntaje", "Sorted by score")}</span>
                </div>
                {[
                  { n: "Carlos Ramírez", i: "Mazda CX-30 2023", p: 94, etapa: tx("Negociando", "Negotiating"), pre: true },
                  { n: "Laura Gómez", i: "Renault Duster 2022", p: 78, etapa: tx("Cotizado", "Quoted"), pre: true },
                  { n: "Andrés Pineda", i: "Chevrolet Onix 2021", p: 41, etapa: tx("Nuevo Lead", "New lead"), pre: false },
                ].map((c) => (
                  <div key={c.n} className="rounded-xl border p-3" style={{ borderColor: "var(--gs-borde)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold">{c.n}</p>
                      <span className="gs-muted shrink-0 text-[11px]">{c.etapa}</span>
                    </div>
                    <p className="gs-muted truncate text-xs">{c.i}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--gs-borde)" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.p}%`, background: c.p >= 70 ? "var(--gs-esm)" : "#f59e0b" }} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="gs-num text-[11px] font-bold">{c.p} pts</p>
                      {c.pre && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600"><BadgeCheck className="h-3 w-3" /> {tx("Preaprobado Viable", "Viable pre-approval")}</span>}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg sm:ml-auto sm:max-w-[16rem]" style={{ borderColor: "var(--gs-borde)" }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ background: "var(--gs-esm)" }}><MessageCircle className="h-4 w-4" /></span>
                  <span className="min-w-0">{tx("WhatsApp IA: Nuevo lead calificado automáticamente", "WhatsApp AI: New lead scored automatically")}</span>
                </div>
              </div>
            </Aparece>
          </div>
        </section>

        {/* D. AGENTE WHATSAPP */}
        <section className="mt-24" aria-labelledby="agente-ia">
          <Aparece>
            <Encabezado
              ojo={tx("Atención automática + CRM y PQRS", "Automatic service + CRM and complaints")}
              titulo={tx("Un agente de WhatsApp IA autoconfigurado por sector que atiende y vende 24/7", "A WhatsApp AI agent, auto-configured by sector, that serves and sells 24/7")}
              texto={tx(
                "Funciona en modo dual (API Local en tu PC o respaldo Web/Nube), califica cada prospecto y sincroniza leads y PQRS directo a tu CRM y Embudo IA.",
                "Works in dual mode (Local API on your PC or Web/Cloud backup), rates every prospect and syncs leads and complaints straight to your CRM and AI funnel.",
              )}
            />
          </Aparece>
          <div className="mt-10 grid gap-5 lg:grid-cols-12">
            <Aparece className="lg:col-span-7"><ChatWhatsApp /></Aparece>
            <div className="grid gap-4 lg:col-span-5">
              {[
                { Icon: Headphones, titulo: tx("Atención 24/7", "24/7 service"), desc: tx("Resuelve dudas de horarios, precios y entregas de día y de noche.", "Answers questions about hours, prices and deliveries day and night.") },
                { Icon: Bot, titulo: tx("Cierre de ventas automático", "Automatic sales close"), desc: tx("Recomienda, calcula el total y confirma el pago por ti.", "Recommends, calculates the total and confirms payment for you.") },
                { Icon: Brain, titulo: tx("Aprende de tu negocio", "Learns from your business"), desc: tx("Se adapta a tu tipo de negocio y mejora con cada conversación.", "Adapts to your type of business and improves with every conversation.") },
                { Icon: Users, titulo: tx("Control humano cuando quieras", "Human control whenever you want"), desc: tx("Tomas el chat en cualquier momento, sin perder el contexto.", "Take over the chat at any time, without losing context.") },
              ].map(({ Icon, titulo, desc }, i) => (
                <Aparece key={titulo} retraso={i * 0.07}>
                  <div className="gs-card gs-card-hover flex items-start gap-4 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "color-mix(in srgb, var(--gs-esm) 14%, transparent)", color: "var(--gs-esm)" }}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <h3 className="font-bold">{titulo}</h3>
                      <p className="gs-muted mt-0.5 text-sm">{desc}</p>
                    </div>
                  </div>
                </Aparece>
              ))}
            </div>
          </div>
        </section>

        {/* E. +50 SECTORES */}
        <section className="mt-24" aria-labelledby="para-quien">
          <Aparece>
            <Encabezado
              ojo={tx("+50 tipos de negocio", "50+ types of business")}
              titulo={tx("El programa se adapta a tu negocio, no al revés", "The program adapts to your business, not the other way around")}
              texto={tx("Cada tipo de negocio recibe sus módulos, sus textos y su color. Búscalo o elige uno de los más populares.", "Each type of business gets its own modules, texts and color. Search for it or choose one of the most popular.")}
            />
          </Aparece>
          <ExploradorSectores />
        </section>

        {/* G. BANNER FINAL */}
        <Aparece className="mt-24">
          <section id="acceso" className="gs-final relative overflow-hidden rounded-[2rem] p-8 text-center text-white sm:p-14">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl" />
            <h2 className="gs-titulo relative text-3xl sm:text-5xl">{tx("Lleva tu negocio al siguiente nivel", "Take your business to the next level")}</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
              {tx(
                "Crea tu cuenta con 30 días de prueba sin compromiso y activa los módulos de tu tipo de negocio, con tus colores y tu logo. Tus datos se conservan siempre, incluso al actualizar.",
                "Create your account with a 30-day free trial, no commitment, and turn on the modules for your type of business, with your colors and your logo. Your data is always kept, even when you update.",
              )}
            </p>
            <ul className="relative mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm text-slate-200">
              {[
                tx("30 días gratis con todas las funciones", "30 days free with all features"),
                tx("Web, app Android y PC en una sola cuenta", "Web, Android app and PC in one account"),
                tx("Funciona sin internet y sincroniza después", "Works offline and syncs later"),
                tx("Módulos y textos según tu tipo de negocio", "Modules and texts for your type of business"),
              ].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400" /> {t}</li>
              ))}
            </ul>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login" search={{ mode: "signup" }} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#10B981] px-10 py-4 text-base font-bold text-white transition hover:brightness-110">
                {tx("Empezar 30 días gratis", "Start 30 days free")} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/login" search={{ mode: "signin" }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
                {tx("Ya tengo cuenta: iniciar sesión", "I already have an account: sign in")}
              </Link>
            </div>
            <p className="relative mt-6 inline-flex items-center gap-2 text-xs text-slate-400"><Smartphone className="h-3.5 w-3.5" /> {tx("Instálala como app desde", "Install it as an app from")} <Link to="/instalar" className="underline">{tx("Descargar app", "Download app")}</Link></p>
          </section>
        </Aparece>

        <footer className="mt-16 space-y-1 border-t pt-6 pb-4 text-center text-xs" style={{ borderColor: "var(--gs-borde)" }}>
          <p className="gs-muted">© 2026 {BRAND.name} · {tx("Diseñado y creado por Jhonathan Gonzalez Cortes", "Designed and built by Jhonathan Gonzalez Cortes")}</p>
          <p className="gs-muted">{tx("Prohibida su distribución.", "Unauthorized distribution is prohibited.")}</p>
        </footer>
      </main>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, Megaphone, MessageCircle, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { BRAND } from "@/lib/brand";
import { appUrl, appUrlBase } from "@/lib/app-url";

type SectorClave = "restaurantes" | "compraventas" | "talleres" | "tiendas" | "salud" | "belleza" | "general";
type CanalCopy = "meta" | "tiktok" | "whatsapp" | "cierre";
type FormatoFlyer = "cuadrado" | "historia" | "horizontal";
type TemaFlyer = "gosaryc" | "gourmet" | "motor" | "elegante";

type ConfigSector = {
  etiqueta: string;
  titular: string;
  subtitulo: string;
  beneficios: [string, string, string, string];
  dolor: string;
  temaSugerido: TemaFlyer;
};

const SECTORES_MARKETING: Record<SectorClave, ConfigSector> = {
  restaurantes: {
    etiqueta: "Restaurantes y Comidas",
    titular: "VENDE MÁS SIN PERDER UNA COMANDA",
    subtitulo: "POS táctil, Menú QR, comandas automáticas a cocina y Agente WhatsApp IA 24/7.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Impresión térmica 58mm/80mm + comandas automáticas",
      "Agente WhatsApp IA + CRM y Embudo con PQRS",
      "Facturación DIAN, inventario por receta y modo offline",
    ],
    dolor: "pierdes pedidos en hora pico, la cocina se enreda y no sabes cuánto te queda de utilidad real",
    temaSugerido: "gourmet",
  },
  compraventas: {
    etiqueta: "Compraventas y Concesionarios",
    titular: "CONTROLA CADA VEHÍCULO Y SU UTILIDAD REAL",
    subtitulo: "Inventario por placa, costos de alistamiento, alertas SOAT/Tecno y Agente IA que califica clientes 24/7.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Utilidad neta por placa (compra + arreglos vs venta)",
      "Agente WhatsApp IA + CRM Kanban y bandeja PQRS",
      "Cotizaciones, créditos, traspasos y Facturación DIAN",
    ],
    dolor: "se te escapan compradores por WhatsApp y pierdes el control de gastos de alistamiento y papeles vencidos",
    temaSugerido: "motor",
  },
  talleres: {
    etiqueta: "Talleres y Servicio Técnico",
    titular: "ÓRDENES DE TRABAJO Y REPUESTOS AL 100%",
    subtitulo: "Checklist con fotos de recepción, aprobación por WhatsApp, garantías y liquidación a técnicos.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Órdenes con fotos obligatorias y control de garantías",
      "Escáner de códigos de barras + inventario de repuestos",
      "Agente WhatsApp IA 24/7, Caja, DIAN y Nómina Colombia",
    ],
    dolor: "los clientes reclaman sin soporte, se pierden repuestos y te cuesta liquidar comisiones de los técnicos",
    temaSugerido: "gosaryc",
  },
  tiendas: {
    etiqueta: "Tiendas, Supermercados y Ferreterías",
    titular: "COBRA EN SEGUNDOS CON ESCÁNER Y SIN INTERNET",
    subtitulo: "Escáner con cámara móvil o pistola USB, impresión de etiquetas, lotes y caja blindada.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Escáner con cámara móvil o pistola + etiquetas de barras",
      "Impresión térmica 58mm/80mm y descuento automático",
      "Facturación DIAN, Nómina ley colombiana y modo offline",
    ],
    dolor: "las filas se frenan, el inventario nunca cuadra y cuando se va el internet no puedes facturar",
    temaSugerido: "gosaryc",
  },
  salud: {
    etiqueta: "Salud, Clínicas y Consultorios",
    titular: "AGENDA, HISTORIAS Y FACTURACIÓN EN ORDEN",
    subtitulo: "Agenda por especialista, historias clínicas seguras, RIPS, recordatorios WhatsApp y nómina legal.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Agenda sin cruces + recordatorios por WhatsApp",
      "Agente WhatsApp IA + CRM y bandeja PQRS de pacientes",
      "Facturación DIAN, caja y Nómina ley colombiana",
    ],
    dolor: "los pacientes olvidan citas, la cartera se acumula y el papeleo consume horas cada semana",
    temaSugerido: "elegante",
  },
  belleza: {
    etiqueta: "Barberías, Salones y Spa",
    titular: "LLENA TU AGENDA Y LIQUIDA COMISIONES AL INSTANTE",
    subtitulo: "Citas online 24/7, fichas técnicas, control de insumos y comisiones automáticas por estilista.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Agente WhatsApp IA que agenda clientes 24/7",
      "Comisiones por profesional y cierre de caja diario",
      "Impresión térmica, catálogo digital y modo sin internet",
    ],
    dolor: "te escriben de noche para pedir cita y al final de la semana te demoras horas cuadrando comisiones",
    temaSugerido: "elegante",
  },
  general: {
    etiqueta: "Todos los Negocios (+50 Sectores)",
    titular: "TODO TU NEGOCIO EN UN SOLO SISTEMA",
    subtitulo: "POS, Agente WhatsApp IA 24/7, CRM, escáner, impresión térmica, DIAN y Nómina Colombia.",
    beneficios: [
      "30 días de prueba gratis sin compromiso",
      "Controla todo tu negocio por voz: factura, crea inventario, modifica precios y consulta reportes hablando",
      "Agente WhatsApp IA autoconfigurado + CRM y PQRS",
      "Facturación DIAN, Nómina ley colombiana y modo offline",
    ],
    dolor: "llevas cuentas en cuadernos o Excel, pierdes ventas por WhatsApp y no ves tu ganancia real",
    temaSugerido: "gosaryc",
  },
};

const TEMAS: Record<TemaFlyer, { nombre: string; fondo1: string; fondo2: string; acento: string; badge: string }> = {
  gosaryc: { nombre: "Gosaryc Esmeralda", fondo1: "#090D16", fondo2: "#172554", acento: "#10B981", badge: "#3B82F6" },
  gourmet: { nombre: "Gourmet Ámbar", fondo1: "#140D08", fondo2: "#451A03", acento: "#F59E0B", badge: "#10B981" },
  motor: { nombre: "Motor Carmesí", fondo1: "#0F0A10", fondo2: "#450A0A", acento: "#EF4444", badge: "#F59E0B" },
  elegante: { nombre: "Ejecutivo Índigo", fondo1: "#0B0B1A", fondo2: "#2E1065", acento: "#8B5CF6", badge: "#06B6D4" },
};

const FORMATOS: Record<FormatoFlyer, { nombre: string; w: number; h: number }> = {
  cuadrado: { nombre: "Post 1080×1080 (IG / FB)", w: 1080, h: 1080 },
  historia: { nombre: "Historia / TikTok 1080×1920", w: 1080, h: 1920 },
  horizontal: { nombre: "Banner 1200×628 (Anuncio / WA)", w: 1200, h: 628 },
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50";

function generarTextoCampana(
  sector: SectorClave,
  canal: CanalCopy,
  precio: string,
  whatsapp: string,
  enlace: string,
): string {
  const s = SECTORES_MARKETING[sector];
  if (canal === "meta") {
    return [
      `🚀 ¿Tienes un negocio de ${s.etiqueta} y ${s.dolor}?`,
      "",
      `Con ${BRAND.name} organizas TODO desde tu celular o computador (incluso sin internet):`,
      `✅ ${s.beneficios[0]}`,
      `✅ ${s.beneficios[1]}`,
      `✅ ${s.beneficios[2]}`,
      `✅ ${s.beneficios[3]}`,
      "",
      `💡 Empieza HOY con 30 días totalmente GRATIS. Luego licencia anual completa por solo ${precio}.`,
      `👉 Regístrate en 1 minuto aquí: ${enlace}`,
      `📲 O escríbenos directo al WhatsApp: ${whatsapp}`,
    ].join("\n");
  }
  if (canal === "tiktok") {
    return [
      `🎬 GUION TIKTOK / REELS (30-45 seg) — ${s.etiqueta}`,
      "",
      `[0-3s GANCHO EN CÁMARA]:`,
      `"Si tienes un negocio de ${s.etiqueta} y todavía llevas todo en cuaderno o pierdes clientes por WhatsApp, mira esto..."`,
      "",
      `[4-15s DEMOSTRACIÓN EN PANTALLA]:`,
      `"Esto es ${BRAND.name}. Te deja cobrar rápido, imprimir tirillas de 58mm/80mm, escanear códigos con tu celular o pistola y activar un Agente de WhatsApp con IA que atiende y califica clientes 24/7 directo a tu CRM."`,
      "",
      `[16-25s DIFERENCIAL COLOMBIA]:`,
      `"Además funciona sin internet, trae Facturación Electrónica DIAN y liquida Nómina con la ley colombiana vigente."`,
      "",
      `[26-35s LLAMADO A LA ACCIÓN]:`,
      `"Te doy 30 días GRATIS sin compromiso para que lo pruebes en tu negocio. Después cuesta solo ${precio}. Escríbeme al WhatsApp ${whatsapp} o toca el enlace del perfil: ${enlace}"`,
    ].join("\n");
  }
  if (canal === "whatsapp") {
    return [
      `Hola 👋, te saluda el equipo de *${BRAND.name}*.`,
      "",
      `Vi tu negocio de *${s.etiqueta}* y quiero invitarte a probar gratis por *30 días* nuestro sistema todo-en-uno hecho para Colombia:`,
      `• ${s.beneficios[1]}`,
      `• ${s.beneficios[2]}`,
      `• ${s.beneficios[3]}`,
      "",
      `Funciona en celular, web y computador de escritorio (incluso si se cae el internet). Si decides quedarte, la licencia anual es de solo *${precio}*.`,
      "",
      `Puedes activar tus 30 días gratis aquí: ${enlace}`,
      `¿Te gustaría que te ayude a dejarlo listo en 5 minutos?`,
    ].join("\n");
  }
  return [
    `🔥 *Última invitación — 30 días gratis en ${BRAND.name}*`,
    "",
    `Activa hoy tu cuenta para *${s.etiqueta}* sin tarjeta ni compromisos:`,
    `1️⃣ Entra a ${enlace}`,
    `2️⃣ Elige tu tipo de negocio y el sistema se autoconfigura solo (módulos + Agente WhatsApp IA).`,
    `3️⃣ Prueba POS, escáner, etiquetas, impresión térmica, DIAN y Nómina por 30 días completos.`,
    "",
    `💰 Licencia anual después de la prueba: *${precio}* (web + Android + PC).`,
    `📲 Soporte directo por WhatsApp: ${whatsapp}`,
  ].join("\n");
}

function partirLineas(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string[] {
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > maxAncho && actual) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function rectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Estudio de Marketing y Campañas exclusivo para el Superadministrador.
 * Genera textos comerciales por sector y flyers descargables en PNG usando Canvas 2D.
 */
export function EstudioMarketing() {
  const [sector, setSector] = useState<SectorClave>("restaurantes");
  const [canal, setCanal] = useState<CanalCopy>("meta");
  const [formato, setFormato] = useState<FormatoFlyer>("cuadrado");
  const [tema, setTema] = useState<TemaFlyer>("gourmet");

  const [titular, setTitular] = useState(SECTORES_MARKETING.restaurantes.titular);
  const [subtitulo, setSubtitulo] = useState(SECTORES_MARKETING.restaurantes.subtitulo);
  const [precio, setPrecio] = useState("$100.000 COP / año");
  const [etiquetaOferta, setEtiquetaOferta] = useState("30 DÍAS GRATIS · SIN COMPROMISO");
  const [whatsapp, setWhatsapp] = useState<string>(BRAND.supportWhatsappTexto);
  const [webTexto, setWebTexto] = useState(() => appUrlBase().replace(/^https?:\/\//i, ""));
  const [beneficios, setBeneficios] = useState<[string, string, string, string]>(
    SECTORES_MARKETING.restaurantes.beneficios,
  );
  const [copyEditable, setCopyEditable] = useState(() =>
    generarTextoCampana(
      "restaurantes",
      "meta",
      "$100.000 COP / año",
      BRAND.supportWhatsappTexto,
      appUrl("/login?mode=signup"),
    ),
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      logoImgRef.current = img;
    };
    img.src = "/icono-app.svg";
  }, []);

  const aplicarSector = (nuevo: SectorClave) => {
    setSector(nuevo);
    const cfg = SECTORES_MARKETING[nuevo];
    setTitular(cfg.titular);
    setSubtitulo(cfg.subtitulo);
    setBeneficios([...cfg.beneficios]);
    setTema(cfg.temaSugerido);
    setCopyEditable(generarTextoCampana(nuevo, canal, precio, whatsapp, appUrl("/login?mode=signup")));
  };

  const cambiarCanal = (nuevo: CanalCopy) => {
    setCanal(nuevo);
    setCopyEditable(generarTextoCampana(sector, nuevo, precio, whatsapp, appUrl("/login?mode=signup")));
  };

  const regenerarCopy = () => {
    setCopyEditable(generarTextoCampana(sector, canal, precio, whatsapp, appUrl("/login?mode=signup")));
    toast.success("Texto regenerado con los datos actuales.");
  };

  const dibujarFlyer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = FORMATOS[formato];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pal = TEMAS[tema];
    const esHorizontal = formato === "horizontal";
    const esHistoria = formato === "historia";
    const pad = esHorizontal ? 54 : 72;

    // Fondo degradado
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.fondo1);
    grad.addColorStop(1, pal.fondo2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Orbes decorativos
    const orb1 = ctx.createRadialGradient(w * 0.85, h * 0.15, 20, w * 0.85, h * 0.15, w * 0.45);
    orb1.addColorStop(0, `${pal.acento}44`);
    orb1.addColorStop(1, "transparent");
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, w, h);

    const orb2 = ctx.createRadialGradient(w * 0.15, h * 0.88, 20, w * 0.15, h * 0.88, w * 0.4);
    orb2.addColorStop(0, `${pal.badge}38`);
    orb2.addColorStop(1, "transparent");
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, w, h);

    // Cuadrícula sutil de puntos
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let gx = 32; gx < w; gx += 44) {
      for (let gy = 32; gy < h; gy += 44) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }

    // Encabezado: logo + marca + etiqueta sector
    const logoSize = esHorizontal ? 56 : 72;
    if (logoImgRef.current && logoImgRef.current.complete && logoImgRef.current.naturalWidth > 0) {
      ctx.drawImage(logoImgRef.current, pad, pad, logoSize, logoSize);
    } else {
      rectRedondeado(ctx, pad, pad, logoSize, logoSize, 16);
      ctx.fillStyle = pal.acento;
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${Math.round(logoSize * 0.45)}px Inter, system-ui, sans-serif`;
      ctx.fillText("G", pad + logoSize * 0.3, pad + logoSize * 0.66);
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${esHorizontal ? 34 : 42}px Inter, system-ui, sans-serif`;
    ctx.fillText(BRAND.name, pad + logoSize + 18, pad + (esHorizontal ? 34 : 42));
    ctx.fillStyle = "rgba(248,250,252,0.75)";
    ctx.font = `500 ${esHorizontal ? 17 : 20}px Inter, system-ui, sans-serif`;
    ctx.fillText(SECTORES_MARKETING[sector].etiqueta, pad + logoSize + 18, pad + (esHorizontal ? 58 : 70));

    // Píldora de oferta arriba a la derecha (o debajo en historia)
    ctx.font = `700 ${esHorizontal ? 17 : 21}px Inter, system-ui, sans-serif`;
    const pillTexto = etiquetaOferta.trim().toUpperCase() || "30 DÍAS GRATIS";
    const pillW = Math.min(w - pad * 2, ctx.measureText(pillTexto).width + 44);
    const pillH = esHorizontal ? 40 : 48;
    const pillX = esHistoria ? pad : w - pad - pillW;
    const pillY = esHistoria ? pad + logoSize + 36 : pad + 10;
    rectRedondeado(ctx, pillX, pillY, pillW, pillH, 999);
    ctx.fillStyle = pal.acento;
    ctx.fill();
    ctx.fillStyle = "#04110B";
    ctx.fillText(pillTexto, pillX + 22, pillY + (esHorizontal ? 26 : 31));

    // Titular
    let cursorY = esHistoria ? pillY + 120 : esHorizontal ? pad + 125 : pad + 150;
    const anchoTexto = esHorizontal ? w * 0.54 : w - pad * 2;
    const tamTitular = esHistoria ? 68 : esHorizontal ? 44 : 58;
    ctx.fillStyle = "#F8FAFC";
    ctx.font = `900 ${tamTitular}px Inter, system-ui, sans-serif`;
    const lineasTit = partirLineas(ctx, titular, anchoTexto).slice(0, 3);
    for (const l of lineasTit) {
      ctx.fillText(l, pad, cursorY);
      cursorY += tamTitular * 1.12;
    }

    // Subtítulo
    cursorY += esHorizontal ? 6 : 16;
    const tamSub = esHorizontal ? 21 : esHistoria ? 30 : 26;
    ctx.fillStyle = "rgba(226,232,240,0.88)";
    ctx.font = `500 ${tamSub}px Inter, system-ui, sans-serif`;
    const lineasSub = partirLineas(ctx, subtitulo, anchoTexto).slice(0, 3);
    for (const l of lineasSub) {
      ctx.fillText(l, pad, cursorY);
      cursorY += tamSub * 1.35;
    }

    // Tarjeta de beneficios
    const cardX = esHorizontal ? w * 0.58 : pad;
    const cardY = esHorizontal ? pad + 95 : cursorY + (esHistoria ? 44 : 26);
    const cardW = esHorizontal ? w - cardX - pad : w - pad * 2;
    const itemH = esHorizontal ? 70 : esHistoria ? 115 : 74;
    const cardH = itemH * 4 + 34;

    rectRedondeado(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    beneficios.forEach((b, idx) => {
      const by = cardY + 26 + idx * itemH;
      const radio = esHorizontal ? 13 : 16;
      ctx.beginPath();
      ctx.arc(cardX + 34, by + 22, radio, 0, Math.PI * 2);
      ctx.fillStyle = pal.acento;
      ctx.fill();
      ctx.fillStyle = "#04110B";
      ctx.font = `900 ${esHorizontal ? 16 : 20}px Inter, system-ui, sans-serif`;
      ctx.fillText("✓", cardX + 27, by + 29);

      ctx.fillStyle = "#F8FAFC";
      const tamBen = esHorizontal ? 18 : esHistoria ? 28 : 23;
      ctx.font = `600 ${tamBen}px Inter, system-ui, sans-serif`;
      const bLineas = partirLineas(ctx, b, cardW - 84).slice(0, 2);
      bLineas.forEach((bl, li) => {
        ctx.fillText(bl, cardX + 66, by + 28 + li * (tamBen * 1.25));
      });
    });

    // Barra inferior: precio + WhatsApp + web
    const footerH = esHorizontal ? 96 : esHistoria ? 210 : 138;
    const footerY = h - pad - footerH;
    rectRedondeado(ctx, pad, footerY, w - pad * 2, footerH, 22);
    ctx.fillStyle = "rgba(9,13,22,0.82)";
    ctx.fill();
    ctx.strokeStyle = `${pal.acento}99`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = pal.acento;
    ctx.font = `800 ${esHorizontal ? 28 : esHistoria ? 44 : 34}px Inter, system-ui, sans-serif`;
    ctx.fillText(precio || "$100.000 COP / año", pad + 28, footerY + (esHorizontal ? 44 : esHistoria ? 74 : 56));

    ctx.fillStyle = "rgba(248,250,252,0.85)";
    ctx.font = `600 ${esHorizontal ? 18 : esHistoria ? 28 : 22}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      `Web · Android · PC · Modo Offline`,
      pad + 28,
      footerY + (esHorizontal ? 74 : esHistoria ? 120 : 94),
    );

    const contactoTexto = `WhatsApp: ${whatsapp || BRAND.supportWhatsappTexto}`;
    const webLimpia = webTexto.trim() || BRAND.domain;
    ctx.textAlign = esHistoria ? "left" : "right";
    const rx = esHistoria ? pad + 28 : w - pad - 28;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `800 ${esHorizontal ? 22 : esHistoria ? 32 : 26}px Inter, system-ui, sans-serif`;
    ctx.fillText(contactoTexto, rx, footerY + (esHorizontal ? 44 : esHistoria ? 164 : 56));
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    ctx.font = `600 ${esHorizontal ? 17 : esHistoria ? 24 : 20}px Inter, system-ui, sans-serif`;
    ctx.fillText(webLimpia, rx, footerY + (esHorizontal ? 74 : esHistoria ? 196 : 94));
    ctx.textAlign = "left";
  }, [beneficios, etiquetaOferta, formato, precio, sector, subtitulo, tema, titular, webTexto, whatsapp]);

  useEffect(() => {
    dibujarFlyer();
    const t = window.setTimeout(dibujarFlyer, 250);
    return () => window.clearTimeout(t);
  }, [dibujarFlyer]);

  const descargarFlyer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    dibujarFlyer();
    const enlace = document.createElement("a");
    enlace.download = `gosaryc-flyer-${sector}-${formato}.png`;
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();
    toast.success("Flyer descargado en PNG de alta calidad.");
  };

  const copiarCopy = () => {
    void navigator.clipboard.writeText(copyEditable);
    toast.success("Texto de campaña copiado al portapapeles.");
  };

  const abrirWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(copyEditable)}`, "_blank", "noopener");
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 shrink-0 rounded-xl">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl text-foreground">Estudio de Marketing y Campañas</h2>
              <p className="text-sm text-muted-foreground">
                Exclusivo Superadministrador. Genera anuncios, guiones de WhatsApp y flyers PNG listos para redes sociales por sector.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de sector */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTORES_MARKETING) as SectorClave[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => aplicarSector(k)}
              className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                sector === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-glass-border bg-glass/30 text-foreground hover:bg-glass/60"
              }`}
            >
              {SECTORES_MARKETING[k].etiqueta}
            </button>
          ))}
        </div>
      </GlassPanel>

      {/* 1. Generador de textos persuasivos, guiones y anuncios */}
      <GlassPanel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Textos persuasivos, guiones y anuncios
          </h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["meta", "Facebook / Instagram"],
                ["tiktok", "Guion TikTok / Reels"],
                ["whatsapp", "Guion WhatsApp"],
                ["cierre", "Cierre 30 días gratis"],
              ] as Array<[CanalCopy, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => cambiarCanal(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  canal === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-glass-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={10}
          className={`${campo} font-sans text-base leading-relaxed`}
          value={copyEditable}
          onChange={(e) => setCopyEditable(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copiarCopy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar texto
          </button>
          <button
            type="button"
            onClick={abrirWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-4 py-2.5 text-xs font-medium text-foreground hover:bg-glass/60"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Compartir por WhatsApp
          </button>
          <button
            type="button"
            onClick={regenerarCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Regenerar con datos del flyer
          </button>
        </div>
      </GlassPanel>

      {/* 2. Creador de Flyers PNG en Canvas */}
      <GlassPanel className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-medium text-foreground">
            <Palette className="h-4 w-4 text-primary" /> Creador de Flyers e Imágenes Promocionales (PNG)
          </h3>
          <button
            type="button"
            onClick={descargarFlyer}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Descargar Flyer PNG
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block text-xs text-muted-foreground">Formato para red social</span>
                <select
                  className={campo}
                  value={formato}
                  onChange={(e) => setFormato(e.target.value as FormatoFlyer)}
                >
                  {(Object.keys(FORMATOS) as FormatoFlyer[]).map((f) => (
                    <option key={f} value={f}>
                      {FORMATOS[f].nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-muted-foreground">Paleta visual</span>
                <select className={campo} value={tema} onChange={(e) => setTema(e.target.value as TemaFlyer)}>
                  {(Object.keys(TEMAS) as TemaFlyer[]).map((t) => (
                    <option key={t} value={t}>
                      {TEMAS[t].nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="block text-xs text-muted-foreground">Etiqueta superior</span>
              <input className={campo} value={etiquetaOferta} onChange={(e) => setEtiquetaOferta(e.target.value)} />
            </label>

            <label className="block space-y-1">
              <span className="block text-xs text-muted-foreground">Titular principal</span>
              <input className={campo} value={titular} onChange={(e) => setTitular(e.target.value)} />
            </label>

            <label className="block space-y-1">
              <span className="block text-xs text-muted-foreground">Subtítulo</span>
              <input className={campo} value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="block text-xs text-muted-foreground">Precio / oferta</span>
                <input className={campo} value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-muted-foreground">WhatsApp de contacto</span>
                <input className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="block text-xs text-muted-foreground">Sitio web mostrado en el flyer</span>
              <input className={campo} value={webTexto} onChange={(e) => setWebTexto(e.target.value)} />
            </label>

            <div className="space-y-2">
              <span className="block text-xs text-muted-foreground">4 beneficios en el flyer</span>
              {beneficios.map((b, i) => (
                <input
                  key={i}
                  className={campo}
                  value={b}
                  onChange={(e) => {
                    const copia = [...beneficios] as [string, string, string, string];
                    copia[i] = e.target.value;
                    setBeneficios(copia);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center justify-start gap-3">
            <div className="w-full overflow-hidden rounded-xl border border-glass-border bg-black/40 p-2">
              <canvas
                ref={canvasRef}
                className="mx-auto block h-auto max-h-[540px] w-full object-contain"
                aria-label="Vista previa del flyer promocional de Gosaryc"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Resolución real al descargar: {FORMATOS[formato].w} × {FORMATOS[formato].h} px (PNG sin pérdida).
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { generarEAN13 } from "@/lib/escaner-barras";
import { tablaDeModulo } from "@/lib/tablas-modulo";
import { limpiarTexto, LIMITES } from "@/lib/validacion-publica";
import type { VozLlamada, VozModulo } from "@/lib/voz-copiloto.functions";

/** Contexto con el que el copiloto valida SIEMPRE el rol y los módulos de la persona (RLS de la base aplica además). */
export type VozContexto = {
  esAdmin: boolean;
  puede: (modulo: string) => boolean;
  modulos: VozModulo[];
  rutaPanel: string;
  irA: (ruta: string, vista?: string) => void;
};

/** Resultado de preparar una herramienta: se ejecuta ya, o espera confirmación con un resumen exacto. */
export type VozPlan = {
  texto: string;
  /** Si existe, se muestra tarjeta de confirmación con este resumen antes de ejecutar. */
  confirmar?: string;
  ejecutar?: () => Promise<string>;
  enlace?: { url: string; etiqueta: string };
};

const norm = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const limpiarBusqueda = (t: string) => t.replace(/[%_,()\\"'*:<>;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
const METODOS_POS = ["efectivo", "nequi", "daviplata", "tarjeta"];
const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const numero = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const SIN_PERMISO = (que: string): VozPlan => ({ texto: `Tu rol no permite ${que}. Pídeselo a quien administra el negocio.` });

const DESTINOS: Array<{ claves: string[]; ruta?: "panel" | string; vista?: string; admin?: boolean; etiqueta: string }> = [
  { claves: ["pos", "punto de venta", "venta", "ventas", "vender", "facturar", "cuenta"], ruta: "panel", vista: "venta", etiqueta: "el punto de venta" },
  { claves: ["caja", "turno", "arqueo"], ruta: "panel", vista: "caja", etiqueta: "la caja" },
  { claves: ["reporte", "reportes", "informe"], ruta: "panel", vista: "reportes", etiqueta: "los reportes" },
  { claves: ["agente", "whatsapp"], ruta: "panel", vista: "agente", etiqueta: "el agente de WhatsApp" },
  { claves: ["finanzas", "contabilidad", "utilidad"], ruta: "/finanzas", admin: true, etiqueta: "finanzas" },
  { claves: ["nomina", "empleados", "equipo"], ruta: "/equipo-nomina", admin: true, etiqueta: "equipo y nómina" },
  { claves: ["configuracion", "ajustes"], ruta: "/settings", admin: true, etiqueta: "la configuración" },
  { claves: ["asistente", "agente virtual", "ayuda"], ruta: "/asistente-virtual", etiqueta: "el agente virtual" },
];

function resolverModulo(q: string, ctx: VozContexto): VozModulo | null {
  const n = norm(q);
  if (!n) return null;
  return (
    ctx.modulos.find((m) => norm(m.id) === n) ??
    ctx.modulos.find((m) => norm(m.titulo) === n) ??
    ctx.modulos.find((m) => norm(m.titulo).includes(n) || (norm(m.titulo).length > 3 && n.includes(norm(m.titulo)))) ??
    ctx.modulos.find((m) => norm(m.id).includes(n.replace(/ /g, "_"))) ??
    null
  );
}

async function navegar(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  const q = String(args.modulo ?? "");
  const n = norm(q);
  const modulo = resolverModulo(q, ctx);
  if (modulo?.ruta) {
    if (!ctx.esAdmin && !ctx.puede(modulo.id)) return SIN_PERMISO(`abrir ${modulo.titulo}`);
    return { texto: `Abriendo ${modulo.titulo}.`, ejecutar: async () => (ctx.irA(modulo.ruta as string), `Abrí ${modulo.titulo}.`) };
  }
  const d = DESTINOS.find((x) => x.claves.some((c) => n === c || n.includes(c)));
  if (d) {
    if (d.admin && !ctx.esAdmin) return SIN_PERMISO(`abrir ${d.etiqueta}`);
    if (d.ruta === "panel" && !ctx.esAdmin && !["pedidos", "cocina", "mesas", "caja_diaria", "insumos"].some((id) => ctx.puede(id))) {
      return SIN_PERMISO(`abrir ${d.etiqueta}`);
    }
    return {
      texto: `Abriendo ${d.etiqueta}.`,
      ejecutar: async () => (ctx.irA(d.ruta === "panel" ? ctx.rutaPanel : (d.ruta as string), d.vista), `Abrí ${d.etiqueta}.`),
    };
  }
  return { texto: `No encontré el módulo "${q}" en tu negocio.` };
}

async function crear(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  const tipo = String(args.tipo ?? "");
  const nombre = limpiarTexto(String(args.nombre ?? ""), LIMITES.notas > 120 ? 120 : LIMITES.notas);
  if (!nombre) return { texto: "¿Cómo se llama el registro que quieres crear?" };

  if (tipo === "producto") {
    if (!ctx.esAdmin && !ctx.puede("productos")) return SIN_PERMISO("crear productos");
    const precio = numero(args.precio) ?? 0;
    const stock = numero(args.stock);
    const codigo = args.generar_ean13 ? generarEAN13() : limpiarTexto(String(args.codigo_barras ?? ""), 40) || null;
    if (precio < 0 || (stock !== null && stock < 0)) return { texto: "El precio y las existencias no pueden ser negativos." };
    return {
      texto: `Creando el producto ${nombre}.`,
      ejecutar: async () => {
        const { error } = await supabase
          .from("restaurante_productos")
          .insert({ nombre, precio, stock_actual: stock, codigo_barras: codigo });
        if (error) throw new Error("No pude crear el producto. Revisa que no exista ya o tus permisos.");
        return `Creé ${nombre} a ${dinero(precio)}${stock !== null ? ` con ${stock} en existencias` : ""}${codigo ? `, código ${codigo}` : ""}.`;
      },
    };
  }

  if (tipo === "cliente") {
    const telefono = limpiarTexto(String(args.telefono ?? ""), 30) || "0000000";
    return {
      texto: `Creando al cliente ${nombre}.`,
      ejecutar: async () => {
        const { error } = await supabase.from("restaurante_clientes").insert({ nombre, telefono });
        if (error) throw new Error("No pude crear el cliente. Revisa tus permisos.");
        return `Creé al cliente ${nombre}${telefono === "0000000" ? " (sin teléfono, puedes completarlo después)" : ""}.`;
      },
    };
  }

  const modulo = resolverModulo(String(args.modulo ?? ""), ctx);
  if (!modulo) return { texto: `No encontré el módulo "${String(args.modulo ?? "")}" para crear "${nombre}".` };
  if (!ctx.esAdmin && !ctx.puede(modulo.id)) return SIN_PERMISO(`crear registros en ${modulo.titulo}`);
  const tabla = tablaDeModulo(modulo.id);
  const monto = numero(args.monto) ?? 0;
  const cantidad = numero(args.cantidad) ?? 1;
  if (monto < 0 || cantidad < 0) return { texto: "El valor y la cantidad no pueden ser negativos." };
  const detalle = limpiarTexto(String(args.detalle ?? ""), 400) || null;
  const telefono = limpiarTexto(String(args.telefono ?? ""), 30) || null;
  if (tabla === "modulo_registros") {
    return {
      texto: `Creando "${nombre}" en ${modulo.titulo}.`,
      ejecutar: async () => {
        const { error } = await supabase
          .from("modulo_registros")
          .insert({ modulo: modulo.id, titulo: nombre, monto, cantidad, detalle, telefono });
        if (error) throw new Error(`No pude crear el registro en ${modulo.titulo}.`);
        return `Creé "${nombre}" en ${modulo.titulo}.`;
      },
    };
  }
  if (tabla === "fiados") {
    return {
      texto: `Creando cuenta por cobrar de ${nombre}.`,
      ejecutar: async () => {
        const { error } = await supabase.from("fiados").insert({ titulo: nombre, monto, telefono });
        if (error) throw new Error("No pude crear la cuenta por cobrar.");
        return `Creé la cuenta por cobrar de ${nombre} por ${dinero(monto)}.`;
      },
    };
  }
  return {
    texto: `${modulo.titulo} se llena desde su propia pantalla; la abro para ti.`,
    ejecutar: async () => (modulo.ruta ? (ctx.irA(modulo.ruta), `Abrí ${modulo.titulo}.`) : `Abre ${modulo.titulo} para crear el registro.`),
  };
}

async function modificar(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  const objetivo = String(args.objetivo ?? "");
  const buscar = limpiarBusqueda(String(args.buscar ?? ""));
  const campo = String(args.campo ?? "");
  const operacion = String(args.operacion ?? "fijar");
  const valor = String(args.valor ?? "");
  if (!buscar) return { texto: "¿Qué registro quieres modificar?" };

  if (objetivo === "producto") {
    if (campo === "precio" && !ctx.esAdmin) return SIN_PERMISO("cambiar precios");
    if (!ctx.esAdmin && !ctx.puede("productos")) return SIN_PERMISO("modificar productos");
    if (campo !== "precio" && campo !== "stock") return { texto: "En un producto puedo cambiar el precio o las existencias." };
    const v = numero(valor);
    if (v === null || v < 0) return { texto: "No entendí el valor numérico." };
    const { data } = await supabase
      .from("restaurante_productos")
      .select("id,nombre,precio,stock_actual,codigo_barras")
      .or(`nombre.ilike.%${buscar}%,codigo_barras.eq.${buscar}`)
      .limit(6);
    const lista = data ?? [];
    const exacto = lista.find((p) => norm(p.nombre) === norm(buscar) || p.codigo_barras === buscar);
    const p = exacto ?? (lista.length === 1 ? lista[0] : undefined);
    if (!p) {
      return { texto: lista.length === 0 ? `No encontré ningún producto como "${buscar}".` : `Encontré varios: ${lista.map((x) => x.nombre).join(", ")}. Dime cuál.` };
    }
    if (campo === "precio") {
      return {
        texto: `Voy a cambiar el precio de ${p.nombre}.`,
        confirmar: `Cambiar el precio de ${p.nombre}: de ${dinero(Number(p.precio))} a ${dinero(v)}.`,
        ejecutar: async () => {
          const { error } = await supabase.from("restaurante_productos").update({ precio: v }).eq("id", p.id);
          if (error) throw new Error("No pude cambiar el precio.");
          return `${p.nombre} ahora cuesta ${dinero(v)}.`;
        },
      };
    }
    const actual = Number(p.stock_actual ?? 0);
    const nuevo = operacion === "sumar" ? actual + v : operacion === "restar" ? actual - v : v;
    if (nuevo < 0) return { texto: `No puedo dejar ${p.nombre} con existencias negativas (hay ${actual}).` };
    return {
      texto: `Ajustando existencias de ${p.nombre}.`,
      ejecutar: async () => {
        const { error } = await supabase.from("restaurante_productos").update({ stock_actual: nuevo }).eq("id", p.id);
        if (error) throw new Error("No pude ajustar las existencias.");
        return `${p.nombre} ahora tiene ${nuevo} en existencias (antes ${actual}).`;
      },
    };
  }

  const modulo = resolverModulo(String(args.modulo ?? ""), ctx);
  if (!modulo) return { texto: "Dime en qué módulo está el registro." };
  if (!ctx.esAdmin && !ctx.puede(modulo.id)) return SIN_PERMISO(`modificar registros de ${modulo.titulo}`);
  if (tablaDeModulo(modulo.id) !== "modulo_registros") return { texto: `Los registros de ${modulo.titulo} se editan desde su pantalla.` };
  if (campo !== "estado" && campo !== "monto") return { texto: "En un registro puedo cambiar el estado o el valor." };
  if (campo === "monto" && !ctx.esAdmin) return SIN_PERMISO("cambiar valores o comisiones");
  const { data } = await supabase
    .from("modulo_registros")
    .select("id,titulo,estado,monto,detalle")
    .eq("modulo", modulo.id)
    .eq("anulado", false)
    .or(`titulo.ilike.%${buscar}%,detalle.ilike.%${buscar}%`)
    .limit(6);
  const lista = data ?? [];
  const exacto = lista.find((r) => norm(r.titulo) === norm(buscar));
  const r = exacto ?? (lista.length === 1 ? lista[0] : undefined);
  if (!r) return { texto: lista.length === 0 ? `No encontré "${buscar}" en ${modulo.titulo}.` : `Encontré varios: ${lista.map((x) => x.titulo).join(", ")}. Dime cuál.` };
  if (campo === "estado") {
    const estado = limpiarTexto(valor, 40);
    if (!estado) return { texto: "¿A qué estado lo cambio?" };
    return {
      texto: `Cambiando el estado de ${r.titulo}.`,
      ejecutar: async () => {
        const { error } = await supabase.from("modulo_registros").update({ estado }).eq("id", r.id);
        if (error) throw new Error("No pude cambiar el estado.");
        return `${r.titulo} pasó de "${r.estado}" a "${estado}".`;
      },
    };
  }
  const v = numero(valor);
  if (v === null || v < 0) return { texto: "No entendí el valor." };
  return {
    texto: `Voy a cambiar el valor de ${r.titulo}.`,
    confirmar: `Cambiar el valor de ${r.titulo} en ${modulo.titulo}: de ${dinero(Number(r.monto))} a ${dinero(v)}.`,
    ejecutar: async () => {
      const { error } = await supabase.from("modulo_registros").update({ monto: v }).eq("id", r.id);
      if (error) throw new Error("No pude cambiar el valor.");
      return `${r.titulo} ahora vale ${dinero(v)}.`;
    },
  };
}

async function pos(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  const accion = String(args.accion ?? "");
  const puedeVender = ctx.esAdmin || ["pedidos", "caja_diaria"].some((id) => ctx.puede(id));
  if (!puedeVender) return SIN_PERMISO("usar el punto de venta");

  if (accion === "agregar_items" || accion === "preparar_factura") {
    const items = (Array.isArray(args.items) ? args.items : [])
      .map((i) => ({ nombre: limpiarTexto(String((i as { nombre?: unknown }).nombre ?? ""), 120), cantidad: numero((i as { cantidad?: unknown }).cantidad) ?? 1 }))
      .filter((i) => i.nombre);
    return {
      texto: "Preparando la cuenta.",
      ejecutar: async () => {
        const metodoBruto = args.medio_pago === "datafono" ? "tarjeta" : args.medio_pago === "transferencia" ? "nequi" : String(args.medio_pago ?? "");
        window.sessionStorage.setItem(
          "gosaryc:voz-pos",
          JSON.stringify({
            items: items.slice(0, 30).map((i) => ({ nombre: i.nombre, cantidad: Math.min(Math.max(i.cantidad, 0), 1000) })),
            cliente: limpiarTexto(String(args.cliente ?? ""), 120),
            metodo: METODOS_POS.includes(metodoBruto) ? metodoBruto : undefined,
          }),
        );
        ctx.irA(ctx.rutaPanel, "venta");
        window.setTimeout(() => window.dispatchEvent(new Event("gosaryc:voz-pos")), 400);
        const resumen = items.map((i) => `${i.cantidad} ${i.nombre}`).join(", ");
        return `${resumen ? `Agregué ${resumen} a la cuenta. ` : ""}${accion === "preparar_factura" ? "Revisa y toca Registrar para generar la factura o tirilla." : "Revísala en el punto de venta."}`;
      },
    };
  }
  if (accion === "abrir_caja") {
    return { texto: "Abriendo la caja.", ejecutar: async () => (ctx.irA(ctx.rutaPanel, "caja"), "Abrí la caja: indica el monto inicial para abrir el turno.") };
  }
  if (accion === "cerrar_caja") {
    if (!ctx.esAdmin) return SIN_PERMISO("cerrar la caja");
    return {
      texto: "Voy a cerrar la caja.",
      confirmar: "Ir al cierre de caja (arqueo del turno). El conteo final lo confirmas en pantalla.",
      ejecutar: async () => (ctx.irA(ctx.rutaPanel, "caja"), "Abrí el cierre de caja. Registra el conteo para terminar."),
    };
  }
  if (accion === "emitir_factura_dian") {
    if (!ctx.esAdmin) return SIN_PERMISO("emitir facturas electrónicas");
    const m = ctx.modulos.find((x) => /fact/.test(norm(x.id)) || /factur/.test(norm(x.titulo)));
    return {
      texto: "Voy a abrir la facturación electrónica.",
      confirmar: "Abrir facturación electrónica DIAN. La emisión se confirma allí con el resumen de la factura.",
      ejecutar: async () => {
        if (m?.ruta) ctx.irA(m.ruta);
        else ctx.irA("/finanzas");
        return "Abrí la facturación electrónica.";
      },
    };
  }
  return { texto: "No entendí la acción de caja." };
}

async function consultar(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  const c = String(args.consulta ?? "");
  const verVentas = ctx.esAdmin || ["pedidos", "caja_diaria"].some((id) => ctx.puede(id));
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const ejecutar = async (): Promise<string> => {
    if (c === "ventas_dia" || c === "ventas_mes") {
      const { data, error } = await supabase
        .from("restaurante_pedidos")
        .select("total")
        .neq("estado", "cancelado")
        .gte("created_at", c === "ventas_dia" ? inicioDia : inicioMes)
        .limit(2000);
      if (error) throw new Error("No pude consultar las ventas.");
      const total = (data ?? []).reduce((s, p) => s + Number(p.total), 0);
      return `${c === "ventas_dia" ? "Hoy" : "Este mes"} llevas ${dinero(total)} en ${(data ?? []).length} ventas.`;
    }
    if (c === "inventario_bajo") {
      const { data, error } = await supabase.from("restaurante_insumos").select("nombre,stock,stock_minimo,unidad").limit(500);
      if (error) throw new Error("No pude consultar el inventario.");
      const bajos = (data ?? []).filter((i) => Number(i.stock) <= Number(i.stock_minimo));
      return bajos.length === 0
        ? "No hay insumos por debajo del mínimo."
        : `Hay ${bajos.length} por debajo del mínimo: ${bajos.slice(0, 8).map((i) => `${i.nombre} (${i.stock} ${i.unidad})`).join(", ")}.`;
    }
    if (c === "cuentas_por_cobrar") {
      const { data, error } = await supabase.from("fiados").select("titulo,monto,abonado").eq("anulado", false).limit(1000);
      if (error) throw new Error("No pude consultar las cuentas por cobrar.");
      const pend = (data ?? []).map((f) => ({ t: f.titulo, s: Number(f.monto) - Number(f.abonado) })).filter((f) => f.s > 0);
      const total = pend.reduce((s, f) => s + f.s, 0);
      return pend.length === 0 ? "No tienes cuentas por cobrar pendientes." : `Tienes ${dinero(total)} por cobrar en ${pend.length} cuentas. Las mayores: ${pend.sort((a, b) => b.s - a.s).slice(0, 3).map((f) => `${f.t} ${dinero(f.s)}`).join(", ")}.`;
    }
    if (c === "nomina") {
      const { data, error } = await supabase.from("nomina_liquidaciones").select("empleado_nombre,neto,periodo_fin").order("periodo_fin", { ascending: false }).limit(30);
      if (error) throw new Error("No pude consultar la nómina.");
      const lista = data ?? [];
      if (lista.length === 0) return "Todavía no hay liquidaciones de nómina guardadas.";
      const fin = lista[0].periodo_fin;
      const delPeriodo = lista.filter((l) => l.periodo_fin === fin);
      return `La última liquidación (${fin}) suma ${dinero(delPeriodo.reduce((s, l) => s + Number(l.neto), 0))} netos para ${delPeriodo.length} personas.`;
    }
    if (c === "licencia") {
      const { data, error } = await supabase.from("suscripciones_negocio").select("plan,estado,vence_en").maybeSingle();
      if (error || !data) return "No encontré una licencia registrada para este negocio.";
      return `Tu plan ${data.plan} está ${data.estado} y vence el ${String(data.vence_en).slice(0, 10)}.`;
    }
    if (c === "buscar_cliente") {
      const t = limpiarBusqueda(String(args.termino ?? ""));
      if (!t) return "¿Qué cliente busco?";
      const { data, error } = await supabase
        .from("restaurante_clientes")
        .select("nombre,telefono,documento,total_gastado")
        .or(`nombre.ilike.%${t}%,documento.ilike.%${t}%`)
        .limit(5);
      if (error) throw new Error("No pude buscar clientes.");
      return (data ?? []).length === 0
        ? `No encontré clientes como "${t}".`
        : (data ?? []).map((x) => `${x.nombre} (${x.telefono}${x.documento ? `, ${x.documento}` : ""}, compras ${dinero(Number(x.total_gastado))})`).join("; ");
    }
    return "No entendí la consulta.";
  };

  if ((c === "ventas_dia" || c === "ventas_mes" || c === "cuentas_por_cobrar") && !verVentas) return SIN_PERMISO("consultar ventas");
  if ((c === "nomina" || c === "licencia") && !ctx.esAdmin) return SIN_PERMISO(c === "nomina" ? "consultar la nómina" : "consultar la licencia");
  return { texto: "Consultando.", ejecutar };
}

async function whatsapp(args: Record<string, unknown>, ctx: VozContexto): Promise<VozPlan> {
  if (!ctx.esAdmin && !ctx.puede("pedidos") && !ctx.puede("caja_diaria")) return SIN_PERMISO("enviar mensajes a clientes");
  const cliente = limpiarBusqueda(String(args.cliente ?? ""));
  let tel = String(args.telefono ?? "").replace(/\D/g, "");
  if (!tel && cliente) {
    const { data } = await supabase.from("restaurante_clientes").select("nombre,telefono").ilike("nombre", `%${cliente}%`).limit(1);
    tel = (data?.[0]?.telefono ?? "").replace(/\D/g, "");
  }
  if (tel.length < 7) return { texto: `No tengo el teléfono de ${cliente || "ese cliente"}. Dímelo o créalo primero.` };
  if (tel.length === 10) tel = `57${tel}`;
  const monto = numero(args.monto);
  const tipo = String(args.tipo ?? "mensaje");
  const extra = limpiarTexto(String(args.mensaje ?? ""), 300);
  const texto =
    tipo === "cobro"
      ? `Hola ${cliente}, te recordamos tu saldo pendiente${monto ? ` de ${dinero(monto)}` : ""}. ${extra}`.trim()
      : tipo === "cotizacion"
        ? `Hola ${cliente}, te enviamos la cotización${monto ? ` por ${dinero(monto)}` : ""}. ${extra}`.trim()
        : `Hola ${cliente}. ${extra}`.trim();
  return {
    texto: `Dejé listo el mensaje para ${cliente}.`,
    enlace: { url: `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, etiqueta: `Abrir WhatsApp con ${cliente}` },
  };
}

/** Prepara una llamada de herramienta aplicando permisos del rol. Nunca toca datos de otro negocio: la base lo impide por RLS. */
export async function prepararLlamada(l: VozLlamada, ctx: VozContexto): Promise<VozPlan> {
  switch (l.herramienta) {
    case "navegar_a_modulo": return navegar(l.args, ctx);
    case "crear_en_modulo": return crear(l.args, ctx);
    case "modificar_registro": return modificar(l.args, ctx);
    case "ejecutar_pos_y_caja": return pos(l.args, ctx);
    case "consultar_analitica_o_empresa": return consultar(l.args, ctx);
    case "enviar_notificacion_whatsapp": return whatsapp(l.args, ctx);
    default: return { texto: "No reconozco esa orden." };
  }
}

/** Respaldo sin conexión: entiende solo órdenes de navegación por palabras clave. */
export function interpretarLocal(texto: string, ctx: VozContexto): VozLlamada[] {
  const n = norm(texto);
  const m = n.match(/^(abre|abrir|ir a|ve a|ver|muestrame|llevame a)\s+(.+)$/);
  return ctx.modulos.length > 0 && m ? [{ herramienta: "navegar_a_modulo", args: { modulo: m[2] } }] : [];
}

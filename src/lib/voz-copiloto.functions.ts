import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

export type VozModulo = { id: string; titulo: string; ruta?: string };
type VozJson = string | number | boolean | null | VozJson[] | { [k: string]: VozJson };
export type VozLlamada = { herramienta: string; args: { [k: string]: VozJson } };
export type VozRespuesta = { respuesta: string; llamadas: VozLlamada[] };

/** Limpia lo que devuelve la IA: sin etiquetas ni caracteres de control, textos acotados, sin anidar profundo. */
function limpiarJson(v: VozJson, nivel: number): VozJson {
  if (typeof v === "string") return v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean" || v === null) return v;
  if (nivel >= 3) return null;
  if (Array.isArray(v)) return v.slice(0, 30).map((x) => limpiarJson(x, nivel + 1));
  const o: { [k: string]: VozJson } = {};
  for (const [k, x] of Object.entries(v).slice(0, 30)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    o[k.slice(0, 40)] = limpiarJson(x, nivel + 1);
  }
  return o;
}

const str = (descripcion: string) => ({ type: "string", description: descripcion });
const num = (descripcion: string) => ({ type: "number", description: descripcion });

const HERRAMIENTAS = [
  {
    type: "function",
    function: {
      name: "navegar_a_modulo",
      description: "Abre un módulo o pantalla de la plataforma (POS, inventario, caja, reportes, nómina, CRM, finanzas, etc.).",
      parameters: { type: "object", properties: { modulo: str("id o nombre del módulo, de la lista de módulos del negocio") }, required: ["modulo"] },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_en_modulo",
      description: "Crea un registro nuevo: producto (con código de barras EAN-13 si lo piden), cliente, o un registro de cualquier módulo del sector (vehículo, paciente, cita, empleado, lead CRM, gasto, orden...).",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["producto", "cliente", "registro"], description: "producto = catálogo/inventario; cliente = cliente con teléfono; registro = cualquier módulo del sector" },
          modulo: str("id del módulo del sector (solo para tipo registro)"),
          nombre: str("nombre o título del registro"),
          precio: num("precio de venta (producto)"),
          stock: num("existencias iniciales (producto)"),
          codigo_barras: str("código de barras indicado por el usuario"),
          generar_ean13: { type: "boolean", description: "true si piden generar un código de barras EAN-13 nuevo" },
          telefono: str("teléfono del cliente o contacto"),
          monto: num("valor en pesos (registro)"),
          cantidad: num("cantidad (registro)"),
          detalle: str("notas o detalles (placa, motivo, etc.)"),
        },
        required: ["tipo", "nombre"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modificar_registro",
      description: "Busca un registro por nombre, placa, código o número y cambia un dato: precio, sumar/restar stock, estado o etapa del CRM.",
      parameters: {
        type: "object",
        properties: {
          objetivo: { type: "string", enum: ["producto", "registro"], description: "producto del catálogo o registro de un módulo" },
          modulo: str("id del módulo (solo registro)"),
          buscar: str("nombre, placa, código o número que identifica el registro"),
          campo: { type: "string", enum: ["precio", "stock", "estado", "monto"], description: "dato a cambiar" },
          valor: str("nuevo valor (número o texto de estado)"),
          operacion: { type: "string", enum: ["fijar", "sumar", "restar"], description: "fijar por defecto" },
        },
        required: ["objetivo", "buscar", "campo", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ejecutar_pos_y_caja",
      description: "Acciones del punto de venta y la caja: agregar ítems a la cuenta, elegir cliente y medio de pago, preparar factura/tirilla, abrir o cerrar caja.",
      parameters: {
        type: "object",
        properties: {
          accion: { type: "string", enum: ["agregar_items", "preparar_factura", "abrir_caja", "cerrar_caja", "emitir_factura_dian"] },
          items: { type: "array", items: { type: "object", properties: { nombre: str("producto"), cantidad: num("unidades") }, required: ["nombre"] } },
          cliente: str("nombre del cliente"),
          medio_pago: { type: "string", enum: ["efectivo", "nequi", "daviplata", "tarjeta", "transferencia", "datafono"] },
        },
        required: ["accion"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_analitica_o_empresa",
      description: "Consulta datos: ventas del día o del mes, inventario bajo, cuentas por cobrar, nómina, estado de licencia, o busca un cliente/empresa.",
      parameters: {
        type: "object",
        properties: {
          consulta: { type: "string", enum: ["ventas_dia", "ventas_mes", "inventario_bajo", "cuentas_por_cobrar", "nomina", "licencia", "buscar_cliente"] },
          termino: str("nombre o documento a buscar (buscar_cliente)"),
        },
        required: ["consulta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_notificacion_whatsapp",
      description: "Prepara un mensaje de WhatsApp (cotización o cobro) para un cliente; la persona lo revisa y lo envía.",
      parameters: {
        type: "object",
        properties: {
          cliente: str("nombre del cliente"),
          telefono: str("teléfono si lo dictaron"),
          tipo: { type: "string", enum: ["cotizacion", "cobro", "mensaje"] },
          monto: num("valor a cobrar o cotizar"),
          mensaje: str("texto adicional"),
        },
        required: ["cliente", "tipo"],
      },
    },
  },
];

/** Copiloto de voz: convierte lo dictado en llamadas a las 6 herramientas universales (rol, negocio y módulos se resuelven en el servidor). */
export const interpretarVoz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { texto: string; tipoNegocio?: string; modulos?: VozModulo[]; esAdmin?: boolean }) => ({
    texto: typeof d?.texto === "string" ? d.texto.replace(/[\u0000-\u001f\u007f<>]/g, " ").slice(0, 600) : "",
  }))
  .handler(async ({ data, context }): Promise<VozRespuesta> => {
    await assertAiQuota(context.supabase, "voz-copiloto");

    // Verificación de licencia, negocio y permisos exclusivamente en el servidor (nunca se confía en parámetros del navegador).
    const [{ data: ownerId }, { data: accesoRaw }, { data: cfg }] = await Promise.all([
      context.supabase.rpc("mi_negocio_id"),
      context.supabase.rpc("mi_acceso"),
      context.supabase.from("negocio_config").select("tipo_negocio").order("created_at").limit(1).maybeSingle(),
    ]);
    if (ownerId) {
      const { data: licenciaActiva } = await context.supabase.rpc("licencia_activa_para", { p_owner: ownerId });
      if (licenciaActiva === false) {
        throw new Error("Tu licencia está vencida o suspendida. Renueva tu suscripción para usar el copiloto de voz.");
      }
    }

    const acceso = (accesoRaw ?? {}) as { admin?: boolean; modulos?: string[] };
    const esAdminServidor = acceso.admin === true;
    const modulosPermitidos = new Set(Array.isArray(acceso.modulos) ? acceso.modulos : []);
    const giro = resolverTipoNegocio(cfg?.tipo_negocio ?? null);
    const modulosServidor = giro.modulos
      .filter((m) => esAdminServidor || modulosPermitidos.has(m.id))
      .slice(0, 80);

    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const proveedores: Array<{ endpoint: string; key: string; model: string }> = [];
    if (geminiKey) proveedores.push({ endpoint: GEMINI_ENDPOINT, key: geminiKey, model: GEMINI_MODEL });
    if (lovableKey) proveedores.push({ endpoint: GATEWAY, key: lovableKey, model: MODEL });
    if (proveedores.length === 0) throw new Error("El copiloto de voz todavía no está configurado.");

    const texto = typeof data.texto === "string" ? data.texto.trim().slice(0, 600) : "";
    if (!texto) return { respuesta: "No escuché nada. Intenta de nuevo.", llamadas: [] };
    const lista = modulosServidor.map((m) => `- ${m.id}: ${m.titulo}`).join("\n");

    const system = `Eres el Copiloto de Voz de Gosaryc. Controlas el programa de un negocio de tipo "${giro.etiqueta}" a partir de órdenes dictadas en español.
Siempre responde llamando a las herramientas necesarias (puedes llamar varias en orden). No inventes datos que el usuario no dijo: si falta un dato indispensable (por ejemplo el nombre del producto), no llames herramientas y pregunta en una frase corta.
Para "navegar_a_modulo" usa el id exacto de esta lista de módulos habilitados del negocio:
${lista || "(sin módulos)"}
Además existen destinos generales: finanzas, caja, reportes, punto de venta (pos), inventario/productos, nómina, CRM, agente virtual, configuración.
Si la orden es solo una pregunta general sobre el programa, responde en texto breve sin herramientas.
Responde en español de México, en una frase corta. No uses emojis. El rol del usuario es ${esAdminServidor ? "administrador" : "empleado"}.`;

    const body = (model: string) =>
      JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: texto },
        ],
        tools: HERRAMIENTAS,
        tool_choice: "auto",
      });

    type Resp = { choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }> };
    let json: Resp | null = null;
    let ultimo = 0;
    for (const p of proveedores) {
      try {
        const r = await fetch(p.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
          body: body(p.model),
        });
        if (r.ok) {
          json = (await r.json()) as Resp;
          break;
        }
        ultimo = r.status;
        console.error("Copiloto de voz: proveedor falló", p.model, r.status);
      } catch (e) {
        console.error("Copiloto de voz: error de red", e);
      }
    }
    if (!json) {
      if (ultimo === 429) throw new Error("El copiloto está ocupado. Intenta de nuevo en un momento.");
      if (ultimo === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error("El copiloto de voz no respondió. Intenta de nuevo.");
    }

    const msg = json.choices?.[0]?.message;
    const nombres = new Set(HERRAMIENTAS.map((h) => h.function.name));
    const llamadas: VozLlamada[] = [];
    for (const tc of (msg?.tool_calls ?? []).slice(0, 5)) {
      const nombre = tc.function?.name ?? "";
      if (!nombres.has(nombre)) continue;
      try {
        const args = JSON.parse(tc.function?.arguments || "{}") as { [k: string]: VozJson };
        llamadas.push({ herramienta: nombre, args: args && typeof args === "object" && !Array.isArray(args) ? (limpiarJson(args, 0) as { [k: string]: VozJson }) : {} });
      } catch {
        /* argumentos inválidos: se descarta */
      }
    }
    return {
      respuesta: (msg?.content ?? "").trim().slice(0, 500),
      llamadas,
    };
  });

import { supabase } from "@/integrations/supabase/client";

/**
 * Cobros unificados: cualquier cita o servicio cobrado entra directo al
 * turno de Caja abierto (movimientos_turno tipo "venta") y, si el concepto
 * coincide con un producto del inventario comercial, descuenta el stock.
 * Nunca borra nada: solo inserta movimientos y actualiza estados.
 */

const num = (s: string): number => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type Resultado = { ok: boolean; mensaje: string };

/** Busca el turno de caja abierto (el mismo que usa CajaTurnos). */
async function turnoAbierto(): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("turnos_caja")
    .select("id")
    .eq("estado", "abierto")
    .order("abierto_en", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/**
 * Cobra una cita de la agenda general.
 * - Registra la venta en el turno de caja abierto.
 * - Marca la cita como cumplida.
 * - Si el título de la cita coincide con un producto comercial, descuenta 1 unidad.
 */
export async function cobrarCitaAgenda(
  cita: { id: string; titulo: string; cliente: string | null },
  valorTexto: string,
  metodo: string,
): Promise<Resultado> {
  const valor = num(valorTexto);
  if (valor <= 0) return { ok: false, mensaje: "Escribe un valor mayor a cero." };
  const turno = await turnoAbierto();
  if (!turno) return { ok: false, mensaje: "Abre la caja primero para poder cobrar." };

  const concepto = `Agenda: ${cita.titulo}${cita.cliente ? ` · ${cita.cliente}` : ""}`;
  const { error: eMov } = await supabase.from("movimientos_turno").insert({
    turno_id: turno.id,
    tipo: "venta",
    metodo,
    concepto,
    categoria: "Servicios",
    monto: valor,
  });
  if (eMov) return { ok: false, mensaje: "No se pudo registrar el cobro en caja." };

  // Descuento de inventario: coincidencia exacta de nombre (sin borrar nada).
  const { data: prod } = await supabase
    .from("com_productos")
    .select("id, stock")
    .ilike("nombre", cita.titulo.trim().replace(/[\\%_]/g, "\\$&"))
    .limit(1);
  if (prod && prod.length > 0 && prod[0].stock > 0) {
    const nuevo = Math.max(prod[0].stock - 1, 0);
    await supabase.from("com_productos").update({ stock: nuevo }).eq("id", prod[0].id);
    await supabase.from("com_movimientos_stock").insert({
      producto_id: prod[0].id,
      delta: -1,
      motivo: concepto,
      stock_resultante: nuevo,
    });
  }

  const { error: eCita } = await supabase
    .from("agenda_citas")
    .update({ estado: "cumplida" })
    .eq("id", cita.id);
  if (eCita) return { ok: true, mensaje: "Cobro registrado en caja, pero no se pudo marcar la cita." };
  return { ok: true, mensaje: "Cobro registrado: entró a Caja." };
}

/**
 * Registra una venta genérica de un módulo en el turno de caja abierto.
 * Lo usan los rubros cuyo cobro antes quedaba suelto.
 */
export async function registrarVentaEnCaja(
  concepto: string,
  valorTexto: string,
  metodo: string,
): Promise<Resultado> {
  const valor = num(valorTexto);
  if (!concepto.trim()) return { ok: false, mensaje: "Escribe el concepto." };
  if (valor <= 0) return { ok: false, mensaje: "Escribe un valor mayor a cero." };
  const turno = await turnoAbierto();
  if (!turno) return { ok: false, mensaje: "Abre la caja primero para poder cobrar." };
  const { error } = await supabase.from("movimientos_turno").insert({
    turno_id: turno.id,
    tipo: "venta",
    metodo,
    concepto: concepto.trim(),
    monto: valor,
  });
  if (error) return { ok: false, mensaje: "No se pudo registrar la venta en caja." };
  return { ok: true, mensaje: "Venta registrada en Caja." };
}

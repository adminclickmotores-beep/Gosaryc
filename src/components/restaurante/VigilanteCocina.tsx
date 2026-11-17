import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  autoComandaActivada,
  impresionDirectaActivada,
  imprimirComandaCocina,
} from "@/lib/impresion-local";

const CLAVE_IMPRESAS = "gosaryc:comandas-impresas";

function leerImpresas(): Set<string> {
  try {
    const raw = window.localStorage.getItem(CLAVE_IMPRESAS);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function guardarImpresas(ids: Set<string>): void {
  try {
    const arr = [...ids].slice(-300);
    window.localStorage.setItem(CLAVE_IMPRESAS, JSON.stringify(arr));
  } catch { /* modo privado */ }
}

type PedidoNuevo = {
  id: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  modalidad: string | null;
  direccion: string | null;
  barrio: string | null;
  notas: string | null;
  canal: string | null;
  numero_factura: number | null;
  created_at: string;
};

type ItemNuevo = {
  nombre: string | null;
  cantidad: number | null;
};

/**
 * Vigilante de cocina: vive en segundo plano en el panel del negocio y, cada vez
 * que entra un pedido nuevo (POS, mesas, menú público o WhatsApp), imprime la
 * comanda en la impresora de cocina por la API local, sin pedir confirmación.
 * No muestra nada ni interrumpe: si no hay API local (celular), no hace nada.
 */
export function VigilanteCocina({ intervaloMs = 12000 }: { intervaloMs?: number }) {
  const impresas = useRef<Set<string> | null>(null);
  const primeraVez = useRef(true);

  useEffect(() => {
    let vivo = true;
    if (impresas.current === null) impresas.current = leerImpresas();

    const revisar = async () => {
      try {
        if (!impresionDirectaActivada() || !autoComandaActivada()) return;
        const { data } = await supabase
          .from("restaurante_pedidos")
          .select("id, cliente_nombre, cliente_telefono, modalidad, direccion, barrio, notas, canal, numero_factura, created_at")
          .in("estado", ["nuevo"])
          .order("created_at", { ascending: false })
          .limit(15);
        if (!vivo || !data) return;
        const pedidos = data as PedidoNuevo[];
        if (primeraVez.current) {
          // Lo que ya estaba al abrir el panel no se reimprime: solo lo nuevo.
          primeraVez.current = false;
          pedidos.forEach((p) => impresas.current?.add(p.id));
          guardarImpresas(impresas.current ?? new Set());
          return;
        }
        for (const p of pedidos) {
          if (!vivo || impresas.current?.has(p.id)) continue;
          impresas.current?.add(p.id);
          guardarImpresas(impresas.current ?? new Set());
          const { data: items } = await supabase
            .from("restaurante_pedido_items")
            .select("nombre, cantidad")
            .eq("pedido_id", p.id)
            .limit(60);
          if (!vivo) return;
          const lineas = ((items ?? []) as ItemNuevo[]).map((it) => ({
            nombre: it.nombre ?? "Item",
            cantidad: it.cantidad ?? 1,
          }));
          const mesa = p.modalidad === "mesa" && p.notas && p.notas.startsWith("Mesa ") ? p.notas.replace("Mesa ", "") : "";
          await imprimirComandaCocina({
            negocio: "Cocina",
            numero: p.numero_factura != null ? String(p.numero_factura) : p.id.slice(0, 6).toUpperCase(),
            cliente: p.cliente_nombre ?? "Mostrador",
            telefono: p.cliente_telefono ?? "",
            modalidad: p.modalidad ?? "",
            mesa,
            direccion: p.direccion ?? "",
            barrio: p.barrio ?? "",
            notas: p.notas ?? "",
            canal: p.canal === "whatsapp" ? "WhatsApp" : p.canal === "menu" ? "Menú público" : p.canal === "mesa" ? "Mesa" : "Mostrador",
            items: lineas,
            formato: "80mm",
          });
        }
      } catch {
        /* silencioso: la cocina sigue trabajando igual */
      }
    };

    void revisar();
    const t = window.setInterval(() => void revisar(), Math.max(8000, intervaloMs));
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [intervaloMs]);

  return null;
}

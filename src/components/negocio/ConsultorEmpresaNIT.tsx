import { useState } from "react";
import { BadgeCheck, Building2, Copy, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { boton, campo } from "@/components/comercio/ComercioModulos";

/** Tipos de negocio B2B / corporativos donde se muestra el consultor completo. */
const RUBROS_B2B = new Set<string>([
  "profesional", // contabilidad y despachos
  "inmobiliaria",
  "construccion",
  "concesionario",
  "ferreteria",
  "tecnologia",
  "transporte",
  "eventos",
  "taller",
]);

/** ¿Este módulo es la ficha de clientes corporativos / cotizaciones de un negocio B2B? */
export function mostrarConsultorNIT(claveNegocio: string, idModulo: string): boolean {
  const esFicha = idModulo.startsWith("cotizaciones") || idModulo.startsWith("clientes_");
  if (claveNegocio === "salud") return idModulo === "sst_empresas"; // Salud Ocupacional: empresas clientes
  return RUBROS_B2B.has(claveNegocio) && esFicha;
}

const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación oficial de la DIAN (módulo 11). */
export function calcularDV(base: string): number {
  const digitos = base.split("").reverse();
  let suma = 0;
  digitos.forEach((d: string, i: number) => {
    suma += Number(d) * (PESOS[i] ?? 0);
  });
  const r = suma % 11;
  return r > 1 ? 11 - r : r;
}

export type ResultadoNIT = {
  base: string;
  dvIngresado: string | null;
  dvCorrecto: number;
  valido: boolean | null; // null = no se escribió DV para comparar
};

/** Separa el NIT del DV ("900.123.456-7") y calcula el DV correcto. Devuelve null si aún no es un NIT. */
export function analizarNIT(texto: string): ResultadoNIT | null {
  const limpio = texto.trim().replace(/[.\s]/g, "");
  const [parteBase, parteDv] = limpio.split("-");
  const base = (parteBase ?? "").replace(/\D/g, "");
  if (base.length < 6 || base.length > 15) return null;
  const dvIngresado = parteDv !== undefined ? parteDv.replace(/\D/g, "") : null;
  const dvCorrecto = calcularDV(base);
  return {
    base,
    dvIngresado,
    dvCorrecto,
    valido: dvIngresado ? Number(dvIngresado) === dvCorrecto : null,
  };
}

const formatearBase = (b: string) => b.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function Veredicto({ r }: { r: ResultadoNIT }) {
  if (r.valido === false) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-amber-300">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> El dígito de verificación no coincide: para {formatearBase(r.base)} debería ser {r.dvCorrecto}.
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-emerald-300">
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
      {r.valido ? `NIT válido: ${formatearBase(r.base)}-${r.dvCorrecto}` : `Dígito de verificación: ${r.dvCorrecto} (NIT ${formatearBase(r.base)}-${r.dvCorrecto})`}
    </p>
  );
}

type Coincidencia = {
  id: string;
  nombre: string;
  telefono: string;
  correo: string | null;
  documento: string | null;
  digito_verificacion: string | null;
};

type Props = {
  /** "rapido": solo valida el NIT que ya se está escribiendo (modal de Facturación DIAN). "completo": ficha con consulta. */
  modo: "rapido" | "completo";
  /** Solo para el modo rápido: el NIT escrito en el formulario. */
  valor?: string;
};

export function ConsultorEmpresaNIT({ modo, valor = "" }: Props) {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [coincidencias, setCoincidencias] = useState<Coincidencia[] | null>(null);

  if (modo === "rapido") {
    const r = analizarNIT(valor);
    return r ? <Veredicto r={r} /> : null;
  }

  const r = analizarNIT(texto);

  const consultar = async () => {
    if (!r) {
      toast.error("Escribe un NIT de 6 a 15 dígitos.");
      return;
    }
    setBuscando(true);
    const { data, error } = await supabase
      .from("restaurante_clientes")
      .select("id,nombre,telefono,correo,documento,digito_verificacion")
      .ilike("documento", `${r.base}%`)
      .limit(5);
    setBuscando(false);
    if (error) {
      toast.error("No se pudo consultar tus clientes. Inténtalo de nuevo.");
      return;
    }
    setCoincidencias((data ?? []) as Coincidencia[]);
  };

  const copiar = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(`${r.base}-${r.dvCorrecto}`);
      toast.success("NIT con dígito de verificación copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  return (
    <GlassPanel className="mb-3">
      <div className="mb-2 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Consultor de empresa por NIT</h3>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Escribe el NIT del cliente corporativo para validar su dígito de verificación y ver si ya lo tienes registrado.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${campo} min-w-0 flex-1`}
          inputMode="numeric"
          maxLength={20}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setCoincidencias(null);
          }}
          placeholder="Ej. 900.123.456-7"
        />
        <button type="button" className={boton} onClick={() => void consultar()} disabled={buscando}>
          <Search className="h-4 w-4" /> {buscando ? "Consultando…" : "Consultar"}
        </button>
        {r && (
          <button type="button" aria-label="Copiar NIT con dígito" className={boton} onClick={() => void copiar()}>
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
      {r && (
        <div className="mt-2">
          <Veredicto r={r} />
        </div>
      )}
      {coincidencias && (
        <div className="mt-2 space-y-1.5">
          {coincidencias.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ese NIT aún no está en tus clientes registrados.</p>
          ) : (
            coincidencias.map((c: Coincidencia) => (
              <div key={c.id} className="rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-sm">
                <p className="font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {c.documento}
                  {c.digito_verificacion ? `-${c.digito_verificacion}` : ""} · {c.telefono}
                  {c.correo ? ` · ${c.correo}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </GlassPanel>
  );
}

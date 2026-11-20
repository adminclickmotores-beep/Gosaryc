import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import type { Negocio } from "@/hooks/use-negocio";
import type { TipoNegocio } from "@/lib/modulos-negocio";
import { agruparPorTabla } from "@/lib/tablas-modulo";

type Props = {
  negocio: Negocio | null;
  tipo: TipoNegocio;
  onAbrirNegocio: () => void;
  onAbrirMenu: () => void;
};

/** Guía de primeros pasos: lleva al dueño del negocio de la mano. */
export function PasoAPaso({ negocio, tipo, onAbrirNegocio, onAbrirMenu }: Props) {
  const [primerRegistro, setPrimerRegistro] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (tipo.usaPedidos) {
        const { count } = await supabase.from("restaurante_productos").select("id", { count: "exact", head: true });
        if (vivo) setPrimerRegistro((count ?? 0) > 0);
        return;
      }
      // El primer registro puede estar en cualquiera de las tablas propias de los módulos del negocio.
      const conteos = await Promise.all(
        Array.from(agruparPorTabla(tipo.modulos.map((m) => m.id)).entries()).map(async ([tabla, modulos]) => {
          const consulta = supabase.from(tabla as "modulo_registros").select("id", { count: "exact", head: true });
          const { count } = await (tabla === "modulo_registros" ? consulta.in("modulo", modulos) : consulta);
          return count ?? 0;
        }),
      );
      if (vivo) setPrimerRegistro(conteos.some((n) => n > 0));
    })();
    return () => {
      vivo = false;
    };
  }, [tipo]);

  const primerModulo = tipo.modulos.find((m) => m.ruta?.startsWith("/modulos/"));

  const pasos = [
    {
      titulo: "Cuéntanos de tu negocio",
      detalle: "Nombre, teléfono y horarios.",
      hecho: !!negocio && !!negocio.telefono_pedidos && !!negocio.horarios,
      accion: (
        <button onClick={onAbrirNegocio} className="text-sm font-medium text-primary">
          Completar datos
        </button>
      ),
    },
    {
      titulo: "Elige tu tipo de negocio",
      detalle: "Activamos los módulos que necesitas.",
      hecho: !!negocio?.tipo_negocio,
      accion: (
        <button onClick={onAbrirNegocio} className="text-sm font-medium text-primary">
          Elegir tipo
        </button>
      ),
    },
    {
      titulo: tipo.usaPedidos ? "Agrega tu primer producto" : "Crea tu primer registro",
      detalle: tipo.usaPedidos ? "Arma tu carta digital." : "Prueba uno de tus módulos.",
      hecho: primerRegistro,
      accion: tipo.usaPedidos ? (
        <button onClick={onAbrirMenu} className="text-sm font-medium text-primary">
          Ir al menú
        </button>
      ) : primerModulo ? (
        <Link to={primerModulo.ruta as never} className="text-sm font-medium text-primary">
          Abrir módulo
        </Link>
      ) : null,
    },
    {
      titulo: "Instala la app en tu celular",
      detalle: "Ábrela como cualquier aplicación.",
      hecho: false,
      accion: (
        <Link to="/instalar" className="text-sm font-medium text-primary">
          Ver cómo
        </Link>
      ),
    },
  ];

  const hechos = pasos.filter((p) => p.hecho).length;
  const actual = pasos.findIndex((p) => !p.hecho);

  if (hechos >= 3 && actual === 3 && negocio) {
    // Casi todo listo: mostrar solo el último paso de forma discreta.
  }

  // Las cuentas demo lucen como negocios ya operando: sin la tarjeta de primeros pasos.

  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-foreground">Primeros pasos</h2>
          <p className="text-sm text-muted-foreground">
            {hechos === pasos.length ? "¡Todo listo!" : `Llevas ${hechos} de ${pasos.length}. Sigue el siguiente paso.`}
          </p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pasos.map((p, i) => (
          <li
            key={p.titulo}
            className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 ${
              i === actual ? "border-primary bg-accent" : "border-glass-border bg-glass"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                p.hecho ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {p.hecho ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <p className="text-sm font-medium text-foreground">{p.titulo}</p>
            <p className="text-xs text-muted-foreground">{p.detalle}</p>
            {!p.hecho && p.accion}
          </li>
        ))}
      </ol>
    </GlassPanel>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { IconBolt, IconCalendar, IconSettings, IconSpark } from "@/components/ui-custom/CustomIcon";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { negocio } = useNegocio();
  const tipoNegocio = resolverTipoNegocio(negocio?.tipo_negocio);
  const modulos = tipoNegocio.modulos.filter((m) => m.ruta && m.ruta !== "/restaurante");

  // Global ⌘K / ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback((fn: () => void) => {
    setOpen(false);
    // tiny delay so the dialog can unmount cleanly
    setTimeout(fn, 10);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulos de tu negocio…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Rápido">
          <CommandItem onSelect={() => go(() => nav({ to: "/restaurante" }))}>
            <IconBolt size={16} /> {tipoNegocio.panel}
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/calendar" }))}>
            <IconCalendar size={16} /> Agenda
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/asistente-virtual" }))}>
            <IconSpark size={16} /> Agente virtual
          </CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/settings" }))}>
            <IconSettings size={16} /> Configuración
          </CommandItem>
        </CommandGroup>

        {modulos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Módulos">
              {modulos.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`modulo ${m.titulo}`}
                  onSelect={() => go(() => nav({ to: m.ruta as never }))}
                >
                  <m.Icon size={16} /> {m.titulo}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

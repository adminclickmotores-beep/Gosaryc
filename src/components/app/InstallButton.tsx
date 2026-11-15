import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// El navegador dispara este evento una sola vez; lo guardamos para que cualquier botón lo use.
let eventoGuardado: EventoInstalacion | null = null;
const oyentes = new Set<(e: EventoInstalacion | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalacion;
    oyentes.forEach((f) => f(eventoGuardado));
  });
  window.addEventListener("appinstalled", () => {
    eventoGuardado = null;
    oyentes.forEach((f) => f(null));
  });
}

const dentroDeMarco = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export function InstallButton({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    setEvento(eventoGuardado);
    oyentes.add(setEvento);
    return () => {
      oyentes.delete(setEvento);
    };
  }, []);

  const instalar = async () => {
    if (evento) {
      await evento.prompt();
      await evento.userChoice;
      eventoGuardado = null;
      setEvento(null);
      return;
    }
    // La vista previa del editor no permite instalar: se abre en una pestaña normal.
    if (dentroDeMarco()) {
      window.open(window.location.href, "_blank", "noopener");
      toast.info("Se abrió en una pestaña nueva. Ahí pulsa de nuevo «Instalar app».");
      return;
    }
    if (window.location.pathname === "/instalar") {
      toast.info("En el navegador abre el menú y elige «Instalar aplicación» o «Agregar a pantalla de inicio».");
      return;
    }
    nav({ to: "/instalar" });
  };

  return (
    <button
      type="button"
      onClick={instalar}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 ${className}`}
    >
      <Download className="h-4 w-4" /> Instalar app
    </button>
  );
}

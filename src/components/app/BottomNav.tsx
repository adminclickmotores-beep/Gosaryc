import { Link, useLocation } from "@tanstack/react-router";
import { IconHome, IconBolt, IconAudience, IconWorkspace, IconCommand, IconSpark } from "@/components/ui-custom/CustomIcon";

const items = [
  { to: "/restaurante", label: "Pedidos", Icon: IconBolt },
  { to: "/domicilios", label: "Domicilios", Icon: IconAudience },
  { to: "/asistente-virtual", label: "Agente", Icon: IconSpark },
  { to: "/settings", label: "Ajustes", Icon: IconWorkspace },
  { to: "/welcome", label: "Inicio", Icon: IconHome },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-glass-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-6 items-stretch">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              preload="intent"
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[10px] uppercase tracking-wider ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <it.Icon size={20} />
              <span className="w-full truncate text-center">{it.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            window.dispatchEvent(ev);
          }}
          className="flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <IconCommand size={20} />
          <span>⌘K</span>
        </button>
      </div>
    </nav>
  );
}

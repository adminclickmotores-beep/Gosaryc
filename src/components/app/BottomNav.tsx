import { Link, useLocation } from "@tanstack/react-router";
import { IconHome, IconBolt, IconAudience, IconWorkspace, IconCommand } from "@/components/ui-custom/CustomIcon";

const items = [
  { to: "/restaurante", label: "Pedidos", Icon: IconBolt },
  { to: "/domicilios", label: "Domicilios", Icon: IconAudience },
  { to: "/campaigns", label: "Campañas", Icon: IconWorkspace },
  { to: "/dashboard", label: "Inicio", Icon: IconHome },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-glass-border bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = loc.pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to}
              preload="intent"
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <it.Icon size={20} />
              <span>{it.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            window.dispatchEvent(ev);
          }}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          <IconCommand size={20} />
          <span>⌘K</span>
        </button>
      </div>
    </nav>
  );
}

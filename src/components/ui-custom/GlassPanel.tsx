import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tier?: "soft" | "strong" | "inner";
  glow?: boolean;
  /** Profundidad de la sombra. */
  elevation?: "flat" | "raised" | "floating";
  /** Efecto al pasar el cursor (por defecto solo realza el borde). */
  hover?: "none" | "lift";
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, tier = "soft", glow, elevation = "raised", hover = "none", children, ...rest }, ref) => {
    const tierCls = tier === "strong" ? "glass-strong" : tier === "inner" ? "glass-inner" : "glass";
    return (
      <div
        ref={ref}
        className={cn(
          tierCls,
          "card-modern rounded-[22px] min-w-0 break-words",
          elevation === "flat" && "card-flat",
          elevation === "floating" && "card-floating",
          hover === "lift" && "card-lift",
          glow && "ring-glow",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
GlassPanel.displayName = "GlassPanel";

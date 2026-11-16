/**
 * BrandHexLogo — the gradient-border hex monogram from the auth screen,
 * extracted so the sidebar/header use the same mark as /login.
 */
import { motion, useReducedMotion } from "framer-motion";
import { BRAND } from "@/lib/brand";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

interface BrandHexLogoProps {
  /** Height in px. Width is auto (sqrt(3)/2 * height). */
  size?: number;
  className?: string;
  /** Al entrar a la cuenta: el logo gira, crece y pulsa una vez. */
  intro?: boolean;
}

export function BrandHexLogo({ size = 42, className, intro = false }: BrandHexLogoProps) {
  const h = size;
  const w = Math.round((Math.sqrt(3) / 2) * h * 10) / 10;
  const mono = Math.round(h * 0.42);
  const reduce = useReducedMotion();
  const animarEntrada = intro && !reduce;
  return (
    <motion.span
      className={`group relative grid place-items-center shrink-0${className ? ` ${className}` : ""}`}
      style={{ height: h, width: w }}
      aria-label={BRAND.name}
      initial={animarEntrada ? { scale: 0.4, rotate: -180, opacity: 0 } : false}
      animate={
        animarEntrada
          ? { scale: [0.4, 1.12, 1], rotate: [-180, 0, 0], opacity: [0, 1, 1] }
          : { scale: 1, rotate: 0, opacity: 1 }
      }
      transition={animarEntrada ? { duration: 0.9, ease: [0.23, 1, 0.32, 1], times: [0, 0.6, 1] } : { duration: 0 }}
    >
      {/* Outer glow */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-70 blur-md transition-opacity duration-500 group-hover:opacity-100"
        style={{
          clipPath: HEX_CLIP,
          background:
            "conic-gradient(from 140deg, oklch(0.72 0.2 275), oklch(0.78 0.18 340), oklch(0.86 0.14 88), oklch(0.72 0.2 275))",
        }}
      />
      {/* Gradient border hex */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          clipPath: HEX_CLIP,
          background:
            "linear-gradient(140deg, oklch(0.78 0.2 275), oklch(0.82 0.18 340) 50%, oklch(0.88 0.14 88))",
        }}
      />
      {/* Inner dark hex face */}
      <span
        aria-hidden
        className="absolute inset-[1.5px]"
        style={{
          clipPath: HEX_CLIP,
          background:
            "linear-gradient(155deg, oklch(0.18 0.02 270) 0%, oklch(0.1 0.015 270) 100%)",
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.12)",
        }}
      />
      {/* Specular sheen */}
      <span
        aria-hidden
        className="absolute inset-[1.5px] opacity-60"
        style={{
          clipPath: HEX_CLIP,
          background:
            "linear-gradient(160deg, oklch(1 0 0 / 0.18) 0%, transparent 45%)",
        }}
      />
      {/* Monograma G */}
      <svg
        viewBox="0 0 24 24"
        className="relative"
        style={{ height: mono, width: mono }}
        aria-hidden
      >
        <defs>
          <linearGradient id="brand-hex-m-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.05 275)" />
            <stop offset="100%" stopColor="oklch(0.88 0.12 340)" />
          </linearGradient>
        </defs>
        <path
          d="M17.2 7.6A6.6 6.6 0 1 0 18.6 13H12.4"
          fill="none"
          stroke="url(#brand-hex-m-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.span>
  );
}

/**
 * BrandHexLogo — logo oficial Gosaryc (barras + flecha índigo → esmeralda).
 * Se renderiza desde /icono-app.svg para que login, barra lateral,
 * bienvenida y demás pantallas usen siempre la misma marca que la portada.
 */
import { motion, useReducedMotion } from "framer-motion";
import { BRAND } from "@/lib/brand";

interface BrandHexLogoProps {
  /** Alto y ancho en px (el logo nuevo es cuadrado). */
  size?: number;
  className?: string;
  /** Al entrar a la cuenta: el logo gira, crece y pulsa una vez. */
  intro?: boolean;
}

export function BrandHexLogo({ size = 42, className, intro = false }: BrandHexLogoProps) {
  const reduce = useReducedMotion();
  const animarEntrada = intro && !reduce;
  return (
    <motion.img
      src="/icono-app.svg"
      alt={`Logo de ${BRAND.name}`}
      width={size}
      height={size}
      className={`shrink-0 rounded-xl object-cover${className ? ` ${className}` : ""}`}
      style={{ height: size, width: size }}
      initial={animarEntrada ? { scale: 0.4, rotate: -180, opacity: 0 } : false}
      animate={
        animarEntrada
          ? { scale: [0.4, 1.12, 1], rotate: [-180, 0, 0], opacity: [0, 1, 1] }
          : { scale: 1, rotate: 0, opacity: 1 }
      }
      transition={animarEntrada ? { duration: 0.9, ease: [0.23, 1, 0.32, 1], times: [0, 0, 1] } : { duration: 0 }}
    />
  );
}

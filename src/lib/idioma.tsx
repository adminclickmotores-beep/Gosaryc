import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Context, ReactNode } from "react";

export type Idioma = "es" | "en";

const CLAVE_IDIOMA = "gosaryc:idioma";

const TEXTOS = {
  es: {
    nav_sectores: "Soluciones por Sector",
    nav_crm: "CRM Inteligente",
    nav_whatsapp: "WhatsApp IA 24/7",
    nav_demo: "Demostración en Vivo",
    descargar_app: "Descargar app",
    ir_panel: "Ir a mi panel",
    iniciar_sesion: "Iniciar sesión",
    idioma_cambiar: "Cambiar idioma",
    hero_titulo: "Controla cada peso, cada venta y cada turno de tu negocio.",
    hero_probar_demo: "Probar Demo Interactiva",
    hero_crear_cuenta: "Crear Cuenta / 30 Días Gratis",
    banner_titulo: "Lleva tu negocio al siguiente nivel",
    banner_empezar: "Empezar 30 días gratis",
    banner_ya_tengo: "Ya tengo cuenta: iniciar sesión",
    footer_prohibida: "Prohibida su distribución.",
  },
  en: {
    nav_sectores: "Solutions by Sector",
    nav_crm: "Smart CRM",
    nav_whatsapp: "AI WhatsApp 24/7",
    nav_demo: "Live Demo",
    descargar_app: "Download app",
    ir_panel: "Go to my dashboard",
    iniciar_sesion: "Sign in",
    idioma_cambiar: "Change language",
    hero_titulo: "Control every peso, every sale and every shift of your business.",
    hero_probar_demo: "Try the Interactive Demo",
    hero_crear_cuenta: "Create Account / 30 Days Free",
    banner_titulo: "Take your business to the next level",
    banner_empezar: "Start 30 days free",
    banner_ya_tengo: "I already have an account: sign in",
    footer_prohibida: "Unauthorized distribution is prohibited.",
  },
} as const;

export type ClaveTexto = keyof (typeof TEXTOS)["es"];

type ValorIdioma = {
  idioma: Idioma;
  cambiarIdioma: (nuevo: Idioma) => void;
  t: (clave: ClaveTexto) => string;
};

const valorPorDefecto: ValorIdioma = {
  idioma: "es",
  cambiarIdioma: () => undefined,
  t: (clave) => TEXTOS.es[clave],
};

// Contexto estable entre recargas de Vite (ver regla de HMR del proyecto).
const IdiomaContext: Context<ValorIdioma | undefined> =
  (import.meta.hot?.data?.IdiomaContext as Context<ValorIdioma | undefined> | undefined) ??
  createContext<ValorIdioma | undefined>(undefined);
if (import.meta.hot) import.meta.hot.data.IdiomaContext = IdiomaContext;

export function IdiomaProvider({ children }: { children: ReactNode }) {
  // Siempre empieza en español y se lee la preferencia guardada después de montar (sin romper la hidratación).
  const [idioma, setIdioma] = useState<Idioma>("es");

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_IDIOMA);
      if (guardado === "en" || guardado === "es") setIdioma(guardado);
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = idioma === "en" ? "en" : "es";
  }, [idioma]);

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    setIdioma(nuevo);
    try {
      localStorage.setItem(CLAVE_IDIOMA, nuevo);
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);

  const valor = useMemo<ValorIdioma>(
    () => ({
      idioma,
      cambiarIdioma,
      t: (clave) => TEXTOS[idioma][clave] ?? TEXTOS.es[clave],
    }),
    [idioma, cambiarIdioma],
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export function useIdioma(): ValorIdioma {
  return useContext(IdiomaContext) ?? valorPorDefecto;
}

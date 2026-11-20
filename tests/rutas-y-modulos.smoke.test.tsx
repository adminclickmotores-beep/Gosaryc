import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

// Mock mínimo y encadenable de Supabase para que los módulos monten sin tocar red real.
function crearConsultaMock() {
  const resultado = Promise.resolve({ data: [], error: null, count: 0 });
  const cadena: Record<string, unknown> = {
    select: () => cadena,
    insert: () => cadena,
    update: () => cadena,
    upsert: () => cadena,
    delete: () => cadena,
    eq: () => cadena,
    neq: () => cadena,
    in: () => cadena,
    is: () => cadena,
    like: () => cadena,
    ilike: () => cadena,
    gte: () => cadena,
    lte: () => cadena,
    order: () => cadena,
    limit: () => cadena,
    range: () => cadena,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: resultado.then.bind(resultado),
    catch: resultado.catch.bind(resultado),
  };
  return cadena;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => crearConsultaMock(),
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      track: vi.fn().mockResolvedValue(undefined),
      presenceState: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-smoke-1", email: "negocio@ejemplo.com" },
    session: { user: { id: "user-smoke-1", email: "negocio@ejemplo.com" } },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-negocio", () => ({
  useNegocio: () => ({
    negocio: {
      id: "neg-smoke-1",
      owner_id: "user-smoke-1",
      nombre: "Negocio Prueba",
      tipo_negocio: "restaurante",
      moneda: "COP",
      iva_defecto: 19,
      dian_activa: false,
    },
    cargando: false,
    recargar: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-permisos", () => ({
  usePermisos: () => ({
    esDueno: true,
    puede: () => true,
    cargando: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    useSearch: () => ({}),
    useParams: () => ({ id: "com_productos" }),
  }),
  Link: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement("a", props, children),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
}));

async function montarComponente(elemento: React.ReactElement): Promise<string> {
  const contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  const root = createRoot(contenedor);
  await act(async () => {
    root.render(elemento);
  });
  const texto = contenedor.textContent ?? "";
  await act(async () => {
    root.unmount();
  });
  contenedor.remove();
  return texto;
}

describe("Smoke Test: Rutas y Módulos principales de Gosaryc", () => {
  it("compila e importa todas las rutas y módulos críticos sin referencias rotas", async () => {
    const [
      landing,
      login,
      pos,
      comercio,
      dian,
      nomina,
      crmRuta,
      crmComp,
      agenteWa,
      superadmin,
      marketing,
      licencia,
    ] = await Promise.all([
      import("@/routes/index"),
      import("@/routes/login"),
      import("@/components/restaurante/VentaPOS"),
      import("@/components/comercio/ComercioModulos"),
      import("@/components/fiscal/FacturaFiscal"),
      import("@/routes/_app/equipo-nomina"),
      import("@/routes/_app/crm-embudo"),
      import("@/components/crm/CrmEmbudo"),
      import("@/components/restaurante/AgenteWhatsApp"),
      import("@/routes/superadmin"),
      import("@/components/superadmin/EstudioMarketing"),
      import("@/components/app/LicenciaNegocio"),
    ]);

    expect(landing.Route).toBeDefined();
    expect(login.Route).toBeDefined();
    expect(pos.VentaPOS).toBeTypeOf("function");
    expect(comercio.convertir).toBeTypeOf("function");
    expect(comercio.precioDe).toBeTypeOf("function");
    expect(dian.FacturaFiscal).toBeTypeOf("function");
    expect(nomina.Route).toBeDefined();
    expect(crmRuta.Route).toBeDefined();
    expect(crmComp.CrmEmbudo).toBeTypeOf("function");
    expect(agenteWa.AgenteWhatsApp).toBeTypeOf("function");
    expect(superadmin.Route).toBeDefined();
    expect(marketing.EstudioMarketing).toBeTypeOf("function");
    expect(licencia.LicenciaNegocio).toBeTypeOf("function");
  });

  it("valida redirecciones de Login para bloquear open-redirect a dominios externos", async () => {
    const { Route } = await import("@/routes/login");
    const validar = (Route as unknown as { validateSearch: (s: Record<string, unknown>) => { redirect?: string; mode?: string } }).validateSearch;

    expect(validar({ redirect: "/restaurante", mode: "signin" })).toEqual({
      redirect: "/restaurante",
      mode: "signin",
    });
    expect(validar({ redirect: "https://atacante.example/phishing" })).toEqual({});
    expect(validar({ redirect: "//atacante.example/phishing" })).toEqual({});
    expect(validar({ redirect: "/\\atacante.example" })).toEqual({});
  });

  it("renderiza FacturaFiscal, AgenteWhatsApp y EstudioMarketing en DOM sin errores", async () => {
    const [{ FacturaFiscal }, { AgenteWhatsApp }, { EstudioMarketing }] = await Promise.all([
      import("@/components/fiscal/FacturaFiscal"),
      import("@/components/restaurante/AgenteWhatsApp"),
      import("@/components/superadmin/EstudioMarketing"),
    ]);

    const textoFactura = await montarComponente(React.createElement(FacturaFiscal));
    expect(textoFactura.length).toBeGreaterThan(0);

    const textoAgente = await montarComponente(React.createElement(AgenteWhatsApp));
    expect(textoAgente.length).toBeGreaterThan(0);

    const textoMarketing = await montarComponente(React.createElement(EstudioMarketing));
    expect(textoMarketing).toContain("Estudio");
  });
});

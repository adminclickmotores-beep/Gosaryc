/**
 * Modo sin internet: si se cae la conexión, los cambios (ventas, turnos, registros...) se guardan
 * en el equipo y se suben solos, en orden, cuando vuelve el internet. Las pantallas ya cargadas
 * siguen mostrando los últimos datos conocidos.
 */
import { useSyncExternalStore } from "react";

type ItemCola = {
  id: string;
  url: string;
  method: string;
  headers: [string, string][];
  body: string | null;
};

export type EstadoConexion = { enLinea: boolean; pendientes: number; sincronizando: boolean };

const COLA_KEY = "gosaryc:cola-sin-conexion";
const CACHE_LECTURAS = "gosaryc-lecturas";
const REST = "/rest/v1/";

let estado: EstadoConexion = { enLinea: true, pendientes: 0, sincronizando: false };
const oyentes = new Set<() => void>();
let instalado = false;
let fetchOriginal: typeof fetch | null = null;

const cambiarEstado = (parcial: Partial<EstadoConexion>) => {
  estado = { ...estado, ...parcial };
  oyentes.forEach((f) => f());
};

const leerCola = (): ItemCola[] => {
  try {
    const raw = window.localStorage.getItem(COLA_KEY);
    const datos: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(datos) ? (datos as ItemCola[]) : [];
  } catch {
    return [];
  }
};

const guardarCola = (cola: ItemCola[]) => {
  try {
    window.localStorage.setItem(COLA_KEY, JSON.stringify(cola));
  } catch {
    // Sin espacio: se conserva lo que ya estaba guardado.
  }
  cambiarEstado({ pendientes: cola.length });
};

const nuevoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const respuestaSimulada = (item: ItemCola): Response => {
  const h = new Headers(item.headers);
  const prefer = h.get("prefer") ?? "";
  const cabeceras = { "Content-Type": "application/json", "x-sin-conexion": "1" };
  const devuelve = prefer.includes("return=representation");
  if (item.url.includes(`${REST}rpc/`)) return new Response("null", { status: 200, headers: cabeceras });
  if (item.method === "POST") {
    if (!devuelve || !item.body) return new Response(null, { status: 201, headers: { "x-sin-conexion": "1" } });
    try {
      const datos: unknown = JSON.parse(item.body);
      const filas = Array.isArray(datos) ? datos : [datos];
      const unico = (h.get("accept") ?? "").includes("vnd.pgrst.object");
      return new Response(JSON.stringify(unico ? filas[0] : filas), { status: 201, headers: cabeceras });
    } catch {
      return new Response("[]", { status: 201, headers: cabeceras });
    }
  }
  if (devuelve) return new Response("[]", { status: 200, headers: cabeceras });
  return new Response(null, { status: 204, headers: { "x-sin-conexion": "1" } });
};

const urlDe = (input: RequestInfo | URL): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

async function sincronizar() {
  if (!fetchOriginal || estado.sincronizando || !navigator.onLine) return;
  let cola = leerCola();
  if (cola.length === 0) return;
  cambiarEstado({ sincronizando: true });
  let token: string | null = null;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  } catch {
    token = null;
  }
  let subidos = 0;
  let descartados = 0;
  for (const item of cola) {
    const headers = new Headers(item.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      const res = await fetchOriginal(item.url, { method: item.method, headers, body: item.body });
      // Errores del servidor o límite de uso: se reintenta más tarde sin perder nada.
      if (res.status >= 500 || res.status === 408 || res.status === 429 || res.status === 401) break;
      if (!res.ok) {
        descartados++;
        console.warn("[sin-conexion] Un cambio guardado fue rechazado por la base de datos y se descartó.", res.status);
      } else {
        subidos++;
      }
      cola = cola.filter((x) => x.id !== item.id);
      guardarCola(cola);
    } catch {
      break; // Sigue sin conexión real.
    }
  }
  cambiarEstado({ sincronizando: false });
  if (subidos > 0 || descartados > 0) {
    window.dispatchEvent(new CustomEvent("sin-conexion:sincronizado", { detail: { subidos, descartados } }));
  }
}

export function instalarSinConexion() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  fetchOriginal = window.fetch.bind(window);
  const original = fetchOriginal;

  estado = { ...estado, enLinea: navigator.onLine, pendientes: leerCola().length };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = urlDe(input);
    if (!url.includes(REST)) return original(input, init);

    const method = (init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();

    if (method === "GET" || method === "HEAD") {
      try {
        const res = await original(input, init);
        if (res.ok && method === "GET" && "caches" in window) {
          const copia = res.clone();
          caches.open(CACHE_LECTURAS).then((c) => c.put(url, copia)).catch(() => undefined);
        }
        return res;
      } catch (err) {
        if ("caches" in window) {
          const guardada = await caches.open(CACHE_LECTURAS).then((c) => c.match(url)).catch(() => undefined);
          if (guardada) return guardada;
        }
        throw err;
      }
    }

    // Escrituras: solo se encolan las que traen el cuerpo como texto.
    const cuerpo = init?.body;
    if (cuerpo !== undefined && cuerpo !== null && typeof cuerpo !== "string") return original(input, init);

    const encolar = (): Response => {
      const h = new Headers(
        init?.headers ?? (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined),
      );
      const item: ItemCola = {
        id: nuevoId(),
        url,
        method,
        headers: Array.from(h.entries()),
        body: typeof cuerpo === "string" ? cuerpo : null,
      };
      guardarCola([...leerCola(), item]);
      return respuestaSimulada(item);
    };

    if (!navigator.onLine) return encolar();
    // Si ya hay cambios pendientes, los nuevos se ponen detrás para conservar el orden.
    if (leerCola().length > 0) {
      const r = encolar();
      void sincronizar();
      return r;
    }
    try {
      return await original(input, init);
    } catch (err) {
      if (err instanceof TypeError) return encolar();
      throw err;
    }
  };

  window.addEventListener("online", () => {
    cambiarEstado({ enLinea: true });
    void sincronizar();
  });
  window.addEventListener("offline", () => cambiarEstado({ enLinea: false }));
  window.setInterval(() => {
    if (leerCola().length > 0) void sincronizar();
  }, 30000);
  void sincronizar();
}

export function sincronizarAhora() {
  void sincronizar();
}

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};
const instantanea = () => estado;
const servidor: EstadoConexion = { enLinea: true, pendientes: 0, sincronizando: false };

export function useEstadoConexion(): EstadoConexion {
  return useSyncExternalStore(suscribir, instantanea, () => servidor);
}

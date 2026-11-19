import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { prefetchOrgId } from "@/hooks/use-org";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

function sessionsEqual(a: Session | null, b: Session | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.access_token === b.access_token && a.user?.id === b.user?.id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const apply = (s: Session | null) => {
      // Fragile: auth fires both the storage-restored session and the initial
      // auth event. Keep object identity stable and only flip loading once, or
      // the app shell remounts/paints twice during every fresh load.
      setSession((prev) => (sessionsEqual(prev, s) ? prev : s));
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
      // Warm the org cache as soon as we know the user so the first page
      // render doesn't wait on a sequential profile lookup.
      const userId = s?.user?.id ?? null;
      if (userId && lastUserIdRef.current !== userId) {
        lastUserIdRef.current = userId;
        prefetchOrgId(userId);
      } else if (!userId) {
        lastUserIdRef.current = null;
      }
    };

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, s) => {
    // La sesión inicial se valida contra Supabase antes de habilitar el panel.
    if (!initializedRef.current) return;
    apply(s);
  });

    (async () => {
      // "Recordarme" desmarcado: al abrir el navegador de nuevo se cierra la sesión anterior.
      try {
        if (
          localStorage.getItem("gosaly:recordarme") === "0" &&
          !sessionStorage.getItem("gosaly:sesion_activa")
        ) {
          await supabase.auth.signOut();
          localStorage.removeItem("gosaly:recordarme");
        }
      } catch {
        /* almacenamiento bloqueado */
      }
      // Si la lectura de la sesión falla (red, almacenamiento), se sigue sin sesión
      // en vez de quedarse en "Iniciando" para siempre.
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Se valida la sesión contra el servidor: un token revocado, borrado o vencido no entra.
          const { error } = await supabase.auth.getUser();
          const rechazada =
            !!error && typeof error.status === "number" && error.status >= 400 && error.status < 500 && error.status !== 429;
          if (rechazada) {
            await supabase.auth.signOut();
            apply(null);
            return;
          }
        }
        apply(data.session);
      } catch {
        apply(null);
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut,
    }),
    [session, loading, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

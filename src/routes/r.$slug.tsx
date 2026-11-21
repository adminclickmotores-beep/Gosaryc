import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";

const DOMINIOS_APROBADOS = new Set([
  "gosaryc.lovable.app",
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.me",
  "maps.google.com",
  "goo.gl",
  "maps.app.goo.gl",
  "tiktok.com",
  "www.tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
]);

function esDestinoAprobado(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (DOMINIOS_APROBADOS.has(host) || host.endsWith(".gosaryc.lovable.app")) return true;
  const dominioMarca = BRAND.domain.toLowerCase().split(":")[0];
  if (dominioMarca && (host === dominioMarca || host.endsWith(`.${dominioMarca}`))) return true;
  if (typeof window !== "undefined" && window.location?.hostname) {
    const actual = window.location.hostname.toLowerCase();
    if (host === actual) return true;
  }
  return false;
}

export const Route = createFileRoute("/r/$slug")({
  component: ShortLinkRedirect,
});

function ShortLinkRedirect() {
  const { slug } = useParams({ from: "/r/$slug" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("resolve_short_link", { _slug: slug });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setError("Este enlace no existe o fue eliminado.");
        return;
      }
      // Solo se redirige a dominios HTTPS explícitamente aprobados.
      let destino: URL | null = null;
      try {
        destino = new URL(String(row.target_url));
      } catch {
        destino = null;
      }
      if (!destino || !esDestinoAprobado(destino)) {
        setError("Este enlace apunta a un destino no aprobado.");
        return;
      }
      // fire-and-forget click record
      void supabase.rpc("record_link_click", {
        _short_link_id: row.id,
        _org_id: row.org_id,
        _ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        _ref: typeof document !== "undefined" ? document.referrer || "" : "",
      });
      window.location.replace(destino.toString());
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-ink)] px-6 text-foreground">
      <div className="text-center">
        {error ? (
          <>
            <div className="font-display text-3xl">404</div>
            <div className="mt-2 text-sm text-muted-foreground">{error}</div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Redirigiendo…</div>
        )}
      </div>
    </div>
  );
}

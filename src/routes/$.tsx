import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { BRAND } from "@/lib/brand";

/**
 * Catch-all redirect for legacy Marketing Command Center URLs.
 * Consolidates ~12 single-file redirect stubs into one map so the route
 * tree stays small while bookmarks and external docs keep working.
 *
 * Unknown paths render a soft 404 with a link back home.
 */
const LEGACY_REDIRECTS: Record<string, { to: string; search?: Record<string, string> }> = {
  "migrate": { to: "/restaurante" },
  "campaigns": { to: "/restaurante" },
  "funnel": { to: "/restaurante" },
  "tools": { to: "/restaurante" },
  "templates": { to: "/restaurante" },
  "integrations": { to: "/restaurante" },
  "connectors": { to: "/restaurante" },
};

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: `Página no encontrada — ${BRAND.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatchAll,
});

function CatchAll() {
  const { _splat } = Route.useParams();
  const slug = (_splat ?? "").split("/")[0];
  const hit = LEGACY_REDIRECTS[slug];

  if (hit) {
    const props = { to: hit.to, search: hit.search ?? {}, replace: true } as unknown as Parameters<typeof Navigate>[0];
    return <Navigate {...props} />;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[color:var(--color-ink)] text-foreground">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 py-16">
        <GlassPanel className="w-full p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Página no encontrada</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            No encontramos <span className="font-mono text-foreground/80">/{_splat}</span>.
            Puede que se haya movido o ya no exista.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/restaurante"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Volver a mi panel
            </Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

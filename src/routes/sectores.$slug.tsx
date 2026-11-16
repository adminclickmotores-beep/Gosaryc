import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { BRAND } from "@/lib/brand";
import { buscarSector } from "@/lib/sectores";

export const Route = createFileRoute("/sectores/$slug")({
  component: PaginaSector,
  head: ({ params }) => {
    const sector = buscarSector(params.slug);
    const titulo = sector ? `Software para ${sector.label.toLowerCase()} en Colombia — ${BRAND.name}` : BRAND.name;
    const descripcion = sector
      ? `${sector.resumen} Módulos propios para ${sector.label.toLowerCase()}: ${sector.acciones.slice(0, 3).map((a) => a.titulo.toLowerCase()).join(", ")}.`
      : BRAND.description;
    const url = `https://gosaryc.lovable.app/sectores/${params.slug}`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descripcion },
        { name: "keywords", content: sector ? `software para ${sector.label.toLowerCase()}, programa para ${sector.label.toLowerCase()} Colombia, ${sector.label.toLowerCase()} administración, Gosaryc` : "Gosaryc" },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: titulo },
        { name: "twitter:description", content: descripcion },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function PaginaSector() {
  const { slug } = Route.useParams();
  const sector = buscarSector(slug);

  if (!sector) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <GradientMesh />
        <div className="relative z-10 mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-display text-3xl">No encontramos este sector</h1>
          <Link to="/" className="btn-pro mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { Icon } = sector;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GradientMesh />
      <header className="sticky top-0 z-30 border-b border-glass-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <Link to="/" className="btn-ghost-pro inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <Link to="/login" className="btn-pro inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">
            Crear mi cuenta
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8">
        <section className="text-center">
          <span className="icon-chip mx-auto h-16 w-16 rounded-3xl">
            <Icon className="h-8 w-8" />
          </span>
          <p className="text-eyebrow mt-6">Sector</p>
          <h1 className="mt-2 break-words font-display text-4xl sm:text-5xl">{sector.label}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{sector.resumen}</p>
        </section>

        <section className="mt-14">
          <h2 className="text-center font-display text-2xl sm:text-3xl">Qué puedes hacer en {BRAND.name}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {sector.acciones.map((a) => (
              <GlassPanel key={a.titulo} className="flex items-start gap-4 p-5">
                <span className="icon-chip h-10 w-10 shrink-0 rounded-xl">
                  <Check className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{a.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.texto}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <GlassPanel tier="strong" className="p-8 text-center sm:p-10">
            <h2 className="font-display text-2xl sm:text-3xl">Empieza hoy con 30 días de prueba</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Al crear tu cuenta recibes los módulos y los textos pensados para {sector.label.toLowerCase()}.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login" className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/" className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm text-foreground">
                <ArrowLeft className="h-4 w-4" /> Volver al inicio
              </Link>
            </div>
          </GlassPanel>
        </section>
      </main>
    </div>
  );
}

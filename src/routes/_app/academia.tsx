import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, GraduationCap, PlayCircle } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { CURSO_GOSARYC, TOTAL_LECCIONES, type Leccion } from "@/lib/academia-curso";

export const Route = createFileRoute("/_app/academia")({
  head: () => ({ meta: [{ title: "Academia: aprende a usar Gosaryc" }] }),
  component: AcademiaPage,
});

const CLAVE = "academia:completadas";

function AcademiaPage() {
  const [hechas, setHechas] = useState<string[]>([]);
  const [activaId, setActivaId] = useState<string>(CURSO_GOSARYC.modulos[0].lecciones[0].id);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CLAVE);
      if (raw) setHechas(JSON.parse(raw) as string[]);
    } catch {
      /* sin datos guardados */
    }
  }, []);

  const guardar = (lista: string[]) => {
    setHechas(lista);
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch {
      /* ignorar */
    }
  };

  const todas: Leccion[] = CURSO_GOSARYC.modulos.flatMap((m) => m.lecciones);
  const activa = todas.find((l) => l.id === activaId) ?? todas[0];
  const idx = todas.findIndex((l) => l.id === activa.id);
  const completa = hechas.includes(activa.id);
  const progreso = Math.round((hechas.length / TOTAL_LECCIONES) * 100);

  const alternar = () =>
    guardar(completa ? hechas.filter((x) => x !== activa.id) : [...hechas, activa.id]);

  const completarYSeguir = () => {
    if (!completa) guardar([...hechas, activa.id]);
    const sig = todas[idx + 1];
    if (sig) setActivaId(sig.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <GraduationCap className="h-5 w-5" />
          <span className="text-xs font-medium uppercase tracking-wider">Academia</span>
        </div>
        <h1 className="mt-1 font-display text-3xl">{CURSO_GOSARYC.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{CURSO_GOSARYC.subtitulo}</p>
        <div className="mt-4 max-w-md">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {CURSO_GOSARYC.modulos.length} módulos · {TOTAL_LECCIONES} lecciones
            </span>
            <span>{progreso}% completado</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <GlassPanel className="space-y-5 p-4">
          {CURSO_GOSARYC.modulos.map((mod) => (
            <div key={mod.id}>
              <h2 className="text-sm font-medium">{mod.titulo}</h2>
              <ul className="mt-2 space-y-1">
                {mod.lecciones.map((l) => {
                  const ok = hechas.includes(l.id);
                  const sel = l.id === activa.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActivaId(l.id)}
                        className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                          sel ? "bg-glass text-foreground" : "text-muted-foreground hover:bg-glass/50 hover:text-foreground"
                        }`}
                      >
                        {ok ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span className="flex-1 break-words">{l.titulo}</span>
                        <span className="shrink-0 text-xs">{l.minutos} min</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </GlassPanel>

        <GlassPanel className="min-w-0 p-5 sm:p-6">
          {activa.videoUrl ? (
            <div className="mb-5 aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={activa.videoUrl}
                title={activa.titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mb-5 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-glass-border bg-glass/30 text-center">
              <PlayCircle className="h-10 w-10 text-primary/80" />
              <p className="px-4 text-sm text-muted-foreground">Lección guiada paso a paso</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {activa.minutos} min
            </span>
            <span>
              Lección {idx + 1} de {todas.length}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl">{activa.titulo}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activa.descripcion}</p>

          <ol className="mt-5 space-y-3">
            {activa.pasos.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <span className="break-words pt-0.5">{p}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap gap-2">
            {activa.practica && (
              <Link
                to={activa.practica.ruta as never}
                className="inline-flex items-center rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-glass/50"
              >
                {activa.practica.etiqueta}
              </Link>
            )}
            <button
              type="button"
              onClick={alternar}
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-4 py-2 text-sm hover:bg-glass/50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {completa ? "Marcar como pendiente" : "Marcar como vista"}
            </button>
            {idx < todas.length - 1 && (
              <button
                type="button"
                onClick={completarYSeguir}
                className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Siguiente lección
              </button>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

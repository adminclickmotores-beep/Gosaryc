import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { dinero } from "@/components/comercio/ComercioModulos";

type Producto = Tables<"com_productos">;

// Patrones Code39 (angosto=n, ancho=w) para dígitos y * de inicio/fin.
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn", "-": "nwnnnnwnn", ".": "wwnnnnwnn",
  " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

function barrasSvg(codigo: string, alto = 56): { __html: string } {
  const limpio = `*${codigo.toUpperCase().replace(/[^0-9\-. ]/g, "").slice(0, 24) || "0"}*`;
  let x = 0;
  let rects = "";
  for (const ch of limpio) {
    const patron = CODE39[ch] ?? CODE39["0"];
    for (let i = 0; i < 9; i++) {
      const ancho = patron[i] === "w" ? 3 : 1;
      if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${ancho}" height="${alto}" fill="#111"/>`;
      x += ancho + 1;
    }
    x += 2;
  }
  return { __html: `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${alto}" viewBox="0 0 ${x} ${alto}">${rects}</svg>` };
}

/** Generador e impresión de etiquetas de código de barras (carta o rollo térmico). */
export function EtiquetasBarras({ productos }: { productos: Producto[] }) {
  const [elegidos, setElegidos] = useState<Record<string, number>>({});
  const [formato, setFormato] = useState<"carta" | "termica">("carta");

  const lista = useMemo(
    () => productos.filter((p) => p.activo).filter((p) => (elegidos[p.id] ?? 0) > 0),
    [productos, elegidos],
  );

  const alternar = (id: string) =>
    setElegidos((e) => ({ ...e, [id]: (e[id] ?? 0) > 0 ? 0 : 1 }));

  const imprimir = () => {
    if (lista.length === 0) return toast.error("Elige al menos un producto.");
    const etiquetas = lista.flatMap((p) =>
      Array.from({ length: Math.min(elegidos[p.id] ?? 0, 200) }, () => p),
    );
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast.error("Permite las ventanas emergentes para imprimir.");
    const carta = formato === "carta";
    const item = (p: Producto) => {
      const codigo = p.codigo_barras || p.sku || p.id.slice(0, 8).toUpperCase();
      const b = barrasSvg(codigo, carta ? 48 : 44);
      return `<div class="et"><div class="bar">${b.__html}</div>
        <div class="cod">${codigo}</div><div class="nom">${p.nombre.slice(0, 40)}</div>
        <div class="pre">${dinero(p.precio_detal)}</div></div>`;
    };
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>
      *{box-sizing:border-box;font-family:Arial,sans-serif;color:#111}
      body{margin:${carta ? "10mm" : "2mm"}}
      .hoja{display:grid;grid-template-columns:${carta ? "repeat(3,1fr)" : "1fr"};gap:${carta ? "6mm" : "3mm"}}
      .et{border:1px dashed #888;border-radius:3mm;padding:3mm;text-align:center;page-break-inside:avoid}
      .bar svg{max-width:100%;height:auto}.cod{font-family:monospace;font-size:11px;letter-spacing:1px}
      .nom{font-size:11px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pre{font-size:13px;font-weight:bold}
      @media print{body{margin:${carta ? "10mm" : "0"}}}</style></head><body>
      <div class="hoja">${etiquetas.map(item).join("")}</div>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <h2 className="font-medium text-foreground">Etiquetas de código de barras</h2>
      <p className="text-sm text-muted-foreground">Elige productos, escribe cuántas etiquetas de cada uno y imprime en hoja carta o rollo térmico adhesivo.</p>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setFormato("carta")} className={`rounded-lg px-3 py-2 ${formato === "carta" ? "bg-primary text-primary-foreground" : "border border-glass-border text-foreground/80"}`}>Hoja carta</button>
        <button onClick={() => setFormato("termica")} className={`rounded-lg px-3 py-2 ${formato === "termica" ? "bg-primary text-primary-foreground" : "border border-glass-border text-foreground/80"}`}>Rollo térmico</button>
        <button onClick={imprimir} className="ml-auto rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">Imprimir {lista.reduce((s, p) => s + (elegidos[p.id] ?? 0), 0)} etiquetas</button>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {productos.filter((p) => p.activo).slice(0, 300).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={(elegidos[p.id] ?? 0) > 0} onChange={() => alternar(p.id)} aria-label={`Elegir ${p.nombre}`} />
            <span className="min-w-0 flex-1 truncate text-foreground">{p.nombre} · {p.codigo_barras || p.sku || "sin código"}</span>
            {(elegidos[p.id] ?? 0) > 0 && (
              <input
                className="w-20 rounded-lg border border-glass-border bg-glass/40 px-2 py-1.5 text-base"
                inputMode="numeric" aria-label="Cantidad de etiquetas"
                value={String(elegidos[p.id] ?? 1)}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(200, Math.floor(Number(e.target.value) || 0)));
                  setElegidos((x) => ({ ...x, [p.id]: n }));
                }}
              />
            )}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

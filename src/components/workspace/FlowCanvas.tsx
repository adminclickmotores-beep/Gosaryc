import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { IconSpark } from "@/components/ui-custom/CustomIcon";
import { HelpCircle, X, MousePointerClick, Link2, Settings2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type NodeKind = "trigger" | "email" | "wait" | "condition" | "action";

type NodeConfig = {
  audienceId?: string;
  channel?: string;
  scheduleAt?: string;
  variantId?: string;
  handoffNote?: string;
  waitDays?: number;
  conditionExpr?: string;
  triggerEvent?: string;
  actionUrl?: string;
  description?: string;
};

type NodeData = { label: string; kind: NodeKind; config?: NodeConfig };

type FlowState = { nodes: Node<NodeData>[]; edges: Edge[] };

const NODE_PRESETS: { kind: NodeKind; label: string; color: string }[] = [
  { kind: "trigger", label: "Disparador", color: "oklch(0.84 0.18 158)" },
  { kind: "email", label: "Correo", color: "#60a5fa" },
  { kind: "wait", label: "Espera", color: "#f59e0b" },
  { kind: "condition", label: "Condición", color: "#a78bfa" },
  { kind: "action", label: "Acción", color: "#34d399" },
];

const KIND_LABEL: Record<NodeKind, string> = {
  trigger: "Disparador",
  email: "Correo",
  wait: "Espera",
  condition: "Condición",
  action: "Acción",
};

type Audience = { id: string; name: string };
type Variant = { id: string; label: string; channel: string };

export function FlowCanvas({ workspaceId, orgId }: { workspaceId: string; orgId: string }) {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem("flow-tutorial-seen");
    if (!seen) setShowTutorial(true);
  }, []);

  const dismissTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem("flow-tutorial-seen", "1"); } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [flowRes, audRes, varRes] = await Promise.all([
        supabase.from("workspaces").select("workspace_flow").eq("id", workspaceId).single(),
        supabase.from("audiences").select("id,name").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("campaign_variants").select("id,label,channel").eq("workspace_id", workspaceId),
      ]);
      if (cancelled) return;
      if (flowRes.error) {
        toast.error(flowRes.error.message);
      } else {
        const flow = (flowRes.data?.workspace_flow ?? { nodes: [], edges: [] }) as unknown as FlowState;
        setNodes(Array.isArray(flow.nodes) ? flow.nodes : []);
        setEdges(Array.isArray(flow.edges) ? flow.edges : []);
      }
      setAudiences((audRes.data ?? []) as Audience[]);
      setVariants((varRes.data ?? []) as Variant[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, orgId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as Node<NodeData>[]);
    setDirty(true);
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    setDirty(true);
  }, []);
  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge({ ...conn, animated: true }, eds));
    setDirty(true);
  }, []);

  function addNode(preset: (typeof NODE_PRESETS)[number]) {
    const id = `${preset.kind}-${Date.now()}`;
    const x = 80 + Math.random() * 320;
    const y = 80 + Math.random() * 220;
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x, y },
        data: { label: preset.label, kind: preset.kind, config: {} },
        style: nodeStyle(preset.color),
      },
    ]);
    setDirty(true);
  }

  function updateSelectedConfig(patch: Partial<NodeConfig>, label?: string) {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? {
              ...n,
              data: {
                ...n.data,
                label: label ?? n.data.label,
                config: { ...(n.data.config ?? {}), ...patch },
              },
            }
          : n,
      ),
    );
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ workspace_flow: { nodes, edges } as never })
      .eq("id", workspaceId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirty(false);
      toast.success("Flujo guardado");
    }
  }

  const selected = useMemo<Node<NodeData> | null>(
    () => nodes.find((n: Node<NodeData>) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  if (loading) {
    return <GlassPanel className="p-6 text-sm text-muted-foreground">Cargando flujo…</GlassPanel>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Agregar nodo:</span>
        {NODE_PRESETS.map((p) => (
          <button
            key={p.kind}
            onClick={() => addNode(p)}
            className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-background/40 px-3 py-1 text-xs hover:border-primary/40"
          >
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-[11px] text-muted-foreground">Cambios sin guardar</span>}
          <button
            onClick={() => setShowTutorial(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <HelpCircle size={12} /> Cómo funciona
          </button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            <IconSpark size={12} /> {saving ? "Guardando…" : "Guardar flujo"}
          </button>
        </div>
      </div>
      <GlassPanel className="relative overflow-hidden p-0" style={{ height: 560 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_: unknown, n: Node<NodeData>) => setSelectedId(n.id)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="rgba(255,255,255,0.06)" />
          <MiniMap pannable zoomable style={{ background: "rgba(0,0,0,0.4)" }} />
          <Controls showInteractive={false} />
        </ReactFlow>

        {showTutorial && <TutorialOverlay onDismiss={dismissTutorial} />}
      </GlassPanel>
      <p className="text-xs text-muted-foreground">
        Haz clic en un nodo para configurarlo. Arrastra desde el borde de un nodo para conectarlo. Presiona Retroceso para borrar el nodo o la conexión seleccionada.
      </p>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{KIND_LABEL[selected.data.kind as NodeKind]}</SheetTitle>
                <SheetDescription>Configura cómo se comporta este paso al ejecutarse.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Etiqueta</Label>
                  <Input
                    value={selected.data.label}
                    onChange={(e) => updateSelectedConfig({}, e.target.value)}
                  />
                </div>
                <NodeConfigForm
                  kind={selected.data.kind}
                  config={selected.data.config ?? {}}
                  audiences={audiences}
                  variants={variants}
                  onChange={(patch) => updateSelectedConfig(patch)}
                />
                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea
                    rows={3}
                    value={selected.data.config?.description ?? ""}
                    onChange={(e) => updateSelectedConfig({ description: e.target.value })}
                    placeholder="Algo que el equipo debe saber sobre este paso"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setSelectedId(null)}>
                    Listo
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Guardando…" : "Guardar flujo"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function nodeStyle(color: string) {
  return {
    background: "rgba(20,20,28,0.85)",
    color: "white",
    border: `1px solid ${color}`,
    borderRadius: 10,
    padding: 8,
    fontSize: 12,
    minWidth: 120,
  } as const;
}

function NodeConfigForm({
  kind,
  config,
  audiences,
  variants,
  onChange,
}: {
  kind: NodeKind;
  config: NodeConfig;
  audiences: Audience[];
  variants: Variant[];
  onChange: (patch: Partial<NodeConfig>) => void;
}) {
  if (kind === "trigger") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Evento disparador</Label>
          <Select
            value={config.triggerEvent ?? ""}
            onValueChange={(v) => onChange({ triggerEvent: v })}
          >
            <SelectTrigger><SelectValue placeholder="Elige un evento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace.scheduled">Proyecto programado</SelectItem>
              <SelectItem value="workspace.live">Proyecto publicado</SelectItem>
              <SelectItem value="list.created">Lista creada</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Audiencia</Label>
          <Select value={config.audienceId ?? ""} onValueChange={(v) => onChange({ audienceId: v })}>
            <SelectTrigger><SelectValue placeholder="Elige una audiencia" /></SelectTrigger>
            <SelectContent>
              {audiences.length === 0 && <SelectItem value="__none" disabled>Aún no hay audiencias</SelectItem>}
              {audiences.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </>
    );
  }
  if (kind === "email") {
    return (
      <>
        <div className="space-y-1.5">
          <Label>Canal</Label>
          <Select value={config.channel ?? "email"} onValueChange={(v) => onChange({ channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Correo</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="in_app">En la app</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Variante</Label>
          <Select value={config.variantId ?? ""} onValueChange={(v) => onChange({ variantId: v })}>
            <SelectTrigger><SelectValue placeholder="Elige una variante" /></SelectTrigger>
            <SelectContent>
              {variants.length === 0 && <SelectItem value="__none" disabled>Aún no hay variantes</SelectItem>}
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label} · {v.channel}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fecha de envío</Label>
          <Input
            type="datetime-local"
            value={config.scheduleAt ?? ""}
            onChange={(e) => onChange({ scheduleAt: e.target.value })}
          />
        </div>
      </>
    );
  }
  if (kind === "wait") {
    return (
      <div className="space-y-1.5">
        <Label>Espera (días)</Label>
        <Input
          type="number"
          min={0}
          value={config.waitDays ?? ""}
          onChange={(e) => onChange({ waitDays: Number(e.target.value) })}
        />
      </div>
    );
  }
  if (kind === "condition") {
    return (
      <div className="space-y-1.5">
        <Label>Condición</Label>
        <Textarea
          rows={3}
          value={config.conditionExpr ?? ""}
          onChange={(e) => onChange({ conditionExpr: e.target.value })}
          placeholder="Ej. abrió_correo == true && clic == false"
        />
      </div>
    );
  }
  // action
  return (
    <>
      <div className="space-y-1.5">
        <Label>URL de acción / webhook</Label>
        <Input
          value={config.actionUrl ?? ""}
          onChange={(e) => onChange({ actionUrl: e.target.value })}
          placeholder="https://hooks.example.com/..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Nota de traspaso</Label>
        <Textarea
          rows={2}
          value={config.handoffNote ?? ""}
          onChange={(e) => onChange({ handoffNote: e.target.value })}
          placeholder="Contexto para el sistema o compañero que lo recibe"
        />
      </div>
    </>
  );
}

const TUTORIAL_STEPS = [
  {
    Icon: MousePointerClick,
    title: "Agrega un paso",
    body: "Toca cualquier botón de arriba (Disparador, Correo, Espera, Condición o Acción) para colocarlo en el lienzo.",
  },
  {
    Icon: Link2,
    title: "Conéctalos",
    body: "Arrastra desde el punto pequeño del borde de un nodo hasta otro nodo para definir el orden de los eventos.",
  },
  {
    Icon: Settings2,
    title: "Configura cada paso",
    body: "Haz clic en un nodo para abrir su panel de configuración: elige audiencia, variante, tiempo de espera o webhook.",
  },
  {
    Icon: Save,
    title: "Guarda tu flujo",
    body: "Pulsa Guardar flujo cuando termines. Retroceso elimina el nodo o la conexión seleccionada.",
  },
];

function TutorialOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-glass-border bg-background/90 p-6 shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-glass/50 hover:text-foreground"
          aria-label="Cerrar tutorial"
        >
          <X size={14} />
        </button>
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Inicio rápido</div>
          <h3 className="mt-1 font-display text-2xl">Arma tu flujo en 4 pasos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Un flujo es el orden de lo que pasa: quién recibe qué, cuándo y qué dispara el siguiente paso.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {TUTORIAL_STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-3 rounded-xl border border-glass-border bg-glass/30 p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.Icon size={16} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-sm">{s.title}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Consejo: empieza con un <span className="text-foreground">Disparador</span>, y luego agrega un{" "}
            <span className="text-foreground">Correo</span>.
          </span>
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Entendido, a construir
          </button>
        </div>
      </div>
    </div>
  );
}

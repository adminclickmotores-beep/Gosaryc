import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPublicHttpUrl } from "@/lib/webhook-url";

const ALLOWED_EVENTS = new Set(["workspace.status_changed"]);
const MAX_PAYLOAD_BYTES = 8_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dispatchWorkspaceEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { workspaceId: string; orgId?: string; event: string; payload: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.workspaceId)) {
      throw new Error("Invalid workspaceId");
    }
    if (!ALLOWED_EVENTS.has(data.event)) throw new Error("Unsupported event");
    if (!data.payload || typeof data.payload !== "object" || Array.isArray(data.payload)) {
      throw new Error("Invalid payload");
    }
    if (JSON.stringify(data.payload).length > MAX_PAYLOAD_BYTES) throw new Error("Payload too large");
    const sb = context.supabase;

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("default_org_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    const orgId = profile?.default_org_id as string | null;
    if (!orgId) throw new Error("No active organization.");

    // Workspace must exist in the caller's org (RLS also scopes this read).
    const { data: ws, error: wsError } = await sb
      .from("workspaces")
      .select("id,org_id,name,status")
      .eq("id", data.workspaceId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (wsError) throw new Error(wsError.message);
    if (!ws) throw new Error("Workspace not found");

    // NOTE: `secret` is column-REVOKEd from `authenticated` on purpose —
    // selecting it here would fail with permission denied. Signing happens
    // through the `dispatch_hmac` SECURITY DEFINER function instead.
    const { data: hooks, error: hooksError } = await sb
      .from("webhook_subscriptions")
      .select("id,url,events,active")
      .eq("org_id", orgId)
      .or(`workspace_id.eq.${data.workspaceId},workspace_id.is.null`);
    if (hooksError) throw new Error(hooksError.message);

    const targets = (hooks ?? []).filter(
      (h) => h.active && (h.events as string[]).includes(data.event),
    );

    const body = JSON.stringify({
      event: data.event,
      workspace_id: data.workspaceId,
      org_id: orgId,
      // Payload is built server-side from the stored workspace; only the
      // previous status (a short stage key) is taken from the caller.
      payload: {
        from:
          typeof data.payload.from === "string" && /^[a-z0-9_-]{1,64}$/i.test(data.payload.from)
            ? data.payload.from
            : null,
        to: ws.status,
        name: ws.name,
      },
      sent_at: new Date().toISOString(),
    });

    const results = await Promise.allSettled(
      targets.map(async (h) => {
        assertPublicHttpUrl(h.url);
        const { data: sig, error: sigError } = await sb.rpc("dispatch_hmac", {
          _subscription_id: h.id,
          _body: body,
        });
        if (sigError || typeof sig !== "string") {
          throw new Error(sigError?.message ?? "Could not sign webhook payload");
        }
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": data.event,
            "X-Webhook-Signature": `sha256=${sig}`,
          },
          body,
        });
        // Only the status code is surfaced — never the response body.
        return { id: h.id, status: res.status };
      }),
    );

    return {
      delivered: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  });

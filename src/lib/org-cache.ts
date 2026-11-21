import { supabase } from "@/integrations/supabase/client";

type OrgCache = {
  userId: string | null;
  orgId: string | null;
  loaded: boolean;
  promise: Promise<string | null> | null;
};

export type OrgSnapshot = {
  userId: string | null;
  orgId: string | null;
  loaded: boolean;
};

const orgCache: OrgCache = {
  userId: null,
  orgId: null,
  loaded: false,
  promise: null,
};

const listeners = new Set<() => void>();
let orgSnapshot: OrgSnapshot = { userId: null, orgId: null, loaded: false };
export const EMPTY_ORG_SNAPSHOT: OrgSnapshot = { userId: null, orgId: null, loaded: false };

function notifyOrgListeners() {
  orgSnapshot = {
    userId: orgCache.userId,
    orgId: orgCache.orgId,
    loaded: orgCache.loaded,
  };
  listeners.forEach((listener) => listener());
}

export function getOrgSnapshot(): OrgSnapshot {
  return orgSnapshot;
}

export function subscribeOrg(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cachedOrgIdFor(userId: string | null): string | null {
  return userId && orgCache.userId === userId && orgCache.loaded ? orgCache.orgId : null;
}

export async function loadOrgId(userId: string): Promise<string | null> {
  if (orgCache.userId !== userId) {
    orgCache.userId = userId;
    orgCache.orgId = null;
    orgCache.loaded = false;
    orgCache.promise = null;
  }

  if (orgCache.loaded) return orgCache.orgId;
  if (orgCache.promise) return orgCache.promise;

  orgCache.promise = Promise.resolve(
    supabase.from("profiles").select("default_org_id").eq("id", userId).single(),
  )
    .then(({ data, error }) => {
      if (orgCache.userId !== userId) return null;
      if (error) {
        orgCache.promise = null;
        return null;
      }
      orgCache.orgId = data?.default_org_id ?? null;
      orgCache.loaded = true;
      orgCache.promise = null;
      notifyOrgListeners();
      return orgCache.orgId;
    })
    .catch(() => {
      if (orgCache.userId === userId) {
        orgCache.promise = null;
      }
      return null;
    });

  return orgCache.promise;
}

/** Pre-carga el org_id antes de montar las páginas. Seguro de llamar varias veces. */
export function prefetchOrgId(userId: string | null) {
  if (!userId) return;
  void loadOrgId(userId);
}

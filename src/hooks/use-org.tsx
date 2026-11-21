import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  EMPTY_ORG_SNAPSHOT,
  cachedOrgIdFor,
  getOrgSnapshot,
  loadOrgId,
  prefetchOrgId,
  subscribeOrg,
} from "@/lib/org-cache";

/** Returns the user's default organization id (or null until loaded). */
export function useOrgId() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snapshot = useSyncExternalStore(
    subscribeOrg,
    getOrgSnapshot,
    () => EMPTY_ORG_SNAPSHOT,
  );

  useEffect(() => {
    if (!userId) return;
    void loadOrgId(userId);
  }, [userId]);

  if (!userId) return null;
  if (snapshot.userId === userId && snapshot.loaded) return snapshot.orgId;
  return cachedOrgIdFor(userId);
}

export { prefetchOrgId };

import { createFileRoute } from "@tanstack/react-router";
import { CrmEmbudo } from "@/components/crm/CrmEmbudo";

export const Route = createFileRoute("/_app/crm-embudo")({
  head: () => ({ meta: [{ title: "CRM y Embudo IA" }] }),
  component: CrmEmbudo,
});

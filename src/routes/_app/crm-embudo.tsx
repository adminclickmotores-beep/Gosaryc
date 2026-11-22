import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CrmEmbudo } from "@/components/crm/CrmEmbudo";
import { TasadorMercado } from "@/components/vehiculos/TasadorMercado";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio, CRM_AUTOMATICO } from "@/lib/modulos-negocio";

export const Route = createFileRoute("/_app/crm-embudo")({
  head: () => ({ meta: [{ title: "CRM y Embudo IA" }] }),
  component: CrmEmbudoRuta,
});

/** El CRM solo se abre en los negocios que lo tienen activo; los demás van al panel. */
function CrmEmbudoRuta() {
  const { negocio } = useNegocio();
  const nav = useNavigate();
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const permitido = CRM_AUTOMATICO.includes(tipo.clave) || negocio?.crm_activo === true;

  useEffect(() => {
    if (negocio && !permitido) nav({ to: "/dashboard", replace: true });
  }, [negocio, permitido, nav]);

  if (!negocio || !permitido) return null;
  const vende = tipo.clave === "concesionario" || tipo.clave === "compraventa";
  return (
    <>
      {vende && <TasadorMercado />}
      <CrmEmbudo />
    </>
  );
}

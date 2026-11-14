import { createFileRoute, redirect } from "@tanstack/react-router";

// El inicio de la app es el panel del negocio; esta ruta solo redirige.
export const Route = createFileRoute("/_app/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/restaurante", replace: true });
  },
});

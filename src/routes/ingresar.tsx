import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ingresar")({
  beforeLoad: () => {
    throw redirect({ to: "/login", search: { mode: "signin" } });
  },
});

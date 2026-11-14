import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

import { instalarSinConexion } from "./lib/sin-conexion";

instalarSinConexion();

startTransition(() => {
  hydrateRoot(document, <StartClient />);
});
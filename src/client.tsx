import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

import { instalarSinConexion } from "./lib/sin-conexion";

instalarSinConexion();

// Quita la insignia "Edit with Lovable" aunque la inyecten después de cargar.
const quitarInsignia = () => {
  document
    .querySelectorAll<HTMLElement>(
      '#lovable-badge, [id*="lovable-badge" i], [class*="lovable-badge" i], a[href*="utm_source=lovable-badge"], a[href*="lovable.dev"][href*="badge"], a[href*="lovable.dev/?utm"]',
    )
    .forEach((el) => {
      const raiz = el.closest("aside, #lovable-badge") ?? el;
      raiz.remove();
    });
};
quitarInsignia();
new MutationObserver(quitarInsignia).observe(document.documentElement, { childList: true, subtree: true });

startTransition(() => {
  hydrateRoot(document, <StartClient />);
});
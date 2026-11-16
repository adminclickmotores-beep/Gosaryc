function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Resume el error en una línea corta y segura para mostrarla en la pantalla de falla. */
export function detalleDeError(error: unknown): string {
  try {
    if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 400);
    if (typeof error === "string") return error.slice(0, 400);
    if (error && typeof error === "object") return JSON.stringify(error).slice(0, 400);
  } catch {
    /* sin detalle */
  }
  return "";
}

export function renderErrorPage(detalle?: string): string {
  const bloqueDetalle = detalle
    ? `<p style="font:12px/1.4 ui-monospace,monospace;color:#6b7280;word-break:break-word;background:#f3f4f6;border-radius:6px;padding:0.5rem;text-align:left">${escapar(detalle)}</p>`
    : "";
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Esta página no cargó</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página no cargó</h1>
      <p>Algo salió mal de nuestro lado. Puedes recargar la página o volver al inicio.</p>
      ${bloqueDetalle}
      <div class="actions">
        <button class="primary" onclick="location.reload()">Intentar de nuevo</button>
        <a class="secondary" href="/">Ir al inicio</a>
      </div>
    </div>
    <script>
      // Si la falla es pasajera (por ejemplo, mientras se publica una versión nueva),
      // la página se vuelve a pedir sola unas pocas veces antes de rendirse.
      (function () {
        try {
          var clave = "gosaryc:reintentos_error";
          var n = Number(sessionStorage.getItem(clave) || "0");
          if (n < 3) {
            sessionStorage.setItem(clave, String(n + 1));
            setTimeout(function () { location.reload(); }, 4000 * (n + 1));
          } else {
            sessionStorage.removeItem(clave);
          }
        } catch (e) {}
      })();
    </script>
  </body>
</html>`;
}

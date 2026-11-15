// Gosaryc - envoltorio de escritorio (Electron).
// Abre la web publicada de Gosaryc dentro de una ventana propia.
// Para apuntar a otra dirección: GOSARYC_URL=https://tu-dominio.com npm run iniciar
const { app, BrowserWindow, shell } = require("electron");

const URL_APP = (process.env.GOSARYC_URL || "https://gosaryc.lovable.app").replace(/\/+$/, "");
const ORIGEN_APP = new URL(URL_APP).origin;

// Pantalla que se muestra si no hay internet o la web no responde.
const PAGINA_SIN_CONEXION = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="es"><meta charset="utf-8"><title>Gosaryc</title>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b14;color:#f5f5f7;font-family:system-ui,sans-serif;text-align:center">
<div style="max-width:380px;padding:24px">
<h1 style="font-size:22px;margin:0 0 8px">No hay conexión</h1>
<p style="color:#a1a1aa;font-size:14px;margin:0 0 20px">Gosaryc necesita internet para abrirse. Revisa tu conexión e inténtalo de nuevo.</p>
<button onclick="location.href='${URL_APP}'" style="background:#2dd4a0;color:#0b0b14;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer">Reintentar</button>
</div></body></html>`)}`;

let ventanaPrincipal = null;

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: "Gosaryc",
    backgroundColor: "#0b0b14",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  ventanaPrincipal = ventana;
  ventana.once("ready-to-show", () => ventana.show());
  ventana.on("closed", () => {
    ventanaPrincipal = null;
  });

  // Marca la app para que la web sepa que corre en el escritorio y pida la licencia.
  ventana.webContents.setUserAgent(`${ventana.webContents.getUserAgent()} GosarycEscritorio/1.0`);
  ventana.loadURL(URL_APP);

  // Si no hay internet, se muestra un aviso con botón para reintentar (solo para la página principal).
  ventana.webContents.on("did-fail-load", (_e, codigo, _desc, urlFallida, esPrincipal) => {
    if (!esPrincipal || codigo === -3 || urlFallida.startsWith("data:")) return;
    ventana.loadURL(PAGINA_SIN_CONEXION);
  });

  // Los enlaces a otros sitios se abren en el navegador, no dentro de la app.
  const esDeLaApp = (url) => {
    try {
      return new URL(url).origin === ORIGEN_APP;
    } catch {
      return false;
    }
  };
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (!esDeLaApp(url)) {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  ventana.webContents.on("will-navigate", (evento, url) => {
    if (url.startsWith("data:") || esDeLaApp(url)) return;
    evento.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
}

// Solo una ventana de Gosaryc a la vez.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (ventanaPrincipal) {
      if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore();
      ventanaPrincipal.focus();
    }
  });
  app.whenReady().then(() => {
    crearVentana();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

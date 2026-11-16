// Gosaryc Licencias - aplicación de escritorio (Electron).
// Abre solo el generador de licencias de la web publicada. Solo entra la cuenta maestra:
// la propia página valida el correo contra la base de datos.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const URL_BASE = (process.env.GOSARYC_URL || "https://gosaryc.lovable.app").replace(/\/+$/, "");
const URL_APP = `${URL_BASE}/licencias`;
const ORIGEN_APP = new URL(URL_BASE).origin;

const PAGINA_SIN_CONEXION = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="es"><meta charset="utf-8"><title>Gosaryc Licencias</title>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b14;color:#f5f5f7;font-family:system-ui,sans-serif;text-align:center">
<div style="max-width:380px;padding:24px">
<h1 style="font-size:22px;margin:0 0 8px">No hay conexión</h1>
<p style="color:#a1a1aa;font-size:14px;margin:0 0 20px">Para generar licencias necesitas internet. Revisa tu conexión e inténtalo de nuevo.</p>
<button onclick="location.href='${URL_APP}'" style="background:#2dd4a0;color:#0b0b14;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer">Reintentar</button>
</div></body></html>`)}`;

let ventanaPrincipal = null;

function esDeLaApp(url) {
  try {
    return new URL(url).origin === ORIGEN_APP;
  } catch {
    return false;
  }
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 380,
    minHeight: 600,
    title: "Gosaryc Licencias",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#0b0b14",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  ventanaPrincipal = ventana;
  ventana.once("ready-to-show", () => ventana.show());
  ventana.on("closed", () => {
    ventanaPrincipal = null;
  });
  ventana.loadURL(URL_APP);

  ventana.webContents.on("did-fail-load", (_e, codigo, _desc, urlFallida, esPrincipal) => {
    if (!esPrincipal || codigo === -3 || urlFallida.startsWith("data:")) return;
    ventana.loadURL(PAGINA_SIN_CONEXION);
  });
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
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Gosaryc Licencias",
          submenu: [
            { label: "Recargar", accelerator: "CmdOrCtrl+R", click: () => ventanaPrincipal && ventanaPrincipal.reload() },
            { type: "separator" },
            { role: "quit", label: "Salir" },
          ],
        },
      ]),
    );
    crearVentana();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

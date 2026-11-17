// Gosaryc Licencias Admin - app de escritorio EXCLUSIVA para el superadmin.
// Abre el panel de licencias publicado y usa el mismo inicio de sesión de la web;
// los permisos los aplica la base de datos (solo la cuenta superadmin puede ver y cambiar licencias).
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const URL_APP = (process.env.GOSARYC_URL || "https://gosaryc.lovable.app/superadmin").replace(/\/+$/, "");
const ORIGEN_APP = "https://gosaryc.lovable.app";

let ventanaPrincipal = null;

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    title: "Gosaryc Licencias Admin",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#0b0b14",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
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
  ventana.loadURL(URL_APP);
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
    Menu.setApplicationMenu(null);
    crearVentana();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

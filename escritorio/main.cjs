// Gosaryc - envoltorio de escritorio (Electron).
// Abre la web publicada de Gosaryc dentro de una ventana propia.
// Para apuntar a otra dirección: GOSARYC_URL=https://tu-dominio.com npm run iniciar
const { app, BrowserWindow, shell } = require("electron");

const URL_APP = process.env.GOSARYC_URL || process.env.GOSALY_URL || "https://gosaly.lovable.app";

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: "Gosaryc",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Marca la app para que la web sepa que corre en el escritorio y pida la licencia.
  ventana.webContents.setUserAgent(`${ventana.webContents.getUserAgent()} GosarycEscritorio/1.0`);
  ventana.loadURL(URL_APP);

  // Los enlaces a otros sitios se abren en el navegador, no dentro de la app.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(URL_APP)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(() => {
  crearVentana();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

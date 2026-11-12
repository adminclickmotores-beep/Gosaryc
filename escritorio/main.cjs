// Mesari - envoltorio de escritorio (Electron).
// Abre la web publicada de Mesari dentro de una ventana propia.
// Para apuntar a otra dirección: MESARI_URL=https://tu-dominio.com npm run iniciar
const { app, BrowserWindow, shell } = require("electron");

const URL_APP = process.env.MESARI_URL || "https://launch-campaign-compass.lovable.app";

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: "Mesari",
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

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

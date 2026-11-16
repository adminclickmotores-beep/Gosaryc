// Convierte el logo (build/icon.svg) en build/icon.png (512x512) usando el propio Electron.
// electron-builder toma ese PNG y arma el icono de Windows (.ico) para el instalador,
// el acceso directo del escritorio y el del menu Inicio.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const carpeta = path.join(__dirname, "build");
const svg = fs.readFileSync(path.join(carpeta, "icon.svg"), "utf8");

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    width: 512,
    height: 512,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: false },
  });
  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden"><div style="width:512px;height:512px">${svg.replace("<svg ", '<svg width="512" height="512" ')}</div></body></html>`;
  await ventana.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  const imagen = await ventana.webContents.capturePage();
  const final = imagen.resize({ width: 512, height: 512, quality: "best" });
  fs.writeFileSync(path.join(carpeta, "icon.png"), final.toPNG());
  console.log("Icono generado: build/icon.png");
  app.quit();
}).catch((e) => {
  console.error(e);
  app.exit(1);
});

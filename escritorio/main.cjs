// Gosaryc - envoltorio de escritorio (Electron).
// Abre la web publicada de Gosaryc dentro de una ventana propia.
// Para apuntar a otra dirección: GOSARYC_URL=https://tu-dominio.com npm run iniciar
const { app, BrowserWindow, shell, ipcMain, Menu, Tray, Notification } = require("electron");
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFileSync, spawn } = require("child_process");

// ---- Auto-actualización con 1 clic (GitHub Releases + electron-updater) ----
let autoUpdater = null;
try {
  const mod = require("electron-updater");
  autoUpdater = mod.autoUpdater || null;
  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
  }
} catch {
  autoUpdater = null; // sin actualizador en este equipo: la app sigue normal
}

function configurarAutoActualizacion(ventana) {
  if (!autoUpdater || !app.isPackaged) return;
  try {
    autoUpdater.on("update-downloaded", (info) => {
      try {
        if (ventana && !ventana.isDestroyed()) ventana.webContents.send("gosaryc:nueva-version", { version: info && info.version ? String(info.version) : "" });
      } catch {
        /* la ventana cambió */
      }
      avisarEnBandeja("Nueva versión de Gosaryc", "Ya se descargó. Abre la app y pulsa «actualizar ahora».");
    });
    autoUpdater.on("error", () => {
      /* silencioso: se reintenta en el próximo arranque */
    });
    // Revisa al abrir y cada 6 horas mientras la app queda en la bandeja 24/7.
    void autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
    setInterval(() => {
      void autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
    }, 6 * 60 * 60 * 1000);
  } catch {
    /* sin auto-actualización */
  }
}

ipcMain.handle("gosaryc:version", () => app.getVersion());
ipcMain.handle("gosaryc:instalar-ahora", () => {
  try {
    if (autoUpdater) {
      // Instala ya y reinicia solo: no borra datos (viven en userData y en la nube).
      autoUpdater.quitAndInstall(false, true);
      return true;
    }
  } catch {
    /* cae al retorno */
  }
  return false;
});

// ---- API local de WhatsApp (varios números + agente), integrada en segundo plano ----
let procesoWa = null;
let appSaliendo = false;
let reintentosWa = 0;
let reintentosImp = 0;
// ---- API local de impresión silenciosa + cola offline (tirillas 58/80 mm) ----
let procesoImpresion = null;
const carpetaImpresion = () => (app.isPackaged ? path.join(process.resourcesPath, "api-impresion") : path.join(__dirname, "api-impresion"));
const datosImpresion = () => path.join(app.getPath("userData"), "impresion");
const carpetaWa = () => (app.isPackaged ? path.join(process.resourcesPath, "whatsapp-local") : path.join(__dirname, "..", "whatsapp-local"));
const datosWa = () => path.join(app.getPath("userData"), "whatsapp");

// Usa el Edge o Chrome que ya tiene el computador (no hay que descargar otro navegador).
function buscarNavegador() {
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidatos = [
    path.join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(pf, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return candidatos.find((c) => fs.existsSync(c)) || "";
}

function iniciarWhatsApp() {
  const servidor = path.join(carpetaWa(), "server.js");
  if (!fs.existsSync(servidor)) return;
  fs.mkdirSync(datosWa(), { recursive: true });
  procesoWa = spawn(process.execPath, [servidor], {
    cwd: carpetaWa(),
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DATOS: datosWa(), CHROME_PATH: buscarNavegador() },
    stdio: "ignore",
  });
  procesoWa.on("exit", () => {
    procesoWa = null;
    // El agente debe correr 24/7: si se cae, se reinicia solo con espera progresiva.
    if (!appSaliendo) {
      reintentosWa += 1;
      const espera = Math.min(120000, 5000 * reintentosWa);
      setTimeout(() => { if (!procesoWa && !appSaliendo) iniciarWhatsApp(); }, espera);
    }
  });
  procesoWa.on("spawn", () => { reintentosWa = 0; });
}

function iniciarImpresion() {
  const servidor = path.join(carpetaImpresion(), "server.js");
  if (!fs.existsSync(servidor)) return;
  fs.mkdirSync(datosImpresion(), { recursive: true });
  procesoImpresion = spawn(process.execPath, [servidor], {
    cwd: carpetaImpresion(),
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", DATOS: datosImpresion(), GOSARYC_PRINT_PORT: "8765" },
    stdio: "ignore",
  });
  procesoImpresion.on("exit", () => {
    procesoImpresion = null;
    if (!appSaliendo) {
      reintentosImp += 1;
      const espera = Math.min(120000, 5000 * reintentosImp);
      setTimeout(() => { if (!procesoImpresion && !appSaliendo) iniciarImpresion(); }, espera);
    }
  });
  procesoImpresion.on("spawn", () => { reintentosImp = 0; });
}

// Deja la clave de la API local lista en el panel, para no copiarla a mano.
async function entregarClave(ventana) {
  const archivo = path.join(datosWa(), "token.txt");
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(archivo)) {
      const token = fs.readFileSync(archivo, "utf8").trim();
      if (token && !ventana.isDestroyed()) {
        try {
          await ventana.webContents.executeJavaScript(`localStorage.setItem("whatsapp_local_token", ${JSON.stringify(token)})`);
        } catch {
          /* la ventana cambió de página */
        }
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

// Código interno del equipo: sale del identificador propio de cada computadora (no cambia al reinstalar).
function leerIdentificadorEquipo() {
  try {
    if (process.platform === "win32") {
      const salida = execFileSync(
        "reg",
        ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
        { encoding: "utf8", windowsHide: true },
      );
      const m = salida.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
      if (m) return m[1];
    } else if (process.platform === "darwin") {
      const salida = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8" });
      const m = salida.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (m) return m[1];
    } else {
      for (const ruta of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
        if (fs.existsSync(ruta)) return fs.readFileSync(ruta, "utf8").trim();
      }
    }
  } catch {
    /* se usa el respaldo */
  }
  const macs = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && !i.internal && i.mac && i.mac !== "00:00:00:00:00:00")
    .map((i) => i.mac)
    .sort()
    .join("|");
  return `${os.hostname()}|${macs}|${os.cpus()[0]?.model ?? ""}`;
}

function codigoEquipo() {
  const hash = crypto.createHash("sha256").update(`gosaryc|${leerIdentificadorEquipo()}`).digest("hex");
  return hash.slice(0, 16).toUpperCase().match(/.{4}/g).join("-");
}

// Perfil de negocio del equipo (config-negocio.json en la carpeta de datos de la app).
const archivoPerfil = () => path.join(app.getPath("userData"), "config-negocio.json");
ipcMain.handle("gosaryc:perfil-leer", () => {
  try {
    const p = JSON.parse(fs.readFileSync(archivoPerfil(), "utf8"));
    return typeof p.negocio === "string" && p.negocio ? p.negocio : null;
  } catch {
    return null;
  }
});
ipcMain.handle("gosaryc:perfil-guardar", (_e, perfil) => {
  try {
    const limpio = String(perfil || "").replace(/[^a-z0-9_]/gi, "").slice(0, 40);
    if (!limpio) return false;
    fs.writeFileSync(archivoPerfil(), JSON.stringify({ negocio: limpio, actualizado: new Date().toISOString() }, null, 2));
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("gosaryc:id-equipo", () => codigoEquipo());
ipcMain.handle("gosaryc:info-equipo", () => ({
  id: codigoEquipo(),
  nombre: os.hostname(),
  sistema: `${os.type()} ${os.release()} (${os.arch()})`,
}));

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
let bandeja = null;

// Bandeja del sistema: al cerrar o minimizar, Gosaryc sigue corriendo en segundo plano
// (al lado del reloj) para que el agente de WhatsApp atienda 24/7.
function crearBandeja() {
  if (bandeja) return;
  try {
    const icono = path.join(__dirname, "build", "icon.png");
    if (!fs.existsSync(icono)) return;
    bandeja = new Tray(icono);
    bandeja.setToolTip("Gosaryc (agente de WhatsApp activo)");
    bandeja.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Abrir Gosaryc", click: () => { if (ventanaPrincipal) { ventanaPrincipal.show(); ventanaPrincipal.focus(); } else crearVentana(); } },
        { label: "Guía de uso", click: abrirGuia },
        { type: "separator" },
        { label: "Salir (apaga el agente)", click: () => { appSaliendo = true; app.quit(); } },
      ]),
    );
    bandeja.on("click", () => {
      if (ventanaPrincipal) { ventanaPrincipal.show(); ventanaPrincipal.focus(); }
      else crearVentana();
    });
  } catch {
    /* sin bandeja en este equipo */
  }
}

function avisarEnBandeja(titulo, texto) {
  try {
    if (bandeja) bandeja.displayBalloon({ title: titulo, content: String(texto).slice(0, 200) });
    else if (Notification.isSupported()) new Notification({ title: titulo, body: String(texto).slice(0, 200) }).show();
  } catch {
    /* aviso silencioso */
  }
}

// Guía de uso incluida en el instalador (funciona sin internet).
function abrirGuia() {
  const archivo = app.isPackaged ? path.join(process.resourcesPath, "guia", "guia.html") : path.join(__dirname, "guia", "guia.html");
  const g = new BrowserWindow({
    width: 1000,
    height: 760,
    title: "Guía de uso de Gosaryc",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
  });
  g.loadFile(archivo);
}

function crearMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { label: "Gosaryc", submenu: [{ label: "Recargar", accelerator: "CmdOrCtrl+R", click: () => ventanaPrincipal && ventanaPrincipal.reload() }, { type: "separator" }, { role: "quit", label: "Salir" }] },
      { label: "Ayuda", submenu: [{ label: "Guía de uso (asistente virtual, agente de WhatsApp y más)", accelerator: "F1", click: abrirGuia }] },
    ]),
  );
}

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: "Gosaryc",
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
  // Minimizado o cierre = a la bandeja (segundo plano 24/7), no se apaga el agente.
  ventana.on("close", (evento) => {
    if (!appSaliendo) {
      evento.preventDefault();
      ventana.hide();
    }
  });
  ventana.on("minimize", (evento) => {
    if (!appSaliendo) {
      evento.preventDefault();
      ventana.hide();
    }
  });
  ventana.on("closed", () => {
    ventanaPrincipal = null;
  });

  // Marca la app para que la web sepa que corre en el escritorio y pida la licencia.
  ventana.webContents.setUserAgent(`${ventana.webContents.getUserAgent()} GosarycEscritorio/1.0`);
  ventana.loadURL(URL_APP);
  ventana.webContents.on("did-finish-load", () => {
    if (ventana.webContents.getURL().startsWith(ORIGEN_APP)) void entregarClave(ventana);
  });

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
  app.on("before-quit", () => {
    appSaliendo = true;
    for (const p of [procesoWa, procesoImpresion]) {
      try {
        if (p) p.kill();
      } catch {
        /* ya cerrado */
      }
    }
    procesoWa = null;
    procesoImpresion = null;
  });
  app.whenReady().then(() => {
    // En Linux moderno el sandbox de Chrome falla sin permisos: se desactiva para que abra siempre.
    try {
      if (process.platform === "linux") app.commandLine.appendSwitch("no-sandbox");
    } catch {
      /* sigue igual */
    }
    // Inicio automático con Windows para operación 24/7.
    try { app.setLoginItemSettings({ openAtLogin: true, name: "Gosaryc" }); } catch { /* sin permiso */ }
    crearBandeja();
    iniciarWhatsApp();
    iniciarImpresion();
    crearMenu();
    crearVentana();
    if (ventanaPrincipal) configurarAutoActualizacion(ventanaPrincipal);
    // La primera vez se muestra la guía de uso.
    try {
      const marca = path.join(app.getPath("userData"), "guia-vista.txt");
      if (!fs.existsSync(marca)) {
        fs.writeFileSync(marca, "1");
        abrirGuia();
      }
    } catch {
      /* sin guía inicial */
    }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });
}

app.on("window-all-closed", () => {
  // No se sale: la app queda en la bandeja del sistema para que el agente siga atendiendo.
  if (process.platform === "darwin") return;
});

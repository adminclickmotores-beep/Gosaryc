// Gosaryc - creador de instaladores de un solo comando (funciona en Windows, Linux y Mac).
// Uso (desde esta carpeta, con Node.js LTS instalado):
//   node crear-instaladores.cjs windows       -> Gosaryc-Setup-x64.exe / ia32.exe (clientes)
//   node crear-instaladores.cjs tienda        -> paquete .appx para Windows 11
//   node crear-instaladores.cjs licencias     -> Gosaryc-Licencias-Admin (.exe 64/32, solo administrador)
//   node crear-instaladores.cjs linux         -> Gosaryc AppImage + .deb
//   node crear-instaladores.cjs apk           -> Gosaryc.apk (Android clientes)
//   node crear-instaladores.cjs apk-licencias -> Gosaryc-Licencias-Admin.apk
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const raiz = __dirname;
const modo = (process.argv[2] || "windows").toLowerCase();
const esWin = process.platform === "win32";

function correr(cmd, cwd, env) {
  console.log(`\n> ${cmd}   [${path.relative(raiz, cwd) || "."}]`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit", env: { ...process.env, ...(env || {}) } });
  if (r.status !== 0) {
    console.error(`\nSe detuvo en: ${cmd}\nRevisa los mensajes de arriba (internet, antivirus o Node.js LTS 22/24).`);
    process.exit(r.status || 1);
  }
}

function asegurarElectron(carpeta) {
  const marca = path.join(carpeta, "node_modules", "electron", "path.txt");
  if (!fs.existsSync(marca)) {
    console.log("Descargando Electron...");
    spawnSync("node node_modules/electron/install.js", { cwd: carpeta, shell: true, stdio: "inherit" });
  }
  if (!fs.existsSync(marca)) {
    spawnSync("node node_modules/electron/install.js", {
      cwd: carpeta,
      shell: true,
      stdio: "inherit",
      env: { ...process.env, ELECTRON_MIRROR: "https://npmmirror.com/mirrors/electron/" },
    });
  }
  if (!fs.existsSync(marca)) {
    console.error("No se pudo descargar Electron. Instala Node.js LTS 22 o 24, borra node_modules y reintenta.");
    process.exit(1);
  }
}

const SIN_CHROMIUM = { PUPPETEER_SKIP_DOWNLOAD: "true", PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true" };

function prepararEscritorio() {
  console.log("[1/3] Preparando el agente de WhatsApp...");
  correr("npm install --omit=dev", path.join(raiz, "whatsapp-local"), SIN_CHROMIUM);
  console.log("[2/3] Instalando dependencias de escritorio (puede tardar varios minutos)...");
  const esc = path.join(raiz, "escritorio");
  correr("npm install", esc);
  asegurarElectron(esc);
  return esc;
}

function verificarAndroid() {
  if (esWin) {
    const sdk = path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk", "platform-tools", "adb.exe");
    if (!fs.existsSync(sdk)) {
      console.error("\nNo encuentro el Android SDK.");
      console.error("Instala Android Studio desde https://developer.android.com/studio,");
      console.error("abrelo UNA vez para que descargue el SDK y vuelve a hacer doble clic.");
      process.exit(1);
    }
  }
}

function apk(carpetaNombre, salida) {
  verificarAndroid();
  const dir = path.join(raiz, carpetaNombre);
  correr("npm install", dir);
  if (!fs.existsSync(path.join(dir, "android"))) correr("npx cap add android", dir);
  correr('npx capacitor-assets generate --iconBackgroundColor "#0b0b14" --splashBackgroundColor "#0b0b14"', dir);
  correr("node scripts/configurar-manifest.cjs", dir);
  correr("npx cap sync android", dir);
  const android = path.join(dir, "android");
  if (!esWin) fs.chmodSync(path.join(android, "gradlew"), 0o755);
  correr(esWin ? "gradlew.bat assembleDebug" : "./gradlew assembleDebug", android);
  fs.copyFileSync(path.join(android, "app", "build", "outputs", "apk", "debug", "app-debug.apk"), path.join(raiz, salida));
  console.log(`\nListo: ${salida} (en la carpeta principal). Pásalo al celular e instálalo.`);
}

if (modo === "windows") {
  const esc = prepararEscritorio();
  console.log("[3/3] Creando instaladores de Windows (64 y 32 bits)...");
  correr("npm run instalador:windows", esc);
  console.log("\nListo. Instaladores en: escritorio/instaladores");
} else if (modo === "tienda") {
  const esc = prepararEscritorio();
  correr("npm run instalador:tienda", esc);
  console.log("\nListo. Paquete .appx en: escritorio/instaladores");
} else if (modo === "linux") {
  const esc = prepararEscritorio();
  correr("npm run instalador:linux", esc);
  console.log("\nListo. AppImage y .deb en: escritorio/instaladores");
} else if (modo === "licencias") {
  const esc = path.join(raiz, "escritorio");
  correr("npm install", esc);
  asegurarElectron(esc);
  correr("npm run icono", esc);
  const lic = path.join(raiz, "generador-licencias");
  fs.mkdirSync(path.join(lic, "build"), { recursive: true });
  fs.copyFileSync(path.join(esc, "build", "icon.png"), path.join(lic, "build", "icon.png"));
  correr("npm install", lic);
  asegurarElectron(lic);
  correr("npm run instalador:windows", lic);
  console.log("\nListo. Instaladores en: generador-licencias/instaladores (solo para el administrador)");
} else if (modo === "apk") {
  apk("android-app", "Gosaryc.apk");
} else if (modo === "apk-licencias") {
  apk("android-licencias", "Gosaryc-Licencias-Admin.apk");
} else {
  console.log("Modos: windows | tienda | licencias | linux | apk | apk-licencias");
  process.exit(1);
}

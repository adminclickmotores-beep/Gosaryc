// Activa en el AndroidManifest generado por Capacitor los permisos que Gosaryc necesita:
// cámara (código de barras/QR), notificaciones, lectura de imágenes (comprobantes y PDFs)
// e internet/red (la app trabaja en línea y sincroniza sin conexión).
const fs = require("fs");
const path = require("path");

const manifest = path.join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml");
if (!fs.existsSync(manifest)) {
  console.error("No existe AndroidManifest.xml. Ejecuta primero: npx cap add android");
  process.exit(1);
}

let xml = fs.readFileSync(manifest, "utf8");
const permisos = [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_MEDIA_IMAGES",
];
for (const p of permisos) {
  const linea = `    <uses-permission android:name="${p}" />`;
  if (!xml.includes(p)) xml = xml.replace("<application", `${linea}\n    <application`);
}
// La cámara es opcional: el APK instala también en celulares sin cámara trasera.
if (!xml.includes("android.hardware.camera")) {
  xml = xml.replace(
    "<application",
    `    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <application`,
  );
}
fs.writeFileSync(manifest, xml);
console.log("Permisos activados: internet, cámara, notificaciones e imágenes.");

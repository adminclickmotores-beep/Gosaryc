// Activa en el AndroidManifest generado por Capacitor los permisos que Gosaryc necesita:
// cámara (código de barras/QR), notificaciones y lectura de imágenes (comprobantes y PDFs).
const fs = require("fs");
const path = require("path");

const manifest = path.join(__dirname, "..", "android", "app", "src", "main", "AndroidManifest.xml");
if (!fs.existsSync(manifest)) {
  console.error("No existe AndroidManifest.xml. Ejecuta primero: npx cap add android");
  process.exit(1);
}

let xml = fs.readFileSync(manifest, "utf8");
const permisos = [
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_MEDIA_IMAGES",
];
for (const p of permisos) {
  const linea = `    <uses-permission android:name="${p}" />`;
  if (!xml.includes(p)) xml = xml.replace("<application", `${linea}\n    <application`);
}
fs.writeFileSync(manifest, xml);
console.log("Permisos activados: cámara, notificaciones e imágenes.");

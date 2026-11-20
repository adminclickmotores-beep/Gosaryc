// Activa en el AndroidManifest del panel de licencias los permisos mínimos:
// notificaciones (avisos de pagos pendientes) e internet.
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
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_MEDIA_IMAGES",
];
for (const p of permisos) {
  const linea = `    <uses-permission android:name="${p}" />`;
  if (!xml.includes(p)) xml = xml.replace("<application", `${linea}\n    <application`);
}
fs.writeFileSync(manifest, xml);
// Android 14+: minSdk 24, targetSdk 34 (compileSdk 35 lo exige Capacitor 7; sigue siendo compatible con Android 14).
const variables = path.join(__dirname, "..", "android", "variables.gradle");
if (fs.existsSync(variables)) {
  let g = fs.readFileSync(variables, "utf8");
  g = g.replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 24").replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 34");
  fs.writeFileSync(variables, g);
}
console.log("Permisos activados: internet, notificaciones e imágenes.");

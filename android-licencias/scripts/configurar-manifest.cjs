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
const permisos = ["android.permission.POST_NOTIFICATIONS"];
for (const p of permisos) {
  const linea = `    <uses-permission android:name="${p}" />`;
  if (!xml.includes(p)) xml = xml.replace("<application", `${linea}\n    <application`);
}
fs.writeFileSync(manifest, xml);
console.log("Permisos activados: notificaciones.");

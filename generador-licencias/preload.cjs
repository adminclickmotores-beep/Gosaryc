// Puente mínimo entre la ventana y el sistema (sin acceso a Node desde la web).
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("gosarycLicencias", { version: "1.0.0" });

// Puente seguro entre la ventana y el programa: solo expone el código interno del equipo.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gosarycEscritorio", {
  idEquipo: () => ipcRenderer.invoke("gosaryc:id-equipo"),
  infoEquipo: () => ipcRenderer.invoke("gosaryc:info-equipo"),
});

// Puente seguro entre la ventana y el programa: solo expone el código interno del equipo.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gosarycEscritorio", {
  idEquipo: () => ipcRenderer.invoke("gosaryc:id-equipo"),
  infoEquipo: () => ipcRenderer.invoke("gosaryc:info-equipo"),
  versionApp: () => ipcRenderer.invoke("gosaryc:version"),
  // La web se suscribe así: window.gosarycEscritorio?.alAvisarVersion(() => ...)
  alAvisarVersion: (fn) => {
    if (typeof fn !== "function") return () => undefined;
    const listener = (_e, info) => {
      try {
        fn(info || {});
      } catch {
        /* aviso silencioso */
      }
    };
    ipcRenderer.on("gosaryc:nueva-version", listener);
    return () => ipcRenderer.removeListener("gosaryc:nueva-version", listener);
  },
  leerPerfil: () => ipcRenderer.invoke("gosaryc:perfil-leer"),
  guardarPerfil: (perfil) => ipcRenderer.invoke("gosaryc:perfil-guardar", String(perfil || "")),
  instalarActualizacion: () => ipcRenderer.invoke("gosaryc:instalar-ahora"),
});

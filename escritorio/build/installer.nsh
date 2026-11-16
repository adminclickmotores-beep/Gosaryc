; Acceso directo extra: "Guía de uso de Gosaryc" (escritorio y menú Inicio), con el logo del programa.
!macro customInstall
  CreateShortCut "$DESKTOP\Guía de uso de Gosaryc.lnk" "$INSTDIR\resources\guia\guia.html" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  CreateShortCut "$SMPROGRAMS\Guía de uso de Gosaryc.lnk" "$INSTDIR\resources\guia\guia.html" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Guía de uso de Gosaryc.lnk"
  Delete "$SMPROGRAMS\Guía de uso de Gosaryc.lnk"
!macroend

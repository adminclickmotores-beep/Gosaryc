import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gosaryc.erp",
  appName: "Gosaryc",
  webDir: "www",
  server: {
    // Para apuntar a otro hosting o dominio: GOSARYC_URL=https://tu-dominio.com
    url: process.env.GOSARYC_URL || "https://gosaryc.lovable.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#2dd4a0",
    },
  },
};

export default config;

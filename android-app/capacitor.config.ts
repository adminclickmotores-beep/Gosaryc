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
    backgroundColor: "#0b0b14",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#10B981",
    },
  },
};

export default config;

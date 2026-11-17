import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gosaryc.licencias",
  appName: "Gosaryc Licencias Admin",
  webDir: "www",
  server: {
    // Para apuntar a otro hosting o dominio: GOSARYC_URL=https://tu-dominio.com
    url: process.env.GOSARYC_URL ? `${process.env.GOSARYC_URL.replace(/\/+$/, "")}/superadmin` : "https://gosaryc.lovable.app/superadmin",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0b14",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#ef4444",
    },
  },
};

export default config;

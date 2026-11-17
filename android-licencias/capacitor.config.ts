import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gosaryc.licencias",
  appName: "Gosaryc Licencias Admin",
  webDir: "www",
  server: {
    url: "https://gosaryc.lovable.app/superadmin",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#ef4444",
    },
  },
};

export default config;

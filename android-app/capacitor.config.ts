import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gosaryc.erp",
  appName: "Gosaryc",
  webDir: "www",
  server: {
    url: "https://gosaryc.lovable.app",
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

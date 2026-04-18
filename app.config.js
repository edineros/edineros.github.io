module.exports = {
  expo: {
    name: "Edineros",
    slug: "edineros",
    version: "1.0.5.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: "edineros",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.edineros.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.edineros.app"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      output: "static",
      // Headers for OPFS support
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      },
      // PWA configuration
      name: "Edineros",
      shortName: "Edineros",
      description: "Privacy-first, offline-capable portfolio tracking application",
      themeColor: "#000000",
      backgroundColor: "#000000"
    },
    plugins: [
      "expo-router",
      "expo-sqlite",
      "expo-camera"
    ],
    extra: {
      eas: {
        projectId: "310eda78-0f81-43d5-8703-a573af9e6f4d"
      }
    }
  }
};

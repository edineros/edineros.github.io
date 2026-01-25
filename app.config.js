module.exports = {
  expo: {
    name: "Private Portfolio",
    slug: "private-portfolio",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    scheme: "private-portfolio",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.private.portfolio"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.private.portfolio"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      // Headers for OPFS support
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
      }
    },
    plugins: [
      "expo-router",
      "expo-sqlite"
    ],
    extra: {
      eas: {
        projectId: "310eda78-0f81-43d5-8703-a573af9e6f4d"
      }
    }
  }
};

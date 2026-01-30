import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { TamaguiProvider, Theme, View } from 'tamagui';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import config from '../tamagui.config';
import { getDatabase } from '../lib/db/schema';
import { useThemeStore, useColors } from '../lib/theme/store';

function AppContent() {
  const { resolvedTheme, initializeTheme } = useThemeStore();
  const colors = useColors();

  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <Theme name={resolvedTheme}>
      <SafeAreaProvider>
        <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
        <View flex={1} backgroundColor={colors.background}>
          <Slot />
        </View>
      </SafeAreaProvider>
    </Theme>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app start (only for native platforms)
    if (Platform.OS !== 'web') {
      getDatabase().catch(console.error);
    }
  }, []);

  return (
    <TamaguiProvider config={config}>
      <AppContent />
    </TamaguiProvider>
  );
}

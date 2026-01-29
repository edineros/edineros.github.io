import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { TamaguiProvider, Theme, View } from 'tamagui';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import config from '../tamagui.config';
import { getDatabase } from '../lib/db/schema';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app start (only for native platforms)
    if (Platform.OS !== 'web') {
      getDatabase().catch(console.error);
    }
  }, []);

  return (
    <TamaguiProvider config={config}>
      <Theme name="dark">
        <SafeAreaProvider>
          <StatusBar style="light" />
          <View flex={1} backgroundColor="#000000">
            <Slot />
          </View>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import config from '../tamagui.config';
import { getDatabase } from '../lib/db/schema';
import { HeaderBackButton } from '../components/HeaderButtons';

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
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#000000' },
              headerTintColor: '#007AFF',
              headerTitleStyle: {
                fontWeight: '600',
                color: '#FFFFFF',
              },
              headerShadowVisible: false,
              headerTitleAlign: 'center',
              contentStyle: { backgroundColor: '#000000' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="portfolio/[id]"
              options={{
                title: 'Portfolio',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="portfolio/create"
              options={{
                title: '',
                presentation: 'modal',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="portfolio/edit/[id]"
              options={{
                title: 'Edit Portfolio',
                presentation: 'modal',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="asset/[id]"
              options={{
                title: 'Asset',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="asset/add"
              options={{
                title: '',
                presentation: 'modal',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="lot/add"
              options={{
                title: 'Add Transaction',
                presentation: 'modal',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="lot/close"
              options={{
                title: 'Sell Position',
                presentation: 'modal',
                headerLeft: () => <HeaderBackButton fallbackPath="/" />,
              }}
            />
          </Stack>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}

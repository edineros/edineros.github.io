import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { Platform, Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import config from '../tamagui.config';
import { getDatabase } from '../lib/db/schema';

// Custom back button that always works (even after page refresh on web)
function BackButton({ fallbackPath = '/' }: { fallbackPath?: string }) {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallbackPath);
        }
      }}
      style={{ paddingRight: 8 }}
    >
      <Text style={{ color: '#007AFF', fontSize: 17 }}>
        ‹ Back
      </Text>
    </Pressable>
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
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="portfolio/create"
              options={{
                title: '',
                presentation: 'modal',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="portfolio/edit/[id]"
              options={{
                title: 'Edit Portfolio',
                presentation: 'modal',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="asset/[id]"
              options={{
                title: 'Asset',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="asset/add"
              options={{
                title: '',
                presentation: 'modal',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="lot/add"
              options={{
                title: 'Add Transaction',
                presentation: 'modal',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
            <Stack.Screen
              name="lot/close"
              options={{
                title: 'Sell Position',
                presentation: 'modal',
                headerLeft: () => <BackButton fallbackPath="/" />,
              }}
            />
          </Stack>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}

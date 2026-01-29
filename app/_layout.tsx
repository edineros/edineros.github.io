import { useEffect } from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { TamaguiProvider, Theme, View, Text } from 'tamagui';
import { Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import config from '../tamagui.config';
import { getDatabase } from '../lib/db/schema';

function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Only show tab bar on main screens
  const showTabBar = pathname === '/' || pathname === '/settings';

  if (!showTabBar) {
    return null;
  }

  return (
    <View
      flexDirection="row"
      height={60 + insets.bottom}
      paddingBottom={insets.bottom}
      borderTopWidth={1}
      borderTopColor="#1F1F1F"
      backgroundColor="#000000"
    >
      <TouchableOpacity
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}
        onPress={() => router.push('/')}
      >
        <Ionicons
          name="pie-chart"
          size={24}
          color={pathname === '/' ? '#FFFFFF' : '#636366'}
        />
        <Text
          fontSize={11}
          fontWeight="500"
          marginTop={4}
          color={pathname === '/' ? '#FFFFFF' : '#636366'}
        >
          Portfolios
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}
        onPress={() => router.push('/settings')}
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={pathname === '/settings' ? '#FFFFFF' : '#636366'}
        />
        <Text
          fontSize={11}
          fontWeight="500"
          marginTop={4}
          color={pathname === '/settings' ? '#FFFFFF' : '#636366'}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
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
          <View flex={1} backgroundColor="#000000">
            <Slot />
            <TabBar />
          </View>
        </SafeAreaProvider>
      </Theme>
    </TamaguiProvider>
  );
}

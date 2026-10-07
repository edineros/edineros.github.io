import { useEffect } from 'react';
import { TamaguiProvider, Theme, View } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import config from '../tamagui.config';
import { useThemeStore, useColors } from '../lib/theme/store';
import { QueryProvider } from '../lib/providers/QueryProvider';
import { Outlet, setNavigate } from '../lib/routing';
import { useNavigate } from 'react-router-dom';

function AppContent() {
  const { resolvedTheme, initializeTheme } = useThemeStore();
  const colors = useColors();
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <Theme name={resolvedTheme}>
      <SafeAreaProvider>
        <View flex={1} backgroundColor={colors.background}>
          <Outlet />
        </View>
      </SafeAreaProvider>
    </Theme>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <TamaguiProvider config={config}>
        <AppContent />
      </TamaguiProvider>
    </QueryProvider>
  );
}

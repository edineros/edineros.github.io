import { create } from 'zustand';
import { Platform, Appearance } from 'react-native';
import { darkColors, lightColors, type Colors } from './colors';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  initializeTheme: () => Promise<void>;
}

const STORAGE_KEY = 'theme_mode';

// Simple storage abstraction
const storage = {
  get: async (): Promise<ThemeMode | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    }
    // For native, use AsyncStorage
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    } catch {
      return null;
    }
  },
  set: async (value: ThemeMode): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, value);
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore storage errors
    }
  },
};

const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'light' ? 'light' : 'dark';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  resolvedTheme: 'dark',

  setMode: async (mode: ThemeMode) => {
    await storage.set(mode);
    set({
      mode,
      resolvedTheme: resolveTheme(mode),
    });
  },

  initializeTheme: async () => {
    const savedMode = await storage.get();
    const mode = savedMode || 'dark';
    set({
      mode,
      resolvedTheme: resolveTheme(mode),
    });

    // Listen for system theme changes
    Appearance.addChangeListener(({ colorScheme }) => {
      const currentMode = get().mode;
      if (currentMode === 'auto') {
        set({
          resolvedTheme: colorScheme === 'light' ? 'light' : 'dark',
        });
      }
    });
  },
}));

/**
 * Hook to get the current theme colors based on the resolved theme.
 */
export function useColors(): Colors {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  return resolvedTheme === 'light' ? lightColors : darkColors;
}

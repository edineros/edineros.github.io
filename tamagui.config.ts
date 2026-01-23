import { createTamagui, createTokens } from 'tamagui';
import { config } from '@tamagui/config/v3';

// Professional dark finance app theme (like CoinStats/Delta)
const customTokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    // Gains/Losses - professional finance colors
    gain: '#00D897',
    gainMuted: 'rgba(0, 216, 151, 0.15)',
    loss: '#FF6B6B',
    lossMuted: 'rgba(255, 107, 107, 0.15)',

    // Dark theme colors
    dark1: '#000000',
    dark2: '#0A0A0A',
    dark3: '#111111',
    dark4: '#1A1A1A',
    dark5: '#222222',
    dark6: '#2A2A2A',
    dark7: '#333333',

    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',

    // Accent
    accent: '#007AFF',
  },
});

const appConfig = createTamagui({
  ...config,
  tokens: customTokens,
  themes: {
    ...config.themes,
    // Dark theme as primary (like CoinStats/Delta)
    dark: {
      ...config.themes.dark,
      // Backgrounds
      background: '#000000',
      backgroundHover: '#0A0A0A',
      backgroundPress: '#111111',
      backgroundFocus: '#0A0A0A',

      // Cards
      cardBackground: '#111111',
      cardBackgroundHover: '#1A1A1A',
      cardBorder: '#1F1F1F',

      // Text
      color: '#FFFFFF',
      colorHover: '#F5F5F5',
      colorPress: '#E5E5E5',
      colorSecondary: '#8E8E93',
      colorTertiary: '#636366',

      // Borders
      borderColor: '#1F1F1F',
      borderColorHover: '#2A2A2A',
      borderColorFocus: '#3A3A3A',

      // Gain/Loss
      gain: '#00D897',
      gainMuted: 'rgba(0, 216, 151, 0.15)',
      loss: '#FF6B6B',
      lossMuted: 'rgba(255, 107, 107, 0.15)',

      // Accent
      accent: '#007AFF',
      accentMuted: 'rgba(0, 122, 255, 0.15)',
    },
    light: {
      ...config.themes.light,
      // Light theme (secondary option)
      background: '#F2F2F7',
      backgroundHover: '#E5E5EA',
      backgroundPress: '#D1D1D6',

      cardBackground: '#FFFFFF',
      cardBackgroundHover: '#F9F9F9',
      cardBorder: '#E5E5EA',

      color: '#000000',
      colorSecondary: '#8E8E93',
      colorTertiary: '#AEAEB2',

      borderColor: '#E5E5EA',
      borderColorHover: '#D1D1D6',

      gain: '#34C759',
      gainMuted: 'rgba(52, 199, 89, 0.15)',
      loss: '#FF3B30',
      lossMuted: 'rgba(255, 59, 48, 0.15)',

      accent: '#007AFF',
      accentMuted: 'rgba(0, 122, 255, 0.15)',
    },
  },
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;

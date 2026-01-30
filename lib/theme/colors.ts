/**
 * Centralized color definitions for the app.
 * Use these instead of hardcoded hex values.
 */

export interface Colors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Cards
  card: string;
  cardHover: string;
  cardBorder: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;

  // Borders
  border: string;
  borderHover: string;

  // Accent (Primary action color)
  accent: string;
  accentMuted: string;

  // Semantic colors
  gain: string;
  gainMuted: string;
  loss: string;
  lossMuted: string;

  // Destructive
  destructive: string;
  destructiveMuted: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  placeholder: string;

  // Modal/Overlay
  modalBackground: string;
  modalBorder: string;
  overlay: string;
}

export const darkColors: Colors = {
  background: '#000000',
  backgroundSecondary: '#0A0A0A',
  backgroundTertiary: '#111111',
  card: '#111111',
  cardHover: '#1A1A1A',
  cardBorder: '#1F1F1F',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  textMuted: '#CCCCCC',
  border: '#1F1F1F',
  borderHover: '#2A2A2A',
  accent: '#007AFF',
  accentMuted: 'rgba(0, 122, 255, 0.15)',
  gain: '#00D897',
  gainMuted: 'rgba(0, 216, 151, 0.15)',
  loss: '#FF6B6B',
  lossMuted: 'rgba(255, 107, 107, 0.15)',
  destructive: '#FF6B6B',
  destructiveMuted: 'rgba(255, 107, 107, 0.15)',
  inputBackground: '#111111',
  inputBorder: '#1F1F1F',
  placeholder: '#636366',
  modalBackground: '#1C1C1E',
  modalBorder: '#2C2C2E',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const lightColors: Colors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F7',
  backgroundTertiary: '#EFEFF4',
  card: '#FFFFFF',
  cardHover: '#F5F5F7',
  cardBorder: '#E5E5EA',
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  textMuted: '#3C3C43',
  border: '#E5E5EA',
  borderHover: '#D1D1D6',
  accent: '#007AFF',
  accentMuted: 'rgba(0, 122, 255, 0.12)',
  gain: '#34C759',
  gainMuted: 'rgba(52, 199, 89, 0.12)',
  loss: '#FF3B30',
  lossMuted: 'rgba(255, 59, 48, 0.12)',
  destructive: '#FF3B30',
  destructiveMuted: 'rgba(255, 59, 48, 0.12)',
  inputBackground: '#FFFFFF',
  inputBorder: '#E5E5EA',
  placeholder: '#C7C7CC',
  modalBackground: '#FFFFFF',
  modalBorder: '#E5E5EA',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// Default export for backwards compatibility (dark theme)
export const colors = darkColors;

import { create } from 'zustand';
import { Platform } from 'react-native';

const LAST_PORTFOLIO_KEY = 'last_portfolio_id';

// Simple storage abstraction for last portfolio ID
const portfolioStorage = {
  get: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(LAST_PORTFOLIO_KEY);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(LAST_PORTFOLIO_KEY);
    } catch {
      return null;
    }
  },
  set: async (value: string | null): Promise<void> => {
    if (Platform.OS === 'web') {
      if (value) {
        localStorage.setItem(LAST_PORTFOLIO_KEY, value);
      } else {
        localStorage.removeItem(LAST_PORTFOLIO_KEY);
      }
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (value) {
        await AsyncStorage.setItem(LAST_PORTFOLIO_KEY, value);
      } else {
        await AsyncStorage.removeItem(LAST_PORTFOLIO_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

// Special ID for "All Portfolios" view
export const ALL_PORTFOLIOS_ID = 'all';

interface UIState {
  // Current portfolio selection
  currentPortfolioId: string | null;

  // Actions
  setCurrentPortfolio: (id: string | null) => void;
  getLastPortfolioId: () => Promise<string | null>;
  clearLastPortfolioId: (deletedId: string) => Promise<void>;
}

export const useAppStore = create<UIState>((set) => ({
  currentPortfolioId: null,

  setCurrentPortfolio: (id: string | null) => {
    set({ currentPortfolioId: id });
    portfolioStorage.set(id);
  },

  getLastPortfolioId: async () => {
    return portfolioStorage.get();
  },

  clearLastPortfolioId: async (deletedId: string) => {
    const lastId = await portfolioStorage.get();
    if (lastId === deletedId) {
      await portfolioStorage.set(null);
    }
  },
}));

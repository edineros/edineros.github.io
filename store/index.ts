import { create } from 'zustand';
import { Platform } from 'react-native';
import type { Portfolio, Asset, AssetWithStats, PortfolioWithStats } from '../lib/types';
import * as db from '../lib/db';
import { calculateAssetStats, calculatePortfolioStats } from '../lib/utils/calculations';

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

interface AppState {
  // Data
  portfolios: Portfolio[];
  portfolioStats: Map<string, PortfolioWithStats>;
  currentPortfolioId: string | null;
  assets: Map<string, Asset[]>;
  assetStats: Map<string, AssetWithStats>;

  // UI State
  isLoading: boolean;
  error: string | null;
  lastPriceUpdate: Date | null;

  // Actions
  loadPortfolios: () => Promise<void>;
  createPortfolio: (name: string, currency?: string) => Promise<Portfolio>;
  updatePortfolio: (id: string, updates: { name?: string; currency?: string }) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  setCurrentPortfolio: (id: string | null) => void;

  getLastPortfolioId: () => Promise<string | null>;
  loadAssets: (portfolioId: string) => Promise<void>;
  createAsset: (
    portfolioId: string,
    symbol: string,
    type: Asset['type'],
    name?: string,
    currency?: string,
    tags?: string[]
  ) => Promise<Asset>;
  updateAsset: (
    id: string,
    updates: { symbol?: string; name?: string; type?: Asset['type']; currency?: string; tags?: string[] }
  ) => Promise<void>;
  deleteAsset: (id: string, portfolioId: string) => Promise<void>;

  loadAssetStats: (assetId: string, portfolioCurrency: string) => Promise<AssetWithStats | null>;
  loadPortfolioStats: (portfolioId: string) => Promise<PortfolioWithStats | null>;

  refreshPrices: () => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  portfolios: [],
  portfolioStats: new Map(),
  currentPortfolioId: null,
  assets: new Map(),
  assetStats: new Map(),
  isLoading: true, // Start with loading state to avoid flash of empty state
  error: null,
  lastPriceUpdate: null,

  // Portfolio actions
  loadPortfolios: async () => {
    set({ isLoading: true, error: null });
    try {
      const portfolios = await db.getAllPortfolios();
      set({ portfolios, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createPortfolio: async (name: string, currency?: string) => {
    set({ isLoading: true, error: null });
    try {
      const portfolio = await db.createPortfolio(name, currency);
      set((state) => ({
        portfolios: [portfolio, ...state.portfolios],
        isLoading: false,
      }));
      return portfolio;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updatePortfolio: async (id: string, updates: { name?: string; currency?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await db.updatePortfolio(id, updates);
      if (updated) {
        set((state) => ({
          portfolios: state.portfolios.map((p) => (p.id === id ? updated : p)),
          isLoading: false,
        }));
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deletePortfolio: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await db.deletePortfolio(id);
      // Clear last portfolio ID if it was the deleted one
      const lastId = await portfolioStorage.get();
      if (lastId === id) {
        await portfolioStorage.set(null);
      }
      set((state) => ({
        portfolios: state.portfolios.filter((p) => p.id !== id),
        currentPortfolioId: state.currentPortfolioId === id ? null : state.currentPortfolioId,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setCurrentPortfolio: (id: string | null) => {
    set({ currentPortfolioId: id });
    portfolioStorage.set(id);
  },

  getLastPortfolioId: async () => {
    return portfolioStorage.get();
  },

  // Asset actions
  loadAssets: async (portfolioId: string) => {
    set({ isLoading: true, error: null });
    try {
      const portfolioAssets = await db.getAssetsByPortfolioId(portfolioId);
      set((state) => {
        const assets = new Map(state.assets);
        assets.set(portfolioId, portfolioAssets);
        return { assets, isLoading: false };
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createAsset: async (
    portfolioId: string,
    symbol: string,
    type: Asset['type'],
    name?: string,
    currency?: string,
    tags?: string[]
  ) => {
    set({ isLoading: true, error: null });
    try {
      const asset = await db.createAsset(portfolioId, symbol, type, name, currency, tags);
      set((state) => {
        const assets = new Map(state.assets);
        const portfolioAssets = assets.get(portfolioId) || [];
        assets.set(portfolioId, [...portfolioAssets, asset]);
        return { assets, isLoading: false };
      });
      return asset;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateAsset: async (
    id: string,
    updates: { symbol?: string; name?: string; type?: Asset['type']; currency?: string }
  ) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await db.updateAsset(id, updates);
      if (updated) {
        set((state) => {
          const assets = new Map(state.assets);
          for (const [portfolioId, portfolioAssets] of assets) {
            const index = portfolioAssets.findIndex((a) => a.id === id);
            if (index !== -1) {
              const newAssets = [...portfolioAssets];
              newAssets[index] = updated;
              assets.set(portfolioId, newAssets);
              break;
            }
          }
          return { assets, isLoading: false };
        });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteAsset: async (id: string, portfolioId: string) => {
    set({ isLoading: true, error: null });
    try {
      await db.deleteAsset(id);
      set((state) => {
        const assets = new Map(state.assets);
        const portfolioAssets = assets.get(portfolioId) || [];
        assets.set(
          portfolioId,
          portfolioAssets.filter((a) => a.id !== id)
        );

        const assetStats = new Map(state.assetStats);
        assetStats.delete(id);

        return { assets, assetStats, isLoading: false };
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadAssetStats: async (assetId: string, portfolioCurrency: string) => {
    try {
      const asset = await db.getAssetById(assetId);
      if (!asset) return null;

      const stats = await calculateAssetStats(asset, portfolioCurrency);
      set((state) => {
        const assetStats = new Map(state.assetStats);
        assetStats.set(assetId, stats);
        return { assetStats };
      });
      return stats;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  loadPortfolioStats: async (portfolioId: string) => {
    try {
      const portfolio = await db.getPortfolioById(portfolioId);
      if (!portfolio) {
        return null;
      }

      const { portfolioStats: stats, assetStats: newAssetStats } = await calculatePortfolioStats(portfolio);
      set((state) => {
        const portfolioStats = new Map(state.portfolioStats);
        portfolioStats.set(portfolioId, stats);

        // Also update all asset stats from the batch calculation
        const assetStats = new Map(state.assetStats);
        for (const [assetId, assetStat] of newAssetStats) {
          assetStats.set(assetId, assetStat);
        }

        return { portfolioStats, assetStats };
      });
      return stats;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  refreshPrices: async () => {
    set({ isLoading: true, error: null });
    try {
      // Clear all cached stats to force re-fetch
      set({
        assetStats: new Map(),
        portfolioStats: new Map(),
        lastPriceUpdate: new Date(),
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

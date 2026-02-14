import { create } from 'zustand';
import { Platform } from 'react-native';

const LAST_PORTFOLIO_KEY = 'last_portfolio_id';
const TABLE_CONFIG_KEY = 'assets_table_config';

// Table column configuration
export type TableColumnId = 'symbol' | 'name' | 'price' | 'today' | 'amount' | 'value' | 'pnl' | 'pnlPercent';

export interface TableColumnConfig {
  id: TableColumnId;
  label: string;
  visible: boolean;
  canHide: boolean; // symbol cannot be hidden
}

export const DEFAULT_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: 'symbol', label: 'Symbol', visible: true, canHide: false },
  { id: 'name', label: 'Name', visible: true, canHide: true },
  { id: 'price', label: 'Price', visible: true, canHide: true },
  { id: 'today', label: 'Today', visible: true, canHide: true },
  { id: 'amount', label: 'Amount', visible: true, canHide: true },
  { id: 'value', label: 'Total Value', visible: true, canHide: true },
  { id: 'pnl', label: 'P&L', visible: false, canHide: true },
  { id: 'pnlPercent', label: 'P&L %', visible: true, canHide: true },
];

export interface TableConfig {
  columns: TableColumnConfig[];
}

const DEFAULT_TABLE_CONFIG: TableConfig = {
  columns: DEFAULT_TABLE_COLUMNS,
};

// Simple storage abstraction
const storage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string | null): Promise<void> => {
    if (Platform.OS === 'web') {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
      return;
    }
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (value) {
        await AsyncStorage.setItem(key, value);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

// Legacy wrapper for portfolio storage
const portfolioStorage = {
  get: async (): Promise<string | null> => storage.get(LAST_PORTFOLIO_KEY),
  set: async (value: string | null): Promise<void> => storage.set(LAST_PORTFOLIO_KEY, value),
};

// Table config storage
const tableConfigStorage = {
  get: async (): Promise<TableConfig> => {
    const stored = await storage.get(TABLE_CONFIG_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<TableConfig>;
        // Merge with defaults to handle new columns added in updates
        return {
          columns: DEFAULT_TABLE_COLUMNS.map(defaultCol => {
            const savedCol = parsed.columns?.find(c => c.id === defaultCol.id);
            return savedCol ? { ...defaultCol, visible: savedCol.visible } : defaultCol;
          }),
        };
      } catch {
        return DEFAULT_TABLE_CONFIG;
      }
    }
    return DEFAULT_TABLE_CONFIG;
  },
  set: async (config: TableConfig): Promise<void> => {
    await storage.set(TABLE_CONFIG_KEY, JSON.stringify(config));
  },
};

// Special ID for "All Portfolios" view
export const ALL_PORTFOLIOS_ID = 'all';

interface UIState {
  // Current portfolio selection
  currentPortfolioId: string | null;

  // Table configuration
  tableConfig: TableConfig;

  // Actions
  setCurrentPortfolio: (id: string | null) => void;
  getLastPortfolioId: () => Promise<string | null>;
  clearLastPortfolioId: (deletedId: string) => Promise<void>;

  // Table config actions
  loadTableConfig: () => Promise<void>;
  setTableConfig: (config: TableConfig) => void;
  toggleColumnVisibility: (columnId: TableColumnId) => void;
}

export const useAppStore = create<UIState>((set, get) => ({
  currentPortfolioId: null,
  tableConfig: DEFAULT_TABLE_CONFIG,

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

  loadTableConfig: async () => {
    const config = await tableConfigStorage.get();
    set({ tableConfig: config });
  },

  setTableConfig: (config: TableConfig) => {
    set({ tableConfig: config });
    tableConfigStorage.set(config);
  },

  toggleColumnVisibility: (columnId: TableColumnId) => {
    const { tableConfig } = get();
    const newColumns = tableConfig.columns.map(col =>
      col.id === columnId && col.canHide
        ? { ...col, visible: !col.visible }
        : col
    );
    const newConfig = { ...tableConfig, columns: newColumns };
    set({ tableConfig: newConfig });
    tableConfigStorage.set(newConfig);
  },
}));

import { create } from 'zustand';
import { Platform } from 'react-native';

const TABLE_CONFIG_KEY = 'assets_table_config';
const SELECTED_PORTFOLIOS_KEY = 'selected_portfolio_ids';

// Table column configuration
export type TableColumnId = 'symbol' | 'name' | 'price' | 'today' | 'amount' | 'value' | 'pnl' | 'pnlPercent' | 'cagr';

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
  { id: 'cagr', label: 'CAGR', visible: true, canHide: true },
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
  /**
   * Which portfolios are currently selected / in view.
   *
   * - null        → no preference; startup falls back to the first portfolio.
   *                 In the "all" view this means show every portfolio.
   * - [id]        → a single portfolio (doubles as "last opened" for startup).
   * - [id1, id2]  → a custom multi-portfolio subset.
   */
  selectedPortfolioIds: string[] | null;

  // Table configuration
  tableConfig: TableConfig;

  // Portfolio selection actions
  setSelectedPortfolioIds: (ids: string[] | null) => void;
  /**
   * Load persisted selection from storage and return it so the caller can
   * use the value immediately (e.g. for startup navigation in index.tsx).
   */
  loadSelectedPortfolioIds: () => Promise<string[] | null>;
  /** Remove a deleted portfolio from the persisted selection. */
  clearPortfolioFromSelection: (deletedId: string) => void;

  // Table config actions
  loadTableConfig: () => Promise<void>;
  setTableConfig: (config: TableConfig) => void;
  toggleColumnVisibility: (columnId: TableColumnId) => void;
}

export const useAppStore = create<UIState>((set, get) => ({
  selectedPortfolioIds: null,
  tableConfig: DEFAULT_TABLE_CONFIG,

  setSelectedPortfolioIds: (ids: string[] | null) => {
    // Skip if the value is semantically the same to avoid unnecessary re-renders
    // (e.g. useFocusEffect may call this with a new array reference but identical content).
    const current = get().selectedPortfolioIds;
    if (ids === current) return;
    if (
      ids !== null && current !== null &&
      ids.length === current.length &&
      ids.every((id, i) => id === current[i])
    ) return;

    set({ selectedPortfolioIds: ids });
    storage.set(SELECTED_PORTFOLIOS_KEY, ids ? JSON.stringify(ids) : null);
  },

  loadSelectedPortfolioIds: async () => {
    const stored = await storage.get(SELECTED_PORTFOLIOS_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored) as string[];
        const validIds = Array.isArray(ids) && ids.length > 0 ? ids : null;
        set({ selectedPortfolioIds: validIds });
        return validIds;
      } catch {
        set({ selectedPortfolioIds: null });
      }
    }
    return null;
  },

  clearPortfolioFromSelection: (deletedId: string) => {
    const { selectedPortfolioIds } = get();
    if (selectedPortfolioIds === null) return;
    const updated = selectedPortfolioIds.filter(id => id !== deletedId);
    const newSelection = updated.length > 0 ? updated : null;
    set({ selectedPortfolioIds: newSelection });
    storage.set(SELECTED_PORTFOLIOS_KEY, newSelection ? JSON.stringify(newSelection) : null);
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

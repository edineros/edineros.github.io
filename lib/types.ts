export type AssetType = 'stock' | 'etf' | 'crypto' | 'bitcoin' | 'bond' | 'commodity' | 'cash' | 'realEstate' | 'other';
export type TransactionType = 'buy' | 'sell';

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
}

// Runtime array for validation (must match AssetType union)
export const VALID_ASSET_TYPES: AssetType[] = ['cash', 'stock', 'etf', 'bitcoin', 'crypto', 'commodity', 'realEstate', 'bond', 'other'];

export function isValidAssetType(type: string): type is AssetType {
  return VALID_ASSET_TYPES.includes(type as AssetType);
}

export interface Portfolio {
  id: string;
  name: string;
  currency: string;
  masked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  type: AssetType;
  currency: string;
  categoryId: string | null;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  fee: number;
  date: Date;
  notes: string | null;
  lotId: string | null;
  createdAt: Date;
}

export interface Lot {
  id: string;
  assetId: string;
  buyTransactionId: string;
  originalQuantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  purchaseDate: Date;
  notes: string | null;
}

export interface AssetWithStats extends Asset {
  totalQuantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number | null;
  /** Current value in asset's currency */
  currentValue: number | null;
  /** Current value converted to portfolio currency (for aggregation/charts) */
  valueInPortfolioCurrency: number | null;
  unrealizedGain: number | null;
  unrealizedGainPercent: number | null;
  lots: Lot[];
}

export interface PortfolioWithStats extends Portfolio {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number | null;
  assetCount: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  portfolios: Portfolio[];
  categories: Category[];
  assets: Asset[];
  transactions: Transaction[];
}

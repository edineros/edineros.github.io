export type AssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'commodity' | 'cash' | 'real-estate' | 'other';
export type TransactionType = 'buy' | 'sell';

// Runtime array for validation (must match AssetType union)
export const VALID_ASSET_TYPES: AssetType[] = ['stock', 'etf', 'crypto', 'bond', 'commodity', 'cash', 'real-estate', 'other'];

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
  tags: string[];
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
  tags: string[];
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
  tags: string[];
}

export interface CachedPrice {
  symbol: string;
  assetType: string;
  price: number;
  currency: string;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface AssetWithStats extends Asset {
  totalQuantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number | null;
  currentValue: number | null;
  unrealizedGain: number | null;
  unrealizedGainPercent: number | null;
  lots: Lot[];
}

export interface PortfolioWithStats extends Portfolio {
  totalValue: number | null;
  totalCost: number;
  totalGain: number | null;
  totalGainPercent: number | null;
  assetCount: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  portfolios: Portfolio[];
  assets: Asset[];
  transactions: Transaction[];
}

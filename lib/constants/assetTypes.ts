import { assetColors } from '../theme/colors';
import type { AssetType } from '../types';

export interface AssetTypeConfig {
  value: AssetType;
  label: string;
  plural: string;
  color: string;
}

export const ASSET_TYPE_CONFIGS: AssetTypeConfig[] = [
  {
    value: 'stock',
    label: 'Stock',
    plural: 'Stocks',
    color: assetColors[0],
  },
  {
    value: 'etf',
    label: 'ETF',
    plural: 'ETFs',
    color: assetColors[1],
  },
  {
    value: 'bitcoin',
    label: 'Bitcoin',
    plural: 'Bitcoin',
    color: assetColors[2],
  },
  {
    value: 'crypto',
    label: 'Crypto',
    plural: 'Crypto',
    color: assetColors[3],
  },
  {
    value: 'bond',
    label: 'Bond',
    plural: 'Bonds',
    color: assetColors[4],
  },
  {
    value: 'commodity',
    label: 'Commodity',
    plural: 'Commodities',
    color: assetColors[5],
  },
  {
    value: 'cash',
    label: 'Cash',
    plural: 'Cash',
    color: assetColors[6],
  },
  {
    value: 'realEstate',
    label: 'Real Estate',
    plural: 'Real Estate',
    color: assetColors[7],
  },
  {
    value: 'other',
    label: 'Other',
    plural: 'Other',
    color: assetColors[8],
  },
];

// Lookup maps for quick access
const labelMap = new Map<AssetType, string>();
const pluralMap = new Map<AssetType, string>();
const colorMap = new Map<AssetType, string>();

for (const config of ASSET_TYPE_CONFIGS) {
  labelMap.set(config.value, config.label);
  pluralMap.set(config.value, config.plural);
  colorMap.set(config.value, config.color);
}

export function getAssetTypeLabel(type: AssetType): string {
  return labelMap.get(type) || type;
}

export function getAssetTypePlural(type: AssetType): string {
  return pluralMap.get(type) || type;
}

export function getAssetTypeColor(type: AssetType): string {
  return colorMap.get(type) || '#8E8E93';
}

/**
 * Simple asset types don't require a symbol and don't fetch live market prices.
 * Their current price is the average purchase price from lots.
 * Value is calculated as: quantity × average_purchase_price.
 */
export const SIMPLE_ASSET_TYPES: AssetType[] = ['cash', 'realEstate', 'other'];

export function isSimpleAssetType(type: AssetType): boolean {
  return SIMPLE_ASSET_TYPES.includes(type);
}

// Map for getting the sort order of asset types
const typeOrderMap = new Map<AssetType, number>();
ASSET_TYPE_CONFIGS.forEach((config, index) => {
  typeOrderMap.set(config.value, index);
});

export function getAssetTypeSortOrder(type: AssetType): number {
  return typeOrderMap.get(type) ?? 999;
}

/**
 * Base currency for all crypto prices.
 * All crypto providers (Kraken, future providers) return prices in USD.
 */
export const CRYPTO_BASE_CURRENCY = 'USD';

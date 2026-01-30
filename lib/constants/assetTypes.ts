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
    color: '#007AFF',
  },
  {
    value: 'etf',
    label: 'ETF',
    plural: 'ETFs',
    color: '#5856D6',
  },
  {
    value: 'crypto',
    label: 'Crypto',
    plural: 'Crypto',
    color: '#FF9500',
  },
  {
    value: 'bond',
    label: 'Bond',
    plural: 'Bonds',
    color: '#34C759',
  },
  {
    value: 'commodity',
    label: 'Commodity',
    plural: 'Commodities',
    color: '#FFCC00',
  },
  {
    value: 'cash',
    label: 'Cash',
    plural: 'Cash',
    color: '#8E8E93',
  },
  {
    value: 'real-estate',
    label: 'Real Estate',
    plural: 'Real Estate',
    color: '#00D4AA',
  },
  {
    value: 'other',
    label: 'Other',
    plural: 'Other',
    color: '#AF52DE',
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
export const SIMPLE_ASSET_TYPES: AssetType[] = ['cash', 'real-estate', 'other'];

export function isSimpleAssetType(type: AssetType): boolean {
  return SIMPLE_ASSET_TYPES.includes(type);
}

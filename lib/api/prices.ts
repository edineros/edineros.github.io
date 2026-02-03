import type { AssetType } from '../types';
import {
  getValidCachedPrice,
  setCachedPrice,
  getValidExchangeRate,
  setCachedExchangeRate,
} from '../db/priceCache';
import { fetchYahooPrice, searchYahooSymbol } from './providers/yahoo';
import { fetchKrakenPrice, searchKrakenAssets } from './providers/kraken';
import { fetchExchangeRate } from './providers/frankfurter';
import { isSimpleAssetType } from '../constants/assetTypes';

// TTL in minutes for different asset types
const PRICE_TTL: Record<AssetType, number> = {
  stock: 15,
  etf: 15,
  crypto: 5,
  bitcoin: 5,
  bond: 60,
  commodity: 15,
  cash: 1440, // 24 hours
  'real-estate': 1440, // 24 hours - manually valued
  other: 30,
};

export interface PriceResult {
  price: number;
  currency: string;
  name?: string;
  fromCache: boolean;
  fetchedAt: Date;
}

// Fetch from appropriate provider based on asset type
async function fetchFromProvider(
  symbol: string,
  assetType: AssetType,
  preferredCurrency?: string
): Promise<{ price: number; currency: string; name?: string } | null> {
  if (assetType === 'crypto' || assetType === 'bitcoin') {
    // Use Kraken for all crypto and bitcoin assets
    return await fetchKrakenPrice(symbol, preferredCurrency);
  }

  // Simple asset types (cash, real-estate, other) don't fetch prices
  // Price is always 1 in the asset's currency (value comes from quantity in lots)
  if (isSimpleAssetType(assetType)) {
    return { price: 1, currency: preferredCurrency || 'EUR' };
  }

  // Stocks, ETFs, bonds, commodities - use Yahoo Finance
  return await fetchYahooPrice(symbol);
}

export async function fetchPrice(
  symbol: string,
  assetType: AssetType,
  preferredCurrency?: string,
  forceRefresh?: boolean
): Promise<PriceResult | null> {
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cached = await getValidCachedPrice(symbol);
    if (cached) {
      return {
        price: cached.price,
        currency: cached.currency,
        fromCache: true,
        fetchedAt: cached.fetchedAt,
      };
    }
  }

  const result = await fetchFromProvider(symbol, assetType, preferredCurrency);
  if (!result) {
    return null;
  }

  // Cache the result
  await setCachedPrice(
    symbol,
    assetType,
    result.price,
    result.currency,
    PRICE_TTL[assetType]
  );

  return {
    price: result.price,
    currency: result.currency,
    name: result.name,
    fromCache: false,
    fetchedAt: new Date(),
  };
}

// Refresh price (regular fetch but ignore cache)
export async function refreshPrice(
  symbol: string,
  assetType: AssetType,
  preferredCurrency?: string
): Promise<PriceResult | null> {
  return await fetchPrice(symbol, assetType, preferredCurrency, true);
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  // Check cache first
  const cached = await getValidExchangeRate(fromCurrency, toCurrency);
  if (cached) {
    return amount * cached.rate;
  }

  // Fetch fresh rate
  const rate = await fetchExchangeRate(fromCurrency, toCurrency);
  if (rate === null) {
    return null;
  }

  // Cache the rate
  await setCachedExchangeRate(fromCurrency, toCurrency, rate, 60);

  return amount * rate;
}

export async function getExchangeRateWithCache(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  const cached = await getValidExchangeRate(fromCurrency, toCurrency);
  if (cached) {
    return cached.rate;
  }

  const rate = await fetchExchangeRate(fromCurrency, toCurrency);
  if (rate !== null) {
    await setCachedExchangeRate(fromCurrency, toCurrency, rate, 60);
  }

  return rate;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

export async function searchSymbol(
  query: string,
  assetType?: AssetType
): Promise<SearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  if (assetType === 'crypto') {
    const results = await searchKrakenAssets(query);
    return results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      type: 'Cryptocurrency',
    }));
  }

  // Default to Yahoo for stocks/ETFs
  const results = await searchYahooSymbol(query);
  return results.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    type: r.type,
    exchange: r.exchange,
  }));
}

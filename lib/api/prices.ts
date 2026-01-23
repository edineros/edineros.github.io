import type { AssetType } from '../types';
import {
  getValidCachedPrice,
  setCachedPrice,
  getValidExchangeRate,
  setCachedExchangeRate,
} from '../db/priceCache';
import { fetchYahooPrice, searchYahooSymbol } from './providers/yahoo';
import { fetchCoinGeckoPrice, searchCoinGecko, getCoinGeckoId } from './providers/coingecko';
import { fetchExchangeRate } from './providers/frankfurter';

// TTL in minutes for different asset types
const PRICE_TTL: Record<AssetType, number> = {
  stock: 15,
  etf: 15,
  crypto: 5,
  bond: 60,
  commodity: 15,
  forex: 60,
  cash: 1440, // 24 hours
  other: 30,
};

export interface PriceResult {
  price: number;
  currency: string;
  name?: string;
  fromCache: boolean;
  fetchedAt: Date;
}

export async function fetchPrice(
  symbol: string,
  assetType: AssetType
): Promise<PriceResult | null> {
  // Check cache first
  const cached = await getValidCachedPrice(symbol);
  if (cached) {
    return {
      price: cached.price,
      currency: cached.currency,
      fromCache: true,
      fetchedAt: cached.fetchedAt,
    };
  }

  // Fetch from appropriate provider
  let result: { price: number; currency: string; name?: string } | null = null;

  if (assetType === 'crypto') {
    result = await fetchCoinGeckoPrice(symbol);
  } else if (assetType === 'cash') {
    // Cash is always worth 1 in its currency
    return {
      price: 1,
      currency: symbol.toUpperCase(),
      fromCache: false,
      fetchedAt: new Date(),
    };
  } else {
    // Stocks, ETFs, bonds, commodities - use Yahoo Finance
    result = await fetchYahooPrice(symbol);
  }

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
    const results = await searchCoinGecko(query);
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

// Refresh price (ignore cache)
export async function refreshPrice(
  symbol: string,
  assetType: AssetType
): Promise<PriceResult | null> {
  let result: { price: number; currency: string; name?: string } | null = null;

  if (assetType === 'crypto') {
    result = await fetchCoinGeckoPrice(symbol);
  } else if (assetType === 'cash') {
    return {
      price: 1,
      currency: symbol.toUpperCase(),
      fromCache: false,
      fetchedAt: new Date(),
    };
  } else {
    result = await fetchYahooPrice(symbol);
  }

  if (!result) {
    return null;
  }

  // Update cache
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

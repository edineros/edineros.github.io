import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './config/queryKeys';
import { PRICE_STALE_TIME } from './config/queryClient';
import { isSimpleAssetType } from '../constants/assetTypes';
import type { Asset, AssetType } from '../types';

// Raw fetch functions - no caching logic, just API calls
import { fetchYahooPrice } from '../api/providers/yahoo';
import { fetchKrakenPrice, fetchKrakenPrices } from '../api/providers/kraken';

export interface PriceData {
  price: number;
  currency: string;
  name?: string;
}

async function fetchPriceFromProvider(
  symbol: string,
  assetType: AssetType,
  assetCurrency?: string
): Promise<PriceData | null> {
  // Simple asset types (cash, realEstate, other) don't fetch prices
  // Price is always 1 in the asset's currency
  if (isSimpleAssetType(assetType)) {
    return { price: 1, currency: assetCurrency || 'EUR' };
  }

  // Crypto prices are in USD, conversion handled by exchange rates
  if (assetType === 'crypto' || assetType === 'bitcoin') {
    return fetchKrakenPrice(symbol);
  }

  // Stocks, ETFs, bonds, commodities - use Yahoo Finance
  return fetchYahooPrice(symbol);
}

export function usePrice(
  symbol: string | undefined,
  assetType: AssetType | undefined,
  preferredCurrency?: string
) {
  return useQuery({
    queryKey: queryKeys.prices.single(symbol ?? '', assetType ?? 'stock'),
    queryFn: () => fetchPriceFromProvider(symbol!, assetType!, preferredCurrency),
    enabled: !!symbol && !!assetType,
    staleTime: assetType ? PRICE_STALE_TIME[assetType] : PRICE_STALE_TIME.stock,
  });
}

export function usePrices(assets: Asset[] | undefined, portfolioCurrency?: string) {
  const queries = (assets ?? [])
    .filter((asset) => !isSimpleAssetType(asset.type))
    .map((asset) => ({
      queryKey: queryKeys.prices.single(asset.symbol, asset.type),
      queryFn: () => fetchPriceFromProvider(asset.symbol, asset.type, portfolioCurrency),
      staleTime: PRICE_STALE_TIME[asset.type],
    }));

  return useQueries({ queries });
}

// Hook to batch fetch crypto prices (more efficient for multiple crypto assets)
// Always fetches in EUR, conversion handled by exchange rates
export function useCryptoPrices(symbols: string[] | undefined) {
  return useQuery({
    queryKey: ['prices', 'crypto', 'batch', ...(symbols ?? [])],
    queryFn: async () => {
      if (!symbols || symbols.length === 0) {
        return {} as Record<string, PriceData>;
      }
      return fetchKrakenPrices(symbols);
    },
    enabled: !!symbols && symbols.length > 0,
    staleTime: PRICE_STALE_TIME.crypto,
  });
}

// Hook to invalidate all price queries (for pull-to-refresh)
export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.prices.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.exchangeRates.all });
  };
}

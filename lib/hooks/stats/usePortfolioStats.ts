import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { usePortfolio, usePortfolios } from '../usePortfolios';
import { useAssets } from '../useAssets';
import { queryKeys } from '../config/queryKeys';
import { PRICE_STALE_TIME, EXCHANGE_RATE_STALE_TIME } from '../config/queryClient';
import { isSimpleAssetType } from '../../constants/assetTypes';
import { getLotsForAsset } from '../../db/transactions';
import { fetchYahooPrice } from '../../api/providers/yahoo';
import { fetchKrakenPrices } from '../../api/providers/kraken';
import { fetchExchangeRate } from '../../api/providers/frankfurter';
import type { Asset, AssetWithStats, PortfolioWithStats, Lot } from '../../types';
import { ALL_PORTFOLIOS_ID } from '../../../store';

interface AssetStatsData {
  asset: Asset;
  lots: Lot[];
  price: number | null;
  priceCurrency: string | null;
  exchangeRate: number | null;
}

const EMPTY_STATS = { assetStats: new Map<string, AssetWithStats>(), portfolioStats: null };

function calculateSingleAssetStats(
  data: AssetStatsData,
  portfolioCurrency: string
): AssetWithStats {
  const { asset, lots, price, priceCurrency, exchangeRate } = data;
  const isSimple = isSimpleAssetType(asset.type);

  const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + lot.remainingQuantity * lot.purchasePrice,
    0
  );
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  let currentPrice: number | null = isSimple ? averageCost : price;
  let currentValue: number | null = null;
  let unrealizedGain: number | null = null;
  let unrealizedGainPercent: number | null = null;

  if (currentPrice !== null) {
    // Convert price to asset currency if needed (for market assets)
    if (!isSimple && priceCurrency && priceCurrency !== asset.currency) {
      // This would need price-to-asset rate, but we simplify by assuming provider returns in correct currency
    }

    currentValue = totalQuantity * currentPrice;

    // Convert to portfolio currency
    const needsConversion = asset.currency !== portfolioCurrency;
    if (needsConversion && exchangeRate !== null) {
      currentValue = currentValue * exchangeRate;
      const costConverted = totalCost * exchangeRate;
      unrealizedGain = currentValue - costConverted;
      unrealizedGainPercent = costConverted > 0 ? (unrealizedGain / costConverted) * 100 : 0;
    } else if (!needsConversion) {
      unrealizedGain = currentValue - totalCost;
      unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;
    }
  }

  return {
    ...asset,
    totalQuantity,
    averageCost,
    totalCost,
    currentPrice,
    currentValue,
    unrealizedGain,
    unrealizedGainPercent,
    lots,
  };
}

export interface PortfolioStatsResult {
  portfolio: PortfolioWithStats | null;
  assetStats: Map<string, AssetWithStats>;
  isLoading: boolean;
  hasPartialData: boolean;
}

/**
 * Hook to get portfolio stats.
 * - For a single portfolio: usePortfolioStats(portfolioId)
 * - For all portfolios: usePortfolioStats(ALL_PORTFOLIOS_ID, displayCurrency)
 */
export function usePortfolioStats(
  portfolioId: string | undefined,
  displayCurrency?: string
): PortfolioStatsResult {
  const isAllPortfolios = portfolioId === ALL_PORTFOLIOS_ID;

  // For single portfolio, fetch portfolio data; for all, fetch all portfolios
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(
    isAllPortfolios ? undefined : portfolioId
  );
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();

  // Fetch assets (useAssets handles both single and all cases)
  const { data: assets, isLoading: assetsLoading } = useAssets(portfolioId);

  const currency = isAllPortfolios
    ? (displayCurrency ?? 'EUR')
    : (portfolio?.currency ?? 'EUR');

  // Fetch lots for all assets
  const lotsQueries = useQueries({
    queries: (assets ?? []).map((asset) => ({
      queryKey: queryKeys.lots.byAsset(asset.id),
      queryFn: () => getLotsForAsset(asset.id),
    })),
  });

  // Fetch prices for market assets (non-simple)
  const marketAssets = (assets ?? []).filter((a) => !isSimpleAssetType(a.type));

  // Group assets by type for efficient fetching
  const cryptoAssets = marketAssets.filter((a) => a.type === 'crypto' || a.type === 'bitcoin');
  const otherMarketAssets = marketAssets.filter((a) => a.type !== 'crypto' && a.type !== 'bitcoin');

  // Batch fetch crypto prices (deduplicated and sorted for consistent query key)
  const cryptoSymbols = [...new Set(cryptoAssets.map((a) => a.symbol))].sort();
  const { data: cryptoPrices, isLoading: cryptoPricesLoading } = useQuery({
    queryKey: ['prices', 'crypto', 'batch', currency, ...cryptoSymbols],
    queryFn: async () => {
      if (cryptoSymbols.length === 0) {
        return {} as Record<string, { price: number; currency: string }>;
      }
      return fetchKrakenPrices(cryptoSymbols, currency);
    },
    enabled: cryptoSymbols.length > 0,
    staleTime: PRICE_STALE_TIME.crypto,
  });

  // Fetch individual prices for other market assets (deduplicated)
  const uniqueOtherAssets = otherMarketAssets.filter(
    (asset, index, arr) => arr.findIndex((a) => a.symbol === asset.symbol) === index
  );
  const otherPriceQueries = useQueries({
    queries: uniqueOtherAssets.map((asset) => ({
      queryKey: queryKeys.prices.single(asset.symbol, asset.type),
      queryFn: () => fetchYahooPrice(asset.symbol),
      staleTime: PRICE_STALE_TIME[asset.type],
    })),
  });

  // Fetch exchange rates for assets not in portfolio currency
  const uniqueCurrencies = [...new Set((assets ?? []).map((a) => a.currency))];
  const currenciesNeedingConversion = uniqueCurrencies.filter((c) => c !== currency);

  const exchangeRateQueries = useQueries({
    queries: currenciesNeedingConversion.map((curr) => ({
      queryKey: queryKeys.exchangeRates.pair(curr, currency),
      queryFn: () => fetchExchangeRate(curr, currency),
      staleTime: EXCHANGE_RATE_STALE_TIME,
    })),
  });

  const isLoading = (
    (isAllPortfolios ? portfoliosLoading : portfolioLoading) ||
    assetsLoading ||
    lotsQueries.some((q) => q.isLoading) ||
    cryptoPricesLoading ||
    otherPriceQueries.some((q) => q.isLoading) ||
    exchangeRateQueries.some((q) => q.isLoading)
  )

  // Build exchange rate map
  const exchangeRateMap = useMemo(() => {
    const map = new Map<string, number>();
    currenciesNeedingConversion.forEach((curr, index) => {
      const rate = exchangeRateQueries[index]?.data;
      if (rate !== null && rate !== undefined) {
        map.set(curr, rate);
      }
    });
    return map;
  }, [currenciesNeedingConversion, exchangeRateQueries]);

  // Build price map for other market assets
  const otherPriceMap = useMemo(() => {
    const map = new Map<string, { price: number; currency: string }>();
    uniqueOtherAssets.forEach((asset, index) => {
      const priceData = otherPriceQueries[index]?.data;
      if (priceData) {
        map.set(asset.symbol, priceData);
      }
    });
    return map;
  }, [uniqueOtherAssets, otherPriceQueries]);

  // Calculate stats for each asset
  const { assetStats, portfolioStats } = useMemo(() => {
    // Validation differs for single vs all portfolios
    if (isAllPortfolios) {
      if (!portfolios || portfolios.length === 0 || !assets) {
        return EMPTY_STATS;
      }
    } else {
      if (!portfolio || !assets) {
        return EMPTY_STATS;
      }
    }

    const statsMap = new Map<string, AssetWithStats>();
    let totalValue: number | null = 0;
    let totalCost = 0;
    let hasAllPrices = true;

    assets.forEach((asset, index) => {
      const lots = lotsQueries[index]?.data ?? [];
      const isSimple = isSimpleAssetType(asset.type);

      let price: number | null = null;
      let priceCurrency: string | null = null;

      if (!isSimple) {
        if (asset.type === 'crypto' || asset.type === 'bitcoin') {
          const priceData = cryptoPrices?.[asset.symbol];
          if (priceData) {
            price = priceData.price;
            priceCurrency = priceData.currency;
          }
        } else {
          const priceData = otherPriceMap.get(asset.symbol);
          if (priceData) {
            price = priceData.price;
            priceCurrency = priceData.currency;
          }
        }
      }

      const exchangeRate = asset.currency !== currency
        ? exchangeRateMap.get(asset.currency) ?? null
        : 1;

      const stats = calculateSingleAssetStats(
        { asset, lots, price, priceCurrency, exchangeRate },
        currency
      );
      statsMap.set(asset.id, stats);

      // Accumulate totals
      let assetCost = stats.totalCost;
      if (asset.currency !== currency && exchangeRate !== null) {
        assetCost = stats.totalCost * exchangeRate;
      }
      totalCost += assetCost;

      if (stats.currentValue !== null) {
        totalValue = (totalValue ?? 0) + stats.currentValue;
      } else {
        hasAllPrices = false;
      }
    });

    if (!hasAllPrices) {
      totalValue = null;
    }

    const totalGain = totalValue !== null ? totalValue - totalCost : null;
    const totalGainPercent =
      totalGain !== null && totalCost > 0 ? (totalGain / totalCost) * 100 : null;

    // Build portfolio stats differently for single vs all
    const portfolioWithStats: PortfolioWithStats = {
      ...(isAllPortfolios ? {
        id: ALL_PORTFOLIOS_ID,
        name: 'All Portfolios',
        currency,
        masked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : portfolio!),
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      assetCount: assets.length,
    };


    return { assetStats: statsMap, portfolioStats: portfolioWithStats };
  }, [isAllPortfolios, portfolio, portfolios, assets, lotsQueries, cryptoPrices, otherPriceMap, exchangeRateMap, currency]);

  const hasPartialData = isAllPortfolios
    ? (!!portfolios && portfolios.length > 0 && !!assets && assetStats.size > 0)
    : (!!portfolio && !!assets && assets.length > 0 && assetStats.size > 0);

  return {
    portfolio: portfolioStats,
    assetStats,
    isLoading,
    hasPartialData,
  };
}

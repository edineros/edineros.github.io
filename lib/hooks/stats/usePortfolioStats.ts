import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { usePortfolios } from '../usePortfolios';
import { useAssets } from '../useAssets';
import { queryKeys } from '../config/queryKeys';
import { PRICE_STALE_TIME, EXCHANGE_RATE_STALE_TIME } from '../config/queryClient';
import { isSimpleAssetType, CRYPTO_BASE_CURRENCY } from '../../constants/assetTypes';
import { getLotsForAsset } from '../../db/transactions';
import { fetchYahooPrice } from '../../api/providers/yahoo';
import { fetchKrakenPrices } from '../../api/providers/kraken';
import { fetchExchangeRate } from '../../api/providers/frankfurter';
import { calculateCAGR } from '../../utils/calculations';
import type { Asset, AssetWithStats, PortfolioWithStats, Lot, PriceData } from '../../types';

interface AssetStatsData {
  asset: Asset;
  lots: Lot[];
  price: number | null;
  priceCurrency: string | null;
  priceToAssetRate: number | null;
  assetToPortfolioRate: number | null;
  todayChangePercent: number | null;
}

const EMPTY_STATS = { assetStats: new Map<string, AssetWithStats>(), portfolioStats: null, pendingPriceCount: 0 };

interface SingleAssetStatsResult {
  stats: AssetWithStats;
  /** Value in portfolio currency for aggregation */
  valueInPortfolioCurrency: number | null;
  /** Cost in portfolio currency for aggregation */
  costInPortfolioCurrency: number | null;
}

function calculateSingleAssetStats(
  data: AssetStatsData,
  portfolioCurrency: string
): SingleAssetStatsResult {
  const { asset, lots, price, priceCurrency, priceToAssetRate, assetToPortfolioRate, todayChangePercent } = data;
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
  let valueInPortfolioCurrency: number | null = null;
  let costInPortfolioCurrency: number | null = null;

  if (currentPrice !== null) {
    // Convert price from API currency to asset currency if needed
    if (!isSimple && priceCurrency && priceCurrency !== asset.currency && priceToAssetRate !== null) {
      currentPrice = currentPrice * priceToAssetRate;
    }

    // currentValue stays in asset currency
    currentValue = totalQuantity * currentPrice;

    // Calculate gains in asset currency
    unrealizedGain = currentValue - totalCost;
    unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

    // Calculate portfolio currency values for aggregation
    const needsConversion = asset.currency !== portfolioCurrency;
    if (needsConversion && assetToPortfolioRate !== null) {
      valueInPortfolioCurrency = currentValue * assetToPortfolioRate;
      costInPortfolioCurrency = totalCost * assetToPortfolioRate;
    } else if (!needsConversion) {
      valueInPortfolioCurrency = currentValue;
      costInPortfolioCurrency = totalCost;
    }
  }

  // Calculate CAGR
  const cagr = calculateCAGR(lots, currentValue, totalCost);

  return {
    stats: {
      ...asset,
      totalQuantity,
      averageCost,
      totalCost,
      currentPrice,
      currentValue,
      valueInPortfolioCurrency,
      unrealizedGain,
      unrealizedGainPercent,
      todayChangePercent: isSimple ? null : todayChangePercent,
      cagr,
      lots,
    },
    valueInPortfolioCurrency,
    costInPortfolioCurrency,
  };
}

export interface PortfolioStatsResult {
  portfolio: PortfolioWithStats | null;
  assetStats: Map<string, AssetWithStats>;
  isLoading: boolean;
  hasPartialData: boolean;
  /** Number of assets that still need price data */
  pendingPriceCount: number;
}

/**
 * Compute portfolio stats for any selection of portfolios.
 *
 * @param portfolioIds
 *   - null          → all portfolios
 *   - [id]          → single portfolio (uses an efficient per-portfolio asset query)
 *   - [id1, id2, …] → custom subset (fetches all assets, then filters in memory)
 * @param displayCurrency  Currency used to express aggregated totals.
 */
export function usePortfolioStats(
  portfolioIds: string[] | null,
  displayCurrency: string
): PortfolioStatsResult {
  // When there is exactly one portfolio, use the efficient per-portfolio asset query.
  const singlePortfolioId = portfolioIds?.length === 1 ? portfolioIds[0] : undefined;

  // Always load the full portfolio list (needed for validation and name lookup).
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();

  // Fetch assets: scoped to one portfolio when single, all portfolios otherwise.
  const { data: assets, isLoading: assetsLoading } = useAssets(singlePortfolioId);

  // For a multi-portfolio filter, narrow the full asset list down in memory.
  const effectiveAssets = useMemo(() => {
    if (portfolioIds !== null && portfolioIds.length > 1) {
      return (assets ?? []).filter((a) => portfolioIds.includes(a.portfolioId));
    }
    return assets ?? [];
  }, [assets, portfolioIds]);

  // Fetch lots for all relevant assets
  const lotsQueries = useQueries({
    queries: effectiveAssets.map((asset) => ({
      queryKey: queryKeys.lots.byAsset(asset.id),
      queryFn: () => getLotsForAsset(asset.id),
    })),
  });

  // Group assets by type for price fetching
  const cryptoAssets = effectiveAssets.filter((a) => a.type === 'crypto' || a.type === 'bitcoin');
  const otherMarketAssets = effectiveAssets.filter((a) => !isSimpleAssetType(a.type) && a.type !== 'crypto' && a.type !== 'bitcoin');

  // Batch fetch crypto prices (always in USD, conversion handled by exchange rates)
  const cryptoSymbols = [...new Set(cryptoAssets.map((a) => a.symbol))].sort();
  const { data: cryptoPrices, isLoading: cryptoPricesLoading } = useQuery({
    queryKey: ['prices', 'crypto', 'batch', ...cryptoSymbols],
    queryFn: async () => {
      if (cryptoSymbols.length === 0) {
        return {} as Record<string, PriceData>;
      }
      return fetchKrakenPrices(cryptoSymbols);
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

  // Fetch exchange rates
  const uniqueAssetCurrencies = [...new Set(effectiveAssets.map((a) => a.currency))];

  // Asset → display currency rates (for value aggregation)
  const currenciesNeedingPortfolioConversion = uniqueAssetCurrencies.filter((c) => c !== displayCurrency);
  const assetToPortfolioRateQueries = useQueries({
    queries: currenciesNeedingPortfolioConversion.map((curr) => ({
      queryKey: queryKeys.exchangeRates.pair(curr, displayCurrency),
      queryFn: () => fetchExchangeRate(curr, displayCurrency),
      staleTime: EXCHANGE_RATE_STALE_TIME,
    })),
  });

  // USD → asset currency rates (for converting crypto prices)
  const currenciesNeedingCryptoConversion = uniqueAssetCurrencies.filter((c) => c !== CRYPTO_BASE_CURRENCY);
  const cryptoToAssetRateQueries = useQueries({
    queries: currenciesNeedingCryptoConversion.map((curr) => ({
      queryKey: queryKeys.exchangeRates.pair(CRYPTO_BASE_CURRENCY, curr),
      queryFn: () => fetchExchangeRate(CRYPTO_BASE_CURRENCY, curr),
      staleTime: EXCHANGE_RATE_STALE_TIME,
    })),
  });

  const isLoading = (
    portfoliosLoading ||
    assetsLoading ||
    lotsQueries.some((q) => q.isLoading) ||
    cryptoPricesLoading ||
    otherPriceQueries.some((q) => q.isLoading) ||
    assetToPortfolioRateQueries.some((q) => q.isLoading) ||
    cryptoToAssetRateQueries.some((q) => q.isLoading)
  );

  // assetCurrency → rate to convert to display currency
  const assetToPortfolioRateMap = useMemo(() => {
    const map = new Map<string, number>();
    currenciesNeedingPortfolioConversion.forEach((curr, index) => {
      const rate = assetToPortfolioRateQueries[index]?.data;
      if (rate !== null && rate !== undefined) {
        map.set(curr, rate);
      }
    });
    return map;
  }, [currenciesNeedingPortfolioConversion, assetToPortfolioRateQueries]);

  // cryptoBaseCurrency → assetCurrency rates (for converting crypto prices)
  const cryptoToAssetRateMap = useMemo(() => {
    const map = new Map<string, number>();
    currenciesNeedingCryptoConversion.forEach((curr, index) => {
      const rate = cryptoToAssetRateQueries[index]?.data;
      if (rate !== null && rate !== undefined) {
        map.set(curr, rate);
      }
    });
    return map;
  }, [currenciesNeedingCryptoConversion, cryptoToAssetRateQueries]);

  // Build price map for other market assets
  const otherPriceMap = useMemo(() => {
    const map = new Map<string, PriceData>();
    uniqueOtherAssets.forEach((asset, index) => {
      const priceData = otherPriceQueries[index]?.data;
      if (priceData) {
        map.set(asset.symbol, {
          price: priceData.price,
          currency: priceData.currency,
          todayChangePercent: priceData.todayChangePercent ?? null,
        });
      }
    });
    return map;
  }, [uniqueOtherAssets, otherPriceQueries]);

  // Calculate stats for each asset
  const { assetStats, portfolioStats, pendingPriceCount } = useMemo(() => {
    if (!portfolios || portfolios.length === 0 || !assets) {
      return EMPTY_STATS;
    }

    const statsMap = new Map<string, AssetWithStats>();
    let totalValue = 0;
    let totalCost = 0;
    let pendingPriceCount = 0;

    effectiveAssets.forEach((asset, index) => {
      const lots = lotsQueries[index]?.data ?? [];
      const isSimple = isSimpleAssetType(asset.type);

      let price: number | null = null;
      let priceCurrency: string | null = null;
      let todayChangePercent: number | null = null;

      if (!isSimple) {
        if (asset.type === 'crypto' || asset.type === 'bitcoin') {
          const priceData = cryptoPrices?.[asset.symbol];
          if (priceData) {
            price = priceData.price;
            priceCurrency = priceData.currency;
            todayChangePercent = priceData.todayChangePercent ?? null;
          }
        } else {
          const priceData = otherPriceMap.get(asset.symbol);
          if (priceData) {
            price = priceData.price;
            priceCurrency = priceData.currency;
            todayChangePercent = priceData.todayChangePercent ?? null;
          }
        }
      }

      const assetToPortfolioRate = asset.currency !== displayCurrency
        ? assetToPortfolioRateMap.get(asset.currency) ?? null
        : 1;

      let priceToAssetRate: number | null = null;
      if (priceCurrency && priceCurrency !== asset.currency) {
        if (priceCurrency === CRYPTO_BASE_CURRENCY) {
          priceToAssetRate = cryptoToAssetRateMap.get(asset.currency) ?? null;
        }
      }

      const result = calculateSingleAssetStats(
        { asset, lots, price, priceCurrency, priceToAssetRate, assetToPortfolioRate, todayChangePercent },
        displayCurrency
      );
      statsMap.set(asset.id, result.stats);

      if (result.valueInPortfolioCurrency !== null) {
        totalValue += result.valueInPortfolioCurrency;
      } else {
        pendingPriceCount++;
      }

      if (result.costInPortfolioCurrency !== null) {
        totalCost += result.costInPortfolioCurrency;
      }
    });

    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : null;

    // For a single portfolio, look it up from the list for its name / metadata.
    const singlePortfolio = singlePortfolioId
      ? portfolios.find((p) => p.id === singlePortfolioId) ?? null
      : null;

    const portfolioWithStats: PortfolioWithStats = {
      ...(singlePortfolio ?? {
        id: '',
        name: 'All Portfolios',
        currency: displayCurrency,
        masked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      assetCount: effectiveAssets.length,
    };

    return { assetStats: statsMap, portfolioStats: portfolioWithStats, pendingPriceCount };
  }, [
    portfolios,
    assets,
    effectiveAssets,
    lotsQueries,
    cryptoPrices,
    otherPriceMap,
    assetToPortfolioRateMap,
    cryptoToAssetRateMap,
    displayCurrency,
    singlePortfolioId,
  ]);

  const hasPartialData = !!portfolios && portfolios.length > 0 && !!assets && effectiveAssets.length > 0 && assetStats.size > 0;

  return {
    portfolio: portfolioStats,
    assetStats,
    isLoading,
    hasPartialData,
    pendingPriceCount,
  };
}

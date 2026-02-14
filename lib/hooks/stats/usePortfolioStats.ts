import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { usePortfolio, usePortfolios } from '../usePortfolios';
import { useAssets } from '../useAssets';
import { queryKeys } from '../config/queryKeys';
import { PRICE_STALE_TIME, EXCHANGE_RATE_STALE_TIME } from '../config/queryClient';
import { isSimpleAssetType, CRYPTO_BASE_CURRENCY } from '../../constants/assetTypes';
import { getLotsForAsset } from '../../db/transactions';
import { fetchYahooPrice } from '../../api/providers/yahoo';
import { fetchKrakenPrices } from '../../api/providers/kraken';
import { fetchExchangeRate } from '../../api/providers/frankfurter';
import type { Asset, AssetWithStats, PortfolioWithStats, Lot } from '../../types';

interface AssetStatsData {
  asset: Asset;
  lots: Lot[];
  price: number | null;
  priceCurrency: string | null;
  priceToAssetRate: number | null;
  assetToPortfolioRate: number | null;
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
  const { asset, lots, price, priceCurrency, priceToAssetRate, assetToPortfolioRate } = data;
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

  return {
    stats: {
      ...asset,
      totalQuantity,
      averageCost,
      totalCost,
      currentPrice,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
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
 * Hook to get portfolio stats.
 * - undefined → all portfolios (requires displayCurrency)
 * - portfolioId → single portfolio stats
 */
export function usePortfolioStats(
  portfolioId: string | undefined,
  displayCurrency?: string
): PortfolioStatsResult {
  // For single portfolio, fetch portfolio data; for all, fetch all portfolios
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(portfolioId);
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();

  // Fetch assets (useAssets handles both single and all cases)
  const { data: assets, isLoading: assetsLoading } = useAssets(portfolioId);

  const currency = portfolioId
    ? (portfolio?.currency ?? 'EUR')
    : (displayCurrency ?? 'EUR');

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

  // Batch fetch crypto prices (always in USD, conversion handled by exchange rates)
  const cryptoSymbols = [...new Set(cryptoAssets.map((a) => a.symbol))].sort();
  const { data: cryptoPrices, isLoading: cryptoPricesLoading } = useQuery({
    queryKey: ['prices', 'crypto', 'batch', ...cryptoSymbols],
    queryFn: async () => {
      if (cryptoSymbols.length === 0) {
        return {} as Record<string, { price: number; currency: string }>;
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
  const uniqueAssetCurrencies = [...new Set((assets ?? []).map((a) => a.currency))];

  // Asset → portfolio rates (for value aggregation)
  const currenciesNeedingPortfolioConversion = uniqueAssetCurrencies.filter((c) => c !== currency);
  const assetToPortfolioRateQueries = useQueries({
    queries: currenciesNeedingPortfolioConversion.map((curr) => ({
      queryKey: queryKeys.exchangeRates.pair(curr, currency),
      queryFn: () => fetchExchangeRate(curr, currency),
      staleTime: EXCHANGE_RATE_STALE_TIME,
    })),
  });

  // USD → asset rates (for converting crypto prices to asset currency)
  const currenciesNeedingCryptoConversion = uniqueAssetCurrencies.filter((c) => c !== CRYPTO_BASE_CURRENCY);
  const cryptoToAssetRateQueries = useQueries({
    queries: currenciesNeedingCryptoConversion.map((curr) => ({
      queryKey: queryKeys.exchangeRates.pair(CRYPTO_BASE_CURRENCY, curr),
      queryFn: () => fetchExchangeRate(CRYPTO_BASE_CURRENCY, curr),
      staleTime: EXCHANGE_RATE_STALE_TIME,
    })),
  });

  const isLoading = (
    (portfolioId ? portfolioLoading : portfoliosLoading) ||
    assetsLoading ||
    lotsQueries.some((q) => q.isLoading) ||
    cryptoPricesLoading ||
    otherPriceQueries.some((q) => q.isLoading) ||
    assetToPortfolioRateQueries.some((q) => q.isLoading) ||
    cryptoToAssetRateQueries.some((q) => q.isLoading)
  )

  // Build exchange rate maps
  // assetToPortfolioRateMap: assetCurrency → rate to convert to portfolio currency
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

  // cryptoToAssetRateMap: cryptoBaseCurrency → assetCurrency (for converting crypto prices)
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
  const { assetStats, portfolioStats, pendingPriceCount } = useMemo(() => {
    // Validation differs for single vs all portfolios
    if (portfolioId) {
      if (!portfolio || !assets) {
        return EMPTY_STATS;
      }
    } else {
      if (!portfolios || portfolios.length === 0 || !assets) {
        return EMPTY_STATS;
      }
    }

    const statsMap = new Map<string, AssetWithStats>();
    let totalValue = 0;
    let totalCost = 0;
    let pendingPriceCount = 0;

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

      // Get exchange rates
      const assetToPortfolioRate = asset.currency !== currency
        ? assetToPortfolioRateMap.get(asset.currency) ?? null
        : 1;

      // For price-to-asset conversion, check if price currency differs from asset currency
      let priceToAssetRate: number | null = null;
      if (priceCurrency && priceCurrency !== asset.currency) {
        if (priceCurrency === CRYPTO_BASE_CURRENCY) {
          // Crypto prices are in USD, convert to asset currency
          priceToAssetRate = cryptoToAssetRateMap.get(asset.currency) ?? null;
        }
        // For Yahoo (stocks), priceCurrency matches trading currency
        // If it differs from asset currency, we'd need more rates
        // For now, those will show as pending
      }

      const result = calculateSingleAssetStats(
        { asset, lots, price, priceCurrency, priceToAssetRate, assetToPortfolioRate },
        currency
      );
      statsMap.set(asset.id, result.stats);

      // Accumulate totals in portfolio currency
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

    // Build portfolio stats differently for single vs all
    const portfolioWithStats: PortfolioWithStats = {
      ...(portfolioId ? portfolio! : {
        id: '',
        name: 'All Portfolios',
        currency,
        masked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      assetCount: assets.length,
    };

    return { assetStats: statsMap, portfolioStats: portfolioWithStats, pendingPriceCount };
  }, [portfolioId, portfolio, portfolios, assets, lotsQueries, cryptoPrices, otherPriceMap, assetToPortfolioRateMap, cryptoToAssetRateMap, currency]);

  const hasPartialData = portfolioId
    ? (!!portfolio && !!assets && assets.length > 0 && assetStats.size > 0)
    : (!!portfolios && portfolios.length > 0 && !!assets && assetStats.size > 0);

  return {
    portfolio: portfolioStats,
    assetStats,
    isLoading,
    hasPartialData,
    pendingPriceCount,
  };
}

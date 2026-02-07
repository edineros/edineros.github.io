import { useMemo } from 'react';
import { useAsset } from '../useAssets';
import { useLots } from '../useLots';
import { usePrice } from '../usePrices';
import { useExchangeRate } from '../useExchangeRates';
import { isSimpleAssetType } from '../../constants/assetTypes';
import type { AssetWithStats, Asset, Lot } from '../../types';

export interface AssetStatsResult {
  asset: Asset | null;
  stats: AssetWithStats | null;
  isLoading: boolean;
  hasPartialData: boolean;
  error: Error | null;
}

export function useAssetStats(
  assetId: string | undefined,
  portfolioCurrency: string
): AssetStatsResult {
  const { data: asset, isLoading: assetLoading, error: assetError } = useAsset(assetId);
  const { data: lots, isLoading: lotsLoading } = useLots(assetId);

  const isSimple = asset ? isSimpleAssetType(asset.type) : false;

  // Only fetch price for non-simple assets
  const {
    data: priceData,
    isLoading: priceLoading,
  } = usePrice(
    isSimple ? undefined : asset?.symbol,
    isSimple ? undefined : asset?.type,
    asset?.currency
  );

  // Exchange rate from price currency to asset currency (if different)
  const needsPriceToAssetConversion = !isSimple && priceData && priceData.currency !== asset?.currency;
  const { data: priceToAssetRate, isLoading: priceToAssetRateLoading } = useExchangeRate(
    needsPriceToAssetConversion ? priceData?.currency : undefined,
    needsPriceToAssetConversion ? asset?.currency : undefined
  );

  // Exchange rate from asset currency to portfolio currency (for value conversion)
  const needsAssetToPortfolioConversion = asset && asset.currency !== portfolioCurrency;
  const { data: assetToPortfolioRate, isLoading: assetToPortfolioRateLoading } = useExchangeRate(
    needsAssetToPortfolioConversion ? asset?.currency : undefined,
    needsAssetToPortfolioConversion ? portfolioCurrency : undefined
  );

  const isLoading = assetLoading || lotsLoading ||
    (!isSimple && priceLoading) ||
    (!!needsPriceToAssetConversion && priceToAssetRateLoading) ||
    (!!needsAssetToPortfolioConversion && assetToPortfolioRateLoading);

  // Calculate stats when we have enough data
  const stats = useMemo((): AssetWithStats | null => {
    if (!asset || !lots) {
      return null;
    }

    // Calculate totals from lots
    const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    const totalCost = lots.reduce(
      (sum, lot) => sum + lot.remainingQuantity * lot.purchasePrice,
      0
    );
    const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    let currentPrice: number | null = null;
    let currentValue: number | null = null;
    let unrealizedGain: number | null = null;
    let unrealizedGainPercent: number | null = null;

    if (isSimple) {
      // Simple assets: use average cost as current price
      currentPrice = averageCost;
      currentValue = totalQuantity * currentPrice;
    } else if (priceData) {
      // Market assets: use fetched price
      currentPrice = priceData.price;

      // Convert price to asset currency if needed
      if (needsPriceToAssetConversion && priceToAssetRate) {
        currentPrice = currentPrice * priceToAssetRate;
      }

      currentValue = totalQuantity * currentPrice;
    }

    // Convert value to portfolio currency for gain calculation
    if (currentValue !== null) {
      let valueInPortfolioCurrency = currentValue;
      let costInPortfolioCurrency = totalCost;

      if (needsAssetToPortfolioConversion && assetToPortfolioRate) {
        valueInPortfolioCurrency = currentValue * assetToPortfolioRate;
        costInPortfolioCurrency = totalCost * assetToPortfolioRate;
      }

      // For portfolio display, use converted value
      currentValue = valueInPortfolioCurrency;

      unrealizedGain = valueInPortfolioCurrency - costInPortfolioCurrency;
      unrealizedGainPercent = costInPortfolioCurrency > 0
        ? (unrealizedGain / costInPortfolioCurrency) * 100
        : 0;
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
  }, [asset, lots, priceData, priceToAssetRate, assetToPortfolioRate, isSimple, needsPriceToAssetConversion, needsAssetToPortfolioConversion]);

  // We have partial data if we have asset and lots but not the price yet
  const hasPartialData = !!asset && !!lots && !isSimple && !priceData;

  return {
    asset: asset ?? null,
    stats,
    isLoading,
    hasPartialData,
    error: assetError as Error | null,
  };
}

// Hook to calculate stats for a single asset with provided data (no fetching)
export function calculateAssetStatsFromData(
  asset: Asset,
  lots: Lot[],
  currentPrice: number | null,
  exchangeRate: number | null,
  portfolioCurrency: string
): Omit<AssetWithStats, keyof Asset | 'lots'> & { lots: Lot[] } {
  const isSimple = isSimpleAssetType(asset.type);

  const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + lot.remainingQuantity * lot.purchasePrice,
    0
  );
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  let price: number | null = isSimple ? averageCost : currentPrice;
  let currentValue: number | null = null;
  let unrealizedGain: number | null = null;
  let unrealizedGainPercent: number | null = null;

  if (price !== null) {
    currentValue = totalQuantity * price;

    // Convert to portfolio currency if needed
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
    totalQuantity,
    averageCost,
    totalCost,
    currentPrice: price,
    currentValue,
    unrealizedGain,
    unrealizedGainPercent,
    lots,
  };
}

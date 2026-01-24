import type { Transaction, Lot, Asset, AssetWithStats, Portfolio, PortfolioWithStats } from '../types';
import { getLotsForAsset, getTransactionsByAssetId } from '../db/transactions';
import { getAssetsByPortfolioId } from '../db/assets';
import { fetchPrice, convertCurrency } from '../api/prices';

export function calculateLotStats(lot: Lot, currentPrice: number | null): {
  currentValue: number | null;
  unrealizedGain: number | null;
  unrealizedGainPercent: number | null;
} {
  if (currentPrice === null) {
    return {
      currentValue: null,
      unrealizedGain: null,
      unrealizedGainPercent: null,
    };
  }

  const currentValue = lot.remainingQuantity * currentPrice;
  const costBasis = lot.remainingQuantity * lot.purchasePrice;
  const unrealizedGain = currentValue - costBasis;
  const unrealizedGainPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

  return {
    currentValue,
    unrealizedGain,
    unrealizedGainPercent,
  };
}

export async function calculateAssetStats(
  asset: Asset,
  portfolioCurrency: string
): Promise<AssetWithStats> {
  const lots = await getLotsForAsset(asset.id);

  // Calculate totals from lots
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const totalCost = lots.reduce(
    (sum, lot) => sum + lot.remainingQuantity * lot.purchasePrice,
    0
  );
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  // Fetch current price
  const priceResult = await fetchPrice(asset.symbol, asset.type, asset.currency);
  let currentPrice: number | null = priceResult?.price ?? null;
  let currentValue: number | null = null;
  let unrealizedGain: number | null = null;
  let unrealizedGainPercent: number | null = null;

  if (currentPrice !== null) {
    // Convert price to asset currency if needed
    if (priceResult && priceResult.currency !== asset.currency) {
      const converted = await convertCurrency(currentPrice, priceResult.currency, asset.currency);
      if (converted !== null) {
        currentPrice = converted;
      }
    }

    currentValue = totalQuantity * currentPrice;

    // Convert to portfolio currency if different
    if (asset.currency !== portfolioCurrency && currentValue !== null) {
      const convertedValue = await convertCurrency(currentValue, asset.currency, portfolioCurrency);
      if (convertedValue !== null) {
        currentValue = convertedValue;
      }
    }

    // Convert cost to portfolio currency for gain calculation
    let convertedCost = totalCost;
    if (asset.currency !== portfolioCurrency) {
      const converted = await convertCurrency(totalCost, asset.currency, portfolioCurrency);
      if (converted !== null) {
        convertedCost = converted;
      }
    }

    if (currentValue !== null) {
      unrealizedGain = currentValue - convertedCost;
      unrealizedGainPercent = convertedCost > 0 ? (unrealizedGain / convertedCost) * 100 : 0;
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

export async function calculatePortfolioStats(
  portfolio: Portfolio
): Promise<PortfolioWithStats> {
  const assets = await getAssetsByPortfolioId(portfolio.id);

  let totalValue: number | null = 0;
  let totalCost = 0;
  let hasAllPrices = true;

  for (const asset of assets) {
    const stats = await calculateAssetStats(asset, portfolio.currency);

    // Add cost (convert to portfolio currency)
    let assetCost = stats.totalCost;
    if (asset.currency !== portfolio.currency) {
      const converted = await convertCurrency(assetCost, asset.currency, portfolio.currency);
      if (converted !== null) {
        assetCost = converted;
      }
    }
    totalCost += assetCost;

    // Add value
    if (stats.currentValue !== null) {
      totalValue = (totalValue ?? 0) + stats.currentValue;
    } else {
      hasAllPrices = false;
    }
  }

  if (!hasAllPrices) {
    totalValue = null;
  }

  const totalGain = totalValue !== null ? totalValue - totalCost : null;
  const totalGainPercent =
    totalGain !== null && totalCost > 0 ? (totalGain / totalCost) * 100 : null;

  return {
    ...portfolio,
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    assetCount: assets.length,
  };
}

export function calculateRealizedGain(
  sellTransaction: Transaction,
  lots: Lot[]
): number | null {
  if (sellTransaction.type !== 'sell' || !sellTransaction.lotId) {
    return null;
  }

  const lot = lots.find((l) => l.id === sellTransaction.lotId);
  if (!lot) {
    return null;
  }

  const sellValue = sellTransaction.quantity * sellTransaction.pricePerUnit;
  const costBasis = sellTransaction.quantity * lot.purchasePrice;

  return sellValue - costBasis - sellTransaction.fee;
}

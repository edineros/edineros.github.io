import type { Transaction, Lot, Asset, AssetWithStats, Portfolio, PortfolioWithStats } from '../types';
import { getLotsForAsset, getTransactionsByAssetId } from '../db/transactions';
import { getAssetsByPortfolioId } from '../db/assets';
import { fetchPrice, convertCurrency } from '../api/prices';
import { fetchKrakenPrices } from '../api/providers/kraken';
import {
  getValidCachedPrice,
  setCachedPrice,
} from '../db/priceCache';

// TTL in minutes for crypto prices (matches prices.ts)
const CRYPTO_PRICE_TTL = 5;

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
): Promise<{ portfolioStats: PortfolioWithStats; assetStats: Map<string, AssetWithStats> }> {
  const assets = await getAssetsByPortfolioId(portfolio.id);

  // Collect crypto assets that need price fetching (not in cache)
  const cryptoAssetsNeedingPrices: Asset[] = [];
  for (const asset of assets) {
    if (asset.type === 'crypto') {
      const cached = await getValidCachedPrice(asset.symbol);
      if (!cached) {
        cryptoAssetsNeedingPrices.push(asset);
      }
    }
  }

  // Batch fetch crypto prices and cache them BEFORE calculating any stats
  if (cryptoAssetsNeedingPrices.length > 0) {
    const symbols = cryptoAssetsNeedingPrices.map((a) => a.symbol);
    const prices = await fetchKrakenPrices(symbols, portfolio.currency);

    // Cache the fetched prices
    for (const [symbol, priceInfo] of prices) {
      await setCachedPrice(
        symbol,
        'crypto',
        priceInfo.price,
        priceInfo.currency,
        CRYPTO_PRICE_TTL
      );
    }
  }

  let totalValue: number | null = 0;
  let totalCost = 0;
  let hasAllPrices = true;
  const assetStatsMap = new Map<string, AssetWithStats>();

  for (const asset of assets) {
    const stats = await calculateAssetStats(asset, portfolio.currency);
    assetStatsMap.set(asset.id, stats);

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
    portfolioStats: {
      ...portfolio,
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      assetCount: assets.length,
    },
    assetStats: assetStatsMap,
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

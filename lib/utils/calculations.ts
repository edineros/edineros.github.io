import type { Transaction, Lot } from '../types';

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

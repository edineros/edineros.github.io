import type { Transaction, Lot } from '../types';

/**
* Calculate the Compound Annual Growth Rate (CAGR) for an asset.
 *
 * For assets with multiple lots:
 * - Annualizes each lot's return individually using its own holding period
 * - Returns a weighted average of those annualized returns, weighted by cost basis
 * 
 * Special handling:
 * - Lots held for < 1 year: return absolute return % (not annualized)
 * - Lots held for >= 1 year: calculate annualized return
 * 
 * Returns null if:
 * - No lots exist
 * - No current value
 * - No lots held for >= 1 year
 */
export function calculateCAGR(
  lots: Lot[],
  currentValue: number | null,
  totalCost: number
): number | null {
  if (!lots?.length || currentValue === null || currentValue === 0 || totalCost === 0) {
    return null;
  }

  const now = new Date();

  // Separate lots into those held < 1 year and >= 1 year
  const validLots: { cost: number; years: number }[] = [];

  for (const lot of lots) {
    const lotCost = lot.remainingQuantity * lot.purchasePrice;
    if (lotCost <= 0) continue;
    const years = (now.getTime() - new Date(lot.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    // Skip lots held less than 1 day
    if (years < 1 / 365) continue;
    validLots.push({ cost: lotCost, years });
  }

  if (validLots.length === 0) return null;

  const hasLongTermLot = validLots.some(l => l.years >= 1);

  // If no long-term lots, calculate absolute return from all lots
  if (!hasLongTermLot) {
    // Return absolute percentage gain for short-term holdings
    return ((currentValue - totalCost) / totalCost) * 100;
  }

  // Calculate weighted average of individually annualized returns
  // For each lot, calculate its return and weight by cost basis
  let totalWeightedAnnualized = 0;
  let totalWeight = 0;

  for (const lot of validLots) {
    const lotCurrentValue = (lot.cost / totalCost) * currentValue;
    // Calculate return for this lot
    const lotReturn = (lotCurrentValue - lot.cost) / lot.cost;
    // Annualize individually if held >= 1 year, otherwise use absolute return
    const annualized = lot.years >= 1
      ? Math.pow(1 + lotReturn, 1 / lot.years) - 1
      : lotReturn;

    totalWeightedAnnualized += annualized * lot.cost;
    totalWeight += lot.cost;
  }

  if (totalWeight === 0) return null;

  // Weighted average of annualized returns
  return (totalWeightedAnnualized / totalWeight) * 100;
}

/**
 * Calculate percentage change between two values.
 * Returns null if previousValue is null, undefined, or zero.
 */
export function calculatePercentChange(
  currentValue: number,
  previousValue: number | null | undefined
): number | null {
  if (previousValue === null || previousValue === undefined || previousValue === 0) {
    return null;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}

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

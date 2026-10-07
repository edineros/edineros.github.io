import { generateId } from '../utils/generateId';
import { webDb } from './webDatabase';
import type { Transaction, TransactionType, Lot } from '../types';

function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: row.price_per_unit,
    fee: row.fee,
    date: new Date(row.date),
    notes: row.notes,
    lotId: row.lot_id,
    createdAt: new Date(row.created_at),
  };
}

export async function getTransactionsByAssetId(assetId: string): Promise<Transaction[]> {
  const rows = await webDb.getTransactionsByAssetId(assetId);
  return rows.map(rowToTransaction);
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const row = await webDb.getTransactionById(id);
  return row ? rowToTransaction(row) : null;
}

export async function createTransaction(
  assetId: string,
  type: TransactionType,
  quantity: number,
  pricePerUnit: number,
  date: Date,
  options?: {
    fee?: number;
    notes?: string;
    lotId?: string;
  }
): Promise<Transaction> {
  const id = generateId();
  const now = Date.now();
  const { fee = 0, notes = null, lotId = null } = options ?? {};

  await webDb.createTransaction({
    id,
    asset_id: assetId,
    type,
    quantity,
    price_per_unit: pricePerUnit,
    fee,
    date: date.getTime(),
    notes,
    lot_id: lotId,
    created_at: now,
  });

  return {
    id,
    assetId,
    type,
    quantity,
    pricePerUnit,
    fee,
    date,
    notes,
    lotId,
    createdAt: new Date(now),
  };
}

export async function updateTransaction(
  id: string,
  updates: {
    type?: TransactionType;
    quantity?: number;
    pricePerUnit?: number;
    fee?: number;
    date?: Date;
    notes?: string | null;
    lotId?: string | null;
  }
): Promise<Transaction | null> {
  const existing = await getTransactionById(id);
  if (!existing) {
    return null;
  }

  const newType = updates.type ?? existing.type;
  const newQuantity = updates.quantity ?? existing.quantity;
  const newPricePerUnit = updates.pricePerUnit ?? existing.pricePerUnit;
  const newFee = updates.fee ?? existing.fee;
  const newDate = updates.date ?? existing.date;
  const newNotes = updates.notes !== undefined ? updates.notes : existing.notes;
  const newLotId = updates.lotId !== undefined ? updates.lotId : existing.lotId;

  await webDb.updateTransaction(id, {
    type: newType,
    quantity: newQuantity,
    price_per_unit: newPricePerUnit,
    fee: newFee,
    date: newDate.getTime(),
    notes: newNotes,
    lot_id: newLotId,
  });

  return {
    ...existing,
    type: newType,
    quantity: newQuantity,
    pricePerUnit: newPricePerUnit,
    fee: newFee,
    date: newDate,
    notes: newNotes,
    lotId: newLotId,
  };
}

export async function deleteTransaction(id: string): Promise<boolean> {
  return webDb.deleteTransaction(id);
}

// Calculate lots from buy transactions
export async function getLotsForAsset(assetId: string): Promise<Lot[]> {
  const transactions = await webDb.getTransactionsByAssetId(assetId);
  const buyTransactions = transactions.filter((t: any) => t.type === 'buy');
  const sellTransactions = transactions.filter((t: any) => t.type === 'sell');

  const lots: Lot[] = [];
  for (const buy of buyTransactions) {
    const soldFromLot = sellTransactions
      .filter((sell: any) => sell.lot_id === buy.id)
      .reduce((sum: number, sell: any) => sum + sell.quantity, 0);

    const remainingQuantity = buy.quantity - soldFromLot;

    if (remainingQuantity > 0) {
      lots.push({
        id: buy.id,
        assetId: buy.asset_id,
        buyTransactionId: buy.id,
        originalQuantity: buy.quantity,
        remainingQuantity,
        purchasePrice: buy.price_per_unit,
        purchaseDate: new Date(buy.date),
        notes: buy.notes,
      });
    }
  }
  return lots;
}

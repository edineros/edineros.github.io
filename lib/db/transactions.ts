import { v4 as uuidv4 } from 'uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { Transaction, TransactionType, Lot } from '../types';

interface TransactionRow {
  id: string;
  asset_id: string;
  type: TransactionType;
  quantity: number;
  price_per_unit: number;
  fee: number;
  date: number;
  notes: string | null;
  lot_id: string | null;
  created_at: number;
}

interface TagRow {
  transaction_id: string;
  tag: string;
}

async function getTagsForTransaction(db: SQLiteDatabase, transactionId: string): Promise<string[]> {
  const rows = await db.getAllAsync<TagRow>(
    'SELECT tag FROM transaction_tags WHERE transaction_id = ?',
    [transactionId]
  );
  return rows.map((r: TagRow) => r.tag);
}

async function rowToTransaction(db: SQLiteDatabase, row: TransactionRow): Promise<Transaction> {
  const tags = await getTagsForTransaction(db, row.id);
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: row.price_per_unit,
    fee: row.fee,
    date: new Date(row.date),
    notes: row.notes,
    tags,
    lotId: row.lot_id,
    createdAt: new Date(row.created_at),
  };
}

function rowToTransactionSync(row: TransactionRow, tags: string[]): Transaction {
  return {
    id: row.id,
    assetId: row.asset_id,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: row.price_per_unit,
    fee: row.fee,
    date: new Date(row.date),
    notes: row.notes,
    tags,
    lotId: row.lot_id,
    createdAt: new Date(row.created_at),
  };
}

export async function getTransactionsByAssetId(assetId: string): Promise<Transaction[]> {
  if (isWeb()) {
    const rows = await webDb.getTransactionsByAssetId(assetId);
    return rows.map((row: any) => rowToTransactionSync(row, row.tags || []));
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE asset_id = ? ORDER BY date DESC, created_at DESC',
    [assetId]
  );
  return Promise.all(rows.map((row) => rowToTransaction(db, row)));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  if (isWeb()) {
    const row = await webDb.getTransactionById(id);
    return row ? rowToTransactionSync(row, row.tags || []) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE id = ?',
    [id]
  );
  return row ? rowToTransaction(db, row) : null;
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
    tags?: string[];
    lotId?: string;
  }
): Promise<Transaction> {
  const id = uuidv4();
  const now = Date.now();
  const { fee = 0, notes = null, tags = [], lotId = null } = options ?? {};

  if (isWeb()) {
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
      tags,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO transactions (id, asset_id, type, quantity, price_per_unit, fee, date, notes, lot_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, assetId, type, quantity, pricePerUnit, fee, date.getTime(), notes, lotId, now]
    );

    // Insert tags
    for (const tag of tags) {
      await db.runAsync(
        'INSERT INTO transaction_tags (transaction_id, tag) VALUES (?, ?)',
        [id, tag]
      );
    }
  }

  return {
    id,
    assetId,
    type,
    quantity,
    pricePerUnit,
    fee,
    date,
    notes,
    tags,
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
    tags?: string[];
    lotId?: string | null;
  }
): Promise<Transaction | null> {
  const existing = await getTransactionById(id);
  if (!existing) return null;

  const newType = updates.type ?? existing.type;
  const newQuantity = updates.quantity ?? existing.quantity;
  const newPricePerUnit = updates.pricePerUnit ?? existing.pricePerUnit;
  const newFee = updates.fee ?? existing.fee;
  const newDate = updates.date ?? existing.date;
  const newNotes = updates.notes !== undefined ? updates.notes : existing.notes;
  const newLotId = updates.lotId !== undefined ? updates.lotId : existing.lotId;
  const newTags = updates.tags ?? existing.tags;

  if (isWeb()) {
    await webDb.updateTransaction(id, {
      type: newType,
      quantity: newQuantity,
      price_per_unit: newPricePerUnit,
      fee: newFee,
      date: newDate.getTime(),
      notes: newNotes,
      lot_id: newLotId,
      tags: newTags,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE transactions SET type = ?, quantity = ?, price_per_unit = ?, fee = ?, date = ?, notes = ?, lot_id = ? WHERE id = ?`,
      [newType, newQuantity, newPricePerUnit, newFee, newDate.getTime(), newNotes, newLotId, id]
    );

    // Update tags if provided
    if (updates.tags !== undefined) {
      await db.runAsync('DELETE FROM transaction_tags WHERE transaction_id = ?', [id]);
      for (const tag of updates.tags) {
        await db.runAsync(
          'INSERT INTO transaction_tags (transaction_id, tag) VALUES (?, ?)',
          [id, tag]
        );
      }
    }
  }

  return {
    ...existing,
    type: newType,
    quantity: newQuantity,
    pricePerUnit: newPricePerUnit,
    fee: newFee,
    date: newDate,
    notes: newNotes,
    tags: newTags,
    lotId: newLotId,
  };
}

export async function deleteTransaction(id: string): Promise<boolean> {
  if (isWeb()) {
    return webDb.deleteTransaction(id);
  }

  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  return result.changes > 0;
}

// Calculate lots from buy transactions
export async function getLotsForAsset(assetId: string): Promise<Lot[]> {
  if (isWeb()) {
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
          tags: buy.tags || [],
        });
      }
    }
    return lots;
  }

  const db = await getDatabase();

  // Get all buy transactions
  const buyTransactions = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE asset_id = ? AND type = ? ORDER BY date ASC',
    [assetId, 'buy']
  );

  // Get all sell transactions
  const sellTransactions = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE asset_id = ? AND type = ? ORDER BY date ASC',
    [assetId, 'sell']
  );

  const lots: Lot[] = [];

  for (const buy of buyTransactions) {
    const tags = await getTagsForTransaction(db, buy.id);

    // Calculate how much has been sold from this lot
    const soldFromLot = sellTransactions
      .filter((sell) => sell.lot_id === buy.id)
      .reduce((sum, sell) => sum + sell.quantity, 0);

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
        tags,
      });
    }
  }

  return lots;
}

// Get all unique tags
export async function getAllTags(): Promise<string[]> {
  if (isWeb()) {
    return webDb.getAllTags();
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tag: string }>(
    'SELECT DISTINCT tag FROM transaction_tags ORDER BY tag'
  );
  return rows.map((r) => r.tag);
}

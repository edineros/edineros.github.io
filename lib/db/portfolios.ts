import { generateId } from '../utils/generateId';
import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { Portfolio } from '../types';

interface PortfolioRow {
  id: string;
  name: string;
  currency: string;
  masked: number;
  created_at: number;
  updated_at: number;
}

function rowToPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    masked: row.masked === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getAllPortfolios(): Promise<Portfolio[]> {
  if (isWeb()) {
    const rows = await webDb.getAllPortfolios();
    return rows.map(rowToPortfolio);
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<PortfolioRow>(
    'SELECT * FROM portfolios ORDER BY created_at DESC'
  );
  return rows.map(rowToPortfolio);
}

export async function getPortfolioById(id: string): Promise<Portfolio | null> {
  if (isWeb()) {
    const row = await webDb.getPortfolioById(id);
    return row ? rowToPortfolio(row) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<PortfolioRow>(
    'SELECT * FROM portfolios WHERE id = ?',
    [id]
  );
  return row ? rowToPortfolio(row) : null;
}

export async function createPortfolio(
  name: string,
  currency: string = 'EUR'
): Promise<Portfolio> {
  const id = generateId();
  const now = Date.now();
  const row: PortfolioRow = {
    id,
    name,
    currency,
    masked: 0,
    created_at: now,
    updated_at: now,
  };

  if (isWeb()) {
    await webDb.createPortfolio(row);
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO portfolios (id, name, currency, masked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, currency, 0, now, now]
    );
  }

  return {
    id,
    name,
    currency,
    masked: false,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function updatePortfolio(
  id: string,
  updates: { name?: string; currency?: string; masked?: boolean }
): Promise<Portfolio | null> {
  const portfolio = await getPortfolioById(id);
  if (!portfolio) return null;

  const now = Date.now();
  const newName = updates.name ?? portfolio.name;
  const newCurrency = updates.currency ?? portfolio.currency;
  const newValuesHidden = updates.masked ?? portfolio.masked;

  if (isWeb()) {
    await webDb.updatePortfolio({
      id,
      name: newName,
      currency: newCurrency,
      masked: newValuesHidden ? 1 : 0,
      created_at: portfolio.createdAt.getTime(),
      updated_at: now,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE portfolios SET name = ?, currency = ?, masked = ?, updated_at = ? WHERE id = ?',
      [newName, newCurrency, newValuesHidden ? 1 : 0, now, id]
    );
  }

  return {
    ...portfolio,
    name: newName,
    currency: newCurrency,
    masked: newValuesHidden,
    updatedAt: new Date(now),
  };
}

export async function deletePortfolio(id: string): Promise<boolean> {
  if (isWeb()) {
    await webDb.deletePortfolio(id);
    return true;
  }

  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM portfolios WHERE id = ?', [id]);
  return result.changes > 0;
}

import { v4 as uuidv4 } from 'uuid';
import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { Portfolio } from '../types';

interface PortfolioRow {
  id: string;
  name: string;
  currency: string;
  created_at: number;
  updated_at: number;
}

function rowToPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
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
  const id = uuidv4();
  const now = Date.now();
  const row: PortfolioRow = {
    id,
    name,
    currency,
    created_at: now,
    updated_at: now,
  };

  if (isWeb()) {
    await webDb.createPortfolio(row);
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO portfolios (id, name, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, currency, now, now]
    );
  }

  return {
    id,
    name,
    currency,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function updatePortfolio(
  id: string,
  updates: { name?: string; currency?: string }
): Promise<Portfolio | null> {
  const portfolio = await getPortfolioById(id);
  if (!portfolio) return null;

  const now = Date.now();
  const newName = updates.name ?? portfolio.name;
  const newCurrency = updates.currency ?? portfolio.currency;

  if (isWeb()) {
    await webDb.updatePortfolio({
      id,
      name: newName,
      currency: newCurrency,
      created_at: portfolio.createdAt.getTime(),
      updated_at: now,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE portfolios SET name = ?, currency = ?, updated_at = ? WHERE id = ?',
      [newName, newCurrency, now, id]
    );
  }

  return {
    ...portfolio,
    name: newName,
    currency: newCurrency,
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

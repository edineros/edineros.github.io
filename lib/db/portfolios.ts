import { generateId } from '../utils/generateId';
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
  const rows = await webDb.getAllPortfolios();
  return rows.map(rowToPortfolio);
}

export async function getPortfolioById(id: string): Promise<Portfolio | null> {
  const row = await webDb.getPortfolioById(id);
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

  await webDb.createPortfolio(row);

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

  await webDb.updatePortfolio({
    id,
    name: newName,
    currency: newCurrency,
    masked: newValuesHidden ? 1 : 0,
    created_at: portfolio.createdAt.getTime(),
    updated_at: now,
  });

  return {
    ...portfolio,
    name: newName,
    currency: newCurrency,
    masked: newValuesHidden,
    updatedAt: new Date(now),
  };
}

export async function deletePortfolio(id: string): Promise<boolean> {
  await webDb.deletePortfolio(id);
  return true;
}

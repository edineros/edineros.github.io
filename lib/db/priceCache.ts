import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { CachedPrice, ExchangeRate } from '../types';

interface PriceCacheRow {
  symbol: string;
  asset_type: string;
  price: number;
  currency: string;
  fetched_at: number;
  expires_at: number;
}

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
  fetched_at: number;
  expires_at: number;
}

function rowToCachedPrice(row: PriceCacheRow): CachedPrice {
  return {
    symbol: row.symbol,
    assetType: row.asset_type,
    price: row.price,
    currency: row.currency,
    fetchedAt: new Date(row.fetched_at),
    expiresAt: new Date(row.expires_at),
  };
}

export async function getCachedPrice(symbol: string): Promise<CachedPrice | null> {
  if (isWeb()) {
    const row = await webDb.getCachedPrice(symbol.toUpperCase());
    return row ? rowToCachedPrice(row) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<PriceCacheRow>(
    'SELECT * FROM price_cache WHERE symbol = ?',
    [symbol.toUpperCase()]
  );

  if (!row) return null;

  return rowToCachedPrice(row);
}

export async function setCachedPrice(
  symbol: string,
  assetType: string,
  price: number,
  currency: string,
  ttlMinutes: number = 15
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlMinutes * 60 * 1000;

  if (isWeb()) {
    await webDb.setCachedPrice({
      symbol: symbol.toUpperCase(),
      asset_type: assetType,
      price,
      currency,
      fetched_at: now,
      expires_at: expiresAt,
    });
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO price_cache (symbol, asset_type, price, currency, fetched_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [symbol.toUpperCase(), assetType, price, currency, now, expiresAt]
  );
}

export async function getValidCachedPrice(symbol: string): Promise<CachedPrice | null> {
  const cached = await getCachedPrice(symbol);
  if (!cached) return null;

  // Check if expired
  if (cached.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return cached;
}

export async function clearExpiredPrices(): Promise<number> {
  if (isWeb()) {
    return webDb.clearExpiredPrices();
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM price_cache WHERE expires_at < ?',
    [Date.now()]
  );
  return result.changes;
}

function rowToExchangeRate(row: ExchangeRateRow): ExchangeRate {
  return {
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: row.rate,
    fetchedAt: new Date(row.fetched_at),
    expiresAt: new Date(row.expires_at),
  };
}

// Exchange rates
export async function getCachedExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate | null> {
  if (isWeb()) {
    const row = await webDb.getCachedExchangeRate(fromCurrency.toUpperCase(), toCurrency.toUpperCase());
    return row ? rowToExchangeRate(row) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<ExchangeRateRow>(
    'SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ?',
    [fromCurrency.toUpperCase(), toCurrency.toUpperCase()]
  );

  if (!row) return null;

  return rowToExchangeRate(row);
}

export async function setCachedExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  ttlMinutes: number = 60
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlMinutes * 60 * 1000;

  if (isWeb()) {
    await webDb.setCachedExchangeRate({
      from_currency: fromCurrency.toUpperCase(),
      to_currency: toCurrency.toUpperCase(),
      rate,
      fetched_at: now,
      expires_at: expiresAt,
    });
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate, fetched_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [fromCurrency.toUpperCase(), toCurrency.toUpperCase(), rate, now, expiresAt]
  );
}

export async function getValidExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRate | null> {
  const cached = await getCachedExchangeRate(fromCurrency, toCurrency);
  if (!cached) return null;

  if (cached.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return cached;
}

export async function clearExpiredExchangeRates(): Promise<number> {
  if (isWeb()) {
    return webDb.clearExpiredExchangeRates();
  }

  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM exchange_rates WHERE expires_at < ?',
    [Date.now()]
  );
  return result.changes;
}

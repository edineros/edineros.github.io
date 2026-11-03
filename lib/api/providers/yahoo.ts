import { calculatePercentChange } from '../../utils/calculations';
import type { PriceData } from '../../types';

const DELAY = 200; // 200ms delay makes sure we fire no more than 5 yahoo requests per second
const DEFAULT_RELAY_URL = 'https://edineros-yahoo-relay.onrender.com';

// Rate limiting queue for Yahoo Finance API
// Ensures no more than 5 requests per second (150ms minimum between requests)
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < DELAY) {
        await this.delay(DELAY - timeSinceLastRequest);
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const yahooQueue = new RequestQueue();

interface YahooChartResult {
  meta: {
    symbol: string;
    regularMarketPrice: number;
    currency: string;
    shortName?: string;
    longName?: string;
    previousClose?: number;
    regularMarketOpen?: number;
    chartPreviousClose?: number;
  };
}

interface YahooSparkEntry {
  symbol: string;
  response?: YahooChartResult[];
}

interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  typeDisp?: string;
  exchDisp?: string;
}

function getRelayUrl(): string {
  const relayUrl = import.meta.env.VITE_YAHOO_RELAY_URL?.trim().replace(/\/+$/, '');
  return relayUrl || DEFAULT_RELAY_URL;
}

async function fetchFromRelay(relayPath: string): Promise<Response> {
  return fetch(`${getRelayUrl()}${relayPath}`);
}

export async function fetchYahooPrice(symbol: string): Promise<(PriceData & { name?: string }) | null> {
  return yahooQueue.enqueue(async () => {
    try {
      // Use the chart API endpoint which is more accessible
      const relayPath = `/api/yahoo/chart?symbol=${encodeURIComponent(symbol)}`;

      const response = await fetchFromRelay(relayPath);

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0] as YahooChartResult | undefined;

      if (typeof result?.meta?.regularMarketPrice !== 'number' || !Number.isFinite(result.meta.regularMarketPrice)) {
        throw new Error(`Yahoo Finance returned no price for ${symbol}`);
      }

      const currentPrice = result.meta.regularMarketPrice;
      // Use previousClose for day change calculation (most accurate)
      // Fall back to chartPreviousClose or regularMarketOpen if not available
      const previousClose = result.meta.previousClose ?? result.meta.chartPreviousClose ?? result.meta.regularMarketOpen;

      return {
        price: currentPrice,
        currency: result.meta.currency || 'USD',
        name: result.meta.longName || result.meta.shortName,
        todayChangePercent: calculatePercentChange(currentPrice, previousClose),
      };
    } catch (error) {
      console.error('Error fetching Yahoo price:', error);
      throw error;
    }
  });
}

export async function fetchYahooPrices(symbols: string[]): Promise<Record<string, PriceData & { name?: string }>> {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))];
  if (uniqueSymbols.length === 0) {
    return {};
  }
  if (uniqueSymbols.length > 20) {
    throw new Error('Yahoo Spark supports at most 20 symbols per request');
  }

  return yahooQueue.enqueue(async () => {
    const relayPath = `/api/yahoo/spark?symbols=${encodeURIComponent(uniqueSymbols.join(','))}`;
    const response = await fetchFromRelay(relayPath);

    if (!response.ok) {
      throw new Error(`Yahoo Finance Spark API error: ${response.status}`);
    }

    const data = await response.json();
    const entries = (data?.spark?.result ?? []) as YahooSparkEntry[];
    const prices: Record<string, PriceData & { name?: string }> = {};

    for (const entry of entries) {
      const result = entry.response?.[0];
      if (!result || typeof result.meta.regularMarketPrice !== 'number' || !Number.isFinite(result.meta.regularMarketPrice)) {
        continue;
      }

      const currentPrice = result.meta.regularMarketPrice;
      const previousClose = result.meta.previousClose ?? result.meta.chartPreviousClose ?? result.meta.regularMarketOpen;
      prices[entry.symbol] = {
        price: currentPrice,
        currency: result.meta.currency || 'USD',
        name: result.meta.longName || result.meta.shortName,
        todayChangePercent: calculatePercentChange(currentPrice, previousClose),
      };
    }

    if (Object.keys(prices).length === 0) {
      throw new Error('Yahoo Finance Spark returned no prices');
    }
    return prices;
  });
}

export async function searchYahooSymbol(query: string): Promise<
  Array<{
    symbol: string;
    name: string;
    type: string;
    exchange: string;
  }>
> {
  return yahooQueue.enqueue(async () => {
    try {
      const relayPath = `/api/yahoo/search?q=${encodeURIComponent(query)}`;

      const response = await fetchFromRelay(relayPath);

      if (!response.ok) {
        console.error(`Yahoo Finance search error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const quotes = (data?.quotes || []) as YahooSearchResult[];

      return quotes.map((quote) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        type: quote.typeDisp || 'Unknown',
        exchange: quote.exchDisp || 'Unknown',
      }));
    } catch (error) {
      console.error('Error searching Yahoo:', error);
      return [];
    }
  });
}

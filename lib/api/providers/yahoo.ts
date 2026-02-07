import { Platform } from 'react-native';

const DELAY = 200; // 200ms delay makes sure we fire no more than 5 yahoo requests per second

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
  };
}

interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  typeDisp?: string;
  exchDisp?: string;
}

// Use allorigins for web CORS proxy (more reliable than corsproxy.io)
function getProxiedUrl(url: string): string {
  if (Platform.OS === 'web') {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export async function fetchYahooPrice(symbol: string): Promise<{
  price: number;
  currency: string;
  name?: string;
} | null> {
  return yahooQueue.enqueue(async () => {
    try {
      // Use the chart API endpoint which is more accessible
      const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const url = getProxiedUrl(baseUrl);

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Yahoo Finance API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0] as YahooChartResult | undefined;

      if (!result?.meta?.regularMarketPrice) {
        return null;
      }

      return {
        price: result.meta.regularMarketPrice,
        currency: result.meta.currency || 'USD',
        name: result.meta.longName || result.meta.shortName,
      };
    } catch (error) {
      console.error('Error fetching Yahoo price:', error);
      return null;
    }
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
      const baseUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
      const url = getProxiedUrl(baseUrl);

      const response = await fetch(url);

      if (!response.ok) {
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

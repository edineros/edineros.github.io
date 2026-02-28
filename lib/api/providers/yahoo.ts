import { Platform } from 'react-native';
import { calculatePercentChange } from '../../utils/calculations';
import type { PriceData } from '../../types';

const DELAY = 200; // 200ms delay makes sure we fire no more than 5 yahoo requests per second
const RETRY_DELAY = 7000; // 7 seconds delay before retrying on 429/500 errors
const MAX_RETRIES = 2;

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

interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  typeDisp?: string;
  exchDisp?: string;
}

// CORS proxies for web (try multiple in case one fails)
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

let currentProxyIndex = 0;

function getProxiedUrl(url: string): string {
  if (Platform.OS === 'web') {
    return CORS_PROXIES[currentProxyIndex](url);
  }
  return url;
}

function switchToNextProxy(): boolean {
  if (currentProxyIndex < CORS_PROXIES.length - 1) {
    currentProxyIndex++;
    console.log(`[Yahoo] Switching to proxy ${currentProxyIndex}`);
    return true;
  }
  return false;
}

// Extract base Yahoo URL from a proxied URL
function extractBaseUrl(url: string): string {
  // Check each proxy pattern
  if (url.includes('corsproxy.io')) {
    return decodeURIComponent(url.split('?url=')[1] || '');
  }
  if (url.includes('codetabs.com')) {
    return decodeURIComponent(url.split('quest=')[1] || '');
  }
  if (url.includes('allorigins.win')) {
    return decodeURIComponent(url.split('url=')[1] || '');
  }
  if (url.includes('thingproxy.freeboard.io')) {
    return url.replace('https://thingproxy.freeboard.io/fetch/', '');
  }
  return url;
}

// Fetch with retry for network errors, 429 (rate limit), and 5xx (server errors)
async function fetchWithRetry(url: string, retries = MAX_RETRIES, triedProxySwitch = false): Promise<Response> {
  try {
    const response = await fetch(url);

    // Retry on rate limit or server errors
    if ((response.status === 429 || response.status >= 500) && retries > 0) {
      // On 5xx errors, try switching proxy first (on web)
      if (Platform.OS === 'web' && response.status >= 500 && !triedProxySwitch && switchToNextProxy()) {
        const baseUrl = extractBaseUrl(url);
        const newUrl = getProxiedUrl(baseUrl);
        return fetchWithRetry(newUrl, retries, true);
      }

      console.log(`[Yahoo] API returned ${response.status}, retrying in ${RETRY_DELAY}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1, triedProxySwitch);
    }

    return response;
  } catch (error) {
    // On network errors, try switching proxy first (on web)
    if (Platform.OS === 'web' && !triedProxySwitch && switchToNextProxy()) {
      const baseUrl = extractBaseUrl(url);
      const newUrl = getProxiedUrl(baseUrl);
      return fetchWithRetry(newUrl, retries, true);
    }

    // Retry on network failures (timeout, CORS, connection errors)
    if (retries > 0) {
      console.log(`[Yahoo] Fetch failed: ${error}, retrying in ${RETRY_DELAY}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1, triedProxySwitch);
    }
    throw error;
  }
}

export async function fetchYahooPrice(symbol: string): Promise<(PriceData & { name?: string }) | null> {
  return yahooQueue.enqueue(async () => {
    try {
      // Use the chart API endpoint which is more accessible
      const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const url = getProxiedUrl(baseUrl);

      const response = await fetchWithRetry(url);

      if (!response.ok) {
        console.error(`Yahoo Finance API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0] as YahooChartResult | undefined;

      if (!result?.meta?.regularMarketPrice) {
        return null;
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

      const response = await fetchWithRetry(url);

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

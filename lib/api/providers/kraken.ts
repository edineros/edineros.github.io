interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: {
      a: [string, string, string]; // Ask [price, whole lot volume, lot volume]
      b: [string, string, string]; // Bid [price, whole lot volume, lot volume]
      c: [string, string];         // Last trade [price, volume]
      v: [string, string];         // Volume [today, last 24 hours]
      p: [string, string];         // VWAP [today, last 24 hours]
      t: [number, number];         // Number of trades [today, last 24 hours]
      l: [string, string];         // Low [today, last 24 hours]
      h: [string, string];         // High [today, last 24 hours]
      o: string;                   // Today's opening price
    };
  };
}

interface KrakenAssetPairsResponse {
  error: string[];
  result: {
    [pair: string]: {
      altname: string;
      wsname?: string;
      base: string;
      quote: string;
    };
  };
}

// Cache for Kraken asset pairs
let cachedAssetPairs: Map<string, { pair: string; base: string; quote: string; altname: string }> | null = null;
let cachedAssetPairsTimestamp: number = 0;
let assetPairsFetchPromise: Promise<Map<string, { pair: string; base: string; quote: string; altname: string }>> | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Normalize symbol names - Kraken uses X prefix for crypto (XBT for BTC, XETH for ETH)
// and Z prefix for fiat (ZEUR, ZUSD)
function normalizeSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  // Map common names to Kraken format
  if (upper === 'BTC' || upper === 'BITCOIN') {
    return 'XBT';
  }
  if (upper === 'DOGE' || upper === 'DOGECOIN') {
    return 'XDG';
  }
  return upper;
}

// Fetch and cache all available Kraken trading pairs
// Uses a promise lock to prevent multiple parallel requests
async function fetchAssetPairs(): Promise<Map<string, { pair: string; base: string; quote: string; altname: string }>> {
  const now = Date.now();
  if (cachedAssetPairs && now - cachedAssetPairsTimestamp < CACHE_TTL_MS) {
    return cachedAssetPairs;
  }

  // If a fetch is already in progress, wait for it
  if (assetPairsFetchPromise) {
    return assetPairsFetchPromise;
  }

  // Start a new fetch and store the promise
  assetPairsFetchPromise = (async () => {
    try {
      const response = await fetch('https://api.kraken.com/0/public/AssetPairs');
      if (!response.ok) {
        return cachedAssetPairs || new Map();
      }

      const data = (await response.json()) as KrakenAssetPairsResponse;
      if (data.error?.length > 0) {
        console.error('Kraken AssetPairs API error:', data.error);
        return cachedAssetPairs || new Map();
      }

      const pairs = new Map<string, { pair: string; base: string; quote: string; altname: string }>();

      for (const [pairKey, pairInfo] of Object.entries(data.result)) {
        // Skip .d pairs (dark pool)
        if (pairKey.endsWith('.d')) {
          continue;
        }

        // Normalize base symbol (remove X prefix for crypto)
        let baseSymbol = pairInfo.base;
        if (baseSymbol.startsWith('X') && baseSymbol.length === 4) {
          baseSymbol = baseSymbol.substring(1);
        }
        // Special case: XBT -> BTC
        if (baseSymbol === 'XBT') {
          baseSymbol = 'BTC';
        }
        // Special case: XDG -> DOGE
        if (baseSymbol === 'XDG') {
          baseSymbol = 'DOGE';
        }

        // Normalize quote currency (remove Z prefix for fiat)
        let quoteCurrency = pairInfo.quote;
        if (quoteCurrency.startsWith('Z') && quoteCurrency.length === 4) {
          quoteCurrency = quoteCurrency.substring(1);
        }

        // Create lookup key: SYMBOL:CURRENCY (e.g., BTC:EUR)
        const lookupKey = `${baseSymbol}:${quoteCurrency}`;

        pairs.set(lookupKey, {
          pair: pairKey,
          base: baseSymbol,
          quote: quoteCurrency,
          altname: pairInfo.altname,
        });
      }

      cachedAssetPairs = pairs;
      cachedAssetPairsTimestamp = Date.now();
      return pairs;
    } catch (error) {
      console.error('Error fetching Kraken asset pairs:', error);
      return cachedAssetPairs || new Map();
    } finally {
      assetPairsFetchPromise = null;
    }
  })();

  return assetPairsFetchPromise;
}

async function getKrakenPair(symbol: string, currency: string): Promise<string | null> {
  const pairs = await fetchAssetPairs();
  const normalized = normalizeSymbol(symbol);
  const currUpper = currency.toUpperCase();

  // Try exact match first
  const lookupKey = `${normalized}:${currUpper}`;
  const pairInfo = pairs.get(lookupKey);
  if (pairInfo) {
    return pairInfo.pair;
  }

  // Also try with the original symbol (for symbols that don't need normalization)
  const originalKey = `${symbol.toUpperCase()}:${currUpper}`;
  const originalPairInfo = pairs.get(originalKey);
  if (originalPairInfo) {
    return originalPairInfo.pair;
  }

  return null;
}

export async function fetchKrakenPrice(
  symbol: string,
  preferredCurrency?: string
): Promise<{ price: number; currency: string } | null> {
  // Try preferred currency first, then EUR, then USD as fallback
  const currencies = preferredCurrency
    ? [preferredCurrency.toUpperCase(), 'EUR', 'USD']
    : ['EUR', 'USD'];

  for (const currency of currencies) {
    const pair = await getKrakenPair(symbol, currency);
    if (!pair) {
      continue;
    }

    try {
      const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as KrakenTickerResponse;

      if (data.error?.length > 0) {
        console.error('Kraken API error:', data.error);
        continue;
      }

      // Get the first (and only) result
      const resultKey = Object.keys(data.result)[0];
      const ticker = data.result[resultKey];

      if (ticker?.c?.[0]) {
        return {
          price: parseFloat(ticker.c[0]),
          currency,
        };
      }
    } catch (error) {
      console.error('Error fetching Kraken price:', error);
    }
  }

  return null;
}

// Fetch multiple prices at once (Kraken supports comma-separated pairs)
// Returns plain object (not Map) for JSON serialization compatibility with cache persistence
export async function fetchKrakenPrices(
  symbols: string[],
  preferredCurrency?: string
): Promise<Record<string, { price: number; currency: string }>> {
  const results: Record<string, { price: number; currency: string }> = {};
  const currency = preferredCurrency?.toUpperCase() || 'EUR';

  // Build pairs list
  const pairs: string[] = [];
  const pairToSymbol = new Map<string, string>();

  // Resolve all pairs first
  for (const symbol of symbols) {
    const pair = await getKrakenPair(symbol, currency);
    if (pair) {
      pairs.push(pair);
      pairToSymbol.set(pair, symbol.toUpperCase());
    }
  }

  if (pairs.length === 0) {
    return results;
  }

  try {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pairs.join(',')}`;
    const response = await fetch(url);

    if (!response.ok) {
      return results;
    }

    const data = (await response.json()) as KrakenTickerResponse;

    if (data.error?.length > 0) {
      console.error('Kraken API error:', data.error);
      return results;
    }

    for (const [pairKey, ticker] of Object.entries(data.result)) {
      // Kraken may return different key format, try to match by iterating stored pairs
      let symbol = pairToSymbol.get(pairKey);

      // If no direct match, try to find by comparing pair names
      if (!symbol) {
        for (const [storedPair, storedSymbol] of pairToSymbol.entries()) {
          if (pairKey === storedPair || pairKey.includes(storedPair.replace('/', ''))) {
            symbol = storedSymbol;
            break;
          }
        }
      }

      if (symbol && ticker?.c?.[0]) {
        results[symbol] = {
          price: parseFloat(ticker.c[0]),
          currency,
        };
      }
    }
  } catch (error) {
    console.error('Error batch fetching Kraken prices:', error);
  }

  return results;
}

// Check if Kraken supports this symbol
export async function isKrakenSupported(symbol: string): Promise<boolean> {
  const pairs = await fetchAssetPairs();
  const normalized = normalizeSymbol(symbol);

  // Check if any pair exists for this symbol with common quote currencies
  for (const currency of ['EUR', 'USD']) {
    const lookupKey = `${normalized}:${currency}`;
    if (pairs.has(lookupKey)) {
      return true;
    }
    const originalKey = `${symbol.toUpperCase()}:${currency}`;
    if (pairs.has(originalKey)) {
      return true;
    }
  }

  return false;
}

// Search for crypto assets available on Kraken
// Combines name-based search (from static list) with symbol-based search (from API pairs)
export async function searchKrakenAssets(
  query: string
): Promise<Array<{ symbol: string; name: string }>> {
  const { searchKrakenAssetsByName, getNameFromSymbol } = await import('./krakenAssets');

  // First, search by name using the static asset list
  const nameResults = searchKrakenAssetsByName(query);

  // Also search in the dynamic pairs for any symbols not in the static list
  const pairs = await fetchAssetPairs();
  const results: Array<{ symbol: string; name: string }> = [];
  const seenSymbols = new Set<string>();
  const queryUpper = query.toUpperCase();
  const queryLower = query.toLowerCase();

  // Add name-based results first (they have proper names)
  for (const asset of nameResults) {
    if (!seenSymbols.has(asset.code)) {
      seenSymbols.add(asset.code);
      results.push({
        symbol: asset.code,
        name: asset.name,
      });
    }
  }

  // Add any additional matches from pairs that weren't in the name results
  for (const [, pairInfo] of pairs) {
    // Only include pairs quoted in EUR or USD
    if (pairInfo.quote !== 'EUR' && pairInfo.quote !== 'USD') {
      continue;
    }

    const baseSymbol = pairInfo.base;

    // Skip if we already added this symbol
    if (seenSymbols.has(baseSymbol)) {
      continue;
    }

    // Match if the base symbol or altname contains the query
    if (
      baseSymbol.includes(queryUpper) ||
      pairInfo.altname.toUpperCase().includes(queryUpper)
    ) {
      seenSymbols.add(baseSymbol);
      // Try to get a proper name from our static list, fallback to altname
      const properName = getNameFromSymbol(baseSymbol);
      results.push({
        symbol: baseSymbol,
        name: properName || pairInfo.altname,
      });
    }
  }

  // Sort by exact match first, then alphabetically
  results.sort((a, b) => {
    // Exact symbol match
    if (a.symbol === queryUpper) return -1;
    if (b.symbol === queryUpper) return 1;

    // Symbol starts with query
    const aSymbolStarts = a.symbol.startsWith(queryUpper);
    const bSymbolStarts = b.symbol.startsWith(queryUpper);
    if (aSymbolStarts && !bSymbolStarts) return -1;
    if (bSymbolStarts && !aSymbolStarts) return 1;

    // Name starts with query
    const aNameStarts = a.name.toLowerCase().startsWith(queryLower);
    const bNameStarts = b.name.toLowerCase().startsWith(queryLower);
    if (aNameStarts && !bNameStarts) return -1;
    if (bNameStarts && !aNameStarts) return 1;

    return a.name.localeCompare(b.name);
  });

  return results.slice(0, 15);
}

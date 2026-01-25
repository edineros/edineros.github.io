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

// Map common symbols to Kraken pair format
// Kraken uses X prefix for crypto (XBT, XETH) and Z prefix for fiat (ZEUR, ZUSD)
const symbolToKrakenPair: Record<string, Record<string, string>> = {
  BTC: { EUR: 'XXBTZEUR', USD: 'XXBTZUSD' },
  BITCOIN: { EUR: 'XXBTZEUR', USD: 'XXBTZUSD' },
  ETH: { EUR: 'XETHZEUR', USD: 'XETHZUSD' },
  SOL: { EUR: 'SOLEUR', USD: 'SOLUSD' },
  XRP: { EUR: 'XXRPZEUR', USD: 'XXRPZUSD' },
  ADA: { EUR: 'ADAEUR', USD: 'ADAUSD' },
  DOT: { EUR: 'DOTEUR', USD: 'DOTUSD' },
  DOGE: { EUR: 'XDGEUR', USD: 'XDGUSD' },
  LTC: { EUR: 'XLTCZEUR', USD: 'XLTCZUSD' },
  LINK: { EUR: 'LINKEUR', USD: 'LINKUSD' },
  AVAX: { EUR: 'AVAXEUR', USD: 'AVAXUSD' },
  ATOM: { EUR: 'ATOMEUR', USD: 'ATOMUSD' },
  UNI: { EUR: 'UNIEUR', USD: 'UNIUSD' },
  XLM: { EUR: 'XXLMZEUR', USD: 'XXLMZUSD' },
  XMR: { EUR: 'XXMRZEUR', USD: 'XXMRZUSD' },
  MATIC: { EUR: 'MATICEUR', USD: 'MATICUSD' },
};

function getKrakenPair(symbol: string, currency: string): string | null {
  const upper = symbol.toUpperCase();
  const currUpper = currency.toUpperCase();
  return symbolToKrakenPair[upper]?.[currUpper] || null;
}

export async function fetchKrakenPrice(
  symbol: string,
  preferredCurrency?: string
): Promise<{ price: number; currency: string } | null> {
  // Try preferred currency first, then USD as fallback
  const currencies = preferredCurrency
    ? [preferredCurrency.toUpperCase(), 'USD']
    : ['USD'];

  for (const currency of currencies) {
    const pair = getKrakenPair(symbol, currency);
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
export async function fetchKrakenPrices(
  symbols: string[],
  preferredCurrency?: string
): Promise<Map<string, { price: number; currency: string }>> {
  const results = new Map<string, { price: number; currency: string }>();
  const currency = preferredCurrency?.toUpperCase() || 'USD';

  // Build pairs list
  const pairs: string[] = [];
  const symbolToPair = new Map<string, string>();

  for (const symbol of symbols) {
    const pair = getKrakenPair(symbol, currency);
    if (pair) {
      pairs.push(pair);
      symbolToPair.set(pair, symbol.toUpperCase());
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
      // Kraken may return different key format, try to match
      const symbol = symbolToPair.get(pairKey);
      if (symbol && ticker?.c?.[0]) {
        results.set(symbol, {
          price: parseFloat(ticker.c[0]),
          currency,
        });
      }
    }
  } catch (error) {
    console.error('Error batch fetching Kraken prices:', error);
  }

  return results;
}

// Check if Kraken supports this symbol
export function isKrakenSupported(symbol: string): boolean {
  return symbol.toUpperCase() in symbolToKrakenPair;
}

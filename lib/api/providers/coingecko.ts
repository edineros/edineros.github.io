interface CoinGeckoPrice {
  [coinId: string]: {
    [currency: string]: number;
  };
}

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

// Common crypto symbols to CoinGecko IDs mapping
const symbolToIdMap: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  USDC: 'usd-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  SOL: 'solana',
  TRX: 'tron',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LTC: 'litecoin',
  SHIB: 'shiba-inu',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  ATOM: 'cosmos',
  UNI: 'uniswap',
  XLM: 'stellar',
  XMR: 'monero',
};

export function getCoinGeckoId(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  return symbolToIdMap[upper] || null;
}

export async function fetchCoinGeckoPrice(
  symbolOrId: string,
  preferredCurrency?: string
): Promise<{
  price: number;
  currency: string;
} | null> {
  try {
    // Try to resolve symbol to ID
    const coinId = getCoinGeckoId(symbolOrId) || symbolOrId.toLowerCase();

    // Request both preferred currency and USD as fallback
    const currencies = preferredCurrency ? `${preferredCurrency.toLowerCase()},usd` : 'usd';

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=${currencies}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as CoinGeckoPrice;

    if (!data[coinId]) {
      return null;
    }

    // Try preferred currency first, then USD
    const prefCurrencyLower = preferredCurrency?.toLowerCase();
    if (prefCurrencyLower && data[coinId][prefCurrencyLower] !== undefined) {
      return {
        price: data[coinId][prefCurrencyLower],
        currency: preferredCurrency!.toUpperCase(),
      };
    }

    if (data[coinId].usd !== undefined) {
      return {
        price: data[coinId].usd,
        currency: 'USD',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching CoinGecko price:', error);
    return null;
  }
}

export async function searchCoinGecko(query: string): Promise<
  Array<{
    id: string;
    symbol: string;
    name: string;
    marketCapRank: number | null;
  }>
> {
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const coins = (data?.coins || []) as CoinGeckoSearchResult[];

    return coins.slice(0, 10).map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      marketCapRank: coin.market_cap_rank,
    }));
  } catch (error) {
    console.error('Error searching CoinGecko:', error);
    return [];
  }
}

// Fetch multiple prices at once (more efficient)
export async function fetchCoinGeckoPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  try {
    // Convert symbols to IDs
    const ids = symbols
      .map((s) => getCoinGeckoId(s) || s.toLowerCase())
      .join(',');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return results;
    }

    const data = (await response.json()) as CoinGeckoPrice;

    for (const symbol of symbols) {
      const coinId = getCoinGeckoId(symbol) || symbol.toLowerCase();
      if (data[coinId]?.usd) {
        results.set(symbol.toUpperCase(), data[coinId].usd);
      }
    }
  } catch (error) {
    console.error('Error fetching CoinGecko prices:', error);
  }

  return results;
}

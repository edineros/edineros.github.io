// v2 API response: array of rate objects
interface FrankfurterRateV2 {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

// v2 API currencies response: array of currency objects
interface FrankfurterCurrencyV2 {
  iso_code: string;
  name: string;
}

const BASE_URL = 'https://api.frankfurter.dev/v2';

// Map to store in-flight requests to prevent duplicate API calls
const inFlightRequests = new Map<string, Promise<number | null>>();

function getCacheKey(fromCurrency: string, toCurrency: string): string {
  return `${fromCurrency.toUpperCase()}_${toCurrency.toUpperCase()}`;
}

export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  // Same currency = 1
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

  const cacheKey = getCacheKey(fromCurrency, toCurrency);

  // Check if there's already a request in flight for this pair
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  // Create the actual fetch promise
  const fetchPromise = (async () => {
    try {
      const url = `${BASE_URL}/rates?base=${encodeURIComponent(fromCurrency.toUpperCase())}&quotes=${encodeURIComponent(toCurrency.toUpperCase())}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Frankfurter API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as FrankfurterRateV2[];

      if (!Array.isArray(data) || data.length === 0) {
        console.error('Frankfurter API: unexpected response format');
        return null;
      }

      const rate = data[0].rate;
      return rate ?? null;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return null;
    } finally {
      // Clean up the in-flight request after completion
      inFlightRequests.delete(cacheKey);
    }
  })();

  // Store the promise so other concurrent requests can use it
  inFlightRequests.set(cacheKey, fetchPromise);

  return fetchPromise;
}

// Get list of supported currencies
export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/currencies`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
    }

    const data = (await response.json()) as FrankfurterCurrencyV2[];
    return data.map((c) => c.iso_code);
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    return ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
  }
}

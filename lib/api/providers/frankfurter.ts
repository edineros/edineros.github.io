interface FrankfurterRates {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

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
      const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(fromCurrency.toUpperCase())}&to=${encodeURIComponent(toCurrency.toUpperCase())}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Frankfurter API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as FrankfurterRates;
      const rate = data.rates[toCurrency.toUpperCase()];

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
    const response = await fetch('https://api.frankfurter.app/currencies', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
    }

    const data = (await response.json()) as Record<string, string>;
    return Object.keys(data);
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    return ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
  }
}

interface FrankfurterRates {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  // Same currency = 1
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return 1;
  }

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
  }
}

export async function fetchMultipleExchangeRates(
  baseCurrency: string,
  targetCurrencies: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (targetCurrencies.length === 0) {
    return results;
  }

  // Add the base currency itself with rate 1
  results.set(baseCurrency.toUpperCase(), 1);

  // Filter out the base currency from targets
  const targets = targetCurrencies
    .filter((c) => c.toUpperCase() !== baseCurrency.toUpperCase())
    .map((c) => c.toUpperCase());

  if (targets.length === 0) {
    return results;
  }

  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseCurrency.toUpperCase())}&to=${encodeURIComponent(targets.join(','))}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return results;
    }

    const data = (await response.json()) as FrankfurterRates;

    for (const [currency, rate] of Object.entries(data.rates)) {
      results.set(currency, rate);
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
  }

  return results;
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

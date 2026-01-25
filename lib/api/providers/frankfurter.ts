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

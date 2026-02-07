import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './config/queryKeys';
import { EXCHANGE_RATE_STALE_TIME } from './config/queryClient';
import { fetchExchangeRate as fetchExchangeRateFromApi } from '../api/providers/frankfurter';

export function useExchangeRate(fromCurrency: string | undefined, toCurrency: string | undefined) {
  const from = fromCurrency?.toUpperCase() ?? '';
  const to = toCurrency?.toUpperCase() ?? '';
  const isSameCurrency = from === to;

  return useQuery({
    queryKey: queryKeys.exchangeRates.pair(from, to),
    queryFn: async () => {
      if (isSameCurrency) {
        return 1;
      }
      return fetchExchangeRateFromApi(from, to);
    },
    enabled: !!fromCurrency && !!toCurrency,
    staleTime: EXCHANGE_RATE_STALE_TIME,
  });
}

// Helper hook to convert an amount between currencies
export function useConvertCurrency(
  amount: number | null,
  fromCurrency: string | undefined,
  toCurrency: string | undefined
) {
  const { data: rate, isLoading, error } = useExchangeRate(fromCurrency, toCurrency);

  const convertedAmount = rate !== null && rate !== undefined && amount !== null
    ? amount * rate
    : null;

  return {
    convertedAmount,
    rate,
    isLoading,
    error,
  };
}

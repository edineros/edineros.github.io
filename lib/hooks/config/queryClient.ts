import { QueryClient } from '@tanstack/react-query';
import type { AssetType } from '../../types';

// TTL in milliseconds for different asset types
export const PRICE_STALE_TIME: Record<AssetType, number> = {
  stock: 15 * 60 * 1000, // 15 min
  etf: 15 * 60 * 1000, // 15 min
  crypto: 5 * 60 * 1000, // 5 min
  bitcoin: 5 * 60 * 1000, // 5 min
  bond: 60 * 60 * 1000, // 60 min
  commodity: 15 * 60 * 1000, // 15 min
  cash: 24 * 60 * 60 * 1000, // 24 hours
  realEstate: 24 * 60 * 60 * 1000, // 24 hours
  other: 30 * 60 * 1000, // 30 min
};

// Exchange rates: 60 min
export const EXCHANGE_RATE_STALE_TIME = 60 * 60 * 1000;

// Database queries: refetch on focus, short stale time
export const DB_STALE_TIME = 30 * 1000; // 30 seconds

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DB_STALE_TIME,
        // gcTime must be longer than max persistence age to allow restoration
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
}

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createQueryClient } from '../hooks/config/queryClient';

// Create a single query client instance
const queryClient = createQueryClient();

// Storage key for persisted cache
const CACHE_KEY = 'portfolio-query-cache';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Web localStorage wrapped as async storage
const webStorage = {
  getItem: async (key: string) => window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: async (key: string) => window.localStorage.removeItem(key),
};

const persister = createAsyncStoragePersister({
  storage: webStorage,
  key: CACHE_KEY,
});

export function QueryProvider({ children }: QueryProviderProps) {
  const showDevtools = __DEV__;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: Infinity,
        buster: '3', // Increment to invalidate all cached data
        dehydrateOptions: {
          // Don't persist database queries (portfolios, assets, etc.) - only persist prices/exchange rates
          // This prevents stale data issues after import
          shouldDehydrateQuery: (query) => {
            if (query.state.data == null) {
              return false;
            }
            // Only persist price and exchange rate queries
            const key = query.queryKey;
            if (Array.isArray(key) && key.length > 0) {
              const firstKey = key[0];
              return firstKey === 'prices' || firstKey === 'exchangeRates';
            }
            return false;
          },
        },
      }}
    >
      {children}
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}

// Export queryClient for use in mutations and manual cache operations
export { queryClient };

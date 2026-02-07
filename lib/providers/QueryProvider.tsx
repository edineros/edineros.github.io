import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
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

// Async storage interface that works for both web and native
interface AsyncStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Web localStorage wrapped as async storage
const webStorage: AsyncStorage = {
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
  removeItem: async (key) => window.localStorage.removeItem(key),
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [persister, setPersister] = useState<ReturnType<typeof createAsyncStoragePersister> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: use localStorage wrapped as async
      const webPersister = createAsyncStoragePersister({
        storage: webStorage,
        key: CACHE_KEY,
      });
      setPersister(webPersister);
      setIsReady(true);
    } else {
      // Native: use AsyncStorage
      (async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const nativePersister = createAsyncStoragePersister({
            storage: AsyncStorage,
            key: CACHE_KEY,
          });
          setPersister(nativePersister);
        } catch {
          // AsyncStorage not available, skip persistence
        }
        setIsReady(true);
      })();
    }
  }, []);

  // Wait until we've checked for persistence support
  if (!isReady) {
    return null;
  }

  // Show devtools only on web in development
  const showDevtools = Platform.OS === 'web' && __DEV__;

  // No persistence available (native without AsyncStorage)
  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours max cache age
        buster: '2', // Increment to invalidate all cached data
        dehydrateOptions: {
          // Don't persist queries with null/undefined data (failed fetches)
          shouldDehydrateQuery: (query) => {
            return query.state.status === 'success' && query.state.data != null;
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

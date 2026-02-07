import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllAssets,
  getAssetsByPortfolioId,
  getAssetById,
  createAsset as dbCreateAsset,
  updateAsset as dbUpdateAsset,
  deleteAsset as dbDeleteAsset,
} from '../db/assets';
import { queryKeys } from './config/queryKeys';
import type { AssetType } from '../types';

export function useAssets(portfolioId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assets.byPortfolio(portfolioId ?? ''),
    queryFn: () => (portfolioId ? getAssetsByPortfolioId(portfolioId) : []),
    enabled: !!portfolioId,
  });
}

export function useAllAssets() {
  return useQuery({
    queryKey: queryKeys.assets.all,
    queryFn: getAllAssets,
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assets.detail(id ?? ''),
    queryFn: () => (id ? getAssetById(id) : null),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      portfolioId,
      symbol,
      type,
      name,
      currency = 'EUR',
      categoryId = null,
    }: {
      portfolioId: string;
      symbol: string;
      type: AssetType;
      name?: string;
      currency?: string;
      categoryId?: string | null;
    }) => {
      return dbCreateAsset(portfolioId, symbol, type, name, currency, categoryId);
    },
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.byPortfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { symbol?: string; name?: string; type?: AssetType; currency?: string; categoryId?: string | null };
    }) => {
      return dbUpdateAsset(id, updates);
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.detail(result.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.byPortfolio(result.portfolioId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      }
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, portfolioId }: { id: string; portfolioId: string }) => {
      return dbDeleteAsset(id);
    },
    onSuccess: (_, { portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.byPortfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransactionsByAssetId,
  getTransactionById,
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from '../db/transactions';
import { queryKeys } from './config/queryKeys';
import type { TransactionType } from '../types';

export function useTransactions(assetId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.byAsset(assetId ?? ''),
    queryFn: () => (assetId ? getTransactionsByAssetId(assetId) : []),
    enabled: !!assetId,
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? ''),
    queryFn: () => (id ? getTransactionById(id) : null),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      type,
      quantity,
      pricePerUnit,
      date,
      options,
    }: {
      assetId: string;
      type: TransactionType;
      quantity: number;
      pricePerUnit: number;
      date: Date;
      options?: {
        fee?: number;
        notes?: string;
        tags?: string[];
        lotId?: string;
      };
    }) => {
      return dbCreateTransaction(assetId, type, quantity, pricePerUnit, date, options);
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byAsset(assetId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.byAsset(assetId) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      assetId,
      updates,
    }: {
      id: string;
      assetId: string;
      updates: {
        type?: TransactionType;
        quantity?: number;
        pricePerUnit?: number;
        fee?: number;
        date?: Date;
        notes?: string | null;
        tags?: string[];
        lotId?: string | null;
      };
    }) => {
      return dbUpdateTransaction(id, updates);
    },
    onSuccess: (_, { id, assetId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byAsset(assetId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.byAsset(assetId) });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assetId }: { id: string; assetId: string }) => {
      return dbDeleteTransaction(id);
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byAsset(assetId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.byAsset(assetId) });
    },
  });
}

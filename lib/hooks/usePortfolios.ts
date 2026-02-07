import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllPortfolios,
  getPortfolioById,
  createPortfolio as dbCreatePortfolio,
  updatePortfolio as dbUpdatePortfolio,
  deletePortfolio as dbDeletePortfolio,
} from '../db/portfolios';
import { queryKeys } from './config/queryKeys';

export function usePortfolios() {
  return useQuery({
    queryKey: queryKeys.portfolios.all,
    queryFn: getAllPortfolios,
  });
}

export function usePortfolio(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.portfolios.detail(id ?? ''),
    queryFn: () => (id ? getPortfolioById(id) : null),
    enabled: !!id,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, currency = 'EUR' }: { name: string; currency?: string }) => {
      return dbCreatePortfolio(name, currency);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios.all });
    },
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; currency?: string; masked?: boolean };
    }) => {
      return dbUpdatePortfolio(id, updates);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios.detail(id) });
    },
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return dbDeletePortfolio(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios.all });
    },
  });
}

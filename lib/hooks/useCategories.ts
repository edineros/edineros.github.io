import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './config/queryKeys';
import {
  getAllCategories,
  getCategoryById,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
} from '../db/categories';
import type { Category } from '../types';

// Stale time for categories (rarely changes)
const CATEGORIES_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: getAllCategories,
    staleTime: CATEGORIES_STALE_TIME,
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id!),
    queryFn: () => getCategoryById(id!),
    enabled: !!id,
    staleTime: CATEGORIES_STALE_TIME,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      color,
      sortOrder,
    }: {
      name: string;
      color: string;
      sortOrder?: number;
    }): Promise<Category> => {
      return dbCreateCategory(name, color, sortOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; color?: string; sortOrder?: number };
    }) => {
      return dbUpdateCategory(id, updates);
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.detail(result.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      }
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return dbDeleteCategory(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      // Also invalidate assets since they may have been updated
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

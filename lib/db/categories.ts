import { generateId } from '../utils/generateId';
import { webDb } from './webDatabase';
import type { Category } from '../types';

export async function getAllCategories(): Promise<Category[]> {
  return webDb.getAllCategories();
}

export async function getCategoryById(id: string): Promise<Category | null> {
  return webDb.getCategoryById(id);
}

export async function createCategory(
  name: string,
  color: string,
  sortOrder: number = 0
): Promise<Category> {
  const id = generateId();
  const now = Date.now();

  await webDb.createCategory({
    id,
    name,
    color,
    sort_order: sortOrder,
    created_at: now,
  });

  return {
    id,
    name,
    color,
    sortOrder,
    createdAt: new Date(now),
  };
}

export async function updateCategory(
  id: string,
  updates: { name?: string; color?: string; sortOrder?: number }
): Promise<Category | null> {
  const category = await getCategoryById(id);
  if (!category) {
    return null;
  }

  const newName = updates.name ?? category.name;
  const newColor = updates.color ?? category.color;
  const newSortOrder = updates.sortOrder ?? category.sortOrder;

  await webDb.updateCategory({
    id,
    name: newName,
    color: newColor,
    sort_order: newSortOrder,
    created_at: category.createdAt.getTime(),
  });

  return {
    ...category,
    name: newName,
    color: newColor,
    sortOrder: newSortOrder,
  };
}

export async function deleteCategory(id: string): Promise<boolean> {
  await webDb.deleteCategory(id);
  return true;
}

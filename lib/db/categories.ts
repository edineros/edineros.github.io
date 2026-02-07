import { generateUUID } from '../utils/uuid';
import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { Category } from '../types';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: number;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
  };
}

export async function getAllCategories(): Promise<Category[]> {
  if (isWeb()) {
    return webDb.getAllCategories();
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'
  );
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  if (isWeb()) {
    return webDb.getCategoryById(id);
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return row ? rowToCategory(row) : null;
}

export async function createCategory(
  name: string,
  color: string,
  sortOrder: number = 0
): Promise<Category> {
  const id = generateUUID();
  const now = Date.now();

  if (isWeb()) {
    await webDb.createCategory({
      id,
      name,
      color,
      sort_order: sortOrder,
      created_at: now,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, color, sortOrder, now]
    );
  }

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

  if (isWeb()) {
    await webDb.updateCategory({
      id,
      name: newName,
      color: newColor,
      sort_order: newSortOrder,
      created_at: category.createdAt.getTime(),
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE categories SET name = ?, color = ?, sort_order = ? WHERE id = ?',
      [newName, newColor, newSortOrder, id]
    );
  }

  return {
    ...category,
    name: newName,
    color: newColor,
    sortOrder: newSortOrder,
  };
}

export async function deleteCategory(id: string): Promise<boolean> {
  if (isWeb()) {
    await webDb.deleteCategory(id);
    return true;
  }

  const db = await getDatabase();
  // Assets with this category will have their category_id set to NULL due to ON DELETE SET NULL
  const result = await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  return result.changes > 0;
}

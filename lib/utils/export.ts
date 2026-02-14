import { Platform } from 'react-native';
import { format } from 'date-fns';
import { getAllPortfolios, getPortfolioById } from '../db/portfolios';
import { getAssetsByPortfolioId } from '../db/assets';
import { getTransactionsByAssetId } from '../db/transactions';
import { getAllCategories } from '../db/categories';
import type { ExportData, Portfolio, Asset, Transaction, AssetType } from '../types';
import { isValidAssetType } from '../types';
import { ImportResult } from './backup';

const EXPORT_VERSION = '1.0';

/**
 * Export portfolio data. If portfolioId is provided, exports only that portfolio.
 * Otherwise exports all portfolios.
 */
export async function exportData(portfolioId?: string): Promise<ExportData> {
  let portfolios: Portfolio[];

  if (portfolioId) {
    const portfolio = await getPortfolioById(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }
    portfolios = [portfolio];
  } else {
    portfolios = await getAllPortfolios();
  }

  const categories = await getAllCategories();
  const assets: Asset[] = [];
  const transactions: Transaction[] = [];

  for (const portfolio of portfolios) {
    const portfolioAssets = await getAssetsByPortfolioId(portfolio.id);
    assets.push(...portfolioAssets);

    for (const asset of portfolioAssets) {
      const assetTransactions = await getTransactionsByAssetId(asset.id);
      transactions.push(...assetTransactions);
    }
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    portfolios,
    categories,
    assets,
    transactions,
  };
}

// Web-specific: trigger file download
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToJson(portfolioId?: string): Promise<string> {
  const data = await exportData(portfolioId);
  const json = JSON.stringify(data, null, 2);
  const filename = `portfolio_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;

  if (Platform.OS === 'web') {
    downloadFile(json, filename, 'application/json');
    return filename; // Return filename for web (no file path)
  }

  // Native: use expo-file-system
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.document, filename);
  await file.write(json);
  return file.uri;
}

export async function shareFile(filePath: string): Promise<void> {
  if (Platform.OS === 'web') {
    // On web, file was already downloaded in exportToJson
    return;
  }

  // Native: use expo-sharing
  const Sharing = await import('expo-sharing');
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Export Portfolio Data',
  });
}

export async function importFromJson(jsonString: string): Promise<ImportResult> {
  const data = JSON.parse(jsonString) as ExportData;

  if (data.version !== EXPORT_VERSION) {
    console.warn(`Import version mismatch: ${data.version} vs ${EXPORT_VERSION}`);
  }

  const { createPortfolio, getAllPortfolios, deletePortfolio } = await import('../db/portfolios');
  const { createCategory, getAllCategories: getExistingCategories, deleteCategory } = await import('../db/categories');
  const { createAsset, updateAsset } = await import('../db/assets');
  const { createTransaction } = await import('../db/transactions');

  // Delete all existing data before importing
  // Due to ON DELETE CASCADE, deleting portfolios will also delete assets and transactions
  const existingPortfolios = await getAllPortfolios();
  for (const portfolio of existingPortfolios) {
    await deletePortfolio(portfolio.id);
  }

  // Safety: delete any orphaned assets (in case CASCADE didn't work on older app versions)
  const { getAllAssets, deleteAsset } = await import('../db/assets');
  const remainingAssets = await getAllAssets();
  if (remainingAssets.length > 0) {
    for (const asset of remainingAssets) {
      await deleteAsset(asset.id);
    }
  }

  // Delete existing categories
  const existingCategories = await getExistingCategories();
  for (const category of existingCategories) {
    await deleteCategory(category.id);
  }

  // Map old IDs to new IDs
  const portfolioIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();
  const assetIdMap = new Map<string, string>();

  let portfoliosImported = 0;
  let categoriesImported = 0;
  let assetsImported = 0;
  let transactionsImported = 0;

  // Import categories first (assets reference them)
  for (const category of data.categories || []) {
    const newCategory = await createCategory(category.name, category.color, category.sortOrder);
    categoryIdMap.set(category.id, newCategory.id);
    categoriesImported++;
  }

  // Import portfolios
  for (const portfolio of data.portfolios) {
    const newPortfolio = await createPortfolio(portfolio.name, portfolio.currency);
    portfolioIdMap.set(portfolio.id, newPortfolio.id);
    portfoliosImported++;
  }

  // Import assets
  for (const asset of data.assets) {
    const newPortfolioId = portfolioIdMap.get(asset.portfolioId);
    if (!newPortfolioId) {
      continue;
    }

    // Validate asset type - map unknown types to 'other' to preserve data
    let assetType: AssetType = asset.type;
    if (!isValidAssetType(asset.type)) {
      console.warn(`Unknown asset type "${asset.type}" for asset "${asset.symbol}", mapping to "other"`);
      assetType = 'other';
    }

    const newAsset = await createAsset(
      newPortfolioId,
      asset.symbol,
      assetType,
      asset.name || undefined,
      asset.currency
    );

    // Update asset with category if it had one
    if (asset.categoryId) {
      const newCategoryId = categoryIdMap.get(asset.categoryId);
      if (newCategoryId) {
        await updateAsset(newAsset.id, { categoryId: newCategoryId });
      }
    }

    assetIdMap.set(asset.id, newAsset.id);
    assetsImported++;
  }

  // Import transactions (sort by date to maintain lot relationships)
  const sortedTransactions = [...data.transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lotIdMap = new Map<string, string>();

  for (const tx of sortedTransactions) {
    const newAssetId = assetIdMap.get(tx.assetId);
    if (!newAssetId) {
      continue;
    }

    // Map lot ID if this is a sell transaction
    const newLotId = tx.lotId ? lotIdMap.get(tx.lotId) : undefined;

    const newTx = await createTransaction(
      newAssetId,
      tx.type,
      tx.quantity,
      tx.pricePerUnit,
      new Date(tx.date),
      {
        fee: tx.fee,
        notes: tx.notes || undefined,
        lotId: newLotId,
      }
    );

    // If this is a buy transaction, map its ID for future sell transactions
    if (tx.type === 'buy') {
      lotIdMap.set(tx.id, newTx.id);
    }

    transactionsImported++;
  }

  return {
    portfoliosImported,
    categoriesImported,
    assetsImported,
    transactionsImported,
  };
}

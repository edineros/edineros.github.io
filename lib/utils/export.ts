import { Platform } from 'react-native';
import { format } from 'date-fns';
import { getAllPortfolios } from '../db/portfolios';
import { getAssetsByPortfolioId } from '../db/assets';
import { getTransactionsByAssetId } from '../db/transactions';
import type { ExportData, Asset, Transaction, AssetType } from '../types';
import { isValidAssetType } from '../types';

const EXPORT_VERSION = '1.0';

export async function exportAllData(): Promise<ExportData> {
  const portfolios = await getAllPortfolios();
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

export async function exportToJson(): Promise<string> {
  const data = await exportAllData();
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

export async function importFromJson(jsonString: string): Promise<{
  portfoliosImported: number;
  assetsImported: number;
  transactionsImported: number;
}> {
  const data = JSON.parse(jsonString) as ExportData;

  if (data.version !== EXPORT_VERSION) {
    console.warn(`Import version mismatch: ${data.version} vs ${EXPORT_VERSION}`);
  }

  const { createPortfolio, getAllPortfolios, deletePortfolio } = await import('../db/portfolios');
  const { createAsset } = await import('../db/assets');
  const { createTransaction } = await import('../db/transactions');

  // Delete all existing data before importing
  // Due to ON DELETE CASCADE, deleting portfolios will also delete assets and transactions
  const existingPortfolios = await getAllPortfolios();
  for (const portfolio of existingPortfolios) {
    await deletePortfolio(portfolio.id);
  }

  // Map old IDs to new IDs
  const portfolioIdMap = new Map<string, string>();
  const assetIdMap = new Map<string, string>();

  let portfoliosImported = 0;
  let assetsImported = 0;
  let transactionsImported = 0;

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
      asset.currency,
      asset.tags || []
    );
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
        tags: tx.tags,
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
    assetsImported,
    transactionsImported,
  };
}

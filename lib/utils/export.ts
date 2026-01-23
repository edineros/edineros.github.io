import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllPortfolios } from '../db/portfolios';
import { getAssetsByPortfolioId } from '../db/assets';
import { getTransactionsByAssetId } from '../db/transactions';
import type { ExportData, Portfolio, Asset, Transaction } from '../types';
import { format } from 'date-fns';

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

export async function exportToJson(): Promise<string> {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);

  const filename = `portfolio_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
  const file = new File(Paths.document, filename);

  await file.write(json);

  return file.uri;
}

export async function exportTransactionsToCsv(portfolioId?: string): Promise<string> {
  const portfolios = portfolioId
    ? [await (await import('../db/portfolios')).getPortfolioById(portfolioId)].filter(Boolean) as Portfolio[]
    : await getAllPortfolios();

  const rows: string[] = [
    'date,portfolio,symbol,asset_name,type,quantity,price_per_unit,fee,total,notes,tags',
  ];

  for (const portfolio of portfolios) {
    const assets = await getAssetsByPortfolioId(portfolio.id);

    for (const asset of assets) {
      const transactions = await getTransactionsByAssetId(asset.id);

      for (const tx of transactions) {
        const total = tx.quantity * tx.pricePerUnit + tx.fee;
        const escapedNotes = tx.notes ? `"${tx.notes.replace(/"/g, '""')}"` : '';
        const tags = tx.tags.length > 0 ? `"${tx.tags.join(',')}"` : '';

        rows.push(
          [
            format(tx.date, 'yyyy-MM-dd'),
            portfolio.name,
            asset.symbol,
            asset.name || '',
            tx.type,
            tx.quantity.toString(),
            tx.pricePerUnit.toString(),
            tx.fee.toString(),
            total.toString(),
            escapedNotes,
            tags,
          ].join(',')
        );
      }
    }
  }

  const csv = rows.join('\n');
  const filename = `transactions_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
  const file = new File(Paths.document, filename);

  await file.write(csv);

  return file.uri;
}

export async function shareFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: filePath.endsWith('.json') ? 'application/json' : 'text/csv',
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

  const { createPortfolio } = await import('../db/portfolios');
  const { createAsset } = await import('../db/assets');
  const { createTransaction } = await import('../db/transactions');

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
    if (!newPortfolioId) continue;

    const newAsset = await createAsset(
      newPortfolioId,
      asset.symbol,
      asset.type,
      asset.name || undefined,
      asset.currency
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
    if (!newAssetId) continue;

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

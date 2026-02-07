import { alertAsync } from "./confirm";

export interface ImportResult {
  portfoliosImported: number;
  categoriesImported: number;
  assetsImported: number;
  transactionsImported: number;
}

export async function alertImportSuccess(result: ImportResult) {
  const message = `Imported:\n- ${result.portfoliosImported} portfolios\n- ${result.categoriesImported} categories\n- ${result.assetsImported} assets\n- ${result.transactionsImported} transactions`;
  return alertAsync('Import Successful', message);
}
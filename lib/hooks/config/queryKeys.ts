import type { AssetType } from '../../types';

export const queryKeys = {
  portfolios: {
    all: ['portfolios'] as const,
    detail: (id: string) => ['portfolios', id] as const,
  },
  assets: {
    all: ['assets'] as const,
    byPortfolio: (portfolioId: string) => ['assets', 'portfolio', portfolioId] as const,
    detail: (id: string) => ['assets', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    detail: (id: string) => ['categories', id] as const,
  },
  transactions: {
    byAsset: (assetId: string) => ['transactions', 'asset', assetId] as const,
    detail: (id: string) => ['transactions', id] as const,
  },
  lots: {
    byAsset: (assetId: string) => ['lots', 'asset', assetId] as const,
  },
  prices: {
    all: ['prices'] as const,
    single: (symbol: string, type: AssetType) => ['prices', symbol, type] as const,
  },
  exchangeRates: {
    all: ['exchangeRates'] as const,
    pair: (from: string, to: string) => ['exchangeRates', from, to] as const,
  },
};

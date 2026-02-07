# Maintenance

When making significant changes to the codebase (schema, project structure, design system, coding conventions), update this file to keep the context accurate.

---

# Coding Styles
- Prefer reusable components and patters if possible
- When refactoring, change existing comments only if needed
- Always use braces for control statements (no single-line shorthand)
- Use `Slot` instead of `Stack` for layout files (Stack causes errors in Expo Go)

```typescript
// Bad
if (!id) return;

// Good
if (!id) {
  return;
}
```

---

# Project Structure

```
/app                      # Expo Router screens
├── index.tsx             # Portfolio list (home)
├── _layout.tsx           # Root layout
├── settings/
│   ├── index.tsx         # Settings screen
│   ├── _layout.tsx       # Settings layout (uses Slot)
│   ├── qr-export.tsx     # QR code export
│   └── qr-import.tsx     # QR code import (mobile only)
├── portfolio/
│   ├── [id].tsx          # Portfolio detail
│   ├── create.tsx        # Create portfolio
│   └── edit/[id].tsx     # Edit portfolio
├── asset/
│   ├── [id].tsx          # Asset detail
│   ├── add.tsx           # Add asset
│   └── edit/[id].tsx     # Edit asset
└── lot/
    ├── add.tsx           # Add lot (buy transaction)
    ├── close.tsx         # Close lot (sell transaction)
    └── edit.tsx          # Edit lot

/lib
├── types.ts              # TypeScript interfaces
├── constants/
│   ├── assetTypes.ts     # Asset type definitions
│   ├── layout.ts         # Layout constants
│   └── ui.ts             # UI constants (VALUE_MASK, etc.)
├── theme/
│   ├── colors.ts         # Color definitions (dark/light)
│   └── store.ts          # Theme state (dark/light/auto)
├── providers/
│   └── QueryProvider.tsx # TanStack Query provider with cache persistence
├── hooks/                # TanStack Query hooks (data fetching)
│   ├── config/           # Query configuration
│   │   ├── queryKeys.ts      # Type-safe query key factory
│   │   └── queryClient.ts    # QueryClient config with TTLs
│   ├── stats/            # Computed/derived data hooks
│   │   ├── useAssetStats.ts      # Computed asset statistics
│   │   └── usePortfolioStats.ts  # Computed portfolio statistics
│   ├── usePortfolios.ts  # Portfolio queries & mutations
│   ├── useAssets.ts      # Asset queries & mutations
│   ├── useTransactions.ts # Transaction queries & mutations
│   ├── useLots.ts        # Lot queries
│   ├── usePrices.ts      # Price fetching hooks
│   └── useExchangeRates.ts # Exchange rate hooks
├── db/
│   ├── schema.ts         # SQLite schema & migrations
│   ├── webDatabase.ts    # IndexedDB wrapper for web
│   ├── webStorage.ts     # Web storage utilities
│   ├── portfolios.ts     # Portfolio CRUD (raw DB functions)
│   ├── assets.ts         # Asset CRUD (raw DB functions)
│   └── transactions.ts   # Transaction CRUD (raw DB functions)
├── api/
│   ├── prices.ts         # Price fetching & symbol search
│   └── providers/
│       ├── yahoo.ts      # Yahoo Finance (stocks, ETFs)
│       ├── kraken.ts     # Kraken (crypto)
│       ├── krakenAssets.ts # Kraken asset mappings
│       └── frankfurter.ts # Frankfurter (forex)
└── utils/
    ├── calculations.ts   # Lot statistics & realized gains
    ├── format.ts         # Number/currency formatting
    ├── export.ts         # JSON/CSV export
    ├── confirm.ts        # Confirmation dialogs
    └── uuid.ts           # UUID generation

/components                # Reusable UI components
├── Page.tsx              # Page wrapper (header + content)
├── Form.tsx              # Form container
├── FormField.tsx         # Form input wrapper
├── ScreenHeader.tsx      # Screen header with navigation
├── HeaderButtons.tsx     # Header action buttons
├── FloatingActionButton.tsx
├── LongButton.tsx        # Full-width button
├── MicroButton.tsx       # Small icon button
├── TextButton.tsx        # Text-only button
├── SegmentedControl.tsx  # Tab-like selector
├── CurrencySelect.tsx    # Currency picker
├── TagInput.tsx          # Tag input field
├── InfoRow.tsx           # Key-value display row
├── InfoLabel.tsx         # Labeled info display
├── LabeledElement.tsx    # Generic labeled wrapper
├── QuantityAtPrice.tsx   # Quantity @ price display
├── PortfolioSwitcher.tsx # Portfolio dropdown
├── DonutChart.tsx        # Pie/donut chart
├── AssetAllocationChart.tsx
└── AddAssetMenu.tsx      # Asset type selection menu

/store
└── index.ts              # Zustand store (UI state only)
```

---

# Data Model

- **Portfolio**: Container with base currency (default: EUR)
- **Asset**: Symbol with type (stock, etf, crypto, bond, commodity, forex, cash, other)
- **Transaction**: Buy/sell records (source of truth)
- **Lot**: Computed from buy transactions, tracks remaining quantity

## SQLite Schema

```sql
CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  masked INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  type TEXT CHECK(type IN ('stock','etf','crypto','bond','commodity','forex','cash','other')) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_at INTEGER NOT NULL
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('buy','sell')) NOT NULL,
  quantity REAL NOT NULL,
  price_per_unit REAL NOT NULL,
  fee REAL DEFAULT 0,
  date INTEGER NOT NULL,
  notes TEXT,
  lot_id TEXT,
  created_at INTEGER NOT NULL
);
```

Note: Price and exchange rate caching is handled by TanStack Query (see Data Fetching below).

---

# Data Fetching

Uses **TanStack Query** (`@tanstack/react-query`) for all async data management. Zustand is used only for UI state (current portfolio selection).

## Architecture

- **Hooks in `lib/hooks/`**: All data fetching goes through React Query hooks
- **Raw DB functions in `lib/db/`**: Direct database access (used by hooks)
- **API providers in `lib/api/providers/`**: External API calls (Yahoo, Kraken, Frankfurter)

## Cache TTLs (staleTime)

| Data Type | TTL |
|-----------|-----|
| Crypto/Bitcoin | 5 minutes |
| Stocks/ETFs/Commodities | 15 minutes |
| Bonds | 60 minutes |
| Exchange Rates | 60 minutes |
| Cash/Real Estate | 24 hours |
| Database queries | 30 seconds |

## Cache Persistence

Query cache persists to localStorage (web) or AsyncStorage (native) with 24-hour max age. Page refreshes won't refetch data if within TTL.

## Key Hooks

```typescript
// Database queries
usePortfolios(), usePortfolio(id)
useAssets(portfolioId), useAsset(id)
useLots(assetId)

// Price fetching (with TTL)
usePrice(symbol, assetType, currency)
usePrices(assets)

// Exchange rates
useExchangeRate(from, to)
useConvertCurrency(amount, from, to)

// Computed stats (combines multiple queries)
useAssetStats(assetId, portfolioCurrency)
usePortfolioStats(portfolioId)

// Mutations (auto-invalidate cache)
useCreatePortfolio(), useUpdatePortfolio(), useDeletePortfolio()
useCreateAsset(), useUpdateAsset(), useDeleteAsset()
useCreateTransaction(), useDeleteTransaction()
```

## Pull-to-Refresh

```typescript
const refreshPrices = useRefreshPrices();
<ScrollView onRefresh={refreshPrices} />
```

---

# Design System

## Theme

Supports **dark**, **light**, and **auto** (system) modes. Colors are defined in `lib/theme/colors.ts` as theme variables.

## Key Colors

| Token      | Dark        | Light       |
|------------|-------------|-------------|
| background | #000000     | #FFFFFF     |
| card       | #111111     | #FFFFFF     |
| text       | #FFFFFF     | #000000     |
| accent     | #007AFF     | #007AFF     |
| gain       | #00D897     | #34C759     |
| loss       | #FF6B6B     | #FF3B30     |

## Typography

- Large titles: 34px, weight 700
- Section headers: 13px, weight 600, uppercase, secondary color
- Values: 17-20px, weight 600-700
- Secondary text: 13px, secondary color

## Components

- Cards: 12px border radius, 1px border
- Buttons: 12px border radius, 16px vertical padding
- Inputs: 12px border radius
- Badges: 4-6px border radius, muted background for gain/loss

---

# Known Issues

1. **Web OPFS**: expo-sqlite OPFS doesn't work reliably on web; uses pure IndexedDB instead
2. **Price API Rate Limits**: Free APIs have rate limits; TanStack Query caching mitigates this
3. **Yahoo Finance**: May require CORS proxy for web; works natively on mobile
4. **expo-dev-client breaks Expo Go**: Do not add `expo-dev-client` to dependencies - it causes "Cannot find native module" errors (e.g., ExpoCamera) in Expo Go on iOS. Only add it if switching to development builds.
5. **AsyncStorage on web**: Native cache persistence uses dynamic `require()` for AsyncStorage with fallback to no persistence if unavailable

---

# Testing

Tests are placed in the same directory as the file they test, named `*.test.ts` / `*.test.tsx`.

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

```typescript
import { render, screen } from '@testing-library/react-native';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });
});
```

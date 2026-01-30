# Maintenance

When making significant changes to the codebase (schema, project structure, design system, coding conventions), update this file to keep the context accurate.

---

# Coding Styles
- Prefer reusable components and patters if possible
- When refactoring, change existing comments only if needed
- Always use braces for control statements (no single-line shorthand)

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
├── settings.tsx          # Settings screen
├── _layout.tsx           # Root layout
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
├── db/
│   ├── schema.ts         # SQLite schema & migrations
│   ├── webDatabase.ts    # IndexedDB wrapper for web
│   ├── webStorage.ts     # Web storage utilities
│   ├── portfolios.ts     # Portfolio CRUD
│   ├── assets.ts         # Asset CRUD
│   ├── transactions.ts   # Transaction CRUD
│   └── priceCache.ts     # Price & exchange rate cache
├── api/
│   ├── prices.ts         # Main price fetching logic
│   └── providers/
│       ├── yahoo.ts      # Yahoo Finance (stocks, ETFs)
│       ├── kraken.ts     # Kraken (crypto)
│       ├── krakenAssets.ts # Kraken asset mappings
│       └── frankfurter.ts # Frankfurter (forex)
└── utils/
    ├── calculations.ts   # Portfolio/asset calculations
    ├── format.ts         # Number/currency formatting
    ├── export.ts         # JSON/CSV export
    ├── confirm.ts        # Confirmation dialogs
    └── uuid.ts           # UUID generation

/components                # Reusable UI components
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
└── index.ts              # Zustand store
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

CREATE TABLE price_cache (
  symbol TEXT PRIMARY KEY,
  asset_type TEXT,
  price REAL,
  currency TEXT,
  fetched_at INTEGER,
  expires_at INTEGER
);

CREATE TABLE exchange_rates (
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (from_currency, to_currency)
);
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
2. **Price API Rate Limits**: Free APIs have rate limits; caching helps mitigate
3. **Yahoo Finance**: May require CORS proxy for web; works natively on mobile

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

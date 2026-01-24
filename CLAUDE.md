# Private Portfolio Tracker

A privacy-first, offline-capable portfolio tracking application for iOS, Android, and Web.

## Quick Start

```bash
npm start         # Start Expo dev server
npm run web       # Run on web
npm run ios       # Run on iOS
npm run android   # Run on Android
```

## Core Principles

1. **Privacy by Design** - No accounts, no server-side data storage
2. **Offline First** - Full functionality without internet; online only for price updates
3. **Data Ownership** - User data stored in portable, standard formats (JSON/CSV export)
4. **Simplicity** - Clean, minimal UI focused on essential features

## Technical Stack

- **Framework**: Expo (React Native) - iOS, Android, Web
- **Language**: TypeScript
- **State Management**: Zustand
- **Local Storage**: expo-sqlite (native), IndexedDB (web)
- **UI Framework**: Tamagui
- **Price APIs**: Yahoo Finance (stocks), CoinGecko (crypto), Frankfurter (forex)

## Project Structure

```
/app                    # Expo Router screens
├── (tabs)/            # Tab navigation (portfolios, settings)
│   ├── index.tsx      # Portfolio list screen
│   └── settings.tsx   # Settings screen
├── portfolio/         # Portfolio screens
│   ├── [id].tsx       # Portfolio detail
│   ├── create.tsx     # Create portfolio
│   └── edit/[id].tsx  # Edit portfolio
├── asset/             # Asset screens
│   ├── [id].tsx       # Asset detail
│   └── add.tsx        # Add asset
└── lot/               # Lot management screens
    ├── add.tsx        # Add lot (buy transaction)
    └── close.tsx      # Close lot (sell transaction)

/lib
├── db/                # Database operations
│   ├── schema.ts      # SQLite schema & init
│   ├── webDatabase.ts # IndexedDB for web
│   ├── portfolios.ts  # Portfolio CRUD
│   ├── assets.ts      # Asset CRUD
│   ├── transactions.ts # Transaction CRUD
│   └── priceCache.ts  # Price & exchange rate cache
├── api/               # Price API providers
│   ├── prices.ts      # Main price fetching logic
│   └── providers/     # Individual API providers
│       ├── yahoo.ts   # Yahoo Finance (stocks, ETFs)
│       ├── coingecko.ts # CoinGecko (crypto)
│       └── frankfurter.ts # Frankfurter (forex)
├── utils/             # Utilities
│   ├── calculations.ts # Portfolio/asset calculations
│   ├── format.ts      # Number/currency formatting
│   └── export.ts      # JSON/CSV export
└── types.ts           # TypeScript interfaces

/store
└── index.ts           # Zustand store
```

---

# Implementation Status

## Implemented (Working)

### Core Features
- [x] Portfolio CRUD (create, view, edit, delete)
- [x] Asset CRUD (create, view, delete)
- [x] Transaction management (buy/sell)
- [x] Lot tracking (computed from transactions)
- [x] Multi-currency support with automatic conversion
- [x] Price fetching from free APIs
- [x] Price caching with TTL (5min crypto, 15min stocks, 60min forex)
- [x] Exchange rate fetching and caching
- [x] Offline data persistence

### UI/UX
- [x] Dark theme (CoinStats/Delta style)
- [x] Portfolio list with total balance
- [x] Portfolio detail with holdings list
- [x] Asset detail with lots breakdown
- [x] Symbol search with auto-complete
- [x] Pull-to-refresh for price updates
- [x] Gain/loss display with color coding

### Data Storage
- [x] SQLite for native (iOS/Android)
- [x] IndexedDB for web (bypasses expo-sqlite OPFS issues)
- [x] Automatic platform detection

### Export/Import
- [x] JSON export (full portfolio backup)
- [x] CSV export (transactions)
- [x] JSON import (restore from backup)

## Recently Verified/Implemented

- [x] Settings screen functionality (export/import works)
- [x] Edit portfolio screen (accessible via Edit button in portfolio header)
- [x] Delete asset functionality (accessible via Delete button in asset header)
- [x] Export/import on web platform (uses blob download/file input)
- [x] Price fetching error handling (try/catch with graceful fallback)
- [x] Offline mode behavior (uses cached prices when offline)

# Data Model

- **Portfolio**: Container with base currency (default: EUR)
- **Asset**: Symbol with type (stock, etf, crypto, bond, commodity, forex, cash, other)
- **Transaction**: Buy/sell records (source of truth)
- **Lot**: Computed from buy transactions, tracks remaining quantity

## SQLite Schema

```sql
-- Portfolios
CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Assets
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  type TEXT CHECK(type IN ('stock','etf','crypto','bond','commodity','forex','cash','other')) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  created_at INTEGER NOT NULL
);

-- Transactions
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

-- Tags (many-to-many)
CREATE TABLE transaction_tags (
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (transaction_id, tag)
);

-- Price Cache
CREATE TABLE price_cache (
  symbol TEXT PRIMARY KEY,
  asset_type TEXT,
  price REAL,
  currency TEXT,
  fetched_at INTEGER,
  expires_at INTEGER
);

-- Exchange Rates Cache
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

## Colors (Dark Theme)

```
Background:       #000000
Card Background:  #111111
Card Border:      #1F1F1F
Text Primary:     #FFFFFF
Text Secondary:   #8E8E93
Text Tertiary:    #636366
Accent (Blue):    #007AFF
Gain (Green):     #00D897
Loss (Red):       #FF6B6B
```

## Typography

- Large titles: 34px, weight 700
- Section headers: 13px, weight 600, uppercase, color #8E8E93
- Values: 17-20px, weight 600-700
- Secondary text: 13px, color #8E8E93

## Components

- Cards: 12px border radius, 1px border, subtle background
- Buttons: 12px border radius, 16px vertical padding
- Inputs: 12px border radius, dark background (#111111)
- Badges: 4-6px border radius, tinted background for gain/loss

---

# Known Issues

1. **Web OPFS**: expo-sqlite OPFS doesn't work reliably on web, so we use pure IndexedDB instead
2. **Price API Rate Limits**: Free APIs have rate limits; caching helps mitigate this
3. **Yahoo Finance**: May require CORS proxy for web; works natively on mobile

---

# Code Style Guide

## Control Flow

Always use braces for control statements. No single-line shorthand.

```typescript
// Bad
if (!id) return;

// Good
if (!id) {
  return;
}
```

---

# Testing

## Setup

- **Test Runner**: Jest with jest-expo preset
- **Testing Library**: @testing-library/react-native

## Commands

```bash
npm test          # Run all tests
npm run test:watch # Run tests in watch mode
```

## Writing Tests

Tests should be placed in the same directtory as the file they are testing and should be named `*.test.ts` / `*.test.tsx`.

```typescript
import { render, screen } from '@testing-library/react-native';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });
});
```

---

# Development Notes

- Default currency is EUR (can be changed per portfolio)
- Prices fetched from free APIs (no API keys needed)
- All data stored locally - no server communication except price APIs
- No analytics or telemetry

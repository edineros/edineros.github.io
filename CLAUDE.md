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

## P0 Not Implemented

1. Fix current issues
- trying to delete a transaction by clicking the Delete button doesn't do anything;
- trying to delete an asset by clicking the delete icon in the headaer doesn't do anything;
- when a new asset and a lot for it is added, its rate and value is shown in the assets page, but when we return to the portfolio page, the asset is shown as "0 @ €0.00" so it seems at least the lots are not refreshed;

2. Simplify
- the "Add Asset" and "New Portfolio" titles should be shown in the header, the same way we show the Portfolios, Settings, asset, etc. titles;
- we show "quantity @ price" in a few places. change the quantity and the price to be white color. extract that into a separate component for future consistency;
- instead of listing currencies like buttons when creating/editing portfoltio/asset, we should instead have them as a dropdown;
- the "Add Asset" / "Add Lot" button should be a circle floating button with + icon inside, placed near the right edge;

3. Implement new features
- the edit modal for the portfolio should include an option to delete the portfoltio (with confirmation);
- add ability to edit asset (at least the optional name). The current delete icon should be changed to a gear/settings icon that opens an edit modal (similar to the edit for the portfolio). The current option for deleting an asset should go to the bottom of the edit page/modal of the asset (similar to the portfolio edit/delete);
- the portfolio title should be a dropdown (we can include a down caret icon for an indication or something similar) that shows all the portfolios and that allows us to change the current portfolio from the dropdown;

4. Lots/transactions
- add option to edit lot (since lots are an UI abstraction, that probably means the underlying transaction should be updated?)

5. Explore/update APIs
- it looks like we are being rate limited by yahoo. explore new options and come up with suggestions. find a yahoo API to fetch multiple symbols at once, find another provider or give other suggestions

6. Prepare the first test build for iOS. It won't be distributed via AppStore yet or via TestFlight because the developer doesn't have a paid apple developer account atm. So give instructions about how to proceed about opening the app with a test iphone to see if things are working properly. The developer has an expo.dev account if that will help. The developer may not be able to update the xcode on because the mac may need an update.

7. Add unit test coverage


## Not Implemented (P1 - Next Priority)

1. **Tags & Notes**
   - Add tags to transactions
   - Tag autocomplete from existing tags
   - Notes field on transactions

2. **CSV Import**
   - Import transactions from CSV
   - Map CSV columns to transaction fields

3. **Charts & Analytics**
   - Portfolio value over time chart
   - Asset allocation pie chart
   - Performance metrics

## Not Implemented (P2 - Future)

1. **Dividends/Income Tracking**
   - Record dividend payments
   - Track income per asset

2. **Tax Lot Selection**
   - FIFO (First In, First Out)
   - LIFO (Last In, First Out)
   - Specific identification

3. **Watchlist**
   - Track assets not yet owned
   - Price alerts for watchlist items

4. **Price Alerts**
   - Local notifications when price hits target
   - Percentage change alerts

5. **Widget Support**
   - iOS home screen widget
   - Android widget

6. **Light Theme Option**
   - Toggle between dark/light themes
   - System preference detection

---

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

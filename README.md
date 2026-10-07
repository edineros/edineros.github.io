# Edineros

A privacy-first, offline-capable portfolio tracking web application.

## Features

- **Privacy by Design** - No accounts, no server-side data storage
- **Offline First** - Full functionality without internet; online only for price updates
- **Data Ownership** - User data stored locally in portable formats (JSON/CSV export)
- **Web (PWA)**
- **Real-time Prices** - Fetches prices from Yahoo Finance (stocks), Kraken (crypto)

## Live Demo

**[https://edineros.github.io](https://edineros.github.io)**

Install as a PWA for the best experience:
- **Mobile**: Open in your browser → Share/Menu → Add to Home Screen
- **Desktop**: Click the install icon in the address bar

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Or directly in the browser
npm run web
```

### Build for Production

```bash
# Build web version (PWA)
npm run build:web

# Output is in the `dist` folder
```

## Hosting on GitHub Pages

### Automatic Deployment

This repository is configured for automatic deployment to GitHub Pages. Every push to the `main` branch triggers a build and deploy.

### Manual Setup (for forks)

1. **Fork this repository**

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Under "Build and deployment", select "GitHub Actions"

3. **Push to main branch**
   - The GitHub Action will automatically build and deploy

4. **Access your app**
   - If your repo is named `<username>.github.io`, it's available at `https://<username>.github.io/`
   - Otherwise, it's at `https://<username>.github.io/<repo-name>/` (add `EXPO_PUBLIC_BASE_PATH` env var in workflow)

### Self-Hosting

To host on your own server:

```bash
# Build the web app
npm run build:web

# The `dist` folder contains static files
# Upload to any static hosting service (Netlify, Vercel, etc.)
```

For root-level hosting (not a subdirectory), update `public/manifest.json`:
- Change `"start_url": "."` to `"start_url": "/"`
- Change `"scope": "."` to `"scope": "/"`

## Tech Stack

- **Framework**: Expo (React Native Web)
- **Language**: TypeScript
- **State**: Zustand
- **Storage**: IndexedDB
- **UI**: Tamagui
- **Price APIs**: Yahoo Finance, Kraken, Frankfurter

## License

Private use only.

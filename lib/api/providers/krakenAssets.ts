// Kraken asset name to symbol mapping
// Source: https://support.kraken.com/articles/360000678446-cryptocurrencies-available-on-kraken

export interface KrakenAsset {
  name: string;
  code: string;
}

export const krakenAssets: KrakenAsset[] = [
  { name: "0x", code: "ZRX" },
  { name: "1inch", code: "1INCH" },
  { name: "Aave", code: "AAVE" },
  { name: "Acala", code: "ACA" },
  { name: "Algorand", code: "ALGO" },
  { name: "Ankr", code: "ANKR" },
  { name: "ApeCoin", code: "APE" },
  { name: "Aptos", code: "APT" },
  { name: "Arbitrum", code: "ARB" },
  { name: "Arweave", code: "AR" },
  { name: "Astar", code: "ASTR" },
  { name: "Audius", code: "AUDIO" },
  { name: "Avalanche", code: "AVAX" },
  { name: "Axie Infinity", code: "AXS" },
  { name: "Badger DAO", code: "BADGER" },
  { name: "Balancer", code: "BAL" },
  { name: "Bancor", code: "BNT" },
  { name: "Band Protocol", code: "BAND" },
  { name: "Basic Attention Token", code: "BAT" },
  { name: "Beam", code: "BEAM" },
  { name: "Berachain", code: "BERA" },
  { name: "Biconomy", code: "BICO" },
  { name: "Bitcoin", code: "BTC" },
  { name: "Bitcoin Cash", code: "BCH" },
  { name: "Bittensor", code: "TAO" },
  { name: "Blur", code: "BLUR" },
  { name: "BNB", code: "BNB" },
  { name: "Bonfida", code: "FIDA" },
  { name: "Bonk", code: "BONK" },
  { name: "Cardano", code: "ADA" },
  { name: "Cartesi", code: "CTSI" },
  { name: "Celer Network", code: "CELR" },
  { name: "Celestia", code: "TIA" },
  { name: "Celo", code: "CELO" },
  { name: "Centrifuge", code: "CFG" },
  { name: "Chainlink", code: "LINK" },
  { name: "Chiliz", code: "CHZ" },
  { name: "Chromia", code: "CHR" },
  { name: "Civic", code: "CVC" },
  { name: "Compound", code: "COMP" },
  { name: "Convex Finance", code: "CVX" },
  { name: "Cosmos", code: "ATOM" },
  { name: "Cronos", code: "CRO" },
  { name: "Curve", code: "CRV" },
  { name: "Dai", code: "DAI" },
  { name: "Dash", code: "DASH" },
  { name: "Decentraland", code: "MANA" },
  { name: "Degen", code: "DEGEN" },
  { name: "Dogecoin", code: "DOGE" },
  { name: "Dogwifhat", code: "WIF" },
  { name: "Drift Protocol", code: "DRIFT" },
  { name: "dYdX", code: "DYDX" },
  { name: "Dymension", code: "DYM" },
  { name: "EigenLayer", code: "EIGEN" },
  { name: "Enjin Coin", code: "ENJ" },
  { name: "EOS", code: "EOS" },
  { name: "Ethena", code: "ENA" },
  { name: "Ether", code: "ETH" },
  { name: "Ethereum", code: "ETH" },
  { name: "Ethereum Classic", code: "ETC" },
  { name: "Ethereum Name Service", code: "ENS" },
  { name: "Fetch.ai", code: "FET" },
  { name: "Filecoin", code: "FIL" },
  { name: "Flare", code: "FLR" },
  { name: "Floki", code: "FLOKI" },
  { name: "Flow", code: "FLOW" },
  { name: "Flux", code: "FLUX" },
  { name: "Frax Share", code: "FXS" },
  { name: "Gala Games", code: "GALA" },
  { name: "Gitcoin", code: "GTC" },
  { name: "GMX", code: "GMX" },
  { name: "Gnosis", code: "GNO" },
  { name: "Grass", code: "GRASS" },
  { name: "The Graph", code: "GRT" },
  { name: "Hamster Kombat", code: "HMSTR" },
  { name: "Hedera", code: "HBAR" },
  { name: "Helium", code: "HNT" },
  { name: "Immutable X", code: "IMX" },
  { name: "Injective Protocol", code: "INJ" },
  { name: "Internet Computer", code: "ICP" },
  { name: "Jasmy", code: "JASMY" },
  { name: "Jito", code: "JTO" },
  { name: "Jupiter", code: "JUP" },
  { name: "Kamino", code: "KMNO" },
  { name: "Kaspa", code: "KAS" },
  { name: "Kava", code: "KAVA" },
  { name: "Kusama", code: "KSM" },
  { name: "Kyber Network", code: "KNC" },
  { name: "Lido DAO", code: "LDO" },
  { name: "Linea", code: "LINEA" },
  { name: "Liquity", code: "LQTY" },
  { name: "Lisk", code: "LSK" },
  { name: "Litecoin", code: "LTC" },
  { name: "Livepeer", code: "LPT" },
  { name: "Loopring", code: "LRC" },
  { name: "Magic Eden", code: "ME" },
  { name: "Maker", code: "MKR" },
  { name: "Mantle", code: "MNT" },
  { name: "Marinade SOL", code: "MSOL" },
  { name: "Mask Network", code: "MASK" },
  { name: "Memecoin", code: "MEME" },
  { name: "Mina", code: "MINA" },
  { name: "Monero", code: "XMR" },
  { name: "Moo Deng", code: "MOODENG" },
  { name: "Moonbeam", code: "GLMR" },
  { name: "Moonriver", code: "MOVR" },
  { name: "Morpho", code: "MORPHO" },
  { name: "Movement", code: "MOVE" },
  { name: "MultiversX", code: "EGLD" },
  { name: "Nano", code: "NANO" },
  { name: "Near Protocol", code: "NEAR" },
  { name: "Neiro", code: "NEIRO" },
  { name: "Notcoin", code: "NOT" },
  { name: "Ocean", code: "OCEAN" },
  { name: "Official Trump", code: "TRUMP" },
  { name: "OMG Network", code: "OMG" },
  { name: "Ondo", code: "ONDO" },
  { name: "Optimism", code: "OP" },
  { name: "Orca", code: "ORCA" },
  { name: "Orchid", code: "OXT" },
  { name: "Osmosis", code: "OSMO" },
  { name: "PancakeSwap", code: "CAKE" },
  { name: "PAX Gold", code: "PAXG" },
  { name: "Peanut the squirrel", code: "PNUT" },
  { name: "Pendle", code: "PENDLE" },
  { name: "Pepe", code: "PEPE" },
  { name: "Perpetual Protocol", code: "PERP" },
  { name: "Polkadot", code: "DOT" },
  { name: "Polygon", code: "POL" },
  { name: "Ponke", code: "PONKE" },
  { name: "Popcat", code: "POPCAT" },
  { name: "Pudgy Penguins", code: "PENGU" },
  { name: "Pyth Network", code: "PYTH" },
  { name: "Qtum", code: "QTUM" },
  { name: "Quant", code: "QNT" },
  { name: "Raydium", code: "RAY" },
  { name: "Render", code: "RENDER" },
  { name: "Ripple", code: "XRP" },
  { name: "Rocket Pool", code: "RPL" },
  { name: "The Sandbox", code: "SAND" },
  { name: "Secret", code: "SCRT" },
  { name: "Sei", code: "SEI" },
  { name: "Shiba Inu", code: "SHIB" },
  { name: "Siacoin", code: "SC" },
  { name: "Solana", code: "SOL" },
  { name: "Stacks", code: "STX" },
  { name: "Stargate Finance", code: "STG" },
  { name: "Starknet Token", code: "STRK" },
  { name: "Stellar Lumens", code: "XLM" },
  { name: "Stellar", code: "XLM" },
  { name: "Storj", code: "STORJ" },
  { name: "Story", code: "IP" },
  { name: "Sui", code: "SUI" },
  { name: "Sushi", code: "SUSHI" },
  { name: "Synthetix", code: "SNX" },
  { name: "Tensor", code: "TNSR" },
  { name: "Terra 2.0", code: "LUNA2" },
  { name: "Terra Classic", code: "LUNA" },
  { name: "Tether", code: "USDT" },
  { name: "Tether Gold", code: "XAUT" },
  { name: "Tezos", code: "XTZ" },
  { name: "Thorchain", code: "RUNE" },
  { name: "Toncoin", code: "TON" },
  { name: "Tron", code: "TRX" },
  { name: "Turbo", code: "TURBO" },
  { name: "Uniswap", code: "UNI" },
  { name: "USD Coin", code: "USDC" },
  { name: "Worldcoin", code: "WLD" },
  { name: "Wormhole", code: "W" },
  { name: "Wrapped Bitcoin", code: "WBTC" },
  { name: "Yearn Finance", code: "YFI" },
  { name: "Zcash", code: "ZEC" },
  { name: "Zetachain", code: "ZETA" },
  { name: "Zircuit", code: "ZRC" },
];

// Build lookup maps for fast searching
const nameToCodeMap = new Map<string, string>();
const codeToNameMap = new Map<string, string>();

for (const asset of krakenAssets) {
  nameToCodeMap.set(asset.name.toLowerCase(), asset.code);
  // Only set code->name if not already set (to prefer primary names)
  if (!codeToNameMap.has(asset.code)) {
    codeToNameMap.set(asset.code, asset.name);
  }
}

// Get symbol from name (case-insensitive)
export function getSymbolFromName(name: string): string | null {
  return nameToCodeMap.get(name.toLowerCase()) || null;
}

// Get name from symbol
export function getNameFromSymbol(symbol: string): string | null {
  return codeToNameMap.get(symbol.toUpperCase()) || null;
}

// Search assets by name or symbol
export function searchKrakenAssetsByName(query: string): KrakenAsset[] {
  const queryLower = query.toLowerCase();
  const queryUpper = query.toUpperCase();

  const results: KrakenAsset[] = [];
  const seenCodes = new Set<string>();

  for (const asset of krakenAssets) {
    if (seenCodes.has(asset.code)) {
      continue;
    }

    // Match by name or code
    if (
      asset.name.toLowerCase().includes(queryLower) ||
      asset.code.includes(queryUpper)
    ) {
      seenCodes.add(asset.code);
      results.push(asset);
    }
  }

  // Sort: exact code match first, then exact name start, then alphabetically
  results.sort((a, b) => {
    // Exact code match
    if (a.code === queryUpper) return -1;
    if (b.code === queryUpper) return 1;

    // Code starts with query
    const aCodeStarts = a.code.startsWith(queryUpper);
    const bCodeStarts = b.code.startsWith(queryUpper);
    if (aCodeStarts && !bCodeStarts) return -1;
    if (bCodeStarts && !aCodeStarts) return 1;

    // Name starts with query
    const aNameStarts = a.name.toLowerCase().startsWith(queryLower);
    const bNameStarts = b.name.toLowerCase().startsWith(queryLower);
    if (aNameStarts && !bNameStarts) return -1;
    if (bNameStarts && !aNameStarts) return 1;

    // Alphabetically by name
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, 15);
}

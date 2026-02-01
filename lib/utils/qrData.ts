/**
 * Utilities for encoding/decoding data for animated QR code transfer.
 *
 * Data is split into chunks, each chunk contains:
 * - Header: "PP|{chunkIndex}|{totalChunks}|"
 * - Data: base64 encoded JSON fragment
 */

const CHUNK_PREFIX = 'PP'; // Private Portfolio prefix
const MAX_QR_BYTES = 1000; // Conservative limit for QR code data
const HEADER_OVERHEAD = 20; // Approximate header size "PP|999|999|"

export interface QRChunk {
  index: number;
  total: number;
  data: string;
}

/**
 * Encode data into QR-friendly chunks
 */
export function encodeForQR(jsonData: string): string[] {
  // Base64 encode the entire JSON
  const base64Data = btoa(unescape(encodeURIComponent(jsonData)));

  // Calculate chunk size (leaving room for header)
  const chunkDataSize = MAX_QR_BYTES - HEADER_OVERHEAD;

  // Split into chunks
  const chunks: string[] = [];
  const totalChunks = Math.ceil(base64Data.length / chunkDataSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkDataSize;
    const end = Math.min(start + chunkDataSize, base64Data.length);
    const chunkData = base64Data.slice(start, end);

    // Format: PP|chunkIndex|totalChunks|data
    const chunk = `${CHUNK_PREFIX}|${i}|${totalChunks}|${chunkData}`;
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Parse a single QR chunk
 */
export function parseQRChunk(rawData: string): QRChunk | null {
  if (!rawData.startsWith(CHUNK_PREFIX + '|')) {
    return null;
  }

  const parts = rawData.split('|');
  if (parts.length !== 4) {
    return null;
  }

  const index = parseInt(parts[1], 10);
  const total = parseInt(parts[2], 10);
  const data = parts[3];

  if (isNaN(index) || isNaN(total) || index < 0 || index >= total) {
    return null;
  }

  return { index, total, data };
}

/**
 * Reassemble chunks into original JSON
 */
export function reassembleChunks(chunks: Map<number, string>, totalChunks: number): string | null {
  if (chunks.size !== totalChunks) {
    return null;
  }

  // Verify all chunks are present
  for (let i = 0; i < totalChunks; i++) {
    if (!chunks.has(i)) {
      return null;
    }
  }

  // Concatenate in order
  let base64Data = '';
  for (let i = 0; i < totalChunks; i++) {
    base64Data += chunks.get(i);
  }

  // Decode base64 to JSON
  try {
    return decodeURIComponent(escape(atob(base64Data)));
  } catch {
    return null;
  }
}

/**
 * Get which chunk indices are missing
 */
export function getMissingChunks(chunks: Map<number, string>, totalChunks: number): number[] {
  const missing: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!chunks.has(i)) {
      missing.push(i);
    }
  }
  return missing;
}

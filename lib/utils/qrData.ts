/**
 * Utilities for encoding/decoding data for animated QR code transfer.
 *
 * Data is compressed with zlib, then split into chunks.
 * Each chunk contains:
 * - Header: "PP|{chunkIndex}|{totalChunks}|"
 * - Data: base64 encoded compressed fragment
 */

import pako from 'pako';

const CHUNK_PREFIX = 'PP';
const MAX_QR_BYTES = 1000; // Conservative limit for QR code data
const HEADER_OVERHEAD = 20; // Approximate header size "PP|999|999|"

export interface QRChunk {
  index: number;
  total: number;
  data: string;
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode data into QR-friendly compressed chunks
 */
export function encodeForQR(jsonData: string): string[] {
  // Compress the JSON data
  const compressed = pako.deflate(jsonData);

  // Convert to base64
  const base64Data = uint8ArrayToBase64(compressed);

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

  // Decompress
  try {
    const compressed = base64ToUint8Array(base64Data);
    return pako.inflate(compressed, { to: 'string' });
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

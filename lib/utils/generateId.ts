/**
 * Generate a short, time-based ID.
 * Format: 6 chars (time) + 4 chars (random) = 10 chars total.
 */
export function generateId(): string {
  const time = Date.now().toString(36).slice(-6);
  // Use Math.random() for cross-platform compatibility (React Native doesn't have crypto.getRandomValues)
  const random = Math.floor(Math.random() * 0xFFFF)
    .toString(36)
    .padStart(4, '0')
    .slice(0, 4);
  return time + random;
}

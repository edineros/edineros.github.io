/**
 * Generate a short, time-based ID.
 * Format: 6 chars (time) + 4 chars (random) = 10 chars total.
 */
export function generateId(): string {
  const time = Date.now().toString(36).slice(-6);
  const random = crypto.getRandomValues(new Uint16Array(1))[0]
    .toString(36)
    .padStart(4, '0')
    .slice(0, 4);
  return time + random;
}

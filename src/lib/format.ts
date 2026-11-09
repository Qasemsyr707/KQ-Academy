/**
 * Deterministic number formatting for UI that renders on both server and client.
 * A bare `toLocaleString()` follows each machine's default locale, so the server
 * and a visitor's browser can disagree (e.g. "2" vs "٢") and break hydration.
 */
const numberFormat = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

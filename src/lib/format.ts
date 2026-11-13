/**
 * Deterministic number formatting for UI that renders on both server and client.
 * A bare `toLocaleString()` follows each machine's default locale, so the server
 * and a visitor's browser can disagree (e.g. "2" vs "٢") and break hydration.
 */
const numberFormat = new Intl.NumberFormat('en-US');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/**
 * Deterministic date for UI rendered on both server and client: fixed locale,
 * Gregorian calendar, Latin digits and UTC. `toLocaleDateString('ar-SA')`
 * depends on each machine's time zone and calendar data and broke hydration.
 */
const dateFormat = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
});

export function formatDate(value: string | number | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

const dateTimeFormat = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** Deterministic date and time (UTC), safe for server-rendered client components. */
export function formatDateTime(value: string | number | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${dateTimeFormat.format(date)} UTC`;
}

/** Price exactly as stored: the USD price, the SYP price, both, or nothing when unset. */
export function coursePriceLabel(course: { price?: number | null; priceSYP?: number | null }): string | null {
  const usd = course.price && course.price > 0 ? `$${formatNumber(course.price)}` : null;
  const syp = course.priceSYP && course.priceSYP > 0 ? `${formatNumber(course.priceSYP)} ل.س` : null;
  return usd && syp ? `${usd} · ${syp}` : usd ?? syp;
}

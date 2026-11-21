/** Pure session-time rules, shared by the token endpoint and the session lifecycle (no imports). */
export const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000;

/** An upcoming session that was never started is expired SESSION_EXPIRY_MS after its start time. */
export function isExpired(session: { status: string; scheduledAt?: Date | string | null }, now = Date.now()) {
  if (session.status !== 'upcoming' || !session.scheduledAt) return false;
  const at = new Date(session.scheduledAt).getTime();
  return Number.isFinite(at) && at + SESSION_EXPIRY_MS < now;
}

/** Status shown to people: an unstarted session past its window reads as expired, not upcoming. */
export const displayStatus = (session: { status: string; scheduledAt?: Date | string | null }, now = Date.now()) =>
  isExpired(session, now) ? 'expired' : session.status;

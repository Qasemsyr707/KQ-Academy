/** Old direct media sources stay supported without allowing unsafe schemes,
 * protocol-relative URLs, credentials or HTML to reach a media element. */
export function safeMediaUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input || /[\u0000-\u0020\\]/.test(input)) return null;
  if (/^\/(?:uploads\/[A-Za-z0-9._-]+|api\/files\/[A-Za-z0-9_.-]+|api\/attachments\/[A-Za-z0-9_-]+\/file)(?:\?[^#]*)?$/.test(input)) return input;
  try {
    const url = new URL(input);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

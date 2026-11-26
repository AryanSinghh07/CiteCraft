/**
 * Returns the URL only if it is http(s), otherwise undefined.
 * Use for any user-supplied link rendered in an href (blocks javascript: and data: URLs).
 */
export function safeUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

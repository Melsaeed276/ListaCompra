/** Normalizes a product link and accepts only browser-safe HTTP(S) URLs. */
export function normalizeProductUrl(value: string): string | null {
  const clean = value.trim();
  if (!clean) return '';
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizePrcLicense(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase().replace(/[\s-]+/g, '') ?? '';
  return normalized || null;
}

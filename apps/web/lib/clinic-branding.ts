// Uploaded branding images are served by our own public proxy (cache-busted by
// the upload timestamp) so a fresh upload replaces the old one without a stale
// cache; a Super-Admin-pasted external logoUrl/coverUrl (the pre-upload path)
// is kept as the fallback for clinics that never used the uploader.
export function brandingImageUrl(
  clinicId: string,
  kind: 'logo' | 'cover',
  updatedAt: string | null | undefined,
  fallbackUrl: string | null | undefined,
): string | null {
  if (updatedAt) return `/api/public/clinics/${clinicId}/branding/${kind}?v=${encodeURIComponent(updatedAt)}`;
  return fallbackUrl ?? null;
}

export const THEME_GRADIENTS: Record<string, string> = {
  'violet-clean': 'from-violet-950 via-violet-800 to-violet-600',
  'lavender-soft': 'from-indigo-900 via-purple-700 to-pink-400',
  'midnight-violet': 'from-slate-950 via-indigo-950 to-violet-900',
};

export function themeGradientClass(themePreset: string | undefined): string {
  return THEME_GRADIENTS[themePreset ?? ''] ?? THEME_GRADIENTS['violet-clean'];
}

const DEFAULT_API_URL = 'http://localhost:3001';

export function getBackendUrl(path: string): URL {
  const baseUrl =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_API_URL;

  return new URL(path, baseUrl);
}

// phishingChecker.ts
// Core logic that uses the API wrappers to evaluate a URL.

import { checkGoogleSafeBrowsing, checkVirusTotal } from './phishingApi';

// Simple in‑memory cache: URL -> { result: boolean; expires: number }
const cache = new Map<string, { result: boolean; expires: number }>();

/**
 * Checks a URL against external phishing services.
 * Returns true if the URL is considered dangerous.
 */
export async function checkUrl(url: string): Promise<boolean> {
  // Only evaluate http/https URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expires > now) {
    return cached.result;
  }

  // Run both checks in parallel
  const results = await Promise.allSettled([
    checkGoogleSafeBrowsing(url),
    checkVirusTotal(url),
  ]);

  // Any fulfilled true means dangerous
  const isDangerous = results.some(r => r.status === 'fulfilled' && r.value === true);

  // Cache for 10 minutes
  cache.set(url, { result: isDangerous, expires: now + 10 * 60 * 1000 });

  return isDangerous;
}

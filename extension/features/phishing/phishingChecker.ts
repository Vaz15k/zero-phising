// phishingChecker.ts
import { checkGoogleSafeBrowsing, checkVirusTotal } from './phishingApi';

const cache = new Map<string, { result: any; expires: number }>();

export async function checkUrl(url: string): Promise<any> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { safe: true, skipped: true };
  }

  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expires > now) {
    return cached.result;
  }

  const [googleResult, vtResult] = await Promise.allSettled([
    checkGoogleSafeBrowsing(url),
    checkVirusTotal(url),
  ]);

  const google = googleResult.status === 'fulfilled' ? googleResult.value : { safe: true, error: "Failed to load Google SB" };
  const virustotal = vtResult.status === 'fulfilled' ? vtResult.value : { safe: true, error: "Failed to load VirusTotal" };

  const bothFailed = !!google.error && !!virustotal.error;
  if (bothFailed) {
    const result = { safe: true, skipped: true, reason: 'api_error', google, virustotal, checkedAt: Date.now() };
    cache.set(url, { result, expires: now + 10 * 60 * 1000 });
    return result;
  }

  const isSafe = google.safe && virustotal.safe;

  const result = { safe: isSafe, google, virustotal, checkedAt: Date.now() };

  // Cache for 10 minutes
  cache.set(url, { result, expires: now + 10 * 60 * 1000 });

  return result;
}

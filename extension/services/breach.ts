export interface Breach {
  Name: string;
  BreachDate: string;
}

const LEAKCHECK_URL = 'https://leakcheck.io/api/public?check=';

export async function checkBreaches(email: string): Promise<Breach[]> {
  const cached = await checkCache(email);
  if (cached !== null) return cached;

  const response = await fetch(`${LEAKCHECK_URL}${encodeURIComponent(email)}`, {
    headers: { 'user-agent': 'Zero-Phishing-Extension' },
  });

  if (!response.ok) {
    throw new Error('Serviço de verificação temporariamente indisponível.');
  }

  const data = await response.json() as { success: boolean; sources?: { name: string; date: string }[] };

  if (!data.success) {
    return [];
  }

  const breaches = (data.sources || []).map((s) => ({
    Name: s.name || 'Desconhecido',
    BreachDate: s.date || '',
  }));

  await cacheResult(email, breaches);
  return breaches;
}

async function checkCache(email: string): Promise<Breach[] | null> {
  const key = `breaches_${email.toLowerCase()}`;
  const stored = await browser.storage.local.get(key);
  if (stored[key]) {
    const cached = stored[key] as { data: Breach[]; timestamp: number };
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp < oneDay) {
      return cached.data;
    }
  }
  return null;
}

async function cacheResult(email: string, breaches: Breach[]): Promise<void> {
  const key = `breaches_${email.toLowerCase()}`;
  await browser.storage.local.set({
    [key]: { data: breaches, timestamp: Date.now() }
  });
}

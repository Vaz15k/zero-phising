// phishingChecker.ts
import { checkGoogleSafeBrowsing, checkVirusTotal } from './phishingApi';
import { getUrlRules } from '../../services/api';

const cache = new Map<string, { result: any; expires: number }>();

function matchDomain(urlPattern: string, domain: string): boolean {
  let p = urlPattern.toLowerCase().trim();
  const d = domain.toLowerCase().trim();

  p = p.replace(/^https?:\/\//, '').split('/')[0];

  if (p.startsWith('*.')) {
    const baseDomain = p.substring(2);
    return d === baseDomain || d.endsWith('.' + baseDomain);
  }

  if (p.includes('*')) {
    const regexStr = '^' + p
      .replace(/[.+?^${}()|[\]\\*]/g, '\\$&')
      .replace(/\\\*/g, '.*') + '$';
    try {
      return new RegExp(regexStr).test(d);
    } catch (e) {
      return false;
    }
  }

  return d === p || d.endsWith('.' + p);
}

export async function checkUrl(url: string): Promise<any> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { safe: true, skipped: true };
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const rules = await getUrlRules();
    
    if (rules && rules.length > 0) {
      // FILTRAR E LOGAR REGRAS PARA DEBUG
      const whitelistRules = rules.filter(r => r.rule_type === 'whitelist');
      const blacklistRules = rules.filter(r => r.rule_type === 'blacklist');

      // 1. CHECAR WHITELIST PRIMEIRO (SOBREPÕE TUDO)
      const matchedWhitelist = whitelistRules.find(r => matchDomain(r.url_pattern, domain));
      if (matchedWhitelist) {
        console.log(`[Zero Phishing] WHITELIST GANHOU: ${domain} (Regra: ${matchedWhitelist.url_pattern})`);
        return { safe: true, skipped: true, reason: 'whitelist', checkedAt: Date.now() };
      }

      // 2. CHECAR BLACKLIST DEPOIS
      const matchedBlacklist = blacklistRules.find(r => matchDomain(r.url_pattern, domain));
      if (matchedBlacklist) {
        console.log(`[Zero Phishing] BLACKLIST ATIVA: ${domain} (Regra: ${matchedBlacklist.url_pattern})`);
        return { safe: false, reason: 'blacklist', checkedAt: Date.now() };
      }
    }
  } catch (error) {
    console.error("[Zero Phishing] Erro nas regras:", error);
  }

  // 3. SE NÃO HOUVER REGRAS PERSONALIZADAS, USA AS APIs
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expires > now) return cached.result;

  const [googleResult, vtResult] = await Promise.allSettled([
    checkGoogleSafeBrowsing(url),
    checkVirusTotal(url),
  ]);

  const google = googleResult.status === 'fulfilled' ? googleResult.value : { safe: true };
  const virustotal = vtResult.status === 'fulfilled' ? vtResult.value : { safe: true };

  const isSafe = google.safe && virustotal.safe;
  const result = { safe: isSafe, google, virustotal, checkedAt: Date.now() };

  cache.set(url, { result, expires: now + 10 * 60 * 1000 });
  return result;
}

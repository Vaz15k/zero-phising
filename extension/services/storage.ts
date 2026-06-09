export interface UrlRule {
  id: string | number;
  url_pattern: string;
  rule_type: 'whitelist' | 'blacklist';
  source?: 'personal' | 'family' | 'local';
}

const STORAGE_KEY = 'local_url_rules';

export async function getLocalRules(): Promise<UrlRule[]> {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return (data[STORAGE_KEY] as UrlRule[] | undefined) || [];
}

export async function addLocalRule(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<UrlRule> {
  const rules = await getLocalRules();
  const newRule: UrlRule = {
    id: `local_${Date.now()}`,
    url_pattern,
    rule_type,
    source: 'local'
  };
  await browser.storage.local.set({ [STORAGE_KEY]: [...rules, newRule] });
  return newRule;
}

export async function deleteLocalRule(id: string | number): Promise<void> {
  const rules = await getLocalRules();
  const filtered = rules.filter(r => r.id !== id);
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
}

export async function deleteLocalRuleByPattern(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<void> {
  const rules = await getLocalRules();
  const filtered = rules.filter(r => !(r.url_pattern === url_pattern && r.rule_type === rule_type));
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
}

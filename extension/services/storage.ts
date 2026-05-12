export interface UrlRule {
  id: string | number;
  url_pattern: string;
  rule_type: 'whitelist' | 'blacklist';
}

const STORAGE_KEY = 'local_url_rules';

export async function getLocalRules(): Promise<UrlRule[]> {
  const data = await browser.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

export async function addLocalRule(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<UrlRule> {
  const rules = await getLocalRules();
  const newRule: UrlRule = {
    id: `local_${Date.now()}`,
    url_pattern,
    rule_type
  };
  await browser.storage.local.set({ [STORAGE_KEY]: [...rules, newRule] });
  return newRule;
}

export async function deleteLocalRule(id: string | number): Promise<void> {
  const rules = await getLocalRules();
  const filtered = rules.filter(r => r.id !== id);
  await browser.storage.local.set({ [STORAGE_KEY]: filtered });
}

import { getLocalRules, addLocalRule, deleteLocalRule as deleteFromStorage, deleteLocalRuleByPattern } from './storage';

const API_BASE = import.meta.env.WXT_API_URL || 'http://127.0.0.1:8000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export interface UrlRule {
  id: string | number;
  url_pattern: string;
  rule_type: 'whitelist' | 'blacklist';
  created_at?: string;
  source?: 'personal' | 'family' | 'local';
}

export interface FamilyMember {
  id: number;
  user: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'member';
  created_at: string;
  is_active: boolean;
}

export interface Family {
  id: number;
  name: string;
  owner: number;
  created_at: string;
  current_user_role: 'admin' | 'member' | null;
  members: FamilyMember[];
  rules: UrlRule[];
}

export interface FamilyInvitation {
  id: number;
  family: number;
  family_name: string;
  invited_user: number;
  invited_user_username: string;
  invited_user_first_name: string;
  invited_user_last_name: string;
  invited_by: number;
  invited_by_username: string;
  invited_by_first_name: string;
  invited_by_last_name: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  responded_at: string | null;
}

export interface FamilyNotification {
  id: number;
  family: number | null;
  family_name: string | null;
  invitation: number | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

async function getTokens(): Promise<{ access: string; refresh: string } | null> {
  const data = await browser.storage.local.get(['access_token', 'refresh_token']);
  if (data.access_token && data.refresh_token) {
    return { access: data.access_token as string, refresh: data.refresh_token as string };
  }
  return null;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await browser.storage.local.set({ access_token: access, refresh_token: refresh });
}

export async function clearTokens(): Promise<void> {
  await browser.storage.local.remove(['access_token', 'refresh_token', 'current_user']);
}

export async function request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const tokens = await getTokens();
  if (auth && tokens) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  const config: RequestInit = { method, headers };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE}/api${endpoint}`;
  let response: Response;

  try {
    response = await fetch(url, config);
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  if (response.status === 401 && auth && tokens) {
    const refreshed = await refreshAccessToken(tokens.refresh);
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed}`;
      config.headers = headers;
      response = await fetch(url, config);
    } else {
      await clearTokens();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errorData, response.status, endpoint));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function extractErrorMessage(errorData: unknown, statusCode: number, endpoint = ''): string {
  const isFamilyEndpoint = endpoint.startsWith('/accounts/family/');

  if (!errorData || typeof errorData !== 'object') {
    if (isFamilyEndpoint && statusCode === 404) {
      return 'Não foi possível acessar a funcionalidade de família no servidor. Atualize o backend e tente novamente.';
    }
    return `Erro ${statusCode}`;
  }

  const data = errorData as Record<string, unknown>;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.detail === 'string') {
    if (isFamilyEndpoint && statusCode === 404 && data.detail.toLowerCase() === 'not found.') {
      return 'Não foi possível acessar a funcionalidade de família no servidor. Atualize o backend e tente novamente.';
    }
    return data.detail;
  }

  const messages = Object.entries(data).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      return value.map(item => `${field}: ${String(item)}`);
    }
    if (typeof value === 'string') {
      return [`${field}: ${value}`];
    }
    return [];
  });

  if (isFamilyEndpoint && statusCode === 404) {
    return 'Não foi possível acessar a funcionalidade de família no servidor. Atualize o backend e tente novamente.';
  }

  return messages[0] || `Erro ${statusCode}`;
}

async function refreshAccessToken(refresh: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/accounts/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { access: string };
    await setTokens(data.access, refresh);
    return data.access;
  } catch {
    return null;
  }
}

// Custom URL Rules
export async function getUrlRules(): Promise<UrlRule[]> {
  const tokens = await getTokens();
  const localRules = (await getLocalRules()).map(rule => ({ ...rule, source: rule.source || 'local' as const }));
  
  if (!tokens) {
    return localRules;
  }

  try {
    const serverRules = await request<UrlRule[]>('/accounts/url-rules/');
    
    // Deduplicar: preferir as regras do servidor (que têm IDs reais para deleção no backend)
    // Mas manter as locais que ainda não foram sincronizadas
    const serverPatterns = new Set(
      serverRules
        .filter(r => (r.source || 'personal') === 'personal')
        .map(r => `${r.url_pattern}|${r.rule_type}`)
    );
    const uniqueLocal = localRules.filter(r => !serverPatterns.has(`${r.url_pattern}|${r.rule_type}`));
    
    return [...uniqueLocal, ...serverRules];
  } catch (error) {
    console.error('Error fetching URL rules from server:', error);
    return localRules;
  }
}

export async function addUrlRule(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<UrlRule> {
  // Sempre adiciona localmente primeiro para garantir feedback imediato e funcionamento offline
  const localRule = await addLocalRule(url_pattern, rule_type);

  const tokens = await getTokens();
  if (tokens) {
    try {
      // Tenta sincronizar com o servidor em background
      await request('/accounts/url-rules/', {
        method: 'POST',
        body: { url_pattern, rule_type }
      });
    } catch (error) {
      console.error('Erro ao sincronizar regra com o servidor:', error);
      // Não lançamos erro aqui para que a regra local continue funcionando
    }
  }

  return localRule;
}

// Active Block Domains Cache
let blockDomainsCache: Set<string> | null = null;
let blockDomainsCacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export async function getActiveBlockDomains(): Promise<Set<string>> {
  const now = Date.now();
  if (blockDomainsCache && (now - blockDomainsCacheTime) < CACHE_TTL) {
    return blockDomainsCache;
  }

  const tokens = await getTokens();
  if (!tokens) {
    return new Set();
  }

  try {
    const response = await request<{ domains: string[] }>('/accounts/active-block-domains/');
    blockDomainsCache = new Set(response.domains.map(d => d.toLowerCase()));
    blockDomainsCacheTime = now;
    return blockDomainsCache;
  } catch (error) {
    console.error('Error fetching block domains:', error);
    return blockDomainsCache || new Set();
  }
}

export function clearBlockDomainsCache(): void {
  blockDomainsCache = null;
  blockDomainsCacheTime = 0;
}

export interface BlockList {
  id: number;
  name: string;
  category: string;
  description: string;
  source_url: string;
  domain_count: number;
  is_activated: boolean;
  created_at: string;
  updated_at: string;
}

export async function getBlockLists(): Promise<BlockList[]> {
  const tokens = await getTokens();
  if (!tokens) return [];
  try {
    return await request<BlockList[]>('/accounts/block-lists/');
  } catch (error) {
    console.error('Error fetching block lists:', error);
    return [];
  }
}

export async function activateBlockList(blockListId: number): Promise<unknown> {
  const result = await request(`/accounts/block-lists/${blockListId}/activate/`, { method: 'POST' });
  clearBlockDomainsCache();
  return result;
}

export async function deactivateBlockList(blockListId: number): Promise<unknown> {
  const result = await request(`/accounts/block-lists/${blockListId}/deactivate/`, { method: 'POST' });
  clearBlockDomainsCache();
  return result;
}

export async function deleteUrlRule(rule: UrlRule): Promise<void> {
  if (rule.source === 'family') return;

  const id = rule.id;
  
  // 1. Sempre tenta remover localmente
  if (typeof id === 'string' && id.startsWith('local_')) {
    await deleteFromStorage(id);
  } else if (rule.url_pattern && rule.rule_type) {
    // Se for uma regra do servidor, também tentamos remover uma possível cópia local
    await deleteLocalRuleByPattern(rule.url_pattern, rule.rule_type);
  }

  // 2. Se for uma regra do servidor, remove do backend
  if (typeof id === 'number') {
    const url = `${API_BASE}/api/accounts/url-rules/${id}/`;
    const tokens = await getTokens();
    if (!tokens) return;
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access}`
        }
      });

      if (!response.ok) {
        console.error('Falha ao excluir regra no servidor');
      }
    } catch (error) {
      console.error('Erro de conexão ao excluir regra no servidor:', error);
    }
  }
}

export async function getFamily(): Promise<Family | null> {
  const data = await request<{ family: Family | null }>('/accounts/family/');
  return data.family;
}

export async function createFamily(name: string): Promise<Family> {
  const data = await request<{ family: Family }>('/accounts/family/', {
    method: 'POST',
    body: { name },
  });
  return data.family;
}

export async function getFamilyInvitations(): Promise<{ sent: FamilyInvitation[]; received: FamilyInvitation[] }> {
  return request('/accounts/family/invitations/');
}

export async function inviteFamilyMember(identifier: string): Promise<FamilyInvitation> {
  return request('/accounts/family/invitations/', {
    method: 'POST',
    body: { identifier },
  });
}

export async function respondFamilyInvitation(id: number, action: 'accept' | 'decline'): Promise<FamilyInvitation> {
  return request(`/accounts/family/invitations/${id}/${action}/`, {
    method: 'POST',
    body: {},
  });
}

export async function cancelFamilyInvitation(id: number): Promise<void> {
  await request(`/accounts/family/invitations/${id}/cancel/`, {
    method: 'DELETE',
  });
}

export async function updateFamilyMemberRole(memberId: number, role: 'admin' | 'member'): Promise<FamilyMember> {
  return request(`/accounts/family/members/${memberId}/`, {
    method: 'PATCH',
    body: { role },
  });
}

export async function removeFamilyMember(memberId: number): Promise<void> {
  await request(`/accounts/family/members/${memberId}/`, {
    method: 'DELETE',
  });
}

export async function getFamilyNotifications(): Promise<FamilyNotification[]> {
  return request('/accounts/family/notifications/');
}

export async function markFamilyNotificationRead(id: number): Promise<FamilyNotification> {
  return request(`/accounts/family/notifications/${id}/read/`, {
    method: 'POST',
    body: {},
  });
}

export async function addFamilyUrlRule(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<UrlRule> {
  return request('/accounts/family/rules/', {
    method: 'POST',
    body: { url_pattern, rule_type },
  });
}

export async function deleteFamilyUrlRule(id: number): Promise<void> {
  await request(`/accounts/family/rules/${id}/`, {
    method: 'DELETE',
  });
}

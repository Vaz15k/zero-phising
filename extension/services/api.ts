import { getLocalRules, addLocalRule, deleteLocalRule as deleteFromStorage } from './storage';

const API_BASE = import.meta.env.WXT_API_URL || 'http://127.0.0.1:8000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
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
    throw new Error((errorData as { error?: string }).error || `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function refreshAccessToken(refresh: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
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
export async function getUrlRules(): Promise<any[]> {
  const tokens = await getTokens();
  const localRules = await getLocalRules();
  
  if (!tokens) {
    return localRules;
  }

  try {
    const serverRules = await request<any[]>('/accounts/url-rules/');
    return [...localRules, ...serverRules];
  } catch (error) {
    console.error('Error fetching URL rules from server:', error);
    return localRules;
  }
}

export async function addUrlRule(url_pattern: string, rule_type: 'whitelist' | 'blacklist'): Promise<any> {
  const tokens = await getTokens();
  if (!tokens) {
    return await addLocalRule(url_pattern, rule_type);
  }

  return await request('/accounts/url-rules/', {
    method: 'POST',
    body: { url_pattern, rule_type }
  });
}

export async function deleteUrlRule(id: string | number): Promise<void> {
  if (typeof id === 'string' && id.startsWith('local_')) {
    return await deleteFromStorage(id);
  }

  const url = `${API_BASE}/api/accounts/url-rules/${id}/`;
  const tokens = await getTokens();
  if (!tokens) throw new Error('Não autorizado');
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${tokens.access}`
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao excluir regra no servidor');
  }
}

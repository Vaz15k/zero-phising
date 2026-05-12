import { request, setTokens, clearTokens } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  pin: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export async function getSavedUser(): Promise<AuthState> {
  const data = await browser.storage.local.get('current_user');
  if (data.current_user) {
    return { user: data.current_user as User, isAuthenticated: true };
  }
  return { user: null, isAuthenticated: false };
}

export async function login(username: string, password: string): Promise<AuthState> {
  const data = await request<{ user: User; access: string; refresh: string }>('/accounts/login/', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });

  await setTokens(data.access, data.refresh);
  await browser.storage.local.set({ current_user: data.user });
  return { user: data.user, isAuthenticated: true };
}

export async function pinLogin(username: string, pin: string): Promise<AuthState> {
  const data = await request<{ user: User; access: string; refresh: string }>('/accounts/pin-login/', {
    method: 'POST',
    body: { username, pin },
    auth: false,
  });

  await setTokens(data.access, data.refresh);
  await browser.storage.local.set({ current_user: data.user });
  return { user: data.user, isAuthenticated: true };
}

export async function register(
  username: string,
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<AuthState> {
  const data = await request<{ user: User; access: string; refresh: string }>('/accounts/register/', {
    method: 'POST',
    body: { username, email, password, first_name: firstName || '', last_name: lastName || '' },
    auth: false,
  });

  await setTokens(data.access, data.refresh);
  await browser.storage.local.set({ current_user: data.user });
  return { user: data.user, isAuthenticated: true };
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  await request<Partial<User>>('/accounts/profile/', {
    method: 'PATCH',
    body: data,
  });

  const user = await request<User>('/accounts/profile/', { method: 'GET' });
  await browser.storage.local.set({ current_user: user });
  return user;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

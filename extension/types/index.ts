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

// No arquivo: zero-phishing/extension/types/index.ts
export type PopupPage = 'main' | 'login' | 'register' | 'profile' | 'parental-control' | 'breaches';

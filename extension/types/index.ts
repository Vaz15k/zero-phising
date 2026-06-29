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

export type PopupPage = 'main' | 'breaches';

export interface BlockedAccess {
  id: number;
  url: string;
  timestamp: string;
  user: number | null;
  username: string | null;
  group: number | null;
  group_name: string | null;
  block_source: 'USER' | 'GROUP';
}

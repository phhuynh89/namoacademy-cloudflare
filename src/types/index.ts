export interface Env {
  DB: D1Database;
}

export interface BoomlifyApiKey {
  id: number;
  api_key: string;
  name: string | null;
  credits: number;
  last_reset: string;
  created_at: string;
  updated_at: string;
}

export interface BoomlifyTempMailResponse {
  email: string;
  id: string;
  expires_at?: string;
}

export interface AccountData {
  email: string;
  password: string;
  createdAt: string;
  status: 'created' | 'failed';
  error?: string;
  loginAt?: string;
  credits?: number;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}


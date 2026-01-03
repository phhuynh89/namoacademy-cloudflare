export interface Env {
  DB: D1Database;
  COOKIE_BUCKET: R2Bucket;
  ACCOUNTS_WITHOUT_COOKIE_LIMIT?: string; // Limit for accounts without cookie query (default: 5)
  R2_PUBLIC_URL_BASE?: string; // Base URL for R2 public access (e.g., "https://your-domain.com" or "https://<account-id>.r2.cloudflarestorage.com")
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
  success: boolean;
  email: {
    id: string;
    address: string;
    domain: string;
    time_tier: string;
    expires_at: string;
    created_at: string;
    is_custom_domain: boolean;
    time_remaining: {
      total_ms: number;
      minutes: number;
      seconds: number;
      human_readable: string;
    };
  };
  meta: {
    user_id: string;
    tier: string;
    request_time: string;
  };
}

export interface BoomlifyMessagesResponse {
  success: boolean;
  messages: Array<{
    id?: string;
    subject?: string;
    text?: string;
    html?: string;
    from?: string;
    to?: string;
    created_at?: string;
    [key: string]: any;
  }>;
  email: {
    id: string;
    address: string;
    message_count: number;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
  meta: {
    user_id: string;
    tier: string;
    request_time: string;
  };
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

export interface CapCutAccountData {
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


import type { Env, CapCutAccountData } from "../types";

interface CookieJson {
  url?: string;
  cookies?: Array<{
    name?: string;
    value?: string;
    domain?: string;
    expires?: number;
    [key: string]: any;
  }>;
  expire_date?: string; // ISO string format
}

/**
 * Service for managing CapCut accounts
 */
export class CapCutAccountService {
  constructor(private env: Env) {}

  /**
   * Save CapCut account to database
   */
  async saveAccount(accountData: CapCutAccountData): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO capcut_accounts (email, password, created_at, status, error, login_at, credits)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        accountData.email,
        accountData.password,
        accountData.createdAt,
        accountData.status,
        accountData.error || null,
        accountData.loginAt || null,
        accountData.credits ?? 10
      )
      .run();
  }

  /**
   * Get all CapCut accounts
   */
  async getAllAccounts(): Promise<any[]> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, login_at, credits, last_used_at, expire_date, cookie_file_url FROM capcut_accounts ORDER BY id DESC"
    ).all();
    return result.results || [];
  }

  /**
   * Get CapCut account by ID
   */
  async getAccountById(id: string): Promise<any | null> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, error, login_at, credits, last_used_at, expire_date, cookie_file_url, updated_at FROM capcut_accounts WHERE id = ?"
    )
      .bind(id)
      .first();
    return result || null;
  }

  /**
   * Get any single CapCut account (limit 1)
   * Returns only accounts that have cookie_file_url and are not expired
   * Prevents duplicate selection by excluding accounts used in the last 5 minutes
   * and immediately marking the selected account as used
   */
  async getAnyAccount(): Promise<any | null> {
    const now = new Date().toISOString();
    // Exclude accounts used in the last 5 minutes to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Select an account that has cookie_file_url, is not expired, hasn't been used recently, and has status 'created'
    // Order by last_used_at (oldest first) to distribute load evenly
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, last_used_at, expire_date, cookie_file_url
       FROM capcut_accounts 
       WHERE status = 'created'
         AND cookie_file_url IS NOT NULL
         AND expire_date IS NOT NULL
         AND expire_date > ?
         AND (last_used_at IS NULL OR last_used_at < ?)
         AND credits > 0
       ORDER BY COALESCE(last_used_at, '1970-01-01') ASC, id DESC
       LIMIT 1`
    )
      .bind(now, fiveMinutesAgo)
      .first();
    
    if (!result) {
      return null;
    }
    
    // Immediately mark the account as used to prevent other concurrent requests from selecting it
    // Use WHERE clause with id to ensure we only update if it's still the same account
    await this.env.DB.prepare(
      "UPDATE capcut_accounts SET last_used_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(now, result.id)
      .run();
    
    return result;
  }

  /**
   * Get any single account with valid (non-expired) cookie (limit 1)
   * Prevents duplicate selection by excluding accounts used in the last 5 minutes
   * and immediately marking the selected account as used
   */
  async getAccountWithCookie(): Promise<any | null> {
    const now = new Date().toISOString();
    // Exclude accounts used in the last 5 minutes to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Select an account that has a valid cookie_file_url and hasn't been used recently
    // Order by last_used_at (oldest first) to distribute load evenly
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, expire_date, cookie_file_url, last_used_at
       FROM capcut_accounts 
       WHERE cookie_file_url IS NOT NULL 
         AND expire_date IS NOT NULL 
         AND expire_date > ?
         AND status = 'created'
         AND credits > 0
         AND (last_used_at IS NULL OR last_used_at < ?)
       ORDER BY COALESCE(last_used_at, '1970-01-01') ASC, id DESC
       LIMIT 1`
    )
      .bind(now, fiveMinutesAgo)
      .first();
    
    if (!result) {
      return null;
    }
    
    // Immediately mark the account as used to prevent other concurrent requests from selecting it
    await this.env.DB.prepare(
      "UPDATE capcut_accounts SET last_used_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(now, result.id)
      .run();
    
    return result;
  }

  /**
   * Get accounts without cookie or with expired cookie
   * Limit is configurable via ACCOUNTS_WITHOUT_COOKIE_LIMIT env variable (default: 5)
   */
  async getAccountsWithoutCookie(): Promise<any[]> {
    const now = new Date().toISOString();
    const limit = 10;
    
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, expire_date, cookie_file_url, last_used_at
       FROM capcut_accounts 
       WHERE (cookie_file_url IS NULL OR expire_date IS NULL OR expire_date < ?)
         AND status = 'created'
         AND credits > 0
       ORDER BY id DESC 
       LIMIT ?`
    )
      .bind(now, limit)
      .all();
    return result.results || [];
  }

  /**
   * Save cookies to JSON file, upload to R2, use expire_date from request or extract from sid_guard cookie, then update database
   */
  async updateAccountCookieFromJson(id: string, cookieJson: CookieJson): Promise<{ success: boolean; expireDate?: string; cookieFileUrl?: string; error?: string }> {
    try {
      let expireDate: string | null = null;

      // Use expire_date from request body if provided
      if (cookieJson.expire_date) {
        expireDate = cookieJson.expire_date;
      } else {
        // Fall back to extracting from sid_guard cookie expiration date
        let sidGuardExpires: number | null = null;
        
        if (cookieJson.cookies && Array.isArray(cookieJson.cookies)) {
          for (const cookie of cookieJson.cookies) {
            // Find sid_guard cookie and get its expiration
            if (cookie.name === 'sid_guard' && cookie.expires) {
              sidGuardExpires = cookie.expires;
              break;
            }
          }
        }
        
        if (!sidGuardExpires) {
          return { success: false, error: 'expire_date not provided and sid_guard cookie with expires not found in the provided cookies' };
        }

        // Convert expiration date from Unix timestamp to ISO string
        expireDate = new Date(sidGuardExpires * 1000).toISOString();
      }

      // Convert cookie JSON to minified string
      const cookieJsonString = JSON.stringify(cookieJson);
      
      // Generate filename for the cookie file (without timestamp)
      const fileName = `capcut-cookies/${id}.json`;
      
      // Upload cookie JSON file to R2
      await this.env.COOKIE_BUCKET.put(fileName, cookieJsonString, {
        httpMetadata: {
          contentType: 'application/json',
        },
      });

      // Construct R2 public URL
      // If R2_PUBLIC_URL_BASE is configured, construct full URL; otherwise store the key
      const cookieFileUrl = this.env.R2_PUBLIC_URL_BASE 
        ? `${this.env.R2_PUBLIC_URL_BASE}/${fileName}`
        : fileName;
      
      // Update account with expiration date and cookie_file_url
      const result = await this.env.DB.prepare(
        "UPDATE capcut_accounts SET expire_date = ?, cookie_file_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
        .bind(expireDate, cookieFileUrl, id)
        .run();
      
      if (result.success && (result.meta.changes || 0) > 0) {
        return { 
          success: true, 
          expireDate,
          cookieFileUrl
        };
      }
      
      return { success: false, error: 'Account not found' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }


  /**
   * Reduce credits by 1, or delete account if credits is 1
   * Returns: { deleted: boolean, credits?: number }
   */
  async reduceCreditsOrDelete(id: string): Promise<{ deleted: boolean; credits?: number }> {
    // First, get the current account to check credits
    const account = await this.getAccountById(id);
    if (!account) {
      return { deleted: false };
    }

    const currentCredits = account.credits ?? 10;

    // If credits is 1, delete the account
    if (currentCredits === 1) {
      const result = await this.env.DB.prepare(
        "DELETE FROM capcut_accounts WHERE id = ?"
      )
        .bind(id)
        .run();
      
      if (result.success && (result.meta.changes || 0) > 0) {
        return { deleted: true };
      }
      return { deleted: false };
    }

    // Otherwise, reduce credits by 1
    const newCredits = currentCredits - 1;
    const result = await this.env.DB.prepare(
      "UPDATE capcut_accounts SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(newCredits, id)
      .run();

    if (result.success && (result.meta.changes || 0) > 0) {
      return { deleted: false, credits: newCredits };
    }

    return { deleted: false };
  }

  /**
   * Delete CapCut account by ID (direct delete, no credit reduction)
   */
  async deleteAccount(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      "DELETE FROM capcut_accounts WHERE id = ?"
    )
      .bind(id)
      .run();
    return result.success && (result.meta.changes || 0) > 0;
  }
}


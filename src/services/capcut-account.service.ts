import type { Env, CapCutAccountData } from "../types";

interface CookieJson {
  url?: string;
  cookies?: Array<{
    name?: string;
    value?: string;
    domain?: string;
    expirationDate?: number;
    [key: string]: any;
  }>;
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
   * Prevents duplicate selection by excluding accounts used in the last 5 minutes
   * and immediately marking the selected account as used
   */
  async getAnyAccount(): Promise<any | null> {
    const now = new Date().toISOString();
    // Exclude accounts used in the last 5 minutes to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Select an account that hasn't been used recently and has status 'created'
    // Order by last_used_at (oldest first) to distribute load evenly
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, last_used_at, expire_date, cookie_file_url
       FROM capcut_accounts 
       WHERE status = 'created'
         AND (last_used_at IS NULL OR last_used_at < ?)
         AND credits > 0
       ORDER BY COALESCE(last_used_at, '1970-01-01') ASC, id DESC
       LIMIT 1`
    )
      .bind(fiveMinutesAgo)
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
    
    // Select an account that has a valid cookie file and hasn't been used recently
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
    // Get limit from environment variable, default to 5 if not set
    const limit = this.env.ACCOUNTS_WITHOUT_COOKIE_LIMIT 
      ? parseInt(this.env.ACCOUNTS_WITHOUT_COOKIE_LIMIT, 10) 
      : 5;
    
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
   * Upload cookie JSON to R2 and update account with file URL and expiration date
   */
  async updateAccountCookieFromJson(id: string, cookieJson: CookieJson, r2Bucket: R2Bucket): Promise<{ success: boolean; cookieFileUrl?: string; expireDate?: string; error?: string }> {
    try {
      // Extract expiration date from cookies (find the latest expiration date)
      let maxExpirationDate: number | null = null;
      
      if (cookieJson.cookies && Array.isArray(cookieJson.cookies)) {
        for (const cookie of cookieJson.cookies) {
          if (cookie.expirationDate && typeof cookie.expirationDate === 'number') {
            if (maxExpirationDate === null || cookie.expirationDate > maxExpirationDate) {
              maxExpirationDate = cookie.expirationDate;
            }
          }
        }
      }
      
      // Convert expiration date from Unix timestamp to ISO string
      let expireDate: string | null = null;
      if (maxExpirationDate) {
        expireDate = new Date(maxExpirationDate * 1000).toISOString();
      }
      
      // Generate filename: capcut-cookies/{id}.json (overwrites existing file for this account)
      const filename = `capcut-cookies/${id}.json`;
      
      // Upload JSON to R2
      const jsonString = JSON.stringify(cookieJson, null, 2);
      await r2Bucket.put(filename, jsonString, {
        httpMetadata: {
          contentType: 'application/json',
        },
      });
      
      // Store the R2 key (filename) in the database
      // The full public URL can be constructed using:
      // - Custom domain: https://<your-domain>/<filename>
      // - R2 public URL: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<filename>
      // For now, we store the key and the URL can be constructed when needed
      const cookieFileUrl = filename;
      
      // Update account with cookie file URL and expiration date
      const result = await this.env.DB.prepare(
        "UPDATE capcut_accounts SET cookie_file_url = ?, expire_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
        .bind(cookieFileUrl, expireDate, id)
        .run();
      
      if (result.success && (result.meta.changes || 0) > 0) {
        return { 
          success: true, 
          cookieFileUrl,
          expireDate: expireDate || undefined
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
   * Also deletes the cookie file from R2 if account is deleted
   * Returns: { deleted: boolean, credits?: number }
   */
  async reduceCreditsOrDelete(id: string, r2Bucket?: R2Bucket): Promise<{ deleted: boolean; credits?: number }> {
    // First, get the current account to check credits
    const account = await this.getAccountById(id);
    if (!account) {
      return { deleted: false };
    }

    const currentCredits = account.credits ?? 10;

    // If credits is 1, delete the account and its cookie file
    if (currentCredits === 1) {
      // Delete cookie file from R2 if it exists
      if (r2Bucket && account.cookie_file_url) {
        try {
          await r2Bucket.delete(account.cookie_file_url);
        } catch (error) {
          // Log error but continue with account deletion
          console.error(`Failed to delete cookie file ${account.cookie_file_url}:`, error);
        }
      }

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
   * Also deletes the cookie file from R2 if it exists
   */
  async deleteAccount(id: string, r2Bucket?: R2Bucket): Promise<boolean> {
    // Get account to check for cookie file before deletion
    const account = await this.getAccountById(id);
    
    // Delete cookie file from R2 if it exists
    if (r2Bucket && account?.cookie_file_url) {
      try {
        await r2Bucket.delete(account.cookie_file_url);
      } catch (error) {
        // Log error but continue with account deletion
        console.error(`Failed to delete cookie file ${account.cookie_file_url}:`, error);
      }
    }

    const result = await this.env.DB.prepare(
      "DELETE FROM capcut_accounts WHERE id = ?"
    )
      .bind(id)
      .run();
    return result.success && (result.meta.changes || 0) > 0;
  }
}


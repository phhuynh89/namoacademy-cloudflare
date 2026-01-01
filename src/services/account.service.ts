import type { Env, AccountData } from "../types";

/**
 * Service for managing Felo accounts
 */
export class AccountService {
  constructor(private env: Env) {}

  /**
   * Save account to database
   */
  async saveAccount(accountData: AccountData): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO felo_accounts (email, password, created_at, status, error, login_at, credits)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        accountData.email,
        accountData.password,
        accountData.createdAt,
        accountData.status,
        accountData.error || null,
        accountData.loginAt || null,
        accountData.credits ?? 200
      )
      .run();
  }

  /**
   * Get all accounts
   */
  async getAllAccounts(): Promise<any[]> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, login_at, credits FROM felo_accounts ORDER BY id DESC"
    ).all();
    return result.results || [];
  }

  /**
   * Get any single account with valid (non-expired) cookie (limit 1)
   * Prevents duplicate selection by excluding accounts used in the last 5 minutes
   * and immediately marking the selected account as used
   */
  async getAnyAccount(): Promise<any | null> {
    const now = new Date().toISOString();
    // Exclude accounts used in the last 5 minutes to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Select an account that hasn't been used recently
    // Order by last_used_at (oldest first) to distribute load evenly
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, felo_user_token, expire_date, last_used_at
       FROM felo_accounts 
       WHERE felo_user_token IS NOT NULL 
         AND expire_date IS NOT NULL 
         AND expire_date > ?
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
    // Use WHERE clause with id to ensure we only update if it's still the same account
    await this.env.DB.prepare(
      "UPDATE felo_accounts SET last_used_at = ? WHERE id = ?"
    )
      .bind(now, result.id)
      .run();
    
    return result;
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string): Promise<any | null> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, error, login_at, credits, updated_at FROM felo_accounts WHERE id = ?"
    )
      .bind(id)
      .first();
    return result || null;
  }

  /**
   * Delete account by ID
   */
  async deleteAccount(id: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      "DELETE FROM felo_accounts WHERE id = ?"
    )
      .bind(id)
      .run();
    return result.success && (result.meta.changes || 0) > 0;
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
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, felo_user_token, expire_date 
       FROM felo_accounts 
       WHERE felo_user_token IS NULL OR expire_date IS NULL OR expire_date < ?
       ORDER BY id DESC 
       LIMIT ?`
    )
      .bind(now, limit)
      .all();
    return result.results || [];
  }

  /**
   * Update account cookie (felo_user_token and expire_date)
   */
  async updateAccountCookie(id: string, feloUserToken: string, expireDate: string): Promise<boolean> {
    const result = await this.env.DB.prepare(
      "UPDATE felo_accounts SET felo_user_token = ?, expire_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(feloUserToken, expireDate, id)
      .run();
    return result.success && (result.meta.changes || 0) > 0;
  }
}


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
   */
  async getAnyAccount(): Promise<any | null> {
    const now = new Date().toISOString();
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, felo_user_token, expire_date 
       FROM felo_accounts 
       WHERE felo_user_token IS NOT NULL 
         AND expire_date IS NOT NULL 
         AND expire_date > ?
       ORDER BY id DESC 
       LIMIT 1`
    )
      .bind(now)
      .first();
    return result || null;
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
   * Get accounts without cookie or with expired cookie (limit 100)
   */
  async getAccountsWithoutCookie(): Promise<any[]> {
    const now = new Date().toISOString();
    const result = await this.env.DB.prepare(
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, felo_user_token, expire_date 
       FROM felo_accounts 
       WHERE felo_user_token IS NULL OR expire_date IS NULL OR expire_date < ?
       ORDER BY id DESC 
       LIMIT 100`
    )
      .bind(now)
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


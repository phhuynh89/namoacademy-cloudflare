import type { Env, CapCutAccountData } from "../types";

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
      "SELECT id, email, password, created_at, status, login_at, credits FROM capcut_accounts ORDER BY id DESC"
    ).all();
    return result.results || [];
  }

  /**
   * Get CapCut account by ID
   */
  async getAccountById(id: string): Promise<any | null> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, error, login_at, credits, updated_at FROM capcut_accounts WHERE id = ?"
    )
      .bind(id)
      .first();
    return result || null;
  }

  /**
   * Delete CapCut account by ID
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


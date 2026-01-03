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
      "SELECT id, email, password, created_at, status, login_at, credits, last_used_at FROM capcut_accounts ORDER BY id DESC"
    ).all();
    return result.results || [];
  }

  /**
   * Get CapCut account by ID
   */
  async getAccountById(id: string): Promise<any | null> {
    const result = await this.env.DB.prepare(
      "SELECT id, email, password, created_at, status, error, login_at, credits, last_used_at, updated_at FROM capcut_accounts WHERE id = ?"
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
      `SELECT id, email, password, created_at, status, error, login_at, credits, updated_at, last_used_at
       FROM capcut_accounts 
       WHERE status = 'created'
         AND (last_used_at IS NULL OR last_used_at < ?)
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


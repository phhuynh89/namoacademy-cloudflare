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
}


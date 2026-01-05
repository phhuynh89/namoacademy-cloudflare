import type { Env } from "../types";

/**
 * Service for managing API key credits
 */
export class CreditService {
  private readonly DAILY_CREDITS = 50;
  private readonly TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(private env: Env) {}

  /**
   * Check if credits need to be reset (24 hours passed since last_reset)
   */
  shouldResetCredits(lastReset: string): boolean {
    const lastResetTime = new Date(lastReset).getTime();
    const now = Date.now();
    return (now - lastResetTime) >= this.TWENTY_FOUR_HOURS;
  }

  /**
   * Reset credits for a single API key
   */
  async resetCreditsForKey(keyId: number): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE boomlify_api_keys 
       SET credits = ?, last_reset = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
      .bind(this.DAILY_CREDITS, keyId)
      .run();
  }

  /**
   * Reset credits for all API keys that need reset
   */
  async resetAllCredits(): Promise<number> {
    const keys = await this.env.DB.prepare(
      `SELECT id, last_reset FROM boomlify_api_keys`
    ).all<{ id: number; last_reset: string }>();

    let resetCount = 0;
    for (const key of keys.results || []) {
      if (this.shouldResetCredits(key.last_reset)) {
        await this.resetCreditsForKey(key.id);
        resetCount++;
      }
    }

    return resetCount;
  }

  /**
   * Deduct credits from an API key
   */
  async deductCredits(keyId: number, amount: number = 1): Promise<number> {
    const result = await this.env.DB.prepare(
      `UPDATE boomlify_api_keys 
       SET credits = credits - ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? 
       RETURNING credits`
    )
      .bind(amount, keyId)
      .first<{ credits: number }>();

    return result?.credits ?? 0;
  }

  /**
   * Update credits for an API key
   */
  async updateCredits(keyId: number, credits: number): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE boomlify_api_keys SET credits = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(credits, keyId)
      .run();
  }

  /**
   * Get current credits for an API key
   */
  async getCredits(keyId: number): Promise<number | null> {
    const result = await this.env.DB.prepare(
      `SELECT credits FROM boomlify_api_keys WHERE id = ?`
    )
      .bind(keyId)
      .first<{ credits: number }>();

    return result?.credits ?? null;
  }
}


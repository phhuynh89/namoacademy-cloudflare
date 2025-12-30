import type { Env, BoomlifyApiKey } from "../types";
import { CreditService } from "./credit.service";

/**
 * Service for managing Boomlify API keys in the database
 */
export class BoomlifyKeyService {
  private creditService: CreditService;

  constructor(private env: Env) {
    this.creditService = new CreditService(env);
  }

  /**
   * Get all API keys
   */
  async getAllKeys(): Promise<BoomlifyApiKey[]> {
    const result = await this.env.DB.prepare(
      `SELECT id, api_key, name, credits, last_reset, created_at, updated_at 
       FROM boomlify_api_keys 
       ORDER BY id DESC`
    ).all<BoomlifyApiKey>();

    return result.results || [];
  }

  /**
   * Create a new API key
   */
  async createKey(apiKey: string, name?: string): Promise<BoomlifyApiKey> {
    const result = await this.env.DB.prepare(
      `INSERT INTO boomlify_api_keys (api_key, name, credits, last_reset) 
       VALUES (?, ?, 50, CURRENT_TIMESTAMP) 
       RETURNING *`
    )
      .bind(apiKey, name || null)
      .first<BoomlifyApiKey>();

    if (!result) {
      throw new Error("Failed to create API key");
    }

    return result;
  }

  /**
   * Find API key by key string
   */
  async findByKey(apiKey: string): Promise<{ id: number; api_key: string; credits: number; last_reset: string } | null> {
    return await this.env.DB.prepare(
      `SELECT id, api_key, credits, last_reset FROM boomlify_api_keys WHERE api_key = ?`
    )
      .bind(apiKey)
      .first<{ id: number; api_key: string; credits: number; last_reset: string }>();
  }

  /**
   * Find API key by ID
   */
  async findById(id: number): Promise<{ id: number; api_key: string; credits: number; last_reset: string } | null> {
    return await this.env.DB.prepare(
      `SELECT id, api_key, credits, last_reset FROM boomlify_api_keys WHERE id = ?`
    )
      .bind(id)
      .first<{ id: number; api_key: string; credits: number; last_reset: string }>();
  }

  /**
   * Get credits with auto-reset check
   */
  async getCreditsWithReset(keyId: number): Promise<{ credits: number; last_reset: string } | null> {
    const keyRecord = await this.findById(keyId);
    if (!keyRecord) {
      return null;
    }

    // Check if credits need to be reset
    if (this.creditService.shouldResetCredits(keyRecord.last_reset)) {
      await this.creditService.resetCreditsForKey(keyId);
      return {
        credits: 50,
        last_reset: new Date().toISOString(),
      };
    }

    return {
      credits: keyRecord.credits,
      last_reset: keyRecord.last_reset,
    };
  }

  /**
   * Ensure credits are reset if needed and return current credits
   */
  async ensureCreditsReset(keyId: number): Promise<number> {
    const keyRecord = await this.findById(keyId);
    if (!keyRecord) {
      throw new Error("API key not found");
    }

    if (this.creditService.shouldResetCredits(keyRecord.last_reset)) {
      await this.creditService.resetCreditsForKey(keyId);
      return 50;
    }

    return keyRecord.credits;
  }

  /**
   * Find an available API key with credits > 0
   * Automatically resets credits if needed before checking
   */
  async findAvailableKey(): Promise<{ id: number; api_key: string; credits: number; last_reset: string } | null> {
    // Get all keys ordered by ID (or you could order by credits DESC to prefer keys with more credits)
    const keys = await this.env.DB.prepare(
      `SELECT id, api_key, credits, last_reset FROM boomlify_api_keys ORDER BY id ASC`
    ).all<{ id: number; api_key: string; credits: number; last_reset: string }>();

    if (!keys.results || keys.results.length === 0) {
      return null;
    }

    // Check each key and reset credits if needed, then find one with credits > 0
    for (const key of keys.results) {
      // Reset credits if needed
      if (this.creditService.shouldResetCredits(key.last_reset)) {
        await this.creditService.resetCreditsForKey(key.id);
        key.credits = 50;
      }

      // Return first key with credits > 0
      if (key.credits > 0) {
        return key;
      }
    }

    // No keys with credits > 0 available
    return null;
  }
}


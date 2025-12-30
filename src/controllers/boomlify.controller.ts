import type { Env } from "../types";
import { BoomlifyService } from "../services/boomlify.service";
import { BoomlifyKeyService } from "../services/boomlify-key.service";
import { CreditService } from "../services/credit.service";
import { jsonResponse, errorResponse } from "../utils/cors";

/**
 * Controller for Boomlify API endpoints
 */
export class BoomlifyController {
  private boomlifyService: BoomlifyService;
  private keyService: BoomlifyKeyService;
  private creditService: CreditService;

  constructor(private env: Env) {
    this.boomlifyService = new BoomlifyService();
    this.keyService = new BoomlifyKeyService(env);
    this.creditService = new CreditService(env);
  }

  /**
   * GET /api/boomlify/keys - List all API keys
   */
  async listKeys(): Promise<Response> {
    const keys = await this.keyService.getAllKeys();
    return jsonResponse(keys);
  }

  /**
   * POST /api/boomlify/keys - Create new API key
   */
  async createKey(request: Request): Promise<Response> {
    const body = await request.json() as { api_key: string; name?: string };

    if (!body.api_key) {
      return errorResponse("api_key is required", 400);
    }

    try {
      const result = await this.keyService.createKey(body.api_key, body.name);
      return jsonResponse(result, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        return errorResponse("API key already exists", 409);
      }
      throw error;
    }
  }

  /**
   * POST /api/boomlify/temp-mail - Get temp mail (deducts 1 credit)
   * Automatically selects an API key from database with credits > 0
   * No request body required - API key is automatically selected
   */
  async getTempMail(request: Request): Promise<Response> {
    try {
      // Find an available API key with credits > 0 (automatically resets credits if needed)
      const keyRecord = await this.keyService.findAvailableKey();

      if (!keyRecord) {
        return jsonResponse(
          {
            error: "No available API keys",
            message: "No API keys with credits > 0 found. All keys may have exhausted their daily credits.",
          },
          503
        );
      }

      // Get temp mail from Boomlify API using the selected key
      const tempMail = await this.boomlifyService.createTempMail(keyRecord.api_key);

      // Deduct 1 credit
      const newCredits = await this.creditService.deductCredits(keyRecord.id, 1);

      return jsonResponse({
        ...tempMail,
        api_key_id: keyRecord.id,
        credits_remaining: newCredits,
      });
    } catch (error) {
      console.error("Error getting temp mail:", error);
      return jsonResponse(
        {
          error: "Failed to get temp mail",
          message: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }

  /**
   * GET /api/boomlify/keys/:id/credits - Check credits for a specific API key
   */
  async checkCredits(id: string): Promise<Response> {
    const keyId = parseInt(id, 10);
    if (isNaN(keyId)) {
      return errorResponse("Invalid key ID", 400);
    }

    const creditsInfo = await this.keyService.getCreditsWithReset(keyId);

    if (!creditsInfo) {
      return errorResponse("API key not found", 404);
    }

    return jsonResponse({
      id: keyId,
      credits: creditsInfo.credits,
      last_reset: creditsInfo.last_reset,
      next_reset: new Date(new Date(creditsInfo.last_reset).getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  /**
   * POST /api/boomlify/keys/:id/reset - Manually reset credits for a specific API key
   */
  async resetCredits(id: string): Promise<Response> {
    const keyId = parseInt(id, 10);
    if (isNaN(keyId)) {
      return errorResponse("Invalid key ID", 400);
    }

    const keyRecord = await this.keyService.findById(keyId);

    if (!keyRecord) {
      return errorResponse("API key not found", 404);
    }

    await this.creditService.resetCreditsForKey(keyId);

    return jsonResponse({
      message: "Credits reset successfully",
      credits: 50,
    });
  }
}


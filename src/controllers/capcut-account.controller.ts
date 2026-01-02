import type { Env, CapCutAccountData } from "../types";
import { CapCutAccountService } from "../services/capcut-account.service";
import { jsonResponse, errorResponse } from "../utils/cors";

/**
 * Controller for CapCut account endpoints
 */
export class CapCutAccountController {
  private capcutAccountService: CapCutAccountService;

  constructor(private env: Env) {
    this.capcutAccountService = new CapCutAccountService(env);
  }

  /**
   * POST /api/capcut-accounts/save - Save CapCut account to database
   */
  async saveAccount(request: Request): Promise<Response> {
    const accountData = await request.json() as CapCutAccountData;

    try {
      await this.capcutAccountService.saveAccount(accountData);
      return jsonResponse({ success: true, message: "CapCut account saved successfully" });
    } catch (error) {
      console.error("Failed to save CapCut account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/capcut-accounts - Get all CapCut accounts
   */
  async getAllAccounts(): Promise<Response> {
    const accounts = await this.capcutAccountService.getAllAccounts();
    return jsonResponse(accounts);
  }

  /**
   * GET /api/capcut-accounts/any - Get any single CapCut account (prevents duplicates)
   */
  async getAnyAccount(): Promise<Response> {
    try {
      const account = await this.capcutAccountService.getAnyAccount();
      if (!account) {
        return errorResponse("No CapCut accounts available", 404);
      }
      return jsonResponse(account);
    } catch (error) {
      console.error("Failed to get CapCut account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/capcut-accounts/:id - Get CapCut account by ID
   */
  async getAccountById(id: string): Promise<Response> {
    try {
      const account = await this.capcutAccountService.getAccountById(id);
      if (!account) {
        return errorResponse("CapCut account not found", 404);
      }
      return jsonResponse(account);
    } catch (error) {
      console.error("Failed to get CapCut account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * DELETE /api/capcut-accounts/:id - Delete CapCut account by ID
   */
  async deleteAccount(id: string): Promise<Response> {
    try {
      const deleted = await this.capcutAccountService.deleteAccount(id);
      if (!deleted) {
        return errorResponse("CapCut account not found", 404);
      }
      return jsonResponse({ success: true, message: "CapCut account deleted successfully" });
    } catch (error) {
      console.error("Failed to delete CapCut account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
}


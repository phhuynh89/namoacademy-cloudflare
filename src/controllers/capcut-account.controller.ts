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
   * GET /api/capcut-accounts/with-cookie - Get any single CapCut account with valid sid_guard and not expired
   * Prevents duplicates by excluding accounts used in the last 5 minutes
   */
  async getAnyAccount(): Promise<Response> {
    try {
      const account = await this.capcutAccountService.getAnyAccount();
      if (!account) {
        return errorResponse("No CapCut accounts available with valid sid_guard and not expired", 404);
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
   * GET /api/capcut-accounts/cookie - Get any single account with valid (non-expired) cookie
   */
  async getAccountWithCookie(): Promise<Response> {
    try {
      const account = await this.capcutAccountService.getAccountWithCookie();
      if (!account) {
        return errorResponse("No CapCut accounts found with valid cookie", 404);
      }
      return jsonResponse(account);
    } catch (error) {
      console.error("Failed to get CapCut account with cookie:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/capcut-accounts/without-cookie - Get accounts without cookie or expired cookie
   */
  async getAccountsWithoutCookie(): Promise<Response> {
    try {
      const accounts = await this.capcutAccountService.getAccountsWithoutCookie();
      return jsonResponse(accounts);
    } catch (error) {
      console.error("Failed to get CapCut accounts without cookie:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * PUT /api/capcut-accounts/:id/cookie - Update account cookie from JSON
   * Extracts sid_guard and expire_date from cookie JSON and saves to database
   */
  async updateAccountCookie(id: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as { 
        cookies?: any; 
        url?: string;
      };
      
      // Check if it's a cookie JSON format (has cookies array)
      if (body.cookies || (body.url && Array.isArray(body.cookies))) {
        // Extract sid_guard and expire_date from cookies and save to database
        const result = await this.capcutAccountService.updateAccountCookieFromJson(
          id,
          body as any
        );

        if (!result.success) {
          return errorResponse(result.error || "Failed to update cookie", 400);
        }

        return jsonResponse({ 
          success: true, 
          message: "Cookie data saved successfully",
          sidGuard: result.sidGuard,
          expireDate: result.expireDate
        });
      }

      return errorResponse("Invalid request: Provide cookie JSON with 'cookies' array", 400);
    } catch (error) {
      console.error("Failed to update CapCut account cookie:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * DELETE /api/capcut-accounts/:id - Reduce credits by 1, or delete if credits is 1
   */
  async deleteAccount(id: string): Promise<Response> {
    try {
      const result = await this.capcutAccountService.reduceCreditsOrDelete(id);
      
      if (result.deleted) {
        return jsonResponse({ 
          success: true, 
          message: "CapCut account deleted successfully (credits reached 0)",
          deleted: true
        });
      }
      
      if (result.credits !== undefined) {
        return jsonResponse({ 
          success: true, 
          message: "Credits reduced successfully",
          credits: result.credits,
          deleted: false
        });
      }
      
      // Account not found
      return errorResponse("CapCut account not found", 404);
    } catch (error) {
      console.error("Failed to delete/reduce credits for CapCut account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
}


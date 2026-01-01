import type { Env, AccountData } from "../types";
import { AccountService } from "../services/account.service";
import { jsonResponse, errorResponse } from "../utils/cors";

/**
 * Controller for account endpoints
 */
export class AccountController {
  private accountService: AccountService;

  constructor(private env: Env) {
    this.accountService = new AccountService(env);
  }

  /**
   * POST /api/accounts/save - Save account to database
   */
  async saveAccount(request: Request): Promise<Response> {
    const accountData = await request.json() as AccountData;

    try {
      await this.accountService.saveAccount(accountData);
      return jsonResponse({ success: true, message: "Account saved successfully" });
    } catch (error) {
      console.error("Failed to save account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/accounts - Get all accounts
   */
  async getAllAccounts(): Promise<Response> {
    const accounts = await this.accountService.getAllAccounts();
    return jsonResponse(accounts);
  }

  /**
   * GET /api/accounts/with-cookie - Get any single account with valid (non-expired) cookie (limit 1)
   */
  async getAnyAccount(): Promise<Response> {
    try {
      const account = await this.accountService.getAnyAccount();
      if (!account) {
        return errorResponse("No accounts found with valid cookie", 404);
      }
      return jsonResponse(account);
    } catch (error) {
      console.error("Failed to get account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/accounts/:id - Get account by ID
   */
  async getAccountById(id: string): Promise<Response> {
    try {
      const account = await this.accountService.getAccountById(id);
      if (!account) {
        return errorResponse("Account not found", 404);
      }
      return jsonResponse(account);
    } catch (error) {
      console.error("Failed to get account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * DELETE /api/accounts/:id - Delete account by ID
   */
  async deleteAccount(id: string): Promise<Response> {
    try {
      const deleted = await this.accountService.deleteAccount(id);
      if (!deleted) {
        return errorResponse("Account not found", 404);
      }
      return jsonResponse({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Failed to delete account:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * GET /api/accounts/without-cookie - Get accounts without cookie or expired cookie (limit 100)
   */
  async getAccountsWithoutCookie(): Promise<Response> {
    try {
      const accounts = await this.accountService.getAccountsWithoutCookie();
      return jsonResponse(accounts);
    } catch (error) {
      console.error("Failed to get accounts without cookie:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * PUT /api/accounts/:id/cookie - Update account cookie
   */
  async updateAccountCookie(id: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as { felo_user_token: string; expire_date: string };
      
      if (!body.felo_user_token || !body.expire_date) {
        return errorResponse("felo_user_token and expire_date are required", 400);
      }

      const updated = await this.accountService.updateAccountCookie(
        id,
        body.felo_user_token,
        body.expire_date
      );

      if (!updated) {
        return errorResponse("Account not found", 404);
      }

      return jsonResponse({ success: true, message: "Cookie updated successfully" });
    } catch (error) {
      console.error("Failed to update account cookie:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
}


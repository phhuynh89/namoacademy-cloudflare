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
}


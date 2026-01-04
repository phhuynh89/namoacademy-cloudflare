import type { Env } from "./types";
import { handleCorsPreflight, errorResponse } from "./utils/cors";
import { Router } from "./utils/router";
import { HealthController } from "./controllers/health.controller";
import { AccountController } from "./controllers/account.controller";
import { CapCutAccountController } from "./controllers/capcut-account.controller";
import { ItemController } from "./controllers/item.controller";
import { BoomlifyController } from "./controllers/boomlify.controller";
import { CreditService } from "./services/credit.service";

// Initialize controllers
let healthController: HealthController;
let accountController: AccountController;
let capcutAccountController: CapCutAccountController;
let itemController: ItemController;
let boomlifyController: BoomlifyController;

function initializeControllers(env: Env) {
  healthController = new HealthController();
  accountController = new AccountController(env);
  capcutAccountController = new CapCutAccountController(env);
  itemController = new ItemController(env);
  boomlifyController = new BoomlifyController(env);
}

export default {

  /**
   * Scheduled handler for daily credit reset (cron trigger)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Running scheduled credit reset...");
    const creditService = new CreditService(env);
    const resetCount = await creditService.resetAllCredits();
    console.log(`Reset credits for ${resetCount} API keys`);
  },
  
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize controllers
    initializeControllers(env);

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return handleCorsPreflight()!;
    }

    try {
      // Health check endpoint
      if (path === "/" || path === "/health") {
        return healthController.getHealth();
      }

      // Account endpoints
      if (path === "/api/accounts/save" && method === "POST") {
        return await accountController.saveAccount(request);
      }

      if (path === "/api/accounts" && method === "GET") {
        return await accountController.getAllAccounts();
      }

      if (path === "/api/accounts/with-cookie" && method === "GET") {
        return await accountController.getAnyAccount();
      }

      if (path === "/api/accounts/without-cookie" && method === "GET") {
        return await accountController.getAccountsWithoutCookie();
      }

      if (path.startsWith("/api/accounts/") && path.endsWith("/cookie") && method === "PUT") {
        const id = Router.extractIdWithSuffix(path, "/api/accounts/", "/cookie");
        if (id) {
          return await accountController.updateAccountCookie(id, request);
        }
      }

      if (path.startsWith("/api/accounts/") && method === "GET") {
        const id = Router.extractId(path, "/api/accounts/");
        if (id) {
          return await accountController.getAccountById(id);
        }
      }

      if (path.startsWith("/api/accounts/") && method === "DELETE") {
        const id = Router.extractId(path, "/api/accounts/");
        if (id) {
          return await accountController.deleteAccount(id);
        }
      }

      // CapCut Account endpoints
      if (path === "/api/capcut-accounts/save" && method === "POST") {
        return await capcutAccountController.saveAccount(request);
      }

      if (path === "/api/capcut-accounts" && method === "GET") {
        return await capcutAccountController.getAllAccounts();
      }

      if (path === "/api/capcut-accounts/with-cookie" && method === "GET") {
        return await capcutAccountController.getAnyAccount();
      }

      if (path === "/api/capcut-accounts/cookie" && method === "GET") {
        return await capcutAccountController.getAccountWithCookie();
      }

      if (path === "/api/capcut-accounts/without-cookie" && method === "GET") {
        return await capcutAccountController.getAccountsWithoutCookie();
      }

      if (path.startsWith("/api/capcut-accounts/") && path.endsWith("/cookie") && method === "PUT") {
        const id = Router.extractIdWithSuffix(path, "/api/capcut-accounts/", "/cookie");
        if (id) {
          return await capcutAccountController.updateAccountCookie(id, request);
        }
      }

      if (path.startsWith("/api/capcut-accounts/") && path.endsWith("/cookies") && method === "GET") {
        const id = Router.extractIdWithSuffix(path, "/api/capcut-accounts/", "/cookies");
        if (id) {
          return await capcutAccountController.getCookies(id);
        }
      }

      if (path.startsWith("/api/capcut-accounts/") && method === "GET") {
        const id = Router.extractId(path, "/api/capcut-accounts/");
        if (id) {
          return await capcutAccountController.getAccountById(id);
        }
      }

      if (path.startsWith("/api/capcut-accounts/") && method === "DELETE") {
        const id = Router.extractId(path, "/api/capcut-accounts/");
        if (id) {
          return await capcutAccountController.deleteAccount(id);
        }
      }

      // Item endpoints
      if (path === "/api/items" && method === "GET") {
        return await itemController.getAllItems();
      }

      if (path === "/api/items" && method === "POST") {
        return await itemController.createItem(request);
      }

      if (path.startsWith("/api/items/") && method === "GET") {
        const id = Router.extractId(path, "/api/items/");
        if (id) {
          return await itemController.getItemById(id);
        }
      }

      if (path.startsWith("/api/items/") && method === "PUT") {
        const id = Router.extractId(path, "/api/items/");
        if (id) {
          return await itemController.updateItem(id, request);
        }
      }

      if (path.startsWith("/api/items/") && method === "DELETE") {
        const id = Router.extractId(path, "/api/items/");
        if (id) {
          return await itemController.deleteItem(id);
        }
      }

      // Boomlify endpoints
      if (path === "/api/boomlify/keys" && method === "GET") {
        return await boomlifyController.listKeys();
      }

      if (path === "/api/boomlify/keys" && method === "POST") {
        return await boomlifyController.createKey(request);
      }

      if (path === "/api/boomlify/temp-mail" && method === "POST") {
        return await boomlifyController.getTempMail(request);
      }

      if (path.startsWith("/api/boomlify/keys/") && path.endsWith("/credits") && method === "GET") {
        const id = Router.extractIdWithSuffix(path, "/api/boomlify/keys/", "/credits");
        if (id) {
          return await boomlifyController.checkCredits(id);
        }
      }

      if (path.startsWith("/api/boomlify/keys/") && path.endsWith("/reset") && method === "POST") {
        const id = Router.extractIdWithSuffix(path, "/api/boomlify/keys/", "/reset");
        if (id) {
          return await boomlifyController.resetCredits(id);
        }
      }

      if (path.startsWith("/api/boomlify/messages/") && method === "GET") {
        const emailId = Router.extractId(path, "/api/boomlify/messages/");
        if (emailId) {
          return await boomlifyController.getMessages(emailId);
        }
      }

      // 404 for unknown routes
      return errorResponse("Not found", 404);
    } catch (error) {
      console.error("Error:", error);
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  },
};

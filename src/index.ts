import type { Env } from "./types";
import { handleCorsPreflight, errorResponse } from "./utils/cors";
import { Router } from "./utils/router";
import { HealthController } from "./controllers/health.controller";
import { AccountController } from "./controllers/account.controller";
import { ItemController } from "./controllers/item.controller";
import { BoomlifyController } from "./controllers/boomlify.controller";
import { CreditService } from "./services/credit.service";

// Initialize controllers
let healthController: HealthController;
let accountController: AccountController;
let itemController: ItemController;
let boomlifyController: BoomlifyController;

function initializeControllers(env: Env) {
  healthController = new HealthController();
  accountController = new AccountController(env);
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

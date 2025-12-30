import { jsonResponse } from "../utils/cors";

/**
 * Controller for health check and info endpoints
 */
export class HealthController {
  /**
   * GET / or GET /health - Health check endpoint
   */
  getHealth(): Response {
    return jsonResponse({
      status: "ok",
      message: "Cloudflare Worker with D1 Database and Account Creator is running",
      endpoints: {
        health: "GET /health",
        saveAccount: "POST /api/accounts/save",
        getAccounts: "GET /api/accounts",
        items: "GET /api/items",
        boomlifyKeys: "GET /api/boomlify/keys",
        createBoomlifyKey: "POST /api/boomlify/keys",
        getBoomlifyTempMail: "POST /api/boomlify/temp-mail",
        checkBoomlifyCredits: "GET /api/boomlify/keys/:id/credits",
        resetBoomlifyCredits: "POST /api/boomlify/keys/:id/reset",
      },
    });
  }
}


import type { BoomlifyTempMailResponse } from "../types";

const BOOMLIFY_API_BASE = "https://v1.boomlify.com/api/v1";

/**
 * Service for interacting with Boomlify API
 */
export class BoomlifyService {

  /**
   * Get temp mail from Boomlify API
   */
  async createTempMail(apiKey: string): Promise<BoomlifyTempMailResponse> {
    const url = `${BOOMLIFY_API_BASE}/emails/create`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Boomlify API error: ${response.status} - ${error}`);
    }

    return await response.json() as BoomlifyTempMailResponse;
  }

  async getMessages(apiKey: string, id: string) {
    const url = `${BOOMLIFY_API_BASE}/emails/${id}/messages`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Boomlify API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }
}


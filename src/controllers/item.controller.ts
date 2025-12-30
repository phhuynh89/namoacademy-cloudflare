import type { Env } from "../types";
import { ItemService } from "../services/item.service";
import { jsonResponse, errorResponse } from "../utils/cors";

/**
 * Controller for item endpoints
 */
export class ItemController {
  private itemService: ItemService;

  constructor(private env: Env) {
    this.itemService = new ItemService(env);
  }

  /**
   * GET /api/items - Get all items
   */
  async getAllItems(): Promise<Response> {
    const items = await this.itemService.getAllItems();
    return jsonResponse(items);
  }

  /**
   * GET /api/items/:id - Get single item by ID
   */
  async getItemById(id: string): Promise<Response> {
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    const item = await this.itemService.getItemById(itemId);

    if (!item) {
      return errorResponse("Item not found", 404);
    }

    return jsonResponse(item);
  }

  /**
   * POST /api/items - Create new item
   */
  async createItem(request: Request): Promise<Response> {
    const body = await request.json() as { name?: string; description?: string };

    if (!body.name) {
      return errorResponse("Name is required", 400);
    }

    try {
      const result = await this.itemService.createItem(body.name, body.description);
      return jsonResponse(result, 201);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }

  /**
   * PUT /api/items/:id - Update item
   */
  async updateItem(id: string, request: Request): Promise<Response> {
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    const body = await request.json() as { name?: string; description?: string };
    const result = await this.itemService.updateItem(itemId, body.name, body.description);

    if (!result) {
      return errorResponse("Item not found", 404);
    }

    return jsonResponse(result);
  }

  /**
   * DELETE /api/items/:id - Delete item
   */
  async deleteItem(id: string): Promise<Response> {
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    const result = await this.itemService.deleteItem(itemId);

    if (!result) {
      return errorResponse("Item not found", 404);
    }

    return jsonResponse({ message: "Item deleted", item: result });
  }
}


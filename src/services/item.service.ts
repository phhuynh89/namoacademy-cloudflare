import type { Env, Item } from "../types";

/**
 * Service for managing items
 */
export class ItemService {
  constructor(private env: Env) {}

  /**
   * Get all items
   */
  async getAllItems(): Promise<Item[]> {
    const result = await this.env.DB.prepare("SELECT * FROM items ORDER BY id DESC").all<Item>();
    return result.results || [];
  }

  /**
   * Get item by ID
   */
  async getItemById(id: number): Promise<Item | null> {
    return await this.env.DB.prepare("SELECT * FROM items WHERE id = ?")
      .bind(id)
      .first<Item>();
  }

  /**
   * Create a new item
   */
  async createItem(name: string, description?: string): Promise<Item> {
    const result = await this.env.DB.prepare(
      "INSERT INTO items (name, description) VALUES (?, ?) RETURNING *"
    )
      .bind(name, description || null)
      .first<Item>();

    if (!result) {
      throw new Error("Failed to create item");
    }

    return result;
  }

  /**
   * Update an item
   */
  async updateItem(id: number, name?: string, description?: string): Promise<Item | null> {
    return await this.env.DB.prepare(
      "UPDATE items SET name = ?, description = ? WHERE id = ? RETURNING *"
    )
      .bind(name, description || null, id)
      .first<Item>();
  }

  /**
   * Delete an item
   */
  async deleteItem(id: number): Promise<Item | null> {
    return await this.env.DB.prepare("DELETE FROM items WHERE id = ? RETURNING *")
      .bind(id)
      .first<Item>();
  }
}


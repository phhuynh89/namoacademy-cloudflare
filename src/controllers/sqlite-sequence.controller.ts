import type { Env } from "../types";
import { SqliteSequenceService } from "../services/sqlite-sequence.service";
import { jsonResponse, errorResponse } from "../utils/cors";

/**
 * Controller for sqlite_sequence endpoints
 */
export class SqliteSequenceController {
  private sqliteSequenceService: SqliteSequenceService;

  constructor(private env: Env) {
    this.sqliteSequenceService = new SqliteSequenceService(env);
  }

  /**
   * GET /api/sqlite-sequence - Get all records from sqlite_sequence table
   */
  async getAllSequences(): Promise<Response> {
    try {
      const sequences = await this.sqliteSequenceService.getAllSequences();
      return jsonResponse(sequences);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  }
}


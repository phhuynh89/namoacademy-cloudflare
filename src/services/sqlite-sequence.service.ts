import type { Env, SqliteSequence } from "../types";

/**
 * Service for querying sqlite_sequence table
 */
export class SqliteSequenceService {
  constructor(private env: Env) {}

  /**
   * Get all records from sqlite_sequence table
   */
  async getAllSequences(): Promise<SqliteSequence[]> {
    const result = await this.env.DB.prepare("SELECT * FROM sqlite_sequence ORDER BY name").all<SqliteSequence>();
    return result.results || [];
  }
}


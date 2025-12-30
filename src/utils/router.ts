/**
 * Simple router utility for matching routes
 */
export class Router {
  /**
   * Extract ID from path like /api/items/123 or /api/boomlify/keys/123/credits
   */
  static extractId(path: string, prefix: string): string | null {
    const pathWithoutPrefix = path.replace(prefix, "");
    const parts = pathWithoutPrefix.split("/").filter(Boolean);
    return parts[0] || null;
  }

  /**
   * Check if path matches pattern with optional suffix
   */
  static matches(path: string, pattern: string, suffix?: string): boolean {
    if (suffix) {
      return path.startsWith(pattern) && path.endsWith(suffix);
    }
    return path === pattern;
  }

  /**
   * Extract ID from path with suffix like /api/boomlify/keys/123/credits
   */
  static extractIdWithSuffix(path: string, prefix: string, suffix: string): string | null {
    if (!path.startsWith(prefix) || !path.endsWith(suffix)) {
      return null;
    }
    const middle = path.slice(prefix.length, -suffix.length);
    const parts = middle.split("/").filter(Boolean);
    return parts[0] || null;
  }
}


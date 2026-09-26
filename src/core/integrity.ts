import { createHash } from "node:crypto";

export class IntegrityMonitor {
  /**
   * Generates a deterministic SHA-256 hash of a JSON payload.
   * Sorts keys to ensure identical payloads produce the same hash regardless of object key order.
   */
  public static generateCanonicalHash(payload: Record<string, unknown>): string {
    const sortedPayload = this.sortKeys(payload);
    const jsonString = JSON.stringify(sortedPayload);

    return createHash("sha256")
      .update(jsonString)
      .digest("hex");
  }

  /**
   * Verifies that the payload approved by the human matches the payload attempting to execute.
   */
  public static verify(approvedHash: string, executionHash: string): boolean {
    return approvedHash === executionHash;
  }

  /**
   * Recursively sorts the keys of an object to guarantee deterministic JSON stringification.
   */
  private static sortKeys(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortKeys(item));
    }

    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};

    for (const key of sortedKeys) {
      result[key] = this.sortKeys(obj[key]);
    }

    return result;
  }
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { AuditRecord } from "../types/governance.types.js";

export class AuditLogger {
  private static logFilePath = path.join(process.cwd(), "audit.json");
  private static inMemoryLogs: AuditRecord[] = [];

  // Logs an audit record both in memory and asynchronously to audit.json
  public static async log(record: AuditRecord): Promise<void> {
    // Keep in memory for live web dashboard consumption
    this.inMemoryLogs.unshift(record);

    // Limit in-memory cache to last 100 entries
    if (this.inMemoryLogs.length > 100) {
      this.inMemoryLogs.pop();
    }

    try {
      const logLine = JSON.stringify(record) + "\n";
      await fs.appendFile(this.logFilePath, logLine, "utf-8");
    } catch (err) {
      console.error("[AuditLogger] Failed to write to audit file:", err);
    }
  }

  // Retrieves the latest in-memory audit logs for the dashboard
  public static getRecentLogs(): AuditRecord[] {
    return this.inMemoryLogs;
  }

  // Clears in-memory logs (for testing)
  public static clearMemoryLogs(): void {
    this.inMemoryLogs = [];
  }
}
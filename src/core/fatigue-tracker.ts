import { GOVERNANCE_CONFIG } from "../config/default.config.js";

export class FatigueTracker {
  // Maps actorId to an array of timestamps (in ms) when approvals were prompted
  private static promptTimestamps: Map<string, number[]> = new Map();

  // Records a prompt occurrence for a given actor and returns current fatigue count.
  public static recordPrompt(actorId: string): number {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10-minute sliding window

    const timestamps = this.promptTimestamps.get(actorId) || [];
    
    // Prune entries outside the 10-minute window
    const activeTimestamps = timestamps.filter((t) => now - t <= windowMs);
    activeTimestamps.push(now);

    this.promptTimestamps.set(actorId, activeTimestamps);

    return activeTimestamps.length;
  }

  // Returns whether the given actor is currently experiencing alert fatigue.
  public static isFatigued(actorId: string): boolean {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;

    const timestamps = this.promptTimestamps.get(actorId) || [];
    const activeCount = timestamps.filter((t) => now - t <= windowMs).length;

    return activeCount >= GOVERNANCE_CONFIG.ZONES.MAX_FATIGUE_COUNT_10MIN;
  }

  // Resets tracking state (primarily used for testing).
  public static reset(): void {
    this.promptTimestamps.clear();
  }
}

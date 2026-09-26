import { SuspendedApprovalSession } from "../types/governance.types.js";

export class SessionStore {
  private static sessions: Map<string, SuspendedApprovalSession> = new Map();
  private static actorHistory: Map<string, number[]> = new Map();

  // Stores a suspended approval session awaiting human sign-off.
  public static saveSession(session: SuspendedApprovalSession): void {
    this.sessions.set(session.sessionId, session);
  }

  // Retrieves a suspended session by ID.
  public static getSession(sessionId: string): SuspendedApprovalSession | undefined {
    return this.sessions.get(sessionId);
  }

  // Deletes a resolved or expired session.
  public static removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // Returns all active suspended sessions awaiting human sign-off.
  public static getAllSuspendedSessions(): SuspendedApprovalSession[] {
    return Array.from(this.sessions.values());
  }

  // Pushes a completed risk score into actor history for z-score calculation and keeps record of last 50 historical scores per actor.
  public static recordActorScore(actorId: string, score: number): void {
    const history = this.actorHistory.get(actorId) || [];
    history.push(score);

    if (history.length > 50) {
      history.shift();
    }

    this.actorHistory.set(actorId, history);
  }

  // Returns historical risk scores for an actor.
  public static getActorHistory(actorId: string): number[] {
    return this.actorHistory.get(actorId) || [];
  }
}

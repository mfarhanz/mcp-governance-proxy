import { RiskEngine } from "../core/risk-engine.js";
import { TimingEngine } from "../core/timing-engine.js";
import { FatigueTracker } from "../core/fatigue-tracker.js";
import { IntegrityMonitor } from "../core/integrity.js";
import { SessionStore } from "../storage/session-store.js";
import { AuditLogger } from "../storage/audit-logger.js";
import { MCPToolCall } from "../types/mcp.types.js";
import {
    ApprovalStatus,
    GovernanceDecision,
    SuspendedApprovalSession,
    TimingVerdict,
} from "../types/governance.types.js";
import { Zone } from "../types/risk.types.js";

export class MCPInterceptor {
    // Main entrypoint: Intercepts an incoming MCP tool call and routes it through Risk, Timing, Fatigue, and Integrity evaluation.
    public static async intercept(
        toolCall: MCPToolCall
    ): Promise<GovernanceDecision> {
        const timestamp = Date.now();
        const actorId = toolCall.actorId || "anonymous_actor";

        // 1. Fetch historical risk scores for z-score statistical drift tracking
        const history = SessionStore.getActorHistory(actorId);

        // 2. Compute deterministic risk score & assign Zone
        const riskResult = RiskEngine.evaluate(toolCall, history);
        SessionStore.recordActorScore(actorId, riskResult.finalScore);

        // 3. Track fatigue prompt count and status
        const promptCount = FatigueTracker.recordPrompt(actorId);
        const isFatigued = FatigueTracker.isFatigued(actorId);

        // 4. Calculate dynamic reading/review time floors
        const floors = TimingEngine.calculateFloors(toolCall);

        // 5. Compute canonical SHA-256 payload hash
        const payloadHash = IntegrityMonitor.generateCanonicalHash(
            (toolCall.arguments as Record<string, unknown>) || {}
        );

        // --- DECISION ROUTING BASED ON ZONE & FATIGUE ---

        // ZONE 1: Auto-approve low-risk actions (unless fatigue escalation occurs)
        if (riskResult.zone === Zone.ZONE_1 && !isFatigued) {
            AuditLogger.log({
                id: `audit_${timestamp}`,
                timestamp: new Date(timestamp).toISOString(),
                toolName: toolCall.toolName,
                actorId,
                payload: toolCall.arguments || {},
                computedScore: riskResult.finalScore,
                ruleHits: riskResult.ruleHits,
                zScore: riskResult.zScore,
                zone: Zone.ZONE_1,
                hashExecution: payloadHash,
                outcome: "EXECUTED",
                outcomeReason: "Low-risk action passed automated clearance.",
            });

            return {
                status: "APPROVED",
                reason: "Low-risk action passed automated clearance.",
                riskScore: riskResult.finalScore,
                zone: Zone.ZONE_1,
            };
        }

        // ZONE 2, ZONE 3/4, or Fatigue Escalation: Suspend execution & demand human approval
        const sessionId = `sess_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

        const suspendedSession: SuspendedApprovalSession = {
            sessionId,
            toolCall,
            riskResult,
            canonicalHash: payloadHash,
            tShown: timestamp,
            timingFloors: floors,
            requiresReConfirmation: isFatigued,
            confirmationAttempts: 0,
        };

        SessionStore.saveSession(suspendedSession);

        AuditLogger.log({
            id: `audit_${timestamp}`,
            timestamp: new Date(timestamp).toISOString(),
            toolName: toolCall.toolName,
            actorId,
            payload: toolCall.arguments || {},
            computedScore: riskResult.finalScore,
            ruleHits: riskResult.ruleHits,
            zScore: riskResult.zScore,
            zone: riskResult.zone,
            hashApproval: payloadHash,
            outcome: riskResult.zone === Zone.ZONE_3_4 ? "HARD_FLAGGED" : "REJECTED",
            outcomeReason:
                riskResult.zone === Zone.ZONE_3_4
                    ? "High-risk action suspended. Requires explicit human review."
                    : isFatigued
                        ? "Action escalated to suspension due to rapid prompt velocity / fatigue threshold."
                        : "Action flagged for operator review.",
        });

        return {
            status: "SUSPENDED",
            sessionId,
            reason:
                riskResult.zone === Zone.ZONE_3_4
                    ? "High-risk action suspended. Requires explicit human review."
                    : isFatigued
                        ? "Action escalated to suspension due to rapid prompt velocity / fatigue threshold."
                        : "Action flagged for operator review.",
            riskScore: riskResult.finalScore,
            zone: riskResult.zone,
            timingFloors: floors,
            canonicalHash: payloadHash,
        };
    }

    // Resolves a suspended human approval session when an operator clicks Approve/Reject.
    public static async resolveApproval(
        sessionId: string,
        action: "APPROVE" | "REJECT",
        tClick: number
    ): Promise<{
        success: boolean;
        message: string;
        verdict?: TimingVerdict;
        status?: ApprovalStatus;
    }> {
        const session = SessionStore.getSession(sessionId);

        if (!session) {
            return {
                success: false,
                message: "Approval session not found or expired.",
                status: "EXPIRED",
            };
        }

        if (action === "REJECT") {
            SessionStore.removeSession(sessionId);

            AuditLogger.log({
                id: `audit_${Date.now()}`,
                timestamp: new Date().toISOString(),
                toolName: session.toolCall.toolName,
                actorId: session.toolCall.actorId || "anonymous",
                payload: session.toolCall.arguments || {},
                computedScore: session.riskResult.finalScore,
                ruleHits: session.riskResult.ruleHits,
                zScore: session.riskResult.zScore,
                zone: session.riskResult.zone,
                hashApproval: session.canonicalHash,
                outcome: "REJECTED",
                outcomeReason: "Action successfully rejected by operator.",
            });

            return {
                success: true,
                message: "Action successfully rejected by operator.",
                status: "REJECTED",
            };
        }

        // Evaluate timing to ensure human didn't blind-click faster than physical reading floor
        const verdict = TimingEngine.evaluateTiming(
            session.tShown,
            tClick,
            session.timingFloors
        );

        if (verdict === TimingVerdict.TOO_FAST) {
            // Increment the failed confirmation attempts counter
            session.confirmationAttempts = (session.confirmationAttempts || 0) + 1;
            session.status = "TOO_FAST";
            SessionStore.saveSession(session);

            return {
                success: false,
                verdict,
                status: "TOO_FAST",
                message: `Approval clicked too quickly! Minimum reading time was ${session.timingFloors.hardFloorMs}ms. Please review the payload content thoroughly.`,
            };
        }

        // Clear session upon successful approval
        SessionStore.removeSession(sessionId);

        AuditLogger.log({
            id: `audit_${Date.now()}`,
            timestamp: new Date().toISOString(),
            toolName: session.toolCall.toolName,
            actorId: session.toolCall.actorId || "anonymous",
            payload: session.toolCall.arguments || {},
            computedScore: session.riskResult.finalScore,
            ruleHits: session.riskResult.ruleHits,
            zScore: session.riskResult.zScore,
            zone: session.riskResult.zone,
            tShown: session.tShown,
            tClick,
            timingVerdict: verdict,
            hashApproval: session.canonicalHash,
            outcome: "EXECUTED",
            outcomeReason: "Action approved and released for execution.",
        });

        return {
            success: true,
            verdict,
            status: "ACCEPTED",
            message: "Action approved and released for execution.",
        };
    }
}

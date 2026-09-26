import { MCPToolCall } from "./mcp.types.js";
import { RiskAnalysisResult, RuleHit, Zone } from "./risk.types.js";

export enum TimingVerdict {
  TOO_FAST = "TOO_FAST",
  FAST = "FAST",
  TIMELY = "TIMELY"
}

export interface TimingFloors {
  hardFloorMs: number;
  softFloorMs: number;
  wordCount: number;
  lineCount: number;
  fieldCount: number;
}

export type ApprovalStatus =
  | "PENDING"
  | "SHOWN"
  | "ACCEPTED"
  | "REJECTED"
  | "TOO_FAST"
  | "RECONFIRMATION_REQUIRED"
  | "CONFIRMED"
  | "EXPIRED";

export interface SuspendedApprovalSession {
  sessionId: string;
  toolCall: MCPToolCall;
  riskResult: RiskAnalysisResult;
  canonicalHash: string;
  tShown: number;
  timingFloors: TimingFloors;
  requiresReConfirmation?: boolean;
  confirmationAttempts?: number;
  status?: ApprovalStatus;
}

export interface GovernanceDecision {
  status: "APPROVED" | "SUSPENDED" | "REJECTED";
  sessionId?: string;
  reason: string;
  riskScore: number;
  zone: Zone;
  timingFloors?: TimingFloors;
  canonicalHash?: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  toolName: string;
  actorId: string;
  payload: Record<string, unknown>;
  computedScore: number;
  ruleHits: RuleHit[];
  zScore: number;
  zone: Zone;
  tShown?: number;
  tClick?: number;
  timingVerdict?: TimingVerdict;
  hashApproval?: string;
  hashExecution?: string;
  outcome: "EXECUTED" | "REJECTED" | "HARD_FLAGGED";
  outcomeReason: string;
}
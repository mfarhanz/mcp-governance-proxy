// Action classifications for various MCP tool call categories
export enum ActionType {
  READ_ONLY = "READ_ONLY",
  METADATA = "METADATA",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DESTRUCTIVE_WRITE = "DESTRUCTIVE_WRITE",
  CREDENTIAL_ACCESS = "CREDENTIAL_ACCESS",
  FINANCIAL_TRANSACTION = "FINANCIAL_TRANSACTION",
  PRIVILEGE_CHANGE = "PRIVILEGE_CHANGE",
  CODE_EXECUTION = "CODE_EXECUTION",
  NETWORK_CALL = "NETWORK_CALL",
  COMMUNICATION = "COMMUNICATION"
}

export enum Zone {
  ZONE_1 = "ZONE_1",   // S < 30 (Auto-execute)
  ZONE_2 = "ZONE_2",   // 30 <= S < 60 & F low (Auto-execute + async audit)
  ZONE_3_4 = "ZONE_3_4" // S >= 60 or high fatigue (Suspend for human review)
}

export interface RuleHit {
  ruleId: string;
  description: string;
  weight: number;
}

export interface RiskAnalysisResult {
  baseScore: number;
  finalScore: number;
  ruleHits: RuleHit[];
  zScore: number;
  zone: Zone;
  suppressReadOnlyDiscount: boolean;
}
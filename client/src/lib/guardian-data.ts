export type RiskZone = "ZONE_1" | "ZONE_2" | "ZONE_3_4";
export type ActionType =
  | "READ_ONLY" | "METADATA" | "CREATE" | "UPDATE" | "DESTRUCTIVE_WRITE"
  | "CREDENTIAL_ACCESS" | "FINANCIAL_TRANSACTION" | "PRIVILEGE_CHANGE"
  | "CODE_EXECUTION" | "NETWORK_CALL" | "COMMUNICATION";

export type RuleHit = { ruleId: string; description: string; weight: number };
export type GuardianRequest = {
  id: string;
  toolName: string;
  actorId: string;
  environment: "production" | "staging" | "development";
  arguments: Record<string, unknown>;
  actionType: ActionType;
  metadata?: { isBulk?: boolean; targetScope?: string; description?: string };
  riskScore: number;
  zone: RiskZone;
  ruleHits: RuleHit[];
  approvalRequired: boolean;
  sessionId?: string;
  tShown?: number;
};

export const demoRequests: GuardianRequest[] = [
  { id: "REQ-2026-0042", toolName: "delete_file", actorId: "agent-atlas", environment: "production", arguments: { path: "/production/database.db", bulk: true }, actionType: "DESTRUCTIVE_WRITE", metadata: { isBulk: true, targetScope: "production" }, riskScore: 75, zone: "ZONE_3_4", ruleHits: [{ ruleId: "DELETE", description: "Destructive write", weight: 30 }, { ruleId: "PRODUCTION", description: "Production target", weight: 25 }, { ruleId: "BULK", description: "Bulk operation", weight: 20 }], approvalRequired: true },
  { id: "REQ-2026-0043", toolName: "get_user", actorId: "agent-orbit", environment: "development", arguments: { userId: "USR-108" }, actionType: "READ_ONLY", riskScore: 15, zone: "ZONE_1", ruleHits: [{ ruleId: "READ", description: "Read-only access", weight: 15 }], approvalRequired: false },
  { id: "REQ-2026-0044", toolName: "grant_role", actorId: "agent-atlas", environment: "production", arguments: { userId: "USR-552", role: "admin" }, actionType: "PRIVILEGE_CHANGE", riskScore: 90, zone: "ZONE_3_4", ruleHits: [{ ruleId: "PRIVILEGE", description: "Privilege escalation", weight: 45 }, { ruleId: "ADMIN", description: "Administrator scope", weight: 25 }, { ruleId: "PRODUCTION", description: "Production target", weight: 20 }], approvalRequired: true },
  { id: "REQ-2026-0045", toolName: "update_config", actorId: "agent-nova", environment: "staging", arguments: { service: "payments", retries: 5 }, actionType: "UPDATE", riskScore: 45, zone: "ZONE_2", ruleHits: [{ ruleId: "WRITE", description: "Configuration write", weight: 25 }, { ruleId: "SERVICE", description: "Service-wide impact", weight: 20 }], approvalRequired: true },
  { id: "REQ-2026-0046", toolName: "send_email", actorId: "agent-hermes", environment: "production", arguments: { to: "ops@example.com", subject: "Incident update" }, actionType: "COMMUNICATION", riskScore: 30, zone: "ZONE_2", ruleHits: [{ ruleId: "EXTERNAL", description: "External communication", weight: 30 }], approvalRequired: true },
  { id: "REQ-2026-0047", toolName: "create_backup", actorId: "agent-orbit", environment: "production", arguments: { database: "customer_primary", encrypted: true }, actionType: "CREATE", riskScore: 0, zone: "ZONE_1", ruleHits: [], approvalRequired: false },
  { id: "REQ-2026-0048", toolName: "rotate_credentials", actorId: "agent-vault", environment: "production", arguments: { secret: "PAYMENT_API_KEY", revokeOld: true }, actionType: "CREDENTIAL_ACCESS", riskScore: 60, zone: "ZONE_3_4", ruleHits: [{ ruleId: "SECRET", description: "Credential access", weight: 40 }, { ruleId: "REVOKE", description: "Revokes active key", weight: 20 }], approvalRequired: true },
  { id: "REQ-2026-0049", toolName: "modify_firewall", actorId: "agent-sentinel", environment: "production", arguments: { port: 22, access: "0.0.0.0/0" }, actionType: "NETWORK_CALL", riskScore: 75, zone: "ZONE_3_4", ruleHits: [{ ruleId: "NETWORK", description: "Perimeter change", weight: 35 }, { ruleId: "PUBLIC", description: "Public ingress", weight: 40 }], approvalRequired: true },
  { id: "REQ-2026-0050", toolName: "execute_command", actorId: "agent-forge", environment: "staging", arguments: { command: "npm run migrate", timeout: 300 }, actionType: "CODE_EXECUTION", riskScore: 60, zone: "ZONE_3_4", ruleHits: [{ ruleId: "EXEC", description: "Command execution", weight: 40 }, { ruleId: "MIGRATE", description: "Schema mutation", weight: 20 }], approvalRequired: true },
  { id: "REQ-2026-0051", toolName: "database_export", actorId: "agent-archive", environment: "production", arguments: { table: "customers", format: "csv", rows: 50000 }, actionType: "READ_ONLY", metadata: { isBulk: true }, riskScore: 45, zone: "ZONE_2", ruleHits: [{ ruleId: "DATA", description: "Sensitive dataset", weight: 25 }, { ruleId: "VOLUME", description: "Bulk export", weight: 20 }], approvalRequired: true },
];

export function zoneLabel(zone: RiskZone) {
  return zone === "ZONE_1" ? "1 — LOW RISK" : zone === "ZONE_2" ? "2 — MEDIUM RISK" : "3 — HIGH RISK";
}

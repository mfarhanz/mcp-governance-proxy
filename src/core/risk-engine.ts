import { GOVERNANCE_CONFIG } from "../config/default.config.js";
import { MCPToolCall } from "../types/mcp.types.js";
import { ActionType, RiskAnalysisResult, RuleHit, Zone } from "../types/risk.types.js";

export class RiskEngine {
  // Evaluates an incoming MCP tool call and computes its deterministic risk score.
  public static evaluate(
    toolCall: MCPToolCall,
    historicalScores: number[] = []
  ): RiskAnalysisResult {
    const baseScore = GOVERNANCE_CONFIG.S0_BASE_SCORE;
    const ruleHits: RuleHit[] = [];

    const actionTypeStr = (toolCall.actionType || ActionType.READ_ONLY).toUpperCase();
    
    // Check if action type is classified as sensitive
    const isSensitive = GOVERNANCE_CONFIG.SENSITIVE_ACTION_TYPES.includes(actionTypeStr);

    // Primary Action Type Scoring
    switch (actionTypeStr) {
      case ActionType.READ_ONLY:
        if (!isSensitive) {
          ruleHits.push({
            ruleId: "READ_ONLY_DISCOUNT",
            description: "Read-only operation discount",
            weight: GOVERNANCE_CONFIG.WEIGHTS.READ_ONLY
          });
        }
        break;

      case ActionType.METADATA:
        if (!isSensitive) {
          ruleHits.push({
            ruleId: "METADATA_DISCOUNT",
            description: "Metadata check discount",
            weight: GOVERNANCE_CONFIG.WEIGHTS.METADATA
          });
        }
        break;

      case ActionType.CREATE:
        ruleHits.push({
          ruleId: "CREATE_RESOURCE",
          description: "Create new resource",
          weight: GOVERNANCE_CONFIG.WEIGHTS.CREATE
        });
        break;

      case ActionType.UPDATE:
        ruleHits.push({
          ruleId: "UPDATE_RESOURCE",
          description: "Update existing resource",
          weight: GOVERNANCE_CONFIG.WEIGHTS.UPDATE
        });
        break;

      case ActionType.DESTRUCTIVE_WRITE:
        ruleHits.push({
          ruleId: "DESTRUCTIVE_WRITE",
          description: "Destructive write or deletion",
          weight: GOVERNANCE_CONFIG.WEIGHTS.DESTRUCTIVE_WRITE
        });
        break;

      case ActionType.CREDENTIAL_ACCESS:
        ruleHits.push({
          ruleId: "CREDENTIAL_ACCESS",
          description: "Credential or secret access",
          weight: GOVERNANCE_CONFIG.WEIGHTS.CREDENTIAL_ACCESS
        });
        break;

      case ActionType.FINANCIAL_TRANSACTION:
        ruleHits.push({
          ruleId: "FINANCIAL_TRANSACTION",
          description: "Financial transaction execution",
          weight: GOVERNANCE_CONFIG.WEIGHTS.FINANCIAL_TRANSACTION
        });
        break;

      case ActionType.PRIVILEGE_CHANGE:
        ruleHits.push({
          ruleId: "PRIVILEGE_CHANGE",
          description: "Privilege or permission modification",
          weight: GOVERNANCE_CONFIG.WEIGHTS.PRIVILEGE_CHANGE
        });
        break;

      case ActionType.CODE_EXECUTION:
        ruleHits.push({
          ruleId: "CODE_EXECUTION",
          description: "Arbitrary command or code execution",
          weight: GOVERNANCE_CONFIG.WEIGHTS.CODE_EXECUTION
        });
        break;

      case ActionType.NETWORK_CALL:
        ruleHits.push({
          ruleId: "NETWORK_CALL",
          description: "External network request",
          weight: GOVERNANCE_CONFIG.WEIGHTS.NETWORK_CALL
        });
        break;

      case ActionType.COMMUNICATION:
        ruleHits.push({
          ruleId: "COMMUNICATION_SEND",
          description: "External message or communication dispatch",
          weight: GOVERNANCE_CONFIG.WEIGHTS.COMMUNICATION
        });
        break;
    }

    // Modifier Checks
    if (toolCall.metadata?.isBulk) {
      ruleHits.push({
        ruleId: "BULK_OPERATION",
        description: "Bulk data operation modifier",
        weight: GOVERNANCE_CONFIG.WEIGHTS.BULK_OPERATION
      });
    }

    if (toolCall.environment === "production") {
      ruleHits.push({
        ruleId: "PRODUCTION_ENV",
        description: "Production environment modifier",
        weight: GOVERNANCE_CONFIG.WEIGHTS.PRODUCTION_SCOPE
      });
    }

    // Calculate z-score drift relative to history
    const zScore = this.calculateZScore(historicalScores);
    const driftTerm = GOVERNANCE_CONFIG.DRIFT_LAMBDA * Math.abs(zScore);

    // Sum weights
    const weightsSum = ruleHits.reduce((acc, hit) => acc + hit.weight, 0);
    const finalScore = Math.max(0, baseScore + weightsSum + driftTerm);

    // Assign initial Zone
    let zone = Zone.ZONE_1;
    if (finalScore >= GOVERNANCE_CONFIG.ZONES.ZONE_2_MAX) {
      zone = Zone.ZONE_3_4;
    } else if (finalScore >= GOVERNANCE_CONFIG.ZONES.ZONE_1_MAX) {
      zone = Zone.ZONE_2;
    }

    return {
      baseScore,
      finalScore,
      ruleHits,
      zScore,
      zone,
      suppressReadOnlyDiscount: isSensitive
    };
  }

  // Calculates z-score for statistical drift tracking.
  private static calculateZScore(history: number[]): number {
    if (!history || history.length < 5) {
      return 0;
    }

    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance =
      history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    
    const latest = history[history.length - 1];
    return (latest - mean) / stdDev;
  }
}

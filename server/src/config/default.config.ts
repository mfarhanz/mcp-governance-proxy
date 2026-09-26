/**
 * Configuration parameters for the Governance Proxy.
 * All numerical weights, timing rates, and threshold constants are externalized here.
 */
export const GOVERNANCE_CONFIG = {
  S0_BASE_SCORE: 20,

  // Reference Risk Weights
  WEIGHTS: {
    READ_ONLY: -25,
    METADATA: -20,
    CREATE: 10,
    UPDATE: 15,
    DESTRUCTIVE_WRITE: 30,
    CREDENTIAL_ACCESS: 40,
    FINANCIAL_TRANSACTION: 35,
    PRIVILEGE_CHANGE: 40,
    CODE_EXECUTION: 35,
    NETWORK_CALL: 15,
    COMMUNICATION: 10,
    BULK_OPERATION: 20,
    PRODUCTION_SCOPE: 25
  },

  // Sensitive action types that explicitly override and suppress read-only discounts
  SENSITIVE_ACTION_TYPES: [
    "CREDENTIAL_ACCESS",
    "FINANCIAL_TRANSACTION",
    "PRIVILEGE_CHANGE"
  ],

  // Timing model thresholds based on research reading/review speeds
  TIMING: {
    GLOBAL_MIN_FLOOR_MS: 2000,
    PROSE_WPM_HARD: 344,
    PROSE_WPM_SOFT: 260,
    CODE_LINE_SEC_HARD: 1.2,
    CODE_LINE_SEC_SOFT: 2.0,
    CODE_LINE_MIN_HARD_SEC: 6.0,
    CODE_LINE_MIN_SOFT_SEC: 10.0,
    FIELD_SEC_HARD: 1.5,
    FIELD_SEC_SOFT: 3.0,
    APPROVAL_TTL_MS: 300000 // 5 minutes TTL
  },

  // Decision Zones and Fatigue limits
  ZONES: {
    ZONE_1_MAX: 30,
    ZONE_2_MAX: 60,
    MAX_FATIGUE_COUNT_10MIN: 5
  },

  DRIFT_LAMBDA: 5.0
};
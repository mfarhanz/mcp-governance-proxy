/**
 * Standard MCP Interceptor Tool Call interfaces
 */
export interface MCPToolCall {
  id: string;
  toolName: string;
  actorId: string;
  environment: "production" | "staging" | "development";
  arguments: Record<string, unknown>;
  actionType?: string;
  metadata?: {
    isBulk?: boolean;
    targetScope?: string;
    description?: string;
  };
}

export interface MCPToolCallResponse {
  status: "EXECUTED" | "SUSPENDED" | "REJECTED" | "HARD_FLAGGED";
  id: string;
  reason?: string;
  sessionId?: string;
  executionResult?: unknown;
}
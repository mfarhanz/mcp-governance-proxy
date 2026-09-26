import http from "node:http";
import { MCPInterceptor } from "../proxy/mcp-interceptor.js";
import { SessionStore } from "../storage/session-store.js";
import { AuditLogger } from "../storage/audit-logger.js";
import { MCPToolCall } from "../types/mcp.types.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

/**
 * Helper to parse JSON request bodies.
 */
function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch (err) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Helper to send standard JSON responses with CORS headers.
 */
function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: Record<string, unknown>
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    // 1. Intercept MCP Tool Call
    if (req.method === "POST" && url.pathname === "/intercept") {
      const toolCall = await parseJsonBody<MCPToolCall>(req);

      if (!toolCall.toolName || !toolCall.actionType) {
        sendJson(res, 400, {
          error: "Missing required fields: toolName and actionType are mandatory.",
        });
        return;
      }

      const decision = await MCPInterceptor.intercept(toolCall);
      sendJson(res, 200, { decision });
      return;
    }

    // 2. Resolve Suspended Approval Session
    if (req.method === "POST" && url.pathname === "/approve") {
      const body = await parseJsonBody<{
        sessionId: string;
        action: "APPROVE" | "REJECT";
        tClick?: number;
      }>(req);

      if (!body.sessionId || !body.action) {
        sendJson(res, 400, {
          error: "Missing required fields: sessionId and action are mandatory.",
        });
        return;
      }

      const tClick = body.tClick || Date.now();
      const resolution = await MCPInterceptor.resolveApproval(
        body.sessionId,
        body.action,
        tClick
      );

      const statusCode = resolution.success ? 200 : 400;
      sendJson(res, statusCode, resolution);
      return;
    }

    // 3. Get All Pending/Suspended Approval Sessions
    if (req.method === "GET" && url.pathname === "/pending") {
      const sessions = SessionStore.getAllSuspendedSessions();
      sendJson(res, 200, { sessions });
      return;
    }

    // 4. Get Audit Logs
    if (req.method === "GET" && url.pathname === "/logs") {
      const logs = AuditLogger.getRecentLogs();
      sendJson(res, 200, { logs });
      return;
    }

    // If Route Not Found
    sendJson(res, 404, { error: "Endpoint not found" });
  } catch (error: any) {
    sendJson(res, 500, {
      error: "Internal Server Error",
      message: error.message || "An unexpected error occurred.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`[Governance API] Server running on http://localhost:${PORT}`);
});

import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { MCPInterceptor } from "../proxy/mcp-interceptor.js";
import { RiskEngine } from "../core/risk-engine.js";
import { TimingEngine } from "../core/timing-engine.js";
import { IntegrityMonitor } from "../core/integrity.js";
import { SessionStore } from "../storage/session-store.js";
import { FatigueTracker } from "../core/fatigue-tracker.js";
import { AuditLogger } from "../storage/audit-logger.js";
import { ActionType, Zone } from "../types/risk.types.js";
import type { MCPToolCall } from "../types/mcp.types.js";

type DemoTool = {
  name: string;
  description: string;
  actionType: ActionType;
  environment: MCPToolCall["environment"];
  args: Record<string, unknown>;
};

const TOOLS: DemoTool[] = [
  {
    name: "read_customer_profile",
    description: "Read customer information",
    actionType: ActionType.READ_ONLY,
    environment: "production",
    args: { customerId: "CUST-1001" },
  },
  {
    name: "search_customer",
    description: "Search for a customer",
    actionType: ActionType.READ_ONLY,
    environment: "staging",
    args: { query: "John" },
  },
  {
    name: "create_customer",
    description: "Create a new customer record",
    actionType: ActionType.CREATE,
    environment: "staging",
    args: { name: "Alice", email: "alice@example.com" },
  },
  {
    name: "send_email",
    description: "Send an external email",
    actionType: ActionType.COMMUNICATION,
    environment: "production",
    args: {
      to: "customer@example.com",
      subject: "Account notification",
      body: "Your account requires attention.",
    },
  },
  {
    name: "delete_customer",
    description: "Permanently delete a customer",
    actionType: ActionType.DESTRUCTIVE_WRITE,
    environment: "production",
    args: { customerId: "CUST-1001" },
  },
  {
    name: "access_credentials",
    description: "Access a stored credential/secret",
    actionType: ActionType.CREDENTIAL_ACCESS,
    environment: "production",
    args: { credential: "PAYMENT_API_KEY" },
  },
  {
    name: "process_payment",
    description: "Execute a financial transaction",
    actionType: ActionType.FINANCIAL_TRANSACTION,
    environment: "production",
    args: {
      amount: 500,
      currency: "USD",
      recipient: "Vendor-A",
    },
  },
  {
    name: "change_permissions",
    description: "Change a user's privileges",
    actionType: ActionType.PRIVILEGE_CHANGE,
    environment: "production",
    args: {
      userId: "USER-1001",
      role: "admin",
    },
  },
  {
    name: "run_code",
    description: "Execute code/command",
    actionType: ActionType.CODE_EXECUTION,
    environment: "production",
    args: {
      command: "echo 'governance demo'",
      purpose: "demo",
    },
  },
];

function makeToolCall(tool: DemoTool): MCPToolCall {
  return {
    id: `interactive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    toolName: tool.name,
    actorId: "judge-demo-agent",
    environment: tool.environment,
    arguments: tool.args,
    actionType: tool.actionType,
  };
}

function riskLabel(zone: Zone): string {
  switch (zone) {
    case Zone.ZONE_1:
      return "LOW";
    case Zone.ZONE_2:
      return "MEDIUM";
    case Zone.ZONE_3_4:
      return "HIGH / CRITICAL";
  }
}

function printHeader(): void {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        MCP GOVERNANCE PROXY - INTERACTIVE DEMO          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("This simulates an AI agent requesting MCP tool execution.");
  console.log("The governance proxy decides whether the action can proceed.");
}

function printMenu(): void {
  console.log("\nAvailable tools:");
  console.log("──────────────────────────────────────────────────────────");

  TOOLS.forEach((tool, index) => {
    const previewCall = makeToolCall(tool);
    const risk = RiskEngine.evaluate(previewCall);

    console.log(
      `${String(index + 1).padStart(2, " ")}. ` +
      `${tool.name.padEnd(24, " ")} ` +
      `[${riskLabel(risk.zone).padEnd(14, " ")}] ` +
      `${tool.description}`
    );
  });

  console.log(" 0. Exit");
}

function printRiskAnalysis(
  tool: DemoTool,
  risk: ReturnType<typeof RiskEngine.evaluate>,
  floors: ReturnType<typeof TimingEngine.calculateFloors>,
  hash: string,
): void {
  console.log("\n");
  console.log("┌──────────────────────────────────────────────────────────┐");
  console.log("│                    GOVERNANCE ANALYSIS                   │");
  console.log("└──────────────────────────────────────────────────────────┘");

  console.log(`Tool:             ${tool.name}`);
  console.log(`Action type:      ${tool.actionType}`);
  console.log(`Environment:      ${tool.environment}`);
  console.log(`Risk score:       ${risk.finalScore.toFixed(2)}`);
  console.log(`Risk zone:        ${risk.zone}`);
  console.log(`Risk level:       ${riskLabel(risk.zone)}`);

  console.log("\nRisk factors:");
  if (risk.ruleHits.length === 0) {
    console.log("  • No additional risk modifiers");
  } else {
    for (const hit of risk.ruleHits) {
      const sign = hit.weight >= 0 ? "+" : "";
      console.log(`  • ${hit.description}: ${sign}${hit.weight}`);
    }
  }

  console.log("\nReview requirements:");
  console.log(`  • Minimum review time: ${floors.hardFloorMs} ms`);
  console.log(`  • Timely review target: ${floors.softFloorMs} ms`);
  console.log(`  • Payload fields:       ${floors.fieldCount}`);
  console.log(`  • Payload words:        ${floors.wordCount}`);
  console.log(`  • Approval hash:        ${hash}`);
}

async function waitForEnter(rl: Interface, message: string): Promise<number> {
  const start = Date.now();
  await rl.question(message);
  return Date.now() - start;
}

async function runOneTool(rl: Interface, tool: DemoTool): Promise<void> {
  const toolCall = makeToolCall(tool);

  console.log("\n");
  console.log("============================================================");
  console.log("                    AGENT TOOL REQUEST");
  console.log("============================================================");
  console.log(`Agent:       ${toolCall.actorId}`);
  console.log(`Tool:        ${tool.name}`);
  console.log(`Description: ${tool.description}`);
  console.log(`Environment: ${tool.environment}`);
  console.log("Arguments:");
  console.log(JSON.stringify(tool.args, null, 2));

  const risk = RiskEngine.evaluate(
    toolCall,
    SessionStore.getActorHistory(toolCall.actorId),
  );
  const floors = TimingEngine.calculateFloors(toolCall);
  const hash = IntegrityMonitor.generateCanonicalHash(tool.args);

  printRiskAnalysis(tool, risk, floors, hash);

  console.log("\nSending request through MCP Governance Proxy...");

  const decision = await MCPInterceptor.intercept(toolCall);

  console.log("\n┌──────────────────────────────────────────────────────────┐");
  console.log("│                    PROXY DECISION                       │");
  console.log("└──────────────────────────────────────────────────────────┘");
  console.log(`Status:       ${decision.status}`);
  console.log(`Reason:       ${decision.reason ?? "—"}`);
  console.log(`Risk score:   ${decision.riskScore}`);
  console.log(`Risk zone:    ${decision.zone}`);

  if (decision.status === "APPROVED") {
    console.log("\n GOVERNANCE: AUTOMATICALLY APPROVED");
    console.log(" TOOL:       EXECUTION RELEASED");
    console.log(" AUDIT:      EVENT RECORDED");

    console.log("\n[Demo] Simulated tool execution complete.");
    return;
  }

  if (decision.status !== "SUSPENDED" || !decision.sessionId) {
    console.log("\n GOVERNANCE: REQUEST BLOCKED");
    return;
  }

  console.log("\n HUMAN APPROVAL REQUIRED");
  console.log("The tool has NOT been executed.");
  console.log("\nReview the request above before deciding.");

  const reviewTime = await waitForEnter(
    rl,
    "\nPress ENTER when you have reviewed the request...",
  );

  console.log(`Review time: ${reviewTime} ms`);

  const actionInput = (
    await rl.question(
      "\nChoose an action:\n  1. Approve\n  2. Reject\n\nYour choice: ",
    )
  ).trim();

  if (actionInput === "2") {
    const result = await MCPInterceptor.resolveApproval(
      decision.sessionId,
      "REJECT",
      Date.now(),
    );

    console.log("\n HUMAN DECISION: REJECTED");
    console.log(`Result: ${result.message}`);
    console.log(" TOOL:   NOT EXECUTED");
    console.log(" AUDIT:  Rejection recorded");
    return;
  }

  if (actionInput !== "1") {
    console.log("\nInvalid choice. Treating the request as rejected.");
    await MCPInterceptor.resolveApproval(
      decision.sessionId,
      "REJECT",
      Date.now(),
    );
    console.log(" TOOL: NOT EXECUTED");
    return;
  }

  // Use the real click timestamp so the governance proxy measure the judge's actual review time.
  const tClick = Date.now();

  const result = await MCPInterceptor.resolveApproval(
    decision.sessionId,
    "APPROVE",
    tClick,
  );

  if (!result.success) {
    console.log("\n APPROVAL NOT ACCEPTED");
    console.log(`Verdict: ${result.verdict ?? "UNKNOWN"}`);
    console.log(`Reason:  ${result.message}`);
    console.log(" TOOL:   NOT EXECUTED");
    return;
  }

  console.log("\n HUMAN DECISION: APPROVED");
  console.log(`Timing verdict: ${result.verdict}`);
  console.log(`Result:         ${result.message}`);
  console.log(" TOOL:         EXECUTION RELEASED");
  console.log(" AUDIT:        Approval recorded");

  console.log("\n[Demo] Simulated tool execution complete.");
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  // Clean state for a fresh judge session.
  FatigueTracker.reset();
  AuditLogger.clearMemoryLogs();

  printHeader();

  try {
    while (true) {
      printMenu();

      const answer = (
        await rl.question("\nSelect a tool to request (0 to exit): ")
      ).trim();

      const selection = Number(answer);

      if (selection === 0) {
        console.log("\nExiting MCP Governance Proxy demo.");
        break;
      }

      if (
        !Number.isInteger(selection) ||
        selection < 1 ||
        selection > TOOLS.length
      ) {
        console.log("\nInvalid selection. Please choose a number from the menu.");
        continue;
      }

      await runOneTool(rl, TOOLS[selection - 1]);

      await rl.question(
        "\nPress ENTER to return to the tool menu...",
      );
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\nDemo failed:", error);
  process.exitCode = 1;
});

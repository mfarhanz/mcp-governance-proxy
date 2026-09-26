import { GOVERNANCE_CONFIG } from "../config/default.config.js";
import { MCPToolCall } from "../types/mcp.types.js";
import { TimingFloors, TimingVerdict } from "../types/governance.types.js";
import { ActionType } from "../types/risk.types.js";

export class TimingEngine {
  // Calculates the hard and soft dynamic timing floors based on tool argument payload density.
  //Hard Timing floors mean that the user is fatigued.
  //Soft Timing floors indicate that the user is attentive to the high risk prompts.
  public static calculateFloors(toolCall: MCPToolCall): TimingFloors {
    const payloadStr = JSON.stringify(toolCall.arguments || {});

        // Word, line, and field counts
        const words = payloadStr.match(/\b\w+\b/g) || [];
        const wordCount = words.length;
        const lineCount = (payloadStr.match(/\n/g) || []).length + 1;
        const fieldCount = Object.keys(toolCall.arguments || {}).length;

        // Config fallbacks to ensure compatibility
        const proseWpmHard = GOVERNANCE_CONFIG.TIMING.PROSE_WPM_HARD;
        const proseWpmSoft = GOVERNANCE_CONFIG.TIMING.PROSE_WPM_SOFT;
        const globalMinFloorMs = GOVERNANCE_CONFIG.TIMING.GLOBAL_MIN_FLOOR_MS;

        // Prose reading time floor
        const proseSecHard = (wordCount / proseWpmHard) * 60;
        const proseSecSoft = (wordCount / proseWpmSoft) * 60;

        // Code line review floor
        let codeSecHard = lineCount * GOVERNANCE_CONFIG.TIMING.CODE_LINE_SEC_HARD;
        let codeSecSoft = lineCount * GOVERNANCE_CONFIG.TIMING.CODE_LINE_SEC_SOFT;

        // Enforce min thresholds if code execution / structured script detected
        const actionTypeStr = (toolCall.actionType || "").toUpperCase();
        if (actionTypeStr === ActionType.CODE_EXECUTION) {
            codeSecHard = Math.max(codeSecHard, GOVERNANCE_CONFIG.TIMING.CODE_LINE_MIN_HARD_SEC);
            codeSecSoft = Math.max(codeSecSoft, GOVERNANCE_CONFIG.TIMING.CODE_LINE_MIN_SOFT_SEC);
        }

        // Field inspection time floor
        const fieldSecHard = fieldCount * GOVERNANCE_CONFIG.TIMING.FIELD_SEC_HARD;
        const fieldSecSoft = fieldCount * GOVERNANCE_CONFIG.TIMING.FIELD_SEC_SOFT;

        // Sum total dynamic seconds required
        const totalHardSec = proseSecHard + codeSecHard + fieldSecHard;
        const totalSoftSec = proseSecSoft + codeSecSoft + fieldSecSoft;

        const hardFloorMs = Math.max(
            globalMinFloorMs,
            Math.round(totalHardSec * 1000)
        );

        const softFloorMs = Math.max(
            hardFloorMs + 1000,
            Math.round(totalSoftSec * 1000)
        );

        return {
            hardFloorMs,
            softFloorMs,
            wordCount,
            lineCount,
            fieldCount
        };
    }

  // Evaluates the human response timing delta against the calculated floors.
  public static evaluateTiming(
    tShown: number,
    tClick: number,
    floors: TimingFloors
  ): TimingVerdict {
    const deltaMs = tClick - tShown;

        if (deltaMs < floors.hardFloorMs) {
            return TimingVerdict.TOO_FAST;
        } else if (deltaMs < floors.softFloorMs) {
            return TimingVerdict.FAST;
        }

        return TimingVerdict.TIMELY;
    }
}

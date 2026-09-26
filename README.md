# MCP Governance Proxy

**A deterministic, AI-free layer that sits between an AI agent and its tools — scoring every action, matching human friction to actual measured attention, and cryptographically locking what was approved so it can't be silently changed before it runs.**

> Status: reference specification / early implementation. Constants below are calibrated starting points, not fixed truths — see [Configuration](#configuration--open-items).

---

## The Problem

AI agents connected to real tools through MCP can now take consequential actions — deleting data, moving money, modifying production systems. The only safeguard most systems offer is a human "approve / reject" prompt. That safeguard is failing quietly, and for reasons that are documented rather than speculative:

- **Habituation is neurological, not a discipline failure.** Brain-imaging research shows attention to repeated warnings drops sharply after just the *second* exposure and keeps falling with each repeat. Roughly half of users click through security warnings in under two seconds.
- **The rubber-stamp failure is measured at population scale.** Real users spend a median of ~14 seconds on privacy policies and terms of service that would take 15–32 minutes to genuinely read. Left ungated, humans do not self-regulate toward real review — they approve reflexively.
- **Existing MCP governance tools don't address this.** Enterprise gateways solve identity, auth, and rate limiting. Scanners catch malicious tool descriptions. Policy engines give deterministic allow/deny. None of them treat the **human approver as a variable-quality sensor** — they all assume a click means a read. The research says that assumption is false.
- **There's also a mechanical integrity gap (TOCTOU).** Even a genuinely attentive approval can be undermined if the request is silently altered between approval and execution. This is a named vulnerability class with a documented CVE (Cursor, [CVE-2025-54136](https://nvd.nist.gov/vuln/detail/CVE-2025-54136)), where an approved config changed before execution without re-prompting.

**In short: two layered failures — approvals that were never genuinely read, and approvals that no longer match what actually executes.**

## The Solution, in One Sentence

A deterministic layer, with **no AI inside it**, that intercepts `tools/call` requests, scores them with transparent rules, decides how much friction a human actually needs to see, and hash-locks the exact approved payload against tampering before execution.

## Core Design Principles

1. **No AI in the decision path.** Every decision is traceable to a named rule, a formula, or a stored value — nothing learned, nothing opaque.
2. **The human is a variable-quality sensor, not a fixed oracle.** The system detects when an approval looks reflexive and responds to that evidence, rather than assuming every click was a real read.
3. **Approval is binding to exact content, not a category.** "Approved" means the *exact* byte-for-byte request — not "this kind of action is generally fine."
4. **Minimize unnecessary friction.** Every unneeded interruption erodes vigilance for the next one. Attentive, timely responses get no extra friction at all.
5. **Everything is logged, for two purposes:** audit (what happened) and self-correction (whether the system's own thresholds and weights are right).

---

## Decision Pipeline

```
AI Agent issues tools/call
        │
        ▼
Proxy intercepts, computes Risk Score (S)
        │
        ▼
   S < 30 (Zone 1)? ──YES──▶ Auto-execute*
        │                     (unless toggled off for this
       NO                      tool / actor / scope)
        │
        ▼
30 ≤ S < 60 AND Fatigue Score (F) < threshold (Zone 2)?
        │
       YES ──▶ Auto-execute + async audit log
        │
       NO
        │
        ▼
   SUSPEND — freeze t_min, t_max, hash_approval, t_shown
   Human reviews
        │
        ▼
   Response at t_click
        │
   ┌────┴────┐
 REJECT     ACCEPT
   │           │
Terminate,   Classify delta = t_click − t_shown
log, done    against frozen hard/soft floors
                   │
     ┌─────────────┼──────────────┐
 < hard floor   hard ≤ x < soft   ≥ soft floor
 TOO_FAST       FAST (plausible)  TIMELY
     │               │                │
Re-prompt with   Log flag only,   Proceed directly
impact detail,   no interrupt     to hash/TTL gate
require 2nd            │                │
confirmation ──────────┴────────────────┘
                        │
                        ▼
              Hash/TTL gate (§ Integrity Gate)
                        │
        MATCH + FRESH ─▶ EXECUTE
        MISMATCH / EXPIRED ─▶ HARD FLAG
        (cancel, revoke reviewer scope, alert,
         return error to agent)
```

<sup>*Auto-execute toggle: a human can disable Zone-1 auto-execution per tool, per actor, per environment, or globally, with a time bound. Toggling is **forward-only** — it never retroactively affects already-dispatched actions. Every toggle change is itself logged (who, when, scope, reason).</sup>

---

## Risk Scoring

```
S = S0 + Σ wi·ri(x) + λ·|z(x)|
```

- **S0** — base score (e.g. `20`)
- **Σ wi·ri(x)** — sum of weighted rule hits (static, transparent, human-readable)
- **λ·|z(x)|** — statistical drift term: how unusual this call is versus the tool/actor's historical baseline (rolling mean/std or median/MAD), scaled by tunable weight `λ`

### Precedence rule (not purely additive)

Sensitive-scope rules — credential access, financial transactions, privilege changes — **override and suppress** generic discounts like "read-only," rather than just being summed against them. A credential *read* is still a credential-access risk; the read-only discount must not apply. This is implemented as an explicit precedence step **before** summation, not left to emerge from weight tuning.

### Reference risk table (starting weights — tune via audit data)

| Approval type | Base weight | Notes |
|---|---:|---|
| Read-only retrieval (get/list/search/query) | −25 | No state change |
| Metadata/status check | −20 | Zero side effects |
| Create new resource | +10 | Reversible by deletion |
| Update/edit existing resource | +15 | Reversible only if versioned |
| Destructive write (delete/drop/purge) | +30 | Largely irreversible |
| Credential/secret access | +40 | Suppresses read-only discount |
| Financial transaction | +35 | Suppresses read-only discount |
| Privilege/permission change | +40 | Suppresses read-only discount |
| Code/command execution | +35 | Arbitrary execution risk |
| External network call | +15 | Exfiltration surface |
| Communication/notification send | +10 | Externally visible, retractable |

**Modifiers** (stack onto the base type, not standalone types):

| Modifier | Weight |
|---|---:|
| Bulk operation | +20 |
| Production-scope target | +25 |

### Zones

| Zone | Score range | Behavior |
|---|---|---|
| 1 | S < 30 | Auto-execute (unless toggled off) |
| 2 | 30 ≤ S < 60 **and** F below threshold | Auto-execute + async audit log |
| 3/4 | Everything else | Suspend, measure response, apply friction as needed |

---

## Timing Model — Detecting Reflexive Approval

When a request is suspended and shown to a human, the proxy **computes and freezes**, before any human input arrives:

- `t_shown` — server-side display timestamp (never client-reported)
- `hash_approval` — SHA-256 of the canonical (sorted-key) JSON of `{tool, arguments}`
- **Hard** and **soft** time floors, based on content type in the request

| Content type | Hard floor (implausible below) | Soft floor (brisk but plausible below) |
|---|---|---|
| Prose (description/message text) | word_count ÷ 344 wpm | word_count ÷ 260 wpm |
| Code (diff/query/script) | max(6s, lines × 1.2s) | max(10s, lines × 2.0s) |
| Structured fields | fields × 1.5s | fields × 3.0s |

Mixed-content requests **sum** each component's contribution. A global absolute floor of ~2–4 seconds applies regardless of content — no genuine human decision happens faster than that.

### Classification on response

Using `delta = t_click − t_shown`:

| Verdict | Condition | Behavior |
|---|---|---|
| **TOO_FAST** | `delta < hard_total` | Re-prompt with explicit impact detail; require a second, deliberate confirmation |
| **FAST (plausible)** | `hard_total ≤ delta < soft_total` | Log as a flag for later analysis; do not interrupt |
| **TIMELY** | `delta ≥ soft_total` | Proceed with no additional friction |

**Rejections are always terminal and clean** — no re-prompting on a fast reject, since rejecting is inherently the conservative action.

> The wpm/line/field constants are starting points calibrated from published reading-speed and code-review research — not fixed truths. They live in config and are meant to be revisited as real approval-outcome data accumulates.

---

## Integrity Gate — Before Execution

Immediately before any action executes (after a TIMELY or successfully re-confirmed TOO_FAST response), **three independent checks** run. Each has its own failure meaning and is never collapsed into a single boolean, so the audit log can distinguish "the human didn't read it" from "the request was tampered with" from "the approval simply expired."

| Check | Failing condition | What failure means | Response |
|---|---|---|---|
| Hash match | `hash_execution ≠ hash_approval` | Request altered after approval (TOCTOU) | Hard flag — treat as security incident, cancel, alert |
| TTL freshness | `now − t_shown > TTL` | Approval has gone stale | Silent reject, loop back to re-approval, no reviewer blame |
| (Future) Dwell / value-echo | Human didn't demonstrate engagement | Behavioral, not integrity | Hard flag, reviewer-level scrutiny |

---

## Audit Log

Every decision, regardless of zone or outcome, records at minimum:

- Timestamp, tool name, actor/agent ID, full canonical request payload
- Computed risk score `S` and every rule that fired (with its weight)
- z-score / drift value used
- Zone assigned and whether the auto-execute toggle affected the path
- `t_shown`, `t_click`, computed hard/soft floors, and the timing verdict
- `hash_approval`, `hash_execution`, and match result
- Final outcome (executed / rejected / hard-flagged) and reason

This log isn't just compliance record-keeping — it's the dataset the system uses to correct its own weights, floors, and thresholds over time. It's a first-class deliverable, not a side effect.

---

## What Makes This Different

Most MCP security tooling protects against a malicious agent or a malicious tool description. This protects against **approval theater** — the moment a human is nominally in the loop but not actually engaged. It's designed to be a minimal, forkable reference implementation — a scoring function, a timing model, a hash lock, and a state machine — rather than a heavyweight enterprise platform. That's the gap left open by current gateway- and scanner-focused approaches.

|  | Enterprise gateways | Malicious-description scanners | Policy engines | **This project** |
|---|---|---|---|---|
| Identity / auth / rate limiting | ✅ | | | |
| Malicious tool detection | | ✅ | | |
| Deterministic allow/deny | | | ✅ | ✅ |
| Treats approval as variable-quality | | | | ✅ |
| TOCTOU / tamper lock on approved payload | | | | ✅ |

---

## Configuration & Open Items

All numeric constants (weights, wpm, TTL, thresholds) are externalized to config — never hardcoded — since they're calibrated guesses meant to be corrected by real audit data.

The following are **not yet resolved** and are flagged for discussion before/during implementation:

- [ ] **Fatigue score (F) formula.** Needs a concrete rolling-window definition (count, rate, or decay-weighted) before Zone 2's gate can be implemented.
- [ ] **Cold-start policy for the drift term.** New tools/actors have no history; needs an explicit fallback (global baseline, grace period, or wider tolerance).
- [ ] **Multi-step / chained tool calls.** This spec scores one `tools/call` at a time. Whether a sequence of individually-low-risk calls needs session-level aggregation is unresolved.
- [ ] **Dual-approval mechanics.** Who qualifies as a second approver, and what happens if none responds, is undefined.

Contributions toward any of these are especially welcome — see [Contributing](#contributing).

---

## Getting Started

> Implementation is in progress. This section will be filled in with install/run instructions once a working proxy lands in this repo.

```bash
# placeholder
git clone https://github.com/<org>/mcp-governance-proxy.git
cd mcp-governance-proxy
```

## Contributing

This is meant to be a minimal, forkable reference implementation — issues and PRs that tighten the scoring math, propose a fatigue-score formula, or add real audit-log-driven calibration are especially welcome. Please open an issue for any of the [open items](#configuration--open-items) before submitting a large PR so design direction can be agreed on first.


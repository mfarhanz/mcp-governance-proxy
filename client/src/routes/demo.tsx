/* eslint-disable prettier/prettier */
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowLeft, Check, Gauge, Link2, Play, Power, RefreshCw, Server, Shield, Siren, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { demoRequests, type GuardianRequest, type RiskZone, zoneLabel } from "@/lib/guardian-data";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "Control Room — GUARDIAN" },
    { name: "description", content: "Operate the GUARDIAN MCP risk, approval, integrity, and circuit-breaker control room." },
    { property: "og:title", content: "GUARDIAN Control Room" },
    { property: "og:description", content: "A live MCP governance gateway simulation with optional external API connection." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ControlRoom,
});

type LogEvent = { id: string; time: string; type: string; message: string; tone?: "danger"|"success"|"warning" };
type InterceptResponse = { id: string; status: "EXECUTED"|"SUSPENDED"|"REJECTED"|"HARD_FLAGGED"; reason?: string; sessionId?: string };
type BackendRuleHit = { ruleId: string; description: string; weight: number };
type PendingSession = { sessionId: string; tShown?: number; riskResult: { finalScore: number; zone: RiskZone; ruleHits: BackendRuleHit[] } };
type AuditRecord = { id: string; toolName: string; actorId: string; computedScore: number; zone: RiskZone; ruleHits: BackendRuleHit[]; outcome: string };
const API_DEFAULT = "http://localhost:3000";

function ControlRoom() {
  const [apiUrl, setApiUrl] = useState(API_DEFAULT);
  const [liveMode, setLiveMode] = useState(true);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [requestIndex, setRequestIndex] = useState(0);
  const [request, setRequest] = useState<GuardianRequest>(() => demoRequests[0] ?? fallbackRequest());
  const [status, setStatus] = useState("AWAITING DECISION");
  const [breaker, setBreaker] = useState(false);
  const [alert, setAlert] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [approvals, setApprovals] = useState(94);
  const [requests, setRequests] = useState(128);
  const [highRisk, setHighRisk] = useState(23);
  const [approvalTimes, setApprovalTimes] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>(() => initialLogs());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addEvent = useCallback((type: string, message: string, tone?: LogEvent["tone"]) => {
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString("en-GB", { hour12:false }), type, message, ...(tone ? { tone } : {}) }, ...prev].slice(0, 60));
  }, []);

  const stopTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutRef.current = null; countdownRef.current = null;
  }, []);

  const apiFetch = useCallback(async (path: string, init?: RequestInit, allowClientError = false) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, { ...init, signal: controller.signal, headers: { "Content-Type": "application/json", ...init?.headers } });
      if (!response.ok && !(allowClientError && response.status >= 400 && response.status < 500)) throw new Error(`API ${response.status}`);
      return await response.json() as Record<string, unknown>;
    } finally { clearTimeout(timer); }
  }, [apiUrl]);

  const checkConnection = useCallback(async (announce = true) => {
    if (!liveMode) { setConnected(false); return false; }
    setChecking(true);
    try {
      await apiFetch("/pending"); setConnected(true);
      if (announce) addEvent("BACKEND CONNECTED", apiUrl, "success");
      return true;
    } catch {
      setConnected(false);
      if (announce) addEvent("SIMULATION FALLBACK", "External API unavailable — local safeguards active", "warning");
      return false;
    } finally { setChecking(false); }
  }, [addEvent, apiFetch, apiUrl, liveMode]);

  const loadRequest = useCallback(async (nextIndex: number) => {
    const base = demoRequests[nextIndex % demoRequests.length] ?? fallbackRequest();
    let next = { ...base, id: `${base.id.slice(0,-2)}${String(42 + nextIndex).padStart(2,"0")}` };
    setBusy(true); setCountdown(null); setStatus("SCANNING"); setRequests((n)=>n+1);
    if (liveMode) {
      try {
        const res = await apiFetch("/intercept", { method:"POST", body: JSON.stringify({ id: next.id, toolName: next.toolName, actorId: next.actorId, environment: next.environment, arguments: next.arguments, actionType: next.actionType, ...(next.metadata ? { metadata: next.metadata } : {}) }) }) as unknown as InterceptResponse;
        const needsHuman = res.status === "SUSPENDED" || res.status === "HARD_FLAGGED";
        next = { ...next, approvalRequired: needsHuman, tShown: Date.now() };
        if (res.sessionId) next.sessionId = res.sessionId;
        // Enrich with backend risk analysis: /pending for suspended sessions, /logs for auto-executed calls
        try {
          if (res.sessionId) {
            const pending = await apiFetch("/pending");
            const session = (pending["sessions"] as PendingSession[] | undefined)?.find(s => s.sessionId === res.sessionId);
            if (session) next = { ...next, riskScore: session.riskResult.finalScore, zone: session.riskResult.zone, ruleHits: session.riskResult.ruleHits, ...(session.tShown ? { tShown: session.tShown } : {}) };
          } else {
            const logData = await apiFetch("/logs");
            const logs = (logData["logs"] as AuditRecord[] | undefined) ?? [];
            const rec = [...logs].reverse().find(l => l.toolName === next.toolName && l.actorId === next.actorId);
            if (rec) next = { ...next, riskScore: rec.computedScore, zone: rec.zone, ruleHits: rec.ruleHits };
          }
        } catch { /* keep local analysis */ }
        if (res.status === "HARD_FLAGGED") next = { ...next, zone: "ZONE_3_4" };
        if (res.status === "REJECTED") { next = { ...next, approvalRequired: false }; }
        if (res.reason) addEvent("GATEWAY", `${res.status} · ${res.reason}`, res.status === "EXECUTED" ? "success" : res.status === "REJECTED" ? "danger" : "warning");
        setConnected(true);
      } catch { setConnected(false); }
    }
    setRequest(next); setRequestIndex(nextIndex); setBusy(false);
    addEvent("REQUEST RECEIVED", `${next.toolName} · ${next.id}`);
    setTimeout(() => addEvent("RISK ENGINE", `Score ${next.riskScore} · ${zoneLabel(next.zone)}`, next.riskScore >= 60 ? "danger" : "warning"), 250);
    if (next.riskScore >= 60) setHighRisk((n)=>n+1);
    if (next.approvalRequired) {
      setStatus("AWAITING DECISION"); setTimeout(() => addEvent("APPROVAL REQUIRED", "Human decision required", "warning"), 500);
    } else {
      setStatus("AUTO EXECUTING"); setTimeout(() => {
        setStatus("EXECUTED"); addEvent("EXECUTION", "Low-risk action auto-authorized", "success"); startNextRequest(nextIndex);
      }, 1100);
    }
  }, [addEvent, apiFetch, liveMode]);

  const startNextRequest = useCallback((fromIndex = requestIndex) => {
    stopTimers();
    if (breaker) return;
    const delay = 10 + Math.floor(Math.random() * 11);
    setCountdown(delay);
    let remaining = delay;
    countdownRef.current = setInterval(() => { remaining -= 1; setCountdown(Math.max(0, remaining)); }, 1000);
    timeoutRef.current = setTimeout(() => { stopTimers(); void loadRequest(fromIndex + 1); }, delay * 1000);
  }, [breaker, loadRequest, requestIndex, stopTimers]);

  const decide = async (action: "APPROVE"|"REJECT") => {
    if (busy || status !== "AWAITING DECISION") return;
    setBusy(true);
    if (connected && request.sessionId) {
      try {
        const response = await apiFetch("/approve", { method:"POST", body: JSON.stringify({ sessionId: request.sessionId, action, tClick: Date.now() }) }, true);
        if (response["success"] === false) {
          const st = String(response["status"] ?? "");
          addEvent(st === "TOO_FAST" ? "TOO FAST" : st === "EXPIRED" ? "SESSION EXPIRED" : "DECISION HELD", String(response["message"] ?? "Review time required"), "warning");
          if (st === "EXPIRED") { setStatus("EXPIRED"); setTimeout(()=>startNextRequest(), 800); }
          setBusy(false); return;
        }
        if (response["message"]) addEvent("GATEWAY", String(response["message"]), action === "APPROVE" ? "success" : "danger");
      } catch { setConnected(false); addEvent("SIMULATION FALLBACK", "Decision completed locally", "warning"); }
    }
    if (action === "APPROVE") {
      const now = Date.now(); const recent = [...approvalTimes.filter(t => now - t < 45000), now];
      setApprovalTimes(recent); setApprovals(n=>n+1); setStatus("APPROVED");
      addEvent("HUMAN DECISION", "APPROVED", "success");
      setTimeout(()=>addEvent("HASH VERIFIED", "Integrity check passed", "success"), 450);
      setTimeout(()=>addEvent("EXECUTION", "Execution authorized", "success"), 850);
    } else { setStatus("REJECTED"); addEvent("HUMAN DECISION", "REJECTED", "danger"); setTimeout(()=>addEvent("EXECUTION", "Execution blocked", "danger"), 450); }
    setTimeout(()=>{ setBusy(false); startNextRequest(); }, 1100);
  };

  const triggerBreaker = () => { stopTimers(); setBreaker(true); setAlert(true); setCountdown(null); setStatus("FLOW PAUSED"); setRequests(n=>n+20); addEvent("CIRCUIT BREAKER", "20-request burst detected — automation paused", "danger"); setTimeout(()=>setAlert(false), 3200); };
  const resetBreaker = () => { setBreaker(false); setStatus(request.approvalRequired ? "AWAITING DECISION" : "QUEUED"); addEvent("BREAKER RESET", "Automated flow restored", "success"); startNextRequest(); };
  const fatigueElevated = approvalTimes.filter(t => Date.now() - t < 45000).length >= 3;

  useEffect(() => { void checkConnection(false); return stopTimers; }, []);
  useEffect(() => {
    if (!liveMode || !connected) return;
    const poll = setInterval(async () => { try { const data = await apiFetch("/logs"); if (Array.isArray(data["logs"]) && data["logs"].length) setConnected(true); } catch { setConnected(false); addEvent("CONNECTION LOST", "Switched to local simulation", "warning"); } }, 7000);
    return () => clearInterval(poll);
  }, [addEvent, apiFetch, connected, liveMode]);

  return <main className="control-room min-h-screen bg-background text-foreground">
    {alert && <div className="breaker-alert"><Siren/><strong>Circuit breaker tripped</strong><span>Automated execution paused</span></div>}
    <header className="control-header"><div><Link to="/" className="brand-mark"><Shield className="fill-current"/>GUARDIAN<span>// CONTROL ROOM</span></Link><p>Governance command interface / operator station 01</p></div><div className="flex flex-wrap items-center justify-end gap-3"><div className={`system-state ${breaker?"danger":""}`}><i/>{breaker?"SYSTEM PAUSED":"SYSTEM ONLINE"}<span>{breaker?"Manual reset required":"Governance gate active"}</span></div><Button variant="outline" size="icon" aria-label="Connection settings" title="Connection settings" onClick={()=>setConfigOpen(!configOpen)}><Server/></Button><Button asChild variant="outline" size="icon" aria-label="Return home" title="Return home"><Link to="/"><ArrowLeft/></Link></Button></div></header>
    {configOpen && <section className="connection-panel"><div><span className="panel-kicker">External Node API</span><strong>{connected?"CONNECTED":"SIMULATION ACTIVE"}</strong></div><label>Server URL<input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} /></label><label className="mode-switch"><input type="checkbox" checked={liveMode} onChange={e=>{setLiveMode(e.target.checked);if(!e.target.checked)setConnected(false)}}/><span>{liveMode?"Live + fallback":"Simulation only"}</span></label><Button onClick={()=>void checkConnection()} disabled={!liveMode||checking}>{checking?<RefreshCw className="animate-spin"/>:<Link2/>}Test connection</Button></section>}

    <section className="stats-strip">{[["Requests",requests],["High risk",highRisk],["Approvals",approvals]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}<div className={breaker?"trip-text":""}><span>Circuit breaker</span><strong>{breaker?"TRIPPED":"ARMED"}</strong></div><div><span>Operating mode</span><strong className={connected?"online-text":"warning-text"}>{connected?"LIVE API":"SIMULATION"}</strong></div></section>

    <div className="control-grid">
      <div className="space-y-4">
        <section className={`request-console ${status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : ""}`}>
          <div className="panel-heading"><div><span className="panel-kicker">Active intercept / {request.id}</span><h1>{request.toolName}</h1></div><div className="request-status"><Activity/>{status}</div></div>
          <div className="request-layout">
            <div className="request-details"><DataRow label="Request ID" value={request.id}/><DataRow label="Actor" value={request.actorId}/><DataRow label="Environment" value={request.environment}/><div><span>Arguments</span><pre>{JSON.stringify(request.arguments,null,2)}</pre></div></div>
            <RiskMeter score={request.riskScore} zone={request.zone}/>
          </div>
          <div className="rules-fired"><span>Rules fired</span><div>{request.ruleHits.length ? request.ruleHits.map(rule=><div key={rule.ruleId}><strong>{rule.ruleId}</strong><small>{rule.description}</small><b>+{rule.weight}</b></div>) : <div><strong>CLEAR</strong><small>No elevated-risk rules</small><b>+0</b></div>}</div></div>
        </section>

        <section className="decision-console"><div><span className="panel-kicker">Human authority gate</span><h2>{request.approvalRequired ? "Human decision required" : "Auto-execution permitted"}</h2><p>{request.approvalRequired ? "This action is waiting for an explicit administrator decision." : "Policy permits this low-risk action to continue without interruption."}</p></div><div className="decision-actions">{request.approvalRequired ? <><Button onClick={()=>void decide("APPROVE")} disabled={busy||breaker||status!=="AWAITING DECISION"} className="approve-button"><Check/>Approve</Button><Button onClick={()=>void decide("REJECT")} disabled={busy||breaker||status!=="AWAITING DECISION"} className="reject-button"><X/>Reject</Button></> : <div className="auto-badge"><Play/>Autonomous lane</div>}<div className="next-counter"><span>{breaker?"FLOW PAUSED":countdown===null?"NEXT REQUEST":"NEXT REQUEST"}</span><strong>{breaker?"—":countdown===null?"PENDING":`${countdown}s`}</strong></div></div></section>

        <section className="systems-grid"><div className="panel-heading"><div><span className="panel-kicker">Subsystem telemetry</span><h2>Safety systems</h2></div><Gauge/></div>{["Risk engine","Approval manager","Hash manager","Audit logger"].map(x=><div className="system-row" key={x}><span><i/>{x}</span><b>ONLINE</b></div>)}<div className="system-row"><span><i className={breaker?"red-dot":""}/>Circuit breaker</span><b className={breaker?"trip-text":""}>{breaker?"TRIPPED":"ARMED"}</b></div></section>
        <section className="safety-actions"><div><span className="panel-kicker">Circuit breaker drill</span><h2>{breaker?"Automation is locked":"Burst protection standing by"}</h2><p>{breaker?"Reset the breaker to resume request handling.":"Inject a controlled 20-request burst to validate emergency controls."}</p></div><Button className={breaker?"reset-button":"burst-button"} onClick={breaker?resetBreaker:triggerBreaker}>{breaker?<><Power/>Reset breaker</>:<><Zap/>Simulate request burst</>}</Button></section>
      </div>

      <aside className="space-y-4">
        <section className={`fatigue-panel ${fatigueElevated?"elevated":""}`}><div><span className="panel-kicker">Behavioral safeguard</span><h2>Approval fatigue</h2></div><div className="fatigue-status"><i/><strong>{fatigueElevated?"ELEVATED":"NORMAL"}</strong></div><div className="fatigue-bars">{[1,2,3,4,5].map((n)=><i key={n} className={n <= Math.min(5,approvalTimes.length+1)?"active":""}/>)}</div><p>{fatigueElevated?"Rapid approval pattern detected.":"Approval cadence is within normal bounds."}</p><small>Deterministic timing simulation — not machine learning.</small></section>
        <section className="event-console"><div className="panel-heading sticky top-0"><div><span className="panel-kicker">Immutable audit stream</span><h2>Live event log</h2></div><span className="live-chip"><i/>Live</span></div><div className="event-list">{logs.map(log=><article key={log.id} className={log.tone??""}><time>{log.time}</time><div><strong>{log.type}</strong><p>{log.message}</p></div></article>)}</div></section>
      </aside>
    </div>
  </main>;
}

function DataRow({label,value}:{label:string;value:string}) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function RiskMeter({score,zone}:{score:number;zone:RiskZone}) { return <div className="risk-meter"><span className="panel-kicker">Threat assessment</span><div className="risk-dial" style={{"--risk":`${score * 3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><small>/ 100</small></div></div><b className={score>=60?"trip-text":score>=30?"warning-text":"online-text"}>{zoneLabel(zone)}</b><div className="risk-scale"><span>Low</span><span>Guarded</span><span>Critical</span></div></div>; }
function initialLogs(): LogEvent[] { const t = new Date().toLocaleTimeString("en-GB",{hour12:false}); return [{id:"3",time:t,type:"APPROVAL REQUIRED",message:"Human decision required",tone:"warning"},{id:"2",time:t,type:"RISK ENGINE",message:"Score 75 · 3 — HIGH RISK",tone:"danger"},{id:"1",time:t,type:"REQUEST RECEIVED",message:"delete_file · REQ-2026-0042"}]; }
function fallbackRequest(): GuardianRequest { return { id:"REQ-2026-0042", toolName:"delete_file", actorId:"agent-atlas", environment:"production", arguments:{ path:"/production/database.db", bulk:true }, actionType:"DESTRUCTIVE_WRITE", riskScore:75, zone:"ZONE_3_4", ruleHits:[{ ruleId:"DELETE", description:"Destructive write", weight:30 }], approvalRequired:true }; }
# GUARDIAN MCP Governance Gateway

## Goal
Build a polished two-page GUARDIAN experience: a cinematic comic-book landing page and a functional governance control room that talks to the supplied Node.js API when available and seamlessly simulates the same behavior when offline.

## Pages
- `/` — cinematic landing page with GUARDIAN navigation, the exact “WHEN AI ACTS, WHO WATCHES?” message, animated guardian core, threat story, governance flow, six powers, and control-room call to action.
- `/demo` — live control room with connection controls, statistics, active request review, risk visualization, approval workflow, countdown queue, safety systems, event log, fatigue monitoring, and circuit-breaker controls.
- Shared navigation will use app routes while the landing-page section links scroll within the page.

## Visual Direction
- Deep black and charcoal command-center surfaces, crisp white typography, forceful red actions, and restrained gold warning accents.
- Angular comic panels, hard borders, halftone fields, speed lines, radial rays, numbered labels, subtle glitch/reveal effects, and compact technical typography.
- An original CSS-built “guardian core” with concentric rotating rings and “HUMAN IN THE LOOP”; no copyrighted characters or external hero artwork.
- Motion will remain readable and will be disabled or reduced for users who prefer reduced motion.
- Desktop, tablet, and mobile layouts will preserve usable controls and prevent panel overlap.

## Landing Page
- Build the header and section navigation specified in the brief.
- Create the complete animated hero and exact primary copy/actions.
- Build “The Threat,” the three governance panels, the five-step action trail, six power cards, and the final launch section.
- Add viewport reveals and restrained interactive movement without compromising accessibility.

## Control Room
- Create at least ten varied MCP requests spanning low, medium, and high risk.
- Display request ID, tool, formatted arguments, score, zone, fired rules, and approval state.
- Animate the risk meter and automatically execute low-risk requests.
- Require explicit approve/reject decisions for elevated requests, show outcome feedback, update counters, add audit events, then schedule the next request after a randomized 10–20 second countdown.
- Keep the event stream visibly live and synchronize safety-system indicators and headline statistics.
- Detect rapid approvals deterministically and change fatigue from NORMAL to ELEVATED with the requested warning.
- Simulate a 20-request burst, trip and visibly alert the circuit breaker, pause request flow, then reset and resume it.

## External API Integration
- Default the configurable server URL to `http://localhost:3000` and provide a live/simulation mode control with visible connection state.
- Use the supplied contracts:
  - `POST /intercept` with MCP tool-call fields.
  - `POST /approve` with `sessionId`, `APPROVE | REJECT`, and click time.
  - `GET /pending` for suspended sessions.
  - `GET /logs` for audit records.
- Probe the service, refresh pending work and logs while live, and convert API responses into the control-room display model.
- On timeout, network failure, invalid response, or unavailable local service, switch safely to the complete in-browser simulation without breaking the demo.
- Keep the external Node.js backend separate; no database or hosted backend will be added.

## Technical Details
- Implement within the existing TanStack React app while preserving the supplied API’s exact JSON contract.
- Use semantic design tokens in the global stylesheet and reusable focused UI components.
- Keep browser-only polling and timers lifecycle-safe, cancel stale work, and avoid overlapping requests.
- Add route-specific titles, descriptions, Open Graph metadata, and social card metadata.
- Record the external-API/fallback architecture in `AGENTS.md`.

## Verification
- Check the generated preview for compile/runtime errors.
- Exercise landing-page navigation and animations.
- Exercise simulation mode end to end: auto-execution, approve, reject, countdown, new request, fatigue escalation, breaker trip, paused flow, reset, and resumed flow.
- Test the configured live connection against an unavailable server and confirm automatic fallback.
- Inspect desktop and mobile screenshots for readable hierarchy, fitting text, and non-overlapping controls.

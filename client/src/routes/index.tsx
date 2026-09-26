/* eslint-disable prettier/prettier */
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Fingerprint,
  Gauge,
  Menu,
  Power,
  ScanLine,
  Shield,
  Siren,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GUARDIAN — Human Governance for AI Actions" },
      {
        name: "description",
        content:
          "A cinematic MCP governance gateway for risk scoring, human approval, integrity checks, and auditable AI actions.",
      },
      { property: "og:title", content: "GUARDIAN — Human Governance for AI Actions" },
      {
        property: "og:description",
        content: "See every AI tool action. Score the risk. Keep a human in control.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const powers = [
  [
    "R",
    "Risk engine",
    "Scores each action from context, sensitivity, scope, and potential impact.",
  ],
  [
    "A",
    "Approval manager",
    "Suspends sensitive actions until an accountable human makes the call.",
  ],
  [
    "F",
    "Fatigue detector",
    "Flags rapid approval patterns before reflex replaces meaningful review.",
  ],
  ["C", "Circuit breaker", "Stops automated execution when request velocity becomes suspicious."],
  ["H", "Hash manager", "Verifies that the reviewed payload is exactly the payload that executes."],
  ["L", "Audit logger", "Preserves a legible trail of scores, decisions, checks, and outcomes."],
];

const flow = ["MCP request", "Risk scan", "Human approval", "Hash / integrity", "Execute / block"];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target instanceof HTMLElement)
            entry.target.dataset["visible"] = "true";
        }),
      { threshold: 0.14 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <main className="guardian-site overflow-hidden bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <Link to="/" className="brand-mark">
            <Shield className="size-5 fill-current" />
            GUARDIAN<span>//01</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <button onClick={() => scrollTo("threat")}>The threat</button>
            <button onClick={() => scrollTo("method")}>How it works</button>
            <button onClick={() => scrollTo("powers")}>Powers</button>
            <Button asChild className="guardian-button">
              <Link to="/demo">
                Live demo <ArrowRight />
              </Link>
            </Button>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="grid border-t border-border bg-background p-5 md:hidden">
            <button onClick={() => scrollTo("threat")}>The threat</button>
            <button onClick={() => scrollTo("method")}>How it works</button>
            <button onClick={() => scrollTo("powers")}>Powers</button>
            <Link
              to="/demo"
              className="mt-3 bg-primary px-4 py-3 text-center font-display font-black uppercase text-primary-foreground"
            >
              Live demo
            </Link>
          </nav>
        )}
      </header>

      <section className="hero-grid relative min-h-[94svh] border-b border-border pt-18">
        <div className="comic-rays" aria-hidden="true" />
        <div className="mx-auto grid min-h-[calc(94svh-4.5rem)] max-w-[1440px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
          <div className="relative z-10 max-w-3xl animate-fade-in">
            <p className="eyebrow">
              <span>Issue 01</span> MCP governance protocol
            </p>
            <h1 className="hero-title mt-6">
              When AI
              <br />
              <em>acts,</em>
              <br />
              who watches?
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              A governance gateway that evaluates MCP actions, asks humans for approval when risk
              demands it, detects approval fatigue, and can hit the emergency stop.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="guardian-button h-13">
                <Link to="/demo">
                  Enter the control room <ArrowRight />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="guardian-button-outline h-13"
                onClick={() => scrollTo("threat")}
              >
                See the mission <ArrowDown />
              </Button>
            </div>
            <div className="mt-12 flex items-center gap-5 font-mono text-[10px] uppercase text-muted-foreground">
              <span className="h-px w-12 bg-primary" />
              <span>Intercept</span>
              <span>Assess</span>
              <span>Authorize</span>
            </div>
          </div>
          <GuardianCore />
        </div>
      </section>

      <section id="threat" className="section-band border-b border-border py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end" data-reveal>
            <div>
              <p className="eyebrow">
                <span>Threat file</span> 001
              </p>
              <h2 className="section-title mt-5">
                Too many
                <br />
                <em>yes buttons.</em>
              </h2>
            </div>
            <div className="danger-panel">
              <div className="danger-stamp">Approval fatigue</div>
              <p>
                Continuous approval requests can condition a reviewer to approve without meaningful
                scrutiny.
              </p>
              <div className="mt-8 flex items-end gap-2" aria-hidden="true">
                {[28, 42, 34, 58, 47, 77, 92, 84, 96].map((h, i) => (
                  <span key={i} style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Risk engine", "Scores actions from context, sensitivity and impact."],
              ["02", "Human gate", "Critical actions wait for an explicit human decision."],
              ["03", "Circuit breaker", "Suspicious request bursts can pause automated execution."],
            ].map((item) => (
              <article key={item[0]} className="comic-card" data-reveal>
                <span>{item[0]}</span>
                <h3>{item[1]}</h3>
                <p>{item[2]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="bg-secondary py-24 text-secondary-foreground lg:py-32">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <p className="eyebrow">
            <span>Chain of custody</span> Zero blind spots
          </p>
          <h2 className="section-title mt-5">
            Every action
            <br />
            leaves a <em>trail.</em>
          </h2>
          <div className="flow-grid mt-16">
            {flow.map((step, i) => (
              <div key={step} className={`flow-step ${i === 2 ? "is-critical" : ""}`} data-reveal>
                <span>0{i + 1}</span>
                <strong>{step}</strong>
                {i < 4 && <ArrowRight aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="powers" className="section-band border-y border-border py-24 lg:py-32">
        <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="eyebrow">
                <span>System arsenal</span> Six controls
              </p>
              <h2 className="section-title mt-5">
                Built to
                <br />
                <em>intervene.</em>
              </h2>
            </div>
            <p className="max-w-sm text-muted-foreground">
              One gateway. Six coordinated safeguards between autonomous intent and real-world
              impact.
            </p>
          </div>
          <div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {powers.map(([letter, title, copy]) => (
              <article className="power-card" key={letter} data-reveal>
                <span>{letter}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <ArrowRight />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-strike relative overflow-hidden py-24 lg:py-32">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-10 px-5 md:flex-row md:items-end lg:px-10">
          <div>
            <p className="eyebrow">
              <span>Control is a choice</span>
            </p>
            <h2 className="section-title mt-5">
              Ready to
              <br />
              see it <em>work?</em>
            </h2>
          </div>
          <Button asChild size="lg" className="guardian-button h-15 px-7">
            <Link to="/demo">
              Launch live demo <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-7 font-mono text-[10px] uppercase text-muted-foreground lg:px-10">
        <span>GUARDIAN // MCP Governance Gateway</span>
        <span>Human authority remains final.</span>
      </footer>
    </main>
  );
}

function GuardianCore() {
  return (
    <div
      className="core-stage relative mx-auto aspect-square w-full max-w-[620px]"
      aria-label="Human in the loop guardian core"
    >
      <div className="speed-lines" />
      <div className="core-ring ring-one">
        <span />
        <span />
        <span />
      </div>
      <div className="core-ring ring-two">
        <span />
        <span />
      </div>
      <div className="core-ring ring-three" />
      <div className="core-center">
        <ScanLine />
        <strong>
          Human
          <br />
          in the
          <br />
          loop
        </strong>
        <small>Authority core</small>
      </div>
      <div className="core-label label-one">
        <Gauge />
        Risk scan
      </div>
      <div className="core-label label-two">
        <Fingerprint />
        Integrity
      </div>
      <div className="core-label label-three">
        <Siren />
        Override
      </div>
      <div className="core-label label-four">
        <Power />
        Execute
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useApp } from "../store";
import { Btn, Chip, Icon } from "../ui";

// ─────────────────────────────────────────────────────────────────────────────
// The Waypoint Field Manual — an in-app guide: setup checklist, the 10-step
// loop, how scoring works, what's real vs. simulated, FAQ and shortcuts.
// ─────────────────────────────────────────────────────────────────────────────

const PIPE = ["Discover", "Analyze", "Score", "Prioritize", "Prepare", "Review", "Apply", "Track", "Follow up", "Interview"];

const SECTIONS = [
  { id: "setup", label: "5-minute setup", icon: "flag" },
  { id: "workflow", label: "The 10-step loop", icon: "refresh" },
  { id: "discover", label: "Finding opportunities", icon: "radar" },
  { id: "scoring", label: "How matches are scored", icon: "spark" },
  { id: "prepare", label: "Preparing applications", icon: "wand" },
  { id: "apply", label: "Applying & tracking", icon: "kanban" },
  { id: "interview", label: "Interview mode", icon: "target" },
  { id: "profile", label: "Your career profile", icon: "user" },
  { id: "automation", label: "Agents & integrations", icon: "gear" },
  { id: "guardrails", label: "The accuracy contract", icon: "shield" },
  { id: "faq", label: "FAQ & shortcuts", icon: "chat" },
] as const;

const CHECK_KEY = "waypoint-guide-checklist-v1";
const SETUP_STEPS = [
  { id: "s1", label: "Make the profile yours", detail: "Career Profile → edit name, headline and years. The seeded persona (Alex Morgan) is a template — replace it.", goto: "profile", gotoLabel: "Open profile" },
  { id: "s2", label: "Set your country & locations", detail: "Search preferences → Country / base (defaults to India). Add cities like Bengaluru or Hyderabad. Match scores re-rank instantly.", goto: "profile", gotoLabel: "Open profile" },
  { id: "s3", label: "Attach your resume", detail: "Career Profile → Resumes & CV. Drop a PDF or a .txt export — text files get scanned and detected skills can join your Verified Facts.", goto: "profile", gotoLabel: "Open profile" },
  { id: "s4", label: "Audit your Verified Facts", detail: "Skill areas and achievements are the only material Waypoint may use in any document it writes. Add what's missing, correct what's stale.", goto: "profile", gotoLabel: "Open profile" },
  { id: "s5", label: "Tune search preferences", detail: "Preferred titles, work modes (Remote / Hybrid / Onsite) and your salary band feed the match score and the daily agent.", goto: "profile", gotoLabel: "Open profile" },
  { id: "s6", label: "Run the Daily Agent once", detail: "“Find My Next Best Job” pulls live boards (Remotive, Arbeitnow), dedupes, scores everything and flags anything at or above your alert bar.", goto: null, gotoLabel: "Run the agent" },
] as const;

const LOOP: { step: string; title: string; body: string; icon: string }[] = [
  { step: "01", title: "Discover", body: "The agent scans connected sources against your preferences and pulls PM & PO roles into your dashboard — live boards over the internet, paste-capture for everything else.", icon: "radar" },
  { step: "02", title: "Analyze", body: "Open any job and Waypoint maps the description against your Verified Career Facts: what lines up, what's missing, what to emphasize.", icon: "spark" },
  { step: "03", title: "Score", body: "A 0–100 match score with four visible dimensions — skills, experience, career growth, preferences — plus a plain-English reason and honest gaps.", icon: "target" },
  { step: "04", title: "Prioritize", body: "Job Matches ranks everything so the highest-value roles surface first. Recommendations run from “Apply Immediately” to “Do Not Prioritize”.", icon: "flag" },
  { step: "05", title: "Prepare", body: "Generate the kit: tailored resume, cover letter in four voices, recruiter outreach in four channels, and pre-drafted application answers.", icon: "wand" },
  { step: "06", title: "Review", body: "You read and edit everything. Claim validation shows which facts back each letter; anything unverifiable is flagged, never invented.", icon: "eye" },
  { step: "07", title: "Apply", body: "The submission review shows company, role, resume version, letter and answers. Nothing goes out until you tick the accuracy box and approve.", icon: "check" },
  { step: "08", title: "Track", body: "The application lands on your Kanban with full history — status, materials used, notes, salary, follow-up date. Drag cards as things move.", icon: "kanban" },
  { step: "09", title: "Follow up", body: "A +7 day follow-up task is created automatically. Outreach drafts the nudge; the agent feed and reminders keep it on your radar.", icon: "clock" },
  { step: "10", title: "Interview", body: "Move a card to Interview Scheduled and a prep workspace appears: likely questions, answers mapped to your experience, STAR stories, and a live mock interviewer.", icon: "chat" },
];

const FAQS = [
  { q: "Where is my data stored?", a: "Entirely in your browser (localStorage). Nothing is uploaded to Waypoint servers — there are none. Reset everything anytime from Settings → Privacy & data. Clearing browser data clears your workspace." },
  { q: "How is the match score actually computed?", a: "Skills 50% (required skills found in your verified skill areas, boosted by preferred-skill overlap) + Experience 20% (your PM/PO years vs. the ask) + Career growth 15% (does the role move you up, sideways, or into leadership?) + Preferences 15% (title, country/city, work mode, industry, target companies, salary band). Remote roles pass the location check if Remote is in your work modes; in-country roles earn a bonus." },
  { q: "Will Waypoint submit applications for me?", a: "Never. The submission review requires an explicit accuracy confirmation and an Approve click — and even then, Waypoint prepares the package rather than clicking through external forms. Automation here is preparation, not submission." },
  { q: "Can I use my own AI for letters?", a: "Yes. Settings & Integrations → AI provider: connect any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, a local LLM) or Anthropic. The request is wrapped in a grounding prompt that restricts the model to your Verified Facts, and drafts carry a “re-read before sending” flag. Test connection verifies the key before you rely on it." },
  { q: "How do I get jobs from Naukri, LinkedIn or Instahyre?", a: "Those platforms have no public API, so use Discover → “Analyze a job”: paste the posting and Waypoint extracts the role, detects skills, scores it, and builds the full application kit. It enters your pipeline exactly like an agent find." },
  { q: "Why do some sections say simulated?", a: "Honesty by design. Live pieces hit the real internet: Remotive and Arbeitnow job boards, plus your AI provider if configured. Gmail/LinkedIn/Calendar intelligence runs on realistic sample data until a small backend handles OAuth — the table below shows exactly what's what." },
  { q: "I changed my profile — do old scores update?", a: "Yes, instantly and everywhere. Scores are computed live from your current profile, so every edit re-ranks the whole board. That's also why keeping Verified Facts truthful matters: they steer every recommendation." },
  { q: "How do I attach my resume, and switch my country to India?", a: "Career Profile → Resumes & CV (drag & drop; PDF/DOC/TXT/MD, max 2 MB, stored locally). Country lives under Search preferences → Country / base, with India as the default. Both are covered in the 5-minute setup above." },
];

const REALITY: { what: string; status: "live" | "local" | "sim"; note: string }[] = [
  { what: "Job boards — Remotive & Arbeitnow", status: "live", note: "Real HTTPS fetches, keyless, CORS-enabled. Filtered to PM/PO titles, deduped, scored on arrival." },
  { what: "AI letter writing (your key)", status: "live", note: "Optional OpenAI-compatible or Anthropic endpoint, grounded in Verified Facts, human review required." },
  { what: "Match scoring, resumes, answers, mock interview", status: "local", note: "Deterministic engines running in your browser — instant, offline, grounded in your profile." },
  { what: "Your data (profile, applications, files)", status: "local", note: "localStorage only. Export by copying; nothing leaves the device unless you send it." },
  { what: "Gmail / LinkedIn / Calendar intel", status: "sim", note: "Realistic sample flows. Going live needs a small backend for OAuth — the store architecture is ready for it." },
  { what: "Naukri / LinkedIn / Indeed job import", status: "sim", note: "No public APIs exist. Paste-capture (“Analyze a job”) is the supported path and feeds the same pipeline." },
];

export default function GuidePage({ onRunAgent }: { onRunAgent?: () => void }) {
  const { setTab, toast } = useApp();
  const [active, setActive] = useState<string>("setup");
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) ?? "{}") as Record<string, boolean>; } catch { return {}; }
  });
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // persist checklist
  useEffect(() => {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(done)); } catch { /* ignore */ }
  }, [done]);

  // scrollspy + reading progress (scroll container is <main>)
  useEffect(() => {
    const scroller = rootRef.current?.closest("main");
    if (!scroller) return;
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      setProgress(max > 0 ? scroller.scrollTop / max : 0);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const els = SECTIONS.map((s) => document.getElementById(`g-${s.id}`)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id.replace("g-", ""));
      },
      { root: scroller, rootMargin: "-35% 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));

    // scroll reveals
    const reveals = rootRef.current?.querySelectorAll(".reveal") ?? [];
    const revObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); revObs.unobserve(e.target); }
      },
      { root: scroller, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => revObs.observe(el));

    return () => { scroller.removeEventListener("scroll", onScroll); obs.disconnect(); revObs.disconnect(); };
  }, []);

  const jump = (id: string) => {
    document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const doneCount = SETUP_STEPS.filter((s) => done[s.id]).length;
  const allDone = doneCount === SETUP_STEPS.length;

  return (
    <div ref={rootRef} className="relative">
      {/* reading progress */}
      <div className="pointer-events-none sticky top-0 z-30 -mx-4 -mt-6 h-[3px] bg-transparent sm:-mx-6">
        <div className="h-full bg-pine-500 transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {/* ── opener: the pipeline itself ── */}
      <header className="sidebar-bg relative overflow-hidden rounded-2xl border border-ink-700/60 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-pine-500/10 blur-2xl" aria-hidden />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
          <div>
            <p className="label-mono !text-pine-300">The Waypoint field manual</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-[1.08] tracking-tight sm:text-[2.6rem]">
              Run your job search<br />like a <span className="text-pine-300">product.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-200">
              Waypoint turns a scattered search into a pipeline: discover → analyze → score → prepare → apply → track → interview.
              This guide walks the whole loop in about seven minutes — and the setup checklist gets you live in five.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Btn variant="primary" icon="radar" onClick={() => { jump("setup"); }}>Start the 5-minute setup</Btn>
              <button onClick={() => jump("workflow")} className="btn btn-ghost !text-ink-200 hover:!bg-ink-800 hover:!text-white">
                <Icon name="refresh" size={15} />See the loop first
              </button>
              <span className="font-mono text-xs text-ink-400">· press <kbd className="rounded border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-[11px] text-ink-200">J</kbd> anywhere for the agent</span>
            </div>
          </div>
          {/* pipeline visual */}
          <div className="relative hidden lg:block" aria-hidden>
            <svg viewBox="0 0 420 300" className="w-full">
              <path d="M40 40 C 160 40, 260 60, 330 96 S 380 190, 300 226 S 120 268, 60 236" fill="none" stroke="#1f3a47" strokeWidth="2" strokeDasharray="5 6" />
              {[[40, 40], [170, 44], [290, 76], [356, 130], [330, 196], [230, 240], [110, 252], [52, 208], [70, 140], [180, 120]].map(([x, y], i) => (
                <g key={i} className="anim-pop" style={{ animationDelay: `${i * 120}ms` }}>
                  <circle cx={x} cy={y} r={i === 0 ? 9 : 6} fill={i === 0 ? "#2BB673" : "#152933"} stroke="#2BB673" strokeWidth="1.6" />
                  <text x={x} y={y - 14} textAnchor="middle" fontSize="10.5" fill={i === 0 ? "#74c29e" : "#6e8b96"} fontFamily="IBM Plex Mono, monospace">{PIPE[i]}</text>
                </g>
              ))}
              <circle cx="40" cy="40" r="16" fill="none" stroke="#2BB673" strokeWidth="1" className="pulse-dot" />
            </svg>
            <p className="mt-1 text-center font-mono text-[11px] text-ink-400">the loop runs continuously — not once</p>
          </div>
        </div>
      </header>

      {/* ── body: TOC + content ── */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[218px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-8">
            <p className="label-mono mb-2.5 px-3">On this page</p>
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => jump(s.id)}
                className={`group relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-[7px] text-left text-[13px] font-medium transition-colors ${active === s.id ? "bg-white text-ink-900 shadow-sm ring-1 ring-mist-200" : "text-mist-600 hover:bg-white/70 hover:text-ink-800"}`}>
                {active === s.id && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-pine-500" />}
                <span className={active === s.id ? "text-pine-600" : "text-mist-400"}><Icon name={s.icon} size={14} /></span>
                {s.label}
              </button>
            ))}
            <div className="mt-5 rounded-lg border border-mist-200 bg-white p-3.5">
              <p className="font-display text-sm font-bold text-ink-900">Setup progress</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist-200">
                <div className="h-full rounded-full bg-pine-500 transition-all duration-500" style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%` }} />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-mist-500">{doneCount}/{SETUP_STEPS.length} done</p>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 space-y-14 pb-16">
          {/* ── setup ── */}
          <GuideSection id="setup" icon="flag" kicker="Start here" title="The 5-minute setup"
            sub="Six steps turn Waypoint from a demo workspace into your search engine. Check them off — progress is saved in this browser.">
            <div className="card overflow-hidden">
              {SETUP_STEPS.map((s, i) => {
                const isDone = !!done[s.id];
                return (
                  <div key={s.id} className={`flex flex-wrap items-start gap-3.5 border-b border-mist-100 px-4 py-3.5 transition-colors last:border-0 ${isDone ? "bg-pine-50/40" : "bg-white"}`}>
                    <button onClick={() => { setDone((d) => ({ ...d, [s.id]: !d[s.id] })); if (!isDone && doneCount + 1 === SETUP_STEPS.length) toast("Setup complete — your pipeline is primed"); }}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${isDone ? "border-pine-600 bg-pine-600 text-white" : "border-mist-300 bg-white text-transparent hover:border-pine-400"}`}
                      aria-label={`Mark “${s.label}” ${isDone ? "not done" : "done"}`}>
                      <Icon name="check" size={13} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] font-semibold ${isDone ? "text-mist-500 line-through" : "text-ink-900"}`}>
                        <span className="mr-2 font-mono text-[11px] text-mist-400">{String(i + 1).padStart(2, "0")}</span>{s.label}
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-mist-600">{s.detail}</p>
                    </div>
                    {s.goto ? (
                      <Btn size="sm" variant={isDone ? "ghost" : "outline"} icon="arrowR" onClick={() => setTab(s.goto!)}>{s.gotoLabel}</Btn>
                    ) : (
                      <Btn size="sm" variant={isDone ? "ghost" : "primary"} icon="radar" onClick={() => (onRunAgent ? onRunAgent() : setTab("dashboard"))}>{s.gotoLabel}</Btn>
                    )}
                  </div>
                );
              })}
            </div>
            {allDone && (
              <div className="anim-fade-up mt-3 flex items-center gap-3 rounded-xl border border-pine-300 bg-pine-600 px-4 py-3 text-white">
                <Icon name="spark" size={18} />
                <p className="flex-1 text-sm font-medium">You're set. The agent is hunting, scores reflect your real profile, and your resume is on file.</p>
                <Btn size="sm" variant="ink" icon="kanban" onClick={() => setTab("applications")}>Open your pipeline</Btn>
              </div>
            )}
            <TryIt>Change the Country field to anything else and watch Job Matches re-rank in real time — that's the preference engine working.</TryIt>
          </GuideSection>

          {/* ── workflow ── */}
          <GuideSection id="workflow" icon="refresh" kicker="The operating loop" title="Ten steps, one pipeline"
            sub="Every role you touch moves through this loop. Waypoint automates the heavy lifting at each step; you hold the approvals.">
            <ol className="relative space-y-3.5 border-l-2 border-mist-200 pl-6">
              {LOOP.map((l, i) => (
                <li key={l.step} className="reveal relative" style={{ transitionDelay: `${Math.min(i * 45, 320)}ms` }}>
                  <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-pine-500 bg-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-pine-500" />
                  </span>
                  <div className="card card-hover p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-bold text-pine-600">{l.step}</span>
                      <span className="text-pine-600"><Icon name={l.icon} size={15} /></span>
                      <h4 className="font-display text-[15px] font-bold text-ink-900">{l.title}</h4>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">{l.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </GuideSection>

          {/* ── discover ── */}
          <GuideSection id="discover" icon="radar" kicker="Step 01" title="Finding opportunities"
            sub="Three ways in — live boards, the agent, and paste-capture. All three land in the same scored pipeline.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="card p-4 md:col-span-2">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><span className="pulse-dot h-2 w-2 rounded-full bg-pine-500" />Live feed — real internet, no key</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  In Discover, flip <b>Local board → Live feed</b>. Waypoint calls the public APIs of <b>Remotive</b> (remote-first, worldwide, India-friendly) and <b>Arbeitnow</b> (EU-leaning),
                  filters to PM/PO titles, parses salaries and skills, dedupes, and scores each posting against your profile on arrival.
                  <b> Sync now</b> re-pulls (throttled to every 15 min); the agent does the same on schedule or on demand.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="wand" size={15} className="text-pine-600" />Paste-capture</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Found something on Naukri, LinkedIn or a careers page? Discover → <b>Analyze a job</b>. Paste the posting; Waypoint extracts title, company and skills, scores it, and saves it to your tracker with a full application kit.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="building" size={15} className="text-pine-600" />Filters that matter</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Combine work mode, source, freshness and match threshold. The quick chips — <b>Anywhere / India / Remote only</b> — use your base country from the Career Profile.
                </p>
              </div>
            </div>
            <TryIt>Open Job Matches and note the #1 role. Then flip Discover to the live feed — live roles carry a LIVE badge and score against you the second they land.</TryIt>
          </GuideSection>

          {/* ── scoring ── */}
          <GuideSection id="scoring" icon="spark" kicker="Step 03" title="How matches are scored"
            sub="No black box. Every score is four visible numbers with the arithmetic behind them.">
            <div className="card p-5">
              <div className="grid gap-4 sm:grid-cols-[repeat(4,1fr)_auto] sm:items-center">
                {([["Skills", "50%", "required skills found in your verified areas"], ["Experience", "20%", "your PM/PO years vs. the ask"], ["Growth", "15%", "lateral vs. progression vs. leadership"], ["Preferences", "15%", "title, country, mode, industry, salary"]] as const).map(([k, w, d]) => (
                  <div key={k} className="rounded-lg border border-mist-200 bg-mist-50/60 p-3">
                    <p className="flex items-baseline justify-between"><span className="font-display text-sm font-bold text-ink-900">{k}</span><span className="font-mono text-lg font-bold text-pine-600">{w}</span></p>
                    <p className="mt-1 text-[11.5px] leading-snug text-mist-600">{d}</p>
                  </div>
                ))}
                <div className="rounded-lg bg-ink-900 p-3 text-center sidebar-bg">
                  <p className="label-mono !text-ink-400">Overall</p>
                  <p className="font-display text-2xl font-bold text-pine-300">0–100</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(["Apply Immediately", "Strong Match", "Worth Considering", "Stretch Opportunity", "Low Match", "Do Not Prioritize"] as const).map((r, i) => (
                  <span key={r} className={`chip border ${i < 2 ? "border-pine-200 bg-pine-50 text-pine-800" : i < 4 ? "border-gold-100 bg-gold-50 text-gold-700" : "border-mist-200 bg-mist-50 text-mist-600"}`}>{r}</span>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-mist-600">
                <b className="text-ink-800">Strengths</b> cite the exact verified achievement behind each point; <b className="text-ink-800">gaps</b> name what's missing and suggest the honest angle
                (“closest verified work: …”). Remote passes the location check when Remote is in your work modes; postings in your base country earn a preference bonus.
              </p>
            </div>
          </GuideSection>

          {/* ── prepare ── */}
          <GuideSection id="prepare" icon="wand" kicker="Step 05" title="Preparing applications"
            sub="One job detail drawer produces the whole kit. Everything is editable, everything traces back to your facts.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Tailored resume</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Reorders your real bullets by relevance, adds only keywords that exist in your profile, and <b>flags</b> JD terms you don't have instead of faking them. Approve to save a named version.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Cover letters — four voices</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Professional, Strategic Leader, Technical PM, and a 90-word Recruiter Short. Each ships with its claim-validation list; connect an AI provider for live drafting.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Recruiter outreach</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  LinkedIn note, application email, polite follow-up and referral ask — drafted from the JD, the recruiter's name and your strongest verified metric. Copy, tweak, send.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Application questions</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  “Why this role?”, “Describe a product you've built”… answered in short / medium / detailed lengths, STAR-shaped, and capped by your character limits.
                </p>
              </div>
            </div>
            <TryIt>In any job's drawer, generate the Recruiter Short letter — then count the claims panel: every one maps to a line in your Career Profile.</TryIt>
          </GuideSection>

          {/* ── apply ── */}
          <GuideSection id="apply" icon="kanban" kicker="Steps 07–08" title="Applying & tracking"
            sub="Waypoint prepares; you submit. The tracker keeps the whole search in one CRM-like view.">
            <div className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="shield" size={15} className="text-pine-600" />The approval gate</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Before anything is marked applied, the review shows company, role, resume version, letter and question answers. You must tick
                  <b> “every statement is accurate”</b> and click Approve. Waypoint will not auto-submit forms, accept terms, or send messages on your behalf — ever.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="kanban" size={15} className="text-pine-600" />The board</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Twelve statuses from Discovered to Closed. Drag cards between columns; history, notes, materials and follow-up dates ride along. Metrics up top mirror your funnel.
                </p>
              </div>
            </div>
            <TryIt>Approve a submission and watch two things happen at once: the card moves to Applied, and a +7-day follow-up task appears in Tasks & Reminders.</TryIt>
          </GuideSection>

          {/* ── interview ── */}
          <GuideSection id="interview" icon="target" kicker="Step 10" title="Interview mode"
            sub="When a card hits Interview Scheduled, a prep workspace is ready before you ask for it.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Question bank</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">Likely questions by category — strategy, sense, execution, analytics, APIs, AI, behavioral — each expandable to an answer mapped to your experience.</p>
              </div>
              <div className="card p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">STAR library</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">Reusable Situation–Task–Action–Result stories built from your verified achievements, tagged by the skills they demonstrate.</p>
              </div>
              <div className="card border-pine-200 bg-pine-50/40 p-4">
                <h4 className="font-display text-[15px] font-bold text-ink-900">Mock interview</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">A live AI interviewer asks one question, waits for your answer, scores it on ownership / structure / outcomes, flags gaps and follows up. <kbd className="rounded border border-mist-300 bg-white px-1 text-[10.5px]">Ctrl</kbd>+<kbd className="rounded border border-mist-300 bg-white px-1 text-[10.5px]">Enter</kbd> to send.</p>
              </div>
            </div>
            <TryIt>Run two reps in the mock interview, then compare your second answer's score — the follow-up questions are where interviews are won.</TryIt>
          </GuideSection>

          {/* ── profile ── */}
          <GuideSection id="profile" icon="user" kicker="The foundation" title="Your career profile"
            sub="Everything Waypoint writes is grounded here. Ten honest minutes in this tab pays for itself in every document it produces.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="doc" size={15} className="text-pine-600" />Resumes & CV</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Drag & drop into Career Profile — PDF, DOC, DOCX, TXT, MD (max 2 MB), stored in this browser only. Text uploads get scanned: detected skills can join your Verified Facts with one click; metric lines are surfaced for you to re-enter with context.
                </p>
              </div>
              <div className="card p-4">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="building" size={15} className="text-pine-600" />Country & preferences</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Country / base defaults to <b>India</b> — change it under Search preferences. It feeds the preference score, the Discover filter chips and remote compatibility. Titles, modes, industries, target companies and salary band live beside it.
                </p>
              </div>
              <div className="card p-4 md:col-span-2">
                <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="shield" size={15} className="text-pine-600" />Verified Career Facts</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist-600">
                  Skill areas (with evidence) and achievements (with metrics and tags) form the database every generator reads. Add a real achievement and watch letters, answers and strengths change on the next generation — that's the grounding loop.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* ── automation ── */}
          <GuideSection id="automation" icon="gear" kicker="Set & forget (almost)" title="Agents & integrations"
            sub="The daily agent does the hunting; integrations extend the reach. All of it obeys the approval rule.">
            <div className="card p-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="radar" size={15} className="text-pine-600" />Daily job-search agent</h4>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-mist-600">
                    <li>• Schedule in Settings (time, daily / weekdays / weekly) or press <kbd className="rounded border border-mist-300 bg-mist-100 px-1 text-[11px]">J</kbd> / the header button anytime.</li>
                    <li>• Searches enabled sources, dedupes against your tracker, scores, and alerts on anything ≥ your threshold (slider in Settings).</li>
                    <li>• Auto-creates deadline tasks for postings closing within 10 days.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900"><Icon name="link" size={15} className="text-pine-600" />Connections</h4>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-mist-600">
                    <li>• <b>Live now:</b> Remotive & Arbeitnow boards; your own OpenAI-compatible or Anthropic endpoint (Settings → AI provider, with a test button).</li>
                    <li>• <b>Simulated:</b> Gmail, LinkedIn, Calendar — the workflows are real, the data is sample until a backend handles OAuth.</li>
                    <li>• Toggles update the agent's source count instantly.</li>
                  </ul>
                </div>
              </div>
            </div>
          </GuideSection>

          {/* ── guardrails ── */}
          <GuideSection id="guardrails" icon="shield" kicker="Non-negotiable" title="The accuracy contract"
            sub="The single most important thing Waypoint does is refuse to lie for you.">
            <div className="sidebar-bg rounded-2xl border border-ink-700/60 p-6 text-white sm:p-7">
              <p className="font-display text-xl font-bold leading-snug sm:text-2xl">
                Accuracy <span className="text-pine-300">&gt;</span> Personalization <span className="text-pine-300">&gt;</span> Keywords <span className="text-pine-300">&gt;</span> Automation
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {([["wand", "Never invented", "No fake roles, metrics or skills. Unverifiable JD keywords are flagged — not added to your resume."], ["eye", "Always reviewable", "Every claim in every letter links to a verified fact. Diffs show what changed and why."], ["check", "Never auto-submitted", "Applications, messages and calendar moves require your explicit approval. No silent actions."]] as const).map(([ic, t, d]) => (
                  <div key={t} className="rounded-xl border border-ink-700 bg-ink-800/70 p-4">
                    <span className="text-pine-300"><Icon name={ic} size={18} /></span>
                    <p className="mt-2 font-display text-sm font-bold">{t}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <h4 className="mb-2 mt-6 font-display text-[15px] font-bold text-ink-900">What's real right now</h4>
            <div className="card overflow-hidden">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-mist-200 bg-mist-50/70">
                    <th className="px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mist-500">Capability</th>
                    <th className="px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mist-500">Status</th>
                    <th className="hidden px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-mist-500 sm:table-cell">What that means</th>
                  </tr>
                </thead>
                <tbody>
                  {REALITY.map((r) => (
                    <tr key={r.what} className="border-b border-mist-100 transition-colors last:border-0 hover:bg-mist-50/60">
                      <td className="px-4 py-2.5 font-semibold text-ink-800">{r.what}</td>
                      <td className="px-4 py-2.5">
                        <span className={`chip border ${r.status === "live" ? "border-pine-200 bg-pine-50 text-pine-800" : r.status === "local" ? "border-sky-100 bg-sky-50 text-sky-800" : "border-gold-100 bg-gold-50 text-gold-700"}`}>
                          {r.status === "live" ? "● live internet" : r.status === "local" ? "● in-browser" : "● simulated"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 leading-relaxed text-mist-600 sm:table-cell">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GuideSection>

          {/* ── faq + shortcuts ── */}
          <GuideSection id="faq" icon="chat" kicker="Good questions" title="FAQ & shortcuts"
            sub="The things people ask first — and the few keys worth memorizing.">
            <div className="card divide-y divide-mist-100">
              {FAQS.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mist-50/60" aria-expanded={openFaq === i}>
                    <span className="text-[14px] font-semibold text-ink-900">{f.q}</span>
                    <span className={`shrink-0 text-mist-400 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-pine-600" : ""}`}><Icon name="chevD" size={16} /></span>
                  </button>
                  <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-[13px] leading-relaxed text-mist-600">{f.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <p className="label-mono mb-2.5">Keys worth knowing</p>
                <ul className="space-y-2 text-[13px] text-mist-600">
                  <li className="flex items-center gap-2"><kbd className="rounded border border-mist-300 bg-mist-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">J</kbd>Open the Daily Agent from anywhere</li>
                  <li className="flex items-center gap-2"><kbd className="rounded border border-mist-300 bg-mist-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">Enter</kbd>Open a focused job card · submit inputs in lists</li>
                  <li className="flex items-center gap-2"><kbd className="rounded border border-mist-300 bg-mist-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700">Ctrl/⌘ Enter</kbd>Send your answer in the mock interview</li>
                </ul>
              </div>
              <div className="card p-4">
                <p className="label-mono mb-2.5">Habits of a good pipeline</p>
                <ul className="space-y-2 text-[13px] leading-relaxed text-mist-600">
                  <li>• Run the agent once a day; apply to ≤ 5 roles, deeply.</li>
                  <li>• After every interview, add one new STAR story.</li>
                  <li>• Follow up on day 7 — the drafted nudge makes it 30 seconds.</li>
                  <li>• Keep Verified Facts honest; they steer every recommendation.</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-mist-200 bg-white p-4">
              <span className="text-pine-600"><Icon name="radar" size={20} /></span>
              <p className="flex-1 text-sm text-ink-700">That's the whole system. The loop does the rest — go find the next one.</p>
              <Btn variant="primary" icon="compass" onClick={() => setTab("dashboard")}>Back to your dashboard</Btn>
            </div>
          </GuideSection>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function GuideSection({ id, icon, kicker, title, sub, children }: {
  id: string; icon: string; kicker: string; title: string; sub: string; children: React.ReactNode;
}) {
  return (
    <section id={`g-${id}`} className="reveal scroll-mt-10">
      <div className="mb-4 flex items-start gap-3.5">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pine-200 bg-pine-50 text-pine-700"><Icon name={icon} size={19} /></span>
        <div>
          <p className="label-mono !text-pine-700">{kicker}</p>
          <h3 className="font-display text-[1.45rem] font-bold leading-tight text-ink-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-mist-600">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TryIt({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-dashed border-gold-400/70 bg-gold-50/50 px-4 py-3">
      <span className="mt-0.5 text-gold-600"><Icon name="zap" size={15} /></span>
      <p className="text-[12.5px] leading-relaxed text-ink-700"><b className="font-display text-gold-700">Try it — </b>{children}</p>
    </div>
  );
}

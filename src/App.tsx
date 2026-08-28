import { useEffect, useRef, useState } from "react";
import type { Job } from "./data";
import { scoreJob } from "./engine";
import { StoreProvider, useApp } from "./store";
import JobDetail from "./JobDetail";
import Dashboard from "./pages/Dashboard";
import { Discover, Matches, Saved } from "./pages/JobsPages";
import Applications from "./pages/Applications";
import { ResumeStudio, CoverLetters } from "./pages/Studio";
import Outreach from "./pages/Outreach";
import { Companies, InterviewPrep } from "./pages/Prep";
import { CareerProfile, Networking } from "./pages/ProfileNet";
import { SettingsPage, TasksPage } from "./pages/TasksSettings";
import { Btn, Icon, Modal, Monogram, RecBadge, ScoreRing, ToastHost } from "./ui";

const NAV: { group: string; items: { id: string; label: string; icon: string }[] }[] = [
  { group: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: "compass" }] },
  {
    group: "Discover",
    items: [
      { id: "discover", label: "Discover Jobs", icon: "radar" },
      { id: "matches", label: "Job Matches", icon: "spark" },
      { id: "saved", label: "Saved Jobs", icon: "bookmark" },
    ],
  },
  {
    group: "Apply",
    items: [
      { id: "applications", label: "Applications", icon: "kanban" },
      { id: "resume", label: "Resume Studio", icon: "wand" },
      { id: "letters", label: "Cover Letters", icon: "pen" },
      { id: "outreach", label: "Recruiter Outreach", icon: "send" },
    ],
  },
  {
    group: "Prepare",
    items: [
      { id: "companies", label: "Companies", icon: "building" },
      { id: "interview", label: "Interview Prep", icon: "target" },
    ],
  },
  {
    group: "Manage",
    items: [
      { id: "profile", label: "Career Profile", icon: "user" },
      { id: "networking", label: "Networking", icon: "users" },
      { id: "tasks", label: "Tasks & Reminders", icon: "flag" },
      { id: "settings", label: "Settings & Integrations", icon: "gear" },
    ],
  },
];
const TITLES: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.label])));

function Shell() {
  const { state, setTab } = useApp();
  const [agentOpen, setAgentOpen] = useState(false);
  const dueTasks = state.tasks.filter((t) => !t.done && t.due <= new Date().toISOString().slice(0, 10)).length;
  const pendingInbox = state.inbox.filter((m) => !m.acted).length;
  const activeApps = state.applications.filter((a) => !["Rejected", "Closed", "Offer"].includes(a.status)).length;

  const badge = (id: string): number =>
    id === "saved" ? state.savedIds.length
    : id === "tasks" ? dueTasks
    : id === "outreach" ? pendingInbox
    : id === "applications" ? activeApps
    : 0;

  return (
    <div className="flex h-full">
      {/* ── sidebar ── */}
      <aside className="sidebar-bg hidden w-[228px] shrink-0 flex-col border-r border-ink-700/60 lg:flex">
        <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#152933" /><path d="M16 5 L20 14 L27 16 L20 18 L16 27 L12 18 L5 16 L12 14 Z" fill="#2BB673" /><circle cx="16" cy="16" r="2.4" fill="#0C1D26" /></svg>
          <div>
            <p className="font-display text-[17px] font-bold leading-none text-white">Waypoint</p>
            <p className="label-mono mt-1 !text-ink-400">PM career copilot</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
          {NAV.map((g) => (
            <div key={g.group} className="mb-3.5">
              <p className="label-mono mb-1 px-2.5 !text-ink-500">{g.group}</p>
              {g.items.map((it) => {
                const active = state.tab === it.id;
                const b = badge(it.id);
                return (
                  <button key={it.id} onClick={() => setTab(it.id)}
                    className={`group relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-left text-[13.5px] font-medium transition-all ${active ? "bg-ink-700/70 text-white" : "text-ink-300 hover:bg-ink-800/80 hover:text-ink-100"}`}>
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-pine-400" />}
                    <span className={active ? "text-pine-300" : "text-ink-400 group-hover:text-ink-200"}><Icon name={it.icon} size={16} /></span>
                    <span className="flex-1">{it.label}</span>
                    {b > 0 && <span className={`rounded-full px-1.5 py-px font-mono text-[10px] font-bold ${it.id === "tasks" ? "bg-gold-500 text-ink-900" : it.id === "outreach" ? "bg-sky-500 text-white" : "bg-ink-600 text-ink-100"}`}>{b}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-ink-700/60 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-ink-800/70 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-600 font-display text-sm font-bold text-white">{state.profile.name.split(" ").map((w) => w[0]).join("")}</div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-ink-100">{state.profile.name}</p>
              <p className="truncate text-[10.5px] text-ink-400">{state.profile.pmYears} yrs PM · {state.profile.preferredTitles[0]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-mist-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <svg width="28" height="28" viewBox="0 0 32 32" className="lg:hidden" aria-hidden><rect width="32" height="32" rx="8" fill="#0C1D26" /><path d="M16 5 L20 14 L27 16 L20 18 L16 27 L12 18 L5 16 L12 14 Z" fill="#2BB673" /><circle cx="16" cy="16" r="2.4" fill="#0C1D26" /></svg>
            <div className="min-w-0 flex-1">
              <p className="label-mono hidden sm:block">Waypoint / {TITLES[state.tab] ?? "Dashboard"}</p>
              <h1 className="font-display text-lg font-bold leading-tight text-ink-900 lg:hidden">{TITLES[state.tab] ?? "Dashboard"}</h1>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {state.settings.integrations.gmail && <span className="chip border border-mist-300 bg-white"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pine-500" />Gmail</span>}
              {state.settings.integrations.linkedin && <span className="chip border border-mist-300 bg-white"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-pine-500" />LinkedIn</span>}
              <span className="chip border border-mist-300 bg-white font-mono text-mist-600"><Icon name="clock" size={11} />agent {state.settings.scheduleFreq} · {state.settings.scheduleTime}</span>
            </div>
            <button onClick={() => setAgentOpen(true)}
              className="btn btn-primary !rounded-lg px-4 py-2 text-sm shadow-md shadow-pine-600/25">
              <Icon name="radar" size={16} className="text-pine-200" />
              <span className="hidden sm:inline">Find My Next Best Job</span><span className="sm:hidden">Find jobs</span>
            </button>
          </div>
          {/* mobile nav */}
          <nav className="flex gap-1 overflow-x-auto no-scrollbar border-t border-mist-100 px-3 py-1.5 lg:hidden">
            {NAV.flatMap((g) => g.items).map((it) => (
              <button key={it.id} onClick={() => setTab(it.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${state.tab === it.id ? "bg-ink-900 text-white" : "text-mist-600"}`}>
                <Icon name={it.icon} size={13} />{it.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="workspace-bg flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6">
            {state.tab === "dashboard" && <Dashboard onRunAgent={() => setAgentOpen(true)} />}
            {state.tab === "discover" && <Discover />}
            {state.tab === "matches" && <Matches />}
            {state.tab === "saved" && <Saved />}
            {state.tab === "applications" && <Applications />}
            {state.tab === "resume" && <ResumeStudio />}
            {state.tab === "letters" && <CoverLetters />}
            {state.tab === "outreach" && <Outreach />}
            {state.tab === "companies" && <Companies />}
            {state.tab === "interview" && <InterviewPrep />}
            {state.tab === "profile" && <CareerProfile />}
            {state.tab === "networking" && <Networking />}
            {state.tab === "tasks" && <TasksPage />}
            {state.tab === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>

      {state.jobDetailId && <JobDetail />}
      <AgentModal open={agentOpen} onClose={() => setAgentOpen(false)} />
      <ToastHost />
    </div>
  );
}

// ─── daily agent modal ───────────────────────────────────────────────────────
const AGENT_STEPS = [
  "Searching connected sources (LinkedIn, careers pages, recruiter mail)…",
  "Filtering by your titles, locations, modes and salary band…",
  "Removing duplicates against your tracker…",
  "Scoring every posting against your verified profile…",
  "Ranking by match, growth, recency and deadlines…",
];

function AgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, agentFinish, setTab } = useApp();
  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const [step, setStep] = useState(0);
  const [found, setFound] = useState<{ job: Job; score: number; reason: string }[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);
  useEffect(() => { if (!open) { setPhase("idle"); setStep(0); setFound([]); } }, [open]);

  const run = () => {
    setPhase("run"); setStep(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduce ? 40 : 620;
    const pool = state.reserveJobs.slice(0, 3);
    AGENT_STEPS.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setStep(i), i * delay));
    });
    timers.current.push(window.setTimeout(() => {
      const scored = pool.map((job) => {
        const sc = scoreJob(job, state.profile);
        return { job, score: sc.overall, reason: sc.reason };
      }).sort((a, b) => b.score - a.score);
      if (pool.length > 0) {
        agentFinish(pool, [
          `Agent run completed — scanned ${40 + Math.floor(Math.random() * 30)} postings; ${pool.length} new matches added, duplicates removed.`,
          ...scored.filter((x) => x.score >= state.settings.minScoreToAlert).map((x) => `High-priority alert: ${x.job.title} — ${x.job.company} (${x.score}%).`),
        ]);
      } else {
        agentFinish([], [`Agent run completed — no new postings above your ${state.settings.minScoreToAlert}% bar; top existing matches re-ranked.`]);
      }
      setFound(scored);
      setPhase("done");
    }, AGENT_STEPS.length * delay + 200));
  };

  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><span className="text-pine-600"><Icon name="radar" size={18} /></span>Daily Job Search Agent</span>} wide>
      {phase === "idle" && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 sidebar-bg">
            <span className="text-pine-300"><Icon name="radar" size={30} /></span>
          </div>
          <h4 className="font-display text-xl font-bold text-ink-900">Hunt for your next role</h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mist-600">
            The agent searches <b>{Object.values(state.settings.sources).filter(Boolean).length} connected sources</b> for PM & PO roles matching your preferences,
            dedupes against your tracker, scores each posting against your verified profile, and flags anything at or above <b className="font-mono text-pine-700">{state.settings.minScoreToAlert}%</b>.
          </p>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-left">
            {["Titles & preferences", "Match scoring", "Deduplication", "Priority alerts"].map((f) => (
              <p key={f} className="flex items-center gap-1.5 rounded-md border border-mist-200 px-2.5 py-1.5 text-xs text-mist-600"><span className="text-pine-600"><Icon name="check" size={12} /></span>{f}</p>
            ))}
          </div>
          <Btn variant="primary" icon="zap" size="lg" className="mt-5" onClick={run}>Run the search</Btn>
          <p className="mt-2 text-[11px] text-mist-400">Scheduled {state.settings.scheduleFreq} at {state.settings.scheduleTime} · manual run is identical to the scheduled one</p>
        </div>
      )}

      {phase === "run" && (
        <div>
          <ol className="mx-auto max-w-lg space-y-2.5">
            {AGENT_STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-all ${i < step ? "border-pine-200 bg-pine-50/60 text-ink-800" : i === step ? "border-mist-300 bg-white text-ink-800" : "border-mist-200 text-mist-400"}`}>
                {i < step ? <span className="text-pine-600"><Icon name="check" size={16} /></span>
                  : i === step ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-mist-300 border-t-pine-600" />
                  : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-mist-200" />}
                <span className={i === step ? "caret" : ""}>{s}</span>
              </li>
            ))}
          </ol>
          <div className="mx-auto mt-4 h-1.5 max-w-lg overflow-hidden rounded-full bg-mist-200">
            <div className="h-full rounded-full bg-pine-500 transition-all duration-500" style={{ width: `${((step + 1) / AGENT_STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div>
          {found.length > 0 ? (
            <>
              <p className="label-mono mb-1">Top jobs found this run</p>
              <h4 className="font-display text-xl font-bold text-ink-900">{found.length} new match{found.length > 1 ? "es" : ""} added to your dashboard</h4>
              <div className="mt-3 space-y-2.5">
                {found.map(({ job, score, reason }) => (
                  <div key={job.id} className="anim-fade-up flex items-center gap-3 rounded-lg border border-mist-200 bg-white p-3">
                    <Monogram name={job.company} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[14px] font-semibold text-ink-900">{job.title} — {job.company}</p>
                      <p className="mt-0.5 text-xs leading-snug text-mist-600"><b className="font-mono text-pine-700">Match: {score}%</b> · {reason}</p>
                    </div>
                    <ScoreRing value={score} size={44} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <h4 className="font-display text-xl font-bold text-ink-900">No new postings above your bar</h4>
              <p className="mx-auto mt-2 max-w-md text-sm text-mist-600">Your existing matches were re-ranked. The agent will keep checking on schedule — lower the alert threshold in Settings for a wider net.</p>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
            <Btn variant="primary" icon="arrowR" onClick={() => { onClose(); setTab(found.length > 0 ? "matches" : "dashboard"); }}>
              {found.length > 0 ? "Review in Job Matches" : "Back to dashboard"}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

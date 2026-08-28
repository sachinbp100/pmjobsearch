import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { AppStatus, Job } from "./data";
import { fmtMoney } from "./data";
import type { JobScore, Recommendation } from "./engine";
import { useApp } from "./store";

// ─── icons (hand-drawn inline SVG, 24×24 stroke) ────────────────────────────
const PATHS: Record<string, ReactNode> = {
  compass: (<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9z" /></>),
  radar: (<><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 7a5 5 0 1 0 5 5" /><path d="M12 12l6.5-6.5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>),
  spark: (<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />),
  bookmark: (<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.6L6 20V5a1 1 0 0 1 1-1z" />),
  kanban: (<><rect x="4" y="4" width="4.6" height="16" rx="1" /><rect x="9.8" y="4" width="4.6" height="11" rx="1" /><rect x="15.6" y="4" width="4.6" height="7" rx="1" /></>),
  doc: (<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" /></>),
  pen: (<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19zM13.5 6.5l3 3" />),
  send: (<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-7-2.5z" />),
  building: (<><path d="M4 21V5l8-2v18M12 21h8V9l-8-2" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>),
  users: (<><circle cx="9" cy="9" r="3.4" /><path d="M2.8 19.5c1-3 3.3-4.7 6.2-4.7s5.2 1.7 6.2 4.7" /><path d="M15.5 5.8a3.4 3.4 0 1 1 0 6.4M17.6 14.9c2 .6 3.3 2.1 4 4.6" /></>),
  check: (<path d="M4.5 12.5 10 18 19.5 6.5" />),
  bell: (<><path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2.5h-15z" /><path d="M10 21a2.2 2.2 0 0 0 4 0" /></>),
  gear: (<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" /></>),
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></>),
  x: (<path d="M6 6l12 12M18 6 6 18" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  arrowR: (<path d="M4 12h16m-6-6 6 6-6 6" />),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>),
  calendar: (<><rect x="4" y="5.5" width="16" height="15" rx="1.5" /><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" /></>),
  mail: (<><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4.5 7 7.5 6 7.5-6" /></>),
  link: (<path d="M9.5 14.5 14.5 9.5M8 12l-2.5 2.5a3.5 3.5 0 0 0 5 5L13 17M16 12l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7" />),
  download: (<path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 19.5h15" />),
  copy: (<><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M15.5 8.5v-3a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3" /></>),
  alert: (<><path d="M12 3.5 22 20H2z" /><path d="M12 10v4.5" /><circle cx="12" cy="17" r="0.4" fill="currentColor" /></>),
  shield: (<><path d="M12 3 5 5.5v6c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5v-6z" /><path d="m8.8 11.8 2.2 2.2 4.4-4.4" /></>),
  zap: (<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />),
  external: (<><path d="M10 5H5v14h14v-5" /><path d="M14 4h6v6M20 4l-9 9" /></>),
  filter: (<path d="M4 5h16l-6.2 7.4v5.1L10.2 20v-7.6z" />),
  inbox: (<><path d="M4 13.5 6.5 5h11L20 13.5V19H4z" /><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20" /></>),
  briefcase: (<><rect x="3.5" y="7.5" width="17" height="12" rx="1.5" /><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17" /></>),
  chevD: (<path d="m6 9.5 6 6 6-6" />),
  chevR: (<path d="m9.5 6 6 6-6 6" />),
  star: (<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />),
  up: (<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>),
  chat: (<path d="M4 5h16v11H9l-5 4.5z" />),
  refresh: (<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5V8H15" />),
  flag: (<path d="M5.5 21V4.5S8 3 10.5 4.5 15 6 17.5 4.5V13S15 14.5 12.5 13 8 11.5 5.5 13" />),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  grip: (<><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" /></>),
  wand: (<><path d="m6 18 9.5-9.5M14 4.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7zM19 9l.5 1.4L21 11l-1.5.6L19 13l-.5-1.4L17 11l1.5-.6zM5 4l.5 1.4L7 6l-1.5.6L5 8l-.5-1.4L3 6l1.5-.6z" /></>),
  trash: (<><path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" /><path d="M10.5 11v5M13.5 11v5" /></>),
};

export function Icon({ name, size = 18, className = "" }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={"shrink-0 " + className} aria-hidden>
      {PATHS[name] ?? PATHS.spark}
    </svg>
  );
}

// ─── buttons & bits ──────────────────────────────────────────────────────────
export function Btn({ variant = "outline", size = "md", icon, children, className = "", style, ...rest }: {
  variant?: "primary" | "outline" | "ghost" | "ink" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === "sm" ? "text-xs px-2.5 py-1.5" : size === "lg" ? "text-[15px] px-5 py-2.5" : "text-sm px-3.5 py-2";
  return (
    <button className={`btn btn-${variant} ${sz} ${className}`} style={style} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export function Chip({ children, tone = "default", className = "" }: { children: ReactNode; tone?: "default" | "pine" | "gold" | "clay" | "ink" | "sky"; className?: string }) {
  const tones: Record<string, string> = {
    default: "bg-mist-50 text-ink-600 border-mist-300",
    pine: "bg-pine-50 text-pine-700 border-pine-200",
    gold: "bg-gold-50 text-gold-700 border-gold-100",
    clay: "bg-clay-50 text-clay-700 border-clay-100",
    ink: "bg-ink-900 text-ink-100 border-ink-700",
    sky: "bg-sky-50 text-sky-800 border-sky-200",
  };
  return <span className={`chip border ${tones[tone]} ${className}`}>{children}</span>;
}

// ─── status & recommendation ────────────────────────────────────────────────
const STATUS_TONE: Record<AppStatus, string> = {
  Discovered: "bg-mist-100 text-mist-700 border-mist-300",
  Reviewing: "bg-sky-50 text-sky-800 border-sky-200",
  Saved: "bg-gold-50 text-gold-700 border-gold-100",
  Preparing: "bg-gold-50 text-gold-700 border-gold-100",
  "Ready to Apply": "bg-pine-50 text-pine-700 border-pine-200",
  Applied: "bg-sky-50 text-sky-800 border-sky-200",
  "Recruiter Contacted": "bg-teal-50 text-teal-800 border-teal-200",
  "Interview Scheduled": "bg-pine-100 text-pine-800 border-pine-300",
  Interviewing: "bg-pine-600 text-white border-pine-600",
  Offer: "bg-pine-800 text-white border-pine-800",
  Rejected: "bg-clay-50 text-clay-700 border-clay-100",
  Closed: "bg-mist-200 text-mist-600 border-mist-300",
};
export function StatusPill({ status }: { status: AppStatus }) {
  return <span className={`chip border ${STATUS_TONE[status]}`}>{status}</span>;
}

const REC_TONE: Record<Recommendation, string> = {
  "Apply Immediately": "bg-pine-600 text-white border-pine-600",
  "Strong Match": "bg-pine-50 text-pine-700 border-pine-200",
  "Worth Considering": "bg-gold-50 text-gold-700 border-gold-100",
  "Stretch Opportunity": "bg-orange-50 text-orange-700 border-orange-200",
  "Low Match": "bg-clay-50 text-clay-700 border-clay-100",
  "Do Not Prioritize": "bg-mist-100 text-mist-600 border-mist-300",
};
export function RecBadge({ rec, size = "md" }: { rec: Recommendation; size?: "sm" | "md" }) {
  return <span className={`chip border ${REC_TONE[rec]} ${size === "sm" ? "!text-[0.65rem]" : ""}`}>{rec}</span>;
}

export const scoreColor = (v: number) => (v >= 85 ? "var(--color-pine-500)" : v >= 70 ? "var(--color-gold-500)" : "var(--color-clay-500)");
export const scoreText = (v: number) => (v >= 85 ? "text-pine-600" : v >= 70 ? "text-gold-600" : "text-clay-600");

export function ScoreRing({ value, size = 56, label = true }: { value: number; size?: number; label?: boolean }) {
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setDrawn(value), 60);
    return () => window.clearTimeout(t);
  }, [value]);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="score-ring relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={`Match ${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-mist-200)" strokeWidth="5" fill="none" />
        <circle className="ring-fg" cx={size / 2} cy={size / 2} r={r} stroke={scoreColor(value)} strokeWidth="5" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (drawn / 100) * c} />
      </svg>
      {label && <span className={`absolute font-display font-bold ${scoreText(value)}`} style={{ fontSize: size * 0.26 }}>{value}</span>}
    </div>
  );
}

// ─── company monogram ────────────────────────────────────────────────────────
const MONO_HUES = ["#0e7a4e", "#223944", "#9a650e", "#334e59", "#0b6340", "#6e8b96", "#b8432c"];
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  const h = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % MONO_HUES.length;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-lg font-display font-bold text-white select-none"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${MONO_HUES[h]}, ${MONO_HUES[(h + 2) % MONO_HUES.length]})`, fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
}

// ─── modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink-950/60 anim-pop" onClick={onClose} />
      <div className={`card relative z-10 w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[88vh] overflow-y-auto anim-pop shadow-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-mist-200 bg-white/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost !p-1.5" aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange, className = "" }: { tabs: { id: string; label: string; icon?: string }[]; active: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={`flex gap-1 overflow-x-auto no-scrollbar border-b border-mist-200 ${className}`}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${active === t.id ? "border-pine-600 text-pine-700" : "border-transparent text-mist-600 hover:text-ink-800"}`}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-5.5 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-pine-600" : "bg-mist-300"}`} style={{ height: 22 }}>
      <span className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 3 }} />
    </button>
  );
}

// ─── misc ────────────────────────────────────────────────────────────────────
export function EmptyState({ icon = "compass", title, sub, action }: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist-100 text-mist-500"><Icon name={icon} size={22} /></div>
      <p className="font-display text-base font-semibold text-ink-800">{title}</p>
      {sub && <p className="max-w-sm text-sm text-mist-600">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Shimmer({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-2.5" aria-label="AI is generating">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer-line" style={{ width: `${88 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}

export function SectionHead({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <p className="label-mono mb-1">{kicker}</p>}
        <h2 className="font-display text-[1.65rem] font-bold leading-tight text-ink-900">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-sm text-mist-600">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function CopyBtn({ text, label = "Copy", size = "sm" }: { text: string; label?: string; size?: "sm" | "md" }) {
  const { toast } = useApp();
  return (
    <Btn size={size} icon="copy" onClick={async () => {
      try { await navigator.clipboard.writeText(text); toast("Copied to clipboard"); }
      catch { toast("Copy failed — select and copy manually", "err"); }
    }}>{label}</Btn>
  );
}

// ─── fake AI runner (staged generation w/ reduced-motion respect) ───────────
export function useFakeAI() {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const run = (stages: string[], onDone: () => void) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setStage(stages[stages.length - 1]); onDone(); return; }
    setBusy(true);
    let i = 0;
    const step = () => {
      setStage(stages[i]);
      i += 1;
      if (i < stages.length) { timer.current = window.setTimeout(step, 520 + Math.random() * 260); }
      else { timer.current = window.setTimeout(() => { setBusy(false); onDone(); }, 560); }
    };
    step();
  };
  return { busy, stage, run };
}

// ─── toast host ──────────────────────────────────────────────────────────────
export function ToastHost() {
  const { state, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex w-80 flex-col gap-2">
      {state.toasts.map((t) => (
        <div key={t.id} className={`anim-slide-right pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium shadow-lg backdrop-blur ${
          t.kind === "err" ? "border-clay-100 bg-clay-50/95 text-clay-700" : t.kind === "warn" ? "border-gold-100 bg-gold-50/95 text-gold-700" : "border-pine-200 bg-white/95 text-ink-800"}`}>
          <span className={t.kind === "err" ? "text-clay-500" : t.kind === "warn" ? "text-gold-500" : "text-pine-600"}>
            <Icon name={t.kind === "ok" ? "check" : "alert"} size={16} />
          </span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => dismissToast(t.id)} className="text-mist-400 hover:text-ink-700" aria-label="Dismiss"><Icon name="x" size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── job card ────────────────────────────────────────────────────────────────
export function JobCard({ job, score, index = 0, onOpen }: { job: Job; score: JobScore; index?: number; onOpen: (id: string) => void }) {
  const { state, toggleSave, addApplication, toast } = useApp();
  const saved = state.savedIds.includes(job.id);
  const inPipeline = state.applications.some((a) => a.jobId === job.id);
  return (
    <article className="card card-hover anim-fade-up group cursor-pointer p-4" style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
      onClick={() => onOpen(job.id)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(job.id); }}>
      <div className="flex items-start gap-3.5">
        <Monogram name={job.company} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-[15px] font-semibold text-ink-900 group-hover:text-pine-700 transition-colors">{job.title}</h3>
            {job.isNew && !job.live && <Chip tone="pine">NEW</Chip>}
            {job.live && <Chip tone="gold"><Icon name="radar" size={10} />LIVE</Chip>}
          </div>
          <p className="mt-0.5 text-[13px] text-mist-600">
            {job.company} · {job.industry}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-mist-600">
            <span className="inline-flex items-center gap-1"><Icon name="building" size={12} />{job.location}</span>
            <span aria-hidden>·</span>
            <span>{job.mode}</span>
            {job.salaryMax && (<><span aria-hidden>·</span><span className="font-mono font-medium text-ink-700">{fmtMoney(job.salaryMin ?? 0)}–{fmtMoney(job.salaryMax)}</span></>)}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} />{job.postedDaysAgo === 0 ? "today" : `${job.postedDaysAgo}d ago`}</span>
            {job.deadlineInDays !== undefined && (<><span aria-hidden>·</span><span className="text-gold-600">deadline {job.deadlineInDays}d</span></>)}
          </div>
          <div className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
            {score.matched.slice(0, 4).map((s) => <Chip key={s} tone="pine">{s}</Chip>)}
            {score.missing.slice(0, 2).map((s) => <Chip key={s} tone="clay">{s} ✕</Chip>)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ScoreRing value={score.overall} size={52} />
          <RecBadge rec={score.rec} size="sm" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-mist-100 pt-3" onClick={(e) => e.stopPropagation()}>
        <Btn size="sm" variant="ink" icon="wand" onClick={() => onOpen(job.id)}>AI Analysis</Btn>
        <Btn size="sm" icon="bookmark" variant={saved ? "soft" : "ghost"} onClick={() => { toggleSave(job.id); toast(saved ? "Removed from watchlist" : `Saved ${job.company}`); }}>{saved ? "Saved" : "Save"}</Btn>
        {!inPipeline ? (
          <Btn size="sm" icon="plus" variant="ghost" onClick={() => { const id = addApplication(job.id, "Reviewing"); if (id) toast(`${job.company} added to your pipeline`); }}>Track</Btn>
        ) : (
          <Chip tone="sky">In pipeline</Chip>
        )}
        <span className="ml-auto hidden font-mono text-[11px] text-mist-400 md:block">{job.source}</span>
      </div>
    </article>
  );
}

import { useMemo, useState } from "react";
import type { TaskType } from "../data";
import { daysUntil, fmtDate } from "../data";
import { useApp } from "../store";
import { Btn, Chip, EmptyState, Icon, Modal, SectionHead, Toggle } from "../ui";

// ─── TASKS & REMINDERS ───────────────────────────────────────────────────────
const TYPE_META: Record<TaskType, { label: string; tone: "pine" | "gold" | "sky" | "clay" | "default" }> = {
  "follow-up": { label: "follow-up", tone: "gold" },
  application: { label: "application", tone: "pine" },
  prep: { label: "interview prep", tone: "sky" },
  networking: { label: "networking", tone: "default" },
  review: { label: "review", tone: "clay" },
};

export function TasksPage() {
  const { state, toggleTask, removeTask, addTask, toast } = useApp();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<TaskType>("follow-up");
  const [recurring, setRecurring] = useState<"" | "daily" | "weekly">("");
  const [filter, setFilter] = useState<"all" | TaskType>("all");

  const tasks = useMemo(() => state.tasks.filter((t) => filter === "all" || t.type === filter), [state.tasks, filter]);
  const groups: [string, (typeof tasks)][] = [
    ["Overdue", tasks.filter((t) => !t.done && daysUntil(t.due) < 0)],
    ["Today", tasks.filter((t) => !t.done && daysUntil(t.due) === 0)],
    ["Upcoming", tasks.filter((t) => !t.done && daysUntil(t.due) > 0 && !t.recurring)],
    ["Recurring", tasks.filter((t) => !t.done && t.recurring)],
    ["Done", tasks.filter((t) => t.done)],
  ];

  return (
    <div>
      <SectionHead kicker="Deadlines, follow-ups, prep blocks" title="Tasks & Reminders"
        sub="One-off and recurring reminders across your whole search — many are created automatically by the agent and your application events." />

      <div className="card mb-5 p-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input className="input" placeholder="New task — e.g., Follow up with Ledgerline" value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) { addTask({ title: title.trim(), due, type, recurring: recurring || undefined }); setTitle(""); toast("Task added"); } }} />
          <input type="date" className="input !w-auto" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <select className="select !w-auto" value={type} onChange={(e) => setType(e.target.value as TaskType)} aria-label="Type">
            {(Object.keys(TYPE_META) as TaskType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
          <select className="select !w-auto" value={recurring} onChange={(e) => setRecurring(e.target.value as typeof recurring)} aria-label="Recurrence">
            <option value="">One-time</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
          </select>
          <Btn variant="primary" icon="plus" onClick={() => { if (title.trim()) { addTask({ title: title.trim(), due, type, recurring: recurring || undefined }); setTitle(""); toast("Task added"); } }}>Add</Btn>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button onClick={() => setFilter("all")} className={`chip border ${filter === "all" ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>All</button>
          {(Object.keys(TYPE_META) as TaskType[]).map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`chip border ${filter === t ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>{TYPE_META[t].label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(([label, items]) => items.length === 0 ? null : (
          <section key={label}>
            <h3 className={`mb-2 flex items-center gap-2 font-display text-[15px] font-bold ${label === "Overdue" ? "text-clay-600" : label === "Today" ? "text-gold-600" : "text-ink-900"}`}>
              {label}
              <span className="rounded-full bg-mist-200 px-2 font-mono text-xs text-mist-700">{items.length}</span>
            </h3>
            <div className="space-y-2">
              {items.map((t) => {
                const j = t.jobId ? state.jobs.find((x) => x.id === t.jobId) : undefined;
                return (
                  <div key={t.id} className={`card card-hover flex items-center gap-3 px-3.5 py-2.5 ${t.done ? "opacity-55" : ""} ${label === "Overdue" ? "border-clay-100" : ""}`}>
                    <input type="checkbox" className="h-4 w-4 accent-pine-600" checked={t.done} onChange={() => { toggleTask(t.id); toast(t.done ? "Task reopened" : "Task done — nice"); }} aria-label="Toggle done" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13.5px] font-medium ${t.done ? "text-mist-500 line-through" : "text-ink-800"}`}>{t.title}</p>
                      <p className="text-[11px] text-mist-500">{j ? `${j.company} · ` : ""}{t.recurring ? `repeats ${t.recurring} · ` : ""}due {fmtDate(t.due)}</p>
                    </div>
                    <Chip tone={TYPE_META[t.type].tone}>{TYPE_META[t.type].label}</Chip>
                    <span className={`font-mono text-xs font-semibold ${daysUntil(t.due) < 0 && !t.done ? "text-clay-600" : daysUntil(t.due) === 0 && !t.done ? "text-gold-600" : "text-mist-400"}`}>
                      {t.done ? "✓" : daysUntil(t.due) < 0 ? `${-daysUntil(t.due)}d late` : daysUntil(t.due) === 0 ? "today" : `in ${daysUntil(t.due)}d`}
                    </span>
                    <button onClick={() => { removeTask(t.id); toast("Task removed", "warn"); }} className="text-mist-400 hover:text-clay-600" aria-label="Delete task"><Icon name="x" size={15} /></button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {tasks.length === 0 && <EmptyState icon="flag" title="No tasks here" sub="Add one above — or let the agent create follow-ups automatically as you apply." />}
      </div>
    </div>
  );
}

// ─── SETTINGS & INTEGRATIONS ────────────────────────────────────────────────
export function SettingsPage() {
  const { state, updateSettings, toast, resetAll } = useApp();
  const s = state.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const [runNow, setRunNow] = useState(false);

  const INTEGRATIONS: { key: "gmail" | "linkedin" | "calendar" | "browser"; name: string; desc: string; icon: string }[] = [
    { key: "gmail", name: "Gmail", desc: "Classifies recruiter mail, interview invites and rejections.", icon: "mail" },
    { key: "linkedin", name: "LinkedIn", desc: "Imports saved jobs and recruiter posts you engage with.", icon: "users" },
    { key: "calendar", name: "Calendar", desc: "Blocks prep time and adds interviews automatically (with approval).", icon: "calendar" },
    { key: "browser", name: "Browser Companion", desc: "Offers “Analyze This Job” on any posting you're viewing.", icon: "radar" },
  ];

  return (
    <div className="space-y-6">
      <SectionHead kicker="Preferences, schedule, connections" title="Settings & Integrations"
        sub="Everything here feeds the matching engine and the daily agent. Changes re-rank your matches immediately." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* daily agent */}
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="radar" size={17} /></span>Daily job-search agent</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="label-mono mb-1">Run time</p>
              <input type="time" className="input" value={s.scheduleTime} onChange={(e) => updateSettings({ scheduleTime: e.target.value })} />
            </div>
            <div>
              <p className="label-mono mb-1">Frequency</p>
              <select className="select" value={s.scheduleFreq} onChange={(e) => updateSettings({ scheduleFreq: e.target.value as typeof s.scheduleFreq })}>
                <option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly (Monday)</option>
              </select>
            </div>
            <div>
              <p className="label-mono mb-1">Alert threshold</p>
              <input type="range" min={70} max={95} value={s.minScoreToAlert} className="w-full accent-pine-600"
                onChange={(e) => updateSettings({ minScoreToAlert: Number(e.target.value) })} aria-label="Alert threshold" />
              <p className="text-xs text-mist-600">High-priority alert at <b className="font-mono text-pine-700">≥ {s.minScoreToAlert}%</b></p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <Toggle on={s.autoAddHighMatch} onChange={(v) => updateSettings({ autoAddHighMatch: v })} label="Auto-add high matches" />
                Auto-add high matches to dashboard
              </label>
            </div>
          </div>
          <div className="mt-4 border-t border-mist-100 pt-3">
            <p className="label-mono mb-2">Connected sources</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(s.sources).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-[13px] text-ink-700">
                  <Toggle on={v} onChange={(nv) => updateSettings({ sources: { ...s.sources, [k]: nv } })} label={k} />{k}
                </label>
              ))}
            </div>
          </div>
          <Btn variant="ink" icon="radar" className="mt-4" onClick={() => { setRunNow(true); window.setTimeout(() => setRunNow(false), 900); toast("Agent queued — open “Find My Next Best Job” to watch it run"); }}>Run agent now</Btn>
          {runNow && <p className="caret mt-2 font-mono text-xs text-pine-700">contacting sources</p>}
        </section>

        {/* integrations */}
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="link" size={17} /></span>Connected accounts & plugins</h3>
          <div className="mt-3 space-y-2.5">
            {INTEGRATIONS.map((it) => {
              const on = s.integrations[it.key];
              return (
                <div key={it.key} className={`flex items-center gap-3 rounded-lg border p-3 ${on ? "border-pine-200 bg-pine-50/50" : "border-mist-200"}`}>
                  <span className={on ? "text-pine-600" : "text-mist-400"}><Icon name={it.icon} size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-800">{it.name}</p>
                    <p className="text-[11.5px] text-mist-600">{it.desc}</p>
                  </div>
                  <span className={`relative flex h-2 w-2 ${on ? "" : "opacity-30"}`}><span className={`h-2 w-2 rounded-full ${on ? "pulse-dot bg-pine-500" : "bg-mist-400"}`} /></span>
                  <Btn size="sm" variant={on ? "outline" : "primary"} onClick={() => {
                    updateSettings({ integrations: { ...s.integrations, [it.key]: !on } });
                    toast(on ? `${it.name} disconnected` : `${it.name} connected — OAuth simulated`, on ? "warn" : "ok");
                  }}>{on ? "Disconnect" : "Connect"}</Btn>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-md border border-mist-200 bg-mist-50 p-2.5 text-[11.5px] leading-relaxed text-mist-600">
            <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-pine-600" />
            Human-in-the-loop always: integrations can <b>suggest</b> actions (replies, calendar blocks, status moves) — nothing irreversible happens without your explicit approval.
          </p>
        </section>

        {/* notifications */}
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="bell" size={17} /></span>Notifications</h3>
          <div className="mt-3 space-y-2.5">
            {([
              ["highMatch", "High-priority job alerts", "Immediate alert when the agent finds a match above your threshold."],
              ["deadlines", "Application deadlines", "Warns 48h and 6h before a posting closes."],
              ["followUps", "Follow-up reminders", "Nudges you when a follow-up date arrives."],
              ["weeklyDigest", "Weekly digest", "Sunday summary of pipeline movement and new matches."],
            ] as const).map(([k, label, desc]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-mist-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{label}</p>
                  <p className="text-[11.5px] text-mist-600">{desc}</p>
                </div>
                <Toggle on={s.notifications[k]} onChange={(v) => updateSettings({ notifications: { ...s.notifications, [k]: v } })} label={label} />
              </div>
            ))}
          </div>
        </section>

        {/* privacy */}
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="shield" size={17} /></span>Privacy & data</h3>
          <p className="mt-2.5 text-[13px] leading-relaxed text-mist-600">
            Your career profile, applications and materials live in this browser (local-first). Nothing is sent to job boards or recruiters unless <b>you</b> copy, export or approve it. The accuracy guardrail — <span className="font-mono text-xs">Accuracy &gt; Personalization &gt; Keywords &gt; Automation</span> — is enforced on every generation.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Btn variant="danger" icon="refresh" onClick={() => setConfirmReset(true)}>Reset workspace to seed data</Btn>
          </div>
        </section>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?">
        <p className="text-sm text-mist-600">This clears your local changes (applications, letters, tasks, profile edits) and restores the demo workspace. This cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => { resetAll(); setConfirmReset(false); toast("Workspace reset to seed data", "warn"); }}>Yes, reset</Btn>
        </div>
      </Modal>
    </div>
  );
}

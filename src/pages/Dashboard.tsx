import { useMemo } from "react";
import type { AppStatus } from "../data";
import { daysUntil, fmtDate, fmtMoney } from "../data";
import { scoreJob } from "../engine";
import { useApp } from "../store";
import { Btn, Chip, Icon, Monogram, RecBadge, ScoreRing, StatusPill } from "../ui";

const hour = new Date().getHours();
const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

export default function Dashboard({ onRunAgent }: { onRunAgent: () => void }) {
  const { state, openJob, setTab, toggleTask, actInbox, toast, setStatus } = useApp();
  const { profile, jobs, applications, tasks, inbox, agentLog } = state;

  const scored = useMemo(
    () => jobs.map((j) => ({ job: j, score: scoreJob(j, profile) })).sort((a, b) => b.score.overall - a.score.overall),
    [jobs, profile]
  );
  const top = scored.slice(0, 5);
  const newStrong = scored.filter((s) => s.job.isNew && s.score.overall >= 80).length;
  const active = applications.filter((a) => !["Rejected", "Closed", "Offer"].includes(a.status)).length;
  const appliedWaiting = applications.filter((a) => ["Applied", "Recruiter Contacted"].includes(a.status)).length;
  const interviews = applications.filter((a) => ["Interview Scheduled", "Interviewing"].includes(a.status));
  const followUpsDue = applications.filter((a) => a.followUpDate && daysUntil(a.followUpDate) <= 0 && !["Rejected", "Closed", "Offer"].includes(a.status)).length;
  const tasksDue = tasks.filter((t) => !t.done && daysUntil(t.due) <= 1);
  const inboxPending = inbox.filter((m) => !m.acted);
  const jobOf = (id: string) => jobs.find((j) => j.id === id);
  const appByJob = (jobId: string) => applications.find((a) => a.jobId === jobId);

  const moves: { icon: string; text: string; sub: string; action: () => void; cta: string; tone: "gold" | "pine" | "clay" }[] = [];
  for (const a of applications.filter((x) => x.status === "Ready to Apply").slice(0, 2)) {
    const j = jobOf(a.jobId);
    if (j) moves.push({ icon: "send", text: `Submit application — ${j.company}`, sub: `${j.title} · materials approved`, action: () => openJob(j.id, "letter"), cta: "Finish", tone: "pine" });
  }
  for (const a of applications.filter((x) => x.followUpDate && daysUntil(x.followUpDate) <= 0 && ["Applied", "Recruiter Contacted"].includes(x.status)).slice(0, 2)) {
    const j = jobOf(a.jobId);
    if (j) moves.push({ icon: "refresh", text: `Follow up — ${j.company}`, sub: `Follow-up date ${fmtDate(a.followUpDate)} (${daysUntil(a.followUpDate) < 0 ? "overdue" : "today"})`, action: () => openJob(j.id, "outreach"), cta: "Draft nudge", tone: "gold" });
  }
  for (const t of tasksDue.slice(0, 2)) {
    moves.push({ icon: "check", text: t.title, sub: `${t.type} · due ${fmtDate(t.due)}`, action: () => setTab("tasks"), cta: "Review", tone: daysUntil(t.due) < 0 ? "clay" : "gold" });
  }

  const stats: { label: string; value: number | string; icon: string; hint: string; accent?: boolean }[] = [
    { label: "New strong matches", value: newStrong, icon: "spark", hint: "scored ≥ 80 since last run" },
    { label: "Active pipeline", value: active, icon: "kanban", hint: "applications in play" },
    { label: "Awaiting response", value: appliedWaiting, icon: "clock", hint: "applied / contacted" },
    { label: "Interviews", value: interviews.length, icon: "target", hint: interviews[0]?.interviewDate ? `next ${fmtDate(interviews[0].interviewDate)}` : "none scheduled", accent: interviews.length > 0 },
    { label: "Follow-ups due", value: followUpsDue, icon: "refresh", hint: "today or overdue" },
    { label: "Tasks due ≤ 2 days", value: tasksDue.length, icon: "flag", hint: "job-search work" },
  ];

  return (
    <div className="space-y-5">
      {/* command strip */}
      <div className="anim-fade-up relative overflow-hidden rounded-xl bg-ink-900 p-5 sm:p-6 sidebar-bg">
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="label-mono !text-ink-300">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-[1.75rem]">{greeting}, {profile.name.split(" ")[0]}.</h1>
            <p className="mt-1 max-w-xl text-sm text-ink-200">
              The agent scanned <b className="text-pine-300">{scored.length} open roles</b> against your verified profile.
              {top[0] ? <> Today's best: <b className="text-white">{top[0].job.title} @ {top[0].job.company}</b> — {top[0].score.overall}% match.</> : null}
            </p>
          </div>
          <button onClick={onRunAgent}
            className="group relative flex items-center gap-3 rounded-lg bg-pine-600 px-5 py-3.5 text-left font-display text-[15px] font-semibold text-white shadow-lg shadow-pine-900/40 transition-all hover:bg-pine-500 hover:shadow-pine-900/60 active:scale-[0.98]">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine-300 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pine-200" /></span>
            <span>Find My Next Best Job<br /><span className="font-body text-[11px] font-normal text-pine-100">run the daily search agent</span></span>
            <Icon name="radar" size={26} className="text-pine-200 transition-transform group-hover:rotate-45" />
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <div key={s.label} className={`card card-hover anim-fade-up p-3.5 ${s.accent ? "border-pine-300" : ""}`} style={{ animationDelay: `${i * 55}ms` }}>
            <div className="flex items-center justify-between">
              <span className="label-mono">{s.label}</span>
              <span className={s.accent ? "text-pine-600" : "text-mist-400"}><Icon name={s.icon} size={16} /></span>
            </div>
            <p className="mt-1.5 font-display text-[1.9rem] font-bold leading-none text-ink-900">{s.value}</p>
            <p className="mt-1 text-[11px] text-mist-500">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* left column */}
        <div className="space-y-5">
          <section className="anim-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="mb-2.5 flex items-end justify-between">
              <div>
                <p className="label-mono">Ranked against your verified profile</p>
                <h2 className="font-display text-xl font-bold text-ink-900">Today's best matches</h2>
              </div>
              <Btn size="sm" variant="ghost" icon="arrowR" onClick={() => setTab("matches")}>All matches</Btn>
            </div>
            <div className="space-y-2.5">
              {top.map(({ job, score }, i) => {
                const a = appByJob(job.id);
                return (
                  <div key={job.id} className="card card-hover cursor-pointer p-3.5" onClick={() => openJob(job.id)} role="button" tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && openJob(job.id)} style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-mono text-sm font-semibold text-mist-400">#{i + 1}</span>
                      <Monogram name={job.company} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[14.5px] font-semibold text-ink-900">{job.title}</p>
                          {job.isNew && <Chip tone="pine">NEW</Chip>}
                          {a && <StatusPill status={a.status} />}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-mist-600">{job.company} · {job.location} · {job.mode}{job.salaryMax ? ` · ${fmtMoney(job.salaryMin ?? 0)}–${fmtMoney(job.salaryMax)}` : ""}</p>
                      </div>
                      <div className="hidden md:block"><RecBadge rec={score.rec} size="sm" /></div>
                      <ScoreRing value={score.overall} size={46} />
                    </div>
                    <p className="mt-2 border-t border-mist-100 pt-2 text-xs text-mist-600"><span className="font-semibold text-pine-700">Why:</span> {score.reason}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="anim-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="mb-2.5 flex items-end justify-between">
              <div>
                <p className="label-mono">What needs you now</p>
                <h2 className="font-display text-xl font-bold text-ink-900">Your next moves</h2>
              </div>
              <Btn size="sm" variant="ghost" icon="arrowR" onClick={() => setTab("applications")}>Pipeline</Btn>
            </div>
            {moves.length === 0 ? (
              <div className="card p-5 text-sm text-mist-600">Nothing urgent — pipeline is clean. Run the agent to find fresh opportunities.</div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {moves.map((m, i) => (
                  <div key={i} className={`card card-hover flex items-start gap-3 p-3.5 ${m.tone === "clay" ? "border-clay-100" : m.tone === "pine" ? "border-pine-200" : "border-gold-100"}`}>
                    <span className={`mt-0.5 ${m.tone === "pine" ? "text-pine-600" : m.tone === "gold" ? "text-gold-600" : "text-clay-500"}`}><Icon name={m.icon} size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold leading-snug text-ink-800">{m.text}</p>
                      <p className="mt-0.5 text-xs text-mist-600">{m.sub}</p>
                      <button onClick={m.action} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pine-700 hover:text-pine-800">{m.cta}<Icon name="arrowR" size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* right rail */}
        <div className="space-y-5">
          <section className="card anim-fade-up p-4" style={{ animationDelay: "160ms" }}>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="inbox" size={16} /></span>Recruiter inbox</h3>
              <span className="chip border border-mist-300 bg-mist-50 font-mono text-mist-600">{inboxPending.length} new</span>
            </div>
            {inboxPending.length === 0 && <p className="text-sm text-mist-500">All caught up — no unhandled recruiter messages.</p>}
            <div className="space-y-2.5">
              {inboxPending.map((m) => {
                const j = m.jobId ? jobOf(m.jobId) : undefined;
                const a = m.jobId ? appByJob(m.jobId) : undefined;
                return (
                  <div key={m.id} className="rounded-lg border border-mist-200 p-3">
                    <div className="flex items-center gap-2">
                      <Chip tone={m.kind === "Interview Invitation" ? "pine" : m.kind === "Rejection" ? "clay" : "sky"}>{m.kind}</Chip>
                      <span className="truncate text-xs text-mist-500">{m.company}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-snug text-ink-700">{m.summary}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.kind === "Interview Invitation" && a && (
                        <Btn size="sm" variant="primary" icon="calendar" onClick={() => { actInbox(m.id, { appId: a.id, status: "Interview Scheduled" as AppStatus }); toast(`Moved to Interview Scheduled — ${fmtDate(a.interviewDate ?? "")}`); }}>Schedule</Btn>
                      )}
                      {j && <Btn size="sm" icon="eye" onClick={() => openJob(j.id)}>Open job</Btn>}
                      <Btn size="sm" variant="ghost" icon="check" onClick={() => { actInbox(m.id); toast("Marked handled"); }}>Done</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card anim-fade-up p-4" style={{ animationDelay: "220ms" }}>
            <h3 className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="radar" size={16} /></span>Daily agent feed</h3>
            <ol className="space-y-2">
              {agentLog.slice(0, 5).map((l) => (
                <li key={l.id} className="flex gap-2.5 text-[12.5px]">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${l.kind === "alert" ? "bg-gold-500" : "bg-pine-500"}`} />
                  <div>
                    <p className="leading-snug text-ink-700">{l.text}</p>
                    <p className="font-mono text-[10.5px] text-mist-400">{l.at.replace("T", " · ")}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card anim-fade-up p-4" style={{ animationDelay: "280ms" }}>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="flag" size={16} /></span>Reminders</h3>
              <Btn size="sm" variant="ghost" onClick={() => setTab("tasks")}>All</Btn>
            </div>
            <div className="space-y-1.5">
              {tasks.filter((t) => !t.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4).map((t) => (
                <label key={t.id} className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1 hover:bg-mist-50">
                  <input type="checkbox" className="mt-1 h-3.5 w-3.5 accent-pine-600" checked={t.done} onChange={() => toggleTask(t.id)} />
                  <span className="flex-1 text-[12.5px] leading-snug text-ink-700">{t.title}</span>
                  <span className={`font-mono text-[10.5px] ${daysUntil(t.due) < 0 ? "text-clay-600" : daysUntil(t.due) === 0 ? "text-gold-600" : "text-mist-400"}`}>{fmtDate(t.due)}</span>
                </label>
              ))}
            </div>
          </section>

          {interviews.length > 0 && (
            <section className="card anim-fade-up border-pine-200 bg-pine-50/50 p-4" style={{ animationDelay: "340ms" }}>
              <h3 className="mb-2 flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="target" size={16} /></span>Upcoming interviews</h3>
              {interviews.map((a) => {
                const j = jobOf(a.jobId);
                if (!j) return null;
                return (
                  <div key={a.id} className="mb-2 flex items-center gap-2.5 rounded-lg border border-pine-200 bg-white p-2.5">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-pine-600 font-mono text-white">
                      <span className="text-[9px] uppercase leading-none">{fmtDate(a.interviewDate).split(" ")[0]}</span>
                      <span className="text-sm font-bold leading-tight">{fmtDate(a.interviewDate).split(" ")[1]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{j.company}</p>
                      <p className="text-[11px] text-mist-600">{j.title}</p>
                    </div>
                    <Btn size="sm" variant="primary" icon="target" onClick={() => { setTab("interview"); openJob(j.id, "analysis"); }}>Prep</Btn>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

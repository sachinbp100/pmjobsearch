import { useMemo, useState } from "react";
import type { Application, AppStatus } from "../data";
import { ALL_STATUSES, daysUntil, fmtDate } from "../data";
import { scoreJob } from "../engine";
import { useApp } from "../store";
import { Btn, Chip, EmptyState, Icon, ScoreRing, SectionHead, StatusPill } from "../ui";

const COLUMNS: { id: string; label: string; statuses: AppStatus[] }[] = [
  { id: "new", label: "New", statuses: ["Discovered", "Reviewing", "Saved"] },
  { id: "prep", label: "Preparing", statuses: ["Preparing", "Ready to Apply"] },
  { id: "applied", label: "Applied", statuses: ["Applied", "Recruiter Contacted"] },
  { id: "interview", label: "Interview", statuses: ["Interview Scheduled", "Interviewing"] },
  { id: "offer", label: "Offer", statuses: ["Offer"] },
  { id: "closed", label: "Closed", statuses: ["Rejected", "Closed"] },
];

export default function Applications() {
  const { state, openJob, setStatus, toast, addNote } = useApp();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const apps = state.applications;
  const jobOf = (id: string) => state.jobs.find((j) => j.id === id);
  const scoreOf = (jobId: string) => {
    const j = jobOf(jobId);
    return j ? scoreJob(j, state.profile).overall : 0;
  };

  const metrics: [string, number, string][] = [
    ["Discovered", apps.length, "icon:radar"],
    ["Saved", state.savedIds.length, "icon:bookmark"],
    ["Submitted", apps.filter((a) => a.appliedOn).length, "icon:send"],
    ["Awaiting response", apps.filter((a) => ["Applied", "Recruiter Contacted"].includes(a.status)).length, "icon:clock"],
    ["Recruiter convos", apps.filter((a) => a.status === "Recruiter Contacted").length, "icon:chat"],
    ["Interviews", apps.filter((a) => ["Interview Scheduled", "Interviewing"].includes(a.status)).length, "icon:target"],
    ["Offers", apps.filter((a) => a.status === "Offer").length, "icon:star"],
  ];

  const move = (appId: string, col: string) => {
    const target = COLUMNS.find((c) => c.id === col)!;
    const app = apps.find((a) => a.id === appId)!;
    if (target.statuses.includes(app.status)) return;
    const next = app.status === "Saved" && col === "new" ? "Reviewing" : target.statuses[0];
    setStatus(appId, next);
    toast(`${jobOf(app.jobId)?.company ?? "Application"} → ${next}`);
  };

  return (
    <div>
      <SectionHead kicker="Your job-search CRM" title="Applications"
        sub="Complete history of every application — statuses, materials used, follow-ups, interviews and notes."
        right={
          <div className="flex rounded-lg border border-mist-300 bg-white p-0.5">
            {(["kanban", "table"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${view === v ? "bg-ink-900 text-white" : "text-mist-600 hover:text-ink-800"}`}>
                <Icon name={v === "kanban" ? "kanban" : "doc"} size={14} />{v}
              </button>
            ))}
          </div>
        } />

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        {metrics.map(([label, val, ic], i) => (
          <div key={label as string} className="card anim-fade-up px-3 py-2.5" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="label-mono flex items-center gap-1.5"><span className="text-pine-600"><Icon name={(ic as string).slice(5)} size={12} /></span>{label}</p>
            <p className="mt-0.5 font-display text-xl font-bold text-ink-900">{val}</p>
          </div>
        ))}
      </div>

      {apps.length === 0 ? (
        <EmptyState icon="kanban" title="No applications yet" sub="Track a role from Job Matches or Discover and it will appear here across every stage." />
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = apps.filter((a) => col.statuses.includes(a.status));
            return (
              <div key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => { e.preventDefault(); setOverCol(null); if (dragId) move(dragId, col.id); setDragId(null); }}
                className={`flex w-[248px] shrink-0 flex-col rounded-xl border bg-mist-50/80 transition-colors ${overCol === col.id ? "border-pine-400 bg-pine-50/60" : "border-mist-200"}`}>
                <div className="flex items-center justify-between px-3 pb-1 pt-3">
                  <p className="label-mono !text-ink-600">{col.label}</p>
                  <span className="rounded-full bg-mist-200 px-1.5 font-mono text-[11px] font-semibold text-mist-700">{items.length}</span>
                </div>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
                  {items.map((a) => <KanbanCard key={a.id} app={a} onDrag={setDragId} onOpen={() => openJob(a.jobId)} dragging={dragId === a.id} />)}
                  {items.length === 0 && <p className="px-2 py-4 text-center text-[11px] text-mist-400">Drop applications here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist-200 text-[11px] uppercase tracking-wider text-mist-500">
                {["Company / Role", "Match", "Status", "Discovered", "Applied", "Follow-up", "Interview", "", ""].map((h, i) => <th key={i} className="px-3 py-2.5 font-mono font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const j = jobOf(a.jobId);
                if (!j) return null;
                const s = scoreOf(a.jobId);
                const open = expanded === a.id;
                return (
                  <FragmentRow key={a.id}>
                    <tr className={`cursor-pointer border-b border-mist-100 transition-colors hover:bg-mist-50 ${open ? "bg-mist-50" : ""}`} onClick={() => setExpanded(open ? null : a.id)}>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-ink-800">{j.company}</p>
                        <p className="text-xs text-mist-500">{j.title}</p>
                      </td>
                      <td className="px-3 py-2.5"><span className={`font-mono font-bold ${s >= 85 ? "text-pine-600" : s >= 70 ? "text-gold-600" : "text-clay-600"}`}>{s}%</span></td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <select className="select !w-auto !py-1 text-xs" value={a.status} onChange={(e) => { setStatus(a.id, e.target.value as AppStatus); toast(`Status → ${e.target.value}`); }} aria-label="Status">
                          {ALL_STATUSES.map((st) => <option key={st}>{st}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-mist-600">{fmtDate(a.discoveredOn)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-mist-600">{fmtDate(a.appliedOn)}</td>
                      <td className="px-3 py-2.5">
                        {a.followUpDate ? (
                          <span className={`font-mono text-xs ${daysUntil(a.followUpDate) < 0 ? "font-bold text-clay-600" : daysUntil(a.followUpDate) === 0 ? "font-bold text-gold-600" : "text-mist-600"}`}>{fmtDate(a.followUpDate)}</span>
                        ) : <span className="text-mist-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-mist-600">{a.interviewDate ? fmtDate(a.interviewDate) : "—"}</td>
                      <td className="px-3 py-2.5">{a.notes.length > 0 && <Chip tone="gold">{a.notes.length} note{a.notes.length > 1 ? "s" : ""}</Chip>}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Btn size="sm" icon="eye" onClick={() => openJob(a.jobId)}>Open</Btn>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-mist-100 bg-mist-50/70">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="label-mono mb-1.5">Notes</p>
                              <div className="space-y-1.5">
                                {a.notes.length === 0 && <p className="text-xs text-mist-500">No notes yet.</p>}
                                {a.notes.map((n, i) => (
                                  <p key={i} className="rounded-md border border-mist-200 bg-white p-2 text-xs text-ink-700"><span className="font-mono text-[10px] text-mist-400">{fmtDate(n.at)} · </span>{n.text}</p>
                                ))}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <input className="input !py-1.5 text-xs" placeholder="Add a note…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter" && noteDraft.trim()) { addNote(a.id, noteDraft.trim()); setNoteDraft(""); toast("Note added"); } }} />
                                <Btn size="sm" icon="plus" onClick={() => { if (noteDraft.trim()) { addNote(a.id, noteDraft.trim()); setNoteDraft(""); toast("Note added"); } }}>Add</Btn>
                              </div>
                            </div>
                            <div>
                              <p className="label-mono mb-1.5">History</p>
                              <ol className="space-y-1">
                                {[...a.history].reverse().map((h, i) => (
                                  <li key={i} className="flex gap-2 text-xs text-ink-700"><span className="font-mono text-[10px] text-mist-400">{fmtDate(h.at)}</span>{h.event}</li>
                                ))}
                              </ol>
                              {a.salaryNote && <p className="mt-2 rounded-md border border-gold-100 bg-gold-50 p-2 text-xs text-gold-700"><b>Salary:</b> {a.salaryNote}</p>}
                              {a.resumeVersionId && <p className="mt-1.5 text-[11px] text-mist-500">Resume: {state.resumeVersions.find((r) => r.id === a.resumeVersionId)?.name ?? a.resumeVersionId}</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) { return <>{children}</>; }

function KanbanCard({ app, onDrag, onOpen, dragging }: { app: Application; onDrag: (id: string | null) => void; onOpen: () => void; dragging: boolean }) {
  const { state, setStatus, toast } = useApp();
  const job = state.jobs.find((j) => j.id === app.jobId);
  if (!job) return null;
  const s = scoreJob(job, state.profile).overall;
  return (
    <div draggable
      onDragStart={(e) => { onDrag(app.id); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => onDrag(null)}
      onClick={onOpen}
      className={`card cursor-grab rounded-lg p-2.5 transition-all active:cursor-grabbing ${dragging ? "rotate-2 opacity-60 shadow-lg" : "hover:-translate-y-0.5 hover:shadow-md"}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-mist-300"><Icon name="grip" size={14} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-ink-800">{job.company}</p>
          <p className="truncate text-[11px] text-mist-500">{job.title}</p>
        </div>
        <ScoreRing value={s} size={34} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
        <StatusPill status={app.status} />
        <select className="select !w-auto !border-0 !bg-transparent !p-0 font-mono text-[10.5px] !text-mist-500" value={app.status}
          onChange={(e) => { setStatus(app.id, e.target.value as AppStatus); toast(`Status → ${e.target.value}`); }} aria-label="Move to status">
          {ALL_STATUSES.map((st) => <option key={st}>{st}</option>)}
        </select>
      </div>
      {(app.followUpDate && daysUntil(app.followUpDate) <= 1 && !["Rejected", "Closed", "Offer"].includes(app.status)) && (
        <p className={`mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold ${daysUntil(app.followUpDate) < 0 ? "text-clay-600" : "text-gold-600"}`}><Icon name="flag" size={11} />follow-up {daysUntil(app.followUpDate) < 0 ? "overdue" : "today"}</p>
      )}
      {app.interviewDate && ["Interview Scheduled", "Interviewing"].includes(app.status) && (
        <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-pine-700"><Icon name="calendar" size={11} />{fmtDate(app.interviewDate)}</p>
      )}
    </div>
  );
}

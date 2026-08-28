import { useMemo, useState } from "react";
import type { AppStatus } from "../data";
import { fmtDate } from "../data";
import { outreach, scoreJob } from "../engine";
import type { OutreachKind } from "../engine";
import { useApp } from "../store";
import { Btn, Chip, CopyBtn, EmptyState, Icon, SectionHead, Shimmer, useFakeAI } from "../ui";

export default function Outreach() {
  const { state, openJob, actInbox, setStatus, addApplication, toast, logInteraction } = useApp();
  const ai = useFakeAI();
  const [appId, setAppId] = useState(state.applications[0]?.id ?? "");
  const [kind, setKind] = useState<OutreachKind>("email");
  const [text, setText] = useState<string | null>(null);

  const app = state.applications.find((a) => a.id === appId);
  const job = app ? state.jobs.find((j) => j.id === app.jobId) : undefined;
  const connection = job ? state.contacts.find((c) => c.company === job.company) : undefined;
  const pending = state.inbox.filter((m) => !m.acted);
  const handled = state.inbox.filter((m) => m.acted);

  const scoredApps = useMemo(
    () => state.applications.map((a) => {
      const j = state.jobs.find((x) => x.id === a.jobId);
      return { a, j, s: j ? scoreJob(j, state.profile).overall : 0 };
    }).sort((x, y) => y.s - x.s),
    [state.applications, state.jobs, state.profile]
  );

  const generate = () => {
    if (!job) return;
    ai.run(["Reading job + recruiter context…", "Selecting verified proof points…", "Writing message…"], () => {
      setText(outreach(job, state.profile, kind, connection?.name));
    });
  };

  const KINDS: [OutreachKind, string, string, string][] = [
    ["linkedin", "LinkedIn message", "chat", "Short, personal, connection-first."],
    ["email", "Application email", "mail", "Professional email to the recruiter or hiring manager."],
    ["followup", "Follow-up", "refresh", "Polite nudge when there's been no response."],
    ["referral", "Referral request", "users", "Ask your contact at the company for a warm intro."],
  ];

  return (
    <div className="space-y-8">
      <section>
        <SectionHead kicker="Email & LinkedIn intelligence" title="Recruiter Inbox"
          sub="Connected Gmail messages are classified automatically — interview invitations, recruiter notes, confirmations, rejections. Waypoint suggests the next move; you approve it." />
        {pending.length === 0 ? (
          <div className="card p-5 text-sm text-mist-600"><span className="mr-2 inline-flex align-middle text-pine-600"><Icon name="check" size={15} /></span>All recruiter messages handled. New classified mail will appear here.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((m, i) => {
              const j = m.jobId ? state.jobs.find((x) => x.id === m.jobId) : undefined;
              const a = m.jobId ? state.applications.find((x) => x.jobId === m.jobId) : undefined;
              return (
                <article key={m.id} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="flex items-center gap-2">
                    <Chip tone={m.kind === "Interview Invitation" ? "pine" : m.kind === "Rejection" ? "clay" : "sky"}>{m.kind}</Chip>
                    <span className="truncate text-xs text-mist-500">{m.from}</span>
                  </div>
                  <p className="mt-2 font-display text-[15px] font-semibold text-ink-900">{m.subject}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{m.summary}</p>
                  {m.extracted && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-md border border-pine-200 bg-pine-50/60 p-2.5 text-[12px]">
                      {m.extracted.date && <p className="text-ink-700"><b>Date:</b> {fmtDate(m.extracted.date)}</p>}
                      {m.extracted.time && <p className="text-ink-700"><b>Time:</b> {m.extracted.time}</p>}
                      {m.extracted.interviewer && <p className="col-span-2 text-ink-700"><b>Interviewer:</b> {m.extracted.interviewer}</p>}
                      {m.extracted.link && <p className="col-span-2 truncate font-mono text-[11px] text-pine-700">{m.extracted.link}</p>}
                    </div>
                  )}
                  {m.suggestedReply && (
                    <div className="mt-2.5 rounded-md border border-mist-200 bg-mist-50 p-2.5">
                      <p className="label-mono mb-1">Suggested reply</p>
                      <p className="text-[12px] leading-relaxed text-ink-700">{m.suggestedReply}</p>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.kind === "Interview Invitation" && a && (
                      <Btn size="sm" variant="primary" icon="calendar" onClick={() => { actInbox(m.id, { appId: a.id, status: "Interview Scheduled" as AppStatus }); toast("Moved to Interview Scheduled"); }}>Accept & schedule</Btn>
                    )}
                    {m.kind === "Recruiter Message" && a && (
                      <Btn size="sm" variant="primary" icon="chat" onClick={() => { actInbox(m.id, { appId: a.id, status: "Recruiter Contacted" as AppStatus }); toast("Marked Recruiter Contacted"); }}>Engage</Btn>
                    )}
                    {m.suggestedReply && <CopyBtn text={m.suggestedReply} />}
                    {j && <Btn size="sm" icon="eye" onClick={() => openJob(j.id)}>Job</Btn>}
                    <Btn size="sm" variant="ghost" icon="check" onClick={() => { actInbox(m.id); toast("Marked handled"); }}>Done</Btn>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {handled.length > 0 && (
          <p className="mt-3 text-xs text-mist-500">{handled.length} handled: {handled.map((h) => `${h.kind} — ${h.company}`).join(" · ")}</p>
        )}
      </section>

      <section>
        <SectionHead kicker="Personalized from JD + your verified profile" title="Message Composer"
          sub="Pick an application, pick a channel — Waypoint drafts using the job description, recruiter name, company context and your tailored materials." />
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="card h-fit p-4">
            <p className="label-mono mb-1.5">Application</p>
            <select className="select" value={appId} onChange={(e) => { setAppId(e.target.value); setText(null); }} aria-label="Application">
              {scoredApps.map(({ a, j, s }) => <option key={a.id} value={a.id}>{s}% · {j?.company} — {a.status}</option>)}
            </select>
            {job && (
              <div className="mt-3 rounded-md border border-mist-200 p-2.5 text-[12px] text-mist-600">
                <p className="font-semibold text-ink-800">{job.title}</p>
                <p>{job.recruiter ? `Recruiter: ${job.recruiter.name} · ${job.recruiter.email}` : "No recruiter identified"}</p>
                {connection && <p className="mt-1 flex items-center gap-1 text-pine-700"><Icon name="users" size={12} />Connection: {connection.name} ({connection.relationship})</p>}
              </div>
            )}
            <p className="label-mono mb-1.5 mt-4">Channel</p>
            <div className="space-y-1.5">
              {KINDS.map(([k, label, ic, desc]) => (
                <button key={k} onClick={() => { setKind(k); setText(null); }}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors ${kind === k ? "border-pine-400 bg-pine-50/70" : "border-mist-200 hover:border-mist-300"}`}>
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-800"><span className="text-pine-600"><Icon name={ic} size={15} /></span>{label}</p>
                  <p className="mt-0.5 text-[11px] text-mist-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {!text ? (
              <div className="card p-5">
                <p className="mb-3 text-sm text-mist-600">{KINDS.find(([k]) => k === kind)?.[3]} Grounded in your verified achievements — nothing invented.</p>
                <Btn variant="primary" icon="send" disabled={ai.busy || !job} onClick={generate}>
                  {ai.busy ? ai.stage : `Draft ${KINDS.find(([k]) => k === kind)?.[1].toLowerCase()}`}
                </Btn>
                {ai.busy && <div className="mt-4"><Shimmer lines={5} /></div>}
                {!job && <p className="mt-3 text-xs text-mist-500">Add an application to your pipeline first.</p>}
              </div>
            ) : (
              <div className="card anim-fade-up p-5">
                <textarea className="textarea min-h-[220px] text-sm leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyBtn text={text} label="Copy message" size="md" />
                  <Btn variant="ink" icon="check" size="md" onClick={() => {
                    if (app) { setStatus(app.id, "Recruiter Contacted"); if (job?.recruiter) toast(`${job.company} marked Recruiter Contacted`); }
                    if (connection) logInteraction(connection.id);
                    if (!app && job) addApplication(job.id, "Recruiter Contacted");
                  }}>Mark contacted</Btn>
                  <Btn icon="refresh" variant="ghost" onClick={() => setText(null)}>Regenerate</Btn>
                </div>
              </div>
            )}
            {state.applications.length === 0 && <EmptyState icon="send" title="No applications yet" sub="Track a job first, then draft outreach here." />}
          </div>
        </div>
      </section>
    </div>
  );
}

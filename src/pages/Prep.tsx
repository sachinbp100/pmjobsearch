import { useMemo, useState } from "react";
import type { CompanyResearch, StarStory } from "../data";
import { fmtDate } from "../data";
import { evaluateAnswer, interviewPlan, scoreJob } from "../engine";
import type { MockEval, PrepQuestion } from "../engine";
import { useApp } from "../store";
import { Btn, Chip, EmptyState, Icon, Modal, Monogram, ScoreRing, SectionHead } from "../ui";

// ─── COMPANIES ───────────────────────────────────────────────────────────────
export function Companies() {
  const { state, toggleWatch, toast } = useApp();
  const [open, setOpen] = useState<CompanyResearch | null>(null);
  return (
    <div>
      <SectionHead kicker="Research dossiers & watchlist" title="Companies"
        sub="Structured research for your target companies — what they sell, how they win, what the PM role actually moves, and the questions to ask." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.companies.map((c, i) => {
          const openings = state.jobs.filter((j) => j.company === c.name);
          return (
            <article key={c.name} className="card card-hover anim-fade-up flex flex-col p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-3">
                <Monogram name={c.name} size={42} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[15px] font-semibold text-ink-900">{c.name}</h3>
                  <p className="text-xs text-mist-500">{c.industry}</p>
                </div>
                <button onClick={() => { toggleWatch(c.name); toast(c.watched ? `${c.name} removed from watchlist` : `Watching ${c.name} — agent will alert on new PM roles`); }}
                  className={`btn ${c.watched ? "btn-soft" : "btn-ghost"} !px-2.5 !py-1.5 text-xs`} aria-label="Toggle watch">
                  <Icon name="star" size={14} />{c.watched ? "Watching" : "Watch"}
                </button>
              </div>
              <p className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-mist-600">{c.overview.split(". ").slice(0, 2).join(". ")}.</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {openings.length > 0 && <Chip tone="pine">{openings.length} open role{openings.length > 1 ? "s" : ""}</Chip>}
                {c.watched && <Chip tone="gold">monitored</Chip>}
              </div>
              <Btn size="sm" variant="ink" icon="building" className="mt-3" onClick={() => setOpen(c)}>Open research dossier</Btn>
            </article>
          );
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.name} — research dossier` : ""} wide>
        {open && (
          <div className="grid gap-4 md:grid-cols-2">
            {([
              ["Overview", open.overview], ["Products", open.products], ["Customers", open.customers],
              ["Business model", open.businessModel], ["Strategy", open.strategy], ["Recent announcements", open.announcements],
              ["Leadership", open.leadership], ["Competitors & position", open.competitors], ["Technology initiatives", open.tech],
            ] as const).map(([t, b]) => (
              <div key={t} className="rounded-lg border border-mist-200 p-3.5">
                <p className="label-mono mb-1">{t}</p>
                <p className="text-[13px] leading-relaxed text-ink-700">{b}</p>
              </div>
            ))}
            <div className="rounded-lg border border-pine-200 bg-pine-50/50 p-3.5 md:col-span-2">
              <p className="label-mono mb-1 !text-pine-700">How the PM role contributes</p>
              <p className="text-[13px] leading-relaxed text-ink-700">{open.roleContribution}</p>
              <p className="label-mono mb-1 mt-3 !text-clay-600">Challenges a PM would face</p>
              <p className="text-[13px] leading-relaxed text-ink-700">{open.challenges}</p>
              <p className="label-mono mb-1.5 mt-3 !text-pine-700">Questions to ask them</p>
              <ul className="space-y-1">
                {open.questions.map((q) => <li key={q} className="flex gap-2 text-[13px] text-ink-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" />{q}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── INTERVIEW PREP ──────────────────────────────────────────────────────────
export function InterviewPrep() {
  const { state, openJob, setTab, addTask, toast } = useApp();
  const interviewApps = useMemo(() => {
    const apps = state.applications.map((a) => ({ a, j: state.jobs.find((j) => j.id === a.jobId) }));
    return [...apps.filter((x) => ["Interview Scheduled", "Interviewing"].includes(x.a.status)), ...apps.filter((x) => !["Interview Scheduled", "Interviewing", "Rejected", "Closed"].includes(x.a.status))];
  }, [state.applications, state.jobs]);
  const [appId, setAppId] = useState(interviewApps[0]?.a.id ?? "");
  const [tab, setITab] = useState("questions");
  const app = state.applications.find((a) => a.id === appId);
  const job = app ? state.jobs.find((j) => j.id === app.jobId) : undefined;
  const plan = useMemo(() => (job ? interviewPlan(job, state.profile) : []), [job, state.profile]);

  return (
    <div>
      <SectionHead kicker="Questions, stories, and reps" title="Interview Prep"
        sub="A preparation workspace per interview — likely questions mapped to your real experience, your STAR library, and an AI interviewer for live reps."
        right={
          <select className="select !w-auto max-w-[320px]" value={appId} onChange={(e) => setAppId(e.target.value)} aria-label="Select interview">
            {interviewApps.map(({ a, j }) => <option key={a.id} value={a.id}>{j?.company} — {a.status}{a.interviewDate ? ` · ${fmtDate(a.interviewDate)}` : ""}</option>)}
          </select>
        } />
      {job ? (
        <>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {([["questions", "Likely questions", "chat"], ["stories", "STAR library", "star"], ["mock", "Mock interview", "target"]] as const).map(([id, label, ic]) => (
              <button key={id} onClick={() => setITab(id)}
                className={`chip border !px-3.5 !py-2 !text-[13px] font-medium ${tab === id ? "border-pine-600 bg-pine-600 text-white" : "bg-white text-ink-600 hover:border-pine-300"}`}>
                <Icon name={ic} size={14} />{label}
              </button>
            ))}
            <Btn size="sm" className="ml-auto" icon="calendar" onClick={() => { addTask({ title: `Interview prep — ${job.company} (${job.title.split(",")[0]})`, due: fmtDateInput(app?.interviewDate ?? 1), type: "prep", jobId: job.id }); toast("Prep session added to Tasks"); }}>Schedule prep block</Btn>
          </div>
          {tab === "questions" && <QuestionBank plan={plan} onCompany={() => setTab("companies")} />}
          {tab === "stories" && <StarLibrary stories={state.stories} />}
          {tab === "mock" && <MockInterview plan={plan} company={job.company} />}
        </>
      ) : (
        <EmptyState icon="target" title="No interviews in your pipeline" sub="When an application moves to Interview Scheduled, its prep workspace appears here."
          action={<Btn variant="primary" onClick={() => { const j = state.jobs[0]; if (j) openJob(j.id); }}>Open a job</Btn>} />
      )}
    </div>
  );
}

function fmtDateInput(d: string | number): string {
  if (typeof d === "number") { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); }
  return d;
}

function QuestionBank({ plan, onCompany }: { plan: PrepQuestion[]; onCompany: () => void }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const groups = useMemo(() => {
    const g: Record<string, PrepQuestion[]> = {};
    for (const q of plan) (g[q.category] ??= []).push(q);
    return g;
  }, [plan]);
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([cat, qs], gi) => (
        <section key={cat} className="card anim-fade-up p-4" style={{ animationDelay: `${gi * 60}ms` }}>
          <h4 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="chat" size={15} /></span>{cat}</h4>
          <div className="mt-2.5 space-y-2.5">
            {qs.map((q, qi) => {
              const key = gi * 100 + qi;
              return (
                <div key={qi} className="rounded-lg border border-mist-200 p-3">
                  <p className="text-[13.5px] font-semibold text-ink-800">{q.question}</p>
                  <button className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-pine-700 hover:text-pine-800" onClick={() => setRevealed((r) => ({ ...r, [key]: !r[key] }))}>
                    <Icon name="chevR" size={12} className={`transition-transform ${revealed[key] ? "rotate-90" : ""}`} />
                    {revealed[key] ? "Hide personalized answer" : "Show answer mapped to my experience"}
                  </button>
                  {revealed[key] && (
                    <div className="anim-fade-up mt-2 rounded-md border border-pine-200 bg-pine-50/60 p-3">
                      <p className="text-[12.5px] leading-relaxed text-ink-700">{q.answer}</p>
                      <p className="mt-2 text-[12px] text-mist-600"><b className="text-gold-600">Likely follow-up:</b> {q.followUp}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Btn icon="building" variant="outline" onClick={onCompany}>Add company research questions</Btn>
    </div>
  );
}

function StarLibrary({ stories }: { stories: StarStory[] }) {
  const [openId, setOpenId] = useState<string | null>(stories[0]?.id ?? null);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {stories.map((s, i) => (
        <article key={s.id} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
          <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <h4 className="font-display text-[15px] font-semibold text-ink-900">{s.title}</h4>
            <Icon name="chevD" size={16} className={`shrink-0 text-mist-400 transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
          </button>
          <div className="mt-2 flex flex-wrap gap-1.5">{s.skills.map((k) => <Chip key={k} tone="pine">{k}</Chip>)}</div>
          {openId === s.id && (
            <div className="anim-fade-up mt-3 space-y-2 border-t border-mist-100 pt-3">
              {([["Situation", s.situation, "mist"], ["Task", s.task, "sky"], ["Action", s.action, "gold"], ["Result", s.result, "pine"]] as const).map(([t, b, tone]) => (
                <div key={t}>
                  <p className={`label-mono mb-0.5 ${tone === "pine" ? "!text-pine-700" : tone === "gold" ? "!text-gold-600" : tone === "sky" ? "!text-sky-700" : "!text-mist-600"}`}>{t}</p>
                  <p className="text-[12.5px] leading-relaxed text-ink-700">{b}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

// ─── mock interview ──────────────────────────────────────────────────────────
interface ChatMsg { role: "ai" | "user"; text: string; eval?: MockEval; }
function MockInterview({ plan, company }: { plan: PrepQuestion[]; company: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [qi, setQi] = useState(0);
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [followUpArmed, setFollowUpArmed] = useState(false);
  const [finished, setFinished] = useState(false);
  const current: PrepQuestion | undefined = plan[qi];
  const started = msgs.length > 0;

  const ask = (q: PrepQuestion, isFollowUp = false) => {
    setThinking(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 750;
    window.setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: (isFollowUp ? "Follow-up: " : "") + q.question }]);
      setThinking(false);
      setFollowUpArmed(!isFollowUp);
    }, delay);
  };

  const submit = () => {
    if (!current || answer.trim().length < 10) return;
    const ev = evaluateAnswer(current, answer);
    setMsgs((m) => [...m, { role: "user", text: answer, eval: ev }]);
    setAnswer("");
  };

  const next = () => {
    setFollowUpArmed(false);
    if (qi + 1 < plan.length) { setQi(qi + 1); ask(plan[qi + 1]); }
    else { setFinished(true); setMsgs((m) => [...m, { role: "ai", text: "That's the end of this set — strong reps. Review your flagged gaps above, then run it again tomorrow. Consistency beats cramming." }]); }
  };

  const avg = useMemo(() => {
    const evs = msgs.filter((m) => m.eval).map((m) => m.eval!.score);
    return evs.length ? Math.round(evs.reduce((a, b) => a + b, 0) / evs.length) : 0;
  }, [msgs]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <section className="card flex h-[560px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-mist-200 bg-ink-900 px-4 py-3 sidebar-bg">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-white"><Icon name="target" size={16} className="text-pine-300" />AI Interviewer — {company}</p>
          {started && <span className="font-mono text-xs text-ink-300">Q{Math.min(qi + 1, plan.length)}/{plan.length}</span>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!started && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pine-50 text-pine-600"><Icon name="target" size={26} /></div>
              <p className="font-display text-lg font-semibold text-ink-900">Ready for a rep?</p>
              <p className="mt-1 max-w-sm text-sm text-mist-600">The interviewer asks one question at a time, evaluates your answer against the themes interviewers actually probe, then follows up — like the real thing.</p>
              <Btn variant="primary" icon="chat" className="mt-4" onClick={() => current && ask(current)}>Start mock interview</Btn>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`anim-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.role === "ai" ? "border border-mist-200 bg-white text-ink-800" : "bg-ink-900 text-ink-50"}`}>
                {m.role === "ai" && <p className="label-mono mb-1 !text-pine-700">Interviewer</p>}
                {m.text}
                {m.eval && (
                  <div className="mt-3 space-y-2 rounded-lg border border-mist-200 bg-mist-50 p-3 text-ink-800">
                    <div className="flex items-center gap-2">
                      <ScoreRing value={m.eval.score} size={40} />
                      <p className="text-xs font-semibold text-mist-600">Answer evaluation</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-pine-700">Strengths</p>
                      <ul className="space-y-0.5">{m.eval.strengths.map((s) => <li key={s} className="flex gap-1.5 text-xs"><span className="text-pine-600"><Icon name="check" size={11} /></span>{s}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-clay-600">Missing</p>
                      <ul className="space-y-0.5">{m.eval.missing.map((s) => <li key={s} className="flex gap-1.5 text-xs"><span className="text-clay-500"><Icon name="alert" size={11} /></span>{s}</li>)}</ul>
                    </div>
                    <p className="text-xs"><b className="text-gold-600">Improve:</b> {m.eval.improve}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-xl border border-mist-200 bg-white px-3.5 py-3">
                {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist-400" style={{ animationDelay: `${i * 140}ms` }} />)}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-mist-200 bg-white p-3">
          {started && current && !finished ? (
            <>
              <div className="flex gap-2">
                <textarea className="textarea min-h-[64px] flex-1 text-sm" placeholder="Type your answer… aim for a structured 60–90 seconds" value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }} />
                <div className="flex flex-col gap-1.5">
                  <Btn variant="primary" icon="send" onClick={submit} disabled={thinking}>Send</Btn>
                  {followUpArmed && msgs.some((m) => m.eval) && (
                    <Btn size="sm" icon="refresh" variant="outline" onClick={() => { ask({ ...current, question: current.followUp, themes: current.themes, followUp: "What would you do differently with hindsight?", answer: current.answer, category: current.category }, true); }}>Ask follow-up</Btn>
                  )}
                  <Btn size="sm" icon="arrowR" variant="ghost" onClick={next}>Next Q</Btn>
                </div>
              </div>
              <p className="mt-1.5 text-[10.5px] text-mist-400">Ctrl/Cmd + Enter to send · answers are evaluated on ownership, structure and measurable outcomes</p>
            </>
          ) : started ? (
            <div className="flex items-center gap-2">
              <Btn variant="primary" icon="refresh" onClick={() => { setMsgs([]); setQi(0); setFollowUpArmed(false); setFinished(false); }}>Run again</Btn>
              <span className="text-xs text-mist-500">Session complete — average score {avg}%</span>
            </div>
          ) : null}
        </div>
      </section>
      <aside className="space-y-3">
        <div className="card p-4">
          <p className="label-mono mb-1.5">Session plan</p>
          <ul className="space-y-1.5">
            {[...new Set(plan.map((p) => p.category))].slice(0, 8).map((c, i) => (
              <li key={c} className={`flex items-center gap-2 text-[12.5px] ${i <= qi && started ? "text-pine-700" : "text-mist-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${i < qi && started ? "bg-pine-500" : i === qi && started ? "pulse-dot bg-pine-500" : "bg-mist-300"}`} />{c}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <p className="label-mono mb-1.5">Coaching tips</p>
          <ul className="space-y-1.5 text-[12px] leading-relaxed text-mist-600">
            <li>• Lead with the decision you owned, not the team's activity.</li>
            <li>• One verified metric beats three adjectives.</li>
            <li>• Land the learning — interviewers ask "what would you change?"</li>
            <li>• Keep setup to one sentence; spend time on action + result.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

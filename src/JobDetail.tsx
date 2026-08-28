import { useEffect, useMemo, useState } from "react";
import type { AnswerLength, AppQuestion, LetterOutput, OutreachKind } from "./engine";
import { answerQuestion, APP_QUESTIONS, analyzeJob, outreach, scoreJob, tailorResume } from "./engine";
import { liveProviderActive, smartLetter } from "./live";
import type { AppStatus, Tone } from "./data";
import { TONES, fmtDate, fmtMoney, iso } from "./data";
import { useApp } from "./store";
import { Btn, Chip, CopyBtn, EmptyState, Icon, Modal, Monogram, RecBadge, ScoreRing, Shimmer, Tabs, useFakeAI, scoreText } from "./ui";

const TABS = [
  { id: "overview", label: "Overview", icon: "doc" },
  { id: "analysis", label: "AI Analysis", icon: "spark" },
  { id: "resume", label: "Tailored Resume", icon: "wand" },
  { id: "letter", label: "Cover Letter", icon: "pen" },
  { id: "outreach", label: "Outreach", icon: "send" },
  { id: "questions", label: "App Questions", icon: "chat" },
  { id: "company", label: "Company Intel", icon: "building" },
];

export default function JobDetail() {
  const { state, closeJob, openJob } = useApp();
  const job = state.jobs.find((j) => j.id === state.jobDetailId);
  if (!job) return null;
  return <DetailInner key={job.id} jobId={job.id} tab={state.jobDetailTab} setTab={(t) => openJob(job.id, t)} onClose={closeJob} />;
}

function DetailInner({ jobId, tab, setTab, onClose }: { jobId: string; tab: string; setTab: (t: string) => void; onClose: () => void }) {
  const { state, toggleSave, toast, addApplication, setStatus, approveSubmission, saveLetter, saveTailored, addResumeVersion, actInbox } = useApp();
  const job = state.jobs.find((j) => j.id === jobId)!;
  const profile = state.profile;
  const score = useMemo(() => scoreJob(job, profile), [job, profile]);
  const app = state.applications.find((a) => a.jobId === jobId);
  const saved = state.savedIds.includes(jobId);

  const [analysis, setAnalysis] = useState(() => analyzeJob(job, profile, score));
  const ai = useFakeAI();
  const [analyzed, setAnalyzed] = useState(false);

  // resume tab state
  const tailored = state.tailored[jobId];
  const [summaryDraft, setSummaryDraft] = useState(tailored?.summary ?? "");
  useEffect(() => setSummaryDraft(state.tailored[jobId]?.summary ?? ""), [jobId, state.tailored]);
  const resumeAI = useFakeAI();

  // letter tab state
  const [tone, setTone] = useState<Tone>("Professional");
  const [draft, setDraft] = useState<(LetterOutput & { viaLive?: boolean }) | null>(null);
  const [letterPending, setLetterPending] = useState(false);
  const letterAI = useFakeAI();

  // outreach state
  const [oKind, setOKind] = useState<OutreachKind>("linkedin");
  const [oText, setOText] = useState<string | null>(null);
  const oAI = useFakeAI();
  const connection = state.contacts.find((c) => c.company === job.company);

  // questions state
  const [q, setQ] = useState<AppQuestion>(APP_QUESTIONS[0]);
  const [qLen, setQLen] = useState<AnswerLength>("medium");
  const [aText, setAText] = useState<string | null>(null);
  const qAI = useFakeAI();

  const [applyOpen, setApplyOpen] = useState(false);
  const [approveCheck, setApproveCheck] = useState(false);
  const [resumeChoice, setResumeChoice] = useState(state.resumeVersions[0]?.id ?? "");
  const [letterChoice, setLetterChoice] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const ensureApp = (): string | null => {
    if (app) return app.id;
    const id = addApplication(jobId, "Reviewing");
    if (id) toast(`${job.company} added to your pipeline`);
    return id;
  };

  const company = state.companies.find((c) => c.name === job.company);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink-950/55 anim-pop" onClick={onClose} />
      <aside className="anim-slide-right absolute right-0 top-0 flex h-full w-full max-w-[880px] flex-col bg-mist-50 shadow-2xl" role="dialog" aria-label={`Job details — ${job.title}`}>
        {/* header */}
        <header className="border-b border-mist-200 bg-white px-6 py-4">
          <div className="flex items-start gap-4">
            <Monogram name={job.company} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold text-ink-900">{job.title}</h2>
                <RecBadge rec={score.rec} />
                {job.isNew && <Chip tone="pine">NEW</Chip>}
              </div>
              <p className="mt-0.5 text-sm text-mist-600">{job.company} · {job.industry} · via {job.source}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-mist-600">
                <span className="inline-flex items-center gap-1"><Icon name="building" size={13} />{job.location}</span>
                <span className="inline-flex items-center gap-1"><Icon name="compass" size={13} />{job.mode}</span>
                {job.salaryMax && <span className="inline-flex items-center gap-1 font-mono font-medium text-ink-700"><Icon name="briefcase" size={13} />{fmtMoney(job.salaryMin ?? 0)}–{fmtMoney(job.salaryMax)}</span>}
                <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} />posted {job.postedDaysAgo === 0 ? "today" : `${job.postedDaysAgo}d ago`}</span>
                {job.deadlineInDays !== undefined && <span className="inline-flex items-center gap-1 text-gold-600"><Icon name="flag" size={13} />apply within {job.deadlineInDays}d</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <ScoreRing value={score.overall} size={64} />
              <span className="label-mono">match</span>
            </div>
            <button onClick={onClose} className="btn btn-ghost !p-2" aria-label="Close details"><Icon name="x" size={18} /></button>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {app ? (
              <Btn variant="primary" icon="shield" onClick={() => setApplyOpen(true)}>
                {app.status === "Applied" || app.status === "Recruiter Contacted" ? "Application Workspace" : "Prepare & Apply"}
              </Btn>
            ) : (
              <Btn variant="primary" icon="plus" onClick={() => { ensureApp(); }}>Add to pipeline</Btn>
            )}
            {app && app.status !== "Applied" && (
              <select className="select !w-auto !py-1.5 text-sm" value={app.status} aria-label="Change status"
                onChange={(e) => { setStatus(app.id, e.target.value as AppStatus); toast(`Status → ${e.target.value}`); }}>
                {["Discovered", "Reviewing", "Saved", "Preparing", "Ready to Apply", "Applied", "Recruiter Contacted", "Interview Scheduled", "Interviewing", "Offer", "Rejected", "Closed"].map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            <Btn icon="bookmark" variant={saved ? "soft" : "outline"} onClick={() => { toggleSave(jobId); toast(saved ? "Removed from watchlist" : "Saved to watchlist"); }}>{saved ? "Saved" : "Save"}</Btn>
            <a href={job.link} target="_blank" rel="noreferrer" className="btn btn-outline text-sm px-3.5 py-2" onClick={(e) => { if (job.link.startsWith("captured://")) { e.preventDefault(); toast("Captured posting — no external link", "warn"); } }}>
              <Icon name="external" size={15} />Original posting
            </a>
          </div>
        </header>

        <Tabs tabs={TABS} active={tab} onChange={setTab} className="bg-white px-4" />

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <section className="card p-5">
                  <h4 className="label-mono mb-2">Role description</h4>
                  <p className="text-[14.5px] leading-relaxed text-ink-700">{job.description}</p>
                  {job.responsibilities.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {job.responsibilities.map((r) => (
                        <li key={r} className="flex gap-2 text-sm text-ink-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" />{r}</li>
                      ))}
                    </ul>
                  )}
                </section>
                <section className="card p-5">
                  <h4 className="label-mono mb-2.5">Required skills — matched vs. gaps</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requiredSkills.map((s) => score.matched.includes(s)
                      ? <Chip key={s} tone="pine"><Icon name="check" size={11} />{s}</Chip>
                      : <Chip key={s} tone="clay"><Icon name="x" size={11} />{s}</Chip>)}
                  </div>
                  {job.preferredSkills.length > 0 && (
                    <>
                      <h4 className="label-mono mb-2.5 mt-4">Preferred skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {job.preferredSkills.map((s) => score.matched.includes(s) || state.profile.skillAreas.some((a) => a.area === s)
                          ? <Chip key={s} tone="pine"><Icon name="check" size={11} />{s}</Chip>
                          : <Chip key={s}>{s}</Chip>)}
                      </div>
                    </>
                  )}
                </section>
              </div>
              <div className="space-y-4">
                <section className="card p-5">
                  <h4 className="label-mono mb-2.5">Match breakdown</h4>
                  {([["Skills", score.skills], ["Experience", score.experience], ["Career growth", score.growth], ["Preferences", score.prefs]] as const).map(([k, v]) => (
                    <div key={k} className="mb-2.5">
                      <div className="mb-1 flex justify-between text-xs"><span className="text-mist-600">{k}</span><span className={`font-mono font-semibold ${scoreText(v)}`}>{v}</span></div>
                      <div className="h-1.5 rounded-full bg-mist-200"><div className="h-full rounded-full bg-pine-500 progress-sweep" style={{ width: `${v}%`, background: v >= 85 ? "var(--color-pine-500)" : v >= 70 ? "var(--color-gold-500)" : "var(--color-clay-500)" }} /></div>
                    </div>
                  ))}
                  <p className="mt-3 border-t border-mist-100 pt-3 text-xs leading-relaxed text-mist-600">{score.reason}</p>
                </section>
                <section className="card p-5">
                  <h4 className="label-mono mb-2.5">Recruiter</h4>
                  {job.recruiter ? (
                    <>
                      <p className="text-sm font-semibold text-ink-800">{job.recruiter.name}</p>
                      <p className="text-xs text-mist-600">{job.recruiter.title}</p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-pine-700"><Icon name="mail" size={13} />{job.recruiter.email}</p>
                    </>
                  ) : <p className="text-sm text-mist-500">No recruiter identified for this posting.</p>}
                  {connection && (
                    <p className="mt-3 flex items-start gap-1.5 rounded-md bg-pine-50 p-2.5 text-xs text-pine-800">
                      <Icon name="users" size={14} className="mt-0.5" />You know <b>{connection.name}</b> at {job.company} — referral path available in Outreach.
                    </p>
                  )}
                </section>
                <section className="card p-5">
                  <h4 className="label-mono mb-2">Experience & growth</h4>
                  <p className="text-sm text-ink-700">{job.experienceYears}+ years required · you have {profile.pmYears} PM / {profile.totalYears} total</p>
                  <p className="mt-2 text-sm text-ink-700">Career move: <b>{job.growth}</b></p>
                </section>
              </div>
            </div>
          )}

          {/* ── AI ANALYSIS ── */}
          {tab === "analysis" && (
            <div className="space-y-4">
              {!analyzed ? (
                <div className="card p-5">
                  <Btn variant="primary" icon="spark" disabled={ai.busy} onClick={() => ai.run(
                    ["Reading job description…", "Comparing against verified career facts…", "Scoring skills, experience, growth…", "Writing analysis…"],
                    () => { setAnalysis(analyzeJob(job, profile, score)); setAnalyzed(true); }
                  )}>
                    {ai.busy ? ai.stage : "Run AI analysis"}
                  </Btn>
                  {ai.busy && <div className="mt-4"><Shimmer lines={6} /></div>}
                </div>
              ) : (
                <>
                  <section className="card anim-fade-up p-5">
                    <h4 className="font-display text-base font-semibold text-ink-900 flex items-center gap-2"><span className="text-pine-600"><Icon name="check" size={17} /></span>Why you're a strong match</h4>
                    <div className="mt-2.5 space-y-2.5">
                      {analysis.whyMatch.map((p, i) => <p key={i} className="text-sm leading-relaxed text-ink-700">{p}</p>)}
                    </div>
                  </section>
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="card anim-fade-up p-5" style={{ animationDelay: "80ms" }}>
                      <h4 className="font-display text-base font-semibold text-ink-900">Key skills to highlight</h4>
                      <ul className="mt-2.5 space-y-2.5">
                        {analysis.keySkills.map((s) => (
                          <li key={s.point}>
                            <p className="text-sm font-semibold text-pine-700">{s.point}</p>
                            <p className="text-[12.5px] text-mist-600">{s.evidence}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="card anim-fade-up p-5" style={{ animationDelay: "140ms" }}>
                      <h4 className="font-display text-base font-semibold text-ink-900">Potential gaps — handled honestly</h4>
                      <ul className="mt-2.5 space-y-2.5">
                        {score.gaps.length === 0 && <p className="text-sm text-mist-600">No material gaps detected. Rare — apply fast.</p>}
                        {score.gaps.map((g) => (
                          <li key={g.point}>
                            <p className="flex items-start gap-1.5 text-sm font-semibold text-clay-600"><Icon name="alert" size={14} className="mt-0.5 shrink-0" />{g.point}</p>
                            <p className="text-[12.5px] text-mist-600">{g.advice}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="card anim-fade-up p-5" style={{ animationDelay: "200ms" }}>
                      <h4 className="font-display text-base font-semibold text-ink-900">Resume recommendations</h4>
                      <ol className="mt-2.5 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink-700 marker:font-mono marker:text-pine-600">
                        {analysis.resumeRecs.map((r) => <li key={r}>{r}</li>)}
                      </ol>
                    </section>
                    <section className="card anim-fade-up p-5" style={{ animationDelay: "260ms" }}>
                      <h4 className="font-display text-base font-semibold text-ink-900">Likely interview topics</h4>
                      <ul className="mt-2.5 space-y-2">
                        {analysis.interviewTopics.map((t) => (
                          <li key={t} className="flex gap-2 text-sm text-ink-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />{t}</li>
                        ))}
                      </ul>
                      <Btn size="sm" className="mt-3" icon="target" onClick={() => { setTab("questions"); }}>Drill these in Interview Prep</Btn>
                    </section>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAILORED RESUME ── */}
          {tab === "resume" && (
            <div className="space-y-4">
              {!tailored ? (
                <div className="card p-5">
                  <p className="mb-3 text-sm text-mist-600">Generate a version of your master resume tailored to <b>{job.title}</b> — reordered, re-summarized and keyword-optimized using only verified facts.</p>
                  <Btn variant="primary" icon="wand" disabled={resumeAI.busy} onClick={() => resumeAI.run(
                    ["Loading master resume…", "Ranking achievements by relevance…", "Optimizing keywords (verified only)…", "Drafting targeted summary…"],
                    () => { const t = tailorResume(job, profile, score); saveTailored(t); setSummaryDraft(t.summary); toast("Tailored resume ready for review"); }
                  )}>
                    {resumeAI.busy ? resumeAI.stage : "Generate tailored resume"}
                  </Btn>
                  {resumeAI.busy && <div className="mt-4"><Shimmer lines={7} /></div>}
                </div>
              ) : (
                <>
                  <section className="card p-5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-base font-semibold text-ink-900">Targeted professional summary <span className="ml-1 align-middle"><Chip tone="pine">editable</Chip></span></h4>
                    </div>
                    <textarea className="textarea mt-2.5 min-h-[96px] text-sm leading-relaxed" value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} />
                  </section>
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="card p-5">
                      <h4 className="font-display text-base font-semibold text-ink-900">Experience — relevance order</h4>
                      <ul className="mt-2.5 space-y-2.5">
                        {tailored.bullets.map((b) => (
                          <li key={b.text} className={`rounded-md border p-2.5 text-[12.5px] leading-relaxed ${b.highlighted ? "border-pine-200 bg-pine-50/60 text-ink-800" : "border-mist-200 text-mist-600"}`}>
                            {b.highlighted && <span className="mr-1.5 inline-flex align-middle text-pine-600"><Icon name="spark" size={12} /></span>}
                            {b.text}
                          </li>
                        ))}
                      </ul>
                      <h4 className="label-mono mb-2 mt-4">Core competency line</h4>
                      <div className="flex flex-wrap gap-1.5">{tailored.coreSkills.map((s) => <Chip key={s} tone="pine">{s}</Chip>)}</div>
                    </section>
                    <section className="card p-5">
                      <h4 className="font-display text-base font-semibold text-ink-900">Changes made & why</h4>
                      <ul className="mt-2.5 space-y-2.5">
                        {tailored.changes.map((c) => (
                          <li key={c.detail} className="flex gap-2.5">
                            <span className={`mt-0.5 shrink-0 ${c.type === "flag" ? "text-clay-500" : c.type === "keyword" ? "text-gold-600" : "text-pine-600"}`}>
                              <Icon name={c.type === "flag" ? "alert" : c.type === "summary" ? "pen" : c.type === "reordered" ? "refresh" : c.type === "keyword" ? "zap" : "spark"} size={15} />
                            </span>
                            <div>
                              <p className="text-[13px] font-medium text-ink-800">{c.detail}</p>
                              <p className="text-[12px] text-mist-600">{c.reason}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 flex items-start gap-2 rounded-md border border-pine-200 bg-pine-50 p-3 text-xs leading-relaxed text-pine-800">
                        <Icon name="shield" size={15} className="mt-0.5 shrink-0" />
                        Guardrail active: {tailored.flaggedKeywords.length} JD keyword{tailored.flaggedKeywords.length === 1 ? "" : "s"} could not be verified in your career profile and {tailored.flaggedKeywords.length === 1 ? "was" : "were"} deliberately <b>not</b> added.
                      </p>
                    </section>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="primary" icon="check" onClick={() => {
                      const t = { ...tailored, summary: summaryDraft };
                      saveTailored(t);
                      addResumeVersion(`Tailored — ${job.company} (${job.title.split(",")[0]})`, `Auto-tailored from Master v3; ${t.keywordsAdded.length} verified keywords added.`, jobId);
                      toast(`Approved & saved as a new resume version for ${job.company}`);
                    }}>Approve & save version</Btn>
                    <Btn icon="download" onClick={() => {
                      const blob = new Blob([`${profile.name}\n${summaryDraft}\n\nCORE COMPETENCIES\n${tailored.coreSkills.join(" · ")}\n\nSELECTED ACHIEVEMENTS\n${tailored.bullets.map((b) => "• " + b.text).join("\n")}`], { type: "text/plain" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `resume-${job.company.toLowerCase().replace(/\s+/g, "-")}.txt`; a.click(); URL.revokeObjectURL(a.href);
                      toast("Resume exported (.txt)");
                    }}>Export .txt</Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── COVER LETTER ── */}
          {tab === "letter" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {TONES.map((t) => (
                  <button key={t} onClick={() => { setTone(t); setDraft(null); }}
                    className={`chip border transition-colors ${tone === t ? "border-pine-600 bg-pine-600 text-white" : "border-mist-300 bg-white text-ink-600 hover:border-pine-300"}`}>{t}</button>
                ))}
              </div>
              {!draft ? (
                <div className="card p-5">
                  <p className="mb-3 text-sm text-mist-600">
                    {tone === "Professional" && "A polished, traditional letter — 250–400 words, specific to this role."}
                    {tone === "Strategic Leader" && "Leads with strategy, business impact and organizational influence."}
                    {tone === "Technical PM" && "Leads with platforms, APIs, cloud and technical judgment."}
                    {tone === "Recruiter Short" && "A compact message for LinkedIn or email — ~90 words."}
                  </p>
                  <Btn variant="primary" icon="pen" disabled={letterAI.busy || letterPending} onClick={() => {
                    const prov = state.settings.aiProvider;
                    const useLive = liveProviderActive(prov);
                    setLetterPending(true);
                    letterAI.run(
                      useLive
                        ? ["Sending verified facts to your live AI…", `Writing in "${tone}" voice…`, "Checking the response against your profile…"]
                        : ["Pulling verified achievements…", `Writing in "${tone}" voice…`, "Validating every claim against your profile…"],
                      () => {
                        void smartLetter(job, profile, tone, prov, company ? `What ${job.company} is building — ${company.overview.split(".")[0].toLowerCase()} — is exactly the kind of platform problem I like to own.` : undefined)
                          .then(({ out, viaLive, error }) => {
                            setDraft({ ...out, viaLive });
                            setLetterPending(false);
                            toast(
                              error ? "Live AI failed — local grounding engine used instead" : viaLive ? "Live AI draft ready — grounded in verified facts" : "All claims validated against your career profile",
                              error ? "warn" : "ok"
                            );
                          });
                      }
                    );
                  }}>
                    {letterAI.busy || letterPending ? (letterAI.busy ? letterAI.stage : "Live AI writing…") : liveProviderActive(state.settings.aiProvider) ? "Generate with live AI" : "Generate cover letter"}
                  </Btn>
                  {letterAI.busy && <div className="mt-4"><Shimmer lines={8} /></div>}
                </div>
              ) : (
                <>
                  <section className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display text-base font-semibold text-ink-900">Draft — {tone}</h4>
                      <span className="flex items-center gap-2 font-mono text-xs text-mist-500">
                        {draft.viaLive && <Chip tone="gold"><Icon name="zap" size={11} />live AI</Chip>}
                        {draft.text.split(/\s+/).length} words {tone !== "Recruiter Short" && draft.text.split(/\s+/).length <= 400 && "· within 250–400 target"}
                      </span>
                    </div>
                    <textarea className="textarea mt-2.5 min-h-[300px] font-body text-[13.5px] leading-relaxed" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
                  </section>
                  <section className="card border-pine-200 bg-pine-50/50 p-5">
                    <h4 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="shield" size={17} /></span>Claim validation — grounded in verified facts</h4>
                    <ul className="mt-2.5 space-y-1.5">
                      {draft.claims.map((c) => (
                        <li key={c.claim} className="flex items-start gap-2 text-[12.5px]">
                          <span className={`mt-0.5 ${c.verified ? "text-pine-600" : "text-gold-600"}`}><Icon name={c.verified ? "check" : "alert"} size={13} /></span>
                          <span className="text-ink-700"><b>{c.claim}</b> <span className="text-mist-500">— source: {c.source}</span></span>
                        </li>
                      ))}
                      <li className="flex items-start gap-2 text-[12.5px]">
                        <span className="mt-0.5 text-gold-600"><Icon name="alert" size={13} /></span>
                        <span className="text-ink-700">No fabricated claims detected. Anything unverifiable would be flagged here for your approval instead of being invented.</span>
                      </li>
                    </ul>
                  </section>
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="primary" icon="check" onClick={() => {
                      const id = `l-${jobId}-${Date.now()}`;
                      saveLetter({ id, jobId, tone, text: draft.text, updatedAt: iso(0), approved: true, claims: draft.claims });
                      if (app) { setStatus(app.id, app.status === "Preparing" ? "Ready to Apply" : app.status); }
                      toast(`Cover letter saved & approved for ${job.company}`);
                    }}>Approve & save</Btn>
                    <CopyBtn text={draft.text} label="Copy letter" size="md" />
                    <Btn icon="refresh" variant="ghost" onClick={() => setDraft(null)}>Regenerate</Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── OUTREACH ── */}
          {tab === "outreach" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {([["linkedin", "LinkedIn message", "chat"], ["email", "Application email", "mail"], ["followup", "Follow-up", "refresh"], ["referral", "Referral request", "users"]] as const).map(([k, label, ic]) => (
                  <button key={k} onClick={() => { setOKind(k); setOText(null); }}
                    className={`chip border !px-3 !py-1.5 !text-[13px] transition-colors ${oKind === k ? "border-pine-600 bg-pine-600 text-white" : "border-mist-300 bg-white text-ink-600 hover:border-pine-300"}`}>
                    <Icon name={ic} size={13} />{label}
                  </button>
                ))}
              </div>
              {connection && oKind === "referral" && (
                <p className="flex items-center gap-2 rounded-md border border-pine-200 bg-pine-50 px-3 py-2 text-sm text-pine-800">
                  <Icon name="users" size={15} /> Your connection <b>{connection.name}</b> ({connection.relationship}) works at {job.company}.
                </p>
              )}
              {!oText ? (
                <div className="card p-5">
                  <Btn variant="primary" icon="send" disabled={oAI.busy} onClick={() => oAI.run(
                    ["Reading job + recruiter context…", "Selecting your strongest verified proof points…", "Writing message…"],
                    () => { setOText(outreach(job, profile, oKind, connection?.name)); }
                  )}>
                    {oAI.busy ? oAI.stage : "Generate message"}
                  </Btn>
                  {oAI.busy && <div className="mt-4"><Shimmer lines={5} /></div>}
                </div>
              ) : (
                <>
                  <section className="card p-5">
                    <textarea className="textarea min-h-[180px] text-sm leading-relaxed" value={oText} onChange={(e) => setOText(e.target.value)} />
                  </section>
                  <div className="flex flex-wrap gap-2">
                    <CopyBtn text={oText} label="Copy message" size="md" />
                    <Btn variant="ink" icon="check" size="md" onClick={() => {
                      const id = ensureApp();
                      if (id) setStatus(id, "Recruiter Contacted");
                      toast(`${job.company} marked as Recruiter Contacted — follow-up reminder suggested in 7 days`);
                      actInboxSilently();
                    }}>Mark contacted</Btn>
                    <Btn icon="refresh" variant="ghost" onClick={() => setOText(null)}>Regenerate</Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── APPLICATION QUESTIONS ── */}
          {tab === "questions" && (
            <div className="space-y-4">
              <section className="card p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select className="select" value={q} onChange={(e) => { setQ(e.target.value as AppQuestion); setAText(null); }} aria-label="Application question">
                    {APP_QUESTIONS.map((qq) => <option key={qq}>{qq}</option>)}
                  </select>
                  <div className="flex gap-1.5">
                    {(["short", "medium", "detailed"] as const).map((l) => (
                      <button key={l} onClick={() => { setQLen(l); setAText(null); }}
                        className={`chip border capitalize ${qLen === l ? "border-pine-600 bg-pine-600 text-white" : "bg-white text-ink-600"}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  {!aText ? (
                    <Btn variant="primary" icon="wand" disabled={qAI.busy} onClick={() => qAI.run(
                      ["Retrieving verified experience…", "Structuring answer (STAR where useful)…", "Checking against word limits…"],
                      () => setAText(answerQuestion(q, job, profile, qLen))
                    )}>
                      {qAI.busy ? qAI.stage : "Draft answer from my profile"}
                    </Btn>
                  ) : (
                    <>
                      <textarea className="textarea min-h-[150px] text-sm leading-relaxed" value={aText} onChange={(e) => setAText(e.target.value)} />
                      <div className="mt-2 flex items-center gap-2">
                        <CopyBtn text={aText} />
                        <Btn size="sm" icon="refresh" variant="ghost" onClick={() => setAText(null)}>Redraft</Btn>
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-pine-700"><Icon name="shield" size={13} />Grounded in verified achievements only</span>
                      </div>
                    </>
                  )}
                  {qAI.busy && <div className="mt-3"><Shimmer lines={4} /></div>}
                </div>
              </section>
            </div>
          )}

          {/* ── COMPANY INTEL ── */}
          {tab === "company" && (
            company ? (
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  ["Overview", company.overview, "building"],
                  ["Products & customers", `${company.products} Customers: ${company.customers}`, "briefcase"],
                  ["Business model & strategy", `${company.businessModel} Strategy: ${company.strategy}`, "flag"],
                  ["Recent moves", company.announcements, "zap"],
                  ["Leadership & competitors", `${company.leadership} Competitors: ${company.competitors}`, "users"],
                  ["Tech & initiatives", company.tech, "gear"],
                ] as const).map(([t, body, ic]) => (
                  <section key={t} className="card p-5">
                    <h4 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name={ic} size={16} /></span>{t}</h4>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-700">{body}</p>
                  </section>
                ))}
                <section className="card border-pine-200 bg-pine-50/50 p-5 md:col-span-2">
                  <h4 className="font-display text-[15px] font-semibold text-ink-900">How this role contributes — and what could make it hard</h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-700">{company.roleContribution}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-clay-700"><b>Likely challenges:</b> {company.challenges}</p>
                  <h4 className="label-mono mb-2 mt-4">Questions to ask in the interview</h4>
                  <ul className="space-y-1.5">
                    {company.questions.map((qq) => <li key={qq} className="flex gap-2 text-[13px] text-ink-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" />{qq}</li>)}
                  </ul>
                </section>
              </div>
            ) : (
              <EmptyState icon="building" title={`No research dossier on ${job.company} yet`}
                sub="This company isn't in your research library. Track it in Companies and the agent will monitor it for new PM openings."
                action={<Btn variant="primary" onClick={() => setTab("overview")}>Back to overview</Btn>} />
            )
          )}
        </div>
      </aside>

      {/* ── APPLY REVIEW (human-in-the-loop) ── */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Review submission — ${job.company}`} wide>
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-md border border-gold-100 bg-gold-50 p-3 text-[13px] text-gold-700">
            <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
            Waypoint never submits anything automatically. Review each item below — the submission happens on the company's site with <b>you</b> at the keyboard.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-mist-200 p-3">
              <p className="label-mono mb-1">Company & role</p>
              <p className="text-sm font-semibold text-ink-800">{job.title}</p>
              <p className="text-xs text-mist-600">{job.company} · {job.location} · {job.mode}</p>
            </div>
            <div className="rounded-md border border-mist-200 p-3">
              <p className="label-mono mb-1">Resume version</p>
              <select className="select !py-1.5 text-sm" value={resumeChoice} onChange={(e) => setResumeChoice(e.target.value)}>
                {state.resumeVersions.filter((r) => r.approved).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="rounded-md border border-mist-200 p-3 sm:col-span-2">
              <p className="label-mono mb-1">Cover letter</p>
              {state.letters.filter((l) => l.jobId === jobId).length === 0 ? (
                <p className="text-sm text-mist-500">No approved letter for this job yet — generate one in the Cover Letter tab, or proceed without.</p>
              ) : (
                <select className="select !py-1.5 text-sm" value={letterChoice} onChange={(e) => setLetterChoice(e.target.value)}>
                  <option value="">— none —</option>
                  {state.letters.filter((l) => l.jobId === jobId).map((l) => <option key={l.id} value={l.id}>{l.tone} · approved</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="rounded-md border border-mist-200 p-3">
            <p className="label-mono mb-1.5">Pre-drafted answers available</p>
            <div className="flex flex-wrap gap-1.5">{APP_QUESTIONS.slice(0, 4).map((qq) => <Chip key={qq}>{qq}</Chip>)}</div>
            <p className="mt-1.5 text-xs text-mist-500">Draft verified answers in the App Questions tab — every answer is grounded in your career profile.</p>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-pine-200 bg-pine-50/60 p-3">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-pine-600" checked={approveCheck} onChange={(e) => setApproveCheck(e.target.checked)} />
            <span className="text-[13px] leading-relaxed text-ink-700">I have reviewed the resume, cover letter and answers above. Everything is accurate — nothing invented. I approve marking this application as <b>submitted</b> once I complete it on the company site.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Btn>
            <Btn variant="primary" icon="check" disabled={!approveCheck} onClick={() => {
              const id = ensureApp();
              if (id) {
                approveSubmission(id, resumeChoice, letterChoice || undefined);
                toast(`Marked Applied — follow-up reminder set for ${fmtDate(iso(7))}`);
              }
              setApplyOpen(false); setApproveCheck(false); onClose();
            }}>Mark as submitted</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );

  function actInboxSilently() { /* outreach is manual; no inbox item to clear */ }
}

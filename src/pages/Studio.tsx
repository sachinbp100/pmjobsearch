import { useMemo, useState } from "react";
import type { Letter, Tone } from "../data";
import { TONES, fmtDate, iso } from "../data";
import { coverLetter, scoreJob, tailorResume } from "../engine";
import type { LetterOutput } from "../engine";
import { useApp } from "../store";
import { Btn, Chip, CopyBtn, EmptyState, Icon, SectionHead, Shimmer, Tabs, useFakeAI } from "../ui";

// ─── RESUME STUDIO ───────────────────────────────────────────────────────────
export function ResumeStudio() {
  const { state, openJob, saveTailored, addResumeVersion, toast } = useApp();
  const p = state.profile;
  const ai = useFakeAI();
  const jobs = useMemo(() => [...state.jobs].sort((a, b) => scoreJob(b, p).overall - scoreJob(a, p).overall), [state.jobs, p]);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const job = state.jobs.find((j) => j.id === jobId);
  const tailored = state.tailored[jobId];
  const [summary, setSummary] = useState("");

  const generate = () => {
    if (!job) return;
    ai.run(
      ["Loading master resume…", "Ranking achievements by relevance…", "Optimizing keywords (verified only)…", "Drafting targeted summary…"],
      () => {
        const t = tailorResume(job, p, scoreJob(job, p));
        saveTailored(t);
        setSummary(t.summary);
        toast("Tailored resume ready");
      }
    );
  };

  return (
    <div>
      <SectionHead kicker="Master resume + AI-tailored versions" title="Resume Studio"
        sub="Your master resume stays the source of truth. Tailoring reorders and emphasizes what you've actually done — it never invents." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* master */}
        <section className="card h-fit p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink-900">Master resume</h3>
            <Chip tone="pine">source of truth</Chip>
          </div>
          <p className="mt-2 font-display text-xl font-bold text-ink-900">{p.name}</p>
          <p className="text-sm text-mist-600">{p.headline}</p>
          <p className="mt-1 text-xs text-mist-500">{p.currentTitle} · {p.currentCompany} · {p.pmYears} yrs PM / {p.totalYears} total</p>
          <h4 className="label-mono mb-2 mt-4">Selected achievements</h4>
          <ul className="space-y-2">
            {p.achievements.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-md border border-mist-200 p-2.5">
                <p className="text-[13px] font-semibold text-ink-800">{a.title}</p>
                <p className="font-mono text-[11px] text-pine-700">{a.metrics.join(" · ")}</p>
              </li>
            ))}
          </ul>
          <h4 className="label-mono mb-2 mt-4">Core skills</h4>
          <div className="flex flex-wrap gap-1.5">{p.skillAreas.slice(0, 10).map((s) => <Chip key={s.area} tone="pine">{s.area}</Chip>)}</div>
          <h4 className="label-mono mb-2 mt-4">Versions</h4>
          <ul className="space-y-1.5">
            {state.resumeVersions.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-md border border-mist-200 px-2.5 py-2">
                <span className="text-mist-400"><Icon name="doc" size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-ink-800">{r.name}</p>
                  <p className="truncate text-[11px] text-mist-500">{r.note} · {fmtDate(r.updatedAt)}</p>
                </div>
                {r.approved ? <Chip tone="pine">approved</Chip> : <Chip>draft</Chip>}
              </li>
            ))}
          </ul>
        </section>

        {/* tailor */}
        <section className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink-900">Tailor for a role</h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select className="select !w-auto max-w-full" value={jobId} onChange={(e) => { setJobId(e.target.value); setSummary(state.tailored[e.target.value]?.summary ?? ""); }} aria-label="Target job">
                {jobs.map((j) => <option key={j.id} value={j.id}>{scoreJob(j, p).overall}% — {j.title} @ {j.company}</option>)}
              </select>
              <Btn variant="primary" icon="wand" disabled={ai.busy} onClick={generate}>{ai.busy ? ai.stage : tailored ? "Regenerate" : "Generate tailored resume"}</Btn>
              {job && <Btn icon="eye" variant="ghost" onClick={() => openJob(job.id, "overview")}>View job</Btn>}
            </div>
            {ai.busy && <div className="mt-4"><Shimmer lines={6} /></div>}
          </div>

          {tailored && !ai.busy && (
            <>
              <div className="card anim-fade-up p-5">
                <h4 className="font-display text-base font-semibold text-ink-900">Targeted summary <Chip tone="pine" className="ml-2 align-middle">editable</Chip></h4>
                <textarea className="textarea mt-2 min-h-[92px] text-sm leading-relaxed" value={summary} onChange={(e) => setSummary(e.target.value)} />
                <h4 className="label-mono mb-2 mt-4">Experience — relevance order</h4>
                <ul className="space-y-2">
                  {tailored.bullets.map((b) => (
                    <li key={b.text} className={`rounded-md border p-2.5 text-[12.5px] leading-relaxed ${b.highlighted ? "border-pine-200 bg-pine-50/60" : "border-mist-200 text-mist-600"}`}>
                      {b.highlighted && <span className="mr-1.5 text-pine-600"><Icon name="spark" size={12} /></span>}{b.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="label-mono mb-1.5">Verified keywords added</h4>
                    <div className="flex flex-wrap gap-1.5">{tailored.keywordsAdded.length ? tailored.keywordsAdded.map((k) => <Chip key={k} tone="pine">{k}</Chip>) : <span className="text-xs text-mist-500">none needed</span>}</div>
                  </div>
                  <div>
                    <h4 className="label-mono mb-1.5">Flagged — not added</h4>
                    <div className="flex flex-wrap gap-1.5">{tailored.flaggedKeywords.length ? tailored.flaggedKeywords.map((k) => <Chip key={k} tone="clay">{k}</Chip>) : <span className="text-xs text-mist-500">clean</span>}</div>
                  </div>
                </div>
              </div>
              <div className="card anim-fade-up p-5">
                <h4 className="font-display text-base font-semibold text-ink-900">Changes & reasoning</h4>
                <ul className="mt-2.5 space-y-2">
                  {tailored.changes.map((c) => (
                    <li key={c.detail} className="flex gap-2.5 text-[13px]">
                      <span className={`mt-0.5 ${c.type === "flag" ? "text-clay-500" : "text-pine-600"}`}><Icon name={c.type === "flag" ? "alert" : "check"} size={14} /></span>
                      <span className="text-ink-700"><b>{c.detail}</b> <span className="text-mist-500">— {c.reason}</span></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <Btn variant="primary" icon="check" onClick={() => {
                    saveTailored({ ...tailored, summary });
                    if (job) addResumeVersion(`Tailored — ${job.company}`, `Tailored from Master v3 for ${job.title}; ${tailored.keywordsAdded.length} verified keywords.`, job.id);
                    toast("Saved as approved resume version");
                  }}>Approve & save version</Btn>
                  <CopyBtn text={`${p.name}\n${summary}\n\n${tailored.bullets.map((b) => "• " + b.text).join("\n")}`} label="Copy resume" size="md" />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── COVER LETTERS ───────────────────────────────────────────────────────────
export function CoverLetters() {
  const { state, saveLetter, approveLetter, deleteLetter, toast } = useApp();
  const p = state.profile;
  const [selId, setSelId] = useState<string | null>(state.letters[0]?.id ?? null);
  const [newJobId, setNewJobId] = useState(state.jobs[0]?.id ?? "");
  const [newTone, setNewTone] = useState<Tone>("Professional");
  const [draft, setDraft] = useState<LetterOutput | null>(null);
  const ai = useFakeAI();
  const sel = state.letters.find((l) => l.id === selId) ?? null;
  const [editText, setEditText] = useState(sel?.text ?? "");
  const jobOf = (id: string) => state.jobs.find((j) => j.id === id);

  const selectLetter = (l: Letter) => { setSelId(l.id); setEditText(l.text); setDraft(null); };

  const generate = () => {
    const job = jobOf(newJobId);
    if (!job) return;
    ai.run(
      ["Pulling verified achievements…", `Writing in "${newTone}" voice…`, "Validating every claim against your profile…"],
      () => { setDraft(coverLetter(job, p, newTone)); setSelId(null); toast("All claims validated"); }
    );
  };

  return (
    <div>
      <SectionHead kicker="Customized, validated, approved" title="Cover Letters"
        sub="Four voices for every role. Every claim is checked against your Verified Career Facts before you see it — nothing invented, ever." />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* library + generator */}
        <div className="space-y-4">
          <section className="card p-4">
            <h3 className="mb-2.5 font-display text-[15px] font-semibold text-ink-900">New letter</h3>
            <select className="select mb-2" value={newJobId} onChange={(e) => setNewJobId(e.target.value)} aria-label="Job">
              {state.jobs.map((j) => <option key={j.id} value={j.id}>{j.title} @ {j.company}</option>)}
            </select>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} onClick={() => setNewTone(t)} className={`chip border ${newTone === t ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>{t}</button>
              ))}
            </div>
            <Btn variant="primary" icon="pen" className="w-full" disabled={ai.busy} onClick={generate}>{ai.busy ? ai.stage : "Generate"}</Btn>
            {ai.busy && <div className="mt-3"><Shimmer lines={4} /></div>}
          </section>
          <section className="card p-4">
            <h3 className="mb-2.5 font-display text-[15px] font-semibold text-ink-900">Library <span className="font-mono text-xs text-mist-400">({state.letters.length})</span></h3>
            {state.letters.length === 0 && <p className="text-xs text-mist-500">No letters yet — generate your first above.</p>}
            <div className="space-y-1.5">
              {state.letters.map((l) => {
                const j = jobOf(l.jobId);
                return (
                  <button key={l.id} onClick={() => selectLetter(l)}
                    className={`w-full rounded-lg border p-2.5 text-left transition-colors ${selId === l.id && !draft ? "border-pine-400 bg-pine-50/60" : "border-mist-200 hover:border-mist-300"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-ink-800">{j?.company ?? "Unknown"}</p>
                      {l.approved ? <Chip tone="pine">approved</Chip> : <Chip>draft</Chip>}
                    </div>
                    <p className="truncate text-[11px] text-mist-500">{j?.title} · {l.tone} · {fmtDate(l.updatedAt)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* editor */}
        <section>
          {draft ? (
            <div className="card anim-fade-up p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ink-900">New draft — {newTone} · {jobOf(newJobId)?.company}</h3>
                <span className="font-mono text-xs text-mist-500">{draft.text.split(/\s+/).length} words</span>
              </div>
              <textarea className="textarea mt-3 min-h-[320px] text-[13.5px] leading-relaxed" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
              <div className="mt-3 rounded-lg border border-pine-200 bg-pine-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-pine-800"><Icon name="shield" size={15} />Claim validation</p>
                <ul className="mt-1.5 space-y-1">
                  {draft.claims.map((c) => <li key={c.claim} className="flex gap-1.5 text-xs text-ink-700"><span className="text-pine-600"><Icon name="check" size={12} /></span>{c.claim} <span className="text-mist-500">— {c.source}</span></li>)}
                </ul>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn variant="primary" icon="check" onClick={() => {
                  const l: Letter = { id: `l-${Date.now()}`, jobId: newJobId, tone: newTone, text: draft.text, updatedAt: iso(0), approved: true, claims: draft.claims };
                  saveLetter(l); setSelId(l.id); setEditText(l.text); setDraft(null);
                  toast("Letter saved & approved");
                }}>Approve & save</Btn>
                <CopyBtn text={draft.text} size="md" />
                <Btn variant="ghost" icon="x" onClick={() => setDraft(null)}>Discard</Btn>
              </div>
            </div>
          ) : sel ? (
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ink-900">{jobOf(sel.jobId)?.company} — {sel.tone}</h3>
                <div className="flex gap-2">
                  {!sel.approved && <Btn size="sm" variant="primary" icon="check" onClick={() => { approveLetter(sel.id); toast("Approved"); }}>Approve</Btn>}
                  <Btn size="sm" icon="trash" variant="ghost" onClick={() => { deleteLetter(sel.id); setSelId(null); toast("Letter deleted", "warn"); }}>Delete</Btn>
                </div>
              </div>
              <textarea className="textarea mt-3 min-h-[300px] text-[13.5px] leading-relaxed" value={editText} onChange={(e) => { setEditText(e.target.value); saveLetter({ ...sel, text: e.target.value, updatedAt: iso(0) }); }} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CopyBtn text={editText} size="md" />
                <span className="font-mono text-xs text-mist-500">{editText.split(/\s+/).length} words · updated {fmtDate(sel.updatedAt)}</span>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-pine-700"><Icon name="shield" size={13} />{sel.claims.length} verified claims</span>
              </div>
            </div>
          ) : (
            <EmptyState icon="pen" title="Select or generate a letter" sub="Pick one from the library, or generate a fresh letter in any of the four voices." />
          )}
        </section>
      </div>
    </div>
  );
}

export function StudioTabs() {
  const [tab, setTab] = useState("resume");
  return (
    <div>
      <Tabs className="mb-5" active={tab} onChange={setTab} tabs={[
        { id: "resume", label: "Resume Studio", icon: "wand" },
        { id: "letters", label: "Cover Letters", icon: "pen" },
      ]} />
      {tab === "resume" ? <ResumeStudio /> : <CoverLetters />}
    </div>
  );
}

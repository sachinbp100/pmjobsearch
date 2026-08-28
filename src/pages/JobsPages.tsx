import { useCallback, useEffect, useMemo, useState } from "react";
import type { Job, WorkMode } from "../data";
import { fmtMoney } from "../data";
import { parsePastedJob, scoreJob } from "../engine";
import type { JobScore } from "../engine";
import { fetchLiveJobs } from "../live";
import type { SourceStatus } from "../live";
import { useApp } from "../store";
import { Btn, Chip, EmptyState, Icon, JobCard, Modal, RecBadge, ScoreRing, SectionHead, Shimmer, Monogram, useFakeAI, scoreText } from "../ui";

function useScored() {
  const { state } = useApp();
  return useMemo(
    () => state.jobs.map((job) => ({ job, score: scoreJob(job, state.profile) })),
    [state.jobs, state.profile]
  );
}

// ─── DISCOVER ────────────────────────────────────────────────────────────────
export function Discover() {
  const { state, openJob, agentFinish, toast, ingestLiveJobs } = useApp();
  const scored = useScored();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"All" | WorkMode>("All");
  const [src, setSrc] = useState("All sources");
  const [minScore, setMinScore] = useState(0);
  const [fresh, setFresh] = useState(0);
  const [locF, setLocF] = useState<"any" | "country" | "remote">("any");
  const [sort, setSort] = useState<"score" | "newest" | "salary">("newest");
  const country = state.profile.country || "India";
  const countryCities: Record<string, string[]> = {
    india: ["bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "chennai", "gurugram", "gurgaon", "noida", "kolkata"],
  };
  const locOk = (j: Job): boolean => {
    if (locF === "any") return true;
    if (locF === "remote") return j.mode === "Remote";
    const l = j.location.toLowerCase();
    return j.mode === "Remote" || l.includes(country.toLowerCase()) || (countryCities[country.toLowerCase()] ?? []).some((c) => l.includes(c));
  };
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const capAI = useFakeAI();

  // ── live internet feed ──
  const [live, setLive] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [syncInfo, setSyncInfo] = useState<SourceStatus[] | null>(null);

  const sync = useCallback(async () => {
    const so = state.settings.sources;
    if (so.Remotive === false && so.Arbeitnow === false) {
      toast("Both live boards are disabled in Settings — enable Remotive or Arbeitnow first", "warn");
      return;
    }
    setSyncState("busy");
    try {
      const { jobs, statuses } = await fetchLiveJobs({ remotive: so.Remotive !== false, arbeitnow: so.Arbeitnow !== false });
      setSyncInfo(statuses);
      if (jobs.length === 0 && statuses.every((s) => !s.ok)) { setSyncState("err"); return; }
      const { added, dupes } = ingestLiveJobs(jobs);
      setSyncState("ok");
      toast(added > 0 ? `Live sync — ${added} new posting${added === 1 ? "" : "s"} added${dupes ? `, ${dupes} duplicate${dupes === 1 ? "" : "s"} skipped` : ""}` : "Live sync — already up to date", added > 0 ? "ok" : "warn");
    } catch {
      setSyncState("err");
    }
  }, [state.settings.sources, ingestLiveJobs, toast]);

  // auto-sync when the live feed is opened (at most every 15 minutes)
  useEffect(() => {
    if (!live || syncState === "busy") return;
    const stale = !state.lastLiveSync || Date.now() - new Date(state.lastLiveSync).getTime() > 15 * 60 * 1000;
    if (stale) void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const sources = ["All sources", ...new Set(state.jobs.map((j) => j.source))];

  const list = useMemo(() => {
    let out = scored.filter(({ job, score }) =>
      (!live || job.live) &&
      (mode === "All" || job.mode === mode) &&
      (src === "All sources" || job.source === src) &&
      locOk(job) &&
      score.overall >= minScore &&
      (fresh === 0 || job.postedDaysAgo <= fresh) &&
      (q === "" || (job.title + " " + job.company + " " + job.industry + " " + job.requiredSkills.join(" ")).toLowerCase().includes(q.toLowerCase()))
    );
    out = [...out].sort((a, b) =>
      sort === "score" ? b.score.overall - a.score.overall
      : sort === "salary" ? (b.job.salaryMax ?? 0) - (a.job.salaryMax ?? 0)
      : a.job.postedDaysAgo - b.job.postedDaysAgo
    );
    return out;
  }, [scored, q, mode, src, minScore, fresh, sort, live, locF, country]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeCaptured = () => {
    if (paste.trim().length < 40) { toast("Paste a fuller job description (40+ characters)", "warn"); return; }
    const job = parsePastedJob(paste);
    capAI.run(
      ["Extracting role, company & location…", "Detecting required skills…", "Scoring against your profile…", "Saving to tracker…"],
      () => {
        agentFinish([job], [`Manual capture analyzed — ${job.title} @ ${job.company} (scored ${scoreJob(job, state.profile).overall}%).`]);
        setCaptureOpen(false); setPaste("");
        openJob(job.id, "analysis");
        toast("Job captured, scored and added to your dashboard");
      }
    );
  };

  return (
    <div>
      <SectionHead kicker="Continuous discovery" title="Discover Jobs"
        sub="Aggregated from your connected sources — LinkedIn, company career pages, recruiter email, Wellfound and more — filtered through your preferences."
        right={<Btn variant="ink" icon="wand" onClick={() => setCaptureOpen(true)}>Analyze a job</Btn>} />

      <div className="card mb-4 p-3.5">
        <div className="grid gap-2.5 md:grid-cols-[1fr_repeat(4,auto)]">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-400"><Icon name="search" size={15} /></span>
            <input className="input !pl-8" placeholder="Search title, company, skill…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select !w-auto" value={mode} onChange={(e) => setMode(e.target.value as "All" | WorkMode)} aria-label="Work mode">
            {["All", "Remote", "Hybrid", "Onsite"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="select !w-auto" value={src} onChange={(e) => setSrc(e.target.value)} aria-label="Source">
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="select !w-auto" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} aria-label="Minimum match">
            <option value={0}>Any match</option><option value={70}>≥ 70%</option><option value={80}>≥ 80%</option><option value={88}>≥ 88%</option>
          </select>
          <select className="select !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="newest">Newest</option><option value="score">Best match</option><option value="salary">Highest pay</option>
          </select>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-mist-300">
            <button onClick={() => setLive(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${!live ? "bg-ink-900 text-white" : "bg-white text-mist-600 hover:bg-mist-50"}`}>
              <Icon name="doc" size={12} />Local board
            </button>
            <button onClick={() => setLive(true)}
              className={`flex items-center gap-1.5 border-l border-mist-300 px-3 py-1.5 text-xs font-semibold transition-colors ${live ? "bg-pine-600 text-white" : "bg-white text-mist-600 hover:bg-mist-50"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "pulse-dot bg-gold-400" : "bg-mist-400"}`} />
            Live feed
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {([["any", "Anywhere"], ["country", country], ["remote", "Remote only"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setLocF(id)}
              className={`chip border transition-colors ${locF === id ? "border-ink-900 bg-ink-900 text-white" : "bg-white hover:border-ink-300"}`}>
              {id === "country" && <Icon name="building" size={11} />}{label}
            </button>
          ))}
        </div>
        {["Posted:", ["Any", 0], ["24h", 1], ["3d", 3], ["7d", 7]].map(([label, v], i) =>            i === 0 ? <span key="l" className="label-mono">{label as string}</span> : (
              <button key={label as string} onClick={() => setFresh(v as number)}
                className={`chip border ${fresh === v ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>{label as string}</button>
            )
          )}
          <span className="ml-auto font-mono text-xs text-mist-500">{list.length} of {live ? scored.filter(({ job }) => job.live).length : scored.length} roles · agent checks {Object.entries(state.settings.sources).filter(([, on]) => on).length} sources {state.settings.scheduleFreq}</span>
        </div>
        {live && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-mist-200 pt-2.5">
            <span className="label-mono !text-pine-700">Remote boards</span>
            {(syncInfo ?? []).map((s) => (
              <span key={s.source} className={`chip border ${s.ok ? "border-pine-200 bg-pine-50 text-pine-800" : "border-clay-100 bg-clay-50 text-clay-700"}`}
                title={s.error ?? undefined}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? "bg-pine-500" : "bg-clay-500"}`} />
                {s.source} {s.ok ? `· ${s.count} PM roles` : "· unreachable"}
              </span>
            ))}
            {syncState === "busy" && (
              <span className="chip border border-mist-300 bg-white text-mist-600">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-mist-300 border-t-pine-600" />
                pulling live postings…
              </span>
            )}
            {state.lastLiveSync && syncState !== "busy" && (
              <span className="font-mono text-[11px] text-mist-500">
                synced {new Date(state.lastLiveSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={() => void sync()} disabled={syncState === "busy"}
              className="btn btn-ghost !px-2 !py-1 text-xs" aria-label="Sync live feeds now">
              <Icon name="refresh" size={13} />Sync now
            </button>
            <span className="w-full text-[11px] leading-relaxed text-mist-400">
              Remotive lists remote-first roles worldwide (India-friendly) · Arbeitnow leans EU-based · your base country is set in Career Profile → Search preferences
            </span>
          </div>
        )}
      </div>

      {live && syncState === "busy" && list.length === 0 ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="card p-4"><Shimmer lines={3} /></div>)}</div>
      ) : live && syncState === "err" && list.length === 0 ? (
        <div className="card border-clay-100 p-8 text-center">
          <p className="font-display text-base font-semibold text-clay-700">Couldn't reach the live job boards</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-mist-600">Check your internet connection, or the boards may be rate-limiting. Your local board is unaffected — flip back to it, or retry.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Btn variant="primary" icon="refresh" onClick={() => void sync()}>Retry sync</Btn>
            <Btn variant="ghost" onClick={() => setLive(false)}>Back to local board</Btn>
          </div>
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon="radar" title={live ? "No live PM roles captured yet" : "No roles match those filters"}
          sub={live ? "Run a sync, or loosen the filters — live postings are scored against your profile the moment they land." : "Loosen the match threshold or run the agent to pull fresh postings from your sources."}
          action={live ? <Btn variant="primary" icon="radar" onClick={() => void sync()}>Sync live boards</Btn> : undefined} />
      ) : (
        <div className="space-y-3">
          {list.map(({ job, score }, i) => <JobCard key={job.id} job={job} score={score} index={i} onOpen={(id) => openJob(id)} />)}
        </div>
      )}

      <Modal open={captureOpen} onClose={() => setCaptureOpen(false)} title="Analyze This Job" wide>
        <p className="mb-3 text-sm text-mist-600">Paste any job description — from a browser tab, LinkedIn, or a recruiter email. Waypoint extracts the role, detects skills, scores the match and builds your full application kit.</p>
        <textarea className="textarea min-h-[220px] font-mono text-xs leading-relaxed" placeholder={"Staff Product Manager, Payments\nAcme Corp\nRemote — US · $180K–$220K\n\nWe're looking for 8+ years of product experience owning platform APIs, partner integrations and product strategy…"}
          value={paste} onChange={(e) => setPaste(e.target.value)} />
        <div className="mt-3 flex items-center gap-2">
          <Btn variant="primary" icon="spark" disabled={capAI.busy} onClick={analyzeCaptured}>
            {capAI.busy ? capAI.stage : "Extract & score"}
          </Btn>
          <Btn variant="ghost" onClick={() => setCaptureOpen(false)}>Cancel</Btn>
        </div>
        {capAI.busy && <div className="mt-3"><Shimmer lines={4} /></div>}
      </Modal>
    </div>
  );
}

// ─── MATCHES ─────────────────────────────────────────────────────────────────
export function Matches() {
  const { openJob } = useApp();
  const scored = useScored();
  const ranked = [...scored].sort((a, b) => b.score.overall - a.score.overall);
  return (
    <div>
      <SectionHead kicker="AI-ranked against your verified profile" title="Job Matches"
        sub="Every open role, scored 0–100 across skills, experience, career growth and your stated preferences — with the reasoning made explicit." />
      <div className="space-y-3">
        {ranked.map(({ job, score }, i) => <RankRow key={job.id} job={job} score={score} rank={i + 1} onOpen={() => openJob(job.id)} index={i} />)}
      </div>
    </div>
  );
}

function RankRow({ job, score, rank, onOpen, index }: { job: Job; score: JobScore; rank: number; onOpen: () => void; index: number }) {
  const { state, toggleSave, toast } = useApp();
  const saved = state.savedIds.includes(job.id);
  return (
    <div className="card card-hover anim-fade-up grid cursor-pointer gap-3 p-4 md:grid-cols-[auto_1fr_240px_auto]" style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
      onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <div className="flex items-center gap-3 md:flex-col md:items-center">
        <span className={`font-mono text-sm font-bold ${rank <= 3 ? "text-pine-600" : "text-mist-400"}`}>#{rank}</span>
        <Monogram name={job.company} size={40} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[15px] font-semibold text-ink-900">{job.title}</h3>
          <RecBadge rec={score.rec} size="sm" />
          {job.isNew && <Chip tone="pine">NEW</Chip>}
        </div>
        <p className="mt-0.5 text-xs text-mist-600">{job.company} · {job.industry} · {job.location} · {job.mode}{job.salaryMax ? ` · ${fmtMoney(job.salaryMin ?? 0)}–${fmtMoney(job.salaryMax)}` : ""}</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-mist-600">{score.reason}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {score.matched.slice(0, 4).map((s) => <Chip key={s} tone="pine">{s}</Chip>)}
          {score.missing.slice(0, 2).map((s) => <Chip key={s} tone="clay">{s} ✕</Chip>)}
        </div>
      </div>
      <div className="grid grid-cols-2 content-center gap-x-4 gap-y-1.5" onClick={(e) => e.stopPropagation()}>
        {([["Skills", score.skills], ["Experience", score.experience], ["Growth", score.growth], ["Prefs", score.prefs]] as const).map(([k, v]) => (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-[10.5px]"><span className="text-mist-500">{k}</span><span className={`font-mono font-semibold ${scoreText(v)}`}>{v}</span></div>
            <div className="h-1 rounded-full bg-mist-200"><div className="h-full rounded-full progress-sweep" style={{ width: `${v}%`, background: v >= 85 ? "var(--color-pine-500)" : v >= 70 ? "var(--color-gold-500)" : "var(--color-clay-500)" }} /></div>
          </div>
        ))}
        <div className="col-span-2 mt-1 flex gap-1.5">
          <Btn size="sm" icon="bookmark" variant={saved ? "soft" : "ghost"} onClick={() => { toggleSave(job.id); toast(saved ? "Removed from watchlist" : "Saved"); }}>{saved ? "Saved" : "Save"}</Btn>
          <Btn size="sm" icon="wand" variant="outline" onClick={onOpen}>Full analysis</Btn>
        </div>
      </div>
      <div className="flex items-center md:flex-col md:justify-center">
        <ScoreRing value={score.overall} size={62} />
      </div>
    </div>
  );
}

// ─── SAVED ───────────────────────────────────────────────────────────────────
export function Saved() {
  const { state, openJob, setTab } = useApp();
  const scored = useScored();
  const saved = scored.filter(({ job }) => state.savedIds.includes(job.id)).sort((a, b) => b.score.overall - a.score.overall);
  const watched = state.companies.filter((c) => c.watched);
  return (
    <div>
      <SectionHead kicker="Your watchlist" title="Saved Jobs"
        sub="Roles and companies you're monitoring. The daily agent watches these companies and alerts you when new PM openings appear." />
      {saved.length === 0 ? (
        <EmptyState icon="bookmark" title="Nothing saved yet" sub="Save roles from Discover or Job Matches and they'll land here — the agent monitors saved companies for new postings."
          action={<Btn variant="primary" icon="radar" onClick={() => setTab("discover")}>Browse Discover</Btn>} />
      ) : (
        <div className="space-y-3">
          {saved.map(({ job, score }, i) => <JobCard key={job.id} job={job} score={score} index={i} onOpen={(id) => openJob(id)} />)}
        </div>
      )}
      <h3 className="mb-2.5 mt-8 font-display text-lg font-bold text-ink-900">Watched companies</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {watched.map((c) => {
          const openings = state.jobs.filter((j) => j.company === c.name);
          return (
            <button key={c.name} className="card card-hover p-4 text-left" onClick={() => setTab("companies")}>
              <div className="flex items-center gap-2.5">
                <Monogram name={c.name} size={34} />
                <div>
                  <p className="font-display text-sm font-semibold text-ink-900">{c.name}</p>
                  <p className="text-[11px] text-mist-500">{c.industry}</p>
                </div>
              </div>
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-pine-700"><Icon name="radar" size={13} />{openings.length} open PM role{openings.length === 1 ? "" : "s"} · monitoring</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from "react";
import type { Profile, WorkMode } from "../data";
import { fmtDate } from "../data";
import { scoreJob } from "../engine";
import {
  ACCEPTED_RESUME_EXT, MAX_RESUME_MB, deleteResumeFile, getResumeFile, readAsDataUrl, readAsText,
  scanResumeText, storeResumeFile,
} from "../files";
import { useApp } from "../store";
import { Btn, Chip, EmptyState, Icon, Modal, Monogram, SectionHead, Toggle } from "../ui";

// ─── CAREER PROFILE ──────────────────────────────────────────────────────────
const CANON_AREAS = ["Product Strategy", "Product Discovery", "Product Delivery", "Agile & Scrum", "Product Ownership", "Stakeholder Management", "Enterprise Platforms", "APIs & Integrations", "Cloud & AWS", "AI & GenAI", "Data & Analytics", "Digital Transformation", "Technical Architecture", "Leadership", "Fintech & Payments", "Healthcare Domain", "Developer Experience"];

export function CareerProfile() {
  const { state, updateProfile, addAchievement, toast } = useApp();
  const p = state.profile;
  const [newTitle, setNewTitle] = useState("");
  const [ach, setAch] = useState({ title: "", detail: "", metrics: "", tags: [] as string[] });
  const [showAchForm, setShowAchForm] = useState(false);

  const set = (patch: Partial<Profile>) => { updateProfile(patch); };

  return (
    <div className="space-y-5">
      <SectionHead kicker="The Verified Career Facts database" title="Career Profile"
        sub="Every resume, letter, answer and message Waypoint generates is grounded in this profile. Keep it accurate — it's your moat against generic applications." />

      {/* identity + goals */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-900 font-display text-xl font-bold text-pine-300 sidebar-bg">{p.name.split(" ").map((w) => w[0]).join("")}</div>
            <div className="flex-1">
              <input className="input font-display !text-lg !font-bold" value={p.name} onChange={(e) => set({ name: e.target.value })} aria-label="Name" />
              <input className="input mt-1.5 text-sm" value={p.headline} onChange={(e) => set({ headline: e.target.value })} aria-label="Headline" />
              <p className="mt-1.5 text-xs text-mist-500">{p.currentTitle} · {p.currentCompany}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([[p.totalYears, "yrs total"], [p.pmYears, "yrs PM"], [p.poYears, "yrs PO"], [p.achievements.length, "verified achievements"]] as const).map(([v, l]) => (
              <div key={l as string} className="rounded-lg border border-mist-200 p-3 text-center">
                <p className="font-display text-2xl font-bold text-ink-900">{v}</p>
                <p className="label-mono mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="label-mono mb-1.5">Industries</p>
              <div className="flex flex-wrap gap-1.5">{p.industries.map((i) => <Chip key={i} tone="ink">{i}</Chip>)}</div>
            </div>
            <div>
              <p className="label-mono mb-1.5">Product domains</p>
              <div className="flex flex-wrap gap-1.5">{p.domains.map((d) => <Chip key={d} tone="pine">{d}</Chip>)}</div>
            </div>
            <div>
              <p className="label-mono mb-1.5">Education</p>
              {p.education.map((e) => <p key={e} className="text-[13px] text-ink-700">{e}</p>)}
            </div>
            <div>
              <p className="label-mono mb-1.5">Certifications</p>
              <div className="flex flex-wrap gap-1.5">{p.certifications.map((c) => <Chip key={c}>{c}</Chip>)}</div>
            </div>
          </div>
          <div className="mt-4">
            <p className="label-mono mb-1.5">Career goals — used for the growth-match score</p>
            <textarea className="textarea min-h-[64px] text-sm" value={p.careerGoals} onChange={(e) => set({ careerGoals: e.target.value })} />
          </div>
          <div className="mt-3">
            <p className="label-mono mb-1.5">LinkedIn</p>
            <p className="flex items-center gap-1.5 text-sm text-pine-700"><Icon name="link" size={14} />{p.linkedin}</p>
          </div>
        </section>

        {/* preferences */}
        <section className="card h-fit p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="target" size={16} /></span>Search preferences</h3>
          <p className="label-mono mb-1.5 mt-3.5">Country / base — feeds match scoring & the Discover filter</p>
          <div className="flex gap-1.5">
            <input className="input !py-1.5 text-xs" list="wp-countries" defaultValue={p.country}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.country) { set({ country: v }); toast(`Base country set to ${v} — scores re-ranked`); } }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} aria-label="Country" />
            <datalist id="wp-countries">
              {["India", "United States", "United Kingdom", "Singapore", "United Arab Emirates", "Canada", "Australia", "Germany", "Netherlands", "Remote-first (anywhere)"].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <p className="label-mono mb-1.5 mt-4">Preferred titles</p>
          <div className="flex flex-wrap gap-1.5">
            {p.preferredTitles.map((t) => (
              <span key={t} className="chip border border-pine-200 bg-pine-50 text-pine-700">{t}
                <button onClick={() => set({ preferredTitles: p.preferredTitles.filter((x) => x !== t) })} className="text-pine-500 hover:text-clay-600" aria-label={`Remove ${t}`}><Icon name="x" size={11} /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input className="input !py-1.5 text-xs" placeholder="Add title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) { set({ preferredTitles: [...p.preferredTitles, newTitle.trim()] }); setNewTitle(""); toast("Preference updated — scores will re-rank"); } }} />
            <Btn size="sm" icon="plus" onClick={() => { if (newTitle.trim()) { set({ preferredTitles: [...p.preferredTitles, newTitle.trim()] }); setNewTitle(""); } }}>Add</Btn>
          </div>
          <p className="label-mono mb-1.5 mt-4">Work modes</p>
          <div className="space-y-1.5">
            {(["Remote", "Hybrid", "Onsite"] as WorkMode[]).map((m) => (
              <div key={m} className="flex items-center justify-between rounded-md border border-mist-200 px-2.5 py-1.5">
                <span className="text-[13px] text-ink-700">{m}</span>
                <Toggle on={p.workModes.includes(m)} label={m} onChange={(on) => set({ workModes: on ? [...p.workModes, m] : p.workModes.filter((x) => x !== m) })} />
              </div>
            ))}
          </div>
          <p className="label-mono mb-1.5 mt-4">Salary band</p>
          <div className="flex items-center gap-2">
            <input type="number" className="input !py-1.5 text-xs" value={p.salaryMin} onChange={(e) => set({ salaryMin: Number(e.target.value) })} aria-label="Min salary" />
            <span className="text-mist-400">—</span>
            <input type="number" className="input !py-1.5 text-xs" value={p.salaryMax} onChange={(e) => set({ salaryMax: Number(e.target.value) })} aria-label="Max salary" />
          </div>
          <p className="label-mono mb-1.5 mt-4">Preferred locations</p>
          <div className="flex flex-wrap gap-1.5">{p.preferredLocations.map((l) => <Chip key={l}>{l}</Chip>)}</div>
          <p className="label-mono mb-1.5 mt-4">Target companies</p>
          <div className="flex flex-wrap gap-1.5">{p.preferredCompanies.map((c) => <Chip key={c} tone="gold">{c}</Chip>)}</div>
        </section>
      </div>

      <ResumeUploadCard />

      {/* skills */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display text-base font-semibold text-ink-900">Skill areas — with verified evidence</h3>
          <p className="mt-0.5 text-xs text-mist-500">The engine matches jobs against these. Evidence strings power your letters and answers.</p>
          <ul className="mt-3 space-y-2">
            {p.skillAreas.map((s) => (
              <li key={s.area} className="flex items-start gap-2.5 rounded-md border border-mist-200 p-2.5">
                <Chip tone={s.level === "Expert" ? "pine" : s.level === "Strong" ? "sky" : "gold"}>{s.level}</Chip>
                <div>
                  <p className="text-[13px] font-semibold text-ink-800">{s.area}</p>
                  <p className="text-[12px] text-mist-600">{s.evidence}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="card p-5">
            <h3 className="font-display text-base font-semibold text-ink-900">Technical skills</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{p.technicalSkills.map((s) => <Chip key={s} tone="ink">{s}</Chip>)}</div>
            <h3 className="font-display text-base font-semibold text-ink-900 mt-4">Product management skills</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">{p.pmSkills.map((s) => <Chip key={s} tone="pine">{s}</Chip>)}</div>
            <h3 className="font-display text-base font-semibold text-ink-900 mt-4">Leadership</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{p.leadership}</p>
          </section>

          {/* achievements */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900"><span className="text-pine-600"><Icon name="shield" size={16} /></span>Achievements database</h3>
              <Btn size="sm" icon="plus" onClick={() => setShowAchForm(!showAchForm)}>{showAchForm ? "Close" : "Add"}</Btn>
            </div>
            {showAchForm && (
              <div className="anim-fade-up mt-3 space-y-2 rounded-lg border border-pine-200 bg-pine-50/50 p-3">
                <input className="input !py-1.5 text-xs" placeholder="Title — e.g., Search Relevance Relaunch" value={ach.title} onChange={(e) => setAch({ ...ach, title: e.target.value })} />
                <textarea className="textarea min-h-[60px] !py-1.5 text-xs" placeholder="What you did (factually)…" value={ach.detail} onChange={(e) => setAch({ ...ach, detail: e.target.value })} />
                <input className="input !py-1.5 text-xs" placeholder="Metrics, comma-separated — e.g., +12% CTR, -30% latency" value={ach.metrics} onChange={(e) => setAch({ ...ach, metrics: e.target.value })} />
                <div className="flex flex-wrap gap-1">
                  {CANON_AREAS.map((a) => (
                    <button key={a} onClick={() => setAch({ ...ach, tags: ach.tags.includes(a) ? ach.tags.filter((x) => x !== a) : [...ach.tags, a] })}
                      className={`chip border !text-[10.5px] ${ach.tags.includes(a) ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>{a}</button>
                  ))}
                </div>
                <Btn size="sm" variant="primary" icon="check" onClick={() => {
                  if (!ach.title.trim() || !ach.detail.trim()) { toast("Title and detail are required", "warn"); return; }
                  addAchievement({ title: ach.title.trim(), detail: ach.detail.trim(), metrics: ach.metrics.split(",").map((m) => m.trim()).filter(Boolean), tags: ach.tags.length ? ach.tags : ["Product Delivery"] });
                  setAch({ title: "", detail: "", metrics: "", tags: [] }); setShowAchForm(false);
                  toast("Achievement added to the verified facts database");
                }}>Save as verified fact</Btn>
              </div>
            )}
            <ul className="mt-3 space-y-2">
              {p.achievements.map((a) => (
                <li key={a.id} className="rounded-md border border-mist-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink-800">{a.title}</p>
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-pine-700"><Icon name="shield" size={11} />verified</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-mist-600">{a.detail}</p>
                  <p className="mt-1 font-mono text-[11px] text-pine-700">{a.metrics.join(" · ") || "no metrics recorded"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">{a.tags.map((t) => <Chip key={t} tone="pine">{t}</Chip>)}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── RESUME UPLOAD ───────────────────────────────────────────────────────────
function ResumeUploadCard() {
  const { state, addResumeVersion, updateResumeVersion, removeResumeVersion, updateProfile, toast } = useApp();
  const p = state.profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [viewText, setViewText] = useState<string | null>(null);
  const [scan, setScan] = useState<{ skills: string[]; metricLines: string[]; picked: string[] } | null>(null);

  const handleFiles = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const ext = (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPTED_RESUME_EXT.includes(ext)) { toast("Unsupported type — use PDF, DOC, DOCX, TXT or MD", "err"); return; }
    if (f.size > MAX_RESUME_MB * 1024 * 1024) { toast(`That file is over ${MAX_RESUME_MB} MB — trim it and retry`, "err"); return; }
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(f);
      const id = `rv-${Date.now().toString(36)}`;
      if (!storeResumeFile(id, dataUrl)) { toast("Browser storage is full — remove an older resume file first", "err"); setBusy(false); return; }
      let textExtract: string | undefined;
      if (ext === "txt" || ext === "md") {
        const text = await readAsText(f);
        textExtract = text.slice(0, 12000);
        const s = scanResumeText(text);
        const fresh = s.skills.filter((x) => !p.skillAreas.some((a) => a.area === x));
        if (fresh.length > 0 || s.metricLines.length > 0) setScan({ skills: fresh, metricLines: s.metricLines, picked: fresh });
      }
      addResumeVersion(
        `${f.name.replace(/\.[^.]+$/, "")} · ${ext.toUpperCase()}`,
        `Uploaded resume · ${(f.size / 1024).toFixed(0)} KB · stored locally in this browser`,
        undefined,
        { id, fileName: f.name, fileSize: f.size, fileKind: ext, textExtract, primary: state.resumeVersions.length === 0 }
      );
      toast(`Resume attached — ${f.name}`);
    } catch {
      toast("Could not read that file", "err");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = (id: string, name: string) => {
    const url = getResumeFile(id);
    if (!url) { toast("File is no longer in browser storage", "warn"); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const versions = state.resumeVersions;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
          <span className="text-pine-600"><Icon name="doc" size={17} /></span>Resumes & CV
        </h3>
        <span className="font-mono text-xs text-mist-400">{versions.length} version{versions.length === 1 ? "" : "s"} · files never leave this browser</span>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* dropzone */}
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
          className={`flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-all ${dragOver ? "border-pine-500 bg-pine-50 scale-[1.01]" : "border-mist-300 bg-mist-50 hover:border-pine-400 hover:bg-pine-50/40"}`}
          aria-label="Upload resume">
          {busy ? (
            <>
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-mist-300 border-t-pine-600" />
              <p className="text-sm font-medium text-ink-700">Storing resume…</p>
            </>
          ) : (
            <>
              <span className={`transition-transform ${dragOver ? "scale-110" : ""}`}><Icon name="up" size={26} /></span>
              <p className="text-sm font-semibold text-ink-800">{dragOver ? "Drop to attach" : "Drop your resume here"}</p>
              <p className="text-xs text-mist-500">or click to browse · PDF, DOC, DOCX, TXT, MD · max {MAX_RESUME_MB} MB</p>
              <p className="mt-1 rounded-md border border-pine-200 bg-pine-50 px-2 py-1 text-[11px] leading-snug text-pine-800">
                <b>.txt / .md</b> get scanned in-browser — detected skills can be added straight to your Verified Career Facts
              </p>
            </>
          )}
          <input ref={fileRef} type="file" accept={ACCEPTED_RESUME_EXT.map((e) => `.${e}`).join(",")} className="hidden"
            onChange={(e) => void handleFiles(e.target.files)} />
        </button>

        {/* versions list */}
        <div>
          {versions.length === 0 ? (
            <div className="flex h-full min-h-[168px] flex-col items-center justify-center rounded-xl border border-mist-200 bg-mist-50/50 p-5 text-center">
              <p className="text-sm font-medium text-ink-700">No resume attached yet</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-mist-500">Attach your master CV once — every tailored version Waypoint generates derives from it and stays traceable back to these verified facts.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => (
                <li key={v.id} className={`flex flex-wrap items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${v.primary ? "border-pine-300 bg-pine-50/50" : "border-mist-200"}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${v.primary ? "bg-pine-600 text-white" : "bg-mist-100 text-mist-600"}`}><Icon name="doc" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{v.name}
                      {v.primary && <Chip tone="pine" className="ml-2 align-middle">primary</Chip>}
                    </p>
                    <p className="truncate text-[11px] text-mist-500">{v.note} · {fmtDate(v.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {v.fileName && <Btn size="sm" variant="ghost" icon="link" onClick={() => download(v.id!, v.fileName!)}>Save</Btn>}
                    {v.textExtract && <Btn size="sm" variant="ghost" icon="eye" onClick={() => setViewText(v.textExtract!)}>Text</Btn>}
                    {!v.primary && <Btn size="sm" variant="ghost" icon="star" onClick={() => { updateResumeVersion(v.id, { primary: true }); toast("Set as primary resume"); }}>Primary</Btn>}
                    {confirmDel === v.id ? (
                      <Btn size="sm" variant="danger" onClick={() => { removeResumeVersion(v.id); if (v.fileName) deleteResumeFile(v.id); setConfirmDel(null); toast("Resume removed", "warn"); }}>Confirm</Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" icon="x" onClick={() => { setConfirmDel(v.id); window.setTimeout(() => setConfirmDel((c) => (c === v.id ? null : c)), 3000); }} aria-label="Remove" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* scan results */}
      {scan && (
        <div className="anim-fade-up mt-4 rounded-xl border border-pine-200 bg-pine-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-pine-800"><Icon name="spark" size={15} />Resume scan — found in your upload</p>
          {scan.skills.length > 0 && (
            <>
              <p className="label-mono mb-1.5 mt-2.5 !text-pine-700">Skills detected — tick the ones that are genuinely yours</p>
              <div className="flex flex-wrap gap-1.5">
                {scan.skills.map((s) => (
                  <button key={s}
                    onClick={() => setScan((sc) => sc && { ...sc, picked: sc.picked.includes(s) ? sc.picked.filter((x) => x !== s) : [...sc.picked, s] })}
                    className={`chip border transition-colors ${scan.picked.includes(s) ? "border-pine-600 bg-pine-600 text-white" : "border-mist-300 bg-white text-ink-600"}`}>
                    <Icon name={scan.picked.includes(s) ? "check" : "plus"} size={11} />{s}
                  </button>
                ))}
              </div>
            </>
          )}
          {scan.metricLines.length > 0 && (
            <>
              <p className="label-mono mb-1.5 mt-3 !text-gold-600">Metric lines spotted — re-enter these as achievements with context (Waypoint never auto-adds claims)</p>
              <ul className="space-y-1">
                {scan.metricLines.map((m) => <li key={m} className="rounded-md border border-gold-100 bg-gold-50 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-ink-700">{m}</li>)}
              </ul>
            </>
          )}
          <div className="mt-3 flex gap-2">
            <Btn size="sm" variant="primary" icon="check" disabled={scan.picked.length === 0}
              onClick={() => {
                updateProfile({ skillAreas: [...p.skillAreas, ...scan.picked.map((s) => ({ area: s, level: "Working" as const, evidence: "Detected in uploaded resume — strengthen with specifics" }))] });
                toast(`${scan.picked.length} skill${scan.picked.length === 1 ? "" : "s"} added to Verified Facts — scores re-ranked`);
                setScan(null);
              }}>
              Add {scan.picked.length} to Verified Facts
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setScan(null)}>Dismiss</Btn>
          </div>
        </div>
      )}

      <Modal open={!!viewText} onClose={() => setViewText(null)} title="Extracted resume text" wide>
        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-mist-200 bg-mist-50 p-4 font-mono text-xs leading-relaxed text-ink-700">{viewText}</pre>
      </Modal>
    </section>
  );
}

// ─── NETWORKING ──────────────────────────────────────────────────────────────
type NetKind = "referral" | "networking" | "followup" | "thanks";
export function Networking() {
  const { state, logInteraction, toast, openJob } = useApp();
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [kind, setKind] = useState<NetKind>("referral");
  const [text, setText] = useState("");
  const p = state.profile;

  const contact = state.contacts.find((c) => c.id === draftFor);
  const relatedJob = useMemo(() => contact ? state.jobs.find((j) => j.company === contact.company) : undefined, [contact, state.jobs]);

  const suggestions = useMemo(() => {
    const out: { contactId: string; jobId: string; note: string }[] = [];
    for (const c of state.contacts) {
      const j = state.jobs.find((x) => x.company === c.company);
      const a = state.applications.find((x) => x.jobId === j?.id);
      if (j && (!a || !["Rejected", "Closed"].includes(a.status))) {
        out.push({ contactId: c.id, jobId: j.id, note: `${c.name} → referral path for ${j.title}` });
      }
    }
    return out;
  }, [state.contacts, state.jobs, state.applications]);

  const gen = () => {
    if (!contact) return;
    const first = p.name.split(" ")[0];
    const ach = p.achievements[0];
    const t: Record<NetKind, string> = {
      referral: `Hi ${contact.name.split(" ")[0]},\n\nHope things are going well at ${contact.company}! I noticed ${relatedJob ? `the ${relatedJob.title} opening` : "a PM opening"} on your team's side, and it overlaps hard with my work — ${ach.title.toLowerCase()} (${ach.metrics[0]}).\n\nWould you be comfortable referring me? Happy to send a two-line blurb and my resume so it's zero effort. No pressure at all if not.\n\n— ${first}`,
      networking: `Hi ${contact.name.split(" ")[0]},\n\nIt's been a while — last we spoke was ${contact.lastInteraction ? fmtDate(contact.lastInteraction) : "a while back"}. I'm exploring ${p.preferredTitles.slice(0, 2).join(" / ")} roles in ${p.preferredIndustries.slice(0, 2).join(" and ")}, and I'd love 20 minutes to hear how you're finding ${contact.company}.\n\nAny time next week work?\n\n— ${first}`,
      followup: `Hi ${contact.name.split(" ")[0]},\n\nFloating this up gently — no rush at all. If ${relatedJob ? "the referral for the " + relatedJob.title + " role" : "a chat"} still makes sense on your end, I'm around this week. If timing's off, totally understand.\n\n— ${first}`,
      thanks: `Hi ${contact.name.split(" ")[0]},\n\nThank you for ${relatedJob ? "the referral — it genuinely made a difference" : "taking the time to talk"}. I'll keep you posted on how it goes, and I'd love to return the favor anytime.\n\n— ${first}`,
    };
    setText(t[kind]);
  };

  return (
    <div>
      <SectionHead kicker="Warm paths into your target companies" title="Networking"
        sub="Your contacts, cross-referenced against open roles. Waypoint flags every referral opportunity and drafts the ask." />

      {suggestions.length > 0 && (
        <div className="mb-5 rounded-xl border border-pine-200 bg-pine-50/70 p-4">
          <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-900"><span className="text-pine-600"><Icon name="spark" size={16} /></span>AI spotted {suggestions.length} warm path{suggestions.length > 1 ? "s" : ""}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => {
              const c = state.contacts.find((x) => x.id === s.contactId)!;
              return (
                <div key={s.contactId + s.jobId} className="flex items-center gap-2 rounded-lg border border-pine-200 bg-white p-2.5">
                  <span className="text-pine-600"><Icon name="users" size={16} /></span>
                  <p className="flex-1 text-[12.5px] text-ink-700">{s.note}</p>
                  <Btn size="sm" variant="soft" onClick={() => { setDraftFor(c.id); setKind("referral"); gen(); window.scrollTo({ top: 400, behavior: "smooth" }); }}>Draft ask</Btn>
                  <Btn size="sm" variant="ghost" icon="eye" onClick={() => openJob(s.jobId)}>Job</Btn>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.contacts.map((c, i) => (
          <article key={c.id} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-3">
              <Monogram name={c.name} size={40} />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[15px] font-semibold text-ink-900">{c.name}</h3>
                <p className="truncate text-xs text-mist-600">{c.role} · {c.company}</p>
                <p className="mt-0.5 text-[11px] text-mist-500">{c.relationship}</p>
              </div>
              {relatedCompanyChip(c.company)}
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-mist-600">{c.notes}</p>
            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mist-500">
              <span className="inline-flex items-center gap-1"><Icon name="clock" size={11} />last: {c.lastInteraction ? fmtDate(c.lastInteraction) : "—"}</span>
              {c.followUpDate && <span className="inline-flex items-center gap-1 text-gold-600"><Icon name="flag" size={11} />follow-up {fmtDate(c.followUpDate)}</span>}
              <span className="inline-flex items-center gap-1 text-pine-700"><Icon name="link" size={11} />{c.linkedin}</span>
            </div>
            <div className="mt-3 flex gap-1.5 border-t border-mist-100 pt-3">
              <Btn size="sm" icon="pen" onClick={() => { setDraftFor(c.id); gen(); window.scrollTo({ top: 400, behavior: "smooth" }); }}>Draft message</Btn>
              <Btn size="sm" variant="ghost" icon="check" onClick={() => { logInteraction(c.id); toast(`Logged interaction with ${c.name}`); }}>Log touch</Btn>
            </div>
          </article>
        ))}
      </div>

      <Modal open={!!contact} onClose={() => setDraftFor(null)} title={contact ? `Message — ${contact.name}` : ""} wide>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([["referral", "Referral request"], ["networking", "Networking"], ["followup", "Follow-up"], ["thanks", "Thank you"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setKind(k); }}
              className={`chip border !px-3 !py-1.5 ${kind === k ? "border-pine-600 bg-pine-600 text-white" : "bg-white"}`}>{l}</button>
          ))}
          <Btn size="sm" className="ml-auto" icon="wand" onClick={gen}>Regenerate</Btn>
        </div>
        <textarea className="textarea min-h-[220px] text-sm leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <Btn variant="primary" icon="copy" onClick={async () => { try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast("Copy failed", "err"); } }}>Copy</Btn>
          <Btn icon="check" onClick={() => { if (contact) { logInteraction(contact.id); } setDraftFor(null); toast("Logged & closed"); }}>Log interaction</Btn>
        </div>
      </Modal>
    </div>
  );

  function relatedCompanyChip(company: string) {
    const j = state.jobs.find((x) => x.company === company);
    const a = state.applications.find((x) => x.jobId === j?.id);
    if (!j) return null;
    const s = scoreJob(j, state.profile).overall;
    return <Chip tone="pine">{s}% · {a ? a.status : "open role"}</Chip>;
  }
}

export function ProfileEmpty() { return <EmptyState icon="user" title="Profile" />; }

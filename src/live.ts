// ─────────────────────────────────────────────────────────────────────────────
// Waypoint — internet layer.
// Real network calls: live job boards (Remotive, Arbeitnow — free, keyless,
// CORS-enabled) and an optional user-supplied LLM provider for letter drafting.
// Everything else in the app stays local-first.
// ─────────────────────────────────────────────────────────────────────────────
import type { AIProvider, Job, Profile, Source, Tone, WorkMode } from "./data";
import type { LetterOutput } from "./engine";
import { coverLetter } from "./engine";

const PM_TITLE_RE = /\b(product (manager|owner|lead|director|vp)|head of product|technical product|tpm|gpm|group product|principal product|staff product|senior product|platform product|ai product)\b/i;

const CANON: [string, RegExp][] = [
  ["Product Strategy", /\b(product strategy|strategic roadmap|market strateg)/i],
  ["Product Discovery", /\b(product discovery|discovery process|customer discovery|user research)/i],
  ["Roadmapping", /\b(roadmap)/i],
  ["Agile & Scrum", /\b(agile|scrum|kanban|sprint)/i],
  ["Product Ownership", /\b(product owner|backlog (grooming|refinement)|user stor)/i],
  ["Stakeholder Management", /\b(stakeholder|cross-functional)/i],
  ["APIs & Integrations", /\b(\bapi\b|apis|integration|rest|graphql)/i],
  ["Cloud & AWS", /\b(\baws\b|azure|gcp|google cloud|cloud (platform|native|infrastructure))/i],
  ["AI & GenAI", /\b(\bai\b|machine learning|\bml\b|genai|generative ai|llm|large language)/i],
  ["Data & Analytics", /\b(data (driven|analytics)|analytics|metrics|a\/b test|experimentation)/i],
  ["Enterprise Platforms", /\b(enterprise|platform|b2b|saas)/i],
  ["Platform Modernization", /\b(moderniz|legacy migration|re-platform)/i],
  ["Digital Transformation", /\b(digital transformation|transformation)/i],
  ["Technical Architecture", /\b(architecture|system design|microservices)/i],
  ["Go-to-Market", /\b(go-to-market|gtm|launch)/i],
  ["B2B / Enterprise Sales", /\b(sales|pipeline|deal)/i],
  ["Mobile", /\b(mobile|ios|android)/i],
  ["Fintech", /\b(fintech|payments|billing)/i],
  ["E-commerce", /\b(e-?commerce|marketplace|checkout)/i],
  ["Healthcare", /\b(health|clinical|patient)/i],
  ["UX & Design Collaboration", /\b(ux|ui|design (system|team))/i],
  ["Engineering Collaboration", /\b(engineering team|work (with|closely) engineers|technical)/i],
];

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<(li|p|div|br|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function extractSkills(text: string, tags: string[]): string[] {
  const found = new Set<string>();
  for (const [canon, re] of CANON) if (re.test(text) || tags.some((t) => re.test(t))) found.add(canon);
  return [...found].slice(0, 8);
}

function parseSalary(raw?: string): { min?: number; max?: number } {
  if (!raw) return {};
  const nums = raw.replace(/,/g, "").match(/\$?\s?€?\s?(\d{2,3})\s?k?/gi);
  if (!nums) return {};
  const vals = nums
    .map((n) => {
      const clean = n.replace(/[^\d.]/g, "");
      const v = parseFloat(clean);
      return /k/i.test(n) || v < 1000 ? v * 1000 : v;
    })
    .filter((v) => v >= 30_000 && v <= 1_500_000)
    .sort((a, b) => a - b);
  if (vals.length === 0) return {};
  return { min: vals[0], max: vals[vals.length - 1] };
}

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

export interface SourceStatus { source: Source; ok: boolean; count: number; error?: string; }
export interface LiveResult { jobs: Job[]; statuses: SourceStatus[]; }

// ─── Remotive (remote job board, public JSON API) ────────────────────────────
async function fetchRemotive(): Promise<Job[]> {
  const res = await fetch("https://remotive.com/api/remote-jobs?category=product&limit=60");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const items: any[] = data?.jobs ?? [];
  return items
    .filter((it) => PM_TITLE_RE.test(it.title ?? ""))
    .map((it): Job => {
      const desc = stripHtml(String(it.description ?? ""));
      const salary = parseSalary(it.salary);
      return {
        id: `live-rm-${it.id}`,
        title: String(it.title),
        company: String(it.company_name ?? "Unknown"),
        industry: guessIndustry(it.category, desc),
        location: String(it.candidate_required_location ?? "Worldwide"),
        mode: "Remote",
        ...salary,
        postedDaysAgo: daysSince(it.publication_date),
        source: "Remotive",
        growth: "Progression",
        experienceYears: guessYears(desc),
        requiredSkills: extractSkills(desc + " " + (it.tags ?? []).join(" "), it.tags ?? []),
        preferredSkills: [],
        description: desc.slice(0, 2400),
        responsibilities: [],
        link: String(it.url),
        isNew: true,
        live: true,
      };
    });
}

// ─── Arbeitnow (public job-board API) ────────────────────────────────────────
async function fetchArbeitnow(): Promise<Job[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const items: any[] = data?.data ?? [];
  return items
    .filter((it) => PM_TITLE_RE.test(it.title ?? ""))
    .map((it): Job => {
      const desc = stripHtml(String(it.description ?? ""));
      const remote = Boolean(it.remote);
      const mode: WorkMode = remote ? "Remote" : "Onsite";
      return {
        id: `live-an-${it.slug ?? uid("an")}`,
        title: String(it.title),
        company: String(it.company_name ?? "Unknown"),
        industry: guessIndustry((it.tags ?? []).join(" "), desc),
        location: String(it.location ?? (remote ? "Remote — EU" : "Europe")),
        mode,
        postedDaysAgo: daysSince(it.created_at),
        source: "Arbeitnow",
        growth: "Progression",
        experienceYears: guessYears(desc),
        requiredSkills: extractSkills(desc + " " + (it.tags ?? []).join(" "), it.tags ?? []),
        preferredSkills: [],
        description: desc.slice(0, 2400),
        responsibilities: [],
        link: String(it.url),
        isNew: true,
        live: true,
      };
    });
}

function guessIndustry(hint: string, desc: string): string {
  const t = `${hint} ${desc}`.toLowerCase();
  if (/(fintech|payment|bank|insur)/.test(t)) return "Fintech";
  if (/(health|clinical|patient)/.test(t)) return "Healthcare";
  if (/(shop|commerce|retail|marketplace)/.test(t)) return "E-commerce";
  if (/(logistic|shipping|deliver)/.test(t)) return "Logistics";
  if (/(edu|learn|school)/.test(t)) return "EdTech";
  if (/(market(ing)?|adtech|ads)/.test(t)) return "MarTech";
  if (/(security)/.test(t)) return "Cybersecurity";
  return "Technology / SaaS";
}

function guessYears(desc: string): number {
  const m = desc.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
  return m ? Math.min(15, parseInt(m[1], 10)) : 5;
}

// ─── orchestrator ────────────────────────────────────────────────────────────
export async function fetchLiveJobs(opts: { remotive: boolean; arbeitnow: boolean }): Promise<LiveResult> {
  const jobs: Job[] = [];
  const statuses: SourceStatus[] = [];
  const runs: Promise<void>[] = [];

  if (opts.remotive) {
    runs.push(
      fetchRemotive()
        .then((js) => { jobs.push(...js); statuses.push({ source: "Remotive", ok: true, count: js.length }); })
        .catch((e) => { statuses.push({ source: "Remotive", ok: false, count: 0, error: e?.message ?? "unreachable" }); })
    );
  }
  if (opts.arbeitnow) {
    runs.push(
      fetchArbeitnow()
        .then((js) => { jobs.push(...js); statuses.push({ source: "Arbeitnow", ok: true, count: js.length }); })
        .catch((e) => { statuses.push({ source: "Arbeitnow", ok: false, count: 0, error: e?.message ?? "unreachable" }); })
    );
  }
  await Promise.all(runs);
  // dedupe within the batch by company+title
  const seen = new Set<string>();
  const unique = jobs.filter((j) => {
    const k = `${j.company.toLowerCase()}::${j.title.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { jobs: unique, statuses };
}

// ─── live AI provider (letters grounded in verified facts) ───────────────────
const TONE_BRIEF: Record<Tone, string> = {
  "Professional": "traditional, polished, 250–400 words",
  "Strategic Leader": "leads with product strategy, business impact and organizational influence — 250–350 words",
  "Technical PM": "leads with platforms, APIs, cloud and technical judgment — 250–350 words",
  "Recruiter Short": "a compact recruiter note for LinkedIn/email, ~90 words",
};

function groundingPrompt(job: Job, p: Profile, tone: Tone): { system: string; user: string } {
  const facts = [
    `Current role: ${p.currentTitle} at ${p.currentCompany}`,
    `${p.pmYears} years of PM experience, ${p.poYears} as Product Owner, ${p.totalYears} total`,
    `Domains: ${p.domains.join(", ")}`,
    `Verified skill areas: ${p.skillAreas.map((s) => `${s.area} (${s.level})`).join("; ")}`,
    `Verified achievements:\n${p.achievements.map((a) => `- ${a.title}: ${a.detail} [metrics: ${a.metrics.join(", ")}]`).join("\n")}`,
  ].join("\n\n");
  const system = `You are a career coach writing a job application cover letter.
HARD RULES — violating any rule makes the output unacceptable:
1. Use ONLY the verified career facts provided. Never invent experience, metrics, companies, titles or skills.
2. If the job asks for something not in the facts, do not claim it — instead connect a closely related verified strength or omit.
3. No exaggeration, no generic filler ("I am a hard-working team player"). Be specific and natural.
4. Style: ${TONE_BRIEF[tone]}.
5. Output ONLY the letter text — no preamble, no markdown headings, no quotes around it.`;
  const user = `VERIFIED CAREER FACTS:
${facts}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location} (${job.mode})
Required skills: ${job.requiredSkills.join(", ") || "not listed"}
Description (excerpt): ${job.description.slice(0, 1600)}

Write the cover letter now.`;
  return { system, user };
}

export async function generateLiveLetter(job: Job, p: Profile, tone: Tone, prov: AIProvider): Promise<LetterOutput> {
  const { system, user } = groundingPrompt(job, p, tone);
  let text = "";
  if (prov.kind === "anthropic") {
    const res = await fetch(`${(prov.baseUrl || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": prov.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: prov.model || "claude-sonnet-4-20250514", max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}: ${(await res.text()).slice(0, 140)}`);
    const data = await res.json();
    text = (data?.content ?? []).map((c: any) => c?.text ?? "").join("").trim();
  } else {
    const res = await fetch(`${(prov.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${prov.apiKey}` },
      body: JSON.stringify({
        model: prov.model || "gpt-4o-mini",
        temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Provider error ${res.status}: ${(await res.text()).slice(0, 140)}`);
    const data = await res.json();
    text = data?.choices?.[0]?.message?.content?.trim() ?? "";
  }
  if (!text) throw new Error("Provider returned an empty response");
  return {
    text,
    wordCount: text.split(/\s+/).length,
    claims: [
      { claim: "Drafted by live AI using only the verified facts below", source: `${prov.kind} · ${prov.model}`, verified: true },
      ...p.achievements.slice(0, 4).map((a) => ({ claim: a.title, source: "Verified Career Facts", verified: true })),
      { claim: "AI-generated content — re-read every sentence before sending", source: "Human-in-the-loop check", verified: false },
    ],
  };
}

export async function testProvider(prov: AIProvider): Promise<string> {
  const ping = "Reply with exactly one word: ok";
  if (prov.kind === "anthropic") {
    const res = await fetch(`${(prov.baseUrl || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": prov.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: prov.model, max_tokens: 16, messages: [{ role: "user", content: ping }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — check key & model`);
    return "Connected — Anthropic API responded";
  }
  const res = await fetch(`${(prov.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${prov.apiKey}` },
    body: JSON.stringify({ model: prov.model, max_tokens: 8, messages: [{ role: "user", content: ping }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — check key, base URL & model`);
  return "Connected — API responded";
}

export const liveProviderActive = (prov?: AIProvider): boolean =>
  !!prov && prov.kind !== "local" && prov.apiKey.trim().length > 8;

/**
 * Cover-letter pipeline: live LLM when configured (grounded in verified facts),
 * graceful fallback to the deterministic on-device engine otherwise.
 */
export async function smartLetter(
  job: Job, p: Profile, tone: Tone, prov: AIProvider | undefined, companyLine?: string
): Promise<{ out: LetterOutput; viaLive: boolean; error?: string }> {
  if (liveProviderActive(prov)) {
    try {
      const out = await generateLiveLetter(job, p, tone, prov!);
      return { out, viaLive: true };
    } catch (e: any) {
      return { out: coverLetter(job, p, tone, companyLine), viaLive: false, error: e?.message ?? "provider request failed" };
    }
  }
  return { out: coverLetter(job, p, tone, companyLine), viaLive: false };
}

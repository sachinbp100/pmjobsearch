// ─────────────────────────────────────────────────────────────────────────────
// Waypoint engine — the "AI" layer. Everything generated here is composed
// deterministically from the Verified Career Facts in the profile, which is
// exactly the guardrail the product promises: Accuracy > Personalization.
// ─────────────────────────────────────────────────────────────────────────────
import type { Achievement, AppStatus, Job, Profile, TailoredResume, Tone, WorkMode } from "./data";

export type Recommendation =
  | "Apply Immediately" | "Strong Match" | "Worth Considering"
  | "Stretch Opportunity" | "Low Match" | "Do Not Prioritize";

export interface ScorePoint { point: string; evidence: string; }
export interface GapPoint { point: string; advice: string; }

export interface JobScore {
  overall: number;
  skills: number;
  experience: number;
  growth: number;
  prefs: number;
  matched: string[];
  missing: string[];
  strengths: ScorePoint[];
  gaps: GapPoint[];
  rec: Recommendation;
  reason: string;
}

export interface JobAnalysis {
  whyMatch: string[];
  keySkills: ScorePoint[];
  resumeRecs: string[];
  interviewTopics: string[];
}

export interface LetterOutput {
  text: string;
  claims: { claim: string; source: string; verified: boolean }[];
  wordCount: number;
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

// ─── scoring ─────────────────────────────────────────────────────────────────
const areaEvidence = (p: Profile, area: string): string | null => {
  const s = p.skillAreas.find((a) => a.area === area);
  return s ? s.evidence : null;
};

const bestAchievementFor = (p: Profile, tags: string[]): Achievement | null => {
  let best: Achievement | null = null;
  let bestOverlap = 0;
  for (const a of p.achievements) {
    const overlap = a.tags.filter((t) => tags.includes(t)).length;
    if (overlap > bestOverlap) { best = a; bestOverlap = overlap; }
  }
  return best;
};

const titleMatch = (p: Profile, job: Job): boolean =>
  p.preferredTitles.some((t) => job.title.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(job.title.split(",")[0].toLowerCase()));

export function scoreJob(job: Job, p: Profile): JobScore {
  const matched = job.requiredSkills.filter((s) => p.skillAreas.some((a) => a.area === s));
  const missing = job.requiredSkills.filter((s) => !matched.includes(s));
  const prefMatched = job.preferredSkills.filter((s) => p.skillAreas.some((a) => a.area === s));

  const skillBase = job.requiredSkills.length
    ? (matched.length / job.requiredSkills.length) * 100
    : 70;
  const skills = clamp(Math.round(skillBase * 0.85 + prefMatched.length * 5));

  const expRatio = p.pmYears / Math.max(1, job.experienceYears);
  const experience = clamp(Math.round(55 + expRatio * 30 + (p.poYears > 0 && job.requiredSkills.includes("Product Ownership") ? 10 : 0)));

  const growthMap: Record<string, number> = { Progression: 95, Strategic: 88, Leadership: 85, Lateral: 55 };
  let growth = growthMap[job.growth] ?? 60;
  if ((job.growth === "Leadership" || job.growth === "Progression") && p.totalYears < job.experienceYears) growth -= 18;
  growth = clamp(growth);

  let prefs = 40;
  if (titleMatch(p, job)) prefs += 20;
  const jobLoc = job.location.toLowerCase();
  const countryOk = !!p.country && jobLoc.includes(p.country.toLowerCase());
  const locOk = job.mode === "Remote"
    ? p.workModes.includes("Remote")
    : (countryOk || p.preferredLocations.some((l) => jobLoc.includes(l.toLowerCase().split(" ")[0]))) && p.workModes.includes(job.mode);
  if (locOk) prefs += 15;
  if (countryOk && job.mode !== "Remote") prefs += 6; // in-country bonus
  if (p.preferredIndustries.includes(job.industry)) prefs += 10;
  if (p.preferredCompanies.includes(job.company)) prefs += 15;
  if (job.salaryMax && job.salaryMin) {
    if (job.salaryMax >= p.salaryMin && job.salaryMin <= p.salaryMax) prefs += 10;
  }
  prefs = clamp(prefs);

  const overall = clamp(Math.round(skills * 0.5 + experience * 0.2 + growth * 0.15 + prefs * 0.15));

  const strengths: ScorePoint[] = [];
  strengths.push({
    point: `${p.pmYears} yrs PM + ${p.poYears} yrs PO experience (role asks ${job.experienceYears}+)`,
    evidence: `Career total ${p.totalYears} yrs across ${p.industries.length} industries.`,
  });
  for (const s of matched.slice(0, 5)) {
    const ev = areaEvidence(p, s);
    if (ev) strengths.push({ point: s, evidence: ev });
  }
  if (p.preferredCompanies.includes(job.company))
    strengths.push({ point: "Target company", evidence: `${job.company} is on your preferred-company list.` });
  if (titleMatch(p, job))
    strengths.push({ point: "Preferred title track", evidence: `"${job.title}" aligns with your target titles.` });

  const gaps: GapPoint[] = [];
  for (const s of missing.slice(0, 3)) {
    const adjacent = bestAchievementFor(p, [s]);
    gaps.push({
      point: `${s} — not verified in your profile`,
      advice: adjacent
        ? `Closest verified work: "${adjacent.title}". Frame adjacent experience honestly; do not claim ${s} directly.`
        : `No close verified work found. Consider whether adjacent strengths compensate, or skip without regret.`,
    });
  }
  if (job.mode === "Onsite" && !p.workModes.includes("Onsite"))
    gaps.push({ point: `Onsite in ${job.location}`, advice: "Your preferences favor Remote/Hybrid — confirm willingness before investing in this one." });
  if (job.salaryMax && job.salaryMax < p.salaryMin)
    gaps.push({ point: `Salary band tops out at $${Math.round(job.salaryMax / 1000)}K vs. your $${Math.round(p.salaryMin / 1000)}K floor`, advice: "Below your stated range — only pursue if total comp (equity, title) closes the gap." });
  if (job.experienceYears > p.totalYears)
    gaps.push({ point: `Asks ${job.experienceYears}+ yrs; you have ${p.totalYears} total`, advice: "Stretch on tenure — lean on scope and outcomes, not years." });

  const rec: Recommendation =
    overall >= 88 ? "Apply Immediately"
    : overall >= 80 ? "Strong Match"
    : overall >= 70 ? "Worth Considering"
    : overall >= 60 ? "Stretch Opportunity"
    : overall >= 45 ? "Low Match"
    : "Do Not Prioritize";

  const reason =
    rec === "Apply Immediately" || rec === "Strong Match"
      ? `Strong alignment with ${matched.slice(0, 3).join(", ").replace(/, ([^,]*)$/, " and $1")}${p.preferredCompanies.includes(job.company) ? ", plus it's a target company" : ""}.`
      : rec === "Worth Considering" || rec === "Stretch Opportunity"
      ? `Decent overlap on ${matched.slice(0, 2).join(" and ") || "core PM skills"}, but gaps keep it below your bar.`
      : `Misaligned with your verified strengths (${missing.slice(0, 2).join(", ") || "title/preferences"}).`;

  return { overall, skills, experience, growth, prefs, matched, missing, strengths, gaps, rec, reason };
}

// ─── deep analysis ───────────────────────────────────────────────────────────
export function analyzeJob(job: Job, p: Profile, score: JobScore): JobAnalysis {
  const ach = bestAchievementFor(p, job.requiredSkills) ?? p.achievements[0];
  const ach2 = bestAchievementFor(p, job.preferredSkills) ?? p.achievements[1];

  const whyMatch: string[] = [
    `${job.company} is hiring for ${score.matched.slice(0, 3).join(", ")} — areas where your profile shows verified, expert-level evidence. Your ${p.pmYears} years of PM work (plus ${p.poYears} as a PO) clear the ${job.experienceYears}+ year bar with room to spare.`,
    `Your strongest bridge is "${ach.title}": ${ach.detail} The measurable outcomes (${ach.metrics.join("; ")}) map directly to what this role will be judged on.`,
  ];
  if (ach2 && ach2.id !== ach.id) {
    whyMatch.push(`Secondarily, "${ach2.title}" (${ach2.metrics[0]}) gives you credible depth on ${job.preferredSkills.slice(0, 2).join(" and ") || "the preferred qualifications"} — worth surfacing early in conversations.`);
  }
  if (job.growth === "Progression" || job.growth === "Leadership") {
    whyMatch.push(`This is a ${job.growth.toLowerCase()} move: it stretches your ${job.growth === "Leadership" ? "people-leadership and mentoring experience" : "scope and strategic ownership"} in the direction of your stated goal — ${p.careerGoals.toLowerCase()}`);
  }

  const keySkills: ScorePoint[] = score.matched
    .slice(0, 5)
    .map((s) => ({ point: s, evidence: areaEvidence(p, s) ?? "" }));

  const resumeRecs: string[] = [
    `Lead your summary with ${score.matched[0] ?? "platform product"} and name-drop the ${ach.metrics[0]} outcome in the first two lines.`,
    `Reorder experience so "${ach.title}" appears first — it overlaps ${ach.tags.filter((t) => job.requiredSkills.includes(t)).length || 1} required areas.`,
    score.missing.length
      ? `Do not add ${score.missing[0]} — it's unverified. Instead, sharpen adjacent bullets (e.g., cross-functional work) so reviewers infer range without you overstating.`
      : `Every required area is verified — you can afford a keyword-dense "Core Competencies" line without risk.`,
    `Quantify everything you already have: ATS and humans both reward "${ach.metrics[0]}"-style phrasing. Strip any bullet older than two roles that doesn't serve this narrative.`,
  ];

  const topicFromArea: Record<string, string> = {
    "Product Strategy": "How you'd structure the first 90 days of the roadmap and the one metric you'd defend to the exec team",
    "Product Discovery": "A discovery story where customer evidence changed your mind — and what shipped differently",
    "Product Delivery": "Trade-offs you made under deadline pressure and how you communicated them",
    "Agile & Scrum": "How you run prioritization when every stakeholder says 'urgent'",
    "Product Ownership": "Backlog health: how you decide what NOT to build",
    "Stakeholder Management": "A time you disagreed with an exec and how it resolved",
    "Enterprise Platforms": "Platform vs. feature thinking: migration, deprecation, and partner promises",
    "APIs & Integrations": "API design trade-offs you've owned — versioning, breaking changes, DX",
    "Cloud & AWS": "A migration or reliability decision you'd defend in an architecture review",
    "AI & GenAI": "How you decide an AI feature is production-ready: evals, guardrails, failure modes",
    "Data & Analytics": "A metric you defined that changed a decision",
    "Digital Transformation": "Legacy modernization without stopping the business",
    "Technical Architecture": "Working with staff engineers: where PM judgment ends and architecture begins",
    "Leadership": "Mentoring a struggling PM — what you did and what changed",
    "Fintech & Payments": "Reliability and compliance as product features",
    "Healthcare Domain": "Shipping under regulatory/clinical scrutiny",
    "Developer Experience": "How you prioritize developer-facing work with fuzzy metrics",
  };
  const interviewTopics = [...score.matched, ...score.missing]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 6)
    .map((a) => topicFromArea[a] ?? `Deep-dive on ${a}`);

  return { whyMatch, keySkills, resumeRecs, interviewTopics };
}

// ─── resume tailoring ────────────────────────────────────────────────────────
export function tailorResume(job: Job, p: Profile, score: JobScore): TailoredResume {
  const ranked = [...p.achievements].sort((a, b) => {
    const oa = a.tags.filter((t) => job.requiredSkills.includes(t)).length;
    const ob = b.tags.filter((t) => job.requiredSkills.includes(t)).length;
    return ob - oa;
  });
  const top = ranked.slice(0, 4);

  const focusAreas = score.matched.slice(0, 3);
  const summary =
    `${p.headline.split("—")[0].trim()} with ${p.pmYears} years in product management (${p.poYears} as Product Owner) across ${p.industries.slice(0, 3).join(", ")}. ` +
    `Most recently led ${top[0].title.toLowerCase()} work at ${p.currentCompany} — ${top[0].metrics[0].toLowerCase()}. ` +
    `Seeking the ${job.title.split(",")[0]} role to apply deep ${focusAreas.join(", ").toLowerCase()} experience to ${job.company}'s ${job.industry.toLowerCase()} platform ambitions.`;

  const bullets = top.map((a) => ({
    text: `${a.title} — ${a.detail} Outcomes: ${a.metrics.join("; ")}.`,
    highlighted: a.tags.some((t) => job.requiredSkills.includes(t)),
  }));

  const keywordsAdded = job.preferredSkills.filter((s) => p.skillAreas.some((a) => a.area === s));
  const flaggedKeywords = [...job.requiredSkills, ...job.preferredSkills].filter((s) => !p.skillAreas.some((a) => a.area === s));

  const changes: TailoredResume["changes"] = [
    { type: "summary", detail: "Rewrote professional summary to target this role", reason: `Leads with ${focusAreas[0] ?? "platform PM"} and your strongest quantified outcome.` },
    { type: "reordered", detail: `Moved "${top[0].title}" to the top of the experience section`, reason: `Overlaps ${top[0].tags.filter((t) => job.requiredSkills.includes(t)).length} required skill areas.` },
    { type: "emphasized", detail: `Highlighted ${bullets.filter((b) => b.highlighted).length} of ${bullets.length} achievement bullets`, reason: "Direct tag overlap with required skills — these carry the ATS and human scan." },
  ];
  for (const k of keywordsAdded) {
    changes.push({ type: "keyword", detail: `Added keyword "${k}"`, reason: "Present in the JD and verified in your profile — safe to surface." });
  }
  for (const k of flaggedKeywords) {
    changes.push({ type: "flag", detail: `"${k}" appears in the JD but is NOT verified in your profile — not added`, reason: "Guardrail: never claim unverified experience. Adjacent bullets left to imply range." });
  }

  return { jobId: job.id, summary, bullets, coreSkills: score.matched, keywordsAdded, flaggedKeywords, changes };
}

// ─── cover letters ───────────────────────────────────────────────────────────
export function coverLetter(job: Job, p: Profile, tone: Tone, companyLine?: string): LetterOutput {
  const score = scoreJob(job, p);
  const ach = bestAchievementFor(p, job.requiredSkills) ?? p.achievements[0];
  const ach2 = bestAchievementFor(p, job.preferredSkills.concat(job.requiredSkills)) ?? p.achievements[1];
  const greeting = job.recruiter ? `Dear ${job.recruiter.name.split(" ")[0]},` : "Dear Hiring Team,";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const companyWhy = companyLine ?? `${job.company}'s work in ${job.industry.toLowerCase()} aligns with the platform problems I do my best work on.`;

  const claims: LetterOutput["claims"] = [
    { claim: `${ach.metrics.join("; ")} — ${ach.title}`, source: `Career Profile — ${ach.title}`, verified: true },
    { claim: `${ach2.metrics[0]} — ${ach2.title}`, source: `Career Profile — ${ach2.title}`, verified: true },
    { claim: `${p.pmYears} years PM / ${p.poYears} years PO experience`, source: "Career Profile — experience totals", verified: true },
  ];

  let body: string;
  if (tone === "Recruiter Short") {
    body =
      `Hi ${job.recruiter ? job.recruiter.name.split(" ")[0] : "there"} — I saw the ${job.title} opening and it maps tightly to my background: ${p.pmYears} years in product management, most recently owning ${ach.title.toLowerCase()} at ${p.currentCompany} (${ach.metrics[0]}). ${score.matched.slice(0, 3).join(", ")} are my home turf. I'd welcome 20 minutes to compare notes — my tailored resume is attached. Best, ${p.name.split(" ")[0]}`;
  } else {
    const toneP =
      tone === "Strategic Leader"
        ? `What draws me to this role is scope, not title. ${ach2.id !== ach.id ? `"${ach2.title}" (${ach2.metrics[0]}) ` : ""}taught me that strategy earns trust only when it survives contact with delivery — I've run that loop with exec sponsors, partner ecosystems, and skeptical engineers alike. At this stage in my career, I'm looking to own a platform narrative end-to-end and develop the PMs around me, which is exactly how I read this opening.`
        : tone === "Technical PM"
        ? `I work comfortably at the seam of product and architecture. I've owned API contracts and deprecation politics, sat in migration war-rooms moving workloads to AWS, and written specs that staff engineers didn't rewrite from scratch. "${ach2.id !== ach.id ? ach2.title : ach.title}" (${(ach2.id !== ach.id ? ach2 : ach).metrics[0]}) is a fair example: the product win was inseparable from the technical judgment underneath it.`
        : `Beyond the specific outcomes, I bring the habits that make platform products work: discovery that includes partners and operators, not just end users; roadmaps that name what we won't do; and written communication that keeps 25-person programs aligned without meeting bloat.`;

    body =
      `${today}\n\n${greeting}\n\n` +
      `I'm writing to apply for the ${job.title} role at ${job.company}. ${companyWhy}\n\n` +
      `Over ${p.pmYears} years in product management — including ${p.poYears} as a Product Owner — I've specialized in the exact surface this role owns. Most recently at ${p.currentCompany}, I led our ${ach.title.toLowerCase()}: ${ach.detail.toLowerCase()} The results were measurable: ${ach.metrics.join("; ").toLowerCase()}.\n\n` +
      `${toneP}\n\n` +
      `I'm especially interested in how ${job.company} approaches ${score.matched[0]?.toLowerCase() ?? job.industry.toLowerCase()} at scale, and I'd bring relevant scars and playbooks from ${p.industries.slice(0, 2).join(" and ").toLowerCase()}. I would welcome the chance to discuss the role in more detail.\n\n` +
      `Thank you for your time and consideration.\n\nSincerely,\n${p.name}`;
  }

  return { text: body, claims, wordCount: body.split(/\s+/).length };
}

// ─── outreach ────────────────────────────────────────────────────────────────
export type OutreachKind = "linkedin" | "email" | "followup" | "referral";
export function outreach(job: Job, p: Profile, kind: OutreachKind, contactName?: string): string {
  const ach = bestAchievementFor(p, job.requiredSkills) ?? p.achievements[0];
  const score = scoreJob(job, p);
  const first = p.name.split(" ")[0];
  switch (kind) {
    case "linkedin":
      return `Hi ${job.recruiter ? job.recruiter.name.split(" ")[0] : "there"} — I came across the ${job.title} opening at ${job.company} and it maps closely to my work: ${p.pmYears} yrs in PM, recently owning ${ach.title.toLowerCase()} (${ach.metrics[0]}). Would love to connect and share my tailored resume. — ${first}`;
    case "email":
      return `Subject: ${job.title} — ${p.name} (${score.matched.slice(0, 2).join(", ")})\n\nHi ${job.recruiter ? job.recruiter.name.split(" ")[0] : "Hiring Team"},\n\nI applied for the ${job.title} role and wanted to introduce myself directly. I've spent ${p.pmYears} years in product management across ${p.industries.slice(0, 2).join(" and ")}, most recently leading ${ach.title.toLowerCase()} at ${p.currentCompany} — ${ach.metrics.slice(0, 2).join("; ").toLowerCase()}.\n\nYour posting's emphasis on ${score.matched.slice(0, 3).join(", ").toLowerCase()} is exactly where I've built depth, and my tailored resume (attached) shows the specifics. I'd welcome a brief call this week.\n\nBest,\n${p.name}\n${p.linkedin}`;
    case "followup":
      return `Subject: Following up — ${job.title}\n\nHi ${job.recruiter ? job.recruiter.name.split(" ")[0] : "there"},\n\nWanted to float this back to the top of your inbox. Since applying for the ${job.title} role, I've been thinking about ${score.matched[0]?.toLowerCase() ?? "the platform roadmap"} — my ${ach.title.toLowerCase()} work (${ach.metrics[0]}) feels directly transferable.\n\nIf the role is still open, I'd love 20 minutes. If you've moved forward, no reply needed — thanks either way.\n\nBest,\n${first}`;
    case "referral":
      return `Hi ${contactName ?? "there"},\n\nHope you're doing well! I'm reaching out because ${job.company} just posted a ${job.title} role, and it's one of the strongest matches I've seen for my background (${score.overall}% on my own scorecard — ${score.matched.slice(0, 2).join(" and ").toLowerCase()}).\n\nWould you be open to referring me? I've attached my tailored resume and a short blurb you can paste: "${p.pmYears} yrs PM, led ${ach.title.toLowerCase()} — ${ach.metrics[0]}." Happy to make it zero-effort or drop it if timing is off.\n\nEither way, let's catch up soon.\n\n— ${first}`;
  }
}

// ─── application questions ───────────────────────────────────────────────────
export const APP_QUESTIONS = [
  "Why are you interested in this role?",
  "Why do you want to work for this company?",
  "Describe your Product Management experience.",
  "Describe a product you have built.",
  "Describe a difficult problem you solved.",
  "Describe your leadership experience.",
  "Why should we hire you?",
  "Describe your experience with AI.",
  "Describe your experience with APIs, cloud, or enterprise platforms.",
] as const;
export type AppQuestion = (typeof APP_QUESTIONS)[number];
export type AnswerLength = "short" | "medium" | "detailed";

export function answerQuestion(q: AppQuestion, job: Job, p: Profile, len: AnswerLength): string {
  const ach = bestAchievementFor(p, job.requiredSkills) ?? p.achievements[0];
  const star = (a: Achievement) =>
    `${a.detail} Context: the problem was owned end-to-end by me as the product lead. ${a.metrics.join("; ")}.`;
  const base: Record<AppQuestion, string> = {
    "Why are you interested in this role?":
      `The ${job.title} role sits exactly on my verified strengths — ${scoreJob(job, p).matched.slice(0, 3).join(", ").toLowerCase()} — at the scope I'm aiming for next. My most relevant work, "${ach.title}" (${ach.metrics[0]}), is the kind of problem this role exists to solve.`,
    "Why do you want to work for this company?":
      `${job.company} is building in ${job.industry.toLowerCase()}, one of the domains where my platform work has created the most measurable value. The role's emphasis on ${job.requiredSkills.slice(0, 2).join(" and ").toLowerCase()} matches where I do my best work — and where I want to keep compounding it.`,
    "Describe your Product Management experience.":
      `${p.pmYears} years as a PM (${p.poYears} as PO), ${p.totalYears} years total, across ${p.industries.join(", ").toLowerCase()}. I've owned platforms, payments, data, and AI products — e.g., "${ach.title}" (${ach.metrics.join("; ")}).`,
    "Describe a product you have built.": star(ach),
    "Describe a difficult problem you solved.": star(p.achievements.find((a) => a.id === "ach-payments") ?? ach),
    "Describe your leadership experience.":
      `${p.leadership} A concrete example: mentoring three APMs through promotion while keeping my own platform roadmap on schedule — the trick was delegating discovery, not just tickets.`,
    "Why should we hire you?":
      `Because the role's required areas — ${scoreJob(job, p).matched.slice(0, 4).join(", ").toLowerCase()} — are not aspirations on my resume, they're audited outcomes: ${ach.metrics[0]}, and ${p.achievements[1].metrics[0]}. I'll tell you plainly what I haven't done, and what I'll do about it.`,
    "Describe your experience with AI.": star(p.achievements.find((a) => a.id === "ach-genai") ?? ach),
    "Describe your experience with APIs, cloud, or enterprise platforms.": star(p.achievements.find((a) => a.id === "ach-api") ?? ach),
  };
  const core = base[q];
  if (len === "short") return core.split(". ").slice(0, 2).join(". ") + ".";
  if (len === "medium") return core;
  return `${core}\n\nTo put it in STAR terms — ${ach.title}: the situation was a fragmented, high-stakes platform surface; my task was to own the outcome end-to-end; the action was disciplined discovery plus hard sequencing choices with engineering leadership; the result was ${ach.metrics.join("; ")}. I'd bring that same pattern to ${job.company}.`;
}

// ─── interview prep ──────────────────────────────────────────────────────────
export interface PrepQuestion {
  category: string;
  question: string;
  answer: string;
  followUp: string;
  themes: string[];
}
const QUESTION_BANK: Record<string, { q: string; themes: string[]; followUp: string }[]> = {
  "Product Strategy": [
    { q: "Walk me through how you'd build the roadmap for this product in your first 90 days.", themes: ["discovery", "stakeholders", "metrics", "priorit"], followUp: "What would you cut first if engineering capacity came in 30% under plan?" },
    { q: "Tell me about a strategy bet you made that was wrong. How did you find out, and what did you do?", themes: ["hypothesis", "data", "pivot", "metric"], followUp: "What leading indicator did you wish you'd tracked?" },
  ],
  "Product Sense": [
    { q: "Pick one of our products and improve it. What do you ship first and why?", themes: ["user", "problem", "metric", "trade"], followUp: "How would you validate demand before building it?" },
  ],
  "Product Execution": [
    { q: "Describe a launch that went off the rails. What happened and how did you recover?", themes: ["launch", "blocker", "communicat", "recover"], followUp: "What process change survived the incident?" },
    { q: "How do you decide what NOT to build? Give a real example.", themes: ["priorit", "say no", "backlog", "stakeholder"], followUp: "How did the disappointed stakeholder react?" },
  ],
  "Product Analytics": [
    { q: "Tell me about a metric you defined that changed a decision.", themes: ["metric", "definition", "decision", "data"], followUp: "How did you defend the definition against pushback?" },
    { q: "An experiment shows a 2% lift with 87% confidence. Ship or iterate?", themes: ["experiment", "confidence", "risk", "iterate"], followUp: "What would change your answer?" },
  ],
  "Stakeholder Management": [
    { q: "Tell me about a time you disagreed with an executive. How did it resolve?", themes: ["executive", "disagree", "data", "align"], followUp: "Would you handle it differently now?" },
  ],
  "Leadership": [
    { q: "Describe your experience mentoring or leading other PMs.", themes: ["mentor", "coach", "growth", "delegat"], followUp: "What's the hardest feedback you've given a PM?" },
  ],
  "Technical Product Management": [
    { q: "How do you decide where PM judgment ends and engineering architecture begins?", themes: ["architecture", "trade", "engineer", "decision"], followUp: "Give an example where you pushed back on an architecture choice." },
  ],
  "APIs & Integrations": [
    { q: "Walk me through an API design or deprecation decision you owned.", themes: ["api", "version", "partner", "deprecat"], followUp: "How did you handle your loudest objecting partner?" },
  ],
  "Cloud": [
    { q: "Describe a migration or reliability decision you'd defend in an architecture review.", themes: ["migrat", "aws", "reliab", "cutover"], followUp: "What would you monitor in the first 48 hours post-cutover?" },
  ],
  "AI & GenAI": [
    { q: "How do you decide an AI feature is production-ready?", themes: ["eval", "guardrail", "quality", "failure"], followUp: "Tell me about a regression you caught — or missed." },
    { q: "Where do you draw the line between model capability and product value?", themes: ["eval", "user", "metric", "value"], followUp: "How do you price or package that value?" },
  ],
  "Behavioral": [
    { q: "Tell me about a time you had to deliver bad news to a customer or partner.", themes: ["customer", "communicat", "trust", "own"], followUp: "What did that relationship look like six months later?" },
    { q: "Describe a decision you made with incomplete data.", themes: ["decision", "risk", "assumption", "bet"], followUp: "What would have changed the decision?" },
  ],
};
const areaToCategory: Record<string, string> = {
  "Product Strategy": "Product Strategy", "Product Discovery": "Product Sense", "Product Delivery": "Product Execution",
  "Agile & Scrum": "Product Execution", "Product Ownership": "Product Execution", "Stakeholder Management": "Stakeholder Management",
  "Enterprise Platforms": "Technical Product Management", "APIs & Integrations": "APIs & Integrations", "Cloud & AWS": "Cloud",
  "AI & GenAI": "AI & GenAI", "Data & Analytics": "Product Analytics", "Digital Transformation": "Technical Product Management",
  "Technical Architecture": "Technical Product Management", "Leadership": "Leadership", "Fintech & Payments": "Behavioral",
  "Healthcare Domain": "Behavioral", "Developer Experience": "APIs & Integrations",
};

export function interviewPlan(job: Job, p: Profile): PrepQuestion[] {
  const cats = [...new Set(job.requiredSkills.map((a) => areaToCategory[a]).filter(Boolean))].slice(0, 6);
  const out: PrepQuestion[] = [];
  for (const c of cats) {
    for (const item of QUESTION_BANK[c] ?? []) {
      const ach = bestAchievementFor(p, job.requiredSkills) ?? p.achievements[0];
      out.push({
        category: c, question: item.q, themes: item.themes, followUp: item.followUp,
        answer: `Anchor this in "${ach.title}": ${ach.detail} Lead with the decision you owned, then the measurable result (${ach.metrics[0]}) — keep the story under two minutes and land the learning explicitly.`,
      });
    }
  }
  for (const item of QUESTION_BANK["Behavioral"]) {
    out.push({
      category: "Behavioral", question: item.q, themes: item.themes, followUp: item.followUp,
      answer: `Use your payments-reliability story: ${p.achievements.find((a) => a.id === "ach-payments")?.metrics.join("; ") ?? ""}. Structure it STAR-tight: one line of situation, one of task, the bulk on your specific actions, then the result in numbers.`,
    });
  }
  return out;
}

// ─── mock interview evaluation ───────────────────────────────────────────────
export interface MockEval { score: number; strengths: string[]; missing: string[]; improve: string; followUp: string; }
export function evaluateAnswer(q: PrepQuestion, answer: string): MockEval {
  const lower = answer.toLowerCase();
  const hits = q.themes.filter((t) => lower.includes(t) || lower.includes(t.slice(0, 5)));
  const coverage = q.themes.length ? hits.length / q.themes.length : 0.5;
  const hasNumbers = /\d+%|\$\d|\d+ (weeks|days|quarters|months|customers|partners)/.test(answer);
  const hasStructure = /(led|owned|decided|shipped|launched|built|ran)/i.test(answer);
  const lengthOk = answer.trim().split(/\s+/).length >= 40;

  let score = Math.round(coverage * 60 + (hasNumbers ? 20 : 0) + (hasStructure ? 10 : 0) + (lengthOk ? 10 : 0));
  score = clamp(score, 15, 98);

  const strengths: string[] = [];
  if (hasStructure) strengths.push("Clear ownership language — you name decisions you personally made.");
  if (hasNumbers) strengths.push("Quantified outcome — interviewers remember numbers.");
  if (coverage > 0.6) strengths.push(`Covers the core themes: ${hits.slice(0, 3).join(", ")}.`);
  if (strengths.length === 0) strengths.push("You answered the actual question asked — good instinct, now add substance.");

  const missing: string[] = [];
  for (const t of q.themes.filter((t) => !hits.includes(t)).slice(0, 3)) missing.push(`No mention of "${t}" — weave in a concrete example.`);
  if (!hasNumbers) missing.push("No measurable outcome — attach a number from your verified achievements.");
  if (!lengthOk) missing.push("Too brief — aim for a 60–90 second structured story.");

  const improve =
    score >= 75
      ? "Strong answer. Trim the setup to one sentence and land the result harder — end on the metric, not the moral."
      : score >= 50
      ? "Rebuild it STAR-tight: Situation (1 line) → your specific Action (the bulk) → Result (numbers). Cut team-level 'we' language where you can claim personal ownership."
      : "This reads generic. Pick ONE verified story — like your API platform consolidation or the copilot launch — and retell the question through it.";

  return { score, strengths, missing, improve, followUp: q.followUp };
}

// ─── paste-capture parser ("Analyze This Job") ──────────────────────────────
const ALIASES: Record<string, string[]> = {
  "Product Strategy": ["strategy", "roadmap", "vision"],
  "Product Discovery": ["discovery", "user research", "customer research", "jtbd"],
  "Product Delivery": ["delivery", "execution", "shipping", "prd"],
  "Agile & Scrum": ["agile", "scrum", "kanban", "sprint"],
  "Product Ownership": ["product owner", "backlog", "acceptance criteria"],
  "Stakeholder Management": ["stakeholder", "cross-functional", "alignment"],
  "Enterprise Platforms": ["enterprise", "platform", "b2b", "saas"],
  "APIs & Integrations": ["api", "rest", "graphql", "integration", "webhook", "oauth", "sdk"],
  "Cloud & AWS": ["aws", "cloud", "gcp", "azure", "kubernetes", "terraform", "infrastructure"],
  "AI & GenAI": ["genai", "llm", "machine learning", "generative", "copilot", "agentic", "rag", " ai ", "ai/"],
  "Data & Analytics": ["analytics", "sql", "a/b", "experiment", "metrics", "dashboard", "data"],
  "Digital Transformation": ["transformation", "modernization", "migration", "legacy"],
  "Technical Architecture": ["architecture", "microservices", "distributed", "system design"],
  "Leadership": ["leadership", "mentor", "team lead", "people management", "hiring"],
  "Fintech & Payments": ["payment", "fintech", "pci", "banking", "billing", "ledger", "pricing"],
  "Healthcare Domain": ["healthcare", "clinical", "hipaa", "patient", "health system"],
  "Developer Experience": ["developer experience", "devx", "documentation", "developer portal"],
};

export function parsePastedJob(text: string): Job {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] ?? "Product Manager").slice(0, 80);
  const company = (lines[1] && lines[1].length < 60 && !/[.!]$/.test(lines[1]) ? lines[1] : "Unknown Company").replace(/[—–-].*$/, "").trim() || "Unknown Company";
  const lower = " " + text.toLowerCase() + " ";
  const required: string[] = [];
  for (const [area, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((a) => lower.includes(a)) && required.length < 8) required.push(area);
  }
  if (required.length === 0) required.push("Product Delivery", "Stakeholder Management");
  const locMatch = text.match(/(Remote|Hybrid|On-?site)/i);
  const mode: WorkMode = locMatch ? (locMatch[1].toLowerCase().startsWith("hyb") ? "Hybrid" : locMatch[1].toLowerCase().startsWith("on") ? "Onsite" : "Remote") : "Remote";
  const locCity = text.match(/([A-Z][a-zA-Z]+,\s*[A-Z]{2})\b/);
  const salary = text.match(/\$\s?(\d{2,3})\s?[kK]?\s?[-–—to]+\s?\$?\s?(\d{2,3})\s?[kK]?/);
  const exp = text.match(/(\d{1,2})\+?\s*years/);
  return {
    id: "j-custom-" + Date.now(),
    title, company,
    industry: "Captured",
    location: locCity ? locCity[1] + (mode === "Remote" ? " / Remote" : "") : mode === "Remote" ? "Remote" : "See posting",
    mode,
    salaryMin: salary ? Number(salary[1]) * 1000 : undefined,
    salaryMax: salary ? Number(salary[2]) * 1000 : undefined,
    postedDaysAgo: 0,
    source: "Manual Capture",
    growth: /staff|principal|group|director|vp/i.test(title) ? "Progression" : "Lateral",
    experienceYears: exp ? Number(exp[1]) : 5,
    requiredSkills: required.slice(0, 6),
    preferredSkills: [],
    description: text.slice(0, 1200),
    responsibilities: [],
    link: "captured://clipboard",
    isNew: true,
  };
}

// ─── misc ────────────────────────────────────────────────────────────────────
export const STATUS_AFTER: Record<string, AppStatus> = {
  review: "Reviewing", preparing: "Preparing", ready: "Ready to Apply", applied: "Applied",
  contacted: "Recruiter Contacted", interview: "Interview Scheduled",
};

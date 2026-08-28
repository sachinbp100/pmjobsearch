// ─────────────────────────────────────────────────────────────────────────────
// Waypoint — types + seed data. All "AI" output in this app is grounded in
// the Verified Career Facts below (profile.skillAreas + achievements).
// ─────────────────────────────────────────────────────────────────────────────

export type WorkMode = "Remote" | "Hybrid" | "Onsite";
export type GrowthType = "Progression" | "Lateral" | "Leadership" | "Strategic";
export type Source =
  | "LinkedIn"
  | "Indeed"
  | "Company Careers"
  | "Recruiter Email"
  | "Wellfound"
  | "Glassdoor"
  | "Referral"
  | "Manual Capture";

export type AppStatus =
  | "Discovered"
  | "Reviewing"
  | "Saved"
  | "Preparing"
  | "Ready to Apply"
  | "Applied"
  | "Recruiter Contacted"
  | "Interview Scheduled"
  | "Interviewing"
  | "Offer"
  | "Rejected"
  | "Closed";

export const ALL_STATUSES: AppStatus[] = [
  "Discovered", "Reviewing", "Saved", "Preparing", "Ready to Apply", "Applied",
  "Recruiter Contacted", "Interview Scheduled", "Interviewing", "Offer", "Rejected", "Closed",
];

export type Tone = "Professional" | "Strategic Leader" | "Technical PM" | "Recruiter Short";
export const TONES: Tone[] = ["Professional", "Strategic Leader", "Technical PM", "Recruiter Short"];

export interface SkillArea {
  area: string;
  level: "Expert" | "Strong" | "Working";
  evidence: string;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  metrics: string[];
  tags: string[]; // canonical skill areas — these are the VERIFIED facts
}

export interface Profile {
  name: string;
  headline: string;
  currentTitle: string;
  currentCompany: string;
  previousTitles: string[];
  totalYears: number;
  pmYears: number;
  poYears: number;
  industries: string[];
  domains: string[];
  technicalSkills: string[];
  pmSkills: string[];
  leadership: string;
  skillAreas: SkillArea[];
  achievements: Achievement[];
  education: string[];
  certifications: string[];
  preferredTitles: string[];
  preferredIndustries: string[];
  preferredCompanies: string[];
  preferredLocations: string[];
  workModes: WorkMode[];
  salaryMin: number;
  salaryMax: number;
  careerGoals: string;
  linkedin: string;
}

export interface Recruiter { name: string; title: string; email: string; }

export interface Job {
  id: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  mode: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  postedDaysAgo: number;
  deadlineInDays?: number;
  source: Source;
  growth: GrowthType;
  experienceYears: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  responsibilities: string[];
  recruiter?: Recruiter;
  link: string;
  isNew?: boolean;
}

export interface Note { at: string; text: string; }
export interface HistoryEvent { at: string; event: string; }

export interface Application {
  id: string;
  jobId: string;
  status: AppStatus;
  discoveredOn: string;
  appliedOn?: string;
  resumeVersionId?: string;
  letterId?: string;
  followUpDate?: string;
  interviewDate?: string;
  salaryNote?: string;
  notes: Note[];
  history: HistoryEvent[];
}

export interface Claim { claim: string; source: string; verified: boolean; }

export interface Letter {
  id: string;
  jobId: string;
  tone: Tone;
  text: string;
  updatedAt: string;
  approved: boolean;
  claims: Claim[];
}

export interface ResumeVersion {
  id: string;
  name: string;
  updatedAt: string;
  note: string;
  approved: boolean;
  forJobId?: string;
}

export interface TailoredResume {
  jobId: string;
  summary: string;
  bullets: { text: string; highlighted: boolean }[];
  coreSkills: string[];
  keywordsAdded: string[];
  flaggedKeywords: string[];
  changes: { type: "summary" | "reordered" | "emphasized" | "keyword" | "flag"; detail: string; reason: string }[];
}

export type TaskType = "follow-up" | "application" | "prep" | "networking" | "review";
export interface Task {
  id: string;
  title: string;
  due: string; // yyyy-mm-dd
  type: TaskType;
  done: boolean;
  jobId?: string;
  recurring?: "daily" | "weekly";
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  relationship: string;
  linkedin: string;
  lastInteraction?: string;
  followUpDate?: string;
  notes: string;
}

export interface StarStory {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  skills: string[];
}

export interface CompanyResearch {
  name: string;
  industry: string;
  watched: boolean;
  overview: string;
  products: string;
  customers: string;
  businessModel: string;
  strategy: string;
  announcements: string;
  leadership: string;
  competitors: string;
  tech: string;
  roleContribution: string;
  challenges: string;
  questions: string[];
}

export type InboxKind = "Interview Invitation" | "Recruiter Message" | "Rejection" | "Application Confirmation";
export interface InboxMessage {
  id: string;
  kind: InboxKind;
  from: string;
  company: string;
  subject: string;
  summary: string;
  jobId?: string;
  extracted?: { date?: string; time?: string; interviewer?: string; link?: string };
  suggestedReply?: string;
  acted?: boolean;
}

export interface AgentLog { id: string; at: string; text: string; kind: "run" | "alert" | "system"; }

export interface Integrations {
  gmail: boolean;
  linkedin: boolean;
  calendar: boolean;
  browser: boolean;
}

export interface Settings {
  scheduleTime: string;
  scheduleFreq: "daily" | "weekdays" | "weekly";
  sources: Record<string, boolean>;
  notifications: { highMatch: boolean; deadlines: boolean; followUps: boolean; weeklyDigest: boolean };
  integrations: Integrations;
  autoAddHighMatch: boolean;
  minScoreToAlert: number;
}

export interface AppState {
  profile: Profile;
  jobs: Job[];
  reserveJobs: Job[];
  applications: Application[];
  savedIds: string[];
  contacts: Contact[];
  tasks: Task[];
  stories: StarStory[];
  companies: CompanyResearch[];
  inbox: InboxMessage[];
  letters: Letter[];
  resumeVersions: ResumeVersion[];
  tailored: Record<string, TailoredResume>;
  agentLog: AgentLog[];
  settings: Settings;
  // ui
  tab: string;
  jobDetailId: string | null;
  jobDetailTab: string;
  toasts: { id: number; msg: string; kind: "ok" | "warn" | "err" }[];
}

// ─── date helpers ────────────────────────────────────────────────────────────
export const iso = (offsetDays: number): string => {
  const t = new Date();
  t.setDate(t.getDate() + offsetDays);
  return t.toISOString().slice(0, 10);
};
export const fmtDate = (d?: string): string => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
export const daysUntil = (d?: string): number => {
  if (!d) return Infinity;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dt = new Date(d + "T00:00:00");
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
};
export const fmtMoney = (n: number): string => `$${Math.round(n / 1000)}K`;

// ─── profile ─────────────────────────────────────────────────────────────────
const profile: Profile = {
  name: "Alex Morgan",
  headline: "Senior Product Manager — Enterprise Platforms, APIs & AI",
  currentTitle: "Senior Product Manager, Enterprise Platforms",
  currentCompany: "Nimbus Commerce Cloud",
  previousTitles: ["Product Manager, Payments", "Product Owner, Checkout Squad", "Associate PM → PM, Marketplace"],
  totalYears: 11,
  pmYears: 8,
  poYears: 3,
  industries: ["Enterprise SaaS", "Financial Services", "Healthcare", "E-commerce"],
  domains: ["Platform & APIs", "Payments & Billing", "Data & Analytics", "Cloud Infrastructure", "AI/ML Products"],
  technicalSkills: ["AWS (ECS, RDS, S3, Lambda)", "REST & GraphQL APIs", "Microservices / event-driven (Kafka)", "SQL", "Python (working)", "Terraform (familiar)", "CI/CD pipelines", "LLM / GenAI integration", "Agentic workflows"],
  pmSkills: ["Product strategy & vision", "Discovery (JTBD, continuous discovery)", "Roadmapping & OKRs", "Agile / Scrum / Kanban", "Backlog prioritization (RICE, WSJF)", "Stakeholder & exec alignment", "Experimentation / A-B testing", "PRDs & specs", "Pricing & packaging", "Analytics (Amplitude, Mixpanel, SQL)"],
  leadership: "Led a squad of 8; led cross-functional initiatives spanning 25+ people; mentored 3 APMs to promotion; run hiring loops for PM and TPM roles.",
  skillAreas: [
    { area: "Product Strategy", level: "Expert", evidence: "Set roadmaps & OKRs across 3 platform products; pricing redesign lifted ARPA +19%." },
    { area: "Product Discovery", level: "Strong", evidence: "60+ customer interviews/yr; JTBD and continuous discovery practice." },
    { area: "Product Delivery", level: "Expert", evidence: "12+ major releases shipped; 94% on-time delivery over last 4 quarters." },
    { area: "Agile & Scrum", level: "Expert", evidence: "8 years running Scrum/Kanban; coached 3 squads on flow metrics." },
    { area: "Product Ownership", level: "Expert", evidence: "3 yrs as PO with full backlog ownership for payments orchestration." },
    { area: "Stakeholder Management", level: "Expert", evidence: "Exec-level alignment across 25+ person orgs; quarterly business reviews." },
    { area: "Enterprise Platforms", level: "Expert", evidence: "Owned enterprise API platform used by 400+ partners." },
    { area: "APIs & Integrations", level: "Expert", evidence: "Unified API program consolidated 14 services; partner integrations +38%." },
    { area: "Cloud & AWS", level: "Strong", evidence: "Led on-prem → AWS migration; AWS Certified Cloud Practitioner." },
    { area: "AI & GenAI", level: "Strong", evidence: "Shipped LLM copilot ($1.2M ARR) and agentic support-triage pilot (32% auto-resolve)." },
    { area: "Data & Analytics", level: "Strong", evidence: "Built self-serve analytics platform 0→1; runs experimentation program." },
    { area: "Digital Transformation", level: "Strong", evidence: "Claims-intake transformation cut cycle time 12 → 4 days." },
    { area: "Technical Architecture", level: "Strong", evidence: "Daily partnership with architects on microservices & event-driven design." },
    { area: "Leadership", level: "Strong", evidence: "Mentored 3 APMs; squad lead of 8; PM/TPM hiring loops." },
    { area: "Fintech & Payments", level: "Expert", evidence: "Payments orchestration across 3 PSPs under PCI-DSS; +$8.4M TPV." },
    { area: "Healthcare Domain", level: "Working", evidence: "Claims & intake work at a national insurer; HIPAA-aware delivery." },
    { area: "Developer Experience", level: "Working", evidence: "Partner portal & docs revamp cut integration time 6 → 2 weeks." },
  ],
  achievements: [
    {
      id: "ach-api",
      title: "API Platform Modernization",
      detail: "Owned the consolidation of 14 legacy services into a unified public API platform with versioning, sandbox, and partner portal.",
      metrics: ["+38% partner integrations", "Integration time 6 → 2 weeks", "400+ active partners"],
      tags: ["APIs & Integrations", "Enterprise Platforms", "Developer Experience", "Digital Transformation"],
    },
    {
      id: "ach-cloud",
      title: "Enterprise Cloud Migration (on-prem → AWS)",
      detail: "Co-led the migration of the core commerce platform to AWS (ECS, RDS, S3) with zero-downtime cutover strategy.",
      metrics: ["99.95% uptime during migration", "-27% infrastructure cost", "0 customer-facing incidents"],
      tags: ["Cloud & AWS", "Technical Architecture", "Enterprise Platforms"],
    },
    {
      id: "ach-genai",
      title: "GenAI Copilot Launch",
      detail: "Took an LLM-based workflow copilot from discovery to GA for enterprise customers, incl. eval harness and guardrails.",
      metrics: ["$1.2M ARR in first 2 quarters", "-41% task completion time", "4.6/5 CSAT"],
      tags: ["AI & GenAI", "Product Discovery", "Product Strategy"],
    },
    {
      id: "ach-payments",
      title: "Payments Orchestration (Product Owner)",
      detail: "PO for the payments orchestration layer routing across 3 PSPs; owned PCI-DSS scope reduction program.",
      metrics: ["+$8.4M TPV", "99.99% authorization uptime", "PCI scope -40%"],
      tags: ["Fintech & Payments", "Product Ownership", "Enterprise Platforms"],
    },
    {
      id: "ach-data",
      title: "Data & Analytics Platform 0→1",
      detail: "Built the self-serve analytics platform and metric definitions that became the org's decision layer.",
      metrics: ["-70% time-to-report", "63% of roadmap decisions metric-backed", "300+ weekly active analysts"],
      tags: ["Data & Analytics", "Product Strategy", "Enterprise Platforms"],
    },
    {
      id: "ach-claims",
      title: "Digital Claims Transformation",
      detail: "Led discovery and delivery of a digital claims-intake journey for a national insurer.",
      metrics: ["Cycle time 12 → 4 days", "+22 NPS", "2M+ claims/yr processed"],
      tags: ["Digital Transformation", "Healthcare Domain", "Product Discovery"],
    },
    {
      id: "ach-agentic",
      title: "Agentic AI Triage Pilot",
      detail: "Designed and piloted a multi-agent support-triage system with human-in-the-loop escalation.",
      metrics: ["32% auto-resolution", "-28% handle time", "Zero compliance escalations"],
      tags: ["AI & GenAI", "Product Delivery", "Stakeholder Management"],
    },
    {
      id: "ach-pricing",
      title: "Usage-Based Pricing Relaunch",
      detail: "Rebuilt platform packaging from seat-based to usage-based with metering and finance reconciliation.",
      metrics: ["+19% ARPA", "-31% billing disputes", "Adopted by 70% of book in 2 quarters"],
      tags: ["Product Strategy", "Fintech & Payments", "Data & Analytics"],
    },
  ],
  education: ["B.S. Computer Science — State University"],
  certifications: ["CSPO (Scrum Alliance)", "AWS Certified Cloud Practitioner", "Pragmatic Institute — PMC-III"],
  preferredTitles: ["Senior Product Manager", "Staff Product Manager", "Technical Product Manager", "Group Product Manager", "AI Product Manager", "Platform Product Manager", "Product Leader", "Principal Product Manager"],
  preferredIndustries: ["Enterprise SaaS", "Fintech", "AI Infrastructure", "Healthcare", "Developer Tools"],
  preferredCompanies: ["Ledgerline", "Cortexa", "Northbeam Analytics", "Meridian Labs", "Arclight Systems"],
  preferredLocations: ["San Francisco Bay Area", "New York", "Seattle", "Remote — US"],
  workModes: ["Remote", "Hybrid"],
  salaryMin: 165000,
  salaryMax: 215000,
  careerGoals: "Step into a Staff/Group PM role leading AI-native platform products — owning strategy, platform architecture trade-offs, and a small team of PMs.",
  linkedin: "linkedin.com/in/alexmorgan-product",
};

// ─── jobs ────────────────────────────────────────────────────────────────────
const jobs: Job[] = [
  {
    id: "j-ledgerline",
    title: "Staff Product Manager, Payments Platform",
    company: "Ledgerline",
    industry: "Fintech Infrastructure",
    location: "San Francisco / Remote — US",
    mode: "Remote",
    salaryMin: 185000, salaryMax: 225000,
    postedDaysAgo: 1, deadlineInDays: 12,
    source: "LinkedIn",
    growth: "Leadership",
    experienceYears: 8,
    requiredSkills: ["Product Strategy", "APIs & Integrations", "Enterprise Platforms", "Fintech & Payments", "Stakeholder Management", "Leadership"],
    preferredSkills: ["Cloud & AWS", "Data & Analytics", "Developer Experience"],
    description: "Ledgerline runs the ledger and payout rails behind 300+ fintechs. You will own the payments platform roadmap — APIs, orchestration, and developer experience — and mentor a pod of two PMs while partnering with engineering leadership on a multi-year modernization.",
    responsibilities: [
      "Own the 3-year platform roadmap and quarterly OKRs",
      "Drive API design reviews with partners and staff engineers",
      "Mentor 2 PMs; run platform guild across 4 squads",
      "Partner with Compliance on PCI-DSS and regional rails",
    ],
    recruiter: { name: "Maya Chen", title: "Senior Technical Recruiter, Ledgerline", email: "maya.chen@ledgerline.io" },
    link: "https://boards.example/ledgerline/staff-pm-payments",
    isNew: true,
  },
  {
    id: "j-meridian",
    title: "AI Product Manager, Agentic Workflows",
    company: "Meridian Labs",
    industry: "AI Infrastructure",
    location: "San Francisco / Remote — US",
    mode: "Remote",
    salaryMin: 175000, salaryMax: 210000,
    postedDaysAgo: 1, deadlineInDays: 9,
    source: "Recruiter Email",
    growth: "Strategic",
    experienceYears: 6,
    requiredSkills: ["AI & GenAI", "Product Discovery", "APIs & Integrations", "Product Strategy"],
    preferredSkills: ["Data & Analytics", "Developer Experience", "Cloud & AWS"],
    description: "Meridian builds the orchestration layer enterprises use to deploy agentic workflows in production. You'll own the agent-runtime product: guardrails, evals, tool integrations — working daily with founding engineers and design partners.",
    responsibilities: [
      "Own agent-runtime roadmap with evals and guardrails",
      "Run design-partner program with 12 enterprise customers",
      "Ship tool-integration marketplace (APIs, webhooks, MCP)",
      "Define success metrics for autonomy vs. control",
    ],
    recruiter: { name: "Jonah Weiss", title: "Founding Recruiter, Meridian Labs", email: "jonah@meridianlabs.ai" },
    link: "https://boards.example/meridian/ai-pm-agentic",
    isNew: true,
  },
  {
    id: "j-cortexa",
    title: "Senior Technical Product Manager, Cloud Platform",
    company: "Cortexa",
    industry: "AI Infrastructure",
    location: "Seattle, WA",
    mode: "Hybrid",
    salaryMin: 170000, salaryMax: 205000,
    postedDaysAgo: 2,
    source: "Company Careers",
    growth: "Strategic",
    experienceYears: 6,
    requiredSkills: ["Cloud & AWS", "Technical Architecture", "APIs & Integrations", "AI & GenAI", "Agile & Scrum"],
    preferredSkills: ["Enterprise Platforms", "Stakeholder Management", "Data & Analytics"],
    description: "Cortexa's inference platform serves ML workloads for Fortune 500s. As Senior TPM you'll own capacity, multi-region failover, and the customer-facing deployment APIs — the seam between platform engineering and enterprise GTM.",
    responsibilities: [
      "Own deployment APIs and multi-region failover roadmap",
      "Translate SLOs into a customer-facing reliability story",
      "Run quarterly platform reviews with enterprise accounts",
      "Partner with solutions architects on top-10 deals",
    ],
    recruiter: { name: "Devon Okafor", title: "Talent Partner, Cortexa", email: "devon.okafor@cortexa.cloud" },
    link: "https://careers.example/cortexa/sr-tpm-cloud",
  },
  {
    id: "j-orbit",
    title: "Technical Product Manager, API Gateway",
    company: "Orbit API Co",
    industry: "Developer Tools",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 160000, salaryMax: 190000,
    postedDaysAgo: 2, deadlineInDays: 14,
    source: "Wellfound",
    growth: "Lateral",
    experienceYears: 5,
    requiredSkills: ["APIs & Integrations", "Technical Architecture", "Developer Experience", "Cloud & AWS", "Product Delivery"],
    preferredSkills: ["Data & Analytics", "AI & GenAI", "Agile & Scrum"],
    description: "Orbit's API gateway routes 40B requests/month. You'll own authN/authZ, rate-limiting, and the developer console — a deeply technical, deeply loved product with a vocal developer community.",
    responsibilities: [
      "Own gateway auth and rate-limiting roadmap",
      "Ship developer-console improvements with DX research",
      "Write RFC-level specs alongside staff engineers",
      "Triage community feedback into a public roadmap",
    ],
    link: "https://boards.example/orbit/tpm-api-gateway",
    isNew: true,
  },
  {
    id: "j-helix",
    title: "Senior Product Manager, AI Copilots",
    company: "Helix Health",
    industry: "Healthcare Technology",
    location: "New York, NY",
    mode: "Hybrid",
    salaryMin: 165000, salaryMax: 195000,
    postedDaysAgo: 3,
    source: "Recruiter Email",
    growth: "Progression",
    experienceYears: 6,
    requiredSkills: ["AI & GenAI", "Product Discovery", "Data & Analytics", "Stakeholder Management"],
    preferredSkills: ["Healthcare Domain", "Product Strategy", "Agile & Scrum"],
    description: "Helix builds ambient AI copilots for clinical documentation used by 40+ health systems. You'll own the copilot quality loop: evals, clinician feedback, and the metrics that decide what ships.",
    responsibilities: [
      "Own copilot eval and quality roadmap",
      "Run discovery with clinicians across 8 health systems",
      "Define quality metrics with clinical safety team",
      "Ship guardrail improvements with ML engineering",
    ],
    recruiter: { name: "Priya Nair", title: "Head of Talent, Helix Health", email: "priya.nair@helixhealth.com" },
    link: "https://careers.example/helix/spm-ai-copilots",
  },
  {
    id: "j-arclight",
    title: "Group Product Manager, Enterprise Platform",
    company: "Arclight Systems",
    industry: "Enterprise SaaS",
    location: "Austin, TX",
    mode: "Hybrid",
    salaryMin: 190000, salaryMax: 230000,
    postedDaysAgo: 4,
    source: "LinkedIn",
    growth: "Progression",
    experienceYears: 10,
    requiredSkills: ["Leadership", "Product Strategy", "Enterprise Platforms", "APIs & Integrations", "Digital Transformation"],
    preferredSkills: ["Cloud & AWS", "AI & GenAI", "Stakeholder Management"],
    description: "Arclight's operations platform serves 900+ industrial enterprises. The GPM will lead three platform squads (integrations, workflow engine, AI assist) and report to the VP Product — a genuine step into multi-team leadership.",
    responsibilities: [
      "Lead 3 platform squads and 3 PMs",
      "Own platform P&L contribution and packaging",
      "Drive the 'AI assist' layer across workflow products",
      "Executive sponsor for top-25 strategic accounts",
    ],
    recruiter: { name: "Grace Liu", title: "Director of Recruiting, Arclight", email: "grace.liu@arclight.systems" },
    link: "https://boards.example/arclight/gpm-platform",
  },
  {
    id: "j-northbeam",
    title: "Product Manager, Data Platform",
    company: "Northbeam Analytics",
    industry: "Data & Analytics",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 150000, salaryMax: 180000,
    postedDaysAgo: 3,
    source: "Wellfound",
    growth: "Lateral",
    experienceYears: 5,
    requiredSkills: ["Data & Analytics", "Product Strategy", "APIs & Integrations", "Product Discovery"],
    preferredSkills: ["Enterprise Platforms", "Developer Experience", "AI & GenAI"],
    description: "Northbeam's reverse-ETL platform syncs warehouse data into 80+ business tools. You'll own destinations and the semantic layer — the product surface where analytics teams meet the rest of the company.",
    responsibilities: [
      "Own destinations roadmap (80+ integrations)",
      "Define semantic-layer metrics model with customers",
      "Run customer advisory board (12 data leaders)",
      "Pair with growth on product-led onboarding",
    ],
    recruiter: { name: "Marcus Webb", title: "Hiring Manager — VP Product, Northbeam", email: "marcus@northbeam.io" },
    link: "https://boards.example/northbeam/pm-data-platform",
  },
  {
    id: "j-atlas",
    title: "Senior Product Manager, Cloud Migration",
    company: "Atlas Enterprise Cloud",
    industry: "Enterprise SaaS",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 165000, salaryMax: 200000,
    postedDaysAgo: 3, deadlineInDays: 21,
    source: "Recruiter Email",
    growth: "Strategic",
    experienceYears: 7,
    requiredSkills: ["Cloud & AWS", "Digital Transformation", "Enterprise Platforms", "Stakeholder Management"],
    preferredSkills: ["Technical Architecture", "Data & Analytics", "Product Strategy"],
    description: "Atlas helps 200+ enterprises move regulated workloads to AWS. You'll own the migration orchestration product — runbooks, progress analytics, and the cutover experience customers actually remember.",
    responsibilities: [
      "Own migration-orchestration roadmap",
      "Build the cutover experience with delivery teams",
      "Instrument migration analytics for enterprise PMs",
      "Co-sell with AWS marketplace team",
    ],
    recruiter: { name: "Ingrid Hoff", title: "Executive Recruiter (retained), Atlas", email: "i.hoff@atlascloud.example" },
    link: "https://careers.example/atlas/spm-cloud-migration",
  },
  {
    id: "j-vantage",
    title: "Enterprise Product Manager, Integrations",
    company: "Vantage Cloud",
    industry: "Enterprise SaaS",
    location: "Denver, CO",
    mode: "Hybrid",
    salaryMin: 155000, salaryMax: 185000,
    postedDaysAgo: 5,
    source: "Glassdoor",
    growth: "Lateral",
    experienceYears: 6,
    requiredSkills: ["APIs & Integrations", "Enterprise Platforms", "Stakeholder Management", "Cloud & AWS"],
    preferredSkills: ["Product Ownership", "Agile & Scrum", "Data & Analytics"],
    description: "Vantage's CRM platform connects to 200+ enterprise systems. You'll own the integration catalog and enterprise request pipeline — the #1 factor in Vantage's enterprise win rate last year.",
    responsibilities: [
      "Own integration catalog prioritization",
      "Run enterprise integration request council",
      "Ship connector SDK improvements",
      "Report integration coverage to enterprise sales",
    ],
    link: "https://boards.example/vantage/epm-integrations",
  },
  {
    id: "j-fleetwise",
    title: "Senior Product Owner, Logistics Suite",
    company: "Fleetwise",
    industry: "Logistics & Supply Chain",
    location: "Chicago, IL",
    mode: "Onsite",
    salaryMin: 135000, salaryMax: 160000,
    postedDaysAgo: 4,
    source: "Indeed",
    growth: "Lateral",
    experienceYears: 5,
    requiredSkills: ["Product Ownership", "Agile & Scrum", "Stakeholder Management", "Enterprise Platforms", "Product Delivery"],
    preferredSkills: ["Data & Analytics", "APIs & Integrations"],
    description: "Fleetwise's routing suite dispatches 60K vehicles daily. As Senior PO you'll own the dispatcher workspace backlog, working embedded with two Scrum teams and a very opinionated operations org.",
    responsibilities: [
      "Own backlog and sprint goals for 2 Scrum teams",
      "Ride-alongs with dispatchers monthly",
      "Refine epics with ops leadership weekly",
      "Track flow metrics and remove delivery blockers",
    ],
    recruiter: { name: "Tom Reyes", title: "Recruiter, Fleetwise", email: "tom.reyes@fleetwise.example" },
    link: "https://boards.example/fleetwise/senior-po-logistics",
  },
  {
    id: "j-quanta",
    title: "Director of Product, Platform",
    company: "Quanta Robotics",
    industry: "Robotics & Automation",
    location: "Boston, MA",
    mode: "Hybrid",
    salaryMin: 210000, salaryMax: 260000,
    postedDaysAgo: 6,
    source: "LinkedIn",
    growth: "Progression",
    experienceYears: 12,
    requiredSkills: ["Leadership", "Product Strategy", "AI & GenAI", "Enterprise Platforms", "Stakeholder Management"],
    preferredSkills: ["Technical Architecture", "Cloud & AWS", "Data & Analytics"],
    description: "Quanta's autonomy platform powers warehouse robots for 40 logistics operators. The Director will own the platform org (6 PMs) through the shift from on-prem fleets to cloud-managed autonomy.",
    responsibilities: [
      "Lead a 6-PM platform organization",
      "Own cloud-managed autonomy roadmap",
      "Board-level platform metrics reporting",
      "Build the PM hiring pipeline",
    ],
    link: "https://boards.example/quanta/director-product",
  },
  {
    id: "j-bluepine",
    title: "Product Manager, Mobile Banking",
    company: "Bluepine Bank",
    industry: "Banking",
    location: "Charlotte, NC",
    mode: "Onsite",
    salaryMin: 130000, salaryMax: 155000,
    postedDaysAgo: 7,
    source: "Glassdoor",
    growth: "Lateral",
    experienceYears: 4,
    requiredSkills: ["Product Discovery", "Agile & Scrum", "Fintech & Payments", "Data & Analytics"],
    preferredSkills: ["Stakeholder Management", "Product Ownership"],
    description: "Bluepine is modernizing its retail bank app (1.2M customers). You'll own deposits and onboarding journeys inside a regulated, waterfall-to-agile transition.",
    responsibilities: [
      "Own deposits journey backlog",
      "Run usability tests with branch customers",
      "Coordinate with compliance on release trains",
      "Report journey metrics to retail banking execs",
    ],
    link: "https://boards.example/bluepine/pm-mobile-banking",
  },
  {
    id: "j-silverline",
    title: "Product Owner, SaaS Billing",
    company: "Silverline Commerce",
    industry: "E-commerce",
    location: "Remote — EU",
    mode: "Remote",
    salaryMin: 95000, salaryMax: 120000,
    postedDaysAgo: 6,
    source: "LinkedIn",
    growth: "Lateral",
    experienceYears: 4,
    requiredSkills: ["Product Ownership", "Fintech & Payments", "Agile & Scrum"],
    preferredSkills: ["Data & Analytics", "Stakeholder Management"],
    description: "Silverline's subscription billing module serves EU merchants. PO role embedded with a 7-person squad handling SEPA, invoicing, and dunning flows.",
    responsibilities: [
      "Own billing squad backlog",
      "Handle PSD2/SEPA regulatory changes",
      "Weekly refinement with payments engineers",
    ],
    link: "https://boards.example/silverline/po-billing",
  },
  {
    id: "j-cedar",
    title: "Associate Product Manager",
    company: "Cedar Analytics",
    industry: "Data & Analytics",
    location: "New York, NY",
    mode: "Hybrid",
    salaryMin: 95000, salaryMax: 115000,
    postedDaysAgo: 5,
    source: "Indeed",
    growth: "Lateral",
    experienceYears: 1,
    requiredSkills: ["Product Discovery", "Agile & Scrum", "Data & Analytics"],
    preferredSkills: ["Product Delivery"],
    description: "APM rotational program on Cedar's self-serve analytics product. 18-month program with a senior PM mentor and two squad rotations.",
    responsibilities: ["Shadow and co-own squad backlog", "Run user interviews", "Ship small features end-to-end"],
    link: "https://boards.example/cedar/apm",
  },
];

// jobs the daily agent can "discover" on later runs
const reserveJobs: Job[] = [
  {
    id: "r-nimbus-scale",
    title: "Principal Product Manager, GenAI Platform",
    company: "Nimbus Scale",
    industry: "AI Infrastructure",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 200000, salaryMax: 240000,
    postedDaysAgo: 0, deadlineInDays: 10,
    source: "LinkedIn",
    growth: "Strategic",
    experienceYears: 9,
    requiredSkills: ["AI & GenAI", "Product Strategy", "Enterprise Platforms", "APIs & Integrations", "Leadership"],
    preferredSkills: ["Cloud & AWS", "Data & Analytics"],
    description: "Nimbus Scale's GenAI platform standardizes LLM delivery for regulated enterprises. Principal PM owns the model-governance surface: registries, evals, policy-as-code.",
    responsibilities: ["Own model-governance roadmap", "Partner with compliance on policy-as-code", "Mentor 3 PMs across platform pods"],
    recruiter: { name: "Alana Pierce", title: "Principal Recruiter, Nimbus Scale", email: "alana@nimbusscale.ai" },
    link: "https://boards.example/nimbus-scale/principal-pm-genai",
    isNew: true,
  },
  {
    id: "r-ironwood",
    title: "Platform Product Manager, Fintech APIs",
    company: "Ironwood Financial",
    industry: "Fintech Infrastructure",
    location: "New York, NY",
    mode: "Hybrid",
    salaryMin: 170000, salaryMax: 205000,
    postedDaysAgo: 0,
    source: "Company Careers",
    growth: "Progression",
    experienceYears: 7,
    requiredSkills: ["APIs & Integrations", "Fintech & Payments", "Enterprise Platforms", "Product Strategy"],
    preferredSkills: ["Developer Experience", "Cloud & AWS", "Data & Analytics"],
    description: "Ironwood's banking-API stack powers 120 embedded-finance programs. Own ledger and card-issuing APIs end-to-end.",
    responsibilities: ["Own ledger & card APIs", "Run partner design reviews", "Drive API deprecation policy"],
    link: "https://careers.example/ironwood/platform-pm",
    isNew: true,
  },
  {
    id: "r-kestrel",
    title: "Senior Product Manager, Developer Platform",
    company: "Kestrel",
    industry: "Developer Tools",
    location: "San Francisco, CA",
    mode: "Hybrid",
    salaryMin: 168000, salaryMax: 200000,
    postedDaysAgo: 0,
    source: "Referral",
    growth: "Strategic",
    experienceYears: 6,
    requiredSkills: ["Developer Experience", "APIs & Integrations", "Product Discovery", "Product Delivery"],
    preferredSkills: ["Cloud & AWS", "AI & GenAI", "Data & Analytics"],
    description: "Kestrel's CI platform builds 8M workloads/day. Own the build-cache and artifact surfaces that developers feel in every PR.",
    responsibilities: ["Own cache/artifact roadmap", "Run developer-research program", "Ship with platform SREs"],
    link: "https://boards.example/kestrel/spm-dev-platform",
    isNew: true,
  },
  {
    id: "r-halcyon",
    title: "Product Manager, Healthcare AI",
    company: "Halcyon Health",
    industry: "Healthcare Technology",
    location: "Boston, MA",
    mode: "Hybrid",
    salaryMin: 150000, salaryMax: 178000,
    postedDaysAgo: 0,
    source: "Indeed",
    growth: "Lateral",
    experienceYears: 5,
    requiredSkills: ["AI & GenAI", "Healthcare Domain", "Product Discovery", "Stakeholder Management"],
    preferredSkills: ["Data & Analytics", "Product Delivery"],
    description: "Halcyon's prior-auth automation product removes weeks from patient care paths. Own the payer-integration side of the product.",
    responsibilities: ["Own payer-integration roadmap", "Discovery with health-system ops", "Ship with clinical safety reviews"],
    link: "https://boards.example/halcyon/pm-healthcare-ai",
    isNew: true,
  },
  {
    id: "r-polar",
    title: "VP Product",
    company: "Polar Analytics",
    industry: "Data & Analytics",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 230000, salaryMax: 280000,
    postedDaysAgo: 0,
    source: "Recruiter Email",
    growth: "Progression",
    experienceYears: 14,
    requiredSkills: ["Leadership", "Product Strategy", "Data & Analytics", "Stakeholder Management"],
    preferredSkills: ["Enterprise Platforms", "AI & GenAI"],
    description: "Polar (Series C, 90 people) needs its first VP Product to scale the PM org from 4 to 12 and own the roadmap narrative for the board.",
    responsibilities: ["Build and lead PM org", "Own roadmap & pricing strategy", "Board reporting"],
    recruiter: { name: "Ruth Adler", title: "Executive Search, Spencer Hollow", email: "radler@spencerhollow.example" },
    link: "https://boards.example/polar/vp-product",
    isNew: true,
  },
  {
    id: "r-solstice",
    title: "Senior Product Owner, B2B SaaS",
    company: "Solstice Software",
    industry: "Enterprise SaaS",
    location: "Remote — US",
    mode: "Remote",
    salaryMin: 140000, salaryMax: 165000,
    postedDaysAgo: 0,
    source: "LinkedIn",
    growth: "Lateral",
    experienceYears: 5,
    requiredSkills: ["Product Ownership", "Agile & Scrum", "Enterprise Platforms", "Product Delivery"],
    preferredSkills: ["APIs & Integrations", "Stakeholder Management"],
    description: "Solstice's field-service suite needs a Senior PO to tighten delivery on the scheduling engine squad.",
    responsibilities: ["Own scheduling-engine backlog", "Improve sprint predictability", "Partner with customer success"],
    link: "https://boards.example/solstice/senior-po",
    isNew: true,
  },
];

// ─── applications ────────────────────────────────────────────────────────────
const applications: Application[] = [
  {
    id: "a-helix", jobId: "j-helix", status: "Interview Scheduled",
    discoveredOn: iso(-9), followUpDate: iso(1), interviewDate: iso(2),
    resumeVersionId: "rv3", letterId: "l-helix",
    salaryNote: "$165–195K posted; target $185K+ equity",
    notes: [{ at: iso(-2), text: "Recruiter screen went well — Priya flagged the eval/quality loop as the key theme. Prep clinician-discovery story." }],
    history: [
      { at: iso(-9), event: "Discovered via Recruiter Email" },
      { at: iso(-8), event: "Status → Reviewing" },
      { at: iso(-7), event: "Tailored resume v3-helix created" },
      { at: iso(-6), event: "Applied with approved cover letter" },
      { at: iso(-2), event: "Recruiter screen completed" },
      { at: iso(-1), event: "Status → Interview Scheduled" },
    ],
  },
  {
    id: "a-ledgerline", jobId: "j-ledgerline", status: "Preparing",
    discoveredOn: iso(-1), followUpDate: iso(0),
    notes: [{ at: iso(-1), text: "Sara Kim works here — ask for referral before applying. Target the unified-API achievement hard." }],
    history: [{ at: iso(-1), event: "Discovered via LinkedIn (agent alert)" }, { at: iso(0), event: "Status → Preparing" }],
  },
  {
    id: "a-orbit", jobId: "j-orbit", status: "Ready to Apply",
    discoveredOn: iso(-2), followUpDate: iso(1),
    notes: [{ at: iso(-1), text: "Resume + letter approved. Apply before Friday deadline push." }],
    history: [{ at: iso(-2), event: "Discovered via Wellfound" }, { at: iso(-1), event: "Materials approved — ready" }],
  },
  {
    id: "a-fleetwise", jobId: "j-fleetwise", status: "Recruiter Contacted",
    discoveredOn: iso(-6), followUpDate: iso(0),
    notes: [{ at: iso(-3), text: "Tom asked for availability — replied same day. Onsite Chicago is a concern; raise remote/hybrid ask early." }],
    history: [
      { at: iso(-6), event: "Discovered via Indeed" },
      { at: iso(-5), event: "Applied" },
      { at: iso(-3), event: "Recruiter replied — conversation started" },
    ],
  },
  {
    id: "a-arclight", jobId: "j-arclight", status: "Applied",
    discoveredOn: iso(-8), appliedOn: iso(-5), followUpDate: iso(2),
    resumeVersionId: "rv3", letterId: undefined,
    notes: [{ at: iso(-5), text: "Applied through ATS. Elena (ex-manager) is at Arclight — ping her if silent by Friday." }],
    history: [{ at: iso(-8), event: "Discovered via LinkedIn" }, { at: iso(-5), event: "Applied via ATS" }],
  },
  {
    id: "a-vantage", jobId: "j-vantage", status: "Applied",
    discoveredOn: iso(-5), appliedOn: iso(-4), followUpDate: iso(3),
    notes: [],
    history: [{ at: iso(-5), event: "Discovered via Glassdoor" }, { at: iso(-4), event: "Applied via ATS" }],
  },
  {
    id: "a-bluepine", jobId: "j-bluepine", status: "Rejected",
    discoveredOn: iso(-20), appliedOn: iso(-18),
    notes: [{ at: iso(-3), text: "Rejected — went with internal candidate. Not a fit anyway (onsite Charlotte)." }],
    history: [{ at: iso(-20), event: "Discovered" }, { at: iso(-18), event: "Applied" }, { at: iso(-3), event: "Rejected by company" }],
  },
];

// ─── contacts ────────────────────────────────────────────────────────────────
const contacts: Contact[] = [
  {
    id: "c-sara", name: "Sara Kim", company: "Ledgerline", role: "Senior PM, Payments",
    relationship: "Ex-colleague (Nimbus, 2019–2022)", linkedin: "linkedin.com/in/sarakim",
    lastInteraction: iso(-34), followUpDate: iso(0),
    notes: "Close to the hiring manager for the Staff PM role. Owes me a coffee.",
  },
  {
    id: "c-maya", name: "Maya Chen", company: "Ledgerline", role: "Senior Technical Recruiter",
    relationship: "Recruiter (inbound 2024)", linkedin: "linkedin.com/in/mayachen-rec",
    lastInteraction: iso(-60),
    notes: "Responsive; liked the API platform story last time.",
  },
  {
    id: "c-marcus", name: "Marcus Webb", company: "Northbeam Analytics", role: "VP Product (hiring manager)",
    relationship: "Met at ProductCon 2025", linkedin: "linkedin.com/in/marcuswebb",
    lastInteraction: iso(-21), followUpDate: iso(-1),
    notes: "Said the data-platform PM req would open this quarter — it has.",
  },
  {
    id: "c-elena", name: "Elena Rodriguez", company: "Arclight Systems", role: "Director, Platform PMs",
    relationship: "Former manager (Nimbus)", linkedin: "linkedin.com/in/elenarodriguez",
    lastInteraction: iso(-90),
    notes: "Would refer me to the GPM loop without hesitation.",
  },
  {
    id: "c-jordan", name: "Jordan Fields", company: "Meridian Labs", role: "Staff Engineer",
    relationship: "2nd-degree (college network)", linkedin: "linkedin.com/in/jordanfields",
    notes: "Works on the agent runtime — great source of product truth.",
  },
];

// ─── tasks ───────────────────────────────────────────────────────────────────
const tasks: Task[] = [
  { id: "t1", title: "Tailor resume + referral ask for Ledgerline Staff PM", due: iso(0), type: "application", done: false, jobId: "j-ledgerline" },
  { id: "t2", title: "Follow up with Tom Reyes (Fleetwise)", due: iso(0), type: "follow-up", done: false, jobId: "j-fleetwise" },
  { id: "t3", title: "Interview prep — Helix Health AI Copilots (eval loop + clinician story)", due: iso(1), type: "prep", done: false, jobId: "j-helix" },
  { id: "t4", title: "Send thank-you note to Priya (Helix screen)", due: iso(-1), type: "networking", done: false, jobId: "j-helix" },
  { id: "t5", title: "Coffee chat with Sara Kim — Ledgerline referral", due: iso(2), type: "networking", done: false },
  { id: "t6", title: "Apply to Orbit API Gateway before deadline push", due: iso(1), type: "application", done: false, jobId: "j-orbit" },
  { id: "t7", title: "Weekly agent review & pipeline prune", due: iso(4), type: "review", done: false, recurring: "weekly" },
];

// ─── STAR stories ────────────────────────────────────────────────────────────
const stories: StarStory[] = [
  {
    id: "s-api", title: "Unifying a fragmented API platform",
    situation: "Our enterprise customers integrated against 14 inconsistent legacy services; every partner onboarding took 6+ weeks and churn risk lived in the integration queue.",
    task: "As platform PM, I was accountable for consolidating these into one public API with a credible migration path — without breaking 400+ live partners.",
    action: "I ran discovery with 22 partners, defined a versioning + deprecation policy with staff engineers, staged the migration behind a facade, and shipped a sandbox + docs portal. I sequenced quarters around partner revenue risk, not org convenience.",
    result: "Partner integrations grew 38%, onboarding fell from 6 to 2 weeks, and the unified API became the anchor of the platform narrative in enterprise deals.",
    skills: ["APIs & Integrations", "Enterprise Platforms", "Stakeholder Management", "Product Strategy"],
  },
  {
    id: "s-genai", title: "Taking a GenAI copilot from pilot to GA",
    situation: "Leadership wanted an LLM copilot fast; early prototypes impressed demos but failed in real enterprise workflows where accuracy and auditability decide adoption.",
    task: "Own the product from discovery through GA with a credible quality bar — not a demo.",
    action: "I built an eval harness with the ML team, ran 40+ workflow-shadowing sessions, defined guardrail tiers with legal, and priced usage with finance. We cut features to ship the quality loop first.",
    result: "$1.2M ARR in two quarters, 41% faster task completion, 4.6/5 CSAT — and the eval harness became the template for every later AI feature.",
    skills: ["AI & GenAI", "Product Discovery", "Product Strategy", "Product Delivery"],
  },
  {
    id: "s-payments", title: "Owning payments orchestration through a reliability crisis",
    situation: "Authorization uptime dipped below SLA during peak, and our biggest merchant threatened to leave; the root causes spanned three PSPs and two internal teams.",
    task: "As Product Owner, restore trust and structural reliability without pausing the roadmap.",
    action: "I stood up a war-room cadence, re-prioritized the backlog around smart retry and failover routing, negotiated PSP SLA changes, and published a weekly reliability digest to the merchant.",
    result: "99.99% authorization uptime over the next two quarters, +$8.4M TPV, and the merchant renewed for three years.",
    skills: ["Fintech & Payments", "Product Ownership", "Stakeholder Management", "Agile & Scrum"],
  },
  {
    id: "s-data", title: "Building the analytics platform nobody asked for (yet)",
    situation: "Every team had its own dashboards and its own definition of 'active'; roadmap debates were opinion-driven and reporting consumed analyst weeks.",
    task: "Convince leadership to fund a shared analytics platform and make it stick.",
    action: "I shipped a thin wedge (one golden metric per team), ran a guild to ratify definitions, and moved adoption by removing the old reports rather than mandating the new ones.",
    result: "Time-to-report fell 70%, 63% of roadmap decisions became metric-backed, and the platform hit 300+ weekly analysts.",
    skills: ["Data & Analytics", "Product Strategy", "Stakeholder Management", "Leadership"],
  },
];

// ─── companies ───────────────────────────────────────────────────────────────
const companies: CompanyResearch[] = [
  {
    name: "Ledgerline", industry: "Fintech Infrastructure", watched: true,
    overview: "Ledgerline provides core ledger, payout, and card-issuing APIs to 300+ fintechs and marketplaces. Series D, ~450 people, profitable unit economics on the payments rail.",
    products: "Ledger API, Payouts, Card Issuing, Compliance-as-a-service modules.",
    customers: "Mid-market fintechs, marketplaces, and embedded-finance programs (e.g., vertical SaaS platforms adding payments).",
    businessModel: "Usage-based: per-transaction fees plus platform subscription for compliance modules. Net revenue retention reportedly ~135%.",
    strategy: "Moving up-market from payments rails to a 'financial operations platform' — the platform PM org is central to that expansion.",
    announcements: "Launched regional payout rails in LATAM (Q3); hired a new CTO from a hyperscaler; SOC 2 Type II + PCI Level 1 renewals publicized.",
    leadership: "CEO (ex-Stripe), CTO (ex-hyperscaler infra), VP Product joined 18 months ago and is rebuilding the platform PM pod.",
    competitors: "Stripe Treasury, Marqeta, Modern Treasury, Codat (adjacent).",
    tech: "Event-sourced ledger (Kafka + Postgres), AWS multi-region, public REST APIs with strong DX reputation.",
    roleContribution: "The Staff PM owns the API platform narrative — the exact surface Ledgerline sells against Modern Treasury. Success here means partner growth and deal velocity.",
    challenges: "Multi-region compliance complexity; keeping API stability while scaling 400+ partners; mentoring PMs who came up in feature teams, not platforms.",
    questions: [
      "How does the platform team balance partner-requested features vs. the unified-API migration debt?",
      "What does 'mentoring two PMs' look like in practice — do I own their roadmap reviews?",
      "Which enterprise segment is the 3-year platform bet aimed at?",
      "How is API deprecation governed when a top-10 partner objects?",
    ],
  },
  {
    name: "Meridian Labs", industry: "AI Infrastructure", watched: true,
    overview: "Meridian builds the orchestration + runtime layer for enterprise agentic workflows. Series B, ~80 people, founding team from a major AI lab.",
    products: "Agent runtime, eval & guardrail suite, tool-integration marketplace.",
    customers: "12 design-partner enterprises in financial services and insurance; early but high-intent.",
    businessModel: "Platform subscription + consumption on agent runs. Land-with-runtime, expand-with-marketplace.",
    strategy: "Win on trust: evals, guardrails, and auditability are the wedge against 'vibes-driven' agent frameworks.",
    announcements: "Open-sourced the eval harness (8K GitHub stars); announced MCP-compatible tool registry.",
    leadership: "CEO/CTO are founders; Head of Product is a former platform PM leader at a data company.",
    competitors: "LangChain (framework), major-cloud agent services, in-house builds.",
    tech: "Rust + TypeScript runtime, policy-as-code guardrails, deep API integration surface.",
    roleContribution: "The AI PM owns the product surface where enterprises decide to trust agents — directly tied to the company's core thesis.",
    challenges: "Fast-moving model landscape invalidates roadmap assumptions; design-partner demands vs. platform generality; small team, high ambiguity.",
    questions: [
      "How do you decide what belongs in the runtime vs. left to customer code?",
      "What's the biggest bet the runtime team made that didn't pan out?",
      "How are eval results used in enterprise procurement conversations?",
    ],
  },
  {
    name: "Cortexa", industry: "AI Infrastructure", watched: true,
    overview: "Cortexa runs a managed inference platform for Fortune 500 ML workloads. Series C, ~200 people, strong enterprise pipeline.",
    products: "Managed inference endpoints, multi-region failover, deployment APIs, cost optimizer.",
    customers: "Fortune 500s in financial services, retail, and industrials running production ML.",
    businessModel: "Consumption-based with committed-use discounts; reliability tiers priced as SKUs.",
    strategy: "Reliability-as-product: SLOs, failover, and audit trails are the moat against hyperscaler defaults.",
    announcements: "Launched multi-region failover GA; partnership with a top-3 systems integrator.",
    leadership: "CEO ex-cloud infrastructure GM; engineering-heavy culture with TPMs embedded in platform teams.",
    competitors: "Hyperscaler inference services, Anyscale, Together AI.",
    tech: "Kubernetes-based, AWS + GCP, heavy on observability and SLO tooling.",
    roleContribution: "The Senior TPM owns the customer-facing reliability story — the difference between a science project and a contract.",
    challenges: "Translating deep infrastructure work into enterprise buying language; balancing custom asks from top accounts.",
    questions: [
      "How do TPMs here split time between platform teams and customer-facing work?",
      "What does the SLO product roadmap look like over the next 4 quarters?",
    ],
  },
  {
    name: "Helix Health", industry: "Healthcare Technology", watched: true,
    overview: "Helix builds ambient AI copilots for clinical documentation. 40+ health systems, Series C, ~300 people, FDA-adjacent quality culture.",
    products: "Ambient documentation copilot, coding-assist module, quality/eval dashboard.",
    customers: "Health systems and large group practices; buying committees include CMIOs and compliance.",
    businessModel: "Per-provider subscription with quality-tier add-ons.",
    strategy: "Win on measured quality: the eval loop is the product differentiator, not the model.",
    announcements: "Published peer-reviewed accuracy study; expanded into specialty care documentation.",
    leadership: "CEO ex-health system exec; CMO on staff; product org split by clinical workflow.",
    competitors: "Abridge, Nuance DAX, Suki.",
    tech: "LLM pipelines with heavy eval infrastructure; HIPAA/SOC 2 everywhere.",
    roleContribution: "The PM owning the quality loop sits on the exact metric health systems buy against — central to renewals.",
    challenges: "Clinician time is scarce for discovery; regulatory review slows releases; quality metrics must survive clinical scrutiny.",
    questions: [
      "How do clinicians feed back into the eval loop day-to-day?",
      "What quality thresholds gate a release, and who signs off?",
      "How does the team handle a model regression discovered in production?",
    ],
  },
  {
    name: "Northbeam Analytics", industry: "Data & Analytics", watched: false,
    overview: "Northbeam's reverse-ETL platform activates warehouse data in 80+ business tools. Series B, ~120 people.",
    products: "Reverse-ETL syncs, semantic layer, destination marketplace.",
    customers: "Data teams at 800+ mid-market and enterprise companies.",
    businessModel: "Seat + sync-volume pricing; marketplace take-rate in beta.",
    strategy: "Become the 'activation layer' standard; semantic layer is the wedge into the modern data stack.",
    announcements: "Semantic-layer GA; SOC 2 Type II; new Salesforce deep-sync.",
    leadership: "Founder-CEO from the modern data stack community; VP Product (Marcus Webb) is hiring.",
    competitors: "Census, Hightouch, customer segments in CDPs.",
    tech: "Warehouse-native (Snowflake, BigQuery, Databricks), API-first.",
    roleContribution: "Destinations PM owns the surface customers touch daily — retention lives here.",
    challenges: "Marketplace breadth vs. depth; competing with hyperscaler bundling.",
    questions: ["How do you prioritize 80+ destinations with a small team?", "Where does the semantic layer intersect with AI features?"],
  },
  {
    name: "Arclight Systems", industry: "Enterprise SaaS", watched: false,
    overview: "Arclight's operations platform serves 900+ industrial enterprises. Late-stage, ~700 people, PE-backed with a growth mandate on AI.",
    products: "Workflow engine, integrations hub, 'AI assist' layer, field mobile apps.",
    customers: "Industrial manufacturing, energy, and logistics operators.",
    businessModel: "Enterprise license + module attach; multi-year ELAs.",
    strategy: "Modernize the platform to defend renewals and sell the AI-assist layer into the installed base.",
    announcements: "AI-assist beta with 30 customers; new VP Product; platform consolidation program.",
    leadership: "CEO from enterprise infrastructure; Elena Rodriguez (ex-manager contact) directs the platform PM group.",
    competitors: "ServiceNow (adjacent), PTC, in-house stacks.",
    tech: "Legacy SOA being consolidated to microservices; Azure-leaning hybrid cloud.",
    roleContribution: "The GPM role owns the platform modernization that the whole AI strategy depends on.",
    challenges: "Installed-base migration risk; PE cost pressure; integrating AI into workflows customers trust.",
    questions: ["How is platform modernization funded against feature demand from sales?", "What's the GPM's actual authority over squad-level roadmaps?"],
  },
];

// ─── inbox (email-integration intelligence) ─────────────────────────────────
const inbox: InboxMessage[] = [
  {
    id: "m-helix-interview", kind: "Interview Invitation", from: "Priya Nair <priya.nair@helixhealth.com>",
    company: "Helix Health", subject: "Interview — Senior PM, AI Copilots",
    summary: "Priya is scheduling your product-deep-dive with the Head of Copilot Quality. 60 minutes, panel of 2.",
    jobId: "j-helix",
    extracted: { date: iso(2), time: "11:00 AM ET", interviewer: "Dana Whitfield (Head of Copilot Quality)", link: "meet.example/helix-deep-dive" },
    suggestedReply: "Hi Priya — thank you, that time works perfectly. Looking forward to meeting Dana. If helpful, I can prepare a short walkthrough of how I've structured eval/quality loops for GenAI products. Best, Alex",
  },
  {
    id: "m-cortexa-recruiter", kind: "Recruiter Message", from: "Devon Okafor <devon.okafor@cortexa.cloud>",
    company: "Cortexa", subject: "Senior TPM, Cloud Platform — your profile stood out",
    summary: "Devon flagged your API-platform and AWS migration experience as a strong match for the Cloud Platform TPM req. Asking for a 25-minute intro call this week.",
    jobId: "j-cortexa",
    suggestedReply: "Hi Devon — thanks for reaching out. The Cloud Platform TPM role looks like a strong overlap with my platform and AWS migration work. I'm available Thu 1–4 PM PT or Fri morning — happy to bring questions about the reliability-tier roadmap. Best, Alex",
  },
  {
    id: "m-arclight-confirm", kind: "Application Confirmation", from: "Arclight ATS <no-reply@arclight.systems>",
    company: "Arclight Systems", subject: "We received your application — Group Product Manager",
    summary: "Confirmation received. Typical first-response window is 10 business days.",
    jobId: "j-arclight", acted: true,
  },
  {
    id: "m-bluepine-reject", kind: "Rejection", from: "Bluepine Talent <talent@bluepine.example>",
    company: "Bluepine Bank", subject: "Update on your application — Product Manager, Mobile Banking",
    summary: "They moved forward with an internal candidate. Archive gracefully; no follow-up needed.",
    jobId: "j-bluepine", acted: true,
  },
];

// ─── letters, resume versions, logs, settings ───────────────────────────────
const letters: Letter[] = [
  {
    id: "l-helix", jobId: "j-helix", tone: "Professional", approved: true, updatedAt: iso(-7),
    text: `Dear Priya,

I'm writing to apply for the Senior Product Manager, AI Copilots role at Helix Health. The chance to own the quality loop behind an ambient documentation copilot maps almost exactly to the last two years of my work: taking GenAI products from impressive demos to measurable enterprise outcomes.

At Nimbus Commerce Cloud, I led our GenAI copilot from discovery through GA. Rather than chasing model capability, I built the eval harness and guardrail tiers first, then ran 40+ workflow-shadowing sessions to define what "good" meant for real users. The product reached $1.2M ARR in its first two quarters, cut task completion time by 41%, and holds a 4.6/5 CSAT — and the eval harness became the template for every AI feature since.

Helix's bet that measured quality, not the model itself, is the differentiator resonates with me. I've also carried healthcare context from a digital claims transformation program (cycle time from 12 to 4 days across 2M+ claims), so I'm comfortable with the regulatory and clinical scrutiny your quality metrics will face.

I would welcome the chance to discuss how my eval-first approach could serve your health-system partners. Thank you for your consideration.

Sincerely,
Alex Morgan`,
    claims: [
      { claim: "GenAI copilot: $1.2M ARR, -41% task time, 4.6/5 CSAT", source: "Career Profile — GenAI Copilot Launch", verified: true },
      { claim: "Built eval harness + guardrail tiers; 40+ workflow sessions", source: "Career Profile — GenAI Copilot Launch", verified: true },
      { claim: "Claims transformation: 12 → 4 day cycle, 2M+ claims", source: "Career Profile — Digital Claims Transformation", verified: true },
      { claim: "8 years product management experience", source: "Career Profile — experience totals", verified: true },
    ],
  },
];

const resumeVersions: ResumeVersion[] = [
  { id: "rv3", name: "Master v3 — Enterprise AI Platforms", updatedAt: iso(-12), note: "Current master. Leads with API platform + GenAI achievements.", approved: true },
  { id: "rv2", name: "v2 — Platform & APIs emphasis", updatedAt: iso(-90), note: "Used for platform PM applications in 2024.", approved: true },
  { id: "rv1", name: "v1 — General PM", updatedAt: iso(-240), note: "Superseded.", approved: false },
];

const agentLog: AgentLog[] = [
  { id: "log1", at: iso(0) + "T07:32", text: "Daily run completed — scanned 61 postings across 8 sources; 3 new strong matches added.", kind: "run" },
  { id: "log2", at: iso(0) + "T07:32", text: "High-priority alert: AI Product Manager, Agentic Workflows — Meridian Labs (89%).", kind: "alert" },
  { id: "log3", at: iso(0) + "T07:32", text: "High-priority alert: Staff Product Manager, Payments Platform — Ledgerline (92%).", kind: "alert" },
  { id: "log4", at: iso(-1) + "T07:30", text: "Daily run completed — 54 postings scanned; 1 duplicate removed.", kind: "run" },
];

const settings: Settings = {
  scheduleTime: "07:30",
  scheduleFreq: "daily",
  sources: { LinkedIn: true, "Company Careers": true, "Recruiter Email": true, Wellfound: true, Indeed: true, Glassdoor: false, Referral: true },
  notifications: { highMatch: true, deadlines: true, followUps: true, weeklyDigest: false },
  integrations: { gmail: true, linkedin: true, calendar: false, browser: false },
  autoAddHighMatch: true,
  minScoreToAlert: 85,
};

// ─── initial state ───────────────────────────────────────────────────────────
export const seedState: AppState = {
  profile,
  jobs,
  reserveJobs,
  applications,
  savedIds: ["j-quanta", "j-atlas", "j-northbeam"],
  contacts,
  tasks,
  stories,
  companies,
  inbox,
  letters,
  resumeVersions,
  tailored: {},
  agentLog,
  settings,
  tab: "dashboard",
  jobDetailId: null,
  jobDetailTab: "overview",
  toasts: [],
};

export const STORAGE_KEY = "waypoint-state-v1";

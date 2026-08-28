import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  AppState, Application, AppStatus, Job, Letter, Profile, Settings, TailoredResume, Task,
} from "./data";
import { iso, seedState, STORAGE_KEY } from "./data";

let toastSeq = 100;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return {
        ...seedState,
        ...parsed,
        tab: "dashboard",
        jobDetailId: null,
        jobDetailTab: "overview",
        toasts: [],
      } as AppState;
    }
  } catch { /* fall through to seed */ }
  return { ...seedState };
}

export interface Api {
  state: AppState;
  setTab: (t: string) => void;
  openJob: (id: string, tab?: string) => void;
  closeJob: () => void;
  toast: (msg: string, kind?: "ok" | "warn" | "err") => void;
  dismissToast: (id: number) => void;
  toggleSave: (jobId: string) => void;
  addApplication: (jobId: string, status?: AppStatus) => string | null;
  setStatus: (appId: string, status: AppStatus) => void;
  approveSubmission: (appId: string, resumeVersionId?: string, letterId?: string) => void;
  addNote: (appId: string, text: string) => void;
  saveLetter: (l: Letter) => void;
  approveLetter: (id: string) => void;
  deleteLetter: (id: string) => void;
  saveTailored: (t: TailoredResume) => void;
  addResumeVersion: (name: string, note: string, forJobId?: string) => string;
  updateProfile: (patch: Partial<Profile>) => void;
  addAchievement: (a: { title: string; detail: string; metrics: string[]; tags: string[] }) => void;
  addTask: (t: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  agentFinish: (found: Job[], logLines: string[]) => void;
  actInbox: (id: string, alsoStatus?: { appId: string; status: AppStatus }) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleWatch: (company: string) => void;
  logInteraction: (contactId: string) => void;
  resetAll: () => void;
}

const Ctx = createContext<Api | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const stateRef = useRef(state);
  stateRef.current = state;

  // persist (data slices only — never transient ui)
  useEffect(() => {
    const { tab: _t, jobDetailId: _j, jobDetailTab: _jt, toasts: _to, ...persist } = stateRef.current;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persist)); } catch { /* quota */ }
  }, [state]);

  const toast = useCallback((msg: string, kind: "ok" | "warn" | "err" = "ok") => {
    const id = ++toastSeq;
    setState((s) => ({ ...s, toasts: [...s.toasts.slice(-3), { id, msg, kind }] }));
    window.setTimeout(() => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  }, []);

  const api = useMemo<Api>(() => ({
    state,
    setTab: (t) => setState((s) => ({ ...s, tab: t })),
    openJob: (id, tab = "overview") => setState((s) => ({ ...s, jobDetailId: id, jobDetailTab: tab })),
    closeJob: () => setState((s) => ({ ...s, jobDetailId: null })),
    toast,
    dismissToast: (id) => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })),

    toggleSave: (jobId) => setState((s) => {
      const saved = s.savedIds.includes(jobId);
      return { ...s, savedIds: saved ? s.savedIds.filter((x) => x !== jobId) : [...s.savedIds, jobId] };
    }),

    addApplication: (jobId, status = "Discovered") => {
      const s = stateRef.current;
      if (s.applications.some((a) => a.jobId === jobId)) return null;
      const id = uid("a");
      const app: Application = {
        id, jobId, status, discoveredOn: iso(0), notes: [],
        history: [{ at: iso(0), event: `Discovered via ${s.jobs.find((j) => j.id === jobId)?.source ?? "capture"}` }],
      };
      setState((st) => ({ ...st, applications: [app, ...st.applications] }));
      return id;
    },

    setStatus: (appId, status) => setState((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === appId
          ? { ...a, status, history: [...a.history, { at: iso(0), event: `Status → ${status}` }], interviewDate: status === "Interview Scheduled" ? a.interviewDate ?? iso(3) : a.interviewDate, appliedOn: status === "Applied" ? a.appliedOn ?? iso(0) : a.appliedOn }
          : a
      ),
    })),

    approveSubmission: (appId, resumeVersionId, letterId) => setState((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.id === appId
          ? { ...a, status: "Applied" as AppStatus, appliedOn: iso(0), resumeVersionId: resumeVersionId ?? a.resumeVersionId, letterId: letterId ?? a.letterId, followUpDate: a.followUpDate ?? iso(7), history: [...a.history, { at: iso(0), event: "Application submitted (approved by user)" }, { at: iso(0), event: "Follow-up reminder scheduled (+7d)" }] }
          : a
      ),
    })),

    addNote: (appId, text) => setState((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === appId ? { ...a, notes: [...a.notes, { at: iso(0), text }] } : a)),
    })),

    saveLetter: (l) => setState((s) => ({ ...s, letters: [l, ...s.letters.filter((x) => x.id !== l.id)] })),
    approveLetter: (id) => setState((s) => ({ ...s, letters: s.letters.map((l) => (l.id === id ? { ...l, approved: true } : l)) })),
    deleteLetter: (id) => setState((s) => ({ ...s, letters: s.letters.filter((l) => l.id !== id) })),

    saveTailored: (t) => setState((s) => ({ ...s, tailored: { ...s.tailored, [t.jobId]: t } })),
    addResumeVersion: (name, note, forJobId) => {
      const id = uid("rv");
      setState((s) => ({ ...s, resumeVersions: [{ id, name, note, updatedAt: iso(0), approved: true, forJobId }, ...s.resumeVersions] }));
      return id;
    },

    updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    addAchievement: (a) => setState((s) => ({
      ...s,
      profile: { ...s.profile, achievements: [...s.profile.achievements, { id: uid("ach"), ...a }] },
    })),

    addTask: (t) => setState((s) => ({ ...s, tasks: [...s.tasks, { id: uid("t"), done: false, ...t }] })),
    toggleTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
    removeTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),

    agentFinish: (found, logLines) => setState((s) => {
      const newJobs = found.filter((j) => !s.jobs.some((x) => x.id === j.id));
      const newTasks = newJobs
        .filter((j) => j.deadlineInDays !== undefined && j.deadlineInDays <= 10)
        .map((j) => ({ id: uid("t"), title: `Review & apply — ${j.title} @ ${j.company} (deadline ${j.deadlineInDays}d)`, due: iso(1), type: "application" as const, done: false, jobId: j.id }));
      return {
        ...s,
        jobs: [...newJobs, ...s.jobs],
        reserveJobs: s.reserveJobs.filter((j) => !newJobs.some((n) => n.id === j.id)),
        agentLog: [
          ...logLines.map((text, i) => ({ id: uid("log"), at: new Date().toISOString().slice(0, 16), text, kind: (i === 0 ? "run" : "alert") as "run" | "alert" })),
          ...s.agentLog,
        ].slice(0, 24),
        tasks: [...newTasks, ...s.tasks],
      };
    }),

    actInbox: (id, alsoStatus) => setState((s) => ({
      ...s,
      inbox: s.inbox.map((m) => (m.id === id ? { ...m, acted: true } : m)),
      applications: alsoStatus
        ? s.applications.map((a) => (a.id === alsoStatus.appId ? { ...a, status: alsoStatus.status, history: [...a.history, { at: iso(0), event: `Status → ${alsoStatus.status} (from email intel)` }] } : a))
        : s.applications,
    })),

    updateSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    toggleWatch: (company) => setState((s) => ({ ...s, companies: s.companies.map((c) => (c.name === company ? { ...c, watched: !c.watched } : c)) })),
    logInteraction: (contactId) => setState((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === contactId ? { ...c, lastInteraction: iso(0) } : c)) })),
    resetAll: () => {
      localStorage.removeItem(STORAGE_KEY);
      setState({ ...seedState, toasts: [] });
    },
  }), [state, toast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

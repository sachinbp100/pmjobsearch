// ─────────────────────────────────────────────────────────────────────────────
// Waypoint — resume file storage (separate localStorage key, written once per
// upload so the main state snapshot stays lean) + in-browser resume scanning.
// ─────────────────────────────────────────────────────────────────────────────
import { CANON } from "./live";

const FILES_KEY = "waypoint-files-v1";
export const MAX_RESUME_MB = 2;
export const ACCEPTED_RESUME_EXT = ["pdf", "doc", "docx", "txt", "md", "rtf"];

function readMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FILES_KEY) ?? "{}") as Record<string, string>; }
  catch { return {}; }
}

export function storeResumeFile(id: string, dataUrl: string): boolean {
  try {
    const m = readMap();
    m[id] = dataUrl;
    localStorage.setItem(FILES_KEY, JSON.stringify(m));
    return true;
  } catch { return false; } // quota exceeded
}

export function getResumeFile(id: string): string | null {
  return readMap()[id] ?? null;
}

export function deleteResumeFile(id: string): void {
  try {
    const m = readMap();
    delete m[id];
    localStorage.setItem(FILES_KEY, JSON.stringify(m));
  } catch { /* ignore */ }
}

export const readAsDataUrl = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsDataURL(f);
  });

export const readAsText = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsText(f);
  });

export interface ResumeScan {
  skills: string[];       // canonical skill areas detected in the text
  metricLines: string[];  // lines containing measurable outcomes
}

/** Scan resume text for canonical skills and metric-bearing lines. */
export function scanResumeText(text: string): ResumeScan {
  const skills = CANON.filter(([, re]) => re.test(text)).map(([canon]) => canon);
  const metricLines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 18 && l.length < 220 && /(\d+\s?%|\$\s?\d|₹\s?\d|\d+[kK]\b|\d+x\b|revenue|adoption|reduction|growth|nps|churn|saved|generated)/.test(l))
    .slice(0, 6);
  return { skills, metricLines };
}

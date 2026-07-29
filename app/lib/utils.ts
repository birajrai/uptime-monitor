import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Pure helpers ─────────────────────────────────────────────────

/** Calculate uptime percentage from a list of status logs. */
export function calculateUptime(logs: { isUp: boolean }[]): number | null {
  if (logs.length === 0) return null;
  const upCount = logs.filter((l) => l.isUp).length;
  return Math.round((upCount / logs.length) * 100);
}

/** Format seconds into a human-readable duration string. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

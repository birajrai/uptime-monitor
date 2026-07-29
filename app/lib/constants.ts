// ─── Session & Auth ───────────────────────────────────────────────
export const SESSION_MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_S = SESSION_MAX_AGE_DAYS * 24 * 60 * 60;
export const HMAC_ALGORITHM = "sha256";

// ─── HTTP / Fetch ─────────────────────────────────────────────────
export const HTTP_STATUS_UP_MIN = 200;
export const HTTP_STATUS_UP_MAX = 400; // exclusive (2xx–3xx is up)
export const FETCH_TIMEOUT_MS = 30_000;

// ─── Monitor Intervals ────────────────────────────────────────────
export const DEFAULT_CHECK_INTERVAL = 60;
export const MIN_CHECK_INTERVAL = 10;
export const MAX_CHECK_INTERVAL = 86_400; // 24 hours

export const INTERVAL_OPTIONS = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
] as const satisfies { value: number; label: string }[];

// ─── Log / Display Limits ─────────────────────────────────────────
export const RECENT_LOGS_LIMIT = 100;
export const DISPLAY_LOG_COUNT = 20;

// ─── Uptime Windows (milliseconds) ────────────────────────────────
export const UPTIME_24H_MS = 24 * 60 * 60 * 1000;
export const UPTIME_7D_MS = 7 * 24 * 60 * 60 * 1000;
export const UPTIME_30D_MS = 30 * 24 * 60 * 60 * 1000;

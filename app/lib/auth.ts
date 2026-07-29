import { createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_MAX_AGE_MS, SESSION_MAX_AGE_S, HMAC_ALGORITHM } from "./constants";

if (!process.env.APP_SECRET) {
  throw new Error("APP_SECRET environment variable is required");
}
const SECRET = process.env.APP_SECRET;

export interface SessionData {
  userId: number;
  email: string;
}

function sign(data: string): string {
  const hmac = createHmac(HMAC_ALGORITHM, SECRET);
  hmac.update(data);
  return hmac.digest("hex");
}

export function createSessionCookie(userId: number, email: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, email })).toString("base64url");
  const ts = Date.now().toString(36);
  const data = `${payload}.${ts}`;
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifySessionCookie(cookieValue: string): SessionData | null {
  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 3) return null;
    const [payload, ts, sig] = parts;
    const data = `${payload}.${ts}`;
    const expectedSig = sign(data);
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    const created = parseInt(ts, 36);
    if (Date.now() - created > SESSION_MAX_AGE_MS) return null;
    return decoded as SessionData;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionData | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const sessionCookie = cookies["session"];
  if (!sessionCookie) return null;
  return verifySessionCookie(sessionCookie);
}

export function getSessionCookieHeader(sessionData: SessionData): string {
  const value = createSessionCookie(sessionData.userId, sessionData.email);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_S}${secure}`;
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

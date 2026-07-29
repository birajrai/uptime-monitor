import { redirect } from "react-router";
import { getSessionFromRequest, type SessionData } from "./auth";

export function requireAuth(request: Request): SessionData {
  const session = getSessionFromRequest(request);
  if (!session) throw redirect("/login");
  return session;
}

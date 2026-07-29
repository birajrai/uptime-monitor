import { runUptimeChecks } from "~/lib/cron";
import { requireAuth } from "~/lib/require-auth";
import type { Route } from "./+types/api.cron";

export async function loader({ request }: Route.LoaderArgs) {
  // Allow two auth methods:
  // 1. CRON_API_KEY (for external cron job services)
  // 2. Session cookie (for authenticated users clicking "Check Now")
  const cronKey = process.env.CRON_API_KEY;
  let authorized = false;

  if (cronKey) {
    const authHeader = request.headers.get("Authorization");
    const queryKey = new URL(request.url).searchParams.get("key");
    if (authHeader === `Bearer ${cronKey}` || queryKey === cronKey) {
      authorized = true;
    }
  } else {
    // No API key configured → open by default (backward compat)
    authorized = true;
  }

  if (!authorized) {
    try {
      requireAuth(request);
      authorized = true;
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runUptimeChecks();
    return Response.json({
      success: true,
      checked: result.checked,
      notifications: result.notifications,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron check failed:", err);
    return Response.json(
      { success: false, error: "Check failed" },
      { status: 500 }
    );
  }
}

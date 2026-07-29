import { runUptimeChecks } from "~/lib/cron";
import type { Route } from "./+types/api.cron";

export async function loader({ request }: Route.LoaderArgs) {
  // Optional auth check
  const cronKey = process.env.CRON_API_KEY;
  if (cronKey) {
    const authHeader = request.headers.get("Authorization");
    const queryKey = new URL(request.url).searchParams.get("key");
    if (authHeader !== `Bearer ${cronKey}` && queryKey !== cronKey) {
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

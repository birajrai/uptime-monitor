import { eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { monitors, uptimeLogs } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import type { Route } from "./+types/api.monitors.$id.check";

export async function action({ request, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid monitor ID" }, { status: 400 });

  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .limit(1);

  if (!monitor || monitor.userId !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!monitor.isActive) {
    return Response.json({ error: "Monitor is paused" }, { status: 400 });
  }

  const start = performance.now();
  let statusCode: number | null = null;
  let isUp = false;
  let responseTimeMs: number | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(monitor.url, { signal: controller.signal });
    clearTimeout(timeout);
    statusCode = response.status;
    isUp = response.status >= 200 && response.status < 400;
    responseTimeMs = Math.round(performance.now() - start);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    responseTimeMs = Math.round(performance.now() - start);
  }

  await db.insert(uptimeLogs).values({
    monitorId: id,
    statusCode,
    isUp,
    responseTimeMs,
    errorMessage,
  });

  return Response.json({
    isUp,
    statusCode,
    responseTimeMs,
    errorMessage,
  });
}

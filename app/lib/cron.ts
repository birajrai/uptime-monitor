import { db } from "./db";
import { monitors, uptimeLogs, monitorWebhooks } from "./schema";
import { eq, desc } from "drizzle-orm";
import { sendDiscordNotification } from "./discord";

interface CheckResult {
  statusCode: number | null;
  isUp: boolean;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

async function checkUrl(url: string): Promise<CheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    const responseTimeMs = Math.round(performance.now() - start);
    return {
      statusCode: response.status,
      isUp: response.status >= 200 && response.status < 400,
      responseTimeMs,
      errorMessage: null,
    };
  } catch (err) {
    return {
      statusCode: null,
      isUp: false,
      responseTimeMs: Math.round(performance.now() - start),
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runUptimeChecks(): Promise<{
  checked: number;
  notifications: number;
}> {
  const activeMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.isActive, true));

  let checked = 0;
  let notifications = 0;

  for (const monitor of activeMonitors) {
    // Get previous state (also used for interval check)
    const [previousLog] = await db
      .select()
      .from(uptimeLogs)
      .where(eq(uptimeLogs.monitorId, monitor.id))
      .orderBy(desc(uptimeLogs.checkedAt))
      .limit(1);

    // Respect per-monitor check interval: skip if checked recently enough
    if (previousLog) {
      const elapsed = Date.now() - new Date(previousLog.checkedAt).getTime();
      if (elapsed < monitor.checkIntervalSeconds * 1000) {
        continue;
      }
    }

    const result = await checkUrl(monitor.url);

    // Log the result
    await db.insert(uptimeLogs).values({
      monitorId: monitor.id,
      statusCode: result.statusCode,
      isUp: result.isUp,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
    });

    checked++;

    // Detect state change and fire webhooks
    const wasUp = previousLog ? previousLog.isUp : null;
    if (wasUp !== null && wasUp !== result.isUp) {
      const webhooks = await db
        .select()
        .from(monitorWebhooks)
        .where(eq(monitorWebhooks.monitorId, monitor.id));

      for (const webhook of webhooks) {
        const shouldNotify = result.isUp
          ? webhook.notifyOnUp
          : webhook.notifyOnDown;

        if (shouldNotify) {
          const sent = await sendDiscordNotification({
            webhookUrl: webhook.webhookUrl,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            newStatus: result.isUp ? "UP" : "DOWN",
            statusCode: result.statusCode,
            responseTimeMs: result.responseTimeMs,
            errorMessage: result.errorMessage,
            previousStatus: wasUp ? "UP" : "DOWN",
          });
          if (sent) {
            notifications++;
          } else {
            console.error(`Failed to send notification for monitor ${monitor.id} to webhook ${webhook.id}`);
          }
        }
      }
    }
  }

  return { checked, notifications };
}

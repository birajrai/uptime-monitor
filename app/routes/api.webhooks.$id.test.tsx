import { eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { monitorWebhooks, monitors } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { sendTestWebhook } from "~/lib/discord";
import type { Route } from "./+types/api.webhooks.$id.test";

export async function action({ request, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid webhook ID" }, { status: 400 });

  const [webhook] = await db
    .select()
    .from(monitorWebhooks)
    .where(eq(monitorWebhooks.id, id))
    .limit(1);

  if (!webhook) {
    return Response.json({ error: "Webhook not found" }, { status: 404 });
  }

  // Verify ownership via monitor
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, webhook.monitorId))
    .limit(1);

  if (!monitor || monitor.userId !== session.userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const sent = await sendTestWebhook(webhook.webhookUrl);

  return Response.json({ success: sent });
}

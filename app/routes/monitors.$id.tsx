import { Form, Link, redirect, useLoaderData, useActionData, useSubmit } from "react-router";
import { useState } from "react";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Trash } from "@phosphor-icons/react";
import { db } from "~/lib/db";
import { monitors, uptimeLogs, monitorWebhooks } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import UptimeChart from "~/components/uptime-chart";
import type { Route } from "./+types/monitors.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);
  if (isNaN(id)) throw new Response("Invalid ID", { status: 400 });

  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .limit(1);

  if (!monitor || monitor.userId !== session.userId) {
    throw new Response("Not Found", { status: 404 });
  }

  const logs = await db
    .select()
    .from(uptimeLogs)
    .where(eq(uptimeLogs.monitorId, id))
    .orderBy(desc(uptimeLogs.checkedAt))
    .limit(100);

  const [webhook] = await db
    .select()
    .from(monitorWebhooks)
    .where(eq(monitorWebhooks.monitorId, id))
    .limit(1);

  // Convert Date objects to strings for the chart component
  const serializedLogs = logs.map((log) => ({
    ...log,
    checkedAt: log.checkedAt.toISOString(),
  }));

  return { monitor, logs: serializedLogs, webhook: webhook ?? null };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);
  if (isNaN(id)) throw new Response("Invalid ID", { status: 400 });

  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, id))
    .limit(1);

  if (!monitor || monitor.userId !== session.userId) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle-active") {
    const newIsActive = !monitor.isActive;
    await db
      .update(monitors)
      .set({ isActive: newIsActive, updatedAt: new Date() })
      .where(eq(monitors.id, id))
      .execute();
    return { isActive: newIsActive };
  }

  if (intent === "delete") {
    await db.delete(monitors).where(eq(monitors.id, id)).execute();
    return redirect("/");
  }

  if (intent === "save-webhook") {
    const webhookUrl = formData.get("webhookUrl") as string;
    const notifyOnDown = formData.get("notifyOnDown") === "on";
    const notifyOnUp = formData.get("notifyOnUp") === "on";

    // Upsert: delete existing, insert new
    await db
      .delete(monitorWebhooks)
      .where(eq(monitorWebhooks.monitorId, id))
      .execute();

    if (webhookUrl) {
      await db
        .insert(monitorWebhooks)
        .values({
          monitorId: id,
          webhookUrl,
          notifyOnDown,
          notifyOnUp,
        })
        .execute();
    }

    return { webhookSaved: true };
  }

  return null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export default function MonitorDetail() {
  const { monitor, logs, webhook } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Track webhook checkbox state (Radix Checkbox doesn't submit with native forms)
  const [notifyOnDown, setNotifyOnDown] = useState(webhook?.notifyOnDown ?? true);
  const [notifyOnUp, setNotifyOnUp] = useState(webhook?.notifyOnUp ?? true);

  // Use action data for toggle state so UI stays in sync with server
  const displayIsActive = actionData?.isActive ?? monitor.isActive;
  const submitToggle = useSubmit();

  const latestLog = logs[0] ?? null;
  const uptimePct =
    logs.length > 0
      ? Math.round(
          (logs.filter((l) => l.isUp).length / logs.length) * 100
        )
      : null;

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>
      </div>

      {/* Monitor info card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{monitor.name}</CardTitle>
              <CardDescription className="mt-1">{monitor.url}</CardDescription>
            </div>
            <Badge
              variant={
                latestLog
                  ? latestLog.isUp
                    ? "success"
                    : "destructive"
                  : "outline"
              }
              className="text-sm"
            >
              {latestLog ? (latestLog.isUp ? "Up" : "Down") : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="font-medium">
                {uptimePct !== null ? `${uptimePct}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Checks</p>
              <p className="font-medium">{logs.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Interval</p>
              <p className="font-medium">
                {formatDuration(monitor.checkIntervalSeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="flex items-center gap-2">
                  <Switch
                    checked={displayIsActive}
                    onCheckedChange={() => {
                      submitToggle({ intent: "toggle-active" }, { method: "post" });
                    }}
                  />
                <span className="text-sm text-gray-600">
                  {displayIsActive ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete monitor</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{monitor.name}"? This will
                    remove all uptime logs and webhook configurations.
                  </DialogDescription>
                </DialogHeader>
                <Form method="post" className="flex justify-end gap-2">
                  <input type="hidden" name="intent" value="delete" />
                  <Button type="submit" variant="destructive">
                    Delete
                  </Button>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Uptime chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Response Time</CardTitle>
        </CardHeader>
        <CardContent>
          <UptimeChart logs={logs} />
        </CardContent>
      </Card>

      {/* Recent checks table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Recent Checks</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No checks recorded yet. Run a check or wait for the cron job.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status Code</TableHead>
                  <TableHead>Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.checkedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={log.isUp ? "success" : "destructive"}
                      >
                        {log.isUp ? "Up" : "Down"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.statusCode ?? "—"}</TableCell>
                    <TableCell>
                      {log.responseTimeMs != null
                        ? `${log.responseTimeMs}ms`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Discord webhook config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discord Webhook</CardTitle>
          <CardDescription>
            Get notified when this monitor changes state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="save-webhook" />

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                defaultValue={webhook?.webhookUrl ?? ""}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="hidden" name="notifyOnDown" value={notifyOnDown ? "on" : "off"} />
                <Checkbox
                  checked={notifyOnDown}
                  onCheckedChange={(checked) => setNotifyOnDown(checked === true)}
                />
                Notify on Down
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="hidden" name="notifyOnUp" value={notifyOnUp ? "on" : "off"} />
                <Checkbox
                  checked={notifyOnUp}
                  onCheckedChange={(checked) => setNotifyOnUp(checked === true)}
                />
                Notify on Recovery
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Save Webhook</Button>
              {webhook && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/webhooks/${webhook.id}/test`,
                        { method: "POST" }
                      );
                      if (res.ok) alert("Test notification sent!");
                      else alert("Failed to send test.");
                    } catch {
                      alert("Network error sending test notification.");
                    }
                  }}
                >
                  Test Webhook
                </Button>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

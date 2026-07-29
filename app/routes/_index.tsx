import { Link, Form, redirect, useLoaderData } from "react-router";
import { eq, desc, and } from "drizzle-orm";
import { Plus, Trash, ArrowRight } from "@phosphor-icons/react";
import { db } from "~/lib/db";
import { monitors, uptimeLogs } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import type { Route } from "./+types/_index";

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, session.userId))
    .orderBy(desc(monitors.createdAt));

  // Get latest log for each monitor
  const monitorsWithStatus = await Promise.all(
    userMonitors.map(async (m) => {
      const [latestLog] = await db
        .select()
        .from(uptimeLogs)
        .where(eq(uptimeLogs.monitorId, m.id))
        .orderBy(desc(uptimeLogs.checkedAt))
        .limit(1);
      return { ...m, latestLog: latestLog ?? null };
    })
  );

  return { monitors: monitorsWithStatus };
}

export async function action({ request }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const id = parseInt(formData.get("monitorId") as string, 10);
    if (isNaN(id)) return redirect("/");
    await db.delete(monitors).where(and(eq(monitors.id, id), eq(monitors.userId, session.userId))).execute();
  }

  return redirect("/");
}

function statusBadgeVariant(isUp: boolean | null) {
  if (isUp === null) return "outline" as const;
  return isUp ? "success" as const : "destructive" as const;
}

function statusLabel(isUp: boolean | null) {
  if (isUp === null) return "Pending";
  return isUp ? "Up" : "Down";
}

export default function Dashboard() {
  const { monitors: monitorList } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitors</h1>
          <p className="text-sm text-gray-500">
            Monitor your websites and services.
          </p>
        </div>
        <div className="flex gap-2">
          <Form method="get" action="/api/cron" onSubmit={(e) => {
            // Use fetch instead of form navigation so we stay on dashboard
            e.preventDefault();
            const btn = (e.target as HTMLFormElement).querySelector("button");
            if (btn) { btn.disabled = true; btn.textContent = "Checking..."; }
            fetch("/api/cron").then((res) => {
              if (res.ok) window.location.reload();
              else { if (btn) { btn.disabled = false; btn.textContent = "Check Now"; }
              alert("Check completed but server returned an error."); }
            }).catch(() => {
              if (btn) { btn.disabled = false; btn.textContent = "Check Now"; }
              alert("Network error connecting to the server.");
            });
          }}>
            <Button type="submit" variant="outline">Check Now</Button>
          </Form>
          <Button asChild>
            <Link to="/monitors/new">
              <Plus className="h-4 w-4" />
              New Monitor
            </Link>
          </Button>
        </div>
      </div>

      {monitorList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MonitorIcon className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-medium">No monitors yet</h3>
            <p className="mb-4 text-sm text-gray-500">
              Create your first monitor to start tracking uptime.
            </p>
            <Button asChild>
              <Link to="/monitors/new">
                <Plus className="h-4 w-4" />
                Create Monitor
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {monitorList.map((monitor) => (
            <Card key={monitor.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/monitors/${monitor.id}`}
                    className="font-medium hover:underline"
                  >
                    {monitor.name}
                  </Link>
                  <p className="truncate text-sm text-gray-500">{monitor.url}</p>
                </div>

                <div className="hidden items-center gap-4 sm:flex">
                  <span className="text-xs text-gray-400">
                    {monitor.latestLog
                      ? new Date(monitor.latestLog.checkedAt).toLocaleString()
                      : "Not checked yet"}
                  </span>
                  <Badge variant={statusBadgeVariant(monitor.latestLog?.isUp ?? null)}>
                    {statusLabel(monitor.latestLog?.isUp ?? null)}
                  </Badge>
                </div>

                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/monitors/${monitor.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600">
                      <Trash className="h-4 w-4" />
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
                      <input type="hidden" name="monitorId" value={monitor.id} />
                      <input type="hidden" name="intent" value="delete" />
                      <Button type="submit" variant="destructive">
                        Delete
                      </Button>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

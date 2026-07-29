import { useLoaderData } from "react-router";
import { eq, sql, and } from "drizzle-orm";
import { db } from "~/lib/db";
import { statusPages, statusPageMonitors, monitors, uptimeLogs } from "~/lib/schema";
import { Badge } from "~/components/ui/badge";
import type { Route } from "./+types/status.$slug";

interface MonitorWithStatus {
  id: number;
  name: string;
  url: string;
  isUp: boolean | null;
  lastCheckedAt: string | null;
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
}

interface PageData {
  title: string;
  description: string | null;
  monitors: MonitorWithStatus[];
}

function calculateUptime(
  logs: { isUp: boolean }[]
): number | null {
  if (logs.length === 0) return null;
  const upCount = logs.filter((l) => l.isUp).length;
  return Math.round((upCount / logs.length) * 100);
}

export async function loader({ params }: Route.LoaderArgs) {
  const { slug } = params;

  const [page] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
    .limit(1);

  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  const spmRows = await db
    .select({ monitorId: statusPageMonitors.monitorId })
    .from(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, page.id))
    .orderBy(statusPageMonitors.displayOrder)
    .execute();

  if (spmRows.length === 0) {
    return {
      title: page.title,
      description: page.description,
      monitors: [],
    } satisfies PageData;
  }

  const monitorIds = spmRows.map((r) => r.monitorId);

  const pageMonitors = await db
    .select()
    .from(monitors)
    .where(sql`${monitors.id} = ANY(${sql.join(monitorIds, sql`, `)})`)
    .execute();

  const monitorsWithStatus: MonitorWithStatus[] = await Promise.all(
    pageMonitors.map(async (m) => {
      // Latest log
      const [latestLog] = await db
        .select()
        .from(uptimeLogs)
        .where(eq(uptimeLogs.monitorId, m.id))
        .orderBy(sql`${uptimeLogs.checkedAt} DESC`)
        .limit(1)
        .execute();

      // 24h uptime
      const logs24h = await db
        .select({ isUp: uptimeLogs.isUp })
        .from(uptimeLogs)
        .where(
          and(
            eq(uptimeLogs.monitorId, m.id),
            sql`${uptimeLogs.checkedAt} > now() - interval '24 hours'`
          )
        )
        .execute();

      // 7d uptime
      const logs7d = await db
        .select({ isUp: uptimeLogs.isUp })
        .from(uptimeLogs)
        .where(
          and(
            eq(uptimeLogs.monitorId, m.id),
            sql`${uptimeLogs.checkedAt} > now() - interval '7 days'`
          )
        )
        .execute();

      // 30d uptime
      const logs30d = await db
        .select({ isUp: uptimeLogs.isUp })
        .from(uptimeLogs)
        .where(
          and(
            eq(uptimeLogs.monitorId, m.id),
            sql`${uptimeLogs.checkedAt} > now() - interval '30 days'`
          )
        )
        .execute();

      return {
        id: m.id,
        name: m.name,
        url: m.url,
        isUp: latestLog?.isUp ?? null,
        lastCheckedAt: latestLog?.checkedAt?.toISOString() ?? null,
        uptime24h: calculateUptime(logs24h),
        uptime7d: calculateUptime(logs7d),
        uptime30d: calculateUptime(logs30d),
      };
    })
  );

  return {
    title: page.title,
    description: page.description,
    monitors: monitorsWithStatus,
  } satisfies PageData;
}

function UptimeBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  let variant: "success" | "warning" | "destructive" = "success";
  if (pct < 95) variant = "destructive";
  else if (pct < 99) variant = "warning";
  return <Badge variant={variant}>{pct}%</Badge>;
}

export default function PublicStatusPage() {
  const { title, description, monitors } = useLoaderData<typeof loader>();

  const allUp = monitors.length > 0 && monitors.every((m) => m.isUp !== false);
  const someDown = monitors.some((m) => m.isUp === false);
  const hasData = monitors.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-gray-500">{description}</p>
          )}
        </div>

        {/* Overall status */}
        {hasData && (
          <div
            className={`mb-8 rounded-lg border p-6 text-center ${
              someDown
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            {allUp ? (
              <>
                <div className="mb-2 text-3xl">✅</div>
                <p className="text-lg font-semibold text-green-800">
                  All Systems Operational
                </p>
              </>
            ) : someDown ? (
              <>
                <div className="mb-2 text-3xl">⚠️</div>
                <p className="text-lg font-semibold text-red-800">
                  Experiencing Issues
                </p>
              </>
            ) : (
              <>
                <div className="mb-2 text-3xl">⏳</div>
                <p className="text-lg font-semibold text-gray-800">
                  Collecting Data...
                </p>
              </>
            )}
          </div>
        )}

        {/* Monitor list */}
        {!hasData ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
            <p className="text-gray-400">No monitors configured for this page yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{m.name}</h3>
                    <p className="text-sm text-gray-400">{m.url}</p>
                  </div>
                  <Badge
                    variant={
                      m.isUp === null
                        ? "outline"
                        : m.isUp
                          ? "success"
                          : "destructive"
                    }
                  >
                    {m.isUp === null
                      ? "Pending"
                      : m.isUp
                        ? "Operational"
                        : "Down"}
                  </Badge>
                </div>

                <div className="mt-4 flex gap-6">
                  <div>
                    <p className="text-xs text-gray-400">24 hours</p>
                    <UptimeBadge pct={m.uptime24h} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">7 days</p>
                    <UptimeBadge pct={m.uptime7d} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">30 days</p>
                    <UptimeBadge pct={m.uptime30d} />
                  </div>
                </div>

                {m.lastCheckedAt && (
                  <p className="mt-3 text-xs text-gray-400">
                    Last checked: {new Date(m.lastCheckedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-gray-400">
          Powered by Uptimer
        </p>
      </div>
    </div>
  );
}

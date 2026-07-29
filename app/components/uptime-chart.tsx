import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UptimeLog {
  checkedAt: string;
  responseTimeMs: number | null;
  isUp: boolean;
  statusCode: number | null;
}

interface ChartDataPoint {
  time: string;
  responseTimeMs: number | null;
  isUp: boolean;
  statusCode: number | null;
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const fill = payload.isUp ? "#22c55e" : "#ef4444";
  return (
    <circle cx={cx} cy={cy} r={3} fill={fill} stroke="white" strokeWidth={1.5} />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{d.time}</p>
      <p className={d.isUp ? "text-green-600" : "text-red-600"}>
        {d.isUp ? "Up" : "Down"}
      </p>
      <p className="text-gray-500">Status: {d.statusCode ?? "N/A"}</p>
      <p className="text-gray-500">
        Response: {d.responseTimeMs != null ? `${d.responseTimeMs}ms` : "N/A"}
      </p>
    </div>
  );
}

export default function UptimeChart({ logs }: { logs: UptimeLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed border-gray-300">
        <p className="text-sm text-gray-400">No data yet</p>
      </div>
    );
  }

  const data: ChartDataPoint[] = logs
    .slice()
    .reverse()
    .map((log) => ({
      time: log.checkedAt, // Use ISO string directly
      responseTimeMs: log.responseTimeMs,
      isUp: log.isUp,
      statusCode: log.statusCode,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return isNaN(d.getTime())
              ? ""
              : `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          label={{
            value: "ms",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fill: "#9ca3af" },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="responseTimeMs"
          stroke="#6b7280"
          strokeWidth={1.5}
          dot={<CustomDot />}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

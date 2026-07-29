import { Form, redirect, useActionData, Link } from "react-router";
import { db } from "~/lib/db";
import { monitors } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/monitors.new";

const INTERVAL_OPTIONS = [
  { value: "30", label: "30 seconds" },
  { value: "60", label: "1 minute" },
  { value: "300", label: "5 minutes" },
  { value: "900", label: "15 minutes" },
  { value: "1800", label: "30 minutes" },
  { value: "3600", label: "1 hour" },
];

export async function loader({ request }: Route.LoaderArgs) {
  requireAuth(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const interval = parseInt(formData.get("interval") as string, 10) || 60;

  const errors: Record<string, string> = {};
  if (!name || name.trim().length === 0) errors.name = "Name is required.";
  if (!url || url.trim().length === 0) errors.url = "URL is required.";
  else {
    try {
      new URL(url);
    } catch {
      errors.url = "Please enter a valid URL.";
    }
  }
  if (interval < 10 || interval > 86400) errors.interval = "Interval must be between 10 seconds and 24 hours.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { name, url, interval } };
  }

  const [monitor] = await db
    .insert(monitors)
    .values({
      name: name.trim(),
      url: url.trim(),
      checkIntervalSeconds: interval,
      userId: session.userId,
    })
    .returning();

  return redirect(`/monitors/${monitor.id}`);
}

export default function NewMonitor() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New Monitor</h1>
        <p className="text-sm text-gray-500">
          Add a URL to start monitoring its uptime.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitor Details</CardTitle>
          <CardDescription>
            Enter the URL you want to monitor and how often to check it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Website"
                defaultValue={actionData?.values?.name}
              />
              {actionData?.errors?.name && (
                <p className="text-sm text-red-600">{actionData.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://example.com"
                defaultValue={actionData?.values?.url}
              />
              {actionData?.errors?.url && (
                <p className="text-sm text-red-600">{actionData.errors.url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Check Interval</Label>
              <select
                id="interval"
                name="interval"
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm"
                defaultValue={actionData?.values?.interval ?? "60"}
              >
                {INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {actionData?.errors?.interval && (
                <p className="text-sm text-red-600">{actionData.errors.interval}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Monitor</Button>
              <Button variant="outline" asChild>
                <Link to="/">Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

import { Form, redirect, useActionData, useLoaderData, Link } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/lib/db";
import { statusPages, monitors, statusPageMonitors } from "~/lib/schema";
import { requireAuth } from "~/lib/require-auth";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Route } from "./+types/status-pages.new";

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireAuth(request);

  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, session.userId))
    .execute();

  return { monitors: userMonitors };
}

export async function action({ request }: Route.ActionArgs) {
  const session = requireAuth(request);
  const formData = await request.formData();

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = (formData.get("description") as string) || "";
  const selectedMonitorIds = formData.getAll("monitorIds") as string[];

  const errors: Record<string, string> = {};
  if (!title || title.trim().length === 0) errors.title = "Title is required.";
  if (!slug || slug.trim().length === 0) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9-]+$/.test(slug))
    errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: { title, slug, description, selectedMonitorIds } };
  }

  // Check slug uniqueness
  const [existing] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
    .limit(1);

  if (existing) {
    return {
      errors: { slug: "This slug is already taken." },
      values: { title, slug, description, selectedMonitorIds },
    };
  }

  const [page] = await db
    .insert(statusPages)
    .values({
      title: title.trim(),
      slug: slug.trim(),
      description,
      userId: session.userId,
    })
    .returning();

  // Insert monitor associations
  if (selectedMonitorIds.length > 0) {
    await db
      .insert(statusPageMonitors)
      .values(
        selectedMonitorIds.map((monitorId, i) => ({
          statusPageId: page.id,
          monitorId: parseInt(monitorId, 10),
          displayOrder: i,
        }))
      )
      .execute();
  }

  return redirect("/status-pages");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewStatusPage() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <Link
          to="/status-pages"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to status pages
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New Status Page</h1>
        <p className="text-sm text-gray-500">
          Create a public page to display your monitors' status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Page Details</CardTitle>
          <CardDescription>
            Set up the title, URL slug, and select which monitors to display.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="My Status Page"
                defaultValue={actionData?.values?.title}
                onChange={(e) => {
                  const slugInput = document.getElementById(
                    "slug"
                  ) as HTMLInputElement;
                  if (slugInput && !slugInput.dataset.manuallyEdited) {
                    slugInput.value = slugify(e.target.value);
                  }
                }}
              />
              {actionData?.errors?.title && (
                <p className="text-sm text-red-600">
                  {actionData.errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>/status/</span>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="my-status-page"
                  defaultValue={actionData?.values?.slug}
                  onChange={(e) => {
                    e.target.dataset.manuallyEdited = "true";
                  }}
                />
              </div>
              {actionData?.errors?.slug && (
                <p className="text-sm text-red-600">
                  {actionData.errors.slug}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                placeholder="A brief description of your service status."
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                defaultValue={actionData?.values?.description}
              />
            </div>

            <div className="space-y-2">
              <Label>Monitors</Label>
              {loaderData.monitors.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No monitors yet. Create one first.
                </p>
              ) : (
                <div className="space-y-2 rounded-md border border-gray-200 p-3">
                  {loaderData.monitors.map((monitor) => (
                    <label
                      key={monitor.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        name="monitorIds"
                        value={monitor.id.toString()}
                        defaultChecked={actionData?.values?.selectedMonitorIds?.includes(
                          monitor.id.toString()
                        )}
                      />
                      {monitor.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Status Page</Button>
              <Button variant="outline" asChild>
                <Link to="/status-pages">Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

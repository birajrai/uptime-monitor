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
import type { Route } from "./+types/status-pages.$id.edit";

export async function loader({ request, params }: Route.LoaderArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);

  const [page] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.id, id))
    .limit(1);

  if (!page || page.userId !== session.userId) {
    throw new Response("Not Found", { status: 404 });
  }

  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, session.userId))
    .execute();

  const selectedIds = await db
    .select({ monitorId: statusPageMonitors.monitorId })
    .from(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, id))
    .execute();

  const selectedMonitorIds = new Set(selectedIds.map((s) => s.monitorId));

  return {
    page,
    monitors: userMonitors,
    selectedMonitorIds: [...selectedMonitorIds],
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const session = requireAuth(request);
  const id = parseInt(params.id, 10);

  const [page] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.id, id))
    .limit(1);

  if (!page || page.userId !== session.userId) {
    throw new Response("Not Found", { status: 404 });
  }

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

  // Check slug uniqueness (excluding current page)
  const [existing] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
    .limit(1);

  if (existing && existing.id !== id) {
    return {
      errors: { slug: "This slug is already taken." },
      values: { title, slug, description, selectedMonitorIds },
    };
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      values: { title, slug, description, selectedMonitorIds },
    };
  }

  await db
    .update(statusPages)
    .set({
      title: title.trim(),
      slug: slug.trim(),
      description,
      updatedAt: new Date(),
    })
    .where(eq(statusPages.id, id))
    .execute();

  // Replace monitor associations
  await db
    .delete(statusPageMonitors)
    .where(eq(statusPageMonitors.statusPageId, id))
    .execute();

  if (selectedMonitorIds.length > 0) {
    await db
      .insert(statusPageMonitors)
      .values(
        selectedMonitorIds.map((monitorId, i) => ({
          statusPageId: id,
          monitorId: parseInt(monitorId, 10),
          displayOrder: i,
        }))
      )
      .execute();
  }

  return redirect("/status-pages");
}

export default function EditStatusPage() {
  const { page, monitors: monitorList, selectedMonitorIds } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <Link to="/status-pages" className="text-sm text-blue-600 hover:underline">
          &larr; Back to status pages
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Edit Status Page</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status Page Details</CardTitle>
          <CardDescription>Update your status page settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={actionData?.values?.title ?? page.title}
              />
              {actionData?.errors?.title && (
                <p className="text-sm text-red-600">{actionData.errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>/status/</span>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={actionData?.values?.slug ?? page.slug}
                />
              </div>
              {actionData?.errors?.slug && (
                <p className="text-sm text-red-600">{actionData.errors.slug}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                defaultValue={actionData?.values?.description ?? page.description ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Monitors</Label>
              <div className="space-y-2 rounded-md border border-gray-200 p-3">
                {monitorList.map((monitor) => (
                  <label key={monitor.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      name="monitorIds"
                      value={monitor.id.toString()}
                      defaultChecked={selectedMonitorIds.includes(monitor.id)}
                    />
                    {monitor.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
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
